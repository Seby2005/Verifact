import type { NewsArticle, Language, Layer2Result } from '@/types/verification';
import {
  SOURCE_CREDIBILITY,
  CONTRADICTION_KEYWORDS_RO,
  CONTRADICTION_KEYWORDS_EN,
  CONTRADICTION_KEYWORDS_FR,
  CONFIRMATION_KEYWORDS_RO,
  CONFIRMATION_KEYWORDS_EN,
  CONFIRMATION_KEYWORDS_FR,
  DEBUNK_MARKERS,
} from './constants';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { isRelevantToClaim } from './relevance';
import { matchesAnyPhrase } from './keyword-match';
import type { ExpandedQueries } from './query-expander';

// ─── Internal API types ───────────────────────────────────────

interface NewsAPIArticle {
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { id: string | null; name: string };
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const SOCIAL_MEDIA_DOMAINS = [
  'facebook.com',
  'fb.com',
  'tiktok.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'youtu.be',
  'reddit.com',
  'threads.net',
  'bsky.app',
  't.me',
  'telegram.org',
];

function isSocialDomain(url: string): boolean {
  try {
    const domain = extractDomain(url).toLowerCase();
    return SOCIAL_MEDIA_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
  } catch {
    return false;
  }
}

function getCredibilityScore(url: string): number {
  const domain = extractDomain(url);
  if (domain in SOURCE_CREDIBILITY) return SOURCE_CREDIBILITY[domain];

  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (parent in SOURCE_CREDIBILITY) return SOURCE_CREDIBILITY[parent];
  }

  return SOURCE_CREDIBILITY['default'];
}

export function detectSentiment(
  title: string,
  snippet: string,
  inputText: string,
  _credibilityScore: number
): NewsArticle['sentiment'] {
  const combinedText = `${title} ${snippet}`.toLowerCase();

  if (!isRelevantToClaim(inputText, combinedText)) return 'unrelated';

  if (matchesAnyPhrase(combinedText, DEBUNK_MARKERS)) {
    return 'contradicts';
  }

  const hasContradictionRo = matchesAnyPhrase(combinedText, CONTRADICTION_KEYWORDS_RO);
  const hasContradictionEn = matchesAnyPhrase(combinedText, CONTRADICTION_KEYWORDS_EN);
  const hasContradictionFr = matchesAnyPhrase(combinedText, CONTRADICTION_KEYWORDS_FR);
  if (hasContradictionRo || hasContradictionEn || hasContradictionFr) return 'contradicts';

  const hasConfirmationRo = matchesAnyPhrase(combinedText, CONFIRMATION_KEYWORDS_RO);
  const hasConfirmationEn = matchesAnyPhrase(combinedText, CONFIRMATION_KEYWORDS_EN);
  const hasConfirmationFr = matchesAnyPhrase(combinedText, CONFIRMATION_KEYWORDS_FR);
  if (hasConfirmationRo || hasConfirmationEn || hasConfirmationFr) return 'confirms';

  return 'neutral';
}

function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.articleUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchFromNewsAPI(query: string, language: Language, rawInputText?: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const lang = language === 'ro' ? 'ro' : language === 'fr' ? 'fr' : 'en';
  const params = new URLSearchParams({
    q: query.slice(0, 100),
    language: lang,
    sortBy: 'relevance',
    pageSize: '10',
    apiKey,
  });

  try {
    const response = await withCircuitBreaker('newsapi', () =>
      fetchWithRetry(
        `https://newsapi.org/v2/everything?${params.toString()}`,
        () => ({ signal: AbortSignal.timeout(8000) }),
        { label: 'layer2-newsapi' }
      ).then((res) => {
        if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
        return res;
      })
    );

    const data = (await response.json()) as NewsAPIResponse;
    if (data.status !== 'ok' || !data.articles) return [];

    return data.articles
      .filter((article) => !isSocialDomain(article.url))
      .map((article): NewsArticle => {
        const credibilityScore = getCredibilityScore(article.url);
        const sentiment = detectSentiment(article.title, article.description ?? '', rawInputText || query, credibilityScore);

        return {
          title: article.title,
          source: article.source.name,
          sourceUrl: article.url,
          articleUrl: article.url,
          publishedAt: article.publishedAt,
          snippet: article.description ?? '',
          sentiment,
          credibilityScore,
        };
      });
  } catch {
    return [];
  }
}

async function fetchFromTavily(query: string, rawInputText: string): Promise<NewsArticle[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !query.trim()) return [];

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
            query: query.slice(0, 300),
            search_depth: 'basic',
            topic: 'general',
            max_results: 10,
            exclude_domains: SOCIAL_MEDIA_DOMAINS,
          }),
          signal: AbortSignal.timeout(8000),
        }),
        { label: 'layer2-tavily' }
      ).then((res) => {
        if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
        return res;
      })
    );

    const data = (await response.json()) as TavilySearchResponse;
    if (!data.results?.length) return [];

    return data.results
      .filter((item) => !isSocialDomain(item.url))
      .map((item): NewsArticle => {
        const credibilityScore = getCredibilityScore(item.url);
        const domain = extractDomain(item.url);
        const sentiment = detectSentiment(item.title, item.content, rawInputText, credibilityScore);

        return {
          title: item.title,
          source: domain,
          sourceUrl: domain,
          articleUrl: item.url,
          publishedAt: item.published_date ?? '',
          snippet: item.content,
          sentiment,
          credibilityScore,
        };
      });
  } catch {
    return [];
  }
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
}

/** GDELT's compact stamp (20260721T083142Z) → ISO. */
function parseGdeltDate(s?: string): string {
  const m = s?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : '';
}

