import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIAnalysisContext, TokenUsageDetail, EvidenceStatus } from '@/types/verification';
import { buildAnalysisPrompt } from './prompts';
import { withRetry as sharedWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { logger } from '@/lib/utils/logger';

/**
 * Creates the Gemini AI client.
 * Uses lazy initialization to avoid startup errors when API key is not yet set.
 */
function createGenAIClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

/** Model id, overridable so a quota change doesn't need a code edit. */
const MODEL_ID = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

/**
 * Distinguishes a transient rate limit (worth retrying) from an exhausted
 * quota or depleted billing balance (retrying just wastes the user's time).
 */
export function isNonRetryableQuotaError(message: string): boolean {
  return (
    /prepayment credits are depleted/i.test(message) ||
    /limit: 0/i.test(message) ||
    /billing/i.test(message)
  );
}

/**
 * Retries transient failures (429/500/503/timeout/ECONNRESET) with
 * exponential backoff, via the shared src/lib/utils/retry.ts. Gives up
 * immediately on hard quota/billing errors, which no amount of waiting fixes.
 *
 * Also runs through the shared 'gemini' circuit breaker: after repeated
 * failures (quota exhaustion included — retrying that is pointless, but so
 * is calling the API again next request only to fail the same way) further
 * calls fail fast for a cooldown instead of round-tripping to Gemini.
 */
function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  return withCircuitBreaker('gemini', () =>
    sharedWithRetry(fn, {
      attempts,
      label: `Gemini ${label}`,
      isRetryable: (_error, message) => !isNonRetryableQuotaError(message),
    })
  );
}

/**
 * Validates that the AI output doesn't contain URLs not present in source data.
 * This guards against hallucinated citations.
 */
function validateAIOutput(output: string, context: AIAnalysisContext): void {
  // Extract all URLs mentioned in the output
  const urlPattern = /https?:\/\/[^\s)"']+/g;
  const mentionedUrls = output.match(urlPattern) ?? [];

  if (mentionedUrls.length === 0) return; // No URLs = nothing to validate

  // Build set of valid source URLs from context
  const validUrls = new Set<string>();
  context.layers?.layer1?.results?.forEach(r => r.reviewUrl && validUrls.add(r.reviewUrl));
  context.layers?.layer2?.results?.forEach(a => a.articleUrl && validUrls.add(a.articleUrl));
  context.layers?.layer3?.results?.forEach(o => o.documentUrl && validUrls.add(o.documentUrl));
  context.layers?.layer4?.results?.forEach(p => p.postUrl && validUrls.add(p.postUrl));

  // Check for hallucinated URLs
  for (const url of mentionedUrls) {
    // Only flag URLs that are not substrings of any valid URL (allow partial matches)
    const isValid = Array.from(validUrls).some(validUrl =>
      validUrl.includes(url) || url.includes(validUrl)
    );

    if (!isValid) {
      // Log but don't throw — we still want to return the analysis.
      // The prompt instructs Gemini not to include URLs, so this is extra safety.
      logger.warn('Potential hallucinated URL detected in AI analysis', {
        service: 'gemini',
        url,
      });
    }
  }
}

export type AIAssessmentVerdict = 'supports' | 'contradicts' | 'mixed' | 'insufficient';

export interface AIAssessment {
  /** 0-100 estimate of how well-supported the claim is. */
  score: number;
  verdict: AIAssessmentVerdict;
  evidenceStatus?: EvidenceStatus;
  plausibilityTilt?: string;
  isSatireOrParody?: boolean;
  circularReportingDetected?: boolean;
  /** 0-1 — how confident the model is in its own assessment. */
  confidence: number;
  reasoning: string;
  tokenUsage?: TokenUsageDetail;
}

export interface AIAnalysisResult {
  text: string;
  tokenUsage?: TokenUsageDetail;
}

