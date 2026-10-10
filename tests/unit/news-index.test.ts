jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }));

import { parseFeed, ingestNewsFeeds, searchNewsIndex } from '@/lib/news-index';
import type { NewsFeed } from '@/lib/news-index/feeds';
import { createAdminClient } from '@/lib/supabase/admin';

const NOW = Date.parse('2026-10-10T15:00:00Z');
const NEWS: NewsFeed = { url: 'https://example.ro/feed', source: 'Example', kind: 'news' };

const rss = (items: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>x</title>${items}</channel></rss>`;

describe('parseFeed', () => {
  it('reads an RSS 2.0 item, stripping markup, tracking parameters and double-encoded entities', () => {
    const [row] = parseFeed(
      rss(`<item>
        <title><![CDATA[Damian Drăghici &amp; Brothers, la „Străzi deschise”]]></title>
        <link>https://www.example.ro/stiri/articol-1?utm_source=rss&amp;id=7#comentarii</link>
        <description><![CDATA[<p>Primăria a anunțat închiderea ediției &#8230; <a href="#">citește</a></p> &copy; Example]]></description>
        <pubDate>Sat, 10 Oct 2026 14:40:48 +0000</pubDate>
      </item>`),
      NEWS,
      NOW
    );

    expect(row).toEqual({
      url: 'https://www.example.ro/stiri/articol-1?id=7',
      title: 'Damian Drăghici & Brothers, la „Străzi deschise”',
      snippet: 'Primăria a anunțat închiderea ediției … citește Example',
      source_name: 'Example',
      source_domain: 'example.ro',
      kind: 'news',
      published_at: '2026-10-10T14:40:48.000Z',
    });
  });

  it('reads an Atom entry, preferring the alternate link', () => {
    const [row] = parseFeed(
      `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
        <title>Titlu Atom</title>
        <link rel="self" href="https://example.ro/api/1"/>
        <link rel="alternate" href="https://example.ro/articol-atom"/>
        <summary>Rezumatul articolului.</summary>
        <updated>2026-10-09T08:00:00Z</updated>
      </entry></feed>`,
      NEWS,
      NOW
    );

    expect(row.url).toBe('https://example.ro/articol-atom');
    expect(row.snippet).toBe('Rezumatul articolului.');
    expect(row.published_at).toBe('2026-10-09T08:00:00.000Z');
  });

  it('reads an RDF feed with dc:date', () => {
    const [row] = parseFeed(
      `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
        <item><title>Titlu RDF</title><link>https://example.ro/rdf-1</link><dc:date>2026-10-10T11:29:00Z</dc:date></item>
      </rdf:RDF>`,
      NEWS,
      NOW
    );

    expect(row.title).toBe('Titlu RDF');
    expect(row.published_at).toBe('2026-10-10T11:29:00.000Z');
  });

  it('reads the bare <items> list and day-first date presidency.ro publishes', () => {
    const [row] = parseFeed(
      `<items><item><title><![CDATA[Ședință de lucru]]></title><link>/ro/media/sedinta</link><pubDate>09-10-2026</pubDate></item></items>`,
      { url: 'https://www.presidency.ro/ro/rss', source: 'Administrația Prezidențială', kind: 'official' },
      NOW
    );

    expect(row.url).toBe('https://www.presidency.ro/ro/media/sedinta');
    expect(row.published_at).toBe('2026-10-09T00:00:00.000Z');
  });

  it('dates an item as seen now when its date is unreadable or in the future', () => {
    const rows = parseFeed(
      rss(`<item><title>Fără dată</title><link>https://example.ro/a</link></item>
           <item><title>Din viitor</title><link>https://example.ro/b</link><pubDate>Mon, 01 Jan 2035 00:00:00 GMT</pubDate></item>`),
      NEWS,
      NOW
    );

    expect(rows.map((r) => r.published_at)).toEqual(['2026-10-10T15:00:00.000Z', '2026-10-10T15:00:00.000Z']);
  });

  it('skips items already past their retention, which is longer for fact-checks than for news', () => {
    const old = rss(
      `<item><title>Articol vechi</title><link>https://example.ro/vechi</link><pubDate>Thu, 17 Jul 2025 13:55:04 +0000</pubDate></item>`
    );

    expect(parseFeed(old, NEWS, NOW)).toEqual([]);
    expect(parseFeed(old, { ...NEWS, kind: 'factcheck' }, NOW)).toHaveLength(1);
  });

  it('skips items with no title or no usable link', () => {
    const rows = parseFeed(
      rss(`<item><title></title><link>https://example.ro/a</link></item>
           <item><title>Fără link</title></item>
           <item><title>Link ciudat</title><link>javascript:void(0)</link></item>`),
      NEWS,
      NOW
    );

    expect(rows).toEqual([]);
  });

  it('rejects a document that is not a feed', () => {
    expect(() => parseFeed('<html><body>Just a moment...</body></html>', NEWS, NOW)).toThrow(/not an RSS/);
  });
});

