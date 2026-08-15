import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Slideshow dataset structured in GenȘtiri & Politică La Minut style
const genStiriSlideshow = {
  id: 'politica_la_minut_taxe',
  title: 'Zvonul Impozitelor pe Proprietate (Format GenȘtiri & Politică La Minut)',
  slides: [
    {
      slideNum: 1,
      category: 'POLITICĂ & ECONOMIE',
      eyebrow: 'DEZMINȚIRE VIRALĂ',
      headline: 'Se măresc taxele pe casă cu 300% de la 1 a lunii?',
      highlightPhrase: 'Mesajul de pe WhatsApp care a creat panică națională',
      summary: 'În ultimele 48 de ore, un text primit pe WhatsApp a fost redistribuit de peste 50.000 de ori. Am trecut informația prin AI-ul Verifact.',
      ctaHint: 'GLISEAZĂ PENTRU FAPTE ➔'
    },
    {
      slideNum: 2,
      category: 'CONTEXT & AFIRMAȚIE',
      eyebrow: '1. CE AFIRMĂ ZVONUL VIRAL',
      quote: '„Breaking News: De la 1 luna viitoare se aplică ordonanța de urgență pentru impozitarea triplă a locuințelor neocupate. Distribuiți până nu se șterge!”',
      bullets: [
        'Nu este citată nicio sursă guvernamentală sau număr de ordonanță.',
        'Folosește tehnici clasice de manipulare: panică financiară + urgență artificială.',
        'Fotografia atașată este un screenshot editat în Photoshop.'
      ]
    },
    {
      slideNum: 3,
      category: 'ANALIZĂ VERIFACT AI',
      eyebrow: '2. REZULTAT ALGORITM',
      verdictScore: '12%',
      verdictStatus: 'PROBABIL FALS',
      verdictColor: '#e0563f', // Verifact signal red
      verdictDesc: 'Analiza în 5 straturi Verifact a clasificat afirmația drept nefondată.',
      evidencePoints: [
        'Stratul 1 (Fact-Check): Potrivire 100% cu deconstrucția Factual.ro din 10 August.',
        'Stratul 3 (Surse Guvernamentale): Ministerul Finanțelor a emis comunicat oficial de dezmințire (mfinante.gov.ro).',
        'Stratul 4 (Sinteză Gemini AI): Codul Fiscal actual nu prevede modificări la impozitul pe proprietate.'
      ]
    },
    {
      slideNum: 4,
      category: 'DECONSTRUCȚIE PE SCURT',
      eyebrow: '3. ADEVĂRUL PE SCURT',
      cards: [
        {
          num: '01',
          title: 'Nicio lege nouă votată',
          desc: 'Parlamentul și Guvernul nu au aprobat nicio modificare referitoare la majorarea taxelor pe proprietate pentru anul în curs.'
        },
        {
          num: '02',
          title: 'Textul conține un număr fictiv',
          desc: 'Ordonanța citată în mesajul de pe WhatsApp nu există în baza de date a Monitorului Oficial.'
        },
        {
          num: '03',
          title: 'De ce a apărut zvonul?',
          desc: 'Un proiect de dezbatere vechi din 2022 a fost scos din context și re-publicat ca fiind de actualitate.'
        }
      ]
    },
    {
      slideNum: 5,
      category: 'IGIENĂ DIGITALĂ',
      eyebrow: 'CE TREBUIE SĂ REȚII',
      keyTakeaway: 'Nu mai trimite mesaje catastrofale pe grupuri înainte să verifici sursa primară.',
      ctaTitle: 'Ai primit o știre sau o poză dubioasă pe WhatsApp?',
      ctaBody: 'Trage orice screenshot sau text direct în Verifact.ro și primești raportul complet în 12.3 secunde.',
      actions: ['📌 SALVEAZĂ POSTAREA', '📲 TRIMITE ÎN GRUPUL DE FAMILIE']
    }
  ]
};

