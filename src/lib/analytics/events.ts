/**
 * Funnel events, sent to Umami (loaded in the root layout).
 *
 * The event names live here as a closed union so a typo can't silently create a
 * fourth funnel step that never lines up with the other three in the Umami
 * dashboard. Calling this is always safe: if the script is blocked, missing, or
 * this runs on the server, the call is a no-op rather than an error.
 */
export type FunnelEvent =
  | 'claim_submitted'
  | 'signup_started'
  | 'checkout_started'
  | 'waitlist_joined';

interface UmamiGlobal {
  track: (event: string, data?: Record<string, unknown>) => void;
}

export function trackEvent(event: FunnelEvent, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const umami = (window as unknown as { umami?: UmamiGlobal }).umami;
  if (!umami?.track) return;
  try {
    umami.track(event, data);
  } catch {
    // Analytics must never break the flow it is measuring.
  }
}

/** UTM keys captured from the landing URL and forwarded with signups. */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/**
 * Reads the UTM parameters from the current URL. Returns an empty object when
 * there are none, so callers can spread the result unconditionally.
 */
export function readUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 120);
  }
  return utm;
}
