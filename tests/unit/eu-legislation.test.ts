import { findEuActReferences, lookupEuLegislation } from '@/lib/verification/eu-legislation';

describe('findEuActReferences', () => {
  it.each([
    ['Regulamentul (UE) 2024/1689 interzice inteligența artificială', ['32024R1689']],
    ['Directiva 2006/112/CE privind TVA', ['32006L0112']],
    ['directiva 2014/90/UE', ['32014L0090']],
    ['Regulamentul (CE) nr. 1907/2006 (REACH)', ['32006R1907']],
    ['Regulamentul (CE) nr. 1998/2006', ['32006R1998']], // "nr." settles which half is the year
    ['Regulamentul (UE, Euratom) 2023/2841', ['32023R2841']],
    ['Regulamentul delegat (UE) 2023/1234 al Comisiei', ['32023R1234']],
    ['Decizia (UE) 2022/2512', ['32022D2512']],
  ])('%s', (text, expected) => {
    expect(findEuActReferences(text)).toEqual(expected);
  });

  it.each([
    'Decizia 5/2024 a Curții Constituționale', // national: no EU marker
    'Regulamentul 123/2020 al primăriei',
    'UE ne bagă în război',
  ])('finds nothing in: %s', (text) => {
    expect(findEuActReferences(text)).toEqual([]);
  });
});

/** One row of a SPARQL JSON result, in the shape the register returns. */
function row(celex: string, title: string, date: string, inForce = '1') {
  const cell = (value: string) => ({ type: 'literal', value });
  return { celex: cell(celex), title: cell(title), date: cell(date), inForce: cell(inForce) };
}

const SAFE = row(
  '32025R1106',
  'Regulamentul (UE) 2025/1106 al Consiliului din 27 mai 2025 de instituire a Instrumentului „Acțiunea pentru securitatea Europei” (SAFE) prin consolidarea industriei europene de apărare',
  '2025-05-27'
);
const SANCTIONS = row(
  '32026R1891',
  'Regulamentul (UE) 2026/1891 al Consiliului din 30 iulie 2026 de modificare a Regulamentului (UE) 2023/1529 privind măsuri restrictive având în vedere sprijinul militar acordat de Iran',
  '2026-07-30'
);
const CORRIGENDUM = row('32025R0038R(01)', 'Rectificare la Regulamentul (UE) 2025/38 privind securitatea cibernetică', '2025-01-24');

describe('lookupEuLegislation', () => {
  const originalFetch = global.fetch;

  function mockRegister(bindings: unknown[] | Error) {
    global.fetch = jest.fn().mockImplementation(() =>
      bindings instanceof Error
        ? Promise.reject(bindings)
        : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: { bindings } }) })
    );
  }

  const queries = () => (global.fetch as jest.Mock).mock.calls.map(([url]) => decodeURIComponent(String(url)));

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('makes no request for a claim that neither cites an EU act nor is about EU law', async () => {
    mockRegister([]);

    await expect(lookupEuLegislation('Guvernul a mărit pensiile', [])).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns the title, date and status of an act cited by number', async () => {
    mockRegister([row('32024R1689', 'Regulamentul (UE) 2024/1689 de stabilire a unor norme armonizate privind inteligența artificială', '2024-06-13')]);

    const [source] = await lookupEuLegislation('Regulamentul (UE) 2024/1689 interzice inteligența artificială');

    expect(source).toMatchObject({
      title: 'Regulamentul (UE) 2024/1689 de stabilire a unor norme armonizate privind inteligența artificială',
      organization: 'Uniunea Europeană (EUR-Lex)',
      documentUrl: 'https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32024R1689',
      publishedAt: '2024-06-13T00:00:00.000Z',
      fromRegister: true,
    });
    expect(source.relevantQuote).toContain('Regulament al Uniunii Europene din 13.06.2024, în vigoare.');
    expect(queries()[0]).toContain('"32024R1689"');
  });

  it('reports a cited act that is not in the register as a finding', async () => {
    mockRegister([]);

    const [source] = await lookupEuLegislation('Regulamentul (UE) 2025/9876 confiscă economiile');

    expect(source.title).toBe('Regulament 2025/9876 nu figurează în EUR-Lex');
  });

  it('for a claim about an unnamed EU law, lists the recent acts on the subject after an overview', async () => {
    mockRegister([SANCTIONS, SAFE, CORRIGENDUM]);

    const sources = await lookupEuLegislation('Legea băgată de UE ne bagă în război', ['apărare', 'apărării', 'militar', 'securitate']);

    // Overview first; the corrigendum is not an act of its own.
    expect(sources[0].title).toBe('EUR-Lex: 2 regulamente și directive UE recente pe tema „apărare, apărării, militar, securitate”');
    expect(sources[0].relevantQuote).toContain('2025/1106');
    // The act that sets something up outranks the newer one that only amends another.
    expect(sources.slice(1).map((s) => s.documentUrl)).toEqual([
      'https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32025R1106',
      'https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32026R1891',
    ]);
  });

  it('searches titles for whole words only, and never for words every title contains', async () => {
    mockRegister([SAFE]);

    await lookupEuLegislation('UE ne obligă', ['Apărare', 'lege', 'european', 'muniție']);

    const query = queries()[0];
    expect(query).toContain(`bif:contains "'apărare' OR 'muniție'"`);
    expect(query).not.toContain('*');
  });

  it('says so when no recent act carries the subject in its title', async () => {
    mockRegister([]);

    const sources = await lookupEuLegislation('UE interzice mămăliga', ['mămăligă']);

    expect(sources).toHaveLength(1);
    expect(sources[0].title).toBe('EUR-Lex: niciun regulament sau directivă UE recentă pe tema căutată');
    expect(sources[0].relevantQuote).toContain('mămăligă');
  });

  it('adds nothing when the register cannot be reached', async () => {
    mockRegister(new Error('timeout'));

    await expect(lookupEuLegislation('Regulamentul (UE) 2024/1689', ['apărare'])).resolves.toEqual([]);
  });
});
