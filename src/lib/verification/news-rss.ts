/**
 * Free news search over the public RSS endpoints of Google News and Bing News.
 *
 * These replace the paid search APIs (Tavily, NewsAPI) as the press layer's
 * primary source. Neither needs a key or has a published quota, but neither is
 * a contracted API either: the format can change and a datacenter IP can be
 * throttled. So every search rejects on a real failure (HTTP error, timeout, a
 * body that is not a feed) and resolves to [] only when the feed is genuinely
 * empty — callers run both engines and can tell "search is down" from "nothing
 * was published".
 *
 * What each engine gives, which is why both are queried:
 *  - Bing:   the publisher's real URL and a description, but few items (~7).
 *  - Google: many items (up to ~100) and `site:` filtering, but only a title
 *            and a news.google.com redirect link.
 */

import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';

export interface RssNewsItem {
  title: string;
  /** Publisher URL (Bing) or a news.google.com redirect that opens the article (Google). */
  url: string;
  /** Publisher name as the engine prints it ("Digi24"). */
  sourceName: string;
  /** Publisher host without www ("digi24.ro"), for credibility lookup. */
  sourceDomain: string;
  /** ISO date, or '' when the feed gives none. */
  publishedAt: string;
  /** Article description; falls back to the title when the feed has none. */
  snippet: string;
}

type SearchLanguage = 'ro' | 'en' | 'fr';

const TIMEOUT_MS = 4000;
const MAX_ITEMS = 15;
// Both engines answer a bare server UA with an empty or consent page.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const GOOGLE_EDITION: Record<SearchLanguage, string> = {
  ro: 'hl=ro&gl=RO&ceid=RO:ro',
  en: 'hl=en-US&gl=US&ceid=US:en',
  fr: 'hl=fr&gl=FR&ceid=FR:fr',
};

const BING_MARKET: Record<SearchLanguage, string> = {
  ro: 'setlang=ro&cc=RO',
  en: 'setlang=en&cc=US',
  fr: 'setlang=fr&cc=FR',
};

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(item: string, name: string): string {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function toIso(pubDate: string): string {
  const time = Date.parse(pubDate);
  return Number.isNaN(time) ? '' : new Date(time).toISOString();
}

/** Fetches a feed and splits it into raw <item> blocks; rejects when it is not a feed. */
async function fetchFeedItems(engine: 'google-news' | 'bing-news', url: string): Promise<string[]> {
  const response = await withCircuitBreaker(engine, () =>
    fetchWithRetry(
      url,
      () => ({
        headers: { 'User-Agent': BROWSER_UA, Accept: 'application/rss+xml, application/xml, text/xml' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
      { label: engine, attempts: 1 }
    ).then((res) => {
      if (!res.ok) throw new Error(`${engine} HTTP ${res.status}`);
      return res;
    })
  );

  const xml = await response.text();
  // A consent wall or block page comes back 200 with HTML, which would
  // otherwise read as "no news about this".
  if (!/<rss[\s>]/i.test(xml)) throw new Error(`${engine} returned a non-RSS page`);

  return xml.split(/<item>/i).slice(1, MAX_ITEMS + 1);
}

/**
 * Searches Google News. `sites` restricts results to those domains (and their
 * subdomains), which is how official institutions are searched for free.
 */
export async function searchGoogleNews(
  query: string,
  language: SearchLanguage,
  sites: readonly string[] = []
): Promise<RssNewsItem[]> {
  const terms = query.trim().slice(0, 150);
  if (!terms) return [];

  const siteFilter = sites.length ? ` (${sites.map((s) => `site:${s}`).join(' OR ')})` : '';
  const items = await fetchFeedItems(
    'google-news',
    `https://news.google.com/rss/search?q=${encodeURIComponent(terms + siteFilter)}&${GOOGLE_EDITION[language]}`
  );

  return items.flatMap((item): RssNewsItem[] => {
    const url = tag(item, 'link');
    const sourceName = tag(item, 'source');
    const sourceUrl = item.match(/<source[^>]*url="([^"]+)"/i)?.[1] ?? '';
    // Google appends " - Publisher" to every title.
    const rawTitle = tag(item, 'title');
    const title = sourceName && rawTitle.endsWith(` - ${sourceName}`)
      ? rawTitle.slice(0, -(sourceName.length + 3))
      : rawTitle;
    if (!url || !title) return [];

    return [{
      title,
      url,
      sourceName: sourceName || hostOf(sourceUrl),
      sourceDomain: hostOf(sourceUrl),
      publishedAt: toIso(tag(item, 'pubDate')),
      snippet: title,
    }];
  });
}

/** Searches Bing News. */
export async function searchBingNews(query: string, language: SearchLanguage): Promise<RssNewsItem[]> {
  const terms = query.trim().slice(0, 150);
  if (!terms) return [];

  const items = await fetchFeedItems(
    'bing-news',
    `https://www.bing.com/news/search?q=${encodeURIComponent(terms)}&format=rss&${BING_MARKET[language]}`
  );

  return items.flatMap((item): RssNewsItem[] => {
    const title = tag(item, 'title');
    // Bing links through a click tracker that carries the publisher URL in `url=`.
    const tracker = tag(item, 'link');
    let url = tracker;
    try {
      url = new URL(tracker).searchParams.get('url') ?? tracker;
    } catch {
      /* keep the tracker link */
    }
    if (!url || !title) return [];

    const domain = hostOf(url);
    return [{
      title,
      url,
      sourceName: tag(item, 'News:Source') || domain,
      sourceDomain: domain,
      publishedAt: toIso(tag(item, 'pubDate')),
      snippet: tag(item, 'description') || title,
    }];
  });
}
