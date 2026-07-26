import type { NewsArticle, Language, Layer2Result } from '@/types/verification';
import {
  SOURCE_CREDIBILITY,
  CONTRADICTION_KEYWORDS_RO,
  CONTRADICTION_KEYWORDS_EN,
  CONFIRMATION_KEYWORDS_RO,
  CONFIRMATION_KEYWORDS_EN,
} from './constants';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';

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

  // Debunk framing is checked first and wins outright. An article headlined
  // "no evidence that 5G spreads COVID" is *about* the claim, so it matched on
  // relevance, and it contains enough topic words to trip the confirmation
  // keywords — which previously made coverage debunking a claim read as
  // support for it, inverting the verdict on exactly the well-known
  // disinformation this product exists to catch.
  const DEBUNK_MARKERS = [
    'fals', 'falsă', 'falsa', 'dezinformare', 'dezmințit', 'dezmintit', 'dezmințire',
    'mit', 'mitul', 'nu există dovezi', 'nu exista dovezi', 'fără dovezi', 'fara dovezi',
    'teorie a conspirației', 'teoria conspirației', 'conspirație', 'conspiratie',
    'debunk', 'debunked', 'myth', 'hoax', 'no evidence', 'without evidence',
    'baseless', 'unfounded', 'misinformation', 'disinformation', 'conspiracy theory',
    'fact check', 'fact-check', 'falsely', 'false claim', 'not true',
  ];
  if (DEBUNK_MARKERS.some(kw => combinedText.includes(kw))) return 'contradicts';

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
    const url = a.articleUrl || a.url || '';
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  // Second pass: keep only one per domain, preferring higher credibility
  for (const article of byUrl) {
    const domain = extractDomain(article.articleUrl || article.url || '');
    const existing = seenDomains.get(domain);
    if (!existing || (article.credibilityScore ?? 0) > (existing.credibilityScore ?? 0)) {
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

  let response: Response;
  try {
    response = await withCircuitBreaker('newsapi', () =>
      fetchWithRetry(
        `https://newsapi.org/v2/everything?${params.toString()}`,
        () => ({ signal: AbortSignal.timeout(8000) }),
        { label: 'layer2-newsapi' }
      ).then((res) => {
        if (!res.ok) throw new Error(`NewsAPI error: ${res.status} ${res.statusText}`);
        return res;
      })
    );
  } catch {
    // Circuit open, or the request/retries failed — same graceful
    // degradation as any other NewsAPI failure: this source contributes
    // nothing, Tavily (fetchFromTavily) may still find something.
    return [];
  }

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
 * Fetches news articles from Tavily (full-web search, no domain cap —
 * unlike Google Custom Search, which now restricts new engines to 50
 * domains). No include_domains filter is applied on purpose: we want
 * genuine web-wide coverage, ranked by Tavily's own relevance score,
 * rather than a hand-maintained allowlist.
 * Free tier: 1000 credits/month, 1 credit per `basic` search call.
 */
async function fetchFromTavily(text: string): Promise<NewsArticle[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return []; // Gracefully degrade if not configured

  let response: Response;
  try {
    response = await withCircuitBreaker('tavily', () =>
      fetchWithRetry(
        'https://api.tavily.com/search',
        () => ({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            query: text.slice(0, 400),
            search_depth: 'basic',
            topic: 'news',
            max_results: 10,
          }),
          signal: AbortSignal.timeout(8000),
        }),
        { label: 'layer2-tavily' }
      ).then((res) => {
        if (!res.ok) throw new Error(`Tavily error: ${res.status} ${res.statusText}`);
        return res;
      })
    );
  } catch {
    return [];
  }

  const data = await response.json() as TavilySearchResponse;
  if (!data.results?.length) return [];

  return data.results.map((item): NewsArticle => {
    const credibilityScore = getCredibilityScore(item.url);
    const domain = extractDomain(item.url);
    const sentiment = detectSentiment(item.title, item.content, text, credibilityScore);

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
    const weight = article.credibilityScore ?? 0.5;
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
 * Layer 2: News sources (NewsAPI + Tavily full-web search)
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
    fetchFromTavily(text),
  ]);

  const allArticles: NewsArticle[] = [
    ...(newsApiResult.status === 'fulfilled' ? newsApiResult.value : []),
    ...(searchResult.status === 'fulfilled' ? searchResult.value : []),
  ];

  // Deduplicate
  const unique = deduplicateArticles(allArticles);

  // Sort by: relevance * credibility DESC
  unique.sort((a, b) => (b.credibilityScore ?? 0) - (a.credibilityScore ?? 0));

  const layerScore = calculateLayer2Score(unique);

  return {
    status: 'success',
    articles: unique.slice(0, 10),
    results: unique.slice(0, 10),
    summary: `${unique.length} news articles found`,
    layerScore,
    processingTime: Date.now() - startTime,
    sourcesChecked: unique.length,
  };
}
