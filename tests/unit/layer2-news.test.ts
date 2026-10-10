jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

jest.mock('@/lib/verification/news-rss', () => ({
  searchBingNews: jest.fn(),
  searchGoogleNews: jest.fn(),
}));

import { runLayer2, detectSentiment, calculateLayer2Score } from '@/lib/verification/layer2-news';
import { searchBingNews, searchGoogleNews, type RssNewsItem } from '@/lib/verification/news-rss';
import type { NewsArticle } from '@/types/verification';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, statusText: ok ? 'OK' : 'Error', json: () => Promise.resolve(body) };
}

function article(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    title: 'Title',
    source: 'example.com',
    articleUrl: 'https://example.com/a',
    publishedAt: '2024-01-01',
    snippet: 'snippet',
    credibilityScore: 0.8,
    sentiment: 'neutral',
    ...overrides,
  };
}

describe('detectSentiment', () => {
  const CLAIM = 'vaccinurile ARNm modifica genomul uman conform unor cercetatori';

  it('marks an article unrelated when it barely overlaps the claim', () => {
    const sentiment = detectSentiment(
      'Vremea de weekend',
      'Se anunta ploi in tot weekendul pe litoral',
      CLAIM,
      0.8
    );
    expect(sentiment).toBe('unrelated');
  });

  it('treats debunking coverage as contradicting the claim, not confirming it', () => {
    // Headlined as a fact-check that the claim is false — but contains
    // "confirms"-adjacent topic words, which previously made this read as
    // support instead of a debunk.
    const sentiment = detectSentiment(
      'Fact check: nu exista dovezi ca vaccinurile ARNm modifica genomul uman',
      'Experti confirma ca afirmatia despre modificarea genomului este falsa',
      CLAIM,
      0.9
    );
    expect(sentiment).toBe('contradicts');
  });

  it('does not read ordinary reporting verbs as a debunk', () => {
    // "precizează", "nu a fost" and "speculații" occur in most Romanian news
    // stories; treating them as debunk markers flipped true claims to false.
    const sentiment = detectSentiment(
      'Nicușor Dan a depus jurământul ca președinte al României',
      'Administrația Prezidențială precizează că ceremonia nu a fost amânată, în ciuda speculațiilor.',
      'Nicușor Dan este președintele României',
      0.9
    );
    expect(sentiment).not.toBe('contradicts');
  });

  it('detects a plain contradiction', () => {
    const sentiment = detectSentiment(
      'Este fals ca vaccinurile ARNm modifica genomul uman',
      'Cercetatorii au dezmintit aceasta teorie a conspiratiei',
      CLAIM,
      0.9
    );
    expect(sentiment).toBe('contradicts');
  });

  it('detects a plain confirmation', () => {
    const sentiment = detectSentiment(
      'Este adevarat ca vaccinurile ARNm modifica genomul uman, oficial confirmat',
      'Studiul dovedit arata modificarea genomului uman de catre vaccinurile ARNm',
      CLAIM,
      0.9
    );
    expect(sentiment).toBe('confirms');
  });

  it('falls back to neutral when relevant but no clear framing keywords appear', () => {
    const sentiment = detectSentiment(
      'Vaccinurile ARNm si genomul uman',
      'Un articol despre vaccinurile ARNm si efectele asupra genomului uman fara verdict clar',
      CLAIM,
      0.9
    );
    expect(sentiment).toBe('neutral');
  });
});

describe('calculateLayer2Score', () => {
  it('returns 0.5 when there are no articles', () => {
    expect(calculateLayer2Score([])).toBe(0.5);
  });

  it('returns 0.5 when every article is unrelated', () => {
    const articles = [article({ sentiment: 'unrelated' }), article({ sentiment: 'unrelated' })];
    expect(calculateLayer2Score(articles)).toBe(0.5);
  });

  it('scores above 0.5 when high-credibility sources confirm', () => {
    const articles = [article({ sentiment: 'confirms', credibilityScore: 0.9 })];
    expect(calculateLayer2Score(articles)).toBeGreaterThan(0.5);
  });

  it('scores below 0.5 when high-credibility sources contradict', () => {
    const articles = [article({ sentiment: 'contradicts', credibilityScore: 0.9 })];
    expect(calculateLayer2Score(articles)).toBeLessThan(0.5);
  });

  it('lets neutral articles abstain instead of pulling the score toward 0.5', () => {
    const articles = [
      article({ sentiment: 'confirms', credibilityScore: 0.9 }),
      article({ sentiment: 'neutral', credibilityScore: 0.9 }),
      article({ sentiment: 'neutral', credibilityScore: 0.9 }),
    ];
    expect(calculateLayer2Score(articles)).toBe(1);
  });

  it('weighs confirming and contradicting articles by credibility', () => {
    const articles = [
      article({ sentiment: 'confirms', credibilityScore: 0.2 }),
      article({ sentiment: 'contradicts', credibilityScore: 0.9 }),
    ];
    // Net signed score is negative (contradiction outweighs confirmation).
    expect(calculateLayer2Score(articles)).toBeLessThan(0.5);
  });
});

