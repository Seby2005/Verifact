/**
 * Layer 1 unit tests — S2-2
 * Tests the Google Fact Check API integration and result parsing.
 */

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Import after setting up mocks
const { runLayer1 } = jest.requireActual('@/lib/verification/layer1-factcheck') as {
  runLayer1: (text: string, language: string) => Promise<{
    status: string;
    results: Array<{
      claimReviewed: string;
      rating: string;
      ratingValue: number;
      publisher: string;
      reviewUrl: string;
      relevanceScore: number;
    }>;
    layerScore: number;
    processingTime: number;
  }>;
};

// Set API key env var
beforeAll(() => {
  process.env.GOOGLE_FACT_CHECK_API_KEY = 'test-key-123';
});

afterEach(() => {
  jest.clearAllMocks();
});

const makeGoogleFactCheckResponse = (claims: Array<{
  text: string;
  claimant?: string;
  rating?: string;
  publisher?: string;
  url?: string;
}>) => ({
  status: 200,
  ok: true,
  json: async () => ({
    claims: claims.map(c => ({
      text: c.text,
      claimant: c.claimant,
      claimReview: [{
        textualRating: c.rating ?? 'Unknown',
        publisher: { name: c.publisher ?? 'Test Publisher', site: 'https://example.com' },
        url: c.url ?? 'https://example.com/review',
        reviewDate: '2024-01-01T00:00:00Z',
      }],
    })),
  }),
});

describe('runLayer1', () => {
  it('should return status success with parsed results when fact-checks exist', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleFactCheckResponse([
      { text: 'Vaccinurile COVID contin microcipuri', rating: 'False', publisher: 'Reuters' },
    ]) as unknown as Response);

    const result = await runLayer1('Vaccinurile COVID contin microcipuri', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].claimReviewed).toBe('Vaccinurile COVID contin microcipuri');
    expect(result.results[0].rating).toBe('False');
    expect(result.results[0].publisher).toBe('Reuters');
  });

  it('should return status success with empty results when no fact-checks found', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({}), // empty response = no claims
    } as unknown as Response);

    const result = await runLayer1('Some random claim with no history', 'ro');

    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(0);
    expect(result.layerScore).toBe(0.5); // neutral score when no data
  });

  it('should throw error when API returns non-200 status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 403,
      ok: false,
      statusText: 'Forbidden',
      json: async () => ({ error: 'API key invalid' }),
    } as unknown as Response);

    await expect(runLayer1('test claim', 'ro')).rejects.toThrow('Fact Check API error: 403');
  });

  it('should map "False" rating to ratingValue near 0', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleFactCheckResponse([
      { text: 'Claim is false', rating: 'False' },
    ]) as unknown as Response);

    const result = await runLayer1('Claim is false', 'en');
    expect(result.results[0].ratingValue).toBeLessThanOrEqual(0.1);
  });

  it('should map "True" rating to ratingValue near 1', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleFactCheckResponse([
      { text: 'Romania joined EU in 2007', rating: 'True' },
    ]) as unknown as Response);

    const result = await runLayer1('Romania joined EU in 2007', 'en');
    expect(result.results[0].ratingValue).toBeGreaterThanOrEqual(0.9);
  });

  it('should map "Mostly True" to mid-high ratingValue', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleFactCheckResponse([
      { text: 'Partial claim', rating: 'Mostly True' },
    ]) as unknown as Response);

    const result = await runLayer1('Partial claim', 'en');
    expect(result.results[0].ratingValue).toBeGreaterThan(0.6);
    expect(result.results[0].ratingValue).toBeLessThan(1.0);
  });

  it('should deduplicate results with same reviewUrl', async () => {
    const duplicateUrl = 'https://factcheck.example.com/review/123';
    mockFetch.mockResolvedValueOnce(makeGoogleFactCheckResponse([
      { text: 'Claim A', rating: 'False', url: duplicateUrl },
      { text: 'Claim B', rating: 'False', url: duplicateUrl }, // duplicate URL
      { text: 'Claim C', rating: 'True', url: 'https://other.com/review/456' },
    ]) as unknown as Response);

    const result = await runLayer1('test', 'en');
    // Should have deduplicated: only 2 unique URLs
    expect(result.results.length).toBeLessThanOrEqual(2);
    const urls = result.results.map(r => r.reviewUrl);
    expect(new Set(urls).size).toBe(urls.length); // all unique
  });

  it('should include processingTime in result', async () => {
    mockFetch.mockResolvedValueOnce(makeGoogleFactCheckResponse([]) as unknown as Response);
    const result = await runLayer1('test', 'ro');
    expect(typeof result.processingTime).toBe('number');
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  it('should have layerScore of 0.5 when no results (neutral)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({}),
    } as unknown as Response);

    const result = await runLayer1('Completely unverified obscure claim', 'ro');
    expect(result.layerScore).toBe(0.5);
  });
});
