-- =============================================================================
-- Atomic usage-limit check + increment
-- =============================================================================
-- checkUsageLimit() + incrementUsageCount() in db-operations.ts previously did
-- a SELECT (from the API route) followed by a separate UPDATE. Two concurrent
-- requests for the same user could both read verifications_count = 9 (limit
-- 10), both pass the check, and both increment, letting usage go to 11.
--
-- These two RPCs replace that read-then-write with a single atomic statement,
-- serialized by Postgres's row lock (SELECT ... FOR UPDATE) rather than by
-- application logic.
--
-- Both functions deliberately take NO user_id parameter and use auth.uid()
-- internally instead. They run SECURITY DEFINER (bypassing RLS to read/write
-- profiles), so if they accepted an arbitrary p_user_id argument, any
-- authenticated caller could pass someone else's UUID and manipulate that
-- user's usage counter. Reading auth.uid() from the request JWT closes that
-- off: a caller can only ever affect their own row.
--
-- reserve_usage_slot() is called BEFORE running a verification (atomic
-- check-and-increment in one step). release_usage_slot() rolls the
-- reservation back when the verification is served from cache, fails, or
-- its result can't be persisted — so usage is only actually charged for a
-- real, newly-computed, saved report.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reserve_usage_slot()
RETURNS TABLE (allowed BOOLEAN, usage_limit INTEGER, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tier TEXT;
  v_count INTEGER;
  v_reset DATE;
  v_limit INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'reserve_usage_slot requires an authenticated caller';
  END IF;

  -- Row lock: concurrent calls for the same user serialize here instead of
  -- racing on independent SELECT/UPDATE round trips.
  SELECT tier, verifications_count, verifications_reset
    INTO v_tier, v_count, v_reset
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    -- No profile row (shouldn't happen for an authenticated user, but fail
    -- open rather than 500 the request) — mirrors the previous behaviour.
    RETURN QUERY SELECT TRUE, 10, 0;
    RETURN;
  END IF;

  v_limit := CASE v_tier
    WHEN 'pro' THEN 200
    WHEN 'business' THEN 2000
    ELSE 10
  END;

  IF date_trunc('month', v_reset) <> date_trunc('month', v_today) THEN
    v_count := 0;
    UPDATE public.profiles
      SET verifications_count = 0, verifications_reset = v_today
      WHERE id = v_user_id;
  END IF;

  IF v_count >= v_limit THEN
    RETURN QUERY SELECT FALSE, v_limit, v_count;
    RETURN;
  END IF;

  UPDATE public.profiles
    SET verifications_count = verifications_count + 1
    WHERE id = v_user_id
    RETURNING verifications_count INTO v_count;

  RETURN QUERY SELECT TRUE, v_limit, v_count;
END;
$$;

-- Rolls back a reservation that was not actually consumed (cache hit, a
-- verification that failed after the slot was reserved, or a report that
-- could not be saved). Floors at zero so a duplicate/late release can never
-- push the counter negative.
CREATE OR REPLACE FUNCTION public.release_usage_slot()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'release_usage_slot requires an authenticated caller';
  END IF;

  UPDATE public.profiles
    SET verifications_count = GREATEST(verifications_count - 1, 0)
    WHERE id = v_user_id;
END;
$$;

-- Only authenticated callers may invoke these, and each only ever touches
-- auth.uid()'s own row (see comment above) — anon is intentionally excluded.
GRANT EXECUTE ON FUNCTION public.reserve_usage_slot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_usage_slot() TO authenticated;

-- =============================================================================
-- Anonymous usage tracking column
-- =============================================================================
-- src/lib/usage/anonymous-limit.ts hashes IP+User-Agent to cap anonymous
-- verifications, but was never wired into /api/verify and this column never
-- existed, so anonymous requests had no usage cap at all (only the generic
-- per-IP request-rate throttle). Adding it here so the existing anonymous
-- limit check has somewhere to record and count from.
-- Already present in src/types/database.ts's Verification type, which
-- described this planned column ahead of the migration.
-- =============================================================================

ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS anonymous_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_verifications_anonymous_hash
  ON public.verifications(anonymous_hash, created_at)
  WHERE anonymous_hash IS NOT NULL;
