import type { FactCheckResult, Language, Layer1Result } from '@/types/verification';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';

// ─── Internal Google API types ────────────────────────────────

interface GoogleFactCheckResponse {
  claims?: GoogleClaim[];
  nextPageToken?: string;
}

interface GoogleClaim {
  text: string;
  claimant?: string;
  claimDate?: string;
  claimReview?: Array<{
    publisher?: { name?: string; site?: string };
    url?: string;
    title?: string;
    reviewDate?: string;
    textualRating?: string;
    languageCode?: string;
  }>;
}

// ─── Rating normalization map ─────────────────────────────────

/**
 * Maps diverse rating strings from various fact-checkers to a 0-1 scale.
 * 0 = definitively false, 1 = definitively true, 0.5 = mixed/unclear.
 */
const RATING_MAP: Record<string, number> = {
  // Definitely false (0-0.1)
  'false': 0.0,
  'fals': 0.0,
  'fals.': 0.0,
  'incorrect': 0.05,
  'incorect': 0.05,
  'wrong': 0.05,
  'fake': 0.05,
  'fabricated': 0.05,
  'fabricat': 0.05,
  'pants on fire': 0.0,
  'four pinocchios': 0.0,
  'false.': 0.0,
  'eroare': 0.05,
  'error': 0.05,
  'hoax': 0.0,
  'not true': 0.05,
  'nu este adevarat': 0.05,
  'nu este adevărat': 0.05,
  'dezinformare': 0.05,
  'misinformation': 0.05,
  'disinformation': 0.0,

  // Mostly false (0.1-0.35)
  'mostly false': 0.2,
  'mostly incorrect': 0.2,
  'largely false': 0.15,
  'three pinocchios': 0.2,
  'barely true': 0.25,
  'in mare parte fals': 0.2,
  'în mare parte fals': 0.2,
  'exaggerated': 0.25,
  'exagerat': 0.25,

  // Mixed/unclear (0.4-0.6)
  'mixed': 0.5,
  'half true': 0.5,
  'half-true': 0.5,
  'partially true': 0.55,
  'partially false': 0.45,
  'partial': 0.5,
  'parțial': 0.5,
  'partially accurate': 0.55,
  'partly false': 0.4,
  'partly true': 0.6,
  'two pinocchios': 0.35,
  'one pinocchio': 0.4,
  'misleading': 0.35,
  'manipulator': 0.3,
  'neclar': 0.5,
  'unclear': 0.5,
  'unproven': 0.5,
  'unverified': 0.5,
  'parțial adevărat': 0.55,
  'partial adevarat': 0.55,
  'parțial fals': 0.4,
  'partial fals': 0.4,
  'context lipsă': 0.45,
  'context missing': 0.45,

  // Mostly true (0.65-0.85)
  'mostly true': 0.8,
  'largely true': 0.8,
  'mostly accurate': 0.8,
  'în mare parte adevărat': 0.8,
  'in mare parte adevarat': 0.8,

  // Definitely true (0.9-1.0)
  'true': 1.0,
  'adevărat': 1.0,
  'adevarat': 1.0,
  'correct': 0.95,
  'corect': 0.95,
  'accurate': 0.95,
  'confirmed': 0.95,
  'confirmat': 0.95,
  'verified': 0.95,
  'verificat': 0.95,
};

/**
 * Normalizes a textual rating (e.g., "False", "Mostly True") to a 0-1 numeric score.
 */
function normalizeRating(rating: string): number {
  const lower = rating.toLowerCase().trim();

  // Exact match
  if (lower in RATING_MAP) return RATING_MAP[lower];

  // Partial match — check if any key is contained in the rating string
  for (const [key, value] of Object.entries(RATING_MAP)) {
    if (lower.includes(key)) return value;
  }

  // Default: unknown rating = neutral
  return 0.5;
}

/**
 * Tokenizes text into words, removing stopwords for relevance calculation.
 */
function tokenize(text: string): Set<string> {
  const STOPWORDS_RO = new Set([
    'și', 'că', 'în', 'de', 'la', 'cu', 'pe', 'sau', 'nu', 'se', 'ce',
    'un', 'o', 'al', 'ai', 'ale', 'a', 'au', 'am', 'este', 'sunt', 'fi',
    'sa', 'să', 'i', 'ei', 'ea', 'el', 'eu', 'tu', 'ne', 'va', 'vor',
    'la', 'din', 'care', 'lui', 'pentru', 'mai', 'dar', 'dacă', 'prin',
  ]);

  const STOPWORDS_EN = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'not', 'this', 'that',
    'it', 'its', 'they', 'their', 'there', 'he', 'she', 'we', 'you',
  ]);

  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS_RO.has(w) && !STOPWORDS_EN.has(w))
  );
}

/**
 * Computes Jaccard similarity between two token sets.
 */
