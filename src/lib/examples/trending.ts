import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { logger } from '@/lib/utils/logger';

export type ExamplesLocale = 'ro' | 'en';

/**
 * Evergreen, clearly-checkable claims used when live trending news is
 * unavailable (no NEWS_API_KEY, upstream down, or too few usable headlines).
 * Each is a well-documented misconception that returns a decisive verdict, so a
 * first-time visitor gets a satisfying demo rather than an "unclear".
 */
const CURATED: Record<ExamplesLocale, readonly string[]> = {
  ro: [
    'Vaccinurile provoacă autism.',
    'Rețeaua 5G răspândește coronavirusul.',
    'Usturoiul vindecă infecția cu COVID-19.',
  ],
  en: [
    'Vaccines cause autism.',
    '5G networks spread the coronavirus.',
    'Garlic cures COVID-19 infection.',
  ],
};

interface NewsAPIArticle {
  title: string | null;
  source: { name: string };
}
interface NewsAPIResponse {
  status: string;
  articles?: NewsAPIArticle[];
}

// Refresh at most twice a day per running instance. The homepage's chips are
// illustrative, so slightly different sets across serverless instances is fine;
// this only bounds how often we hit NewsAPI.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<ExamplesLocale, { at: number; examples: string[] }>();

// NewsAPI has no `country=ro` top-headlines coverage (returns nothing), so we
// pull the latest articles from the major Romanian outlets directly.
const RO_DOMAINS = 'mediafax.ro,g4media.ro,digi24.ro,hotnews.ro,news.ro,adevarul.ro';

// Leading section tags Romanian outlets prepend to headlines — noise for a
// claim chip.
const LEADING_TAG = /^(LIVE TEXT|LIVE|VIDEO|FOTO|GALERIE FOTO|UPDATE|EXCLUSIV|BREAKING|OPINIE|ANALIZĂ|INTERVIU)\s*[:\-–—]\s*/i;

// The separator before a source name is spaced (" - Digi24"); requiring spaces
// on both sides avoids eating hyphenated Romanian words like "într-o" or "s-a".
const TRAILING_SOURCE = /\s+[-|–—]\s+[^-|–—]{2,40}$/;

// Examples must stay politically neutral (see VerifyTool's `examples` contract):
// a partisan headline as a demo chip reads as the tool taking sides. Skip party
// names and government/electoral vocabulary; science, health, weather, tech,
// sport, and incident headlines pass through.
const SENSITIVE =
  /\b(psd|pnl|usr|aur|udmr|pmp|sos|pot)\b|guvern|parlament|ministr|premier|senat|deputat|alegeri|electoral|coali[țţt]i|mo[țţt]iun|pre[sșş]edint/i;

/** Strips a leading section tag and a trailing " - Source" tail, squeezes space. */
function cleanHeadline(title: string): string {
  return title
    .replace(LEADING_TAG, '')
    .replace(TRAILING_SOURCE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Latest Romanian headlines, cleaned into short claim-like strings. Returns []
 * on any failure so the caller can fall back to the curated set.
 */
async function fetchTrendingRo(): Promise<string[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    domains: RO_DOMAINS,
    language: 'ro',
    sortBy: 'publishedAt',
    pageSize: '20',
    apiKey,
  });

  try {
    const res = await withCircuitBreaker('newsapi', () =>
      fetchWithRetry(
        `https://newsapi.org/v2/everything?${params.toString()}`,
        () => ({ signal: AbortSignal.timeout(8000) }),
        { label: 'trending-examples' }
      ).then((r) => {
        if (!r.ok) throw new Error(`NewsAPI error: ${r.status} ${r.statusText}`);
        return r;
      })
    );

    const data = (await res.json()) as NewsAPIResponse;
    if (data.status !== 'ok' || !data.articles?.length) return [];

    const seen = new Set<string>();
    const picked: string[] = [];
    for (const article of data.articles) {
      const cleaned = cleanHeadline(article.title ?? '');
      // Too short reads as a fragment, not a claim; too long is unwieldy as a
      // one-tap chip. Skip removed/empty entries NewsAPI sometimes returns, and
      // anything partisan.
      if (cleaned.length < 25 || cleaned.length > 120) continue;
      if (cleaned.includes('[Removed]')) continue;
      if (SENSITIVE.test(cleaned)) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(cleaned);
      if (picked.length >= 3) break;
    }
    return picked;
  } catch (error) {
    logger.warn('Trending examples fetch failed, using curated set', {
      service: 'examples/trending',
      error: String(error),
    });
    return [];
  }
}

/**
 * Three claim suggestions for the homepage. Live Romanian headlines when they
 * can be fetched (RO only — the product's home market), otherwise the curated
 * evergreen set. Cached in-process for {@link CACHE_TTL_MS}. Never throws.
 */
export async function getTrendingExamples(locale: ExamplesLocale): Promise<string[]> {
  const cached = cache.get(locale);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.examples;

  const live = locale === 'ro' ? await fetchTrendingRo() : [];
  const examples = live.length >= 3 ? live : [...CURATED[locale]];

  cache.set(locale, { at: Date.now(), examples });
  return examples;
}
