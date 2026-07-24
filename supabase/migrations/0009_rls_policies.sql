-- =============================================================================
-- Verifact — Migration 0009: Row Level Security policies + GDPR RPC
-- =============================================================================

-- ============================================================
-- Enable RLS on ALL tables
-- ============================================================
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES policies
-- ============================================================

-- Users can view their own profile; admins can view all
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Users can update their own profile, but CANNOT change role or tier
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND tier = (SELECT p.tier FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Profile creation is handled by the trigger (SECURITY DEFINER), not by client
-- No INSERT policy needed for authenticated users

-- ============================================================
-- VERIFICATIONS policies
-- ============================================================

-- Public verifications readable by anyone; private only by owner or admin/moderator
CREATE POLICY "verifications_select" ON public.verifications FOR SELECT
  USING (
    is_public = TRUE
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

-- Users can insert their own verifications (or anonymous with user_id = NULL)
CREATE POLICY "verifications_insert_own" ON public.verifications FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
  );

-- NO UPDATE policy for authenticated users on verifications.
-- Verdict/score/report_json are written ONLY server-side via service_role.

-- Users can delete their own verifications
CREATE POLICY "verifications_delete_own" ON public.verifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- CACHED_RESULTS policies
-- cached_results are server-internal. No client access at all.
-- RLS enabled with ZERO policies = total block for anon/authenticated.
-- Only service_role can read/write.
-- ============================================================
-- (no policies — intentionally blocked)

-- ============================================================
-- DISPUTES policies
-- ============================================================

-- Anyone (including anonymous) can create a dispute
CREATE POLICY "disputes_insert_anyone" ON public.disputes FOR INSERT
  WITH CHECK (true);

-- Reporters can view their own disputes
CREATE POLICY "disputes_select_own" ON public.disputes FOR SELECT
  USING (reporter_user_id = auth.uid());

-- Admins/moderators can view and manage all disputes
CREATE POLICY "disputes_admin_select" ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "disputes_admin_update" ON public.disputes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "disputes_admin_delete" ON public.disputes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

-- ============================================================
-- API_CALL_LOGS policies
-- Server-internal only. No client access.
-- ============================================================
-- (no policies — intentionally blocked)

-- ============================================================
-- SUBSCRIPTIONS policies
-- ============================================================

-- Users can view their own subscription
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all subscriptions
CREATE POLICY "subscriptions_admin_select" ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE for regular users — managed server-side via service_role

-- ============================================================
-- ADMIN_ACTIONS policies
-- Server-internal audit log. No client access.
-- ============================================================
-- (no policies — intentionally blocked)

-- ============================================================
-- GDPR: request_account_deletion RPC
-- Called by service_role from API route, not directly by client.
-- Anonimizes public verifications (user_id = NULL, keeps content)
-- Deletes private verifications entirely
-- Deletes profile row
-- Caller (API route) must also delete from auth.users via admin API
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_account_deletion(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Anonymize public verifications (preserve content for community)
  UPDATE public.verifications
     SET user_id = NULL
   WHERE user_id = target_user_id AND is_public = TRUE;

  -- Delete private verifications entirely
  DELETE FROM public.verifications
   WHERE user_id = target_user_id AND is_public = FALSE;

  -- Delete subscriptions
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;

  -- Anonymize disputes filed by this user
  UPDATE public.disputes
     SET reporter_user_id = NULL
   WHERE reporter_user_id = target_user_id;

  -- Delete the profile (cascades where needed)
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- NOTE: The caller MUST also call supabase.auth.admin.deleteUser(target_user_id)
  -- from the API route using the service_role client. This function only handles
  -- the public schema data.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
