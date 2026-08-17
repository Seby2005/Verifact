// Randează planul editorial 7 zile într-un folder dedicat, refolosind mașinăria de
// randare din generate_slides.mjs (renderPost). Conținutul vine din content/plan_7zile.mjs.
//
// Rulare:  node scripts/marketing/render_plan.mjs
// Output:  public/marketing/plan-7-zile-17-august-24-august/<id>/slide_N.png + caption.txt

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderPost, setSafeArea } from './generate_slides.mjs';
import { planPosts } from './content/plan_7zile.mjs';

// Zonă sigură TikTok/Reels — ține titlul sub bara de sus și verdictul/CTA peste caption.
setSafeArea({ top: 110, bottom: 260, right: 80 });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.join(__dirname, '../../public/marketing/plan-7-zile-17-august-24-august');

async function main() {
  fs.mkdirSync(outRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const lines = [];

  for (const p of planPosts) {
    const dir = path.join(outRoot, p.id);
    // Imagine reală: citește fișierul din folderul postării și îl trece ca data URI
    // (base64) în photoSrc, ca să se încarce sigur la randare, fără dependențe de rețea.
    if (p.photoFile) {
      const buf = fs.readFileSync(path.join(dir, p.photoFile));
      const mime = p.photoFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
      p.photoSrc = `data:${mime};base64,${buf.toString('base64')}`;
    }
    const res = await renderPost(page, p, dir);
    if (!res) { lines.push(`   ${p.id.padEnd(30)} ${p.format.padEnd(16)} — ⚠ TEMPLATE LIPSĂ`); continue; }
    lines.push(`   ${p.id.padEnd(30)} ${p.format.padEnd(16)} ${res.aspect}  ${res.count} sl`);
    console.log(`✓ ${p.id} — ${res.count} slide-uri (${res.aspect})`);
  }

  await browser.close();
  fs.writeFileSync(path.join(outRoot, 'INDEX.txt'),
    `Verifact — Plan 7 zile · 17–24 august 2026 (1080×1920, 9:16)\n\n${lines.join('\n')}\n`, 'utf8');
  console.log(`\n✨ gata → ${outRoot}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
