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
  if (!snippet) return url;

  // A text directive lives inside the fragment. If the URL already carries a
  // fragment (`#section`), the directive is appended to it with `:~:` and no
  // second `#`; otherwise it opens its own fragment.
  const separator = url.includes('#') ? ':~:text=' : '#:~:text=';
  return `${url}${separator}${encodeURIComponent(snippet)}`;
}

/**
 * A short, whole-word prefix of the matched passage, safe to hand to a text
 * fragment. Search excerpts often open with an ellipsis or stray punctuation;
 * since the fragment must match a contiguous run of real page text, we trim to
 * the first actual word and keep it short so the match stays reliable.
 */
function toFragment(excerpt: string | undefined): string | null {
  if (!excerpt) return null;
  const normalized = excerpt
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”.…]+/, '');
  if (!normalized) return null;
  if (normalized.length <= 120) return normalized;
  return normalized.slice(0, 120).replace(/\s+\S*$/, '');
}
