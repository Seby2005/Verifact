import type { AIAnalysisContext, ScoreBreakdown } from '@/types/verification';

interface PromptData {
  inputText: string;
  factChecks: string;
  newsArticles: string;
  officialDocs: string;
  socialPosts: string;
  scoreBreakdown: ScoreBreakdown;
}

function buildRomanianPrompt(data: PromptData): string {
  return `Ești un analist de fact-checking pentru o platformă open-source românească.
Analizează afirmația de mai jos și sintetizează datele furnizate.

═══════════════════════════════════════════
REGULI STRICTE — RESPECTĂ-LE FĂRĂ EXCEPȚIE:
═══════════════════════════════════════════
1. NU inventa surse, URL-uri sau citări. Folosește EXCLUSIV datele furnizate mai jos.
2. NU lua poziții politice, nu favoriza niciun partid sau ideologie.
3. Folosește EXCLUSIV limbaj probabilistic: "sugerează", "indică", "este consistent cu",
   "datele disponibile arată", "conform surselor verificate".
4. NU face afirmații definitive de tipul "Aceasta este o știre falsă".
   Folosește: "Datele disponibile sugerează că afirmația este probabil incorectă."
5. Dacă datele sunt insuficiente sau contradictorii, spune EXPLICIT:
   "Pe baza datelor disponibile, nu se poate formula o concluzie certă."
6. NU menționa URL-uri în text (ele sunt afișate separat în interfață).
7. Răspunde EXCLUSIV în limba română.
8. Lungime maximă: 250 de cuvinte.

═══════════════════════════════════════════
AFIRMAȚIA DE VERIFICAT:
═══════════════════════════════════════════
<user_claim>
${data.inputText}
</user_claim>

═══════════════════════════════════════════
SCORUL CALCULAT ALGORITMIC:
═══════════════════════════════════════════
Scor final: ${data.scoreBreakdown.finalScore}/100
Straturi disponibile: ${data.scoreBreakdown.availableLayers}/4
L1 (Fact-check DB): ${data.scoreBreakdown.layer1Score}/100
L2 (Știri): ${data.scoreBreakdown.layer2Score}/100
L3 (Oficial): ${data.scoreBreakdown.layer3Score}/100
L4 (Social): ${data.scoreBreakdown.layer4Score}/100

═══════════════════════════════════════════
DATE DIN BAZE DE FACT-CHECKING:
═══════════════════════════════════════════
${data.factChecks}

═══════════════════════════════════════════
ARTICOLE JURNALISTICE GĂSITE:
═══════════════════════════════════════════
${data.newsArticles}

═══════════════════════════════════════════
SURSE GUVERNAMENTALE ȘI OFICIALE:
═══════════════════════════════════════════
${data.officialDocs}

═══════════════════════════════════════════
DECLARAȚII PUBLICE RELEVANTE:
═══════════════════════════════════════════
${data.socialPosts}

═══════════════════════════════════════════
STRUCTURA RĂSPUNSULUI TĂU (urmează exact):
═══════════════════════════════════════════

**Rezumat** (1-2 propoziții):
[Sinteză directă a concluziei, cu limbaj probabilistic]

**Analiză pe surse**:
[Ce confirmă sau infirmă afirmația, cu referire la sursele furnizate]

**Context important**:
[Nuanțe, informații lipsă, sau de ce afirmația poate induce în eroare chiar dacă e parțial adevărată]

**Concluzie**:
[Concluzie prudentă bazată exclusiv pe datele furnizate]`;
}

