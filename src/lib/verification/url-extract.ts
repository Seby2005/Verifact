/**
 * Fetches a web page and extracts its readable text so a URL can be verified
 * as a claim. Intentionally dependency-free: strips scripts/styles/markup and
 * takes the densest text, which is enough to feed the verification layers.
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

  const title = decodeEntities(
    (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ??
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
      '').trim()
  );

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Prefer paragraph text — it is where article prose lives.
  const paragraphs: string[] = [];
  const paragraphRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = paragraphRe.exec(body)) !== null) {
    const t = decodeEntities(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (t.length > 60) paragraphs.push(t);
  }

  const prose = paragraphs.length
    ? paragraphs.join(' ')
    : decodeEntities(body.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

  const combined = [title, prose].filter(Boolean).join('. ').trim();

  if (combined.length < 40) {
    throw new UrlExtractionError(
      'Nu am găsit text suficient în pagină pentru a face o verificare.',
      'NO_CONTENT'
    );
  }

  return combined.slice(0, MAX_CHARS);
}
