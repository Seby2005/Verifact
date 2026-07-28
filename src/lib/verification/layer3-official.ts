import type { OfficialSource, Language, Layer3Result } from '@/types/verification';
import { OFFICIAL_DOMAINS } from './constants';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import {
  CONTRADICTION_KEYWORDS_RO,
  CONTRADICTION_KEYWORDS_EN,
  CONFIRMATION_KEYWORDS_RO,
  CONFIRMATION_KEYWORDS_EN,
  DEBUNK_MARKERS,
} from './constants';
import { isRelevantToClaim } from './relevance';
import { matchesAnyPhrase } from './keyword-match';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

/**
 * Domains this layer will accept as "official". Tavily restricts the search to
 * these server-side via include_domains, which replaces the domain filtering a
 * Google Programmable Search Engine would have done through its cx config.
 */
const INCLUDE_DOMAINS = [
  'gov.ro',
  'presidency.ro',
  'senat.ro',
  'cdep.ro',
  'ms.ro',
  'insse.ro',
  'anaf.ro',
  'bnr.ro',
  'politiaromana.ro',
  'europa.eu',
  'ec.europa.eu',
  'europarl.europa.eu',
  'consilium.europa.eu',
  'who.int',
  'un.org',
  'worldbank.org',
  'imf.org',
  'oecd.org',
  'ecdc.europa.eu',
  'ema.europa.eu',
  'cdc.gov',
  'nih.gov',
  'nasa.gov',
];

/**
 * Extracts the root domain from a URL.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Maps a domain to an organization name.
 */
function extractOrganization(url: string): string {
  const domain = extractDomain(url);

  // Check exact match
  if (domain in OFFICIAL_DOMAINS) return OFFICIAL_DOMAINS[domain].name;

  // Check parent domain
  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (parent in OFFICIAL_DOMAINS) return OFFICIAL_DOMAINS[parent].name;
  }

  // Extract from TLD pattern
  if (domain.endsWith('.gov.ro')) return `Instituție Guvernamentală (${domain})`;
  if (domain.endsWith('.europa.eu')) return `Instituție Europeană (${domain})`;

  return domain;
}

/**
 * Classifies an official organization by type.
 */
function classifyOrganization(url: string): OfficialSource['organizationType'] {
  const domain = extractDomain(url);

  if (domain in OFFICIAL_DOMAINS) return OFFICIAL_DOMAINS[domain].type;

  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (parent in OFFICIAL_DOMAINS) return OFFICIAL_DOMAINS[parent].type;
  }

  if (domain.includes('stat') || domain.includes('inss') || domain.includes('census')) {
    return 'statistics';
  }
  if (domain.includes('health') || domain.includes('who') || domain.includes('sante')) {
    return 'health_org';
  }
  if (domain.endsWith('.gov.ro') || domain.endsWith('.gov') || domain.includes('government')) {
    return 'government';
  }

  return 'international_org';
}

/**
 * Reads which way a snippet points: does it back the claim, push against it,
 * or say nothing either way?
 *
 * Takes only the snippet — whether the document is about the claim at all is
 * isRelevantToClaim's job, and conflating the two is what this function used
 * to get wrong.
 */
function analyzeSupport(snippet: string): OfficialSource['supportsOrDenies'] {
  const snippetLower = snippet.toLowerCase();

  // Checked first and wins outright — see DEBUNK_MARKERS's doc comment in
  // constants.ts. This matters even more here than in layer2: "official"/
  // "oficial" is itself a CONFIRMATION_KEYWORDS_* entry, and this layer's
  // snippets come from official sources, where the word "official" shows up
  // constantly as incidental framing ("oficial dezmintit" = "officially
  // denied") rather than as a signal of support.
  if (matchesAnyPhrase(snippetLower, DEBUNK_MARKERS)) return 'denies';

  const allContradictions = [...CONTRADICTION_KEYWORDS_RO, ...CONTRADICTION_KEYWORDS_EN];
  const allConfirmations = [...CONFIRMATION_KEYWORDS_RO, ...CONFIRMATION_KEYWORDS_EN];

  const contradicts = matchesAnyPhrase(snippetLower, allContradictions);
  const confirms = matchesAnyPhrase(snippetLower, allConfirmations);

  if (contradicts && !confirms) return 'denies';
  if (confirms && !contradicts) return 'supports';

  // Word overlap used to be read as support here ("high content match =
  // probably supporting"), which confuses being *about* a topic with agreeing
  // about it. Asked whether "nicusor dan a murit astazi", the layer scored
  // 100/100 in favour on two government PDFs: a 2019 transport ministry
  // minute that happens to list an attendee named Nicușor Dan and, further
  // down, an unrelated taxi-licensing remark containing "a murit"; and a study
  // naming a programmer called Mihai Nicușor. Repeating a claim's words is
  // what a *relevant* document does — isRelevantToClaim already tests for
  // that — and says nothing about which way the document points.
  //
  // A document with no stance markers is neutral. That is the honest reading,
  // and it keeps the layer out of the score entirely rather than voting for
  // whichever claim happens to share its vocabulary.
  return 'neutral';
}

