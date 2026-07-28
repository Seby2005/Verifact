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
    // Real sentences, not one giant run of words: a 1000-word blob with a
    // single full stop is exactly what looksLikeProse is built to reject.
    const longParagraph = `<p>${'The wildfire spread across the northern region overnight. '.repeat(60)}</p>`;
    mockHtmlResponse(`<html><body>${longParagraph}</body></html>`);

    const text = await extractArticleText('https://example.com/long-article');

    expect(text.length).toBeLessThanOrEqual(2000);
  });

  describe('picking the article out of the page', () => {
    it('prefers the articleBody a publisher declares in JSON-LD', async () => {
      mockHtmlResponse(`
        <html>
          <head>
            <meta property="og:title" content="Wildfires spread across southern Europe">
            <script type="application/ld+json">
              {"@context":"https://schema.org","@type":"NewsArticle",
               "articleBody":"Firefighters battled blazes in Spain and France for a third day. Thousands of residents were evacuated from villages near the border. Officials said the fires were still not contained."}
            </script>
          </head>
          <body>
            <nav><a href="/politics">Politics</a><a href="/sport">Sport</a></nav>
            <p>Sign up to our newsletter for the latest headlines delivered daily.</p>
          </body>
        </html>
      `);

      const text = await extractArticleText('https://example.com/wildfires');

      expect(text).toContain('Firefighters battled blazes in Spain and France');
      expect(text).toContain('Wildfires spread across southern Europe');
      expect(text).not.toContain('newsletter');
    });

    it('reads JSON-LD wrapped in a @graph array', async () => {
      mockHtmlResponse(`
        <html><head>
          <script type="application/ld+json">
            {"@graph":[{"@type":"WebSite","name":"Example"},
             {"@type":"Article","articleBody":"The council approved the budget on Tuesday evening. Opposition members voted against the measure. A second reading is scheduled for next month."}]}
          </script>
        </head><body></body></html>
      `);

      const text = await extractArticleText('https://example.com/budget');

      expect(text).toContain('The council approved the budget on Tuesday evening');
    });

    it('prefers paragraphs inside <article> over paragraphs elsewhere on the page', async () => {
      mockHtmlResponse(`
        <html><body>
          <p>Subscribe today to unlock unlimited access to every story we publish.</p>
          <article>
            <p>The central bank raised interest rates by half a point on Thursday. Analysts had expected a quarter point increase instead.</p>
          </article>
        </body></html>
      `);

      const text = await extractArticleText('https://example.com/rates');

      expect(text).toContain('The central bank raised interest rates');
      expect(text).not.toContain('Subscribe today');
    });

    it('falls back to og:description when the page renders its body client-side', async () => {
      // A React/Next shell: real markup, but no article text in the HTML.
      mockHtmlResponse(`
        <html>
          <head>
            <meta property="og:title" content="Fires force evacuations">
            <meta property="og:description" content="Wildfires in Spain and France forced thousands of people to leave their homes this week. Authorities warned that high winds could spread the flames further.">
          </head>
          <body>
            <nav>Politics Business Sports Entertainment Style Travel Weather</nav>
            <div id="root"></div>
          </body>
        </html>
      `);

      const text = await extractArticleText('https://example.com/spa-page');

      expect(text).toContain('Wildfires in Spain and France forced thousands');
      expect(text).not.toContain('Entertainment');
    });

    it('refuses navigation soup instead of passing it on as a claim', async () => {
      // The reported bug: nothing on the page is prose, and the old code
      // stripped every tag and shipped the menu as the claim.
      mockHtmlResponse(`
        <html><body>
          <header>Sign in Subscribe Newsletters Watch Live TV</header>
          <nav>Politics Business Health Entertainment Style Travel Sports Videos Audio Weather Coupons</nav>
          <div id="root"></div>
          <footer>Terms of Use Privacy Policy Cookie Policy All Rights Reserved Follow Us</footer>
        </html>
      `);

      await expect(extractArticleText('https://example.com/spa')).rejects.toMatchObject({
        code: 'NO_CONTENT',
      });
    });

    it('rejects a section front whose description is a channel blurb', async () => {
      // CNN's /world: og:type says website, and the description sells the
      // section rather than stating anything checkable.
      mockHtmlResponse(`
        <html><head>
          <meta property="og:type" content="website">
          <meta property="og:title" content="World | CNN">
          <meta property="og:description" content="View CNN world news today for international news and videos from Europe, Asia, Africa, the Middle East and the Americas.">
        </head><body><div id="root"></div></body></html>
      `);

      await expect(extractArticleText('https://example.com/world')).rejects.toMatchObject({
        code: 'NO_CONTENT',
      });
    });

    it('still trusts the description when the page declares itself an article', async () => {
      mockHtmlResponse(`
        <html><head>
          <meta property="og:type" content="article">
          <meta property="og:description" content="Wildfires in Spain and France forced thousands of people to leave their homes this week. Authorities warned that high winds could spread the flames further.">
        </head><body><div id="root"></div></body></html>
      `);

      const text = await extractArticleText('https://example.com/fires');

      expect(text).toContain('Wildfires in Spain and France forced thousands');
    });

    it('keeps header, nav and footer text out of the last-resort sweep', async () => {
      mockHtmlResponse(`
        <html><body>
          <header>Sign in Subscribe Newsletters</header>
          <nav>Politics Business Sports</nav>
          <div>The mayor announced the new transport plan at a press conference. It takes effect in September and adds four bus routes.</div>
          <footer>All rights reserved. Privacy policy.</footer>
        </body></html>
      `);

      const text = await extractArticleText('https://example.com/transport');

      expect(text).toContain('The mayor announced the new transport plan');
      expect(text).not.toContain('Subscribe');
      expect(text).not.toContain('Politics');
    });
  });
});
