import fs from 'fs';
import path from 'path';

const fontPath = path.join(process.cwd(), 'src/app/fonts/boska-700.woff2');
const fontBase64 = fs.readFileSync(fontPath).toString('base64');

function generateSvg({ vColor = '#17140f', bracketColor = '#000000', bgColor = '#f3f2ed', isTransparent = false }) {
  const bgRect = isTransparent ? '' : `<rect width="1000" height="1000" fill="${bgColor}" />`;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <style>
      @font-face {
        font-family: 'Boska';
        src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
        font-weight: 700;
        font-style: normal;
      }
      .logo-v {
        font-family: 'Boska', Georgia, serif;
        font-size: 400px;
        font-weight: 700;
        fill: ${vColor};
        text-anchor: middle;
        dominant-baseline: central;
      }
      .bracket {
        fill: none;
        stroke: ${bracketColor};
        stroke-width: 32;
        stroke-linecap: square;
      }
    </style>
  </defs>
  ${bgRect}
  <!-- Left Bracket -->
  <path class="bracket" d="M 330 310 L 270 310 L 270 690 L 330 690" />
  
  <!-- Central V -->
  <text x="500" y="506" class="logo-v">V</text>
  
  <!-- Right Bracket -->
  <path class="bracket" d="M 670 310 L 730 310 L 730 690 L 670 690" />
</svg>`;
}

const publicLogoDir = path.join(process.cwd(), 'public/logo');
if (!fs.existsSync(publicLogoDir)) {
  fs.mkdirSync(publicLogoDir, { recursive: true });
}

// 1. Black V + Black Brackets on Porcelain (#f3f2ed)
fs.writeFileSync(
  path.join(publicLogoDir, 'verifact-v-logo-black.svg'),
  generateSvg({ vColor: '#17140f', bracketColor: '#000000', bgColor: '#f3f2ed' })
);

// 2. Red V + Black Brackets on Porcelain (#f3f2ed)
fs.writeFileSync(
  path.join(publicLogoDir, 'verifact-v-logo-red.svg'),
  generateSvg({ vColor: '#d63a2c', bracketColor: '#000000', bgColor: '#f3f2ed' })
);

// 3. Black V + Black Brackets Transparent
fs.writeFileSync(
  path.join(publicLogoDir, 'verifact-v-logo-transparent.svg'),
  generateSvg({ vColor: '#17140f', bracketColor: '#000000', isTransparent: true })
);

// 4. White V + White Brackets Dark Mode (#17140f)
fs.writeFileSync(
  path.join(publicLogoDir, 'verifact-v-logo-dark.svg'),
  generateSvg({ vColor: '#f3f2ed', bracketColor: '#ffffff', bgColor: '#17140f' })
);

console.log('SVG logos generated successfully in public/logo/');
