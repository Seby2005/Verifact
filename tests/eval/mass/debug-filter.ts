/**
 * Dumps what the AI source filter was asked and answered for one claim, then
 * the per-layer scores it produced — for diagnosing a verdict that contradicts
 * the report's own prose.
 *
 * Run: TS_NODE_PROJECT=tests/eval/tsconfig.json node_modules/.bin/ts-node --transpile-only \
 *      -r tsconfig-paths/register tests/eval/mass/debug-filter.ts "afirmația"
 */
import fs from 'fs';
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i !== -1 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const res = await realFetch(url, init);
  if (String(url).includes('openrouter') && init?.body?.includes('SURSE CANDIDATE')) {
    const p = JSON.parse(init.body).messages[0].content;
    const clone = await res.clone().json();
    console.log('=== FILTER CANDIDATES ===\n' + p.slice(p.indexOf('AFIRMAȚIA DE VERIFICAT'), p.indexOf('SARCINA:')));
    console.log('=== FILTER RESPONSE ===\n' + clone.choices?.[0]?.message?.content);
  }
  return res;
}) as any;
import { verifyContent } from '../../../src/lib/verification/orchestrator';
verifyContent({ text: process.argv[2], inputType: 'text', language: 'ro', isPublic: false }).then((r) => {
  console.log('VERDICT', r.verdict, r.score, r.evidenceStatus, JSON.stringify(r.scoreBreakdown));
  console.log('L1', r.layer1?.results.map((x) => `${x.ratingValue} ${x.rating} | ${x.claimReviewed?.slice(0, 80)}`));
  console.log('L2', r.layer2?.results.map((x) => `${x.sentiment} | ${x.title.slice(0, 80)}`));
  console.log('L3', r.layer3?.results.map((x) => `${x.supportsOrDenies} | ${x.title.slice(0, 80)}`));
});
