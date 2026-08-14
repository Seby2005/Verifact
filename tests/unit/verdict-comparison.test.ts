import { calculateScore, scoreToVerdict } from '@/lib/verification/scoring';

describe('Claim Verification & Scoring Equivalence Check', () => {
  const sampleClaims = [
    {
      claim: 'România a aderat la Uniunea Europeană în 2007 (Factual True)',
      layers: {
        layer1: { status: 'success' as const, layerScore: 0.95, results: [{}, {}, {}] },
        layer2: { status: 'success' as const, layerScore: 0.90, results: [{}, {}, {}, {}] },
        layer3: { status: 'success' as const, layerScore: 0.95, results: [{}, {}] },
        layer4: { status: 'skipped' as const, layerScore: 0.5, results: [] },
        ai: { score: 95, confidence: 0.95 },
      },
      expectedScoreRange: [85, 100],
      expectedVerdict: 'true',
    },
    {
      claim: 'Vaccinurile ARNm conțin microcipuri pentru controlul populației (Debunked False)',
      layers: {
        layer1: { status: 'success' as const, layerScore: 0.05, results: [{}, {}, {}, {}] },
        layer2: { status: 'success' as const, layerScore: 0.10, results: [{}, {}, {}] },
        layer3: { status: 'success' as const, layerScore: 0.10, results: [{}] },
        layer4: { status: 'skipped' as const, layerScore: 0.5, results: [] },
        ai: { score: 5, confidence: 0.98 },
      },
      expectedScoreRange: [0, 39],
      expectedVerdict: 'false',
    },
    {
      claim: 'Afirmație fără consens științific sau dovezi căutabile (Unclear)',
      layers: {
        layer1: { status: 'success' as const, layerScore: 0.5, results: [] },
        layer2: { status: 'success' as const, layerScore: 0.5, results: [] },
        layer3: { status: 'success' as const, layerScore: 0.5, results: [] },
        layer4: { status: 'skipped' as const, layerScore: 0.5, results: [] },
        ai: { score: 50, confidence: 0.2 },
      },
      expectedScoreRange: [40, 59],
      expectedVerdict: 'unclear',
    },
  ];

  sampleClaims.forEach(({ claim, layers, expectedScoreRange, expectedVerdict }) => {
    it(`evaluates "${claim}" consistently`, () => {
      const result = calculateScore(layers as any);
      const verdict = scoreToVerdict(result.finalScore);

      expect(result.finalScore).toBeGreaterThanOrEqual(expectedScoreRange[0]);
      expect(result.finalScore).toBeLessThanOrEqual(expectedScoreRange[1]);
      expect(verdict).toBe(expectedVerdict);
    });
  });
});
