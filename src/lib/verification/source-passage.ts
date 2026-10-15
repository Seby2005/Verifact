/**
 * Finds, on each cited page, the sentence that says the most about the claim.
 *
 * A search engine hands back a headline or a teaser, which is rarely a sentence
 * the page itself contains. So the "quote" printed under a source was not a
 * quote, and the Pro deep link built from it (see ReportView/sourceLink.ts)
 * pointed at text the browser could not find, or at the article's opening line
 * whatever it was about. Reading the page and copying a sentence out of it
 * fixes both: the report quotes the source's own words, and the link lands on
 * them.
 */

import type { CombinedSource } from '@/types/verification';
import { fetchArticleParagraphs } from './url-extract';
import { claimCoverage, isRelevantToClaim } from './relevance';

/** Per page. Short: a slow publisher must not hold the whole batch to the budget. */
const PAGE_TIMEOUT_MS = 4000;
/** For all pages together; callers run this beside the AI calls, which take longer. */
const BUDGET_MS = 5000;

const MIN_SENTENCE_CHARS = 40;
const MAX_SENTENCE_CHARS = 500;

/**
 * A sentence ends at closing punctuation only when a capital letter or an
 * opening quote follows. That keeps "Legea nr. 141" and "art. 5" whole, which
 * a plain split on full stops would cut in half.
 */
const SENTENCE_BREAK = /(?<=[.!?…]["”»]?)\s+(?=[\p{Lu}„“"«(])/u;

/**
 * The sentence in `paragraphs` that covers the most of the claim, copied
 * verbatim, or null when none is about the claim at all. Ties go to the
 * earliest sentence, where an article states its point.
 */
export function pickPassage(paragraphs: readonly string[], claim: string): string | null {
  let best: string | null = null;
  let bestCoverage = 0;

  for (const paragraph of paragraphs) {
    for (const raw of paragraph.split(SENTENCE_BREAK)) {
      const sentence = raw.trim();
      if (sentence.length < MIN_SENTENCE_CHARS || sentence.length > MAX_SENTENCE_CHARS) continue;
      if (!isRelevantToClaim(claim, sentence)) continue;

      const coverage = claimCoverage(claim, sentence);
      if (coverage > bestCoverage) {
        best = sentence;
        bestCoverage = coverage;
      }
    }
  }
  return best;
}

/**
 * Whether a source's page can be read and quoted. A link through an aggregator
 * (`siteUrl` set) opens a redirect page, not the article. Fact-checks are left
 * as they are: the report shows their verdict, not an excerpt.
 */
function isQuotable(source: CombinedSource): boolean {
  return !source.siteUrl && (source.sourceType === 'news' || source.sourceType === 'official');
}

/**
 * Reads the cited pages and returns, per source url, a sentence quoted from
 * that page about the claim.
 *
 * Best effort by design: a page that cannot be read within the time budget, or
 * that has no sentence about the claim, is simply absent from the result, and
 * the report keeps the search engine's excerpt for it. Never rejects.
 */
export async function findSourcePassages(
  sources: readonly CombinedSource[],
  claim: string
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const urls = [...new Set(sources.filter(isQuotable).map((s) => s.url))];
  if (urls.length === 0) return found;

  const reads = Promise.allSettled(
    urls.map(async (url) => {
      const passage = pickPassage(await fetchArticleParagraphs(url, PAGE_TIMEOUT_MS), claim);
      if (passage) found.set(url, passage);
    })
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, BUDGET_MS);
  });
  await Promise.race([reads, budget]);
  clearTimeout(timer);

  // A copy, so a page that answers after the budget cannot change the result.
  return new Map(found);
}
