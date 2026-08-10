import type {
  AIAnalysisContext,
  ScoreBreakdown,
  FactCheckResult,
  NewsArticle,
  OfficialSource,
  SocialMediaPost,
} from '@/types/verification';

export interface PromptData {
  inputText: string;
  commentary?: string;
  factChecks: string;
  newsArticles: string;
  officialDocs: string;
  socialPosts: string;
  calculatedScore: number;
  availableLayers: number;
}

export function buildAnalysisPrompt(context: AIAnalysisContext): string {
  const inputText = context.inputText || context.claim || '';
  const language = context.language;
  const layers = context.layers || {};
  const layer1 = context.layer1 || layers.layer1;
  const layer2 = context.layer2 || layers.layer2;
  const layer3 = context.layer3 || layers.layer3;
  const layer4 = context.layer4 || layers.layer4;

  const scoreBreakdown: ScoreBreakdown = context.scoreBreakdown || {
    finalScore: 50,
    availableLayers: 4,
    weights: { factCheck: 0.4, news: 0.3, official: 0.3 },
  };

  // Format layer 1 results
  const factChecks = ((layer1?.results as FactCheckResult[]) || []).length > 0
    ? (layer1?.results || [])
        .map((r: FactCheckResult) => `- "${(r.claimReviewed || '').slice(0, 150)}" — ${r.rating} (${r.publisher})`)
        .join('\n')
    : language === 'ro'
      ? 'Niciun fact-check anterior găsit pentru această afirmație.'
      : 'No previous fact-checks found for this claim.';

  // Format layer 2 results
  const newsArticles = ((layer2?.results as NewsArticle[]) || []).length > 0
    ? (layer2?.results || [])
        .map((a: NewsArticle) => `- [${(a.sentiment || 'neutral').toUpperCase()}] "${a.title}" — ${a.source}`)
        .join('\n')
    : language === 'ro'
      ? 'Niciun articol de știri relevant găsit.'
      : 'No relevant news articles found.';

  // Format layer 3 results
  const officialDocs = ((layer3?.results as OfficialSource[]) || []).length > 0
    ? (layer3?.results || [])
        .map((o: OfficialSource) => `- ${o.organization || o.publisher || 'Oficial'}: "${(o.relevantQuote || o.snippet || '').slice(0, 200)}"`)
        .join('\n')
    : language === 'ro'
      ? 'Nicio sursă oficială găsită.'
      : 'No official sources found.';

  // Format layer 4 results
  const socialPosts = ((layer4?.results as SocialMediaPost[]) || []).length > 0
    ? (layer4?.results || [])
        .map((p: SocialMediaPost) => `- ${p.author || 'User'}: "${(p.content || p.text || '').slice(0, 200)}"`)
        .join('\n')
    : language === 'ro'
      ? 'Nicio declarație publică relevantă găsită.'
      : 'No relevant public statements found.';

  const data: PromptData = {
    inputText,
    commentary: context.commentary,
    factChecks,
    newsArticles,
    officialDocs,
    socialPosts,
    calculatedScore: scoreBreakdown.finalScore,
    availableLayers: scoreBreakdown.availableLayers,
  };

  if (language === 'ro') {
    return buildRomanianPrompt(data);
  }
  return buildEnglishPrompt(data);
}

function buildRomanianPrompt(data: PromptData): string {
  return `Ești un jurnalist de investigație și fact-checker expert la Verifact. Misiunea ta este să analizezi o afirmație pe baza datelor furnizate din 4 straturi de căutare (baze de fact-checking, presă, surse oficiale, rețele sociale) și să redactezi un raport clar, obiectiv și bine structurat.

AFIRMAȚIA DE VERIFICAT:
"${data.inputText}"
${data.commentary ? `\nCOMENTARIUL CELUI CARE A DISTRIBUIT (opinia/concluzia lui personală — NU face parte din afirmația factuală de mai sus):\n"${data.commentary}"\n` : ''}
DATE COLECTATE DIN STRATURILE DE CĂUTARE:

Stratul 1 (Baze de Fact-Checking existente):
${data.factChecks}

Stratul 2 (Presă și articole de știri):
${data.newsArticles}

Stratul 3 (Surse Oficiale - guverne, instituții, dicționare):
${data.officialDocs}

Stratul 4 (Rețele Sociale și declarații publice):
${data.socialPosts}

Scor calculat al surselor: ${data.calculatedScore}% (din ${data.availableLayers} straturi disponibile)

INSTRUCIUNI STRICTE:
1. redactează raportul în LIMBA ROMÂNĂ.
2. Structura raportului trebuie să conțină:
   - **Rezumat**: 1-2 propoziții condensate care oferă verdictul direct și motivul principal.
   - **Analiza Factuală**: Explicație detaliată a dovezilor găsite sau a lipsei acestora.
   - **Context**: De unde provine știrea/afirmația și cum s-a răspândit.
   - **Concluzie**: Sinteză finală despre veridicitate.
3. Fii neutru, obiectiv și folosește limbaj probabilistic când este cazul ("indică", "sugerează").
4. NU inventa surse sau citate care nu apar în datele de mai sus.${data.commentary ? `\n5. Verdictul se referă DOAR la afirmația factuală. Într-un paragraf scurt, evaluează SEPARAT comentariul celui care a distribuit: spune dacă interpretarea/concluzia lui este susținută de dovezi (de ex. afirmația de bază poate fi adevărată, dar concluzia trasă din ea poate fi falsă sau exagerată).` : ''}`;
}

function buildEnglishPrompt(data: PromptData): string {
  return `You are an expert investigative journalist and fact-checker at Verifact. Your mission is to analyze a claim based on data collected from 4 search layers and write a clear, objective report.

CLAIM TO VERIFY:
"${data.inputText}"
${data.commentary ? `\nTHE SHARER'S OWN COMMENTARY (their personal opinion/conclusion — NOT part of the factual claim above):\n"${data.commentary}"\n` : ''}
COLLECTED SEARCH EVIDENCE:

Layer 1 (Fact-Checking Databases):
${data.factChecks}

Layer 2 (News Media):
${data.newsArticles}

Layer 3 (Official Sources & Institutions):
${data.officialDocs}

Layer 4 (Social Media & Public Statements):
${data.socialPosts}

Calculated source score: ${data.calculatedScore}% (across ${data.availableLayers} available layers)

STRICT INSTRUCTIONS:
1. Write the report in ENGLISH.
2. Report Structure:
   - **Summary**: 1-2 condensed sentences giving the direct verdict and key reason.
   - **Factual Analysis**: Detailed evaluation of evidence found.
   - **Context**: Provenance and viral context of the claim.
   - **Conclusion**: Final synthesis.
3. Be neutral and objective.
4. DO NOT invent sources or citations.${data.commentary ? `\n5. The verdict concerns ONLY the factual claim. In a short paragraph, assess the sharer's commentary SEPARATELY: say whether their interpretation/conclusion is supported by the evidence (e.g. the underlying claim may be true, yet the conclusion drawn from it false or exaggerated).` : ''}`;
}
