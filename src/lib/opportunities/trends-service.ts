import { XMLParser } from 'fast-xml-parser';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import type { OpportunityStatus, Database } from '@/types/database';

export interface RawOpportunity {
  title: string;
  source_url: string;
  source_name: 'Google Trends' | 'Google News';
  trend_rank: number | null;
}

export interface IngestionSummary {
  success: boolean;
  totalFetched: number;
  inserted: number;
  skippedDuplicates: number;
  errors: string[];
}

const REQUEST_TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 VerifactBot/1.0';

interface GoogleTrendsNewsItemNode {
  'ht:news_item_title'?: string;
  'ht:news_item_url'?: string;
  'ht:news_item_source'?: string;
}

interface GoogleTrendsItemNode {
  title?: string;
  link?: string;
  'ht:approx_traffic'?: string;
  'ht:news_item'?: GoogleTrendsNewsItemNode | GoogleTrendsNewsItemNode[];
}

interface GoogleNewsItemNode {
  title?: string;
  link?: string;
  source?: string | { '#text'?: string };
}

interface RSSFeedChannel<T> {
  item?: T | T[];
}

interface RSSFeedDocument<T> {
  rss?: {
    channel?: RSSFeedChannel<T>;
  };
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  trimValues: true,
});

/**
 * Executes an HTTP fetch with an explicit timeout (max 10s per guidelines).
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches and parses Google Trends Daily RSS for Romania.
 * Tries the modern endpoint first, falling back to legacy if necessary.
 */
