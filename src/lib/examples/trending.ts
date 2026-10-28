import { logger } from '@/lib/utils/logger';
import { createContentHash } from '@/lib/utils/hash';
import { getCachedVerdicts } from '@/lib/verification/cache';
import { recentFactChecks } from '@/lib/news-index';
import { archivedFactChecksSince } from '@/lib/factcheck-archive';

export type ExamplesLocale = 'ro' | 'en' | 'fr';

/**
 * A curated fact-check entry linking to a real verification from a recognised
 * fact-checking organisation. Used ONLY as an offline fallback when the live
 * sources return nothing (no API key, network error, or an empty result set). Each entry carries the claim text in all supported languages.
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
 * How long a fully prepared row is reused before the module looks again. This
 * only bounds how often a single warm server instance reads its sources; the
 * selection itself moves on once a day (see pickSuggestions). A row still
 * waiting on its verifications is not kept, so it fills in as they land.
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const DAY_MS = 24 * 60 * 60 * 1000;
const SUGGESTION_COUNT = 3;

/**
 * How many claims are lined up for the row, in order. More than the row shows:
 * a claim the verification could not settle is passed over for the next one,
 * and tomorrow's row is mostly already in this list (it moves on by three).
 */
const CANDIDATE_COUNT = 12;

/**
 * The fact-checkers read live through Google's Fact Check API, per interface
 * language. Listed by publisher rather than searched by topic: a topic search
 * ("guvern", "România") comes back ordered by relevance, not by date, so a
 * weekly rotation of seven topic words surfaced the same years-old claims
 * every week. A publisher's own listing is newest-first.
 *
 * Factual.ro is read from Verifact's own news index instead (see gatherPools):
 * its feed headlines name the speaker ("Luca Niculescu spune că…") where the
 * API hands back the speaker's bare words in the first person.
 */
const PUBLISHERS: Record<ExamplesLocale, readonly string[]> = {
  ro: ['verificat.afp.com'],
  fr: ['factuel.afp.com'],
  en: ['snopes.com', 'factcheck.afp.com'],
};

/**
 * Sites the Romanian archive is not read for, because they are read live
 * above: the archive's copy would only repeat them in other words.
 */
const ARCHIVE_SKIPPED_SITES: readonly string[] = ['factual.ro', 'verificat.afp.com'];

/**
 * How old a reviewed claim may be and still be suggested. Claims from the
 * last week come first; the month only fills the places the week leaves.
 */
const FRESH_WINDOWS_DAYS = [7, 30] as const;
const OLDEST_DAYS = FRESH_WINDOWS_DAYS[FRESH_WINDOWS_DAYS.length - 1];

/** How many of a publisher's newest reviews are read on each refresh. */
const REVIEWS_PER_PUBLISHER = 50;

export interface RecentClaim {
  text: string;
  reviewDate: number; // epoch ms; 0 when the source gave no date
}

/**
 * Where a lined-up claim stands with the verification:
 *  - 'clear'     verified in advance, with a verdict; opening it is instant
 *  - 'unclear'   verified in advance, and the evidence settled nothing
 *  - 'unchecked' not verified yet (or the result has expired)
 */
export type CandidateStatus = 'clear' | 'unclear' | 'unchecked';

export interface Candidate {
  text: string;
  status: CandidateStatus;
}

interface GoogleClaim {
  text?: string;
  claimReview?: Array<{ reviewDate?: string; languageCode?: string }>;
}

const moduleCache = new Map<ExamplesLocale, { at: number; examples: string[] }>();

/**
 * Homepage claim suggestions — three claims that fact-checkers reviewed
 * recently, changing every day. Claims already verified in advance come first,
 * so clicking one opens its report at once; one whose verification settled
 * nothing is never shown. Falls back to a small curated set only when the live
 * sources yield nothing, so the homepage is never blank and never invents a
 * claim.
 */
