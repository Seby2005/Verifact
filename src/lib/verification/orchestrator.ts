import type {
  VerificationInput,
  VerificationReport,
  VerifyStatusEvent,
  LayerStatus,
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
import { generateAIAnalysis, generateAIAssessment } from '@/lib/ai';
import { applyAISourceFilter } from './ai-source-filter';
import { getCached, setCached } from './cache';
import { createContentHash } from '@/lib/utils/hash';
import { logger } from '@/lib/utils/logger';
import { expandClaimQueries } from './query-expander';

const LAYER_TIMEOUT_MS = 10_000; // 10 seconds per layer

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

export async function verifyContent(
  input: VerificationInput,
  onEvent?: (event: VerifyStatusEvent) => void
): Promise<VerificationReport> {
  const emit = (event: VerifyStatusEvent) => {
    try {
      onEvent?.(event);
    } catch {
      /* ignore */
    }
  };

  // 1. Cache check
  const contentHash = createContentHash(input.text, input.language);
  const cached = await getCached(contentHash);
  if (cached) {
    for (const step of ['layer1', 'layer2', 'layer3', 'layer4', 'analysis'] as const) {
      emit({ step, status: 'done' });
    }
    return { ...cached, fromCache: true, isPublic: input.isPublic, userId: input.userId };
  }

  const startTime = Date.now();

  // 1b. AI Query Expansion — transforms raw claim into targeted RO & EN search queries + named entities
  const queries = await expandClaimQueries(input.text);

  // 2. Run all 4 layers in parallel with individual timeouts.
  const p1 = withTimeout(runLayer1(input.text, input.language, queries), LAYER_TIMEOUT_MS, 'layer1');
  const p2 = withTimeout(runLayer2(input.text, input.language, queries), LAYER_TIMEOUT_MS, 'layer2');
  const p3 = withTimeout(runLayer3(input.text, input.language, queries), LAYER_TIMEOUT_MS, 'layer3');
  const p4 = withTimeout(runLayer4(input.text, input.language, queries), LAYER_TIMEOUT_MS, 'layer4');

  const tap = (
    step: 'layer1' | 'layer2' | 'layer3' | 'layer4',
    p: Promise<{ status: LayerStatus; results?: readonly unknown[] }>
  ) => {
    p.then(
      (r) => emit({ step, status: r.status, count: r.results?.length ?? 0 }),
      (e) => emit({ step, status: 'unavailable', error: String(e) })
    );
  };
  tap('layer1', p1);
  tap('layer2', p2);
  tap('layer3', p3);
  tap('layer4', p4);

  const [l1Result, l2Result, l3Result, l4Result] = await Promise.allSettled([p1, p2, p3, p4]);

  const rawLayer1 = l1Result.status === 'fulfilled'
    ? l1Result.value
    : makeUnavailableLayer1(String((l1Result as PromiseRejectedResult).reason));

  const rawLayer2 = l2Result.status === 'fulfilled'
    ? l2Result.value
    : makeUnavailableLayer2(String((l2Result as PromiseRejectedResult).reason));

  const rawLayer3 = l3Result.status === 'fulfilled'
    ? l3Result.value
    : makeUnavailableLayer3(String((l3Result as PromiseRejectedResult).reason));

  const rawLayer4 = l4Result.status === 'fulfilled'
    ? l4Result.value
    : makeUnavailableLayer4(String((l4Result as PromiseRejectedResult).reason));

  const successfulLayers = [rawLayer1, rawLayer2, rawLayer3, rawLayer4].filter(
    (l) => l.status === 'success' || l.status === 'skipped'
  ).length;

  if (successfulLayers === 0) {
    throw new Error('ALL_LAYERS_FAILED');
  }

  const { layer1, layer2, layer3, layer4 } = await applyAISourceFilter(
    { layer1: rawLayer1, layer2: rawLayer2, layer3: rawLayer3, layer4: rawLayer4 },
    input.text
  );

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
  emit({ step: 'analysis', status: 'done' });

  const scoreBreakdown = calculateScore({
    layer1,
    layer2,
    layer3,
    layer4,
    ai: { score: assessment.score, confidence: assessment.confidence },
  });

  let aiAnalysis: string;
  let aiAvailable = true;
  try {
    aiAnalysis = await generateAIAnalysis({ ...aiContext, scoreBreakdown });
  } catch (error) {
    aiAvailable = false;
    logger.error('AI analysis unavailable, falling back to a factual summary', {
      service: 'orchestrator',
      error,
    });
    aiAnalysis = buildFallbackSummary({ layer1, layer2, layer3, layer4 }, scoreBreakdown.finalScore);
  }

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

  const layersWithData = [layer1, layer2, layer3, layer4].filter(
    (l) => l.status === 'success' && l.results.length > 0
  ).length;

  if (layersWithData >= 2 && aiAvailable) {
    void setCached(contentHash, report);
  }

  return report;
}
