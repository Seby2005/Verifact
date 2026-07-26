/**
 * Shared retry-with-backoff utility, extracted from the pattern originally
 * written for src/lib/ai/gemini.ts so the same transient-failure handling
 * applies to the search layers (layer1-4) and the Vision OCR call.
 */

// Same pattern gemini.ts used: retry on rate limiting, server errors, and
// timeouts/connection resets. Deliberately narrow — quota/billing errors
// (4xx auth/plan issues, malformed requests) are not in this list because
// retrying them just wastes the caller's time waiting for the same failure.
const TRANSIENT_PATTERN = /\b(429|500|503)\b|timeout|ETIMEDOUT|ECONNRESET/i;

/**
 * Node's fetch (undici) usually reports a reset connection as
 * `TypeError: fetch failed` with the real cause (e.g. `ECONNRESET`) nested
 * in `error.cause`, not in the top-level message. Checking the cause too is
 * what makes ECONNRESET detection actually work in practice.
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const parts = [error.message];
  const cause = (error as { cause?: unknown }).cause;
  if (cause instanceof Error) {
    parts.push(cause.message);
    const code = (cause as { code?: unknown }).code;
    if (typeof code === 'string') parts.push(code);
  } else if (cause && typeof cause === 'object' && 'code' in cause) {
    const code = (cause as { code?: unknown }).code;
    if (typeof code === 'string') parts.push(code);
  }

  return parts.join(' ');
}

export function isTransientError(error: unknown): boolean {
  return TRANSIENT_PATTERN.test(describeError(error));
}

export interface RetryOptions {
  /** Total attempts including the first — default 3. */
  attempts?: number;
  /** Base delay for exponential backoff (doubles each attempt) — default 500ms. */
  baseDelayMs?: number;
  /** Prefix used in the retry warning log. */
  label?: string;
  /**
   * Called only when the error already looks transient (see
   * isTransientError). Return false to stop retrying anyway — e.g. Gemini's
   * quota/billing errors sometimes carry a "429" that isTransientError would
   * otherwise treat as retryable.
   */
  isRetryable?: (error: unknown, message: string) => boolean;
}

/**
 * Retries a transient failure with exponential backoff (500ms, 1s, 2s, ...).
 * Non-transient errors (and errors explicitly excluded via isRetryable) are
 * thrown immediately without waiting.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 500, label = 'operation', isRetryable } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = describeError(error);
      const transient = isTransientError(error) && (isRetryable ? isRetryable(error, message) : true);

      if (!transient || attempt === attempts - 1) {
        throw error;
      }

      const delay = baseDelayMs * 2 ** attempt;
      console.warn(`[Retry] ${label} attempt ${attempt + 1} failed (${message.slice(0, 80)}), retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 503;
}

/**
 * fetch() wrapped with retry-on-transient-failure. Behaviour-preserving on
 * every path except retrying: a non-retryable status (2xx, or a 4xx that
 * isn't 429) resolves immediately with the Response, exactly like plain
 * fetch(); a retryable status (429/500/503) that survives to the last
 * attempt is returned as-is too, so the caller's existing
 * `if (!response.ok)` handling runs unchanged. A network-level throw
 * (DNS failure, reset, timeout) is retried the same way and re-thrown after
 * the last attempt, exactly like plain fetch() throwing would be.
 *
 * `init` accepts a thunk as well as a plain object — every caller in this
 * codebase builds its `signal` with `AbortSignal.timeout(ms)`, which is a
 * single-use signal armed at creation time. Passing a static init would
 * reuse the same (possibly already-fired) signal across every retry
 * attempt; a thunk lets each attempt build a fresh one.
 */
export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit | (() => RequestInit),
  options: RetryOptions = {}
): Promise<Response> {
  const { attempts = 3, baseDelayMs = 500, label = 'fetch' } = options;
  let lastNetworkError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const isLastAttempt = attempt === attempts - 1;
    const attemptInit = typeof init === 'function' ? init() : init;

    try {
      const response = await fetch(input, attemptInit);
      if (response.ok || !isRetryableStatus(response.status) || isLastAttempt) {
        return response;
      }
      console.warn(
        `[Retry] ${label} attempt ${attempt + 1} got HTTP ${response.status}, retrying in ${baseDelayMs * 2 ** attempt}ms`
      );
    } catch (error) {
      lastNetworkError = error;
      if (!isTransientError(error) || isLastAttempt) {
        throw error;
      }
      console.warn(
        `[Retry] ${label} attempt ${attempt + 1} failed (${describeError(error).slice(0, 80)}), retrying in ${baseDelayMs * 2 ** attempt}ms`
      );
    }

    await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
  }

  // Unreachable in practice (the loop always returns or throws on the last
  // attempt above), but keeps the function's return type honest.
  throw lastNetworkError ?? new Error(`${label}: exhausted retries`);
}
