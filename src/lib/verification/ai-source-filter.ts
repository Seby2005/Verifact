import type {
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
} from '@/types/verification';
import { filterRelevantSources, type SourceCandidate } from '@/lib/ai';
import { calculateLayer1Score } from './layer1-factcheck';
import { calculateLayer2Score } from './layer2-news';
import { calculateLayer3Score } from './layer3-official';
import { calculateLayer4Score } from './layer4-social';
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
    pub.includes('snopes') ||
    pub.includes('factual') ||
    pub.includes('veridica') ||
    pub.includes('politifact')
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

export async function applyAISourceFilter(layers: LayerSet, claim: string): Promise<LayerSet> {
  const candidates: SourceCandidate[] = [];

  layers.layer1.results.forEach((r, i) => {
    candidates.push({
      id: `l1:${i}`,
      title: r.claimReviewed || r.title || '',
      snippet: `${r.publisher ?? ''} — verdict: ${r.rating ?? ''}`,
      source: origin(r.reviewUrl || r.url),
    });
  });

  layers.layer2.results.forEach((a, i) => {
    candidates.push({
      id: `l2:${i}`,
      title: a.title,
      snippet: a.snippet ?? '',
      source: origin(a.articleUrl || a.url),
    });
  });

  layers.layer3.results.forEach((s, i) => {
    candidates.push({
      id: `l3:${i}`,
      title: s.title,
      snippet: s.relevantQuote ?? s.snippet ?? '',
      source: origin(s.documentUrl || s.url),
    });
  });

  layers.layer4.results.forEach((p, i) => {
    candidates.push({
      id: `l4:${i}`,
      title: p.author,
      snippet: p.content ?? p.text ?? '',
      source: origin(p.postUrl || p.url),
    });
  });

  if (candidates.length === 0) return layers;

  const relevantIds = await filterRelevantSources(claim, candidates);
  if (relevantIds === null) return layers;

  const keepSet = new Set(relevantIds);

  const l1Surviving = layers.layer1.results.filter((_, i) => keepSet.has(`l1:${i}`));
  const l2Surviving = layers.layer2.results.filter((_, i) => keepSet.has(`l2:${i}`));
  const l3Surviving = layers.layer3.results.filter((_, i) => keepSet.has(`l3:${i}`));
  const l4Surviving = layers.layer4.results.filter((_, i) => keepSet.has(`l4:${i}`));

  const layer1: Layer1Result = {
    ...layers.layer1,
    results: l1Surviving,
    matches: l1Surviving,
    summary: `${l1Surviving.length} fact-checks found`,
    layerScore: calculateLayer1Score(l1Surviving),
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
    before: candidates.length,
    after: l1Surviving.length + l2Surviving.length + l3Surviving.length + l4Surviving.length,
  });

  return { layer1, layer2, layer3, layer4 };
}
