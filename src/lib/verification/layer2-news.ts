import type { NewsArticle, Language, Layer2Result } from '@/types/verification';
import {
  SOURCE_CREDIBILITY,
  CONTRADICTION_KEYWORDS_RO,
  CONTRADICTION_KEYWORDS_EN,
  CONFIRMATION_KEYWORDS_RO,
  CONFIRMATION_KEYWORDS_EN,
  DEBUNK_MARKERS,
} from './constants';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { isRelevantToClaim } from './relevance';
import { matchesAnyPhrase } from './keyword-match';
import type { ExpandedQueries } from './query-expander';
import { getStateMediaInfo } from './state-media';

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
  if (hasContradictionRo || hasContradictionEn) return 'contradicts';

  const hasConfirmationRo = matchesAnyPhrase(combinedText, CONFIRMATION_KEYWORDS_RO);
  const hasConfirmationEn = matchesAnyPhrase(combinedText, CONFIRMATION_KEYWORDS_EN);
  if (hasConfirmationRo || hasConfirmationEn) return 'confirms';

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

async function fetchFromNewsAPI(query: string, language: Language): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const lang = language === 'ro' ? 'ro' : 'en';
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

    return data.articles.map((article): NewsArticle => {
      const credibilityScore = getCredibilityScore(article.url);
      const sentiment = detectSentiment(article.title, article.description ?? '', query, credibilityScore);
      const stateMedia = getStateMediaInfo(article.url);

      return {
        title: article.title,
        source: article.source.name,
        sourceUrl: article.url,
        articleUrl: article.url,
        publishedAt: article.publishedAt,
        snippet: article.description ?? '',
        sentiment,
        credibilityScore,
        ...(stateMedia ? { stateMediaInfo: stateMedia } : {}),
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
            topic: 'news',
            max_results: 10,
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

    return data.results.map((item): NewsArticle => {
      const credibilityScore = getCredibilityScore(item.url);
      const domain = extractDomain(item.url);
      const sentiment = detectSentiment(item.title, item.content, rawInputText, credibilityScore);
      const stateMedia = getStateMediaInfo(item.url);

      return {
        title: item.title,
        source: domain,
        sourceUrl: domain,
        articleUrl: item.url,
        publishedAt: item.published_date ?? '',
        snippet: item.content,
        sentiment,
        credibilityScore,
        ...(stateMedia ? { stateMediaInfo: stateMedia } : {}),
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
      .filter((a) => a.url && a.title)
      .map((a): NewsArticle => {
        const url = a.url as string;
        const credibilityScore = getCredibilityScore(url);
        const sentiment = detectSentiment(a.title ?? '', '', rawInputText, credibilityScore);
        const stateMedia = getStateMediaInfo(url);

        return {
          title: a.title ?? '',
          source: a.domain ?? extractDomain(url),
          sourceUrl: url,
          articleUrl: url,
          publishedAt: parseGdeltDate(a.seendate),
          snippet: a.title ?? '',
          sentiment,
          credibilityScore,
          ...(stateMedia ? { stateMediaInfo: stateMedia } : {}),
        };
      });
  } catch {
    return [];
  }
}

export function calculateLayer2Score(articles: NewsArticle[]): number {
  const relevant = articles.filter((a) => a.sentiment !== 'unrelated');
  if (relevant.length === 0) return 0.5;

  let signedScore = 0;
  let totalWeight = 0;

  for (const article of relevant) {
    const weight = article.credibilityScore ?? 0.5;
    totalWeight += weight;

    if (article.sentiment === 'confirms') {
      signedScore += weight;
    } else if (article.sentiment === 'contradicts') {
      signedScore -= weight;
    }
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

  // One GDELT call only (it rate-limits to 1 req / 5s); enQuery casts the widest
  // net across its global, mostly-English index, complementing the RO-first
  // NewsAPI/Tavily calls.
  const [newsRo, newsEn, tavilyRo, tavilyEn, gdelt] = await Promise.allSettled([
    fetchFromNewsAPI(roQuery, 'ro'),
    fetchFromNewsAPI(enQuery, 'en'),
    fetchFromTavily(roQuery, text),
    fetchFromTavily(enQuery, text),
    fetchFromGDELT(enQuery, text),
  ]);

  const allArticles: NewsArticle[] = [
    ...(newsRo.status === 'fulfilled' ? newsRo.value : []),
    ...(newsEn.status === 'fulfilled' ? newsEn.value : []),
    ...(tavilyRo.status === 'fulfilled' ? tavilyRo.value : []),
    ...(tavilyEn.status === 'fulfilled' ? tavilyEn.value : []),
    ...(gdelt.status === 'fulfilled' ? gdelt.value : []),
  ];

  const unique = deduplicateArticles(allArticles);
  const relevant = unique.filter((a) => a.sentiment !== 'unrelated');
  relevant.sort((a, b) => (b.credibilityScore ?? 0) - (a.credibilityScore ?? 0));

  const layerScore = calculateLayer2Score(relevant);

  return {
    status: 'success',
    articles: relevant.slice(0, 10),
    results: relevant.slice(0, 10),
    summary: `${relevant.length} news articles found`,
    layerScore,
    processingTime: Date.now() - startTime,
    sourcesChecked: unique.length,
  };
}
