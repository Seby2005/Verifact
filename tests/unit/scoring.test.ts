import { calculateScore, scoreToVerdict, scoreToConfidence } from '@/lib/verification/scoring';
import type { Layer1Result, Layer2Result, Layer3Result, Layer4Result } from '@/types/verification';

function layer1(layerScore: number, resultCount: number, status: Layer1Result['status'] = 'success'): Layer1Result {
  return { status, results: Array.from({ length: resultCount }, () => ({})) as never, layerScore };
}
function layer2(layerScore: number, resultCount: number, status: Layer2Result['status'] = 'success'): Layer2Result {
  return { status, results: Array.from({ length: resultCount }, () => ({})) as never, layerScore };
}
function layer3(layerScore: number, resultCount: number, status: Layer3Result['status'] = 'success'): Layer3Result {
  return { status, results: Array.from({ length: resultCount }, () => ({})) as never, layerScore };
}
function layer4(layerScore: number, resultCount: number, status: Layer4Result['status'] = 'success'): Layer4Result {
  return { status, results: Array.from({ length: resultCount }, () => ({})) as never, layerScore };
}

const NEUTRAL_L1 = layer1(0.5, 0);
const NEUTRAL_L2 = layer2(0.5, 0);
const NEUTRAL_L3 = layer3(0.5, 0);
const NEUTRAL_L4 = layer4(0.5, 0);