const ASSESSMENT_FALLBACK: AIAssessment = {
  score: 50,
  verdict: 'insufficient',
  evidenceStatus: 'unverified_no_sources',
  confidence: 0,
  reasoning: 'Evaluarea AI nu a putut fi interpretată.',
};

/**
 * Extracts a JSON object from a model response that may be wrapped in prose or
 * a markdown fence. Gemini in JSON mode normally returns bare JSON, but this
 * keeps a slightly-off response from costing us the whole assessment.
 */
function parseAssessment(raw: string): AIAssessment | null {
  const candidates: string[] = [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1]);
  const braced = raw.match(/\{[\s\S]*\}/);
  if (braced) candidates.push(braced[0]);
  candidates.push(raw);

  const validStatuses: EvidenceStatus[] = [
    'corroborated',
    'contradicted',
    'missing_context',
    'unverified_no_sources',
    'open_debate',
  ];

  for (const c of candidates) {
    try {
      const o = JSON.parse(c.trim()) as Record<string, unknown>;
      const score = Number(o.score);
      if (!Number.isFinite(score)) continue;
      const verdict = String(o.verdict) as AIAssessmentVerdict;
      const rawStatus = String(o.evidenceStatus) as EvidenceStatus;
      return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        verdict: (['supports', 'contradicts', 'mixed', 'insufficient'] as string[]).includes(verdict)
          ? verdict
          : 'insufficient',
        evidenceStatus: validStatuses.includes(rawStatus) ? rawStatus : undefined,
        plausibilityTilt: typeof o.plausibilityTilt === 'string' ? o.plausibilityTilt : undefined,
        isSatireOrParody: Boolean(o.isSatireOrParody),
        circularReportingDetected: Boolean(o.circularReportingDetected),
        confidence: Math.max(0, Math.min(1, Number(o.confidence) || 0)),
        reasoning: typeof o.reasoning === 'string' ? o.reasoning : '',
      };
    } catch {
      // try the next candidate shape
    }
  }
  return null;
}

/**
 * Asks Gemini to assess the claim itself and return a structured judgement that
 * feeds into the score.
 */
