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
  it('strips Romanian stopwords when not translating', () => {
    const query = buildFactCheckQuery('vaccinurile ARNm modifică ADN-ul uman', false);
    expect(query).not.toMatch(/\bul\b|\ba\b/);
    expect(query).toContain('vaccinurile');
  });

  it('maps known Romanian terms to English when translating', () => {
    const query = buildFactCheckQuery('vaccinurile modifică ADN-ul', true);
    expect(query).toContain('vaccines');
    expect(query).toContain('DNA');
  });

  it('keeps international tokens (recognised acronyms) when translating', () => {
    const query = buildFactCheckQuery('vaccinul covid provoacă boli', true);
    expect(query).toContain('covid');
  });

  it('returns empty when too few terms translate to English', () => {
    const query = buildFactCheckQuery('acesta este un text complet netraductibil aleatoriu', true);
    expect(query).toBe('');
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
    expect(result.results).toHaveLength(1);
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

  it('propagates a primary-search failure (caught by the orchestrator, not here)', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    await expect(runLayer1('Orice afirmatie', 'ro')).rejects.toThrow('Fact Check API error');
  });

  it('falls back to primary-only results when the secondary English search fails', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        // Primary (ro) search: fewer than 3 results, so a secondary EN
        // search is attempted next.
        return Promise.resolve(
          jsonResponse({
            claims: [
              {
                text: 'vaccinurile sunt periculoase',
                claimReview: [{ publisher: { name: 'Factual.ro' }, url: 'https://factual.ro/1', textualRating: 'Fals' }],
              },
            ],
          })
        );
      }
      // Secondary (en) search fails outright.
      return Promise.resolve(jsonResponse({}, false, 503));
    });

    const result = await runLayer1('Vaccinurile sunt periculoase', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].publisher).toBe('Factual.ro');
  });

  it('does not attempt a secondary search when the input language is already English', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        claims: [
          { text: 'a', claimReview: [{ publisher: { name: 'A' }, url: 'https://a.com/1', textualRating: 'True' }] },
          { text: 'b', claimReview: [{ publisher: { name: 'B' }, url: 'https://b.com/1', textualRating: 'True' }] },
        ],
      })
    );

    await runLayer1('Some claim in english', 'en');

    // Only the primary (en) search should have run — no second call.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('deduplicates results by review URL', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount += 1;
      const claim = {
        text: 'aceeasi afirmatie',
        claimReview: [{ publisher: { name: 'X' }, url: 'https://x.com/same', textualRating: 'False' }],
      };
      // Same URL shows up in both the primary and secondary search.
      return Promise.resolve(jsonResponse({ claims: callCount <= 2 ? [claim] : [] }));
    });

    const result = await runLayer1('aceeasi afirmatie', 'ro');

    expect(result.results).toHaveLength(1);
  });

  it('caps results at 8', async () => {
    const claims = Array.from({ length: 15 }, (_, i) => ({
      text: `claim ${i}`,
      claimReview: [{ publisher: { name: `Pub${i}` }, url: `https://example.com/${i}`, textualRating: 'False' }],
    }));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ claims }));

    const result = await runLayer1('Some claim with many fact checks', 'en');

    expect(result.results.length).toBeLessThanOrEqual(8);
  });
});
