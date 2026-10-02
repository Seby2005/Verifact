// Seed narratives for the Observator preview. These are real disinformation
// narratives Verifact has encountered, hand-shaped into the shape the map needs.
// In production this comes from the `narratives` table (clustered from
// claims_corpus); the component reads from here so the preview runs with no DB.

export type Verdict = 'false' | 'partial' | 'unclear' | 'true';
export type Category = 'health' | 'politics' | 'security' | 'science' | 'money' | 'climate';

export interface Narrative {
  id: string;
  title: string;
  summary: string;
  verdict: Verdict;
  category: Category;
  /** Where the narrative first surfaced. */
  origin: { lat: number; lon: number; label: string };
  /** Regions it spread to (markers on the globe). */
  spread: Array<{ lat: number; lon: number }>;
  variantCount: number;
  firstSeen: string; // ISO date
  velocity: 'rising' | 'steady' | 'dormant';
  /** Relative appearance counts over the last ~8 weeks, for the sparkline. */
  timeline: number[];
  sources: Array<{ name: string; url: string }>;
  /** True when this narrative's metrics came from live fact-check data. */
  live?: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  health: 'Sănătate',
  politics: 'Politică',
  security: 'Securitate',
  science: 'Știință',
  money: 'Bani & escrocherii',
  climate: 'Climă',
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  false: 'Probabil fals',
  partial: 'Parțial',
  unclear: 'Neclar',
  true: 'Probabil adevărat',
};

