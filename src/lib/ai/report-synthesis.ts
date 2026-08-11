import { logger } from '@/lib/utils/logger';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { fetchWithRetry } from '@/lib/utils/retry';
import { stripMarkdown } from '@/lib/utils/romanian-text';
import type { VerificationReport } from '@/types/verification';

/**
 * The reader-facing synthesis that turns a raw verification (verdict + a list of
 * sources) into the report a person actually wants: why the verdict, what to
 * remember, where the sources agree and differ, and a one-line takeaway per
 * source — so nobody has to open ten tabs to understand the check.
 */
export interface SourceInsight {
  index: number; // 1-based, matches the order sources are shown in the PDF
  takeaway: string;
  stance: 'confirmă' | 'contrazice' | 'context' | 'confirms' | 'contradicts';
}

export interface ReportSynthesis {
  verdictRationale: string;
  whatToRemember: string[];
  agreements: string;
  contradictions: string;
  sourceInsights: SourceInsight[];
  commentaryAssessment: string;
}

const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const MAX_SOURCES = 10;

/**
 * Builds the synthesis with the AI, falling back to a plain summary derived from
 * the report's own fields when no model is available or the call fails — so the
 * PDF always has content, and never blocks on the AI.
 */
export async function synthesizeReport(
  report: VerificationReport,
  verdictWord: string,
  locale: 'ro' | 'en'
): Promise<ReportSynthesis> {
  const sources = (report.sources ?? []).slice(0, MAX_SOURCES);
  const fallback = buildFallbackSynthesis(report, sources, locale);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || sources.length === 0) return fallback;

  const claim = report.verifiedClaim ?? report.claim ?? report.inputText ?? '';
  const commentary = report.posterCommentary?.trim();
  const lang = locale === 'en' ? 'engleză' : 'română';

  const sourceLines = sources
    .map((s, i) => {
      const stance = s.supports === true ? 'confirmă' : s.supports === false ? 'contrazice' : 'context';
      const excerpt = (s.excerpt ?? '').slice(0, 260).replace(/\s+/g, ' ').trim();
      return `[${i + 1}] ${s.publisher} — ${s.title} — poziție: ${stance}${excerpt ? ` — extras: "${excerpt}"` : ''}`;
    })
    .join('\n');

  const prompt = `Ești redactor de fact-checking la Verifact. Sintetizează un raport pentru cititor pe baza datelor de mai jos. Fii neutru, concis și strict factual. NU inventa surse, citate sau informații care nu apar mai jos.

AFIRMAȚIA VERIFICATĂ: "${claim}"
VERDICT: ${verdictWord} (scor ${report.score}/100)
${commentary ? `COMENTARIUL CELUI CARE A DISTRIBUIT (opinie personală, NU afirmația factuală): "${commentary}"` : ''}

SURSE:
${sourceLines}

Răspunde EXCLUSIV cu un obiect JSON, cu textele în limba ${lang}:
{
  "verdictRationale": "2-3 propoziții care explică de ce acest verdict, pe baza surselor",
  "whatToRemember": ["3-5 puncte esențiale, scurte, de reținut"],
  "agreements": "o propoziție despre unde converg sursele (sau '' dacă nu e cazul)",
  "contradictions": "o propoziție despre unde diferă sursele (sau '' dacă nu e cazul)",
  "sourceInsights": [{"index": 1, "takeaway": "ce spune sursa despre afirmație, în 1-2 rânduri", "stance": "confirmă|contrazice|context"}],
  "commentaryAssessment": "${commentary ? 'o propoziție: comentariul distribuitorului este susținut de dovezi sau nu' : ''}"
}`;

  try {
    const data = await withCircuitBreaker('openrouter-synthesis', () =>
      fetchWithRetry(
        'https://openrouter.ai/api/v1/chat/completions',
        () => ({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
            'X-Title': 'Verifact Report Synthesis',
          },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        }),
        { label: 'Report synthesis' }
      ).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
      })
    );

    const raw = data.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]) as Partial<ReportSynthesis>;
    return {
      verdictRationale: str(parsed.verdictRationale) || fallback.verdictRationale,
      whatToRemember:
        Array.isArray(parsed.whatToRemember) && parsed.whatToRemember.length > 0
          ? parsed.whatToRemember.map(str).filter(Boolean).slice(0, 5)
          : fallback.whatToRemember,
      agreements: str(parsed.agreements),
      contradictions: str(parsed.contradictions),
      sourceInsights: normalizeInsights(parsed.sourceInsights, sources.length) || fallback.sourceInsights,
      commentaryAssessment: str(parsed.commentaryAssessment),
    };
  } catch (err) {
    logger.warn('Report synthesis failed, using fallback', {
      service: 'report-synthesis',
      error: String(err),
    });
    return fallback;
  }
}

/**
 * The synthesis built purely from the report's already-computed fields — no AI
 * call, so it is instant. The verification already ran the model (analysis,
 * takeaways, source excerpts); regenerating a fresh synthesis on every PDF
 * download just re-paid for that work and made the download slow. The PDF route
 * uses this instead of synthesizeReport.
 */
export function synthesisFromReport(report: VerificationReport, locale: 'ro' | 'en'): ReportSynthesis {
  const sources = (report.sources ?? []).slice(0, MAX_SOURCES);
  return buildFallbackSynthesis(report, sources, locale);
}

function str(value: unknown): string {
  return typeof value === 'string' ? stripMarkdown(value) : '';
}

function normalizeInsights(value: unknown, count: number): SourceInsight[] | null {
  if (!Array.isArray(value)) return null;
  const insights = value
    .map((v): SourceInsight | null => {
      const o = v as Record<string, unknown>;
      const index = Number(o.index);
      const takeaway = str(o.takeaway);
      if (!Number.isFinite(index) || index < 1 || index > count || !takeaway) return null;
      const stance = str(o.stance) as SourceInsight['stance'];
      return { index, takeaway, stance: stance || 'context' };
    })
    .filter((x): x is SourceInsight => x !== null);
  return insights.length > 0 ? insights : null;
}

/** A synthesis assembled from the report's own fields, with no model call. */
function buildFallbackSynthesis(
  report: VerificationReport,
  sources: VerificationReport['sources'],
  locale: 'ro' | 'en'
): ReportSynthesis {
  const ro = locale === 'ro';
  return {
    verdictRationale: stripMarkdown(report.executiveSummary) || (ro ? 'Vezi sursele citate pentru context.' : 'See the cited sources for context.'),
    whatToRemember:
      report.keyTakeaways && report.keyTakeaways.length > 0
        ? report.keyTakeaways.map(stripMarkdown).filter(Boolean)
        : [stripMarkdown(report.executiveSummary)].filter(Boolean),
    agreements: '',
    contradictions: '',
    sourceInsights: sources.map((s, i) => ({
      index: i + 1,
      takeaway: stripMarkdown((s.excerpt ?? '').slice(0, 200) || s.title),
      stance: s.supports === true ? (ro ? 'confirmă' : 'confirms') : s.supports === false ? (ro ? 'contrazice' : 'contradicts') : 'context',
    })),
    commentaryAssessment: '',
  };
}
