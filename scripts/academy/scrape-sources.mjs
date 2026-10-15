#!/usr/bin/env node
/**
 * Scrapes European/Romanian fact-check and disinformation databases that the
 * Google Fact Check API does not index, and merges them into the Academy bank.
 *
 * The API is rich in English and thin in Romanian; these sources are where the
 * Romania- and Europe-facing material actually lives. Each source contributes
 * the claim text plus a link back to the debunk that established the verdict —
 * we never reproduce the debunk article itself.
 *
 * Run:  node scripts/academy/scrape-sources.mjs [--euvs-pages N]
 * Out:  merges into src/lib/academy/bank.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BANK = resolve(ROOT, 'src/lib/academy/bank.json');

const args = process.argv.slice(2);
const EUVS_PAGES = Number(args[args.indexOf('--euvs-pages') + 1]) || 45;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(25000) });
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

const clean = (s) =>
  s.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#8217;|&#039;|&rsquo;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Claims about Romania/Moldova belong in the Romanian bucket wherever found. */
const RO_HINT = /rom[âaà]ni|bucure[sș]t|moldov[ae]|chi[șs]in[ăa]u|transilvan|basarab|rom[âa]n[ăa]|\bRO\b/i;

// --- EUvsDisinfo -------------------------------------------------------------
// The EEAS database of pro-Kremlin disinformation. Every entry is a documented
// false narrative, most of it aimed at the EU and Eastern Partnership — which is
// exactly the Romania/Europe material the API lacks.
async function scrapeEuvs(pages) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const url = p === 1
      ? 'https://euvsdisinfo.eu/disinformation-cases/'
      : `https://euvsdisinfo.eu/disinformation-cases/page/${p}/`;
    const html = await get(url);
    if (!html) continue;

    const items = [...html.matchAll(
      /<a class="b-archive__database-item"\s+href="([^"]+)"[\s\S]{0,600}?item-date">([^<]*)<\/span>[\s\S]{0,600}?item-title">([\s\S]*?)<\/span>\s*<\/a>/g,
    )];
    for (const m of items) {
      const claim = clean(m[3].replace(/<span class="b-archive__database-item-prefix">[\s\S]*?<\/span>/, ''));
      if (claim.length < 30 || claim.length > 260) continue;
      const [d, mo, y] = (m[2] || '').split('.');
      out.push({
        claim,
        verdict: 'false', // the database only catalogues disinformation
        rating: 'Disinformation (EUvsDisinfo)',
        publisher: 'EUvsDisinfo',
        url: `https://euvsdisinfo.eu${m[1]}`,
        date: y && mo && d ? `${y}-${mo}-${d}` : '',
        lang: 'en',
        region: RO_HINT.test(claim) ? 'ro' : 'eu',
      });
    }
    if (p % 10 === 0) process.stdout.write(`\r  EUvsDisinfo: page ${p}/${pages} → ${out.length} claims`);
    await sleep(220);
  }
  console.log(`\r  EUvsDisinfo: ${pages} pages → ${out.length} claims`);
  return out;
}

// --- WordPress-style Romanian sources ---------------------------------------
// antifake.ro and friends publish one debunk per post; the post title states
// the corrected claim, which is what we quiz on.
async function scrapeWpTitles({ name, pages, url, publisher, strip }) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const html = await get(url(p));
    if (!html) continue;
    const titles = [...html.matchAll(
      /<h[1-4][^>]*class="[^"]*(?:entry-title|post-title|elementor-post__title)[^"]*"[^>]*>\s*(?:<a[^>]*href="([^"]*)"[^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\/h[1-4]>/gi,
    )];
    for (const m of titles) {
      let claim = clean(m[2]);
      if (strip) claim = claim.replace(strip, '').trim();
      if (claim.length < 30 || claim.length > 260) continue;
      out.push({
        claim,
        verdict: 'false',
        rating: 'Fals (verificat)',
        publisher,
        url: m[1] || url(p),
        date: '',
        lang: 'ro',
        region: 'ro',
      });
    }
    await sleep(250);
  }
  console.log(`  ${name}: ${out.length} claims`);
  return out;
}

// --- run ---------------------------------------------------------------------
console.log('Scraping HTML sources the API does not index…');

const scraped = [
  ...(await scrapeEuvs(EUVS_PAGES)),
  ...(await scrapeWpTitles({
    name: 'antifake.ro',
    pages: 12,
    publisher: 'Antifake.ro',
    url: (p) => `https://antifake.ro/category/fact-checking-ul-saptamanii/${p > 1 ? `page/${p}/` : ''}`,
    strip: /^Fact-checking-ul s[ăa]pt[ăa]m[âa]nii:\s*/i,
  })),
  ...(await scrapeWpTitles({
    name: 'inforadar.mapn.ro',
    pages: 10,
    publisher: 'InfoRadar (MApN)',
    url: (p) => `https://inforadar.mapn.ro/articole${p > 1 ? `?page=${p}` : ''}`,
  })),
  ...(await scrapeWpTitles({
    name: 'veridica.ro',
    pages: 10,
    publisher: 'Veridica',
    url: (p) => `https://www.veridica.ro/baza-de-date${p > 1 ? `?page=${p}` : ''}`,
  })),
];

// --- merge into the bank -----------------------------------------------------
const bank = existsSync(BANK)
  ? JSON.parse(readFileSync(BANK, 'utf8'))
  : { items: [] };

const seen = new Set(
  bank.items.map((i) => i.claim.slice(0, 70).toLowerCase().replace(/[^a-z0-9ăâîșț ]/gi, '')),
);
let added = 0;
for (const it of scraped) {
  const key = it.claim.slice(0, 70).toLowerCase().replace(/[^a-z0-9ăâîșț ]/gi, '');
  if (seen.has(key)) continue;
  seen.add(key);
  bank.items.push(it);
  added += 1;
}

// Re-tag: any claim mentioning Romania belongs in the RO bucket regardless of
// which source it came from.
for (const it of bank.items) {
  if (it.region !== 'ro' && RO_HINT.test(it.claim)) it.region = 'ro';
}

const counts = { ro: 0, eu: 0, world: 0 };
for (const it of bank.items) counts[it.region] = (counts[it.region] || 0) + 1;
bank.counts = { ...counts, total: bank.items.length };
bank.generatedAt = new Date().toISOString();

writeFileSync(BANK, JSON.stringify(bank, null, 0));
console.log(`\nAdded ${added} new claims.`);
console.log(`=== BANK === RO: ${counts.ro} | EU: ${counts.eu} | World: ${counts.world} | TOTAL: ${bank.items.length}`);
