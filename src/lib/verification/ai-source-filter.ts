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

/**
 * Second-stage relevance pass over everything the layers found.
 *
 * The keyword filter in relevance.ts runs first and inside each layer, but it
 * cannot solve the case it was written for. "Donald Trump is dead" reduces to
 * three significant words, two of which are the person's name, so any article
 * naming him clears a word-overlap test — "Disinformation, disease, and Donald
 * Trump" scores the same as a fact-check about his death. Deciding that the
 * claim's load-bearing word is "dead" needs to read the sentence, not count
 * its tokens.
 *
 * So the model gets one batched triage call over the candidates from all four
 * layers, and answers a narrower question than the assessment does: is this
 * document about the claim at all?
 *
 * Filtering happens before scoring, not just before display, so a dropped
 * source stops influencing the verdict as well as disappearing from the source
 * list. Each affected layer's own score function is re-run over its surviving
 * results.
 */
/** Trims a URL to what is worth spending prompt tokens on. */
function origin(url?: string): string | undefined {
  return url?.replace(/^https?:\/\//, '').slice(0, 120);
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

  // null means the filter was unavailable or failed — keep everything rather
  // than discarding evidence because a model call did not come back.
  if (relevantIds === null) return layers;

  // An empty list used to be overridden and everything kept, on the reasoning
  // that "none of these are relevant" was more likely a confused model than a
  // true reading. In practice it was usually right and the override was the
  // error: asked about "apa pură fierbe la 100°C" it correctly rejected an EU
  // regulation on chemical test methods, and the guard put it back in the
  // report as evidence.
  //
  // Trusting the verdict is also safe now in a way it was not before. A failed
  // call still arrives as null and keeps everything, so this branch only ever
  // sees a judgement the model actually made; and a report that ends up with
  // no evidence can no longer produce a confident verdict, because scoring.ts
  // caps a score built on the assessment alone. The worst case is a cautious
  // "unclear" over an empty source list — which is honest — rather than a
  // definitive verdict resting on documents about something else.
  if (relevantIds.length === 0) {
    logger.info('AI source filter found nothing on topic', {
      service: 'ai-source-filter',
      candidates: candidates.length,
    });
  }

  const keep = new Set(relevantIds);
  const l1 = layers.layer1.results.filter((_, i) => keep.has(`l1:${i}`));
  const l2 = layers.layer2.results.filter((_, i) => keep.has(`l2:${i}`));
  const l3 = layers.layer3.results.filter((_, i) => keep.has(`l3:${i}`));
  const l4 = layers.layer4.results.filter((_, i) => keep.has(`l4:${i}`));

  const removed = candidates.length - (l1.length + l2.length + l3.length + l4.length);
  if (removed > 0) {
    logger.info('AI source filter removed off-topic sources', {
      service: 'ai-source-filter',
      removed,
      kept: candidates.length - removed,
    });
  }

  return {
    // Scores are recomputed from the surviving results by each layer's own
    // scoring function, so the number the reader sees and the sources they can
    // click always describe the same evidence.
    layer1: { ...layers.layer1, results: l1, matches: l1, layerScore: calculateLayer1Score(l1) },
    layer2: { ...layers.layer2, results: l2, articles: l2, layerScore: calculateLayer2Score(l2) },
    layer3: { ...layers.layer3, results: l3, sources: l3, layerScore: calculateLayer3Score(l3) },
    layer4: { ...layers.layer4, results: l4, posts: l4, layerScore: calculateLayer4Score(l4) },
  };
}
