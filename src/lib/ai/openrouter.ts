import type { AIAnalysisContext } from '@/types/verification';
import { buildAnalysisPrompt } from './prompts';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { logger } from '@/lib/utils/logger';
import type { AIAssessment } from './gemini';

// When AI_GATEWAY_BASE_URL is set — a self-hosted, OpenAI-compatible gateway
// (LiteLLM in the compose stack, or OmniRoute; see docs/tools/omniroute.md) —
// every request routes through it instead of hitting openrouter.ai directly.
// That is the whole "swap provider from config, not code" mechanism: point the
// base URL at the gateway, set OPENROUTER_API_KEY to the gateway key, and
// OPENROUTER_MODEL to a gateway model alias (e.g. 'gemini-flash'). The rest of
// this module is unchanged because the gateway speaks the same wire format.
// Trailing slashes are trimmed so we never build '.../v1//chat/completions'.
const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL?.replace(/\/+$/, '');
const OPENROUTER_API_URL = AI_GATEWAY_BASE_URL
  ? `${AI_GATEWAY_BASE_URL}/chat/completions`
  : 'https://openrouter.ai/api/v1/chat/completions';
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
1. Bazează-te ÎNTÂI pe dovezile de mai sus. Când lipsesc, dar afirmația ține de fapte binecunoscute (geografie, istorie, apartenențe/funcții publice, evenimente majore), evaluează pe baza cunoștințelor factuale stabilite — "supports" pentru un adevăr clar, "contradicts" pentru o falsitate clară.
2. Folosește "insufficient" DOAR pentru afirmații cu adevărat obscure, opinii, predicții sau ce nu se poate verifica factual — NU pentru fapte de bază.
3. Când ești sigur, folosește confidence mare (0.7–1.0) și un scor extrem: aproape de 0 pentru un fals clar, aproape de 100 pentru un adevăr clar. Nu ghici pe ce e obscur (atunci "insufficient", confidence mic).
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

export interface SourceCandidate {
  id: string;
  title: string;
  snippet: string;
  /**
   * Where the document lives. Carries most of the signal when the title does
   * not: search engines return PDFs titled "MINUTA" or "pdf", and the path
   * (".../minuta-sedintei/2019/...") is what reveals it is a 2019 meeting
   * record rather than anything about the claim.
   */
  source?: string;
}

/**
 * Asks the model which candidate sources actually concern the claim.
 *
 * Returns the ids to keep, or null when the judgement could not be obtained —
 * callers treat null as "keep everything" rather than dropping evidence
 * because a model call failed.
 *
 * This is deliberately a separate prompt from the assessment and the prose
 * analysis: it is a triage question ("is this document about the claim?"),
 * not a judgement about whether the claim is true, and mixing the two made
 * the model reason about truth when all that was needed was topicality.
 */
export async function filterRelevantSourcesWithOpenRouter(
  claim: string,
  candidates: SourceCandidate[],
  apiKey?: string,
  modelName?: string
): Promise<string[] | null> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key || candidates.length === 0) return null;

  const model = modelName || DEFAULT_MODEL;

  // Short extracts on purpose: a full snippet per candidate pushed the prompt
  // large enough that the call timed out on a ~18-source report — which fails
  // open, so the whole step silently did nothing.
  //
  // The origin is listed alongside because the title often carries nothing at
  // all. Search engines return PDFs titled "MINUTA" or literally "pdf", and
  // the model was left judging those on a spliced extract alone; measured
  // across repeated runs it kept an unrelated 2019 meeting minute about a
  // third of the time. With the path visible it dropped it every time.
  const list = candidates
    .map(c => {
      const origin = c.source ? `\n  sursa: ${c.source}` : '';
      return `- id: ${c.id}${origin}\n  titlu: ${c.title}\n  extras: ${c.snippet.slice(0, 160)}`;
    })
    .join('\n');

  const prompt = `Ești un asistent care triază surse pentru un raport de fact-checking.

AFIRMAȚIA DE VERIFICAT:
<claim>
${claim}
</claim>

SURSE CANDIDATE:
${list}

SARCINA: Decide care surse se referă efectiv la afirmația de mai sus.

REGULI:
1. Păstrează o sursă dacă discută subiectul afirmației, indiferent dacă o confirmă sau o infirmă. O sursă care demontează afirmația ESTE relevantă.
2. Elimină sursele care doar menționează aceleași persoane, locuri sau organizații, dar tratează un subiect diferit. Un articol despre Donald Trump nu este relevant pentru afirmația "Donald Trump a murit" decât dacă vorbește despre moartea lui.
3. Extrasele sunt fragmente lipite din document, nu propoziții continue. Cuvinte din afirmație apărute în fragmente diferite NU înseamnă că documentul tratează afirmația.
4. Nu evalua dacă afirmația este adevărată. Decide doar dacă sursa este pe subiect.
5. Dacă ești nesigur, păstreaz-o — dar o coincidență de cuvinte nu înseamnă nesiguranță, înseamnă că sursa nu e pe subiect.

Întoarce EXCLUSIV un obiect JSON:
{"relevant": ["id1", "id2"]}`;

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
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          // The reply itself is a short id list, but reasoning models spend
          // completion tokens thinking before they emit it — measured at ~520
          // for a 16-source list. Too low a cap truncates the response before
          // the JSON arrives, which parses as nothing and fails open.
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      }),
      'source-filter'
    );

    const content = data.choices?.[0]?.message?.content ?? '';
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const braced = content.match(/\{[\s\S]*\}/);

    for (const candidateJson of [fenced?.[1], braced?.[0], content]) {
      if (!candidateJson) continue;
      try {
        const parsed = JSON.parse(candidateJson.trim()) as { relevant?: unknown };
        if (Array.isArray(parsed.relevant)) {
          return parsed.relevant.filter((id): id is string => typeof id === 'string');
        }
      } catch {
        // try next candidate
      }
    }

    logger.warn('OpenRouter source filter returned an unparseable response', {
      service: 'openrouter',
      operation: 'filterRelevantSources',
    });
    return null;
  } catch (error) {
    logger.error('OpenRouter source filter failed, keeping all sources', {
      service: 'openrouter',
      error,
    });
    return null;
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
