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

export function calculateLayer4Score(posts: SocialMediaPost[]): number {
  if (posts.length === 0) return 0.5;

  const verifiedOriginal = posts.filter((p) => p.isOriginalSource && p.authorVerified);
  if (verifiedOriginal.length > 0) return 0.7;

  const originalSources = posts.filter((p) => p.isOriginalSource);
  if (originalSources.length > 0) return 0.6;

  const verifiedPosts = posts.filter((p) => p.authorVerified);
  if (verifiedPosts.length > 0) return 0.55;

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

/**
 * Searches public statements about the claim on social networks.
 *
 * Runs only when a social search provider is configured (today: the X API).
 * Without one the layer reports itself `skipped` — "does not apply" — instead
 * of `unavailable`: nothing failed, and at 10% of the score its absence should
 * not flag the whole report as an incomplete search. A configured provider
 * that errors is still `unavailable`.
 */
export async function runLayer4(
  text: string,
  language: Language,
  expandedQueries?: ExpandedQueries
): Promise<Layer4Result> {
  const startTime = Date.now();

  if (!process.env.TWITTER_BEARER_TOKEN) {
    return {
      status: 'skipped',
      results: [],
      summary: 'No social media search provider configured',
      layerScore: 0.5,
      processingTime: 0,
    };
  }

  const namedEntities = expandedQueries?.namedEntities || extractNamedEntities(text, language);
  const roQuery = expandedQueries?.romanianQuery || text;

  try {
    return buildLayer4Result(await searchTwitter(roQuery, namedEntities), startTime, text);
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
