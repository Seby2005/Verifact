-- =============================================================================
-- Migration 019: Security Hardening (Report Content Immutability & Usage Protection)
-- =============================================================================
-- 1. Verifications Tampering Guard:
--    Non-admin users must NEVER be able to modify verdict, score, report_json,
--    input_text, input_type, input_url, disputed, flagged_count, or image_urls
--    on existing verification records.
--
-- 2. Profile Usage Counter Protection:
--    Non-admin users must NEVER be able to manually reset verifications_count
--    or verifications_reset via direct PostgREST calls to public.profiles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Update enforce_verification_public_rules() on public.verifications
-- -----------------------------------------------------------------------------
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

  -- Content & Moderation Immutability Guard:
  -- Non-admins cannot alter the content, verdict, score, or moderation state of existing verifications.
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    IF NEW.verdict IS DISTINCT FROM OLD.verdict
       OR NEW.score IS DISTINCT FROM OLD.score
       OR NEW.report_json IS DISTINCT FROM OLD.report_json
       OR NEW.input_text IS DISTINCT FROM OLD.input_text
       OR NEW.input_type IS DISTINCT FROM OLD.input_type
       OR NEW.input_url IS DISTINCT FROM OLD.input_url
       OR NEW.disputed IS DISTINCT FROM OLD.disputed
       OR NEW.flagged_count IS DISTINCT FROM OLD.flagged_count
       OR NEW.image_urls IS DISTINCT FROM OLD.image_urls
    THEN
      RAISE EXCEPTION 'Cannot modify content, verdict, or moderation fields of an existing verification';
    END IF;
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
        RAISE EXCEPTION 'Ai atins limita de 4 rapoarte publice pe lună pentru planul tău.';
      END IF;
    END IF;

    -- Publish successfully
    NEW.visibility_status := 'public';
    NEW.is_public := TRUE;
    NEW.published_at := COALESCE(NEW.published_at, NOW());
  END IF;

  -- If user is un-publishing (moving to private or setting is_public = false)
  IF (NEW.visibility_status = 'private' OR NEW.is_public = FALSE) AND (OLD.visibility_status = 'public' OR OLD.is_public = TRUE) THEN
    NEW.visibility_status := 'private';
    NEW.is_public := FALSE;
  END IF;

  RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- 2. Profile Usage Counter Protection on public.profiles
-- -----------------------------------------------------------------------------
-- Define SECURITY DEFINER helper functions to read the caller's current usage
-- fields without policy re-entry recursion.
CREATE OR REPLACE FUNCTION public.current_profile_verifications_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT verifications_count FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_profile_verifications_reset()
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT verifications_reset FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_verifications_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_verifications_reset() TO anon, authenticated;

-- Update profiles_update_own policy to guard verifications_count and verifications_reset
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.current_profile_role()
    AND tier = public.current_profile_tier()
    AND verifications_count = public.current_profile_verifications_count()
    AND verifications_reset = public.current_profile_verifications_reset()
  );
