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
  ai: 0.10,
} as const;

/**
 * A layer that ran successfully but found nothing returns layerScore 0.5. Left
 * in the weighted average that neutral vote pulls every hard-to-search claim to
 * exactly 50 ("unclear") — which is what the algorithm used to do to claims as
 * plain as "România a aderat la UE în 2007".
 *
 * A layer with no results is not evidence of neutrality, it is an absence of
 * evidence, so such layers are excluded from the average and their weight is
 * redistributed to the layers that did find something.
 */
function hasEvidence(layer: { status: string; results?: unknown[]; layerScore: number }): boolean {
  if (layer.status !== 'success' || (layer.results?.length ?? 0) === 0) return false;
  // A layer can return results and still fail to say anything about the claim —
  // e.g. layer 2 finds ten articles but classifies every one as neutral, which
  // produces a layerScore of exactly 0.5. That is an absence of signal, not a
  // vote for "unclear", so it must not dilute layers that did reach a finding.
  return Math.abs(layer.layerScore - 0.5) > 0.02;
}

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
  /** Gemini's own 0-100 assessment, and how confident it is in it. */
  ai?: { score: number; confidence: number };
}): ScoreBreakdown {
  const aiScore01 = layers.ai ? layers.ai.score / 100 : 0.5;

  // A layer counts only if it actually found something (see hasEvidence).
  // The AI assessment counts only when the model expressed real confidence.
  const available = {
    layer1: hasEvidence(layers.layer1),
    layer2: hasEvidence(layers.layer2),
    layer3: hasEvidence(layers.layer3),
    layer4: hasEvidence(layers.layer4),
    ai: Boolean(layers.ai && layers.ai.confidence >= 0.3),
  };

  // When search turned up nothing at all, the model's assessment is the only
  // signal available, so it carries the whole score rather than 10% of it.
  const searchLayersWithEvidence =
    Number(available.layer1) + Number(available.layer2) + Number(available.layer3) + Number(available.layer4);

  // Calculate the sum of weights for available layers
  const totalAvailableWeight = (Object.keys(available) as Array<keyof typeof available>)
    .filter(key => available[key])
    .reduce((sum, key) => sum + WEIGHTS[key], 0);

  let rawScore: number;

  if (totalAvailableWeight === 0) {
    // Nothing found anywhere and no usable AI assessment.
    rawScore = 0.5;
  } else if (searchLayersWithEvidence === 0 && available.ai) {
    rawScore = aiScore01;
  } else {
    // Weighted average over the components that carry evidence, with the
    // weights of the empty ones redistributed proportionally.
    rawScore = (Object.keys(available) as Array<keyof typeof available>)
      .filter((key) => available[key])
      .reduce((sum, key) => {
        const normalizedWeight = WEIGHTS[key] / totalAvailableWeight;
        const layerScore = key === 'ai' ? aiScore01 : layers[key].layerScore;
        return sum + layerScore * normalizedWeight;
      }, 0);
  }

  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore * 100)));
  // Confidence reflects corroborating search layers, not the AI assessment.
  const availableLayers = searchLayersWithEvidence;

  return {
    weights: {
      factCheck: 0.35,
      news: 0.30,
      official: 0.25,
      social: 0.10,
      ai: 0.10,
    },
    aiScore: layers.ai?.score,
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
