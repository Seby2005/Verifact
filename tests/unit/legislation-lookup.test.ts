import { findLegislationReferences, lookupCitedLegislation } from '@/lib/verification/legislation-lookup';

describe('findLegislationReferences', () => {
  it.each([
    ['Legea 632 Plx aprobata in parlament va distruge tara', [{ kind: 'bill', number: 632 }]],
    ['PL-x 200/2025 cenzurează internetul', [{ kind: 'bill', number: 200, year: 2025 }]],
    ['PL-x nr. 200/18.06.2025, aflat în dezbatere', [{ kind: 'bill', number: 200, year: 2025 }]],
    ['Plx 1 din 2025 a fost respins', [{ kind: 'bill', number: 1, year: 2025 }]],
    ['proiectul plx 45', [{ kind: 'bill', number: 45 }]],
    ['Legea nr. 141/2025 a majorat TVA', [{ kind: 'law', number: 141, year: 2025 }]],
    ['prin Legea 141 din 25 iulie 2025', [{ kind: 'law', number: 141, year: 2025 }]],
    ['conform Legii nr. 198/2023 a învățământului', [{ kind: 'law', number: 198, year: 2023 }]],
  ])('%s', (text, expected) => {
    expect(findLegislationReferences(text)).toEqual(expected);
  });

  it.each([
    'Legea 141 este o rușine', // no year: could be any of thirty acts
    'Guvernul a adoptat bugetul pe 2025',
    'Au votat 200 de parlamentari în 2025',
  ])('finds nothing in: %s', (text) => {
    expect(findLegislationReferences(text)).toEqual([]);
  });

  it('does not read the year before a bill number as the bill', () => {
    expect(findLegislationReferences('adoptat în 2025 PL-x 300')).toEqual([{ kind: 'bill', number: 300 }]);
  });

  it('lists a document once and caps how many it follows up', () => {
    const refs = findLegislationReferences('PL-x 1/2025, PL-x 1/2025, PL-x 2/2025, PL-x 3/2025 și PL-x 4/2025');

    expect(refs).toEqual([
      { kind: 'bill', number: 1, year: 2025 },
      { kind: 'bill', number: 2, year: 2025 },
    ]);
  });
});

// Shapes copied from cdep.ro on 2026-10-10, trimmed.
const BILL_LIST = `<table>
<tr  style="">   <td>1.</td>   <td><a href="/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp=22201">PL-x 1/01.02.2025</a></td>   <td style="text-align: left"> Proiectul Legii bugetului de stat pe anul 2025 </td> <td> <a href="/ords/pls/legis/legis_pck.htp_act?nr=9&an=2025">Lege 9/2025</a> <br>10.02.2025 </td> </tr>
<tr  class="even" style="">   <td>200.</td>   <td><a href="/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp=22421">PL-x 200/18.06.2025</a></td>   <td style="text-align: left"> Proiect de Lege privind limitarea propag&#259;rii con&#355;inutului ilegal </td> <td> raport depus </td> </tr>
</table>`;

const BILL_PAGE = `<html><head><style>td {padding: 3px;}</style></head><body><table>
<tr><td>Tip initiativa:</td><td>Proiect de Lege</td></tr>
<tr class="x"><td>Stadiu:</td><td>trimis pentru raport la comisiile permanente ale Camerei Deputatilor</td></tr>
<tr><td>Obiect de reglementare:</td><td>Proiectul de lege are ca obiect de reglementare limitarea propag&#259;rii prin platforme online foarte mari a con&#355;inutului ilegal.</td></tr>
<tr><td>18.06.2025</td><td>&nbsp; &nbsp;</td><td>prezentare în Biroul Permanent al Camerei Deputatilor</td></tr>
<tr><td>26.06.2025</td><td>&nbsp; &nbsp;</td><td>primire aviz de la: Comisia pentru drepturile omului</td></tr>
</table></body></html>`;

const LAW_PAGE = `<html><head><title>LEGE nr.141 din 25 iulie      2025 privind unele măsuri fiscal-bugetare</title></head><body></body></html>`;
const NO_SUCH_LAW_PAGE = `<html><head><title>
</title></head><body></body></html>`;

function page(body: string, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) };
}

