/**
 * Basic load test: fires more concurrent requests at POST /api/verify than
 * the per-IP rate limit (10/min, see src/app/api/verify/route.ts) allows,
 * and checks that the Postgres-backed limiter (src/lib/utils/rate-limit.ts,
 * supabase/migrations/003_rate_limits.sql) actually holds the line under
 * real concurrent HTTP traffic — not just in the simulated-concurrency
 * unit test in tests/unit/rate-limit.test.ts.
 *
 * autocannon opens all connections from the same machine with no
 * x-forwarded-for header, so every request lands on the same rate-limit
 * bucket (verify:unknown) — exactly the scenario being tested.
 *
 * Requests that pass the rate limiter still run the real orchestrator
 * (real external API calls), so this only asserts on rate-limiting
 * behaviour (status 429 vs. not), not on whether verification itself
 * succeeds — that depends on API keys/quota this script has no control
 * over.
 *
 * Needs a running server (dev or prod) — not wired into CI for the same
 * reason tests/e2e isn't (see playwright.config.ts): it makes real,
 * costed calls to external APIs for every request that passes the limiter.
 *
 * Usage:
 *   npm run dev            # in one terminal
 *   npm run test:load      # in another
 *   LOAD_TEST_URL=https://staging.example.com/api/verify npm run test:load
 */
const autocannon = require('autocannon');

const TARGET_URL = process.env.LOAD_TEST_URL || 'http://localhost:3000/api/verify';
const PER_IP_LIMIT = 10; // must match the limit passed to checkRateLimit() in route.ts
const TOTAL_REQUESTS = 20; // deliberately double the limit

async function main() {
  console.log(`Firing ${TOTAL_REQUESTS} concurrent requests at ${TARGET_URL} ...`);

  const result = await autocannon({
    url: TARGET_URL,
    method: 'POST',
    connections: TOTAL_REQUESTS,
    amount: TOTAL_REQUESTS,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: 'Aceasta este o afirmatie de test suficient de lunga pentru a trece validarea locala.',
      inputType: 'text',
      language: 'ro',
      isPublic: false,
    }),
  });

  const stats = result.statusCodeStats || {};
  const rateLimited = stats['429']?.count ?? 0;
  const passedLimiter = Object.entries(stats)
    .filter(([code]) => code !== '429')
    .reduce((sum, [, v]) => sum + v.count, 0);

  console.log('\nStatus code breakdown:', JSON.stringify(stats, null, 2));
  console.log(`Rate-limited (429): ${rateLimited}`);
  console.log(`Passed the rate limiter: ${passedLimiter} (limit: ${PER_IP_LIMIT})`);

  const failures = [];

  if (passedLimiter > PER_IP_LIMIT) {
    failures.push(
      `${passedLimiter} requests passed the rate limiter, expected at most ${PER_IP_LIMIT}.`
    );
  }

  const expectedRateLimited = TOTAL_REQUESTS - PER_IP_LIMIT;
  if (rateLimited < expectedRateLimited) {
    failures.push(
      `only ${rateLimited} requests were rate-limited, expected at least ${expectedRateLimited}.`
    );
  }

  if (failures.length > 0) {
    console.error('\nFAIL:');
    failures.forEach((f) => console.error(`  - ${f}`));
    if (rateLimited === 0) {
      console.error(
        '\nZero rate-limited responses usually means the check_rate_limit RPC ' +
          'is not reachable (wrong Supabase project, or ' +
          'supabase/migrations/003_rate_limits.sql was never applied) — ' +
          'checkRateLimit() fails open by design on any RPC error, so every ' +
          'request passes. Check the server logs for "[RateLimit] unexpected ' +
          'error" or "[RateLimit] check_rate_limit failed" to confirm.'
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log('\nPASS: the rate limiter held under concurrent load.');
}

main().catch((err) => {
  console.error('Load test errored:', err);
  process.exitCode = 1;
});
