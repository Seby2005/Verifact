import { logger } from '@/lib/utils/logger';

export type ExamplesLocale = 'ro' | 'en' | 'fr';

/**
 * A curated fact-check entry linking to a real verification from a recognised
 * fact-checking organisation. Used ONLY as an offline fallback when the live
 * Google Fact Check lookup returns nothing (no API key, network error, or an
 * empty result set). Each entry carries the claim text in all supported languages.
 *
 * Sources:
 *   🇷🇴 Factual.ro  — https://www.factual.ro
 *   🇷🇴 Veridica.ro — https://www.veridica.ro
 *   🇫🇷 AFP Factuel — https://factuel.afp.com
 *   🌍 Snopes.com   — https://www.snopes.com
 */
interface CuratedFactCheck {
  ro: string;
  en: string;
  fr: string;
}

const CURATED_FALLBACK: readonly CuratedFactCheck[] = [
  {
    ro: 'Guvernul României a decis interzicerea completă a plăților cash de la 1 ianuarie.',
    en: 'The Romanian government has decided to ban all cash payments starting January 1st.',
    fr: 'Le gouvernement a décidé d’interdire tous les paiements en espèces à compter du 1er janvier.',
  },
  {
    ro: 'Un politician român a declarat că România va ieși din Uniunea Europeană în urma unui referendum secret.',
    en: 'A Romanian politician claimed the country will leave the European Union after a secret referendum.',
    fr: 'Un responsable politique affirme qu’une sortie de l’Union européenne a été actée lors d’un référendum secret.',
  },
  {
    ro: 'Nu există dovezi științifice că lămâia fiartă vindecă cancerul, contrar postărilor virale.',
    en: 'There is no scientific evidence that boiled lemon cures cancer, contrary to viral posts.',
    fr: 'Il n’existe aucune preuve scientifique que le citron bouilli guérit le cancer, contrairement aux publications virales.',
  },
];

/**
 * How long a fetched set is reused before the module goes back to the API.
 * Independent of, and shorter than, the CDN cache on the route — this only
 * bounds how often a single warm server instance hits Google.
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Broad, evergreen query terms. Each API call needs a query, so we rotate a
 * pool by day to keep the surfaced claims varied across the week and to widen
 * the net (any single term may be quiet on a given day).
 */
const RO_TOPIC_TERMS = ['guvern', 'România', 'pensii', 'energie', 'spital', 'primar', 'lege'];
const FR_TOPIC_TERMS = ['gouvernement', 'France', 'retraites', 'énergie', 'hôpital', 'maire', 'loi', 'santé', 'climat'];
const INTL_TOPIC_TERMS = ['Rusia', 'Ucraina', 'NATO', 'climat', 'Trump', 'vaccin', 'Israel'];

interface RecentClaim {
  text: string;
  reviewDate: number; // epoch ms; 0 when the source gave no date
}

interface GoogleClaim {
  text?: string;
  claimReview?: Array<{ reviewDate?: string; languageCode?: string }>;
}

const moduleCache = new Map<ExamplesLocale, { at: number; examples: string[] }>();

/**
 * Homepage claim suggestions — three genuinely recent fact-checked claims
 * (two national, one international), refreshed automatically as fact-checkers
 * publish. Pulls from the Google Fact Check Tools API and falls back to a small
 * curated set only when the live lookup yields nothing, so the homepage is
 * never blank and never invents a claim.
 */
export async function getTrendingExamples(locale: ExamplesLocale): Promise<string[]> {
  const cached = moduleCache.get(locale);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.examples;
  }

  try {
    const examples = await buildLiveExamples(locale);
    if (examples.length === 3) {
      moduleCache.set(locale, { at: Date.now(), examples });
      return examples;
    }
    // Partial live result — top up with the curated fallback rather than
    // showing one lonely chip, but keep whatever live claims we did get.
    const topped = [...examples, ...CURATED_FALLBACK.map((c) => c[locale])].slice(0, 3);
    return topped;
  } catch (error) {
    logger.warn('Live trending unavailable, using curated fallback', {
      service: 'examples/trending',
      error: String(error),
    });
    return CURATED_FALLBACK.map((c) => c[locale]);
  }
}

/**
 * Fetches recent claims for both the national and international slots and
 * assembles [national, national, international]. Returns fewer than three only
 * when the API is short on results, letting the caller top up from the fallback.
 */