describe('calculateScore', () => {
  it('weights all 4 layers + AI when every one has real evidence', () => {
    const result = calculateScore({
      layer1: layer1(0.1, 3),
      layer2: layer2(0.2, 5),
      layer3: layer3(0.15, 2),
      layer4: layer4(0.6, 1),
      ai: { score: 10, confidence: 0.9 },
    });

    // layer3 (2 results) and layer4 (1) fall short of CORROBORATION_TARGET, so
    // the part of their weight they have not earned abstains at 0.5:
    // (0.1*0.35 + 0.2*0.30 + 0.15*0.167 + 0.6*0.033 + 0.1*0.10 + 0.5*0.15) / 1.10 * 100 ≈ 20.5
    expect(result.finalScore).toBe(20);
    expect(result.availableLayers).toBe(4);
    expect(result.adjustedForAvailability).toBe(false);
    expect(scoreToVerdict(result.finalScore)).toBe('false');
    expect(scoreToConfidence(result.availableLayers)).toBe('high');
  });

  it('falls back to a neutral 50 when nothing has evidence and the AI has low confidence', () => {
    const result = calculateScore({
      layer1: NEUTRAL_L1,
      layer2: NEUTRAL_L2,
      layer3: NEUTRAL_L3,
      layer4: NEUTRAL_L4,
      ai: { score: 50, confidence: 0.1 }, // below the 0.3 confidence floor
    });

    expect(result.finalScore).toBe(50);
    expect(result.availableLayers).toBe(0);
    expect(scoreToConfidence(result.availableLayers)).toBe('low');
    expect(scoreToVerdict(result.finalScore)).toBe('unclear');
  });

  it('lets the AI assessment carry the whole score when no search layer found anything', () => {
    const result = calculateScore({
      layer1: NEUTRAL_L1,
      layer2: NEUTRAL_L2,
      layer3: NEUTRAL_L3,
      layer4: NEUTRAL_L4,
      ai: { score: 80, confidence: 0.7 },
    });

    expect(result.finalScore).toBe(80);
    expect(result.availableLayers).toBe(0); // search-layer count, not AI
    expect(scoreToVerdict(result.finalScore)).toBe('partial');
  });

  it('redistributes weight across only the layers with real evidence', () => {
    const result = calculateScore({
      layer1: layer1(0.9, 4),
      layer2: NEUTRAL_L2,
      layer3: layer3(1.0, 2),
      layer4: NEUTRAL_L4,
      ai: { score: 50, confidence: 0.1 }, // excluded (low confidence)
    });

    // layer3 has 2 of the 3 results needed for full weight, so a third of its
    // 0.25 abstains: (0.9*0.35 + 1.0*0.167 + 0.5*0.083) / 0.60 * 100 ≈ 87.2
    expect(result.finalScore).toBe(87);
    expect(result.availableLayers).toBe(2);
    expect(result.adjustedForAvailability).toBe(true);
    expect(scoreToVerdict(result.finalScore)).toBe('true');
    expect(scoreToConfidence(result.availableLayers)).toBe('medium');
  });

  it('excludes a layer that returned results but scored exactly neutral (no real signal)', () => {
    // layer2 has 10 articles but they nett out to a neutral 0.5 — that is an
    // absence of signal, not a vote for "unclear", and must not dilute the
    // layers that did find something (see scoring.ts's hasEvidence comment).
    const result = calculateScore({
      layer1: layer1(0.05, 3),
      layer2: layer2(0.5, 10),
      layer3: NEUTRAL_L3,
      layer4: NEUTRAL_L4,
    });

    // Only layer1 counts: 0.05*0.35/0.35 * 100 = 5
    expect(result.finalScore).toBe(5);
    expect(result.availableLayers).toBe(1);
  });

  it('returns 50 when every layer is unavailable/errored and there is no AI input', () => {
    const result = calculateScore({
      layer1: layer1(0.5, 0, 'unavailable'),
      layer2: layer2(0.5, 0, 'unavailable'),
      layer3: layer3(0.5, 0, 'unavailable'),
      layer4: layer4(0.5, 0, 'unavailable'),
    });

    expect(result.finalScore).toBe(50);
    expect(result.availableLayers).toBe(0);
  });

  describe('thin evidence', () => {
    it('does not let a single source outvote everything else', () => {
      // The reported case: "Apa pură fierbe la 100°C" came back "Probabil
      // fals" at 29 because one unrelated EU regulation was the only thing
      // layer3 found, and redistribution handed it 71% of the decision.
      const result = calculateScore({
        layer1: NEUTRAL_L1,
        layer2: NEUTRAL_L2,
        layer3: layer3(0, 1),
        layer4: NEUTRAL_L4,
        ai: { score: 100, confidence: 0.9 },
      });

      expect(result.finalScore).toBe(52);
      expect(scoreToVerdict(result.finalScore)).toBe('unclear');
    });

    it('gives the same layer its full say once it is corroborated', () => {
      const result = calculateScore({
        layer1: NEUTRAL_L1,
        layer2: NEUTRAL_L2,
        layer3: layer3(0, 3),
        layer4: NEUTRAL_L4,
        ai: { score: 100, confidence: 0.9 },
      });

      // 0*0.25 + 1.0*0.10, over 0.35 — nothing abstains any more.
      expect(result.finalScore).toBe(29);
      expect(scoreToVerdict(result.finalScore)).toBe('false');
    });

    it('scales between the two as corroboration builds', () => {
      const oneSource = calculateScore({
        layer1: NEUTRAL_L1, layer2: NEUTRAL_L2, layer3: layer3(0, 1), layer4: NEUTRAL_L4,
        ai: { score: 100, confidence: 0.9 },
      }).finalScore;
      const twoSources = calculateScore({
        layer1: NEUTRAL_L1, layer2: NEUTRAL_L2, layer3: layer3(0, 2), layer4: NEUTRAL_L4,
        ai: { score: 100, confidence: 0.9 },
      }).finalScore;

      expect(twoSources).toBeLessThan(oneSource);
    });
  });

  describe('when no search layer found evidence', () => {
    const NOTHING_FOUND = {
      layer1: layer1(0.5, 0, 'unavailable'),
      layer2: layer2(0.5, 0, 'unavailable'),
      layer3: layer3(0.5, 0, 'unavailable'),
      layer4: layer4(0.5, 0, 'unavailable'),
    };

    it('allows a confident AI assessment to return a "true" verdict when no search layer found evidence', () => {
      const result = calculateScore({ ...NOTHING_FOUND, ai: { score: 100, confidence: 0.95 } });

      expect(result.finalScore).toBe(100);
      expect(scoreToVerdict(result.finalScore)).toBe('true');
      expect(result.availableLayers).toBe(0);
    });

    it('allows a confident AI assessment to return a "false" verdict when no search layer found evidence', () => {
      const result = calculateScore({ ...NOTHING_FOUND, ai: { score: 0, confidence: 0.95 } });

      expect(result.finalScore).toBe(0);
      expect(scoreToVerdict(result.finalScore)).toBe('false');
    });

    it('leaves an assessment inside the band untouched', () => {
      const result = calculateScore({ ...NOTHING_FOUND, ai: { score: 62, confidence: 0.8 } });

      expect(result.finalScore).toBe(62);
    });

    it('still reports low confidence, since nothing corroborates the score', () => {
      const result = calculateScore({ ...NOTHING_FOUND, ai: { score: 100, confidence: 0.95 } });

      expect(scoreToConfidence(result.availableLayers)).toBe('low');
    });
  });

  it('does not cap the score when a search layer did find evidence', () => {
    const result = calculateScore({
      layer1: layer1(1, 3),
      layer2: NEUTRAL_L2,
      layer3: NEUTRAL_L3,
      layer4: NEUTRAL_L4,
      ai: { score: 100, confidence: 0.9 },
    });

    expect(result.finalScore).toBe(100);
    expect(scoreToVerdict(result.finalScore)).toBe('true');
  });

  it('clamps the final score into the 0-100 range', () => {
    const result = calculateScore({
      layer1: layer1(0, 1),
      layer2: NEUTRAL_L2,
      layer3: NEUTRAL_L3,
      layer4: NEUTRAL_L4,
    });

    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
  });
});

describe('scoreToVerdict', () => {
  it.each([
    [100, 'true'],
    [85, 'true'],
    [84, 'partial'],
    [60, 'partial'],
    [59, 'unclear'],
    [40, 'unclear'],
    [39, 'false'],
    [0, 'false'],
  ] as const)('maps score %d to verdict %s', (score, expected) => {
    expect(scoreToVerdict(score)).toBe(expected);
  });
});

describe('scoreToConfidence', () => {
  it.each([
    [4, 'high'],
    [3, 'medium'],
    [2, 'medium'],
    [1, 'low'],
    [0, 'low'],
  ] as const)('maps %d available layers to confidence %s', (available, expected) => {
    expect(scoreToConfidence(available)).toBe(expected);
  });
});
