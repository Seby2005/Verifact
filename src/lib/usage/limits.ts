import { createClient as createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { TIER_CONFIG } from '@/types/user';
import type { UsageLimitCheck, UserTier } from '@/types/user';

interface ProfileRecord {
  tier?: string | null;
  verifications_count?: number | null;
  verifications_reset?: string | null;
}

function getFirstOfNextMonth(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
    .toISOString()
    .split('T')[0];
}

export async function checkUsageLimit(userId: string): Promise<UsageLimitCheck> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('tier, verifications_count, verifications_reset')
    .eq('id', userId)
    .single();

  // PGRST116 is .single()'s "no rows matched", handled as a missing profile
  // below. Any other error means the read itself failed (RLS, connectivity,
  // schema), and must not be reported as "0 used" — that renders as a
  // confident, wrong quota in the account panel and hides the real fault.
  // Throwing surfaces it as a 500 the panel shows as "—" instead.
  if (error && error.code !== 'PGRST116') {
    logger.error('Failed to read profile for usage check', {
      service: 'usage/limits',
      operation: 'checkUsageLimit',
      error: error.message,
      code: error.code,
    });
    throw new Error(`Usage lookup failed: ${error.message}`);
  }

  const profile = data as ProfileRecord | null;
  const today = new Date().toISOString().split('T')[0];

  if (!profile) {
    return {
      allowed: true,
      current: 0,
      limit: TIER_CONFIG.free.monthlyLimit,
      resetDate: today,
      tier: 'free',
      percentageUsed: 0,
    };
  }

  const resetDate = profile.verifications_reset || today;
  let currentCount = profile.verifications_count || 0;

  if (resetDate && today > resetDate) {
    const firstOfNextMonth = getFirstOfNextMonth();
    await supabase
      .from('profiles')
      .update({
        verifications_count: 0,
        verifications_reset: firstOfNextMonth,
      } as never)
      .eq('id', userId);
    currentCount = 0;
  }

  const tier = (profile.tier as UserTier) || 'free';
  const limit = TIER_CONFIG[tier]?.monthlyLimit ?? 10;
  const allowed = currentCount < limit;

  return {
    allowed,
    current: currentCount,
    limit,
    resetDate,
    tier,
    percentageUsed: Math.min(100, Math.round((currentCount / limit) * 100)),
  };
}

// Note: incrementing usage lives in src/lib/verification/db-operations.ts
// (reserveUsageSlot/releaseUsageSlot), which does the check-and-increment
// atomically via the reserve_usage_slot Postgres RPC. This module is
// read-only (used by GET /api/user/usage to display current usage) and
// intentionally does not write to verifications_count — a previous version
// of this function did, via a non-atomic select-then-update calling an RPC
// that was never defined in any migration, which was both dead code and,
// had anything called it, subject to the same race this file's sibling now
// closes.
