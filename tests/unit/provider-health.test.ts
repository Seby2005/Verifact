jest.mock('@/lib/news-index', () => ({
  newsIndexLastUpdate: jest.fn(),
}));

jest.mock('@/lib/verification/news-rss', () => ({
  searchBingNews: jest.fn(),
  searchGoogleNews: jest.fn(),
}));

import { checkSearchProviders } from '@/lib/health/search-providers';
import { searchBingNews, searchGoogleNews } from '@/lib/verification/news-rss';
import { newsIndexLastUpdate } from '@/lib/news-index';

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
  const bing = searchBingNews as jest.Mock;
  const google = searchGoogleNews as jest.Mock;
  const lastUpdate = newsIndexLastUpdate as jest.Mock;
  const oneItem = [{ title: 't', url: 'u', sourceName: 's', sourceDomain: 'd', publishedAt: '', snippet: 't' }];

  beforeEach(() => {
    process.env.GOOGLE_FACT_CHECK_API_KEY = 'g';
    process.env.OPENROUTER_API_KEY = 'o';
    bing.mockReset().mockResolvedValue(oneItem);
    google.mockReset().mockResolvedValue(oneItem);
    lastUpdate.mockReset().mockResolvedValue(new Date(Date.now() - 20 * 60_000));
    global.fetch = jest.fn().mockResolvedValue(response(200, { data: { total_credits: 5, total_usage: 0 } }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  const check = async () => Object.fromEntries((await checkSearchProviders()).map((c) => [c.provider, c]));

  it('reports every provider healthy when searches return results and credit remains', async () => {
    const byName = await check();

    expect(Object.values(byName).every((c) => c.ok)).toBe(true);
    expect(Object.keys(byName)).toEqual([
      'Index propriu de știri',
      'Google News RSS',
      'Bing News RSS',
      'Google Fact Check',
      'OpenRouter',
    ]);
  });

  it.each([
    ['has stopped being refreshed', () => Promise.resolve(new Date(Date.now() - 9 * 3_600_000)), 'acum 9.0 ore'],
    ['is still empty', () => Promise.resolve(null), 'gol'],
    ['cannot be read', () => Promise.reject(new Error('relation "news_index" does not exist')), 'does not exist'],
  ])('flags the own news index when it %s', async (_case, state, detail) => {
    lastUpdate.mockImplementation(state);

    const byName = await check();

    expect(byName['Index propriu de știri'].ok).toBe(false);
    expect(byName['Index propriu de știri'].detail).toContain(detail);
  });

  it('flags a free engine that is blocked or returns nothing', async () => {
    google.mockRejectedValue(new Error('google-news returned a non-RSS page'));
    bing.mockResolvedValue([]);

    const byName = await check();

    expect(byName['Google News RSS']).toMatchObject({ ok: false, detail: 'google-news returned a non-RSS page' });
    expect(byName['Bing News RSS'].ok).toBe(false);
  });

  it('flags an AI balance about to run out', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(200, { data: { total_credits: 5, total_usage: 4.5 } }));

    const byName = await check();

    expect(byName.OpenRouter.ok).toBe(false);
    expect(byName.OpenRouter.detail).toContain('$0.50');
  });

  it('reports a missing key as a failure without calling the provider', async () => {
    delete process.env.GOOGLE_FACT_CHECK_API_KEY;

    const byName = await check();

    expect(byName['Google Fact Check']).toMatchObject({ ok: false, detail: 'API key not configured' });
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('factchecktools'))).toBe(false);
  });
});
