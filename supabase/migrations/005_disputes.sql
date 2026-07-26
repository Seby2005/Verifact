-- =============================================================================
-- Dispute mechanism ("Raportează eroare")
-- =============================================================================
-- src/types/database.ts has declared a disputes table and DisputeStatus for
-- a while; this migration is what was missing (planned in docs/TASKS.md
-- S2-10, never implemented). Paired with POST /api/reports/[id]/dispute and
-- the button in ReportView.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES public.verifications(id) ON DELETE CASCADE,
  reporter_email TEXT,
  reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10 AND char_length(reason) <= 2000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved_kept', 'resolved_hidden', 'resolved_edited', 'rejected')),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_verification_id ON public.disputes(verification_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Filing a dispute requires the same visibility a viewer of the report
-- already has: it's public, or the filer owns it. Anonymous filers are
-- allowed (reporter_user_id is nullable) — reporting a factual error in a
-- public report shouldn't require an account.
CREATE POLICY "Anyone who can view a report can dispute it"
  ON public.disputes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.verifications v
      WHERE v.id = verification_id
        AND (v.is_public = TRUE OR v.user_id = auth.uid())
    )
  );

-- A reporter can see their own submissions; admins can see everything (for
-- the review queue this infrastructure sets up but does not build a UI for).
CREATE POLICY "Reporters and admins can view disputes"
  ON public.disputes FOR SELECT
  USING (
    reporter_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Marks a report as having an open dispute — set by the service-role client
-- in the dispute endpoint (any viewer who can dispute a report may not own
-- it, so this can't go through the normal user-scoped RLS path).
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS disputed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_verifications_disputed
  ON public.verifications(disputed)
  WHERE disputed = TRUE;

-- Already declared on CachedResult in src/types/database.ts, never migrated.
-- Counts how many times a cached entry has been disputed; the dispute
-- endpoint also expires the entry immediately (see cache.ts's getCached(),
-- which filters on expires_at), so a disputed claim is never served from
-- cache again even before the count is reviewed.
ALTER TABLE public.cached_results
  ADD COLUMN IF NOT EXISTS disputed_count INTEGER NOT NULL DEFAULT 0 CHECK (disputed_count >= 0);
