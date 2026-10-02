// Verifact extension — MV3 service worker (Track C).
// Responsibilities:
//  * Capture the Supabase access token from the website (Mode A / Section 2).
//  * Store it in chrome.storage.local and send it as `Authorization: Bearer`.
//  * Call POST /api/v1/verify — real when CONFIG.USE_MOCK is false, otherwise
//    the mocked Section 1 responses from mocks.js.

import { CONFIG } from './config.js';
import { mockVerify } from './mocks.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- auth storage ----------------------------------------------------------

async function getAuth() {
  const { [CONFIG.AUTH_STORAGE_KEY]: auth } = await chrome.storage.local.get(CONFIG.AUTH_STORAGE_KEY);
  if (!auth?.accessToken) return null;
  // Drop expired tokens (Supabase expires_at is seconds since epoch).
  if (auth.expiresAt && Date.now() / 1000 >= auth.expiresAt) {
    await logout();
    return null;
  }
  return auth;
}

async function saveAuth(session) {
  const auth = {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt ?? null,
    user: session.user ?? null,
  };
  await chrome.storage.local.set({ [CONFIG.AUTH_STORAGE_KEY]: auth });
  notifyAuth(auth);
}

async function logout() {
  await chrome.storage.local.remove(CONFIG.AUTH_STORAGE_KEY);
  notifyAuth(null);
}

// --- messaging to popups ---------------------------------------------------

function notifyAuth(auth) {
  chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', auth }).catch(() => {});
}

// --- Mode A: read Supabase session from the website cookies ----------------
// The site uses @supabase/ssr v0.12.3 createBrowserClient, which stores the
// session in cookies (default cookieEncoding "base64url" -> "base64-" prefix),
// not localStorage. Cookie name: `sb-<ref>-auth-token`; when too large it is
// chunked into `.0`, `.1`, … (MAX_CHUNK_SIZE 3180).
const BASE64_PREFIX = 'base64-';

// Mirror @supabase/ssr stringFromBase64URL (URL-safe, ignores " \t\n\r=", UTF-8).
function fromBase64Url(str) {
  let s = String(str).replace(/[\s=]/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '='; // padding
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes); // UTF-8 safe (emails with diacritics etc.)
}

// Mirror decodeChunkedCookieValue from @supabase/ssr cookies.js.
function decodeChunkedCookieValue(value) {
  if (!value) return null;
  if (!value.startsWith(BASE64_PREFIX)) return value; // raw JSON (cookieEncoding=raw)
  let decoded;
  try { decoded = fromBase64Url(value.slice(BASE64_PREFIX.length)); }
  catch { return null; } // partial/corrupt chunk -> treat as absent
  try { JSON.parse(decoded); } catch { return null; } // invalid JSON -> absent
  return decoded; // valid JSON string
}

async function getCookieValue(url, name) {
  const c = await chrome.cookies.get({ url, name });
  return c?.value ?? null;
}

// Returns { accessToken, expiresAt, user } or null.
async function readSupabaseSessionFromCookies(ref) {
  const origin = CONFIG.WEBSITE_ORIGIN;
  const key = `sb-${ref}-auth-token`;

  // 1) un-chunked single cookie
  let value = await getCookieValue(origin, key);

  // 2) chunked: key.0, key.1, ... until first null
  if (value === null) {
    const parts = [];
    for (let i = 0; ; i++) {
      const chunk = await getCookieValue(origin, `${key}.${i}`);
      if (chunk === null) break;
      parts.push(chunk);
    }
    value = parts.length ? parts.join('') : null;
  }
  if (value === null) return null;

  const json = decodeChunkedCookieValue(value);
  if (!json) return null;

  let parsed;
  try { parsed = JSON.parse(json); } catch { return null; }
  const s = parsed?.currentSession || parsed?.session || parsed;
  if (!s?.access_token) return null;
  return {
    accessToken: s.access_token,
    expiresAt: s.expires_at ?? null, // seconds since epoch (number)
    user: s.user ? { id: s.user.id, email: s.user.email ?? null, tier: s.user.tier ?? null } : null,
  };
}

// Open the website and poll the cookie jar for an active Supabase session.
async function handleLogin() {
  const url = CONFIG.WEBSITE_ORIGIN + '/login';
  try {
    await chrome.tabs.create({ url, active: true });
  } catch (e) {
    notifyAuth({ error: 'Could not open the website. Please open ' + CONFIG.WEBSITE_ORIGIN + ' and log in, then click Login again.' });
    return;
  }

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const session = await readSupabaseSessionFromCookies(CONFIG.SUPABASE_PROJECT_REF);
    if (session?.accessToken) {
      await saveAuth(session);
      return;
    }
  }
  notifyAuth({ error: 'Login timed out. Make sure you are logged in to the website, then click Login again.' });
}

// --- passive session sync via cookie changes -------------------------------
// Replaces the deleted content.js. Debounced: a single token refresh writes
// several chunks, so we coalesce into one re-read. A logout-on-site cookie
// removal also fires here and clears the stored token.
let refreshTimer = null;
function scheduleSessionRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = null;
    const session = await readSupabaseSessionFromCookies(CONFIG.SUPABASE_PROJECT_REF);
    if (session?.accessToken) await saveAuth(session);
    else await logout(); // cookie gone -> user logged out on the site
  }, 400);
}

chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (!/^sb-.*-auth-token(\.\d+)?$/.test(cookie?.name ?? '')) return;
  scheduleSessionRefresh();
});

// --- verify ----------------------------------------------------------------

async function verify(payload) {
  const auth = await getAuth();

  if (CONFIG.USE_MOCK) {
    await sleep(CONFIG.MOCK_LATENCY_MS);
    return mockVerify(payload, auth);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth?.accessToken) headers['Authorization'] = `Bearer ${auth.accessToken}`;

  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/v1/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    return { status: res.status, data };
  } catch (e) {
    return {
      status: 0,
      data: { success: false, error: 'Network error: ' + (e?.message || 'failed to reach endpoint'), code: 'NETWORK_ERROR' },
    };
  }
}

// --- message router --------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg?.type) {
    case 'VERIFY':
      verify(msg.payload).then(sendResponse);
      return true; // keep channel open for async response

    case 'LOGIN':
      handleLogin();
      sendResponse({ ok: true });
      return false;

    case 'LOGOUT':
      logout().then(() => sendResponse({ ok: true }));
      return true;

    case 'GET_AUTH':
      getAuth().then(sendResponse);
      return true;

    default:
      return false;
  }
});
