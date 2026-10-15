import { logger } from '@/lib/utils/logger';

/**
 * Settles one layer's search-provider calls and tells "the search failed" apart
 * from "the search found nothing".
 *
 * Each call must resolve to [] when it simply cannot run (no API key, empty
 * query) and reject on a real failure — an HTTP error, an exhausted quota, a
 * timeout. Before this, every fetcher caught its own errors and returned [], so
 * a Tavily account over its plan limit produced reports that read "no sources
 * found" with a confident AI-only verdict, and nothing anywhere said search was
 * down.
 *
 * Returns the merged results of the calls that succeeded, plus `failure` when
 * every call rejected — the layer could not search at all and must report
 * itself unavailable rather than empty. Each rejection is logged, so a
 * provider outage shows up in the server logs even when another provider
 * covers for it.
 */
export async function settleProviderCalls<T>(
  layer: string,
  calls: Array<{ provider: string; run: Promise<T[]> }>
): Promise<{ items: T[]; failure?: string }> {
  const settled = await Promise.allSettled(calls.map((c) => c.run));

  const items: T[] = [];
  const errors: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${calls[i].provider}: ${reason}`);
      logger.warn('Search provider call failed', { service: layer, provider: calls[i].provider, error: reason });
    }
  });

  const allFailed = calls.length > 0 && errors.length === calls.length;
  return { items, failure: allFailed ? errors.join('; ') : undefined };
}
