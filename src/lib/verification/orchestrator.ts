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
import { decomposeAndAssessRisk } from '@/lib/ai/claim-decomposer';
import { extractClaim, shouldExtractClaim, type ExtractedClaim } from '@/lib/ai/claim-extractor';
import { synthesizeReport } from '@/lib/ai/report-synthesis';

const LAYER_TIMEOUT_MS = 5_000; // 5 seconds per layer (fast search)

function buildFallbackSummary(
  layers: { layer1: Layer1Result; layer2: Layer2Result; layer3: Layer3Result; layer4: Layer4Result },
  finalScore: number,
  language: string = 'ro'
): string {
  const isRo = language === 'ro';
  const isFr = language === 'fr';

  if (isFr) {
    const counts = [
      { label: 'vérifications dans les bases de fact-checking', n: layers.layer1.results?.length ?? 0 },
      { label: 'articles de presse', n: layers.layer2.results?.length ?? 0 },
      { label: 'documents officiels', n: layers.layer3.results?.length ?? 0 },
      { label: 'déclarations publiques', n: layers.layer4.results?.length ?? 0 },
    ].filter((c) => c.n > 0);

    const found = counts.length
      ? `Nous avons identifié ${counts.map((c) => `${c.n} ${c.label}`).join(', ')}.`
      : 'Aucune source pertinente trouvée pour cette affirmation.';

    return [
      'L’analyse automatique en langage naturel est momentanément indisponible ; le rapport présente les données brutes issues des sources.',
      found,
      `Le score de véracité calculé sur la base des sources est de ${finalScore}%.`,
      'Consultez les sources citées pour un contexte complet.',
    ].join(' ');
  }

  if (isRo) {
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

  const counts = [
    { label: 'fact-checking reviews', n: layers.layer1.results?.length ?? 0 },
    { label: 'news articles', n: layers.layer2.results?.length ?? 0 },
    { label: 'official documents', n: layers.layer3.results?.length ?? 0 },
    { label: 'public statements', n: layers.layer4.results?.length ?? 0 },
  ].filter((c) => c.n > 0);

  const found = counts.length
    ? `Found ${counts.map((c) => `${c.n} ${c.label}`).join(', ')}.`
    : 'No relevant sources found for this claim.';

  return [
    'Automated AI analysis is currently unavailable; displaying direct search layer results below.',
    found,
    `Calculated veracity score based on sources is ${finalScore}%.`,
    'Read the cited sources for full context.',
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

  // 1a. Extract primary claim if input is noisy/long
  let claimForSearch = input.text;
  let extraction: ExtractedClaim | null = null;
  if (shouldExtractClaim(input.inputType, input.text)) {
    extraction = await extractClaim(input.text, input.language);
    if (extraction.primaryClaim.length >= 12) {
      claimForSearch = extraction.primaryClaim;
    }
  }
  const commentary = extraction?.commentary?.trim() || undefined;

  // 1b. AI Query Expansion & Risk Assessment in Parallel
  const [queries, decomposed] = await Promise.all([
    expandClaimQueries(claimForSearch),
    decomposeAndAssessRisk(claimForSearch),
  ]);

  // 2. Run all 4 layers in parallel with individual 6s timeouts.
  const p1 = withTimeout(runLayer1(claimForSearch, input.language, queries), LAYER_TIMEOUT_MS, 'layer1');
  const p2 = withTimeout(runLayer2(claimForSearch, input.language, queries), LAYER_TIMEOUT_MS, 'layer2');
  const p3 = withTimeout(runLayer3(claimForSearch, input.language, queries), LAYER_TIMEOUT_MS, 'layer3');
  const p4 = withTimeout(runLayer4(claimForSearch, input.language, queries), LAYER_TIMEOUT_MS, 'layer4');

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
    claimForSearch
  );

  const aiContext = {
    claim: claimForSearch,
    inputText: claimForSearch,
    commentary,
    language: input.language,
    layers: { layer1, layer2, layer3, layer4 },
    layer1,
    layer2,
    layer3,
    layer4,
  };

  // Run AI Assessment and AI Analysis IN PARALLEL for maximum speed
  const [assessmentResult, analysisResult] = await Promise.allSettled([
    generateAIAssessment(aiContext),
    generateAIAnalysis(aiContext),
  ]);

  const assessment = assessmentResult.status === 'fulfilled'
    ? assessmentResult.value
    : { score: 50, verdict: 'insufficient' as const, confidence: 0, reasoning: '' };

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
  if (analysisResult.status === 'fulfilled') {
    const analysisVal = analysisResult.value;
    aiAnalysis = typeof analysisVal === 'string' ? analysisVal : analysisVal.text;
  } else {
    aiAvailable = false;
    logger.error('AI analysis unavailable, falling back to a factual summary', {
      service: 'orchestrator',
      error: (analysisResult as PromiseRejectedResult).reason,
    });
    aiAnalysis = buildFallbackSummary(
      { layer1, layer2, layer3, layer4 },
      scoreBreakdown.finalScore,
      input.language
    );
  }

  const report = buildReport({
    input,
    verifiedClaim: extraction && claimForSearch !== input.text ? claimForSearch : undefined,
    posterCommentary: commentary,
    layers: { layer1, layer2, layer3, layer4 },
    layer1,
    layer2,
    layer3,
    layer4,
    scoreBreakdown,
    aiAnalysis,
    processingTime: Date.now() - startTime,
  });

  // Collect real token usage from all executed AI steps
  const tokenDetails = [];
  if (extraction?.tokenUsage) tokenDetails.push(extraction.tokenUsage);
  if (queries?.tokenUsage) tokenDetails.push(queries.tokenUsage);
  if (decomposed?.tokenUsage) tokenDetails.push(decomposed.tokenUsage);
  if (assessment?.tokenUsage) tokenDetails.push(assessment.tokenUsage);
  if (analysisResult.status === 'fulfilled') {
    const analysisVal = analysisResult.value;
    if (typeof analysisVal !== 'string' && analysisVal.tokenUsage) {
      tokenDetails.push(analysisVal.tokenUsage);
    }
  }

  const totalInputTokens = tokenDetails.reduce((sum, d) => sum + d.inputTokens, 0);
  const totalOutputTokens = tokenDetails.reduce((sum, d) => sum + d.outputTokens, 0);

  report.tokenUsage = {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    details: tokenDetails,
  };

  report.riskLevel = decomposed.riskLevel;
  report.aiAvailable = aiAvailable;

  // Enrich Pro Synthesis with AI deep analysis if available
  if (aiAvailable && report.sources.length > 0) {
    try {
      const locale: 'ro' | 'en' | 'fr' =
        input.language === 'fr' ? 'fr' : input.language === 'en' ? 'en' : 'ro';
      const verdictWord =
        locale === 'fr'
          ? (report.verdict === 'true' ? 'Probablement vrai' : report.verdict === 'false' ? 'Probablement faux' : 'Partiellement vrai')
          : locale === 'en'
          ? (report.verdict === 'true' ? 'Likely true' : report.verdict === 'false' ? 'Likely false' : 'Partially true')
          : (report.verdict === 'true' ? 'Probabil adevărat' : report.verdict === 'false' ? 'Probabil fals' : 'Parțial adevărat');
      const enrichedSynthesis = await withTimeout(
        synthesizeReport(report, verdictWord, locale),
        6000,
        'proSynthesis'
      );
      if (enrichedSynthesis) {
        report.proSynthesis = enrichedSynthesis;
      }
    } catch {
      // Deterministic fallback attached by buildReport is preserved
    }
  }

  const layersWithData = [layer1, layer2, layer3, layer4].filter(
    (l) => l.status === 'success' && l.results.length > 0
  ).length;

  if (layersWithData >= 2 && aiAvailable) {
    void setCached(contentHash, report);
  }

  return report;
}