export async function generateAIAssessment(context: AIAnalysisContext): Promise<AIAssessment> {
  const genAI = createGenAIClient();
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 600,
      responseMimeType: 'application/json',
    },
  });

  const evidence = summariseEvidence(context);
  const claim = context.claim ?? context.inputText ?? '';

  const prompt = `Ești un analist critic și investigator de fact-checking la Verifact. Evaluează afirmația de mai jos:

AFIRMAȚIA:
<claim>
${claim}
</claim>

DOVEZI GĂSITE PRIN CĂUTARE (pot fi goale):
${evidence || '(nicio dovadă găsită prin căutare)'}

REGULI METODOLOGICE:
1. Examinează dovezile culese: detectează dacă este vorba de satiră/parodie (ex: Times New Roman, The Onion), raportare circulară (site-uri care doar reciclează o postare pe rețele sociale fără verificare) sau omisiune gravă de context.
2. Plauzibilitate deductivă: Dacă lipsesc articole explicite de demontare (debunk), aplică deducția logică și cunoștințele instituționale: Are instituția menționată atribuții? Există legi/hotărâri atestate? Un eveniment de această magnitudine ar fi putut avea loc fără nicio urmă oficială sau mediatică?
3. Dacă nu există nicio sursă primară sau dovadă pentru un zvon senzaționalist, alege evidenceStatus "unverified_no_sources", scor redus (15-30) și o înclinație clară spre neverosimil (nu claca într-un neutru 50 "insuficient").
4. Dacă tema este o dezbatere sau evaluare prospectivă, folosește "open_debate".
5. Nu lua poziții politice părtinitoare.
6. Citește direcția fiecărei surse: un articol care doar menționează un zvon pentru a-l demonta NU confirmă afirmația, iar un articol care relatează faptul ca atare NU o infirmă doar pentru că pomenește cuvinte ca „dezinformare” sau „precizări”. Judecă după ce susține sursa despre afirmație, nu după cuvinte-cheie.
7. DATA DE AZI este ${new Date().toISOString().slice(0, 10)}. Cunoștințele tale pot fi depășite: pentru evenimente recente (alegeri, numiri în funcții, legi, taxe noi), sursele de mai sus au prioritate față de memoria ta. Nu infirma o afirmație doar pentru că nu o știi din antrenament.

Întoarce EXCLUSIV un JSON valid:
{
  "score": <veridicitatea afirmației, 0-100: 0 = sigur falsă, 50 = nu se poate stabili, 100 = sigur adevărată — NU încrederea ta în verdict>,
  "verdict": "supports" | "contradicts" | "mixed" | "insufficient",
  "evidenceStatus": "corroborated" | "contradicted" | "missing_context" | "unverified_no_sources" | "open_debate",
  "plausibilityTilt": "<scurtă înclinație de plauzibilitate în română>",
  "isSatireOrParody": false,
  "circularReportingDetected": false,
  "confidence": <număr 0-1>,
  "reasoning": "<o analiză deductivă scurtă în română>"
}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt), 'assessment');
    const usage = result.response.usageMetadata;
    const tokenUsage: TokenUsageDetail = {
      provider: 'gemini',
      model: MODEL_ID,
      step: 'assessment',
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
    const parsed = parseAssessment(result.response.text() ?? '');
    if (parsed) {
      return { ...parsed, tokenUsage };
    }
    return { ...ASSESSMENT_FALLBACK, tokenUsage };
  } catch (error) {
    logger.error('AI assessment failed, using fallback', { service: 'gemini', error });
    return ASSESSMENT_FALLBACK;
  }
}

/** Compact, URL-free digest of what the search layers actually found. */
function summariseEvidence(context: AIAnalysisContext): string {
  const lines: string[] = [];
  context.layers?.layer1?.results?.slice(0, 5).forEach((r) =>
    lines.push(`[fact-check] ${r.publisher}: "${r.claimReviewed}" — verdict: ${r.rating}`)
  );
  context.layers?.layer2?.results?.slice(0, 5).forEach((a) =>
    lines.push(`[presă] ${a.source}: ${a.title} — ${a.snippet?.slice(0, 180) ?? ''}`)
  );
  context.layers?.layer3?.results?.slice(0, 5).forEach((o) =>
    lines.push(`[oficial] ${o.organization ?? o.publisher}: ${o.title} — ${(o.relevantQuote ?? o.snippet ?? '').slice(0, 180)}`)
  );
  context.layers?.layer4?.results?.slice(0, 3).forEach((p) =>
    lines.push(`[declarație] ${p.author}: ${(p.content ?? p.text ?? '').slice(0, 150)}`)
  );
  return lines.join('\n');
}

/**
 * Generates an AI analysis of the fact-checking results using Gemini 2.0 Flash.
 *
 * Key configuration:
 * - temperature: 0.1 (very low — maximizes factual adherence, minimizes creativity)
 * - topP: 0.8 (reduces probability of unlikely tokens)
 * - maxOutputTokens: 1024 (caps analysis length)
 */
export async function generateAIAnalysis(context: AIAnalysisContext): Promise<AIAnalysisResult> {
  const genAI = createGenAIClient();

  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      temperature: 0.1,       // CRITICAL: very low temperature → more factual, less creative
      maxOutputTokens: 1024,
      topP: 0.8,
    },
  });

  const prompt = buildAnalysisPrompt(context);

  const result = await withRetry(() => model.generateContent(prompt), 'analysis');
  const response = result.response;
  const text = response.text();

  if (!text || text.trim().length < 50) {
    throw new Error('Gemini returned empty or too-short analysis');
  }

  // Validate output for hallucinated URLs
  validateAIOutput(text, context);

  const usage = response.usageMetadata;
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;

  return {
    text,
    tokenUsage: {
      provider: 'gemini',
      model: MODEL_ID,
      step: 'analysis',
      inputTokens,
      outputTokens,
    },
  };
}
