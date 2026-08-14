-- =============================================================================
-- Verifact — Migration 016: Financial Dashboard & Token Cost Tracking
-- =============================================================================

-- 1. Add token usage columns to public.verifications
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;

-- 2. Table: verification_costs (Detailed per-API-call cost logs)
CREATE TABLE IF NOT EXISTS public.verification_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID REFERENCES public.verifications(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  step TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_costs_verification_id 
  ON public.verification_costs(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_costs_created_at 
  ON public.verification_costs(created_at DESC);

-- 3. Table: api_pricing (Configurable pricing per million tokens)
CREATE TABLE IF NOT EXISTS public.api_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL UNIQUE,
  price_per_million_input_tokens NUMERIC(10, 4) NOT NULL DEFAULT 0,
  price_per_million_output_tokens NUMERIC(10, 4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed initial standard pricing
INSERT INTO public.api_pricing (provider, model, price_per_million_input_tokens, price_per_million_output_tokens, currency)
VALUES
  ('gemini', 'gemini-2.0-flash', 0.10, 0.40, 'USD'),
  ('gemini', 'gemini-2.0-flash-lite', 0.075, 0.30, 'USD'),
  ('gemini', 'gemini-1.5-flash', 0.075, 0.30, 'USD'),
  ('gemini', 'gemini-1.5-pro', 1.25, 5.00, 'USD'),
  ('openrouter', 'deepseek/deepseek-chat', 0.14, 0.28, 'USD'),
  ('openrouter', 'google/gemini-2.0-flash-lite-001:free', 0.00, 0.00, 'USD'),
  ('openrouter', 'meta-llama/llama-3.3-70b-instruct:free', 0.00, 0.00, 'USD'),
  ('openrouter', 'default', 0.15, 0.60, 'USD')
ON CONFLICT (model) DO NOTHING;

-- 4. Table: fixed_costs (Monthly recurring infrastructure/tooling subscriptions)
CREATE TABLE IF NOT EXISTS public.fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  monthly_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed baseline sample costs (editable by admin in UI)
INSERT INTO public.fixed_costs (name, category, monthly_amount, currency, note)
VALUES
  ('Vercel Pro', 'hosting', 20.00, 'USD', 'Hosting Next.js Serverless & Edge functions'),
  ('Supabase Pro', 'infrastructure', 25.00, 'USD', 'PostgreSQL DB, Auth, Storage & Realtime'),
  ('Claude Pro / Anthropic', 'ai_tools', 20.00, 'USD', 'Dezvoltare, prompt engineering & asistență'),
  ('Domeniu verifact.ro', 'domain', 1.00, 'EUR', 'Cost anual proratat lunar (~12 EUR/an)')
ON CONFLICT DO NOTHING;

-- 5. Row Level Security (RLS) Policies — Strictly Admin Only
ALTER TABLE public.verification_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view verification costs"
  ON public.verification_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage api pricing"
  ON public.api_pricing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage fixed costs"
  ON public.fixed_costs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
