/**
 * Fetches a web page and extracts the article text so a URL can be verified as
 * a claim. Intentionally dependency-free.
 *
 * The hard part is not stripping markup, it is deciding *which* text on the
 * page is the article. A news page is mostly navigation by volume, so any
 * strategy that sweeps the whole document produces a menu, and a menu makes a
 * confident-looking claim that the search layers then dutifully research. The
 * strategies below run best-first and every candidate has to look like prose
 * before it is accepted; when none does, this fails loudly rather than handing
 * back page furniture.
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CHARS = 2000;

export class UrlExtractionError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_URL' | 'UNREACHABLE' | 'NOT_HTML' | 'NO_CONTENT'
  ) {
    super(message);
    this.name = 'UrlExtractionError';
  }
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Markup in, readable text out. */
function textOf(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads a meta tag's content regardless of attribute order — `content` before
 * `property` is common enough that a single combined pattern misses pages.
 */
function metaContent(html: string, key: string): string | null {
  const tagRe = /<meta\b[^>]*>/gi;
  const keyRe = new RegExp(`(?:name|property)=["']${key}["']`, 'i');
  let tag: RegExpExecArray | null;

  while ((tag = tagRe.exec(html)) !== null) {
    if (!keyRe.test(tag[0])) continue;
    const content = tag[0].match(/content=["']([^"']*)["']/i);
    if (content?.[1]?.trim()) return decodeEntities(content[1]).trim();
  }
  return null;
}

const ARTICLE_TYPE_RE = /Article|BlogPosting|Report(age)?/i;

/**
 * Walks a parsed JSON-LD value looking for the article body a publisher
 * declares for search engines. Handles the three shapes that occur in the
 * wild: a bare object, an array of objects, and a `@graph` wrapper.
 */
function findArticleBody(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findArticleBody(item);
      if (found) return found;
    }
    return null;
  }

  if (!node || typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;

  const rawType = obj['@type'];
  const type = Array.isArray(rawType) ? rawType.join(' ') : String(rawType ?? '');

  if (ARTICLE_TYPE_RE.test(type)) {
    for (const key of ['articleBody', 'description'] as const) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim()) return decodeEntities(value).trim();
    }
  }

  if (obj['@graph']) return findArticleBody(obj['@graph']);
  return null;
}

/**
 * Schema.org metadata, read from the raw HTML before scripts are stripped —
 * this is the publisher's own answer to "what is this article", so it beats
 * anything inferred from the layout.
 */
function fromJsonLd(html: string): string | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let block: RegExpExecArray | null;

  while ((block = re.exec(html)) !== null) {
    try {
      const found = findArticleBody(JSON.parse(block[1].trim()));
      if (found) return found;
    } catch {
      // Malformed JSON-LD is common; the next block may still be valid.
    }
  }
  return null;
}

/**
 * Drops page furniture so a text sweep cannot pick it up. Regex cannot parse
 * nested markup properly, but these elements are rarely nested in each other,
 * and anything that slips through still has to pass looksLikeProse.
 */
function stripChrome(html: string): string {
  return html
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    // Photo credits and "view image in fullscreen" read as sentences and would
    // otherwise ride along inside the claim.
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ');
}

/** The semantic container an article lives in, when the page declares one. */
function contentRegion(html: string): string | null {
  const match =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return match?.[1] ?? null;
}

function paragraphsOf(html: string): string {
  const paragraphs: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    const text = textOf(match[1]);
    if (text.length > 60) paragraphs.push(text);
  }
  return paragraphs.join(' ');
}

/**
 * Phrases that belong to page furniture and essentially never appear inside a
 * news story. Deliberately mostly multi-word: single words like "politics" or
 * "sport" are ordinary in real articles and would reject genuine content.
 */
const NAVIGATION_PHRASES = [
  'sign in', 'log in', 'subscribe', 'newsletter', 'advertisement',
  'privacy policy', 'terms of use', 'terms of service', 'cookie policy',
  'all rights reserved', 'skip to content', 'follow us', 'watch live',
  'live tv', 'back to top', 'read more', 'see all', 'load more', 'site map',
  'abonează-te', 'autentificare', 'toate drepturile rezervate',
  'politica de confidențialitate', 'termeni și condiții', 'sari la conținut',
  'urmărește-ne', 'citește mai mult', 'vezi toate',
];

