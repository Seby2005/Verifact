import { logger } from '@/lib/utils/logger';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { fetchWithRetry } from '@/lib/utils/retry';
import { normalizeRomanianDiacritics, stripMarkdown } from '@/lib/utils/romanian-text';
import type {
  VerificationReport,
  ProReportSynthesis,
  SourceInsight,
  SourceComparisonEntry,
  CrossSourceAnalysis,
  SubClaimCheck,
  ManipulationTechnique,
  ManipulationAnalysis,
  NarrativeAndImpact,
  InvestigatorToolkit,
  JournalistQA,
  CombinedSource,
} from '@/types/verification';

export type ReportSynthesis = ProReportSynthesis;

const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
const MAX_SOURCES = 10;

function str(value: unknown): string {
  if (typeof value !== 'string') return '';
  return normalizeRomanianDiacritics(stripMarkdown(value)).trim();
}

function strArray(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(str)
    .filter((s) => s.length > 0)
    .slice(0, max);
}

function normalizeSourceInsights(
  value: unknown,
  sources: CombinedSource[]
): SourceInsight[] | null {
  if (!Array.isArray(value)) return null;
  const insights = value
    .map((v): SourceInsight | null => {
      const o = v as Record<string, unknown>;
      const index = Number(o.index);
      const takeaway = str(o.takeaway);
      if (!Number.isFinite(index) || index < 1 || index > sources.length || !takeaway) return null;

      const sourceObj = sources[index - 1];
      const rawStance = str(o.stance).toLowerCase();
      const stance: SourceInsight['stance'] =
        rawStance.includes('contra') || rawStance.includes('refut')
          ? 'contrazice'
          : rawStance.includes('confirm') || rawStance.includes('support')
          ? 'confirmă'
          : 'context';

      return {
        index,
        publisher: sourceObj?.publisher || str(o.publisher) || 'Sursă',
        sourceUrl: sourceObj?.url || str(o.sourceUrl) || undefined,
        takeaway,
        stance,
        credibilityNote: str(o.credibilityNote) || undefined,
        directQuote: str(o.directQuote) || (sourceObj?.excerpt ? str(sourceObj.excerpt) : undefined),
      };
    })
    .filter((x): x is SourceInsight => x !== null);

  return insights.length > 0 ? insights : null;
}

function normalizeSubClaims(value: unknown): SubClaimCheck[] | null {
  if (!Array.isArray(value)) return null;
  const list = value
    .map((v): SubClaimCheck | null => {
      const o = v as Record<string, unknown>;
      const subClaim = str(o.subClaim);
      const explanation = str(o.explanation);
      if (!subClaim || subClaim.length < 5) return null;

      const rawVerdict = str(o.verdict).toLowerCase();
      const verdict: SubClaimCheck['verdict'] =
        rawVerdict === 'true' || rawVerdict === 'false' || rawVerdict === 'partial'
          ? rawVerdict
          : 'unverified';

      const evidenceIndexes = Array.isArray(o.evidenceSourceIndexes)
        ? o.evidenceSourceIndexes
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n) && n >= 1)
        : undefined;

      return {
        subClaim,
        verdict,
        explanation: explanation || 'Verificat pe baza surselor disponibile.',
        evidenceSourceIndexes: evidenceIndexes,
      };
    })
    .filter((x): x is SubClaimCheck => x !== null);

  return list.length > 0 ? list : null;
}

function normalizeManipulation(
  value: unknown,
  isRo: boolean
): ManipulationAnalysis | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  const rawTechniques = Array.isArray(o.techniques) ? o.techniques : [];

  const techniques: ManipulationTechnique[] = rawTechniques
    .map((t): ManipulationTechnique | null => {
      const item = t as Record<string, unknown>;
      const name = str(item.name);
      const description = str(item.description);
      const manifestation = str(item.manifestationInClaim || item.manifestation);
      if (!name) return null;

      return {
        name,
        category: (item.category as ManipulationTechnique['category']) || 'framing',
        description: description || name,
        manifestationInClaim:
          manifestation ||
          (isRo
            ? 'Element identificat în textul sau contextul distribuirii afirmației.'
            : 'Element identified in the claim text or sharing context.'),
      };
    })
    .filter((x): x is ManipulationTechnique => x !== null);

  const detected = Boolean(o.detected) || techniques.length > 0;
  const summary =
    str(o.summary) ||
    (detected
      ? (isRo
          ? `Au fost identificate ${techniques.length} tehnici de formulare sau distorsionare a contextului.`
          : `${techniques.length} framing or distortion techniques were identified.`)
      : (isRo
          ? 'Nu au fost identificate tehnici evidente de manipulare retorică.'
          : 'No evident rhetorical manipulation techniques were identified.'));

  return {
    detected,
    techniques,
    summary,
  };
}

