/**
 * Rebuilds src/lib/factcheck-archive/archive.json: every published verdict of
 * the Romanian-language fact-checkers, as claim + verdict + link.
 *
 * Two sources, both public and both meant to be read by machines:
 *  - Google Fact Check Tools API, listed per publisher. It carries the
 *    ClaimReview data the fact-checkers themselves publish (Factual.ro, AFP
 *    Verificat, Lead Stories in Romanian, BROD). Needs GOOGLE_FACT_CHECK_API_KEY.
 *  - Veridica's database of fake news and disinformation narratives
 *    (veridica.ro/baza-de-date), which is not in Google's index. Its
 *    robots.txt allows the page; it is read at one request per second.
 *
 * Only the headline-level record is kept (the claim, the verdict word, the
 * date, the link back) — never the article text.
 *
 * Run:  node scripts/build-factcheck-archive.mjs
 * Then commit the regenerated archive.json.
 */
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('src/lib/factcheck-archive/archive.json');
const USER_AGENT = 'Mozilla/5.0 (compatible; VerifactBot/1.0; +https://github.com/Seby2005/Verifact)';
const MAX_CLAIM_CHARS = 300;

/** Publishers listed through the Google Fact Check Tools API. */
const API_PUBLISHERS = [
  { site: 'factual.ro', name: 'Factual.ro' },
  { site: 'verificat.afp.com', name: 'AFP Verificat' },
  { site: 'xn--romn-doa3r.leadstories.com', name: 'Lead Stories România' },
  { site: 'brodhub.eu', name: 'BROD' },
];
const VERIDICA = { site: 'veridica.ro', name: 'Veridica' };

function envValue(name) {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync('.env.local')) return undefined;
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const t = line.trim();
    if (t.startsWith(`${name}=`)) return t.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (text) => text.replace(/\s+/g, ' ').trim();

function decodeEntities(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
}

/** Every Romanian-language review one publisher has in Google's index. */
async function listFromApi(publisher, apiKey) {
  const entries = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      key: apiKey,
      reviewPublisherSiteFilter: publisher.site,
      languageCode: 'ro',
      pageSize: '100',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?${params}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Fact Check API ${publisher.site}: HTTP ${res.status}`);
    const data = await res.json();
    for (const claim of data.claims ?? []) {
      const review = claim.claimReview?.[0];
      if (!review?.url || !claim.text || !review.textualRating) continue;
      entries.push({
        claim: clean(claim.text).slice(0, MAX_CLAIM_CHARS),
        rating: clean(review.textualRating).slice(0, 60),
        url: review.url,
        date: (review.reviewDate ?? claim.claimDate ?? '').slice(0, 10),
      });
    }
    pageToken = data.nextPageToken ?? '';
  } while (pageToken);
  return entries;
}

/**
 * Veridica's database, newest first. Each row is a headline of the form
 * "FAKE NEWS: <the narrative>" — the label is the verdict, the rest the claim.
 */
async function listFromVeridica() {
  const entries = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://www.veridica.ro/baza-de-date?per_page=50&page=${page}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Veridica page ${page}: HTTP ${res.status}`);
    const html = await res.text();
    const rows = [...html.matchAll(/<tr>\s*<td>\s*(\d{2})\.(\d{2})\.(\d{4})\s*<\/td>\s*<td>\s*<a href="([^"]+)">([^<]+)<\/a>/g)];
    if (rows.length === 0) break;
    for (const [, day, month, year, url, rawTitle] of rows) {
      const title = clean(decodeEntities(rawTitle));
      const split = title.match(/^([\p{Lu}\s]{4,40}):\s*(.+)$/u);
      if (!split) continue; // not a labelled narrative
      entries.push({
        claim: split[2].slice(0, MAX_CLAIM_CHARS),
        rating: clean(split[1]),
        url,
        date: `${year}-${month}-${day}`,
      });
    }
    process.stdout.write(`\r  veridica: page ${page}, ${entries.length} narratives`);
    await sleep(1000);
  }
  process.stdout.write('\n');
  return entries;
}

async function main() {
  const apiKey = envValue('GOOGLE_FACT_CHECK_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_FACT_CHECK_API_KEY is not set (env or .env.local)');

  const publishers = [];
  const entries = [];
  const seen = new Set();
  const add = (publisher, list) => {
    const index = publishers.push(publisher) - 1;
    let kept = 0;
    for (const e of list) {
      const key = e.url.replace(/\/+$/, '');
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push([e.claim, e.rating, index, e.url, e.date]);
      kept++;
    }
    console.log(`  ${publisher.name}: ${kept}`);
  };

  for (const publisher of API_PUBLISHERS) add(publisher, await listFromApi(publisher, apiKey));
  add(VERIDICA, await listFromVeridica());

  // Newest first, so a diff of the regenerated file shows what is new at the top.
  entries.sort((a, b) => (a[4] < b[4] ? 1 : a[4] > b[4] ? -1 : 0));

  const lines = entries.map((e) => `    ${JSON.stringify(e)}`).join(',\n');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    `{\n  "generatedAt": ${JSON.stringify(new Date().toISOString().slice(0, 10))},\n  "publishers": ${JSON.stringify(publishers)},\n  "entries": [\n${lines}\n  ]\n}\n`
  );
  console.log(`${entries.length} fact-checks written to ${path.relative('.', OUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
