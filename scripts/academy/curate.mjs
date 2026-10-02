#!/usr/bin/env node
/**
 * Trims the harvested bank into a balanced, playable set.
 *
 * The raw harvest is lopsided: mostly English, mostly "false", mostly politics.
 * A quiz built straight from it would be guessable ("always answer false") and
 * repetitive. This picks a spread across region, category and verdict, and
 * drops claims that don't read as standalone questions.
 *
 * Run:  node scripts/academy/curate.mjs [--per-region 220]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BANK = resolve(ROOT, 'src/lib/academy/bank.json');
const args = process.argv.slice(2);
const PER_REGION = Number(args[args.indexOf('--per-region') + 1]) || 220;

const bank = JSON.parse(readFileSync(BANK, 'utf8'));

// Claims that need the article to make sense, or that are really headlines.
const UNPLAYABLE = [
  /^(video|photo|image|imagini|foto)s? (shows?|of)\b/i, // "Video shows..." needs the video
  /\b(this (video|image|photo)|acest[ea]? (video|imagine))\b/i,
  /^\s*[""']?\s*$/,
  /^(fact check|verificare|análisis|analiza)[:\s]/i,
  /\b(click here|read more|see more)\b/i,
];

function playable(it) {
  const t = it.claimRo || it.claim;
  if (!t || t.length < 35 || t.length > 240) return false;
  if (UNPLAYABLE.some((re) => re.test(t))) return false;
  // A claim should be a statement, not a fragment.
  if (!/\s/.test(t) || t.split(/\s+/).length < 6) return false;
  return true;
}

/** Round-robins across buckets so no single category or verdict dominates. */
function balanced(items, limit) {
  const buckets = new Map();
  for (const it of items) {
    const key = `${it.category}|${it.verdict}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(it);
  }
  // Prefer verdict variety: interleave the buckets rather than draining one.
  const lists = [...buckets.values()];
  lists.sort((a, b) => b.length - a.length);
  const out = [];
  let i = 0;
  while (out.length < limit && lists.some((l) => l.length)) {
    const list = lists[i % lists.length];
    if (list.length) out.push(list.shift());
    i += 1;
  }
  return out;
}

const kept = [];
for (const region of ['ro', 'eu', 'world']) {
  const pool = bank.items.filter((it) => it.region === region && playable(it));
  const picked = balanced(pool, PER_REGION);
  kept.push(...picked);
  console.log(`  ${region}: ${pool.length} playable → kept ${picked.length}`);
}

const counts = { ro: 0, eu: 0, world: 0 };
const cats = {};
const verdicts = {};
for (const it of kept) {
  counts[it.region] += 1;
  cats[it.category] = (cats[it.category] || 0) + 1;
  verdicts[it.verdict] = (verdicts[it.verdict] || 0) + 1;
}

writeFileSync(
  BANK,
  JSON.stringify({ generatedAt: new Date().toISOString(), counts: { ...counts, total: kept.length }, items: kept }, null, 0),
);

console.log(`\n=== CURATED === total ${kept.length}`);
console.log('  regions:', counts);
console.log('  categories:', cats);
console.log('  verdicts:', verdicts);
