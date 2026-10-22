-- =============================================================================
-- Migration 021: fixes from the October 2026 security review
-- =============================================================================
-- Every statement is idempotent and written to be safe whatever state the live
-- database is in (the review could not read it; see 008's note that some live
-- policies were created by hand). Run it as one transaction in the Supabase SQL
-- editor, AFTER deploying the application code from the same change: the code
-- works with and without this migration, but this migration takes away
-- privileges the previous code relied on (release_usage_slot, check_rate_limit
-- called with the anon key, direct inserts into disputes).
--
--  1. profiles     — no self-promotion: drop 001's UPDATE policy (no WITH CHECK,
--                    OR-ed with the guarded one), column-level UPDATE limited to
--                    username, and safe values forced on browser inserts.
--  2. verifications — the publication rules also run on INSERT; trusted writers
--                    (service role, SQL editor, our own nested triggers) pass;
--                    browser writes may change only show_author and visibility;
--                    published_at / reviewed_* become system-managed; taken-down
--                    reports cannot be republished by their owner; admins are
--                    exempt from publication limits again (014's intent, by role).
--  3. Anonymous INSERT into verifications removed (policy + privilege).
--  4. language CHECK accepts 'fr' and 'unknown' (French reports never saved).
--  5. release_usage_slot / check_rate_limit: service role only.
--  6. reserve_usage_slot*: a missing profile no longer means unlimited use.
--  7. disputes: inserted only by the server (it rate-limits the route).
--  8. api_keys: written only by the server; revocation is final; scopes checked.
--  9. webhook_events: idempotency for the Creem webhook.
-- 10. handle_new_user gets a fixed search_path.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Who is calling. PostgREST puts the JWT role in the request settings;
--    a direct SQL session (dashboard, GoTrue, migrations) has none.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_jwt_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
$$;

-- True for writes that come from a browser (the anon or authenticated role),
-- which are the only ones the row rules below need to police.
CREATE OR REPLACE FUNCTION public.request_is_from_browser()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.request_jwt_role() IN ('anon', 'authenticated'), FALSE);
$$;

-- -----------------------------------------------------------------------------
-- 1. profiles
-- -----------------------------------------------------------------------------
-- Recreate the guarded policies (008/019) first, so dropping 001's originals
-- can never leave the table without a working SELECT or UPDATE policy.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.current_profile_role() = 'admin');

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

-- 001's policies. "Users can update own profile" has no WITH CHECK, and
-- permissive policies are OR-ed, so while it exists the guard above is void:
-- any user could set their own role to 'admin' or tier to 'business'.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Column privileges are immune to policy OR-ing: a browser may update its
-- username and nothing else (the app updates no other column that way;
-- tier, role and counters are written by the service role and SECURITY
-- DEFINER functions, which this does not touch).
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (username) ON public.profiles TO authenticated;

