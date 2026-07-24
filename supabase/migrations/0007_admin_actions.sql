-- =============================================================================
-- Verifact — Migration 0007: admin_actions audit log
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES public.profiles(id),
  action_type  TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id    UUID NOT NULL,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
