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

  const directive = buildTextDirective(excerpt);
  if (!directive) return url;

  // A text directive lives inside the fragment. If the URL already carries a
  // fragment (`#section`), the directive is appended to it with `:~:` and no
  // second `#`; otherwise it opens its own fragment.
  const separator = url.includes('#') ? ':~:' : '#:~:';
  return `${url}${separator}${directive}`;
}

/**
 * Builds the body of a text-fragment directive (`text=start,end`) from a search
 * excerpt, or null when the excerpt is too thin to anchor reliably.
 *
 * The reliability trick is `textStart,textEnd`: instead of matching one long
 * contiguous string (which fails the moment the excerpt differs from the page
 * by a character), the browser matches any range that *begins* with a short
 * head and *ends* with a short tail, tolerating everything in between. That is
 * exactly the shape of a search snippet — a head and a tail stitched over an
 * ellipsis — so anchoring both ends is what makes the jump land.
 */
export function buildTextDirective(excerpt: string | undefined): string | null {
  const text = normalizeExcerpt(excerpt);
  if (!text || text.length < 12) return null;

  // Search engines stitch a snippet from separate runs with an ellipsis. Split
  // on it so the head anchors to the first run and the tail to the last; the
  // browser then spans the gap on its own.
  const runs = text.split(/\s*(?:\.\.\.|…)\s*/).filter((r) => r.trim().length > 0);
  const head = runs[0] ?? text;
  const tail = runs[runs.length - 1] ?? text;

  const start = firstWords(head);
  if (!start) return null;

  // A short, unbroken passage needs only a start anchor. Anything longer or
  // stitched gets both ends so the middle is free to differ.
  if (runs.length === 1 && text.length <= 60) {
    return `text=${encodeDirective(start)}`;
  }

  const end = lastWords(tail);
  if (!end || end.toLowerCase() === start.toLowerCase()) {
    return `text=${encodeDirective(start)}`;
  }
  return `text=${encodeDirective(start)},${encodeDirective(end)}`;
}

/** Strips markup, decodes the few entities snippets carry, and collapses space. */
function normalizeExcerpt(excerpt: string | undefined): string | null {
  if (!excerpt) return null;
  const text = excerpt
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&(?:hellip|#8230);/g, '…')
    .replace(/\s+/g, ' ')
    .trim()
    // Search excerpts open and close with ellipses and stray quotes.
    .replace(/^[\s"'“”«».…]+/, '')
    .replace(/[\s"'“”«»…]+$/, '');
  return text || null;
}

const MAX_ANCHOR_WORDS = 6;
const MAX_ANCHOR_CHARS = 60;

/** The leading whole words of a run, capped so the anchor stays matchable. */
function firstWords(run: string): string | null {
  const words = run.trim().split(' ').filter(Boolean);
  let out = '';
  for (const word of words.slice(0, MAX_ANCHOR_WORDS)) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > MAX_ANCHOR_CHARS) break;
    out = next;
  }
  return out || null;
}

/** The trailing whole words of a run, capped from the end. */
function lastWords(run: string): string | null {
  const words = run.trim().split(' ').filter(Boolean).slice(-MAX_ANCHOR_WORDS);
  while (words.length > 1 && words.join(' ').length > MAX_ANCHOR_CHARS) {
    words.shift();
  }
  const out = words.join(' ');
  return out || null;
}

/**
 * Percent-encodes one anchor for a text directive. `encodeURIComponent` covers
 * most of it but leaves `-` untouched, and `-` is grammar-significant inside a
 * directive (`prefix-`, `-suffix`), so a hyphen in the passage would corrupt
 * the parse — encode it explicitly.
 */
function encodeDirective(anchor: string): string {
  return encodeURIComponent(anchor).replace(/-/g, '%2D');
}
