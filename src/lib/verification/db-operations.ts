import type { SupabaseClient } from '@supabase/supabase-js';
import type { VerificationReport } from '@/types/verification';
import type { Database, Profile } from '@/types/database';

// Explicitly typed row types to avoid 'never' inference
type ProfileRow = Pick<Profile, 'tier' | 'verifications_count' | 'verifications_reset'>;

/**
 * Saves a verification report to the Supabase 'verifications' table.
 */
export async function saveVerification(
  report: VerificationReport,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const insertData = {
    id: report.id,
    user_id: report.userId ?? null,
    input_type: report.inputType,
    input_text: report.inputText.slice(0, 2000),
    input_url: null,
    verdict: report.verdict,
    score: report.score,
    report_json: report as unknown as Record<string, unknown>,
    is_public: report.isPublic,
    language: report.language || 'ro',
    processing_time_ms: report.processingTime,
    status: 'completed' as const,
  };

  const { error } = await (supabase.from('verifications') as unknown as {
    insert: (data: typeof insertData) => Promise<{ error: { message: string } | null }>;
  }).insert(insertData);

  if (error) {
    console.error('[DB] Failed to save verification:', error.message);
  }
}

/**
 * Checks if a user has exceeded their monthly verification limit.
 */
export async function checkUsageLimit(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<{ allowed: boolean; limit: number; used: number }> {
  const TIER_LIMITS: Record<string, number> = { free: 10, pro: 200, business: 2000 };

  const result = await supabase
    .from('profiles')
    .select('tier, verifications_count, verifications_reset')
    .eq('id', userId)
    .single();

  const profile = result.data as ProfileRow | null;
  const error = result.error;

  if (error || !profile) {
    return { allowed: true, limit: 10, used: 0 };
  }

  const tier = (profile.tier as string) ?? 'free';
  const limit = TIER_LIMITS[tier] ?? 10;

  const resetDate = new Date(profile.verifications_reset as string);
  const now = new Date();
  const isNewMonth =
    now.getFullYear() !== resetDate.getFullYear() ||
    now.getMonth() !== resetDate.getMonth();

  if (isNewMonth) {
    await supabase
      .from('profiles')
      .update({ verifications_count: 0, verifications_reset: now.toISOString() } as never)
      .eq('id', userId);
    return { allowed: true, limit, used: 0 };
  }

  const used = (profile.verifications_count as number) ?? 0;
  return { allowed: used < limit, limit, used };
}

/**
 * Increments a user's monthly verification usage counter.
 */
export async function incrementUsageCount(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const result = await supabase
    .from('profiles')
    .select('verifications_count')
    .eq('id', userId)
    .single();

  const data = result.data as Pick<Profile, 'verifications_count'> | null;
  if (!data) return;

  const currentCount = (data.verifications_count as number) ?? 0;
  await supabase
    .from('profiles')
    .update({ verifications_count: currentCount + 1 } as never)
    .eq('id', userId);
}