-- A browser-side profile insert (ensureProfileExists' fallback) always starts
-- as a plain free account, whatever the request body says.
CREATE OR REPLACE FUNCTION public.enforce_profile_insert_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.request_is_from_browser() THEN
    NEW.role := 'user';
    NEW.tier := 'free';
    NEW.verifications_count := 0;
    NEW.verifications_reset := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_insert_defaults ON public.profiles;
CREATE TRIGGER trg_enforce_profile_insert_defaults
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_insert_defaults();

-- -----------------------------------------------------------------------------
-- 2. verifications: publication rules on INSERT and UPDATE
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
  v_is_admin BOOLEAN;
  v_free_columns CONSTANT TEXT[] := ARRAY['show_author', 'is_public', 'visibility_status'];
BEGIN
  -- Trusted writers pass untouched: the service role (server code, which has
  -- already authorised the action — requireAdmin, the publish flow, the
  -- dispute and moderation helpers), direct SQL sessions, and writes nested
  -- in our own triggers (the flag counter, FK cascades on account deletion).
  -- 019 treated the service role as "not an admin", which made moderation,
  -- take-downs, dispute flags and account deletion fail on user-owned rows.
  IF NOT public.request_is_from_browser() OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_is_admin := COALESCE(public.current_profile_role() = 'admin', FALSE);

  -- A row inserted straight from a browser is never born public, moderated
  -- or carrying images, costs or counters. The app itself inserts with the
  -- service role; this closes the direct PostgREST path.
  IF TG_OP = 'INSERT' THEN
    NEW.visibility_status := 'private';
    NEW.is_public := FALSE;
    NEW.published_at := NULL;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.flagged_count := 0;
    NEW.disputed := FALSE;
    NEW.image_urls := '{}';
    NEW.input_tokens := 0;
    NEW.output_tokens := 0;
    RETURN NEW;
  END IF;

  IF NOT v_is_admin THEN
    IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot modify a report belonging to another user';
    END IF;

    -- System-managed: when it was first published (the lifetime and monthly
    -- publication limits count it, so clearing it used to reset them) and
    -- who reviewed it.
    NEW.published_at := OLD.published_at;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.reviewed_by := OLD.reviewed_by;

    -- Allow-list, not deny-list: the owner may change author attribution and
    -- visibility, nothing else (verdict, content, ownership, costs, flags...).
    IF (to_jsonb(NEW) - v_free_columns) IS DISTINCT FROM (to_jsonb(OLD) - v_free_columns) THEN
      RAISE EXCEPTION 'Cannot modify content, verdict, or moderation fields of an existing verification';
    END IF;

    IF NEW.visibility_status NOT IN ('private', 'public', 'pending_review') THEN
      RAISE EXCEPTION 'Only administrators can set this visibility status';
    END IF;

    IF OLD.visibility_status IN ('taken_down', 'rejected')
       AND NEW.visibility_status IS DISTINCT FROM OLD.visibility_status THEN
      RAISE EXCEPTION 'Raportul a fost retras de moderare și nu mai poate fi publicat.';
    END IF;
  END IF;

  -- Visibility unchanged: nothing more to check.
  IF NEW.visibility_status = OLD.visibility_status AND NEW.is_public = OLD.is_public THEN
    RETURN NEW;
  END IF;

  IF NEW.visibility_status = 'taken_down' THEN
    -- Reachable only by admins (non-admins were stopped above).
    NEW.is_public := FALSE;
    NEW.reviewed_at := NOW();
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
    RETURN NEW;
  END IF;

  -- Publishing (moving to public/pending_review or setting is_public = true).
  IF NEW.visibility_status IN ('public', 'pending_review') OR (NEW.is_public = TRUE AND OLD.is_public = FALSE) THEN
    IF NEW.input_type = 'screenshot' THEN
      RAISE EXCEPTION 'Rapoartele din screenshot-uri nu pot fi făcute publice.';
    END IF;

    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Anonymous verifications cannot be made public without authentication';
    END IF;

    IF NEW.score IS NULL AND NEW.verdict IS NULL THEN
      RAISE EXCEPTION 'Report must be completed before making it public';
    END IF;

    -- Admins publish without limits (restores 014, which 019 dropped).
    IF NOT v_is_admin THEN
      SELECT tier INTO v_user_tier FROM public.profiles WHERE id = NEW.user_id;
      IF NOT FOUND THEN
        v_user_tier := 'free';
      END IF;

      IF v_user_tier = 'free' THEN
        -- Free: one public report in total, ever. published_at survives an
        -- unpublish now, so retracting a report no longer frees the slot.
        SELECT COUNT(*) INTO v_public_count
          FROM public.verifications
          WHERE user_id = NEW.user_id
            AND id <> NEW.id
            AND (published_at IS NOT NULL OR visibility_status IN ('public', 'pending_review'));

        IF v_public_count >= 1 THEN
          RAISE EXCEPTION 'Contul gratuit permite un singur raport public, în total. Treci la premium pentru mai multe.';
        END IF;
      ELSE
        -- Premium: four first publications per calendar month.
        SELECT COUNT(*) INTO v_public_count
          FROM public.verifications
          WHERE user_id = NEW.user_id
            AND id <> NEW.id
            AND published_at >= date_trunc('month', NOW());

        IF v_public_count >= 4 THEN
          RAISE EXCEPTION 'Ai atins limita de 4 rapoarte publice pe lună pentru planul tău.';
        END IF;
      END IF;
    END IF;

    NEW.visibility_status := 'public';
    NEW.is_public := TRUE;
    NEW.published_at := COALESCE(NEW.published_at, NOW());
    IF v_is_admin THEN
      NEW.reviewed_at := NOW();
      NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
    END IF;
  END IF;

  -- Unpublishing.
  IF (NEW.visibility_status = 'private' OR NEW.is_public = FALSE) AND (OLD.visibility_status = 'public' OR OLD.is_public = TRUE) THEN
    NEW.visibility_status := 'private';
    NEW.is_public := FALSE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_verification_public_rules ON public.verifications;
CREATE TRIGGER trg_enforce_verification_public_rules
  BEFORE INSERT OR UPDATE ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_verification_public_rules();

-- -----------------------------------------------------------------------------
-- 3. verifications: no anonymous inserts
-- -----------------------------------------------------------------------------
-- 001 allowed `user_id IS NULL`, which for a caller with no session meant
-- anyone holding the public anon key could insert rows. The app saves every
-- report with the service role and needs neither branch.
DROP POLICY IF EXISTS "Authenticated users can insert verifications" ON public.verifications;
DROP POLICY IF EXISTS "Users can insert own verifications" ON public.verifications;
CREATE POLICY "Users can insert own verifications"
  ON public.verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

REVOKE INSERT ON public.verifications FROM anon;

-- -----------------------------------------------------------------------------
-- 4. language: the app has always sent 'fr' and 'unknown' too
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_name TEXT;
BEGIN
  FOR v_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.verifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%language%'
  LOOP
    EXECUTE format('ALTER TABLE public.verifications DROP CONSTRAINT %I', v_name);
  END LOOP;
END;
$$;

ALTER TABLE public.verifications
  ADD CONSTRAINT verifications_language_check
  CHECK (language IN ('ro', 'en', 'fr', 'unknown'));

-- -----------------------------------------------------------------------------
-- 5. Functions that took policy from the caller: service role only
-- -----------------------------------------------------------------------------
-- release_usage_slot() decremented the caller's monthly counter with no
-- reservation to match, so a user could reset their quota at will. The app
-- now releases through release_usage_slot_for (service role, 018).
REVOKE ALL ON FUNCTION public.release_usage_slot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_usage_slot() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_usage_slot() TO service_role;

-- check_rate_limit takes the key, the limit and the window as arguments, so
-- with the anon key anyone could reset any bucket (a zero window) or fill
-- someone else's. The app calls it with the service role.
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, BIGINT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, BIGINT) TO service_role;

