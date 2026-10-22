import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Epoch milliseconds, matching the previous in-memory implementation. */
  reset: number;
}

/**
 * Checks and consumes one request against a shared rate-limit bucket.
 *
 * Backed by the check_rate_limit Postgres RPC (see
 * supabase/migrations/003_rate_limits.sql), which does an atomic
 * check-and-increment under a row lock. This replaces a previous in-memory
 * Map, which reset on every cold start and gave each serverless instance
 * its own independent counter — on Vercel that meant the limit was
 * effectively unenforced under real, multi-instance traffic.
 *
 * The RPC is called with the service-role client: it takes the key, limit and
 * window as arguments, so it must never be callable straight from a browser
 * with the public anon key (migration 021 revokes that). Without the service
 * key (local tests) it falls back to the request's own client.
 *
 * When the database cannot answer, the request is counted against a
 * per-instance bucket instead of being waved through: a Supabase hiccup then
 * degrades the limit rather than removing it, without blocking real users.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createServerClient();
    // Cast for the same reason as reserveUsageSlot() in db-operations.ts:
    // this Database type is hand-maintained (no `supabase gen types` run in
    // this project), and supabase-js's generic RPC typing doesn't resolve a
    // TABLE(...)-returning function's args/row shape without SetofOptions
    // metadata that only the generator produces. Casting the method itself
    // (rather than just its result) is needed here because check_rate_limit
    // takes real arguments, so the generic mismatch surfaces at the call's
    // argument position, not only in the return type.
    // .bind() is load-bearing, not stylistic: supabase-js's rpc() reads
    // this.rest internally, so detaching the method from the client makes
    // every call throw "Cannot read properties of undefined (reading 'rest')".
    const rpc = supabase.rpc.bind(supabase) as unknown as (
      fn: 'check_rate_limit',
      args: { p_key: string; p_limit: number; p_window_ms: number }
    ) => Promise<{
      data: { allowed: boolean; remaining: number; reset_at: string }[] | null;
      error: { message: string } | null;
    }>;

    const { data, error } = await rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error) {
      logger.error('check_rate_limit failed, using the in-memory fallback', { service: 'RateLimit', error: error.message });
      return checkLocally(key, limit, windowMs);
    }

    const row = data?.[0];
    if (!row) {
      return checkLocally(key, limit, windowMs);
    }

    return {
      success: row.allowed,
      remaining: row.remaining,
      reset: new Date(row.reset_at).getTime(),
    };
  } catch (error) {
    logger.error('unexpected error, using the in-memory fallback', { service: 'RateLimit', error: error instanceof Error ? error.message : String(error) });
    return checkLocally(key, limit, windowMs);
  }
}

/**
 * A rate-limit key for an account rather than an address: the email is hashed
 * so addresses never sit in plain text in the rate_limits table.
 */
export function accountKey(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
}

const MAX_LOCAL_KEYS = 10_000;
const localBuckets = new Map<string, { count: number; reset: number }>();

/** Per-instance fallback with the same semantics as check_rate_limit. */
function checkLocally(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = localBuckets.get(key);
  if (!bucket || now > bucket.reset) {
    if (localBuckets.size >= MAX_LOCAL_KEYS) {
      for (const [k, b] of localBuckets) {
        if (now > b.reset) localBuckets.delete(k);
      }
      if (localBuckets.size >= MAX_LOCAL_KEYS) localBuckets.clear();
    }
    bucket = { count: 0, reset: now + windowMs };
    localBuckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, reset: bucket.reset };
  }
  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, reset: bucket.reset };
}
