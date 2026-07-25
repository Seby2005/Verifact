export type UserTier = 'free' | 'pro' | 'business';

export interface UsageLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  resetDate: string;
  tier: UserTier;
  percentageUsed: number;
}

export const TIER_CONFIG = {
  free: { monthlyLimit: 10 },
  pro: { monthlyLimit: 200 },
  business: { monthlyLimit: 2000 },
} as const;
