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

-- =============================================================================
-- Trigger: When a dispute is opened on a verification, find the cached_result
-- (via content_hash match on the verification's input_text) and increment
-- its disputed_count. If disputed_count >= 3, expire the cache entry.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_dispute_cache_invalidation()
RETURNS TRIGGER AS $$
DECLARE
  v_content_hash TEXT;
BEGIN
  -- Only act on new disputes with status 'open'
  IF NEW.status <> 'open' THEN
    RETURN NEW;
  END IF;

  -- Look up the verification's input_text, hash it, find matching cache
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