function generateGenStiriHTML(slide, totalSlides, aspect) {
  const isPortrait45 = aspect.height === 1350;

  return `
  <!DOCTYPE html>
  <html lang="ro">
  <head>
    <meta charset="UTF-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');
      
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      body {
        width: ${aspect.width}px;
        height: ${aspect.height}px;
        background-color: #17140f; /* Warm near-black Verifact background */
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: #f3efe8;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: ${isPortrait45 ? '56px 48px' : '72px 56px'};
        position: relative;
        overflow: hidden;
      }

      /* Subtle noise pattern / grid background */
      body::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 24px 24px;
        pointer-events: none;
      }

      /* Top Header Bar (GenȘtiri style) */
      .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #2c2820;
        padding-bottom: 20px;
        z-index: 10;
      }

      .category-eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: ${isPortrait45 ? '16px' : '18px'};
        font-weight: 700;
        color: #9a9184;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .category-dot {
        width: 8px;
        height: 8px;
        background-color: #e0563f;
        border-radius: 50%;
      }

      .brand-logo {
        font-family: Georgia, serif;
        font-weight: 700;
        font-size: ${isPortrait45 ? '28px' : '32px'};
        color: #f3efe8;
        letter-spacing: -0.02em;
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .brand-bracket {
        color: #d63a2c;
        font-weight: 800;
      }

      /* Main Body Container */
      .main-content {
        display: flex;
        flex-direction: column;
        gap: ${isPortrait45 ? '24px' : '32px'};
        z-index: 10;
        flex: 1;
        justify-content: center;
        margin: 20px 0;
      }

      .section-eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: ${isPortrait45 ? '15px' : '16px'};
        font-weight: 700;
        color: #e0563f;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      /* Slide 1 Cover Layout */
      .cover-title {
        font-size: ${isPortrait45 ? '48px' : '56px'};
        font-weight: 800;
        line-height: 1.12;
        color: #ffffff;
        letter-spacing: -0.02em;
      }

      .highlight-box {
        background: rgba(224, 86, 63, 0.12);
        border-left: 4px solid #e0563f;
        border-radius: 0 12px 12px 0;
        padding: 16px 20px;
        font-size: ${isPortrait45 ? '20px' : '22px'};
        font-weight: 600;
        color: #f3efe8;
        line-height: 1.4;
      }

      .summary-card {
        background: #201b16;
        border: 1px solid #3c372e;
        border-radius: 16px;
        padding: ${isPortrait45 ? '24px' : '30px'};
        font-size: ${isPortrait45 ? '20px' : '22px'};
        line-height: 1.5;
        color: #cbc2b5;
      }

      /* Quote / Excerpt Card */
      .quote-card {
        background: #1e1a15;
        border: 1px solid #3c372e;
        border-left: 5px solid #d63a2c;
        border-radius: 12px;
        padding: 24px;
        font-size: ${isPortrait45 ? '20px' : '22px'};
        font-style: italic;
        line-height: 1.5;
        color: #f3efe8;
      }

      /* Bullet List Cards */
      .bullet-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .bullet-item {
        background: #201b16;
        border: 1px solid #2c2820;
        border-radius: 12px;
        padding: 20px 24px;
        display: flex;
        align-items: flex-start;
        gap: 16px;
        font-size: ${isPortrait45 ? '19px' : '21px'};
        line-height: 1.45;
        color: #cbc2b5;
      }

      .bullet-dot {
        width: 10px;
        height: 10px;
        background-color: #e0563f;
        border-radius: 50%;
        margin-top: 8px;
        flex-shrink: 0;
      }

      /* Verdict Hero Banner (Verifact Score) */
      .verdict-hero {
        background: rgba(224, 86, 63, 0.1);
        border: 2px solid #e0563f;
        border-radius: 20px;
        padding: 28px;
        display: flex;
        align-items: center;
        gap: 28px;
      }

      .verdict-score {
        font-size: ${isPortrait45 ? '68px' : '76px'};
        font-weight: 900;
        color: #e0563f;
        line-height: 1;
        font-family: 'JetBrains Mono', monospace;
      }

      .verdict-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .verdict-title {
        font-size: ${isPortrait45 ? '24px' : '26px'};
        font-weight: 800;
        color: #ffffff;
        letter-spacing: 0.02em;
      }

      .verdict-sub {
        font-size: ${isPortrait45 ? '16px' : '18px'};
        color: #cbc2b5;
      }

      /* Numbered Cards Layout (Politica La Minut Style) */
      .cards-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .num-card {
        background: #201b16;
        border: 1px solid #3c372e;
        border-radius: 16px;
        padding: 22px 26px;
        display: flex;
        gap: 20px;
        align-items: flex-start;
      }

      .num-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 24px;
        font-weight: 800;
        color: #e0563f;
        background: rgba(224, 86, 63, 0.15);
        padding: 6px 12px;
        border-radius: 8px;
      }

      .num-card-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .num-card-title {
        font-size: ${isPortrait45 ? '20px' : '22px'};
        font-weight: 700;
        color: #ffffff;
      }

      .num-card-desc {
        font-size: ${isPortrait45 ? '17px' : '19px'};
        color: #cbc2b5;
        line-height: 1.45;
      }

      /* CTA Final Slide Cards */
      .cta-box {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(224, 86, 63, 0.12));
        border: 1px solid #3c372e;
        border-radius: 20px;
        padding: 30px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        text-align: center;
        align-items: center;
      }

      .cta-title {
        font-size: ${isPortrait45 ? '24px' : '28px'};
        font-weight: 800;
        color: #ffffff;
      }

      .cta-body {
        font-size: ${isPortrait45 ? '18px' : '20px'};
        color: #cbc2b5;
        line-height: 1.5;
      }

      .action-pills {
        display: flex;
        gap: 12px;
        margin-top: 8px;
      }

      .action-pill {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 700;
        padding: 10px 18px;
        border-radius: 999px;
        background: #201b16;
        border: 1px solid #3c372e;
        color: #f3efe8;
      }

      /* Bottom Footer Bar */
      .bottom-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid #2c2820;
        padding-top: 20px;
        z-index: 10;
      }

      .progress-dots {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 16px;
        color: #9a9184;
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #3c372e;
      }

      .dot.active {
        background-color: #e0563f;
        width: 20px;
        border-radius: 10px;
      }

      .footer-url {
        font-family: 'JetBrains Mono', monospace;
        font-size: ${isPortrait45 ? '16px' : '18px'};
        font-weight: 700;
        color: #e0563f;
        letter-spacing: 0.04em;
      }
    </style>
  </head>
  <body>
    <!-- Top Header -->
    <div class="top-bar">
      <div class="category-eyebrow">
        <span class="category-dot"></span>
        ${slide.category}
      </div>
      <div class="brand-logo">
        <span class="brand-bracket">[</span>Verifact<span class="brand-bracket">]</span>
      </div>
    </div>

    <!-- Main Content Body -->
    <div class="main-content">
      <div class="section-eyebrow">${slide.eyebrow}</div>

      ${slide.slideNum === 1 ? `
        <div class="cover-title">${slide.headline}</div>
        <div class="highlight-box">${slide.highlightPhrase}</div>
        <div class="summary-card">${slide.summary}</div>
      ` : ''}

      ${slide.slideNum === 2 ? `
        <div class="quote-card">${slide.quote}</div>
        <div class="bullet-list">
          ${slide.bullets.map(b => `
            <div class="bullet-item">
              <span class="bullet-dot"></span>
              <span>${b}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${slide.slideNum === 3 ? `
        <div class="verdict-hero">
          <div class="verdict-score">${slide.verdictScore}</div>
          <div class="verdict-info">
            <div class="verdict-title">${slide.verdictStatus}</div>
            <div class="verdict-sub">${slide.verdictDesc}</div>
          </div>
        </div>
        <div class="bullet-list">
          ${slide.evidencePoints.map(e => `
            <div class="bullet-item">
              <span class="bullet-dot"></span>
              <span>${e}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${slide.slideNum === 4 ? `
        <div class="cards-grid">
          ${slide.cards.map(c => `
            <div class="num-card">
              <div class="num-badge">${c.num}</div>
              <div class="num-card-content">
                <div class="num-card-title">${c.title}</div>
                <div class="num-card-desc">${c.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${slide.slideNum === 5 ? `
        <div class="highlight-box" style="border-left-color: #d63a2c;">
          💡 <strong>Concluzie:</strong> ${slide.keyTakeaway}
        </div>
        <div class="cta-box">
          <div class="cta-title">${slide.ctaTitle}</div>
          <div class="cta-body">${slide.ctaBody}</div>
          <div class="action-pills">
            ${slide.actions.map(a => `<div class="action-pill">${a}</div>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Bottom Footer -->
    <div class="bottom-bar">
      <div class="progress-dots">
        ${Array.from({ length: totalSlides }).map((_, i) => `
          <div class="dot ${i + 1 === slide.slideNum ? 'active' : ''}"></div>
        `).join('')}
        <span style="margin-left: 8px;">${slide.slideNum} / ${totalSlides}</span>
      </div>
      <div class="footer-url">verifact.ro</div>
    </div>
  </body>
  </html>
  `;
}

async function renderGenStiriSlideshow(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // 1. Generate Instagram Format (1080x1350 4:5 - GenȘtiri / PoliticaLaMinut standard)
  const igOutputDir = path.join(outputDir, 'instagram_1080x1350');
  if (!fs.existsSync(igOutputDir)) fs.mkdirSync(igOutputDir, { recursive: true });

  const igContext = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1,
  });
  const igPage = await igContext.newPage();

  console.log(`📸 Generare Carusel Instagram 1080x1350 (GenȘtiri / Politică La Minut style)...`);
  for (const slide of genStiriSlideshow.slides) {
    const html = generateGenStiriHTML(slide, genStiriSlideshow.slides.length, { width: 1080, height: 1350 });
    await igPage.setContent(html, { waitUntil: 'load' });
    await igPage.waitForTimeout(200);
    const outputPath = path.join(igOutputDir, `ig_slide_${slide.slideNum}.png`);
    await igPage.screenshot({ path: outputPath, type: 'png' });
    console.log(` ✅ Salvat: instagram_1080x1350/ig_slide_${slide.slideNum}.png`);
  }

  // 2. Generate TikTok Format (1080x1920 9:16 Vertical)
  const ttOutputDir = path.join(outputDir, 'tiktok_1080x1920');
  if (!fs.existsSync(ttOutputDir)) fs.mkdirSync(ttOutputDir, { recursive: true });

  const ttContext = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const ttPage = await ttContext.newPage();

  console.log(`📱 Generare TikTok Slideshow 1080x1920 Vertical...`);
  for (const slide of genStiriSlideshow.slides) {
    const html = generateGenStiriHTML(slide, genStiriSlideshow.slides.length, { width: 1080, height: 1920 });
    await ttPage.setContent(html, { waitUntil: 'load' });
    await ttPage.waitForTimeout(200);
    const outputPath = path.join(ttOutputDir, `tt_slide_${slide.slideNum}.png`);
    await ttPage.screenshot({ path: outputPath, type: 'png' });
    console.log(` ✅ Salvat: tiktok_1080x1920/tt_slide_${slide.slideNum}.png`);
  }

  await browser.close();
  console.log(`✨ SUCCES TOTAL! Slide-urile au fost generate în stilul GenȘtiri & Politică la Minut!`);
}

const targetOutputDir = path.join(__dirname, '../../public/marketing/genstiri_format');
renderGenStiriSlideshow(targetOutputDir).catch(console.error);
