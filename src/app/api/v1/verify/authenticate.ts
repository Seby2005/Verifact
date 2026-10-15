import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { UserTier } from '@/types/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { reserveUsageSlot, releaseUsageSlot } from '@/lib/verification/db-operations';
import { checkAnonymousLimit } from '@/lib/usage/anonymous-limit';
import { hasUnlimitedUsage } from '@/lib/usage/limits';
import { logger } from '@/lib/utils/logger';
import { getClientIp } from '@/lib/utils/client-ip';

// ---------------------------------------------------------------------------
// Track A dependencies. These two symbols are the ONLY things this endpoint
// needs from the API-key foundation; everything else (metering RPCs, service
// client) already exists. Until Track A lands, this file is the single place
// that won't compile — that is intentional, per the A -> B -> C merge order in
// docs/api/CONTRACT_v1.md.
//   createClientFromToken(accessToken): a Supabase server client whose
//     Authorization header is the given Supabase JWT (so auth.getUser() and the
//     auth.uid()-based reserve_usage_slot() resolve to that user).
//   authenticateApiKey(rawKey): resolves a `vf_live_...` key to its owner, or
//     null if unknown/revoked.
import { createClientFromToken } from '@/lib/supabase/from-token';
import { authenticateApiKey } from '@/lib/auth/api-keys';

export type Caller =
  | { kind: 'anonymous'; ip: string; userAgent: string }
  | { kind: 'user'; userId: string; tier: UserTier; unlimited: boolean; client: SupabaseClient<Database> }
  | { kind: 'apikey'; userId: string; tier: UserTier }
  | { kind: 'invalid' }
  | { kind: 'forbidden' };

/** A caller the route has accepted — the reservable subset of Caller. */
export type ActiveCaller = Extract<Caller, { kind: 'anonymous' | 'user' | 'apikey' }>;

function bearer(request: Request): string | null {
  const h = request.headers.get('authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

function clientIp(request: Request): string {
  return getClientIp(request);
}

/**
 * Resolves who is calling from the Authorization header (see CONTRACT_v1 §2):
 * a `vf_live_...` API key, a Supabase session JWT, or — with no header —
 * anonymous. A present-but-unresolvable token is `invalid` (a 401), never a
 * silent anonymous fallback.
 */
export async function authenticateCaller(request: Request): Promise<Caller> {
  const token = bearer(request);

  if (!token) {
    return {
      kind: 'anonymous',
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    };
  }

  // API key path: keys are `vf_...`; anything else is treated as a JWT.
  if (token.startsWith('vf_')) {
    const resolved = await authenticateApiKey(token);
    if (!resolved) return { kind: 'invalid' };
    // Only Business may use programmatic keys; a downgraded account's key is
    // rejected rather than silently metered at a lower tier.
    if (resolved.tier !== 'business') return { kind: 'forbidden' };
    return { kind: 'apikey', userId: resolved.userId, tier: resolved.tier };
  }

  // Supabase JWT path (extension logged-in Pro/Business).
  const client = createClientFromToken(token);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { kind: 'invalid' };

  const { data: profile } = await client
    .from('profiles')
    .select('tier, role')
    .eq('id', user.id)
    .single();
  const p = profile as { tier?: string | null; role?: string | null } | null;
  const tier = ((p?.tier as UserTier) ?? 'free') as UserTier;
  const unlimited = hasUnlimitedUsage(p?.role, user.email);

  return { kind: 'user', userId: user.id, tier, unlimited, client };
}

export interface SlotResult {
  allowed: boolean;
  tier: UserTier | 'free';
  /** Slots left this month. `null` for pro/anonymous/unlimited (see contract). */
  remaining: number | null;
  /** Set for anonymous callers; needed to attribute the saved report. */
  anonymousHash?: string;
  /** Number the free-tier limit message may print; undefined otherwise. */
  freeLimit?: number;
}

// The Pro cap is deliberately never surfaced as a number anywhere in the
// product; business and free may show remaining, pro may not.
function computeRemaining(tier: UserTier, limit: number, used: number): number | null {
  if (tier === 'pro') return null;
  return Math.max(0, limit - used);
}

/**
 * Checks-and-reserves one monthly slot for the caller, atomically where the
 * caller is metered. Mirrors /api/verify's reservation, dispatched by caller
 * kind: JWT users go through reserve_usage_slot() (auth.uid()); API keys go
 * through the service-role reserve_usage_slot_for(p_user_id); anonymous callers
 * are capped by IP+UA hash. Admins/unlimited never consume a slot.
 */
export async function reserveSlot(caller: ActiveCaller): Promise<SlotResult> {
  if (caller.kind === 'anonymous') {
    const check = await checkAnonymousLimit(caller.ip, caller.userAgent);
    return {
      allowed: check.allowed,
      tier: 'free',
      remaining: check.allowed ? Math.max(0, check.limit - 1) : 0,
      anonymousHash: check.hash,
      freeLimit: check.limit,
    };
  }

  if (caller.kind === 'user') {
    if (caller.unlimited) {
      return { allowed: true, tier: caller.tier, remaining: null };
    }
    const r = await reserveUsageSlot(caller.client);
    return {
      allowed: r.allowed,
      tier: caller.tier,
      remaining: computeRemaining(caller.tier, r.limit, r.used),
      freeLimit: caller.tier === 'free' ? r.limit : undefined,
    };
  }

  // apikey (business). The *_for RPCs are added by migration 018 (Track A);
  // until types/database.ts is regenerated to include them, call through a
  // loosened rpc signature.
  const admin = createAdminClient();
  const rpc = admin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{
    data: { allowed: boolean; usage_limit: number; used: number }[] | null;
    error: { message: string } | null;
  }>;
  const { data, error } = await rpc('reserve_usage_slot_for', { p_user_id: caller.userId });
  if (error) {
    // Fail open, matching reserveUsageSlot()'s behaviour on an RPC hiccup.
    logger.error('reserve_usage_slot_for RPC failed, failing open', {
      service: 'api/v1/verify',
      operation: 'reserveSlot',
      error: error.message,
    });
    return { allowed: true, tier: caller.tier, remaining: null };
  }
  const row = data?.[0];
  if (!row) return { allowed: true, tier: caller.tier, remaining: null };
  return {
    allowed: row.allowed,
    tier: caller.tier,
    remaining: computeRemaining(caller.tier, row.usage_limit, row.used),
  };
}

/**
 * Refunds a slot reserved by reserveSlot() that produced no saved report (cache
 * hit, verification failure, or save failure). Anonymous and unlimited callers
 * reserved nothing, so this is a no-op for them.
 */
export async function releaseSlot(caller: ActiveCaller): Promise<void> {
  if (caller.kind === 'user' && !caller.unlimited) {
    await releaseUsageSlot(caller.client);
    return;
  }
  if (caller.kind === 'apikey') {
    const admin = createAdminClient();
    const rpc = admin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ error: { message: string } | null }>;
    const { error } = await rpc('release_usage_slot_for', { p_user_id: caller.userId });
    if (error) {
      logger.error('release_usage_slot_for RPC failed', {
        service: 'api/v1/verify',
        operation: 'releaseSlot',
        error: error.message,
      });
    }
  }
}
