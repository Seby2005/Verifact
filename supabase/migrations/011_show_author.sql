-- =============================================================================
-- Migration 011: Add show_author column & enforce ownership on all updates
-- =============================================================================

-- Add show_author column to public.verifications table
-- Default is FALSE (anonymous by default). Can be updated anytime by report owner (auth.uid() = user_id).
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS show_author BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.verifications.show_author IS 'Controls whether the author name/profile is displayed on the public report page';

-- Update trigger function to enforce ownership check BEFORE any early return,
-- ensuring show_author (and all other columns) can ONLY be modified by the owner or admin.
CREATE OR REPLACE FUNCTION public.enforce_verification_public_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tier TEXT;
  v_profile_created_at TIMESTAMPTZ;
  v_total_verifications INTEGER;
  v_monthly_public_count INTEGER;
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

  -- Synchronize boolean is_public flag with visibility_status
  IF NEW.visibility_status = 'public' THEN
    NEW.is_public := TRUE;
  ELSE
    NEW.is_public := FALSE;
  END IF;

  -- Admin actions pass through with validation
  IF NEW.visibility_status = 'taken_down' THEN
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only administrators can set status to taken_down';
    END IF;
    NEW.is_public := FALSE;
    NEW.reviewed_at := NOW();
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
    RETURN NEW;
  END IF;

  -- If user is requesting to publish (moving to 'public' or 'pending_review')
  IF NEW.visibility_status IN ('public', 'pending_review') OR (NEW.is_public = TRUE AND OLD.is_public = FALSE) THEN
    -- Rule 1: Authenticated user required
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Anonymous verifications cannot be made public';
    END IF;

    -- Rule 2: Decisive score requirement (score >= 85 OR score <= 39)
    IF NEW.score IS NULL OR (NEW.score > 39 AND NEW.score < 85) THEN
      RAISE EXCEPTION 'Report score is ambiguous (%s). Only decisive reports (score >= 85 or <= 39) can be made public', COALESCE(NEW.score, 0);
    END IF;

    -- Fetch user profile data
    SELECT tier, created_at
      INTO v_user_tier, v_profile_created_at
      FROM public.profiles
      WHERE id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Rule 3: Free tier monthly limit (max 4 public reports per calendar month)
    IF v_user_tier = 'free' THEN
      SELECT COUNT(*)
        INTO v_monthly_public_count
        FROM public.verifications
        WHERE user_id = NEW.user_id
          AND id <> NEW.id
          AND visibility_status IN ('public', 'pending_review')
          AND date_trunc('month', COALESCE(published_at, created_at)) = date_trunc('month', CURRENT_DATE);

      IF v_monthly_public_count >= 4 THEN
        RAISE EXCEPTION 'Monthly public report limit reached for free tier (max 4 per calendar month)';
      END IF;
    END IF;

    -- Rule 4: Safeguard for new (<48h) or low-activity (<2 verifications) accounts
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      SELECT COUNT(*)
        INTO v_total_verifications
        FROM public.verifications
        WHERE user_id = NEW.user_id;

      IF (NOW() - v_profile_created_at < INTERVAL '48 hours') OR (v_total_verifications < 2) THEN
        NEW.visibility_status := 'pending_review';
        NEW.is_public := FALSE;
      ELSE
        NEW.visibility_status := 'public';
        NEW.is_public := TRUE;
        NEW.published_at := COALESCE(NEW.published_at, NOW());
      END IF;
    ELSE
      IF NEW.visibility_status = 'public' THEN
        NEW.is_public := TRUE;
        NEW.published_at := COALESCE(NEW.published_at, NOW());
        NEW.reviewed_at := NOW();
        NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
