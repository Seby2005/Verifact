/**
 * Simple per-service circuit breaker.
 *
 * After `failureThreshold` consecutive failures for a named service, the
 * circuit "opens": further calls fail immediately (CircuitOpenError) without
 * attempting the network call, for `cooldownMs`. After the cooldown, one
 * trial call is let through (half-open) — success closes the circuit again,
 * failure re-opens it.
 *
 * This protects against wasting the search layers' 10s-per-layer budget
 * (see orchestrator.ts's LAYER_TIMEOUT_MS) retrying a service that is
 * currently down, and avoids hammering a struggling external API.
 *
 * LIMITATION: state is held in an in-memory Map, per the v1 scope agreed
 * for this feature. On Vercel each serverless instance has its own Map, so
 * the breaker is effectively "per instance" — an outage is detected
 * independently (and the failure threshold effectively multiplied) by each
 * warm instance handling traffic, rather than shared globally the way
 * reserve_usage_slot/check_rate_limit are backed by Postgres. That's an
 * acceptable tradeoff here: unlike usage limits or rate limiting, an
 * imperfectly-shared circuit breaker degrades to "slightly less effective
 * at cutting load to a struggling service", not a correctness or security
 * issue. If this needs to be shared across instances later, the same
 * check_rate_limit-style atomic-RPC approach in
 * supabase/migrations/003_rate_limits.sql would be the model to follow.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

interface BreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
}

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens. Default 5. */
  failureThreshold?: number;
  /** How long the circuit stays open before allowing a trial call. Default 60s. */
  cooldownMs?: number;
}

export class CircuitOpenError extends Error {
  constructor(public readonly service: string) {
    super(`Circuit breaker open for ${service}`);
    this.name = 'CircuitOpenError';
  }
}

const breakers = new Map<string, BreakerState>();

function getBreaker(name: string): BreakerState {
  let breaker = breakers.get(name);
  if (!breaker) {
    breaker = { state: 'closed', consecutiveFailures: 0, openedAt: null };
    breakers.set(name, breaker);
  }
  return breaker;
}

function isOpen(name: string, cooldownMs: number): boolean {
  const breaker = getBreaker(name);
  if (breaker.state !== 'open') return false;

  if (breaker.openedAt !== null && Date.now() - breaker.openedAt >= cooldownMs) {
    // Cooldown elapsed: let one trial call through instead of holding the
    // circuit open forever.
    breaker.state = 'half-open';
    return false;
  }

  return true;
}

function recordSuccess(name: string): void {
  breakers.set(name, { state: 'closed', consecutiveFailures: 0, openedAt: null });
}

function recordFailure(name: string, failureThreshold: number): void {
  const breaker = getBreaker(name);
  breaker.consecutiveFailures += 1;

  // A failed half-open trial re-opens immediately, regardless of threshold
  // — one failure is enough evidence the service isn't back yet.
  if (breaker.state === 'half-open' || breaker.consecutiveFailures >= failureThreshold) {
    breaker.state = 'open';
    breaker.openedAt = Date.now();
  }
}

/** Current state of a named circuit — mainly for logging/diagnostics. */
export function getCircuitState(name: string): CircuitState {
  return getBreaker(name).state;
}

/** Test/ops utility: clears a single circuit's state. */
export function resetCircuit(name: string): void {
  breakers.delete(name);
}

/** Test/ops utility: clears all circuits. */
export function resetAllCircuits(): void {
  breakers.clear();
}

/**
 * Runs `fn` through the named circuit breaker. If the circuit is open,
 * fails immediately with CircuitOpenError instead of attempting `fn` —
 * callers should let this propagate the same way any other failure from
 * `fn` would (the search layers already treat a thrown error as "this
 * layer/source is unavailable", so no separate handling is needed).
 *
 * Wrap the retry-inclusive call (e.g. fetchWithRetry(...)), not individual
 * retry attempts — the breaker should count one sustained failure after
 * retries are exhausted, not each transient blip retry already absorbs.
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options: CircuitBreakerOptions = {}
): Promise<T> {
  const { failureThreshold = 5, cooldownMs = 60_000 } = options;

  if (isOpen(name, cooldownMs)) {
    throw new CircuitOpenError(name);
  }

  try {
    const result = await fn();
    recordSuccess(name);
    return result;
  } catch (error) {
    recordFailure(name, failureThreshold);
    throw error;
  }
}
