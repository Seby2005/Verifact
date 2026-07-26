import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIAnalysisContext } from '@/types/verification';
import { buildAnalysisPrompt } from './prompts';
import { withRetry as sharedWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';

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
      console.error(`[Gemini] Potential hallucinated URL detected: ${url}`);
      // Log but don't throw — we still want to return the analysis
      // The prompt instructs Gemini not to include URLs, so this is extra safety
    }
  }
}

export type AIAssessmentVerdict = 'supports' | 'contradicts' | 'mixed' | 'insufficient';

export interface AIAssessment {
  /** 0-100 estimate of how well-supported the claim is. */
  score: number;
  verdict: AIAssessmentVerdict;
  /** 0-1 — how confident the model is in its own assessment. */
  confidence: number;
  reasoning: string;
}

const ASSESSMENT_FALLBACK: AIAssessment = {
  score: 50,
  verdict: 'insufficient',
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

  for (const c of candidates) {
    try {
      const o = JSON.parse(c.trim()) as Record<string, unknown>;
      const score = Number(o.score);
      if (!Number.isFinite(score)) continue;
      const verdict = String(o.verdict) as AIAssessmentVerdict;
      return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        verdict: (['supports', 'contradicts', 'mixed', 'insufficient'] as string[]).includes(verdict)
          ? verdict
          : 'insufficient',
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
 *
 * This exists because the search layers return a neutral 0.5 whenever they find
 * nothing, which previously dragged every hard-to-search claim to exactly 50
 * ("unclear") — even claims that are common knowledge. The model's own
 * assessment is weighted in scoring.ts so that a claim with no search hits is
 * still judged rather than shrugged at.
 *
 * It is deliberately separate from generateAIAnalysis (the prose summary) and
 * is instructed to lean on retrieved evidence first, its own knowledge second,
 * and to say "insufficient" rather than guess.
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

  const prompt = `Ești un evaluator de fact-checking. Evaluează afirmația de mai jos.

AFIRMAȚIA:
<claim>
${claim}
</claim>

DOVEZI GĂSITE PRIN CĂUTARE (pot fi goale):
${evidence || '(nicio dovadă găsită prin căutare)'}

REGULI:
1. Bazează-te ÎNTÂI pe dovezile de mai sus. Dacă lipsesc, folosește cunoștințe factuale bine stabilite (istorie, geografie, știință, date oficiale consacrate).
2. Dacă afirmația este o opinie, o predicție sau nu poate fi verificată factual, întoarce verdict "insufficient".
3. Dacă nu ești sigur și nu ai dovezi, întoarce "insufficient" cu confidence mic. NU ghici.
4. Nu lua poziții politice.

Întoarce EXCLUSIV un obiect JSON cu exact aceste chei:
{
  "score": <număr 0-100: cât de bine susținută e afirmația; 100 = clar adevărată, 0 = clar falsă, 50 = neconcludent>,
  "verdict": "supports" | "contradicts" | "mixed" | "insufficient",
  "confidence": <număr 0-1: cât de sigur ești de propria evaluare>,
  "reasoning": "<o propoziție scurtă în română>"
}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt), 'assessment');
    const parsed = parseAssessment(result.response.text() ?? '');
    return parsed ?? ASSESSMENT_FALLBACK;
  } catch (error) {
    console.error('[Gemini] assessment failed:', error instanceof Error ? error.message : error);
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
export async function generateAIAnalysis(context: AIAnalysisContext): Promise<string> {
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

  return text;
}
