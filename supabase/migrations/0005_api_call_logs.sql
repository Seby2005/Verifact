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
