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
});

describe('runLayer4', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.TWITTER_BEARER_TOKEN;
  });

  it('reports itself skipped, without searching, when no social provider is configured', async () => {
    global.fetch = jest.fn();

    const result = await runLayer4('Klaus Iohannis a declarat ceva', 'ro');

    expect(result.status).toBe('skipped');
    expect(result.results).toEqual([]);
    expect(result.layerScore).toBe(0.5);
    expect(global.fetch).not.toHaveBeenCalled();
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

  it('reports itself unavailable when the configured provider fails', async () => {
    process.env.TWITTER_BEARER_TOKEN = 'twitter-token';
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 503));

    const result = await runLayer4('Klaus Iohannis a declarat ceva', 'ro');

    expect(result.status).toBe('unavailable');
    expect(result.results).toEqual([]);
  });
});
