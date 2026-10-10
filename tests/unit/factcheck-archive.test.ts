import { searchFactCheckArchive, FACT_CHECK_ARCHIVE_SIZE } from '@/lib/factcheck-archive';

describe('searchFactCheckArchive', () => {
  it('holds the Romanian fact-checkers and Veridica', () => {
    expect(FACT_CHECK_ARCHIVE_SIZE).toBeGreaterThan(2000);

    const publishers = new Set(
      ['George Simion va fi arestat', 'Ucraina energie gratis', 'videoclip generat cu inteligenta artificiala'].flatMap(
        (query) => searchFactCheckArchive(query, 20).map((hit) => hit.publisher)
      )
    );
    expect(publishers).toContain('Veridica');
    expect(publishers).toContain('Factual.ro');
  });

  it('finds a reviewed claim typed without diacritics, capitals or the same word endings', () => {
    const [best] = searchFactCheckArchive('avioanele ne otravesc cu chemtrails');

    expect(best.claim).toBe('Avioanele ne otrăvesc cu „chemtrails”');
    expect(best.publisher).toBe('Factual.ro');
    expect(best.rating).toBe('FALS');
    expect(best.url).toMatch(/^https:\/\/www\.factual\.ro\//);
    expect(best.relevance).toBeGreaterThan(0.9);
  });

  it('returns the best match first and no more than asked', () => {
    const hits = searchFactCheckArchive('România ar fi dat Ucrainei energie gratis', 3);

    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits[0].claim).toBe('România ar fi dat Ucrainei energie gratis');
    expect(hits.map((h) => h.relevance)).toEqual([...hits.map((h) => h.relevance)].sort((a, b) => b - a));
  });

  it('returns nothing for a statement no fact-checker reviewed', () => {
    expect(searchFactCheckArchive('Apa pura fierbe la 100 de grade Celsius la presiune atmosferica normala.')).toEqual([]);
    expect(searchFactCheckArchive('Tiberiu Movila a fost/este securist')).toEqual([]);
  });

  it('does not match on a single shared topic word', () => {
    // "România" alone is in hundreds of reviewed claims.
    const hits = searchFactCheckArchive('România are munți frumoși');
    expect(hits).toEqual([]);
  });

  it('returns nothing for input with no content words', () => {
    expect(searchFactCheckArchive('')).toEqual([]);
    expect(searchFactCheckArchive('și sau de la')).toEqual([]);
  });
});