-- Rows planted with a far-future window were never cleaned up.
DELETE FROM public.rate_limits WHERE reset_at > NOW() + INTERVAL '8 days';

-- -----------------------------------------------------------------------------
-- 6. reserve_usage_slot*: a missing profile is not unlimited
-- -----------------------------------------------------------------------------
-- 009 answered "allowed" for a caller without a profile row and never counted
-- anything, so such an account had unlimited verifications forever. The row
-- is created on the spot instead, and the free limit applies.
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

  INSERT INTO public.profiles (id) VALUES (v_user_id) ON CONFLICT (id) DO NOTHING;

  SELECT tier, verifications_count, verifications_reset
    INTO v_tier, v_count, v_reset
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

  -- Keep in sync with TIER_CONFIG (src/types/user.ts), as in 009.
  v_limit := CASE v_tier
    WHEN 'pro' THEN 35
    WHEN 'business' THEN 1000
    ELSE 3
  END;

  IF v_reset IS NULL OR date_trunc('month', v_reset) <> date_trunc('month', v_today) THEN
    v_count := 0;
    UPDATE public.profiles
      SET verifications_count = 0, verifications_reset = v_today
      WHERE id = v_user_id;
  END IF;

  IF COALESCE(v_count, 0) >= v_limit THEN
    RETURN QUERY SELECT FALSE, v_limit, v_count;
    RETURN;
  END IF;

  UPDATE public.profiles
    SET verifications_count = COALESCE(verifications_count, 0) + 1
    WHERE id = v_user_id
    RETURNING verifications_count INTO v_count;

  RETURN QUERY SELECT TRUE, v_limit, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_usage_slot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_usage_slot() FROM anon;
