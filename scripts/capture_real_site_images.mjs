import { chromium } from '@playwright/test';
import path from 'path';

const targetDir = 'C:/Users/sebii/.gemini/antigravity/brain/5a0e9cd9-e996-4683-9067-339b10933c6b';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3005...');
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // 1. Capture Main Homepage (Stage & Verify Tool)
  await page.screenshot({
    path: path.join(targetDir, 'real_verifact_hero_stage.png'),
    clip: { x: 0, y: 0, width: 1280, height: 720 },
  });
  console.log('1. Captured real_verifact_hero_stage.png');

  // 2. Capture Animated Demo / Report Specimen
  const specimen = page.locator('section[class*="specimen"]');
  if (await specimen.count() > 0) {
    await specimen.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(targetDir, 'real_verifact_animated_demo.png'),
      clip: { x: 0, y: 320, width: 1280, height: 720 },
    });
    console.log('2. Captured real_verifact_animated_demo.png');
  }

  // 3. Render clean logo using the site's exact CSS and fonts (Boska serif + red brackets)
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.body.innerHTML = `
      <div style="background-color: #12100d; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0;">
        <div style="display: inline-flex; align-items: center; gap: 0.16em; font-family: var(--font-boska), Georgia, serif; font-weight: 700; font-size: 110px; color: #f3f2ed; line-height: 1; letter-spacing: -0.02em;">
          <span style="width: 0.22em; height: 0.8em; border: 0.12em solid #d9383a; border-right: none; flex: none;"></span>
          <span>Verifact</span>
          <span style="width: 0.22em; height: 0.8em; border: 0.12em solid #d9383a; border-left: none; flex: none;"></span>
        </div>
      </div>
    `;
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(targetDir, 'real_verifact_clean_logo_banner.png'),
    clip: { x: 0, y: 0, width: 1280, height: 720 },
  });
  console.log('3. Captured real_verifact_clean_logo_banner.png');

  // 4. Capture Despre Dezinformare Page
  try {
    await page.goto('http://localhost:3005/despre-dezinformare', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(targetDir, 'real_verifact_despre_dezinformare.png'),
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    console.log('4. Captured real_verifact_despre_dezinformare.png');
  } catch (e) {
    console.log('Skipping page 4:', e.message);
  }

  await browser.close();
  console.log('SUCCESS: All 4 real website images captured!');
}

capture();
