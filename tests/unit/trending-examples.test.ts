import type { RecentClaim } from '@/lib/examples/trending';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-13T09:00:00Z');

function claims(prefix: string, agesInDays: number[], now: number = NOW): RecentClaim[] {
  return agesInDays.map((age, i) => ({
    text: `${prefix} afirmația numărul ${i + 1} verificată`,
    reviewDate: now - age * DAY,
  }));
}

/** A Google Fact Check API page for one publisher. */
function apiPage(items: Array<{ text: string; ageDays: number; languageCode?: string }>) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        claims: items.map((item) => ({
          text: item.text,
          claimReview: [
            {
              reviewDate: new Date(NOW - item.ageDays * DAY).toISOString(),
              languageCode: item.languageCode ?? 'ro',
            },
          ],
        })),
      }),
  };
}

describe('pickSuggestions', () => {
  // Loaded per test group: the module keeps a cache between calls.
  const { pickSuggestions } = jest.requireActual<typeof import('@/lib/examples/trending')>('@/lib/examples/trending');

  it('suggests only claims reviewed in the last week when there are enough of them', () => {
    // Whatever the day, and so whatever slice the daily rotation lands on.
    for (let day = 0; day < 14; day++) {
      const now = NOW + day * DAY;
      const factual = [...claims('Factual', [1, 2, 3, 4, 5, 6], now), ...claims('Veche', [8, 20, 90, 400], now)];

      const chosen = pickSuggestions([factual], now);

      expect(chosen).toHaveLength(3);
      expect(chosen.every((text) => text.startsWith('Factual'))).toBe(true);
    }
  });

  it('shows a different row the next day', () => {
    const factual = claims('Factual', [0, 0, 1, 1, 2, 2, 3, 3, 4]);

    const today = pickSuggestions([factual], NOW);
    const tomorrow = pickSuggestions([factual], NOW + DAY);

    expect(today).toHaveLength(3);
    expect(tomorrow).toHaveLength(3);
    expect(tomorrow.filter((text) => today.includes(text))).toEqual([]);
  });

  it('lets the publishers take turns, so one prolific fact-checker does not fill every slot', () => {
    const factual = claims('Factual', [1, 1, 2, 2, 3, 3]);
    const afp = claims('AFP', [2, 5]);

    const chosen = pickSuggestions([factual, afp], NOW);

    expect(chosen.filter((text) => text.startsWith('AFP'))).toHaveLength(1);
    expect(chosen.filter((text) => text.startsWith('Factual'))).toHaveLength(2);
  });

  it('reaches back a month only when the week is too thin to fill the row', () => {
    const quietWeek = [...claims('Recentă', [2]), ...claims('Luna asta', [10, 20]), ...claims('Veche', [45, 200])];

    const chosen = pickSuggestions([quietWeek], NOW);

    expect(chosen).toHaveLength(3);
    expect(chosen.some((text) => text.startsWith('Veche'))).toBe(false);
  });

  it('returns what there is when even the month has too little', () => {
    expect(pickSuggestions([claims('Recentă', [3]), claims('Veche', [300])], NOW)).toEqual([
      'Recentă afirmația numărul 1 verificată',
    ]);
    expect(pickSuggestions([[], []], NOW)).toEqual([]);
  });

  it('does not repeat a claim two publishers both reviewed', () => {
    const same = { text: 'România ar fi dat Ucrainei energie gratis', reviewDate: NOW - DAY };
    const chosen = pickSuggestions([[same, ...claims('Factual', [2, 3])], [same]], NOW);

    expect(chosen.filter((text) => text === same.text)).toHaveLength(1);
    expect(chosen).toHaveLength(3);
  });
});

describe('getTrendingExamples', () => {
  const originalFetch = global.fetch;
  let getTrendingExamples: typeof import('@/lib/examples/trending').getTrendingExamples;

  beforeEach(() => {
    process.env.GOOGLE_FACT_CHECK_API_KEY = 'test-key';
    jest.useFakeTimers({ now: NOW });
    // A fresh module per test: suggestions are cached for six hours.
    jest.isolateModules(() => {
      getTrendingExamples = jest.requireActual<typeof import('@/lib/examples/trending')>('@/lib/examples/trending').getTrendingExamples;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    delete process.env.GOOGLE_FACT_CHECK_API_KEY;
  });

  it("asks each fact-checker for its newest reviews instead of searching by topic", async () => {
    const fetchMock = jest.fn().mockResolvedValue(apiPage([]));
    global.fetch = fetchMock;

    await getTrendingExamples('ro');

    const requests = fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams);
    expect(requests.map((p) => p.get('reviewPublisherSiteFilter'))).toEqual(['factual.ro', 'verificat.afp.com']);
    expect(requests.every((p) => p.get('query') === null && p.get('languageCode') === 'ro')).toBe(true);
  });

  it('skips claims a reader could not check as text: cut quotes, clips, pictures, other languages', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      Promise.resolve(
        String(url).includes('factual.ro')
          ? apiPage([
              { text: '„(...) PSD ce a mai făcut? A dat legea Salarizării în sistemul public”', ageDays: 1 },
              { text: 'Donald Trump l-ar fi chemat de urgență pe Călin Georgescu la Casa Albă', ageDays: 1 },
              { text: 'Clip IA cu un primar care nu există în realitate', ageDays: 1 },
              { text: '„Vot ca maghiara să devină limbă oficială în România”', ageDays: 2 },
              { text: 'Acesta este un reportaj real privind confiscarea a 140 de milioane în numerar.', ageDays: 1 },
              { text: 'The government banned all diesel cars starting this year', ageDays: 1, languageCode: 'en' },
            ])
          : apiPage([
              { text: 'Videoclipul arată revoltele din octombrie 2026 de la Paris', ageDays: 1 },
              { text: 'Imaginile arată ucraineni încătușați, trimiși la război.', ageDays: 1 },
              { text: 'Valul de căldură extremă este provocat de nanoparticule pulverizate în atmosferă', ageDays: 3 },
            ])
      )
    );

    const examples = await getTrendingExamples('ro');

    expect([...examples].sort()).toEqual(
      [
        'Donald Trump l-ar fi chemat de urgență pe Călin Georgescu la Casa Albă',
        'Vot ca maghiara să devină limbă oficială în România',
        'Valul de căldură extremă este provocat de nanoparticule pulverizate în atmosferă',
      ].sort()
    );
  });

  it('unwraps a claim quoted whole but leaves a quoted word inside a claim alone', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      Promise.resolve(
        String(url).includes('factual.ro')
          ? apiPage([
              { text: 'Avioanele ne otrăvesc cu „chemtrails”', ageDays: 1 },
              { text: '„Perchezițiile nu s-ar putea efectua în lipsa proprietarilor”.', ageDays: 1 },
              { text: 'Bolojan ar fi singurul premier care a umblat la banii persoanelor cu dizabilități', ageDays: 2 },
            ])
          : apiPage([])
      )
    );

    const examples = await getTrendingExamples('ro');

    expect(examples).toContain('Avioanele ne otrăvesc cu „chemtrails”');
    expect(examples).toContain('Perchezițiile nu s-ar putea efectua în lipsa proprietarilor');
  });

  it('fills the row from the curated set when the fact-checkers cannot be reached', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const examples = await getTrendingExamples('ro');

    expect(examples).toHaveLength(3);
    expect(examples[0]).toBe('Guvernul României a decis interzicerea completă a plăților cash de la 1 ianuarie.');
  });
});