/**
 * GDELT DOC API — global news coverage across ~65 languages, no key. Strictly
 * best-effort: GDELT rate-limits to one request / 5s and answers a rate-limited
 * or malformed query with plain text, not JSON. Both cases parse to nothing and
 * return [], so this can only ever add coverage, never break the layer.
 */
async function fetchFromGDELT(query: string, rawInputText: string): Promise<NewsArticle[]> {
  const q = query.trim();
  if (q.length < 4) return [];

  const params = new URLSearchParams({
    query: q.slice(0, 100),
    mode: 'artlist',
    format: 'json',
    maxrecords: '15',
    sort: 'hybridrel',
    timespan: '6m',
  });

  try {
    // Plain fetch, short timeout, NO retry: GDELT rate-limits to 1 req/5s, so a
    // retry loop would burn ~11s and blow layer 2's 10s budget — sinking the
    // whole news layer for a source that is only a bonus. Capped and fail-open.
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return [];

    const raw = await response.text();
    let data: { articles?: GdeltArticle[] };
    try {
      data = JSON.parse(raw);
    } catch {
      return []; // rate-limit / error message, not JSON
    }
    if (!Array.isArray(data.articles)) return [];

    return data.articles
      .filter((a) => a.url && a.title && !isSocialDomain(a.url as string))
      .map((a): NewsArticle => {
        const url = a.url as string;
        const credibilityScore = getCredibilityScore(url);
        const sentiment = detectSentiment(a.title ?? '', '', rawInputText, credibilityScore);
        return {
          title: a.title ?? '',
          source: a.domain ?? extractDomain(url),
          sourceUrl: url,
          articleUrl: url,
          publishedAt: parseGdeltDate(a.seendate),
          snippet: a.title ?? '',
          sentiment,
          credibilityScore,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Credibility-weighted balance of the articles that take a side (0 = all
 * contradict, 1 = all confirm, 0.5 = none take a side).
 *
 * Neutral articles abstain: being on topic without settling the claim is no
 * evidence either way, and counting them as 0.5 dragged every well-reported
 * true claim toward "partial".
 */
export function calculateLayer2Score(articles: NewsArticle[]): number {
  const withStance = articles.filter((a) => a.sentiment === 'confirms' || a.sentiment === 'contradicts');
  if (withStance.length === 0) return 0.5;

  let signedScore = 0;
  let totalWeight = 0;

  for (const article of withStance) {
    const weight = article.credibilityScore ?? 0.5;
    totalWeight += weight;
    signedScore += article.sentiment === 'confirms' ? weight : -weight;
  }

  if (totalWeight === 0) return 0.5;
  return (signedScore / totalWeight + 1) / 2;
}

export async function runLayer2(
  text: string,
  language: Language,
  expandedQueries?: ExpandedQueries
): Promise<Layer2Result> {
  const startTime = Date.now();

  const roQuery = expandedQueries?.romanianQuery || text;
  const enQuery = expandedQueries?.englishQuery || text;
  const contextQuery = expandedQueries?.contextOriginAngle;

  // One GDELT call only (it rate-limits to 1 req / 5s); enQuery casts the widest
  // net across its global, mostly-English index, complementing the RO-first
  // NewsAPI/Tavily calls.
  //
  // English-language searches are judged for relevance against enQuery, not
  // the claim text: an English article shares almost no tokens with a
  // Romanian claim, so checking it against `text` silently drops all of them.
  const [newsRo, newsEn, tavilyRo, tavilyEn, tavilyContext, gdelt] = await Promise.allSettled([
    fetchFromNewsAPI(roQuery, 'ro', text),
    fetchFromNewsAPI(enQuery, 'en'),
    fetchFromTavily(roQuery, text),
    fetchFromTavily(enQuery, enQuery),
    contextQuery && contextQuery !== roQuery ? fetchFromTavily(contextQuery, text) : Promise.resolve([]),
    fetchFromGDELT(enQuery, enQuery),
  ]);

  const allArticles: NewsArticle[] = [
    ...(newsRo.status === 'fulfilled' ? newsRo.value : []),
    ...(newsEn.status === 'fulfilled' ? newsEn.value : []),
    ...(tavilyRo.status === 'fulfilled' ? tavilyRo.value : []),
    ...(tavilyEn.status === 'fulfilled' ? tavilyEn.value : []),
    ...(tavilyContext.status === 'fulfilled' ? tavilyContext.value : []),
    ...(gdelt.status === 'fulfilled' ? gdelt.value : []),
  ];

  const unique = deduplicateArticles(allArticles);
  const relevant = unique.filter((a) => a.sentiment !== 'unrelated');

  relevant.sort((a, b) => {
    // 1. Matching language domain priority (e.g. .ro for Romanian queries)
    if (language === 'ro') {
      const aRo = (a.sourceUrl?.endsWith('.ro') ?? false) || a.source.toLowerCase().endsWith('.ro') ? 1 : 0;
      const bRo = (b.sourceUrl?.endsWith('.ro') ?? false) || b.source.toLowerCase().endsWith('.ro') ? 1 : 0;
      if (aRo !== bRo) return bRo - aRo;
    }

    // 2. Credibility score
    return (b.credibilityScore ?? 0) - (a.credibilityScore ?? 0);
  });

  const layerScore = calculateLayer2Score(relevant);

  return {
    status: 'success',
    articles: relevant.slice(0, 12),
    results: relevant.slice(0, 12),
    summary: `${relevant.length} news articles found`,
    layerScore,
    processingTime: Date.now() - startTime,
    sourcesChecked: unique.length,
  };
}
