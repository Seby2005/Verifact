#!/usr/bin/env node
/**
 * Adds Romanian translations to the Academy bank.
 *
 * Most fact-checking happens in English, so the bank is mostly English while
 * the audience is Romanian. Translating at build time (rather than per play)
 * keeps the game instant, costs nothing at runtime, and lets us eyeball the
 * result before it ships.
 *
 * Uses OpenRouter (the project's working provider) in batches.
 * Run:  node scripts/academy/translate-bank.mjs [--limit N]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BANK = resolve(ROOT, 'src/lib/academy/bank.json');

const env = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
const KEY = (env.match(/^OPENROUTER_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('Missing OPENROUTER_API_KEY'); process.exit(1); }

const MODELS = ['google/gemini-2.5-flash', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'];
const args = process.argv.slice(2);
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || Infinity;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateBatch(texts) {
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const prompt = `Translate each numbered claim into Romanian.

These are claims that fact-checkers have reviewed. Translate them faithfully — keep names, numbers and the original meaning. Do NOT correct, judge or comment on them; a false claim must stay false in Romanian.

Return ONLY the numbered translations, one per line, using the same numbering. No preamble.

${numbered}`;

  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KEY}`,
          'X-Title': 'Verifact Academy Bank',
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.1 }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? '';
      const lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^\d+[.)]/.test(l))
        .map((l) => l.replace(/^\d+[.)]\s*/, '').trim());
      if (lines.length === texts.length) return lines;
    } catch {
      /* try the next model */
    }
  }
  return null;
}

const bank = JSON.parse(readFileSync(BANK, 'utf8'));
// Anything not already Romanian: no diacritics and not tagged ro.
const need = bank.items.filter((it) => !it.claimRo && it.lang !== 'ro' && !/[ăâîșțĂÂÎȘȚ]/.test(it.claim)).slice(0, LIMIT);

console.log(`Translating ${need.length} of ${bank.items.length} claims…`);
const SIZE = 25;
let done = 0, failed = 0;

for (let i = 0; i < need.length; i += SIZE) {
  const chunk = need.slice(i, i + SIZE);
  const out = await translateBatch(chunk.map((c) => c.claim));
  if (out) {
    chunk.forEach((c, j) => { if (out[j] && out[j].length > 10) c.claimRo = out[j]; });
    done += chunk.length;
  } else {
    failed += chunk.length;
  }
  process.stdout.write(`\r  ${done} translated, ${failed} failed  (${i + chunk.length}/${need.length})`);
  // Persist as we go so a crash never loses completed work.
  if (i % (SIZE * 8) === 0) writeFileSync(BANK, JSON.stringify(bank, null, 0));
  await sleep(300);
}

writeFileSync(BANK, JSON.stringify(bank, null, 0));
const withRo = bank.items.filter((i) => i.claimRo || i.lang === 'ro' || /[ăâîșț]/i.test(i.claim)).length;
console.log(`\nDone. Romanian-playable: ${withRo}/${bank.items.length}`);
