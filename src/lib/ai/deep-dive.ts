import { logger } from '@/lib/utils/logger';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { fetchWithRetry } from '@/lib/utils/retry';
import { normalizeRomanianDiacritics, stripMarkdown } from '@/lib/utils/romanian-text';
import type { VerificationReport } from '@/types/verification';

/**
 * Pro-only interactive analysis of a finished verification report. Where the
 * main pipeline's AI section is generated once, up front, this module answers
 * follow-up questions on demand — presets or a free-form question — strictly
 * against the report's own content and cited sources.
 *
 * It deliberately reuses the OpenRouter-compatible wire format of
 * report-synthesis.ts (base URL + key overridable by env, self-hosted gateway
 * supported) rather than the unified dispatcher in ai/index.ts, because this
 * is a synchronous, user-initiated call with its own failure semantics: a
 * failed deep-dive must surface as an error to the user, not silently degrade
 * the report.
 */

export type DeepDiveAction =
  | 'explain_simple'
  | 'counter_arguments'
  | 'manipulation_techniques'
  | 'custom_question';

/** Whitelist shared with the API route so a typo can never reach the prompt. */
export const DEEP_DIVE_ACTIONS: readonly DeepDiveAction[] = [
  'explain_simple',
  'counter_arguments',
  'manipulation_techniques',
  'custom_question',
];

export function isDeepDiveAction(value: unknown): value is DeepDiveAction {
  return typeof value === 'string' && (DEEP_DIVE_ACTIONS as readonly string[]).includes(value);
}

export interface DeepDiveContext {
  report: VerificationReport;
  actionType: DeepDiveAction;
  /** Required for 'custom_question', ignored otherwise. */
  customQuestion?: string;
  locale: 'ro' | 'en';
}

const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
const MAX_SOURCES_IN_PROMPT = 12;
/**
 * The model must not produce URLs at all; anything not in the report is
 * stripped. Dots are part of a URL (domains), so trailing punctuation is
 * trimmed off the match instead of excluded from the character class.
 */
const URL_PATTERN = /https?:\/\/[^\s)\]"']+/g;

/**
 * Collects every URL the report actually stands on, so the answer can be
 * checked against it: a URL that appears in the response but not here is a
 * hallucinated citation, and gets removed.
 */
function collectKnownUrls(report: VerificationReport): Set<string> {
  const urls = new Set<string>();
  for (const s of report.sources ?? []) {
    if (s.url) urls.add(s.url);
  }
  const layers = report.layers;
  for (const r of layers?.layer1?.results ?? report.layer1?.results ?? []) {
    if (r.reviewUrl) urls.add(r.reviewUrl);
  }
  for (const a of layers?.layer2?.results ?? report.layer2?.results ?? []) {
    if (a.articleUrl) urls.add(a.articleUrl);
  }
  for (const o of layers?.layer3?.results ?? report.layer3?.results ?? []) {
    if (o.documentUrl) urls.add(o.documentUrl);
    if (o.url) urls.add(o.url);
  }
  for (const p of layers?.layer4?.results ?? report.layer4?.results ?? []) {
    if (p.postUrl) urls.add(p.postUrl);
    if (p.url) urls.add(p.url);
  }
  return urls;
}

/** Compact, URL-free digest of the search layers, mirroring openrouter.ts. */
function summariseLayers(report: VerificationReport): string {
  const lines: string[] = [];
  const layers = report.layers;
  const layer1 = layers?.layer1 ?? report.layer1;
  const layer2 = layers?.layer2 ?? report.layer2;
  const layer3 = layers?.layer3 ?? report.layer3;
  const layer4 = layers?.layer4 ?? report.layer4;

  (layer1?.results ?? []).slice(0, 4).forEach((r) =>
    lines.push(`[fact-check] ${r.publisher}: "${r.claimReviewed}" — verdict: ${r.rating}`)
  );
  (layer2?.results ?? []).slice(0, 4).forEach((a) =>
    lines.push(`[presă] ${a.source}: ${a.title} — ${(a.snippet ?? '').slice(0, 140)}`)
  );
  (layer3?.results ?? []).slice(0, 4).forEach((o) =>
    lines.push(
      `[oficial] ${o.organization ?? o.publisher}: ${o.title} — ${(o.relevantQuote ?? o.snippet ?? '').slice(0, 140)}`
    )
  );
  (layer4?.results ?? []).slice(0, 3).forEach((p) =>
    lines.push(`[declarație] ${p.author}: ${(p.content ?? p.text ?? '').slice(0, 120)}`)
  );
  return lines.length > 0 ? lines.join('\n') : '(nicio dovadă detaliată disponibilă în raport)';
}

