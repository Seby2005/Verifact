import type { OfficialSource } from '@/types/verification';
import { logger } from '@/lib/utils/logger';

const ACADEMIC_TIMEOUT_MS = 4500;
const RETRACTION_TIMEOUT_MS = 3500;

// Crossref & OpenAlex give better, more reliable service to callers that
// identify themselves ("polite pool"). No key required — just an email.
const POLITE_MAILTO = 'contact@verifact.ro';

const SCIENTIFIC_KEYWORDS = [
  'vaccin', 'cancer', 'tratament', 'studiu', 'cercetare', 'virus', 'dna', 'rna',
  'medicamente', 'studiu meidcal', 'terapie', 'spital', 'boala', 'infectie', 'bacterie',
  'studiu clinic', 'nature', 'lancet', 'pubmed', 'doctor', 'efect secundar', 'fda', 'ema',
  'vaccine', 'study', 'research', 'clinical', 'medical', 'disease', 'trial', 'therapy',
  'biology', 'genomics', 'physics', 'quantum', 'chemical', 'molecule', 'journal'
];

/** One academic result plus its DOI (if any), used for retraction checking. */
interface AcademicHit {
  source: OfficialSource;
  doi?: string;
}

/** Strips a DOI URL prefix down to the bare, lowercased DOI for comparison. */
function normalizeDoi(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
}

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
async function searchEuropePMC(query: string): Promise<AcademicHit[]> {
  try {
    const encoded = encodeURIComponent(`${query} AND (SRC:MED OR SRC:PMC)`);
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=4&email=${POLITE_MAILTO}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(ACADEMIC_TIMEOUT_MS),
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return [];
    const data = await res.json() as { resultList?: { result?: Array<Record<string, unknown>> } };
    const results = data.resultList?.result ?? [];

    return results.map((r): AcademicHit => {
      const title = String(r.title || 'Studiu științific Europe PMC').replace(/\.$/, '');
      const journal = String(r.journalTitle || r.publisher || 'Europe PMC Academic Repository');
      const rawDoi = r.doi ? String(r.doi) : undefined;
      const doiUrl = rawDoi ? `https://doi.org/${rawDoi}` : undefined;
      const pmcid = r.pmcid ? `https://europepmc.org/article/PMC/${String(r.pmcid)}` : undefined;
      const articleUrl = pmcid || doiUrl || `https://europepmc.org/search?query=${encodeURIComponent(title)}`;
      const snippet = String(r.abstractText || r.title || '').slice(0, 300);
      const pubDate = String(r.firstPublicationDate || r.pubYear || '');

      return {
        doi: rawDoi ? normalizeDoi(rawDoi) : undefined,
        source: {
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
        }
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
async function searchOpenAlex(query: string): Promise<AcademicHit[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://api.openalex.org/works?search=${encoded}&per_page=3&mailto=${POLITE_MAILTO}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(ACADEMIC_TIMEOUT_MS),
      headers: { 'Accept': 'application/json', 'User-Agent': `Verifact-FactCheck/1.0 (mailto:${POLITE_MAILTO})` }
    });

    if (!res.ok) return [];
    const data = await res.json() as { results?: Array<Record<string, unknown>> };
    const results = data.results ?? [];

    return results.map((r): AcademicHit => {
      const title = String(r.title || 'Publicație Academică OpenAlex');
      const rawDoi = r.doi ? String(r.doi) : undefined;
      const primaryLoc = r.primary_location as Record<string, unknown> | undefined;
      const source = primaryLoc?.source as Record<string, unknown> | undefined;
      const venue = String(source?.display_name || 'Bază de date științifică');
      const articleUrl = rawDoi || String(r.id || `https://openalex.org/works?search=${encoded}`);
      const pubYear = String(r.publication_year || '');

      return {
        doi: rawDoi ? normalizeDoi(rawDoi) : undefined,
        source: {
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
        }
      };
    });
  } catch (err) {
    logger.warn('OpenAlex search failed or timed out', { service: 'layer-academic', error: String(err) });
    return [];
  }
}

/**
 * Searches ClinicalTrials.gov (US NIH registry) for registered trials matching
 * the claim — authoritative for "is drug X being trialled for condition Y".
 * Keyless.
 */
async function searchClinicalTrials(query: string): Promise<AcademicHit[]> {
  try {
    const encoded = encodeURIComponent(query.slice(0, 200));
    const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encoded}&pageSize=3`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(ACADEMIC_TIMEOUT_MS),
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return [];
    const data = await res.json() as { studies?: Array<{ protocolSection?: Record<string, Record<string, unknown>> }> };
    const studies = data.studies ?? [];

    return studies.flatMap((study): AcademicHit[] => {
      const p = study.protocolSection;
      const ident = p?.identificationModule as Record<string, unknown> | undefined;
      const statusMod = p?.statusModule as Record<string, unknown> | undefined;
      const descMod = p?.descriptionModule as Record<string, unknown> | undefined;
      const nctId = ident?.nctId ? String(ident.nctId) : undefined;
      if (!nctId) return [];

      const title = String(ident?.briefTitle || ident?.officialTitle || 'Studiu clinic înregistrat');
      const status = String(statusMod?.overallStatus || '');
      const summary = String(descMod?.briefSummary || '').slice(0, 300);
      const startDate = (statusMod?.startDateStruct as Record<string, unknown> | undefined)?.date;

      return [{
        source: {
          title: `[Studiu clinic înregistrat] ${title}`,
          publisher: 'ClinicalTrials.gov (US NIH)',
          organization: 'ClinicalTrials.gov',
          organizationType: 'Clinical Trial Registry',
          url: `https://clinicaltrials.gov/study/${nctId}`,
          documentUrl: `https://clinicaltrials.gov/study/${nctId}`,
          publishedDate: startDate ? String(startDate) : '',
          snippet: `${status ? `Status: ${status}. ` : ''}${summary}`.trim() || undefined,
          relevanceScore: 0.8,
          supportsOrDenies: 'neutral'
        }
      }];
    });
  } catch (err) {
    logger.warn('ClinicalTrials.gov search failed or timed out', { service: 'layer-academic', error: String(err) });
    return [];
  }
}

