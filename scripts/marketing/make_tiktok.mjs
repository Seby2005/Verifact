// Verifact — algoritm „UN slideshow TikTok / rulare”.
//
// Face UN singur slideshow: un fact-check popular (RO prioritar, evergreen + recent),
// cu verdict, în stilul TikTok-ului cu Zidul Chinezesc. Alege singur template-ul dintre
// cele 4 preferate:  verdictStamp · tacereTipografica · terminal · mitAdevar (doar la „fals”).
// Iese în public/marketing/_drafts/  pentru APROBARE (mută în tiktok/ după ce verifici).
//
// Rulare:
//   node --env-file=.env.local scripts/marketing/make_tiktok.mjs
//   node --env-file=.env.local scripts/marketing/make_tiktok.mjs "zidul chinezesc"   // temă anume
//   node --env-file=.env.local scripts/marketing/make_tiktok.mjs --template terminal  // forțează template
//
// Chei (deja în app): GOOGLE_FACT_CHECK_API_KEY + OpenRouter (DEFAULT_AI_PROVIDER).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(__dirname, 'content');
const SEEN_FILE = path.join(CONTENT, '.drafted_tiktok.json');
const OUT_FILE = path.join(CONTENT, '_drafts.mjs');

const TEMPLATES = ['verdictStamp', 'tacereTipografica', 'terminal']; // + mitAdevar doar la „fals”
const VERDICT_LABEL = { true: 'Probabil adevărat', partial: 'Parțial adevărat', unclear: 'Neclar', false: 'Probabil fals' };

// ── BAZIN EVERGREEN — mituri clasice, mereu populare, cu surse reale ─────────
// (fix vibe-ul Zidului Chinezesc). Verdict + scor sunt fixate aici, nu de LLM.
const EVERGREEN = [
  { slug: 'zid-chinezesc-spatiu', claim: 'Zidul Chinezesc se vede din spațiu cu ochiul liber.', verdict: 'false', score: 9,
    why: 'De pe orbita joasă nu se distinge cu ochiul liber — e prea îngust; confirmat de NASA și de astronauți.', whySource: 'NASA & astronauți',
    truth: 'Nu e vizibil cu ochiul liber de pe orbită.', sources: ['nasa.gov'] },
  { slug: 'zece-la-suta-creier', claim: 'Folosim doar 10% din creier.', verdict: 'false', score: 8,
    why: 'Imagistica cerebrală arată activitate în aproape toate regiunile, chiar și în somn.', whySource: 'Neuroștiință · imagistică fMRI',
    truth: 'Folosim practic tot creierul, în momente diferite.', sources: ['ninds.nih.gov'] },
  { slug: 'vitamina-c-raceala', claim: 'Vitamina C previne răceala.', verdict: 'false', score: 22,
    why: 'Nu previne răceala; la unele persoane scurtează foarte puțin durata.', whySource: 'OMS & Cochrane',
    truth: 'Nu previne; efect mic pe durată la unii.', sources: ['who.int', 'cochrane.org'] },
  { slug: '5g-imunitate', claim: '5G-ul slăbește imunitatea.', verdict: 'false', score: 6,
    why: 'Undele radio 5G sunt non-ionizante; nu au energia necesară să afecteze celulele.', whySource: 'OMS & ICNIRP',
    truth: 'Radiofrecvențele nu afectează imunitatea.', sources: ['who.int', 'icnirp.org'] },
  { slug: 'fulger-de-doua-ori', claim: 'Fulgerul nu lovește de două ori în același loc.', verdict: 'false', score: 7,
    why: 'Structurile înalte sunt lovite des — Empire State Building e lovit de ~20-25 ori pe an.', whySource: 'NOAA · meteorologie',
    truth: 'Același loc poate fi lovit de multe ori.', sources: ['noaa.gov'] },
  { slug: 'peste-memorie-3s', claim: 'Peștele auriu are memorie de 3 secunde.', verdict: 'false', score: 10,
    why: 'Studiile de comportament arată că țin minte lucruri și săptămâni întregi.', whySource: 'Studii de comportament animal',
    truth: 'Memoria lor durează luni, nu secunde.', sources: ['ncbi.nlm.nih.gov'] },
  { slug: 'strut-cap-nisip', claim: 'Struțul bagă capul în nisip de frică.', verdict: 'false', score: 9,
    why: 'Își întorc ouăle din cuib cu ciocul aplecat spre pământ; de la distanță pare că se ascund.', whySource: 'Ornitologie',
    truth: 'E o iluzie optică; nu se ascund în nisip.', sources: ['si.edu'] },
  { slug: 'zahar-brun', claim: 'Zahărul brun e mai sănătos decât cel alb.', verdict: 'false', score: 15,
    why: 'În cantitățile reale, diferența nutrițională e nesemnificativă — urme de melasă, fără beneficiu.', whySource: 'Date nutriționale USDA',
    truth: '~identic caloric; „mai natural” nu înseamnă „mai sănătos”.', sources: ['fdc.nal.usda.gov'] },
  { slug: 'microunde-cancer', claim: 'Cuptorul cu microunde face mâncarea cancerigenă.', verdict: 'false', score: 16,
    why: 'Microundele doar încălzesc; nu fac mâncarea radioactivă și nu cauzează cancer.', whySource: 'FDA & OMS',
    truth: 'Pierderea de nutrienți e ca la orice gătire termică.', sources: ['fda.gov', 'who.int'] },
  { slug: 'detox-ceaiuri', claim: 'Ceaiurile „detox” curăță organismul de toxine.', verdict: 'false', score: 12,
    why: 'Ficatul și rinichii fac deja asta non-stop; efectul ceaiurilor e laxativ și diuretic.', whySource: 'Medicină · hepatologie',
    truth: '„Detoxul” nu are bază — pierzi apă, nu toxine.', sources: ['nhs.uk'] },
  { slug: 'lilieci-orbi', claim: 'Liliecii sunt orbi.', verdict: 'false', score: 9,
    why: 'Toți liliecii văd; multe specii chiar bine — folosesc și ecolocația, dar nu sunt orbi.', whySource: 'Zoologie',
    truth: 'Nu sunt orbi; văd și folosesc ecolocația.', sources: ['si.edu'] },
  { slug: 'par-unghii-dupa-moarte', claim: 'Părul și unghiile continuă să crească după moarte.', verdict: 'false', score: 8,
    why: 'Pielea se deshidratează și se retrage, dând iluzia că părul și unghiile au crescut.', whySource: 'Medicină legală',
    truth: 'Nu cresc; e retragerea pielii.', sources: ['ncbi.nlm.nih.gov'] },
];

