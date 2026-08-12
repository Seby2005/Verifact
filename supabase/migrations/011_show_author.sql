-- Migration: Add show_author column to public.verifications table
-- Default is FALSE (anonymous by default). Can be updated anytime by report owner.

ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS show_author BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.verifications.show_author IS 'Controls whether the author name/profile is displayed on the public report page';
