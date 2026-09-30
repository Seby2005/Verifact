import { config } from 'dotenv';
import path from 'path';

// Load .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

import { verifyContent } from '../src/lib/verification/orchestrator';
import type { VerificationInput } from '../src/types/verification';

interface BenchmarkCase {
  id: number;
  name: string;
  input: VerificationInput;
  expectedVerdict?: string[];
  maxDurationMs: number;
}

const BENCHMARKS: BenchmarkCase[] = [
  {
    id: 1,
    name: 'Grindeanu, Simion si Ivan tradare coridor transport',
    input: {
      text: 'Grindeanu, Simion și Ivan acuzați de trădare de țară pentru sabotarea coridorului de transport strategic Constanța-Gdansk',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    maxDurationMs: 8000,
  },
  {
    id: 2,
    name: 'Marius Bostan securist',
    input: {
      text: 'Marius Bostan a fost/este securist',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false'],
    maxDurationMs: 8000,
  },
  {
    id: 3,
    name: 'Guvernul a interzis masinile diesel',
    input: {
      text: 'Guvernul României a interzis mașinile cu motor diesel',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false'],
    maxDurationMs: 8000,
  },
  {
    id: 4,
    name: 'Ucrainenii primesc mai multi bani decat handicapatii (cu typos)',
    input: {
      text: 'Ucrainenii primesc mai multi bani recat bolanvii cu handicap in romania',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false', 'unclear'],
    maxDurationMs: 8000,
  },
  {
    id: 5,
    name: 'Nicusor Dan este autist? (Interogativ)',
    input: {
      text: 'Nicusor Dan este autist?',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false', 'unclear'],
    maxDurationMs: 8000,
  },
  {
    id: 6,
    name: 'Dronele cazute in Romania sunt ucrainene? (Interogativ)',
    input: {
      text: 'Dronele cazute in Romania sunt ucrainene?',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false', 'unclear'],
    maxDurationMs: 8000,
  },
  {
    id: 7,
    name: 'Dronele sunt trimise intentionat in Romania?',
    input: {
      text: 'Dronele sunt trimise intentionat in Romania?',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false', 'unclear', 'partial'],
    maxDurationMs: 8000,
  },
  {
    id: 8,
    name: 'Nicusor Dan a promis ca nu va creste TVA, insa a crescut',
    input: {
      text: 'Nicusor Dan a promis ca nu va creste TVA, insa a crescut',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false', 'partial'],
    maxDurationMs: 8000,
  },
  {
    id: 9,
    name: 'Copiii ucrainieni alocatie mai mare',
    input: {
      text: 'Copiii ucrainieni din România au o alocație mai mare decât copiii români',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false'],
    maxDurationMs: 8000,
  },
  {
    id: 10,
    name: 'Romania detine 60% din rezervele de apa ale UE',
    input: {
      text: 'România deține 60% din rezervele de apă ale UE',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false'],
    maxDurationMs: 8000,
  },
  {
    id: 11,
    name: 'OCR Screenshot cu UI artifacts (5G, TikTok, baterie)',
    input: {
      text: '12:45 84% 5G LIVE For You TikTok Urmărește Gata cu schimbarea orei! Uniunea Europeană a decis că din 2026 România nu mai schimbă ceasul. Comentarii 1.2k Distribuie 450',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    expectedVerdict: ['false', 'partial'],
    maxDurationMs: 8000,
  },
  {
    id: 12,
    name: 'Social post mentioning politician (Layer 4 sanity)',
    input: {
      text: 'Ce părere aveți despre Nicușor Dan? Un om extraordinar care schimbă Bucureștiul în bine. Postat pe Facebook de un susținător.',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    },
    maxDurationMs: 8000,
  },
];

async function runBenchmark() {
  console.log('='.repeat(70));
  console.log('STARTING FACT-CHECKING PIPELINE BENCHMARK (12 CASES)');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const b of BENCHMARKS) {
    console.log(`\n[CASE ${b.id}/12] ${b.name}`);
    console.log(`Input: "${b.input.text.slice(0, 80)}..."`);

    const start = Date.now();
    try {
      const report = await verifyContent(b.input);
      const elapsed = Date.now() - start;

      console.log(`⏱️ Duration: ${elapsed}ms | Target: < ${b.maxDurationMs}ms`);
      console.log(`🤖 AI Available: ${report.aiAvailable}`);
      console.log(`🎯 Score: ${report.score}% | Verdict: ${report.verdict}`);
      console.log(`🔍 Verified Claim / Hypothesis: "${report.claim}"`);
      console.log(`📑 Executive Summary: "${report.executiveSummary.slice(0, 100)}..."`);
      console.log(`📚 Sources: ${report.sources.length} | Available Layers: ${report.scoreBreakdown.availableLayers}`);

      let casePassed = true;
      if (!report.aiAvailable) {
        console.error('❌ AI Analysis was NOT available (timeout or circuit breaker)!');
        casePassed = false;
      }
      if (b.expectedVerdict && !b.expectedVerdict.includes(report.verdict)) {
        console.warn(`⚠️ Verdict ${report.verdict} not in expected [${b.expectedVerdict.join(', ')}]`);
      }
      if (elapsed > 10000) {
        console.error(`❌ Took too long: ${elapsed}ms`);
        casePassed = false;
      }

      if (casePassed) {
        console.log(`✅ Case ${b.id} PASSED`);
        passed++;
      } else {
        console.log(`❌ Case ${b.id} FAILED`);
        failed++;
      }
    } catch (err) {
      const elapsed = Date.now() - start;
      console.error(`❌ CRASHED after ${elapsed}ms:`, err);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`BENCHMARK COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));
}

runBenchmark().catch(console.error);