function buildPrompt(ctx: DeepDiveContext): string {
  const { report, actionType, customQuestion, locale } = ctx;
  const isRo = locale === 'ro';

  const claim = report.verifiedClaim ?? report.claim ?? report.inputText ?? '';
  const commentary = report.posterCommentary?.trim();
  const verdictLabel: Record<VerificationReport['verdict'], string> = {
    true: isRo ? 'Probabil adevărat' : 'Likely true',
    false: isRo ? 'Probabil fals' : 'Likely false',
    partial: isRo ? 'Parțial adevărat / context lipsă' : 'Partially true / missing context',
    unclear: isRo ? 'Neclar / insuficient verificat' : 'Unclear / insufficiently verified',
  };

  const sourceLines = (report.sources ?? [])
    .slice(0, MAX_SOURCES_IN_PROMPT)
    .map((s, i) => {
      const stance = s.supports === true ? (isRo ? 'confirmă' : 'supports')
        : s.supports === false ? (isRo ? 'contrazice' : 'contradicts')
        : (isRo ? 'context' : 'context');
      const excerpt = (s.excerpt ?? '').slice(0, 220).replace(/\s+/g, ' ').trim();
      return `[${i + 1}] ${s.publisher} — ${s.title} (${stance})${excerpt ? ` — extras: "${excerpt}"` : ''}`;
    })
    .join('\n') || (isRo ? '(nicio sursă citată)' : '(no cited sources)');

  const takeaways =
    (report.keyTakeaways ?? []).map((k) => `- ${stripMarkdown(k)}`).join('\n') ||
    (isRo ? '- (fără idei cheie separate)' : '- (no separate key takeaways)');

  const instruction = buildActionInstruction(actionType, customQuestion, isRo);

  const intro = isRo
    ? `Ești un analist senior de fact-checking la Verifact. Ai în față un raport de verificare deja generat. Răspunde la cererea utilizatorului EXCLUSIV pe baza conținutului acestui raport și a surselor citate mai jos. Nu inventa fapte, cifre, citate sau surse care nu apar în material. Dacă informația cerută nu există în raport sau în surse, spune-o explicit în loc să ghicești.`
    : `You are a senior fact-checking analyst at Verifact. You have a completed verification report in front of you. Answer the user's request EXCLUSIVELY from the content of this report and its cited sources below. Do not invent facts, figures, quotes, or sources that do not appear in the material. If the requested information is not in the report or its sources, say so explicitly instead of guessing.`;

  return `${intro}

AFIRMAȚIA VERIFICATĂ:
"${claim}"

VERDICT: ${verdictLabel[report.verdict]} — scor ${report.score}/100, încredere ${report.confidenceLevel}
${commentary ? `COMENTARIUL CELUI CARE A DISTRIBUIT (opinie separată de afirmația factuală): "${commentary}"\n` : ''}
REZUMATUL EXECUTIV AL RAPORTULUI:
"${stripMarkdown(report.executiveSummary || '')}"

IDEI CHEIE:
${takeaways}

SURSE CITATE:
${sourceLines}

DOVEZI DIN STRATURILE DE CĂUTARE:
${summariseLayers(report)}

CEREREA UTILIZATORULUI:
${instruction}

REGULI STRICTE PENTRU RĂSPUNS:
1. Scrie răspunsul în ${isRo ? 'română' : 'engleză'}.
2. Bazează-te doar pe raport și pe sursele citate mai sus.
3. NU include adrese URL. Dacă vrei să trimiți la o sursă, referă-te la ea după numele publicației sau titlul ei.
4. NU folosi marcaje Markdown (###, ##, #, **, bold). Text simplu, paragrafe scurte; pentru liste folosește doar liniuțe "-" pe linii separate.
5. Fii neutru și obiectiv. Nu lua poziții politice.
6. Răspunsul trebuie să aibă minimum 2 propoziții și maximum ~350 de cuvinte.`;
}

