import {
  calculateTokenCost,
  convertToEur,
  convertFromEur,
  buildPricingMap,
  resolvePricing,
  DEFAULT_MODEL_PRICING,
  STANDARD_PRO_PRICE_EUR,
} from '@/lib/financial/pricing';
import type { ApiPricing } from '@/types/database';

describe('financial/pricing', () => {
  describe('calculateTokenCost', () => {
    it('calculates cost correctly for Gemini 2.0 Flash pricing', () => {
      const pricing = DEFAULT_MODEL_PRICING['gemini-2.0-flash']; // $0.10 in / $0.40 out per 1M
      // 1,000 in, 500 out
      const cost = calculateTokenCost(1000, 500, pricing);
      // (1000 / 1M) * 0.10 + (500 / 1M) * 0.40 = 0.00010 + 0.00020 = 0.00030
      expect(cost).toBeCloseTo(0.0003, 6);
    });

    it('calculates 0 cost when tokens are 0 or negative', () => {
      const pricing = DEFAULT_MODEL_PRICING['gemini-2.0-flash'];
      expect(calculateTokenCost(0, 0, pricing)).toBe(0);
      expect(calculateTokenCost(-10, -5, pricing)).toBe(0);
    });

    it('calculates 0 cost for free models', () => {
      const pricing = DEFAULT_MODEL_PRICING['google/gemini-2.0-flash-lite-001:free'];
      expect(calculateTokenCost(50000, 10000, pricing)).toBe(0);
    });
  });

  describe('currency conversions', () => {
    it('converts USD to EUR correctly', () => {
      const eur = convertToEur(100, 'USD');
      expect(eur).toBeCloseTo(92, 1);
    });

    it('returns same amount for EUR to EUR', () => {
      expect(convertToEur(50, 'EUR')).toBe(50);
    });

    it('converts RON to EUR correctly', () => {
      const eur = convertToEur(49.75, 'RON');
      expect(eur).toBeCloseTo(10, 1);
    });

    it('converts EUR to other currencies', () => {
      expect(convertFromEur(100, 'EUR')).toBe(100);
      expect(convertFromEur(100, 'USD')).toBeCloseTo(108.7, 1);
      expect(convertFromEur(100, 'RON')).toBeCloseTo(497.5, 1);
    });
  });

  describe('buildPricingMap and resolvePricing', () => {
    it('returns default map when no rows provided', () => {
      const map = buildPricingMap([]);
      expect(map.has('gemini-2.0-flash')).toBe(true);
      expect(map.get('gemini-2.0-flash')?.pricePerMillionInputTokens).toBe(0.10);
    });

    it('overrides defaults with database configured rows', () => {
      const customRows: ApiPricing[] = [
        {
          id: '1',
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          price_per_million_input_tokens: 0.15,
          price_per_million_output_tokens: 0.60,
          currency: 'USD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const map = buildPricingMap(customRows);
      expect(map.get('gemini-2.0-flash')?.pricePerMillionInputTokens).toBe(0.15);
      expect(map.get('gemini-2.0-flash')?.pricePerMillionOutputTokens).toBe(0.60);
    });

    it('resolves pricing gracefully for exact and fallback models', () => {
      const map = buildPricingMap([]);
      const geminiPricing = resolvePricing('gemini-2.0-flash', 'gemini', map);
      expect(geminiPricing.pricePerMillionInputTokens).toBe(0.10);

      const unknownGemini = resolvePricing('unknown-model', 'gemini', map);
      expect(unknownGemini.pricePerMillionInputTokens).toBe(0.10);

      const unknownOpenRouter = resolvePricing('unknown-model', 'openrouter', map);
      expect(unknownOpenRouter.pricePerMillionInputTokens).toBe(0.14);
    });

    it('verifies standard pro price constant', () => {
      expect(STANDARD_PRO_PRICE_EUR).toBe(3.99);
    });
  });
});
