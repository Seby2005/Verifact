// Verifact — auto-draft de postări din fact-check-uri REALE.
//
// Flux:  Google Fact Check Tools API (verdict + publisher + link, deja verificate)
//        → verdict & scor derivate DETERMINIST din rating (nu din LLM)
//        → Gemini formulează DOAR textul de slide (nu inventează fapte)
//        → scrie draft-uri în content/_drafts.mjs
//        → `node generate_slides.mjs` le randează în public/marketing/_drafts/ pentru APROBARE.
//
// Rulare (Node 20+ încarcă .env.local singur):
//   node --env-file=.env.local scripts/marketing/draft_from_factcheck.mjs
//   node --env-file=.env.local scripts/marketing/draft_from_factcheck.mjs "vaccin gripa"   // temă anume
//
// Chei folosite (deja în app): GOOGLE_FACT_CHECK_API_KEY + OpenRouter (DEFAULT_AI_PROVIDER).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(__dirname, 'content');
const SEEN_FILE = path.join(CONTENT, '.drafted.json');
const OUT_FILE = path.join(CONTENT, '_drafts.mjs');

const MAX_DRAFTS = 6;          // câte draft-uri pe rulare
const MAX_AGE_DAYS = 120;      // cât de recente
const DEFAULT_CHANNEL = 'tiktok';

// Publisher-i cu ClaimReview indexați (recent, fără query) + teme de rezervă (query).
const PUBLISHERS = ['factual.ro', 'apreport.ro', 'apreport.md', 'veridica.ro', 'factcheck.afp.com'];
const SEED_QUERIES = ['vaccin', 'energie', 'taxe', 'UE', '5G', 'AI', 'imigranti', 'apă', 'telefon', 'sănătate'];

// ── rating (text) → valoare 0..1. Subset al hărții din
//    src/lib/verification/layer1-factcheck.ts (sursa de adevăr; aici doar cât ne trebuie).
const RATING_MAP = {
  'false': 0, 'fals': 0, 'faux': 0, 'fake': 0.05, 'incorect': 0.05, 'incorrect': 0.05,
  'hoax': 0, 'intox': 0, 'dezinformare': 0.05, 'misinformation': 0.05, 'fabricat': 0.05,
  'ai-generated image': 0, 'deepfake': 0, 'mostly false': 0.2, 'în mare parte fals': 0.2,
  'in mare parte fals': 0.2, 'misleading': 0.35, 'trompeur': 0.35, 'exagerat': 0.25,
  'mixed': 0.5, 'partial': 0.5, 'parțial': 0.5, 'half true': 0.5, 'neclar': 0.5,
  'unproven': 0.5, 'unverified': 0.5, 'context lipsă': 0.45, 'partially true': 0.55,
  'parțial adevărat': 0.55, 'mostly true': 0.8, 'în mare parte adevărat': 0.8,
  'true': 1, 'adevărat': 1, 'adevarat': 1, 'vrai': 1, 'corect': 0.95, 'correct': 0.95, 'verificat': 1,
};
function normalizeRating(raw) {
  if (!raw) return 0.5;
  const c = raw.trim().toLowerCase();
  if (c in RATING_MAP) return RATING_MAP[c];
  for (const [k, v] of Object.entries(RATING_MAP)) if (c.includes(k)) return v;
  return 0.5;
}
function verdictKeyFromValue(v) {
  if (v >= 0.85) return 'true';
  if (v >= 0.6) return 'partial';
  if (v >= 0.4) return 'unclear';
  return 'false';
}
const VERDICT_LABEL = { true: 'Probabil adevărat', partial: 'Parțial adevărat', unclear: 'Neclar', false: 'Probabil fals' };

// ── Fact Check API ────────────────────────────────────────────────────────
async function factCheckSearch(params) {
  const key = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!key) throw new Error('GOOGLE_FACT_CHECK_API_KEY lipsește');
  const qs = new URLSearchParams({ key, languageCode: 'ro', pageSize: '10', maxAgeDays: String(MAX_AGE_DAYS), ...params });
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?${qs}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.claims ?? []).map((c) => {
      const r = c.claimReview?.[0] ?? {};
      return {
        claim: c.text, claimant: c.claimant,
        rating: r.textualRating ?? '', publisher: r.publisher?.name ?? r.publisher?.site ?? 'sursă',
        reviewUrl: r.url ?? '', reviewDate: r.reviewDate ?? '',
      };
    }).filter((x) => x.claim && x.reviewUrl && x.rating);
  } catch { return []; }
}

async function gatherCandidates() {
  const cliQuery = process.argv.slice(2).join(' ').trim();
  const jobs = cliQuery
    ? [factCheckSearch({ query: cliQuery })]
    : [
        ...PUBLISHERS.map((p) => factCheckSearch({ reviewPublisherSiteFilter: p })),
        ...SEED_QUERIES.map((q) => factCheckSearch({ query: q })),
      ];
  const all = (await Promise.all(jobs)).flat();
  const seen = new Set();
  const uniq = all.filter((x) => (seen.has(x.reviewUrl) ? false : (seen.add(x.reviewUrl), true)));
  uniq.sort((a, b) => (b.reviewDate || '').localeCompare(a.reviewDate || ''));
  return uniq;
}

