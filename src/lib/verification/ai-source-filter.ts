import type {
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
} from '@/types/verification';
import { filterRelevantSources, type SourceCandidate, type SourceFilterResult } from '@/lib/ai';
import { calculateLayer1Score } from './layer1-factcheck';
import { calculateLayer2Score } from './layer2-news';
import { calculateLayer3Score } from './layer3-official';
import { calculateLayer4Score } from './layer4-social';
import { publisherSiteOf } from './publisher-site';
import { logger } from '@/lib/utils/logger';

export interface LayerSet {
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
}

export type SourceTier = 1 | 2 | 3;

export interface SourceTierBreakdown {
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
}

/** Trims a URL to what is worth spending prompt tokens on. */
function origin(url?: string): string | undefined {
  return url?.replace(/^https?:\/\//, '').slice(0, 120);
}

/**
 * Assigns a Source Reputation Tier (1, 2, or 3) to a URL or publisher.
 * Tier 1: Primary Fact-checkers & Official Institutions
 * Tier 2: Established News Media
 * Tier 3: Social & Unverified Web Sources
 */
export function assignSourceTier(urlStr?: string, publisher?: string): SourceTier {
  const url = (urlStr || '').toLowerCase();
  const pub = (publisher || '').toLowerCase();

  // Tier 1: Recognized Fact-Checkers & International/Governmental Bodies
  if (
    url.includes('snopes.com') ||
    url.includes('factual.ro') ||
    url.includes('veridica.ro') ||
    url.includes('politifact.com') ||
    url.includes('factcheck.org') ||
    url.includes('reuters.com/fact-check') ||
    url.includes('apnews.com/ap-fact-check') ||
    url.includes('who.int') ||
    url.includes('europa.eu') ||
    url.includes('.gov') ||
    url.includes('cdep.ro') ||
    url.includes('senat.ro') ||
    url.includes('presidency.ro') ||
    pub.includes('snopes') ||
    pub.includes('factual') ||
    pub.includes('veridica') ||
    pub.includes('politifact') ||
    pub.includes('euvsdisinfo')
  ) {
    return 1;
  }

  // Tier 3: Social Media & User-Generated Platforms
  if (
    url.includes('twitter.com') ||
    url.includes('x.com') ||
    url.includes('facebook.com') ||
    url.includes('youtube.com') ||
    url.includes('reddit.com') ||
    url.includes('instagram.com') ||
    url.includes('threads.net') ||
    url.includes('bsky.app') ||
    url.includes('tiktok.com')
  ) {
    return 3;
  }

  // Tier 2: General News Outlets & Other Domains
  return 2;
}

/** The reading of a layer that had nothing to read. */
const NOTHING_TO_JUDGE: SourceFilterResult = { relevant: [], supports: [], contradicts: [], opposite: [] };

/**
 * Has the model read every source against the claim: drops the ones that are
 * off topic and replaces the layers' keyword-guessed stances with what each
 * source actually says.
 *
 * Each layer is read in its own request, all in parallel. One request for the
 * whole report made the model think through ~30 sources at once, which on a
 * well-covered topic ran past both its token budget and its timeout — so the
 * step silently did nothing exactly where there was the most evidence.
 *
 * A layer the model could not read keeps its sources but takes no side: its
 * stances are a keyword guess ("FALS" in a headline, a fact-check matched by
 * shared words), and scoring on them called "the MMR vaccine does not cause
 * autism" false because the debunks of the opposite claim counted against it.
 */
export async function applyAISourceFilter(layers: LayerSet, claim: string): Promise<LayerSet> {
  const l1Candidates: SourceCandidate[] = layers.layer1.results.map((r, i) => ({
    id: `l1:${i}`,
    title: r.claimReviewed || r.title || '',
    snippet: `${r.publisher ?? ''} — verdict: ${r.rating ?? ''}`,
    source: origin(publisherSiteOf(r.reviewUrl || r.url || '', r.publisherUrl) ?? r.reviewUrl ?? r.url),
  }));

  const l2Candidates: SourceCandidate[] = layers.layer2.results.map((a, i) => ({
    id: `l2:${i}`,
    title: a.title,
    snippet: a.snippet ?? '',
    source: origin(publisherSiteOf(a.articleUrl || a.url || '', a.sourceUrl) ?? a.articleUrl ?? a.url),
  }));

  const l3Candidates: SourceCandidate[] = layers.layer3.results.map((s, i) => ({
    id: `l3:${i}`,
    title: s.title,
    snippet: s.relevantQuote ?? s.snippet ?? '',
    source: origin(publisherSiteOf(s.documentUrl || s.url || '', s.url) ?? s.documentUrl ?? s.url),
  }));

  const l4Candidates: SourceCandidate[] = layers.layer4.results.map((p, i) => ({
    id: `l4:${i}`,
    title: p.author,
    snippet: p.content ?? p.text ?? '',
    source: origin(p.postUrl || p.url),
  }));

  const judge = (candidates: SourceCandidate[]) =>
    candidates.length === 0 ? Promise.resolve(NOTHING_TO_JUDGE) : filterRelevantSources(claim, candidates);
  const [j1, j2, j3, j4] = await Promise.all([
    judge(l1Candidates),
    judge(l2Candidates),
    judge(l3Candidates),
    judge(l4Candidates),
  ]);

  // Contradiction wins if the model listed a source on both sides.
  const stanceOf = (j: SourceFilterResult, id: string): 'supports' | 'contradicts' | 'neutral' =>
    j.contradicts.includes(id) ? 'contradicts' : j.supports.includes(id) ? 'supports' : 'neutral';

  // A fact-check of the claim's opposite speaks to the claim with its rating
  // inverted: "X is a hoax" rated False is evidence *for* X. The rating label
  // stays as the publisher wrote it; only the value used for scoring flips.
  const l1Surviving = j1
    ? layers.layer1.results
        .map((r, i) => (j1.opposite.includes(`l1:${i}`) ? { ...r, ratingValue: 1 - r.ratingValue } : r))
        .filter((_, i) => j1.relevant.includes(`l1:${i}`))
    : layers.layer1.results;
  const l2Surviving = j2
    ? layers.layer2.results
        .map((a, i) => {
          const stance = stanceOf(j2, `l2:${i}`);
          return { ...a, sentiment: stance === 'supports' ? ('confirms' as const) : stance };
        })
        .filter((_, i) => j2.relevant.includes(`l2:${i}`))
    : layers.layer2.results.map((a) => ({ ...a, sentiment: 'neutral' as const }));
  const l3Surviving = j3
    ? layers.layer3.results
        .map((s, i) => {
          const stance = stanceOf(j3, `l3:${i}`);
          return { ...s, supportsOrDenies: stance === 'contradicts' ? ('denies' as const) : stance };
        })
        // Register records stay whatever the triage says: it judges topical
        // overlap, and "the EU's defence-industry regulation" does not look like
        // "the EU is taking us to war" — yet it is exactly the evidence that
        // answers it.
        .filter((s, i) => s.fromRegister || j3.relevant.includes(`l3:${i}`))
    : layers.layer3.results.map((s) => ({ ...s, supportsOrDenies: 'neutral' as const }));
  const l4Surviving = j4 ? layers.layer4.results.filter((_, i) => j4.relevant.includes(`l4:${i}`)) : layers.layer4.results;

  const layer1: Layer1Result = {
    ...layers.layer1,
    results: l1Surviving,
    matches: l1Surviving,
    summary: `${l1Surviving.length} fact-checks found`,
    // Unread fact-checks may have reviewed a different or the opposite claim.
    layerScore: j1 ? calculateLayer1Score(l1Surviving) : 0.5,
  };

  const layer2: Layer2Result = {
    ...layers.layer2,
    results: l2Surviving,
    articles: l2Surviving,
    summary: `${l2Surviving.length} news articles found`,
    layerScore: calculateLayer2Score(l2Surviving),
  };

  const layer3: Layer3Result = {
    ...layers.layer3,
    results: l3Surviving,
    sources: l3Surviving,
    summary: `${l3Surviving.length} official documents found`,
    layerScore: calculateLayer3Score(l3Surviving),
  };

  const layer4: Layer4Result = {
    ...layers.layer4,
    results: l4Surviving,
    posts: l4Surviving,
    summary: `${l4Surviving.length} social media posts found`,
    layerScore: calculateLayer4Score(l4Surviving),
  };

  logger.info('AI source filter applied', {
    service: 'verification',
    before: l1Candidates.length + l2Candidates.length + l3Candidates.length + l4Candidates.length,
    unreadLayers: [j1, j2, j3, j4].filter((j) => j === null).length,
    after: l1Surviving.length + l2Surviving.length + l3Surviving.length + l4Surviving.length,
  });

  return { layer1, layer2, layer3, layer4 };
}
