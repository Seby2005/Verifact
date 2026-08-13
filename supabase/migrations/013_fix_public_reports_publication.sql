-- =============================================================================
-- Migration 013: Fix public reports publication rules & input_type restrictions
-- =============================================================================
-- 1. Authenticated users can publish reports directly without forced pending_review.
-- 2. Only input_type = 'text' or input_type = 'url' can be made public.
-- 3. input_type = 'screenshot' is strictly forbidden from being published.
-- 4. Sets published_at timestamp and sets visibility_status = 'public' / is_public = true.
-- 5. Allows authenticated users to claim and publish verifications with NULL user_id.
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

  -- If OLD.user_id is set and caller is not owner and not admin, reject
  IF v_caller_role IS DISTINCT FROM 'admin' AND OLD.user_id IS NOT NULL AND OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify a report belonging to another user';
  END IF;

  -- If OLD.user_id was NULL, allow authenticated caller to claim ownership
  IF OLD.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
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
    -- Rule 0: Screenshot verifications CANNOT be made public
    IF NEW.input_type = 'screenshot' THEN
      RAISE EXCEPTION 'Rapoartele din screenshot-uri nu pot fi făcute publice.';
    END IF;

    -- Rule 1: Authenticated user required
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Anonymous verifications cannot be made public without authentication';
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
      -- Default to free tier if profile row is missing
      v_user_tier := 'free';
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
