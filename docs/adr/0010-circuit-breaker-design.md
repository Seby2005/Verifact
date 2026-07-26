# ADR-0010: In-memory, per-service circuit breakers

**Status:** Accepted

## Context

Each search layer, Vision OCR, and Gemini call an external API that can
degrade or go down independently (all have been observed doing so during
this project's own development — Gemini's free-tier quota, Tavily's
credit limit, Google's Custom Search block that motivated ADR-0007). The
existing retry-with-backoff (`src/lib/utils/retry.ts`) handles brief
blips, but retrying a *sustained* outage on every request still costs the
layer's full timeout budget (`LAYER_TIMEOUT_MS`, 10s, in
`orchestrator.ts`) on every single verification until the service
recovers.

## Decision

A simple, deliberately un-clever circuit breaker
(`src/lib/utils/circuit-breaker.ts`): after `failureThreshold` (default 5)
consecutive failures for a named service, the circuit opens and further
calls fail immediately with `CircuitOpenError` for `cooldownMs` (default
60s), then allow one half-open trial call before fully closing again.

Key design choices:
- **One breaker per external account, not per layer.** `'tavily'` is
  shared by layer 2, 3, and 4 (ADR-0007) since it's the same account and
  quota regardless of which layer calls it — an outage discovered via one
  layer immediately stops the others from independently re-discovering it.
  `'google-fact-check'` (layer 1), `'newsapi'` (layer 2's other source),
  `'twitter'` (layer 4's primary path), `'vision'`, and `'gemini'` are
  each their own breaker.
- **Wraps the retry-inclusive call, not individual attempts.** A breaker
  records one failure after `withRetry()` has already exhausted its
  attempts, not one failure per attempt — otherwise a single slow-but-
  recovering blip that retry already handles correctly would trip the
  breaker anyway, defeating the point of having both mechanisms.
- **No orchestrator changes required.** A `CircuitOpenError` rejection is
  just another layer failure to `orchestrator.ts`'s existing
  `Promise.allSettled` / `makeUnavailableLayerN` fallback — a breaker
  being open produces exactly the failure shape the orchestrator already
  handled before breakers existed. Layers with an internal fallback source
  (layer 2's NewsAPI+Tavily, layer 4's Twitter+Tavily) absorb a single
  source's `CircuitOpenError` the same way they already absorbed that
  source failing outright.

In-memory state was chosen for v1 over a shared store (the
Postgres-RPC pattern from ADR-0008/0009 would work here too) because the
failure mode of an imperfectly-shared breaker is materially different from
the usage counter or rate limiter: a breaker that's "only 80% as effective
at cutting load to a struggling service" because each Vercel instance
tracks failures independently is a performance/cost concern, not a
correctness or security one the way an inconsistent usage counter or rate
limit would be.

## Consequences

- On Vercel (ADR-0004), each serverless instance holds its own breaker
  state — an outage is detected independently by every warm instance
  handling traffic, which effectively multiplies the failure threshold by
  however many instances are live. Documented directly in
  `circuit-breaker.ts`'s module comment so it isn't mistaken for an
  oversight later.
- If this needs to become a real shared breaker later, `check_rate_limit`
  (ADR-0009) is the template to follow: same atomic-RPC-under-row-lock
  approach, same tradeoffs already worked out.
- `/api/ocr` specifically checks for `CircuitOpenError` and returns `503`
  with a "try again in a few minutes" message instead of the generic `500`
  — the one place a breaker's open state is surfaced to the end user
  rather than absorbed into a degraded-but-still-200 report.
