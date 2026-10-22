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

import { lookup } from 'dns/promises';
import { pinnedFetch, PinnedFetchError } from './pinned-fetch';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CHARS = 2000;
const MAX_REDIRECTS = 3;
/** Largest page body read, after decompression; real articles are far below. */
const MAX_PAGE_BYTES = 3 * 1024 * 1024;
/** Deadline for one DNS answer, so a silent resolver cannot stall the request. */
const DNS_TIMEOUT_MS = 3_000;

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

/* ------------------------------------------------------------------------ */
/* SSRF guard                                                                */
/*                                                                          */
/* The verification flow fetches an arbitrary user-supplied URL, so without  */
/* a guard the server becomes an open proxy into the internal network and    */
/* cloud metadata endpoints (169.254.169.254). The whole defence lives in    */
/* this one section: `assertSafeUrl` is called before the first fetch and    */
/* again on every redirect hop, because a public URL can 30x straight to a   */
/* private address. Blocked targets raise UNREACHABLE with the same generic  */
/* message as any other failure, so we never reveal that a host was refused  */
/* for being internal.                                                       */
/* ------------------------------------------------------------------------ */

/** Single blocked-target error: identical to a plain "could not reach". */
function blockedUrlError(): UrlExtractionError {
  return new UrlExtractionError(
    'Nu am putut accesa acest link. Verifică adresa sau încearcă alt articol.',
    'UNREACHABLE'
  );
}

const IPV4_LITERAL_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function parseIpv4(ip: string): [number, number, number, number] | null {
  const m = IPV4_LITERAL_RE.exec(ip);
  if (!m) return null;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  return octets.every((o) => o >= 0 && o <= 255)
    ? [octets[0], octets[1], octets[2], octets[3]]
    : null;
}

/**
 * True for any IPv4 that is not a public routable address: loopback, RFC1918
 * private, link-local, CGNAT, "this network", multicast and reserved ranges.
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const octets = parseIpv4(ip);
  if (!octets) return false; // not an IPv4 literal — caller decides
  const [a, b] = octets;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

/**
 * Expands an IPv6 address into its eight 16-bit groups. Returns null when the
 * address carries an embedded dotted IPv4 tail (handled separately) or is
 * malformed. Only what the range checks below need — not a full parser.
 */
function parseIpv6Groups(raw: string): number[] | null {
  // A dotted IPv4 tail (::ffff:1.2.3.4, 64:ff9b::1.2.3.4) becomes two hex
  // groups, so every embedded-IPv4 form goes through the same range checks.
  let ip = raw;
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(raw);
  if (dotted) {
    const v4 = parseIpv4(dotted[1]);
    if (!v4) return null;
    const hex = `${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
    ip = raw.slice(0, dotted.index) + hex;
  }
  const hasCompression = ip.includes('::');
  const halves = ip.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] === '' ? [] : halves[0].split(':');
  const right = hasCompression && halves[1] !== '' ? halves[1].split(':') : hasCompression ? [] : null;

  let groups: string[];
  if (hasCompression) {
    const missing = 8 - (left.length + (right?.length ?? 0));
    if (missing < 0) return null;
    groups = [...left, ...Array<string>(missing).fill('0'), ...(right ?? [])];
  } else {
    groups = left;
  }

  if (groups.length !== 8) return null;
  const values = groups.map((g) => parseInt(g, 16));
  return values.every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffff) ? values : null;
}

/** True for IPv6 loopback, ULA, link-local, unspecified and mapped-v4 ranges. */
function isPrivateOrReservedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — re-check the embedded v4.
  const mappedDotted = /::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mappedDotted) return isPrivateOrReservedIpv4(mappedDotted[1]);

  const groups = parseIpv6Groups(lower);
  if (!groups) return false;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;

  // ::1 loopback and :: unspecified.
  if (groups.every((g) => g === 0) || (g7 === 1 && groups.slice(0, 7).every((g) => g === 0))) {
    return true;
  }
  const embeddedV4 = (hi: number, lo: number) =>
    `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  // IPv4-mapped (::ffff:a.b.c.d) and the deprecated IPv4-compatible (::a.b.c.d).
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && (g5 === 0xffff || g5 === 0)) {
    return isPrivateOrReservedIpv4(embeddedV4(g6, g7));
  }
  // NAT64 (64:ff9b::/96) and 6to4 (2002::/16) carry an IPv4 that a gateway
  // on the path would reach: judge them by it.
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPrivateOrReservedIpv4(embeddedV4(g6, g7));
  }
  if (g0 === 0x2002) {
    return isPrivateOrReservedIpv4(embeddedV4(g1, g2));
  }
  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

/** Dispatch on address family for any resolved/literal address. */
function isPrivateOrReservedIp(address: string): boolean {
  return address.includes(':')
    ? isPrivateOrReservedIpv6(address)
    : isPrivateOrReservedIpv4(address);
}

