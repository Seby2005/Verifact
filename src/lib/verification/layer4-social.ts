import type { SocialMediaPost, Language, Layer4Result } from '@/types/verification';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { isRelevantToClaim } from './relevance';
import type { ExpandedQueries } from './query-expander';
import { ROMANIAN_PUBLIC_FIGURES } from './constants';

interface TwitterSearchResponse {
  data?: Array<{
    id: string;
    text: string;
    created_at?: string;
    author_id?: string;
  }>;
  includes?: {
    users?: Array<{
      id: string;
      name: string;
      username: string;
      verified?: boolean;
      description?: string;
    }>;
  };
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

const SOCIAL_DOMAINS = [
  'twitter.com',
  'x.com',
  'facebook.com',
  'youtube.com',
  'instagram.com',
  'reddit.com',
  'threads.net',
  'bsky.app',
  'linkedin.com',
];

export function extractNamedEntities(text: string, _language?: Language): string[] {
  const textLower = text.toLowerCase();
  const known = ROMANIAN_PUBLIC_FIGURES.filter((name) =>
    textLower.includes(name.toLowerCase())
  );
  const capitalized = text.match(/\b[A-ZĂÂÎȘȚ][a-zăâîșțA-ZĂÂÎȘȚ0-9\-]{2,}\b/g) || [];
  const dynamicEntities = Array.from(new Set(capitalized)).filter(
    (e) => !['Imaginea', 'Afirmația', 'Stirea', 'Poza'].includes(e)
  );

  return Array.from(new Set([...known, ...dynamicEntities]));
}

function determinePlatform(url: string): SocialMediaPost['platform'] {
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
}

function extractSocialAuthor(title: string, url: string): string {
  const match = title.match(/^([^:|–—]+)[:|–—]/);
  if (match && match[1].trim().length < 40) {
    return match[1].trim();
  }
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length > 0 && !['posts', 'watch', 'status', 'p'].includes(parts[0])) {
      return `@${parts[0]}`;
    }
  } catch {
    /* fallback */
  }
  return title.slice(0, 40);
}

async function searchTwitter(
  queryStr: string,
  namedEntities: string[]
): Promise<SocialMediaPost[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) throw new Error('Twitter API not configured');

  const query = namedEntities.length > 0 ? namedEntities.map((e) => `"${e}"`).join(' OR ') : queryStr;

  const params = new URLSearchParams({
    query: `${query.slice(0, 100)} lang:ro OR lang:en`,
    'tweet.fields': 'created_at,author_id',
    'user.fields': 'name,username,verified,description',
    expansions: 'author_id',
    max_results: '10',
  });

  const response = await withCircuitBreaker('twitter', () =>
    fetchWithRetry(
      `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`,
      () => ({
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(8000),
      }),
      { label: 'layer4-twitter' }
    ).then((res) => {
      if (!res.ok) throw new Error(`Twitter API error: ${res.status}`);
      return res;
    })
  );

  const data = (await response.json()) as TwitterSearchResponse;
  const tweets = data.data ?? [];
  const users = data.includes?.users ?? [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return tweets.map((tweet): SocialMediaPost => {
    const user = tweet.author_id ? userMap.get(tweet.author_id) : undefined;
    return {
      platform: 'twitter',
      author: user?.name ?? 'Utilizator',
      authorVerified: user?.verified ?? false,
      authorRole: user?.description?.slice(0, 100),
      postUrl: `https://twitter.com/${user?.username ?? 'i'}/status/${tweet.id}`,
      postDate: tweet.created_at ?? '',
      content: tweet.text,
      isOriginalSource: namedEntities.some((e) =>
        (user?.name ?? '').toLowerCase().includes(e.toLowerCase())
      ),
    };
  });
}

async function searchSocialViaTavily(
  queryStr: string,
  namedEntities: string[]
): Promise<SocialMediaPost[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !queryStr.trim()) return [];

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
            query: queryStr.slice(0, 300),
            search_depth: 'basic',
            max_results: 10,
            include_domains: SOCIAL_DOMAINS,
          }),
          signal: AbortSignal.timeout(8000),
        }),
        { label: 'layer4-tavily' }
      ).then((res) => {
        if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
        return res;
      })
    );

    const data = (await response.json()) as TavilySearchResponse;
    const items = data.results ?? [];

    return items.map((item): SocialMediaPost => {
      const platform = determinePlatform(item.url);
      const isOriginal = namedEntities.some((e) =>
        item.title.toLowerCase().includes(e.toLowerCase())
      );

      return {
        platform,
        author: extractSocialAuthor(item.title, item.url),
        authorVerified: item.url.includes('twitter.com') || item.url.includes('facebook.com'),
        postUrl: item.url,
        postDate: item.published_date ?? '',
        content: item.content,
        isOriginalSource: isOriginal,
      };
    });
  } catch {
    return [];
  }
}

export function calculateLayer4Score(posts: SocialMediaPost[]): number {
  if (posts.length === 0) return 0.5;

  const verifiedPosts = posts.filter((p) => p.authorVerified);
  const originalSources = posts.filter((p) => p.isOriginalSource);

  if (originalSources.length > 0) return 0.7;
  if (verifiedPosts.length > 0) return 0.6;
  return 0.5;
}

function buildLayer4Result(
  results: SocialMediaPost[],
  startTime: number,
  claim: string
): Layer4Result {
  const relevant = results.filter((p) =>
    isRelevantToClaim(claim, `${p.author} ${p.content}`)
  );

  const layerScore = calculateLayer4Score(relevant);
  return {
    status: 'success',
    posts: relevant.slice(0, 8),
    results: relevant.slice(0, 8),
    summary: `${relevant.length} social media posts found`,
    layerScore,
    processingTime: Date.now() - startTime,
  };
}

export async function runLayer4(
  text: string,
  language: Language,
  expandedQueries?: ExpandedQueries
): Promise<Layer4Result> {
  const startTime = Date.now();

  const namedEntities = expandedQueries?.namedEntities || extractNamedEntities(text, language);
  const roQuery = expandedQueries?.romanianQuery || text;
  const enQuery = expandedQueries?.englishQuery || text;

  if (process.env.TWITTER_BEARER_TOKEN) {
    try {
      const results = await searchTwitter(roQuery, namedEntities);
      if (results.length > 0) {
        return buildLayer4Result(results, startTime, text);
      }
    } catch {
      /* Fallback to Tavily */
    }
  }

  try {
    const [roPosts, enPosts] = await Promise.all([
      searchSocialViaTavily(roQuery, namedEntities),
      searchSocialViaTavily(enQuery, namedEntities),
    ]);

    const seen = new Set<string>();
    const allPosts = [...roPosts, ...enPosts].filter((p) => {
      const url = p.postUrl ?? p.content ?? '';
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });

    return buildLayer4Result(allPosts, startTime, text);
  } catch (error) {
    return {
      status: 'unavailable',
      results: [],
      summary: 'Social media search unavailable',
      layerScore: 0.5,
      processingTime: Date.now() - startTime,
      error: `Social media search unavailable: ${String(error)}`,
    };
  }
}
