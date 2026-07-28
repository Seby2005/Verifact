import { normalizeRomanianDiacritics } from '@/lib/utils/romanian-text';

/**
 * Whole-word matching for the stance keyword lists in constants.ts.
 *
 * Every layer used String.includes, which reports a keyword as present
 * whenever its letters occur anywhere in the text. That silently inverted
 * verdicts in both directions:
 *
 *   - "mit" (myth) is a DEBUNK_MARKER, and it occurs inside "limita",
 *     "permite" and "admite". An EU regulation on chemical test methods was
 *     therefore read as debunking "apa pură fierbe la 100°C" and scored 0,
 *     which is how a plainly true claim came back "Probabil fals".
 *   - "corect" occurs inside "incorect", so a source saying "incorectă"
 *     registered as a contradiction *and* a confirmation, and the two
 *     cancelled out to neutral — erasing a real signal.
 *
 * JavaScript's \b is unusable here: it treats ă, â, î, ș and ț as non-word
 * characters, so \bfals\b would happily match inside "falsă". The boundary is
 * therefore expressed as "not adjacent to any Unicode letter or digit".
 *
 * Both sides are normalised to comma diacritics first, so a list entry
 * spelled "dezminţit" (cedilla) still matches a document spelling it
 * "dezmințit" (comma). Callers do not need to know the two spellings exist.
 */
const compiled = new Map<string, RegExp>();

function phrasePattern(phrase: string): RegExp {
  let pattern = compiled.get(phrase);
  if (!pattern) {
    const escaped = normalizeRomanianDiacritics(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
    compiled.set(phrase, pattern);
  }
  return pattern;
}

/** Whether `phrase` appears in `text` as a whole word or phrase. */
export function containsPhrase(text: string, phrase: string): boolean {
  return phrasePattern(phrase).test(normalizeRomanianDiacritics(text));
}

/** Whether any of `phrases` appears in `text` as a whole word or phrase. */
export function matchesAnyPhrase(text: string, phrases: readonly string[]): boolean {
  const normalized = normalizeRomanianDiacritics(text);
  return phrases.some(phrase => phrasePattern(phrase).test(normalized));
}
