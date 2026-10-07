/**
 * Shared relevance test: does a candidate source actually talk about the claim?
 *
 * Layers 2-4 each search an external API with a keyword query, and each API
 * happily returns documents that merely share a word with the claim. Before
 * this module those documents went straight into the report as "sources" —
 * a Venezuela earthquake story listed as evidence about Donald Trump, because
 * both mention "Trump" somewhere and the earthquake story came from a
 * high-credibility domain.
 *
 * NOTE: layer1-factcheck.ts has its own private tokenize()/calculateRelevance()
 * pair. It is deliberately left alone — that layer returns correct results
 * today, its Jaccard metric is tuned for comparing two claim texts rather than
 * a claim against a document, and rewiring it was out of scope here.
 */

const STOPWORDS_RO = new Set([
  'și', 'că', 'în', 'de', 'la', 'cu', 'pe', 'sau', 'nu', 'se', 'ce',
  'un', 'o', 'al', 'ai', 'ale', 'a', 'au', 'am', 'este', 'sunt', 'fi',
  'sa', 'să', 'i', 'ei', 'ea', 'el', 'eu', 'tu', 'ne', 'va', 'vor',
  'din', 'care', 'lui', 'pentru', 'mai', 'dar', 'dacă', 'prin',
]);

const STOPWORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'not', 'this', 'that',
  'it', 'its', 'they', 'their', 'there', 'he', 'she', 'we', 'you',
]);

/**
 * Splits text into a set of significant lowercase words, stripping diacritics
 * and stopwords.
 */
export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS_RO.has(w) && !STOPWORDS_EN.has(w))
  );
}

/**
 * Fraction of the claim's significant words that appear in the document.
 *
 * Deliberately not Jaccard: a document is far longer than a claim, so a
 * union-based score would be near zero for a document that covers the claim
 * fully. What matters here is how much of the claim the document accounts for.
 *
 * Matching is on whole tokens, not substrings. The previous inline check in
 * layer2 used `combinedText.includes(word)`, which counted "dead" as present
 * in "deadline" and "headed".
 */
export function claimCoverage(claim: string, documentText: string): number {
  const claimTokens = tokenize(claim);
  if (claimTokens.size === 0) return 0;

  const docTokens = tokenize(documentText);
  let matches = 0;
  for (const token of claimTokens) {
    if (docTokens.has(token)) matches++;
  }

  return matches / claimTokens.size;
}

/** Minimum share of the claim's words a document must account for. */
const MIN_COVERAGE = 0.3;

/**
 * Minimum number of distinct claim words a document must contain, regardless
 * of ratio. This is what a plain ratio threshold cannot express: "Donald Trump
 * is dead" reduces to three significant tokens, so a story that mentions Trump
 * and nothing else already scores 0.33 and clears any reasonable ratio. Naming
 * one entity from the claim is not evidence about the claim.
 */
const MIN_MATCHES = 2;

/**
 * Whether a source is about the claim at all. Applied before results reach the
 * report, not only before they reach the score.
 */
export function isRelevantToClaim(claim: string, documentText: string): boolean {
  const claimTokens = tokenize(claim);
  if (claimTokens.size === 0) return true; // nothing to match against — do not filter

  const docTokens = tokenize(documentText);
  let matches = 0;
  for (const token of claimTokens) {
    if (docTokens.has(token)) matches++;
  }

  // A one-word claim cannot produce two matches; require what it can give.
  const requiredMatches = Math.min(MIN_MATCHES, claimTokens.size);

  return matches >= requiredMatches && matches / claimTokens.size >= MIN_COVERAGE;
}
