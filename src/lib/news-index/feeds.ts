/**
 * The RSS feeds the own news index collects from.
 *
 * Every URL here answered with a valid feed on 2026-10-10. A feed that later
 * dies or moves only loses that outlet — ingestion reports it by name and
 * carries on — so this list is safe to prune or extend by hand.
 *
 * `kind` decides how long an item is kept (see RETENTION_DAYS in index.ts):
 * news ages out quickly, a fact-check or an official communiqué stays useful
 * for as long as the claim it answers keeps circulating.
 */
export interface NewsFeed {
  url: string;
  /** Publisher name shown in reports. */
  source: string;
  kind: 'news' | 'factcheck' | 'official';
}

export const NEWS_FEEDS: readonly NewsFeed[] = [
  // Fact-checkers
  { url: 'https://www.factual.ro/feed/', source: 'Factual.ro', kind: 'factcheck' },
  { url: 'https://www.misreport.ro/feed', source: 'Misreport', kind: 'factcheck' },

  // Institutions
  { url: 'https://www.gov.ro/ro/rss', source: 'Guvernul României', kind: 'official' },
  { url: 'https://www.presidency.ro/ro/rss', source: 'Administrația Prezidențială', kind: 'official' },
  { url: 'https://www.mae.ro/rss.xml', source: 'Ministerul Afacerilor Externe', kind: 'official' },

  // General news
  { url: 'https://www.digi24.ro/rss', source: 'Digi24', kind: 'news' },
  { url: 'https://hotnews.ro/feed', source: 'HotNews', kind: 'news' },
  { url: 'https://www.g4media.ro/feed', source: 'G4Media', kind: 'news' },
  { url: 'https://www.mediafax.ro/feed', source: 'Mediafax', kind: 'news' },
  { url: 'https://www.news.ro/rss', source: 'News.ro', kind: 'news' },
  { url: 'https://adevarul.ro/rss/index', source: 'Adevărul', kind: 'news' },
  { url: 'https://www.libertatea.ro/feed', source: 'Libertatea', kind: 'news' },
  { url: 'https://stirileprotv.ro/rss/', source: 'Știrile ProTV', kind: 'news' },
  { url: 'https://tvrinfo.ro/feed/', source: 'TVR Info', kind: 'news' },
  { url: 'https://observatornews.ro/rss', source: 'Observator', kind: 'news' },
  { url: 'https://www.antena3.ro/rss', source: 'Antena 3 CNN', kind: 'news' },
  { url: 'https://ziare.com/rss/12h.xml', source: 'Ziare.com', kind: 'news' },
  { url: 'https://spotmedia.ro/feed', source: 'SpotMedia', kind: 'news' },
  { url: 'https://www.biziday.ro/feed/', source: 'Biziday', kind: 'news' },
  { url: 'https://rss.dw.com/rdf/rss-rom-all', source: 'DW România', kind: 'news' },
  { url: 'https://newsweek.ro/rss', source: 'Newsweek România', kind: 'news' },
  { url: 'https://www.cotidianul.ro/feed/', source: 'Cotidianul', kind: 'news' },
  { url: 'https://jurnalul.ro/rss', source: 'Jurnalul', kind: 'news' },
  { url: 'https://www.gandul.ro/feed', source: 'Gândul', kind: 'news' },
  { url: 'https://www.b1tv.ro/feed', source: 'B1 TV', kind: 'news' },
  { url: 'https://www.romaniatv.net/feed', source: 'România TV', kind: 'news' },
  { url: 'https://www.dcnews.ro/rss', source: 'DC News', kind: 'news' },
  { url: 'https://www.aktual24.ro/feed/', source: 'Aktual24', kind: 'news' },

  // Economy, education
  { url: 'https://www.profit.ro/rss', source: 'Profit.ro', kind: 'news' },
  { url: 'https://www.zf.ro/rss/', source: 'Ziarul Financiar', kind: 'news' },
  { url: 'https://www.economica.net/feed', source: 'Economica.net', kind: 'news' },
  { url: 'https://startupcafe.ro/feed', source: 'StartupCafe', kind: 'news' },
  { url: 'https://www.edupedu.ro/feed/', source: 'Edupedu', kind: 'news' },

  // Investigations
  { url: 'https://recorder.ro/feed/', source: 'Recorder', kind: 'news' },
  { url: 'https://pressone.ro/api/rss', source: 'PressOne', kind: 'news' },
  { url: 'https://snoop.ro/feed/', source: 'Snoop', kind: 'news' },
  { url: 'https://context.ro/feed/', source: 'Context.ro', kind: 'news' },
];