function buildActionInstruction(
  actionType: DeepDiveAction,
  customQuestion: string | undefined,
  isRo: boolean
): string {
  switch (actionType) {
    case 'explain_simple':
      return isRo
        ? 'Explică acest raport pe înțelesul tuturor, fără jargon tehnic. Spune pe scurt: ce e adevărat, ce e fals sau exagerat, ce context lipsește și de ce verdictul este acesta. Folosește exemple simple și fraze scurte.'
        : 'Explain this report in plain, jargon-free language. Briefly say: what is true, what is false or exaggerated, what context is missing, and why the verdict is what it is. Use short sentences and simple examples.';
    case 'counter_arguments':
      return isRo
        ? 'Prezintă cele mai solide perspective alternative sau contra-dovezi cu privire la această afirmație. Pentru fiecare, arată cât de bine este susținută de sursele citate (sau cât de slab). Nu schimba verdictul raportului — obiectivul este să expui argumentele opuse corect, nu să le respingi superficial.'
        : 'Present the strongest alternative perspectives or counter-evidence regarding this claim. For each one, indicate how well it is supported by the cited sources (or how weakly). Do not change the report\'s verdict — the goal is to lay out opposing arguments fairly, not to dismiss them superficially.';
    case 'manipulation_techniques':
      return isRo
        ? 'Analizează afirmația, postarea originală și felul în care este prezentată pentru tehnici de manipulare sau propagandă: titlu senzaționalist (clickbait), apel la emoție, cherry-picking, scoțare din context, ad hominem, autoritate falsă, generalizare excesivă, falsă echilibristică etc. Enumeră tehnicile care chiar se aplică, cu o propoziție fiecare despre cum se manifestă în acest caz concret. Dacă nicio tehnică nu se aplică, spune-o explicit.'
        : 'Analyze the claim, the original post, and how it is presented for manipulation or propaganda techniques: sensationalist/clickbait headline, appeal to emotion, cherry-picking, out-of-context framing, ad hominem, false authority, overgeneralization, false balance, etc. List the techniques that actually apply, with one sentence each on how they manifest in this specific case. If no technique applies, say so explicitly.';
    case 'custom_question':
    default: {
      const q = (customQuestion ?? '').trim();
      return isRo
        ? `Răspunde la următoarea întrebare a utilizatorului: "${q}"\n\nDacă întrebarea cere informații care nu apar în raport sau în sursele citate, spune clar că nu ai dovezi pentru a răspunde și sugerează ce fel de sursă ar putea clarifica. Nu extrapola dincolo de materialul de mai sus.`
        : `Answer the user's question: "${q}"\n\nIf the question asks for information that does not appear in the report or its cited sources, clearly state that you have no evidence to answer, and suggest what kind of source could clarify. Do not extrapolate beyond the material above.`;
    }
  }
}

export interface DeepDiveResult {
  answer: string;
}

/**
 * Generates the deep-dive answer. Throws on failure — the API route turns that
 * into a user-facing error rather than silently degrading (unlike pipeline
 * steps, this is the entire product of the request).
 */
export async function generateDeepDiveAnswer(ctx: DeepDiveContext): Promise<DeepDiveResult> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OMNIROUTE_API_KEY;
  if (!apiKey) {
    throw new Error('No AI provider key configured for deep-dive');
  }

  const prompt = buildPrompt(ctx);
  // AI_GATEWAY_BASE_URL is the self-hosted gateway override (docs/tools/omniroute.md);
  // OPENROUTER_BASE_URL is the plain API mirror. Both speak the same wire format.
  const baseUrl = (
    process.env.AI_GATEWAY_BASE_URL || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  ).replace(/\/+$/, '');

  const data = await withCircuitBreaker('openrouter-deep-dive', () =>
    fetchWithRetry(
      `${baseUrl}/chat/completions`,
      () => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
          'X-Title': 'Verifact Deep Dive',
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      }),
      { label: 'Deep dive analysis' }
    ).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
    })
  );

  const raw = data.choices?.[0]?.message?.content ?? '';
  if (!raw || raw.trim().length < 40) {
    throw new Error('Deep-dive returned empty or too-short answer');
  }

  const knownUrls = collectKnownUrls(ctx.report);
  const sanitized = stripMarkdown(raw)
    .replace(URL_PATTERN, (url) => {
      const candidate = url.replace(/[.,;:!?]+$/, '');
      return knownUrls.has(candidate) ? candidate : '';
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (sanitized.length < 40) {
    logger.warn('Deep-dive answer lost all content after sanitization', {
      service: 'ai/deep-dive',
      actionType: ctx.actionType,
      reportId: ctx.report.id,
    });
    throw new Error('Deep-dive answer could not be sanitized');
  }

  return { answer: normalizeRomanianDiacritics(sanitized) };
}
