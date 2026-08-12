import type { OfficialSource, Language, Layer3Result } from '@/types/verification';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import type { ExpandedQueries } from './query-expander';
import { runAcademicLayer } from './layer-academic';

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
  'un.org': { name: 'Organizația Națiunilor Unește', type: 'international_org' },
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

interface WikiSearchResponse {
  pages?: Array<{ key: string; title: string; excerpt?: string; description?: string }>;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWikipedia(queryStr: string, lang: 'ro' | 'en'): Promise<OfficialSource[]> {
  const q = queryStr.trim();
  if (q.length < 3) return [];

  const url = `https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(
    q.slice(0, 120)
  )}&limit=3`;

  try {
    const response = await withCircuitBreaker('wikipedia', () =>
      fetchWithRetry(
        url,
        () => ({
          headers: { 'User-Agent': 'Verifact/1.0 (https://verifact.ro)' },
          signal: AbortSignal.timeout(6000),
        }),
        { label: 'layer3-wikipedia' }
      ).then((res) => {
        if (!res.ok) throw new Error(`Wikipedia error: ${res.status}`);
        return res;
      })
    );

    const data = (await response.json()) as WikiSearchResponse;
    if (!Array.isArray(data.pages)) return [];

    return data.pages
      .filter((p) => p.title && p.key)
      .map((p): OfficialSource => ({
        title: p.title,
        publisher: lang === 'ro' ? 'Wikipedia' : 'Wikipedia (EN)',
        organization: 'Wikipedia',
        organizationType: 'encyclopedia',
        documentUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.key)}`,
        publishedAt: '',
        relevantQuote: stripHtml(p.excerpt ?? p.description ?? ''),
        supportsOrDenies: 'neutral',
      }));
  } catch {
    return [];
  }
}

export function calculateLayer3Score(sources: OfficialSource[]): number {
  const scored = sources.filter((s) => s.organizationType !== 'encyclopedia');
  if (scored.length === 0) return 0.5;

  let totalScore = 0;
  let count = 0;

  for (const s of scored) {
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

  const roQuery = expandedQueries?.romanianQuery || text;
  const enQuery = expandedQueries?.englishQuery || text;

  // Official search + Wikipedia grounding + Academic/Scientific Research search in parallel
  const [roItems, enItems, wikiRo, wikiEn, academicItems] = await Promise.all([
    apiKey ? fetchOfficialTavily(roQuery) : Promise.resolve([]),
    apiKey ? fetchOfficialTavily(enQuery) : Promise.resolve([]),
    fetchWikipedia(roQuery, 'ro'),
    fetchWikipedia(enQuery, 'en'),
    runAcademicLayer(text),
  ]);

  const seen = new Set<string>();
  const officialSources: OfficialSource[] = [...roItems, ...enItems]
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .map((item) => {
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

  const academicSources = academicItems.filter((s) => {
    const link = s.url || s.documentUrl || s.title;
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });

  const wikiSources = [...wikiRo, ...wikiEn].filter((s) => {
    if (!s.documentUrl || seen.has(s.documentUrl)) return false;
    seen.add(s.documentUrl);
    return true;
  });

  // Official and Academic research sources lead; Wikipedia follows.
  const sources = [...officialSources, ...academicSources, ...wikiSources];

  if (sources.length === 0 && !apiKey) {
    return {
      status: 'unavailable',
      results: [],
      summary: 'Official search provider not configured',
      layerScore: 0.5,
      processingTime: Date.now() - startTime,
      error: 'Official search provider not configured (TAVILY_API_KEY missing)',
    };
  }

  return {
    status: 'success',
    sources: sources.slice(0, 10),
    results: sources.slice(0, 10),
    summary: `${sources.length} official/academic/reference documents found`,
    layerScore: calculateLayer3Score(sources),
    processingTime: Date.now() - startTime,
  };
}
