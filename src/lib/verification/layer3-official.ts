import type { OfficialSource, Language, Layer3Result } from '@/types/verification';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import type { ExpandedQueries } from './query-expander';
import { runAcademicLayer } from './layer-academic';
import { searchGoogleNews, type RssNewsItem } from './news-rss';
import { lookupCitedLegislation } from './legislation-lookup';

/**
 * Institutional domains searched for primary documents, in the groups they are
 * queried in. Grouped rather than one list because the search engine caps a
 * query at ~32 words and every `site:` filter counts as one. A parent domain
 * covers its subdomains (gov.ro includes mfinante.gov.ro, mai.gov.ro, …).
 */
const OFFICIAL_SITES = {
  // Parliament and the legislative portal are here so a claim about a bill or
  // a law reaches the institutions that hold its text and its status.
  ro: ['gov.ro', 'presidency.ro', 'cdep.ro', 'senat.ro', 'just.ro', 'mae.ro', 'mapn.ro', 'ms.ro', 'edu.ro', 'bnr.ro', 'insse.ro'],
  international: ['europa.eu', 'who.int', 'nato.int', 'un.org', 'cdc.gov', 'fda.gov'],
  fr: ['gouv.fr', 'service-public.fr', 'insee.fr', 'santepubliquefrance.fr'],
} as const;

const KNOWN_ORGANIZATIONS: Record<string, { name: string; type: string }> = {
  'presidency.ro': { name: 'Administrația Prezidențială', type: 'government' },
  'gov.ro': { name: 'Guvernul României', type: 'government' },
  'mai.gov.ro': { name: 'Ministerul Afacerilor Interne', type: 'government' },
  'ms.ro': { name: 'Ministerul Sănătății', type: 'government' },
  'edu.ro': { name: 'Ministerul Educației', type: 'government' },
  'mfinante.gov.ro': { name: 'Ministerul Finanțelor', type: 'government' },
  'mae.ro': { name: 'Ministerul Afacerilor Externe', type: 'government' },
  'mapn.ro': { name: 'Ministerul Apărării Naționale', type: 'government' },
  'cdep.ro': { name: 'Camera Deputaților', type: 'government' },
  'senat.ro': { name: 'Senatul României', type: 'government' },
  'just.ro': { name: 'Ministerul Justiției', type: 'government' },
  'legislatie.just.ro': { name: 'Portalul Legislativ', type: 'government' },
  'bnr.ro': { name: 'Banca Națională a României', type: 'regulator' },
  'insse.ro': { name: 'Institutul Național de Statistică', type: 'government' },
  'service-public.fr': { name: 'Service-Public.fr', type: 'government' },
  'legifrance.gouv.fr': { name: 'Légifrance', type: 'government' },
  'gouvernement.fr': { name: 'Gouvernement Français', type: 'government' },
  'elysee.fr': { name: 'Présidence de la République', type: 'government' },
  'insee.fr': { name: 'INSEE', type: 'statistics' },
  'santepubliquefrance.fr': { name: 'Santé Publique France', type: 'health_org' },
  'interieur.gouv.fr': { name: 'Ministère de l’Intérieur', type: 'government' },
  'economie.gouv.fr': { name: 'Ministère de l’Économie', type: 'government' },
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

    // Most specific domain wins: mfinante.gov.ro is the Finance Ministry, not
    // "the Government" just because it also ends in gov.ro.
    const match = Object.entries(KNOWN_ORGANIZATIONS)
      .filter(([domain]) => host === domain || host.endsWith(`.${domain}`))
      .sort(([a], [b]) => b.length - a.length)[0];
    if (match) return { name: match[1].name, type: match[1].type };

    if (host.endsWith('.gov.ro') || host.endsWith('.gov') || host.endsWith('.gouv.fr')) {
      return { name: `Instituție guvernamentală (${host})`, type: 'government' };
    }
  } catch {
    /* Invalid URL */
  }

  return {};
}

function analyzeSupport(content: string): OfficialSource['supportsOrDenies'] {
  const text = content.toLowerCase();
  const denialSignals = [
    'fals', 'dezminte', 'infirma', 'nu este adevarat', 'fake', 'fake news', 'untrue', 'denies', 'refutes',
    'faux', 'fausse', 'démenti', 'dement', 'infirme', 'intox', 'mensonge', 'sans preuve'
  ];
  const supportSignals = [
    'confirma', 'adevarat', 'oficial', 'declara', 'confirms', 'authentic', 'verified',
    'confirme', 'vrai', 'authentique', 'officiel', 'avéré', 'exact', 'prouvé'
  ];

  const hasDenial = denialSignals.some((s) => text.includes(s));
  const hasSupport = supportSignals.some((s) => text.includes(s));

  if (hasDenial && !hasSupport) return 'denies';
  if (hasSupport && !hasDenial) return 'supports';
  return 'neutral';
}