/** Hostnames that always name a local/internal target regardless of DNS. */
function isLocalHostname(host: string): boolean {
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'internal' ||
    host.endsWith('.internal')
  );
}

/**
 * Throws UNREACHABLE when `url` resolves to (or literally is) a private,
 * loopback, link-local or otherwise reserved address. Resolves the hostname
 * with DNS and rejects if ANY returned address is non-public, so a hostname
 * that round-robins between a public and an internal IP is still refused.
 *
 * Called before the first fetch and on every redirect hop. This is the fast,
 * early refusal; the binding check happens again inside the connection's own
 * DNS lookup (pinned-fetch.ts), so a second, different DNS answer cannot
 * redirect the actual request.
 */
export async function assertSafeUrl(url: string): Promise<void> {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw blockedUrlError();
  }
  // WHATWG keeps brackets on IPv6 literals ("[::1]") — strip them.
  host = host.replace(/^\[|\]$/g, '');

  if (host === '' || isLocalHostname(host)) throw blockedUrlError();

  // Literal IPs need no DNS — check them directly.
  if (parseIpv4(host) || host.includes(':')) {
    if (isPrivateOrReservedIp(host)) throw blockedUrlError();
    return;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('DNS timeout')), DNS_TIMEOUT_MS);
    });
    try {
      addresses = await Promise.race([lookup(host, { all: true }), timeout]);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Unresolvable host is indistinguishable from an unreachable one.
    throw blockedUrlError();
  }
  if (addresses.length === 0) throw blockedUrlError();

  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) throw blockedUrlError();
  }
}

/**
 * Letters and quotation marks that older publishing systems still write as
 * named entities ("Rom&acirc;nia"). Without these the catch-all at the end of
 * decodeEntities turns each into a space and splits the word in two.
 */
