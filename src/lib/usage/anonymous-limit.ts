import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Maximum number of verifications allowed for anonymous users
 * within the rolling window period.
 */
const ANONYMOUS_MAX_VERIFICATIONS = 3;

/**
 * Rolling window in days for anonymous verification limit.
 */
const ANONYMOUS_WINDOW_DAYS = 30;

/**
 * Computes a SHA-256 hash of the IP address + normalized user-agent string.
 * Used to identify anonymous users for rate limiting purposes.
 *
 * LIMITATIONS (documented honestly):
 * - Users behind shared NAT (offices, universities, mobile carriers) will
 *   share an IP, potentially causing false positives for rate limiting.
 * - VPN users can bypass this by changing servers.
 * - User-agent can be spoofed, though combining it with IP raises the
 *   effort bar significantly compared to localStorage-only checks.
 *
 * This is NOT a perfect solution — nothing short of mandatory account
 * creation can be 100% robust. But it raises the effort required for
 * abuse far above a simple localStorage check that can be cleared.
 */
export async function computeAnonymousHash(
  ip: string,
  userAgent: string
): Promise<string> {
  const normalizedUA = userAgent.toLowerCase().trim();
  const raw = `${ip}|${normalizedUA}`;

  // Use Web Crypto API (available in Node.js 18+ and Edge Runtime)
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

interface AnonymousLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  windowDays: number;
  hash: string;
}

/**
 * Checks whether an anonymous user (identified by IP + User-Agent hash)
 * is allowed to perform another verification.
 *
 * Queries the verifications table server-side using the admin client
 * (bypasses RLS) to count verifications with the same anonymous_hash
 * within the rolling window.
 *
 * @param ip - The client IP address (from request headers)
 * @param userAgent - The client User-Agent string
 * @returns Object with allowed status, current count, and limit info
 */
export async function checkAnonymousLimit(
  ip: string,
  userAgent: string
): Promise<AnonymousLimitResult> {
  const hash = await computeAnonymousHash(ip, userAgent);
  const adminClient = createAdminClient();

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - ANONYMOUS_WINDOW_DAYS);

  const { count, error } = await adminClient
    .from('verifications')
    .select('id', { count: 'exact', head: true })
    .eq('anonymous_hash', hash)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Failed to check anonymous verification limit:', error.message);
    // Fail open: allow the verification but log the error.
    // In production, you may want to fail closed instead.
    return {
      allowed: true,
      current: 0,
      limit: ANONYMOUS_MAX_VERIFICATIONS,
      windowDays: ANONYMOUS_WINDOW_DAYS,
      hash,
    };
  }

  const current = count ?? 0;

  return {
    allowed: current < ANONYMOUS_MAX_VERIFICATIONS,
    current,
    limit: ANONYMOUS_MAX_VERIFICATIONS,
    windowDays: ANONYMOUS_WINDOW_DAYS,
    hash,
  };
}