export async function fetchGoogleTrendsRO(): Promise<RawOpportunity[]> {
  const urls = [
    'https://trends.google.com/trending/rss?geo=RO',
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=RO',
  ];

  let xmlText: string | null = null;
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        xmlText = await res.text();
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!xmlText) {
    logger.error('Failed to fetch Google Trends RSS for Romania', {
      service: 'ContentOpportunities',
      error: lastError?.message ?? 'HTTP Error',
    });
    return [];
  }

  try {
    const parsed = xmlParser.parse(xmlText) as RSSFeedDocument<GoogleTrendsItemNode>;
    const channel = parsed.rss?.channel;
    if (!channel?.item) {
      return [];
    }

    const rawItems: GoogleTrendsItemNode[] = Array.isArray(channel.item)
      ? channel.item
      : [channel.item];

    const opportunities: RawOpportunity[] = [];

    rawItems.forEach((item, index) => {
      const termTitle = item.title?.trim();
      if (!termTitle) return;

      const rank = index + 1;
      const trendUrl = item.link || `https://trends.google.com/trending?geo=RO`;

      // 1. Add main trending search query
      opportunities.push({
        title: termTitle,
        source_url: trendUrl,
        source_name: 'Google Trends',
        trend_rank: rank,
      });

      // 2. Add embedded news items from Google Trends feed if available
      if (item['ht:news_item']) {
        const embeddedNews: GoogleTrendsNewsItemNode[] = Array.isArray(item['ht:news_item'])
          ? item['ht:news_item']
          : [item['ht:news_item']];

        for (const news of embeddedNews) {
          const newsTitle = news['ht:news_item_title']?.trim();
          const newsUrl = news['ht:news_item_url']?.trim();
          if (newsTitle && newsUrl) {
            opportunities.push({
              title: newsTitle,
              source_url: newsUrl,
              source_name: 'Google News',
              trend_rank: rank,
            });
          }
        }
      }
    });

    return opportunities;
  } catch (err) {
    logger.error('Failed to parse Google Trends XML', {
      service: 'ContentOpportunities',
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Fetches Google News RSS search results for a specific trending query in Romanian.
 */
export async function fetchGoogleNewsForTerm(
  term: string,
  trendRank: number | null = null,
  limit: number = 3
): Promise<RawOpportunity[]> {
  const query = encodeURIComponent(term.trim());
  const url = `https://news.google.com/rss/search?q=${query}&hl=ro&gl=RO&ceid=RO:ro`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return [];
    }

    const xmlText = await res.text();
    const parsed = xmlParser.parse(xmlText) as RSSFeedDocument<GoogleNewsItemNode>;
    const channel = parsed.rss?.channel;
    if (!channel?.item) {
      return [];
    }

    const rawItems: GoogleNewsItemNode[] = Array.isArray(channel.item)
      ? channel.item
      : [channel.item];

    const opportunities: RawOpportunity[] = [];

    for (const item of rawItems.slice(0, limit)) {
      const title = item.title?.trim();
      const link = item.link?.trim();

      if (title && link) {
        opportunities.push({
          title,
          source_url: link,
          source_name: 'Google News',
          trend_rank: trendRank,
        });
      }
    }

    return opportunities;
  } catch (err) {
    logger.warn('Failed to fetch Google News RSS for term', {
      service: 'ContentOpportunities',
      term,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Aggregates trending searches and related news for Romania.
 * Uses Promise.allSettled for robust concurrent fetching.
 */
export async function aggregateDailyOpportunities(): Promise<RawOpportunity[]> {
  const trends = await fetchGoogleTrendsRO();
  if (trends.length === 0) {
    return [];
  }

  // Extract top search terms from Google Trends items
  const mainTerms = trends.filter((t) => t.source_name === 'Google Trends');
  const topTermsToQuery = mainTerms.slice(0, 10);

  const newsPromises = topTermsToQuery.map((trend) =>
    fetchGoogleNewsForTerm(trend.title, trend.trend_rank, 3)
  );

  const newsResults = await Promise.allSettled(newsPromises);

  const aggregated: RawOpportunity[] = [...trends];

  for (const res of newsResults) {
    if (res.status === 'fulfilled' && res.value.length > 0) {
      aggregated.push(...res.value);
    }
  }

  return aggregated;
}

/**
 * Saves candidate opportunities into public.content_opportunities.
 * Deduplicates against opportunities fetched earlier today (by title).
 */
export async function saveOpportunities(
  candidates: RawOpportunity[]
): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    success: true,
    totalFetched: candidates.length,
    inserted: 0,
    skippedDuplicates: 0,
    errors: [],
  };

  if (candidates.length === 0) {
    return summary;
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Supabase admin client initialization failed';
    summary.success = false;
    summary.errors.push(msg);
    logger.error('Failed to initialize admin client for content opportunities', {
      service: 'ContentOpportunities',
      error: msg,
    });
    return summary;
  }

  // 1. Fetch titles inserted today to avoid duplicates
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data: existingRows, error: selectError } = await adminClient
    .from('content_opportunities')
    .select('title')
    .gte('fetched_at', startOfDay.toISOString());

  if (selectError) {
    logger.error('Error fetching today existing content opportunities', {
      service: 'ContentOpportunities',
      error: selectError.message,
    });
    summary.errors.push(`Select error: ${selectError.message}`);
  }

  const existingTitles = new Set<string>(
    (existingRows ?? []).map((row: { title: string }) => row.title.trim().toLowerCase())
  );

  const seenBatchTitles = new Set<string>();
  const toInsert: Database['public']['Tables']['content_opportunities']['Insert'][] = [];

  for (const candidate of candidates) {
    const cleanTitle = candidate.title.trim();
    const normalized = cleanTitle.toLowerCase();

    if (!cleanTitle || existingTitles.has(normalized) || seenBatchTitles.has(normalized)) {
      summary.skippedDuplicates += 1;
      continue;
    }

    seenBatchTitles.add(normalized);
    toInsert.push({
      title: cleanTitle,
      source_url: candidate.source_url,
      source_name: candidate.source_name,
      trend_rank: candidate.trend_rank,
      status: 'new',
    });
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await (adminClient.from('content_opportunities') as unknown as {
      insert: (data: typeof toInsert) => Promise<{ error: { message: string } | null }>;
    }).insert(toInsert);

    if (insertError) {
      summary.success = false;
      summary.errors.push(`Insert error: ${insertError.message}`);
      logger.error('Failed to insert content opportunities', {
        service: 'ContentOpportunities',
        error: insertError.message,
      });
    } else {
      summary.inserted = toInsert.length;
      logger.info('Content opportunities inserted successfully', {
        service: 'ContentOpportunities',
        inserted: summary.inserted,
        skipped: summary.skippedDuplicates,
      });
    }
  }

  return summary;
}