/** A minimal stand-in for the supabase-js query builder, recording what was written. */
function fakeSupabase(options: { existingUrls?: string[]; rpcRows?: unknown[]; rpcError?: string } = {}) {
  const stored = new Set(options.existingUrls ?? []);
  const deletes: Array<{ kind: string; cutoff: string }> = [];
  const client = {
    from: () => ({
      upsert: (rows: Array<{ url: string }>) => ({
        select: () => {
          const fresh = rows.filter((r) => !stored.has(r.url));
          fresh.forEach((r) => stored.add(r.url));
          return Promise.resolve({ data: fresh.map((_, i) => ({ id: i })), error: null });
        },
      }),
      delete: () => ({
        eq: (_col: string, kind: string) => ({
          lt: (_c: string, cutoff: string) => {
            deletes.push({ kind, cutoff });
            return Promise.resolve({ count: kind === 'news' ? 3 : 0, error: null });
          },
        }),
      }),
    }),
    rpc: jest.fn(() =>
      Promise.resolve(
        options.rpcError
          ? { data: null, error: { message: options.rpcError } }
          : { data: options.rpcRows ?? [], error: null }
      )
    ),
  };
  (createAdminClient as jest.Mock).mockReturnValue(client);
  return { client, stored, deletes };
}

describe('ingestNewsFeeds', () => {
  const originalFetch = global.fetch;
  const fresh = (path: string) =>
    `<item><title>Titlu ${path}</title><link>https://example.ro/${path}</link><pubDate>${new Date().toUTCString()}</pubDate></item>`;
  const feedResponse = (body: string, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('stores only the items the index does not have yet, and prunes each kind by its own retention', async () => {
    const { stored, deletes } = fakeSupabase({ existingUrls: ['https://example.ro/a'] });
    global.fetch = jest.fn().mockResolvedValue(feedResponse(rss(fresh('a') + fresh('b'))));

    const report = await ingestNewsFeeds([NEWS]);

    expect(report).toMatchObject({ feeds: 1, failedFeeds: [], seen: 2, inserted: 1, pruned: 3 });
    expect(stored.has('https://example.ro/b')).toBe(true);
    expect(deletes.map((d) => d.kind).sort()).toEqual(['factcheck', 'news', 'official']);
  });

  it('keeps going when one feed is down, and names it in the report', async () => {
    fakeSupabase();
    global.fetch = jest
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(url.includes('broken') ? feedResponse('', 503) : feedResponse(rss(fresh('c'))))
      );

    const report = await ingestNewsFeeds([NEWS, { url: 'https://broken.ro/feed', source: 'Broken', kind: 'news' }]);

    expect(report.inserted).toBe(1);
    expect(report.failedFeeds).toEqual([{ source: 'Broken', error: 'HTTP 503' }]);
  });

  it('counts an article syndicated by two feeds once', async () => {
    fakeSupabase();
    global.fetch = jest.fn().mockResolvedValue(feedResponse(rss(fresh('same'))));

    const report = await ingestNewsFeeds([NEWS, { ...NEWS, url: 'https://example.ro/feed2' }]);

    expect(report.seen).toBe(1);
  });
});

describe('searchNewsIndex', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it('returns stored matches in the shape the RSS engines use', async () => {
    const { client } = fakeSupabase({
      rpcRows: [
        {
          url: 'https://digi24.ro/a',
          title: 'TVA crește la 21%',
          snippet: '',
          source_name: 'Digi24',
          source_domain: 'digi24.ro',
          kind: 'news',
          published_at: '2025-07-01T00:00:00Z',
          rank: 3.8,
        },
      ],
    });

    const items = await searchNewsIndex('TVA România 21%');

    expect(client.rpc).toHaveBeenCalledWith('search_news_index', { p_query: 'TVA România 21%', p_limit: 12 });
    expect(items).toEqual([
      {
        title: 'TVA crește la 21%',
        url: 'https://digi24.ro/a',
        sourceName: 'Digi24',
        sourceDomain: 'digi24.ro',
        publishedAt: '2025-07-01T00:00:00Z',
        snippet: 'TVA crește la 21%',
      },
    ]);
  });

  it('rejects when the database call fails, so a broken index is not mistaken for an empty one', async () => {
    fakeSupabase({ rpcError: 'function search_news_index does not exist' });

    await expect(searchNewsIndex('orice')).rejects.toThrow(/does not exist/);
  });

  it('resolves to nothing, without a database call, when no database is configured', async () => {
    const { client } = fakeSupabase();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(searchNewsIndex('orice')).resolves.toEqual([]);
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
