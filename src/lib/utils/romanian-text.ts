/**
 * Romanian writes s-comma and t-comma (ș, ț). The visually near-identical
 * cedilla forms (ş, ţ) belong to Turkish and predate proper Unicode support,
 * but they still turn up everywhere: OCR engines emit them, and language
 * models trained on older Romanian corpora reproduce them mid-sentence.
 *
 * They compare as different characters, so a report can end up spelling the
 * same word two ways, and search terms built from that text quietly miss.
 * Normalising once, at the boundary where third-party text enters the app,
 * means nothing downstream has to know the two spellings exist.
 */
const CEDILLA_TO_COMMA: Record<string, string> = {
  'ş': 'ș', // U+015F -> U+0219
  'Ş': 'Ș', // U+015E -> U+0218
  'ţ': 'ț', // U+0163 -> U+021B
  'Ţ': 'Ț', // U+0162 -> U+021A
};

export function normalizeRomanianDiacritics(text: string): string {
  return text.replace(/[ŞşŢţ]/g, (char) => CEDILLA_TO_COMMA[char]);
}
