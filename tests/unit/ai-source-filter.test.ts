jest.mock('@/lib/ai', () => ({
  filterRelevantSources: jest.fn(),
}));

import { filterRelevantSources } from '@/lib/ai';
import { applyAISourceFilter } from '@/lib/verification/ai-source-filter';
import type { FactCheckResult } from '@/types/verification';

const mockFilter = filterRelevantSources as jest.MockedFunction<typeof filterRelevantSources>;

function factCheck(claimReviewed: string, ratingValue: number): FactCheckResult {
  return {
    publisher: 'PolitiFact',
    rating: ratingValue < 0.5 ? 'False' : 'True',
    ratingValue,
    claimReviewed,
    reviewUrl: `https://politifact.com/${encodeURIComponent(claimReviewed)}`,
    relevanceScore: 1,
  };
}

const empty = { status: 'success' as const, results: [], layerScore: 0.5, processingTime: 0 };

describe('applyAISourceFilter', () => {
  it('inverts the rating of a fact-check that reviewed the opposite claim', async () => {
    mockFilter.mockResolvedValue({ relevant: ['l1:0', 'l1:1'], supports: [], contradicts: [], opposite: ['l1:0'] });

    const result = await applyAISourceFilter(
      {
        layer1: {
          ...empty,
          results: [factCheck('Climate change is a hoax', 0), factCheck('Humans cause climate change', 1)],
        },
        layer2: { ...empty, sourcesChecked: 0 },
        layer3: empty,
        layer4: empty,
      },
      'Climate change is mainly caused by human activity'
    );

    expect(result.layer1.results.map((r) => r.ratingValue)).toEqual([1, 1]);
    // The publisher's label is kept as written; only the scoring value flips.
    expect(result.layer1.results[0].rating).toBe('False');
    expect(result.layer1.layerScore).toBe(1);
  });

  it('replaces the keyword stance of press sources with the model reading', async () => {
    mockFilter.mockResolvedValue({ relevant: ['l2:0', 'l2:1'], supports: ['l2:0'], contradicts: [], opposite: [] });
    const press = (title: string) => ({
      title,
      source: 'mediafax.ro',
      articleUrl: 'https://mediafax.ro/' + title,
      publishedAt: '',
      snippet: '',
      sentiment: 'neutral' as const,
      credibilityScore: 0.8,
    });

    const result = await applyAISourceFilter(
      {
        layer1: empty,
        layer2: { ...empty, sourcesChecked: 2, results: [press('2004 – România intră în NATO'), press('Summitul NATO de la Ankara')] },
        layer3: empty,
        layer4: empty,
      },
      'România este membră NATO din 2004'
    );

    expect(result.layer2.results.map((a) => a.sentiment)).toEqual(['confirms', 'neutral']);
    expect(result.layer2.layerScore).toBe(1);
  });

  it('keeps a register record the triage would drop, while still dropping an off-topic search result', async () => {
    mockFilter.mockResolvedValue({ relevant: [], supports: [], contradicts: [], opposite: [] });

    const result = await applyAISourceFilter(
      {
        layer1: empty,
        layer2: { ...empty, sourcesChecked: 0 },
        layer3: {
          ...empty,
          results: [
            { title: 'Regulamentul (UE) 2025/1106 (SAFE)', documentUrl: 'https://eur-lex.europa.eu/x', fromRegister: true },
            { title: 'Un comunicat fără legătură', documentUrl: 'https://gov.ro/y' },
          ],
        },
        layer4: empty,
      },
      'Legea băgată de UE ne bagă în război'
    );

    expect(result.layer3.results.map((r) => r.title)).toEqual(['Regulamentul (UE) 2025/1106 (SAFE)']);
  });

  it('keeps every source when the model judgement is unavailable', async () => {
    mockFilter.mockResolvedValue(null);
    const layer1 = { ...empty, results: [factCheck('Climate change is a hoax', 0)] };

    const result = await applyAISourceFilter(
      { layer1, layer2: { ...empty, sourcesChecked: 0 }, layer3: empty, layer4: empty },
      'Climate change is mainly caused by human activity'
    );

    expect(result.layer1).toBe(layer1);
  });
});
