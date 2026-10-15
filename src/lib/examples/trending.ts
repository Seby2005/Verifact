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
 * This only bounds how often a single warm server instance hits Google; the
 * selection itself moves on once a day (see pickSuggestions).
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const DAY_MS = 24 * 60 * 60 * 1000;
const SUGGESTION_COUNT = 3;

/**
 * The fact-checkers whose newest reviews become suggestions, per interface
 * language. Listed by publisher rather than searched by topic: a topic search
 * ("guvern", "România") comes back ordered by relevance, not by date, so a
 * weekly rotation of seven topic words surfaced the same years-old claims
 * every week. A publisher's own listing is newest-first.
 */
const PUBLISHERS: Record<ExamplesLocale, readonly string[]> = {
  ro: ['factual.ro', 'verificat.afp.com'],
  fr: ['factuel.afp.com'],
  en: ['snopes.com', 'factcheck.afp.com'],
};

/**
 * How old a reviewed claim may be and still be suggested. A week by default;
 * the wider window is used only when the fact-checkers published too little
 * that week to fill the row.
 */
const FRESH_WINDOWS_DAYS = [7, 30] as const;

/** How many of a publisher's newest reviews are read on each refresh. */
const REVIEWS_PER_PUBLISHER = 50;

export interface RecentClaim {
  text: string;
  reviewDate: number; // epoch ms; 0 when the source gave no date
}

interface GoogleClaim {
  text?: string;
  claimReview?: Array<{ reviewDate?: string; languageCode?: string }>;
}

const moduleCache = new Map<ExamplesLocale, { at: number; examples: string[] }>();

/**
 * Homepage claim suggestions — three claims that fact-checkers reviewed in the
 * last week, changing every day and never older than the freshness window
 * while there is enough new material. Falls back to a small curated set only
 * when the live lookup yields nothing, so the homepage is never blank and
 * never invents a claim.
 */
export async function getTrendingExamples(locale: ExamplesLocale): Promise<string[]> {
  const cached = moduleCache.get(locale);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.examples;
  }

  try {
    const pools = await Promise.all(PUBLISHERS[locale].map((site) => fetchNewestReviews(site, locale)));
    const examples = pickSuggestions(pools, Date.now());
    if (examples.length === SUGGESTION_COUNT) {
      moduleCache.set(locale, { at: Date.now(), examples });
      return examples;
    }
    // Partial live result — top up with the curated fallback rather than
    // showing one lonely chip, but keep whatever live claims we did get.
    return [...examples, ...CURATED_FALLBACK.map((c) => c[locale])].slice(0, SUGGESTION_COUNT);
  } catch (error) {
    logger.warn('Live trending unavailable, using curated fallback', {
      service: 'examples/trending',
      error: String(error),
    });
    return CURATED_FALLBACK.map((c) => c[locale]);
  }
}

/**
 * Chooses the suggestions from each publisher's recent claims.
 *
 * Only claims reviewed inside the freshness window are eligible, so nothing
 * stays on the homepage for months. Within the window the choice moves on by
 * a full row every day, and the publishers take turns, so one prolific
 * fact-checker does not fill every slot. Returns fewer than `count` when even
 * the widest window is short on material.
 */
export function pickSuggestions(pools: RecentClaim[][], now: number, count: number = SUGGESTION_COUNT): string[] {
  const day = Math.floor(now / DAY_MS);
  let best: string[] = [];

  for (const windowDays of FRESH_WINDOWS_DAYS) {
    const oldest = now - windowDays * DAY_MS;
    const fresh = pools.map((pool) =>
      rotate(
        pool.filter((claim) => claim.reviewDate >= oldest).sort((a, b) => b.reviewDate - a.reviewDate),
        day * count
      )
    );

    const chosen: string[] = [];
    const seen = new Set<string>();
    for (let turn = 0; chosen.length < count && fresh.some((pool) => turn < pool.length); turn++) {
      for (const pool of fresh) {
        const claim = pool[turn];
        if (!claim || chosen.length >= count) continue;
        const key = normalizeKey(claim.text);
        if (seen.has(key)) continue;
        seen.add(key);
        chosen.push(claim.text);
      }
    }

    if (chosen.length === count) return chosen;
    if (chosen.length > best.length) best = chosen;
  }

  return best;
}

/** The list starting from `offset`, wrapping round — a different slice of it each day. */
function rotate<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items;
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * One fact-checker's newest reviews in the given language, as claims usable on
 * the homepage. Resolves to [] when the API has no key, errors or is slow: a
 * missing publisher only thins the pool.
 */
async function fetchNewestReviews(site: string, languageCode: string): Promise<RecentClaim[]> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    key: apiKey,
    reviewPublisherSiteFilter: site,
    languageCode,
    pageSize: String(REVIEWS_PER_PUBLISHER),
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
  const text = raw
    .replace(/[*_`#•▪●]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.-]+/, '');

  // A claim quoted whole loses its quotation marks; one that merely contains a
  // quoted word keeps them — stripping an end mark alone left „chemtrails open.
  const quoted = text.match(/^["“„«]\s*(.+?)\s*["”»]\.?$/);
  return quoted && !/["“„”«»]/.test(quoted[1]) ? quoted[1] : text;
}

/**
 * A reviewed claim that describes a picture or a clip ("Videoclipul arată…",
 * "An image shows…") or opens by pointing at one ("Acesta este un reportaj
 * real…"). It cannot be checked as text: the reader who pastes it has nothing
 * for the words to point at.
 */
const POINTS_AT_MEDIA =
  /(?<!\p{L})(videoclip\p{L}*|clip\p{L}*|imagin\p{L}*|fotografi\p{L}*|captur\p{L}+ de ecran|vid[eé]os?|images?|photos?|footage|screenshots?|pictures?)(?!\p{L})|^(aceast[aă]|acest[aei]?|ace[sș]ti|this|these|cette|ces?|cet)(?!\p{L})/iu;

/** A fact-checker's cut inside a quote: "(...) PSD ce a mai făcut?" is no longer a sentence. */
const ELIDED_QUOTE = /[([](?:\.\.\.|…)[)\]]/;

/** A usable example is a plausible standalone sentence the reader could paste and check. */
function isUsableClaim(text: string): boolean {
  if (text.length < 20 || text.length > 160) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (text.split(/\s+/).length < 4) return false;
  if (ELIDED_QUOTE.test(text) || POINTS_AT_MEDIA.test(text)) return false;
  // Real claims read as sentences and start with a capital; a fragment lifted
  // out of a quote ("merele noastre…") starts lower-case — drop those.
  const firstLetter = text.match(/\p{L}/u)?.[0];
  return !!firstLetter && firstLetter === firstLetter.toUpperCase();
}
