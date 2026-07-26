# ADR-0002: Supabase for database, auth, and storage

**Status:** Accepted

## Context

Verifact needs a relational database (verifications, profiles, cache,
disputes, audit trail — all relational with real foreign keys), user
authentication (email/password today, OAuth planned), row-level access
control (a user's private reports must not be readable by other users,
enforced somewhere more durable than "the API route remembered to check"),
and this all needs to be usable from a serverless environment (ADR-0001)
without managing a persistent database connection pool ourselves.

Alternatives considered: Firebase (Firestore + Auth), or a self-managed
PostgreSQL instance with Prisma as the ORM.

## Decision

Use Supabase: managed PostgreSQL, built-in Auth, Storage, and Row Level
Security enforced at the database layer.

- A real relational database with foreign keys and constraints fits this
  domain (verifications belong to profiles, disputes belong to
  verifications, admin_actions reference profiles) better than a
  document store.
- RLS means access control is enforced by Postgres itself, not only by
  applicati on code remembering to filter every query — see the RLS
  policies added alongside every new table in this project's migrations
  (`supabase/migrations/003_rate_limits.sql` denies all direct access on
  purpose; `005_disputes.sql`'s policies mirror the same visibility rule
  the API route checks in code, as defense in depth).
- Auth + Postgres + Storage in one service avoids integrating three
  separate vendors for what is, for this project's scale, one connected
  concern.

## Consequences

- The service-role key (`src/lib/supabase/admin.ts`) bypasses RLS
  entirely — every use of it is a place where access control depends on
  the calling code being correct, not on the database. It's used
  deliberately in a small number of places (the dispute endpoint flagging
  a report the disputer doesn't own, admin action logging) and each one is
  commented explaining why RLS alone can't cover that operation.
- Supabase-js's generated TypeScript types don't resolve cleanly for
  hand-maintained `Database` types (this project doesn't run
  `supabase gen types`, per `src/types/database.ts`'s header comment) —
  several RPC call sites need a type cast to a hand-written function
  signature to work around generic inference gaps (see the comments in
  `src/lib/verification/db-operations.ts` and `src/lib/utils/rate-limit.ts`).
- Schema changes require writing and *applying* a migration — the
  migration files existing in `supabase/migrations/` is necessary but not
  sufficient; someone has to run them against the real project. As of this
  ADR, migrations 002-005 exist in the repo but have not yet been applied
  to the project's actual Supabase instance (confirmed via a load test
  that observed `check_rate_limit` failing with "RPC not found").
