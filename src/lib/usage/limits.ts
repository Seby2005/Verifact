import { createClient as createServerClient } from '@/lib/supabase/server';
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

  const { data } = await supabase
    .from('profiles')
    .select('tier, verifications_count, verifications_reset')
    .eq('id', userId)
    .single();

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

export async function incrementUsageCount(userId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.rpc('increment_verifications_count' as never, { user_id: userId } as never);
  if (error) {
    const { data } = await supabase
      .from('profiles')
      .select('verifications_count')
      .eq('id', userId)
      .single();
    const profile = data as ProfileRecord | null;
    if (profile) {
      await supabase
        .from('profiles')
        .update({ verifications_count: (profile.verifications_count || 0) + 1 } as never)
        .eq('id', userId);
    }
  }
}
