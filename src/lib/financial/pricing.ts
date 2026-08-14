import type { ApiPricing } from '@/types/database';

export interface ModelPricing {
  pricePerMillionInputTokens: number;
  pricePerMillionOutputTokens: number;
  currency: string;
}

export const USD_TO_EUR_RATE = 0.92;
export const EUR_TO_USD_RATE = 1.087;
export const EUR_TO_RON_RATE = 4.975;
export const USD_TO_RON_RATE = 4.577;

export const STANDARD_PRO_PRICE_EUR = 3.99;

export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  'gemini-2.0-flash': {
    pricePerMillionInputTokens: 0.10,
    pricePerMillionOutputTokens: 0.40,
    currency: 'USD',
  },
  'gemini-2.0-flash-lite': {
    pricePerMillionInputTokens: 0.075,
    pricePerMillionOutputTokens: 0.30,
    currency: 'USD',
  },
  'gemini-1.5-flash': {
    pricePerMillionInputTokens: 0.075,
    pricePerMillionOutputTokens: 0.30,
    currency: 'USD',
  },
  'gemini-1.5-pro': {
    pricePerMillionInputTokens: 1.25,
    pricePerMillionOutputTokens: 5.00,
    currency: 'USD',
  },
  'deepseek/deepseek-chat': {
    pricePerMillionInputTokens: 0.14,
    pricePerMillionOutputTokens: 0.28,
    currency: 'USD',
  },
  'google/gemini-2.0-flash-lite-001:free': {
    pricePerMillionInputTokens: 0.0,
    pricePerMillionOutputTokens: 0.0,
    currency: 'USD',
  },
  'meta-llama/llama-3.3-70b-instruct:free': {
    pricePerMillionInputTokens: 0.0,
    pricePerMillionOutputTokens: 0.0,
    currency: 'USD',
  },
  'openrouter-default': {
    pricePerMillionInputTokens: 0.15,
    pricePerMillionOutputTokens: 0.60,
    currency: 'USD',
  },
};

/**
 * Calculates raw cost in the pricing currency for given input & output tokens.
 */
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing
): number {
  const inCost = (Math.max(0, inputTokens) / 1_000_000) * pricing.pricePerMillionInputTokens;
  const outCost = (Math.max(0, outputTokens) / 1_000_000) * pricing.pricePerMillionOutputTokens;
  return inCost + outCost;
}

/**
 * Converts an amount from a given currency to EUR.
 */
export function convertToEur(amount: number, fromCurrency: string): number {
  const norm = fromCurrency.toUpperCase().trim();
  if (norm === 'EUR') return amount;
  if (norm === 'USD') return amount * USD_TO_EUR_RATE;
  if (norm === 'RON') return amount / EUR_TO_RON_RATE;
  return amount;
}

/**
 * Converts an amount from EUR to another currency.
 */
export function convertFromEur(amountInEur: number, toCurrency: string): number {
  const norm = toCurrency.toUpperCase().trim();
  if (norm === 'EUR') return amountInEur;
  if (norm === 'USD') return amountInEur * EUR_TO_USD_RATE;
  if (norm === 'RON') return amountInEur * EUR_TO_RON_RATE;
  return amountInEur;
}

/**
 * Builds a pricing lookup map from database api_pricing rows, falling back to defaults.
 */
export function buildPricingMap(pricingRows: ApiPricing[] = []): Map<string, ModelPricing> {
  const map = new Map<string, ModelPricing>();

  // Load defaults first
  for (const [model, p] of Object.entries(DEFAULT_MODEL_PRICING)) {
    map.set(model.toLowerCase(), p);
  }

  // Override with database configured rows
  for (const row of pricingRows) {
    if (row.model) {
      map.set(row.model.toLowerCase(), {
        pricePerMillionInputTokens: Number(row.price_per_million_input_tokens) || 0,
        pricePerMillionOutputTokens: Number(row.price_per_million_output_tokens) || 0,
        currency: row.currency || 'USD',
      });
    }
  }

  return map;
}

/**
 * Finds the most relevant pricing for a given model/provider combination.
 */
export function resolvePricing(
  model: string | null | undefined,
  provider: string | null | undefined,
  pricingMap: Map<string, ModelPricing>
): ModelPricing {
  const normalizedModel = (model || '').toLowerCase().trim();
  const normalizedProvider = (provider || '').toLowerCase().trim();

  if (normalizedModel && pricingMap.has(normalizedModel)) {
    return pricingMap.get(normalizedModel)!;
  }

  // Partial match checks
  for (const [key, value] of pricingMap.entries()) {
    if (normalizedModel && (key.includes(normalizedModel) || normalizedModel.includes(key))) {
      return value;
    }
  }

  if (normalizedProvider === 'gemini') {
    return pricingMap.get('gemini-2.0-flash') ?? DEFAULT_MODEL_PRICING['gemini-2.0-flash'];
  }

  if (normalizedProvider === 'openrouter') {
    return pricingMap.get('deepseek/deepseek-chat') ?? DEFAULT_MODEL_PRICING['deepseek/deepseek-chat'];
  }

  return DEFAULT_MODEL_PRICING['gemini-2.0-flash'];
}
