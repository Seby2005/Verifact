import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function generateLogos() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  
  // Read font as base64
  const fontPath = path.join(process.cwd(), 'src/app/fonts/boska-700.woff2');
  const fontBase64 = fs.readFileSync(fontPath).toString('base64');
  
  const publicLogoDir = path.join(process.cwd(), 'public/logo');
  if (!fs.existsSync(publicLogoDir)) {
    fs.mkdirSync(publicLogoDir, { recursive: true });
  }

  // HTML template for pixel perfect logo rendering
  function getHtml(vColor = '#17140f', bracketColor = '#000000', bgColor = '#f3f2ed') {
    return `<!DOCTYPE html>
<html>
<head>
<style>
  @font-face {
    font-family: 'Boska';
    src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
    font-weight: 700;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px;
    height: 1024px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${bgColor};
    font-family: 'Boska', serif;
  }
  .logo-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 28px;
    line-height: 1;
  }
  .v-text {
    font-size: 380px;
    font-weight: 700;
    color: ${vColor};
    letter-spacing: -0.02em;
    transform: translateY(-8px);
  }
  .bracket {
    width: 60px;
    height: 380px;
    border: 32px solid ${bracketColor};
    flex: none;
  }
  .bracket-left {
    border-right: none;
  }
  .bracket-right {
    border-left: none;
  }
</style>
</head>
<body>
  <div class="logo-container">
    <div class="bracket bracket-left"></div>
    <span class="v-text">V</span>
    <div class="bracket bracket-right"></div>
  </div>
</body>
</html>`;
  }

  // Variant 1: Black V with Black Brackets on Porcelain (#f3f2ed)
  await page.setContent(getHtml('#17140f', '#000000', '#f3f2ed'));
  await page.screenshot({ path: path.join(publicLogoDir, 'verifact-v-logo-black.png') });
  console.log('Saved verifact-v-logo-black.png');

  // Variant 2: Red V with Black Brackets on Porcelain (#f3f2ed)
  await page.setContent(getHtml('#d63a2c', '#000000', '#f3f2ed'));
  await page.screenshot({ path: path.join(publicLogoDir, 'verifact-v-logo-red.png') });
  console.log('Saved verifact-v-logo-red.png');

  // Variant 3: Black V with Black Brackets on White (#ffffff)
  await page.setContent(getHtml('#17140f', '#000000', '#ffffff'));
  await page.screenshot({ path: path.join(publicLogoDir, 'verifact-v-logo-white-bg.png') });
  console.log('Saved verifact-v-logo-white-bg.png');

  // Variant 4: Transparent background
  await page.setContent(getHtml('#17140f', '#000000', 'transparent'));
  await page.screenshot({ path: path.join(publicLogoDir, 'verifact-v-logo-transparent.png'), omitBackground: true });
  console.log('Saved verifact-v-logo-transparent.png');

  // Variant 5: Dark Mode (White V with Black Brackets? or White Brackets on Dark Background)
  await page.setContent(getHtml('#f3f2ed', '#ffffff', '#17140f'));
  await page.screenshot({ path: path.join(publicLogoDir, 'verifact-v-logo-dark.png') });
  console.log('Saved verifact-v-logo-dark.png');

  await browser.close();
}

generateLogos().catch(console.error);
