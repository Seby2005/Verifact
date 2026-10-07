import type {
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
  ScoreBreakdown,
  Verdict,
  EvidenceStatus,
  PlausibilityTilt,
} from '@/types/verification';

const WEIGHTS = {
  layer1: 0.35,
  layer2: 0.30,
  layer3: 0.25,
  layer4: 0.10,
  // The AI assessment gets a real voice (was 0.10): on well-known facts the
  // model is often the most reliable signal, and under-weighting it left true
  // claims stuck in "partially true" even when every layer agreed.
  ai: 0.22,
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

  // AI is available if present and either has meaningful confidence (>= 0.15)
  // or has made a clear directional judgment (|score - 50| >= 10).
  // We only exclude AI when it has near-zero confidence AND is sitting at 50%.
  const aiHasSignal = Boolean(
    layers.ai && (layers.ai.confidence >= 0.15 || Math.abs(layers.ai.score - 50) >= 10)
  );

  // A layer counts only if it actually found something (see hasEvidence).
  const available = {
    layer1: hasEvidence(layers.layer1),
    layer2: hasEvidence(layers.layer2),
    layer3: hasEvidence(layers.layer3),
    layer4: hasEvidence(layers.layer4),
    ai: aiHasSignal,
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
    // If search found nothing and AI had low confidence/no signal,
    // check if AI at least provided a non-neutral score before defaulting to 0.5.
    if (layers.ai && Math.abs(layers.ai.score - 50) >= 5) {
      rawScore = aiScore01;
    } else {
      rawScore = 0.5;
    }
  } else if (searchLayersWithEvidence === 0 && available.ai) {
    // Search found nothing to corroborate, so defer to the model's assessment.
    // It is trusted here because it provided directional signal.
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

export interface EvidenceStatusInput {
  score: number;
  layers: {
    layer1: Layer1Result;
    layer2: Layer2Result;
    layer3: Layer3Result;
    layer4: Layer4Result;
  };
  ai?: {
    score?: number;
    verdict?: string;
    evidenceStatus?: EvidenceStatus;
    confidence?: number;
    reasoning?: string;
    isSatireOrParody?: boolean;
    circularReportingDetected?: boolean;
  };
}

/** At or above this score a claim is in the partial/true band and is never "contradicted". */
const CONTRADICTION_CEILING = VERDICT_THRESHOLD.partial;

/**
 * Determines the descriptive, non-dogmatic evidence status of a claim.
 * Replaces binary "true/false" labeling with objective investigative categorization.
 */
export function determineEvidenceStatus(input: EvidenceStatusInput): EvidenceStatus {
  const { score, layers, ai } = input;

  // 1. Explicit satire/parody detection from the LLM cross-examination
  if (ai?.isSatireOrParody) {
    return 'contradicted';
  }

  const l1Results = layers.layer1.results ?? [];
  const l2Results = layers.layer2.results ?? [];
  const l3Results = layers.layer3.results ?? [];
  const totalEvidenceResults = l1Results.length + l2Results.length + l3Results.length;

  const hasFactCheckDebunk = l1Results.some(
    (r) => r.ratingValue !== undefined && r.ratingValue <= 0.25
  );
  const hasOfficialDenial = l3Results.some((o) => o.supportsOrDenies === 'denies');

  // 2. Clear Contradiction signals:
  // - Fact-checkers explicitly rated it false/debunk (layer1)
  // - Official institutions explicitly deny it (layer3)
  // - Low composite score (< 35) or explicit contradiction from AI
  //
  // Only below CONTRADICTION_CEILING: a fact-check match is fuzzy (a debunk of
  // the *opposite* claim — "climate change is a hoax" rated False — matches
  // "climate change is caused by humans"), and the press-layer stance is a
  // keyword guess. When the weighted evidence still lands in the partial/true
  // band, labelling the claim "contradicted" would contradict its own score.
  if (
    score < CONTRADICTION_CEILING &&
    (hasFactCheckDebunk ||
      hasOfficialDenial ||
      ai?.evidenceStatus === 'contradicted' ||
      (ai?.verdict === 'contradicts' && score <= 45) ||
      score < 35)
  ) {
    return 'contradicted';
  }

  // 3. Clear Corroboration signals:
  // - Fact-checker rated it true/confirmed
  // - Official sources confirm/support
  // - High score (>= 70) with corroborating evidence or confident AI support
  const hasFactCheckConfirmation = l1Results.some(
    (r) => r.ratingValue !== undefined && r.ratingValue >= 0.75
  );
  const hasOfficialSupport = l3Results.some((o) => o.supportsOrDenies === 'supports');
  if (
    (hasFactCheckConfirmation ||
      hasOfficialSupport ||
      (ai?.evidenceStatus === 'corroborated' && (ai?.confidence ?? 0) >= 0.6) ||
      (ai?.verdict === 'supports' && (ai?.confidence ?? 0) >= 0.7)) &&
    score >= 70
  ) {
    return 'corroborated';
  }

  // 4. Model-assessed evidence status for nuanced states (missing context, open debate)
  if (ai?.evidenceStatus && ['missing_context', 'open_debate'].includes(ai.evidenceStatus)) {
    return ai.evidenceStatus;
  }

  // 5. Zero credible evidence identified (the rumor / unsubstantiated claim):
  // When search yields nothing and AI lacks high confidence in a known historical/scientific fact
  if (totalEvidenceResults === 0) {
    if (ai?.verdict === 'supports' && (ai?.confidence ?? 0) >= 0.85 && score >= 80) {
      return 'corroborated';
    }
    if (ai?.verdict === 'contradicts' && (ai?.confidence ?? 0) >= 0.75 && score <= 25) {
      return 'contradicted';
    }
    return 'unverified_no_sources';
  }

  if (ai?.evidenceStatus === 'unverified_no_sources') {
    return 'unverified_no_sources';
  }

  // 6. Open debate vs. Missing context:
  const isDebate =
    ai?.verdict === 'mixed' ||
    Boolean(
      ai?.reasoning &&
        /(dezbatere|divergent|controvers|opinie|perspectiv|estimar|nuan[tț]|prospectiv)/i.test(ai.reasoning)
    );
  if (isDebate) {
    return 'open_debate';
  }

  // 7. Missing context / decontextualized
  if (score >= 40 && score <= 79) {
    return 'missing_context';
  }

  return score < 40 ? 'contradicted' : 'corroborated';
}

/**
 * Calculates a nuanced, non-dogmatic plausibility tilt with an honest rationale.
 */
export function calculatePlausibilityTilt(
  status: EvidenceStatus,
  score: number,
  aiReasoning?: string,
  language: 'ro' | 'en' | 'fr' = 'ro'
): PlausibilityTilt {
  const isRo = language === 'ro';
  const isFr = language === 'fr';

  switch (status) {
    case 'corroborated':
      return {
        direction: 'plausible',
        score,
        label: isRo
          ? 'Înclinație spre Verosimil — confirmat prin surse primare'
          : isFr
          ? 'Forte probabilité de véracité — corroboré par des sources primaires'
          : 'Tilt toward Plausible — corroborated by primary sources',
        rationale: isRo
          ? 'Datele și documentele verificate atestă convergent evenimentele sau cifrele menționate.'
          : isFr
          ? 'Les données et documents vérifiés attestent de manière concordante les faits ou chiffres mentionnés.'
          : 'Verified data and primary documentation consistently attest to the mentioned facts.',
      };

    case 'contradicted':
      return {
        direction: 'unlikely',
        score,
        label: isRo
          ? 'Înclinație spre Fals — contrazis de evidențele publice'
          : isFr
          ? 'Forte probabilité d’inexactitude — réfuté par les faits établis'
          : 'Tilt toward False — contradicted by documented facts',
        rationale: isRo
          ? 'Documentele oficiale, rapoartele instituționale sau investigațiile independente contrazic direct această afirmație.'
          : isFr
          ? 'Les documents officiels, rapports d’institutions ou enquêtes indépendantes contredisent directement cette affirmation.'
          : 'Official records, institutional reports, or independent investigations directly contradict this claim.',
      };

    case 'missing_context':
      return {
        direction: 'mixed',
        score,
        label: isRo
          ? 'Înclinație spre Denaturare — context esențial omis'
          : isFr
          ? 'Probabilité de distorsion — contexte déterminant omis'
          : 'Tilt toward Misleading — critical context omitted',
        rationale: isRo
          ? 'Afirmația preia un element factual real, însă îl prezintă trunchiat, denaturând semnificația sau cauzalitatea.'
          : isFr
          ? 'L’affirmation repose sur un fait réel mais le présente de manière tronquée, faussant sa portée ou sa causalité.'
          : 'The claim relies on a real factual element but presents it out of context, distorting its scope or causality.',
      };

    case 'unverified_no_sources':
      return {
        direction: score < 40 ? 'unlikely' : 'neutral',
        score,
        label: isRo
          ? 'Înclinație spre Neverosimil — absență totală a surselor credibile'
          : isFr
          ? 'Non corroboré — absence totale de sources fiables'
          : 'Tilt toward Unverified — no credible evidence found',
        rationale: isRo
          ? 'Nu a fost identificată nicio dovadă primară sau atestare credibilă. Într-o societate digitală, deciziile majore lasă urme documentare.'
          : isFr
          ? 'Aucune preuve primaire ni attestation crédible n’a été identifiée. Les décisions publiques laissent normalement des traces documentaires.'
          : 'No primary evidence or credible records were found. Significant events leave verifiable public trails.',
      };

    case 'open_debate':
      return {
        direction: 'mixed',
        score,
        label: isRo
          ? 'Perspectivă deschisă — opinii divergente sau consens nedefinit'
          : isFr
          ? 'Débat ouvert — avis divergents ou consensus en évolution'
          : 'Open debate — divergent viewpoints or evolving consensus',
        rationale: isRo
          ? 'Subiectul vizează opinii prospective, dispute legislative sau evaluări de politici publice fără consens factual tranșat.'
          : isFr
          ? 'Le sujet relève d’analyses prospectives ou de controverses d’experts ne faisant pas l’objet d’un consensus tranché.'
          : 'The topic involves forward-looking assessments or policy debates where no uniform consensus exists.',
      };
  }
}

/**
 * Generates an empowering critical thinking invitation for the reader.
 */
export function generateCriticalThinkingPrompt(
  status: EvidenceStatus,
  claim: string,
  language: 'ro' | 'en' | 'fr' = 'ro'
): string {
  if (language === 'en') {
    return 'Here is what the evidence shows and what is missing — review the sources and decide for yourself.';
  }
  if (language === 'fr') {
    return 'Voici ce que documentent les sources et ce qui fait défaut — examinez les preuves et jugez par vous-même.';
  }
  return 'Iată ce spun sursele, iată ce lipsește, decide tu pe baza dovezilor.';
}