async function buildLiveExamples(locale: ExamplesLocale): Promise<string[]> {
  const languageCode = locale; // 'ro', 'fr', or 'en'
  const daySeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000));

  const nationalTerms = locale === 'ro' ? RO_TOPIC_TERMS : locale === 'fr' ? FR_TOPIC_TERMS : INTL_TOPIC_TERMS;
  const nationalPick = pickTerms(nationalTerms, 2, daySeed);
  const intlPick = pickTerms(INTL_TOPIC_TERMS, 2, daySeed + 3);

  const [national, international] = await Promise.all([
    fetchRecentClaims(nationalPick, languageCode),
    fetchRecentClaims(intlPick, languageCode),
  ]);

  const chosen: string[] = [];
  const seen = new Set<string>();
  const take = (claim: RecentClaim | undefined) => {
    if (!claim) return;
    const key = normalizeKey(claim.text);
    if (seen.has(key)) return;
    seen.add(key);
    chosen.push(claim.text);
  };

  // Two national, then one international that isn't a duplicate of them.
  take(national[0]);
  take(national[1]);
  take(international.find((c) => !seen.has(normalizeKey(c.text))));

  // If the national pool was thin, backfill the remaining slots from whichever
  // recent claims we have before the caller reaches for the curated fallback.
  const leftovers = [...national.slice(2), ...international];
  for (const claim of leftovers) {
    if (chosen.length >= 3) break;
    take(claim);
  }

  return chosen.slice(0, 3);
}

/** Deterministic day-based rotation through a term pool, no RNG. */
function pickTerms(pool: readonly string[], count: number, seed: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[(seed + i) % pool.length]);
  }
  return out;
}

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Queries the Google Fact Check Tools API for each term and returns the claims
 * merged and sorted newest-first. Only claims whose text reads like a usable
 * example (a real sentence, not a stray fragment) are kept.
 */
async function fetchRecentClaims(terms: string[], languageCode: string): Promise<RecentClaim[]> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!apiKey) return [];

  const perTerm = await Promise.all(
    terms.map((term) => fetchClaimsForTerm(term, languageCode, apiKey))
  );

  const merged = new Map<string, RecentClaim>();
  for (const claim of perTerm.flat()) {
    const key = normalizeKey(claim.text);
    const existing = merged.get(key);
    if (!existing || claim.reviewDate > existing.reviewDate) {
      merged.set(key, claim);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.reviewDate - a.reviewDate);
}

async function fetchClaimsForTerm(
  term: string,
  languageCode: string,
  apiKey: string
): Promise<RecentClaim[]> {
  const params = new URLSearchParams({
    key: apiKey,
    query: term,
    languageCode,
    pageSize: '10',
  });

  try {
    const res = await fetch(
      `https://factchecktools.googleapis.com/v1alpha1/claims:search?${params.toString()}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { claims?: GoogleClaim[] };
    if (!data.claims?.length) return [];

    return data.claims
      .map((claim): RecentClaim | null => {
        const text = cleanClaim(claim.text ?? '');
        if (!isUsableClaim(text)) return null;
        const review = claim.claimReview?.[0];
        // Prefer a claim reviewed in the requested language when the field is
        // present, so a Romanian visitor doesn't get an English sentence.
        if (review?.languageCode && review.languageCode !== languageCode) return null;
        const parsed = review?.reviewDate ? Date.parse(review.reviewDate) : NaN;
        return { text, reviewDate: Number.isNaN(parsed) ? 0 : parsed };
      })
      .filter((c): c is RecentClaim => c !== null);
  } catch {
    return [];
  }
}

/**
 * Fact-check APIs sometimes hand back the claim with the transcription's
 * markup still attached (bold stars, bullets, stray quotes, line breaks). Strip
 * that back to a plain sentence so it reads as a clean homepage chip.
 */
function cleanClaim(raw: string): string {
  return raw
    .replace(/[*_`#•▪●]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["“„'\s.-]+/, '')
    .replace(/["”"'\s]+$/, '')
    .trim();
}

/** A usable example is a plausible standalone sentence, not a fragment. */
function isUsableClaim(text: string): boolean {
  if (text.length < 20 || text.length > 200) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (text.split(/\s+/).length < 4) return false;
  // Real claims read as sentences and start with a capital; a fragment lifted
  // out of a quote ("merele noastre…") starts lower-case — drop those.
  const firstLetter = text.match(/\p{L}/u)?.[0];
  return !!firstLetter && firstLetter === firstLetter.toUpperCase();
}
