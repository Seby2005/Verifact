import type { AIAnalysisContext, TokenUsageDetail, EvidenceStatus } from '@/types/verification';
import { buildAnalysisPrompt } from './prompts';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { logger } from '@/lib/utils/logger';
import type { AIAssessment, AIAnalysisResult } from './gemini';

// When AI_GATEWAY_BASE_URL is set, requests route through a custom OpenAI-compatible endpoint
// instead of hitting openrouter.ai directly. Trailing slashes are trimmed.
const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL?.replace(/\/+$/, '');
const OPENROUTER_API_URL = AI_GATEWAY_BASE_URL
  ? `${AI_GATEWAY_BASE_URL}/chat/completions`
  : 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash';

const ASSESSMENT_FALLBACK: AIAssessment = {
  score: 50,
  verdict: 'insufficient',
  evidenceStatus: 'unverified_no_sources',
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
      { label: `OpenRouter ${label}`, attempts: 2 }
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
      const verdict = String(o.verdict) as AIAssessment['verdict'];
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
    const data = await withRetry<{
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    }>(
      () => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
          'X-Title': 'Verifact AI Fact-Checker',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      }),
      'assessment'
    );

    const tokenUsage: TokenUsageDetail = {
      provider: 'openrouter',
      model,
      step: 'assessment',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseAssessment(content);
    if (parsed) return { ...parsed, tokenUsage };
    return { ...ASSESSMENT_FALLBACK, tokenUsage };
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

export interface SourceFilterResult {
  /** Ids of candidates that are about the claim. */
  relevant: string[];
  /** Ids of press/official sources whose content confirms the claim. */
  supports: string[];
  /** Ids of press/official sources whose content refutes the claim. */
  contradicts: string[];
  /** Ids of fact-checks whose reviewed statement is the claim's opposite. */
  opposite: string[];
}

/**
 * Asks the model which candidate sources actually concern the claim, what each
 * press/official source says about it, and which fact-checks reviewed the
 * claim's opposite.
 *
 * The stance replaces the keyword guess made by layers 2-3, which only fired on
 * words like "confirmat" or "fals": an article headlined "2004 – România intră
 * în NATO" contains neither, read as neutral, and left a plainly true claim
 * stuck at "partial".
 *
 * `opposite` exists because a fact-check is matched to the claim by keywords:
 * "Climate change is a hoax" (rated False) matches "climate change is caused by
 * humans", and its False rating then counted against a true claim. Only the
 * model can tell the two statements point in opposite directions.
 *
 * Returns the ids to keep and the opposite-polarity ids, or null when the
 * judgement could not be obtained —
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
): Promise<SourceFilterResult | null> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key || candidates.length === 0) return null;

  // Not flash-lite: once this call also reads each source's stance, the score
  // depends on it, and flash-lite missed that "aceleași drepturi" refutes
  // "mai mare" and flipped same-claim fact-checks to "opposite". flash got
  // both right in ~1.1s, inside the timeout below.
  const model = modelName || 'google/gemini-2.5-flash';

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

SARCINA: Decide care surse se referă efectiv la afirmația de mai sus și ce spune fiecare despre ea.

REGULI:
1. Păstrează o sursă dacă discută subiectul afirmației, indiferent dacă o confirmă sau o infirmă. O sursă care demontează afirmația ESTE relevantă.
2. Elimină sursele care doar menționează aceleași persoane, locuri sau organizații, dar tratează un subiect diferit. Un articol despre Donald Trump nu este relevant pentru afirmația "Donald Trump a murit" decât dacă vorbește despre moartea lui.
3. Extrasele sunt fragmente lipite din document, nu propoziții continue. Cuvinte din afirmație apărute în fragmente diferite NU înseamnă că documentul tratează afirmația.
4. Nu folosi propriile cunoștințe despre afirmație. Judecă doar după ce spune sursa.
5. Dacă ești nesigur, păstreaz-o — dar o coincidență de cuvinte nu înseamnă nesiguranță, înseamnă că sursa nu e pe subiect.
6. Pentru sursele cu id "l1:..." (fact-check-uri), titlul este afirmația pe care a verificat-o fact-checker-ul. Compară DOAR sensul acestui titlu cu afirmația de mai sus, ignorând verdictul fact-checker-ului. Pune id-ul în "opposite" numai dacă titlul spune CONTRARIUL afirmației (ex: afirmația "schimbările climatice sunt cauzate de om" vs titlul "schimbările climatice sunt o farsă"). Un fact-check pe ACEEAȘI afirmație, chiar dacă a fost găsită falsă, NU intră în "opposite". Dacă nu ești sigur, nu o pune. Nu pune id-urile "l1:..." în "supports" sau "contradicts".
7. Pentru sursele relevante cu id "l2:..." (presă) și "l3:..." (oficiale), pune id-ul în "supports" dacă sursa relatează afirmația ca fapt sau conține informații care o confirmă (ex: "2004 – România intră în NATO" susține "România este membră NATO din 2004"), sau în "contradicts" dacă sursa o dezminte ori relatează fapte incompatibile cu ea. Citește atent cifrele, datele și comparațiile: dacă afirmația spune "mai mare" și sursa spune "aceeași" sau "mai mică", sursa o contrazice. Dacă sursa e pe subiect dar nu tranșează afirmația, nu o pune în niciuna. Nu te lua după cuvinte ca "dezinformare" sau "precizări" — contează ce susține sursa despre afirmație.

Întoarce EXCLUSIV un obiect JSON:
{"relevant": ["id1", "id2"], "supports": [], "contradicts": [], "opposite": []}`;

  try {
    const data = await withRetry<{
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    }>(
      () => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
          'X-Title': 'Verifact AI Fact-Checker',
        },
        signal: AbortSignal.timeout(4000),
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
        const parsed = JSON.parse(candidateJson.trim()) as Record<string, unknown>;
        if (Array.isArray(parsed.relevant)) {
          const ids = (list: unknown) =>
            Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
          return {
            relevant: ids(parsed.relevant),
            supports: ids(parsed.supports),
            contradicts: ids(parsed.contradicts),
            opposite: ids(parsed.opposite),
          };
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
): Promise<AIAnalysisResult> {
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

  const data = await withRetry<{
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  }>(
    () => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
        'X-Title': 'Verifact AI Fact-Checker',
      },
      signal: AbortSignal.timeout(8000),
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

  return {
    text,
    tokenUsage: {
      provider: 'openrouter',
      model,
      step: 'analysis',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}
