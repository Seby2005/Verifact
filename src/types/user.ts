export type UserTier = 'free' | 'pro' | 'business';

export interface UsageLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  resetDate: string;
  tier: UserTier;
  percentageUsed: number;
  /**
   * True when the account is exempt from the monthly cap (admin role). Present
   * only in that case, so callers can render "unlimited" instead of a number.
   */
  unlimited?: boolean;
}

/**
 * Single source of truth for monthly verification limits. Pro is deliberately
 * 10× Free (the pricing page leans on that ratio). Business is bespoke — sold
 * by email, not self-serve — so its number is a generous placeholder, never
 * shown as a figure on the pricing page.
 */
export const TIER_CONFIG = {
  free: { monthlyLimit: 3 },
  pro: { monthlyLimit: 30 },
  business: { monthlyLimit: 1000 },
} as const;
