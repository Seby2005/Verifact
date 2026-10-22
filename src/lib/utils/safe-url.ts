/**
 * The URL itself when it is an absolute http(s) link, otherwise null.
 *
 * Every link built from stored or fetched data goes through this before it
 * becomes an `href`, an `<img src>` or a database value: React renders a
 * `javascript:` href as-is, and the CSP allows it, so the scheme check is the
 * only thing standing between a crafted source URL and script on our origin.
 */
export function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    // The string as given, only checked: normalising it (a trailing slash,
    // re-encoding) would change links that are otherwise fine.
    return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}