// ── LLM (OpenRouter): formulează DOAR textul de slide (verdict/scor vin din API) ──
function parseJson(txt) {
  const m = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse((m ? m[1] : txt).trim());
}
async function writeCopy(item, verdictLabel) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY lipsește');
  const prompt = `Ești copywriter pentru Verifact (fact-checking). Primești un fact-check REAL, deja verificat de o organizație. NU inventa fapte, cifre sau surse. NU schimba verdictul. Sarcina ta e DOAR să formulezi textul pentru un slide TikTok, în română, punchy, de consum rapid.

Afirmația verificată: "${item.claim}"
Verdictul organizației (${item.publisher}): "${item.rating}" → pe scurt: ${verdictLabel}

Returnează STRICT acest JSON:
{
  "claimLine": "afirmația reformulată scurt și clar, ca un citat de pus pe slide, max 85 caractere",
  "oneLiner": "o singură propoziție neutră despre ce a stabilit verificarea; dacă nu ai destule detalii, scrie exact: «${item.publisher} a clasificat afirmația drept ${verdictLabel.toLowerCase()}.»",
  "caption": "descriere TikTok, 2-3 propoziții; cârlig pe prima; menționează că ${item.publisher} a verificat; FĂRĂ cifre inventate",
  "hashtags": ["#verifact", "#factcheck", "încă 2-3 relevante"]
}`;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    }),
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  const obj = parseJson(data.choices?.[0]?.message?.content ?? '');
  if (!obj.claimLine || !obj.caption) throw new Error('copy incomplet');
  obj.hashtags = Array.isArray(obj.hashtags) ? obj.hashtags.slice(0, 5) : ['#verifact', '#factcheck'];
  return obj;
}

// ── construiește obiectul de postare (schema verdictStamp) ──────────────────
function buildDraft(item, copy) {
  const val = normalizeRating(item.rating);
  const verdict = verdictKeyFromValue(val);
  const score = `${Math.round(val * 100)}%`;
  const id = 'draft-' + (item.reviewUrl.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(-48) || Date.now());
  return {
    id,
    channel: DEFAULT_CHANNEL,
    format: 'verdictStamp',
    sound: 'synth misterios / beat tensionat',
    eyebrow: 'Afirmație verificată',
    claimIntro: 'Se spune că',
    claim: `„${copy.claimLine.replace(/^[„"]|[”"]$/g, '')}”`,
    verdict,
    score,
    confidenceNote: 'certitudinea\nverdictului',
    evidenceTitle: 'Ce spun sursele',
    evidence: [
      { src: item.publisher, tone: verdict, text: `A verificat afirmația și a clasificat-o drept „${item.rating}”.` },
      { src: 'Verificat de Verifact', tone: 'neutral', text: copy.oneLiner },
    ],
    cta: { line: 'Nu da mai departe\npână nu verifici.', sub: 'Text, screenshot sau link — raport cu surse în ~12 secunde.' },
    caption: `${copy.caption}\n\nSursă: ${item.publisher} — ${item.reviewUrl}`,
    hashtags: copy.hashtags,
    _review: { publisher: item.publisher, rating: item.rating, reviewUrl: item.reviewUrl, reviewDate: item.reviewDate, verdict, score },
  };
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const seen = fs.existsSync(SEEN_FILE) ? JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')) : [];
  const seenSet = new Set(seen);

  console.log('🔎 Caut fact-check-uri recente…');
  const candidates = (await gatherCandidates()).filter((c) => !seenSet.has(c.reviewUrl));
  console.log(`   ${candidates.length} candidați noi.`);
  if (!candidates.length) { console.log('Nimic nou. Încearcă cu o temă: ...draft_from_factcheck.mjs "vaccin"'); return; }

  const drafts = [];
  for (const item of candidates) {
    if (drafts.length >= MAX_DRAFTS) break;
    const val = normalizeRating(item.rating);
    const verdict = verdictKeyFromValue(val);
    try {
      const copy = await writeCopy(item, VERDICT_LABEL[verdict]);
      drafts.push(buildDraft(item, copy));
      seenSet.add(item.reviewUrl);
      console.log(`   ✓ [${VERDICT_LABEL[verdict]}] ${item.claim.slice(0, 70)}… (${item.publisher})`);
    } catch (e) {
      console.warn(`   ! sar peste (${item.publisher}): ${e.message}`);
    }
  }

  if (!drafts.length) { console.log('Nu am putut formula niciun draft.'); return; }

  const header = `// GENERAT automat din fact-check-uri reale — VERIFICĂ înainte de post.\n// Verdictul & scorul vin din sursa citată; textul e formulat de Gemini.\n// Regenerează cu: node --env-file=.env.local scripts/marketing/draft_from_factcheck.mjs\n\nexport const drafts = ${JSON.stringify(drafts, null, 2)};\n`;
  fs.writeFileSync(OUT_FILE, header, 'utf8');
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...seenSet], null, 0), 'utf8');
  console.log(`\n✨ ${drafts.length} draft-uri scrise în content/_drafts.mjs`);
  console.log('   Randează-le: node scripts/marketing/generate_slides.mjs  → public/marketing/_drafts/');
}

main().catch((e) => { console.error(e); process.exit(1); });
