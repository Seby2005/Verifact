import type { NewsArticle, Language, Layer2Result } from '@/types/verification';
import {
  SOURCE_CREDIBILITY,
  CONTRADICTION_KEYWORDS_RO,
  CONTRADICTION_KEYWORDS_EN,
  CONFIRMATION_KEYWORDS_RO,
  CONFIRMATION_KEYWORDS_EN,
} from './constants';

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

interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  pagemap?: {
    metatags?: Array<Record<string, string>>;
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Extracts the root domain from a URL.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Returns the credibility score for a domain.
 */
function getCredibilityScore(url: string): number {
  const domain = extractDomain(url);

  // Exact match
  if (domain in SOURCE_CREDIBILITY) return SOURCE_CREDIBILITY[domain];

  // Parent domain match (e.g., subdomain.reuters.com → reuters.com)
  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (parent in SOURCE_CREDIBILITY) return SOURCE_CREDIBILITY[parent];
  }

  return SOURCE_CREDIBILITY['default'];
}

/**
 * Detects whether an article confirms, contradicts, or is neutral towards a claim.
 */
export function detectSentiment(
  title: string,
  snippet: string,
  inputText: string,
  _credibilityScore: number
): NewsArticle['sentiment'] {
  // First check relevance — if very different content, mark as unrelated
  const combinedText = `${title} ${snippet}`.toLowerCase();
  const inputLower = inputText.toLowerCase();

  // Extract significant words from input (min 4 chars)
  const inputWords = inputLower.split(/\s+/).filter(w => w.length >= 4);
  const matchCount = inputWords.filter(w => combinedText.includes(w)).length;
  const relevance = inputWords.length > 0 ? matchCount / inputWords.length : 0;

  if (relevance < 0.15) return 'unrelated';

  // Check for contradiction keywords
  const allContradictions = [...CONTRADICTION_KEYWORDS_RO, ...CONTRADICTION_KEYWORDS_EN];
  const hasContradiction = allContradictions.some(kw => combinedText.includes(kw));

  // Check for confirmation keywords
  const allConfirmations = [...CONFIRMATION_KEYWORDS_RO, ...CONFIRMATION_KEYWORDS_EN];
  const hasConfirmation = allConfirmations.some(kw => combinedText.includes(kw));

  if (hasContradiction && !hasConfirmation) return 'contradicts';
  if (hasConfirmation && !hasContradiction) return 'confirms';

  return 'neutral';
}

/**
 * Deduplicates articles by URL and domain (keep highest-credibility version).
 */
function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seenUrls = new Set<string>();
  const seenDomains = new Map<string, NewsArticle>();

  // First pass: deduplicate by exact URL
  const byUrl = articles.filter(a => {
    if (seenUrls.has(a.articleUrl)) return false;
    seenUrls.add(a.articleUrl);
    return true;
  });

  // Second pass: keep only one per domain, preferring higher credibility
  for (const article of byUrl) {
    const domain = extractDomain(article.articleUrl);
    const existing = seenDomains.get(domain);
    if (!existing || article.credibilityScore > existing.credibilityScore) {
      seenDomains.set(domain, article);
    }
  }

  return Array.from(seenDomains.values());
}

/**
 * Fetches articles from NewsAPI.org.
 */
