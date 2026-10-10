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
      : language === 'fr'
      ? 'Aucune vérification préalable trouvée pour cette affirmation.'
      : 'No previous fact-checks found for this claim.';

  // Format layer 2 results
  const newsArticles = ((layer2?.results as NewsArticle[]) || []).length > 0
    ? (layer2?.results || [])
        .map((a: NewsArticle) => `- [${(a.sentiment || 'neutral').toUpperCase()}] "${a.title}" — ${a.source}${a.snippet ? `: ${a.snippet.slice(0, 160)}` : ''}`)
        .join('\n')
    : language === 'ro'
      ? 'Niciun articol de știri relevant găsit.'
      : language === 'fr'
      ? 'Aucun article de presse pertinent trouvé.'
      : 'No relevant news articles found.';

  // Format layer 3 results
  const officialDocs = ((layer3?.results as OfficialSource[]) || []).length > 0
    ? (layer3?.results || [])
        .map((o: OfficialSource) => `- ${o.organization || o.publisher || 'Oficial'}: ${o.title} — "${(o.relevantQuote || o.snippet || '').slice(0, 360)}"`)
        .join('\n')
    : language === 'ro'
      ? 'Nicio sursă oficială găsită.'
      : language === 'fr'
      ? 'Aucune source officielle trouvée.'
      : 'No official sources found.';

  // Format layer 4 results
  const socialPosts = ((layer4?.results as SocialMediaPost[]) || []).length > 0
    ? (layer4?.results || [])
        .map((p: SocialMediaPost) => `- ${p.author || 'User'}: "${(p.content || p.text || '').slice(0, 200)}"`)
        .join('\n')
    : language === 'ro'
      ? 'Nicio declarație publică relevantă găsită.'
      : language === 'fr'
      ? 'Aucune déclaration publique pertinente trouvée.'
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
  if (language === 'fr') {
    return buildFrenchPrompt(data);
  }
  return buildEnglishPrompt(data);
}

function buildRomanianPrompt(data: PromptData): string {
  return `Ești un asistent de investigație factuală și gândire critică la Verifact.
MISIUNEA TA: Nu ești un arbitru suprem al adevărului și nu emiți etichete dogmatice. Rolul tău este să analizezi riguros dovezile culese, să identifici ce confirmă sursele primare, ce lipsește sau ce este scos din context, și să împuternicești cititorul să decidă pe baza probelor.

AFIRMAȚIA DE ANALIZAT:
"${data.inputText}"
${data.commentary ? `\nCOMENTARIUL CELUI CARE A DISTRIBUIT (opinia/concluzia lui personală — NU face parte din afirmația factuală):\n"${data.commentary}"\n` : ''}
DATE COLECTATE DIN STRATURILE DE CĂUTARE:

Stratul 1 (Baze de Fact-Checking existente):
${data.factChecks}

Stratul 2 (Presă și articole de știri):
${data.newsArticles}

Stratul 3 (Surse Oficiale - guverne, instituții, dicționare, baze academice):
${data.officialDocs}

Stratul 4 (Rețele Sociale și declarații publice):
${data.socialPosts}

Indice calculat al surselor: ${data.calculatedScore}% (din ${data.availableLayers} straturi cu date)
Data de azi: ${new Date().toISOString().slice(0, 10)}. Memoria ta se oprește înaintea acestei date: un eveniment datat înainte de azi este în trecut, nu „în viitor”, iar sursele de mai sus sunt reale și au prioritate față de cunoștințele tale din antrenament (cine conduce acum țara, legi, taxe noi).

PRINCIPII METODOLOGICE OBLIGATORII:
1. GÂNDIRE CRITICĂ, FĂRĂ DOGME:
   - Nu declara autoritar „Afirmația este falsă/adevărată”. Folosește formulări descriptive:
     * Dacă există dovezi convergente: „Confirmat de documente / surse multiple”
     * Dacă documentele contrazic afirmația: „Contrazis de sursele oficiale / presă”
     * Dacă există un sâmbure real dar scos din context: „Lipsit de context verificabil”
     * Dacă nu există nicio probă identificată: „Fără surse credibile identificate”
     * Dacă tema este o dispută de opinii: „Dezbatere deschisă / Opinii divergente”
   - Oferă o înclinație de plauzibilitate motivată (ex: „Înclinație spre Fals / Neverosimil din cauza absenței totale a oricăror dovezi oficiale sau relatări”).
2. SINTEZĂ ACTIVĂ, NU DOAR NUMĂRARE:
   - Examinează încrucișat sursele: verifică dacă mai multe publicații relatează independent un fapt real sau dacă avem de-a face cu raportare circulară (site-uri care doar reciclează un zvon sau o postare anonimă).
   - Detectează satira: dacă sursa provine dintr-o publicație satirică sau o parodie, explică acest lucru clar.
   - Plauzibilitate deductivă: dacă nu există un articol explicit de fact-checking, aplică deducția logică și instituțională (ex: Are instituția menționată asemenea atribuții legale? Ar fi fost posibil un asemenea eveniment fără reacția autorităților?).
3. SEPARAREA AFIRMAȚIEI DE COMENTARIU:
   ${data.commentary ? '- Evaluează distinct comentariul distribuitorului: arată dacă interpretarea sau concluzia adăugată peste fapt este susținută de date.' : ''}

STRUCTURA RAPORTULUI (scrie în text simplu, fără marcaje markdown de titlu ###):
- Statutul Dovezilor: 1-2 fraze condensate care descriu statutul probelor și înclinația de plauzibilitate.
- Examinarea Surselor și a Faptelor: Analiză aprofundată a documentelor găsite sau a absenței complete a urmelor verificabile.
- Context și Mecanism de Răspândire: Proveniența narațiunii, eventuale omisiuni intenționate sau raportare circulară.
- Întrebări pentru Gândire Critică: 2-3 întrebări reflective pe care cititorul să și le pună pentru a evalua singur tema, încheind cu mesajul: „Iată ce spun sursele, iată ce lipsește, decide tu pe baza dovezilor.”`;
}

