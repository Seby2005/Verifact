import type {
  VerificationReport,
  CombinedSource,
  ReportBuilderParams,
} from '@/types/verification';
import { scoreToVerdict, scoreToConfidence } from './scoring';

/**
 * Extracts a 1-2 sentence executive summary from the full AI analysis.
 * Looks for the **Rezumat** / **Summary** section.
 */
export function extractExecutiveSummary(aiAnalysis: string): string {
  // Try to find bolded summary section
  const rezumatMatch = aiAnalysis.match(
    /\*\*Rezumat\*\*[\s\S]*?(?:\n+)([^\*]+?)(?:\n\n|\*\*|$)/
  );
  if (rezumatMatch?.[1]) return rezumatMatch[1].trim();

  const summaryMatch = aiAnalysis.match(
    /\*\*Summary\*\*[\s\S]*?(?:\n+)([^\*]+?)(?:\n\n|\*\*|$)/
  );
  if (summaryMatch?.[1]) return summaryMatch[1].trim();

  // Fallback: first 2 sentences
  const sentences = aiAnalysis
    .replace(/\*\*/g, '')
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 10);

  return sentences.slice(0, 2).join(' ').trim();
}

/**
 * Combines sources from all layers into a unified, deduplicated, sorted list.
 */
function buildCombinedSources(params: ReportBuilderParams): CombinedSource[] {
  const layer1 = params.layer1 || params.layers?.layer1;
  const layer2 = params.layer2 || params.layers?.layer2;
  const layer3 = params.layer3 || params.layers?.layer3;
  const layer4 = params.layer4 || params.layers?.layer4;
  const sources: CombinedSource[] = [];

  // Layer 1: Fact-check sources
  if (layer1?.results) {
    for (const r of layer1.results) {
      const url = r.reviewUrl || r.url;
      if (!url) continue;
      const claimText = r.claimReviewed || r.title || '';
      sources.push({
        title: `Fact-check: ${claimText.slice(0, 80)}${claimText.length > 80 ? '...' : ''}`,
        url,
        publisher: r.publisher,
        publishedAt: r.reviewDate || r.date,
        sourceType: 'fact_check',
        relevance: r.relevanceScore,
        supports: (r.ratingValue ?? 0.5) > 0.6 ? true : (r.ratingValue ?? 0.5) < 0.4 ? false : null,
      });
    }
  }

  // Layer 2: News articles
  if (layer2?.results) {
    for (const a of layer2.results) {
      const url = a.articleUrl || a.url;
      if (!url) continue;
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
      });
    }
  }

  // Layer 3: Official sources
  if (layer3?.results) {
    for (const o of layer3.results) {
      const url = o.documentUrl || o.url;
      if (!url) continue;
      sources.push({
        title: o.title,
        url,
        publisher: o.organization || o.publisher || 'Oficial',
        publishedAt: o.publishedAt || o.publishedDate,
        sourceType: 'official',
        relevance: 0.9, // Official sources are always highly relevant
        supports:
          o.supportsOrDenies === 'supports' ? true
          : o.supportsOrDenies === 'denies' ? false
          : null,
      });
    }
  }

  // Layer 4: Social media
  if (layer4?.results) {
    for (const p of layer4.results) {
      const url = p.postUrl || p.url;
      if (!url) continue;
      const text = p.content || p.text || '';
      sources.push({
        title: `${p.author || 'User'}: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`,
        url,
        publisher: p.platform,
        publishedAt: p.postDate || p.date,
        sourceType: 'social',
        relevance: p.isOriginalSource ? 0.8 : 0.4,
        supports: null, // Social media posts are informational, not verdicts
      });
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = sources.filter(s => {
    if (!s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  // Sort: official > fact_check > news > social, then by relevance
  const typeOrder: Record<string, number> = { official: 0, fact_check: 1, news: 2, social: 3 };
  unique.sort((a, b) => {
    const aOrder = typeOrder[a.sourceType || ''] ?? 99;
    const bOrder = typeOrder[b.sourceType || ''] ?? 99;
    const typeDiff = aOrder - bOrder;
    if (typeDiff !== 0) return typeDiff;
    return b.relevance - a.relevance;
  });

  return unique.slice(0, 15);
}

/**
 * Builds the final VerificationReport from all layer results and AI analysis.
 */
export function buildReport(params: ReportBuilderParams): VerificationReport {
  const {
    input,
    layer1,
    layer2,
    layer3,
    layer4,
    scoreBreakdown,
    aiAnalysis,
    processingTime,
  } = params;

  const verdict = scoreToVerdict(scoreBreakdown?.finalScore ?? 50);
  const confidenceLevel = scoreToConfidence(scoreBreakdown?.availableLayers ?? 4);

  const disclaimer =
    input.language === 'ro'
      ? 'Acest raport este generat automat de un sistem AI și nu reprezintă o decizie editorială finală. Scorul de veridicitate este o estimare bazată pe sursele disponibile la momentul verificării. Consultați sursele citate pentru context complet. Aplicația nu preia responsabilitate pentru conținutul surselor externe.'
      : 'This report is automatically generated by an AI system and does not represent a final editorial decision. The veracity score is an estimate based on sources available at the time of verification. Consult the cited sources for full context. The application takes no responsibility for third-party source content.';

  const sources = buildCombinedSources(params);
  const rawAnalysis = typeof aiAnalysis === 'object' ? aiAnalysis.summary : (aiAnalysis ?? '');
  const executiveSummary = extractExecutiveSummary(rawAnalysis);

  return {
    id: crypto.randomUUID(),
    claim: input.text,
    inputText: input.text,
    inputType: input.inputType,
    language: input.language,
    verdict,
    score: scoreBreakdown?.finalScore ?? 50,
    confidenceLevel,
    processingTimeMs: processingTime,
    processingTime,
    scoreBreakdown,
    executiveSummary,
    layers: {
      layer1: layer1 || { status: 'unavailable', results: [] },
      layer2: layer2 || { status: 'unavailable', results: [] },
      layer3: layer3 || { status: 'unavailable', results: [] },
      layer4: layer4 || { status: 'unavailable', results: [] },
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
