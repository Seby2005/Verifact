import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\sebii\\.gemini\\antigravity\\brain\\0782ad56-a2c2-4a69-aa78-0d5eb3f92e70';
const publicLogoDir = path.join(process.cwd(), 'public/logo');

const files = fs.readdirSync(publicLogoDir);
for (const file of files) {
  const src = path.join(publicLogoDir, file);
  const dest = path.join(brainDir, file);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${file} to artifact dir`);
}