function buildFrenchPrompt(data: PromptData): string {
  return `Vous êtes un analyste d’investigation et assistant d’esprit critique chez Verifact.
VOTRE MISSION : Vous n’êtes pas un arbitre suprême de la vérité imposant des verdicts dogmatiques. Votre rôle est d’analyser rigoureusement les données recueillies, d’identifier ce que confirment les sources primaires, ce qui fait défaut ou ce qui est décontextualisé, et de permettre au lecteur de forger son propre jugement.

AFFIRMATION À ANALYSER :
"${data.inputText}"
${data.commentary ? `\nCOMMENTAIRE DU DIFFUSEUR (son opinion ou interprétation — NE FAIT PAS partie de l’affirmation factuelle) :\n"${data.commentary}"\n` : ''}
DONNÉES COLLECTÉES PAR LES NIVEAUX DE RECHERCHE :

Niveau 1 (Bases de Fact-Checking certifiées) :
${data.factChecks}

Niveau 2 (Presse et médias d’information) :
${data.newsArticles}

Niveau 3 (Sources Officielles - institutions, registres, littérature scientifique) :
${data.officialDocs}

Niveau 4 (Réseaux Sociaux et déclarations publiques) :
${data.socialPosts}

Indice calculé des sources : ${data.calculatedScore}% (sur ${data.availableLayers} niveaux disponibles)
Date du jour : ${new Date().toISOString().slice(0, 10)}. Ta mémoire s’arrête avant cette date : un événement daté d’avant aujourd’hui appartient au passé, pas « au futur », et les sources ci-dessus sont réelles et priment sur tes connaissances d’entraînement (qui dirige le pays, nouvelles lois, taxes).

DIRECTIVES MÉTHODOLOGIQUES :
1. ESPRIT CRITIQUE ET OBJECTIVITÉ :
   - Évitez les formules péremptoires (« C’est faux »). Privilégiez les statuts descriptifs :
     * Confirmé par des sources multiples
     * Contredit par les faits documentés
     * Contexte vérifiable manquant
     * Aucune source crédible identifiée
     * Débat ouvert / Opinions divergentes
   - Indiquez une inclinaison de plausibilité motivée.
2. SYNTHÈSE APPROFONDIE DES PREUVES :
   - Recoupez les sources : détectez les reprises circulaires d’une même rumeur versus des enquêtes indépendantes.
   - Identifiez la satire ou les parodies prises au premier degré.
   - Raisonnement déductif : examinez la plausibilité institutionnelle même en l’absence de démenti explicite.
3. Évaluation séparée du commentaire du diffuseur si présent.

STRUCTURE DU RAPPORT (texte brut, sans titres markdown ###) :
- Statut des Preuves : 1-2 phrases résumant l’état des sources et l’inclinaison de plausibilité.
- Examen des Faits et des Sources : Analyse détaillée des preuves ou de leur absence.
- Contexte et Propagation : Origine, omissions éventuelles ou caisse de résonance.
- Clés de Réflexion Critique : 2-3 questions de discernement pour le lecteur, concluant par : « Voici ce que documentent les sources et ce qui fait défaut — examinez les preuves et jugez par vous-même. »`;
}

