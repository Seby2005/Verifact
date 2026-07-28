jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

import { runLayer2, detectSentiment, calculateLayer2Score } from '@/lib/verification/layer2-news';
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

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEWS_API_KEY;
    delete process.env.TAVILY_API_KEY;
  });

  it('returns a neutral, success result when neither provider is configured', async () => {
    global.fetch = jest.fn();

    const result = await runLayer2('orice afirmatie', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toEqual([]);
    expect(result.layerScore).toBe(0.5);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('combines NewsAPI and Tavily results', async () => {
    process.env.NEWS_API_KEY = 'news-key';
    process.env.TAVILY_API_KEY = 'tavily-key';

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('newsapi.org')) {
        return Promise.resolve(
          jsonResponse({
            status: 'ok',
            articles: [
              {
                title: 'Reuters headline about the claim being verified',
                description: 'A neutral description of the claim verified today, with enough overlap.',
                url: 'https://reuters.com/article-1',
                urlToImage: null,
                publishedAt: '2024-01-01',
                source: { id: 'reuters', name: 'Reuters' },
              },
            ],
          })
        );
      }
      return Promise.resolve(
        jsonResponse({
          results: [
            {
              title: 'G4Media coverage of the same claim being verified',
              url: 'https://g4media.ro/article-1',
              content: 'A neutral summary covering the same claim, verified today, in Romanian press.',
              score: 0.8,
            },
          ],
        })
      );
    });

    const result = await runLayer2('the claim being verified today', 'en');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(2);
    expect(result.sourcesChecked).toBe(2);
  });

  it('degrades gracefully when NewsAPI fails but Tavily succeeds', async () => {
    process.env.NEWS_API_KEY = 'news-key';
    process.env.TAVILY_API_KEY = 'tavily-key';

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('newsapi.org')) {
        return Promise.resolve(jsonResponse({}, false, 503));
      }
      return Promise.resolve(
        jsonResponse({
          results: [
            {
              title: 'Coverage of the claim from Tavily only',
              url: 'https://example.com/only-tavily',
              content: 'Tavily still found coverage of this claim even though NewsAPI failed.',
              score: 0.7,
            },
          ],
        })
      );
    });

    const result = await runLayer2('a claim', 'en');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].source).toBe('example.com');
  });

  it('deduplicates articles from the same domain, keeping the more credible one', async () => {
    process.env.NEWS_API_KEY = 'news-key';
    process.env.TAVILY_API_KEY = 'tavily-key';

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('newsapi.org')) {
        return Promise.resolve(
          jsonResponse({
            status: 'ok',
            articles: [
              {
                title: 'Reuters via NewsAPI',
                description: 'Some description with enough words to be relevant to the claim text here.',
                url: 'https://reuters.com/dup',
                urlToImage: null,
                publishedAt: '2024-01-01',
                source: { id: 'reuters', name: 'Reuters' },
              },
            ],
          })
        );
      }
      return Promise.resolve(
        jsonResponse({
          results: [
            {
              title: 'Reuters via Tavily',
              url: 'https://reuters.com/dup', // same URL as NewsAPI's
              content: 'Some description with enough words to be relevant to the claim text here.',
              score: 0.9,
            },
          ],
        })
      );
    });

    const result = await runLayer2('the claim text here to be verified', 'en');

    expect(result.results).toHaveLength(1);
  });
});
