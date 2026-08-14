import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ApiPricing, FixedCost, VerificationCost } from '@/types/database';
import {
  buildPricingMap,
  resolvePricing,
  calculateTokenCost,
  convertToEur,
  STANDARD_PRO_PRICE_EUR,
} from './pricing';

export interface VariableCostSummary {
  costUsd: number;
  costEur: number;
  verificationsCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface FinancialMetrics {
  variableCosts: {
    today: VariableCostSummary;
    thisWeek: VariableCostSummary;
    thisMonth: VariableCostSummary;
    allTime: VariableCostSummary;
    averageCostPerVerificationUsd: number;
    averageCostPerVerificationEur: number;
    projectedCostPer100VerificationsEur: number;
    monthlyProjection7DaysEur: number;
    monthlyProjection30DaysEur: number;
    projectedMonthlyVerifications7d: number;
    projectedMonthlyVerifications30d: number;
    averageInputTokensPerVerification: number;
    averageOutputTokensPerVerification: number;
  };
  fixedCosts: {
    items: FixedCost[];
    totalMonthlyEur: number;
  };
  subscribers: {
    freeCount: number;
    proCount: number;
    businessCount: number;
    totalActivePremium: number;
    proPricePerMonthEur: number;
    currentMrrEur: number;
  };
  breakEven: {
    totalMonthlyCostEur: number; // fixed + projected variable
    breakEvenSubscribersNeeded: number;
    currentSubscribers: number;
    subscribersGap: number;
    targetProgressPercentage: number;
  };
  apiPricing: ApiPricing[];
  recentVerifications: Array<{
    id: string;
    createdAt: string;
    inputText: string;
    verdict: string | null;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    costEur: number;
  }>;
}

interface RawVerificationRow {
  id: string;
  created_at: string;
  input_text: string;
  verdict: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
}

interface RawProfileRow {
  tier: string;
}

export async function calculateFinancialMetrics(
  adminClient: SupabaseClient<Database>
): Promise<FinancialMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Fetch Pricing & Fixed Costs & Profiles & Verifications in parallel
  const [
    pricingRes,
    fixedCostsRes,
    profilesRes,
    verificationsRes,
    costsRes,
  ] = await Promise.allSettled([
    adminClient.from('api_pricing').select('*').order('provider', { ascending: true }),
    adminClient.from('fixed_costs').select('*').order('monthly_amount', { ascending: false }),
    adminClient.from('profiles').select('tier'),
    adminClient
      .from('verifications')
      .select('id, created_at, input_text, verdict, input_tokens, output_tokens')
      .order('created_at', { ascending: false })
      .limit(1000),
    adminClient
      .from('verification_costs')
      .select('id, verification_id, provider, model, step, input_tokens, output_tokens, created_at')
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  const apiPricing: ApiPricing[] =
    pricingRes.status === 'fulfilled' && pricingRes.value.data
      ? (pricingRes.value.data as unknown as ApiPricing[])
      : [];

  const fixedCosts: FixedCost[] =
    fixedCostsRes.status === 'fulfilled' && fixedCostsRes.value.data
      ? (fixedCostsRes.value.data as unknown as FixedCost[])
      : [];

  const profiles: RawProfileRow[] =
    profilesRes.status === 'fulfilled' && profilesRes.value.data
      ? (profilesRes.value.data as unknown as RawProfileRow[])
      : [];

  const verifications: RawVerificationRow[] =
    verificationsRes.status === 'fulfilled' && verificationsRes.value.data
      ? (verificationsRes.value.data as unknown as RawVerificationRow[])
      : [];

  const detailedCosts: VerificationCost[] =
    costsRes.status === 'fulfilled' && costsRes.value.data
      ? (costsRes.value.data as unknown as VerificationCost[])
      : [];

  const pricingMap = buildPricingMap(apiPricing);
  const defaultGeminiPricing = resolvePricing('gemini-2.0-flash', 'gemini', pricingMap);

  // Group detailed costs by verification_id
  const costByVerificationId = new Map<string, { costUsd: number; costEur: number; inTokens: number; outTokens: number }>();
  for (const c of detailedCosts) {
    const p = resolvePricing(c.model, c.provider, pricingMap);
    const costUsd = calculateTokenCost(c.input_tokens || 0, c.output_tokens || 0, p);
    const costEur = convertToEur(costUsd, p.currency);

    const existing = costByVerificationId.get(c.verification_id) || { costUsd: 0, costEur: 0, inTokens: 0, outTokens: 0 };
    existing.costUsd += costUsd;
    existing.costEur += costEur;
    existing.inTokens += (c.input_tokens || 0);
    existing.outTokens += (c.output_tokens || 0);
    costByVerificationId.set(c.verification_id, existing);
  }

  // Calculate per-verification cost (using detailed costs if available, else summary columns on verification)
  const evaluatedVerifications = verifications.map((v) => {
    const detailed = costByVerificationId.get(v.id);
    let inTokens = v.input_tokens || 0;
    let outTokens = v.output_tokens || 0;
    let costUsd = 0;
    let costEur = 0;

    if (detailed && (detailed.costUsd > 0 || detailed.inTokens > 0)) {
      costUsd = detailed.costUsd;
      costEur = detailed.costEur;
      inTokens = detailed.inTokens;
      outTokens = detailed.outTokens;
    } else if (inTokens > 0 || outTokens > 0) {
      costUsd = calculateTokenCost(inTokens, outTokens, defaultGeminiPricing);
      costEur = convertToEur(costUsd, defaultGeminiPricing.currency);
    }

    return {
      id: v.id,
      createdAt: v.created_at,
      inputText: v.input_text || '',
      verdict: v.verdict,
      inputTokens: inTokens,
      outputTokens: outTokens,
      costUsd,
      costEur,
    };
  });

  // Calculate variable cost buckets
  const createBucket = (): VariableCostSummary => ({
    costUsd: 0,
    costEur: 0,
    verificationsCount: 0,
    inputTokens: 0,
    outputTokens: 0,
  });

  const todayBucket = createBucket();
  const weekBucket = createBucket();
  const monthBucket = createBucket();
  const allTimeBucket = createBucket();

  let verificationsWithTokensCount = 0;
  let totalInputTokensAll = 0;
  let totalOutputTokensAll = 0;

  for (const item of evaluatedVerifications) {
    const itemDate = item.createdAt;

    // All time
    allTimeBucket.verificationsCount += 1;
    allTimeBucket.costUsd += item.costUsd;
    allTimeBucket.costEur += item.costEur;
    allTimeBucket.inputTokens += item.inputTokens;
    allTimeBucket.outputTokens += item.outputTokens;

    if (item.inputTokens > 0 || item.outputTokens > 0) {
      verificationsWithTokensCount += 1;
      totalInputTokensAll += item.inputTokens;
      totalOutputTokensAll += item.outputTokens;
    }

    // Today
    if (itemDate >= todayStart) {
      todayBucket.verificationsCount += 1;
      todayBucket.costUsd += item.costUsd;
      todayBucket.costEur += item.costEur;
      todayBucket.inputTokens += item.inputTokens;
      todayBucket.outputTokens += item.outputTokens;
    }

    // Last 7 days
    if (itemDate >= sevenDaysAgo) {
      weekBucket.verificationsCount += 1;
      weekBucket.costUsd += item.costUsd;
      weekBucket.costEur += item.costEur;
      weekBucket.inputTokens += item.inputTokens;
      weekBucket.outputTokens += item.outputTokens;
    }

    // Current Month (or last 30 days)
    if (itemDate >= startOfMonth || itemDate >= thirtyDaysAgo) {
      monthBucket.verificationsCount += 1;
      monthBucket.costUsd += item.costUsd;
      monthBucket.costEur += item.costEur;
      monthBucket.inputTokens += item.inputTokens;
      monthBucket.outputTokens += item.outputTokens;
    }
  }

  // Averages calculation (protect against 0 division)
  const divisor = verificationsWithTokensCount > 0 ? verificationsWithTokensCount : Math.max(1, allTimeBucket.verificationsCount);
  const avgCostUsd = allTimeBucket.verificationsCount > 0 ? allTimeBucket.costUsd / divisor : 0;
  const avgCostEur = allTimeBucket.verificationsCount > 0 ? allTimeBucket.costEur / divisor : 0;
  const avgInTokens = verificationsWithTokensCount > 0 ? Math.round(totalInputTokensAll / verificationsWithTokensCount) : 0;
  const avgOutTokens = verificationsWithTokensCount > 0 ? Math.round(totalOutputTokensAll / verificationsWithTokensCount) : 0;

  // Projections
  const projectedCostPer100Eur = avgCostEur * 100;

  // 7-day projection: daily rate * 30 days
  const dailyRate7d = weekBucket.verificationsCount / 7;
  const projectedMonthlyVerifications7d = Math.round(dailyRate7d * 30);
  const monthlyProjection7DaysEur = projectedMonthlyVerifications7d * avgCostEur;

  // 30-day projection: daily rate * 30 days
  const dailyRate30d = monthBucket.verificationsCount / 30;
  const projectedMonthlyVerifications30d = Math.round(dailyRate30d * 30);
  const monthlyProjection30DaysEur = projectedMonthlyVerifications30d * avgCostEur;

  // 2. Fixed Costs Calculation
  let totalFixedMonthlyEur = 0;
  for (const fc of fixedCosts) {
    const amount = Number(fc.monthly_amount) || 0;
    totalFixedMonthlyEur += convertToEur(amount, fc.currency);
  }

  // 3. Subscribers & MRR
  let freeCount = 0;
  let proCount = 0;
  let businessCount = 0;

  for (const p of profiles) {
    const tier = (p.tier || 'free').toLowerCase();
    if (tier === 'pro') proCount += 1;
    else if (tier === 'business') businessCount += 1;
    else freeCount += 1;
  }

  const totalActivePremium = proCount + businessCount;
  const currentMrrEur = (proCount * STANDARD_PRO_PRICE_EUR) + (businessCount * STANDARD_PRO_PRICE_EUR);

  // 4. Break-even analysis
  // Total monthly projected expense = total fixed costs + projected variable cost (from 7d or 30d run rate)
  const activeVariableProjectionEur = monthlyProjection7DaysEur > 0 ? monthlyProjection7DaysEur : monthlyProjection30DaysEur;
  const totalMonthlyCostEur = totalFixedMonthlyEur + activeVariableProjectionEur;
  const breakEvenSubscribersNeeded = totalMonthlyCostEur > 0
    ? Math.ceil(totalMonthlyCostEur / STANDARD_PRO_PRICE_EUR)
    : 0;
  const subscribersGap = Math.max(0, breakEvenSubscribersNeeded - totalActivePremium);
  const targetProgressPercentage = breakEvenSubscribersNeeded > 0
    ? Math.min(100, Math.round((totalActivePremium / breakEvenSubscribersNeeded) * 100))
    : (totalActivePremium > 0 ? 100 : 0);

  return {
    variableCosts: {
      today: todayBucket,
      thisWeek: weekBucket,
      thisMonth: monthBucket,
      allTime: allTimeBucket,
      averageCostPerVerificationUsd: avgCostUsd,
      averageCostPerVerificationEur: avgCostEur,
      projectedCostPer100VerificationsEur: projectedCostPer100Eur,
      monthlyProjection7DaysEur,
      monthlyProjection30DaysEur,
      projectedMonthlyVerifications7d,
      projectedMonthlyVerifications30d,
      averageInputTokensPerVerification: avgInTokens,
      averageOutputTokensPerVerification: avgOutTokens,
    },
    fixedCosts: {
      items: fixedCosts,
      totalMonthlyEur: Math.round(totalFixedMonthlyEur * 100) / 100,
    },
    subscribers: {
      freeCount,
      proCount,
      businessCount,
      totalActivePremium,
      proPricePerMonthEur: STANDARD_PRO_PRICE_EUR,
      currentMrrEur: Math.round(currentMrrEur * 100) / 100,
    },
    breakEven: {
      totalMonthlyCostEur: Math.round(totalMonthlyCostEur * 100) / 100,
      breakEvenSubscribersNeeded,
      currentSubscribers: totalActivePremium,
      subscribersGap,
      targetProgressPercentage,
    },
    apiPricing,
    recentVerifications: evaluatedVerifications.slice(0, 20),
  };
}
