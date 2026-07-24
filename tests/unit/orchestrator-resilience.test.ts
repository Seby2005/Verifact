/**
 * Resilience tests for the verification orchestrator.
 *
 * The veracity score is computed from the four evidence layers *before* the AI
 * model is called, so an AI provider outage must degrade the narrative section
 * only. Before this was fixed, a Gemini 429 (the key in use has a zero free-tier
 * quota) threw straight out of verifyContent() and the whole request became a
 * 500 — discarding four layers of successful source gathering.
 */

import type { Layer1Result, Layer2Result, Layer3Result, Layer4Result } from '@/types/verification';

const runLayer1 = jest.fn();
const runLayer2 = jest.fn();
const runLayer3 = jest.fn();
const runLayer4 = jest.fn();
const generateAIAnalysis = jest.fn();
const getCached = jest.fn();
const setCached = jest.fn();

jest.mock('@/lib/verification/layer1-factcheck', () => ({ runLayer1: (...a: unknown[]) => runLayer1(...a) }));
jest.mock('@/lib/verification/layer2-news', () => ({ runLayer2: (...a: unknown[]) => runLayer2(...a) }));
jest.mock('@/lib/verification/layer3-official', () => ({ runLayer3: (...a: unknown[]) => runLayer3(...a) }));
jest.mock('@/lib/verification/layer4-social', () => ({ runLayer4: (...a: unknown[]) => runLayer4(...a) }));
jest.mock('@/lib/ai/gemini', () => ({ generateAIAnalysis: (...a: unknown[]) => generateAIAnalysis(...a) }));
jest.mock('@/lib/verification/cache', () => ({
  getCached: (...a: unknown[]) => getCached(...a),
  setCached: (...a: unknown[]) => setCached(...a),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { verifyContent } = require('@/lib/verification/orchestrator') as typeof import('@/lib/verification/orchestrator');

const l1 = (score: number, n = 2): Layer1Result => ({
  status: 'success',
  results: Array.from({ length: n }, (_, i) => ({
    publisher: `Checker ${i}`,
    rating: 'False',
    ratingValue: 0,
    reviewUrl: `https://factcheck.example/${i}`,
    claimReviewed: 'claim',
    relevanceScore: 0.8,
  })),
  layerScore: score,
  processingTime: 10,
});

const l2 = (score: number, n = 2): Layer2Result => ({
  status: 'success',
  results: Array.from({ length: n }, (_, i) => ({
    title: `Article ${i}`,
    source: 'digi24.ro',
    articleUrl: `https://digi24.ro/${i}`,
    publishedAt: '2026-01-01',
    snippet: 's',
    credibilityScore: 0.88,
    sentiment: 'neutral' as const,
  })),
  layerScore: score,
  processingTime: 10,
  sourcesChecked: n,
});

const l3 = (score: number, status: Layer3Result['status'] = 'success'): Layer3Result => ({
  status,
  results: [],
  layerScore: score,
  processingTime: 10,
});

const l4 = (score: number, status: Layer4Result['status'] = 'skipped'): Layer4Result => ({
  status,
  results: [],
  layerScore: score,
  processingTime: 10,
});

const INPUT = {
  inputType: 'text' as const,
  text: 'Romania a aderat la Uniunea Europeana in anul 2007.',
  language: 'ro' as const,
  isPublic: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  getCached.mockResolvedValue(null);
  setCached.mockResolvedValue(undefined);
  runLayer1.mockResolvedValue(l1(0.9));
  runLayer2.mockResolvedValue(l2(0.8));
  runLayer3.mockResolvedValue(l3(0.7));
  runLayer4.mockResolvedValue(l4(0.5));
  generateAIAnalysis.mockResolvedValue('**Rezumat**\n\nAnaliza completa a afirmatiei verificate.');
});

describe('verifyContent — AI provider outage', () => {
  it('still returns a report when the AI analysis fails', async () => {
    generateAIAnalysis.mockRejectedValueOnce(new Error('[429 Too Many Requests] quota exceeded'));

    const report = await verifyContent(INPUT);

    expect(report.verdict).toBeDefined();
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(report.sources.length).toBeGreaterThan(0);
    expect(report.disclaimer).toBeTruthy();
  });

  it('keeps the score identical whether or not the AI analysis succeeded', async () => {
    const withAI = await verifyContent(INPUT);

    generateAIAnalysis.mockRejectedValueOnce(new Error('quota exceeded'));
    const withoutAI = await verifyContent(INPUT);

    expect(withoutAI.score).toBe(withAI.score);
    expect(withoutAI.verdict).toBe(withAI.verdict);
  });

  it('says plainly in the summary that the AI analysis was unavailable', async () => {
    generateAIAnalysis.mockRejectedValueOnce(new Error('quota exceeded'));
    const report = await verifyContent(INPUT);
    expect(report.aiAnalysis).toMatch(/nu a fost disponibil/i);
    expect(report.executiveSummary.length).toBeGreaterThan(0);
  });

  it('produces an English fallback for English input', async () => {
    generateAIAnalysis.mockRejectedValueOnce(new Error('quota exceeded'));
    const report = await verifyContent({ ...INPUT, language: 'en' });
    expect(report.aiAnalysis).toMatch(/unavailable/i);
  });

  it('does not cache a degraded report', async () => {
    generateAIAnalysis.mockRejectedValueOnce(new Error('quota exceeded'));
    await verifyContent(INPUT);
    expect(setCached).not.toHaveBeenCalled();
  });

  it('caches a full report when the AI analysis succeeded', async () => {
    await verifyContent(INPUT);
    expect(setCached).toHaveBeenCalledTimes(1);
  });
});

describe('verifyContent — layer failures', () => {
  it('continues when individual layers reject', async () => {
    runLayer1.mockRejectedValueOnce(new Error('Fact Check API error: 503'));
    runLayer3.mockRejectedValueOnce(new Error('Official Search API error: 403'));

    const report = await verifyContent(INPUT);

    expect(report.layers?.layer1.status).toBe('unavailable');
    expect(report.layers?.layer3.status).toBe('unavailable');
    expect(report.layers?.layer2.status).toBe('success');
    expect(report.scoreBreakdown.adjustedForAvailability).toBe(true);
  });

  it('throws ALL_LAYERS_FAILED only when every layer fails', async () => {
    runLayer1.mockRejectedValueOnce(new Error('x'));
    runLayer2.mockRejectedValueOnce(new Error('x'));
    runLayer3.mockRejectedValueOnce(new Error('x'));
    runLayer4.mockRejectedValueOnce(new Error('x'));

    await expect(verifyContent(INPUT)).rejects.toThrow('ALL_LAYERS_FAILED');
  });

  it('returns the cached report without re-running the layers', async () => {
    getCached.mockResolvedValueOnce({ id: 'cached', verdict: 'true', score: 90, sources: [] });
    const report = await verifyContent(INPUT);
    expect(report.fromCache).toBe(true);
    expect(runLayer1).not.toHaveBeenCalled();
    expect(generateAIAnalysis).not.toHaveBeenCalled();
  });
});

describe('verifyContent — report shape', () => {
  it('emits a well-formed report for the UI', async () => {
    const report = await verifyContent(INPUT);

    expect(report.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(['true', 'false', 'partial', 'unclear']).toContain(report.verdict);
    expect(['low', 'medium', 'high']).toContain(report.confidenceLevel);
    expect(Number.isInteger(report.score)).toBe(true);
    expect(report.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(report.language).toBe('ro');
    expect(report.isPublic).toBe(true);

    for (const source of report.sources) {
      expect(typeof source.url).toBe('string');
      expect(source.url.length).toBeGreaterThan(0);
      expect(typeof source.title).toBe('string');
      expect(['fact_check', 'official', 'news', 'social']).toContain(source.sourceType);
    }
  });

  it('deduplicates sources by URL and caps the list at 15', async () => {
    runLayer2.mockResolvedValueOnce({
      ...l2(0.8, 0),
      results: Array.from({ length: 30 }, () => ({
        title: 'Same article',
        source: 'digi24.ro',
        articleUrl: 'https://digi24.ro/duplicate',
        publishedAt: '2026-01-01',
        snippet: 's',
        credibilityScore: 0.88,
        sentiment: 'neutral' as const,
      })),
    });

    const report = await verifyContent(INPUT);
    const urls = report.sources.map(s => s.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(report.sources.length).toBeLessThanOrEqual(15);
  });

  it('orders sources official > fact_check > news > social', async () => {
    const report = await verifyContent(INPUT);
    const rank: Record<string, number> = { official: 0, fact_check: 1, news: 2, social: 3 };
    const ranks = report.sources.map(s => rank[s.sourceType]);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});
