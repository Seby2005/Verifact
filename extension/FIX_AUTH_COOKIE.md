# FIX_AUTH_COOKIE — specificație completă de remediere

> **Self-contained.** Cineva care nu a văzut codul poate implementa fix-urile din
> acest fișier. Nu modifică nimic din ce e marcat „DO NOT TOUCH" la final.
>
- **Blocker** — token-ul Supabase se citește din **`chrome.cookies`**, nu din
  `localStorage`. Motiv: site-ul folosește `@supabase/ssr` v0.12.3, al cărui
  `createBrowserClient` stochează sesiunea în **cookie-uri** (`document.cookie`),
  nu în `localStorage`. Implementarea actuală (`content.js` + `executeScript` pe
  `sb-<ref>-auth-token` în localStorage) găsește mereu `null` → Login nu captează
  niciodată token → autentificarea e moartă.
- **Minor XSS** — `popup.js` randează `href="${escapeHtml(s.url)}"`. `escapeHtml`
  previne break-out din atribut, dar **nu** validează schema: un `s.url =
  "javascript:..."` ar executa la click. Se adaugă validarea schemei `http(s)`.

Toate detaliile de mai jos sunt **verificate** pe `node_modules/@supabase/ssr`
v0.12.3 (vezi §0 dovezi).

---

## 0. Dovezi extrase din pachetul instalat

- `@supabase/ssr` v0.12.3 (`node_modules/@supabase/ssr/package.json`).
- `createBrowserClient`: `cookieEncoding: options?.cookieEncoding ?? "base64url"`
  → prefixul `base64-` este **activ implicit** (`dist/main/createBrowserClient.js:23`).
- `BASE64_PREFIX = "base64-"` (`cookies.js:7`).
- `createChunks`: `MAX_CHUNK_SIZE = 3180`; când valoarea încape într-un singur cookie
  se scrie `key`; altfel se sparge în `key.0`, `key.1`, … cu regex
  `^(.*)[.](0|[1-9][0-9]*)$` (`utils/chunker.js:8-9, 63`).
- `combineChunks`: citește mai întâi `key`; dacă lipsește, citește `key.0`, `key.1`, …
  până la primul `null` și le concatenează (`chunker.js:66-83`).
- `decodeChunkedCookieValue(value)`: dacă `value` începe cu `base64-` → strip prefix →
  `stringFromBase64URL(...)` → `JSON.parse` de validare → returnează JSON string;
  altfel returnează valoarea brută (`cookies.js:17-37`).
- `stringFromBase64URL`: alfabet `A-Za-z0-9-_`, ignoră ` \t\n\r=`, decodă UTF-8
  (`utils/base64url.js:17,22,78-110`).
- Browser client folosește `document.cookie` (cookie reale, **ne-HttpOnly**), deci
  `chrome.cookies.get()` le poate citi (permite și HttpOnly, dar aici nu e cazul).

**Nume cookie:** `sb-iqszqrilxuqhcnwskxnj-auth-token`
(ref = `iqszqrilxuqhcnwskxnj` din `NEXT_PUBLIC_SUPABASE_URL`).

---

## A. Blocker — citire token din `chrome.cookies`

### A.1 `manifest.json`
- Adaugă permisiunea `"cookies"` (necesară pentru `chrome.cookies.*`).
- `host_permissions` deja conține `http://localhost:3000/*` și `*.verifact.ro/*`
  — obligatorii: `chrome.cookies.get` cere host-permission pe domeniul cookie-ului.
- `scripting` **devine inutil** pentru auth (nu mai folosim `executeScript`); se poate
  șterge. Dacă vrei conservatorism, lasă-l — e inofensiv, dar spec-ul îl consideră
  de șters (nimic altceva nu-l folosește).
- `content_scripts` + `content.js` se **șterg**: sincronizarea pasivă se mută pe
  `chrome.cookies.onChanged` (content script-urile nu au acces la `chrome.cookies`).

Diff manifest (sketch):
```jsonc
"permissions": ["storage", "cookies", "tabs", "activeTab"],
// "scripting"  -> eliminat
// "content_scripts": [...]  -> eliminat (content.js șters)
```

### A.2 `background.js` — cititorul cookie

Înlocuiește funcția injectată `readSupabaseSession(ref)` (cea care citea `localStorage`)
cu o funcție care rulează în service worker folosind `chrome.cookies`. Scheme:

```js
// background.js
const BASE64_PREFIX = 'base64-';

// Echivalent @supabase/ssr stringFromBase64URL (URL-safe, ignoră spații/=, UTF-8).
function fromBase64Url(str) {
  let s = String(str).replace(/[\s=]/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';            // padding
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);   // UTF-8 safe (email cu diacritice etc.)
}

// Mirror decodeChunkedCookieValue din @supabase/ssr cookies.js:17-37
function decodeChunkedCookieValue(value) {
  if (!value) return null;
  if (!value.startsWith(BASE64_PREFIX)) return value; // raw JSON (cookieEncoding=raw)
  let decoded;
  try { decoded = fromBase64Url(value.slice(BASE64_PREFIX.length)); }
  catch { return null; }                              // chunk corupt/parțial -> absent
  try { JSON.parse(decoded); } catch { return null; } // JSON invalid -> absent
  return decoded;                                     // string JSON valid
}

async function getCookieValue(url, name) {
  const c = await chrome.cookies.get({ url, name });
  return c?.value ?? null;
}

// Returnează sesiunea { accessToken, expiresAt, user } sau null.
async function readSupabaseSessionFromCookies(ref) {
  const origin = CONFIG.WEBSITE_ORIGIN;
  const key = `sb-${ref}-auth-token`;

  // 1) cookie unic (ne-împărțit)
  let value = await getCookieValue(origin, key);

  // 2) chunked: key.0, key.1, ... până la primul null
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

  const json = decodeChunkedCookieValue(value);  // str JSON sau null
  if (!json) return null;

  let parsed;
  try { parsed = JSON.parse(json); } catch { return null; }
  const s = parsed?.currentSession || parsed?.session || parsed;
  if (!s?.access_token) return null;
  return {
    accessToken: s.access_token,
    expiresAt: s.expires_at ?? null,             // secunde epoch (number)
    user: s.user ? { id: s.user.id, email: s.user.email ?? null, tier: s.user.tier ?? null } : null,
  };
}
```

### A.3 `handleLogin()` — pollează cookie, nu `executeScript`

Corpul lui `handleLogin` se schimbă doar la sursa citirii: în loc de
`chrome.scripting.executeScript({ target:{tabId}, func: readSupabaseSession, args })`,
se cheamă direct `readSupabaseSessionFromCookies(CONFIG.SUPABASE_PROJECT_REF)`.
Deschiderea tab-ului de login rămâne (userul trebuie să se logheze pe site ca
să seteze cookie-ul):

```js
async function handleLogin() {
  const url = CONFIG.WEBSITE_ORIGIN + '/login';
  await chrome.tabs.create({ url, active: true });   // userul se loghează aici
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const session = await readSupabaseSessionFromCookies(CONFIG.SUPABASE_PROJECT_REF);
    if (session?.accessToken) { await saveAuth(session); return; }
  }
  notifyAuth({ error: 'Login timed out. Loghează-te pe site, apoi apasă Log in din nou.' });
}
```
> Bonus: `chrome.cookies.get` nu are nevoie ca tab-ul să fie încărcat (citește
> din cookie jar), deci e și mai rezilient la navigări/redirecționări.

### A.4 Sincronizare pasivă — `chrome.cookies.onChanged`

Înlocuiește `content.js` (șters). La startup-ul service worker-ului:

```js
let refreshTimer = null;
function scheduleSessionRefresh() {
  // debounce: un refresh scrie mai multe chunk-uri => evită re-citiri multiple
  if (refreshTimer) return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = null;
    const session = await readSupabaseSessionFromCookies(CONFIG.SUPABASE_PROJECT_REF);
    if (session?.accessToken) await saveAuth(session);
    else await logout();   // cookie dispărut (logout pe site) -> curăță auth
  }, 400);
}

chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (!/^sb-.*-auth-token(\.\d+)?$/.test(cookie?.name ?? '')) return;
  scheduleSessionRefresh();
});
```
> Acum login-ul pe site (chiar și din alt tab, fără popup deschis) e detectat
> automat; logout-ul pe site curăță token-ul din extensie.

### A.5 Router de mesaje — deltas
- `LOGIN`: corpul schimbat (A.3). **Semnătura mesajului și `sendResponse` rămân.**
- `GET_AUTH`, `LOGOUT`, `VERIFY`: **nemodificate**.
- `SESSION_UPDATED`: devine **dead** (venea de la `content.js`, acum șters). Poți
  lăsa handler-ul (no-op) sau îl ștergi; nu afectează nimic altceva. Spec-ul
  recomandă ștergerea lui și a referinței din switch, pentru curățenie.

