/**
 * Renders the synthetic social-media screenshots used by mass-benchmark.ts.
 * Each one mimics a real share format (Facebook post, X post, TikTok overlay,
 * WhatsApp forward, news card) so the OCR + claim-extraction path is exercised
 * with realistic UI chrome, not clean text.
 *
 * Run: node tests/eval/mass/render-screens.mjs   (needs Microsoft Edge)
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('tests/eval/mass/screens');
fs.mkdirSync(OUT, { recursive: true });

const base = `body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#f0f2f5}`;

const fb = (author, time, body, stats) => `<style>${base}.c{width:560px;margin:20px;background:#fff;border-radius:8px;padding:16px}
.h{display:flex;gap:10px;align-items:center}.a{width:40px;height:40px;border-radius:50%;background:#8aa}
.n{font-weight:600}.t{color:#65676b;font-size:13px}.b{font-size:17px;margin:12px 0;line-height:1.4}
.s{color:#65676b;font-size:14px;border-top:1px solid #ddd;padding-top:8px;display:flex;justify-content:space-between}</style>
<div class=c><div class=h><div class=a></div><div><div class=n>${author}</div><div class=t>${time} · 🌍 Public</div></div></div>
<div class=b>${body}</div><div class=s><span>${stats}</span><span>Îmi place · Comentează · Distribuie</span></div></div>`;

const tweet = (name, handle, body, stats) => `<style>${base}body{background:#fff}.c{width:560px;margin:20px;padding:16px;border:1px solid #eee}
.n{font-weight:700}.h{color:#536471}.b{font-size:19px;margin:10px 0;line-height:1.35}.s{color:#536471;font-size:14px}</style>
<div class=c><span class=n>${name}</span> <span class=h>${handle} · 3h</span><div class=b>${body}</div><div class=s>${stats}</div></div>`;

const tiktok = (handle, caption, overlay) => `<style>${base}body{background:#000}.c{width:400px;height:700px;margin:0;position:relative;
background:linear-gradient(#334,#112);color:#fff}.top{position:absolute;top:14px;width:100%;text-align:center;font-size:15px}
.ov{position:absolute;top:220px;left:20px;right:20px;font-size:26px;font-weight:800;text-align:center;background:rgba(0,0,0,.5);padding:10px}
.bt{position:absolute;bottom:30px;left:16px;right:70px;font-size:15px}.r{position:absolute;right:12px;bottom:120px;font-size:13px;text-align:center}</style>
<div class=c><div class=top>Urmărite  |  <b>Pentru tine</b></div><div class=ov>${overlay}</div>
<div class=r>❤️<br>45.2K<br><br>💬<br>3201<br><br>↗<br>Distribuie</div><div class=bt><b>${handle}</b><br>${caption}</div></div>`;

const whatsapp = (body) => `<style>${base}body{background:#e5ddd5}.m{width:480px;margin:20px;background:#fff;border-radius:8px;padding:10px 14px;font-size:16px;line-height:1.4}
.f{color:#667781;font-style:italic;font-size:13px}.tm{text-align:right;color:#667781;font-size:12px}</style>
<div class=m><div class=f>↪↪ Redirecționat de multe ori</div>${body}<div class=tm>21:47</div></div>`;

const news = (outlet, title, lead) => `<style>${base}body{background:#fff}.c{width:640px;margin:20px}.o{color:#c00;font-weight:800;font-size:22px}
.ti{font-size:30px;font-weight:700;margin:10px 0;line-height:1.2}.l{font-size:17px;color:#333}</style>
<div class=c><div class=o>${outlet}</div><div class=ti>${title}</div><div class=l>${lead}</div></div>`;

const SCREENS = {
  's01-fb-true-post-false-spin': fb('Ion Popescu', '3 h',
    'Gata, ne-au vândut complet!!! 😡 Granițele sunt deschise pentru toți migranții!<br><br>„România a devenit membră deplină a spațiului Schengen, inclusiv cu frontierele terestre, de la 1 ianuarie 2025.”',
    '👍 892  💬 245  ↗ 67 distribuiri'),
  's02-whatsapp-pension-hoax': whatsapp('URGENT!!! Din 1 noiembrie Guvernul taie toate pensiile la jumătate! A anunțat azi Ministerul Muncii. Trimite la toți cei dragi!!! 🙏🙏'),
  's03-tiktok-cancer-cure': tiktok('@vindecare.naturala', 'Ei nu vor să știi asta #adevar #bigpharma',
    'STUDIU HARVARD: bicarbonatul de sodiu vindecă cancerul în 3 zile'),
  's04-tweet-true-vat': tweet('Știri Economice', '@stiri_eco',
    'De la 1 august 2025, cota standard de TVA în România a crescut de la 19% la 21%, iar cotele reduse au fost unificate la 11%.',
    '💬 120   🔁 340   ❤️ 1.1K   📊 88K'),
  's05-fb-flat-earth': fb('Adevărul Ascuns', '2 zile',
    'NASA a recunoscut în sfârșit: Pământul este PLAT și există un zid de gheață la margine! Distribuie înainte să fie șters!',
    '👍 2,4K  💬 1,1K  ↗ 900 distribuiri'),
  's06-news-fake-euro': news('ȘTIRI DE ULTIMĂ ORĂ', 'România renunță la leu: euro devine moneda oficială de luni',
    'Banca Națională a anunțat că toate conturile vor fi convertite automat în euro începând de săptămâna viitoare.'),
  's07-tweet-en-microchips': tweet('Truth Seeker', '@wake_up_now',
    'BREAKING: Pfizer insider confirms COVID vaccines contain microchips for 5G tracking. They are hiding it from you!',
    '💬 4K   🔁 12K   ❤️ 30K'),
  's08-fb-true-drones': fb('Știri Dobrogea', '5 h',
    'Ministerul Apărării confirmă: fragmente de drone rusești au căzut din nou pe teritoriul României, în județul Tulcea.',
    '👍 310  💬 98  ↗ 45 distribuiri'),
  's09-tiktok-martial-law': tiktok('@patriotul.roman', 'Pregătiți-vă!!! #razboi #romania',
    'Nicușor Dan a semnat la Vilnius intrarea României în RĂZBOI'),
  's10-whatsapp-opinion': whatsapp('Sincer cred că guvernul ăsta e cel mai prost din istorie și ne duce de râpă. Voi ce ziceți?'),
  's11-chrome-only': tiktok('@user123456', '#fyp #pentrutine #viral', '😂😂😂'),
  's12-news-true-nato': news('Digi24', 'România este membră NATO din 2004',
    'Țara noastră a aderat la Alianța Nord-Atlantică la 29 martie 2004, alături de alte șase state.'),
};

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 700, height: 760 }, deviceScaleFactor: 1 });
for (const [name, html] of Object.entries(SCREENS)) {
  await page.setContent(`<meta charset=utf-8>${html}`);
  const el = await page.$('.c, .m');
  await el.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('rendered', name);
}
await browser.close();
