const mockFetchArticleParagraphs = jest.fn();
jest.mock('@/lib/verification/url-extract', () => ({ fetchArticleParagraphs: mockFetchArticleParagraphs }));

import { findSourcePassages, pickPassage } from '@/lib/verification/source-passage';
import { buildCombinedSources } from '@/lib/verification/report-builder';
import { sourceHref } from '@/components/verify/ReportView/sourceLink';
import type { CombinedSource, Layer2Result, Layer3Result } from '@/types/verification';

const CLAIM = 'Guvernul a majorat TVA la 21% de la 1 august 2025.';

const PARAGRAPHS = [
  'Când producătorul japonez de înghețată a majorat prețurile, conducerea firmei a apărut într-o reclamă.',
  'Apartamentele noi se vor scumpi de la 1 august 2025, deoarece Guvernul a majorat cota de TVA de la 9% la 21%. Dezvoltatorii spun că piața va încetini.',
  'Măsura a fost adoptată prin Legea nr. 141 din 2025. Ea se aplică tuturor contractelor noi semnate după această dată.',
];

describe('pickPassage', () => {
  it('returns the sentence that covers the most of the claim, verbatim', () => {
    expect(pickPassage(PARAGRAPHS, CLAIM)).toBe(
      'Apartamentele noi se vor scumpi de la 1 august 2025, deoarece Guvernul a majorat cota de TVA de la 9% la 21%.'
    );
  });

  it('returns null when no sentence is about the claim', () => {
    expect(pickPassage(PARAGRAPHS, 'Vaccinul anti-HPV provoacă infertilitate la fete.')).toBeNull();
  });

  it('does not cut a sentence at an abbreviation', () => {
    const passage = pickPassage(PARAGRAPHS, 'Măsura a fost adoptată prin Legea 141 din 2025.');
    expect(passage).toBe('Măsura a fost adoptată prin Legea nr. 141 din 2025.');
  });

  it('skips fragments too short to be a quote', () => {
    expect(pickPassage(['TVA 21% din august 2025.'], CLAIM)).toBeNull();
  });
});

function source(overrides: Partial<CombinedSource>): CombinedSource {
  return { title: 'Titlu', publisher: 'Publicație', url: 'https://ex.ro/a', sourceType: 'news', relevance: 0.5, ...overrides };
}

describe('findSourcePassages', () => {
  beforeEach(() => mockFetchArticleParagraphs.mockReset());

  it('quotes each readable page and leaves out the ones without a passage', async () => {
    mockFetchArticleParagraphs.mockImplementation(async (url: string) => {
      if (url === 'https://ex.ro/a') return PARAGRAPHS;
      if (url === 'https://ex.ro/altceva') return ['Un articol întreg despre cu totul alt subiect decât cel căutat aici.'];
      throw new Error('blocked');
    });

    const passages = await findSourcePassages(
      [
        source({ url: 'https://ex.ro/a' }),
        source({ url: 'https://ex.ro/altceva' }),
        source({ url: 'https://ex.ro/blocat', sourceType: 'official' }),
      ],
      CLAIM
    );

    expect([...passages.keys()]).toEqual(['https://ex.ro/a']);
    expect(passages.get('https://ex.ro/a')).toContain('Guvernul a majorat cota de TVA');
  });

  it('never opens aggregator redirects or fact-check pages', async () => {
    const passages = await findSourcePassages(
      [
        source({ url: 'https://news.google.com/rss/articles/CBMi', siteUrl: 'https://digi24.ro' }),
        source({ url: 'https://factual.ro/declaratii/x', sourceType: 'fact_check' }),
      ],
      CLAIM
    );

    expect(passages.size).toBe(0);
    expect(mockFetchArticleParagraphs).not.toHaveBeenCalled();
  });
});

describe('a passage in the report', () => {
  const layer2: Layer2Result = {
    status: 'success',
    summary: '',
    layerScore: 0.5,
    results: [{
      title: 'Cu cât se scumpesc locuințele', source: 'Hotnews', articleUrl: 'https://ex.ro/a',
      publishedAt: '', snippet: 'Când producătorul japonez de înghețată a majorat prețurile', credibilityScore: 0.8,
    }],
  };
  const layer3: Layer3Result = {
    status: 'success',
    summary: '',
    layerScore: 0.5,
    results: [{
      title: 'Lege', organization: 'Camera Deputaților', documentUrl: 'https://cdep.ro/pl/1',
      relevantQuote: 'Proiect de lege adoptat de Camera Deputaților.', fromRegister: true,
    }],
  };
  const passages = new Map([
    ['https://ex.ro/a', PARAGRAPHS[1].split('. ')[0] + '.'],
    ['https://cdep.ro/pl/1', 'O frază oarecare din textul proiectului de lege.'],
  ]);

  it('replaces the search snippet, so the deep link anchors on words the page contains', () => {
    const [news] = buildCombinedSources({ layer2, passages }).filter((s) => s.sourceType === 'news');

    expect(news.excerpt).toBe(passages.get('https://ex.ro/a'));
    expect(sourceHref(news.url, news.excerpt, true)).toBe(
      'https://ex.ro/a#:~:text=Apartamentele%20noi%20se%20vor%20scumpi%20de,TVA%20de%20la%209%25%20la%2021%25.'
    );
  });

  it('keeps the search snippet when the page gave no passage', () => {
    const [news] = buildCombinedSources({ layer2 });
    expect(news.excerpt).toBe('Când producătorul japonez de înghețată a majorat prețurile');
  });

  it('keeps a register record’s own summary', () => {
    const [official] = buildCombinedSources({ layer3, passages });
    expect(official.excerpt).toBe('Proiect de lege adoptat de Camera Deputaților.');
  });
});