GRANT EXECUTE ON FUNCTION public.reserve_usage_slot() TO authenticated, service_role;

-- reserve_usage_slot_for answered "allowed, 1000" for an unknown user. Only
-- API keys use it, and a key always belongs to a profile, so an unknown user
-- is refused.
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

  SELECT tier, verifications_count, verifications_reset
    INTO v_tier, v_count, v_reset
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;

  v_limit := CASE v_tier
    WHEN 'pro' THEN 35
    WHEN 'business' THEN 1000
    ELSE 3
  END;

  IF v_reset IS NULL OR date_trunc('month', v_reset) <> date_trunc('month', v_today) THEN
    v_count := 0;
    UPDATE public.profiles
      SET verifications_count = 0, verifications_reset = v_today
      WHERE id = p_user_id;
  END IF;

  IF COALESCE(v_count, 0) >= v_limit THEN
    RETURN QUERY SELECT FALSE, v_limit, v_count;
    RETURN;
  END IF;

  UPDATE public.profiles
    SET verifications_count = COALESCE(verifications_count, 0) + 1
    WHERE id = p_user_id
    RETURNING verifications_count INTO v_count;

  RETURN QUERY SELECT TRUE, v_limit, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_usage_slot_for(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_usage_slot_for(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_usage_slot_for(UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 7. disputes: only through the route
-- -----------------------------------------------------------------------------
-- The table had no limit of its own, so the public INSERT policy let anyone
-- fill it straight through PostgREST. The route checks visibility with the
-- caller's session, rate-limits per IP, and inserts with the service role.
DROP POLICY IF EXISTS "Anyone who can view a report can dispute it" ON public.disputes;
REVOKE INSERT ON public.disputes FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. api_keys: written only by the server
-- -----------------------------------------------------------------------------
-- The direct INSERT policy skipped the "Business only" check in the app, and
-- the UPDATE policy let an owner write revoked_at back to NULL, undoing a
-- revocation. Keys are created, listed and revoked with the service role.
DROP POLICY IF EXISTS "Users can insert own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON public.api_keys;
REVOKE INSERT, UPDATE ON public.api_keys FROM anon, authenticated;

-- 'verify' is the only operation a key can be granted. NOT VALID: checks new
-- rows without failing on whatever old rows hold.
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_scopes_allowed;
ALTER TABLE public.api_keys
  ADD CONSTRAINT api_keys_scopes_allowed
  CHECK (scopes <@ ARRAY['verify']::TEXT[]) NOT VALID;

-- -----------------------------------------------------------------------------
-- 9. webhook_events: each payment event is applied once
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role (the webhook route) uses it.
REVOKE ALL ON public.webhook_events FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10. handle_new_user: the one SECURITY DEFINER function without search_path
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

COMMIT;

-- =============================================================================
-- After running: quick checks (read-only)
-- =============================================================================
-- Policies on profiles — expect profiles_select_own, profiles_update_own and
-- "Users can insert their own profile", and NOT "Users can update own profile":
--   SELECT policyname, cmd, with_check FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'profiles';
--
-- Trigger fires on INSERT and UPDATE:
--   SELECT pg_get_triggerdef(oid) FROM pg_trigger
--   WHERE tgrelid = 'public.verifications'::regclass AND NOT tgisinternal;
--
-- Browser roles can no longer call the two functions (expect false / false):
--   SELECT p.proname,
--          has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname IN ('release_usage_slot', 'check_rate_limit');
