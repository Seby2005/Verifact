-- =============================================================================
-- AI Fact-Checker — Initial Database Schema & RLS Policies
-- =============================================================================

-- Enable pgcrypto for UUID generation if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Table: profiles (Extends Supabase Auth users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business')),
  verifications_count INTEGER DEFAULT 0 CHECK (verifications_count >= 0),
  verifications_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger to automatically create a profile entry when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Table: verifications (Fact-checking reports)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('text', 'screenshot', 'url')),
  input_text TEXT NOT NULL,
  input_url TEXT,
  verdict TEXT NOT NULL CHECK (verdict IN ('true', 'false', 'partial', 'unclear')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  report_json JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  language TEXT DEFAULT 'ro' CHECK (language IN ('ro', 'en')),
  processing_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON public.verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_public ON public.verifications(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verifications_verdict ON public.verifications(verdict);

-- -----------------------------------------------------------------------------
-- Table: cached_results (Cache for similar queries)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cached_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL,
  result_json JSONB NOT NULL,
  hits INTEGER DEFAULT 0 CHECK (hits >= 0),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for cache hash lookup
CREATE INDEX IF NOT EXISTS idx_cached_results_hash ON public.cached_results(content_hash);

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- -----------------------------------------------------------------------------

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_results ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Verifications Policies
CREATE POLICY "Anyone can view public verifications"
  ON public.verifications FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can view own verifications"
  ON public.verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert verifications"
  ON public.verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own verifications"
  ON public.verifications FOR DELETE
  USING (auth.uid() = user_id);

-- Cached Results Policies (Internal / Read-only for standard users)
CREATE POLICY "Allow public read access to cache"
  ON public.cached_results FOR SELECT
  TO authenticated, anon
  USING (TRUE);
