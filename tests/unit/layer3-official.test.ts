jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

import { runLayer3 } from '@/lib/verification/layer3-official';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, statusText: ok ? 'OK' : 'Error', json: () => Promise.resolve(body) };
}

describe('runLayer3', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.TAVILY_API_KEY;
  });

  it('returns unavailable with a clear error when TAVILY_API_KEY is not configured', async () => {
    const result = await runLayer3('orice afirmatie oficiala', 'ro');

    expect(result.status).toBe('unavailable');
    expect(result.layerScore).toBe(0.5);
    expect(result.error).toMatch(/TAVILY_API_KEY/);
  });

  it('maps a known official domain to its organization name and type', async () => {
    process.env.TAVILY_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: 'WHO statement on the claim',
            url: 'https://who.int/news/statement',
            content: 'Oficial confirmat: this is an official confirmation of the claim by WHO.',
            published_date: '2024-01-01',
          },
        ],
      })
    );

    const result = await runLayer3('the claim under review', 'en');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].organization).toBe('Organizația Mondială a Sănătății');
    expect(result.results[0].organizationType).toBe('health_org');
    expect(result.results[0].supportsOrDenies).toBe('supports');
  });

  it('classifies a denial correctly and scores it as 0', async () => {
    process.env.TAVILY_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: 'Official denial',
            url: 'https://gov.ro/comunicat',
            content: 'Este fals si dezmintit oficial: aceasta afirmatie nu este adevarata.',
          },
        ],
      })
    );

    const result = await runLayer3('claim text', 'ro');

    expect(result.results[0].supportsOrDenies).toBe('denies');
    expect(result.layerScore).toBe(0);
  });

  it('returns a neutral score with an empty result set', async () => {
    process.env.TAVILY_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ results: [] }));

    const result = await runLayer3('claim with no official coverage', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toEqual([]);
    expect(result.layerScore).toBe(0.5);
  });

  it('propagates a fetch failure (caught by the orchestrator, not here)', async () => {
    process.env.TAVILY_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    await expect(runLayer3('claim', 'ro')).rejects.toThrow('Official Search API error');
  });

  it('caps results at 6', async () => {
    process.env.TAVILY_API_KEY = 'test-key';
    const results = Array.from({ length: 10 }, (_, i) => ({
      title: `Doc ${i}`,
      url: `https://gov.ro/doc-${i}`,
      content: 'Some neutral content about the topic.',
    }));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ results }));

    const result = await runLayer3('claim', 'ro');

    expect(result.results.length).toBeLessThanOrEqual(6);
  });

  it('resolves an unlisted gov.ro subdomain to the parent domain\'s organization', async () => {
    process.env.TAVILY_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { title: 'Doc', url: 'https://subdomain.gov.ro/doc', content: 'Neutral content here.' },
        ],
      })
    );

    const result = await runLayer3('claim', 'ro');

    // 'subdomain.gov.ro' isn't itself in OFFICIAL_DOMAINS, but its parent
    // 'gov.ro' is — the parent-domain match should still resolve it.
    expect(result.results[0].organization).toBe('Guvernul României');
    expect(result.results[0].organizationType).toBe('government');
  });
});
