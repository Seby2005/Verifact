-- =============================================================================
-- Verifact — Migration 0010: fix infinite recursion in the RLS policies
-- =============================================================================
--
-- Problem
-- -------
-- Every admin/moderator check in 0009 is written as a sub-SELECT on
-- public.profiles, including the SELECT policy on profiles itself:
--
--   CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
--     USING (
--       auth.uid() = id
--       OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
--     );
--
-- Evaluating that policy requires reading profiles, which re-evaluates the
-- policy. Postgres detects the cycle and aborts the whole statement:
--
--   ERROR 42P17: infinite recursion detected in policy for relation "profiles"
--
-- Because verifications_select, the disputes policies and
-- subscriptions_admin_select also sub-SELECT profiles, the failure spreads:
-- *any* read of those tables errors out, for anonymous and authenticated
-- callers alike. Reproduced against the live project with the anon key:
--
--   GET /rest/v1/verifications  ->  500 {"code":"42P17", ...}
--
-- Visible symptoms: /api/reports/{id} answers 404 for reports that were saved
-- correctly, the progress tracker polls for 45s and gives up, AuthContext
-- silently falls back to a synthetic 'free' profile, and checkUsageLimit()
-- always returns allowed=true so tier limits are not enforced.
--
-- Fix
-- ---
-- Read the caller's role through a SECURITY DEFINER function. It runs as the
-- function owner, so it is not subject to RLS on profiles and cannot recurse.
-- `SET search_path` is pinned so the definer rights cannot be redirected to
-- another schema.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_tier()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tier FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_tier() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_tier() TO anon, authenticated, service_role;

-- ============================================================
-- PROFILES
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.current_user_role() = 'admin'
  );

-- Users can update their own profile, but CANNOT change role or tier.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.current_user_role()
    AND tier = public.current_user_tier()
  );

-- ============================================================
-- VERIFICATIONS
-- ============================================================

DROP POLICY IF EXISTS "verifications_select" ON public.verifications;
CREATE POLICY "verifications_select" ON public.verifications FOR SELECT
  USING (
    is_public = TRUE
    OR user_id = auth.uid()
    OR public.current_user_role() IN ('admin', 'moderator')
  );

-- ============================================================
-- DISPUTES
-- ============================================================

DROP POLICY IF EXISTS "disputes_admin_select" ON public.disputes;
CREATE POLICY "disputes_admin_select" ON public.disputes FOR SELECT
  USING (public.current_user_role() IN ('admin', 'moderator'));

DROP POLICY IF EXISTS "disputes_admin_update" ON public.disputes;
CREATE POLICY "disputes_admin_update" ON public.disputes FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'moderator'));

DROP POLICY IF EXISTS "disputes_admin_delete" ON public.disputes;
CREATE POLICY "disputes_admin_delete" ON public.disputes FOR DELETE
  USING (public.current_user_role() IN ('admin', 'moderator'));

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

-- Own-row access stays covered by the separate "subscriptions_select_own"
-- policy from 0009; permissive policies are OR'd, so this one stays
-- admin-only, exactly as before.
DROP POLICY IF EXISTS "subscriptions_admin_select" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_select" ON public.subscriptions FOR SELECT
  USING (public.current_user_role() = 'admin');
