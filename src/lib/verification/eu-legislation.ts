/**
 * Looks up European Union legislation in the EU's own register (CELLAR, the
 * database behind EUR-Lex), which is public, free and needs no key.
 *
 * "Legea băgată de UE ne bagă în război" is unanswerable from headlines: it
 * names no act, and the honest reply is "here are the laws the EU actually
 * passed on that subject, and none of them is that". This module produces
 * that evidence, in two ways:
 *
 *  - by number, when the claim cites an act: "Regulamentul (UE) 2024/1689",
 *    "Directiva 2006/112/CE", "Regulamentul (CE) nr. 1907/2006". The register
 *    returns its title, date and whether it is in force — or that no such act
 *    exists, which is evidence too.
 *  - by subject, when the claim blames an unnamed EU law: the regulations and
 *    directives adopted in the last two years whose official title carries the
 *    given terms, most relevant first, with an overview saying how many there
 *    are. The terms come from the query expander, which is the one place that
 *    decides whether a claim is about EU law at all.
 *
 * Only titles are read, not the acts' full text: enough to show what a law is
 * about, not to settle a dispute over one of its articles.
 *
 * One operation, `lookupEuLegislation`; it fails open like every reference
 * source in the official layer.
 */

import type { OfficialSource } from '@/types/verification';
import { logger } from '@/lib/utils/logger';

const SPARQL_ENDPOINT = 'https://publications.europa.eu/webapi/rdf/sparql';
// The register usually answers in about a second but is occasionally several times
// slower; this leaves room for that inside the official layer's 8.5s budget.
const TIMEOUT_MS = 6500;
const USER_AGENT = 'VerifactBot/1.0 (+https://github.com/Seby2005/Verifact)';
const MAX_CITED_ACTS = 2;
/** Subject search looks this far back: "recent laws", in the sense a viral claim means it. */
const RECENT_MONTHS = 24;
/** Individual acts returned for a subject, after the overview. */
const MAX_SUBJECT_ACTS = 4;
const MAX_SUBJECT_TERMS = 12;

const PREFIXES =
  'PREFIX cdm: <http://publications.europa.eu/ontology/cdm#> PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ';
const ROMANIAN = '<http://publications.europa.eu/resource/authority/language/RON>';
const RESOURCE_TYPE = 'http://publications.europa.eu/resource/authority/resource-type/';

const ACT_KIND = { R: 'Regulament', L: 'Directivă', D: 'Decizie' } as const;
type ActLetter = keyof typeof ACT_KIND;

interface ActRecord {
  celex: string;
  title: string;
  /** ISO date (yyyy-mm-dd) of the act, '' when the register has none. */
  date: string;
  inForce?: boolean;
}

/* -------------------------------- register ------------------------------- */

