-- =============================================================================
-- Migration 018: Business API Keys & Atomic Metering RPCs
-- =============================================================================
-- This migration introduces:
-- 1. `api_keys` table for Business programmatic access (Mode B in CONTRACT_v1.md)
-- 2. `reserve_usage_slot_for(p_user_id UUID)` and `release_usage_slot_for(p_user_id UUID)`
--    RPCs, which allow trusted server-side code (using service_role) to meter
--    usage for API-key authenticated callers where no client JWT / auth.uid() exists.
--
-- SECURITY / NON-NEGOTIABLES:
-- - `reserve_usage_slot()` is left completely untouched with its 0-arg signature.
-- - `reserve_usage_slot_for` and `release_usage_slot_for` are granted EXCLUSIVELY
--   to `service_role`. They must NEVER be callable by `anon` or `authenticated`.
-- - Raw API keys are NEVER stored — only `key_hash` (SHA-256) and `key_prefix`.
-- =============================================================================

-- 1. API Keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Key',
  scopes TEXT[] NOT NULL DEFAULT ARRAY['verify'],
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Indexes for lookup & listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users manage only their own keys
CREATE POLICY "Users can view own api keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);


-- 2. Atomic usage check-and-increment for API Keys (service_role only)
CREATE OR REPLACE FUNCTION public.reserve_usage_slot_for(p_user_id UUID)
RETURNS TABLE (allowed BOOLEAN, usage_limit INTEGER, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_count INTEGER;
  v_reset DATE;
  v_limit INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'reserve_usage_slot_for requires a valid user_id';
  END IF;

  -- Row lock: concurrent calls serialize on the user's profile row
  SELECT tier, verifications_count, verifications_reset
    INTO v_tier, v_count, v_reset
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    -- If no profile exists, fail open with business default
    RETURN QUERY SELECT TRUE, 1000, 0;
    RETURN;
  END IF;

  v_limit := CASE v_tier
    WHEN 'pro' THEN 35
    WHEN 'business' THEN 1000
    ELSE 3
  END;

  IF date_trunc('month', v_reset) <> date_trunc('month', v_today) THEN
    v_count := 0;
    UPDATE public.profiles
      SET verifications_count = 0, verifications_reset = v_today
      WHERE id = p_user_id;
  END IF;

  IF v_count >= v_limit THEN
    RETURN QUERY SELECT FALSE, v_limit, v_count;
    RETURN;
  END IF;

  UPDATE public.profiles
    SET verifications_count = verifications_count + 1
    WHERE id = p_user_id
    RETURNING verifications_count INTO v_count;

  RETURN QUERY SELECT TRUE, v_limit, v_count;
END;
$$;

-- 3. Rollback reservation for API Keys (service_role only)
CREATE OR REPLACE FUNCTION public.release_usage_slot_for(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'release_usage_slot_for requires a valid user_id';
  END IF;

  UPDATE public.profiles
    SET verifications_count = GREATEST(verifications_count - 1, 0)
    WHERE id = p_user_id;
END;
$$;

-- 4. Permissions: STRICT service_role only — NEVER anon or authenticated
REVOKE ALL ON FUNCTION public.reserve_usage_slot_for(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_usage_slot_for(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_usage_slot_for(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.release_usage_slot_for(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_usage_slot_for(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_usage_slot_for(UUID) TO service_role;
