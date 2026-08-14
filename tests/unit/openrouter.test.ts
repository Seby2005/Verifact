import { generateOpenRouterAssessment, generateOpenRouterAnalysis } from '@/lib/ai/openrouter';
import { resetAllCircuits } from '@/lib/utils/circuit-breaker';
import type { AIAnalysisContext } from '@/types/verification';

describe('OpenRouter AI Integration', () => {
  const originalEnv = process.env;

  const dummyContext: AIAnalysisContext = {
    claim: 'Test claim',
    inputText: 'Test claim',
    language: 'ro',
    layers: {
      layer1: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
      layer2: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0, sourcesChecked: 0 },
      layer3: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
      layer4: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
    },
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    resetAllCircuits();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws an error if OPENROUTER_API_KEY is not set', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(
      generateOpenRouterAssessment(dummyContext)
    ).rejects.toThrow('OPENROUTER_API_KEY is not configured');
  });

  it('parses structured JSON assessment correctly', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 85,
              verdict: 'supports',
              confidence: 0.9,
              reasoning: 'Afirmația este susținută de surse oficiale.',
            }),
          },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateOpenRouterAssessment(dummyContext);

    expect(result.score).toBe(85);
    expect(result.verdict).toBe('supports');
    expect(result.confidence).toBe(0.9);
    expect(result.reasoning).toContain('susținută');
  });

  it('generates prose analysis text correctly', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Aceasta este o analiză detaliată generată de modelul DeepSeek prin OpenRouter API pentru testare.',
          },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateOpenRouterAnalysis(dummyContext);
    expect(result.text).toContain('analiză detaliată');
  });
});
