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
 * The score at which each verdict label starts. Declared once because the
 * no-evidence cap below is defined in terms of these bands — if the cut points
 * were repeated in both places, moving one would silently break the other.
 */
const VERDICT_THRESHOLD = {
  true: 85,
  partial: 60,
  unclear: 40,
} as const;

/**
 * How many results a layer needs before its weight counts in full.
 *
 * A layer that found one document is not as sure as a layer that found five,
 * but the average used to treat them identically. With the other layers empty
 * and their weight redistributed, a single source could end up carrying most
 * of the verdict: "Apa pură fierbe la 100°C" came back "Probabil fals" at 29
 * because one unrelated EU regulation, scored 0, held 71% of the decision.
 *
 * Below this bar a layer keeps its direction but speaks quieter, and the
 * weight it has not earned votes neutral instead of being handed to whichever
 * component happens to be present.
 */
const CORROBORATION_TARGET = 3;

function corroboration(layer: { results?: unknown[] }): number {
  return Math.min(1, (layer.results?.length ?? 0) / CORROBORATION_TARGET);
}

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

  const availableKeys = (Object.keys(available) as Array<keyof typeof available>)
    .filter(key => available[key]);

  // The AI is not a search layer — it has nothing to corroborate against, so
  // it keeps its full weight.
  const effectiveWeight = (key: keyof typeof available): number =>
    key === 'ai' ? WEIGHTS.ai : WEIGHTS[key] * corroboration(layers[key]);

  const totalAvailableWeight = availableKeys.reduce((sum, key) => sum + WEIGHTS[key], 0);
  const earnedWeight = availableKeys.reduce((sum, key) => sum + effectiveWeight(key), 0);

  let rawScore: number;

  if (totalAvailableWeight === 0) {
    // Nothing found anywhere and no usable AI assessment.
    rawScore = 0.5;
  } else if (searchLayersWithEvidence === 0 && available.ai) {
    // Search found nothing to corroborate, so defer to the model's assessment.
    // It is only trusted here because it already cleared the confidence gate
    // (>= 0.3) above — an unsure model returns 'insufficient' with low
    // confidence, which drops out and lands the claim at a neutral 50. The old
    // behaviour clamped every unsearchable claim into 40–84%, which is exactly
    // what made a fabrication ("X started a war") read as ~50% "half true" and a
    // notorious fact ("Romania joined the EU in 2007") stall at 75%. A confident
    // model now reads false as false and a well-known truth as true.
    rawScore = aiScore01;
  } else {
    // Weighted average over the components that carry evidence, with the
    // weights of the empty ones redistributed proportionally.
    const weighted = availableKeys.reduce((sum, key) => {
      const layerScore = key === 'ai' ? aiScore01 : layers[key].layerScore;
      return sum + layerScore * effectiveWeight(key);
    }, 0);

    // Weight a thinly-sourced layer did not earn abstains rather than being
    // handed to the components that happen to be present. Once every layer
    // clears CORROBORATION_TARGET this term is zero and the result is the
    // plain weighted average again.
    rawScore = (weighted + 0.5 * (totalAvailableWeight - earnedWeight)) / totalAvailableWeight;
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
  if (score >= VERDICT_THRESHOLD.true) return 'true';
  if (score >= VERDICT_THRESHOLD.partial) return 'partial';
  if (score >= VERDICT_THRESHOLD.unclear) return 'unclear';
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
