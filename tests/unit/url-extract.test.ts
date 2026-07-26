import { extractArticleText, isValidHttpUrl, UrlExtractionError } from '@/lib/verification/url-extract';

describe('isValidHttpUrl', () => {
  it.each([
    ['https://example.com/article', true],
    ['http://example.com/article', true],
    ['https://example.com/article?query=1&x=2', true],
    ['not a url', false],
    ['ftp://example.com/file', false],
    ['javascript:alert(1)', false],
    ['', false],
  ])('%s -> %s', (url, expected) => {
    expect(isValidHttpUrl(url)).toBe(expected);
  });
});

describe('extractArticleText', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockHtmlResponse(html: string, options: { ok?: boolean; status?: number; contentType?: string } = {}) {
    const { ok = true, status = 200, contentType = 'text/html; charset=utf-8' } = options;
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      status,
      headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
      text: () => Promise.resolve(html),
    });
  }

  it('throws INVALID_URL for a non-http(s) input without attempting a fetch', async () => {
    global.fetch = jest.fn();

    await expect(extractArticleText('not-a-url')).rejects.toThrow(UrlExtractionError);
    await expect(extractArticleText('not-a-url')).rejects.toMatchObject({ code: 'INVALID_URL' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws UNREACHABLE when fetch itself fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(extractArticleText('https://example.com/a')).rejects.toMatchObject({ code: 'UNREACHABLE' });
  });

  it('throws UNREACHABLE when the response is not ok', async () => {
    mockHtmlResponse('<html></html>', { ok: false, status: 404 });

    await expect(extractArticleText('https://example.com/a')).rejects.toMatchObject({ code: 'UNREACHABLE' });
  });

  it('throws NOT_HTML for a non-html/text content type', async () => {
    mockHtmlResponse('binary', { contentType: 'application/pdf' });

    await expect(extractArticleText('https://example.com/a.pdf')).rejects.toMatchObject({ code: 'NOT_HTML' });
  });

  it('extracts paragraph text and the title from a real article page', async () => {
    mockHtmlResponse(`
      <html>
        <head><title>Ignored Title</title>
        <meta property="og:title" content="Real Article Title"></head>
        <body>
          <script>trackSomething();</script>
          <p>This is the first paragraph of the article, long enough to count.</p>
          <p>This is the second paragraph, also long enough to be included.</p>
          <p>Hi</p>
        </body>
      </html>
    `);

    const text = await extractArticleText('https://example.com/article');

    expect(text).toContain('Real Article Title');
    expect(text).toContain('This is the first paragraph');
    expect(text).toContain('This is the second paragraph');
    expect(text).not.toContain('trackSomething');
    expect(text).not.toContain('Hi'); // too short to count as a real paragraph
  });

  it('decodes common HTML entities', async () => {
    mockHtmlResponse(`
      <html><body>
        <p>Companies &amp; governments said &quot;this changes everything&quot; &mdash; a long enough sentence.</p>
      </body></html>
    `);

    const text = await extractArticleText('https://example.com/article');

    expect(text).toContain('Companies & governments said "this changes everything"');
  });

  it('falls back to stripped body text when there are no <p> tags', async () => {
    mockHtmlResponse(`
      <html><body>
        <div>This entire article is written directly inside div tags with no paragraph markup at all, which some minimal sites do.</div>
      </body></html>
    `);

    const text = await extractArticleText('https://example.com/article');

    expect(text).toContain('This entire article is written directly inside div tags');
  });

  it('throws NO_CONTENT when there is not enough extractable text', async () => {
    mockHtmlResponse('<html><body><p>Hi</p></body></html>');

    await expect(extractArticleText('https://example.com/empty')).rejects.toMatchObject({ code: 'NO_CONTENT' });
  });

  it('truncates the result to 2000 characters', async () => {
    const longParagraph = `<p>${'word '.repeat(1000)}long enough to pass the minimum length check.</p>`;
    mockHtmlResponse(`<html><body>${longParagraph}</body></html>`);

    const text = await extractArticleText('https://example.com/long-article');

    expect(text.length).toBeLessThanOrEqual(2000);
  });
});
