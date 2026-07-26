# ADR-0008: Atomic usage counter via a Postgres RPC

**Status:** Accepted

## Context

`checkUsageLimit()` and `incrementUsageCount()` in
`src/lib/verification/db-operations.ts` implemented the monthly
per-tier verification limit as a `SELECT` (read the current count in the
API route) followed by a separate `UPDATE` (write it back after a
successful verification). Two concurrent requests from the same user could
both read `verifications_count = 9` (limit 10), both pass the check, and
both increment — letting usage exceed the tier limit with no error
anywhere. On Vercel (ADR-0004), "concurrent requests from the same user"
isn't a rare race; a user with two browser tabs open, or a retried
request, hits it directly.

Options considered:
1. Application-level locking (e.g. a mutex keyed by user id) — doesn't
   work across serverless instances with no shared memory.
2. Optimistic concurrency: read the count, write it back with a
   `WHERE verifications_count = <value read>` guard, retry on conflict.
   Works, but pushes retry logic into every caller and still does two
   round trips per attempt.
3. A single atomic Postgres statement, serialized by a row lock.

## Decision

Two Postgres RPCs, `reserve_usage_slot()` and `release_usage_slot()`
(`supabase/migrations/002_atomic_usage_rpc.sql`), called via
`supabase.rpc()`:

- `reserve_usage_slot()` does the check-and-increment in one
  `plpgsql` function under `SELECT ... FOR UPDATE`, so concurrent calls
  for the same user serialize on Postgres's own row lock instead of racing
  on independent round trips.
- Neither function takes a `user_id` parameter — both read `auth.uid()`
  from the request's JWT internally. A first draft of this migration did
  accept a `p_user_id` argument; since both functions run
  `SECURITY DEFINER` (required to write `profiles` under RLS), that would
  have let any authenticated caller pass an arbitrary UUID and manipulate
  another user's usage counter. Removing the parameter and reading
  `auth.uid()` instead closes that off entirely — a caller can only ever
  affect their own row.
- The API route (`/api/verify`) reserves a slot *before* running the
  verification and releases it if the result comes from cache, the
  verification fails, or the report can't be saved — so usage is only
  actually charged for a real, persisted report, matching the previous
  code's charge-after-success intent without reintroducing a race to get
  there.

## Consequences

- `reserveUsageSlot()`/`releaseUsageSlot()` replaced the old
  `checkUsageLimit()`/`incrementUsageCount()` names entirely rather than
  keeping them as a compatibility shim — the semantic shift (check-and-
  reserve happens *before* the verification runs now, not check-then-
  increment-after) was significant enough that keeping the old names
  would have been more likely to hide a misuse than prevent one.
- The RPC fails open (allows the request) if the call itself errors —
  consistent with the pre-existing behavior when the profile lookup
  failed, and a deliberate choice that an RPC or connectivity hiccup
  degrades to "usage limits temporarily unenforced" rather than
  "verification blocked for everyone."
- This is a full round trip to Postgres per verification request, on top
  of the verification's own database reads/writes — acceptable given a
  verification already takes seconds (four parallel search layers plus a
  Gemini call), so one more sub-100ms RPC call isn't the bottleneck.
- Supabase-js's generated-types inference doesn't resolve a zero-argument,
  `TABLE(...)`-returning RPC's return type cleanly without
  `supabase gen types`-produced `SetofOptions` metadata (this project's
  `Database` type is hand-maintained — see ADR-0002) — `reserveUsageSlot()`
  casts the RPC call's result to a hand-written interface rather than
  fighting the generic inference.
