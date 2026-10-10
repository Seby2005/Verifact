import type {
  VerificationReport,
  CombinedSource,
  ReportBuilderParams,
  ScoreBreakdown,
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
  EvidenceStatus,
} from '@/types/verification';
import {
  scoreToVerdict,
  scoreToConfidence,
  determineEvidenceStatus,
  calculatePlausibilityTilt,
  generateCriticalThinkingPrompt,
} from './scoring';
import { assignSourceTier } from './ai-source-filter';
import { publisherSiteOf } from './publisher-site';
import { buildFallbackSynthesis } from '@/lib/ai/report-synthesis';
import { stripMarkdown } from '@/lib/utils/romanian-text';

export function extractExecutiveSummary(aiAnalysis: string): string {
  if (!aiAnalysis) return '';

  const headingMatch = aiAnalysis.match(
    /(?:^|\n)#*\s*\*?\*?(?:Raport de Verificare a Faptelor|Rezumat|Summary|Rapport de vérification des faits|Résumé)\*?\*?\s*:?\s*([\s\S]*?)(?=(?:\n#*\s*\*?\*?(?:Analiz|Analyse|Context|Contexte|Concluz|Conclusion|Source|Sources|Fact|Detail)\*?\*?|\n\n#+|$))/i
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

  // Strip any leading list bullet + section label the model kept inline
  // (e.g. "– VERIFACT AFIRMAȚIA DE VERIFICAT: ... Rezumat:", "Rezumat:", "Summary:")
  clean = clean
    .replace(/^[\s\-*•–—]+/, '')
    .replace(/^(?:Verifact\s+)?(?:Afirma[tț]ia\s+de\s+verificat|Afirma[tț]ia|The\s+claim|L['’]affirmation)[^:]*:\s*(?:["“'][^"”']+["”']\s*)?(?:Rezumat|Summary|Résumé)?\s*:?\s*/i, '')
    .replace(/^(?:Verifact\s+)?(?:Rezumat|Summary|Résumé|Raport[^:]*)\s*:\s*/i, '')
    .replace(/^[\s\-*•–—]+/, '')
    .trim();

  return clean;
}

export function generateKeyTakeaways(
  claim: string,
  summary: string,
  sources: CombinedSource[],
  score: number,
  locale: 'ro' | 'en' | 'fr' = 'ro',
  verifiedClaim?: string,
  inputText?: string,
  evidenceStatus?: EvidenceStatus
): string[] {
  const isRo = locale === 'ro';
  const isFr = locale === 'fr';
  const takeaways: string[] = [];

  if (verifiedClaim && inputText && verifiedClaim.trim().toLowerCase() !== inputText.trim().toLowerCase()) {
    let verdictLabel: string;
    if (evidenceStatus) {
      switch (evidenceStatus) {
        case 'corroborated':
          verdictLabel = isRo ? 'Confirmat de documente / surse multiple' : isFr ? 'Corroboré par les sources' : 'Corroborated by primary sources';
          break;
        case 'contradicted':
          verdictLabel = isRo ? 'Contrazis de sursele oficiale / presă' : isFr ? 'Contredit par les sources officielles' : 'Contradicted by documented facts';
          break;
        case 'missing_context':
          verdictLabel = isRo ? 'Lipsit de context verificabil' : isFr ? 'Contexte manquant / partiel' : 'Missing verifiable context';
          break;
        case 'unverified_no_sources':
          verdictLabel = isRo ? 'Fără surse credibile identificate' : isFr ? 'Non corroboré / Aucune source' : 'No credible evidence found';
          break;
        case 'open_debate':
          verdictLabel = isRo ? 'Dezbatere deschisă / Opinii divergente' : isFr ? 'Débat ouvert / Avis divergents' : 'Open debate / Divergent opinions';
          break;
      }
    } else {
      verdictLabel =
        score >= 85
          ? (isRo ? 'Adevărat' : isFr ? 'Vrai' : 'True')
          : score >= 60
          ? (isRo ? 'Parțial Adevărat' : isFr ? 'Partiellement vrai' : 'Partially True')
          : score >= 40
          ? (isRo ? 'Neconfirmat / Context Neclar' : isFr ? 'Non confirmé' : 'Unconfirmed')
          : (isRo ? 'Fals / Fără Temei' : isFr ? 'Faux' : 'False');
    }

    takeaways.push(
      isRo
        ? `Am verificat ipoteza: „${verifiedClaim}” — Verdict: ${verdictLabel}.`
        : isFr
        ? `Hypothèse vérifiée : « ${verifiedClaim} » — Verdict : ${verdictLabel}.`
        : `Verified hypothesis: "${verifiedClaim}" — Verdict: ${verdictLabel}.`
    );
  }

  if (evidenceStatus) {
    switch (evidenceStatus) {
      case 'corroborated':
        takeaways.push(
          isRo
            ? 'Afirmația este confirmată convergent de documentele și sursele identificate.'
            : isFr
            ? 'L’affirmation est confirmée de manière convergente par les documents et sources identifiés.'
            : 'The claim is consistently corroborated by the identified documents and sources.'
        );
        break;
      case 'contradicted':
        takeaways.push(
          isRo
            ? 'Afirmația este contrazisă de sursele oficiale, documentele publice sau fact-checkeri.'
            : isFr
            ? 'L’affirmation est contredite par les sources officielles, les documents publics ou les fact-checkers.'
            : 'The claim is contradicted by official sources, public records, or certified fact-checkers.'
        );
        break;
      case 'missing_context':
        takeaways.push(
          isRo
            ? 'Afirmația conține elemente factuale reale, însă este lipsită de contextul verificabil esențial.'
            : isFr
            ? 'L’affirmation contient des éléments réels mais est dépourvue du contexte vérifiable déterminant.'
            : 'The claim contains real factual elements, but lacks essential verifiable context.'
        );
        break;
      case 'unverified_no_sources':
        takeaways.push(
          isRo
            ? 'Nu au fost identificate surse credibile sau dovezi primare care să ateste această afirmație.'
            : isFr
            ? 'Aucune source crédible ni preuve primaire n’a été identifiée pour étayer cette affirmation.'
            : 'No credible sources or primary evidence were found to substantiate this claim.'
        );
        break;
      case 'open_debate':
        takeaways.push(
          isRo
            ? 'Subiectul face obiectul unei dezbateri deschise, cu opinii divergente și fără consens factual tranșat.'
            : isFr
            ? 'Le sujet fait l’objet d’un débat ouvert, avec des avis divergents et sans consensus tranché.'
            : 'The topic is under open debate, with divergent opinions and no established factual consensus.'
        );
        break;
    }
  } else if (score >= 70) {
    takeaways.push(
      isRo
        ? `Afirmația este susținută de dovezile și sursele identificate (scor de veridicitate: ${score}%).`
        : isFr
        ? `L’affirmation est étayée par les preuves et les sources identifiées (score de véracité : ${score}%).`
        : `The claim is supported by the evidence and sources found (veracity score: ${score}%).`
    );
  } else if (score <= 30) {
    takeaways.push(
      isRo
        ? `Afirmația s-a dovedit falsă sau înșelătoare pe baza verificărilor (scor de veridicitate: ${score}%).`
        : isFr
        ? `L’affirmation s’est avérée fausse ou trompeuse sur la base des vérifications (score de véracité : ${score}%).`
        : `The claim was found to be false or misleading based on the checks (veracity score: ${score}%).`
    );
  } else {
    takeaways.push(
      isRo
        ? `Afirmația conține informații mixte, scoase din context sau neconfirmate (scor: ${score}%).`
        : isFr
        ? `L’affirmation contient des éléments mitigés, hors contexte ou non confirmés (score : ${score}%).`
        : `The claim contains mixed, out-of-context or unconfirmed information (score: ${score}%).`
    );
  }

  const tier1Count = sources.filter((s) => s.tier === 1).length;
  if (tier1Count > 0) {
    takeaways.push(
      isRo
        ? `Au fost identificate ${tier1Count} surse de înaltă autoritate (fact-checkeri / instituții oficiale).`
        : isFr
        ? `Nous avons identifié ${tier1Count} sources de haute autorité (fact-checkers certifiés / institutions officielles).`
        : `${tier1Count} high-authority sources were found (official fact-checkers / institutions).`
    );
  } else if (sources.length > 0) {
    takeaways.push(
      isRo
        ? `Au fost analizate ${sources.length} surse din presă și mediu digital.`
        : isFr
        ? `Nous avons analysé ${sources.length} sources issues de la presse et des médias numériques.`
        : `${sources.length} sources from the press and digital media were analysed.`
    );
  } else {
    takeaways.push(
      isRo
        ? 'Nu au fost găsite înregistrări directe în bazele publice de fact-checking.'
        : isFr
        ? 'Aucun enregistrement direct n’a été trouvé dans les bases publiques de fact-checking.'
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
      sources.push({
        title: `Fact-check: ${claimText.slice(0, 80)}${claimText.length > 80 ? '...' : ''}`,
        url,
        publisher: r.publisher,
        publishedAt: r.reviewDate || r.date,
        sourceType: 'fact_check',
        relevance: r.relevanceScore,
        supports: (r.ratingValue ?? 0.5) > 0.6 ? true : (r.ratingValue ?? 0.5) < 0.4 ? false : null,
        tier: assignSourceTier(url, r.publisher),
      });
    }
  }

  if (layer2?.results) {
    for (const a of layer2.results) {
      const url = a.articleUrl || a.url;
      if (!url) continue;
      const siteUrl = publisherSiteOf(url, a.sourceUrl);
      sources.push({
        title: a.title,
        url,
        siteUrl,
        publisher: a.source,
        publishedAt: a.publishedAt,
        sourceType: 'news',
        relevance: a.credibilityScore ?? 0.5,
        supports:
          a.sentiment === 'confirms' ? true
          : a.sentiment === 'contradicts' ? false
          : null,
        excerpt: a.snippet,
        tier: assignSourceTier(siteUrl ?? url, a.source),
      });
    }
  }

  if (layer3?.results) {
    for (const o of layer3.results) {
      const url = o.documentUrl || o.url;
      if (!url) continue;
      const siteUrl = publisherSiteOf(url, o.url);
      sources.push({
        title: o.title,
        url,
        siteUrl,
        publisher: o.organization || o.publisher || 'Oficial',
        publishedAt: o.publishedAt || o.publishedDate,
        sourceType: 'official',
        relevance: 0.9,
        supports:
          o.supportsOrDenies === 'supports' ? true
          : o.supportsOrDenies === 'denies' ? false
          : null,
        excerpt: o.relevantQuote ?? o.snippet,
        tier: assignSourceTier(siteUrl ?? url, o.organization || o.publisher),
      });
    }
  }

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
        supports: null,
        excerpt: text,
        tier: assignSourceTier(url, p.platform),
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
    aiAssessment,
    processingTime,
  } = params;

  // The verdict, summary and takeaways describe the cleaned claim when one was
  // extracted; `inputText` still holds exactly what the reader submitted.
  const claimText = verifiedClaim ?? input.text;

  const breakdown = scoreBreakdown || DEFAULT_SCORE_BREAKDOWN;
  const score = breakdown.finalScore;
  const resolvedLayers = {
    layer1: layer1 || params.layers?.layer1 || DEFAULT_UNAVAILABLE_LAYER1,
    layer2: layer2 || params.layers?.layer2 || DEFAULT_UNAVAILABLE_LAYER2,
    layer3: layer3 || params.layers?.layer3 || DEFAULT_UNAVAILABLE_LAYER3,
    layer4: layer4 || params.layers?.layer4 || DEFAULT_UNAVAILABLE_LAYER4,
  };

  const evidenceStatus =
    params.evidenceStatus ??
    determineEvidenceStatus({
      score,
      layers: resolvedLayers,
      ai: aiAssessment,
    });

  let verdict = scoreToVerdict(score);
  if (evidenceStatus === 'contradicted' && verdict !== 'false') {
    verdict = 'false';
  } else if (evidenceStatus === 'corroborated' && verdict !== 'true' && score >= 70) {
    verdict = 'true';
  }

  const confidenceLevel = scoreToConfidence(breakdown.availableLayers);
  const reportLocale = input.language === 'fr' ? 'fr' : input.language === 'en' ? 'en' : 'ro';

  const plausibilityTilt = calculatePlausibilityTilt(
    evidenceStatus,
    score,
    aiAssessment?.reasoning,
    reportLocale
  );

  const criticalThinkingPrompt = generateCriticalThinkingPrompt(
    evidenceStatus,
    claimText,
    reportLocale
  );

  const disclaimer =
    input.language === 'ro'
      ? 'Acest raport este un asistent pentru gândire critică generat automat și nu reprezintă un arbitru absolut al adevărului. Evaluarea evidențelor și înclinația de plauzibilitate se bazează pe sursele documentare identificate la momentul verificării. Te invităm să consulți sursele citate, să analizezi contextul și să tragi propriile concluzii.'
      : input.language === 'fr'
      ? 'Ce rapport est un assistant à la pensée critique généré automatiquement et ne constitue pas un arbitre absolu de la vérité. L’évaluation des preuves et l’indice de plausibilité reposent sur les sources documentaires identifiées lors de l’analyse. Nous vous invitons à consulter les sources citées et à forger votre propre jugement.'
      : 'This report is an automated critical thinking assistant and does not act as an infallible arbiter of truth. The evidence evaluation and plausibility tilt are based on documentary sources identified at the time of verification. We encourage you to review the cited sources, examine the context, and draw your own conclusions.';

  const sources = buildCombinedSources(params);
  const rawAnalysis = typeof aiAnalysis === 'object' ? aiAnalysis.summary : (aiAnalysis ?? '');
  const executiveSummary = extractExecutiveSummary(rawAnalysis);
  const keyTakeaways = generateKeyTakeaways(
    claimText,
    executiveSummary,
    sources,
    score,
    reportLocale,
    verifiedClaim,
    input.text,
    evidenceStatus
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
    evidenceStatus,
    plausibilityTilt,
    criticalThinkingPrompt,
    score,
    confidenceLevel,
    riskLevel: 'low',
    keyTakeaways,
    processingTimeMs: processingTime,
    processingTime,
    scoreBreakdown: breakdown,
    executiveSummary,
    layers: resolvedLayers,
    layer1: resolvedLayers.layer1,
    layer2: resolvedLayers.layer2,
    layer3: resolvedLayers.layer3,
    layer4: resolvedLayers.layer4,
    aiAnalysis: typeof aiAnalysis === 'string' ? aiAnalysis : aiAnalysis?.summary,
    sources,
    disclaimer,
    createdAt: new Date().toISOString(),
    isPublic: input.isPublic,
    userId: input.userId,
    fromCache: false,
    proSynthesis: buildFallbackSynthesis(
      {
        id: '',
        claim: claimText,
        inputText: input.text,
        verifiedClaim,
        posterCommentary,
        inputType: input.inputType,
        language: input.language,
        verdict,
        evidenceStatus,
        plausibilityTilt,
        score,
        confidenceLevel,
        keyTakeaways,
        executiveSummary,
        scoreBreakdown: breakdown,
        sources,
        createdAt: '',
        isPublic: input.isPublic,
      } as VerificationReport,
      sources,
      reportLocale
    ),
  };
}
