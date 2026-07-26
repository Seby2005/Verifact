# ADR-0006: TypeScript in strict mode

**Status:** Accepted

## Context

The verification pipeline passes complex, deeply-nested data (four layer
results, score breakdowns, AI context objects) between many small modules
written incrementally, much of it by an AI coding agent. Silent `any`
leaks or null/undefined mismatches at those boundaries are exactly the
kind of bug that's expensive to find after the fact and cheap to catch at
compile time.

## Decision

`strict: true` in `tsconfig.json`, with `@typescript-eslint/no-explicit-any`
enforced as an ESLint error (`.eslintrc.json`) — not just TypeScript's
default strictness, but a lint-enforced ban on the primary escape hatch
from it.

## Consequences

- Every external API response type (Google Fact Check, Tavily, Twitter,
  Gemini, Supabase rows) needs an explicit interface before it can be used,
  which is more upfront typing but has caught real shape mismatches during
  this project's hardening pass (e.g. the RPC return-type casts documented
  in `db-operations.ts` and `rate-limit.ts` exist because strict mode
  correctly refused to infer `never` silently).
- When a type genuinely can't be known statically (a few Supabase RPC
  calls, some third-party response shapes), the codebase's convention is
  an explicit `as unknown as <hand-written interface>` cast with a comment
  explaining why — never a bare `any` or a silent `@ts-ignore`.
- `npm run build` runs its own type-check as part of `next build`, so a
  type error fails CI the same way a test failure does.
