/**
 * Mass LIVE benchmark of the whole verification pipeline (text, screenshot,
 * URL). Not a unit test: it calls the real providers, so it costs quota
 * (OpenRouter, NewsAPI, Tavily, Google Vision, Fact Check) and results vary.
 *
 * Each case is run the way /api/verify runs it: validateVerifyInput, then for
 * URLs extractArticleText, for screenshots processOCR, then verifyContent.
 * Supabase env is stripped so the verification cache is bypassed.
 *
 * Results are appended to results/<run>.jsonl as they finish, so an
 * interrupted run resumes where it stopped (pass the same RUN name).
 *
 * Run:
 *   RUN=2026-10-08 TS_NODE_PROJECT=tests/eval/tsconfig.json \
 *   node_modules/.bin/ts-node --transpile-only -r tsconfig-paths/register \
 *   tests/eval/mass/mass-benchmark.ts
 */
import fs from 'fs';
import path from 'path';

for (const line of fs.readFileSync(path.resolve('.env.local'), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i !== -1 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
// Bypass the Supabase-backed verification cache.
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

import { verifyContent } from '../../../src/lib/verification/orchestrator';
import { validateVerifyInput } from '../../../src/lib/verification/validate-input';
import { extractArticleText } from '../../../src/lib/verification/url-extract';
import { processOCR } from '../../../src/lib/ocr';
import type { VerificationReport } from '../../../src/types/verification';
import { CASES, type Case } from './cases';

const RUN = process.env.RUN || new Date().toISOString().slice(0, 10);
const OUT_DIR = path.resolve('tests/eval/mass/results');
const OUT = path.join(OUT_DIR, `${RUN}.jsonl`);
const CASE_TIMEOUT_MS = 150_000;

export interface CaseResult {
  id: string;
  kind: Case['kind'];
  category: string;
  outcome: 'correct' | 'wrong' | 'aberrant' | 'rejected_ok' | 'rejected_bad' | 'crash';
  stage?: 'validate' | 'url' | 'ocr' | 'verify';
  error?: string;
  verdict?: string;
  score?: number;
  evidenceStatus?: string;
  expected: string[];
  claim?: string;
  ocrText?: string;
  extractedChars?: number;
  sources?: number;
  layers?: Record<string, { status: string; results: number; error?: string }>;
  aiAvailable?: boolean;
  flags: string[];
  durationMs: number;
  tokens?: { input: number; output: number };
  summary?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error(`CASE_TIMEOUT ${ms}ms`)), ms))]);
}

