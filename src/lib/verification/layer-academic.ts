import type { OfficialSource, Layer3Result, LayerStatus } from '@/types/verification';
import { logger } from '@/lib/utils/logger';

const ACADEMIC_TIMEOUT_MS = 4500;

const SCIENTIFIC_KEYWORDS = [
  'vaccin', 'cancer', 'tratament', 'studiu', 'cercetare', 'virus', 'dna', 'rna',
  'medicamente', 'studiu meidcal', 'terapie', 'spital', 'boala', 'infectie', 'bacterie',
  'studiu clinic', 'nature', 'lancet', 'pubmed', 'doctor', 'efect secundar', 'fda', 'ema',
  'vaccine', 'study', 'research', 'clinical', 'medical', 'disease', 'trial', 'therapy',
  'biology', 'genomics', 'physics', 'quantum', 'chemical', 'molecule', 'journal'
];

/**
 * Checks whether a claim has medical, health, biological or scientific context.
 */
export function isScientificOrMedicalClaim(claimText: string): boolean {
  const lower = claimText.toLowerCase();
  return SCIENTIFIC_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Searches Europe PMC API for open-access medical & scientific peer-reviewed papers.
 */
async function searchEuropePMC(query: string): Promise<OfficialSource[]> {
  try {
    const encoded = encodeURIComponent(`${query} AND (SRC:MED OR SRC:PMC)`);
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=4`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(ACADEMIC_TIMEOUT_MS),
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return [];
    const data = await res.json() as { resultList?: { result?: Array<Record<string, unknown>> } };
    const results = data.resultList?.result ?? [];

    return results.map((r): OfficialSource => {
      const title = String(r.title || 'Studiu științific Europe PMC').replace(/\.$/, '');
      const journal = String(r.journalTitle || r.publisher || 'Europe PMC Academic Repository');
      const doi = r.doi ? `https://doi.org/${String(r.doi)}` : undefined;
      const pmcid = r.pmcid ? `https://europepmc.org/article/PMC/${String(r.pmcid)}` : undefined;
      const articleUrl = pmcid || doi || `https://europepmc.org/search?query=${encodeURIComponent(title)}`;
      const snippet = String(r.abstractText || r.title || '').slice(0, 300);
      const pubDate = String(r.firstPublicationDate || r.pubYear || '');

      return {
        title: `[Cercetare Științifică] ${title}`,
        publisher: journal,
        organization: journal,
        organizationType: 'Academic / Medical Journal',
        url: articleUrl,
        documentUrl: articleUrl,
        publishedDate: pubDate,
        snippet: snippet.length > 0 ? snippet : undefined,
        relevantQuote: snippet.length > 0 ? snippet : undefined,
        relevanceScore: 0.92,
        supportsOrDenies: 'neutral'
      };
    });
  } catch (err) {
    logger.warn('Europe PMC academic search failed or timed out', { service: 'layer-academic', error: String(err) });
    return [];
  }
}

/**
 * Searches OpenAlex API for global scholarly works across all scientific domains.
 */
async function searchOpenAlex(query: string): Promise<OfficialSource[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://api.openalex.org/works?search=${encoded}&per_page=3`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(ACADEMIC_TIMEOUT_MS),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Verifact-FactCheck/1.0' }
    });

    if (!res.ok) return [];
    const data = await res.json() as { results?: Array<Record<string, unknown>> };
    const results = data.results ?? [];

    return results.map((r): OfficialSource => {
      const title = String(r.title || 'Publicație Academică OpenAlex');
      const doi = r.doi ? String(r.doi) : undefined;
      const primaryLoc = r.primary_location as Record<string, unknown> | undefined;
      const source = primaryLoc?.source as Record<string, unknown> | undefined;
      const venue = String(source?.display_name || 'Bază de date științifică');
      const articleUrl = doi || String(r.id || `https://openalex.org/works?search=${encoded}`);
      const pubYear = String(r.publication_year || '');

      return {
        title: `[Publicație Academică] ${title}`,
        publisher: venue,
        organization: venue,
        organizationType: 'Scholarly Database',
        url: articleUrl,
        documentUrl: articleUrl,
        publishedDate: pubYear,
        snippet: `Publicație științifică indexată în OpenAlex (${venue}, ${pubYear}).`,
        relevanceScore: 0.88,
        supportsOrDenies: 'neutral'
      };
    });
  } catch (err) {
    logger.warn('OpenAlex search failed or timed out', { service: 'layer-academic', error: String(err) });
    return [];
  }
}

/**
 * Runs the Academic & Scientific Layer when claims contain medical or scientific queries.
 */
export async function runAcademicLayer(claimText: string): Promise<OfficialSource[]> {
  if (!isScientificOrMedicalClaim(claimText)) {
    return [];
  }

  logger.info('Scientific/Medical claim detected — activating Academic Research Layer', { service: 'layer-academic', claim: claimText });

  const [pmcResults, alexResults] = await Promise.allSettled([
    searchEuropePMC(claimText),
    searchOpenAlex(claimText)
  ]);

  const pmc = pmcResults.status === 'fulfilled' ? pmcResults.value : [];
  const alex = alexResults.status === 'fulfilled' ? alexResults.value : [];

  const combined = [...pmc, ...alex];
  // Deduplicate by URL or title
  const seen = new Set<string>();
  return combined.filter((s) => {
    const key = (s.url || s.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}
