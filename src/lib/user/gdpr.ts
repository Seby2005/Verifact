import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Profile, Verification } from '@/types/database';

interface GdprExportData {
  profile: Profile;
  verifications: Verification[];
  exportedAt: string;
  format: 'verifact-gdpr-export-v1';
}

/**
 * Aggregates all user data (profile + verification history) into a
 * JSON-serializable object for GDPR data portability export.
 *
 * Called from: GET /api/user/export (API route, server-side only)
 *
 * @param userId - The authenticated user's UUID
 * @returns GdprExportData object or null if user not found
 */
export async function exportUserData(
  userId: string
): Promise<GdprExportData | null> {
  const adminClient = createAdminClient();

  // Fetch profile
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('GDPR export: profile not found for user', userId);
    return null;
  }

  // Fetch all verifications belonging to this user
  const { data: verifications, error: verificationsError } = await adminClient
    .from('verifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (verificationsError) {
    console.error('GDPR export: failed to fetch verifications', verificationsError.message);
    return null;
  }

  return {
    profile,
    verifications: verifications ?? [],
    exportedAt: new Date().toISOString(),
    format: 'verifact-gdpr-export-v1',
  };
}

/**
 * Requests account deletion by calling the database RPC function
 * `request_account_deletion`, which anonymizes public verifications
 * and deletes private data. The caller MUST also delete the user
 * from auth.users via the Supabase admin auth API.
 *
 * Flow:
 * 1. Call this function from DELETE /api/user/delete API route
 * 2. RPC anonymizes public verifications (user_id = NULL)
 * 3. RPC deletes private verifications, subscriptions, disputes
 * 4. RPC deletes the profile row
 * 5. Caller deletes from auth.users (handled separately)
 *
 * @param userId - The authenticated user's UUID
 * @returns Object with success status and optional error message
 */
export async function requestAccountDeletion(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  // Step 1: Execute the GDPR deletion RPC
  // NOTE: supabase-js's `.rpc()` generic overload fails to infer `Args`
  // correctly against this hand-maintained Database type (a known friction
  // point with its conditional generic defaults) and reports the parameter
  // as `undefined` even though the RPC genuinely expects
  // `{ target_user_id: string }` (see supabase/migrations/0009_rls_policies.sql).
  // We cast to the method's own (mis-inferred) parameter type rather than to
  // `any`, so this stays self-correcting if supabase-js fixes the inference.
  const rpcArgs = { target_user_id: userId } satisfies
    Database['public']['Functions']['request_account_deletion']['Args'];
  const { error: rpcError } = await adminClient.rpc(
    'request_account_deletion',
    rpcArgs as unknown as Parameters<typeof adminClient.rpc>[1]
  );

  if (rpcError) {
    console.error('GDPR deletion RPC failed:', rpcError.message);
    return { success: false, error: rpcError.message };
  }

  // Step 2: Delete from auth.users
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

  if (authError) {
    console.error('Auth user deletion failed:', authError.message);
    return {
      success: false,
      error: `Profile data deleted but auth user deletion failed: ${authError.message}`,
    };
  }

  return { success: true };
}
