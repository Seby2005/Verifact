-- =============================================================================
-- Align the enforced monthly limits with the advertised ones
-- =============================================================================
-- reserve_usage_slot() (migration 002) hard-coded its own tier limits — free
-- 10, pro 200 — which had silently drifted from what the product shows and
-- sells (TIER_CONFIG in src/types/user.ts): free 3, pro 30. The number a reader
-- saw ("1 / 3") was therefore never the number actually enforced, and Pro's cap
-- bore no relation to the plan.
--
-- This migration restates the function with the real limits:
--   free      3   (shown openly on the pricing page)
--   pro      35   (a silent 5-check buffer above the "30" the account warns at;
--                  neither 30 nor 35 is ever printed anywhere — see TIER_CONFIG)
--   business 1000 (bespoke placeholder, never shown as a figure)
--
-- IMPORTANT: these numbers must stay in sync with TIER_CONFIG.*.monthlyLimit.
-- They live in two places only because SQL cannot import the TypeScript config;
-- if you change one, change the other in the same commit.
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

  SELECT tier, verifications_count, verifications_reset
    INTO v_tier, v_count, v_reset
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE, 3, 0;
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

GRANT EXECUTE ON FUNCTION public.reserve_usage_slot() TO authenticated;
