#!/usr/bin/env node
/**
 * Builds the Academy question bank from the Google Fact Check Tools API.
 *
 * Why a build-time harvest instead of live queries: a teaching game needs a
 * curated, fast, reliably-verdicted pool. Live search returns whatever is
 * trending, is thin in Romanian, and can't be quality-checked. This script
 * harvests once, classifies verdicts from the publisher's own wording, buckets
 * by region, translates non-Romanian claims, and writes a static bank.
 *
 * Run:  node scripts/academy/harvest.mjs [--no-translate] [--limit N]
 * Out:  src/lib/academy/bank.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'src/lib/academy/bank.json');

// --- env ---------------------------------------------------------------------
const env = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
const readEnv = (k) => (env.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim();
const FC_KEY = readEnv('GOOGLE_FACT_CHECK_API_KEY');
const GEMINI_KEY = readEnv('GEMINI_API_KEY');
if (!FC_KEY) {
  console.error('Missing GOOGLE_FACT_CHECK_API_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
const NO_TRANSLATE = args.includes('--no-translate');

// --- sources -----------------------------------------------------------------
// Publisher-site harvesting is far more productive than topical search: one
// call returns that outlet's whole indexed set. Grouped by the region a player
// picks, so the bank can be filtered without re-deriving geography later.
const SITES = {
  ro: ['brodhub.eu', 'factual.ro', 'veridica.ro', 'stopfals.md', 'misinforma.ro', 'antifake.ro'],
  eu: [
    'fullfact.org', 'correctiv.org', 'maldita.es', 'newtral.es', 'verificat.cat',
    'demagog.org.pl', 'faktograf.hr', 'factcheck.bg', 'stopfake.org', 'ellinikahoaxes.gr',
    'pagellapolitica.it', 'facta.news', 'faktabaari.fi', 'tjekdet.dk', 'faktisk.no',
    'dpa-factchecking.com', 'mimikama.org', 'thejournal.ie', 'verifica.efe.com',
    'observador.pt', 'polygraph.info', '15min.lt', 'nieuwscheckers.nl', 'knack.be',
    'factcheckni.org', 'raskrinkavanje.ba', 'istinomer.rs', 'demagog.cz', 'afp.com',
    'factcheck.afp.com', 'delfi.lt', 'vsquare.org', 'lakmusz.hu', 'infoveritas.es',
  ],
  world: [
    'politifact.com', 'factcheck.org', 'snopes.com', 'apnews.com', 'leadstories.com',
    'usatoday.com', 'washingtonpost.com', 'checkyourfact.com', 'truthorfiction.com',
    'boomlive.in', 'altnews.in', 'factly.in', 'vishvasnews.com', 'africacheck.org',
    'aosfatos.org', 'chequeado.com', 'animalpolitico.com', 'colombiacheck.com',
    'rappler.com', 'tempo.co', 'taiwanfactcheck.com', 'factcrescendo.com',
    'misbar.com', 'newschecker.in', 'thequint.com', 'dubawa.org', 'pesacheck.org',
    'reuters.com', 'bbc.com', 'fatabyyano.net',
  ],
};

// Romanian-language topical queries — thin individually, but they surface RO
// items the site list misses.
const RO_QUERIES = [
  'vaccin', 'guvern', 'alegeri', 'UE', 'energie', 'pensii', 'sanatate', 'scoala',
  'clima', 'armata', 'Rusia', 'Ucraina', 'NATO', 'imigranti', 'euro', 'taxe',
  'coronavirus', 'spital', 'medic', 'politie', 'lege', 'presedinte', 'ministru',
  'Moldova', 'Bruxelles', 'drona', 'razboi', 'referendum', 'primar', 'buget',
];

// --- categories --------------------------------------------------------------
// Keyword→category so a player can pick topics, not just regions.
const CATEGORY_RULES = [
  ['health', /vaccin|covid|virus|cancer|medic|doctor|hospital|spital|drug|pfizer|health|sanat|disease|boal|autism|5g|graphene|grafen|mask|masca|pandemi|farmac|tratament|salud|santé|gesundheit/i],
  ['science', /nasa|space|spatiu|moon|luna|earth|pamant|scientist|savant|study|studiu|research|cercetar|physics|chimic|dna|adn|lab|laborator|technolog|tehnolog|\bai\b|inteligenta artificial|astronom/i],
  ['climate', /climate|clima|warming|incalzire|carbon|emission|emisii|weather|vreme|flood|inundat|wildfire|incendi|hurricane|uragan|drought|seceta|glacier|ghetar|haarp|chemtrail|solar|renewable|eolian|turbine/i],
  ['money', /scam|escroc|fraud|frauda|money|bani|invest|crypto|bitcoin|bank|banca|tax|taxa|impozit|pension|pensi|salary|salar|price|pret|inflat|euro|dolar|economic|econom|payment|plata|cash|numerar/i],
  ['security', /war|razboi|military|militar|nato|army|armata|weapon|arma|missile|racheta|drone|drona|attack|atac|soldier|soldat|troop|trupe|bomb|terror|invasion|invazie|border|granita|refugee|refugiat|ukrain|ucrain|russia|rusia|kremlin|putin/i],
  ['politics', /election|alegeri|vote|vot|president|presedinte|minister|ministru|government|guvern|parliament|parlament|party|partid|politic|campaign|campanie|ballot|referendum|mayor|primar|senator|congress|law|lege|migrant|imigra|protest/i],
];

function categorize(text) {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(text)) return cat;
  return 'politics';
}

/**
 * Classifies the publisher's own textual rating. Ratings are often prose
 * ("There is no evidence to support this"), so word matching beats a lookup
 * table. Partial is tested first because those phrases usually contain
 * "true"/"false" too. Returns null when we can't be confident — those items are
 * dropped rather than teaching a wrong verdict.
 */
