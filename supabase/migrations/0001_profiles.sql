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