function buildEnglishPrompt(data: PromptData): string {
  return `You are a fact-checking analyst for an open-source platform.
Analyze the claim below and synthesize the provided data.

═══════════════════════════════════════════
STRICT RULES — FOLLOW WITHOUT EXCEPTION:
═══════════════════════════════════════════
1. DO NOT invent sources, URLs, or citations. Use EXCLUSIVELY the data provided below.
2. DO NOT take political positions or favor any party or ideology.
3. Use EXCLUSIVELY probabilistic language: "suggests", "indicates", "is consistent with",
   "available data shows", "according to verified sources".
4. DO NOT make definitive statements like "This is fake news".
   Use: "Available data suggests the claim is likely incorrect."
5. If data is insufficient or contradictory, state EXPLICITLY:
   "Based on available data, no definitive conclusion can be drawn."
6. DO NOT mention URLs in the text (they are displayed separately in the interface).
7. Respond EXCLUSIVELY in English.
8. Maximum length: 250 words.

═══════════════════════════════════════════
CLAIM TO VERIFY:
═══════════════════════════════════════════
<user_claim>
${data.inputText}
</user_claim>

═══════════════════════════════════════════
ALGORITHMIC SCORE:
═══════════════════════════════════════════
Final score: ${data.scoreBreakdown.finalScore}/100
Available layers: ${data.scoreBreakdown.availableLayers}/4
L1 (Fact-check DB): ${data.scoreBreakdown.layer1Score}/100
L2 (News): ${data.scoreBreakdown.layer2Score}/100
L3 (Official): ${data.scoreBreakdown.layer3Score}/100
L4 (Social): ${data.scoreBreakdown.layer4Score}/100

═══════════════════════════════════════════
FACT-CHECK DATABASE RESULTS:
═══════════════════════════════════════════
${data.factChecks}

═══════════════════════════════════════════
NEWS ARTICLES FOUND:
═══════════════════════════════════════════
${data.newsArticles}

═══════════════════════════════════════════
GOVERNMENT AND OFFICIAL SOURCES:
═══════════════════════════════════════════
${data.officialDocs}

═══════════════════════════════════════════
PUBLIC STATEMENTS:
═══════════════════════════════════════════
${data.socialPosts}

═══════════════════════════════════════════
YOUR RESPONSE STRUCTURE (follow exactly):
═══════════════════════════════════════════

**Summary** (1-2 sentences):
[Direct synthesis of conclusion, with probabilistic language]

**Source Analysis**:
[What confirms or denies the claim, referencing provided sources]

**Important Context**:
[Nuances, missing information, or why the claim may mislead even if partially true]

**Conclusion**:
[Cautious conclusion based exclusively on provided data]`;
}

/**
 * Builds the AI analysis prompt from the verification context.
 * Includes all layer results as structured context for Gemini.
 */
export function buildAnalysisPrompt(context: AIAnalysisContext): string {
  const inputText = context.inputText || context.claim || context.input?.text || '';
  const language = context.language;
  const { layer1, layer2, layer3, layer4 } = context.layers;
  const scoreBreakdown: ScoreBreakdown = context.scoreBreakdown || { finalScore: 0, availableLayers: 4, weights: { factCheck: 0.4, news: 0.3, official: 0.3 } };

  // Format layer 1 results
  const factChecks = (layer1.results || []).length > 0
    ? (layer1.results || [])
        .map(r => `- "${(r.claimReviewed || '').slice(0, 150)}" — ${r.rating} (${r.publisher})`)
        .join('\n')
    : language === 'ro'
      ? 'Niciun fact-check anterior găsit pentru această afirmație.'
      : 'No previous fact-checks found for this claim.';

  // Format layer 2 results
  const newsArticles = (layer2.results || []).length > 0
    ? (layer2.results || [])
        .map(a => `- [${(a.sentiment || 'neutral').toUpperCase()}] "${a.title}" — ${a.source}`)
        .join('\n')
    : language === 'ro'
      ? 'Niciun articol de știri relevant găsit.'
      : 'No relevant news articles found.';

  // Format layer 3 results
  const officialDocs = (layer3.results || []).length > 0
    ? (layer3.results || [])
        .map(o => `- ${o.organization || o.publisher || 'Oficial'}: "${(o.relevantQuote || o.snippet || '').slice(0, 200)}"`)
        .join('\n')
    : language === 'ro'
      ? 'Nicio sursă oficială găsită.'
      : 'No official sources found.';

  // Format layer 4 results
  const socialPosts = (layer4.results || []).length > 0
    ? (layer4.results || [])
        .map(p => `- ${p.author || 'User'}: "${(p.content || p.text || '').slice(0, 200)}"`)
        .join('\n')
    : language === 'ro'
      ? 'Nicio declarație publică relevantă găsită.'
      : 'No relevant public statements found.';

  const data: PromptData = {
    inputText,
    factChecks,
    newsArticles,
    officialDocs,
    socialPosts,
    scoreBreakdown,
  };

  return language === 'en'
    ? buildEnglishPrompt(data)
    : buildRomanianPrompt(data);
}