function classifyRating(raw) {
  const s = (raw || '').toLowerCase().trim();
  if (!s) return null;
  if (/(partly|partially|part true|part false|mixed|half[ -]?true|misleading|missing context|lacks? context|needs? context|out of context|overstated|exaggerat|exagerat|par[țt]ial|mostly false|mostly true|barely true|one pinocchio|two pinocchios|imprecis|inexact|enganos|fuorviante|irrefuhrend|irreführend|ohne kontext|manipuliert)/.test(s)) return 'partial';
  if (/(^|\W)(false|fake|hoax|incorrect|no evidence|not true|untrue|unfounded|debunk|fabricat|fals|scam|misinformation|disinformation|pants on fire|pinocchio|baseless|unsupported|not supported|misleading claim|altered|doctored|manipulat|bez pokrycia|nieprawda|falso|faux|falsch|невярно|неправда|ψευδ|lažno|hamis|valheellinen|usant|felaktig)(\W|$)/.test(s)) return 'false';
  if (/(^|\W)(true|correct|accurate|adev[ăa]rat|confirmed|verified|legitimate|no pinocchios|geppetto|prawda|verdadero|vrai|wahr|istina|igaz|sant)(\W|$)/.test(s)) return 'true';
  return null;
}

// --- fetching ----------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(params) {
  const p = new URLSearchParams({ key: FC_KEY, pageSize: '100', ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?${p}`);
      if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
      if (!res.ok) return [];
      const data = await res.json();
      return data.claims || [];
    } catch {
      await sleep(600);
    }
  }
  return [];
}

function toItem(claim, region) {
  const rv = claim.claimReview?.[0];
  if (!rv) return null;
  const text = (claim.text || '').replace(/\s+/g, ' ').trim();
  const verdict = classifyRating(rv.textualRating);
  if (!verdict) return null;
  // Length bounds: too short carries no signal, too long stops being a claim.
  if (text.length < 30 || text.length > 260) return null;
  if (!rv.url || !rv.publisher?.name) return null;
  return {
    claim: text,
    verdict,
    rating: (rv.textualRating || '').slice(0, 60),
    publisher: rv.publisher.name,
    url: rv.url,
    date: (rv.reviewDate || '').slice(0, 10),
    lang: rv.languageCode || '',
    region,
    category: categorize(text),
  };
}

async function harvest() {
  const out = [];
  for (const [region, sites] of Object.entries(SITES)) {
    for (const site of sites) {
      const claims = await search({ reviewPublisherSiteFilter: site });
      const items = claims.map((c) => toItem(c, region)).filter(Boolean);
      out.push(...items);
      console.log(`  [${region}] ${site.padEnd(24)} ${String(claims.length).padStart(3)} raw → ${items.length} usable`);
      await sleep(120);
    }
  }
  console.log('  --- Romanian topical queries ---');
  for (const q of RO_QUERIES) {
    const claims = await search({ query: q, languageCode: 'ro' });
    const items = claims.map((c) => toItem(c, 'ro')).filter(Boolean);
    out.push(...items);
    await sleep(120);
  }
  return out;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((it) => {
    const key = it.claim.slice(0, 70).toLowerCase().replace(/[^a-z0-9ăâîșț ]/gi, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- translation -------------------------------------------------------------
/** Translates claims to Romanian in batches, so the bank is playable in RO. */
async function translateBatch(texts) {
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const prompt = `Translate each numbered claim into Romanian. These are claims reviewed by fact-checkers — translate faithfully, keep names and numbers, do NOT judge or fix them. Return ONLY the numbered translations, one per line, same numbering.\n\n${numbered}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const lines = raw.split('\n').map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
  return lines.length === texts.length ? lines : null;
}

async function translateAll(items) {
  const need = items.filter((it) => it.lang !== 'ro' && !/[ăâîșț]/i.test(it.claim));
  console.log(`\nTranslating ${need.length} claims to Romanian…`);
  const SIZE = 20;
  let done = 0;
  for (let i = 0; i < need.length; i += SIZE) {
    const chunk = need.slice(i, i + SIZE);
    const translated = await translateBatch(chunk.map((c) => c.claim));
    if (translated) {
      chunk.forEach((c, j) => { c.claimRo = translated[j]; });
      done += chunk.length;
    }
    process.stdout.write(`\r  ${done}/${need.length}`);
    await sleep(400);
  }
  console.log('');
}

// --- main --------------------------------------------------------------------
console.log('Harvesting fact-checks…');
let items = dedupe(await harvest());

if (!NO_TRANSLATE && GEMINI_KEY) await translateAll(items);

// Keep the bank balanced: a player picking "World" shouldn't get 10x the pool.
const byRegion = { ro: [], eu: [], world: [] };
for (const it of items) byRegion[it.region].push(it);

const bank = {
  generatedAt: new Date().toISOString(),
  counts: {
    ro: byRegion.ro.length,
    eu: byRegion.eu.length,
    world: byRegion.world.length,
    total: items.length,
  },
  items,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(bank, null, 0));

console.log('\n=== BANK ===');
console.log(`  RO:    ${bank.counts.ro}`);
console.log(`  EU:    ${bank.counts.eu}`);
console.log(`  World: ${bank.counts.world}`);
console.log(`  TOTAL: ${bank.counts.total}`);
const cats = {};
for (const it of items) cats[it.category] = (cats[it.category] || 0) + 1;
console.log('  categories:', cats);
const verdicts = {};
for (const it of items) verdicts[it.verdict] = (verdicts[it.verdict] || 0) + 1;
console.log('  verdicts:', verdicts);
console.log(`  written → ${OUT}`);
