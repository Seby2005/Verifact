import { createClient as createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { TIER_CONFIG } from '@/types/user';
import type { UsageLimitCheck, UserTier } from '@/types/user';

interface ProfileRecord {
  tier?: string | null;
  verifications_count?: number | null;
  verifications_reset?: string | null;
  role?: string | null;
}

/**
 * Single source of truth for who is exempt from the monthly verification cap.
 * Admins are unlimited so the project owner can test freely; both the usage
 * display (this module) and the enforcement path (/api/verify) call this so the
 * rule can never drift between the two.
 */
export function hasUnlimitedUsage(role?: string | null, email?: string | null): boolean {
  if (role === 'admin') return true;
  if (email) {
    const norm = email.trim().toLowerCase();
    if (norm === 'sebi.iancu23@gmail.com') return true;
    if (process.env.ADMIN_EMAILS) {
      const adminEmails = process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase());
      if (adminEmails.includes(norm)) return true;
    }
  }
  return false;
}

export async function checkUsageLimit(userId: string): Promise<UsageLimitCheck> {
  const supabase = await createServerClient();
  let userEmail: string | undefined;
  try {
    const authRes = await supabase.auth?.getUser();
    userEmail = authRes?.data?.user?.email;
  } catch {
    // optional auth in tests
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('tier, verifications_count, verifications_reset, role')
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
      ...(hasUnlimitedUsage(null, userEmail) ? { unlimited: true } : {}),
    };
  }

  const resetDate = profile.verifications_reset || today;
  let currentCount = profile.verifications_count || 0;

  // Read-only: on month rollover the enforcement path (reserve_usage_slot)
  // performs the actual reset on its next write. Reflect it in the displayed
  // count without persisting — writing here raced that RPC and reset the
  // enforced counter from a mere page view (a free-cap bypass).
  if (resetDate && today > resetDate) {
    currentCount = 0;
  }

  const tier = (profile.tier as UserTier) || 'free';
  const limit = TIER_CONFIG[tier]?.monthlyLimit ?? TIER_CONFIG.free.monthlyLimit;

  // Admins are uncapped — report it as such rather than as a number the panel
  // would otherwise render as "N of 3".
  if (hasUnlimitedUsage(profile.role, userEmail)) {
    return {
      allowed: true,
      current: currentCount,
      limit,
      resetDate,
      tier,
      percentageUsed: 0,
      unlimited: true,
    };
  }

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
