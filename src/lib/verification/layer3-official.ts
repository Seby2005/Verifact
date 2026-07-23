import type { OfficialSource, Language, Layer3Result } from '@/types/verification';
import { OFFICIAL_DOMAINS } from './constants';
import {
  CONTRADICTION_KEYWORDS_RO,
  CONTRADICTION_KEYWORDS_EN,
  CONFIRMATION_KEYWORDS_RO,
  CONFIRMATION_KEYWORDS_EN,
} from './constants';

interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  pagemap?: {
    metatags?: Array<Record<string, string>>;
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

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

  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_OFFICIAL_SEARCH_ENGINE_ID;

  if (!apiKey || !cx) {
    return {
      status: 'unavailable',
      results: [],
      layerScore: 0.5,
      processingTime: Date.now() - startTime,
      error: 'Official search engine not configured',
    };
  }

  const searchQuery = buildOfficialSearchQuery(text, language);

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: searchQuery,
    lr: language === 'ro' ? 'lang_ro' : 'lang_en',
    num: '8',
    dateRestrict: 'y5', // last 5 years
  });

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!response.ok) {
    throw new Error(`Official Search API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as GoogleSearchResponse;
  const items = data.items ?? [];

  const sources: OfficialSource[] = items.map((item): OfficialSource => ({
    title: item.title,
    organization: extractOrganization(item.link),
    organizationType: classifyOrganization(item.link),
    documentUrl: item.link,
    publishedAt:
      item.pagemap?.metatags?.[0]?.['article:published_time'] ??
      item.pagemap?.metatags?.[0]?.['og:updated_time'] ??
      '',
    relevantQuote: item.snippet,
    supportsOrDenies: analyzeSupport(item.snippet, text),
  }));

  return {
    status: 'success',
    results: sources.slice(0, 6),
    layerScore: calculateLayer3Score(sources),
    processingTime: Date.now() - startTime,
  };
}
