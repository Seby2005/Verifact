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
 * "over 10× Free" — the pricing page leans on that ratio and never prints a
 * number. The hard cap is 35, but the user is only *warned* once they pass the
 * `softLimit` of 30: the last five are a silent buffer, so neither 30 nor 35 is
 * ever shown as a figure anywhere in the product. Business is bespoke — sold by
 * email, not self-serve — so its number is a generous placeholder.
 */
export const TIER_CONFIG = {
  free: { monthlyLimit: 3 },
  pro: { monthlyLimit: 35, softLimit: 30 },
  business: { monthlyLimit: 1000 },
} as const;