function buildEnglishPrompt(data: PromptData): string {
  return `You are an investigative research analyst and critical thinking companion at Verifact.
YOUR MISSION: You are not an infallible arbiter of truth delivering top-down dogmatic verdicts. Your role is to rigorously examine retrieved evidence, determine what primary documentation corroborates or contradicts, uncover missing context, and empower the reader to evaluate the facts for themselves.

CLAIM TO ANALYZE:
"${data.inputText}"
${data.commentary ? `\nTHE SHARER'S COMMENTARY (their personal take/conclusion — NOT part of the factual claim):\n"${data.commentary}"\n` : ''}
COLLECTED SEARCH EVIDENCE:

Layer 1 (Fact-Checking Databases):
${data.factChecks}

Layer 2 (News Media & Press):
${data.newsArticles}

Layer 3 (Official Records, Public Institutions & Academic Repositories):
${data.officialDocs}

Layer 4 (Social Media & Public Statements):
${data.socialPosts}

Calculated source index: ${data.calculatedScore}% (across ${data.availableLayers} layers with data)
Today is ${new Date().toISOString().slice(0, 10)}. Your memory stops before this date: an event dated before today is in the past, not "in the future", and the sources above are real and take precedence over your training knowledge (who leads the country now, new laws, taxes).

CORE METHODOLOGICAL PRINCIPLES:
1. CRITICAL THINKING OVER DOGMA:
   - Do not make authoritarian pronouncements ("This is false"). Use descriptive evidence statuses:
     * Corroborated by primary sources
     * Contradicted by documented facts
     * Missing verifiable context
     * No credible evidence found
     * Open debate / Divergent opinions
   - Provide a reasoned plausibility tilt (e.g., "Tilt toward Unverified due to complete absence of primary records or official documentation").
2. RIGOROUS SYNTHESIS & CROSS-EXAMINATION:
   - Cross-examine sources: distinguish independent corroboration from circular reporting (multiple outlets merely echoing a single unverified social post).
   - Detect satire / parody: note if the claim originated in a satirical publication or meme.
   - Deductive plausibility & jurisdiction: If no explicit debunk exists, evaluate logical and institutional plausibility (does the named entity have legal authority? Would such an event occur without official trail?).
3. SEPARATE CLAIM FROM COMMENTARY:
   ${data.commentary ? '- Separately assess whether the sharer’s added spin or conclusion is justified by the underlying facts.' : ''}

REPORT STRUCTURE (plain text, no markdown ### headers):
- Evidence Status: 1-2 condensed sentences stating current evidentiary status and plausibility tilt.
- Examination of Sources & Facts: Detailed cross-examination of findings or the notable absence of documentation.
- Context & Propagation: Provenance, potential omissions, satire, or circular amplification.
- Critical Thinking Inquiries: 2-3 reflective questions for the reader, ending with: "Here is what the evidence shows and what is missing — review the sources and decide for yourself."`;
}

/** Romanian label for the stance the AI source filter assigned, or '' when it took none. */
function stanceLabel(stance?: string): string {
  if (stance === 'supports' || stance === 'confirms') return ' · CONFIRMĂ';
  if (stance === 'denies' || stance === 'contradicts') return ' · INFIRMĂ';
  return '';
}

/** Compact, URL-free digest of what the search layers found, with each source's stance. */
function summariseEvidence(context: AIAnalysisContext): string {
  const lines: string[] = [];
  context.layers?.layer1?.results?.slice(0, 5).forEach((r) =>
    lines.push(`[fact-check] ${r.publisher}: "${r.claimReviewed}" — verdict: ${r.rating}`)
  );
  context.layers?.layer2?.results?.slice(0, 5).forEach((a) =>
    lines.push(`[presă${stanceLabel(a.sentiment)}] ${a.source}: ${a.title} — ${a.snippet?.slice(0, 180) ?? ''}`)
  );
  // Seven rather than five: register entries (a cited bill, the EU acts on the
  // subject) come first and would otherwise crowd out every other source.
  context.layers?.layer3?.results?.slice(0, 7).forEach((o) =>
    lines.push(
      // Longer than a press snippet: a register entry carries a bill's stage
      // and object, and cutting it at headline length loses the object.
      `[oficial${stanceLabel(o.supportsOrDenies)}] ${o.organization ?? o.publisher}: ${o.title} — ${(o.relevantQuote ?? o.snippet ?? '').slice(0, 360)}`
    )
  );
  context.layers?.layer4?.results?.slice(0, 3).forEach((p) =>
    lines.push(`[declarație] ${p.author}: ${(p.content ?? p.text ?? '').slice(0, 150)}`)
  );
  return lines.join('\n');
}

/**
 * The prompt for the structured veracity assessment that feeds the score. One
 * copy for every provider, so the rules cannot drift between them.
 *
 * The model's training ends before today, and left alone it "corrects" recent
 * facts from memory (it called the May 2025 presidential oath false because it
 * still believed Iohannis was president, dismissing the Wikipedia entries it was
 * shown as fictitious). Rule 7 therefore makes the retrieved sources outrank its
 * memory, and rule 8 keeps input that asserts nothing checkable at a neutral 50
 * instead of a confident verdict.
 */
export function buildAssessmentPrompt(context: AIAnalysisContext): string {
  const evidence = summariseEvidence(context);
  const claim = context.claim ?? context.inputText ?? '';
  const today = new Date().toISOString().slice(0, 10);

  return `Ești un analist critic și investigator de fact-checking la Verifact. Evaluează afirmația de mai jos:

AFIRMAȚIA:
<claim>
${claim}
</claim>

DOVEZI GĂSITE PRIN CĂUTARE (pot fi goale; CONFIRMĂ/INFIRMĂ = poziția sursei față de afirmație):
${evidence || '(nicio dovadă găsită prin căutare)'}

REGULI METODOLOGICE:
1. Examinează dovezile culese: detectează dacă este vorba de satiră/parodie (ex: Times New Roman, The Onion), raportare circulară (site-uri care doar reciclează o postare pe rețele sociale fără verificare) sau omisiune gravă de context.
2. Plauzibilitate deductivă: Dacă lipsesc articole explicite de demontare (debunk), aplică deducția logică și cunoștințele instituționale: Are instituția menționată atribuții? Există legi/hotărâri atestate? Un eveniment de această magnitudine ar fi putut avea loc fără nicio urmă oficială sau mediatică?
3. Dacă nu există nicio sursă primară sau dovadă pentru un zvon senzaționalist cu fapte concrete (cine, ce, când), alege evidenceStatus "unverified_no_sources", scor redus (15-30) și o înclinație clară spre neverosimil (nu claca într-un neutru 50 "insuficient").
4. Dacă tema este o dezbatere sau evaluare prospectivă, folosește "open_debate".
5. Nu lua poziții politice părtinitoare.
6. Citește direcția fiecărei surse: un articol care doar menționează un zvon pentru a-l demonta NU confirmă afirmația, iar un articol care relatează faptul ca atare NU o infirmă doar pentru că pomenește cuvinte ca „dezinformare” sau „precizări”. Judecă după ce susține sursa despre afirmație, nu după cuvinte-cheie.
7. DATA DE AZI este ${today}. Memoria ta se oprește înainte de această dată și NU cunoaște evenimentele recente: cine conduce acum țara, alegeri, guverne, legi, taxe. Dovezile de mai sus sunt reale și au fost extrase chiar acum; nu le numi niciodată fictive, greșite sau „din viitor”. Un eveniment datat înainte de ${today} este în trecut. Când dovezile confirmă afirmația, scorul trebuie să fie ridicat (80-100) chiar dacă memoria ta spune altceva. Infirmă doar pe baza unei dovezi de mai sus, a unei imposibilități evidente (fizică, logică) sau a unei farse cunoscute — niciodată doar pentru că nu știi faptul din antrenament.
8. Dacă textul NU conține o afirmație factuală verificabilă — o opinie sau judecată de valoare („cel mai bun”, „cel mai prost”), o predicție sau un zvon vag fără fapte concrete, text fără sens, doar nume de utilizator/hashtag-uri/elemente de interfață — întoarce score 50, verdict "insufficient" și evidenceStatus "missing_context" (sau "open_debate" pentru o dezbatere reală). Nu o declara falsă doar pentru că nu are surse. Regula 8 are prioritate față de regula 3.

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
}
