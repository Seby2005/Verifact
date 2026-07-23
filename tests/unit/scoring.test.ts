/**
 * Scoring unit tests — Sprint 2 (S2-6)
 * Tests cover: calculateScore, scoreToVerdict, scoreToConfidence
 */

// We need to mock the layer types for testing
interface MockLayer1 { status: string; results: unknown[]; layerScore: number; processingTime: number; }
interface MockLayer2 { status: string; results: unknown[]; layerScore: number; processingTime: number; sourcesChecked: number; }
interface MockLayer3 { status: string; results: unknown[]; layerScore: number; processingTime: number; }
interface MockLayer4 { status: string; results: unknown[]; layerScore: number; processingTime: number; }

// Import the functions to test
// Using jest.mock to avoid real API calls
const { calculateScore, scoreToVerdict, scoreToConfidence } = jest.requireActual('@/lib/verification/scoring') as {
  calculateScore: (layers: { layer1: MockLayer1; layer2: MockLayer2; layer3: MockLayer3; layer4: MockLayer4 }) => {
    finalScore: number;
    availableLayers: number;
    adjustedForAvailability: boolean;
    layer1Score: number;
    layer2Score: number;
    layer3Score: number;
    layer4Score: number;
    layer1Weight: 0.35;
    layer2Weight: 0.30;
    layer3Weight: 0.25;
    layer4Weight: 0.10;
  };
  scoreToVerdict: (score: number) => string;
  scoreToConfidence: (n: number) => string;
};

// Helper to create mock layers
function mockLayer1(score: number, status = 'success'): MockLayer1 {
  return { status, results: [], layerScore: score, processingTime: 100 };
}
function mockLayer2(score: number, status = 'success'): MockLayer2 {
  return { status, results: [], layerScore: score, processingTime: 100, sourcesChecked: 0 };
}
function mockLayer3(score: number, status = 'success'): MockLayer3 {
  return { status, results: [], layerScore: score, processingTime: 100 };
}
function mockLayer4(score: number, status = 'success'): MockLayer4 {
  return { status, results: [], layerScore: score, processingTime: 100 };
}

