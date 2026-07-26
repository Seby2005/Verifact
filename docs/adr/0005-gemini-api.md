# ADR-0005: Gemini API instead of OpenAI GPT-4

**Status:** Accepted

## Context

The verification pipeline needs a model to (a) assess a claim against
retrieved evidence and (b) write the prose analysis shown in the report,
and the same provider ecosystem is already supplying OCR (Cloud Vision)
and was originally planned to supply search (Custom Search — see
ADR-0007 for how that part actually turned out).

Alternatives considered: OpenAI's GPT-4 family.

## Decision

Use Google's Gemini API (`gemini-2.0-flash`) via `@google/generative-ai`.

## Consequences

- One vendor (Google Cloud) for OCR, search, and generation credentials
  and billing, rather than two.
- The model is swappable without a code change — `GEMINI_MODEL` is an env
  var override in `src/lib/ai/gemini.ts`, not hardcoded — but swapping
  providers entirely (e.g. to OpenAI) would mean rewriting the request/
  response shape, the JSON-mode configuration, and the quota/billing error
  detection in `isNonRetryableQuotaError`, which is written against
  Gemini's specific error message text.
- Gemini's free tier has hit its request quota during this project's
  development (observed directly: `429 ... Quota exceeded ... limit: 0`
  from the configured key during testing) — the orchestrator's fallback
  summary (`buildFallbackSummary` in `orchestrator.ts`) and the
  `isNonRetryableQuotaError` check exist specifically because this is a
  real, not hypothetical, failure mode.
