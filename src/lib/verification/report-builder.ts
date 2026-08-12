import type {
  VerificationReport,
  CombinedSource,
  ReportBuilderParams,
  ScoreBreakdown,
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
} from '@/types/verification';
import { scoreToVerdict, scoreToConfidence } from './scoring';
import { assignSourceTier } from './ai-source-filter';
import { getStateMediaInfo } from './state-media';

import { stripMarkdown } from '@/lib/utils/romanian-text';

export function extractExecutiveSummary(aiAnalysis: string): string {
  if (!aiAnalysis) return '';

  const headingMatch = aiAnalysis.match(
    /(?:^|\n)#*\s*\*?\*?(?:Raport de Verificare a Faptelor|Rezumat|Summary)\*?\*?\s*:?\s*([\s\S]*?)(?=(?:\n#*\s*\*?\*?(?:Analiz|Context|Concluz|Source|Sources|Fact|Detail)\*?\*?|\n\n#+|$))/i
  );

  let clean = '';
  if (headingMatch && headingMatch[1].trim().length > 0) {
    clean = stripMarkdown(headingMatch[1]);
  }

  if (!clean || clean.length < 25) {
    const fullClean = stripMarkdown(aiAnalysis);
    const sentences = fullClean.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 15);
    clean = (sentences.length > 0 ? sentences.slice(0, 2) : [fullClean]).join(' ').trim();
  }

  return clean;
}

export function generateKeyTakeaways(
  claim: string,
  summary: string,
  sources: CombinedSource[],
  score: number,
  locale: 'ro' | 'en' = 'ro'
): string[] {
  const ro = locale !== 'en';
  const takeaways: string[] = [];

  if (score >= 70) {
    takeaways.push(
      ro
        ? `Afirmația este susținută de dovezile și sursele identificate (scor de veridicitate: ${score}%).`
        : `The claim is supported by the evidence and sources found (veracity score: ${score}%).`
    );
  } else if (score <= 30) {
    takeaways.push(
      ro
        ? `Afirmația s-a dovedit falsă sau înșelătoare pe baza verificărilor (scor de veridicitate: ${score}%).`
        : `The claim was found to be false or misleading based on the checks (veracity score: ${score}%).`
    );
  } else {
    takeaways.push(
      ro
        ? `Afirmația conține informații mixte, scoase din context sau neconfirmate (scor: ${score}%).`
        : `The claim contains mixed, out-of-context or unconfirmed information (score: ${score}%).`
    );
  }

  const tier1Count = sources.filter((s) => s.tier === 1).length;
  if (tier1Count > 0) {
    takeaways.push(
      ro
        ? `Au fost identificate ${tier1Count} surse de înaltă autoritate (fact-checkeri / instituții oficiale).`
        : `${tier1Count} high-authority sources were found (official fact-checkers / institutions).`
    );
  } else if (sources.length > 0) {
    takeaways.push(
      ro
        ? `Au fost analizate ${sources.length} surse din presă și mediu digital.`
        : `${sources.length} sources from the press and digital media were analysed.`
    );
  } else {
    takeaways.push(
      ro
        ? 'Nu au fost găsite înregistrări directe în bazele publice de fact-checking.'
        : 'No direct records were found in public fact-checking databases.'
    );
  }

  return takeaways;
}

