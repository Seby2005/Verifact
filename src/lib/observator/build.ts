// Builds the Observator's narratives from live fact-check data, using the
// curated seed for placement/title/summary and overlaying real metrics
// (count, sources, recency, dominant verdict) from the Google Fact Check API.
// Any narrative whose topic returns nothing falls back to its seed values.

import { NARRATIVES, type Narrative, type Verdict } from './seed';
import { TOPIC_QUERIES } from './topics';
import { searchFactChecks, scoreToVerdict3, classifyRating, dedupeClaims, type FeedClaim } from '@/lib/factcheck/feed';

function dominantVerdict(claims: FeedClaim[], fallback: Verdict): Verdict {
  if (!claims.length) return fallback;
  const counts: Record<string, number> = { false: 0, partial: 0, true: 0 };
  for (const c of claims) counts[classifyRating(c.rating) ?? scoreToVerdict3(c.score)] += 1;
  const verdicts: Verdict[] = ['false', 'partial', 'true'];
  verdicts.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  return verdicts[0];
}

function uniqueSources(claims: FeedClaim[]): Array<{ name: string; url: string }> {
  const seen = new Set<string>();
  const out: Array<{ name: string; url: string }> = [];
  for (const c of claims) {
    const name = c.publisher || 'Fact-checker';
    if (seen.has(name) || !c.url) continue;
    seen.add(name);
    out.push({ name, url: c.url });
  }
  return out;
}

function timelineFromDates(dates: number[]): number[] | null {
  const valid = dates.filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
  if (valid.length < 2) return null;
  const min = valid[0];
  const span = Math.max(1, valid[valid.length - 1] - min);
  const buckets = new Array(8).fill(0);
  for (const t of valid) {
    const i = Math.min(7, Math.floor(((t - min) / span) * 8));
    buckets[i] += 1;
  }
  return buckets;
}

function velocityFromTimeline(timeline: number[]): Narrative['velocity'] {
  const half = Math.floor(timeline.length / 2);
  const early = timeline.slice(0, half).reduce((a, b) => a + b, 0);
  const late = timeline.slice(half).reduce((a, b) => a + b, 0);
  if (late > early * 1.3) return 'rising';
  if (late < early * 0.7) return 'dormant';
  return 'steady';
}

async function enrich(base: Narrative): Promise<Narrative> {
  const tq = TOPIC_QUERIES[base.id];
  if (!tq) return base;

  const claims = dedupeClaims(await searchFactChecks(tq.query, tq.lang, 10));
  if (!claims.length) return { ...base, live: false };

  const dateNums = claims.map((c) => Date.parse(c.date)).filter((n) => !Number.isNaN(n));
  const timeline = timelineFromDates(dateNums) ?? base.timeline;
  const sources = uniqueSources(claims).slice(0, 4);

  return {
    ...base,
    verdict: dominantVerdict(claims, base.verdict),
    variantCount: claims.length,
    sources: sources.length ? sources : base.sources,
    timeline,
    velocity: velocityFromTimeline(timeline),
    firstSeen: dateNums.length ? new Date(Math.min(...dateNums)).toISOString() : base.firstSeen,
    live: true,
  };
}

/** All narratives, enriched with live fact-check data where available. */
export async function buildNarratives(): Promise<Narrative[]> {
  return Promise.all(NARRATIVES.map(enrich));
}
