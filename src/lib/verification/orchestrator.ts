import type {
  VerificationInput,
  VerificationReport,
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
} from '@/types/verification';
import { runLayer1 } from './layer1-factcheck';
import { runLayer2 } from './layer2-news';
import { runLayer3 } from './layer3-official';
import { runLayer4 } from './layer4-social';
import { calculateScore } from './scoring';
import { buildReport } from './report-builder';
import { generateAIAnalysis, generateAIAssessment } from '@/lib/ai/gemini';
import { getCached, setCached } from './cache';
import { createContentHash } from '@/lib/utils/hash';

const LAYER_TIMEOUT_MS = 10_000; // 10 seconds per layer

/**
 * Describes what the search layers found, without an AI narration. Used when
 * the model is unreachable so the user still gets the evidence and sources
 * rather than an error page.
 */
function buildFallbackSummary(
  layers: { layer1: Layer1Result; layer2: Layer2Result; layer3: Layer3Result; layer4: Layer4Result },
  finalScore: number
): string {
  const counts = [
    { label: 'verificări din baze de fact-checking', n: layers.layer1.results?.length ?? 0 },
    { label: 'articole de presă', n: layers.layer2.results?.length ?? 0 },
    { label: 'documente din surse oficiale', n: layers.layer3.results?.length ?? 0 },
    { label: 'declarații publice', n: layers.layer4.results?.length ?? 0 },
  ].filter((c) => c.n > 0);

  const found = counts.length
    ? `Am găsit ${counts.map((c) => `${c.n} ${c.label}`).join(', ')}.`
    : 'Nu am găsit surse relevante pentru această afirmație.';

  return [
    'Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse.',
    found,
    `Scorul de veridicitate calculat pe baza surselor este ${finalScore}%.`,
    'Citește sursele citate pentru context complet.',
  ].join(' ');
}

/**
 * Wraps a promise with a timeout. Rejects with a descriptive error on timeout.
 *
 * Clears the timer once either side of the race settles — without this, a
 * layer that resolves in 50ms still leaves its 10-second timer scheduled
 * (Promise.race doesn't cancel the loser), which does nothing functionally
 * wrong but needlessly holds the timer queue open until it eventually fires.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  layerName: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${layerName} timeout after ${ms}ms`)),
      ms
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Creates a fallback result for a failed layer.
 */
function makeUnavailableLayer1(error: string): Layer1Result {
  return { status: 'unavailable', results: [], layerScore: 0.5, processingTime: 0, error };
}
function makeUnavailableLayer2(error: string): Layer2Result {
  return { status: 'unavailable', results: [], layerScore: 0.5, processingTime: 0, sourcesChecked: 0, error };
}
function makeUnavailableLayer3(error: string): Layer3Result {
  return { status: 'unavailable', results: [], layerScore: 0.5, processingTime: 0, error };
}
function makeUnavailableLayer4(error: string): Layer4Result {
  return { status: 'unavailable', results: [], layerScore: 0.5, processingTime: 0, error };
}

/**
 * Main orchestrator — runs all 4 verification layers in parallel, aggregates results,
 * generates an AI analysis, and assembles the final report.
 *
 * Layer execution is always parallel (not sequential) using Promise.allSettled.
 * If any layer fails or times out, execution continues with the remaining layers.
 * Only if ALL layers fail is an error thrown.
 */