// ── rating (text) → 0..1 (subset al hărții din layer1-factcheck.ts) ──────────
const RATING_MAP = {
  'false': 0, 'fals': 0, 'faux': 0, 'fake': 0.05, 'incorect': 0.05, 'hoax': 0, 'dezinformare': 0.05,
  'misleading': 0.35, 'in mare parte fals': 0.2, 'mixed': 0.5, 'partial': 0.5, 'parțial': 0.5,
  'neclar': 0.5, 'unproven': 0.5, 'partially true': 0.55, 'mostly true': 0.8, 'true': 1, 'adevărat': 1, 'corect': 0.95,
};
function normalizeRating(raw) {
  if (!raw) return 0.5;
  const c = raw.trim().toLowerCase();
  if (c in RATING_MAP) return RATING_MAP[c];
  for (const [k, val] of Object.entries(RATING_MAP)) if (c.includes(k)) return val;
  return 0.5;
}
const verdictKeyFromValue = (v) => (v >= 0.85 ? 'true' : v >= 0.6 ? 'partial' : v >= 0.4 ? 'unclear' : 'false');

// ── fact-check-uri RO recente ─────────────────────────────────────────────────
async function fetchRecentRO() {
  const key = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!key) return [];
  const call = async (params) => {
    const qs = new URLSearchParams({ key, languageCode: 'ro', pageSize: '10', maxAgeDays: '150', ...params });
    try {
      const res = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?${qs}`, { signal: AbortSignal.timeout(9000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.claims ?? []).map((c) => {
        const r = c.claimReview?.[0] ?? {};
        return { source: 'recent', claim: c.text, rating: r.textualRating ?? '', publisher: r.publisher?.name ?? 'sursă', reviewUrl: r.url ?? '' };
      }).filter((x) => x.claim && x.reviewUrl && x.rating);
    } catch { return []; }
  };
  const cli = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ').trim();
  const jobs = cli
    ? [call({ query: cli })]
    : [call({ reviewPublisherSiteFilter: 'factual.ro' }), call({ reviewPublisherSiteFilter: 'veridica.ro' }), call({ query: 'România' })];
  const all = (await Promise.all(jobs)).flat();
  const seen = new Set();
  return all.filter((x) => (seen.has(x.reviewUrl) ? false : (seen.add(x.reviewUrl), true)))
    .map((x) => {
      const v = normalizeRating(x.rating);
      return { ...x, slug: x.reviewUrl, verdict: verdictKeyFromValue(v), score: Math.round(v * 100) };
    });
}

// ── LLM (OpenRouter): formulează textul, în RO, fără să inventeze ────────────
function parseJson(txt) { const m = txt.match(/```(?:json)?\s*([\s\S]*?)```/i); return JSON.parse((m ? m[1] : txt).trim()); }
async function writeCopy(fact) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY lipsește');
  const known = fact.source === 'evergreen'
    ? `Ai DEJA datele corecte (nu le schimba, doar formulează-le):
- claim: "${fact.claim}"
- de ce: "${fact.why}"
- sursă: "${fact.whySource}"
- adevărul pe scurt: "${fact.truth}"
- domenii-sursă: ${JSON.stringify(fact.sources)}`
    : `Fact-check REAL, verificat de ${fact.publisher} (verdict brut: "${fact.rating}"). NU inventa fapte. Tradu/reformulează în română. Dacă nu ai destule detalii pentru „de ce”, scrie: "${fact.publisher} a clasificat afirmația drept ${VERDICT_LABEL[fact.verdict].toLowerCase()}."
- claim: "${fact.claim}"`;
  const prompt = `Ești copywriter pentru Verifact (fact-checking). Verdictul e ${VERDICT_LABEL[fact.verdict]} și NU se schimbă. Scrii pentru un slideshow TikTok, în română, punchy, consum rapid.

${known}

Returnează STRICT acest JSON (fără text în plus):
{
  "claim": "afirmația ca citat scurt pentru slide, română, max 90 caractere; poți pune \\n la 2-3 rânduri",
  "why": "o propoziție (max 120 car.) despre de ce acest verdict — fără invenții",
  "whySource": "eticheta sursei, scurtă (ex: OMS & studii)",
  "explanation": "o propoziție scurtă pentru varianta terminal (poate fi ca 'why')",
  "truth": "o propoziție 'de fapt...' pentru varianta mit vs adevăr",
  "sources": ["2-3 domenii credibile, ex who.int"],
  "caption": "descriere TikTok, 2-3 propoziții, cârlig pe prima; menționează sursa; fără cifre inventate",
  "hashtags": ["#verifact", "#factcheck", "încă 2-3"]
}`;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.6 }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const o = parseJson((await res.json()).choices?.[0]?.message?.content ?? '');
  // fallback pe datele evergreen dacă LLM lasă goluri
  return {
    claim: o.claim || fact.claim,
    why: o.why || fact.why || `${fact.publisher || 'Sursa'} a clasificat afirmația drept ${VERDICT_LABEL[fact.verdict].toLowerCase()}.`,
    whySource: o.whySource || fact.whySource || fact.publisher || 'Verifact',
    explanation: o.explanation || o.why || fact.why || '',
    truth: o.truth || fact.truth || o.why || '',
    sources: (Array.isArray(o.sources) && o.sources.length ? o.sources : fact.sources) || [],
    caption: o.caption || `Am verificat: „${fact.claim}”. Verdict: ${VERDICT_LABEL[fact.verdict]}.`,
    hashtags: Array.isArray(o.hashtags) ? o.hashtags.slice(0, 5) : ['#verifact', '#factcheck'],
  };
}

// ── construiește obiectul de postare pentru template-ul ales ─────────────────
const quote = (s) => `„${String(s).replace(/^[„"]+|[”"]+$/g, '')}”`;
const plain = (s) => String(s).replace(/^[„"]+|[”"]+$/g, '');

function buildPost(fact, copy, template) {
  const id = `tt-${(fact.slug || fact.claim).toString().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 42)}`;
  const score = `${fact.score}%`;
  const sourceTail = fact.source === 'recent' ? `\n\nSursă: ${fact.publisher} — ${fact.reviewUrl}` : `\n\nSurse: ${copy.sources.join(', ')}`;
  const base = {
    id, channel: 'tiktok', format: template, sound: 'synth misterios / beat tensionat',
    caption: `${copy.caption}${sourceTail}`, hashtags: copy.hashtags,
    _review: { source: fact.source, publisher: fact.publisher, verdict: fact.verdict, score, reviewUrl: fact.reviewUrl },
  };
  if (template === 'verdictStamp') return {
    ...base, eyebrow: 'Afirmație verificată', claimIntro: 'Se spune că', claim: quote(copy.claim),
    verdict: fact.verdict, score, confidenceNote: 'certitudinea\nverdictului', evidenceTitle: 'Ce spun sursele',
    evidence: [
      { src: copy.whySource, tone: fact.verdict, text: copy.why },
      { src: 'Verificat de Verifact', tone: 'neutral', text: fact.source === 'recent' ? 'Potrivire în arhiva de fact-check.' : 'Confirmat în surse independente.' },
    ],
    cta: { line: 'Nu da mai departe\npână nu verifici.', sub: 'Text, screenshot sau link — raport cu surse în ~12 secunde.' },
  };
  if (template === 'mitAdevar') return {
    ...base, myth: plain(copy.claim), mythNote: 'circulă des online', truth: copy.truth || copy.why,
    inner: { title: 'Adevărul din spate', body: copy.why },
    cta: { line: '„Popular” nu înseamnă „adevărat”.', sub: 'Verifică orice mit pe verifact.ro.' },
  };
  if (template === 'tacereTipografica') return {
    ...base, claim: quote(copy.claim), verdict: fact.verdict, why: copy.why, whySource: copy.whySource,
  };
  // terminal
  return {
    ...base, claim: quote(copy.claim), verdict: fact.verdict, score, explanation: copy.explanation || copy.why, sources: copy.sources,
  };
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const forcedTpl = (process.argv.find((a) => a.startsWith('--template'))?.split('=')[1])
    || (process.argv.includes('--template') ? process.argv[process.argv.indexOf('--template') + 1] : null);
  const seen = fs.existsSync(SEEN_FILE) ? new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))) : new Set();

  console.log('🔎 Construiesc bazinul (RO recent + evergreen)…');
  const recent = await fetchRecentRO();
  const evergreen = EVERGREEN.map((e) => ({ ...e, source: 'evergreen' }));
  // RO prioritar: întâi recent RO, apoi evergreen. Amestecă în fiecare grup.
  const shuffle = (a) => a.map((x) => [x, ((x.slug || '').length * 2654435761) % 997 + Math.floor(Math.random() * 997)]).sort((p, q) => p[1] - q[1]).map(([x]) => x);
  const pool = [...shuffle(recent), ...shuffle(evergreen)].filter((f) => !seen.has(f.slug));

  if (!pool.length) { console.log('Nimic nefolosit. Dă o temă: make_tiktok.mjs "5g" — sau golește', SEEN_FILE); return; }
  const fact = pool[0];
  console.log(`   Ales: [${VERDICT_LABEL[fact.verdict]}] „${fact.claim}” (${fact.source})`);

  const allowed = fact.verdict === 'false' ? [...TEMPLATES, 'mitAdevar'] : TEMPLATES;
  const template = forcedTpl && (allowed.includes(forcedTpl) || ['verdictStamp', 'tacereTipografica', 'terminal', 'mitAdevar'].includes(forcedTpl))
    ? forcedTpl : allowed[Math.floor(Math.random() * allowed.length)];
  console.log(`   Template: ${template}`);

  const copy = await writeCopy(fact);
  const post = buildPost(fact, copy, template);

  const header = `// GENERAT de make_tiktok.mjs — UN slideshow, VERIFICĂ înainte de post.\n// Verdictul & scorul vin din sursă; textul e formulat de LLM.\n\nexport const drafts = ${JSON.stringify([post], null, 2)};\n`;
  fs.writeFileSync(OUT_FILE, header, 'utf8');
  seen.add(fact.slug);
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen]), 'utf8');

  console.log('🎨 Randez slideshow-ul…');
  execFileSync(process.execPath, [path.join(__dirname, 'generate_slides.mjs'), '--drafts-only'], { stdio: 'inherit' });
  console.log(`\n✨ Gata → public/marketing/_drafts/${post.id}/  (verifică, apoi mută în tiktok/)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
