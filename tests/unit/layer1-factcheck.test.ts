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

import { runLayer1, buildFactCheckQuery } from '@/lib/verification/layer1-factcheck';
import { searchGoogleNews } from '@/lib/verification/news-rss';
import type { ExpandedQueries } from '@/lib/verification/query-expander';

const googleNews = searchGoogleNews as jest.Mock;

const QUERIES: ExpandedQueries = {
  primary: 'x',
  romanianQuery: 'România arme nucleare SUA',
  englishQuery: 'Romania US nuclear weapons',
  keywords: [],
  namedEntities: [],
  factCheckAngle: 'România arme nucleare fact check',
  officialAngle: '',
  contextOriginAngle: '',
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  };
}

describe('buildFactCheckQuery', () => {
  it('extracts query terms from text', () => {
    const query = buildFactCheckQuery('vaccinurile ARNm modifică ADN-ul uman');
    expect(query).toContain('vaccinurile');
  });
});

describe('runLayer1', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GOOGLE_FACT_CHECK_API_KEY = 'test-key';
    googleNews.mockReset().mockResolvedValue([]);
  });

  const newsItem = (title: string, path: string) => ({
    title,
    url: `https://news.google.com/rss/articles/${path}`,
    sourceName: 'EUvsDisinfo',
    sourceDomain: 'euvsdisinfo.eu',
    publishedAt: '2023-04-13T07:00:00.000Z',
    snippet: title,
  });

  it('adds EUvsDisinfo cases as fact-checks rated disinformation, skipping pages that are not cases', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ claims: [] }));
    googleNews.mockResolvedValue([
      newsItem('DISINFO: Romania prepares to deploy US nuclear weapons on its territory', 'case-1'),
      newsItem('How to justify crimes against humanity: the Kremlin method', 'analysis-1'),
    ]);

    const result = await runLayer1('România se pregătește să amplaseze arme nucleare americane', 'ro', QUERIES);

    expect(googleNews).toHaveBeenCalledWith('Romania US nuclear weapons', 'en', ['euvsdisinfo.eu']);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      publisher: 'EUvsDisinfo',
      claimReviewed: 'Romania prepares to deploy US nuclear weapons on its territory',
      rating: 'Disinformation',
      ratingValue: 0,
      publisherUrl: 'https://euvsdisinfo.eu',
    });
  });

  it('carries on without EUvsDisinfo when its search fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ claims: [] }));
    googleNews.mockRejectedValue(new Error('google-news HTTP 429'));

    const result = await runLayer1('Orice afirmatie', 'ro', QUERIES);

    expect(result.status).toBe('success');
    expect(result.results).toEqual([]);
  });

  it('stays unavailable when the fact-check index is down, even if EUvsDisinfo answered', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));
    googleNews.mockResolvedValue([newsItem('DISINFO: something else entirely', 'case-2')]);

    const result = await runLayer1('Orice afirmatie', 'ro', QUERIES);

    expect(result.status).toBe('unavailable');
  });

  it('searches each query in its own language, whatever language the interface is in', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ claims: [] }));

    await runLayer1('Romania prepares to deploy US nuclear weapons', 'en', QUERIES);

    const searched = (global.fetch as jest.Mock).mock.calls.map(([url]) => {
      const params = new URL(String(url)).searchParams;
      return `${params.get('query')} [${params.get('languageCode')}]`;
    });
    expect(searched).toEqual([
      'România arme nucleare SUA [ro]',
      'Romania US nuclear weapons [en]',
      'România arme nucleare fact check [ro]',
    ]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GOOGLE_FACT_CHECK_API_KEY;
  });

  it('parses claims and computes a weighted layer score', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        claims: [
          {
            text: 'pamantul este plat',
            claimant: 'Cineva',
            claimReview: [
              {
                publisher: { name: 'Snopes', site: 'snopes.com' },
                url: 'https://snopes.com/review/1',
                textualRating: 'False',
                reviewDate: '2024-01-01',
              },
            ],
          },
        ],
      })
    );

    const result = await runLayer1('Pamantul este plat', 'ro');

    expect(result.status).toBe('success');
    expect(result.results.length).toBeGreaterThanOrEqual(1);
    expect(result.results[0].publisher).toBe('Snopes');
    expect(result.results[0].ratingValue).toBe(0); // "False" -> 0
    expect(result.layerScore).toBeCloseTo(0, 5);
  });

  it('returns a neutral 0.5 score and success status when nothing is found', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ claims: [] }));

    const result = await runLayer1('O afirmatie foarte obscura fara acoperire', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toEqual([]);
    expect(result.layerScore).toBe(0.5);
  });

  it('reports itself unavailable when the fact-check API fails, rather than finding nothing', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    const result = await runLayer1('Orice afirmatie', 'ro');
    expect(result.status).toBe('unavailable');
    expect(result.results).toEqual([]);
    expect(result.error).toContain('google-fact-check');
  });

  it('deduplicates results by review URL', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount += 1;
      const claim = {
        text: 'aceeasi afirmatie',
        claimReview: [{ publisher: { name: 'X' }, url: 'https://x.com/same', textualRating: 'False' }],
      };
      return Promise.resolve(jsonResponse({ claims: callCount <= 2 ? [claim] : [] }));
    });

    const result = await runLayer1('aceeasi afirmatie', 'ro');
    expect(result.results).toHaveLength(1);
  });
});
