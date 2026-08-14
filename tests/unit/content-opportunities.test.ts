import {
  fetchGoogleTrendsRO,
  fetchGoogleNewsForTerm,
  aggregateDailyOpportunities,
  saveOpportunities,
  type RawOpportunity,
} from '@/lib/opportunities/trends-service';
import { GET, POST } from '@/app/api/cron/content-opportunities/route';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

const MOCK_GOOGLE_TRENDS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:ht="https://trends.google.com/trending/rss">
  <channel>
    <title>Daily Search Trends</title>
    <item>
      <title>Alegeri Prezidentiale</title>
      <ht:approx_traffic>50K+</ht:approx_traffic>
      <link>https://trends.google.com/trending/rss?geo=RO</link>
      <ht:news_item>
        <ht:news_item_title>Campania electorala a intrat pe ultima suta de metri</ht:news_item_title>
        <ht:news_item_url>https://stiri.example.ro/campanie-electorala</ht:news_item_url>
        <ht:news_item_source>Stiri Oficiale</ht:news_item_source>
      </ht:news_item>
    </item>
    <item>
      <title>Meci Romania</title>
      <ht:approx_traffic>20K+</ht:approx_traffic>
      <link>https://trends.google.com/trending/rss?geo=RO</link>
    </item>
  </channel>
</rss>`;

const MOCK_GOOGLE_NEWS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Stiri Google - Cautare</title>
    <item>
      <title>Declaratie soc privind noile taxe in 2026 - Adevarul</title>
      <link>https://news.google.com/articles/12345</link>
    </item>
    <item>
      <title>Guvernul anunta modificari majore - HotNews</title>
      <link>https://news.google.com/articles/67890</link>
    </item>
    <item>
      <title>Analiza economica amanuntita - ZF</title>
      <link>https://news.google.com/articles/11223</link>
    </item>
    <item>
      <title>Articol suplimentar peste limita - Digi24</title>
      <link>https://news.google.com/articles/99999</link>
    </item>
  </channel>
</rss>`;

