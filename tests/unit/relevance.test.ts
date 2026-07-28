import { tokenize, claimCoverage, isRelevantToClaim } from '@/lib/verification/relevance';

describe('tokenize', () => {
  it('strips diacritics and stopwords', () => {
    expect(Array.from(tokenize('Președintele României a votat în Cluj')).sort()).toEqual(
      ['cluj', 'presedintele', 'romaniei', 'votat']
    );
  });

  it('drops words of two characters or fewer', () => {
    expect(tokenize('a b cd efg').has('cd')).toBe(false);
    expect(tokenize('a b cd efg').has('efg')).toBe(true);
  });
});

describe('claimCoverage', () => {
  it('measures the share of claim words present, not set overlap', () => {
    // A long document that fully covers a short claim scores 1, where a
    // Jaccard-style metric would be dragged down by the document's length.
    const claim = 'Donald Trump is dead';
    const doc = 'Donald Trump dead at 79 according to a viral post circulating widely today';
    expect(claimCoverage(claim, doc)).toBe(1);
  });

  it('returns 0 for a claim with no significant words', () => {
    expect(claimCoverage('is a of', 'anything at all')).toBe(0);
  });
});

describe('isRelevantToClaim', () => {
  const CLAIM = 'Donald Trump is dead';

  it('rejects a story that only shares one entity with the claim', () => {
    // The reported bug: Venezuela earthquake coverage was listed as a source
    // for this claim because it mentioned Trump once and came from a
    // high-credibility domain.
    expect(
      isRelevantToClaim(CLAIM, 'Venezuela earthquake kills dozens, Trump comments on aid effort')
    ).toBe(false);
  });

  it('does not count a claim word found inside a longer word', () => {
    expect(isRelevantToClaim(CLAIM, 'Deadline extended for the Trump tower project')).toBe(false);
  });

  it('accepts coverage that actually addresses the claim', () => {
    expect(isRelevantToClaim(CLAIM, 'Trump is not dead: hoax spreads on social media')).toBe(true);
  });

  it('accepts a document when the claim is a single word it contains', () => {
    expect(isRelevantToClaim('autism', 'A study about autism prevalence')).toBe(true);
  });

  it('does not filter when the claim has no significant words to match', () => {
    expect(isRelevantToClaim('is a of', 'completely unrelated text')).toBe(true);
  });
});
