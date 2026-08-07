/**
 * Where a source citation points, decided in one place so the on-page report,
 * the PDF document, and the paywall preview can never disagree.
 *
 * Premium plans (Pro/Business) get a deep link straight to the sentence the
 * search matched — a browser text fragment (`#:~:text=`) drops the reader on
 * the passage instead of the top of a long page. Free plans get the site only:
 * the exact-passage link is part of what Pro pays for.
 */
export function sourceHref(
  url: string,
  excerpt: string | undefined,
  isPremium: boolean
): string {
  if (!isPremium) {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  }

  const snippet = toFragment(excerpt);
  return snippet ? `${url}#:~:text=${encodeURIComponent(snippet)}` : url;
}

/**
 * A short, whole-word prefix of the matched passage, safe to hand to a text
 * fragment. Kept short because the fragment must match a contiguous run of text
 * on the page exactly; a shorter, cleanly-cut phrase matches more reliably.
 */
function toFragment(excerpt: string | undefined): string | null {
  if (!excerpt) return null;
  const normalized = excerpt.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (normalized.length <= 120) return normalized;
  return normalized.slice(0, 120).replace(/\s+\S*$/, '');
}
