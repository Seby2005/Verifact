// Verifact — generator de slideshow-uri TikTok / Reels (1080×1920).
// Implementează sistemul de design din „Formate TikTok.dc.html”: hârtie + cerneală,
// tipografie editorială (Fraunces / Hanken Grotesk / JetBrains Mono), iar CULOAREA
// înseamnă un singur lucru — verdictul (verde adevărat · chihlimbar parțial · ardezie neclar · roșu fals).
//
// Rulare:  node scripts/marketing/generate_slides.mjs
// Output:  public/marketing/verifact/<format>/<id>/slide_N.png  +  caption.txt
// Conținutul se editează în:  scripts/marketing/content/posts.mjs
//
// Necesită @playwright/test (deja în devDependencies). Prima rulare poate cere:
//   npx playwright install chromium

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { posts } from './content/posts.mjs';

// Draft-uri auto-generate din fact-check-uri (draft_from_factcheck.mjs), dacă există.
let drafts = [];
try { ({ drafts } = await import('./content/_drafts.mjs')); } catch { /* niciun draft */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── tokens ─────────────────────────────────────────────────────────────────
const VERDICT = {
  true:    { label: 'Probabil adevărat', c: '#1a6b54' },
  partial: { label: 'Parțial adevărat',  c: '#986516' },
  unclear: { label: 'Neclar',            c: '#4d5866' },
  false:   { label: 'Probabil fals',     c: '#a63a39' },
};
const TONE_LIGHT = {
  true:    { border: '#1a6b54', label: '#1a6b54' },
  partial: { border: '#986516', label: '#986516' },
  unclear: { border: '#4d5866', label: '#4d5866' },
  false:   { border: '#a63a39', label: '#a63a39' },
  neutral: { border: '#d3d2cb', label: '#62646c' },
};
const TONE_DARK = { true: '#4ea88a', partial: '#d09a3c', unclear: '#99a3b0', false: '#e08582' };

// Înălțimea pânzei, pe canal (lățime mereu 1080):
//   TikTok/Reels 9:16 = 1920 · Instagram/Facebook feed 4:5 = 1350.
// Setată per postare în main(); renderele o citesc prin `H`.
const ASPECT = { tiktok: 1920, instagram: 1350, facebook: 1350, verifact: 1920, _drafts: 1920 };
let H = 1920;

// ── mici utilitare de text ───────────────────────────────────────────────────
const br = (s) => String(s).replace(/\n/g, '<br>');
// <t>…</t> = subliniere verde (adevăr) · <f>…</f> = subliniere roșie (nuanță/fals)
const mk = (s) => String(s)
  .replace(/<t>/g, '<span style="border-bottom:8px solid #1a6b54;padding-bottom:2px">')
  .replace(/<f>/g, '<span style="border-bottom:8px solid #a63a39;padding-bottom:2px">')
  .replace(/<\/[tf]>/g, '</span>');
const numSize = (s) => { const L = String(s).length; return L <= 3 ? 300 : L <= 5 ? 220 : L <= 8 ? 150 : 110; };

// ── chrome comun (antet, marcă, footer) ──────────────────────────────────────
const slide = (bg, inner, pad = '100px 88px') =>
  `<div style="width:1080px;height:${H}px;background:${bg};padding:${pad};display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;position:relative">${inner}</div>`;

function hdr(eyebrow, counter, { dark = false, accent = null } = {}) {
  const eColor = accent || (dark ? '#8a8d95' : '#62646c');
  const cColor = dark ? '#c9cace' : '#3f424a';
  const cBg = dark ? 'rgba(255,255,255,.08)' : '#f3f2ec';
  return `<div style="display:flex;justify-content:space-between;align-items:center">
    <span style="font:700 32px 'JetBrains Mono';letter-spacing:.15em;text-transform:uppercase;color:${eColor}">${eyebrow}</span>
    <span style="font:600 32px 'JetBrains Mono';color:${cColor};background:${cBg};border-radius:999px;padding:12px 30px">${counter}</span>
  </div>`;
}

const markLight = `<span style="font:800 42px 'Hanken Grotesk';color:#16181c">[<span style="font:600 42px Fraunces;color:#a63a39;margin:0 3px">V</span>]&nbsp;<span style="font:600 30px 'JetBrains Mono';color:#62646c">verifact.ro</span></span>`;
const markDark = `<span style="font:800 42px 'Hanken Grotesk';color:#fbfbf9">[<span style="font:600 42px Fraunces;color:#e08582;margin:0 3px">V</span>]&nbsp;<span style="font:600 30px 'JetBrains Mono';color:#8a8d95">verifact.ro</span></span>`;
const swipe = (dark) => `<span style="font:600 30px 'JetBrains Mono';letter-spacing:.1em;text-transform:uppercase;color:${dark ? '#c9cace' : '#16181c'}">Glisează →</span>`;
const footL = (mark) => `<div style="display:flex;justify-content:flex-end;align-items:flex-end;margin-top:auto">${mark}</div>`;

// Slide final de CTA — mereu pe fundal închis, capătul comun al fiecărei serii.
function ctaDark({ counter, eyebrow = 'Verifică tu', line, sub }) {
  return slide('#16181c', `
    ${hdr(eyebrow, counter, { dark: true })}
    <div style="margin:auto 0">
      <p style="font:600 96px/1.08 Fraunces;color:#fbfbf9;margin:0">${br(line)}</p>
      <p style="font:500 46px/1.4 'Hanken Grotesk';color:#c9cace;margin:52px 0 0">${sub}</p>
    </div>
    <div style="display:flex;align-items:center;gap:24px;margin-top:64px">
      <span style="font:800 76px 'Hanken Grotesk';color:#fbfbf9">[<span style="font:600 76px Fraunces;color:#e08582;margin:0 5px">V</span>]</span>
      <div style="display:flex;flex-direction:column">
        <span style="font:800 52px 'Hanken Grotesk';color:#fbfbf9;line-height:1.1">Verifact</span>
        <span style="font:600 34px 'JetBrains Mono';color:#8a8d95">verifact.ro</span>
      </div>
    </div>`);
}

// ── cele 7 sisteme de format ─────────────────────────────────────────────────
const RENDERERS = {

  // 1a — verdict ca erou; scorul mereu ca text mono
  verdictStamp(p) {
    const v = VERDICT[p.verdict], n = 3;
    const cover = slide('#fbfbf9', `
      ${hdr(p.eyebrow, `1/${n}`)}
      <div style="margin-top:110px">
        <span style="font:700 34px 'JetBrains Mono';letter-spacing:.14em;text-transform:uppercase;color:#a63a39">${p.claimIntro}</span>
        <p style="font:600 120px/1.05 Fraunces;color:#16181c;margin:36px 0 0;letter-spacing:-.015em">${p.claim}</p>
      </div>
      <div style="margin-top:auto">
        <div style="height:3px;background:#e6e5df;margin-bottom:52px"></div>
        <span style="font:600 34px 'JetBrains Mono';letter-spacing:.14em;text-transform:uppercase;color:#62646c">Verdict</span>
        <p style="font:800 108px/1 'Hanken Grotesk';color:${v.c};letter-spacing:-.02em;margin:22px 0 0">${v.label}</p>
        <div style="display:flex;align-items:center;gap:26px;margin-top:40px">
          <span style="font:700 100px 'JetBrains Mono';color:${v.c};line-height:1">${p.score}</span>
          <span style="font:500 38px/1.2 'Hanken Grotesk';color:#3f424a">${br(p.confidenceNote)}</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:66px">${swipe(false)}${markLight}</div>`);
    const evidence = slide('#fbfbf9', `
      ${hdr('Dovezile', `2/${n}`)}
      <p style="font:600 84px/1.04 Fraunces;color:#16181c;margin:80px 0 64px">${p.evidenceTitle}</p>
      <div style="display:flex;flex-direction:column;gap:52px">
        ${p.evidence.map((e) => { const t = TONE_LIGHT[e.tone] || TONE_LIGHT.neutral; return `
          <div style="border-left:8px solid ${t.border};padding-left:40px">
            <span style="font:600 30px 'JetBrains Mono';letter-spacing:.06em;color:${t.label}">${e.src}</span>
            <p style="font:500 44px/1.32 'Hanken Grotesk';color:#3f424a;margin:14px 0 0">${e.text}</p>
          </div>`; }).join('')}
      </div>
      ${footL(markLight)}`);
    return [cover, evidence, ctaDark({ counter: `${n}/${n}`, ...p.cta })];
  },

  // 1b — foto full-bleed + bandă de hârtie
  fotoBanda(p) {
    const v = VERDICT[p.verdict], n = 3;
    const cover = slide('#16181c', `
      <div style="position:relative;height:${Math.round(H * 0.6146)}px;background:repeating-linear-gradient(135deg,#3a3d44 0 34px,#33363d 34px 68px);overflow:hidden">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="font:500 40px 'JetBrains Mono';color:rgba(255,255,255,.5);letter-spacing:.04em">${p.photo}</span></div>
        <div style="position:absolute;top:60px;left:64px;font:600 30px 'JetBrains Mono';letter-spacing:.14em;text-transform:uppercase;color:#fbfbf9;background:rgba(0,0,0,.42);border-radius:999px;padding:12px 26px">${p.eyebrow}</div>
        <div style="position:absolute;top:60px;right:64px;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.42);border-radius:999px;padding:10px 24px"><span style="font:800 40px 'Hanken Grotesk';color:#fff">[<span style="font:600 40px Fraunces;color:#e08582;margin:0 2px">V</span>]</span></div>
        <div style="position:absolute;bottom:34px;right:60px;font:500 26px 'JetBrains Mono';color:rgba(255,255,255,.72)">${p.photoCredit}</div>
      </div>
      <div style="background:#fbfbf9;padding:70px 80px 0;flex:1;display:flex;flex-direction:column">
        <span style="display:inline-block;font:700 30px 'JetBrains Mono';letter-spacing:.1em;text-transform:uppercase;color:${v.c};border:3px solid ${v.c};border-radius:999px;padding:10px 26px;align-self:flex-start">${p.verdictText}</span>
        <p style="font:800 90px/1.02 'Hanken Grotesk';color:#16181c;margin:38px 0 0;letter-spacing:-.02em">${p.headline}</p>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-bottom:66px">${swipe(false)}<span style="font:600 30px 'JetBrains Mono';color:#62646c">verifact.ro</span></div>
      </div>`, '0');
    const inner = slide('#fbfbf9', `
      ${hdr(p.inner.eyebrow, `2/${n}`)}
      <p style="font:600 82px/1.05 Fraunces;color:#16181c;margin:72px 0 48px">${p.inner.title}</p>
      <p style="font:500 50px/1.44 'Hanken Grotesk';color:#3f424a;margin:0">${mk(p.inner.body)}</p>
      <div style="margin-top:56px;background:#f3f2ec;border-radius:20px;padding:44px 48px">
        <span style="font:600 28px 'JetBrains Mono';letter-spacing:.1em;text-transform:uppercase;color:#62646c">Sursă</span>
        <p style="font:600 42px/1.3 'Hanken Grotesk';color:#16181c;margin:12px 0 0">${p.inner.source}</p>
      </div>
      ${footL(markLight)}`);
    return [cover, inner, ctaDark({ counter: `${n}/${n}`, ...p.cta })];
  },

  // 1c — split roșu/verde pe verticală; binar, punchy
  mitAdevar(p) {
    const n = 3;
    const half = Math.round(H / 2);
    const cover = slide('transparent', `
      <div style="height:${half}px;background:#a63a39;padding:96px 88px;display:flex;flex-direction:column;box-sizing:border-box;position:relative">
        <span style="font:700 34px 'JetBrains Mono';letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.7)">Mit</span>
        <p style="font:800 96px/1.06 'Hanken Grotesk';color:#fbfbf9;margin:34px 0 0;letter-spacing:-.02em;text-decoration:line-through;text-decoration-thickness:8px;text-decoration-color:rgba(255,255,255,.55)">${p.myth}</p>
        <span style="position:absolute;bottom:60px;left:88px;font:600 30px 'JetBrains Mono';color:rgba(255,255,255,.8)">${p.mythNote}</span>
      </div>
      <div style="height:${half}px;background:#1a6b54;padding:96px 88px;display:flex;flex-direction:column;box-sizing:border-box;position:relative">
        <span style="font:700 34px 'JetBrains Mono';letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.72)">De fapt</span>
        <p style="font:700 78px/1.1 Fraunces;color:#fbfbf9;margin:34px 0 0">${p.truth}</p>
        <div style="position:absolute;bottom:56px;right:88px;display:flex;align-items:center;gap:18px">
          <span style="font:800 52px 'Hanken Grotesk';color:#fbfbf9">[<span style="font:600 52px Fraunces;color:#fbfbf9;margin:0 3px">V</span>]</span>
          <span style="font:600 30px 'JetBrains Mono';color:rgba(255,255,255,.85)">verifact.ro</span>
        </div>
      </div>
      <div style="position:absolute;top:${half - 48}px;left:50%;transform:translateX(-50%);width:150px;height:150px;border-radius:50%;background:#fbfbf9;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 12px rgba(0,0,0,.08)"><span style="font:700 46px 'JetBrains Mono';color:#16181c">vs</span></div>`, '0');
    const s = p.inner.stat;
    const inner = slide('#fbfbf9', `
      ${hdr('De ce circulă', `2/${n}`)}
      <p style="font:600 84px/1.04 Fraunces;color:#16181c;margin:76px 0 56px">${p.inner.title}</p>
      <p style="font:500 50px/1.44 'Hanken Grotesk';color:#3f424a;margin:0 0 40px">${mk(p.inner.body)}</p>
      <div style="background:#f3f2ec;border-radius:20px;padding:44px 48px;display:flex;flex-direction:column;gap:30px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font:600 42px 'Hanken Grotesk';color:#16181c">${s.aLabel}</span><span style="font:600 42px 'JetBrains Mono';color:#3f424a">${s.aVal}</span></div>
        <div style="height:2px;background:#d3d2cb"></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font:600 42px 'Hanken Grotesk';color:#16181c">${s.bLabel}</span><span style="font:600 42px 'JetBrains Mono';color:#3f424a">${s.bVal}</span></div>
      </div>
      ${footL(markLight)}`);
    return [cover, inner, ctaDark({ counter: `${n}/${n}`, ...p.cta })];
  },

  // 1d — infografic de redacție; numere mono uriașe
  barometru(p) {
    const n = 3;
    const cover = slide('#15161a', `
      ${hdr(p.eyebrow || 'Barometrul veridicității', `1/${n}`, { dark: true })}
      <p style="font:600 40px 'JetBrains Mono';color:#8a8d95;margin:64px 0 0;letter-spacing:.04em">${p.period}</p>
      <div style="margin-top:70px">
        <span style="font:700 220px/0.9 'JetBrains Mono';color:#fbfbf9;letter-spacing:-.03em">${p.total}</span>
        <p style="font:500 52px/1.3 'Hanken Grotesk';color:#c9cace;margin:28px 0 0">${br(p.totalNote)}</p>
      </div>
      <div style="margin-top:auto;display:flex;gap:56px">
        <div><span style="font:700 96px 'JetBrains Mono';color:${TONE_DARK[p.statA.tone]};line-height:1">${p.statA.val}</span><p style="font:500 38px/1.25 'Hanken Grotesk';color:#c9cace;margin:16px 0 0">${br(p.statA.note)}</p></div>
        <div style="width:2px;background:rgba(255,255,255,.12)"></div>
        <div><span style="font:700 96px 'JetBrains Mono';color:${TONE_DARK[p.statB.tone]};line-height:1">${p.statB.val}</span><p style="font:500 38px/1.25 'Hanken Grotesk';color:#c9cace;margin:16px 0 0">${br(p.statB.note)}</p></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:66px">${swipe(true)}${markDark}</div>`);
    const bars = slide('#15161a', `
      ${hdr('Unde lovește', `2/${n}`, { dark: true })}
      <p style="font:600 80px/1.05 Fraunces;color:#fbfbf9;margin:72px 0 70px">${br(p.barsTitle)}</p>
      <div style="display:flex;flex-direction:column;gap:56px">
        ${p.bars.map((b) => { const c = TONE_DARK[b.tone]; return `
          <div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:22px"><span style="font:600 48px 'Hanken Grotesk';color:#fbfbf9">${b.label}</span><span style="font:700 48px 'JetBrains Mono';color:${c}">${b.pct}%</span></div>
            <div style="height:34px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden"><div style="width:${b.pct}%;height:100%;background:${c}"></div></div>
          </div>`; }).join('')}
      </div>
      ${footL(markDark)}`);
    return [cover, bars, ctaDark({ counter: `${n}/${n}`, ...p.cta })];
  },

  // 1e — numere Fraunces uriașe; listă educativă
  explainer(p) {
    const n = p.signs.length + 2;
    const cover = slide('#fbfbf9', `
      ${hdr(p.eyebrow, 'Ghid', { accent: '#a63a39' })}
      <div style="margin:auto 0">
        <span style="font:700 40px 'JetBrains Mono';letter-spacing:.06em;color:#62646c">${p.kicker}</span>
        <p style="font:600 128px/1.02 Fraunces;color:#16181c;margin:30px 0 0;letter-spacing:-.02em">${br(p.title)}</p>
      </div>
      <div style="display:flex;gap:20px;margin-bottom:20px">
        ${p.signs.map((_, i) => `<span style="font:700 40px 'JetBrains Mono';color:${i === 0 ? '#a63a39' : '#16181c'};border:3px solid ${i === 0 ? '#a63a39' : '#d3d2cb'};border-radius:14px;padding:14px 26px">0${i + 1}</span>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:36px">${swipe(false)}${markLight}</div>`, '110px 88px');
    const signSlides = p.signs.map((sg, i) => slide('#fbfbf9', `
      ${hdr('Semnul', `${i + 2}/${n}`)}
      <span style="font:700 300px/0.85 Fraunces;color:#a63a39;margin:60px 0 0">0${i + 1}</span>
      <p style="font:600 88px/1.06 Fraunces;color:#16181c;margin:40px 0 0">${sg.title}</p>
      <p style="font:500 50px/1.42 'Hanken Grotesk';color:#3f424a;margin:44px 0 0">${sg.body}</p>
      ${footL(markLight)}`, '110px 88px'));
    return [cover, ...signSlides, ctaDark({ counter: `${n}/${n}`, eyebrow: 'Reține', ...p.cta })];
  },

  // 1f — dosar de investigație; adnotări roșii pe screenshot
  analizaFoto(p) {
    const n = 3;
    const cover = slide('#16181c', `
      ${hdr(p.eyebrow, `1/${n}`, { dark: true })}
      <p style="font:600 96px/1.04 Fraunces;color:#fbfbf9;margin:56px 0 44px">${br(p.coverTitle)}</p>
      <div style="position:relative;border-radius:22px;overflow:hidden;background:repeating-linear-gradient(135deg,#2c2f36 0 30px,#26292f 30px 60px);height:760px;box-shadow:0 0 0 3px rgba(255,255,255,.1)">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 40px"><span style="font:500 38px 'JetBrains Mono';color:rgba(255,255,255,.45)">${p.photo}</span></div>
        <span style="position:absolute;top:56px;left:52px;font:700 30px 'JetBrains Mono';color:#fbfbf9;background:#a63a39;border-radius:10px;padding:12px 22px;transform:rotate(-4deg)">FĂRĂ SURSĂ</span>
        <span style="position:absolute;bottom:80px;right:52px;font:700 30px 'JetBrains Mono';color:#fbfbf9;background:#a63a39;border-radius:10px;padding:12px 22px;transform:rotate(3deg)">DETALII CIUDATE?</span>
        <div style="position:absolute;top:300px;left:50%;transform:translate(-50%,0);width:280px;height:280px;border:8px solid #e08582;border-radius:50%"></div>
      </div>
      <div style="display:flex;align-items:center;gap:30px;margin-top:auto;padding-top:56px">
        <span style="font:700 84px 'JetBrains Mono';color:#99a3b0;line-height:1">${p.coverScore}</span>
        <div><span style="font:800 66px 'Hanken Grotesk';color:#99a3b0;line-height:1;letter-spacing:-.02em">${p.coverVerdict}</span><p style="font:500 34px 'Hanken Grotesk';color:#c9cace;margin:12px 0 0">${p.coverNote}</p></div>
        <span style="font:800 44px 'Hanken Grotesk';color:#fbfbf9;margin-left:auto">[<span style="font:600 44px Fraunces;color:#e08582;margin:0 3px">V</span>]</span>
      </div>`, '96px 84px');
    const findings = slide('#fbfbf9', `
      ${hdr('Ce am găsit', `2/${n}`)}
      <p style="font:600 84px/1.04 Fraunces;color:#16181c;margin:72px 0 60px">${p.findingsTitle}</p>
      <div style="display:flex;flex-direction:column;gap:46px">
        ${p.findings.map((f, i) => `<div style="display:flex;gap:32px;align-items:flex-start"><span style="font:700 44px 'JetBrains Mono';color:#a63a39">0${i + 1}</span><p style="font:500 46px/1.34 'Hanken Grotesk';color:#3f424a;margin:0">${f}</p></div>`).join('')}
      </div>
      <div style="margin-top:56px;background:#16181c;border-radius:20px;padding:40px 48px;display:flex;align-items:center;gap:28px">
        <span style="font:700 68px 'JetBrains Mono';color:#e08582;line-height:1">${p.finalScore}</span>
        <span style="font:600 40px/1.25 'Hanken Grotesk';color:#fbfbf9">${p.finalNote}</span>
      </div>
      ${footL(markLight)}`);
    return [cover, findings, ctaDark({ counter: `${n}/${n}`, ...p.cta })];
  },

  // Manifest — intro / „despre”; pentru postările de pin (profil IG/FB)
  manifest(p) {
    const n = 3;
    const cover = slide('#fbfbf9', `
      ${hdr(p.eyebrow, `1/${n}`, { accent: '#a63a39' })}
      <div style="margin:auto 0">
        <p style="font:600 116px/1.04 Fraunces;color:#16181c;margin:0;letter-spacing:-.02em">${br(p.statement)}</p>
        <p style="font:500 46px/1.4 'Hanken Grotesk';color:#3f424a;margin:48px 0 0">${p.sub}</p>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">${swipe(false)}${markLight}</div>`);
    const list = slide('#fbfbf9', `
      ${hdr(p.listTitle, `2/${n}`)}
      <div style="display:flex;flex-direction:column;gap:44px;margin-top:80px">
        ${p.list.map((it) => { const t = TONE_LIGHT[it.tone] || TONE_LIGHT.neutral; return `
          <div style="border-left:8px solid ${t.border};padding-left:40px">
            <span style="font:700 30px 'JetBrains Mono';letter-spacing:.08em;text-transform:uppercase;color:${t.label}">${it.k}</span>
            <p style="font:500 46px/1.34 'Hanken Grotesk';color:#3f424a;margin:12px 0 0">${it.v}</p>
          </div>`; }).join('')}
      </div>
      ${footL(markLight)}`);
    return [cover, list, ctaDark({ counter: `${n}/${n}`, eyebrow: 'Începe', ...p.cta })];
  },

  // Statistică — un singur număr mare + sursă obligatorie; consum instant
  statistica(p) {
    const n = 3;
    const cover = slide('#15161a', `
      ${hdr(p.eyebrow, `1/${n}`, { dark: true })}
      <div style="margin:auto 0">
        <span style="font:700 ${numSize(p.bigNumber)}px/0.86 'JetBrains Mono';color:#fbfbf9;letter-spacing:-.03em">${p.bigNumber}</span>
        <p style="font:600 60px/1.18 Fraunces;color:#fbfbf9;margin:40px 0 0">${br(p.bigLabel)}</p>
      </div>
      <div style="background:rgba(255,255,255,.06);border-left:6px solid #4ea88a;border-radius:0 14px 14px 0;padding:26px 34px;margin-bottom:26px">
        <span style="font:600 26px 'JetBrains Mono';letter-spacing:.1em;text-transform:uppercase;color:#8a8d95">Sursă</span>
        <p style="font:600 36px/1.3 'Hanken Grotesk';color:#fbfbf9;margin:8px 0 0">${p.source}</p>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">${swipe(true)}${markDark}</div>`);
    const twist = slide('#fbfbf9', `
      ${hdr(p.twist.kicker, `2/${n}`, { accent: '#a63a39' })}
      <p style="font:600 92px/1.05 Fraunces;color:#16181c;margin:80px 0 0">${br(p.twist.title)}</p>
      <p style="font:500 50px/1.42 'Hanken Grotesk';color:#3f424a;margin:52px 0 0">${p.twist.body}</p>
      ${footL(markLight)}`);
    return [cover, twist, ctaDark({ counter: `${n}/${n}`, ...p.cta })];
  },
};

// ── document + randare ───────────────────────────────────────────────────────
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">`;
const doc = (s) => `<!doctype html><html lang="ro"><head><meta charset="utf-8">${FONTS}<style>*{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:${H}px}body{font-family:'Hanken Grotesk',system-ui,sans-serif}</style></head><body>${s}</body></html>`;

async function main() {
  const outRoot = path.join(__dirname, '../../public/marketing');
  fs.mkdirSync(outRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const byChannel = {};

  const all = [...posts, ...drafts.map((d) => ({ ...d, _draft: true }))];
  for (const p of all) {
    const render = RENDERERS[p.format];
    if (!render) { console.warn(`! format necunoscut: ${p.format} (${p.id})`); continue; }
    // Postările cu `channel` merg în folderul canalului (instagram/tiktok/facebook);
    // draft-urile merg în _drafts/ (aprobare); restul grupate pe format sub verifact/.
    const ch = p._draft ? '_drafts' : (p.channel || 'verifact');
    H = ASPECT[p.channel] ?? ASPECT[ch] ?? 1920;   // înălțimea pânzei pe canal (citită de renderere)
    page.setViewportSize({ width: 1080, height: H });
    const slides = render(p);
    const base = p._draft ? path.join(outRoot, '_drafts')
      : p.channel ? path.join(outRoot, ch)
        : path.join(outRoot, 'verifact', p.format);
    const dir = path.join(base, p.id);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < slides.length; i++) {
      await page.setContent(doc(slides[i]), { waitUntil: 'load' });
      try { await page.evaluate(() => document.fonts.ready); } catch { /* fonts fallback */ }
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(dir, `slide_${i + 1}.png`), type: 'png' });
    }
    const notes = [];
    if (p._draft) notes.push(`⚠ DRAFT — verifică sursa înainte de post. Canal sugerat: ${p.channel || 'tiktok'}.`);
    if (p.pin) notes.push('📌 POSTARE DE PIN — pune-o prima pe profil.');
    if (p.photoHow) notes.push(`FOTO: ${p.photoHow}`);
    const notesBlock = notes.length ? `\n\n— — — — —\n${notes.join('\n')}` : '';
    // TikTok și Instagram nu fac linkul clicabil în descriere → trimite spre bio.
    const linkLine = (p.channel === 'tiktok' || p.channel === 'instagram') ? '\n🔗 Link în bio → verifact.ro' : '';
    const caption = `${p.caption}\n\n${p.hashtags.join(' ')}${linkLine}\n\n♪ sunet: ${p.sound}${notesBlock}`;
    fs.writeFileSync(path.join(dir, 'caption.txt'), caption, 'utf8');
    const aspect = H === 1350 ? '4:5' : '9:16';
    const idxExtra = p._draft && p._review ? `  ⇽ ${p._review.reviewUrl}` : '';
    (byChannel[ch] ||= []).push(`${(p.pin ? '📌 ' : '   ') + p.id.padEnd(26)} ${p.format.padEnd(13)} ${aspect}  ${slides.length} sl${idxExtra}`);
    console.log(`✓ ${ch}/${p.id} — ${slides.length} slide-uri (${aspect})`);
  }

  await browser.close();
  for (const [ch, lines] of Object.entries(byChannel)) {
    const dir = ch === 'verifact' ? path.join(outRoot, 'verifact') : path.join(outRoot, ch);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'INDEX.txt'), `Verifact — ${ch} (1080×1920, 9:16)\n\n${lines.join('\n')}\n`, 'utf8');
  }
  console.log(`\n✨ gata → ${outRoot}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
