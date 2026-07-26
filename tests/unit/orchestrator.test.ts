const mockRunLayer1 = jest.fn();
const mockRunLayer2 = jest.fn();
const mockRunLayer3 = jest.fn();
const mockRunLayer4 = jest.fn();
const mockGenerateAIAssessment = jest.fn();
const mockGenerateAIAnalysis = jest.fn();
const mockGetCached = jest.fn();
const mockSetCached = jest.fn();

jest.mock('@/lib/verification/layer1-factcheck', () => ({ runLayer1: mockRunLayer1 }));
jest.mock('@/lib/verification/layer2-news', () => ({ runLayer2: mockRunLayer2 }));
jest.mock('@/lib/verification/layer3-official', () => ({ runLayer3: mockRunLayer3 }));
jest.mock('@/lib/verification/layer4-social', () => ({ runLayer4: mockRunLayer4 }));
jest.mock('@/lib/ai/gemini', () => ({
  generateAIAssessment: mockGenerateAIAssessment,
  generateAIAnalysis: mockGenerateAIAnalysis,
}));
jest.mock('@/lib/verification/cache', () => ({ getCached: mockGetCached, setCached: mockSetCached }));

import { verifyContent } from '@/lib/verification/orchestrator';
import type { Layer1Result, Layer2Result, Layer3Result, Layer4Result, VerificationInput } from '@/types/verification';

const BASE_INPUT: VerificationInput = {
  inputType: 'text',
  text: 'Vaccinurile ARNm modifica ADN-ul uman.',
  language: 'ro',
  isPublic: false,
};

function successLayer1(layerScore: number, count = 2): Layer1Result {
  return { status: 'success', results: Array.from({ length: count }, () => ({})) as never, layerScore };
}
function successLayer2(layerScore: number, count = 2): Layer2Result {
  return { status: 'success', results: Array.from({ length: count }, () => ({})) as never, layerScore };
}
function successLayer3(layerScore: number, count = 2): Layer3Result {
  return { status: 'success', results: Array.from({ length: count }, () => ({})) as never, layerScore };
}
function successLayer4(layerScore: number, count = 1): Layer4Result {
  return { status: 'success', results: Array.from({ length: count }, () => ({})) as never, layerScore };
}
const SKIPPED_LAYER4: Layer4Result = { status: 'skipped', results: [], layerScore: 0.5 };