/** Deterministic shuffle so quota exhaustion late in a run hits every category, not just the last one. */
function shuffle<T>(items: T[], seed = 7): T[] {
  const a = [...items];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Output problems independent of whether the verdict matched ground truth. */
function sanityFlags(r: VerificationReport, c: Case, durationMs: number): string[] {
  const flags: string[] = [];
  const layers = [r.layer1, r.layer2, r.layer3, r.layer4].filter(Boolean);
  const evidence = r.sources?.length ?? 0;
  if (evidence === 0 && (r.evidenceStatus === 'corroborated' || r.evidenceStatus === 'contradicted'))
    flags.push('status-ferm-fără-surse');
  if (r.verdict === 'true' && r.score < 60) flags.push(`verdict-true-scor-mic(${r.score})`);
  if (r.verdict === 'false' && r.score > 50) flags.push(`verdict-false-scor-mare(${r.score})`);
  if (!r.executiveSummary || r.executiveSummary.trim().length < 20) flags.push('rezumat-gol');
  if (r.aiAvailable === false) flags.push('ai-indisponibil');
  if (durationMs > 60_000) flags.push(`peste-60s-vercel(${Math.round(durationMs / 1000)}s)`);
  if (layers.every((l) => l!.status !== 'success' && l!.status !== 'skipped')) flags.push('niciun-layer-ok');
  if (c.mustMention) {
    const claim = (r.verifiedClaim || r.claim || '').toLowerCase();
    if (!c.mustMention.some((m) => claim.includes(m))) flags.push('afirmație-extrasă-greșit');
  }
  return flags;
}

async function runCase(c: Case): Promise<CaseResult> {
  const start = Date.now();
  const expected = c.expectReject ? ['<refuz>', ...c.accept] : c.accept;
  const base = { id: c.id, kind: c.kind, category: c.category, expected, flags: [] as string[] };
  const done = (o: Partial<CaseResult>): CaseResult => ({ ...base, outcome: 'crash', durationMs: Date.now() - start, ...o }) as CaseResult;
  const rejected = (stage: CaseResult['stage'], error: string) =>
    done({ outcome: c.expectReject ? 'rejected_ok' : 'rejected_bad', stage, error });

  let text = c.input;
  let ocrText: string | undefined;
  let extractedChars: number | undefined;

  if (c.kind === 'screenshot') {
    try {
      const b64 = fs.readFileSync(path.resolve('tests/eval/mass/screens', c.input)).toString('base64');
      const ocr = await withTimeout(processOCR(b64), 30_000);
      text = ocrText = ocr.text;
    } catch (e) {
      return rejected('ocr', String(e instanceof Error ? e.message : e));
    }
  }

  const v = validateVerifyInput({ text, inputType: c.kind, language: c.language ?? 'ro', isPublic: false });
  if (!v.success) return rejected('validate', v.error);

  if (c.kind === 'url') {
    try {
      text = await withTimeout(extractArticleText(v.data.text), 30_000);
      extractedChars = text.length;
    } catch (e) {
      return rejected('url', String(e instanceof Error ? e.message : e));
    }
  }

  try {
    const r = await withTimeout(
      verifyContent({ text, language: v.data.language, type: c.kind, inputType: c.kind, isPublic: false }),
      CASE_TIMEOUT_MS
    );
    const durationMs = Date.now() - start;
    const layers: CaseResult['layers'] = {};
    for (const k of ['layer1', 'layer2', 'layer3', 'layer4'] as const) {
      const l = r[k];
      if (l) layers[k] = { status: l.status, results: l.results?.length ?? 0, ...(l.error ? { error: String(l.error).slice(0, 200) } : {}) };
    }
    const outcome: CaseResult['outcome'] = c.accept.includes(r.verdict)
      ? 'correct'
      : c.aberrant.includes(r.verdict)
        ? 'aberrant'
        : 'wrong';
    return {
      ...base,
      outcome,
      stage: 'verify',
      verdict: r.verdict,
      score: r.score,
      evidenceStatus: r.evidenceStatus,
      claim: r.verifiedClaim || r.claim,
      ocrText: ocrText?.slice(0, 400),
      extractedChars,
      sources: r.sources?.length ?? 0,
      layers,
      aiAvailable: r.aiAvailable,
      flags: sanityFlags(r, c, durationMs),
      durationMs,
      tokens: r.tokenUsage ? { input: r.tokenUsage.inputTokens, output: r.tokenUsage.outputTokens } : undefined,
      summary: r.executiveSummary?.slice(0, 300),
    };
  } catch (e) {
    return done({ outcome: 'crash', stage: 'verify', error: String(e instanceof Error ? e.message : e).slice(0, 300), ocrText, extractedChars });
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const doneIds = new Set(
    fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).id) : []
  );
  const only = process.env.ONLY?.split(',');
  const todo = shuffle(CASES).filter((c) => !doneIds.has(c.id) && (!only || only.includes(c.id)));
  console.log(`run ${RUN}: ${todo.length} cases to go (${doneIds.size} already done)`);
  let n = 0;
  for (const c of todo) {
    const res = await runCase(c);
    fs.appendFileSync(OUT, JSON.stringify(res) + '\n');
    n++;
    console.log(
      `[${n}/${todo.length}] ${res.outcome.padEnd(12)} ${c.id.padEnd(30)} verdict=${res.verdict ?? '-'} score=${res.score ?? '-'} ` +
        `${Math.round(res.durationMs / 1000)}s ${res.flags.join(',')} ${res.error ?? ''}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