async function sparql(query: string): Promise<Array<Record<string, string>>> {
  const response = await fetch(`${SPARQL_ENDPOINT}?query=${encodeURIComponent(PREFIXES + query)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`EUR-Lex register HTTP ${response.status}`);

  const body = (await response.json()) as { results?: { bindings?: Array<Record<string, { value: string }>> } };
  return (body.results?.bindings ?? []).map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, cell]) => [key, cell.value]))
  );
}

function toRecord(row: Record<string, string>): ActRecord {
  return {
    celex: row.celex,
    title: row.title.replace(/\s+/g, ' ').trim(),
    date: (row.date ?? '').slice(0, 10),
    inForce: row.inForce === undefined ? undefined : row.inForce === '1' || row.inForce === 'true',
  };
}

const eurLexUrl = (celex: string) => `https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:${celex}`;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** "2025-05-27" → "27.05.2025", the way dates are written in the rest of the report. */
function roDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

function source(fields: { title: string; url: string; quote: string; date?: string }): OfficialSource {
  return {
    title: fields.title,
    publisher: 'EUR-Lex',
    organization: 'Uniunea Europeană (EUR-Lex)',
    organizationType: 'international_org',
    url: 'https://eur-lex.europa.eu',
    documentUrl: fields.url,
    publishedAt: fields.date ? `${fields.date}T00:00:00.000Z` : '',
    relevantQuote: fields.quote,
    supportsOrDenies: 'neutral',
    fromRegister: true,
  };
}

function describe(act: ActRecord): string {
  const kind = ACT_KIND[act.celex[5] as ActLetter] ?? 'Act';
  const status = act.inForce === undefined ? '' : act.inForce ? ', în vigoare' : ', nu mai este în vigoare';
  return `${kind} al Uniunii Europene${act.date ? ` din ${roDate(act.date)}` : ''}${status}.`;
}

/* ------------------------------ cited by number -------------------------- */

const THIS_YEAR = () => new Date().getFullYear();
const isYear = (n: number) => n >= 1958 && n <= THIS_YEAR();

// "Regulamentul (UE) 2024/1689", "Directiva 2006/112/CE", "Regulamentul delegat (UE) 2023/1234",
// "Regulamentul (CE) nr. 1907/2006". Groups: 1 kind, 2 EU marker before the
// number, 3 "nr.", 4 and 5 the two numbers, 6 EU marker after them.
const CITED_ACT =
  /\b(regulament|directiv|decizi)\p{L}*\s+(?:delegat\p{L}*\s+|de\s+punere\s+în\s+aplicare\s+)?(\(\s*(?:UE|CE|CEE|PESC|Euratom)[^)]{0,14}\)\s*|(?:UE|CE)\s+)?(nr\.?\s*)?(\d{1,4})\s*\/\s*(\d{1,4})(\s*\/\s*(?:UE|CE|CEE)\b)?/giu;

/** CELEX numbers of the EU acts a text cites, e.g. "32024R1689". */
export function findEuActReferences(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(CITED_ACT)) {
    // Without an EU marker this is as likely a national act: "Decizia 5/2024"
    // is a Constitutional Court ruling, not a Council decision.
    if (!m[2] && !m[6]) continue;

    const letter: ActLetter = /^reg/i.test(m[1]) ? 'R' : /^dir/i.test(m[1]) ? 'L' : 'D';
    const [first, second] = [Number(m[4]), Number(m[5])];

    // Since 2015 acts are numbered year/number; before that regulations were
    // "nr. number/year" and directives "year/number". "nr." settles it when
    // both halves could be a year ("nr. 1998/2006").
    const yearFirst = !m[3] && isYear(first) && m[4].length === 4;
    const [year, number] = yearFirst ? [first, second] : [second, first];
    if (!isYear(year) || m[yearFirst ? 4 : 5].length !== 4 || number < 1) continue;

    found.add(`3${year}${letter}${String(number).padStart(4, '0')}`);
  }
  return [...found].slice(0, MAX_CITED_ACTS);
}

async function lookupCitedActs(text: string): Promise<OfficialSource[]> {
  const cited = findEuActReferences(text);
  if (cited.length === 0) return [];

  const rows = await sparql(`
    SELECT ?celex ?date ?inForce ?title WHERE {
      VALUES ?celex { ${cited.map((c) => `"${c}"^^xsd:string`).join(' ')} }
      ?w cdm:resource_legal_id_celex ?celex .
      OPTIONAL { ?w cdm:work_date_document ?date }
      OPTIONAL { ?w cdm:resource_legal_in-force ?inForce }
      ?e cdm:expression_belongs_to_work ?w ; cdm:expression_uses_language ${ROMANIAN} ; cdm:expression_title ?title .
    }`);
  const byCelex = new Map(rows.map((row) => [row.celex, toRecord(row)]));

  return cited.map((celex) => {
    const act = byCelex.get(celex);
    const label = `${ACT_KIND[celex[5] as ActLetter]} ${celex.slice(1, 5)}/${Number(celex.slice(6))}`;
    return act
      ? source({ title: clip(act.title, 240), url: eurLexUrl(celex), date: act.date, quote: `${describe(act)} ${clip(act.title, 300)}` })
      : source({
          title: `${label} nu figurează în EUR-Lex`,
          url: 'https://eur-lex.europa.eu/homepage.html?locale=ro',
          quote: `În registrul oficial al legislației Uniunii Europene nu există un act cu numărul citat (${label}, CELEX ${celex}) care să aibă text în limba română.`,
        });
  });
}

/* ------------------------------- by subject ------------------------------ */

/** Lowercase, without diacritics: for comparing words, never for querying the register (which is diacritic-sensitive). */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** The part of a word that survives Romanian inflection ("apărare" / "apărării" → "apăr"). */
function stem(word: string): string {
  return word.length >= 6 ? word.slice(0, -2) : word;
}

/** Words in nearly every act's title; searching for them returns the whole register. */
const GENERIC_TITLE_WORDS = new Set(
  'lege legea legi european europeană europene europei uniune uniunea uniunii regulament regulamentul directivă directiva decizie consiliu consiliului comisie comisiei parlament parlamentului privind state stat membre anul pentru'.split(
    ' '
  )
);

function cleanTerms(terms: readonly string[]): string[] {
  const words = terms
    .flatMap((t) => String(t).toLowerCase().split(/[^\p{L}]+/u))
    .filter((w) => w.length >= 4 && !GENERIC_TITLE_WORDS.has(w));
  return [...new Set(words)].slice(0, MAX_SUBJECT_TERMS);
}

/**
 * How well an act fits the subject. Matching more of the terms matters most;
 * between equals, an act that sets something up outranks one that amends or
 * implements another, which is what a claim about "the law" means.
 */
function relevance(act: ActRecord, terms: string[]): number {
  const title = fold(act.title);
  const matched = terms.filter((term) => title.includes(fold(stem(term)))).length;
  const derivative = /\bde (modificare|rectificare|punere in aplicare|prelungire|abrogare)\b/.test(title) ? 1.5 : 0;
  return matched * 2 - derivative;
}

async function lookupBySubject(subjectTerms: readonly string[]): Promise<OfficialSource[]> {
  const terms = cleanTerms(subjectTerms);
  if (terms.length === 0) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - RECENT_MONTHS);
  const sinceIso = since.toISOString().slice(0, 10);
  // Whole words only. The register's text index also takes prefixes
  // ('digit*'), but a common prefix expands to thousands of index entries and
  // takes 5-15 seconds, against 0.1-0.4 for exact words — which is why the
  // caller is asked for the inflected forms instead.
  const textQuery = terms.map((t) => `'${t}'`).join(' OR ');

  const rows = await sparql(`
    SELECT DISTINCT ?celex ?date ?inForce ?title WHERE {
      ?w cdm:work_has_resource-type ?type ; cdm:resource_legal_id_celex ?celex ; cdm:work_date_document ?date .
      FILTER(?type IN (<${RESOURCE_TYPE}REG>, <${RESOURCE_TYPE}DIR>))
      FILTER(?date >= "${sinceIso}"^^xsd:date)
      OPTIONAL { ?w cdm:resource_legal_in-force ?inForce }
      ?e cdm:expression_belongs_to_work ?w ; cdm:expression_uses_language ${ROMANIAN} ; cdm:expression_title ?title .
      ?title bif:contains "${textQuery}" .
    } ORDER BY DESC(?date) LIMIT 80`);

  const acts = rows
    .map(toRecord)
    // Corrigenda ("32025R0038R(01)") repeat the act they correct.
    .filter((act) => /^3\d{4}[RL]\d{4}$/.test(act.celex))
    .sort((a, b) => relevance(b, terms) - relevance(a, terms) || b.date.localeCompare(a.date));

  const subject = terms.join(', ');
  const period = `din ${roDate(sinceIso)} până azi`;
  if (acts.length === 0) {
    return [
      source({
        title: `EUR-Lex: niciun regulament sau directivă UE recentă pe tema căutată`,
        url: 'https://eur-lex.europa.eu/homepage.html?locale=ro',
        quote: `În registrul oficial al legislației UE, niciun regulament și nicio directivă adoptate ${period} nu au în titlu termenii: ${subject}.`,
      }),
    ];
  }

  const top = acts.slice(0, MAX_SUBJECT_ACTS);
  const overview = source({
    title: `EUR-Lex: ${acts.length} regulamente și directive UE recente pe tema „${clip(subject, 60)}”`,
    url: 'https://eur-lex.europa.eu/homepage.html?locale=ro',
    quote:
      `În registrul oficial al legislației UE, ${acts.length} regulamente și directive adoptate ${period} au în titlu termenii căutați (${subject}). ` +
      `Cele mai apropiate de subiect: ${top.map((a) => `${a.celex.slice(1, 5)}/${Number(a.celex.slice(6))} — ${clip(a.title.replace(/^.*? din \d{1,2} \p{L}+ \d{4} /u, ''), 110)}`).join('; ')}.`,
  });

  return [
    overview,
    ...top.map((act) =>
      source({ title: clip(act.title, 240), url: eurLexUrl(act.celex), date: act.date, quote: `${describe(act)} ${clip(act.title, 300)}` })
    ),
  ];
}

/* --------------------------------- entry --------------------------------- */

/**
 * Official EU-register sources for a claim: the acts it cites by number, and —
 * when `subjectTerms` says the claim blames an EU law without naming it — the
 * recent regulations and directives on that subject.
 *
 * @param subjectTerms Words expected in the official titles of the relevant
 *   acts — Romanian, with diacritics, in the inflected forms a title would use
 *   ("apărare", "apărării", "militar", "militară"), since they are matched as
 *   whole words. Empty when the claim is not about EU law. Supplied by the
 *   query expander.
 */
export async function lookupEuLegislation(text: string, subjectTerms: readonly string[] = []): Promise<OfficialSource[]> {
  const attempt = async (what: string, run: () => Promise<OfficialSource[]>) => {
    try {
      return await run();
    } catch (error) {
      logger.warn('EU legislation lookup failed', { service: 'eu-legislation', what, error: String(error) });
      return [];
    }
  };

  const [cited, bySubject] = await Promise.all([
    attempt('cited', () => lookupCitedActs(text)),
    attempt('subject', () => lookupBySubject(subjectTerms)),
  ]);
  return [...cited, ...bySubject];
}
