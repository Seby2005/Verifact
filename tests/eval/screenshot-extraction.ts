/**
 * Screenshot claim-extraction EVAL (runnable, not a unit test).
 *
 * The extractor is a model call, so it is non-deterministic and can't be a CI
 * unit test. This harness feeds it realistic noisy OCR — TikTok/Facebook UI
 * chrome, follower and like counts, @handles, the sharer's spin — and asserts
 * the GUARANTEE that matters for launch: the extracted `primaryClaim` is the
 * clean factual statement, with none of that noise riding along.
 *
 * Run:
 *   TS_NODE_PROJECT=tests/eval/tsconfig.json \
 *   node_modules/.bin/ts-node --transpile-only -r tsconfig-paths/register \
 *   tests/eval/screenshot-extraction.ts
 *
 * (Needs OPENROUTER_API_KEY in .env.local. Exit code is non-zero if any case
 * fails, so it can gate a release check.)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { extractClaim } from '../../src/lib/ai/claim-extractor';

interface Case {
  label: string;
  ocr: string;
  /** The claim must contain at least one of these (it found the real fact). */
  mustMention: string[];
}

// Noise the primaryClaim must NEVER contain — UI chrome, counts, handles.
const NOISE_PATTERNS: RegExp[] = [
  /@\w+/, // handles
  /\b\d[\d.,]*\s?[KMk]\b/, // 45.2K, 1.2M
  /urmăritori|urmaritori|followers?/i,
  /aprecieri|likes?|\blike\b/i,
  /comentarii|comments?/i,
  /distribuie|distribuiri|share/i,
  /vezi traducerea|see translation/i,
  /pentru tine|for you/i,
  /#\w+/, // hashtags
];

const CASES: Case[] = [
  {
    label: 'TikTok reshare of FB post (health conspiracy)',
    ocr: `Pentru tine  Urmărește
@vindecare.naturala  1.2M urmăritori  ·  Urmărește
❤️ 45.2K   💬 3,201   ↗ Distribuie   🔖 Salvează
Vezi traducerea
Gata cu minciunile lor!! 😤 DISTRIBUIE URGENT
"Un studiu Harvard confirma ca bicarbonatul de sodiu vindeca cancerul in 3 zile"
#adevar #cancer #bigpharma
14.3K comentarii`,
    mustMention: ['bicarbonat', 'cancer'],
  },
  {
    label: 'Facebook political post with spin caption',
    ocr: `Ion Popescu  ·  3 h  ·  🌍 Public
Ministrul Sănătății a spus că spitalele vor primi fonduri duble anul viitor.
👍 892   💬 245   ↗ 67 distribuiri
Comentariu: Minciuni electorale, nu credeți nimic!
Îmi place · Comentează · Distribuie`,
    mustMention: ['spital', 'fonduri'],
  },
  {
    label: 'Instagram screenshot, minimal chrome',
    ocr: `verificat_oficial ✓
2.847 aprecieri
Guvernul a anunțat că prețul benzinei va fi plafonat la 6 lei pe litru începând cu luna viitoare.
Vezi toate cele 512 comentarii`,
    mustMention: ['benzin', 'plafonat'],
  },
  {
    label: 'X/Twitter repost with quote-tweet spin',
    ocr: `Andrei M @andrei_m · 5h
Asta da bombă 🔥
Cică România iese din NATO până în 2027, a declarat un oficial.
17 Reposts   142 Likes   Reply  Repost  Share`,
    mustMention: ['NATO', '2027'],
  },
];

function evalCase(primaryClaim: string, c: Case): string[] {
  const problems: string[] = [];
  for (const rx of NOISE_PATTERNS) {
    if (rx.test(primaryClaim)) problems.push(`contains noise ${rx}`);
  }
  const lower = primaryClaim.toLowerCase();
  if (!c.mustMention.some((m) => lower.includes(m.toLowerCase()))) {
    problems.push(`missing the fact (expected one of: ${c.mustMention.join(', ')})`);
  }
  if (primaryClaim.length < 12) problems.push('claim too short (extractor likely lost it)');
  return problems;
}

async function main() {
  let failures = 0;
  for (const c of CASES) {
    const r = await extractClaim(c.ocr, 'ro');
    const problems = evalCase(r.primaryClaim, c);
    const ok = problems.length === 0;
    if (!ok) failures++;
    process.stdout.write(`\n${ok ? 'PASS' : 'FAIL'}  ${c.label}\n`);
    process.stdout.write(`   claim     : ${r.primaryClaim}\n`);
    if (r.commentary) process.stdout.write(`   commentary: ${r.commentary}\n`);
    process.stdout.write(`   model     : ${r.tokenUsage?.model ?? '(rule-based fallback)'}\n`);
    for (const p of problems) process.stdout.write(`   ✗ ${p}\n`);
  }
  process.stdout.write(`\n${CASES.length - failures}/${CASES.length} passed\n`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  process.stdout.write('FATAL ' + String(e) + '\n');
  process.exit(1);
});
