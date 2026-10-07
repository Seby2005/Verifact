import { checkSearchProviders } from '@/lib/health/search-providers';

function response(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('checkSearchProviders', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.TAVILY_API_KEY = 't';
    process.env.NEWS_API_KEY = 'n';
    process.env.GOOGLE_FACT_CHECK_API_KEY = 'g';
    process.env.OPENROUTER_API_KEY = 'o';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('flags a provider over its plan limit and an AI balance about to run out', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('tavily')) return Promise.resolve(response(432, { detail: { error: 'plan limit' } }));
      if (url.includes('openrouter')) return Promise.resolve(response(200, { data: { total_credits: 5, total_usage: 4.5 } }));
      return Promise.resolve(response(200));
    });

    const checks = await checkSearchProviders();
    const byName = Object.fromEntries(checks.map((c) => [c.provider, c]));

    expect(byName.Tavily.ok).toBe(false);
    expect(byName.Tavily.detail).toContain('432');
    expect(byName.NewsAPI.ok).toBe(true);
    expect(byName['Google Fact Check'].ok).toBe(true);
    expect(byName.OpenRouter.ok).toBe(false);
    expect(byName.OpenRouter.detail).toContain('$0.50');
  });

  it('reports a missing key as a failure without calling the provider', async () => {
    delete process.env.NEWS_API_KEY;
    global.fetch = jest.fn().mockResolvedValue(response(200, { data: { total_credits: 5, total_usage: 0 } }));

    const checks = await checkSearchProviders();

    expect(checks.find((c) => c.provider === 'NewsAPI')).toMatchObject({ ok: false, detail: 'API key not configured' });
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('newsapi'))).toBe(false);
  });
});