function normalizeJournalistFaq(value: unknown): JournalistQA[] | null {
  if (!Array.isArray(value)) return null;
  const faqs = value
    .map((f): JournalistQA | null => {
      const o = f as Record<string, unknown>;
      const question = str(o.question);
      const answer = str(o.answer);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((x): x is JournalistQA => x !== null);
  return faqs.length > 0 ? faqs : null;
}

/**
 * Builds the comprehensive Pro Fact-Checking Intelligence Dossier.
 */
export async function synthesizeReport(
  report: VerificationReport,
  verdictWord: string,
  locale: 'ro' | 'en' | 'fr'
): Promise<ProReportSynthesis> {
  const sources = (report.sources ?? []).slice(0, MAX_SOURCES);
  const isRo = locale === 'ro';
  const isFr = locale === 'fr';
  const fallback = buildFallbackSynthesis(report, sources, locale);

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OMNIROUTE_API_KEY;
  if (!apiKey || sources.length === 0) return fallback;

  const claim = report.verifiedClaim ?? report.claim ?? report.inputText ?? '';
  const commentary = report.posterCommentary?.trim();
  const lang = isRo ? 'română' : isFr ? 'français' : 'engleză';
  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  const sourceLines = sources
    .map((s, i) => {
      const stance =
        s.supports === true ? 'confirmă' : s.supports === false ? 'contrazice' : 'context';
      const excerpt = (s.excerpt ?? '').slice(0, 260).replace(/\s+/g, ' ').trim();
      const tierLabel = s.tier === 1 ? 'Tier 1 (Oficial/Fact-check)' : s.tier === 3 ? 'Tier 3 (Social)' : 'Tier 2 (Presă)';
      return `[${i + 1}] ${s.publisher} [${tierLabel}] — Titlu: "${s.title}" — Poziție estimată: ${stance}${excerpt ? ` — Extras: "${excerpt}"` : ''}`;
    })
    .join('\n');

  const prompt = `Ești cercetător senior de fact-checking și analist de dezinformare la Verifact.
Misiunea ta este să generezi un DOSAR COMPLET DE INTELIGENȚĂ FACT-CHECKING (Pro Intelligence Dossier) extrem de detaliat, precis și riguros, pe baza datelor reale de mai jos.

AFIRMAȚIA VERIFICATĂ: "${claim}"
VERDICT: ${verdictWord} (scor calculat ${report.score}/100, încredere ${report.confidenceLevel})
${commentary ? `COMENTARIUL CELUI CARE A DISTRIBUIT (interpretare separată): "${commentary}"` : ''}

SURSE IDENTIFICATE ȘI VERIFICATE:
${sourceLines}

Răspunde EXCLUSIV cu un obiect JSON valid, redactat în limba ${lang}:
{
  "verdictRationale": "2-3 fraze clare, percutante și obiective care explică fundamentul factual al verdictului.",
  "whatToRemember": [
    "3-5 puncte esențiale, concise, de reținut pentru public"
  ],
  "crossSourceAnalysis": {
    "agreements": "Unde converg sursele verificate și ce fapte sunt confirmate unanim.",
    "contradictions": "Unde diferă relatările, cifrele, nuanțele sau interpretările între surse (sau '' dacă relatările sunt perfect convergente).",
    "consensusLevel": "unanimous" | "strong" | "mixed" | "conflicting",
    "comparisonMatrix": [
      {
        "sourceName": "Numele publicației/instituției",
        "sourceType": "fact_check" | "official" | "news" | "social",
        "tier": 1 | 2 | 3,
        "stance": "confirms" | "contradicts" | "context",
        "keyPoint": "Punctul cheie relatat de această sursă"
      }
    ]
  },
  "subClaims": [
    {
      "subClaim": "prima sub-componentă factuală din afirmație",
      "verdict": "true" | "false" | "partial" | "unverified",
      "explanation": "Explicație clară bazată pe surse",
      "evidenceSourceIndexes": [1, 2]
    }
  ],
  "sourceInsights": [
    {
      "index": 1,
      "publisher": "Numele sursei",
      "takeaway": "Ce demonstrează exact această sursă în raport cu afirmația (1-2 rânduri)",
      "stance": "confirmă" | "contrazice" | "context",
      "credibilityNote": "Scurtă notă despre autoritatea/fiabilitatea sursei în acest domeniu",
      "directQuote": "Citatul sau pasajul cel mai relevant din sursă"
    }
  ],
  "manipulationAnalysis": {
    "detected": true | false,
    "summary": "Rezumatul tehnicilor de manipulare / distorsionare aplicate",
    "techniques": [
      {
        "name": "Nume tehnică (ex. Scoatere din context, Titlu senzaționalist, Falsă atribuire, Apel la frică)",
        "category": "framing" | "fabrication" | "context_omission" | "emotional_appeal" | "logical_fallacy" | "other",
        "description": "Ce înseamnă tehnica",
        "manifestationInClaim": "Cum anume se manifestă în această afirmație sau în modul de distribuire"
      }
    ]
  },
  "narrativeAndImpact": {
    "originAndPropagation": "De unde a pornit narațiunea și cum s-a propagat în mediul online",
    "motiveAssessment": "Evaluare neutră a motivației probabile (senzaționalism/clickbait, manipulare politică, eroare factuală)",
    "publicImpact": "Impactul estimat asupra opiniei publice sau riscul de confuzie creat"
  },
  "investigatorToolkit": {
    "missingEvidence": [
      "ce documente, date primare sau confirmări lipsesc pentru o certitudine absolută"
    ],
    "foiaRecommendations": [
      "recomandări de solicitări oficiale de informații publice (ex. Legea 544/2001 sau instituții vizate)"
    ],
    "journalistFaq": [
      {
        "question": "Întrebare esențială de investigație",
        "answer": "Răspuns concis și factual"
      }
    ]
  },
  "commentaryAssessment": "${commentary ? 'Evaluarea comentariului celui care a distribuit conținutul' : ''}",
  "deepReasoning": "Analiză de profunzime de 2-3 paragrafe privind mecanismul întregului caz și contextul extins."
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
            'X-Title': 'Verifact Pro Report Synthesis',
          },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        }),
        { label: 'Pro report synthesis' }
      ).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
      })
    );

    const raw = data.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]) as Partial<ProReportSynthesis> & {
      crossSourceAnalysis?: Partial<CrossSourceAnalysis>;
      manipulationAnalysis?: Partial<ManipulationAnalysis>;
      narrativeAndImpact?: Partial<NarrativeAndImpact>;
      investigatorToolkit?: Partial<InvestigatorToolkit>;
    };

    const crossSource = parsed.crossSourceAnalysis;
    const comparisonMatrix: SourceComparisonEntry[] =
      Array.isArray(crossSource?.comparisonMatrix) && crossSource.comparisonMatrix.length > 0
        ? crossSource.comparisonMatrix.map((m, idx) => ({
            sourceName: str(m.sourceName) || sources[idx]?.publisher || `Sursă #${idx + 1}`,
            sourceType: m.sourceType || sources[idx]?.sourceType || 'news',
            tier: m.tier || sources[idx]?.tier || 2,
            stance: m.stance || (sources[idx]?.supports === true ? 'confirms' : sources[idx]?.supports === false ? 'contradicts' : 'context'),
            keyPoint: str(m.keyPoint) || str(sources[idx]?.excerpt || sources[idx]?.title || ''),
            url: sources[idx]?.url,
          }))
        : fallback.crossSourceAnalysis.comparisonMatrix;

    const crossSourceAnalysis: CrossSourceAnalysis = {
      agreements: str(crossSource?.agreements) || fallback.crossSourceAnalysis.agreements,
      contradictions: str(crossSource?.contradictions) || fallback.crossSourceAnalysis.contradictions,
      consensusLevel: crossSource?.consensusLevel || fallback.crossSourceAnalysis.consensusLevel,
      comparisonMatrix,
    };

    const narrative = parsed.narrativeAndImpact;
    const narrativeAndImpact: NarrativeAndImpact = {
      originAndPropagation: str(narrative?.originAndPropagation) || fallback.narrativeAndImpact.originAndPropagation,
      motiveAssessment: str(narrative?.motiveAssessment) || fallback.narrativeAndImpact.motiveAssessment,
      publicImpact: str(narrative?.publicImpact) || fallback.narrativeAndImpact.publicImpact,
    };

    const toolkit = parsed.investigatorToolkit;
    const investigatorToolkit: InvestigatorToolkit = {
      missingEvidence:
        strArray(toolkit?.missingEvidence, 4).length > 0
          ? strArray(toolkit?.missingEvidence, 4)
          : fallback.investigatorToolkit.missingEvidence,
      foiaRecommendations:
        strArray(toolkit?.foiaRecommendations, 3).length > 0
          ? strArray(toolkit?.foiaRecommendations, 3)
          : fallback.investigatorToolkit.foiaRecommendations,
      journalistFaq:
        normalizeJournalistFaq(toolkit?.journalistFaq) || fallback.investigatorToolkit.journalistFaq,
    };

    return {
      verdictRationale: str(parsed.verdictRationale) || fallback.verdictRationale,
      whatToRemember:
        strArray(parsed.whatToRemember, 5).length > 0
          ? strArray(parsed.whatToRemember, 5)
          : fallback.whatToRemember,
      crossSourceAnalysis,
      subClaims: normalizeSubClaims(parsed.subClaims) || fallback.subClaims,
      sourceInsights: normalizeSourceInsights(parsed.sourceInsights, sources) || fallback.sourceInsights,
      manipulationAnalysis: normalizeManipulation(parsed.manipulationAnalysis, isRo) || fallback.manipulationAnalysis,
      narrativeAndImpact,
      investigatorToolkit,
      commentaryAssessment: str(parsed.commentaryAssessment) || fallback.commentaryAssessment,
      deepReasoning: str(parsed.deepReasoning) || fallback.deepReasoning,
    };
  } catch (err) {
    logger.warn('Pro report synthesis failed, using intelligent fallback', {
      service: 'report-synthesis',
      error: String(err),
    });
    return fallback;
  }
}