function buildCombinedSources(params: ReportBuilderParams): CombinedSource[] {
  const layer1 = params.layer1 || params.layers?.layer1;
  const layer2 = params.layer2 || params.layers?.layer2;
  const layer3 = params.layer3 || params.layers?.layer3;
  const layer4 = params.layer4 || params.layers?.layer4;
  const sources: CombinedSource[] = [];

  if (layer1?.results) {
    for (const r of layer1.results) {
      const url = r.reviewUrl || r.url;
      if (!url) continue;
      const claimText = r.claimReviewed || r.title || '';
      const stateMedia = getStateMediaInfo(url);
      sources.push({
        title: `Fact-check: ${claimText.slice(0, 80)}${claimText.length > 80 ? '...' : ''}`,
        url,
        publisher: r.publisher,
        publishedAt: r.reviewDate || r.date,
        sourceType: 'fact_check',
        relevance: r.relevanceScore,
        supports: (r.ratingValue ?? 0.5) > 0.6 ? true : (r.ratingValue ?? 0.5) < 0.4 ? false : null,
        tier: assignSourceTier(url, r.publisher),
        ...(stateMedia ? { stateMediaInfo: stateMedia } : {}),
      });
    }
  }

  if (layer2?.results) {
    for (const a of layer2.results) {
      const url = a.articleUrl || a.url;
      if (!url) continue;
      const stateMedia = a.stateMediaInfo || getStateMediaInfo(url);
      sources.push({
        title: a.title,
        url,
        publisher: a.source,
        publishedAt: a.publishedAt,
        sourceType: 'news',
        relevance: a.credibilityScore ?? 0.5,
        supports:
          a.sentiment === 'confirms' ? true
          : a.sentiment === 'contradicts' ? false
          : null,
        excerpt: a.snippet,
        tier: assignSourceTier(url, a.source),
        ...(stateMedia ? { stateMediaInfo: stateMedia } : {}),
      });
    }
  }

  if (layer3?.results) {
    for (const o of layer3.results) {
      const url = o.documentUrl || o.url;
      if (!url) continue;
      const stateMedia = getStateMediaInfo(url);
      sources.push({
        title: o.title,
        url,
        publisher: o.organization || o.publisher || 'Oficial',
        publishedAt: o.publishedAt || o.publishedDate,
        sourceType: 'official',
        relevance: 0.9,
        supports:
          o.supportsOrDenies === 'supports' ? true
          : o.supportsOrDenies === 'denies' ? false
          : null,
        excerpt: o.relevantQuote ?? o.snippet,
        tier: assignSourceTier(url, o.organization || o.publisher),
        ...(stateMedia ? { stateMediaInfo: stateMedia } : {}),
      });
    }
  }

  if (layer4?.results) {
    for (const p of layer4.results) {
      const url = p.postUrl || p.url;
      if (!url) continue;
      const text = p.content || p.text || '';
      const stateMedia = getStateMediaInfo(url);
      sources.push({
        title: `${p.author || 'User'}: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`,
        url,
        publisher: p.platform,
        publishedAt: p.postDate || p.date,
        sourceType: 'social',
        relevance: p.isOriginalSource ? 0.8 : 0.4,
        supports: null,
        excerpt: text,
        tier: assignSourceTier(url, p.platform),
        ...(stateMedia ? { stateMediaInfo: stateMedia } : {}),
      });
    }
  }

  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    if (!s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  unique.sort((a, b) => {
    const aTier = a.tier ?? 2;
    const bTier = b.tier ?? 2;
    if (aTier !== bTier) return aTier - bTier;
    return b.relevance - a.relevance;
  });

  return unique.slice(0, 15);
}

const DEFAULT_SCORE_BREAKDOWN: ScoreBreakdown = {
  finalScore: 50,
  availableLayers: 0,
  weights: { factCheck: 0.35, news: 0.3, official: 0.25, social: 0.1 },
};

const DEFAULT_UNAVAILABLE_LAYER1: Layer1Result = { status: 'unavailable', results: [], summary: '', layerScore: 0.5 };
const DEFAULT_UNAVAILABLE_LAYER2: Layer2Result = { status: 'unavailable', results: [], summary: '', layerScore: 0.5 };
const DEFAULT_UNAVAILABLE_LAYER3: Layer3Result = { status: 'unavailable', results: [], summary: '', layerScore: 0.5 };
const DEFAULT_UNAVAILABLE_LAYER4: Layer4Result = { status: 'unavailable', results: [], summary: '', layerScore: 0.5 };

export function buildReport(params: ReportBuilderParams): VerificationReport {
  const {
    input,
    verifiedClaim,
    posterCommentary,
    layer1,
    layer2,
    layer3,
    layer4,
    scoreBreakdown,
    aiAnalysis,
    processingTime,
  } = params;

  // The verdict, summary and takeaways describe the cleaned claim when one was
  // extracted; `inputText` still holds exactly what the reader submitted.
  const claimText = verifiedClaim ?? input.text;

  const breakdown = scoreBreakdown || DEFAULT_SCORE_BREAKDOWN;
  const score = breakdown.finalScore;
  const verdict = scoreToVerdict(score);
  const confidenceLevel = scoreToConfidence(breakdown.availableLayers);

  const disclaimer =
    input.language === 'ro'
      ? 'Acest raport este generat automat de un sistem AI și nu reprezintă o decizie editorială finală. Scorul de veridicitate este o estimare bazată pe sursele disponibile la momentul verificării. Consultați sursele citate pentru context complet. Aplicația nu preia responsabilitate pentru conținutul surselor externe.'
      : 'This report is automatically generated by an AI system and does not represent a final editorial decision. The veracity score is an estimate based on sources available at the time of verification. Consult the cited sources for full context. The application takes no responsibility for third-party source content.';

  const sources = buildCombinedSources(params);
  const rawAnalysis = typeof aiAnalysis === 'object' ? aiAnalysis.summary : (aiAnalysis ?? '');
  const executiveSummary = extractExecutiveSummary(rawAnalysis);
  const keyTakeaways = generateKeyTakeaways(
    claimText,
    executiveSummary,
    sources,
    score,
    input.language === 'en' ? 'en' : 'ro'
  );

  return {
    id: crypto.randomUUID(),
    claim: claimText,
    inputText: input.text,
    verifiedClaim,
    posterCommentary,
    inputType: input.inputType,
    language: input.language,
    verdict,
    score,
    confidenceLevel,
    riskLevel: 'low',
    keyTakeaways,
    processingTimeMs: processingTime,
    processingTime,
    scoreBreakdown: breakdown,
    executiveSummary,
    layers: {
      layer1: layer1 || DEFAULT_UNAVAILABLE_LAYER1,
      layer2: layer2 || DEFAULT_UNAVAILABLE_LAYER2,
      layer3: layer3 || DEFAULT_UNAVAILABLE_LAYER3,
      layer4: layer4 || DEFAULT_UNAVAILABLE_LAYER4,
    },
    layer1,
    layer2,
    layer3,
    layer4,
    aiAnalysis: typeof aiAnalysis === 'string' ? aiAnalysis : aiAnalysis?.summary,
    sources,
    disclaimer,
    createdAt: new Date().toISOString(),
    isPublic: input.isPublic,
    userId: input.userId,
    fromCache: false,
  };
}
