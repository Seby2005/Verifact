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

  const [newsRo, newsEn, tavilyRo, tavilyEn] = await Promise.allSettled([
    fetchFromNewsAPI(roQuery, 'ro'),
    fetchFromNewsAPI(enQuery, 'en'),
    fetchFromTavily(roQuery, text),
    fetchFromTavily(enQuery, text),
  ]);

  const allArticles: NewsArticle[] = [
    ...(newsRo.status === 'fulfilled' ? newsRo.value : []),
    ...(newsEn.status === 'fulfilled' ? newsEn.value : []),
    ...(tavilyRo.status === 'fulfilled' ? tavilyRo.value : []),
    ...(tavilyEn.status === 'fulfilled' ? tavilyEn.value : []),
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
