jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

import { searchBingNews, searchGoogleNews } from '@/lib/verification/news-rss';

// Trimmed from real responses captured on 2026-10-10.
const GOOGLE_FEED = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>"TVA" - Știri Google</title>
<item><title>TVA de 21% pentru locuințele noi de astăzi. Cât poate crește prețul unui apartament - Digi24</title><link>https://news.google.com/rss/articles/CBMiABC?oc=5</link><guid isPermaLink="false">CBMiABC</guid><pubDate>Thu, 01 Oct 2026 07:00:00 GMT</pubDate><description>&lt;a href="https://news.google.com/rss/articles/CBMiABC"&gt;TVA de 21%&lt;/a&gt;</description><source url="https://www.digi24.ro">Digi24</source></item>
<item><title>HOTĂRÂRE pentru modificarea titlului VII &quot;Taxa pe valoarea adăugată&quot; - mfinante.gov.ro</title><link>https://news.google.com/rss/articles/CBMiDEF?oc=5</link><pubDate>Mon, 28 Jul 2025 07:00:00 GMT</pubDate><source url="https://mfinante.gov.ro">mfinante.gov.ro</source></item>
</channel></rss>`;

const BING_FEED = `<?xml version="1.0" encoding="utf-8" ?><rss version="2.0" xmlns:News="https://www.bing.com/news/search"><channel><title>Nicușor Dan - BingȘtiri</title>
<item><title>OFICIAL Nicușor Dan &#238;și preia atribuțiile de președinte luni</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;aid=&amp;tid=6aca&amp;url=https%3a%2f%2fhotnews.ro%2foficial-nicusor-dan-isi-preia-atributiile-1983839&amp;c=128&amp;mkt=en-ww</link><description>Nicușor Dan va depune jurăm&#226;ntul luni, de la ora 12:00, la Palatul Parlamentului ...</description><pubDate>Thu, 22 May 2025 09:39:00 GMT</pubDate><News:Source>Hotnews</News:Source></item>
</channel></rss>`;

function feedResponse(body: string, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) };
}

describe('news RSS search', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('searchGoogleNews', () => {
    it('reads the headline without the publisher suffix, and the publisher from <source>', async () => {
      global.fetch = jest.fn().mockResolvedValue(feedResponse(GOOGLE_FEED));

      const [first, second] = await searchGoogleNews('TVA 21%', 'ro');

      expect(first).toEqual({
        title: 'TVA de 21% pentru locuințele noi de astăzi. Cât poate crește prețul unui apartament',
        url: 'https://news.google.com/rss/articles/CBMiABC?oc=5',
        sourceName: 'Digi24',
        sourceDomain: 'digi24.ro',
        publishedAt: '2026-10-01T07:00:00.000Z',
        snippet: 'TVA de 21% pentru locuințele noi de astăzi. Cât poate crește prețul unui apartament',
      });
      expect(second.title).toBe('HOTĂRÂRE pentru modificarea titlului VII "Taxa pe valoarea adăugată"');
      expect(second.sourceDomain).toBe('mfinante.gov.ro');
    });

    it('restricts the query to the given sites and the edition to the language', async () => {
      global.fetch = jest.fn().mockResolvedValue(feedResponse(GOOGLE_FEED));

      await searchGoogleNews('cota TVA', 'ro', ['gov.ro', 'bnr.ro']);

      const url = decodeURIComponent((global.fetch as jest.Mock).mock.calls[0][0] as string);
      expect(url).toContain('q=cota TVA (site:gov.ro OR site:bnr.ro)');
      expect(url).toContain('ceid=RO:ro');
    });

    it('resolves to nothing for an empty feed', async () => {
      global.fetch = jest.fn().mockResolvedValue(feedResponse('<rss version="2.0"><channel></channel></rss>'));

      await expect(searchGoogleNews('ceva fara rezultate', 'ro')).resolves.toEqual([]);
    });

    it('rejects on a consent or block page instead of reporting no news', async () => {
      global.fetch = jest.fn().mockResolvedValue(feedResponse('<html><body>Before you continue</body></html>'));

      await expect(searchGoogleNews('orice', 'ro')).rejects.toThrow(/non-RSS/);
    });

    it('rejects on an HTTP error', async () => {
      global.fetch = jest.fn().mockResolvedValue(feedResponse('', 429));

      await expect(searchGoogleNews('orice', 'ro')).rejects.toThrow(/429/);
    });

    it('does not search for an empty query', async () => {
      global.fetch = jest.fn();

      await expect(searchGoogleNews('   ', 'ro')).resolves.toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('searchBingNews', () => {
    it('unwraps the publisher URL from the click tracker and keeps the description', async () => {
      global.fetch = jest.fn().mockResolvedValue(feedResponse(BING_FEED));

      const [item] = await searchBingNews('Nicușor Dan jurământ', 'ro');

      expect(item).toEqual({
        title: 'OFICIAL Nicușor Dan își preia atribuțiile de președinte luni',
        url: 'https://hotnews.ro/oficial-nicusor-dan-isi-preia-atributiile-1983839',
        sourceName: 'Hotnews',
        sourceDomain: 'hotnews.ro',
        publishedAt: '2025-05-22T09:39:00.000Z',
        snippet: 'Nicușor Dan va depune jurământul luni, de la ora 12:00, la Palatul Parlamentului ...',
      });
    });
  });
});
