import { publisherSiteOf } from '@/lib/verification/publisher-site';

describe('publisherSiteOf', () => {
  it("returns the publisher's site when the link goes through an aggregator", () => {
    expect(publisherSiteOf('https://news.google.com/rss/articles/CBMiABC?oc=5', 'digi24.ro')).toBe('https://digi24.ro');
    expect(publisherSiteOf('https://news.google.com/rss/articles/x', 'https://www.mfinante.gov.ro')).toBe(
      'https://mfinante.gov.ro'
    );
  });

  it.each([
    ['https://www.digi24.ro/stiri/articol-1', 'digi24.ro'],
    ['https://stiri.tvr.ro/articol', 'tvr.ro'],
    ['https://reuters.com/a', 'https://reuters.com/a'],
  ])('returns undefined when %s already points at the publisher', (link, publisher) => {
    expect(publisherSiteOf(link, publisher)).toBeUndefined();
  });

  it('returns undefined when the publisher is unknown or only a display name', () => {
    expect(publisherSiteOf('https://news.google.com/rss/articles/x', undefined)).toBeUndefined();
    expect(publisherSiteOf('https://news.google.com/rss/articles/x', 'Reuters')).toBeUndefined();
  });
});
