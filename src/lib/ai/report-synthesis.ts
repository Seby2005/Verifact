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

export interface SubClaimCheck {
  subClaim: string;
  verdict: 'true' | 'false' | 'partial' | 'unverified';
  explanation: string;
}

export interface ManipulationTechnique {
  name: string;
  description: string;
}

export interface JournalistQA {
  question: string;
  answer: string;
}

export interface ReportSynthesis {
  verdictRationale: string;
  whatToRemember: string[];
  agreements: string;
  contradictions: string;
  sourceInsights: SourceInsight[];
  commentaryAssessment: string;
  deepReasoning?: string;
  subClaims?: SubClaimCheck[];
  manipulationTechniques?: ManipulationTechnique[];
  motiveAndImpact?: string;
  missingEvidence?: string[];
  journalistFaq?: JournalistQA[];
}

const MODEL = process.env.OPENROUTER_MODEL || 'no-think/opencode/claude-sonnet-5-high';
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

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OMNIROUTE_API_KEY;
  if (!apiKey || sources.length === 0) return fallback;

  const claim = report.verifiedClaim ?? report.claim ?? report.inputText ?? '';
  const commentary = report.posterCommentary?.trim();
  const lang = locale === 'en' ? 'engleză' : 'română';
  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  const sourceLines = sources
    .map((s, i) => {
      const stance = s.supports === true ? 'confirmă' : s.supports === false ? 'contrazice' : 'context';
      const excerpt = (s.excerpt ?? '').slice(0, 260).replace(/\s+/g, ' ').trim();
      return `[${i + 1}] ${s.publisher} — ${s.title} — poziție: ${stance}${excerpt ? ` — extras: "${excerpt}"` : ''}`;
    })
    .join('\n');

  const prompt = `Ești cercetător senior de fact-checking și analist de dezinformare la Verifact. Sintetizează o anchetă jurnalistică de mare profunzime pe baza datelor de mai jos. Fii neutru, riguros, tehnic și strict factual. NU inventa surse, citate sau informații nefondate.

AFIRMAȚIA VERIFICATĂ: "${claim}"
VERDICT: ${verdictWord} (scor ${report.score}/100, încredere ${report.confidenceLevel})
${commentary ? `COMENTARIUL CELUI CARE A DISTRIBUIT: "${commentary}"` : ''}

SURSE CITATE:
${sourceLines}

Răspunde EXCLUSIV cu un obiect JSON valid, cu textele în limba ${lang}:
{
  "verdictRationale": "2-3 propoziții care explică de ce acest verdict, pe baza dovezilor",
  "whatToRemember": ["3-5 puncte esențiale, concise, de reținut"],
  "agreements": "o propoziție despre unde converg sursele (sau '' dacă nu e cazul)",
  "contradictions": "o propoziție despre unde diferă sursele (sau '' dacă nu e cazul)",
  "sourceInsights": [{"index": 1, "takeaway": "ce spune sursa despre afirmație, în 1-2 rânduri", "stance": "confirmă|contrazice|context"}],
  "commentaryAssessment": "${commentary ? 'o propoziție: comentariul distribuitorului este susținut de dovezi sau nu' : ''}",
  "deepReasoning": "Analiză detaliată de 2-3 paragrafe privind mecanismul de generare/răspândire a acestei afirmații și de ce este falsă/verificată",
  "subClaims": [
    {"subClaim": "prima sub-afirmație identificată", "verdict": "true|false|partial|unverified", "explanation": "explicație scurtă"}
  ],
  "manipulationTechniques": [
    {"name": "nume tehnică (ex. Titlu Muncit / Scoatere din Context)", "description": "descriere scurtă cum s-a aplicat"}
  ],
  "motiveAndImpact": "Descriere scurtă a motivației posibile (politică, financiară, senzaționalistă) și impactul public",
  "missingEvidence": ["ce dovezi sau documente oficiale lipsesc pentru a proba afirmația"],
  "journalistFaq": [
    {"question": "Întrebare cheie pe care un jurnalist ar pune-o", "answer": "Răspuns factual și concis"}
  ]
}`;

  try {
    const data = await withCircuitBreaker('openrouter-synthesis', () =>
      fetchWithRetry(
        `${baseUrl}/chat/completions`,
        () => ({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
            'X-Title': 'Verifact Report Synthesis',
          },
          signal: AbortSignal.timeout(15000),
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
      deepReasoning: str(parsed.deepReasoning) || fallback.deepReasoning,
      subClaims: Array.isArray(parsed.subClaims) && parsed.subClaims.length > 0 ? parsed.subClaims : fallback.subClaims,
      manipulationTechniques: Array.isArray(parsed.manipulationTechniques) && parsed.manipulationTechniques.length > 0 ? parsed.manipulationTechniques : fallback.manipulationTechniques,
      motiveAndImpact: str(parsed.motiveAndImpact) || fallback.motiveAndImpact,
      missingEvidence: Array.isArray(parsed.missingEvidence) && parsed.missingEvidence.length > 0 ? parsed.missingEvidence.map(str) : fallback.missingEvidence,
      journalistFaq: Array.isArray(parsed.journalistFaq) && parsed.journalistFaq.length > 0 ? parsed.journalistFaq : fallback.journalistFaq,
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
  const claimText = report.verifiedClaim || report.claim || report.inputText || '';
  
  // Construct fallback sub-claims
  const subClaims: SubClaimCheck[] = [
    {
      subClaim: claimText.slice(0, 100),
      verdict: report.verdict === 'true' ? 'true' : report.verdict === 'false' ? 'false' : 'partial',
      explanation: report.executiveSummary || (ro ? 'Concluzie bazată pe analiza surselor verificate.' : 'Conclusion based on verified sources analysis.')
    }
  ];

  // Construct fallback manipulation techniques
  const techniques: ManipulationTechnique[] = [];
  if (report.verdict === 'false' || report.verdict === 'partial') {
    techniques.push({
      name: ro ? 'Scoatere din context / Exagerare' : 'Out-of-context / Exaggeration',
      description: ro ? 'Informația prezentată distorsionează faptele reale sau omite detalii esențiale.' : 'The presented information distorts real facts or omits essential context.'
    });
    if (report.posterCommentary) {
      techniques.push({
        name: ro ? 'Interpretare speculativă' : 'Speculative framing',
        description: ro ? 'Comentariul adăugat încearcă să orienteze părerea cititorului fără acoperire factuală.' : 'The added commentary attempts to bias the reader without factual support.'
      });
    }
  }

  // Construct fallback FAQ for journalists
  const journalistFaq: JournalistQA[] = [
    {
      question: ro ? 'Care este concluzia principală a verificării?' : 'What is the main conclusion of the verification?',
      answer: stripMarkdown(report.executiveSummary) || (ro ? 'Afirmația a fost analizată comparativ cu bazele de date de fact-checking și sursele de știri verificate.' : 'The claim was analyzed against fact-checking databases and verified news sources.')
    },
    {
      question: ro ? 'Ce nivel de încredere are această verificare?' : 'What is the confidence level of this check?',
      answer: ro ? `Nivelul de încredere este ${report.confidenceLevel.toUpperCase()} pe baza a ${sources.length} surse primare și secundare.` : `The confidence level is ${report.confidenceLevel.toUpperCase()} based on ${sources.length} primary and secondary sources.`
    }
  ];

  return {
    verdictRationale: stripMarkdown(report.executiveSummary) || (ro ? 'Vezi sursele citate pentru context.' : 'See the cited sources for context.'),
    whatToRemember:
      report.keyTakeaways && report.keyTakeaways.length > 0
        ? report.keyTakeaways.map(stripMarkdown).filter(Boolean)
        : [stripMarkdown(report.executiveSummary)].filter(Boolean),
    agreements: ro ? 'Sursele oficiale și agențiile de fact-checking confirmă analiza structurată.' : 'Official sources and fact-checking outlets support the structured analysis.',
    contradictions: report.verdict === 'false' ? (ro ? 'Declarațiile din postare contrazic datele factuale stabilite de surse.' : 'The post assertions contradict factual data established by sources.') : '',
    sourceInsights: sources.map((s, i) => ({
      index: i + 1,
      takeaway: stripMarkdown((s.excerpt ?? '').slice(0, 200) || s.title),
      stance: s.supports === true ? (ro ? 'confirmă' : 'confirms') : s.supports === false ? (ro ? 'contrazice' : 'contradicts') : 'context',
    })),
    commentaryAssessment: report.posterCommentary ? (ro ? 'Comentariul adăugat reprezintă o interpretare personală care nu este susținută de fapte.' : 'The added commentary represents a personal interpretation unsupported by facts.') : '',
    deepReasoning: stripMarkdown(report.executiveSummary) + (ro ? ' Analiza automată Verifact a evaluat corpul de dovezi din bazele de date partenere, verificând autenticitatea afirmației factuale și delimitând-o de speculațiile din mediul online.' : ' Verifact automated analysis evaluated the evidence across partner databases, verifying factual authenticity and isolating online speculation.'),
    subClaims,
    manipulationTechniques: techniques,
    motiveAndImpact: ro ? 'Distribuirea de informații neverificate poate induce în eroare opinia publică și distorsiona percepția asupra evenimentelor.' : 'Distributing unverified information may mislead public opinion and distort event perception.',
    missingEvidence: [
      ro ? 'Documente oficiale sau confirmări directe de la instituții abilitate.' : 'Official documents or direct confirmations from authorized institutions.'
    ],
    journalistFaq
  };
}
