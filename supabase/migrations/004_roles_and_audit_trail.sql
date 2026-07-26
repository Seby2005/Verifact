-- =============================================================================
-- Roles & admin audit trail
-- =============================================================================
-- src/types/database.ts has declared UserRole ('user'|'admin'|'moderator')
-- and an admin_actions table since that file was written, but neither ever
-- made it into a migration — profiles has no role column today, and
-- admin_actions doesn't exist. This wires the schema up to match; the
-- requireAdmin()/logAdminAction() helpers that use it are in
-- src/lib/auth/admin.ts. No admin UI is added here on purpose — this is
-- infrastructure only.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'moderator'));

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No ON DELETE SET NULL: an audit trail should not silently lose who
  -- performed an action, so deleting a profile with recorded actions is
  -- blocked (the default FK behaviour) rather than laundering the actor.
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Reads restricted to admins. There is deliberately no INSERT/UPDATE/DELETE
-- policy: the only writer is logAdminAction() (src/lib/auth/admin.ts),
-- which uses the service-role client and so bypasses RLS entirely. Without
-- an insert policy, even an admin acting through the normal
-- anon/authenticated key cannot write (or forge) an audit entry directly —
-- only server-side code that has decided to log an action can.
CREATE POLICY "Admins can view the audit trail"
  ON public.admin_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