export const NARRATIVES: Narrative[] = [
  {
    id: 'steag-fals-razboi',
    title: 'Ucraina bagă România în război prin acțiuni de „steag fals”',
    summary:
      'Narativă care susține că incidente de la graniță ar fi provocări ucrainene menite să atragă România în război. Contrazisă de sursele oficiale și de presa de încredere.',
    verdict: 'false',
    category: 'security',
    origin: { lat: 55.75, lon: 37.62, label: 'Moscova' },
    spread: [{ lat: 44.43, lon: 26.1 }, { lat: 47.0, lon: 28.86 }, { lat: 44.32, lon: 23.8 }],
    variantCount: 14,
    firstSeen: '2026-08-11',
    velocity: 'rising',
    timeline: [1, 2, 2, 3, 5, 6, 9, 14],
    sources: [
      { name: 'BROD', url: 'https://brodhub.eu/en/' },
      { name: 'Lead Stories', url: 'https://leadstories.com' },
    ],
  },
  {
    id: 'plati-cash-interzise',
    title: 'Plățile cash vor fi complet interzise de la 1 ianuarie',
    summary:
      'Afirmație recurentă că numerarul va fi scos în afara legii. Falsă — nicio lege nu prevede interzicerea completă a plăților cash.',
    verdict: 'false',
    category: 'money',
    origin: { lat: 44.43, lon: 26.1, label: 'București' },
    spread: [{ lat: 46.77, lon: 23.6 }, { lat: 45.75, lon: 21.23 }],
    variantCount: 9,
    firstSeen: '2026-08-15',
    velocity: 'steady',
    timeline: [2, 3, 4, 4, 5, 6, 7, 9],
    sources: [{ name: 'Verifact', url: 'https://verifact.ro/rapoarte' }],
  },
  {
    id: 'vaccin-grafen',
    title: 'Anesteziile și vaccinurile conțin oxid de grafen',
    summary:
      'Teorie conform căreia produse medicale uzuale ar conține „oxid de grafen” pentru control. Demontată de organizațiile de fact-checking.',
    verdict: 'false',
    category: 'health',
    origin: { lat: 40.42, lon: -3.7, label: 'Madrid' },
    spread: [{ lat: 44.43, lon: 26.1 }, { lat: 48.85, lon: 2.35 }, { lat: 41.9, lon: 12.5 }],
    variantCount: 21,
    firstSeen: '2026-07-28',
    velocity: 'rising',
    timeline: [3, 5, 6, 8, 10, 13, 17, 21],
    sources: [{ name: 'BROD', url: 'https://brodhub.eu/en/' }],
  },
  {
    id: '5g-coronavirus',
    title: 'Rețeaua 5G răspândește coronavirusul',
    summary:
      'Mit persistent care leagă antenele 5G de răspândirea virusului. Fără niciun temei științific; virusurile nu se transmit prin unde radio.',
    verdict: 'false',
    category: 'science',
    origin: { lat: 51.5, lon: -0.12, label: 'Londra' },
    spread: [{ lat: 44.43, lon: 26.1 }, { lat: 52.52, lon: 13.4 }, { lat: 48.2, lon: 16.37 }],
    variantCount: 12,
    firstSeen: '2026-08-02',
    velocity: 'dormant',
    timeline: [8, 7, 6, 5, 4, 3, 3, 2],
    sources: [{ name: 'AFP Fact Check', url: 'https://factcheck.afp.com' }],
  },
  {
    id: 'card-sanatate-dispare',
    title: 'Cardul de sănătate dispare',
    summary:
      'Afirmație parțial adevărată: se schimbă forma cardului, dar accesul la servicii nu se pierde. Contextul lipsă transformă o schimbare administrativă în panică.',
    verdict: 'partial',
    category: 'health',
    origin: { lat: 44.43, lon: 26.1, label: 'București' },
    spread: [{ lat: 47.16, lon: 27.58 }],
    variantCount: 6,
    firstSeen: '2026-08-16',
    velocity: 'steady',
    timeline: [1, 2, 3, 3, 4, 5, 5, 6],
    sources: [{ name: 'Verifact', url: 'https://verifact.ro/rapoarte' }],
  },
  {
    id: 'drona-tulcea',
    title: 'Drona căzută la Tulcea este rusească',
    summary:
      'Confirmată parțial de surse oficiale — fragmente de dronă de tip rusesc găsite în zona Tulcea, dar cu detalii de dată neclare.',
    verdict: 'partial',
    category: 'security',
    origin: { lat: 45.17, lon: 28.8, label: 'Tulcea' },
    spread: [{ lat: 44.43, lon: 26.1 }],
    variantCount: 7,
    firstSeen: '2026-08-14',
    velocity: 'steady',
    timeline: [2, 3, 4, 5, 5, 6, 7, 7],
    sources: [{ name: 'Dobrogea News', url: 'https://dobrogeanews.ro' }],
  },
  {
    id: 'haarp-clima',
    title: 'H.A.A.R.P. controlează vremea și clima',
    summary:
      'Teorie conform căreia un program de cercetare ar dirija fenomenele meteo extreme. Fără temei — HAARP studiază ionosfera, nu controlează clima.',
    verdict: 'false',
    category: 'climate',
    origin: { lat: 61.6, lon: -145.15, label: 'Alaska (atribuit)' },
    spread: [{ lat: 44.43, lon: 26.1 }, { lat: 45.65, lon: 25.6 }],
    variantCount: 5,
    firstSeen: '2026-08-09',
    velocity: 'dormant',
    timeline: [4, 4, 3, 3, 2, 2, 2, 5],
    sources: [{ name: 'BROD', url: 'https://brodhub.eu/en/' }],
  },

  // --- International narratives (so the globe isn't Romania-only) -----------
  {
    id: 'us-election-stolen',
    title: 'Alegerile din SUA au fost „furate” prin fraudă masivă',
    summary:
      'Narativă persistentă despre fraudă electorală la scară largă în SUA. Respinsă de instanțe, autorități electorale și verificatori independenți.',
    verdict: 'false',
    category: 'politics',
    origin: { lat: 38.9, lon: -77.04, label: 'Washington D.C.' },
    spread: [{ lat: 40.71, lon: -74.0 }, { lat: 34.05, lon: -118.24 }, { lat: 51.5, lon: -0.12 }],
    variantCount: 31,
    firstSeen: '2026-07-20',
    velocity: 'rising',
    timeline: [6, 8, 11, 14, 18, 22, 27, 31],
    sources: [
      { name: 'FactCheck.org', url: 'https://www.factcheck.org' },
      { name: 'Reuters Fact Check', url: 'https://www.reuters.com/fact-check' },
    ],
  },
  {
    id: 'died-suddenly',
    title: '„Died Suddenly” — vaccinurile COVID provoacă decese în masă',
    summary:
      'Campanie care atribuie orice deces subit vaccinurilor COVID. Contrazisă de datele de mortalitate și de studiile de siguranță.',
    verdict: 'false',
    category: 'health',
    origin: { lat: 40.71, lon: -74.0, label: 'New York' },
    spread: [{ lat: 51.5, lon: -0.12 }, { lat: 44.43, lon: 26.1 }, { lat: -33.87, lon: 151.21 }],
    variantCount: 27,
    firstSeen: '2026-07-25',
    velocity: 'rising',
    timeline: [4, 6, 9, 12, 16, 20, 24, 27],
    sources: [{ name: 'AFP Fact Check', url: 'https://factcheck.afp.com' }],
  },
  {
    id: 'climate-hoax',
    title: 'Schimbările climatice sunt o înșelătorie',
    summary:
      'Narativă care neagă consensul științific asupra încălzirii globale. Contrazisă de măsurători și de literatura științifică revizuită.',
    verdict: 'false',
    category: 'climate',
    origin: { lat: 39.0, lon: -98.0, label: 'SUA (central)' },
    spread: [{ lat: 52.52, lon: 13.4 }, { lat: -23.55, lon: -46.63 }],
    variantCount: 15,
    firstSeen: '2026-08-01',
    velocity: 'steady',
    timeline: [10, 11, 12, 12, 13, 14, 14, 15],
    sources: [{ name: 'Science Feedback', url: 'https://science.feedback.org' }],
  },
  {
    id: 'great-replacement',
    title: 'Teoria „Marii Înlocuiri” a populației europene',
    summary:
      'Teorie conspiraționistă despre înlocuirea planificată a populației europene prin migrație. Un cadru fals folosit pentru a alimenta ura.',
    verdict: 'false',
    category: 'politics',
    origin: { lat: 48.85, lon: 2.35, label: 'Paris' },
    spread: [{ lat: 52.52, lon: 13.4 }, { lat: 41.9, lon: 12.5 }, { lat: 44.43, lon: 26.1 }],
    variantCount: 18,
    firstSeen: '2026-07-30',
    velocity: 'steady',
    timeline: [8, 9, 11, 12, 13, 15, 16, 18],
    sources: [{ name: 'EUvsDisinfo', url: 'https://euvsdisinfo.eu' }],
  },
  {
    id: 'gates-microchip',
    title: 'Bill Gates implantează microcipuri prin vaccinuri',
    summary:
      'Teorie conform căreia vaccinurile ar conține microcipuri de urmărire finanțate de Bill Gates. Fără niciun temei tehnic sau factual.',
    verdict: 'false',
    category: 'health',
    origin: { lat: 47.6, lon: -122.33, label: 'Seattle' },
    spread: [{ lat: 44.43, lon: 26.1 }, { lat: 19.43, lon: -99.13 }, { lat: 28.61, lon: 77.21 }],
    variantCount: 24,
    firstSeen: '2026-07-18',
    velocity: 'dormant',
    timeline: [20, 18, 16, 14, 12, 10, 9, 8],
    sources: [{ name: 'Reuters Fact Check', url: 'https://www.reuters.com/fact-check' }],
  },
  {
    id: 'china-bioweapon',
    title: 'COVID-19 a fost creat ca armă biologică',
    summary:
      'Afirmație despre originea de laborator/armă biologică a virusului. Originea rămâne dezbătută științific, dar varianta „armă intenționată” nu are dovezi.',
    verdict: 'unclear',
    category: 'science',
    origin: { lat: 30.59, lon: 114.3, label: 'Wuhan' },
    spread: [{ lat: 38.9, lon: -77.04 }, { lat: 51.5, lon: -0.12 }],
    variantCount: 11,
    firstSeen: '2026-08-04',
    velocity: 'steady',
    timeline: [5, 6, 7, 8, 8, 9, 10, 11],
    sources: [{ name: 'Health Feedback', url: 'https://healthfeedback.org' }],
  },
  {
    id: 'brazil-voting-machines',
    title: 'Urnele electronice din Brazilia sunt fraudate',
    summary:
      'Narativă despre manipularea urnelor electronice braziliene. Respinsă de autoritatea electorală și de auditurile independente.',
    verdict: 'false',
    category: 'politics',
    origin: { lat: -15.79, lon: -47.88, label: 'Brasília' },
    spread: [{ lat: -23.55, lon: -46.63 }, { lat: 38.9, lon: -77.04 }],
    variantCount: 8,
    firstSeen: '2026-08-06',
    velocity: 'dormant',
    timeline: [7, 7, 6, 6, 5, 5, 6, 8],
    sources: [{ name: 'AFP Fact Check', url: 'https://factcheck.afp.com' }],
  },
];
