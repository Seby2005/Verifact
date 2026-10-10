/**
 * Verifact's own news index: headlines collected from the RSS feeds of
 * Romanian outlets, fact-checkers and institutions, stored in Supabase and
 * searched there.
 *
 * It exists so the press layer has one source that no third party can
 * throttle, reprice or reformat. Two operations, and everything else (feed
 * formats, date dialects, URL clean-up, retention, the SQL) stays in here:
 *
 *  - `ingestNewsFeeds()`  run on a schedule; reads every feed, stores what is
 *                         new, drops what has aged out.
 *  - `searchNewsIndex()`  run per verification; returns the best-matching
 *                         stored items in the same shape as the RSS engines.
 *
 * The table and its search function come from migration 020_news_index.sql.
 * Until that migration is applied a search rejects, which the press layer
 * treats like any other provider being down.
 */

import { XMLParser } from 'fast-xml-parser';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import type { NewsIndexInsert, NewsIndexRow } from '@/types/database';
import type { RssNewsItem } from '@/lib/verification/news-rss';
import { NEWS_FEEDS, type NewsFeed } from './feeds';

/**
 * How long an item stays searchable, by kind. News is plentiful and ages fast;
 * fact-checks and communiqués are scarce and stay relevant.
 *
 * The news figure is a storage budget, not a preference: the feeds bring
 * roughly 1,000-1,500 new headlines a day at 2-2.5 KB each with indexes
 * (measured on a live sample), so 30 days stays under about 100 MB of the
 * database's 500 MB free tier. Older coverage is what the Google/Bing
 * searches and Wikipedia are for.
 */
const RETENTION_DAYS: Record<NewsFeed['kind'], number> = { news: 30, factcheck: 730, official: 365 };

const FEED_TIMEOUT_MS = 8000;
const INSERT_CHUNK = 500;
const MAX_TITLE_CHARS = 300;
const MAX_SNIPPET_CHARS = 250;
const USER_AGENT = 'Mozilla/5.0 (compatible; VerifactBot/1.0; +https://github.com/Seby2005/Verifact)';
const DAY_MS = 86_400_000;

const xmlParser = new XMLParser({ ignoreAttributes: false, trimValues: true, htmlEntities: true });

export interface IngestReport {
  feeds: number;
  /** Feeds that could not be read this run, with the reason. */
  failedFeeds: Array<{ source: string; error: string }>;
  /** Items found across all feeds that are recent enough to keep. */
  seen: number;
  /** Of those, how many were not in the index yet. */
  inserted: number;
  /** Rows removed for having aged past their retention. */
  pruned: number;
}

function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * The service-role client, untyped: the hand-maintained Database type does not
 * drive supabase-js inference (see db-operations.ts), so results are typed
 * here against the row shape migration 020 defines.
 */
function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/* ----------------------------- feed parsing ------------------------------ */

type XmlNode = Record<string, unknown>;

function child(node: unknown, key: string): unknown {
  return node && typeof node === 'object' ? (node as XmlNode)[key] : undefined;
}

/** A parsed XML node's text: plain string, or the `#text` of a node that also carries attributes. */
function textOf(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return textOf(node[0]);
  if (node && typeof node === 'object') return textOf((node as Record<string, unknown>)['#text']);
  return '';
}

/**
 * Tag-free text. Entities are decoded again here because many feeds
 * double-encode them ("&amp;amp;", "&amp;#8230;"), which the XML parser
 * rightly leaves as literal "&amp;" / "&#8230;" text.
 */
function plainText(html: string, maxChars: number): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    // Whatever named entity is left ("&copy;") is decoration, not content.
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

/** RSS has `<link>url</link>`; Atom has one or more `<link href rel>`. */
function linkOf(node: unknown): string {
  if (Array.isArray(node)) {
    const alternate = node.find((n) => (n as Record<string, unknown>)?.['@_rel'] === 'alternate') ?? node[0];
    return linkOf(alternate);
  }
  if (node && typeof node === 'object') {
    const href = (node as Record<string, unknown>)['@_href'];
    return typeof href === 'string' ? href : textOf(node);
  }
  return textOf(node);
}

/**
 * Feeds disagree on dates: RFC 822, ISO 8601, "2026-10-09 15:58:00" and
 * "09-10-2026" all occur in the wild. An unreadable or future date falls back
 * to now — the item was, at the latest, published when we saw it.
 */
function parseFeedDate(raw: string, now: number): Date {
  const dayFirst = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const time = dayFirst ? Date.parse(`${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`) : Date.parse(raw);
  return Number.isNaN(time) || time > now + DAY_MS ? new Date(now) : new Date(time);
}

