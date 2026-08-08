import type { OfficialSource, Language, Layer3Result } from '@/types/verification';
import { OFFICIAL_DOMAINS } from './constants';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { isRelevantToClaim } from './relevance';
import type { ExpandedQueries } from './query-expander';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function extractOrganization(url: string): string {
  const domain = extractDomain(url);
  if (domain in OFFICIAL_DOMAINS) return OFFICIAL_DOMAINS[domain].name;

  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (parent in OFFICIAL_DOMAINS) return OFFICIAL_DOMAINS[parent].name;
  }

  if (domain.endsWith('.gov.ro')) return `Instituție Guvernamentală (${domain})`;
  if (domain.endsWith('.europa.eu')) return `Instituție Europeană (${domain})`;

  return domain;
}

function classifyOrganization(url: string): OfficialSource['organizationType'] {
  const domain = extractDomain(url);
  if (domain in OFFICIAL_DOMAINS) return OFFICIAL_DOMAINS[domain].type;

  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (parent in OFFICIAL_DOMAINS) return OFFICIAL_DOMAINS[parent].type;
  }

  if (domain.endsWith('.gov.ro')) return 'government';
  if (domain.endsWith('.europa.eu')) return 'international';
  if (domain.endsWith('.gov')) return 'government';

  return 'other';
}

function analyzeSupport(content: string): OfficialSource['supportsOrDenies'] {
  const text = content.toLowerCase();

  const isDenial =
    text.includes('fals') ||
    text.includes('nu este adevarat') ||
    text.includes('nu este adevărat') ||
    text.includes('false') ||
    text.includes('misleading') ||
    text.includes('dezinformare') ||
    text.includes('fake') ||
    text.includes('infirmă') ||
    text.includes('infirma');

  const isSupport =
    text.includes('confirmat') ||
    text.includes('adevarat') ||
    text.includes('adevărat') ||
    text.includes('confirmed') ||
    text.includes('true') ||
    text.includes('susține') ||
    text.includes('sustine');

  if (isDenial && !isSupport) return 'denies';
  if (isSupport && !isDenial) return 'supports';
  return 'neutral';
}

export function calculateLayer3Score(sources: OfficialSource[]): number {
  if (sources.length === 0) return 0.5;

  let score = 0;
  for (const source of sources) {
    if (source.supportsOrDenies === 'supports') score += 1.0;
    else if (source.supportsOrDenies === 'denies') score += 0.0;
    else score += 0.5;
  }

  return score / sources.length;
}

async function searchOfficialTavily(query: string, apiKey: string): Promise<TavilyResult[]> {
  if (!query.trim()) return [];
  try {
    const response = await withCircuitBreaker('tavily', () =>
      fetchWithRetry(
        'https://api.tavily.com/search',
        () => ({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: query.slice(0, 300),
            max_results: 6,
            search_depth: 'basic',
            include_domains: INCLUDE_DOMAINS,
          }),
          signal: AbortSignal.timeout(8000),
        }),
        { label: 'layer3-official' }
      ).then((res) => {
        if (!res.ok) throw new Error(`Official Search API error: ${res.status}`);
        return res;
      })
    );

    const data = (await response.json()) as TavilyResponse;
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function runLayer3(
  text: string,
  _language: Language,
  expandedQueries?: ExpandedQueries
): Promise<Layer3Result> {
  const startTime = Date.now();
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

  const roQuery = expandedQueries?.romanianQuery || text;
  const enQuery = expandedQueries?.englishQuery || text;

  const [roItems, enItems] = await Promise.all([
    searchOfficialTavily(roQuery, apiKey),
    searchOfficialTavily(enQuery, apiKey),
  ]);

  const seen = new Set<string>();
  const items = [...roItems, ...enItems].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  const relevantItems = items.filter((item) =>
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