async function fetchFromNewsAPI(
  text: string,
  language: Language
): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return []; // Gracefully degrade if not configured

  const langCode = language === 'ro' ? 'ro' : 'en';
  const params = new URLSearchParams({
    q: text.slice(0, 200),
    language: langCode,
    sortBy: 'relevancy',
    pageSize: '10',
    apiKey,
  });

  const response = await fetch(
    `https://newsapi.org/v2/everything?${params.toString()}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!response.ok) return [];

  const data = await response.json() as NewsAPIResponse;
  if (data.status !== 'ok' || !data.articles?.length) return [];

  return data.articles.map((article): NewsArticle => {
    const credibilityScore = getCredibilityScore(article.url);
    const sentiment = detectSentiment(
      article.title,
      article.description ?? '',
      text,
      credibilityScore
    );

    return {
      title: article.title,
      source: article.source.name,
      sourceUrl: extractDomain(article.url),
      articleUrl: article.url,
      publishedAt: article.publishedAt,
      snippet: article.description ?? '',
      sentiment,
      credibilityScore,
    };
  });
}

/**
 * Fetches news articles from Google Custom Search API.
 */
async function fetchFromGoogleSearch(
  text: string,
  language: Language
): Promise<NewsArticle[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  if (!apiKey || !cx) return [];

  // Restrict to credible news domains
  const newsDomains = [
    'digi24.ro', 'g4media.ro', 'hotnews.ro', 'mediafax.ro', 'protv.ro',
    'pressone.ro', 'recorder.ro', 'adevarul.ro',
    'reuters.com', 'apnews.com', 'bbc.com', 'ft.com',
  ].join(' OR site:');

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: `${text.slice(0, 200)} (site:${newsDomains})`,
    lr: language === 'ro' ? 'lang_ro' : 'lang_en',
    num: '8',
    dateRestrict: 'y2', // last 2 years
  });

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!response.ok) return [];

  const data = await response.json() as GoogleSearchResponse;
  if (!data.items?.length) return [];

  return data.items.map((item): NewsArticle => {
    const credibilityScore = getCredibilityScore(item.link);
    const publishedAt =
      item.pagemap?.metatags?.[0]?.['article:published_time'] ??
      item.pagemap?.metatags?.[0]?.['og:updated_time'] ??
      '';

    const sentiment = detectSentiment(item.title, item.snippet, text, credibilityScore);

    return {
      title: item.title,
      source: item.displayLink.replace(/^www\./, ''),
      sourceUrl: `https://${item.displayLink}`,
      articleUrl: item.link,
      publishedAt,
      snippet: item.snippet,
      sentiment,
      credibilityScore,
    };
  });
}

/**
 * Calculates the layer 2 score based on news article sentiment and credibility.
 *
 * Formula:
 *   - No articles → 0.5 (neutral — absence of coverage ≠ false)
 *   - Otherwise: weighted sentiment score, weighted by credibility
 *     confirms → +credibilityScore
 *     contradicts → -credibilityScore  
 *     neutral → 0
 *   - Normalize to 0-1 range
 */
export function calculateLayer2Score(articles: NewsArticle[]): number {
  const relevant = articles.filter(a => a.sentiment !== 'unrelated');
  if (relevant.length === 0) return 0.5;

  let signedScore = 0;
  let totalWeight = 0;

  for (const article of relevant) {
    const weight = article.credibilityScore;
    totalWeight += weight;

    if (article.sentiment === 'confirms') {
      signedScore += weight;
    } else if (article.sentiment === 'contradicts') {
      signedScore -= weight;
    }
    // neutral: contributes nothing
  }

  if (totalWeight === 0) return 0.5;

  // signedScore is in range [-totalWeight, +totalWeight]
  // normalize to [0, 1]
  return (signedScore / totalWeight + 1) / 2;
}

/**
 * Layer 2: News sources (NewsAPI + Google Custom Search)
 * Checks if the claim appears in credible journalistic sources.
 */
export async function runLayer2(
  text: string,
  language: Language
): Promise<Layer2Result> {
  const startTime = Date.now();

  // Run both searches in parallel
  const [newsApiResult, searchResult] = await Promise.allSettled([
    fetchFromNewsAPI(text, language),
    fetchFromGoogleSearch(text, language),
  ]);

  const allArticles: NewsArticle[] = [
    ...(newsApiResult.status === 'fulfilled' ? newsApiResult.value : []),
    ...(searchResult.status === 'fulfilled' ? searchResult.value : []),
  ];

  // Deduplicate
  const unique = deduplicateArticles(allArticles);

  // Sort by: relevance * credibility DESC
  unique.sort((a, b) => b.credibilityScore - a.credibilityScore);

  const layerScore = calculateLayer2Score(unique);

  return {
    status: 'success',
    results: unique.slice(0, 10),
    layerScore,
    processingTime: Date.now() - startTime,
    sourcesChecked: unique.length,
  };
}
