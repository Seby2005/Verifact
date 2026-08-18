/**
 * SSRF guard tests for extractArticleText.
 *
 * DNS is mocked (dns/promises) so these never touch the network, and fetch is
 * mocked per scenario. The point of the suite: a private/loopback/link-local
 * target is refused before any request is made, and a public URL that 30x's
 * to a private address is refused on the redirect hop — without ever leaking
 * that the refusal was because the target was internal (always UNREACHABLE).
 */
import { extractArticleText, assertSafeUrl, UrlExtractionError } from '@/lib/verification/url-extract';
import { lookup } from 'dns/promises';

jest.mock('dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockLookup = lookup as unknown as jest.Mock;

const PUBLIC_IP = { address: '93.184.216.34', family: 4 };

const ARTICLE_HTML = `
  <html>
    <head><title>Ignored</title>
    <meta property="og:title" content="Real Article Title"></head>
    <body>
      <p>This is the first paragraph of the article, long enough to count as prose.</p>
      <p>This is the second paragraph of the article, also long enough to be included.</p>
    </body>
  </html>
`;

function htmlResponse(html: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null,
    },
    text: () => Promise.resolve(html),
  };
}

function redirectResponse(location: string, status = 302) {
  return {
    ok: false,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'location' ? location : null),
    },
    text: () => Promise.resolve(''),
  };
}

describe('extractArticleText SSRF guard', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockLookup.mockReset();
    // Default: any hostname resolves to a single public address.
    mockLookup.mockResolvedValue([PUBLIC_IP]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each([
    'http://169.254.169.254/latest/meta-data/', // cloud metadata (link-local)
    'http://127.0.0.1/', // loopback
    'http://localhost/', // localhost hostname
    'http://10.0.0.1/', // RFC1918 private
  ])('rejects %s before any fetch, as UNREACHABLE', async (url) => {
    global.fetch = jest.fn();

    await expect(extractArticleText(url)).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    // Refused before any network I/O.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a public hostname that resolves to a private address', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
    global.fetch = jest.fn();

    await expect(extractArticleText('http://sneaky.example.com/')).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects when ANY resolved address is private (round-robin)', async () => {
    mockLookup.mockResolvedValue([PUBLIC_IP, { address: '192.168.1.10', family: 4 }]);
    global.fetch = jest.fn();

    await expect(extractArticleText('http://roundrobin.example.com/')).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a public host that redirects to a loopback address', async () => {
    // Origin is public and passes the guard...
    mockLookup.mockResolvedValue([PUBLIC_IP]);
    global.fetch = jest.fn().mockResolvedValue(redirectResponse('http://127.0.0.1/'));

    await expect(extractArticleText('http://news.example.com/article')).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    // The origin was fetched once; the redirect target was refused, never fetched.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a public host that redirects to the cloud metadata endpoint', async () => {
    mockLookup.mockResolvedValue([PUBLIC_IP]);
    global.fetch = jest
      .fn()
      .mockResolvedValue(redirectResponse('http://169.254.169.254/latest/meta-data/'));

    await expect(extractArticleText('http://news.example.com/article')).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('follows a safe redirect to another public URL and returns the article', async () => {
    mockLookup.mockResolvedValue([PUBLIC_IP]);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(redirectResponse('https://cdn.example.com/final-article'))
      .mockResolvedValueOnce(htmlResponse(ARTICLE_HTML));

    const text = await extractArticleText('http://news.example.com/article');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(text).toContain('Real Article Title');
    expect(text).toContain('first paragraph of the article');
  });

  it('still extracts a normal public https article URL', async () => {
    mockLookup.mockResolvedValue([PUBLIC_IP]);
    global.fetch = jest.fn().mockResolvedValue(htmlResponse(ARTICLE_HTML));

    const text = await extractArticleText('https://news.example.com/some-article');

    expect(text).toContain('Real Article Title');
    expect(text).toContain('second paragraph of the article');
  });
});

describe('assertSafeUrl', () => {
  beforeEach(() => {
    mockLookup.mockReset();
    mockLookup.mockResolvedValue([PUBLIC_IP]);
  });

  it('does not reveal that a target was blocked for being internal', async () => {
    await expect(assertSafeUrl('http://127.0.0.1/')).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    // Same generic message as a plain unreachable host — no "internal"/"blocked".
    await expect(assertSafeUrl('http://127.0.0.1/')).rejects.toThrow(
      'Nu am putut accesa acest link'
    );
    await expect(assertSafeUrl('http://127.0.0.1/')).rejects.not.toThrow(/internal|blocked|private/i);
  });

  it('accepts a public https URL', async () => {
    await expect(assertSafeUrl('https://example.com/article')).resolves.toBeUndefined();
  });

  it('is a UrlExtractionError', async () => {
    await expect(assertSafeUrl('http://169.254.169.254/')).rejects.toBeInstanceOf(
      UrlExtractionError
    );
  });
});
