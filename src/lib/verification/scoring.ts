import type {
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
  ScoreBreakdown,
  Verdict,
} from '@/types/verification';

const WEIGHTS = {
  layer1: 0.35,
  layer2: 0.30,
  layer3: 0.25,
  layer4: 0.10,
} as const;

/**
 * Calculates the final veracity score (0-100) using a weighted average.
 *
 * Formula (all 4 layers available):
 *   Score = (L1 * 0.35 + L2 * 0.30 + L3 * 0.25 + L4 * 0.10) * 100
 *
 * Adjustment for unavailable layers:
 *   If a layer is 'unavailable' or 'error', its weight is redistributed
 *   proportionally among the available layers.
 *
 * Score → Verdict mapping:
 *   85-100 → true
 *   60-84  → partial
 *   40-59  → unclear
 *   0-39   → false
 *
 * Confidence level (based on available layers):
 *   4 layers → high
 *   2-3 layers → medium
 *   1 layer → low
 */
export function calculateScore(layers: {
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
}): ScoreBreakdown {
  // Determine which layers are available
  const available = {
    layer1: layers.layer1.status === 'success',
    layer2: layers.layer2.status === 'success',
    layer3: layers.layer3.status === 'success',
    // Layer 4 'skipped' (no entities found) counts as available with neutral score
    layer4: layers.layer4.status === 'success' || layers.layer4.status === 'skipped',
  };

  // Calculate the sum of weights for available layers
  const totalAvailableWeight = (Object.keys(available) as Array<keyof typeof available>)
    .filter(key => available[key])
    .reduce((sum, key) => sum + WEIGHTS[key], 0);

  let rawScore: number;

  if (totalAvailableWeight === 0) {
    // All layers failed — should be caught upstream, but default to 0.5
    rawScore = 0.5;
  } else {
    // Compute weighted score, redistributing weights for unavailable layers
    rawScore = (Object.keys(available) as Array<keyof typeof available>)
      .filter(key => available[key])
      .reduce((sum, key) => {
        const originalWeight = WEIGHTS[key];
        const normalizedWeight = originalWeight / totalAvailableWeight;
        const layerScore = layers[key].layerScore;
        return sum + layerScore * normalizedWeight;
      }, 0);
  }

  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore * 100)));
  const availableLayers = (Object.values(available) as boolean[]).filter(Boolean).length;

  return {
    layer1Weight: 0.35,
    layer2Weight: 0.30,
    layer3Weight: 0.25,
    layer4Weight: 0.10,
    layer1Score: Math.round(layers.layer1.layerScore * 100),
    layer2Score: Math.round(layers.layer2.layerScore * 100),
    layer3Score: Math.round(layers.layer3.layerScore * 100),
    layer4Score: Math.round(layers.layer4.layerScore * 100),
    finalScore,
    availableLayers,
    adjustedForAvailability: availableLayers < 4,
  };
}

/**
 * Converts a numeric score to a verdict label.
 */
export function scoreToVerdict(score: number): Verdict {
  if (score >= 85) return 'true';
  if (score >= 60) return 'partial';
  if (score >= 40) return 'unclear';
  return 'false';
}

/**
 * Converts the number of available layers to a confidence level.
 */
export function scoreToConfidence(
  availableLayers: number
): 'high' | 'medium' | 'low' {
  if (availableLayers === 4) return 'high';
  if (availableLayers >= 2) return 'medium';
  return 'low';
}
