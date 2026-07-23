import { TIER_CONFIG } from '@/types/user';
import { getAnonymousUsage, incrementAnonymousUsage, isAnonymousLimitReached } from '@/lib/usage/anonymous';

function evaluatePasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  const hasMin8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);

  const criteriaMetCount = [hasMin8, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  if (criteriaMetCount <= 2) return 'weak';
  if (criteriaMetCount === 3) return 'medium';
  return 'strong';
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient as createServerClient } from '@/lib/supabase/server';
import { checkUsageLimit } from '@/lib/usage/limits';

describe('Sprint 3 - Usage Limits & Freemium Tests', () => {
  const mockCreateServerClient = createServerClient as jest.Mock;

  // Mock localStorage in Node environment
  const mockStorage: Record<string, string> = {};
  beforeAll(() => {
    Object.defineProperty(global, 'window', {
      value: global,
      writable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        clear: () => {
          Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        },
      },
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('TIER_CONFIG', () => {
    it('should have correct limits for Free tier', () => {
      expect(TIER_CONFIG.free.monthlyLimit).toBe(10);
    });

    it('should have correct limits for Pro tier', () => {
      expect(TIER_CONFIG.pro.monthlyLimit).toBe(200);
    });

    it('should have correct limits for Business tier', () => {
      expect(TIER_CONFIG.business.monthlyLimit).toBe(2000);
    });

    it('should offer discount on yearly Pro plan compared to monthly', () => {
      const yearlyMonthlyEquivalent = TIER_CONFIG.pro.priceYearly;
      const twelveMonthsPrice = TIER_CONFIG.pro.priceMonthly * 12;
      expect(yearlyMonthlyEquivalent).toBeLessThan(twelveMonthsPrice);
    });
  });

  describe('checkUsageLimit', () => {
    it('should allow Free user with 0 verifications', async () => {
      mockCreateServerClient.mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  tier: 'free',
                  verifications_count: 0,
                  verifications_reset: '2099-12-31',
                },
              }),
            }),
          }),
        }),
      });

      const res = await checkUsageLimit('user-1');
      expect(res.allowed).toBe(true);
      expect(res.percentageUsed).toBe(0);
    });

    it('should allow Free user with 9 verifications', async () => {
      mockCreateServerClient.mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  tier: 'free',
                  verifications_count: 9,
                  verifications_reset: '2099-12-31',
                },
              }),
            }),
          }),
        }),
      });

      const res = await checkUsageLimit('user-1');
      expect(res.allowed).toBe(true);
      expect(res.percentageUsed).toBe(90);
    });

    it('should disallow Free user with 10 verifications', async () => {
      mockCreateServerClient.mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  tier: 'free',
                  verifications_count: 10,
                  verifications_reset: '2099-12-31',
                },
              }),
            }),
          }),
        }),
      });

      const res = await checkUsageLimit('user-1');
      expect(res.allowed).toBe(false);
      expect(res.percentageUsed).toBe(100);
    });

    it('should allow Pro user with 199 verifications', async () => {
      mockCreateServerClient.mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  tier: 'pro',
                  verifications_count: 199,
                  verifications_reset: '2099-12-31',
                },
              }),
            }),
          }),
        }),
      });

      const res = await checkUsageLimit('user-2');
      expect(res.allowed).toBe(true);
    });

    it('should disallow Pro user with 200 verifications', async () => {
      mockCreateServerClient.mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  tier: 'pro',
                  verifications_count: 200,
                  verifications_reset: '2099-12-31',
                },
              }),
            }),
          }),
        }),
      });

      const res = await checkUsageLimit('user-2');
      expect(res.allowed).toBe(false);
    });

    it('should reset counter when month has changed', async () => {
      const mockUpdate = jest.fn().mockReturnValue({ eq: async () => ({}) });

      mockCreateServerClient.mockReturnValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  tier: 'free',
                  verifications_count: 10,
                  verifications_reset: '2020-01-01',
                },
              }),
            }),
          }),
          update: mockUpdate,
        }),
      });

      const res = await checkUsageLimit('user-3');
      expect(res.current).toBe(0);
      expect(res.allowed).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ verifications_count: 0 })
      );
    });
  });

  describe('Anonymous Usage', () => {
    it('should return count 0 when localStorage is empty', () => {
      const usage = getAnonymousUsage();
      expect(usage.count).toBe(0);
    });

    it('should return false for isAnonymousLimitReached after 2 verifications', () => {
      incrementAnonymousUsage();
      incrementAnonymousUsage();
      expect(isAnonymousLimitReached()).toBe(false);
    });

    it('should return true for isAnonymousLimitReached after 3 verifications', () => {
      incrementAnonymousUsage();
      incrementAnonymousUsage();
      incrementAnonymousUsage();
      expect(isAnonymousLimitReached()).toBe(true);
    });
  });

  describe('Password Strength Evaluator', () => {
    it('should rate "abc" as weak', () => {
      expect(evaluatePasswordStrength('abc')).toBe('weak');
    });

    it('should rate "Abcdef12" as medium', () => {
      expect(evaluatePasswordStrength('Abcdef12')).toBe('medium');
    });

    it('should rate "Abcdef1!" as strong', () => {
      expect(evaluatePasswordStrength('Abcdef1!')).toBe('strong');
    });
  });
});
