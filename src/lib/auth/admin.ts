import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/types/database';

/**
 * Thrown by requireAdmin() when the caller isn't allowed through. Carries
 * an HTTP status so route handlers can map it directly:
 * 401 — no authenticated user at all
 * 403 — authenticated, but not an admin (or moderator, if allowed)
 */
export class AuthorizationError extends Error {
  constructor(message: string, public readonly status: 401 | 403) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

interface ProfileRoleRow {
  role: UserRole;
}

/**
 * Verifies the current request comes from an authenticated admin, throwing
 * AuthorizationError otherwise. Intended for API routes that need to gate
 * an administrative action:
 *
 *   const { user } = await requireAdmin();
 *   // ...perform the action...
 *   await logAdminAction({ adminId: user.id, actionType: 'dispute.resolve', ... });
 *
 * Pass `{ allowModerator: true }` to also accept the 'moderator' role for
 * actions that don't require full admin privileges.
 *
 * Every /api/admin handler and every /admin page calls this, and
 * app/admin/layout.tsx calls it again as a safety net. The role comes from
 * profiles.role only; the ADMIN_EMAILS list never passes this gate.
 */
export async function requireAdmin(
  options: { allowModerator?: boolean } = {}
): Promise<{ user: User; role: UserRole }> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthorizationError('Authentication required', 401);
  }

  const { data, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !data) {
    throw new AuthorizationError('Profile not found', 403);
  }

  const role = (data as ProfileRoleRow).role;
  const allowedRoles: UserRole[] = options.allowModerator ? ['admin', 'moderator'] : ['admin'];

  if (!allowedRoles.includes(role)) {
    throw new AuthorizationError('Admin privileges required', 403);
  }

  return { user, role };
}

export interface LogAdminActionParams {
  adminId: string;
  actionType: string;
  targetTable: string;
  targetId: string;
  details?: Record<string, unknown>;
}

/**
 * Records an administrative action in the admin_actions audit trail.
 * Uses the service-role client deliberately: admin_actions has no INSERT
 * policy (see supabase/migrations/004_roles_and_audit_trail.sql), so this
 * is the only code path that can write to it — an action can't be logged
 * by anything other than server code that explicitly chose to call this.
 *
 * Logging failures are non-fatal (matches saveVerification's pattern) —
 * the caller's actual action already happened; losing the audit record of
 * it shouldn't also fail the request. The result says whether the record was
 * written, so a caller that must not act unaudited can check it.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<boolean> {
  const admin = createAdminClient();

  const insertData = {
    admin_id: params.adminId,
    action_type: params.actionType,
    target_table: params.targetTable,
    target_id: params.targetId,
    details: params.details ?? null,
  };

  const { error } = await (admin.from('admin_actions') as unknown as {
    insert: (data: typeof insertData) => Promise<{ error: { message: string } | null }>;
  }).insert(insertData);

  if (error) {
    logger.error('Failed to log admin action', {
      service: 'Audit',
      error: error.message,
      actionType: params.actionType,
      targetTable: params.targetTable,
      targetId: params.targetId,
    });
    return false;
  }
  return true;
}
