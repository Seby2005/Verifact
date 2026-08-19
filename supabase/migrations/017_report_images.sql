-- =============================================================================
-- Report Images — Admin-only images attached to public verification reports
-- =============================================================================
-- Adds an image gallery to reports. Images are attached and published ONLY by
-- admins through the server-side admin composer (service-role insert), so no
-- user-facing upload path exists and no per-image content moderation is needed
-- at this stage: admin-only authorship IS the safeguard.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Column: image_urls on verifications (ordered list of public image URLs)
-- -----------------------------------------------------------------------------
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- 2. Storage bucket: report-images (public read; writes only via service role)
-- -----------------------------------------------------------------------------
-- Public bucket → objects are readable via their public URL (stable for OG/SEO).
-- Writes happen exclusively through createAdminClient() (service_role), which
-- bypasses RLS, so no INSERT/UPDATE/DELETE policy is granted to anon/authenticated
-- roles. file_size_limit and allowed_mime_types add a defense-in-depth cap.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-images',
  'report-images',
  TRUE,
  5242880, -- 5 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