export async function getTrendingExamples(locale: ExamplesLocale): Promise<string[]> {
  const cached = moduleCache.get(locale);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.examples;
  }

  try {
    const candidates = await getCandidates(locale);
    const ready = candidates.filter((c) => c.status === 'clear').map((c) => c.text);
    const waiting = candidates.filter((c) => c.status === 'unchecked').map((c) => c.text);
    const examples = [...ready, ...waiting].slice(0, SUGGESTION_COUNT);

    if (ready.length >= SUGGESTION_COUNT) {
      moduleCache.set(locale, { at: Date.now(), examples });
    }
    // Short on live claims — top up with the curated fallback rather than
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
 * The claims lined up for the homepage today, in the order they would be
 * shown, each with where it stands with the verification. The suggestions job
 * (prepare.ts) verifies them in this same order, so the two always agree on
 * what comes next.
 */
export async function getCandidates(locale: ExamplesLocale, now: number = Date.now()): Promise<Candidate[]> {
  const pools = await gatherPools(locale, now);
  const texts = pickSuggestions(pools, now, CANDIDATE_COUNT);
  const hashes = texts.map((text) => createContentHash(text, locale));
  const verdicts = await getCachedVerdicts(hashes);

  return texts.map((text, i) => {
    const verdict = verdicts.get(hashes[i]);
    const status: CandidateStatus = !verdict ? 'unchecked' : verdict === 'unclear' ? 'unclear' : 'clear';
    return { text, status };
  });
}

/**
 * Every source's recent claims, one pool per source, cleaned and filtered to
 * the ones a reader could paste and check. A source that cannot be read only
 * leaves its pool empty.
 */
async function gatherPools(locale: ExamplesLocale, now: number): Promise<RecentClaim[][]> {
  const live = Promise.all(PUBLISHERS[locale].map((site) => fetchNewestReviews(site, locale)));
  if (locale !== 'ro') return live;

  const ownIndex = recentFactChecks(OLDEST_DAYS)
    .then((items) => usable(items.map((item) => ({ text: item.title, reviewDate: Date.parse(item.publishedAt) }))))
    .catch(() => [] as RecentClaim[]);

  const since = new Date(now - OLDEST_DAYS * DAY_MS).toISOString().slice(0, 10);
  const archive = usable(
    archivedFactChecksSince(since)
      .filter((entry) => !ARCHIVE_SKIPPED_SITES.includes(entry.site))
      .map((entry) => ({ text: entry.claim, reviewDate: Date.parse(entry.date) }))
  );

  return [await ownIndex, ...(await live), archive];
}

/** Claims cleaned up for a chip, keeping only the ones usable as one. */
function usable(claims: RecentClaim[]): RecentClaim[] {
  return claims
    .map((claim) => ({
      text: cleanClaim(claim.text),
      reviewDate: Number.isNaN(claim.reviewDate) ? 0 : claim.reviewDate,
    }))
    .filter((claim) => isUsableClaim(claim.text));
}

/**
 * Lines up to `count` claims from the sources' recent claims, in the order
 * they should be shown.
 *
 * Only claims reviewed inside the freshness windows are eligible, so nothing
 * stays on the homepage for months; the last week comes first and the month
 * only fills the places the week leaves. Within a window the order moves on by
 * a full row every day, and the sources take turns, so one prolific
 * fact-checker does not fill every slot. Returns fewer than `count` when even
 * the widest window is short on material.
 */
export function pickSuggestions(pools: RecentClaim[][], now: number, count: number = SUGGESTION_COUNT): string[] {
  const day = Math.floor(now / DAY_MS);
  const chosen: string[] = [];
  const seen = new Set<string>();

  for (const windowDays of FRESH_WINDOWS_DAYS) {
    const oldest = now - windowDays * DAY_MS;
    const fresh = pools.map((pool) =>
      rotate(
        pool.filter((claim) => claim.reviewDate >= oldest).sort((a, b) => b.reviewDate - a.reviewDate),
        day * SUGGESTION_COUNT
      )
    );

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
  }

  return chosen;
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
 * markup still attached (bold stars, bullets, line breaks, a verdict label such
 * as "FALS |"). Strip that back to a plain sentence so it reads as a clean
 * homepage chip — and so the chip does not give the verdict away.
 */
function cleanClaim(raw: string): string {
  return raw
    .replace(/[*_`#•▪●]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.-]+/, '')
    .replace(/^[\p{Lu} ]+\|\s*/u, '');
}

/**
 * A reviewed claim that describes a picture or a clip ("Videoclipul arată…",
 * "An image shows…") or opens by pointing at one ("Acesta este un reportaj
 * real…"). It cannot be checked as text: the reader who pastes it has nothing
 * for the words to point at.
 */
const POINTS_AT_MEDIA =
  /(?<!\p{L})(videoclip\p{L}*|clip\p{L}*|deepfake\p{L}*|imagin\p{L}*|fotografi\p{L}*|captur\p{L}+ de ecran|vid[eé]os?|images?|photos?|footage|screenshots?|pictures?)(?!\p{L})|^(aceast[aă]|acest[aei]?|ace[sș]ti|this|these|cette|ces?|cet)(?!\p{L})/iu;

/** A fact-checker's cut inside a quote: "(...) PSD ce a mai făcut?" is no longer a sentence. */
const ELIDED_QUOTE = /[([](?:\.\.\.|…)[)\]]/;

/**
 * A speaker's own words, quoted whole without saying who spoke them
 * („Cred că sunt șapte ani de când…”). On the homepage they read as a stranger
 * talking in the first person, with no one to attribute the claim to. The
 * fact-checker's summary ("Florin Barbu spune că…") names the speaker instead.
 */
const SPEAKERS_WORDS = /^["“„«]/;

/**
 * A headline that names a speaker and a subject but no claim ("Sorin Grindeanu
 * despre partidele politice…"): there is nothing in it to be true or false.
 */
const TOPIC_ONLY = /^(?:\p{Lu}[\p{L}-]*\s){1,4}despre\s/u;

/** A usable example is a plausible standalone sentence the reader could paste and check. */
function isUsableClaim(text: string): boolean {
  if (text.length < 20 || text.length > 160) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (text.split(/\s+/).length < 4) return false;
  if (SPEAKERS_WORDS.test(text) || TOPIC_ONLY.test(text) || ELIDED_QUOTE.test(text) || POINTS_AT_MEDIA.test(text)) return false;
  // Real claims read as sentences and start with a capital; a fragment lifted
  // out of a quote ("merele noastre…") starts lower-case — drop those.
  const firstLetter = text.match(/\p{L}/u)?.[0];
  return !!firstLetter && firstLetter === firstLetter.toUpperCase();
}
