import type { AIAnalysisContext } from '@/types/verification';
import { buildAnalysisPrompt } from './prompts';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { logger } from '@/lib/utils/logger';
import type { AIAssessment } from './gemini';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';

const ASSESSMENT_FALLBACK: AIAssessment = {
  score: 50,
  verdict: 'insufficient',
  confidence: 0,
  reasoning: 'Evaluarea OpenRouter nu a putut fi interpretată.',
};

/**
 * Retries transient OpenRouter API failures with circuit breaker protection.
 */
function withRetry<T>(createInit: () => RequestInit, label: string): Promise<T> {
  return withCircuitBreaker('openrouter', async () => {
    const res = await fetchWithRetry(
      OPENROUTER_API_URL,
      createInit,
      { label: `OpenRouter ${label}` }
    );
    if (!res.ok) throw new Error(`OpenRouter API HTTP error: ${res.status}`);
    return res.json() as Promise<T>;
  });
}

/**
 * Extracts a JSON assessment object from a model response string.
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
      const verdict = String(o.verdict) as AIAssessment['verdict'];
      return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        verdict: (['supports', 'contradicts', 'mixed', 'insufficient'] as string[]).includes(verdict)
          ? verdict
          : 'insufficient',
        confidence: Math.max(0, Math.min(1, Number(o.confidence) || 0)),
        reasoning: typeof o.reasoning === 'string' ? o.reasoning : '',
      };
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Summarizes evidence from search layers for the prompt.
 */
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
 * Generates an AI assessment score and verdict using OpenRouter API.
 */
export async function generateOpenRouterAssessment(
  context: AIAnalysisContext,
  apiKey?: string,
  modelName?: string
): Promise<AIAssessment> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = modelName || DEFAULT_MODEL;
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
1. Bazează-te ÎNTÂI pe dovezile de mai sus. Dacă lipsesc, folosește cunoștințe factuale bine stabilite.
2. Dacă afirmația este o opinie, o predicție sau nu poate fi verificată factual, întoarce verdict "insufficient".
3. Dacă nu ești sigur și nu ai dovezi, întoarce "insufficient" cu confidence mic. NU ghici.
4. Nu lua poziții politice.

Întoarce EXCLUSIV un obiect JSON cu exact aceste chei:
{
  "score": <număr 0-100>,
  "verdict": "supports" | "contradicts" | "mixed" | "insufficient",
  "confidence": <număr 0-1>,
  "reasoning": "<o propoziție scurtă în română>"
}`;

  try {
    const data = await withRetry<{ choices?: Array<{ message?: { content?: string } }> }>(
      () => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
          'X-Title': 'Verifact AI Fact-Checker',
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      }),
      'assessment'
    );

    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseAssessment(content);
    return parsed ?? ASSESSMENT_FALLBACK;
  } catch (error) {
    logger.error('OpenRouter assessment failed, using fallback', { service: 'openrouter', error });
    return ASSESSMENT_FALLBACK;
  }
}

/**
 * Generates natural language prose report using OpenRouter API.
 */
export async function generateOpenRouterAnalysis(
  context: AIAnalysisContext,
  apiKey?: string,
  modelName?: string
): Promise<string> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = modelName || DEFAULT_MODEL;

  const safeContext: AIAnalysisContext = {
    ...context,
    layers: context.layers ?? {
      layer1: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
      layer2: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0, sourcesChecked: 0 },
      layer3: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
      layer4: { status: 'skipped', results: [], layerScore: 0.5, processingTime: 0 },
    },
  };

  const prompt = buildAnalysisPrompt(safeContext);

  const data = await withRetry<{ choices?: Array<{ message?: { content?: string } }> }>(
    () => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
        'X-Title': 'Verifact AI Fact-Checker',
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    }),
    'analysis'
  );

  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text || text.trim().length < 50) {
    throw new Error('OpenRouter returned empty or too-short analysis');
  }

  return text;
}
