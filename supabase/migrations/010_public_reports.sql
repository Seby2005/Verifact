-- =============================================================================
-- System Rapoarte Publice — Schema, Status & Visibility Rules (Etapa 1)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend public.verifications table with visibility status & moderation fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS visibility_status TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility_status IN ('private', 'pending_review', 'public', 'taken_down', 'rejected')),
  ADD COLUMN IF NOT EXISTS flagged_count INTEGER NOT NULL DEFAULT 0
    CHECK (flagged_count >= 0),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Keep visibility_status in sync for any pre-existing rows where is_public was set
UPDATE public.verifications
  SET visibility_status = 'public',
      published_at = COALESCE(published_at, created_at)
  WHERE is_public = TRUE AND visibility_status = 'private';

-- Performance index for public feed and moderation queue queries
CREATE INDEX IF NOT EXISTS idx_verifications_visibility_status
  ON public.verifications(visibility_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_flagged
  ON public.verifications(flagged_count DESC)
  WHERE flagged_count > 0;

-- -----------------------------------------------------------------------------
-- 2. Table: verification_flags (User reporting mechanism)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES public.verifications(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT CHECK (reason IS NULL OR (char_length(reason) >= 5 AND char_length(reason) <= 1000)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_verification_reporter UNIQUE (verification_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_verification_flags_verification_id
  ON public.verification_flags(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_flags_reporter
  ON public.verification_flags(reporter_user_id);

-- Trigger to atomically increment flagged_count on verifications table
CREATE OR REPLACE FUNCTION public.handle_verification_flag_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.verifications
    SET flagged_count = flagged_count + 1
    WHERE id = NEW.verification_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_verification_flag_inserted ON public.verification_flags;
CREATE TRIGGER on_verification_flag_inserted
  AFTER INSERT ON public.verification_flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_verification_flag_inserted();

-- -----------------------------------------------------------------------------
-- 3. Row Level Security Policies for verification_flags
-- -----------------------------------------------------------------------------
ALTER TABLE public.verification_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can flag public verifications" ON public.verification_flags;
CREATE POLICY "Authenticated users can flag public verifications"
  ON public.verification_flags FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_user_id
    AND EXISTS (
      SELECT 1 FROM public.verifications v
      WHERE v.id = verification_id
        AND (v.is_public = TRUE OR v.visibility_status = 'public')
    )
  );

DROP POLICY IF EXISTS "Users can view their own flags" ON public.verification_flags;
CREATE POLICY "Users can view their own flags"
  ON public.verification_flags FOR SELECT
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Admins can view all flags" ON public.verification_flags;
CREATE POLICY "Admins can view all flags"
  ON public.verification_flags FOR SELECT
  USING (public.current_profile_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 4. Business Rules Trigger on public.verifications UPDATE
-- -----------------------------------------------------------------------------
-- Enforces:
-- a) Score must be decisive (>= 85 or <= 39) to become public/pending_review
-- b) Free tier accounts are capped at 1 public report per calendar month
-- c) Accounts <48h old OR with <2 total verifications default to 'pending_review'
-- d) Only admins can transition reports to 'taken_down' or approve 'pending_review'
-- -----------------------------------------------------------------------------
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
  -- If visibility is not changing and is_public is unchanged, pass through
  IF NEW.visibility_status = OLD.visibility_status AND NEW.is_public = OLD.is_public THEN
    RETURN NEW;
  END IF;

  v_caller_role := public.current_profile_role();

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
    -- Admins bypassing this rule can set 'public' directly
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

DROP TRIGGER IF EXISTS trg_enforce_verification_public_rules ON public.verifications;
CREATE TRIGGER trg_enforce_verification_public_rules
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_verification_public_rules();