/**
 * Builds a more targeted search query for official sources.
 * Extracts key nouns, numbers, and removes filler words.
 */
function buildOfficialSearchQuery(text: string, language: Language): string {
  // Remove common filler words
  const FILLER_RO = ['este', 'sunt', 'că', 'și', 'care', 'pentru', 'din', 'cu', 'pe', 'la', 'în', 'de', 'a', 'au', 'o'];
  const FILLER_EN = ['is', 'are', 'was', 'were', 'the', 'a', 'an', 'and', 'or', 'that', 'which', 'for', 'in', 'on', 'at', 'to'];
  const filler = language === 'ro' ? FILLER_RO : FILLER_EN;

  const words = text
    .split(/\s+/)
    .filter(w => w.length > 3 && !filler.includes(w.toLowerCase()));

  // Prioritize: numbers (statistics), proper nouns (capitals), then other words
  const numbers = words.filter(w => /\d/.test(w));
  const properNouns = words.filter(w => /^[A-ZȘȚĂÎÂ]/.test(w));
  const otherWords = words.filter(w => !/^[A-ZȘȚĂÎÂ]/.test(w) && !/\d/.test(w));

  const query = [...numbers, ...properNouns, ...otherWords]
    .slice(0, 10)
    .join(' ')
    .slice(0, 128);

  return query || text.slice(0, 128);
}

/**
 * Calculates the layer 3 score based on official source content.
 */
export function calculateLayer3Score(sources: OfficialSource[]): number {
  if (sources.length === 0) return 0.5; // neutral when no official sources found

  let score = 0;
  for (const source of sources) {
    if (source.supportsOrDenies === 'supports') score += 1;
    else if (source.supportsOrDenies === 'denies') score += 0;
    else score += 0.5; // neutral
  }

  return score / sources.length;
}

/**
 * Layer 3: Government and official sources
 * Searches official domains (gov.ro, europa.eu, who.int, etc.) for relevant documents.
 */
export async function runLayer3(
  text: string,
  language: Language
): Promise<Layer3Result> {
  const startTime = Date.now();

  // Uses Tavily rather than Google Programmable Search: the Custom Search API
  // is blocked at the Google Cloud project level (HTTP 403) and the configured
  // GOOGLE_OFFICIAL_SEARCH_ENGINE_ID held an API key rather than a cx id, so
  // this layer never returned anything. Tavily restricts to official domains
  // server-side via include_domains, which is what the cx config was for.
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return {
      status: 'unavailable',
      results: [],
      layerScore: 0.5,
      processingTime: Date.now() - startTime,
      error: 'Official search provider not configured (TAVILY_API_KEY missing)',
    };
  }

  const searchQuery = buildOfficialSearchQuery(text, language);

  // Shared 'tavily' breaker name with layer2/layer4: it's the same external
  // account, so an outage discovered via one layer should stop the others
  // from independently re-discovering it too.
  const response = await withCircuitBreaker('tavily', () =>
    fetchWithRetry(
      'https://api.tavily.com/search',
      () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: searchQuery,
          max_results: 8,
          search_depth: 'basic',
          include_domains: INCLUDE_DOMAINS,
        }),
        signal: AbortSignal.timeout(8000),
      }),
      { label: 'layer3-official' }
    ).then((res) => {
      if (!res.ok) throw new Error(`Official Search API error: ${res.status} ${res.statusText}`);
      return res;
    })
  );

  const data = (await response.json()) as TavilyResponse;
  const items = data.results ?? [];

  // Tavily is asked for keyword matches restricted to INCLUDE_DOMAINS, so
  // everything it returns is an official source — but not necessarily an
  // official source about this claim. Without this filter every hit was
  // reported as evidence, which is how nih.gov COVID papers appeared under
  // unrelated claims. analyzeSupport() only labels support/deny/neutral; it
  // never judged whether the document was on topic at all.
  const relevantItems = items.filter(item =>
    isRelevantToClaim(text, `${item.title ?? ''} ${item.content ?? ''}`)
  );

  const sources: OfficialSource[] = relevantItems.map((item): OfficialSource => ({
    title: item.title,
    organization: extractOrganization(item.url),
    organizationType: classifyOrganization(item.url),
    documentUrl: item.url,
    publishedAt: item.published_date ?? '',
    relevantQuote: item.content?.slice(0, 400) ?? '',
    supportsOrDenies: analyzeSupport(item.content ?? ''),
  }));

  return {
    status: 'success',
    sources: sources.slice(0, 6),
    results: sources.slice(0, 6),
    summary: `${sources.length} official documents found`,
    layerScore: calculateLayer3Score(sources),
    processingTime: Date.now() - startTime,
  };
}
