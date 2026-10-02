// Shared read-only feed over the Google Fact Check Tools API. Both the
// Observator (narratives on the globe) and the Academy (quiz items) pull real
// fact-checked claims through here, so the query + normalization live once.

import { normalizeRating } from '@/lib/verification/layer1-factcheck';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';

export interface FeedClaim {
  text: string;
  rating: string; // raw textual rating from the publisher
  score: number; // 0..1 normalized (0 = false, 1 = true)
  publisher: string;
  publisherSite: string;
  url: string;
  date: string; // review date ISO, may be ''
  lang: string;
  claimant?: string;
}

interface GoogleClaim {
  text?: string;
  claimant?: string;
  claimReview?: Array<{
    publisher?: { name?: string; site?: string };
    url?: string;
    reviewDate?: string;
    textualRating?: string;
    languageCode?: string;
  }>;
}

/**
 * Searches fact-checks for a query in one language. Returns [] on any failure
 * (no key, network, rate limit) so callers can always compose without guards.
 */
export async function searchFactChecks(query: string, lang: string, pageSize = 10): Promise<FeedClaim[]> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const params = new URLSearchParams({
    key: apiKey,
    query: query.slice(0, 200),
    languageCode: lang,
    pageSize: String(pageSize),
  });

  try {
    const res = await withCircuitBreaker('google-fact-check', () =>
      fetchWithRetry(
        `https://factchecktools.googleapis.com/v1alpha1/claims:search?${params.toString()}`,
        () => ({ signal: AbortSignal.timeout(8000) }),
        { label: 'factcheck-feed' },
      ).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }),
    );

    const data = (await res.json()) as { claims?: GoogleClaim[] };
    return (data.claims ?? [])
      .map((c): FeedClaim => {
        const rv = c.claimReview?.[0] ?? {};
        return {
          text: c.text ?? '',
          rating: rv.textualRating ?? '',
          score: normalizeRating(rv.textualRating ?? ''),
          publisher: rv.publisher?.name ?? '',
          publisherSite: rv.publisher?.site ?? '',
          url: rv.url ?? '',
          date: rv.reviewDate ?? '',
          lang: rv.languageCode ?? lang,
          claimant: c.claimant,
        };
      })
      .filter((c) => c.text.length > 0);
  } catch {
    return [];
  }
}

export type Verdict3 = 'false' | 'partial' | 'true';

/** Collapses the 0..1 score into the three buckets the quiz + map surface use. */
export function scoreToVerdict3(score: number): Verdict3 {
  if (score < 0.35) return 'false';
  if (score >= 0.75) return 'true';
  return 'partial';
}

/**
 * Classifies a publisher's textual rating directly from its words. Many ratings
 * are prose ("There is no evidence to support this claim") that the numeric map
 * defaults to 0.5 (→ partial), which would mislabel a clearly false claim — bad
 * in a teaching game. Returns null when the rating can't be classified with
 * confidence, so callers can drop the item rather than teach a wrong verdict.
 * Partial is checked first because those phrases often contain "true"/"false".
 */
export function classifyRating(raw: string): Verdict3 | null {
  const s = (raw || '').toLowerCase();
  if (!s) return null;
  if (/(partly|partially|part true|part false|mixed|half[ -]?true|misleading|missing context|lacks? context|needs? context|out of context|overstated|exaggerat|exagerat|parțial|partial adev|mostly false|mostly true|barely true|one pinocchio|two pinocchios)/.test(s))
    return 'partial';
  if (/(false|fake|hoax|incorrect|no evidence|not true|untrue|unfounded|debunk|fabricat|\bfals\b|scam|misinformation|disinformation|pants on fire|pinocchio|baseless|unsupported|not supported|conspiracy|misleading claim|altered|doctored|manipulat)/.test(s))
    return 'false';
  if (/(\btrue\b|correct|accurate|adevărat|adevarat|confirmed|verified|legitimate|mostly accurate|no pinocchios|geppetto)/.test(s))
    return 'true';
  return null;
}

/** Dedupe by review URL (or publisher+claim when a URL is missing). */
export function dedupeClaims(claims: FeedClaim[]): FeedClaim[] {
  const seen = new Set<string>();
  return claims.filter((c) => {
    const key = c.url || `${c.publisher}::${c.text.slice(0, 60)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