function distinctNavigationPhrases(text: string): number {
  const haystack = text.toLowerCase();
  return NAVIGATION_PHRASES.filter((phrase) => haystack.includes(phrase)).length;
}

/**
 * True when the page says it is something other than an article — a section
 * front or a homepage. Those still carry a description, but it is a channel
 * blurb ("news and video about elections"), not a claim anyone can verify.
 *
 * Only the weakest candidates consult this: a page that declares itself a
 * website but does carry real article markup would have matched a stronger
 * strategy already. An absent og:type is not held against a page, since plenty
 * of genuine articles omit it.
 */
function declaresNonArticle(html: string): boolean {
  const ogType = metaContent(html, 'og:type');
  return ogType !== null && !/article/i.test(ogType);
}

/**
 * Separates article prose from navigation soup.
 *
 * The signal is sentence structure, not length: a menu is long but has almost
 * no sentence-ending punctuation, which is exactly what the old 40-character
 * floor failed to notice. Words-per-sentence catches that — prose runs about
 * 12-30, a menu runs to infinity because it has no sentences at all.
 */
function looksLikeProse(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 12) return false;

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((part) => {
      const trimmed = part.trim();
      return /[.!?]["'’)\]]?$/.test(trimmed) && trimmed.split(/\s+/).length >= 6;
    }).length;

  if (sentences === 0) return false;
  if (words / sentences > 45) return false;

  return distinctNavigationPhrases(text) < 4;
}

export async function extractArticleText(rawUrl: string): Promise<string> {
  if (!isValidHttpUrl(rawUrl)) {
    throw new UrlExtractionError('Link-ul introdus nu este valid.', 'INVALID_URL');
  }

  let response: Response;
  try {
    response = await fetch(rawUrl.trim(), {
      redirect: 'follow',
      headers: {
        // Some publishers reject requests without a browser-like UA.
        'User-Agent': 'Mozilla/5.0 (compatible; VerifactBot/0.1; +https://github.com/Seby2005/fact-checker-ai)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new UrlExtractionError(
      'Nu am putut accesa acest link. Verifică adresa sau încearcă alt articol.',
      'UNREACHABLE'
    );
  }

  if (!response.ok) {
    throw new UrlExtractionError(
      `Pagina a răspuns cu eroare (HTTP ${response.status}). Verifică link-ul.`,
      'UNREACHABLE'
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('html') && !contentType.includes('text')) {
    throw new UrlExtractionError(
      'Link-ul nu duce către o pagină cu text (ex. este un fișier sau o imagine).',
      'NOT_HTML'
    );
  }

  const html = await response.text();

  // Read JSON-LD first: stripping <script> below would take it with it.
  const structured = fromJsonLd(html);

  const title =
    metaContent(html, 'og:title') ??
    decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();

  const markup = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const region = contentRegion(markup);
  const withoutChrome = stripChrome(markup);

  // Best-first. A short, accurate description outranks a long sweep of the
  // page, because the sweep is where menus get in.
  const isArticlePage = !declaresNonArticle(html);

  const candidates = [
    structured,
    region ? paragraphsOf(stripChrome(region)) : null,
    paragraphsOf(withoutChrome),
    isArticlePage ? metaContent(html, 'og:description') ?? metaContent(html, 'description') : null,
    isArticlePage ? textOf(withoutChrome) : null,
  ];

  for (const candidate of candidates) {
    const text = candidate?.replace(/\s+/g, ' ').trim();
    if (!text || !looksLikeProse(text)) continue;

    return [title, text].filter(Boolean).join('. ').slice(0, MAX_CHARS);
  }

  throw new UrlExtractionError(
    'Nu am putut extrage articolul din această pagină. Copiază textul și lipește-l în câmpul de text.',
    'NO_CONTENT'
  );
}
