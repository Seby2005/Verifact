const { chromium } = require('playwright');

const EMAIL = `verifact.qa.${Date.now()}@gmail.com`;
const PASS = 'TestVerifact!2026';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

  console.log('email:', EMAIL);

  // --- signup through the UI ---
  await page.goto('http://localhost:3000/cont', { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByRole('tab', { name: /creează cont/i }).click();
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(6000);
  const signupMsg = (await page.locator('[aria-live="polite"]').innerText().catch(() => '')).trim();
  console.log('SIGNUP ->', JSON.stringify(signupMsg.slice(0, 160)));

  // --- login through the UI ---
  await page.goto('http://localhost:3000/cont', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(6000);
  const loginMsg = (await page.locator('[aria-live="polite"]').innerText().catch(() => '')).trim();
  console.log('LOGIN  ->', JSON.stringify(loginMsg.slice(0, 160)));

  // --- session persists across reload? ---
  await page.reload({ waitUntil: 'networkidle' });
  const cookies = await ctx.cookies();
  const authCookie = cookies.filter((c) => /sb-.*auth-token/.test(c.name));
  console.log('SESSION cookies after reload:', authCookie.length ? authCookie.map((c) => c.name).join(',') : 'NONE');

  console.log('console errors:', errors.length ? errors.slice(0, 4) : 'none');
  await browser.close();
  console.log('EMAIL_USED=' + EMAIL);
})();
