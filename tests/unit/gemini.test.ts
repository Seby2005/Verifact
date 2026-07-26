import {
  isNonRetryableQuotaError,
  generateAIAssessment,
  generateAIAnalysis,
} from '@/lib/ai/gemini';
import type { AIAnalysisContext } from '@/types/verification';

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn(),
      }),
    })),
  };
});

describe('gemini AI module', () => {
  const originalEnv = process.env;

  const mockContext: AIAnalysisContext = {
    claim: 'Test claim',
    inputText: 'Test claim text',
    language: 'ro',
    layers: {
      layer1: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
      layer2: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0, sourcesChecked: 0 },
      layer3: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
      layer4: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isNonRetryableQuotaError', () => {
    it('identifies prepayment credits depleted error as non-retryable', () => {
      expect(isNonRetryableQuotaError('Prepayment credits are depleted for this project')).toBe(true);
    });

    it('identifies limit: 0 error as non-retryable', () => {
      expect(isNonRetryableQuotaError('Quota exceeded: limit: 0')).toBe(true);
    });

    it('identifies billing error as non-retryable', () => {
      expect(isNonRetryableQuotaError('Billing disabled')).toBe(true);
    });

    it('returns false for transient server errors', () => {
      expect(isNonRetryableQuotaError('503 Service Unavailable')).toBe(false);
      expect(isNonRetryableQuotaError('429 Too Many Requests')).toBe(false);
    });
  });

  describe('generateAIAssessment', () => {
    it('returns fallback assessment when API fails or throws', async () => {
      const result = await generateAIAssessment(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(['supports', 'contradicts', 'mixed', 'insufficient']).toContain(result.verdict);
    });
  });

  describe('generateAIAnalysis', () => {
    it('throws error when GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      await expect(generateAIAnalysis(mockContext)).rejects.toThrow('GEMINI_API_KEY is not configured');
    });
  });
});
