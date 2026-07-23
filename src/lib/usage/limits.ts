import { createClient as createServerClient } from '@/lib/supabase/server';
import { TIER_CONFIG } from '@/types/user';
import type { UsageLimitCheck, UserTier } from '@/types/user';

function getFirstOfNextMonth(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
    .toISOString()
    .split('T')[0];
}

export async function checkUsageLimit(userId: string): Promise<UsageLimitCheck> {
  const supabase = createServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, verifications_count, verifications_reset')
    .eq('id', userId)
    .single();

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
      })
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
  const { error } = await supabase.rpc('increment_verifications_count', { user_id: userId });
  if (error) {
    const { data } = await supabase
      .from('profiles')
      .select('verifications_count')
      .eq('id', userId)
      .single();
    if (data) {
      await supabase
        .from('profiles')
        .update({ verifications_count: (data.verifications_count || 0) + 1 })
        .eq('id', userId);
    }
  }
}
