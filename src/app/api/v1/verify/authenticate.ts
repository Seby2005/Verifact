import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { UserTier } from '@/types/user';
import { reserveUsageSlot, reserveUsageSlotFor, releaseUsageSlot } from '@/lib/verification/db-operations';
import { checkAnonymousLimit } from '@/lib/usage/anonymous-limit';
import { hasUnlimitedUsage } from '@/lib/usage/limits';
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
  | { kind: 'apikey'; userId: string; keyId: string; tier: UserTier }
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

/** Fixed agent string for anonymous API callers, so their allowance is per IP. */
const ANONYMOUS_API_AGENT = 'verifact-api-v1';

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
    // A key may only do what its scopes say. 'verify' is the one operation
    // there is today; checking it now keeps the contract's promise real.
    if (!resolved.scopes.includes('verify')) return { kind: 'forbidden' };
    return { kind: 'apikey', userId: resolved.userId, keyId: resolved.keyId, tier: resolved.tier };
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
  /** The quota could not be checked; the route answers 503, not USAGE_LIMIT. */
  unavailable?: boolean;
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
 * are capped per IP. Admins/unlimited never consume a slot.
 */
export async function reserveSlot(caller: ActiveCaller): Promise<SlotResult> {
  if (caller.kind === 'anonymous') {
    // Per IP only: the programmatic API has no Turnstile, so a free User-Agent
    // header must not mint a fresh anonymous allowance on every request.
    const check = await checkAnonymousLimit(caller.ip, ANONYMOUS_API_AGENT);
    return {
      allowed: check.allowed,
      tier: 'free',
      remaining: check.allowed ? Math.max(0, check.limit - 1) : 0,
      anonymousHash: check.hash,
      freeLimit: check.limit,
      unavailable: check.unavailable,
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
      unavailable: r.unavailable,
    };
  }

  // apikey (business): metered through the service-role reserve_usage_slot_for.
  const r = await reserveUsageSlotFor(caller.userId);
  return {
    allowed: r.allowed,
    tier: caller.tier,
    remaining: r.unavailable ? null : computeRemaining(caller.tier, r.limit, r.used),
    unavailable: r.unavailable,
  };
}

/**
 * Refunds a slot reserved by reserveSlot() that produced no work (cache hit or
 * a verification that failed). Anonymous and unlimited callers reserved
 * nothing, so this is a no-op for them.
 */
export async function releaseSlot(caller: ActiveCaller): Promise<void> {
  if ((caller.kind === 'user' && !caller.unlimited) || caller.kind === 'apikey') {
    await releaseUsageSlot(caller.userId);
  }
}
