/**
 * Looks up the bills and laws a claim cites by number, straight from the
 * Chamber of Deputies' own records (cdep.ro).
 *
 * A claim like "Legea 632 Plx aprobată în parlament va distruge țara" names a
 * document that exists, or does not, in a public register — but news search
 * rarely indexes a bill by its number, so the pipeline used to answer such
 * claims from headlines alone and never saw the bill. This reads the register:
 * whether the number exists, what the bill is about (the official "obiect de
 * reglementare"), and how far it has got (in committee, rejected, become law).
 *
 * One operation: `lookupCitedLegislation(text)` returns an official source for
 * each reference found in the text, including a "no such number on record"
 * source, which is itself evidence when someone cites a bill that was never
 * registered. Text without a reference costs nothing: no request is made.
 * Everything fails open — an unreachable register adds no source.
 *
 * Recognised references:
 *  - bills registered at the Chamber: "PL-x 200/2025", "Plx 200", "200 PL-x"
 *  - adopted laws, when the year is given: "Legea nr. 141/2025",
 *    "Legea 141 din 25 iulie 2025". A bare "Legea 141" is skipped: law numbers
 *    restart every year, so it could be any of thirty different acts.
 */

import type { OfficialSource } from '@/types/verification';
import { logger } from '@/lib/utils/logger';
import { normalizeRomanianDiacritics } from '@/lib/utils/romanian-text';

const BASE = 'https://www.cdep.ro/ords/pls';
const TIMEOUT_MS = 3500;
const USER_AGENT = 'Mozilla/5.0 (compatible; VerifactBot/1.0; +https://github.com/Seby2005/Verifact)';
/** A claim citing more documents than this is a list, not a claim; the rest are ignored. */
const MAX_REFERENCES = 2;
/** With no year given, a bill number is looked for in this many recent sessions. */
const YEARS_SEARCHED_WITHOUT_YEAR = 3;
const MAX_OBJECT_CHARS = 240;

export type LegislationReference =
  | { kind: 'bill'; number: number; year?: number }
  | { kind: 'law'; number: number; year: number };

/* ------------------------------ references ------------------------------- */

const YEAR = String.raw`(?:19|20)\d{2}`;
// "/2025", "/18.06.2025" (the register prints the full date), "din 2025", "din 25 iulie 2025"
const YEAR_SUFFIX = String.raw`(?:\s*\/\s*(?:\d{1,2}\.\d{1,2}\.)?(${YEAR})|\s+din\s+(?:\d{1,2}\s+\p{L}+\s+)?(${YEAR}))`;
const PLX = String.raw`PL[\s-]?x\b\.?`;

const BILL_NUMBER_AFTER = new RegExp(String.raw`${PLX}\s*(?:nr\.?\s*)?(\d{1,4})${YEAR_SUFFIX}?`, 'giu');
// "632 Plx" — but not the year in "din 2025 PL-x 300", where the number follows.
const BILL_NUMBER_BEFORE = new RegExp(String.raw`\b(\d{1,4})${YEAR_SUFFIX}?\s*${PLX}(?!\s*(?:nr\.?\s*)?\d)`, 'giu');
const LAW = new RegExp(String.raw`\bleg(?:ea|ii|e)\s+(?:nr\.?\s*)?(\d{1,4})${YEAR_SUFFIX}`, 'giu');

/** The bill and law numbers a text cites, in order of appearance, without repeats. */
export function findLegislationReferences(text: string): LegislationReference[] {
  const found = new Map<string, LegislationReference>();
  const add = (ref: LegislationReference) => {
    const key = `${ref.kind}:${ref.number}:${ref.year ?? ''}`;
    if (!found.has(key)) found.set(key, ref);
  };

  for (const pattern of [BILL_NUMBER_AFTER, BILL_NUMBER_BEFORE]) {
    for (const m of text.matchAll(pattern)) {
      const year = Number(m[2] ?? m[3]) || undefined;
      add({ kind: 'bill', number: Number(m[1]), year });
    }
  }

  const billNumbers = new Set([...found.values()].map((r) => r.number));
  for (const m of text.matchAll(LAW)) {
    const number = Number(m[1]);
    // "Legea 632 Plx" already matched as the bill; do not also read it as a law.
    if (!billNumbers.has(number)) add({ kind: 'law', number, year: Number(m[2] ?? m[3]) });
  }

  return [...found.values()].filter((r) => r.number > 0).slice(0, MAX_REFERENCES);
}