### A.6 `config.js`
- Nimic de schimbat funcțional. `SUPABASE_PROJECT_REF` și `WEBSITE_ORIGIN` rămân
  sursa de adevăr. (Opțional: adaugă `AUTH_COOKIE_NAME: 'sb-<ref>-auth-token'`
  calculat, dar nu e obligatoriu.)

---

## B. Minor XSS — validare schemă `http(s)` pe `href`-ul surselor (`popup.js`)

În `renderResult`, sursele se randează:
```js
const url = s.url ? ` href="${escapeHtml(s.url)}" target="_blank" rel="noopener"` : '';
```
`escapeHtml` nu respinge `javascript:`, `data:`, etc. Adaugă:

```js
// popup.js
function safeUrl(u) {
  if (!u || typeof u !== 'string') return null;
  let p;
  try { p = new URL(u); } catch { return null; }
  return (p.protocol === 'http:' || p.protocol === 'https:') ? u : null;
}
```
și folosește-l la randare:
```js
const safe = safeUrl(s.url);
if (safe) {
  html += `<a class="source" href="${escapeHtml(safe)}" target="_blank" rel="noopener">`;
} else {
  html += `<div class="source">`;        // non-link când URL-ul nu e http(s)
}
html += `<div class="s-title">${escapeHtml(s.title || s.publisher || 'Source')}</div>` +
        `<div class="s-meta">${escapeHtml(s.publisher || '')}${stance}</div>`;
html += safe ? `</a>` : `</div>`;
```
> `escapeHtml` rămâne (defense-in-depth); `safeUrl` e stratul nou care respinge
> scheme periculoase. Sursele mock (`https://example.com/...`) rămân linkuri.

---

## C. DO NOT TOUCH (explicit — sunt corecte)

1. **Flow anonim (Mode C)** — fără token → fără header `Authorization` → apel
   anonim. `verify()` construiește header-ul doar dacă `auth?.accessToken` există.
   Rămâne neschimbat.
2. **Routerul de mesaje** (`chrome.runtime.onMessage` switch:
   `VERIFY`/`LOGIN`/`LOGOUT`/`GET_AUTH`/`SESSION_UPDATED`) — semnăturile mesajelor
   și `sendResponse` rămân intacte; doar corpul `LOGIN` și cititorul de sesiune se
   schimbă (A.2–A.5).
3. **`mocks.js`** — răspunsurile mock (succes 200 cu `VerificationReport` + `usage`,
   toate codurile 400–502, regula „3 free checks" doar pentru anonim) sunt
   **corecte** și rămân neschimbate.
4. **Calea real-fetch din `verify()`** (`fetch(API_BASE + '/api/v1/verify', …)` și
   construirea header-ului `Bearer`) — neschimbată. Doar sursa token-ului se
   schimbă (cookie vs localStorage).
5. **`popup.html`/`popup.css`** și restul randării din `popup.js` — doar patch-ul
   XSS (B) atinge `popup.js`.

---

## D. Plan de verificare

1. **Unit** (fără browser): după implementare, rulează într-un `.mjs` temporar
   `readSupabaseSessionFromCookies` mock-uit cu `chrome.cookies.get` stub care
   întoarce un `base64-<base64url(JSON.stringify({currentSession:{access_token:'x',
   expires_at:…, user:{…}}}))` și verifică că extrage `accessToken`.
2. **Chunking**: stub care întoarce `null` pentru `key` și bucăți pentru `key.0`,
   `key.1` → verifică concatenare + decode.
3. **Manual**: `chrome://extensions` → Load unpacked `extension/`. Deschide
   `http://localhost:3000/login`, loghează-te. În popup, badge devine „Signed in"
   (fără să apeși Log in — `onChanged` prinde cookie-ul). Apasă Verify → `usage`
   arată `pro`/`business`. Logout pe site → badge revine la „Anonymous".
4. **XSS**: introdu în mock o sursă cu `url:"javascript:alert(1)"` → în popup
   sursa nu mai e `<a href>` (e `<div>`); click nu execută nimic.

## E. Fișiere atinse / summarize
- `manifest.json`: +`"cookies"`, −`"scripting"`, −`content_scripts`.
- `background.js`: +`fromBase64Url`/`decodeChunkedCookieValue`/`getCookieValue`/
  `readSupabaseSessionFromCookies`; `handleLogin` pollează cookie; +
  `chrome.cookies.onChanged` listener; `LOGIN` body schimbat; `SESSION_UPDATED`
  handler șters (mort).
- `content.js`: **șters**.
- `popup.js`: +`safeUrl`, randare sursă link/non-link.
- `config.js`, `mocks.js`, `popup.html`, `popup.css`, `icons/`: **net atinse**.