describe('runLayer2', () => {
  const originalFetch = global.fetch;
  const bing = searchBingNews as jest.Mock;
  const google = searchGoogleNews as jest.Mock;

  const item = (overrides: Partial<RssNewsItem> = {}): RssNewsItem => ({
    title: 'Coverage of the claim being verified today',
    url: 'https://reuters.com/article-1',
    sourceName: 'Reuters',
    sourceDomain: 'reuters.com',
    publishedAt: '2026-01-01T00:00:00.000Z',
    snippet: 'A neutral description of the claim being verified today, with enough overlap.',
    ...overrides,
  });

  /** Tavily reserve + GDELT both go through fetch; the RSS engines are mocked above. */
  function mockFetch(tavily: { ok: boolean; status?: number; results?: unknown[] }) {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('tavily.com')
          ? jsonResponse({ results: tavily.results ?? [] }, tavily.ok, tavily.status ?? 200)
          : { ok: true, status: 200, text: () => Promise.resolve('{"articles":[]}') }
      )
    );
  }

  beforeEach(() => {
    bing.mockReset().mockResolvedValue([]);
    google.mockReset().mockResolvedValue([]);
    mockFetch({ ok: true });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.TAVILY_API_KEY;
  });

  it('succeeds with nothing found when the free engines answer but have no coverage', async () => {
    const result = await runLayer2('orice afirmatie', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toEqual([]);
    expect(result.layerScore).toBe(0.5);
  });

  it('searches without any API key configured', async () => {
    bing.mockResolvedValue([item()]);

    const result = await runLayer2('the claim being verified today', 'en');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].source).toBe('Reuters');
    expect(result.results[0].articleUrl).toBe('https://reuters.com/article-1');
  });

  it('reports itself unavailable when every engine fails, rather than finding nothing', async () => {
    process.env.TAVILY_API_KEY = 'tavily-key';
    bing.mockRejectedValue(new Error('bing-news HTTP 429'));
    google.mockRejectedValue(new Error('google-news returned a non-RSS page'));
    mockFetch({ ok: false, status: 432 });

    const result = await runLayer2('orice afirmatie', 'ro');

    expect(result.status).toBe('unavailable');
    expect(result.error).toContain('bing-news');
    expect(result.error).toContain('google-news');
  });

  it('reports itself unavailable when the free engines fail and no reserve is configured', async () => {
    bing.mockRejectedValue(new Error('bing-news HTTP 429'));
    google.mockRejectedValue(new Error('google-news HTTP 503'));

    const result = await runLayer2('orice afirmatie', 'ro');

    expect(result.status).toBe('unavailable');
  });

  it('stays available when one free engine still works', async () => {
    bing.mockRejectedValue(new Error('bing-news HTTP 429'));

    const result = await runLayer2('orice afirmatie', 'ro');

    expect(result.status).toBe('success');
  });

  it('keeps one copy of a story both engines returned, preferring the one with the publisher URL', async () => {
    bing.mockResolvedValue([item()]);
    google.mockResolvedValue([
      item({ url: 'https://news.google.com/rss/articles/abc', snippet: 'Coverage of the claim being verified today' }),
    ]);

    const result = await runLayer2('the claim being verified today', 'en');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].articleUrl).toBe('https://reuters.com/article-1');
  });

  it('does not spend a paid search when the free engines found coverage', async () => {
    process.env.TAVILY_API_KEY = 'tavily-key';
    bing.mockResolvedValue([item()]);

    await runLayer2('the claim being verified today', 'en');

    const calledTavily = (global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('tavily.com'));
    expect(calledTavily).toBe(false);
  });

  it('falls back to one paid search when the free engines found nothing', async () => {
    process.env.TAVILY_API_KEY = 'tavily-key';
    mockFetch({
      ok: true,
      results: [
        {
          title: 'Coverage of the claim from the reserve search',
          url: 'https://example.com/only-reserve',
          content: 'The reserve search still found coverage of this claim being verified.',
          score: 0.7,
        },
      ],
    });

    const result = await runLayer2('the claim being verified', 'en');

    const tavilyCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('tavily.com'));
    expect(tavilyCalls).toHaveLength(1);
    expect(result.status).toBe('success');
    expect(result.results[0].source).toBe('example.com');
  });

  it('counts as searched when the free engines are down but the reserve gets through', async () => {
    process.env.TAVILY_API_KEY = 'tavily-key';
    bing.mockRejectedValue(new Error('bing-news HTTP 429'));
    google.mockRejectedValue(new Error('google-news HTTP 503'));

    const result = await runLayer2('orice afirmatie', 'ro');

    expect(result.status).toBe('success');
  });
});