/**
 * Searches the FDA's official drug labels (openFDA) for approved indications and
 * warnings — the regulator's own document, not self-reported adverse events.
 * The API key is optional: it only raises the rate limit.
 */
async function searchOpenFDA(query: string): Promise<AcademicHit[]> {
  try {
    // openFDA search is Lucene-like; a couple of salient terms keep it valid.
    const terms = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3);
    if (terms.length === 0) return [];

    const key = process.env.OPENFDA_API_KEY;
    const search = encodeURIComponent(terms.join('+'));
    const url = `https://api.fda.gov/drug/label.json?search=${search}&limit=1${key ? `&api_key=${key}` : ''}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(ACADEMIC_TIMEOUT_MS),
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return []; // 404 = no match; openFDA returns 404 for empty result sets
    const data = await res.json() as { results?: Array<Record<string, unknown>> };
    const results = data.results ?? [];

    return results.flatMap((r): AcademicHit[] => {
      const openfda = r.openfda as Record<string, unknown> | undefined;
      const brand = (openfda?.brand_name as string[] | undefined)?.[0];
      const generic = (openfda?.generic_name as string[] | undefined)?.[0];
      const name = brand || generic;
      if (!name) return [];

      const indications = (r.indications_and_usage as string[] | undefined)?.[0];
      const boxed = (r.boxed_warning as string[] | undefined)?.[0];
      const splSetId = (openfda?.spl_set_id as string[] | undefined)?.[0];
      const link = splSetId
        ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${splSetId}`
        : 'https://labels.fda.gov/';
      const snippet = (boxed || indications || '').replace(/\s+/g, ' ').slice(0, 300);

      return [{
        source: {
          title: `[Etichetă oficială FDA] ${name}${generic && generic !== name ? ` (${generic})` : ''}`,
          publisher: 'U.S. Food and Drug Administration (openFDA)',
          organization: 'FDA',
          organizationType: 'Drug Regulator',
          url: link,
          documentUrl: link,
          publishedDate: '',
          snippet: snippet.length > 0 ? snippet : undefined,
          relevanceScore: 0.85,
          supportsOrDenies: 'neutral'
        }
      }];
    });
  } catch (err) {
    logger.warn('openFDA drug label search failed or timed out', { service: 'layer-academic', error: String(err) });
    return [];
  }
}

/**
 * Given a set of DOIs, returns those that have been RETRACTED, per Crossref
 * (which now carries Retraction Watch data). A retracted study cited as evidence
 * is worse than no study — this is the single most important quality guard for
 * medical claims. Keyless.
 */
async function fetchRetractedDois(dois: string[]): Promise<Set<string>> {
  const unique = Array.from(new Set(dois.filter(Boolean)));
  if (unique.length === 0) return new Set();

  const checks = await Promise.allSettled(unique.map(async (doi) => {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${POLITE_MAILTO}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(RETRACTION_TIMEOUT_MS),
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json() as { message?: { 'updated-by'?: Array<{ type?: string }> } };
    const updatedBy = data.message?.['updated-by'] ?? [];
    const retracted = updatedBy.some((u) => String(u.type ?? '').toLowerCase().includes('retraction'));
    return retracted ? doi : null;
  }));

  const set = new Set<string>();
  for (const c of checks) {
    if (c.status === 'fulfilled' && c.value) set.add(c.value);
  }
  return set;
}

/**
 * Runs the Academic & Scientific Layer when claims contain medical or scientific
 * queries. Queries peer-reviewed literature (Europe PMC, OpenAlex), the clinical
 * trial registry (ClinicalTrials.gov) and the FDA drug label database (openFDA),
 * then flags any retracted papers via Crossref before returning.
 */
export async function runAcademicLayer(claimText: string): Promise<OfficialSource[]> {
  if (!isScientificOrMedicalClaim(claimText)) {
    return [];
  }

  logger.info('Scientific/Medical claim detected — activating Academic Research Layer', { service: 'layer-academic', claim: claimText });

  const settled = await Promise.allSettled([
    searchEuropePMC(claimText),
    searchOpenAlex(claimText),
    searchClinicalTrials(claimText),
    searchOpenFDA(claimText),
  ]);

  const hits = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // Flag retracted papers before returning them as "evidence".
  const retracted = await fetchRetractedDois(hits.map((h) => h.doi).filter((d): d is string => !!d));
  if (retracted.size > 0) {
    for (const hit of hits) {
      if (hit.doi && retracted.has(hit.doi)) {
        hit.source.title = `⚠️ STUDIU RETRAS — ${hit.source.title}`;
        hit.source.snippet = `[ATENȚIE: acest studiu a fost RETRACTAT din literatura științifică și nu mai constituie o dovadă validă] ${hit.source.snippet ?? ''}`.trim();
        hit.source.relevantQuote = hit.source.snippet;
        hit.source.relevanceScore = 0.4;
      }
    }
  }

  // Deduplicate by URL or title.
  const seen = new Set<string>();
  return hits
    .map((h) => h.source)
    .filter((s) => {
      const key = (s.url || s.title).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}