function calculateRelevance(claimText: string, inputText: string): number {
  const claimTokens = tokenize(claimText);
  const inputTokens = tokenize(inputText);

  if (claimTokens.size === 0 || inputTokens.size === 0) return 0;

  const claimArr = Array.from(claimTokens);
  const inputArr = Array.from(inputTokens);

  const intersection = claimArr.filter(t => inputTokens.has(t));
  const union = new Set([...claimArr, ...inputArr]);

  return intersection.length / union.size;
}

/**
 * Deduplicates fact-check results by review URL.
 */
function deduplicateByUrl(results: FactCheckResult[]): FactCheckResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    if (!r.reviewUrl || seen.has(r.reviewUrl)) return false;
    seen.add(r.reviewUrl);
    return true;
  });
}

/**
 * Fetches fact-check results from Google Fact Check Tools API.
 */
/**
 * Romanian stopwords stripped before querying. The Fact Check API matches on
 * keywords, so a full sentence scores far worse than its content words.
 */
const RO_STOPWORDS = new Set([
  'este', 'sunt', 'a', 'al', 'ale', 'au', 'că', 'ca', 'și', 'si', 'care', 'pentru',
  'din', 'cu', 'pe', 'la', 'în', 'in', 'de', 'o', 'un', 'una', 'unei', 'unui',
  'lui', 'nu', 'se', 'mai', 'fi', 'fost', 'către', 'catre', 'prin', 'dintre',
  'rândul', 'randul', 'anul', 'persoanelor', 'forma', 'cea', 'cel', 'toate',
]);

/**
 * Minimal RO→EN lexicon for the vocabulary that dominates fact-checked claims.
 *
 * Google's fact-check corpus is overwhelmingly English, and a Romanian query
 * returns zero results even with languageCode=en — the API matches on the query
 * string itself, not on a translation. Translating the whole claim would need
 * the AI model; this covers the recurring disinformation vocabulary cheaply and
 * deterministically, which is what actually drives recall here.
 */
const RO_EN_TERMS: Record<string, string> = {
  vaccin: 'vaccine', vaccinuri: 'vaccines', vaccinurile: 'vaccines', vaccinare: 'vaccination',
  arnm: 'mRNA', adn: 'DNA', adnul: 'DNA', gene: 'gene', genom: 'genome',
  virus: 'virus', virusul: 'virus', gripa: 'flu', gripă: 'flu',
  pandemie: 'pandemic', coronavirus: 'coronavirus',
  pământ: 'earth', pamant: 'earth', pământul: 'earth', pamantul: 'earth', plat: 'flat',
  satelit: 'satellite', satelitii: 'satellites', spațiale: 'space', spatiale: 'space',
  climă: 'climate', clima: 'climate', climatică: 'climate', incalzire: 'warming', încălzire: 'warming',
  nucleară: 'nuclear', nucleara: 'nuclear', energie: 'energy', energia: 'energy',
  rețelele: 'networks', retelele: 'networks', radiații: 'radiation', radiatii: 'radiation',
  cancer: 'cancer', autism: 'autism', microcip: 'microchip', microcipuri: 'microchips',
  alegeri: 'election', alegerile: 'election', fraudă: 'fraud', frauda: 'fraud',
  imigranți: 'immigrants', imigranti: 'immigrants', război: 'war', razboi: 'war',
  modifică: 'alter', modifica: 'alter', răspândesc: 'spread', raspandesc: 'spread',
  provoacă: 'cause', provoaca: 'cause', cauzează: 'cause', cauzeaza: 'cause',
};

/**
 * Reduces a claim to its content keywords, optionally mapping known Romanian
 * terms to their English equivalents for the English-corpus search.
 */
/** Romanian enclitic articles, stripped when looking a term up in the lexicon. */
const RO_SUFFIXES = ['ului', 'urile', 'elor', 'ilor', 'ul', 'le', 'ea', 'ii', 'i', 'a'];

function lookupTerm(word: string): string | undefined {
  if (RO_EN_TERMS[word]) return RO_EN_TERMS[word];
  for (const suffix of RO_SUFFIXES) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (RO_EN_TERMS[stem]) return RO_EN_TERMS[stem];
    }
  }
  return undefined;
}

/** Tokens that read the same in any language: numbers, 5G, COVID-19, ARN etc. */
function isInternational(word: string): boolean {
  return /\d/.test(word) || /^(covid|sars|5g|4g|nato|ue|eu|onu|oms|who|nasa|hiv|aids|pib|gdp)$/i.test(word);
}

