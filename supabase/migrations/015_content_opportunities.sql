-- =============================================================================
-- System Oportunități de Conținut (Content Opportunities) — Schema & RLS (Etapa 1)
-- =============================================================================
-- Permite agregarea zilnică a căutărilor și știrilor trending din România
-- pentru identificarea afirmațiilor potențiale de verificat și publicat pe /rapoarte.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: content_opportunities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  trend_rank INTEGER,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'dismissed', 'used'))
);

-- -----------------------------------------------------------------------------
-- 2. Indexes for performance & query filtering
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_content_opportunities_status_fetched_at
  ON public.content_opportunities(status, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_opportunities_title
  ON public.content_opportunities(title);

CREATE INDEX IF NOT EXISTS idx_content_opportunities_fetched_at
  ON public.content_opportunities(fetched_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security Policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.content_opportunities ENABLE ROW LEVEL SECURITY;

-- Admins have full access to view, create, update, and delete opportunities
DROP POLICY IF EXISTS "Admins can view content opportunities" ON public.content_opportunities;
CREATE POLICY "Admins can view content opportunities"
  ON public.content_opportunities FOR SELECT
  USING (public.current_profile_role() = 'admin');

DROP POLICY IF EXISTS "Admins can insert content opportunities" ON public.content_opportunities;
CREATE POLICY "Admins can insert content opportunities"
  ON public.content_opportunities FOR INSERT
  WITH CHECK (public.current_profile_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update content opportunities" ON public.content_opportunities;
CREATE POLICY "Admins can update content opportunities"
  ON public.content_opportunities FOR UPDATE
  USING (public.current_profile_role() = 'admin')
  WITH CHECK (public.current_profile_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete content opportunities" ON public.content_opportunities;
CREATE POLICY "Admins can delete content opportunities"
  ON public.content_opportunities FOR DELETE
  USING (public.current_profile_role() = 'admin');
