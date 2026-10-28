import type { RecentClaim } from '@/lib/examples/trending';
import type { Verdict } from '@/types/verification';
import { createContentHash } from '@/lib/utils/hash';

// The sources other than Google's API, and the verification cache, are
// replaced per test; by default they hold nothing. The factories forward to
// shared mocks so the modules isolated per test below see the same ones.
const mockIndex = jest.fn<Promise<Array<{ title: string; publishedAt: string }>>, [number]>();
const mockVerdicts = jest.fn<Promise<Map<string, Verdict>>, [string[]]>();
const mockArchive = jest.fn<Array<{ claim: string; site: string; date: string }>, [string]>();
jest.mock('@/lib/news-index', () => ({ recentFactChecks: (days: number) => mockIndex(days) }));
jest.mock('@/lib/verification/cache', () => ({ getCachedVerdicts: (hashes: string[]) => mockVerdicts(hashes) }));
jest.mock('@/lib/factcheck-archive', () => ({ archivedFactChecksSince: (since: string) => mockArchive(since) }));

beforeEach(() => {
  mockIndex.mockResolvedValue([]);
  mockVerdicts.mockResolvedValue(new Map());
  mockArchive.mockReturnValue([]);
});

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

  /** Factual.ro headlines as the own news index stores them. */
  function indexed(items: Array<{ title: string; ageDays: number }>) {
    mockIndex.mockResolvedValue(
      items.map((item) => ({ title: item.title, publishedAt: new Date(NOW - item.ageDays * DAY).toISOString() }))
    );
  }

  it('asks each live fact-checker for its newest reviews instead of searching by topic', async () => {
    const fetchMock = jest.fn().mockResolvedValue(apiPage([]));
    global.fetch = fetchMock;

    await getTrendingExamples('ro');

    const requests = fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams);
    expect(requests.map((p) => p.get('reviewPublisherSiteFilter'))).toEqual(['verificat.afp.com']);
    expect(requests.every((p) => p.get('query') === null && p.get('languageCode') === 'ro')).toBe(true);
    expect(mockIndex).toHaveBeenCalled();
  });

  it('skips claims a reader could not check as text: cut quotes, clips, pictures, other languages', async () => {
    indexed([
      { title: '„(...) PSD ce a mai făcut? A dat legea Salarizării în sistemul public”', ageDays: 1 },
      { title: 'FALS | Donald Trump l-ar fi chemat de urgență pe Călin Georgescu la Casa Albă', ageDays: 1 },
      { title: 'Clip IA cu un primar care nu există în realitate', ageDays: 1 },
      { title: 'FALS | Deepfake cu președintele Ucrainei și președinta Comisiei europene', ageDays: 1 },
      { title: 'FALS | Polonia ar vrea să iasă din UE', ageDays: 2 },
      { title: 'Ediția #321', ageDays: 1 },
    ]);
    global.fetch = jest.fn().mockResolvedValue(
      apiPage([
        { text: 'Videoclipul arată revoltele din octombrie 2026 de la Paris', ageDays: 1 },
        { text: 'Acesta este un reportaj real privind confiscarea a 140 de milioane în numerar.', ageDays: 1 },
        { text: 'The government banned all diesel cars starting this year', ageDays: 1, languageCode: 'en' },
        { text: 'Valul de căldură extremă este provocat de nanoparticule pulverizate în atmosferă', ageDays: 3 },
      ])
    );

    const examples = await getTrendingExamples('ro');

    expect([...examples].sort()).toEqual(
      [
        'Donald Trump l-ar fi chemat de urgență pe Călin Georgescu la Casa Albă',
        'Polonia ar vrea să iasă din UE',
        'Valul de căldură extremă este provocat de nanoparticule pulverizate în atmosferă',
      ].sort()
    );
  });

  it("skips a speaker's words quoted whole and a headline with no claim, keeps a quoted word", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      apiPage([
        { text: 'Avioanele ne otrăvesc cu „chemtrails”', ageDays: 1 },
        {
          text: '„Cred că sunt șapte ani de când dreapta este la putere, fără să câștige nici măcar un rând de alegeri în România.”',
          ageDays: 1,
        },
        { text: '„Astăzi, ca să dau o cifră, aproape un leu din zece pleacă către plata dobânzilor.”', ageDays: 1 },
      ])
    );
    indexed([
      { title: 'TRUNCHIAT | Sorin Grindeanu despre partidele politice care au fost la guvernare', ageDays: 1 },
      { title: 'ADEVĂRAT | Luca Niculescu spune că din zece lei încasați, plătim un leu pe dobânzi', ageDays: 1 },
      { title: 'PARȚIAL ADEVĂRAT | Daniel Zamfir spune că am avut aproape 30.000 de firme dizolvate', ageDays: 2 },
    ]);

    const examples = await getTrendingExamples('ro');

    expect([...examples].sort()).toEqual(
      [
        'Avioanele ne otrăvesc cu „chemtrails”',
        'Luca Niculescu spune că din zece lei încasați, plătim un leu pe dobânzi',
        'Daniel Zamfir spune că am avut aproape 30.000 de firme dizolvate',
      ].sort()
    );
  });

  it('reads the other Romanian fact-checkers from the archive, but not the ones read live', async () => {
    global.fetch = jest.fn().mockResolvedValue(apiPage([]));
    mockArchive.mockReturnValue([
      { claim: 'Luptătorii latino-americani pregătesc o lovitură de stat în Ucraina', site: 'veridica.ro', date: '2026-10-09' },
      { claim: 'George Simion va fi arestat ca să treacă guvernul Niculescu', site: 'factual.ro', date: '2026-10-10' },
    ]);

    const examples = await getTrendingExamples('ro');

    expect(examples).toContain('Luptătorii latino-americani pregătesc o lovitură de stat în Ucraina');
    expect(examples).not.toContain('George Simion va fi arestat ca să treacă guvernul Niculescu');
  });

  it('puts the claims verified in advance first and never shows one the verification could not settle', async () => {
    global.fetch = jest.fn().mockResolvedValue(apiPage([]));
    const titles = [
      'Polonia ar vrea să iasă din UE',
      'Rusia ar produce gratuit un vaccin împotriva cancerului',
      'Polonia ar avea 800.000 de bugetari în administrație',
      'AfD ar fi protestat în cătușe pentru Călin Georgescu',
      'O coloană de TIR-uri s-ar îndrepta spre Arestul Central',
    ];
    indexed(titles.map((title, i) => ({ title, ageDays: 1 + i / 10 })));
    const verdictOf: Record<string, Verdict> = {
      [titles[0]]: 'unclear',
      [titles[3]]: 'false',
      [titles[4]]: 'false',
    };
    mockVerdicts.mockImplementation(async (hashes) => {
      const map = new Map<string, Verdict>();
      for (const [text, verdict] of Object.entries(verdictOf)) {
        const hash = createContentHash(text, 'ro');
        if (hashes.includes(hash)) map.set(hash, verdict);
      }
      return map;
    });

    const examples = await getTrendingExamples('ro');

    expect(examples.slice(0, 2).sort()).toEqual([titles[3], titles[4]].sort());
    expect(examples).toHaveLength(3);
    expect(examples).not.toContain(titles[0]);
  });

  it('fills the row from the curated set when the fact-checkers cannot be reached', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    mockIndex.mockRejectedValue(new Error('database down'));

    const examples = await getTrendingExamples('ro');

    expect(examples).toHaveLength(3);
    expect(examples[0]).toBe('Guvernul României a decis interzicerea completă a plăților cash de la 1 ianuarie.');
  });
});
