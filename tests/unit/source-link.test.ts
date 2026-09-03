import { sourceHref, buildTextDirective } from '@/components/verify/ReportView/sourceLink';

describe('sourceHref — free plan', () => {
  it('returns the site origin only, never a deep link', () => {
    expect(sourceHref('https://example.com/articol/lung?x=1', 'orice text aici', false)).toBe(
      'https://example.com'
    );
  });

  it('falls back to the raw string when the url is unparseable', () => {
    expect(sourceHref('not a url', 'text', false)).toBe('not a url');
  });
});

describe('sourceHref — premium', () => {
  it('anchors both ends of a stitched snippet so the middle can differ', () => {
    // A real search snippet: a head and a tail joined over an ellipsis. The old
    // single-string fragment could never match this; start,end does.
    const href = sourceHref(
      'https://spitalul.ro/comunicat',
      'Ministerul Sănătății a anunțat marți că ... vaccinul este disponibil gratuit',
      true
    );
    expect(href).toBe(
      'https://spitalul.ro/comunicat#:~:text=Ministerul%20S%C4%83n%C4%83t%C4%83%C8%9Bii%20a%20anun%C8%9Bat%20mar%C8%9Bi%20c%C4%83,vaccinul%20este%20disponibil%20gratuit'
    );
  });

  it('uses a single anchor for a short unbroken passage', () => {
    const href = sourceHref('https://ex.ro/a', 'Afirmația este falsă.', true);
    expect(href).toBe('https://ex.ro/a#:~:text=Afirma%C8%9Bia%20este%20fals%C4%83.');
  });

  it('percent-encodes hyphens, which are grammar-significant in a directive', () => {
    const directive = buildTextDirective('COVID-19 nu a fost confirmat');
    expect(directive).toContain('COVID%2D19');
    expect(directive).not.toMatch(/text=COVID-19/);
  });

  it('appends with :~: when the url already carries a fragment', () => {
    const href = sourceHref('https://ex.ro/a#sectiune', 'un citat suficient de lung aici', true);
    expect(href).toContain('#sectiune:~:text=');
    expect(href).not.toContain('#:~:');
  });

  it('strips markup a search provider leaves in the snippet', () => {
    const directive = buildTextDirective('<b>Guvernul</b> a respins propunerea de lege');
    expect(directive).toContain('Guvernul');
    expect(directive).not.toContain('%3Cb%3E');
  });

  it('returns the plain url when the excerpt is too thin to anchor', () => {
    expect(sourceHref('https://ex.ro/a', 'da', true)).toBe('https://ex.ro/a');
    expect(sourceHref('https://ex.ro/a', undefined, true)).toBe('https://ex.ro/a');
  });
});
