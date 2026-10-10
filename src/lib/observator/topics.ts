// Query + language for enriching each curated narrative with live fact-checks.
// Keyed by the narrative id in seed.ts: the seed supplies the placement, title
// and summary (which live fact-check results don't carry cleanly); the API
// supplies the real count, sources, recency and dominant verdict.

export const TOPIC_QUERIES: Record<string, { query: string; lang: string }> = {
  'steag-fals-razboi': { query: 'steag fals Ucraina România război', lang: 'ro' },
  'plati-cash-interzise': { query: 'plăți cash interzise numerar', lang: 'ro' },
  'vaccin-grafen': { query: 'graphene oxide vaccine', lang: 'en' },
  '5g-coronavirus': { query: '5G coronavirus', lang: 'en' },
  'card-sanatate-dispare': { query: 'card sănătate', lang: 'ro' },
  'drona-tulcea': { query: 'dronă Tulcea', lang: 'ro' },
  'haarp-clima': { query: 'HAARP weather control', lang: 'en' },
  'us-election-stolen': { query: 'US election stolen fraud', lang: 'en' },
  'died-suddenly': { query: 'died suddenly vaccine', lang: 'en' },
  'climate-hoax': { query: 'climate change hoax', lang: 'en' },
  'great-replacement': { query: 'great replacement migration', lang: 'en' },
  'gates-microchip': { query: 'Bill Gates microchip vaccine', lang: 'en' },
  'china-bioweapon': { query: 'COVID lab leak bioweapon', lang: 'en' },
  'brazil-voting-machines': { query: 'Brazil voting machines fraud', lang: 'en' },
};
