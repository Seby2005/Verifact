# ADR-0009: Postgres-backed distributed rate limiting

**Status:** Accepted

## Context

`src/lib/utils/rate-limit.ts` held per-key request counters in a plain
in-memory `Map`. On Vercel (ADR-0004) this is wrong in two independent
ways: the Map resets on every cold start, and concurrent traffic is spread
across multiple instances that each hold their own independent counter —
so the documented "10 req/min" limit on `/api/verify` and `/api/ocr` was
actually closer to "10 req/min per instance currently holding traffic,"
which is not a limit at all under real multi-instance load.

The task that prompted this fix explicitly left the choice open between a
Postgres-backed table and Upstash Redis (a common serverless-friendly
choice for exactly this problem, with a free tier).

## Decision

Move rate limiting to Postgres: a dedicated `rate_limits` table plus a
`check_rate_limit(p_key, p_limit, p_window_ms)` RPC
(`supabase/migrations/003_rate_limits.sql`), doing an atomic
check-and-increment under a row lock — the same pattern as
`reserve_usage_slot()` (ADR-0008).

Chosen over Upstash Redis because Postgres was already the project's
database (ADR-0002): no new vendor, no new API key, no new failure domain
to monitor, and the atomic-RPC-under-row-lock pattern was already proven
correct for the usage counter. Redis's native atomic `INCR` is a more
natural fit for a rate limiter than for the usage counter's richer
reserve/release semantics, but "clean in Postgres, one infra dependency"
was judged to outweigh that for this project's scale — the task
description's own guidance was to prefer whichever backend avoids adding
new infrastructure when Postgres can do it cleanly, and it can.

Unlike the usage-counter RPCs, `check_rate_limit` does *not* use
`auth.uid()` — rate-limit keys are caller-supplied strings like
`verify:203.0.113.4`, specifically so that anonymous, unauthenticated
requests can be limited by IP too, which auth-based scoping can't do. Both
`anon` and `authenticated` get `EXECUTE`, and the table itself has zero
RLS policies (RLS is enabled with nothing granted, so it's reachable only
through the `SECURITY DEFINER` function, never directly via PostgREST) —
see ADR-0002's note on RLS-as-defense-in-depth.

## Consequences

- `checkRateLimit()` kept its exact (key, limit, windowMs) signature and
  return shape — callers only needed to add `await`, since a network round
  trip necessarily replaced a synchronous Map lookup.
- A caller who guesses another key (e.g. a spoofed IP, though Vercel's
  edge network overwrites `x-forwarded-for` with the real connecting IP
  rather than trusting a client-supplied one) can only ever push that
  key's own counter — the same exposure the in-memory version had, not a
  new one.
- The `rate_limits` table grows one row per distinct key forever unless
  cleaned up. Rather than depending on `pg_cron` (not available on every
  Supabase plan), `check_rate_limit` opportunistically deletes rows expired
  more than a day ago with 1% probability per call — self-maintaining,
  bounded, no scheduled job to configure or monitor.
- As with the usage-counter RPC, this depends on the migration actually
  being applied to the live Supabase project — confirmed via this
  project's load test (`tests/load/verify-rate-limit.js`) that, as of this
  ADR, it has not been, and `checkRateLimit()`'s fail-open behavior is
  silently letting all traffic through as a result. The load test's output
  detects and explains this specific condition directly.
