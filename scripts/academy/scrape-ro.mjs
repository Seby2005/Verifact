#!/usr/bin/env node
/**
 * Harvests Romanian fact-checks that neither the Google Fact Check API nor the
 * generic list scraper reaches.
 *
 * Both sources here need per-article fetches rather than list parsing: Veridica
 * renders its database with JavaScript but serves a clean `og:title` on every
 * article, and Antifake's category pages surface weekly round-ups whose titles
 * are section headers rather than claims — the individual posts carry the actual
 * statement. So we collect article URLs first, then read the claim from each
 * page's Open Graph title.
 *
 * Run:  node scripts/academy/scrape-ro.mjs [--limit N]
 * Out:  merges into src/lib/academy/bank.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BANK = resolve(ROOT, 'src/lib/academy/bank.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const args = process.argv.slice(2);
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || 320;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.text() : '';
  } catch {
    return '';
  }
}

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&#039;|&rsquo;/g, "'")
    .replace(/&#8222;|&#8221;|&#8220;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function ogTitle(html) {
  const m =
    html.match(/property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
  return m ? decode(m[1]) : '';
}

/** Runs `fn` over items with bounded concurrency, so we stay polite. */
async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out.filter(Boolean);
}

// The verdict labels these outlets put in front of the claim.
const PREFIX_VERDICT = [
  [/^fake\s*news\s*[:–—-]\s*/i, 'false'],
  [/^fals\s*[:|–—-]\s*/i, 'false'],
  [/^distorsionat\s*[:|–—-]\s*/i, 'partial'],
  [/^manipulare\s*[:|–—-]\s*/i, 'false'],
  [/^propagand[ăa]\s*[:|–—-]\s*/i, 'false'],
  [/^dezinformare\s*[:|–—-]\s*/i, 'false'],
  [/^adev[ăa]rat\s*[:|–—-]\s*/i, 'true'],
  [/^par[țt]ial( adev[ăa]rat)?\s*[:|–—-]\s*/i, 'partial'],
];

/** Splits a headline like "FAKE NEWS: X" into its verdict and the bare claim. */
function parseLabelled(title) {
  for (const [re, verdict] of PREFIX_VERDICT) {
    if (re.test(title)) return { verdict, claim: title.replace(re, '').trim() };
  }
  return null;
}

function categorize(t) {
  const R = [
    ['health', /vaccin|covid|virus|cancer|medic|spital|boal|s[ăa]n[ăa]t|farmac|tratament|oms|colesterol/i],
    ['science', /nasa|spa[țt]iu|lun[ăa]|p[ăa]m[âa]nt|studiu|cercet[ăa]r|laborator|tehnolog|inteligen[țt][ăa] artificial|5g/i],
    ['climate', /clim[ăa]|[îi]nc[ăa]lzire|carbon|emisii|vreme|inunda[țt]|incendi|secet|ghe[țt]ar|calot|co2|eolian/i],
    ['money', /escroc|fraud|bani|invest|cripto|banc[ăa]|tax|impozit|pensi|salar|pre[țt]|infla[țt]|euro|burse/i],
    ['security', /r[ăa]zboi|militar|nato|armat[ăa]|rachet[ăa]|dron[ăa]|atac|soldat|bomb|invazie|grani[țt][ăa]|ucrain|rusia|kremlin|putin|zelensk/i],
    ['politics', /alegeri|vot|pre[şs]edinte|ministru|guvern|parlament|partid|politic|referendum|primar|lege|migra|protest|uniunea european|mae|onu/i],
  ];
  return (R.find(([, re]) => re.test(t)) || ['politics'])[0];
}

function toItem({ claim, verdict, rating, publisher, url }) {
  if (claim.length < 30 || claim.length > 240) return null;
  return { claim, verdict, rating, publisher, url, date: '', lang: 'ro', region: 'ro', category: categorize(claim) };
}

// --- Veridica ----------------------------------------------------------------
async function veridica() {
  const listings = [
    'https://www.veridica.ro/fake-news-dezinformare-propaganda',
    'https://www.veridica.ro/baza-de-date',
  ];
  const links = new Set();
  for (const l of listings) {
    const html = await get(l);
    for (const m of html.matchAll(/href="(https:\/\/www\.veridica\.ro\/fake-news-dezinformare-propaganda\/[^"#?]+)"/g)) {
      links.add(m[1]);
    }
    await sleep(200);
  }
  const urls = [...links].slice(0, LIMIT);
  const items = await pool(urls, 6, async (url) => {
    const title = ogTitle(await get(url));
    if (!title) return null;
    const parsed = parseLabelled(title);
    return toItem({
      claim: parsed ? parsed.claim : title,
      verdict: parsed ? parsed.verdict : 'false',
      rating: 'Fake news (Veridica)',
      publisher: 'Veridica',
      url,
    });
  });
  console.log(`  Veridica: ${urls.length} articles fetched -> ${items.length} claims`);
  return items;
}

// --- Antifake (sitemap -> individual posts) ----------------------------------
async function antifake() {
  const maps = ['https://antifake.ro/post-sitemap.xml', 'https://antifake.ro/post-sitemap2.xml'];
  const urls = [];
  for (const m of maps) {
    const xml = await get(m);
    for (const loc of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(loc[1]);
    await sleep(200);
  }
  const posts = urls.filter((u) => !/saptamanii|saptamana/i.test(u)).slice(0, LIMIT);
  const items = await pool(posts, 8, async (url) => {
    const title = ogTitle(await get(url));
    if (!title) return null;
    const parsed = parseLabelled(title);
    // Without a verdict label we cannot trust what the answer should be.
    if (!parsed) return null;
    return toItem({
      claim: parsed.claim,
      verdict: parsed.verdict,
      rating: 'Verificat (Antifake.ro)',
      publisher: 'Antifake.ro',
      url,
    });
  });
  console.log(`  Antifake: ${posts.length} posts fetched -> ${items.length} labelled claims`);
  return items;
}

// --- run ---------------------------------------------------------------------
console.log('Harvesting Romanian sources (per-article)...');
const scraped = [...(await veridica()), ...(await antifake())];

const bank = existsSync(BANK) ? JSON.parse(readFileSync(BANK, 'utf8')) : { items: [] };
const key = (s) => s.slice(0, 70).toLowerCase().replace(/[^a-z0-9ăâîșț ]/gi, '');
const seen = new Set(bank.items.map((i) => key(i.claimRo || i.claim)));
let added = 0;
for (const it of scraped) {
  if (seen.has(key(it.claim))) continue;
  seen.add(key(it.claim));
  bank.items.push(it);
  added += 1;
}
const c = { ro: 0, eu: 0, world: 0 };
for (const i of bank.items) c[i.region] += 1;
bank.counts = { ...c, total: bank.items.length };
bank.generatedAt = new Date().toISOString();
writeFileSync(BANK, JSON.stringify(bank, null, 0));
console.log(`\nAdded ${added}. BANK -> RO ${c.ro} | EU ${c.eu} | World ${c.world} | total ${bank.items.length}`);
