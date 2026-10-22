import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type { VerificationReport } from '@/types/verification';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

/**
 * Saves a verification report to the Supabase 'verifications' table.
 * Uses createAdminClient to ensure backend-generated verifications are always
 * saved safely, bypassing client RLS restrictions.
 */
export async function saveVerification(
  report: VerificationReport,
  userClient?: SupabaseClient<Database>,
  anonymousHash?: string
): Promise<boolean> {
  let client: SupabaseClient<Database>;
  try {
    client = createAdminClient();
  } catch {
    client = (userClient || createAdminClient()) as SupabaseClient<Database>;
  }

  const insertData = {
    id: report.id,
    user_id: report.userId ?? null,
    anonymous_hash: report.userId ? null : anonymousHash ?? null,
    input_type: report.inputType,
    input_text: report.inputText.slice(0, 2000),
    input_url: null,
    verdict: report.verdict,
    score: report.score,
    report_json: report as unknown as Record<string, unknown>,
    is_public: report.isPublic,
    language: report.language || 'ro',
    processing_time_ms: report.processingTime,
    input_tokens: report.tokenUsage?.inputTokens ?? 0,
    output_tokens: report.tokenUsage?.outputTokens ?? 0,
  };

  const { error } = await (client.from('verifications') as unknown as {
    insert: (data: typeof insertData) => Promise<{ error: { message: string } | null }>;
  }).insert(insertData);

  if (error) {
    logger.error('Failed to save verification', {
      service: 'db-operations',
      operation: 'saveVerification',
      reportId: report.id,
      error: error.message,
    });
    return false;
  }

  // Insert per-call verification cost details if present
  if (report.tokenUsage?.details && report.tokenUsage.details.length > 0) {
    const costRows = report.tokenUsage.details.map((d) => ({
      verification_id: report.id,
      provider: d.provider,
      model: d.model,
      step: d.step,
      input_tokens: d.inputTokens,
      output_tokens: d.outputTokens,
    }));

    const { error: costError } = await (client.from('verification_costs') as unknown as {
      insert: (data: typeof costRows) => Promise<{ error: { message: string } | null }>;
    }).insert(costRows);

    if (costError) {
      logger.warn('Failed to insert verification_costs log', {
        service: 'db-operations',
        reportId: report.id,
        error: costError.message,
      });
    }
  }

  return true;
}

export interface UsageReservation {
  allowed: boolean;
  limit: number;
  used: number;
  /**
   * The quota could not be checked (RPC error or no answer). The reservation
   * is refused rather than waved through: verifications cost real money, so an
   * outage of the meter must not turn into unlimited free use. Callers answer
   * with a retry-later error, not with the usage-limit message.
   */
  unavailable?: boolean;
}

const UNAVAILABLE: UsageReservation = { allowed: false, limit: 0, used: 0, unavailable: true };

type UsageRow = { allowed: boolean; usage_limit: number; used: number };

/**
 * Atomically checks the caller's monthly usage limit and, if allowed,
 * reserves a slot by incrementing verifications_count — in a single
 * Postgres statement (see supabase/migrations/002_atomic_usage_rpc.sql).
 *
 * This replaces the previous checkUsageLimit()+incrementUsageCount() pair,
 * which read the count in the API route and wrote it back later: two
 * concurrent requests could both read a count under the limit, both pass,
 * and both increment, letting usage exceed the tier limit.
 *
 * Call this BEFORE running a verification. If no work is done for it (cache
 * hit, verification failure), call releaseUsageSlot() to roll it back — see
 * /api/verify/route.ts.
 *
 * The RPC identifies the caller via auth.uid() from the request's JWT, not
 * a passed-in id, so a caller can only ever reserve against their own row.
 */
export async function reserveUsageSlot(
  supabase: SupabaseClient<Database>
): Promise<UsageReservation> {
  // supabase-js's generated-types inference for a TABLE(...)-returning,
  // zero-arg RPC doesn't resolve cleanly without SetofOptions metadata that
  // only `supabase gen types` produces (this Database type is hand-maintained
  // — see types/database.ts's header comment); the explicit cast below pins
  // the shape the migration's RETURNS TABLE(...) actually produces.
  const { data, error } = await supabase.rpc('reserve_usage_slot') as unknown as {
    data: UsageRow[] | null;
    error: { message: string } | null;
  };

  return toReservation(data, error, 'reserveUsageSlot');
}

/**
 * reserveUsageSlot() for a caller identified by id rather than by a session
 * (API keys). Goes through the service-role-only reserve_usage_slot_for RPC.
 */
export async function reserveUsageSlotFor(userId: string): Promise<UsageReservation> {
  try {
    const admin = createAdminClient();
    // .bind(): supabase-js's rpc() reads this.rest, so a detached call throws.
    const rpc = admin.rpc.bind(admin) as unknown as (
      fn: 'reserve_usage_slot_for',
      args: { p_user_id: string }
    ) => Promise<{ data: UsageRow[] | null; error: { message: string } | null }>;
    const { data, error } = await rpc('reserve_usage_slot_for', { p_user_id: userId });
    return toReservation(data, error, 'reserveUsageSlotFor');
  } catch (err) {
    return toReservation(null, { message: err instanceof Error ? err.message : String(err) }, 'reserveUsageSlotFor');
  }
}

function toReservation(
  data: UsageRow[] | null,
  error: { message: string } | null,
  operation: string
): UsageReservation {
  const row = data?.[0];
  if (error || !row) {
    logger.error('Usage reservation RPC failed, refusing the request', {
      service: 'db-operations',
      operation,
      error: error?.message ?? 'no row returned',
    });
    return UNAVAILABLE;
  }
  return { allowed: row.allowed, limit: row.usage_limit, used: row.used };
}

/**
 * Rolls back a usage reservation that produced no work (cache hit, or a
 * verification that failed before finishing).
 *
 * Runs through the service-role-only release_usage_slot_for RPC. The older
 * release_usage_slot() was callable by any signed-in browser straight through
 * PostgREST, which let a user reset their own monthly counter at will;
 * migration 021 takes it away from them, and nothing here depends on it.
 */
export async function releaseUsageSlot(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const rpc = admin.rpc.bind(admin) as unknown as (
      fn: 'release_usage_slot_for',
      args: { p_user_id: string }
    ) => Promise<{ error: { message: string } | null }>;
    const { error } = await rpc('release_usage_slot_for', { p_user_id: userId });
    if (error) {
      logger.error('release_usage_slot_for RPC failed', {
        service: 'db-operations',
        operation: 'releaseUsageSlot',
        error: error.message,
      });
    }
  } catch (err) {
    logger.error('releaseUsageSlot failed', {
      service: 'db-operations',
      operation: 'releaseUsageSlot',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