/**
 * Builds the complete Pro synthesis instantly from computed report fields.
 */
export function synthesisFromReport(
  report: VerificationReport,
  locale: 'ro' | 'en' | 'fr'
): ProReportSynthesis {
  if (report.proSynthesis) {
    return report.proSynthesis;
  }
  const sources = (report.sources ?? []).slice(0, MAX_SOURCES);
  return buildFallbackSynthesis(report, sources, locale);
}

/**
 * Intelligent deterministic fallback synthesis generated directly from the 4 search layers,
 * scores, and extracted claim data.
 */
export function buildFallbackSynthesis(
  report: VerificationReport,
  sources: VerificationReport['sources'],
  locale: 'ro' | 'en' | 'fr'
): ProReportSynthesis {
  const isRo = locale === 'ro';
  const isFr = locale === 'fr';
  const claimText = report.verifiedClaim || report.claim || report.inputText || '';
  const score = report.score ?? 50;
  const isFalse = report.verdict === 'false';
  const isPartial = report.verdict === 'partial';
  const isTrue = report.verdict === 'true';

  // 1. Sub-claims construction
  const subClaims: SubClaimCheck[] = [
    {
      subClaim: claimText.length > 120 ? `${claimText.slice(0, 117)}...` : claimText,
      verdict: isTrue ? 'true' : isFalse ? 'false' : isPartial ? 'partial' : 'unverified',
      explanation:
        report.executiveSummary ||
        (isRo
          ? `Scorul de veridicitate calculat pe baza surselor verificate este de ${score}%.`
          : isFr
          ? `Le score de véracité calculé sur la base des sources vérifiées est de ${score}%.`
          : `Calculated veracity score based on verified sources is ${score}%.`),
      evidenceSourceIndexes: sources.slice(0, 3).map((_, i) => i + 1),
    },
  ];

  // 2. Cross-source comparison matrix
  const comparisonMatrix: SourceComparisonEntry[] = sources.map((s) => {
    const stance: SourceComparisonEntry['stance'] =
      s.supports === true ? 'confirms' : s.supports === false ? 'contradicts' : 'context';
    return {
      sourceName: s.publisher || (isRo ? 'Publicație' : isFr ? 'Média' : 'Publication'),
      sourceType: s.sourceType || 'news',
      tier: s.tier || 2,
      stance,
      keyPoint: s.excerpt ? s.excerpt.slice(0, 140) : s.title,
      url: s.url,
    };
  });

  const confirmingSources = sources.filter((s) => s.supports === true).length;
  const contradictingSources = sources.filter((s) => s.supports === false).length;

  let consensusLevel: CrossSourceAnalysis['consensusLevel'] = 'mixed';
  if (confirmingSources > 0 && contradictingSources === 0) consensusLevel = 'unanimous';
  else if (contradictingSources > 0 && confirmingSources === 0) consensusLevel = 'unanimous';
  else if (Math.abs(confirmingSources - contradictingSources) >= 2) consensusLevel = 'strong';
  else if (confirmingSources > 0 && contradictingSources > 0) consensusLevel = 'conflicting';

  const agreements = isRo
    ? confirmingSources > 0
      ? `Sursele de înaltă autoritate (${confirmingSources} surse) confirmă concordanța factuală a evenimentelor de bază.`
      : 'Datele factuale identificate în straturile de căutare converg spre respingerea afirmației.'
    : isFr
    ? confirmingSources > 0
      ? `Les sources de haute autorité (${confirmingSources} sources) confirment la concordance factuelle des faits essentiels.`
      : 'Les éléments factuels collectés convergent vers le rejet de l’affirmation.'
    : confirmingSources > 0
    ? `High-authority sources (${confirmingSources} sources) confirm factual consistency on base events.`
    : 'Evidence gathered across search layers converges towards rejecting the claim.';

  const contradictions =
    isFalse || isPartial
      ? isRo
        ? `Narațiunea din conținutul verificat contrazice probele directe din sursele oficiale și agențiile de presă (${contradictingSources} surse contrazic afirmația).`
        : isFr
        ? `Le récit analysé contredit les preuves directes émanant des sources officielles et des agences de presse (${contradictingSources} sources réfutent l’affirmation).`
        : `The narrative in the verified claim contradicts direct evidence from official sources and news outlets (${contradictingSources} sources contradict the claim).`
      : '';

  // 3. Source Insights
  const sourceInsights: SourceInsight[] = sources.map((s, i) => {
    const stance: SourceInsight['stance'] =
      s.supports === true
        ? (isRo ? 'confirmă' : isFr ? 'confirme' : 'confirms')
        : s.supports === false
        ? (isRo ? 'contrazice' : isFr ? 'contredit' : 'contradicts')
        : 'context';

    const credNote =
      s.tier === 1
        ? (isRo
            ? 'Sursă de autoritate maximă (instituție oficială sau fact-checker acreditat).'
            : isFr
            ? 'Source d’autorité maximale (institution officielle ou fact-checker certifié).'
            : 'High-authority source (official body or accredited fact-checker).')
        : s.tier === 3
        ? (isRo
            ? 'Conținut din mediul social sau declarație directă.'
            : isFr
            ? 'Contenu issu des réseaux sociaux ou déclaration publique directe.'
            : 'Social media content or direct public statement.')
        : (isRo
            ? 'Publicație din presa generală verificată.'
            : isFr
            ? 'Publication de presse généraliste de référence.'
            : 'Verified mainstream media outlet.');

    return {
      index: i + 1,
      publisher: s.publisher,
      sourceUrl: s.url,
      takeaway: s.excerpt ? s.excerpt.slice(0, 180) : s.title,
      stance,
      credibilityNote: credNote,
      directQuote: s.excerpt || undefined,
    };
  });

  // 4. Manipulation Analysis
  const techniques: ManipulationTechnique[] = [];
  if (isFalse || isPartial) {
    techniques.push({
      name: isRo
        ? 'Scoatere din context / Trunchiere'
        : isFr
        ? 'Déscontextualisation / Cadrage tronqué'
        : 'Out-of-Context Framing',
      category: 'context_omission',
      description: isRo
        ? 'Prezentarea unor elemente reale, dar fără circumstanțele esențiale care le explică sensul.'
        : isFr
        ? 'Présentation d’éléments factuels réels isolés de leur contexte indispensable.'
        : 'Presenting factual elements without the vital context that explains their meaning.',
      manifestationInClaim: isRo
        ? 'Afirmația omite detalii cheie verificate de sursele oficiale, generând o impresie eronată.'
        : isFr
        ? 'L’affirmation omet des précisions fondamentales étayées par les sources officielles.'
        : 'The claim omits key details verified by official sources, creating a misleading takeaway.',
    });

    if (report.posterCommentary) {
      techniques.push({
        name: isRo
          ? 'Interpretare speculativă'
          : isFr
          ? 'Interprétation spéculative'
          : 'Speculative Framing',
        category: 'framing',
        description: isRo
          ? 'Adăugarea unei concluzii forțate sau partizane peste un fapt neverificat.'
          : isFr
          ? 'Ajout d’une conclusion biaisée ou orientée sur des faits non confirmés.'
          : 'Adding a forced or biased conclusion over unverified data.',
        manifestationInClaim: isRo
          ? 'Comentariul adăugat încearcă să orienteze concluzia cititorului fără acoperire factuală.'
          : isFr
          ? 'Le commentaire accompagnateur tente d’influencer l’interprétation sans base factuelle.'
          : 'The added commentary seeks to steer the reader without evidence support.',
      });
    }
  }

  const manipulationAnalysis: ManipulationAnalysis = {
    detected: techniques.length > 0,
    summary:
      techniques.length > 0
        ? (isRo
            ? `Au fost detectate ${techniques.length} tipare de denaturare a contextului informațional.`
            : isFr
            ? `${techniques.length} schémas de distorsion du contexte ont été identifiés.`
            : `${techniques.length} contextual distortion patterns were detected.`)
        : (isRo
            ? 'Nu au fost identificate elemente evidente de manipulare retorică intenționată.'
            : isFr
            ? 'Aucun schéma manifeste de manipulation rhétorique intentionnelle n’a été détecté.'
            : 'No evident patterns of intentional manipulation were identified.'),
    techniques,
  };

  // 5. Narrative & Impact
  const narrativeAndImpact: NarrativeAndImpact = {
    originAndPropagation: isRo
      ? 'Afirmația a circulat pe rețelele sociale și platformele de știri, fiind amplificată prin distribuiri repetate.'
      : isFr
      ? 'L’affirmation a circulé sur les réseaux sociaux et dans les médias, amplifiée par des partages successifs.'
      : 'The claim circulated on social media and news platforms, gaining amplification through repeat shares.',
    motiveAssessment: isRo
      ? 'Distribuirea este frecvent stimulată de căutarea de audiență/clickuri sau de simplificarea excesivă a unor evenimente complexe.'
      : isFr
      ? 'La diffusion est souvent alimentée par la recherche d’audience, le sensationnalisme ou la simplification outrancière d’événements complexes.'
      : 'Sharing is often driven by clickbait/audience monetization or oversimplification of complex events.',
    publicImpact: isRo
      ? 'Risc de dezinformare și de creare a unei percepții distorsionate asupra realității factuale.'
      : isFr
      ? 'Risque de désinformation et d’altération de la perception publique de la réalité factuelle.'
      : 'Risk of misinformation and distorted public perception regarding factual events.',
  };

  // 6. Investigator Toolkit
  const investigatorToolkit: InvestigatorToolkit = {
    missingEvidence: [
      isRo
        ? 'Documente oficiale primare sau confirmări semnate de instituțiile abilitate.'
        : isFr
        ? 'Documents officiels primaires ou confirmations signées émanant des autorités compétentes.'
        : 'Primary official records or signed confirmations from designated bodies.',
      isRo
        ? 'Date statistice agregate independente care să confirme cifrele menționate.'
        : isFr
        ? 'Données statistiques agrégées indépendantes venant étayer les chiffres avancés.'
        : 'Independent aggregated statistical data verifying cited numbers.',
    ],
    foiaRecommendations: [
      isRo
        ? 'Solicitare formală în baza Legii 544/2001 către autoritatea publică responsabilă pentru accesul la date primare.'
        : isFr
        ? 'Demande formelle d’accès aux documents administratifs (CADA / FOIA) adressée aux autorités publiques compétentes.'
        : 'Formal Freedom of Information Act (FOIA) inquiry to the responsible public body for primary records.',
    ],
    journalistFaq: [
      {
        question: isRo
          ? 'Care este concluzia centrală a verificării?'
          : isFr
          ? 'Quelle est la conclusion centrale de cette vérification ?'
          : 'What is the core conclusion of this fact-check?',
        answer:
          report.executiveSummary ||
          (isRo
            ? `Afirmația a obținut un scor de ${score}% pe baza celor ${sources.length} surse analizate.`
            : isFr
            ? `L’affirmation obtient un score de ${score}% sur la base des ${sources.length} sources analysées.`
            : `The claim received a score of ${score}% based on ${sources.length} analyzed sources.`),
      },
      {
        question: isRo
          ? 'Ce nivel de încredere au dovezile?'
          : isFr
          ? 'Quel est le niveau de confiance accordé aux preuves ?'
          : 'What confidence level does the evidence carry?',
        answer: isRo
          ? `Nivelul de încredere este ${report.confidenceLevel.toUpperCase()}, evaluat prin ${report.scoreBreakdown?.availableLayers ?? 0} straturi de căutare independente.`
          : isFr
          ? `Le niveau de confiance est ${report.confidenceLevel.toUpperCase()}, évalué à travers ${report.scoreBreakdown?.availableLayers ?? 0} niveaux de recherche indépendants.`
          : `The confidence level is ${report.confidenceLevel.toUpperCase()}, evaluated across ${report.scoreBreakdown?.availableLayers ?? 0} independent search layers.`,
      },
    ],
  };

  return {
    verdictRationale:
      report.executiveSummary ||
      (isRo
        ? `Verdict stabilit pe baza corelării dovezilor din ${sources.length} surse citate.`
        : isFr
        ? `Verdict établi sur la base du recoupement des preuves issues des ${sources.length} sources citées.`
        : `Verdict established based on evidence correlation across ${sources.length} cited sources.`),
    whatToRemember:
      report.keyTakeaways && report.keyTakeaways.length > 0
        ? report.keyTakeaways.map(stripMarkdown).filter(Boolean)
        : [report.executiveSummary].filter(Boolean),
    crossSourceAnalysis: {
      agreements,
      contradictions,
      consensusLevel,
      comparisonMatrix,
    },
    subClaims,
    sourceInsights,
    manipulationAnalysis,
    narrativeAndImpact,
    investigatorToolkit,
    commentaryAssessment: report.posterCommentary
      ? isRo
        ? 'Comentariul adăugat constituie o interpretare personală nesusținută de datele factuale.'
        : isFr
        ? 'Le commentaire ajouté constitue une interprétation personnelle non étayée par les faits.'
        : 'The added commentary represents a personal interpretation unsupported by factual data.'
      : undefined,
    deepReasoning:
      (report.executiveSummary ? `${report.executiveSummary} ` : '') +
      (isRo
        ? 'Sistemul de analiză automată Verifact a verificat concordanța factuală prin interogarea bazelor partenere, separând faptele probate de speculațiile vehiculate în mediul digital.'
        : isFr
        ? 'Le système de vérification automatisé Verifact a confronté la concordance factuelle auprès de bases partenaires, distinguant les faits attestés des spéculations du web.'
        : 'Verifact automated verification system checked factual concordance across partner repositories, isolating proven facts from digital speculations.'),
  };
}
