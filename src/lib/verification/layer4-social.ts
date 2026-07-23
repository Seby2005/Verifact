import type { SocialMediaPost, Language, Layer4Result } from '@/types/verification';
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

/**
 * Extracts named entities (Romanian public figures) mentioned in the text.
 */
export function extractNamedEntities(text: string, _language: Language): string[] {
  const textLower = text.toLowerCase();
  return ROMANIAN_PUBLIC_FIGURES.filter(name =>
    textLower.includes(name.toLowerCase())
  );
}

/**
 * Searches Twitter/X API for relevant posts.
 */
async function searchTwitter(
  text: string,
  namedEntities: string[]
): Promise<SocialMediaPost[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) throw new Error('Twitter API not configured');

  // Build query: search for the entities mentioned
  const entityQuery = namedEntities
    .map(e => `"${e}"`)
    .slice(0, 3)
    .join(' OR ');

  const query = entityQuery || text.slice(0, 100);

  const params = new URLSearchParams({
    query: `${query} is:verified lang:ro OR lang:en`,
    'tweet.fields': 'created_at,author_id',
    'user.fields': 'name,username,verified,description',
    expansions: 'author_id',
    max_results: '10',
  });

  const response = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) throw new Error(`Twitter API error: ${response.status}`);

  const data = await response.json() as TwitterSearchResponse;
  const tweets = data.data ?? [];
  const users = data.includes?.users ?? [];

  const userMap = new Map(users.map(u => [u.id, u]));

  return tweets.map((tweet): SocialMediaPost => {
    const user = tweet.author_id ? userMap.get(tweet.author_id) : undefined;
    return {
      platform: 'twitter',
      author: user?.name ?? 'Unknown',
      authorVerified: user?.verified ?? false,
      authorRole: user?.description?.slice(0, 100),
      postUrl: `https://twitter.com/${user?.username ?? 'i'}/status/${tweet.id}`,
      postDate: tweet.created_at ?? '',
      content: tweet.text,
      isOriginalSource: namedEntities.some(e =>
        (user?.name ?? '').toLowerCase().includes(e.toLowerCase())
      ),
    };
  });
}

/**
 * Searches social media via Google Custom Search as a fallback.
 */
async function searchSocialViaGoogle(
  text: string,
  namedEntities: string[]
): Promise<SocialMediaPost[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  if (!apiKey || !cx) return [];

  const entityQuery = namedEntities.slice(0, 2).join(' ');
  const searchQuery = `${entityQuery || text.slice(0, 100)} (site:twitter.com OR site:facebook.com OR site:youtube.com)`;

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: searchQuery,
    num: '8',
  });

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!response.ok) return [];

  const data = await response.json() as GoogleSearchResponse;
  const items = data.items ?? [];

  return items.map((item): SocialMediaPost => {
    const platform = determinePlatform(item.link);
    const isOriginal = namedEntities.some(e =>
      item.title.toLowerCase().includes(e.toLowerCase())
    );

    return {
      platform,
      author: extractSocialAuthor(item.title),
      authorVerified: false,
      postUrl: item.link,
      postDate:
        item.pagemap?.metatags?.[0]?.['article:published_time'] ??
        item.pagemap?.metatags?.[0]?.['og:updated_time'] ??
        '',
      content: item.snippet,
      isOriginalSource: isOriginal,
    };
  });
}

function determinePlatform(url: string): SocialMediaPost['platform'] {
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
}

function extractSocialAuthor(title: string): string {
  // Try to extract author from common patterns like "Name on Twitter: ..."
  const match = title.match(/^([^:]+):/);
  if (match) return match[1].trim();
  return title.slice(0, 50);
}

function buildLayer4Result(
  results: SocialMediaPost[],
  startTime: number
): Layer4Result {
  const layerScore = calculateLayer4Score(results);
  return {
    status: results.length > 0 ? 'success' : 'success',
    results: results.slice(0, 8),
    layerScore,
    processingTime: Date.now() - startTime,
  };
}

function calculateLayer4Score(posts: SocialMediaPost[]): number {
  if (posts.length === 0) return 0.5; // neutral

  // Weight verified accounts more
  const verifiedPosts = posts.filter(p => p.authorVerified);
  const unverifiedPosts = posts.filter(p => !p.authorVerified);

  // Original sources get the highest weight
  const originalSources = posts.filter(p => p.isOriginalSource);
  if (originalSources.length > 0) return 0.7; // Original source found — tends to confirm

  if (verifiedPosts.length > 0) return 0.6;
  if (unverifiedPosts.length > 0) return 0.5;

  return 0.5;
}

/**
 * Layer 4: Social media and public declarations
 * Verifies if attributed statements were actually made by the claimed person.
 */
export async function runLayer4(
  text: string,
  language: Language
): Promise<Layer4Result> {
  const startTime = Date.now();

  // Extract named entities (public figures) from text
  const namedEntities = extractNamedEntities(text, language);

  if (namedEntities.length === 0) {
    // No public figures mentioned — layer is not applicable
    return {
      status: 'skipped',
      results: [],
      layerScore: 0.5, // neutral
      processingTime: Date.now() - startTime,
    };
  }

  // Try Twitter API first
  if (process.env.TWITTER_BEARER_TOKEN) {
    try {
      const results = await searchTwitter(text, namedEntities);
      return buildLayer4Result(results, startTime);
    } catch {
      // Twitter API failed, fall through to Google Search
    }
  }

  // Fallback: Google Custom Search on social media
  try {
    const results = await searchSocialViaGoogle(text, namedEntities);
    return buildLayer4Result(results, startTime);
  } catch (error) {
    return {
      status: 'unavailable',
      results: [],
      layerScore: 0.5,
      processingTime: Date.now() - startTime,
      error: `Social media search unavailable: ${String(error)}`,
    };
  }
}
