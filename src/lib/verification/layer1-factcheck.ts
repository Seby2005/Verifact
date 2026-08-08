import type { FactCheckResult, Language, Layer1Result } from '@/types/verification';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import type { ExpandedQueries } from './query-expander';

// ─── Internal Google API types ────────────────────────────────

interface GoogleFactCheckResponse {
  claims?: GoogleClaim[];
  nextPageToken?: string;
}

interface GoogleClaim {
  text: string;
  claimant?: string;
  claimDate?: string;
  claimReview?: Array<{
    publisher?: { name?: string; site?: string };
    url?: string;
    title?: string;
    reviewDate?: string;
    textualRating?: string;
    languageCode?: string;
  }>;
}

// ─── Rating normalization map ─────────────────────────────────

const RATING_MAP: Record<string, number> = {
  // Definitely false (0-0.1)
  'false': 0.0,
  'fals': 0.0,
  'fals.': 0.0,
  'incorrect': 0.05,
  'incorect': 0.05,
  'wrong': 0.05,
  'fake': 0.05,
  'fabricated': 0.05,
  'fabricat': 0.05,
  'pants on fire': 0.0,
  'four pinocchios': 0.0,
  'false.': 0.0,
  'eroare': 0.05,
  'error': 0.05,
  'hoax': 0.0,
  'not true': 0.05,
  'nu este adevarat': 0.05,
  'nu este adevărat': 0.05,
  'dezinformare': 0.05,
  'misinformation': 0.05,
  'disinformation': 0.0,
  'ai-generated image': 0.0,
  'ai generated': 0.0,
  'deepfake': 0.0,

  // Mostly false (0.1-0.35)
  'mostly false': 0.2,
  'mostly incorrect': 0.2,
  'largely false': 0.15,
  'three pinocchios': 0.2,
  'barely true': 0.25,
  'in mare parte fals': 0.2,
  'în mare parte fals': 0.2,
  'exaggerated': 0.25,
  'exagerat': 0.25,

  // Mixed/unclear (0.4-0.6)
  'mixed': 0.5,
  'half true': 0.5,
  'half-true': 0.5,
  'partially true': 0.55,
  'partially false': 0.45,
  'partial': 0.5,
  'parțial': 0.5,
  'partially accurate': 0.55,
  'partly false': 0.4,
  'partly true': 0.6,
  'two pinocchios': 0.35,
  'one pinocchio': 0.4,
  'misleading': 0.35,
  'manipulator': 0.3,
  'neclar': 0.5,
  'unclear': 0.5,
  'unproven': 0.5,
  'unverified': 0.5,
  'parțial adevărat': 0.55,
  'partial adevarat': 0.55,
  'parțial fals': 0.4,
  'partial fals': 0.4,
  'context lipsă': 0.45,
  'context missing': 0.45,

  // Mostly true (0.65-0.85)
  'mostly true': 0.8,
  'largely true': 0.8,
  'mostly accurate': 0.8,
  'în mare parte adevărat': 0.8,
  'in mare parte adevarat': 0.8,

  // Definitely true (0.9-1.0)
  'true': 1.0,
  'adevarat': 1.0,
  'adevărat': 1.0,
  'true.': 1.0,
  'correct': 0.95,
  'corect': 0.95,
  'accurate': 0.95,
  'geppetto checkmark': 1.0,
  'no pinocchios': 1.0,
  'verificat': 1.0,
  'verified': 1.0,
};

export function normalizeRating(rawRating: string): number {
  if (!rawRating) return 0.5;
  const cleaned = rawRating.trim().toLowerCase();

  if (cleaned in RATING_MAP) {
    return RATING_MAP[cleaned];
  }

  for (const [key, value] of Object.entries(RATING_MAP)) {
    if (cleaned.includes(key)) {
      return value;
    }
  }

  return 0.5;
}

export function buildFactCheckQuery(text: string, _translate?: boolean): string {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['imaginea', 'fost', 'este', 'sunt', 'care'].includes(w));
  return Array.from(new Set(words)).slice(0, 8).join(' ');
}

function calculateRelevance(claimText: string, queryText: string): number {
  const claimWords = new Set(
    claimText.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)
  );
  const queryWords = new Set(
    queryText.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)
  );

  if (queryWords.size === 0) return 0.5;

  let matches = 0;
  for (const word of queryWords) {
    if (claimWords.has(word)) matches++;
  }

  return Math.min(1.0, Math.max(0.3, matches / queryWords.size));
}

function deduplicateByUrl(results: FactCheckResult[]): FactCheckResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.reviewUrl || `${r.publisher}-${r.claimReviewed}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchFactChecks(query: string, lang: string): Promise<FactCheckResult[]> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const params = new URLSearchParams({
    key: apiKey,
    query: query.slice(0, 200),
    languageCode: lang,
    pageSize: '10',
  });

  try {
    const response = await withCircuitBreaker('google-fact-check', () =>
      fetchWithRetry(
        `https://factchecktools.googleapis.com/v1alpha1/claims:search?${params.toString()}`,
        () => ({ signal: AbortSignal.timeout(8000) }),
        { label: 'layer1-factcheck' }
      ).then((res) => {
        if (!res.ok) throw new Error(`Fact Check API error: ${res.status} ${res.statusText}`);
        return res;
      })
    );

    const data = (await response.json()) as GoogleFactCheckResponse;
    if (!data.claims?.length) return [];

    return data.claims.map((claim): FactCheckResult => ({
      claimReviewed: claim.text,
      rating: claim.claimReview?.[0]?.textualRating ?? 'Unknown',
      ratingValue: normalizeRating(claim.claimReview?.[0]?.textualRating ?? ''),
      publisher: claim.claimReview?.[0]?.publisher?.name ?? 'Unknown',
      publisherUrl: claim.claimReview?.[0]?.publisher?.site ?? '',
      reviewUrl: claim.claimReview?.[0]?.url ?? '',
      reviewDate: claim.claimReview?.[0]?.reviewDate ?? '',
      claimant: claim.claimant,
      relevanceScore: Math.max(calculateRelevance(claim.text, query), 0.3),
    }));
  } catch {
    return [];
  }
}

export function calculateLayer1Score(results: FactCheckResult[]): number {
  if (results.length === 0) return 0.5;

  const totalRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0);
  if (totalRelevance === 0) return 0.5;

  const weightedScore = results.reduce(
    (sum, r) => sum + (r.ratingValue ?? 0) * r.relevanceScore,
    0
  );

  return weightedScore / totalRelevance;
}

export async function runLayer1(
  text: string,
  language: Language,
  expandedQueries?: ExpandedQueries
): Promise<Layer1Result> {
  const startTime = Date.now();

  const roQuery = expandedQueries?.romanianQuery || buildFactCheckQuery(text, false);
  const enQuery = expandedQueries?.englishQuery || buildFactCheckQuery(text, true);

  const [roResults, enResults] = await Promise.all([
    fetchFactChecks(roQuery, language === 'unknown' ? 'ro' : language),
    fetchFactChecks(enQuery, 'en'),
  ]);

  const allResults = deduplicateByUrl([...roResults, ...enResults]);
  allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const layerScore = calculateLayer1Score(allResults);

  return {
    status: 'success',
    matches: allResults.slice(0, 8),
    results: allResults.slice(0, 8),
    summary: `${allResults.length} fact-checks found`,
    layerScore,
    processingTime: Date.now() - startTime,
  };
}