describe('verifyContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCached.mockResolvedValue(null);
    mockGenerateAIAssessment.mockResolvedValue({ score: 50, verdict: 'insufficient', confidence: 0, reasoning: '' });
    mockGenerateAIAnalysis.mockResolvedValue('Analiza AI completa despre aceasta afirmatie.');
  });

  it('returns the cached report unmodified except for fromCache/isPublic/userId, without calling any layer', async () => {
    const cachedReport = { id: 'cached-1', score: 10, verdict: 'false' } as never;
    mockGetCached.mockResolvedValue(cachedReport);

    const report = await verifyContent({ ...BASE_INPUT, isPublic: true, userId: 'user-1' });

    expect(report.fromCache).toBe(true);
    expect(report.isPublic).toBe(true);
    expect(report.userId).toBe('user-1');
    expect(report.id).toBe('cached-1');
    expect(mockRunLayer1).not.toHaveBeenCalled();
  });

  it('builds a full report when every layer succeeds and the AI is available', async () => {
    mockRunLayer1.mockResolvedValue(successLayer1(0.1));
    mockRunLayer2.mockResolvedValue(successLayer2(0.2));
    mockRunLayer3.mockResolvedValue(successLayer3(0.15));
    mockRunLayer4.mockResolvedValue(successLayer4(0.6));
    mockGenerateAIAssessment.mockResolvedValue({ score: 10, verdict: 'contradicts', confidence: 0.9, reasoning: 'x' });

    const report = await verifyContent(BASE_INPUT);

    expect(report.aiAvailable).toBe(true);
    expect(report.verdict).toBe('false');
    expect(report.fromCache).toBeFalsy();
    expect(report.aiAnalysis).toBe('Analiza AI completa despre aceasta afirmatie.');
  });

  it('throws ALL_LAYERS_FAILED when every layer rejects', async () => {
    mockRunLayer1.mockRejectedValue(new Error('layer1 down'));
    mockRunLayer2.mockRejectedValue(new Error('layer2 down'));
    mockRunLayer3.mockRejectedValue(new Error('layer3 down'));
    mockRunLayer4.mockRejectedValue(new Error('layer4 down'));

    await expect(verifyContent(BASE_INPUT)).rejects.toThrow('ALL_LAYERS_FAILED');
  });

  it('treats a "skipped" layer (e.g. layer4 with no named entities) as sufficient to continue', async () => {
    mockRunLayer1.mockRejectedValue(new Error('layer1 down'));
    mockRunLayer2.mockRejectedValue(new Error('layer2 down'));
    mockRunLayer3.mockRejectedValue(new Error('layer3 down'));
    mockRunLayer4.mockResolvedValue(SKIPPED_LAYER4);

    const report = await verifyContent(BASE_INPUT);

    // Did not throw ALL_LAYERS_FAILED — a single skipped layer was enough.
    expect(report).toBeDefined();
  });

  it('falls back to a factual summary and marks aiAvailable=false when the AI analysis fails, without caching the result', async () => {
    mockRunLayer1.mockResolvedValue(successLayer1(0.1));
    mockRunLayer2.mockResolvedValue(successLayer2(0.2));
    mockRunLayer3.mockResolvedValue(successLayer3(0.15));
    mockRunLayer4.mockResolvedValue(successLayer4(0.6));
    mockGenerateAIAnalysis.mockRejectedValue(new Error('Gemini quota exceeded'));

    const report = await verifyContent(BASE_INPUT);

    expect(report.aiAvailable).toBe(false);
    expect(report.aiAnalysis).toContain('Analiza automată în limbaj natural nu este disponibilă');
    expect(report.aiAnalysis).toContain(`${report.score}%`);
    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it('maps a rejected layer to an "unavailable" status carrying the rejection reason', async () => {
    mockRunLayer1.mockRejectedValue(new Error('Fact Check API error: 503'));
    mockRunLayer2.mockResolvedValue(successLayer2(0.4));
    mockRunLayer3.mockResolvedValue(successLayer3(0.4));
    mockRunLayer4.mockResolvedValue(successLayer4(0.5));

    const report = await verifyContent(BASE_INPUT);

    expect(report.layer1?.status).toBe('unavailable');
    expect(report.layer1?.error).toContain('Fact Check API error: 503');
  });

  it('caches the report when at least 2 layers have real data and the AI succeeded', async () => {
    mockRunLayer1.mockResolvedValue(successLayer1(0.1, 3));
    mockRunLayer2.mockResolvedValue(successLayer2(0.2, 3));
    mockRunLayer3.mockResolvedValue(successLayer3(0.5, 0)); // no results — doesn't count
    mockRunLayer4.mockResolvedValue(SKIPPED_LAYER4);

    await verifyContent(BASE_INPUT);

    expect(mockSetCached).toHaveBeenCalledTimes(1);
    expect(mockSetCached.mock.calls[0][0]).toEqual(expect.any(String));
  });

  it('does not cache the report when fewer than 2 layers have real data', async () => {
    mockRunLayer1.mockResolvedValue(successLayer1(0.1, 3));
    mockRunLayer2.mockResolvedValue(successLayer2(0.5, 0));
    mockRunLayer3.mockResolvedValue(successLayer3(0.5, 0));
    mockRunLayer4.mockResolvedValue(SKIPPED_LAYER4);

    await verifyContent(BASE_INPUT);

    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it('times out a layer that never resolves within LAYER_TIMEOUT_MS and continues with the rest', async () => {
    jest.useFakeTimers();
    try {
      // Resolves eventually (so nothing is left permanently pending after
      // this test), just long after the orchestrator's own timeout fires.
      let resolveLayer1: (value: Layer1Result) => void = () => {};
      mockRunLayer1.mockReturnValue(new Promise<Layer1Result>((resolve) => { resolveLayer1 = resolve; }));
      mockRunLayer2.mockResolvedValue(successLayer2(0.3));
      mockRunLayer3.mockResolvedValue(successLayer3(0.3));
      mockRunLayer4.mockResolvedValue(successLayer4(0.5));

      const reportPromise = verifyContent(BASE_INPUT);
      await jest.advanceTimersByTimeAsync(10_001);
      const report = await reportPromise;

      expect(report.layer1?.status).toBe('unavailable');
      expect(report.layer1?.error).toContain('timeout');

      resolveLayer1(successLayer1(0.9));
    } finally {
      jest.useRealTimers();
    }
  });
});
