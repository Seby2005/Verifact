/**
 * Tests for stance/sentiment detection in layer 2 (news).
 *
 * Two things are pinned down here:
 *
 *  1. Diacritic-insensitive keyword matching. The Romanian contradiction
 *     keywords were written with legacy cedilla characters (ţ U+0163,
 *     ş U+015F) while real Romanian text uses comma-below ones (ț U+021B,
 *     ș U+0219). `'dezminţit'.includes` never fired on `dezmințit`, so three
 *     of the strongest "this is false" signals were dead.
 *
 *  2. The neutral-article plateau. `calculateLayer2Score` returns exactly 0.5
 *     when every article is neutral. This is documented rather than changed —
 *     see the audit notes; it is the main reason the layer contributes no
 *     discriminating signal in practice.
 */

import { normalizeForMatching, containsAnyKeyword } from '@/lib/verification/text-match';
import { detectSentiment, calculateLayer2Score } from '@/lib/verification/layer2-news';
import { CONTRADICTION_KEYWORDS_RO } from '@/lib/verification/constants';
import type { NewsArticle } from '@/types/verification';

describe('normalizeForMatching', () => {
  it('folds comma-below and cedilla diacritics to the same form', () => {
    // ș U+0219 / ş U+015F and ț U+021B / ţ U+0163
    expect(normalizeForMatching('dezmințit')).toBe(normalizeForMatching('dezminţit'));
    expect(normalizeForMatching('dezmințește')).toBe(normalizeForMatching('dezminţeşte'));
    expect(normalizeForMatching('dezmințit')).toBe('dezmintit');
  });

  it('folds the remaining Romanian diacritics and lowercases', () => {
    expect(normalizeForMatching('FALSĂ')).toBe('falsa');
    expect(normalizeForMatching('Neadevărat')).toBe('neadevarat');
    expect(normalizeForMatching('Împotrivă')).toBe('impotriva');
  });

  it('leaves diacritic-free text untouched apart from case', () => {
    expect(normalizeForMatching('Dezinformare')).toBe('dezinformare');
  });
});

describe('containsAnyKeyword', () => {
  it('matches modern Romanian text against the keyword list', () => {
    const text = 'Autoritățile au dezmințit informația falsă publicată ieri.';
    expect(containsAnyKeyword(text, CONTRADICTION_KEYWORDS_RO)).toBe(true);
  });

  it('matches text written without diacritics at all', () => {
    const text = 'Autoritatile au dezmintit informatia falsa publicata ieri.';
    expect(containsAnyKeyword(text, CONTRADICTION_KEYWORDS_RO)).toBe(true);
  });

  it('matches text written with the legacy cedilla encoding', () => {
    const text = 'Autorităţile au dezminţit informaţia publicată ieri.';
    expect(containsAnyKeyword(text, CONTRADICTION_KEYWORDS_RO)).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(containsAnyKeyword('Vremea va fi frumoasă mâine.', CONTRADICTION_KEYWORDS_RO)).toBe(false);
  });
});

describe('detectSentiment', () => {
  const claim = 'Guvernul a aprobat cresterea salariului minim la 5000 lei';

  it('flags an article that debunks the claim as contradicting', () => {
    const sentiment = detectSentiment(
      'Guvernul a dezmințit creșterea salariului minim la 5000 lei',
      'Informația este falsă, potrivit unui comunicat al Guvernului.',
      claim,
      0.9
    );
    expect(sentiment).toBe('contradicts');
  });

  it('detects the same debunk when the publisher strips diacritics', () => {
    const sentiment = detectSentiment(
      'Guvernul a dezmintit cresterea salariului minim la 5000 lei',
      'Informatia este falsa, potrivit unui comunicat al Guvernului.',
      claim,
      0.9
    );
    expect(sentiment).toBe('contradicts');
  });

  it('marks an article about a different topic as unrelated', () => {
    const sentiment = detectSentiment(
      'Meciul de fotbal s-a încheiat la egalitate',
      'Echipele au terminat 1-1 într-un meci fără mari ocazii.',
      claim,
      0.9
    );
    expect(sentiment).toBe('unrelated');
  });

  it('returns neutral when both confirmation and contradiction words appear', () => {
    const sentiment = detectSentiment(
      'Guvernul a confirmat oficial creșterea salariului minim la 5000 lei',
      'Unele voci au numit informația falsă, dar măsura a fost confirmată.',
      claim,
      0.9
    );
    expect(sentiment).toBe('neutral');
  });

  // Documents current behaviour, not desired behaviour. `oficial` (and `real`,
  // `corect`, `official`, `true`) are confirmation keywords, yet they are
  // everyday words in news copy. A clear debunk that merely mentions an
  // "official statement" therefore cancels out to neutral, which is a large
  // part of why layer 2 so rarely produces a non-neutral stance in practice.
  // See the audit notes in docs/.
  it('is defeated by the everyday word "oficial" inside a debunk', () => {
    const sentiment = detectSentiment(
      'Guvernul a dezmințit creșterea salariului minim la 5000 lei',
      'Informația este falsă, potrivit unui comunicat oficial al Guvernului.',
      claim,
      0.9
    );
    expect(sentiment).toBe('neutral');
  });
});

describe('calculateLayer2Score', () => {
  const article = (over: Partial<NewsArticle>): NewsArticle => ({
    title: 't',
    source: 'digi24.ro',
    articleUrl: 'https://digi24.ro/a',
    publishedAt: '2026-01-01',
    snippet: 's',
    credibilityScore: 0.88,
    sentiment: 'neutral',
    ...over,
  });

  it('returns the neutral 0.5 when there are no articles', () => {
    expect(calculateLayer2Score([])).toBe(0.5);
  });

  it('scores high when credible sources confirm', () => {
    const score = calculateLayer2Score([
      article({ sentiment: 'confirms' }),
      article({ sentiment: 'confirms', articleUrl: 'https://hotnews.ro/b' }),
    ]);
    expect(score).toBe(1);
  });

  it('scores low when credible sources contradict', () => {
    const score = calculateLayer2Score([
      article({ sentiment: 'contradicts' }),
      article({ sentiment: 'contradicts', articleUrl: 'https://hotnews.ro/b' }),
    ]);
    expect(score).toBe(0);
  });

  it('weights a high-credibility contradiction above a low-credibility confirmation', () => {
    const score = calculateLayer2Score([
      article({ sentiment: 'contradicts', credibilityScore: 1.0, source: 'reuters.com' }),
      article({ sentiment: 'confirms', credibilityScore: 0.4, articleUrl: 'https://unknown.example/b' }),
    ]);
    expect(score).toBeLessThan(0.5);
  });

  it('ignores unrelated articles entirely', () => {
    const score = calculateLayer2Score([
      article({ sentiment: 'confirms' }),
      article({ sentiment: 'unrelated', articleUrl: 'https://x.example/c' }),
    ]);
    expect(score).toBe(1);
  });

  // Documents current behaviour, not desired behaviour: when every article is
  // neutral — the common case, since the stance detector is keyword-based —
  // the layer contributes exactly the neutral value no matter how many
  // articles were found. See the audit notes in docs/.
  it('collapses to exactly 0.5 when every article is neutral', () => {
    const neutrals = Array.from({ length: 10 }, (_, i) =>
      article({ articleUrl: `https://example.com/${i}` })
    );
    expect(calculateLayer2Score(neutrals)).toBe(0.5);
  });
});
