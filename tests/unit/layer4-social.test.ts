jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

import { runLayer4, extractNamedEntities } from '@/lib/verification/layer4-social';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, statusText: ok ? 'OK' : 'Error', json: () => Promise.resolve(body) };
}

describe('extractNamedEntities', () => {
  it('finds a known public figure mentioned in the text, case-insensitively', () => {
    const entities = extractNamedEntities('KLAUS IOHANNIS a declarat azi ceva', 'ro');
    expect(entities).toContain('Klaus Iohannis');
  });

  it('returns an empty array when no known figure is mentioned', () => {
    const entities = extractNamedEntities('O afirmatie fara nicio persoana publica cunoscuta', 'ro');
    expect(entities).toEqual([]);
  });
});

describe('runLayer4', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.TWITTER_BEARER_TOKEN;
    delete process.env.TAVILY_API_KEY;
  });

  it('is skipped (neutral) when no public figure is mentioned', async () => {
    const result = await runLayer4('O stire generica fara nume', 'ro');

    expect(result.status).toBe('skipped');
    expect(result.layerScore).toBe(0.5);
    expect(result.results).toEqual([]);
  });

  it('returns success with an empty result set when neither provider is configured', async () => {
    const result = await runLayer4('Klaus Iohannis a declarat ceva', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toEqual([]);
    expect(result.layerScore).toBe(0.5);
  });

  it('finds a post via Twitter when configured, and scores an original source highest', async () => {
    process.env.TWITTER_BEARER_TOKEN = 'twitter-token';
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [{ id: 't1', text: 'Declaratia mea oficiala', created_at: '2024-01-01', author_id: 'u1' }],
        includes: {
          users: [{ id: 'u1', name: 'Klaus Iohannis', username: 'KlausIohannis', verified: true }],
        },
      })
    );

    const result = await runLayer4('Klaus Iohannis a declarat ceva', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].isOriginalSource).toBe(true);
    expect(result.layerScore).toBe(0.7);
  });

  it('falls through to Tavily when the Twitter search fails', async () => {
    process.env.TWITTER_BEARER_TOKEN = 'twitter-token';
    process.env.TAVILY_API_KEY = 'tavily-key';

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('twitter.com')) {
        return Promise.resolve(jsonResponse({}, false, 503));
      }
      return Promise.resolve(
        jsonResponse({
          results: [
            {
              title: 'Klaus Iohannis: o declaratie publica',
              url: 'https://facebook.com/post/1',
              content: 'Continutul postarii',
              score: 0.7,
            },
          ],
        })
      );
    });

    const result = await runLayer4('Klaus Iohannis a declarat ceva', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].platform).toBe('facebook');
  });

  it('scores unverified-but-found posts at 0.6 when they are verified accounts, not original sources', async () => {
    process.env.TWITTER_BEARER_TOKEN = 'twitter-token';
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [{ id: 't1', text: 'A repost about someone else', created_at: '2024-01-01', author_id: 'u1' }],
        includes: {
          users: [{ id: 'u1', name: 'A Random Verified Journalist', username: 'journo', verified: true }],
        },
      })
    );

    const result = await runLayer4('Klaus Iohannis a declarat ceva', 'ro');

    expect(result.layerScore).toBe(0.6);
  });

  it('returns unavailable when the fallback search response cannot be parsed', async () => {
    process.env.TAVILY_API_KEY = 'tavily-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.reject(new Error('invalid json')),
    });

    const result = await runLayer4('Klaus Iohannis a declarat ceva', 'ro');

    expect(result.status).toBe('unavailable');
    expect(result.error).toContain('Social media search unavailable');
  });

  it('caps results at 8', async () => {
    process.env.TAVILY_API_KEY = 'tavily-key';
    const results = Array.from({ length: 12 }, (_, i) => ({
      title: `Post ${i}`,
      url: `https://twitter.com/user/status/${i}`,
      content: 'content',
      score: 0.5,
    }));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ results }));

    const result = await runLayer4('Klaus Iohannis a declarat ceva', 'ro');

    expect(result.results.length).toBeLessThanOrEqual(8);
  });
});
