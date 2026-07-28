import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createAdminClient } from '@/lib/supabase/admin';
import { createContentHash } from '@/lib/utils/hash';
import { logger } from '@/lib/utils/logger';

export interface FileDisputeParams {
  verificationId: string;
  reason: string;
  email: string | null;
  userId: string | null;
}

export type FileDisputeResult =
  | { success: true }
  | { success: false; status: 404 | 403 | 500; error: string };

interface VerificationForDispute {
  id: string;
  user_id: string | null;
  is_public: boolean;
  input_text: string;
  language: string;
}

/**
 * Core logic behind POST /api/reports/[id]/dispute, split out of the route
 * handler so it's unit-testable without constructing a fake NextRequest —
 * same shape as saveVerification/reserveUsageSlot in db-operations.ts.
 *
 * `supabase` must be the caller's request-scoped client (so the visibility
 * check and the disputes insert run under the caller's own RLS context —
 * see the INSERT policy in supabase/migrations/005_disputes.sql, which
 * mirrors the visibility check below at the database level too). The
 * flag-as-disputed and cache-invalidation steps use the admin client
 * internally, since the disputer may not own the report they're disputing.
 */
export async function fileDispute(
  params: FileDisputeParams,
  supabase: SupabaseClient<Database>
): Promise<FileDisputeResult> {
  const { data: verificationData, error: fetchError } = await supabase
    .from('verifications')
    .select('id, user_id, is_public, input_text, language')
    .eq('id', params.verificationId)
    .single();

  if (fetchError || !verificationData) {
    return { success: false, status: 404, error: 'Raportul nu a fost găsit.' };
  }

  const verification = verificationData as VerificationForDispute;

  if (!verification.is_public && verification.user_id !== params.userId) {
    return { success: false, status: 403, error: 'Nu ai acces la acest raport.' };
  }

  const insertData = {
    verification_id: verification.id,
    reporter_email: params.email,
    reporter_user_id: params.userId,
    reason: params.reason,
    resolved_by: null,
    resolution_note: null,
  };

  const { error: insertError } = await supabase.from('disputes').insert(insertData as never);

  if (insertError) {
    logger.error('Failed to record dispute', { service: 'Disputes', error: insertError.message });
    return {
      success: false,
      status: 500,
      error: 'A apărut o eroare la înregistrarea contestației. Te rugăm să încerci din nou.',
    };
  }

  await flagAndInvalidate(verification);

  return { success: true };
}

/**
 * Flags the verification as disputed and expires its cached_results entry
 * (if any) so it's never served from cache again. Best-effort: the dispute
 * itself is already recorded by the time this runs, so a failure here is
 * logged, not surfaced as a request failure.
 */
async function flagAndInvalidate(verification: VerificationForDispute): Promise<void> {
  const admin = createAdminClient();

  const { error: flagError } = await admin
    .from('verifications')
    .update({ disputed: true } as never)
    .eq('id', verification.id);

  if (flagError) {
    logger.error('Failed to flag verification as disputed', { service: 'Disputes', error: flagError.message });
  }

  const contentHash = createContentHash(verification.input_text, verification.language);
  const { data: cachedRow } = await admin
    .from('cached_results')
    .select('disputed_count')
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (!cachedRow) return;

  const currentCount = (cachedRow as { disputed_count: number }).disputed_count ?? 0;
  const { error: cacheError } = await admin
    .from('cached_results')
    .update({
      disputed_count: currentCount + 1,
      // Force immediate expiry so getCached() (src/lib/verification/cache.ts,
      // filters on `expires_at > now`) never serves this disputed result again.
      expires_at: new Date(0).toISOString(),
    } as never)
    .eq('content_hash', contentHash);

  if (cacheError) {
    logger.error('Failed to invalidate cache entry', { service: 'Disputes', error: cacheError.message });
  }
}
