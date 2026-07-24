-- =============================================================================
-- Verifact — Migration 0008: performance indexes
-- =============================================================================

-- verifications indexes
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

-- Full-text search GIN index for public feed search
CREATE INDEX IF NOT EXISTS idx_verifications_input_text_fts
  ON public.verifications
  USING GIN (to_tsvector('simple', input_text));

-- cached_results indexes (content_hash is already UNIQUE, so auto-indexed)
-- But add explicit index for expiry lookups
CREATE INDEX IF NOT EXISTS idx_cached_results_expires_at
  ON public.cached_results(expires_at);

-- disputes indexes
CREATE INDEX IF NOT EXISTS idx_disputes_status
  ON public.disputes(status);

CREATE INDEX IF NOT EXISTS idx_disputes_verification_id
  ON public.disputes(verification_id);

-- api_call_logs indexes
CREATE INDEX IF NOT EXISTS idx_api_call_logs_provider_created
  ON public.api_call_logs(provider, created_at);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_verification_id
  ON public.api_call_logs(verification_id);

-- subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions(user_id);
