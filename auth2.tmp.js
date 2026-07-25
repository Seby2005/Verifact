const { chromium } = require('playwright');
const fs = require('fs');

const env = {};
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' };

const EMAIL = process.argv[2];
const PASS = 'TestVerifact!2026';

(async () => {
  // Confirm the address the way clicking the emailed link would.
  const list = await (await fetch(`${SB}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  const user = (list.users || []).find((u) => u.email === EMAIL);
  if (!user) { console.log('user not found in auth'); process.exit(1); }
  console.log('user in DB:', user.id, '| confirmed before:', !!user.email_confirmed_at);

  const upd = await fetch(`${SB}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ email_confirm: true }),
  });
  console.log('confirm via admin API:', upd.status);

  // profile row auto-created by trigger?
  const prof = await (await fetch(`${SB}/rest/v1/profiles?id=eq.${user.id}&select=*`, { headers: H })).json();
  console.log('profile row created by trigger:', Array.isArray(prof) && prof.length ? 'YES tier=' + prof[0].tier : 'NO');

  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });

  // login
  await page.goto('http://localhost:3000/cont', { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(6000);
  console.log('LOGIN ->', JSON.stringify((await page.locator('[aria-live="polite"]').innerText().catch(() => '')).trim().slice(0, 120)));

  // session persistence across reload
  await page.reload({ waitUntil: 'networkidle' });
  const cookies = await ctx.cookies();
  const tok = cookies.filter((c) => /sb-.*auth-token(\.\d+)?$/.test(c.name));
  console.log('SESSION after reload:', tok.length ? 'PERSISTS (' + tok.length + ' cookie(s))' : 'LOST');

  // authenticated API calls — these are what the RLS recursion breaks
  for (const path of ['/api/user/profile', '/api/user/usage', '/api/user/verifications']) {
    const r = await page.evaluate(async (p) => {
      const res = await fetch(p);
      const t = await res.text();
      return { s: res.status, t: t.slice(0, 130) };
    }, path);
    console.log(`GET ${path.padEnd(28)} -> ${r.s}  ${r.t}`);
  }

  // a verification while logged in (Phase 3: does it save to history?)
  const v = await page.evaluate(async () => {
    const res = await fetch('/api/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Capitala Frantei este orasul Paris.', inputType: 'text', language: 'ro', isPublic: false }),
    });
    return { s: res.status, b: (await res.text()).slice(0, 90) };
  });
  console.log('POST /api/verify (logged in) ->', v.s, v.b);

  await page.waitForTimeout(1500);
  const hist = await page.evaluate(async () => {
    const res = await fetch('/api/user/verifications');
    return { s: res.status, t: (await res.text()).slice(0, 160) };
  });
  console.log('history after verify ->', hist.s, hist.t);

  console.log('console errors:', errors.length ? errors.slice(0, 3) : 'none');
  await browser.close();
})();
