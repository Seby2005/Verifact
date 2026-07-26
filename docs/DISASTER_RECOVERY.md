# DISASTER_RECOVERY.md
# Disaster Recovery Plan — Verifact

**Status:** v1 — reflects the project's actual current stage (small/solo
team, no 24/7 on-call, free-tier-friendly by design per
`docs/ARCHITECTURE.md`). Revisit these targets if that changes.

---

## 1. Recovery Targets

| | Target | Why |
|---|---|---|
| **RTO** (Recovery Time Objective) | 4 hours during working hours; best-effort otherwise | No on-call rotation exists. 4 hours assumes a maintainer notices and responds during a normal day; there is no commitment for nights/weekends at this stage. |
| **RPO** (Recovery Point Objective) | 24 hours | Matches Supabase's daily backup cadence on paid plans (see §2 — **this is not automatic on the free tier**). |

These are intentionally modest. Verifact is not handling payments or
safety-critical data; the goal here is "know what to do and how much could
be lost," not five-nines uptime engineering.

---

## 2. Supabase Backup & Restore

### What backup coverage actually exists

Supabase's automatic daily backups and point-in-time recovery (PITR) are
**paid-plan features**. A project on the free tier has **no managed
backup at all** — a dropped table or a bad migration is unrecoverable
through Supabase itself.

**Action required:** confirm which plan this project's Supabase instance
is on before treating the RPO above as real. If it's on the free tier,
either:
- Upgrade to Pro (adds daily backups, 7-day retention by default), or
- Set up an independent backup: a scheduled job (GitHub Actions cron is
  sufficient at this scale) running `pg_dump` against the database and
  uploading the result somewhere durable (e.g. a private storage bucket).
  This is not currently configured anywhere in this repo — `.github/workflows/`
  only has CI and deploy workflows.

### Restore process (once real backups exist)

1. **Identify the target restore point.** Supabase Dashboard → Database →
   Backups (Pro+) lists available daily backups and, on plans with PITR,
   any point in time within the retention window.
2. **Restore to a new project first, not in place.** Supabase's restore
   flow provisions a fresh project from the backup. Verify data integrity
   there before cutting over — never restore directly on top of the
   live project.
3. **Cut over:**
   - Update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     and `SUPABASE_SERVICE_ROLE_KEY` in Vercel's project environment
     variables to point at the restored project.
   - Re-run every file in `supabase/migrations/` against the restored
     project in order if the backup predates any of them — a backup only
     contains what existed in the database at backup time, not migrations
     that were written afterward and never applied (a real, current gap:
     as of this document, migrations `002`-`005` in this repo have not
     been applied to the live project — see the ADRs in `docs/adr/` for
     which features silently no-op until that happens).
   - Redeploy (or just wait for the next request — Vercel serverless
     functions pick up new env vars on their next cold start; a manual
     redeploy forces this immediately rather than waiting).
4. **Validate:** run through the manual smoke checks in §5 before
   announcing recovery complete.

### What's lost between backups

Anything written after the last backup and before the incident — new
verifications, new disputes, usage counters, new user signups. There is
no way to recover this without PITR (Pro+ only). If data loss risk beyond
24 hours is unacceptable, PITR is the fix, not a process change here.

---

## 3. Vercel Outage

Verifact has no multi-provider failover — the frontend and every API
route run on Vercel (see `docs/adr/0004-vercel-hosting.md`). A Vercel
platform outage takes the entire app down; there is nothing to fail over
to.

**Response:**
1. Check [vercel-status.com](https://www.vercel-status.com/) to confirm
   it's a platform incident, not something specific to this project's
   deployment.
2. If it's a Vercel-side incident: there is no action that speeds up
   Vercel's own recovery. Post a status update wherever users would look
   (repository README, a pinned issue, or a status page if one exists)
   and wait.
3. If it's specific to this project (a bad deploy): roll back to the
   previous deployment via the Vercel dashboard ("Promote to Production"
   on the last known-good deployment) rather than debugging forward under
   pressure.
4. Supabase is independent of Vercel — the database survives a Vercel
   outage untouched. No database action is needed for a Vercel-only
   incident.

---

## 4. Gemini Quota Exhaustion

This is the one failure mode the application already handles
automatically, not just procedurally:

- `src/lib/ai/gemini.ts`'s `isNonRetryableQuotaError()` detects Gemini's
  quota/billing error text and skips retrying it (retrying a quota error
  just wastes the user's wait time — see
  `docs/adr/0005-gemini-api.md`).
- `src/lib/utils/circuit-breaker.ts`'s `'gemini'` breaker opens after
  repeated failures, so once quota is confirmed exhausted, further
  requests fail fast instead of each waiting out a timeout
  (`docs/adr/0010-circuit-breaker-design.md`).
- `orchestrator.ts` falls back to `buildFallbackSummary()` — a
  factual, non-AI summary of what the search layers found — so a
  verification still completes and returns a report; only the AI
  narrative is missing (`report.aiAvailable` is `false`, and
  `ReportView` shows a "partial analysis" notice instead of failing the
  request outright).

**What still needs a human:**
1. Check the [Gemini API quota dashboard](https://ai.dev/rate-limits) —
   this was observed hitting `limit: 0` on the free tier during this
   project's own development, meaning the configured key currently has
   **no free-tier request quota at all**.
2. Either enable billing on the Google Cloud project backing the Gemini
   key (moves off the free tier's hard limit), or rotate to a different
   key with available quota.
3. No code change is needed to recover — once the key has quota again,
   the circuit breaker's cooldown (60s default) self-heals; the next
   half-open trial call succeeds and closes the circuit.
4. If sustained AI-narrative degradation is unacceptable for the product,
   consider a second Gemini API key (different project/billing account)
   as a manual fallback — not implemented; `gemini.ts` currently assumes
   one `GEMINI_API_KEY`.

---

## 5. Post-Recovery Smoke Check

Whatever the incident, before declaring it resolved:

1. `GET /` loads and the verify form renders.
2. Submit a real text claim through the form and confirm a report comes
   back (a degraded report — AI unavailable, some layers unavailable — is
   an acceptable pass; a hard error or hang is not).
3. Log in with a test account on `/cont` and confirm the session persists
   across a page reload.
4. Check Vercel's function logs for the structured JSON log lines
   (`src/lib/utils/logger.ts`) to confirm the app is emitting
   observability data again, not just serving pages.
