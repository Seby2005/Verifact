import { createClient as createServerClient } from '@/lib/supabase/server';

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
 * Same interface as before (key, limit, windowMs) so callers only need to
 * add `await`; the return shape is unchanged too.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  try {
    const supabase = createServerClient();
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
    // every call throw "Cannot read properties of undefined (reading 'rest')"
    // — which the catch below swallowed into a permanent fail-open, i.e. no
    // rate limiting at all.
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
      console.error('[RateLimit] check_rate_limit failed:', error.message);
      // Fail open — a rate-limiter outage should not take the API down with it.
      return { success: true, remaining: limit, reset: Date.now() + windowMs };
    }

    const row = data?.[0];
    if (!row) {
      return { success: true, remaining: limit, reset: Date.now() + windowMs };
    }

    return {
      success: row.allowed,
      remaining: row.remaining,
      reset: new Date(row.reset_at).getTime(),
    };
  } catch (error) {
    console.error('[RateLimit] unexpected error:', error instanceof Error ? error.message : error);
    return { success: true, remaining: limit, reset: Date.now() + windowMs };
  }
}
