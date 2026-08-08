jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

import { runLayer1, buildFactCheckQuery } from '@/lib/verification/layer1-factcheck';

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

  it('handles fetch errors gracefully returning empty results', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    const result = await runLayer1('Orice afirmatie', 'ro');
    expect(result.status).toBe('success');
    expect(result.results).toEqual([]);
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
