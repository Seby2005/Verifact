/**
 * Live checks of the external services a verification depends on.
 *
 * Unlike /api/health, which only confirms the keys are set, each check makes
 * one real, minimal request — the only way to see an exhausted quota or a
 * blocked key. Tavily over its plan limit answers HTTP 432 while its usage
 * page still shows credits left, so nothing short of a search reveals it.
 *
 * Costs per run: 1 Tavily credit, 1 of NewsAPI's 100 daily requests, one
 * Fact Check query; the OpenRouter balance lookup is free. Meant to run once a
 * day, not per request.
 */

export interface ProviderCheck {
  provider: string;
  /** What breaks in a report when this provider is down. */
  affects: string;
  ok: boolean;
  detail: string;
}

const TIMEOUT_MS = 8000;

/** Below this many dollars of prepaid credit the alert fires before AI calls start failing. */
const MIN_OPENROUTER_CREDIT_USD = 1;

interface ProbeSpec {
  provider: string;
  affects: string;
  key: string | undefined;
  request: (key: string, signal: AbortSignal) => Promise<Response>;
  /** Judges a 2xx response; by default any 2xx is healthy. */
  read?: (res: Response) => Promise<{ ok: boolean; detail: string }>;
}

async function probe({ provider, affects, key, request, read }: ProbeSpec): Promise<ProviderCheck> {
  if (!key?.trim()) return { provider, affects, ok: false, detail: 'API key not configured' };
  try {
    const res = await request(key.trim(), AbortSignal.timeout(TIMEOUT_MS));
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      return { provider, affects, ok: false, detail: `HTTP ${res.status}: ${body}` };
    }
    const verdict = read ? await read(res) : { ok: true, detail: `HTTP ${res.status}` };
    return { provider, affects, ...verdict };
  } catch (error) {
    return { provider, affects, ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

export function checkSearchProviders(): Promise<ProviderCheck[]> {
  return Promise.all([
    probe({
      provider: 'Tavily',
      affects: 'presă, surse oficiale, rețele sociale',
      key: process.env.TAVILY_API_KEY,
      request: (key, signal) =>
        fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ query: 'Romania', max_results: 1, search_depth: 'basic' }),
          signal,
        }),
    }),
    probe({
      provider: 'NewsAPI',
      affects: 'presă',
      key: process.env.NEWS_API_KEY,
      request: (key, signal) =>
        fetch(`https://newsapi.org/v2/everything?q=Romania&pageSize=1&apiKey=${encodeURIComponent(key)}`, { signal }),
    }),
    probe({
      provider: 'Google Fact Check',
      affects: 'fact-checking',
      key: process.env.GOOGLE_FACT_CHECK_API_KEY,
      request: (key, signal) =>
        fetch(
          `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=vaccine&pageSize=1&key=${encodeURIComponent(key)}`,
          { signal }
        ),
    }),
    probe({
      provider: 'OpenRouter',
      affects: 'analiza AI și verdictul',
      key: process.env.OPENROUTER_API_KEY,
      request: (key, signal) =>
        fetch('https://openrouter.ai/api/v1/credits', { headers: { Authorization: `Bearer ${key}` }, signal }),
      // The key stays valid when the prepaid balance runs out, so check the balance.
      read: async (res) => {
        const { data } = (await res.json()) as { data?: { total_credits?: number; total_usage?: number } };
        const remaining = (data?.total_credits ?? 0) - (data?.total_usage ?? 0);
        return { ok: remaining >= MIN_OPENROUTER_CREDIT_USD, detail: `$${remaining.toFixed(2)} credit rămas` };
      },
    }),
  ]);
}
