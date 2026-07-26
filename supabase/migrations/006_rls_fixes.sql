-- =============================================================================
-- RLS gaps found during a full policy audit (not limited to the tables
-- added in this hardening pass)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cached_results: was readable by anyone (anon and authenticated) with no
-- row restriction at all ("USING (TRUE)"), which means any caller with the
-- public anon key could read the *entire* table directly via PostgREST
-- (GET /rest/v1/cached_results?select=*) — every claim ever cached, with no
-- need to go through the app or even know a content_hash. There was also no
-- INSERT/UPDATE policy at all, so setCached()'s upsert (using the
-- user-scoped client) was silently failing under RLS on every call — the
-- cache write path has likely never actually worked; only reads did, and
-- only because reads were wide open.
--
-- Fix: drop the permissive policy and add none in its place (RLS enabled,
-- zero policies = default deny for anon/authenticated), matching
-- rate_limits' pattern from 003_rate_limits.sql. src/lib/verification/cache.ts
-- switches to the admin client — appropriate here because cached_results
-- holds no per-user data; it's keyed by content hash and shared across all
-- callers by design, so there is no RLS check that makes sense to enforce
-- per request anyway.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow public read access to cache" ON public.cached_results;

-- -----------------------------------------------------------------------------
-- profiles: had SELECT and UPDATE policies for the owner, but no INSERT
-- policy. The normal path (handle_new_user() trigger, SECURITY DEFINER)
-- bypasses RLS and isn't affected, but ensureProfileExists()'s fallback
-- manual insert (src/lib/supabase/auth-helpers.ts, using the user-scoped
-- client — reached if that trigger-created row is somehow missing) would
-- silently fail under RLS with no policy to allow it.
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- verifications: had SELECT/INSERT/DELETE policies but no UPDATE policy at
-- all, so both PATCH endpoints that toggle is_public
-- (/api/reports/[id] and /api/user/verifications/[id]/visibility, both
-- using the user-scoped client) have been updating zero rows under RLS on
-- every call — the "make my report public" feature does not work today.
-- supabase-js doesn't surface a zero-row update as an error, so this was
-- failing silently rather than loudly.
--
-- Known limitation: this policy allows the owner to update any column on
-- their own row, not just is_public — it can't be narrowed to specific
-- columns with RLS alone (that needs column-level GRANT/REVOKE on top of
-- RLS, not done here). In practice this means a technically sophisticated
-- user could hand-craft a PostgREST request to flip `disputed` back to
-- false on their own report, bypassing the moderation flag set by
-- /api/reports/[id]/dispute. Accepted for v1: the normal API surface never
-- exposes this, and the blast radius is limited to a user hiding a dispute
-- on their own content, not affecting anyone else's data.
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can update their own verifications"
  ON public.verifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