export async function verifyContent(
  input: VerificationInput
): Promise<VerificationReport> {
  // 1. Cache check
  const contentHash = createContentHash(input.text, input.language);
  const cached = await getCached(contentHash);
  if (cached) {
    return { ...cached, fromCache: true, isPublic: input.isPublic, userId: input.userId };
  }

  const startTime = Date.now();

  // 2. Run all 4 layers in parallel with individual timeouts.
  //
  // Each layer's external calls (Fact Check API, NewsAPI, Tavily, Twitter,
  // Vision, Gemini) go through a per-service circuit breaker
  // (src/lib/utils/circuit-breaker.ts) before this point. After repeated
  // consecutive failures for a given service, further calls to it fail
  // immediately with CircuitOpenError for a cooldown window instead of
  // waiting out a real network attempt — this needs no special handling
  // here: a CircuitOpenError rejection is just another layer failure to
  // the Promise.allSettled/makeUnavailableLayerN fallback below, exactly
  // like a timeout or a real fetch failure already was. Layers with an
  // internal fallback source (layer2's NewsAPI+Tavily, layer4's
  // Twitter+Tavily) instead absorb a single source's CircuitOpenError the
  // same way they already absorbed that source failing outright, and
  // still report success from whichever source is still healthy.
  const [l1Result, l2Result, l3Result, l4Result] = await Promise.allSettled([
    withTimeout(runLayer1(input.text, input.language), LAYER_TIMEOUT_MS, 'layer1'),
    withTimeout(runLayer2(input.text, input.language), LAYER_TIMEOUT_MS, 'layer2'),
    withTimeout(runLayer3(input.text, input.language), LAYER_TIMEOUT_MS, 'layer3'),
    withTimeout(runLayer4(input.text, input.language), LAYER_TIMEOUT_MS, 'layer4'),
  ]);

  // 3. Extract results with graceful fallback for failed layers
  const layer1 = l1Result.status === 'fulfilled'
    ? l1Result.value
    : makeUnavailableLayer1(String((l1Result as PromiseRejectedResult).reason));

  const layer2 = l2Result.status === 'fulfilled'
    ? l2Result.value
    : makeUnavailableLayer2(String((l2Result as PromiseRejectedResult).reason));

  const layer3 = l3Result.status === 'fulfilled'
    ? l3Result.value
    : makeUnavailableLayer3(String((l3Result as PromiseRejectedResult).reason));

  const layer4 = l4Result.status === 'fulfilled'
    ? l4Result.value
    : makeUnavailableLayer4(String((l4Result as PromiseRejectedResult).reason));

  // 4. Check if at least one layer succeeded
  const successfulLayers = [layer1, layer2, layer3, layer4].filter(
    l => l.status === 'success' || l.status === 'skipped'
  ).length;

  if (successfulLayers === 0) {
    throw new Error('ALL_LAYERS_FAILED');
  }

  // 5. Ask the model to assess the claim against the evidence. This runs BEFORE
  //    scoring because its judgement is one of the weighted inputs — without it
  //    a claim no layer could find evidence for scores a flat, useless 50.
  const aiContext = {
    claim: input.text,
    inputText: input.text,
    language: input.language,
    layers: { layer1, layer2, layer3, layer4 },
    layer1,
    layer2,
    layer3,
    layer4,
  };

  const assessment = await generateAIAssessment(aiContext);

  // 6. Calculate score, including the AI assessment as a weighted component
  const scoreBreakdown = calculateScore({
    layer1,
    layer2,
    layer3,
    layer4,
    ai: { score: assessment.score, confidence: assessment.confidence },
  });

  // 7. Generate the prose analysis shown to the reader.
  //    A failure here (quota, timeout, outage) must not lose the whole report:
  //    the search layers already did the substantive work, so fall back to a
  //    factual summary of what they found and say the AI part is missing.
  let aiAnalysis: string;
  let aiAvailable = true;
  try {
    aiAnalysis = await generateAIAnalysis({ ...aiContext, scoreBreakdown });
  } catch (error) {
    aiAvailable = false;
    const message = error instanceof Error ? error.message : String(error);
    console.error('[orchestrator] AI analysis unavailable:', message.slice(0, 200));
    aiAnalysis = buildFallbackSummary({ layer1, layer2, layer3, layer4 }, scoreBreakdown.finalScore);
  }

  // 7. Build final report
  const report = buildReport({
    input,
    layers: { layer1, layer2, layer3, layer4 },
    layer1,
    layer2,
    layer3,
    layer4,
    scoreBreakdown,
    aiAnalysis,
    processingTime: Date.now() - startTime,
  });

  report.aiAvailable = aiAvailable;

  // 8. Cache if we have solid results (at least 2 layers with actual data).
  //    A report produced without the AI analysis is not cached — we do not want
  //    a degraded result served for the next 7 days once the model is back.
  const layersWithData = [layer1, layer2, layer3, layer4].filter(
    l => l.status === 'success' && l.results.length > 0
  ).length;

  if (layersWithData >= 2 && aiAvailable) {
    void setCached(contentHash, report); // non-blocking
  }

  return report;
}
