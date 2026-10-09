/**
 * Aggregates a mass-benchmark results file into the statistics table.
 * Run: node tests/eval/mass/summarize.mjs results/full-2026-10-08.jsonl
 */
import fs from 'fs';
import path from 'path';

const file = path.resolve('tests/eval/mass', process.argv[2] ?? 'results/full-2026-10-08.jsonl');
const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '-');
const count = (xs, f) => xs.filter(f).length;
const out = [];
const p = (s = '') => out.push(s);

const OUTCOMES = ['correct', 'wrong', 'aberrant', 'rejected_ok', 'rejected_bad', 'crash'];
const LABEL = {
  correct: 'corect',
  wrong: 'greșit (nu inversat)',
  aberrant: 'ABERANT (adevăr inversat)',
  rejected_ok: 'refuzat corect',
  rejected_bad: 'refuzat greșit (tool picat)',
  crash: 'crash',
};

p(`# Benchmark masiv — ${path.basename(file)}  (${rows.length} cazuri)`);
p();
p('| rezultat | total | text | screenshot | url |');
p('|---|---|---|---|---|');
for (const o of OUTCOMES) {
  const by = (k) => count(rows, (r) => r.outcome === o && r.kind === k);
  p(`| ${LABEL[o]} | ${count(rows, (r) => r.outcome === o)} (${pct(count(rows, (r) => r.outcome === o), rows.length)}) | ${by('text')} | ${by('screenshot')} | ${by('url')} |`);
}

const graded = rows.filter((r) => r.stage === 'verify');
p();
p(`Acuratețe pe cazurile care au ajuns la verdict: ${count(graded, (r) => r.outcome === 'correct')}/${graded.length} (${pct(count(graded, (r) => r.outcome === 'correct'), graded.length)})`);

p();
p('## Pe categorie');
p('| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |');
p('|---|---|---|---|---|---|---|---|');
for (const cat of [...new Set(rows.map((r) => r.category))]) {
  const rs = rows.filter((r) => r.category === cat);
  p(`| ${cat} | ${rs.length} | ${OUTCOMES.map((o) => count(rs, (r) => r.outcome === o)).join(' | ')} |`);
}

p();
p('## Tool-uri / layere');
p('| layer | success | unavailable/error | cu rezultate |');
p('|---|---|---|---|');
const names = { layer1: 'L1 fact-check (Google FC)', layer2: 'L2 presă (NewsAPI/Tavily/GDELT)', layer3: 'L3 oficial (Tavily/Wiki)', layer4: 'L4 social (Tavily)' };
for (const k of Object.keys(names)) {
  const ls = graded.map((r) => r.layers?.[k]).filter(Boolean);
  p(`| ${names[k]} | ${count(ls, (l) => l.status === 'success')} | ${count(ls, (l) => l.status !== 'success' && l.status !== 'skipped')} | ${count(ls, (l) => l.results > 0)} |`);
}
p(`| AI analiză | ${count(graded, (r) => r.aiAvailable)} | ${count(graded, (r) => r.aiAvailable === false)} | - |`);
const ocr = rows.filter((r) => r.kind === 'screenshot');
p(`| OCR (Vision/OCR.space) | ${count(ocr, (r) => r.stage !== 'ocr')} | ${count(ocr, (r) => r.stage === 'ocr')} | - |`);
const urls = rows.filter((r) => r.kind === 'url' && r.stage !== 'validate');
p(`| Extragere URL | ${count(urls, (r) => r.stage !== 'url')} | ${count(urls, (r) => r.stage === 'url')} | - |`);
p(`| Cazuri cu 0 surse | ${count(graded, (r) => r.sources === 0)} | | |`);

p();
p('## Semnale aberante în output (independent de verdict)');
const flagCounts = {};
for (const r of rows) for (const f of r.flags ?? []) flagCounts[f.replace(/\(.*\)/, '')] = (flagCounts[f.replace(/\(.*\)/, '')] ?? 0) + 1;
for (const [f, n] of Object.entries(flagCounts).sort((a, b) => b[1] - a[1])) p(`- ${f}: ${n}`);

const durs = graded.map((r) => r.durationMs).sort((a, b) => a - b);
const tok = graded.reduce((s, r) => ({ i: s.i + (r.tokens?.input ?? 0), o: s.o + (r.tokens?.output ?? 0) }), { i: 0, o: 0 });
p();
p(`Durată: mediană ${Math.round(durs[Math.floor(durs.length / 2)] / 1000)}s, p90 ${Math.round(durs[Math.floor(durs.length * 0.9)] / 1000)}s, max ${Math.round(durs.at(-1) / 1000)}s`);
p(`Tokeni: ${tok.i} input + ${tok.o} output (${Math.round((tok.i + tok.o) / Math.max(graded.length, 1))}/verificare)`);

p();
p('## Cazuri problematice');
p('| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |');
p('|---|---|---|---|---|---|');
for (const r of rows.filter((r) => !['correct', 'rejected_ok'].includes(r.outcome) || r.flags?.length)) {
  const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 160);
  p(`| ${r.id} | ${r.outcome} | ${r.expected.join('/')} | ${r.verdict ?? '-'} (${r.score ?? '-'}) | ${esc(r.claim)} | ${esc(r.error ?? r.summary)} ${r.flags?.length ? '⚑ ' + r.flags.join(', ') : ''} |`);
}

const md = out.join('\n');
fs.writeFileSync(file.replace(/\.jsonl$/, '.md'), md);
console.log(md);
