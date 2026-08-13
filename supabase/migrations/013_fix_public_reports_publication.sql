-- =============================================================================
-- Migration 013: Fix public reports publication rules
-- =============================================================================
-- 1. Authenticated users can publish reports directly without forced pending_review.
-- 2. All completed verifications (text, screenshot, url) with valid score/verdict can be published.
-- 3. Sets published_at timestamp and sets visibility_status = 'public' / is_public = true.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_verification_public_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tier TEXT;
  v_public_count INTEGER;
  v_caller_role TEXT;
BEGIN
  v_caller_role := public.current_profile_role();

  -- Rule 1 (Defense-in-depth): Caller must own the verification (unless admin)
  IF v_caller_role IS DISTINCT FROM 'admin' AND OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify a report belonging to another user';
  END IF;

  -- If visibility is not changing and is_public is unchanged, pass through
  IF NEW.visibility_status = OLD.visibility_status AND NEW.is_public = OLD.is_public THEN
    RETURN NEW;
  END IF;

  -- Admin actions pass through for taken_down
  IF NEW.visibility_status = 'taken_down' THEN
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only administrators can set status to taken_down';
    END IF;
    NEW.is_public := FALSE;
    NEW.reviewed_at := NOW();
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
    RETURN NEW;
  END IF;

  -- If user is requesting to publish (moving to 'public' or setting is_public = true)
  IF NEW.visibility_status IN ('public', 'pending_review') OR (NEW.is_public = TRUE AND OLD.is_public = FALSE) THEN
    -- Rule 1: Authenticated user required
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Anonymous verifications cannot be made public';
    END IF;

    -- Rule 2: Must have a completed score/verdict
    IF NEW.score IS NULL AND NEW.verdict IS NULL THEN
      RAISE EXCEPTION 'Report must be completed before making it public';
    END IF;

    -- Fetch user profile data
    SELECT tier
      INTO v_user_tier
      FROM public.profiles
      WHERE id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Rule 3: Tier-differentiated publication limits
    IF v_user_tier = 'free' THEN
      -- Free tier: 1 public report TOTAL lifetime
      SELECT COUNT(*)
        INTO v_public_count
        FROM public.verifications
        WHERE user_id = NEW.user_id
          AND id <> NEW.id
          AND (published_at IS NOT NULL OR visibility_status IN ('public', 'pending_review'));

      IF v_public_count >= 1 THEN
        RAISE EXCEPTION 'Contul gratuit permite un singur raport public, în total. Treci la premium pentru mai multe.';
      END IF;
    ELSE
      -- Premium tier (pro/business): Max 4 public reports per calendar month
      SELECT COUNT(*)
        INTO v_public_count
        FROM public.verifications
        WHERE user_id = NEW.user_id
          AND id <> NEW.id
          AND visibility_status IN ('public', 'pending_review')
          AND date_trunc('month', COALESCE(published_at, created_at)) = date_trunc('month', CURRENT_DATE);

      IF v_public_count >= 4 THEN
        RAISE EXCEPTION 'Ai atins limita de 4 rapoarte publice pentru luna aceasta.';
      END IF;
    END IF;

    -- Make report public directly upon user request
    NEW.visibility_status := 'public';
    NEW.is_public := TRUE;
    NEW.published_at := COALESCE(NEW.published_at, NOW());

    IF v_caller_role = 'admin' THEN
      NEW.reviewed_at := NOW();
      NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
    END IF;
  ELSE
    -- Unpublishing or setting private
    NEW.is_public := FALSE;
    NEW.visibility_status := 'private';
  END IF;

  RETURN NEW;
END;
$$;
