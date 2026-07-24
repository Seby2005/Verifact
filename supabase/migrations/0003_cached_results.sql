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