export function buildFactCheckQuery(text: string, translate: boolean): string {
  // Split on anything that is not a letter or digit, so "ADN-ul" yields "adn".
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !RO_STOPWORDS.has(w));

  const terms: string[] = [];
  const seen = new Set<string>();
  const push = (w: string) => {
    if (w && !seen.has(w)) {
      seen.add(w);
      terms.push(w);
    }
  };

  if (translate) {
    // English corpus: emit only terms we can actually render in English.
    // Leaving Romanian words in dilutes the query and returns zero matches.
    for (const w of words) {
      const mapped = lookupTerm(w);
      if (mapped) push(mapped);
      else if (isInternational(w)) push(w);
    }
    // Too few recognisable terms to search the English corpus usefully.
    if (terms.length < 2) return '';
  } else {
    words.forEach(push);
  }

  return terms.slice(0, 8).join(' ').slice(0, 200);
}

async function fetchFactChecks(
  text: string,
  lang: string,
  translate: boolean
): Promise<FactCheckResult[]> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_FACT_CHECK_API_KEY is not configured');
  }

  // Keywords, not the raw sentence: the API keyword-matches, and a full
  // sentence reliably returned zero results.
  const query = buildFactCheckQuery(text, translate);
  if (!query) return [];

  const params = new URLSearchParams({
    key: apiKey,
    query,
    languageCode: lang,
    pageSize: '10',
  });

  const response = await withCircuitBreaker('google-fact-check', () =>
    fetchWithRetry(
      `https://factchecktools.googleapis.com/v1alpha1/claims:search?${params.toString()}`,
      () => ({ signal: AbortSignal.timeout(8000) }),
      { label: 'layer1-factcheck' }
    ).then((res) => {
      if (!res.ok) throw new Error(`Fact Check API error: ${res.status} ${res.statusText}`);
      return res;
    })
  );

  const data = await response.json() as GoogleFactCheckResponse;

  if (!data.claims?.length) return [];

  return data.claims.map((claim): FactCheckResult => ({
    claimReviewed: claim.text,
    rating: claim.claimReview?.[0]?.textualRating ?? 'Unknown',
    ratingValue: normalizeRating(claim.claimReview?.[0]?.textualRating ?? ''),
    publisher: claim.claimReview?.[0]?.publisher?.name ?? 'Unknown',
    publisherUrl: claim.claimReview?.[0]?.publisher?.site ?? '',
    reviewUrl: claim.claimReview?.[0]?.url ?? '',
    reviewDate: claim.claimReview?.[0]?.reviewDate ?? '',
    claimant: claim.claimant,
    // Relevance is measured against the query we actually sent, not the raw
    // input: for the English corpus the input is Romanian, so comparing the two
    // gave every match a relevance of 0 and the whole layer collapsed to a
    // neutral 0.5 even when every fact-check returned said "False".
    // The small floor reflects that the API already matched the claim to our
    // query — a returned result is never wholly irrelevant.
    relevanceScore: Math.max(calculateRelevance(claim.text, query), 0.2),
  }));
}

/**
 * Calculates the layer 1 score based on found fact-checks.
 *
 * Formula:
 *   - If no fact-checks found: 0.5 (neutral — absence of evidence is not evidence of falsity)
 *   - Otherwise: weighted average of ratingValue, weighted by relevanceScore
 */
export function calculateLayer1Score(results: FactCheckResult[]): number {
  if (results.length === 0) return 0.5;

  const totalRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0);
  if (totalRelevance === 0) return 0.5;

  const weightedScore = results.reduce(
    (sum, r) => sum + (r.ratingValue ?? 0) * r.relevanceScore,
    0
  );

  return weightedScore / totalRelevance;
}

/**
 * Layer 1: Google Fact Check Tools API
 * Searches existing human-verified fact-checks for similar claims.
 */
export async function runLayer1(
  text: string,
  language: Language
): Promise<Layer1Result> {
  const startTime = Date.now();

  // Primary search in the claim's own language — never translated: the text
  // is already in this language, so running it through the Romanian→English
  // lexicon (meant for the secondary search below) would strip everything
  // that isn't a recognised international token and starve the query. This
  // previously happened for every English-language claim: language === 'en'
  // was (wrongly) used as the signal to translate, so an English primary
  // search searched with an all-but-empty query almost every time.
  const primaryResults = await fetchFactChecks(text, language === 'unknown' ? 'ro' : language, false);

  // Secondary search against the English corpus, which is where most
  // fact-checks of internationally-circulating claims live. Only reached
  // for non-English input, so translation is correct here.
  let allResults = primaryResults;
  if (primaryResults.length < 3 && language !== 'en') {
    try {
      const enResults = await fetchFactChecks(text, 'en', true);
      allResults = [...primaryResults, ...enResults];
    } catch {
      // English search failed, continue with primary results only
    }
  }

  // Deduplicate by URL
  const unique = deduplicateByUrl(allResults);

  // Sort by relevance score descending
  unique.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const layerScore = calculateLayer1Score(unique);

  return {
    status: 'success', // success even with 0 results (absence != error)
    matches: unique.slice(0, 8),
    results: unique.slice(0, 8), // max 8 results
    summary: `${unique.length} fact-checks found`,
    layerScore,
    processingTime: Date.now() - startTime,
  };
}
