-- =============================================================================
-- Verifact — combined migrations (0001 through 0009), for one-time paste into
-- the Supabase Dashboard SQL Editor.
--
-- This is a convenience copy of supabase/migrations/*.sql concatenated in
-- order — NOT a new migration file, and not meant to be tracked by the
-- Supabase CLI. If you set up your project via `supabase db push` instead,
-- ignore this file; it's for people using the Dashboard SQL Editor directly.
--
-- Safe to run once on an empty project (tables/functions use IF NOT EXISTS /
-- CREATE OR REPLACE). The RLS policies at the end do NOT use IF NOT EXISTS —
-- if you need to re-run this after a partial failure, drop the policies
-- first or run 0009_rls_policies.sql's CREATE POLICY statements manually
-- after checking what already exists.
-- =============================================================================

-- =============================================================================
-- Verifact — Migration 0001: profiles table
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.profiles (
  id                              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username                        TEXT UNIQUE,
  tier                            TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business')),
  role                            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  verifications_count             INTEGER NOT NULL DEFAULT 0 CHECK (verifications_count >= 0),
  verifications_reset             DATE NOT NULL DEFAULT CURRENT_DATE,
  preferred_language              TEXT NOT NULL DEFAULT 'ro' CHECK (preferred_language IN ('ro', 'en')),
  gdpr_data_export_requested_at   TIMESTAMPTZ,
  gdpr_deletion_requested_at      TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Verifact — Migration 0002: verifications table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  anonymous_hash    TEXT,
  input_type        TEXT NOT NULL CHECK (input_type IN ('text', 'screenshot', 'url')),
  input_text        TEXT NOT NULL CHECK (char_length(input_text) BETWEEN 1 AND 5000),
  input_url         TEXT,
  verdict           TEXT CHECK (verdict IN ('true', 'partial', 'unclear', 'false')),
  score             INTEGER CHECK (score BETWEEN 0 AND 100),
  report_json       JSONB,
  is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  language          TEXT NOT NULL DEFAULT 'ro' CHECK (language IN ('ro', 'en')),
  processing_time_ms INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Verifact — Migration 0003: cached_results table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cached_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash    TEXT UNIQUE NOT NULL,
  result_json     JSONB NOT NULL,
  hits            INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
  disputed_count  INTEGER NOT NULL DEFAULT 0 CHECK (disputed_count >= 0),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Verifact — Migration 0004: disputes table + cache invalidation trigger
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id   UUID NOT NULL REFERENCES public.verifications(id) ON DELETE CASCADE,
  reporter_email    TEXT,
  reporter_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason            TEXT NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved_kept', 'resolved_hidden', 'resolved_edited', 'rejected')),
  resolved_by       UUID REFERENCES public.profiles(id),
  resolution_note   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.fn_dispute_cache_invalidation()
RETURNS TRIGGER AS $$
DECLARE
  v_content_hash TEXT;
BEGIN
  IF NEW.status <> 'open' THEN
    RETURN NEW;
  END IF;

  SELECT encode(digest(v.input_text, 'sha256'), 'hex')
    INTO v_content_hash
    FROM public.verifications v
   WHERE v.id = NEW.verification_id;

  IF v_content_hash IS NOT NULL THEN
    UPDATE public.cached_results
       SET disputed_count = disputed_count + 1,
           expires_at = CASE
             WHEN disputed_count + 1 >= 3 THEN NOW()
             ELSE expires_at
           END
     WHERE content_hash = v_content_hash;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_dispute_cache_invalidation
  AFTER INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.fn_dispute_cache_invalidation();

-- =============================================================================
-- Verifact — Migration 0005: api_call_logs table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_call_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id  UUID REFERENCES public.verifications(id) ON DELETE SET NULL,
  provider         TEXT NOT NULL,
  endpoint         TEXT,
  latency_ms       INTEGER,
  status_code      INTEGER,
  success          BOOLEAN NOT NULL,
  estimated_cost_usd NUMERIC(10, 6),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Verifact — Migration 0006: subscriptions table (stub for future Stripe)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier                    TEXT NOT NULL CHECK (tier IN ('pro', 'business')),
  status                  TEXT NOT NULL DEFAULT 'pending_manual' CHECK (status IN ('pending_manual', 'active', 'past_due', 'canceled')),
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Verifact — Migration 0007: admin_actions audit log
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES public.profiles(id),
  action_type  TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id    UUID NOT NULL,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Verifact — Migration 0008: performance indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_verifications_user_id
  ON public.verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_verifications_public
  ON public.verifications(is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_verdict
  ON public.verifications(verdict);

CREATE INDEX IF NOT EXISTS idx_verifications_status
  ON public.verifications(status);

CREATE INDEX IF NOT EXISTS idx_verifications_anonymous_hash
  ON public.verifications(anonymous_hash)
  WHERE anonymous_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verifications_input_text_fts
  ON public.verifications
  USING GIN (to_tsvector('simple', input_text));

CREATE INDEX IF NOT EXISTS idx_cached_results_expires_at
  ON public.cached_results(expires_at);

CREATE INDEX IF NOT EXISTS idx_disputes_status
  ON public.disputes(status);

CREATE INDEX IF NOT EXISTS idx_disputes_verification_id
  ON public.disputes(verification_id);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_provider_created
  ON public.api_call_logs(provider, created_at);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_verification_id
  ON public.api_call_logs(verification_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions(user_id);

-- =============================================================================
-- Verifact — Migration 0009: Row Level Security policies + GDPR RPC
-- =============================================================================

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND tier = (SELECT p.tier FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "verifications_select" ON public.verifications FOR SELECT
  USING (
    is_public = TRUE
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "verifications_insert_own" ON public.verifications FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
  );

CREATE POLICY "verifications_delete_own" ON public.verifications FOR DELETE
  USING (user_id = auth.uid());

-- cached_results: RLS enabled, zero policies — total block for anon/authenticated,
-- only service_role can read/write. This is intentional.

CREATE POLICY "disputes_insert_anyone" ON public.disputes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "disputes_select_own" ON public.disputes FOR SELECT
  USING (reporter_user_id = auth.uid());

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

-- api_call_logs: RLS enabled, zero policies — server-internal only.

CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "subscriptions_admin_select" ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- admin_actions: RLS enabled, zero policies — server-internal audit log only.

CREATE OR REPLACE FUNCTION public.request_account_deletion(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.verifications
     SET user_id = NULL
   WHERE user_id = target_user_id AND is_public = TRUE;

  DELETE FROM public.verifications
   WHERE user_id = target_user_id AND is_public = FALSE;

  DELETE FROM public.subscriptions WHERE user_id = target_user_id;

  UPDATE public.disputes
     SET reporter_user_id = NULL
   WHERE reporter_user_id = target_user_id;

  DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
