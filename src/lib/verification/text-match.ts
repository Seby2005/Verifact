/**
 * Text matching helpers shared by the sentiment/stance detection in layers 2
 * and 3.
 *
 * Romanian is written with comma-below diacritics (ș U+0219, ț U+021B) but a
 * lot of text — including parts of this codebase — still uses the legacy
 * cedilla forms (ş U+015F, ţ U+0163), and plenty of publishers strip diacritics
 * entirely. A plain `includes()` against a keyword list therefore misses real
 * matches: `'dezminţit'.includes` never fires on `dezmințit`.
 *
 * Normalising both sides to unaccented lowercase makes the comparison
 * insensitive to which encoding a publisher happens to use.
 */

/**
 * Lowercases and strips diacritics so that `dezmințit`, `dezminţit` and
 * `dezmintit` all compare equal.
 */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // U+0163/U+015F decompose to t/s + cedilla under NFD, but a few sources
    // emit the precomposed legacy glyphs directly; map them explicitly.
    .replace(/ţ/g, 't')
    .replace(/ş/g, 's');
}

/**
 * True when any keyword occurs in the text, comparing diacritic-insensitively.
 */
export function containsAnyKeyword(text: string, keywords: readonly string[]): boolean {
  const haystack = normalizeForMatching(text);
  return keywords.some(keyword => haystack.includes(normalizeForMatching(keyword)));
}
