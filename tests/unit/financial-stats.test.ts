import { calculateFinancialMetrics } from '@/lib/financial/stats';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

describe('financial/stats', () => {
  it('calculates financial metrics with correct buckets, MRR and break-even', async () => {
    const mockPricing = [
      {
        id: '1',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        price_per_million_input_tokens: 0.10,
        price_per_million_output_tokens: 0.40,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockFixedCosts = [
      {
        id: '1',
        name: 'Vercel Pro',
        category: 'hosting',
        monthly_amount: 20,
        currency: 'USD',
        note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Domeniu',
        category: 'domain',
        monthly_amount: 1,
        currency: 'EUR',
        note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockProfiles = [
      { tier: 'free' },
      { tier: 'free' },
      { tier: 'pro' },
      { tier: 'pro' },
      { tier: 'business' },
    ];

    const now = new Date().toISOString();
    const mockVerifications = [
      {
        id: 'v1',
        created_at: now,
        input_text: 'Afirmatie 1',
        verdict: 'true',
        input_tokens: 1000,
        output_tokens: 500,
      },
      {
        id: 'v2',
        created_at: now,
        input_text: 'Afirmatie 2',
        verdict: 'false',
        input_tokens: 2000,
        output_tokens: 1000,
      },
    ];

    const mockCosts = [
      {
        id: 'c1',
        verification_id: 'v1',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        step: 'assessment',
        input_tokens: 1000,
        output_tokens: 500,
        estimated_cost_usd: null,
        created_at: now,
      },
      {
        id: 'c2',
        verification_id: 'v2',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        step: 'assessment',
        input_tokens: 2000,
        output_tokens: 1000,
        estimated_cost_usd: null,
        created_at: now,
      },
    ];

    const mockClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'api_pricing') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockPricing, error: null }),
            }),
          };
        }
        if (table === 'fixed_costs') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockFixedCosts, error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          };
        }
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: mockVerifications, error: null }),
              }),
            }),
          };
        }
        if (table === 'verification_costs') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: mockCosts, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }),
    } as unknown as SupabaseClient<Database>;

    const metrics = await calculateFinancialMetrics(mockClient);

    expect(metrics).toBeDefined();
    // Subscribers: 2 pro + 1 business = 3 active premium
    expect(metrics.subscribers.proCount).toBe(2);
    expect(metrics.subscribers.businessCount).toBe(1);
    expect(metrics.subscribers.totalActivePremium).toBe(3);
    expect(metrics.subscribers.currentMrrEur).toBeCloseTo(3 * 3.99, 2);

    // Fixed costs: 20 USD (~18.4 EUR) + 1 EUR = ~19.4 EUR
    expect(metrics.fixedCosts.totalMonthlyEur).toBeCloseTo(19.4, 1);

    // Verifications: 2
    expect(metrics.variableCosts.allTime.verificationsCount).toBe(2);
    expect(metrics.variableCosts.today.verificationsCount).toBe(2);
    expect(metrics.variableCosts.averageInputTokensPerVerification).toBe(1500);
    expect(metrics.variableCosts.averageOutputTokensPerVerification).toBe(750);

    // Break-even
    expect(metrics.breakEven.breakEvenSubscribersNeeded).toBeGreaterThan(0);
    expect(metrics.breakEven.currentSubscribers).toBe(3);
  });

  it('handles empty database gracefully with 0 division protection', async () => {
    const mockClient = {
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })),
    } as unknown as SupabaseClient<Database>;

    const metrics = await calculateFinancialMetrics(mockClient);
    expect(metrics.variableCosts.allTime.verificationsCount).toBe(0);
    expect(metrics.variableCosts.averageCostPerVerificationEur).toBe(0);
    expect(metrics.subscribers.totalActivePremium).toBe(0);
    expect(metrics.breakEven.breakEvenSubscribersNeeded).toBe(0);
    expect(metrics.breakEven.targetProgressPercentage).toBe(0);
  });
});
