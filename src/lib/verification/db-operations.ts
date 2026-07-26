import type { SupabaseClient } from '@supabase/supabase-js';
import type { VerificationReport } from '@/types/verification';
import type { Database } from '@/types/database';

/**
 * Saves a verification report to the Supabase 'verifications' table.
 * Returns whether the write succeeded so callers can decide whether the
 * usage slot charged for it should be kept or released.
 */
export async function saveVerification(
  report: VerificationReport,
  supabase: SupabaseClient<Database>,
  anonymousHash?: string
): Promise<boolean> {
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
    processing_time: report.processingTime,
  };

  const { error } = await (supabase.from('verifications') as unknown as {
    insert: (data: typeof insertData) => Promise<{ error: { message: string } | null }>;
  }).insert(insertData);

  if (error) {
    console.error('[DB] Failed to save verification:', error.message);
    return false;
  }

  return true;
}

export interface UsageReservation {
  allowed: boolean;
  limit: number;
  used: number;
}

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
 * Call this BEFORE running a verification. If the reservation is not
 * actually consumed (cache hit, verification failure, save failure), call
 * releaseUsageSlot() to roll it back — see /api/verify/route.ts.
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
    data: { allowed: boolean; usage_limit: number; used: number }[] | null;
    error: { message: string } | null;
  };

  if (error) {
    console.error('[DB] reserve_usage_slot failed:', error.message);
    // Fail open (mirrors the previous behaviour when the profile lookup
    // errored) rather than blocking every verification on an RPC hiccup.
    return { allowed: true, limit: 10, used: 0 };
  }

  const row = data?.[0];
  if (!row) {
    return { allowed: true, limit: 10, used: 0 };
  }

  return { allowed: row.allowed, limit: row.usage_limit, used: row.used };
}

/**
 * Rolls back a usage reservation made by reserveUsageSlot() that was not
 * consumed by an actual, saved verification.
 */
export async function releaseUsageSlot(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { error } = await supabase.rpc('release_usage_slot');
  if (error) {
    console.error('[DB] release_usage_slot failed:', error.message);
  }
}
