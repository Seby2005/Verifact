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