describe('lookupCitedLegislation', () => {
  const originalFetch = global.fetch;

  /** Serves the fixtures by URL shape and records what was requested. */
  function mockRegister(overrides: Partial<Record<'list' | 'bill' | 'law', ReturnType<typeof page> | Error>> = {}) {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const kind = url.includes('upl_pck2015.lista') ? 'list' : url.includes('upl_pck2015.proiect') ? 'bill' : 'law';
      const reply = overrides[kind] ?? page({ list: BILL_LIST, bill: BILL_PAGE, law: LAW_PAGE }[kind]);
      return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply);
    });
  }

  const requested = () => (global.fetch as jest.Mock).mock.calls.map(([url]) => String(url));

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('makes no request for a claim that cites no bill or law', async () => {
    mockRegister();

    await expect(lookupCitedLegislation('Guvernul a adoptat bugetul pe 2025')).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns the register entry of a cited bill: what it is, its stage, its object, its last step', async () => {
    mockRegister();

    const [source] = await lookupCitedLegislation('PL-x 200/2025 cenzurează internetul');

    expect(source).toMatchObject({
      title: 'PL-x 200/2025: Proiect de Lege privind limitarea propagării conținutului ilegal',
      organization: 'Camera Deputaților',
      documentUrl: 'https://www.cdep.ro/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp=22421',
      publishedAt: '2025-06-18T00:00:00.000Z',
    });
    expect(source.relevantQuote).toBe(
      'Stadiu: trimis pentru raport la comisiile permanente ale Camerei Deputatilor. ' +
        'Înregistrat la Camera Deputaților la 18.06.2025. ' +
        'Obiect: Proiectul de lege are ca obiect de reglementare limitarea propagării prin platforme online foarte mari a conținutului ilegal. ' +
        'Ultima acțiune: 26.06.2025 primire aviz de la: Comisia pentru drepturile omului'
    );
  });

  it('looks in the recent sessions when the claim gives no year', async () => {
    mockRegister();

    const sources = await lookupCitedLegislation('Plx 1 a fost votat');

    const years = requested().filter((u) => u.includes('lista')).map((u) => Number(u.match(/anp=(\d{4})/)?.[1]));
    const thisYear = new Date().getFullYear();
    expect(years.sort()).toEqual([thisYear - 2, thisYear - 1, thisYear]);
    // The fixture list answers for every year, so the number is found in each.
    expect(sources).toHaveLength(3);
  });

  it('reports a number that was never registered as a finding, with the last number that was', async () => {
    mockRegister();

    const [source] = await lookupCitedLegislation('PL-x 632/2025 va distruge țara');

    expect(source.title).toBe('PL-x 632/2025 nu figurează în evidența Camerei Deputaților');
    expect(source.relevantQuote).toContain('2025: ultimul număr 200');
    expect(requested().some((u) => u.includes('upl_pck2015.proiect'))).toBe(false);
  });

  it('still answers from the register row when the bill page cannot be read', async () => {
    mockRegister({ bill: new Error('timeout') });

    const [source] = await lookupCitedLegislation('PL-x 1/2025');

    expect(source.title).toBe('PL-x 1/2025: Proiectul Legii bugetului de stat pe anul 2025');
    expect(source.relevantQuote).toBe('Stadiu: Lege 9/2025 10.02.2025. Înregistrat la Camera Deputaților la 01.02.2025.');
  });

  it('returns the title of a cited law', async () => {
    mockRegister();

    const [source] = await lookupCitedLegislation('Legea nr. 141/2025 a majorat TVA la 21%');

    expect(source.title).toBe('LEGE nr.141 din 25 iulie 2025 privind unele măsuri fiscal-bugetare');
    expect(source.documentUrl).toBe('https://www.cdep.ro/ords/pls/legis/legis_pck.htp_act?nr=141&an=2025');
  });

  it('reports a law number that is not in the database', async () => {
    mockRegister({ law: page(NO_SUCH_LAW_PAGE) });

    const [source] = await lookupCitedLegislation('Legea 9999/2025 interzice numerarul');

    expect(source.title).toBe('Legea nr. 9999/2025 nu figurează în baza legislativă a Camerei Deputaților');
  });

  it('adds nothing when the register cannot be reached', async () => {
    mockRegister({ list: page('', 503), law: new Error('network down') });

    await expect(lookupCitedLegislation('PL-x 200/2025 și Legea 141/2025')).resolves.toEqual([]);
  });
});
