-- =============================================================================
-- Distributed rate limiting
-- =============================================================================
-- src/lib/utils/rate-limit.ts previously held counters in a plain in-memory
-- Map. On Vercel that state is per-instance: it doesn't survive a cold
-- start/restart, and concurrent requests routed to different instances each
-- get their own independent counter, so the "10 req/min" limit on
-- /api/verify and /api/ocr was actually closer to "10 req/min per instance
-- currently holding traffic" — effectively unenforced under real load.
--
-- This table + RPC replace it with a single shared counter per key, updated
-- atomically under a row lock the same way reserve_usage_slot() is (see
-- 002_atomic_usage_rpc.sql).
--
-- Unlike the usage-slot RPC, this one is NOT scoped to auth.uid(): rate
-- limit keys are caller-supplied strings (e.g. "verify:203.0.113.4") so that
-- anonymous, unauthenticated requests can be limited by IP too. That means
-- both `anon` and `authenticated` need EXECUTE, and the table itself has no
-- direct-access policies — RLS is enabled with zero policies, so the table
-- is reachable only through this SECURITY DEFINER function, never directly
-- via PostgREST. A caller who guesses another key can only ever push that
-- key's own counter (denial-of-service against that one bucket), the same
-- exposure the previous in-memory version had.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies defined on purpose: RLS with zero policies denies all direct
-- access (SELECT/INSERT/UPDATE/DELETE) for anon and authenticated alike.
-- All reads/writes happen inside check_rate_limit(), which runs as the
-- function owner (SECURITY DEFINER) and so bypasses RLS internally.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms BIGINT
)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_reset TIMESTAMPTZ;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_window INTERVAL := make_interval(secs => p_window_ms / 1000.0);
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 THEN
    RAISE EXCEPTION 'check_rate_limit requires a non-empty key';
  END IF;

  -- Ensure the row exists, then lock it. Two concurrent first-time callers
  -- for the same key race harmlessly on the insert (ON CONFLICT DO NOTHING)
  -- and both proceed to the row lock below, which is where they serialize.
  INSERT INTO public.rate_limits (key, count, reset_at, updated_at)
  VALUES (p_key, 0, v_now + v_window, v_now)
  ON CONFLICT (key) DO NOTHING;

  -- Columns are table-qualified throughout this function because the
  -- RETURNS TABLE(...) signature declares an OUT parameter named reset_at,
  -- which an unqualified reference collides with ("column reference
  -- \"reset_at\" is ambiguous"). Renaming the OUT column would be the other
  -- fix, but it is the wire contract the caller reads (row.reset_at).
  SELECT rate_limits.count, rate_limits.reset_at INTO v_count, v_reset
    FROM public.rate_limits
    WHERE rate_limits.key = p_key
    FOR UPDATE;

  IF v_now > v_reset THEN
    v_count := 0;
    v_reset := v_now + v_window;
  END IF;

  IF v_count >= p_limit THEN
    UPDATE public.rate_limits
      SET reset_at = v_reset, updated_at = v_now
      WHERE rate_limits.key = p_key;
    -- Opportunistic cleanup of long-expired keys so the table doesn't grow
    -- unbounded. Runs probabilistically instead of on a schedule so this
    -- doesn't depend on pg_cron (not available on every Supabase plan).
    IF random() < 0.01 THEN
      DELETE FROM public.rate_limits WHERE rate_limits.reset_at < v_now - INTERVAL '1 day';
    END IF;
    RETURN QUERY SELECT FALSE, 0, v_reset;
    RETURN;
  END IF;

  v_count := v_count + 1;

  UPDATE public.rate_limits
    SET count = v_count, reset_at = v_reset, updated_at = v_now
    WHERE rate_limits.key = p_key;

  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE rate_limits.reset_at < v_now - INTERVAL '1 day';
  END IF;

  RETURN QUERY SELECT TRUE, (p_limit - v_count), v_reset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, BIGINT) TO anon, authenticated;
