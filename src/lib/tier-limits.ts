export const TIER_LIMITS = {
  free: { verificationsPerMonth: 10 },
  pro: { verificationsPerMonth: 200 },
  business: { verificationsPerMonth: 2000 },
} as const;

export type Tier = keyof typeof TIER_LIMITS;

export function canUserVerify(
  tier: Tier = 'free',
  verificationsCount: number = 0,
  verificationsReset: Date | string = new Date()
): { allowed: boolean; remaining: number; resetsAt: Date } {
  const limitObj = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const limit = limitObj.verificationsPerMonth;

  const resetDateObj = typeof verificationsReset === 'string' ? new Date(verificationsReset) : verificationsReset;
  const now = new Date();

  // If reset date is in past month, count resets
  let current = verificationsCount;
  if (now.getMonth() !== resetDateObj.getMonth() || now.getFullYear() !== resetDateObj.getFullYear()) {
    current = 0;
  }

  const remaining = Math.max(0, limit - current);
  const allowed = current < limit;

  // Next reset date is 1st of next month
  const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    allowed,
    remaining,
    resetsAt,
  };
}
