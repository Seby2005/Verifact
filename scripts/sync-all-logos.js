import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\sebii\\.gemini\\antigravity\\brain\\0782ad56-a2c2-4a69-aa78-0d5eb3f92e70';
const publicLogoDir = path.join(process.cwd(), 'public/logo');

if (!fs.existsSync(publicLogoDir)) {
  fs.mkdirSync(publicLogoDir, { recursive: true });
}

const files = fs.readdirSync(brainDir);
for (const file of files) {
  if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.svg')) {
    const src = path.join(brainDir, file);
    const dest = path.join(publicLogoDir, file);
    fs.copyFileSync(src, dest);
  }
}
console.log('All images and SVG logos synced to public/logo/');