/**
 * Documents published by the given institutions that match the query. Free
 * (Google News `site:` search), and best-effort like the other reference
 * sources in this layer: a failed search adds nothing rather than failing the
 * layer, since Wikipedia and the academic search still ran.
 */
async function fetchOfficial(
  query: string,
  language: 'ro' | 'en' | 'fr',
  sites: readonly string[]
): Promise<RssNewsItem[]> {
  try {
    return (await searchGoogleNews(query, language, sites)).slice(0, 6);
  } catch {
    return [];
  }
}

interface WikiSearchPage {
  id?: number;
  key?: string;
  title?: string;
  excerpt?: string;
  description?: string;
}

interface WikiSearchResponse {
  pages?: WikiSearchPage[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWikipedia(queryStr: string, lang: 'ro' | 'en' | 'fr'): Promise<OfficialSource[]> {
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
        title: p.title!,
        publisher: lang === 'ro' ? 'Wikipedia' : lang === 'fr' ? 'Wikipédia (FR)' : 'Wikipedia (EN)',
        organization: 'Wikipedia',
        organizationType: 'encyclopedia',
        documentUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.key!)}`,
        publishedAt: '',
        relevantQuote: stripHtml(p.excerpt ?? p.description ?? ''),
        supportsOrDenies: 'neutral',
      }));
  } catch {
    return [];
  }
}

/**
 * Share of the sources taking a side that support the claim (0.5 when none
 * do). Neutral sources abstain rather than voting 0.5 — see calculateLayer2Score.
 *
 * Wikipedia counts like any other source: it arrives neutral from search and
 * only gains a stance from the AI source filter, which reads what the excerpt
 * actually says about the claim. It used to be citation-only, which left the
 * score to the model's memory whenever press search was down.
 */
export function calculateLayer3Score(sources: OfficialSource[]): number {
  const withStance = sources.filter(
    (s) => s.supportsOrDenies === 'supports' || s.supportsOrDenies === 'denies'
  );
  if (withStance.length === 0) return 0.5;

  return withStance.filter((s) => s.supportsOrDenies === 'supports').length / withStance.length;
}

export async function runLayer3(
  text: string,
  _language: Language,
  expandedQueries?: ExpandedQueries
): Promise<Layer3Result> {
  const startTime = Date.now();

  const roQuery = expandedQueries?.romanianQuery || text;
  const enQuery = expandedQueries?.englishQuery || text;
  const officialQuery = expandedQueries?.officialAngle || roQuery;
  const isFrench = _language === 'fr';

  // Official search + Wikipedia grounding + Academic/Scientific Research search in parallel
  const [legislation, officialItems, enItems, wikiRo, wikiEn, wikiFr, academicItems] = await Promise.all([
    lookupCitedLegislation(text),
    isFrench
      ? fetchOfficial(text, 'fr', OFFICIAL_SITES.fr)
      : fetchOfficial(officialQuery, 'ro', OFFICIAL_SITES.ro),
    fetchOfficial(enQuery, 'en', OFFICIAL_SITES.international),
    fetchWikipedia(roQuery, 'ro'),
    fetchWikipedia(enQuery, 'en'),
    isFrench ? fetchWikipedia(text, 'fr') : Promise.resolve([]),
    runAcademicLayer(text),
  ]);

  const seen = new Set<string>();
  const officialSources: OfficialSource[] = [...officialItems, ...enItems]
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .map((item) => {
      const org = identifyOrganization(`https://${item.sourceDomain}`);
      return {
        title: item.title,
        publisher: org.name || item.sourceName || 'Instituție Oficială',
        organization: org.name,
        organizationType: org.type,
        // The link is a search-engine redirect; `url` keeps the institution's site.
        url: `https://${item.sourceDomain}`,
        documentUrl: item.url,
        publishedAt: item.publishedAt,
        relevantQuote: item.snippet.slice(0, 400),
        supportsOrDenies: analyzeSupport(item.snippet),
      };
    });

  const academicSources = academicItems.filter((s) => {
    const link = s.url || s.documentUrl || s.title;
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });

  const wikiSources = [...wikiRo, ...wikiEn, ...wikiFr].filter((s) => {
    if (!s.documentUrl || seen.has(s.documentUrl)) return false;
    seen.add(s.documentUrl);
    return true;
  });

  // The register entry for a bill or law the claim cites by number leads: it
  // is the primary document. Then official and academic sources, then Wikipedia.
  const sources = [...legislation, ...officialSources, ...academicSources, ...wikiSources];

  return {
    status: 'success',
    sources: sources.slice(0, 10),
    results: sources.slice(0, 10),
    summary: `${sources.length} official/academic/reference documents found`,
    layerScore: calculateLayer3Score(sources),
    processingTime: Date.now() - startTime,
  };
}