/* -------------------------------- fetching ------------------------------- */

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`cdep.ro HTTP ${response.status}`);
  return response.text();
}

/** Tag-free text, in the comma-below diacritics the rest of the report uses (the register writes ş/ţ with cedillas). */
function plainText(html: string): string {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;?/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeRomanianDiacritics(text);
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** "18.06.2025" → ISO date; '' when it is not a date. */
function toIsoDate(dayFirst: string): string {
  const m = dayFirst.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}T00:00:00.000Z` : '';
}

function source(fields: { title: string; url: string; quote: string; publishedAt?: string }): OfficialSource {
  return {
    title: fields.title,
    publisher: 'Camera Deputaților',
    organization: 'Camera Deputaților',
    organizationType: 'government',
    url: 'https://www.cdep.ro',
    documentUrl: fields.url,
    publishedAt: fields.publishedAt ?? '',
    relevantQuote: fields.quote,
    supportsOrDenies: 'neutral',
  };
}

/* --------------------------------- bills --------------------------------- */

interface BillRow {
  number: number;
  registered: string;
  title: string;
  /** The register's last column: the resulting law, or the current stage. */
  outcome: string;
  pageUrl: string;
}

const billListUrl = (year: number) => `${BASE}/proiecte/upl_pck2015.lista?cam=2&anp=${year}`;

const BILL_ROW = /<a href="([^"]*upl_pck2015\.proiect\?cam=2&(?:amp;)?idp=\d+)">\s*PL-x\s+(\d+)\/(\d{2}\.\d{2}\.\d{4})\s*<\/a>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;

/** Every bill registered at the Chamber in a year, from the public list. */
async function billsOfYear(year: number): Promise<BillRow[]> {
  const html = await fetchPage(billListUrl(year));
  return [...html.matchAll(BILL_ROW)].map((m) => ({
    number: Number(m[2]),
    registered: m[3],
    title: plainText(m[4]),
    outcome: plainText(m[5]),
    pageUrl: new URL(m[1].replace(/&amp;/g, '&'), billListUrl(year)).toString(),
  }));
}

/** What the bill's own page adds to its list row; empty when the page cannot be read. */
async function billDetails(pageUrl: string): Promise<{ stage?: string; object?: string; lastAction?: string }> {
  try {
    const html = await fetchPage(pageUrl);
    const rows = html.split(/<tr[^>]*>/i).map(plainText);
    const field = (label: string) => rows.map((r) => r.match(new RegExp(`^${label}:\\s*(.+)$`, 'i'))?.[1]).find(Boolean);
    const actions = rows.filter((r) => /^\d{2}\.\d{2}\.\d{4}\s+\S/.test(r));
    return {
      stage: field('Stadiu'),
      object: field('Obiect de reglementare'),
      lastAction: actions[actions.length - 1],
    };
  } catch (error) {
    logger.warn('Bill page could not be read; using the register row only', { service: 'legislation', pageUrl, error: String(error) });
    return {};
  }
}

/**
 * @param sameNumber Other sessions' bills carrying the same number, when the
 *   claim gave no year. Named first in the text so that whichever record a
 *   reader (or the AI) ends up looking at, it cannot be mistaken for the only
 *   candidate: "PL-x 632" was in committee in 2026 and became a law in 2024.
 */
async function billSource(row: BillRow, year: number, sameNumber: string[] = []): Promise<OfficialSource> {
  const details = await billDetails(row.pageUrl);
  const parts = [
    sameNumber.length
      ? `Afirmația nu precizează anul, iar numărul nu identifică singur proiectul: există și ${sameNumber.join(' și ')}.`
      : '',
    `Stadiu: ${details.stage ?? (row.outcome || 'în procedură')}.`,
    `Înregistrat la Camera Deputaților la ${row.registered}.`,
    details.object ? `Obiect: ${clip(details.object, MAX_OBJECT_CHARS)}` : '',
    details.lastAction ? `Ultima acțiune: ${clip(details.lastAction, 140)}` : '',
  ];
  return source({
    title: clip(`PL-x ${row.number}/${year}: ${row.title}`, 220),
    url: row.pageUrl,
    quote: parts.filter(Boolean).join(' '),
    publishedAt: toIsoDate(row.registered),
  });
}

async function lookupBill(ref: Extract<LegislationReference, { kind: 'bill' }>): Promise<OfficialSource[]> {
  const thisYear = new Date().getFullYear();
  const years = ref.year ? [ref.year] : Array.from({ length: YEARS_SEARCHED_WITHOUT_YEAR }, (_, i) => thisYear - i);

  const lists = await Promise.all(years.map(async (year) => ({ year, rows: await billsOfYear(year) })));
  const matches = lists.flatMap(({ year, rows }) => rows.filter((r) => r.number === ref.number).map((row) => ({ row, year })));
  if (matches.length > 0) {
    const label = (m: (typeof matches)[number]) =>
      `PL-x ${m.row.number}/${m.year} (${clip(m.row.title, 70)}; ${m.row.outcome || 'în procedură'})`;
    return Promise.all(
      matches.map((match) => billSource(match.row, match.year, matches.filter((other) => other !== match).map(label)))
    );
  }

  // The register was read and the number is not in it. That is a finding, not
  // a failed search: bills are numbered consecutively, so a number above the
  // last one registered was never assigned.
  const label = ref.year ? `PL-x ${ref.number}/${ref.year}` : `PL-x ${ref.number}`;
  const perYear = lists.map(({ year, rows }) => `${year}: ${rows.length ? `ultimul număr ${Math.max(...rows.map((r) => r.number))}` : 'niciun proiect'}`);
  return [
    source({
      title: `${label} nu figurează în evidența Camerei Deputaților`,
      url: billListUrl(years[0]),
      quote: `În lista proiectelor de lege înregistrate la Camera Deputaților nu există niciun ${label} (${perYear.join('; ')}).`,
    }),
  ];
}

/* ---------------------------------- laws --------------------------------- */

async function lookupLaw(ref: Extract<LegislationReference, { kind: 'law' }>): Promise<OfficialSource[]> {
  const url = `${BASE}/legis/legis_pck.htp_act?nr=${ref.number}&an=${ref.year}`;
  const html = await fetchPage(url);
  const title = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');

  if (!title) {
    return [
      source({
        title: `Legea nr. ${ref.number}/${ref.year} nu figurează în baza legislativă a Camerei Deputaților`,
        url,
        quote: `În baza de date legislativă a Camerei Deputaților nu există o lege cu numărul ${ref.number} din ${ref.year}. Actele adoptate foarte recent pot apărea cu întârziere.`,
      }),
    ];
  }

  return [
    source({
      title: clip(title, 220),
      url,
      quote: `Act adoptat de Parlament, înregistrat în baza legislativă a Camerei Deputaților: ${clip(title, 300)}.`,
    }),
  ];
}

/* -------------------------------- entry ---------------------------------- */

/**
 * Official records for every bill or law number the text cites. Returns []
 * when the text cites none or the register cannot be reached.
 */
export async function lookupCitedLegislation(text: string): Promise<OfficialSource[]> {
  const references = findLegislationReferences(text);
  if (references.length === 0) return [];

  const results = await Promise.all(
    references.map(async (ref) => {
      try {
        return ref.kind === 'bill' ? await lookupBill(ref) : await lookupLaw(ref);
      } catch (error) {
        logger.warn('Legislation lookup failed', { service: 'legislation', reference: ref, error: String(error) });
        return [];
      }
    })
  );
  return results.flat();
}
