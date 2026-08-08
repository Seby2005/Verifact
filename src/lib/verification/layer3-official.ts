import type { OfficialSource, Language, Layer3Result } from '@/types/verification';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import type { ExpandedQueries } from './query-expander';

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilySearchResponse {
  results?: TavilySearchResult[];
}

const OFFICIAL_DOMAINS = [
  'gov.ro',
  'mai.gov.ro',
  'ms.ro',
  'edu.ro',
  'mfinante.gov.ro',
  'mae.ro',
  'who.int',
  'europa.eu',
  'ec.europa.eu',
  'cdc.gov',
  'fda.gov',
  'un.org',
  'nato.int',
];

const KNOWN_ORGANIZATIONS: Record<string, { name: string; type: string }> = {
  'gov.ro': { name: 'Guvernul României', type: 'government' },
  'mai.gov.ro': { name: 'Ministerul Afacerilor Interne', type: 'government' },
  'ms.ro': { name: 'Ministerul Sănătății', type: 'government' },
  'edu.ro': { name: 'Ministerul Educației', type: 'government' },
  'mfinante.gov.ro': { name: 'Ministerul Finanțelor', type: 'government' },
  'mae.ro': { name: 'Ministerul Afacerilor Externe', type: 'government' },
  'who.int': { name: 'Organizația Mondială a Sănătății', type: 'health_org' },
  'europa.eu': { name: 'Uniunea Europeană', type: 'international_org' },
  'ec.europa.eu': { name: 'Comisia Europeană', type: 'international_org' },
  'cdc.gov': { name: 'Centers for Disease Control and Prevention', type: 'health_org' },
  'fda.gov': { name: 'Food and Drug Administration', type: 'regulator' },
  'un.org': { name: 'Organizația Națiunilor Unite', type: 'international_org' },
  'nato.int': { name: 'NATO', type: 'international_org' },
};

function identifyOrganization(urlStr: string): { name?: string; type?: string } {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.replace(/^www\./, '');

    for (const [domain, info] of Object.entries(KNOWN_ORGANIZATIONS)) {
      if (host.endsWith(domain)) {
        return { name: info.name, type: info.type };
      }
    }

    if (host.endsWith('.gov.ro') || host.endsWith('.gov')) {
      return { name: `Instituție guvernamentală (${host})`, type: 'government' };
    }
  } catch {
    /* Invalid URL */
  }

  return {};
}

function analyzeSupport(content: string): OfficialSource['supportsOrDenies'] {
  const text = content.toLowerCase();
  const denialSignals = ['fals', 'dezminte', 'infirma', 'nu este adevarat', 'fake', 'fake news', 'untrue', 'denies', 'refutes', 'fake news'];
  const supportSignals = ['confirma', 'adevarat', 'oficial', 'declara', 'confirms', 'authentic', 'verified'];

  const hasDenial = denialSignals.some((s) => text.includes(s));
  const hasSupport = supportSignals.some((s) => text.includes(s));

  if (hasDenial && !hasSupport) return 'denies';
  if (hasSupport && !hasDenial) return 'supports';
  return 'neutral';
}

async function fetchOfficialTavily(queryStr: string): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !queryStr.trim()) return [];

  try {
    const response = await withCircuitBreaker('tavily', () =>
      fetchWithRetry(
        'https://api.tavily.com/search',
        () => ({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            query: queryStr.slice(0, 300),
            search_depth: 'basic',
            max_results: 6,
            include_domains: OFFICIAL_DOMAINS,
          }),
          signal: AbortSignal.timeout(8000),
        }),
        { label: 'layer3-official' }
      ).then((res) => {
        if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
        return res;
      })
    );

    const data = (await response.json()) as TavilySearchResponse;
    return data.results ?? [];
  } catch {
    return [];
  }
}

export function calculateLayer3Score(sources: OfficialSource[]): number {
  if (sources.length === 0) return 0.5;

  let totalScore = 0;
  let count = 0;

  for (const s of sources) {
    if (s.supportsOrDenies === 'denies') {
      totalScore += 0.0;
      count++;
    } else if (s.supportsOrDenies === 'supports') {
      totalScore += 1.0;
      count++;
    } else {
      totalScore += 0.5;
      count++;
    }
  }

  return count > 0 ? totalScore / count : 0.5;
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
      summary: 'Official search provider not configured',
      layerScore: 0.5,
      processingTime: Date.now() - startTime,
      error: 'Official search provider not configured (TAVILY_API_KEY missing)',
    };
  }

  const roQuery = expandedQueries?.romanianQuery || text;
  const enQuery = expandedQueries?.englishQuery || text;

  const [roItems, enItems] = await Promise.all([
    fetchOfficialTavily(roQuery),
    fetchOfficialTavily(enQuery),
  ]);

  const seen = new Set<string>();
  const combined = [...roItems, ...enItems].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  const sources: OfficialSource[] = combined.map((item) => {
    const org = identifyOrganization(item.url);
    return {
      title: item.title,
      publisher: org.name || 'Instituție Oficială',
      organization: org.name,
      organizationType: org.type,
      documentUrl: item.url,
      publishedAt: item.published_date ?? '',
      relevantQuote: item.content?.slice(0, 400) ?? '',
      supportsOrDenies: analyzeSupport(item.content ?? ''),
    };
  });

  return {
    status: 'success',
    sources: sources.slice(0, 6),
    results: sources.slice(0, 6),
    summary: `${sources.length} official documents found`,
    layerScore: calculateLayer3Score(sources),
    processingTime: Date.now() - startTime,
  };
}