describe('Content Opportunities Service', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('fetchGoogleTrendsRO', () => {
    it('successfully parses trends and embedded news items from Google Trends RSS', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => MOCK_GOOGLE_TRENDS_XML,
      } as Response);

      const results = await fetchGoogleTrendsRO();

      expect(results).toHaveLength(3); // 2 search terms + 1 embedded news item
      expect(results[0]).toEqual({
        title: 'Alegeri Prezidentiale',
        source_url: 'https://trends.google.com/trending/rss?geo=RO',
        source_name: 'Google Trends',
        trend_rank: 1,
      });
      expect(results[1]).toEqual({
        title: 'Campania electorala a intrat pe ultima suta de metri',
        source_url: 'https://stiri.example.ro/campanie-electorala',
        source_name: 'Google News',
        trend_rank: 1,
      });
      expect(results[2]).toEqual({
        title: 'Meci Romania',
        source_url: 'https://trends.google.com/trending/rss?geo=RO',
        source_name: 'Google Trends',
        trend_rank: 2,
      });
    });

    it('returns empty array when fetch fails or returns non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Error',
      } as Response);

      const results = await fetchGoogleTrendsRO();
      expect(results).toEqual([]);
    });

    it('handles network timeouts / exceptions gracefully without throwing', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network connection timeout'));

      const results = await fetchGoogleTrendsRO();
      expect(results).toEqual([]);
    });
  });

  describe('fetchGoogleNewsForTerm', () => {
    it('fetches and limits news search items for a specific term', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => MOCK_GOOGLE_NEWS_XML,
      } as Response);

      const results = await fetchGoogleNewsForTerm('taxe 2026', 3, 2);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Declaratie soc privind noile taxe in 2026 - Adevarul');
      expect(results[0].source_name).toBe('Google News');
      expect(results[0].trend_rank).toBe(3);
    });

    it('returns empty array if news fetch fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const results = await fetchGoogleNewsForTerm('inexistent');
      expect(results).toEqual([]);
    });
  });

  describe('aggregateDailyOpportunities', () => {
    it('combines Google Trends and related Google News results using Promise.allSettled', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('trends.google.com')) {
          return Promise.resolve({
            ok: true,
            text: async () => MOCK_GOOGLE_TRENDS_XML,
          });
        }
        return Promise.resolve({
          ok: true,
          text: async () => MOCK_GOOGLE_NEWS_XML,
        });
      });

      const aggregated = await aggregateDailyOpportunities();

      expect(aggregated.length).toBeGreaterThan(3);
      expect(aggregated.some((item) => item.source_name === 'Google Trends')).toBe(true);
      expect(aggregated.some((item) => item.source_name === 'Google News')).toBe(true);
    });
  });

  describe('saveOpportunities', () => {
    it('deduplicates items against database records from today and intra-batch duplicates', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockGte = jest.fn().mockResolvedValue({
        data: [{ title: 'Alegeri Prezidentiale' }], // Already saved earlier today
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const candidates: RawOpportunity[] = [
        {
          title: 'Alegeri Prezidentiale', // Should be skipped (exists in DB today)
          source_url: 'https://trends.google.com',
          source_name: 'Google Trends',
          trend_rank: 1,
        },
        {
          title: 'Subiect Nou Nout', // Should be inserted
          source_url: 'https://news.google.com/1',
          source_name: 'Google News',
          trend_rank: 1,
        },
        {
          title: 'Subiect Nou Nout', // Duplicate within same batch -> should be skipped
          source_url: 'https://news.google.com/2',
          source_name: 'Google News',
          trend_rank: 1,
        },
        {
          title: 'Al Doilea Subiect Nou', // Should be inserted
          source_url: 'https://trends.google.com/2',
          source_name: 'Google Trends',
          trend_rank: 2,
        },
      ];

      const summary = await saveOpportunities(candidates);

      expect(summary.success).toBe(true);
      expect(summary.totalFetched).toBe(4);
      expect(summary.inserted).toBe(2);
      expect(summary.skippedDuplicates).toBe(2);
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith([
        {
          title: 'Subiect Nou Nout',
          source_url: 'https://news.google.com/1',
          source_name: 'Google News',
          trend_rank: 1,
          status: 'new',
        },
        {
          title: 'Al Doilea Subiect Nou',
          source_url: 'https://trends.google.com/2',
          source_name: 'Google Trends',
          trend_rank: 2,
          status: 'new',
        },
      ]);
    });

    it('handles admin client initialization errors gracefully', async () => {
      (createAdminClient as jest.Mock).mockImplementation(() => {
        throw new Error('Missing service role key');
      });

      const summary = await saveOpportunities([
        {
          title: 'Test',
          source_url: 'https://example.com',
          source_name: 'Google Trends',
          trend_rank: 1,
        },
      ]);

      expect(summary.success).toBe(false);
      expect(summary.errors).toContain('Missing service role key');
    });
  });
});

describe('Cron Content Opportunities Route Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, CRON_SECRET: 'test_secret_123' };
    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401 when CRON_SECRET is configured', async () => {
    const request = new Request('http://localhost:3000/api/cron/content-opportunities');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Unauthorized');
  });

  it('accepts requests with valid Authorization Bearer header', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_GOOGLE_TRENDS_XML,
    } as Response);

    const request = new Request('http://localhost:3000/api/cron/content-opportunities', {
      headers: {
        Authorization: 'Bearer test_secret_123',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.totalFetched).toBeGreaterThan(0);
  });

  it('accepts requests with valid x-cron-secret header via POST', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_GOOGLE_TRENDS_XML,
    } as Response);

    const request = new Request('http://localhost:3000/api/cron/content-opportunities', {
      method: 'POST',
      headers: {
        'x-cron-secret': 'test_secret_123',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('accepts requests with valid ?secret= query parameter', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_GOOGLE_TRENDS_XML,
    } as Response);

    const request = new Request('http://localhost:3000/api/cron/content-opportunities?secret=test_secret_123');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
