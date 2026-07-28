-- =============================================================================
-- Fix infinite recursion in the profiles RLS policies
-- =============================================================================
-- Both live policies on public.profiles queried public.profiles in their own
-- predicate, so evaluating either one re-entered the same policy:
--
--   profiles_select_own  USING (auth.uid() = id OR EXISTS (
--                          SELECT 1 FROM profiles p
--                          WHERE p.id = auth.uid() AND p.role = 'admin'))
--
--   profiles_update_own  WITH CHECK (auth.uid() = id
--                          AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
--                          AND tier = (SELECT p.tier FROM profiles p WHERE p.id = auth.uid()))
--
-- Postgres rejected every such read with 42P17, "infinite recursion detected
-- in policy for relation profiles". The visible symptom was the account panel
-- reporting no usage at all: reserve_usage_slot() kept counting correctly
-- (SECURITY DEFINER, so it bypasses RLS), while GET /api/user/usage could
-- never read the row back.
--
-- The intent of both predicates is worth keeping — admins may read any
-- profile, and a user must not be able to raise their own role or tier. Only
-- the lookup mechanism changes: the current row's role/tier now come from
-- SECURITY DEFINER helpers, which run as the function owner and therefore do
-- not re-enter the policy being evaluated.
--
-- NOTE: these policies were created outside this migrations directory (their
-- names differ from 001's "Users can view own profile" / "Users can update
-- own profile"), so this file reconciles the live database rather than
-- amending an earlier migration.
-- =============================================================================

-- Reads the caller's own role/tier while bypassing RLS. SECURITY DEFINER is
-- the point of these functions, not an optimisation: it is what stops the
-- lookup from re-triggering the policy that calls it.
--
-- Both take no argument and resolve auth.uid() internally, for the same
-- reason reserve_usage_slot() does (see 002): a caller must not be able to
-- ask about someone else's row through a SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_profile_tier()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tier FROM public.profiles WHERE id = auth.uid();
$$;

-- Policy evaluation happens as whatever role issued the query, so both anon
-- and authenticated need EXECUTE or the policy itself errors. For an anon
-- caller auth.uid() is NULL, the helpers return NULL, and the comparisons
-- below fall through to false — which is the intended outcome.
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_tier() TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- SELECT: own row, or any row for an admin.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.current_profile_role() = 'admin'
  );

-- -----------------------------------------------------------------------------
-- UPDATE: own row only, and role/tier must match what is already stored, so a
-- user cannot promote themselves to admin or to a paid tier. Those two columns
-- are changed by privileged paths (SECURITY DEFINER functions, the service
-- role, or a dashboard operator), none of which are subject to this policy.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.current_profile_role()
    AND tier = public.current_profile_tier()
  );