const NAMED_LETTERS: Record<string, string> = {
  acirc: 'â', Acirc: 'Â', icirc: 'î', Icirc: 'Î', abreve: 'ă', Abreve: 'Ă',
  scedil: 'ş', Scedil: 'Ş', tcedil: 'ţ', Tcedil: 'Ţ',
  agrave: 'à', Agrave: 'À', aacute: 'á', auml: 'ä', Auml: 'Ä', ccedil: 'ç', Ccedil: 'Ç',
  egrave: 'è', Egrave: 'È', eacute: 'é', Eacute: 'É', ecirc: 'ê', Ecirc: 'Ê', euml: 'ë',
  iacute: 'í', iuml: 'ï', ntilde: 'ñ', oacute: 'ó', ocirc: 'ô', ouml: 'ö', Ouml: 'Ö',
  uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü', Uuml: 'Ü', szlig: 'ß',
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', bdquo: '„', lsquo: '‘', rsquo: '’',
  euro: '€', deg: '°',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&([A-Za-z]+);/g, (entity, name: string) => NAMED_LETTERS[name] ?? entity)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&bull;/g, '•')
    .replace(/&(?:hellip|#8230);/g, '…')
    .replace(/&(?:mdash|#8212);/g, '—')
    .replace(/&(?:ndash|#8211);/g, '–')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    // Any named entity we don't translate would otherwise ride along as literal
    // "&word;" inside a claim — drop the leftovers so search isn't polluted.
    .replace(/&[a-z]+;/gi, ' ');
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
    // Wiki template residue ("[[Fișier:…|20px|…]]") leaks out of attributes
    // the tag regex cannot parse; one such paragraph used to sink the whole
    // page in looksLikeProse's separator check.
    if (text.length > 60 && !/\[\[|\]\]|\{\{|\}\}/.test(text)) paragraphs.push(text);
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

  // A homepage headline list survives the sentence test (each headline reads as
  // a sentence) but strings items together with bullet/pipe separators and
  // byline+date+count runs. Real article prose almost never carries four of
  // these, so their density is a reliable "this is a feed, not a story" signal.
  const separators = (text.match(/[•|›»]/g) ?? []).length;
  if (separators >= 4) return false;

  const sentences = text
    // "…" ends the teaser of a paywalled article as surely as a full stop.
    .split(/(?<=[.!?…])\s+/)
    .filter((part) => {
      const trimmed = part.trim();
      return /[.!?…]["'’)\]]?$/.test(trimmed) && trimmed.split(/\s+/).length >= 6;
    }).length;

  if (sentences === 0) return false;
  if (words / sentences > 45) return false;

  return distinctNavigationPhrases(text) < 4;
}

/**
 * Downloads the page at `rawUrl` and returns its HTML. Everything that can go
 * wrong on the way — an unsafe or unreachable address, an error status, a
 * front page, a file that is not a page — is raised as a UrlExtractionError.
 */
async function fetchArticleHtml(rawUrl: string, timeoutMs: number): Promise<string> {
  if (!isValidHttpUrl(rawUrl)) {
    throw new UrlExtractionError('Link-ul introdus nu este valid.', 'INVALID_URL');
  }

  // Validate the origin before any network I/O, then re-validate every
  // redirect target: a public URL can 30x straight to a private address.
  let currentUrl = rawUrl.trim();
  await assertSafeUrl(currentUrl);

  let response: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    try {
      // pinnedFetch never follows redirects on its own — each Location is
      // re-checked by assertSafeUrl before we chase it — and it dials only an
      // address its own lookup has just checked.
      response = await pinnedFetch(currentUrl, {
        headers: {
          // Some publishers reject requests without a browser-like UA.
          'User-Agent': 'Mozilla/5.0 (compatible; VerifactBot/0.1; +https://github.com/Seby2005/fact-checker-ai)',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeoutMs,
        maxBytes: MAX_PAGE_BYTES,
        isBlockedAddress: isPrivateOrReservedIp,
        lookupTimeoutMs: DNS_TIMEOUT_MS,
      });
    } catch (error) {
      if (error instanceof PinnedFetchError && error.reason === 'TOO_LARGE') {
        throw new UrlExtractionError(
          'Pagina este prea mare pentru a fi citită. Copiază textul articolului și lipește-l în câmpul de text.',
          'NOT_HTML'
        );
      }
      if (error instanceof PinnedFetchError && error.reason === 'BLOCKED') throw blockedUrlError();
      throw new UrlExtractionError(
        'Nu am putut accesa acest link. Verifică adresa sau încearcă alt articol.',
        'UNREACHABLE'
      );
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) break;

    if (hop === MAX_REDIRECTS) {
      throw new UrlExtractionError(
        'Nu am putut accesa acest link. Verifică adresa sau încearcă alt articol.',
        'UNREACHABLE'
      );
    }

    const location = response.headers.get('location');
    if (!location) break; // Redirect with no target — treat as the final response.

    const nextUrl = new URL(location, currentUrl).toString();
    if (!isValidHttpUrl(nextUrl)) {
      throw new UrlExtractionError(
        'Nu am putut accesa acest link. Verifică adresa sau încearcă alt articol.',
        'UNREACHABLE'
      );
    }
    await assertSafeUrl(nextUrl);
    currentUrl = nextUrl;
  }

  if (!response) {
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

  // A site's front page is a feed of headlines, never one article — and many
  // publishers answer a dead article link with a redirect to it, so this also
  // catches broken links that would otherwise "verify" today's headlines.
  if (new URL(currentUrl).pathname.replace(/\/+$/, '') === '') {
    throw new UrlExtractionError(
      'Link-ul duce la prima pagină a site-ului, nu la un articol. Deschide articolul și copiază link-ul lui.',
      'NO_CONTENT'
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('html') && !contentType.includes('text')) {
    throw new UrlExtractionError(
      'Link-ul nu duce către o pagină cu text (ex. este un fișier sau o imagine).',
      'NOT_HTML'
    );
  }

  return response.text();
}

/** The page without the markup that never holds readable text. */
function withoutScripts(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

/**
 * The prose paragraphs of the article at `rawUrl`, in reading order, each as
 * the text a browser shows for it: inline markup is removed without leaving a
 * gap, so "<b>Guvernul</b>, ieri" stays "Guvernul, ieri". That fidelity is the
 * point — these are meant to be quoted back at the page (a text-fragment link
 * only lands when the quote matches the rendered text), which is also why
 * nothing here is truncated or joined.
 *
 * Fails with a UrlExtractionError for the same reasons as extractArticleText.
 */
export async function fetchArticleParagraphs(
  rawUrl: string,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<string[]> {
  const markup = withoutScripts(await fetchArticleHtml(rawUrl, timeoutMs));
  const article = stripChrome(contentRegion(markup) ?? markup);

  const paragraphs: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(article)) !== null) {
    const text = decodeEntities(match[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

export async function extractArticleText(rawUrl: string): Promise<string> {
  const html = await fetchArticleHtml(rawUrl, FETCH_TIMEOUT_MS);

  // Read JSON-LD first: stripping <script> below would take it with it.
  const structured = fromJsonLd(html);

  const title =
    metaContent(html, 'og:title') ??
    decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();

  const markup = withoutScripts(html);

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
    // Judge only the part that will be verified: a footer navbox far below the
    // article (Wikipedia's "Van der Bellen • Filip • …") must not reject it.
    const text = candidate?.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
    if (!text || !looksLikeProse(text)) continue;

    return [title, text].filter(Boolean).join('. ').slice(0, MAX_CHARS);
  }

  throw new UrlExtractionError(
    'Nu am putut extrage articolul din această pagină. Copiază textul și lipește-l în câmpul de text.',
    'NO_CONTENT'
  );
}
