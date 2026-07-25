import type { OfficialSource, Language, Layer3Result } from '@/types/verification';
import { OFFICIAL_DOMAINS } from './constants';
import {
  CONTRADICTION_KEYWORDS_RO,
  CONTRADICTION_KEYWORDS_EN,
  CONFIRMATION_KEYWORDS_RO,
  CONFIRMATION_KEYWORDS_EN,
} from './constants';

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
 * Analyzes whether a snippet supports or denies a claim.
 */
function analyzeSupport(
  snippet: string,
  inputText: string
): OfficialSource['supportsOrDenies'] {
  const snippetLower = snippet.toLowerCase();

  const allContradictions = [...CONTRADICTION_KEYWORDS_RO, ...CONTRADICTION_KEYWORDS_EN];
  const allConfirmations = [...CONFIRMATION_KEYWORDS_RO, ...CONFIRMATION_KEYWORDS_EN];

  const contradicts = allContradictions.some(kw => snippetLower.includes(kw));
  const confirms = allConfirmations.some(kw => snippetLower.includes(kw));

  if (contradicts && !confirms) return 'denies';
  if (confirms && !contradicts) return 'supports';

  // Additional check: does the snippet contain key claim words?
  const claimWords = inputText.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const matchRatio = claimWords.filter(w => snippetLower.includes(w)).length / Math.max(claimWords.length, 1);

  if (matchRatio > 0.5) return 'supports'; // High content match = probably supporting
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
function calculateLayer3Score(sources: OfficialSource[]): number {
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

  const response = await fetch('https://api.tavily.com/search', {
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
  });

  if (!response.ok) {
    throw new Error(`Official Search API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TavilyResponse;
  const items = data.results ?? [];

  const sources: OfficialSource[] = items.map((item): OfficialSource => ({
    title: item.title,
    organization: extractOrganization(item.url),
    organizationType: classifyOrganization(item.url),
    documentUrl: item.url,
    publishedAt: item.published_date ?? '',
    relevantQuote: item.content?.slice(0, 400) ?? '',
    supportsOrDenies: analyzeSupport(item.content ?? '', text),
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
