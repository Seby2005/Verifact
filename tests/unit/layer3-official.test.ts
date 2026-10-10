jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

jest.mock('@/lib/verification/news-rss', () => ({
  searchGoogleNews: jest.fn(),
}));

import { runLayer3, calculateLayer3Score } from '@/lib/verification/layer3-official';
import { searchGoogleNews, type RssNewsItem } from '@/lib/verification/news-rss';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, statusText: ok ? 'OK' : 'Error', json: () => Promise.resolve(body) };
}

describe('runLayer3', () => {
  const originalFetch = global.fetch;
  const google = searchGoogleNews as jest.Mock;

  const item = (overrides: Partial<RssNewsItem> = {}): RssNewsItem => ({
    title: 'Statement on the claim under review',
    url: 'https://news.google.com/rss/articles/abc',
    sourceName: 'World Health Organization',
    sourceDomain: 'who.int',
    publishedAt: '2026-01-01T00:00:00.000Z',
    snippet: 'Statement on the claim under review',
    ...overrides,
  });

  beforeEach(() => {
    google.mockReset().mockResolvedValue([]);
    // Wikipedia and the academic search find nothing unless a test says otherwise.
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ results: [], pages: [] }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('restricts the official search to institutional domains', async () => {
    await runLayer3('orice afirmatie oficiala', 'ro');

    const siteLists = google.mock.calls.map(([, , sites]) => sites as string[]);
    expect(siteLists.length).toBeGreaterThanOrEqual(2);
    expect(siteLists.some((sites) => sites.includes('gov.ro'))).toBe(true);
    expect(siteLists.some((sites) => sites.includes('who.int'))).toBe(true);
    expect(siteLists.every((sites) => sites.length > 0)).toBe(true);
  });

  it('maps a known official domain to its organization name and type', async () => {
    google.mockImplementation((_q: string, lang: string) => Promise.resolve(lang === 'en' ? [item()] : []));

    const result = await runLayer3('the claim under review', 'en');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].organization).toBe('Organizația Mondială a Sănătății');
    expect(result.results[0].organizationType).toBe('health_org');
    expect(result.results[0].documentUrl).toBe('https://news.google.com/rss/articles/abc');
  });

  it('names a ministry on a gov.ro subdomain', async () => {
    google.mockImplementation((_q: string, lang: string) =>
      Promise.resolve(lang === 'ro' ? [item({ sourceDomain: 'mfinante.gov.ro', sourceName: 'mfinante.gov.ro' })] : [])
    );

    const result = await runLayer3('cota de TVA', 'ro');

    expect(result.results[0].organization).toBe('Ministerul Finanțelor');
  });

  it('classifies a denial and scores it as 0', async () => {
    google.mockImplementation((_q: string, lang: string) =>
      Promise.resolve(
        lang === 'ro'
          ? [item({ sourceDomain: 'gov.ro', title: 'Guvernul dezminte: afirmatia este un fals', snippet: 'Guvernul dezminte: afirmatia este un fals' })]
          : []
      )
    );

    const result = await runLayer3('claim text', 'ro');

    expect(result.results[0].supportsOrDenies).toBe('denies');
    expect(result.layerScore).toBe(0);
  });

  it('still succeeds, on the other reference sources, when the official search is down', async () => {
    google.mockRejectedValue(new Error('google-news HTTP 429'));

    const result = await runLayer3('claim with no official coverage', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toEqual([]);
    expect(result.layerScore).toBe(0.5);
  });
});

describe('calculateLayer3Score', () => {
  const source = (organizationType: string, supportsOrDenies: 'supports' | 'denies' | 'neutral') => ({
    title: 't',
    organizationType,
    supportsOrDenies,
  });

  it('counts a Wikipedia excerpt once the source filter has given it a stance', () => {
    expect(calculateLayer3Score([source('encyclopedia', 'supports'), source('encyclopedia', 'supports')])).toBe(1);
    expect(calculateLayer3Score([source('encyclopedia', 'supports'), source('government', 'denies')])).toBe(0.5);
  });

  it('lets stance-less sources abstain', () => {
    expect(calculateLayer3Score([source('encyclopedia', 'neutral')])).toBe(0.5);
  });
});
