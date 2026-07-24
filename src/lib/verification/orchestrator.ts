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
import { generateAIAnalysis } from '@/lib/ai/gemini';
import { getCached, setCached } from './cache';
import { createContentHash } from '@/lib/utils/hash';

const LAYER_TIMEOUT_MS = 10_000; // 10 seconds per layer

/**
 * Wraps a promise with a timeout. Rejects with a descriptive error on timeout.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  layerName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`${layerName} timeout after ${ms}ms`)),
      ms
    )
  );
  return Promise.race([promise, timeoutPromise]);
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

  // 2. Run all 4 layers in parallel with individual timeouts
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

  // 5. Calculate score
  const scoreBreakdown = calculateScore({ layer1, layer2, layer3, layer4 });

  // 6. Generate AI analysis with all results as context
  const aiAnalysis = await generateAIAnalysis({
    claim: input.text,
    inputText: input.text,
    language: input.language,
    layers: { layer1, layer2, layer3, layer4 },
    layer1,
    layer2,
    layer3,
    layer4,
    scoreBreakdown,
  });

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

  // 8. Cache if we have solid results (at least 2 layers with actual data)
  const layersWithData = [layer1, layer2, layer3, layer4].filter(
    l => l.status === 'success' && l.results.length > 0
  ).length;

  if (layersWithData >= 2) {
    void setCached(contentHash, report); // non-blocking
  }

  return report;
}