/** Absolute URL without fragment or tracking parameters, so one article is one row. */
function canonicalUrl(link: string, feedUrl: string): string | null {
  // An empty link would resolve to the feed's own address.
  if (!link.trim()) return null;
  try {
    const url = new URL(link.trim(), feedUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
}

/** Turns one feed document (RSS 2.0, RDF, Atom or a bare <items> list) into rows, keeping only items still within retention. */
export function parseFeed(xml: string, feed: NewsFeed, now: number = Date.now()): NewsIndexInsert[] {
  const doc = xmlParser.parse(xml) as XmlNode;
  const rawItems =
    child(child(doc.rss, 'channel'), 'item') ??
    child(doc['rdf:RDF'], 'item') ??
    child(doc.feed, 'entry') ??
    child(doc.items, 'item'); // presidency.ro's home-grown root
  if (rawItems === undefined) throw new Error('not an RSS or Atom feed');

  const oldest = now - RETENTION_DAYS[feed.kind] * DAY_MS;
  const rows: NewsIndexInsert[] = [];

  for (const item of (Array.isArray(rawItems) ? rawItems : [rawItems]) as XmlNode[]) {
    const title = plainText(textOf(item.title), MAX_TITLE_CHARS);
    const url = canonicalUrl(linkOf(item.link), feed.url);
    if (!title || !url) continue;

    const published = parseFeedDate(textOf(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']), now);
    if (published.getTime() < oldest) continue;

    rows.push({
      url,
      title,
      snippet: plainText(
        textOf(item.description ?? item.summary ?? item['content:encoded'] ?? item.content),
        MAX_SNIPPET_CHARS
      ),
      source_name: feed.source,
      source_domain: hostOf(url),
      kind: feed.kind,
      published_at: published.toISOString(),
    });
  }
  return rows;
}

async function readFeed(feed: NewsFeed): Promise<NewsIndexInsert[]> {
  const response = await fetch(feed.url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseFeed(await response.text(), feed);
}

/* ------------------------------- ingestion ------------------------------- */

/**
 * Reads every feed, stores the items the index does not have yet, and removes
 * the ones past their retention. One unreadable feed never stops the others.
 * Throws only when the database itself cannot be written.
 */
export async function ingestNewsFeeds(feeds: readonly NewsFeed[] = NEWS_FEEDS): Promise<IngestReport> {
  const settled = await Promise.allSettled(feeds.map(readFeed));

  const failedFeeds: IngestReport['failedFeeds'] = [];
  const byUrl = new Map<string, NewsIndexInsert>();
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      for (const row of result.value) if (!byUrl.has(row.url)) byUrl.set(row.url, row);
    } else {
      const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
      failedFeeds.push({ source: feeds[i].source, error });
      logger.warn('News feed could not be read', { service: 'news-index', feed: feeds[i].url, error });
    }
  });

  const supabase = db();
  const rows = [...byUrl.values()];
  let inserted = 0;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    // ON CONFLICT DO NOTHING: an article already indexed keeps its first-seen
    // row, and only the genuinely new ones come back from the select.
    const { data, error } = await supabase
      .from('news_index')
      .upsert(rows.slice(i, i + INSERT_CHUNK), { onConflict: 'url', ignoreDuplicates: true })
      .select('id');
    if (error) throw new Error(`news_index insert failed: ${error.message}`);
    inserted += data?.length ?? 0;
  }

  let pruned = 0;
  for (const kind of Object.keys(RETENTION_DAYS) as Array<NewsFeed['kind']>) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS[kind] * DAY_MS).toISOString();
    const { count, error } = await supabase
      .from('news_index')
      .delete({ count: 'exact' })
      .eq('kind', kind)
      .lt('published_at', cutoff);
    if (error) throw new Error(`news_index prune failed: ${error.message}`);
    pruned += count ?? 0;
  }

  return { feeds: feeds.length, failedFeeds, seen: rows.length, inserted, pruned };
}

/* -------------------------------- search --------------------------------- */

/**
 * The stored items that best match the query, most relevant first.
 *
 * Resolves to [] when the index cannot run here at all (no database
 * configured) or simply has no match; rejects when the database call fails,
 * so the caller can tell an empty index from a broken one.
 */
export async function searchNewsIndex(query: string, limit: number = 12): Promise<RssNewsItem[]> {
  const terms = query.trim().slice(0, 300);
  if (!terms || !isConfigured()) return [];

  const { data, error } = await db().rpc('search_news_index', { p_query: terms, p_limit: limit });
  if (error) throw new Error(`news index search failed: ${error.message}`);

  return ((data ?? []) as NewsIndexRow[]).map((row) => ({
    title: row.title,
    url: row.url,
    sourceName: row.source_name,
    sourceDomain: row.source_domain,
    publishedAt: row.published_at,
    snippet: row.snippet || row.title,
  }));
}

/**
 * When the index last received an item, or null if it is empty. A stale value
 * means the scheduled ingestion has stopped running.
 */
export async function newsIndexLastUpdate(): Promise<Date | null> {
  const { data, error } = await db()
    .from('news_index')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(`news index is not readable: ${error.message}`);
  const newest = (data as Array<Pick<NewsIndexRow, 'fetched_at'>> | null)?.[0];
  return newest ? new Date(newest.fetched_at) : null;
}