describe('calculateScore', () => {
  it('should compute correct weighted score with all 4 layers available', () => {
    const layers = {
      layer1: mockLayer1(0.9),  // 35% weight
      layer2: mockLayer2(0.8),  // 30% weight
      layer3: mockLayer3(0.7),  // 25% weight
      layer4: mockLayer4(0.6),  // 10% weight
    };
    const breakdown = calculateScore(layers);
    // Expected: (0.9*0.35 + 0.8*0.30 + 0.7*0.25 + 0.6*0.10) * 100
    // = (0.315 + 0.24 + 0.175 + 0.06) * 100 = 79
    expect(breakdown.finalScore).toBe(79);
    expect(breakdown.availableLayers).toBe(4);
    expect(breakdown.adjustedForAvailability).toBe(false);
  });

  it('should redistribute weights when layer3 is unavailable', () => {
    const layers = {
      layer1: mockLayer1(1.0),  // weight 0.35 => normalized: 0.35/0.75 = 0.467
      layer2: mockLayer2(1.0),  // weight 0.30 => normalized: 0.30/0.75 = 0.4
      layer3: mockLayer3(0.5, 'unavailable'),
      layer4: mockLayer4(1.0, 'skipped'),  // weight 0.10 => normalized: 0.10/0.75 = 0.133
    };
    const breakdown = calculateScore(layers);
    // All available layers score 1.0 => final should be 100
    expect(breakdown.finalScore).toBe(100);
    expect(breakdown.adjustedForAvailability).toBe(true);
    expect(breakdown.availableLayers).toBe(3);
  });

  it('should redistribute weights when layer3 AND layer4 are unavailable', () => {
    const layers = {
      layer1: mockLayer1(0.8),  // weight: 0.35 / 0.65 = 0.538
      layer2: mockLayer2(0.6),  // weight: 0.30 / 0.65 = 0.462
      layer3: mockLayer3(0.5, 'unavailable'),
      layer4: mockLayer4(0.5, 'unavailable'),
    };
    const breakdown = calculateScore(layers);
    // Expected: (0.8 * 0.538 + 0.6 * 0.462) * 100 = (0.431 + 0.277) * 100 = 70.8 ~ 71
    expect(breakdown.finalScore).toBeCloseTo(71, 0);
    expect(breakdown.adjustedForAvailability).toBe(true);
    expect(breakdown.availableLayers).toBe(2);
  });

  it('should handle layer4 skipped (counts as available with neutral score)', () => {
    const layers = {
      layer1: mockLayer1(1.0),
      layer2: mockLayer2(1.0),
      layer3: mockLayer3(1.0),
      layer4: mockLayer4(0.5, 'skipped'),
    };
    const breakdown = calculateScore(layers);
    expect(breakdown.availableLayers).toBe(4);
    // (1.0*0.35 + 1.0*0.30 + 1.0*0.25 + 0.5*0.10) * 100 = (0.35+0.30+0.25+0.05)*100 = 95
    expect(breakdown.finalScore).toBe(95);
  });

  it('should return correct individual layer scores (0-100)', () => {
    const layers = {
      layer1: mockLayer1(0.82),
      layer2: mockLayer2(0.71),
      layer3: mockLayer3(0.45),
      layer4: mockLayer4(0.60),
    };
    const breakdown = calculateScore(layers);
    expect(breakdown.layer1Score).toBe(82);
    expect(breakdown.layer2Score).toBe(71);
    expect(breakdown.layer3Score).toBe(45);
    expect(breakdown.layer4Score).toBe(60);
  });

  it('should return correct weight constants', () => {
    const layers = {
      layer1: mockLayer1(0.5),
      layer2: mockLayer2(0.5),
      layer3: mockLayer3(0.5),
      layer4: mockLayer4(0.5),
    };
    const breakdown = calculateScore(layers);
    expect(breakdown.layer1Weight).toBe(0.35);
    expect(breakdown.layer2Weight).toBe(0.30);
    expect(breakdown.layer3Weight).toBe(0.25);
    expect(breakdown.layer4Weight).toBe(0.10);
  });

  it('should clamp score to 0-100 range', () => {
    const layers = {
      layer1: mockLayer1(0),
      layer2: mockLayer2(0),
      layer3: mockLayer3(0),
      layer4: mockLayer4(0),
    };
    const breakdown = calculateScore(layers);
    expect(breakdown.finalScore).toBeGreaterThanOrEqual(0);
    expect(breakdown.finalScore).toBeLessThanOrEqual(100);
  });
});

describe('scoreToVerdict', () => {
  it('should return "true" for score >= 85', () => {
    expect(scoreToVerdict(85)).toBe('true');
    expect(scoreToVerdict(100)).toBe('true');
    expect(scoreToVerdict(92)).toBe('true');
  });

  it('should return "partial" for score 60-84', () => {
    expect(scoreToVerdict(84)).toBe('partial');
    expect(scoreToVerdict(60)).toBe('partial');
    expect(scoreToVerdict(72)).toBe('partial');
    expect(scoreToVerdict(67)).toBe('partial');
  });

  it('should return "unclear" for score 40-59', () => {
    expect(scoreToVerdict(59)).toBe('unclear');
    expect(scoreToVerdict(40)).toBe('unclear');
    expect(scoreToVerdict(50)).toBe('unclear');
  });

  it('should return "false" for score < 40', () => {
    expect(scoreToVerdict(39)).toBe('false');
    expect(scoreToVerdict(0)).toBe('false');
    expect(scoreToVerdict(20)).toBe('false');
  });
});

describe('scoreToConfidence', () => {
  it('should return "high" when all 4 layers available', () => {
    expect(scoreToConfidence(4)).toBe('high');
  });

  it('should return "medium" for 2-3 layers', () => {
    expect(scoreToConfidence(3)).toBe('medium');
    expect(scoreToConfidence(2)).toBe('medium');
  });

  it('should return "low" for 1 layer', () => {
    expect(scoreToConfidence(1)).toBe('low');
  });

  it('should return "low" for 0 layers (edge case)', () => {
    expect(scoreToConfidence(0)).toBe('low');
  });
});
