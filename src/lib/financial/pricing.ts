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
  // Google Gemini Direct Models
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

  // OpenRouter — DeepSeek
  'deepseek/deepseek-chat': {
    pricePerMillionInputTokens: 0.14,
    pricePerMillionOutputTokens: 0.28,
    currency: 'USD',
  },
  'deepseek/deepseek-r1': {
    pricePerMillionInputTokens: 0.55,
    pricePerMillionOutputTokens: 2.19,
    currency: 'USD',
  },
  'deepseek/deepseek-r1:free': {
    pricePerMillionInputTokens: 0.0,
    pricePerMillionOutputTokens: 0.0,
    currency: 'USD',
  },

  // OpenRouter — Google Gemini via OpenRouter
  'google/gemini-2.0-flash-001': {
    pricePerMillionInputTokens: 0.10,
    pricePerMillionOutputTokens: 0.40,
    currency: 'USD',
  },
  'google/gemini-2.0-flash-lite-001:free': {
    pricePerMillionInputTokens: 0.0,
    pricePerMillionOutputTokens: 0.0,
    currency: 'USD',
  },
  'google/gemini-2.0-pro-exp-02-05:free': {
    pricePerMillionInputTokens: 0.0,
    pricePerMillionOutputTokens: 0.0,
    currency: 'USD',
  },

  // OpenRouter — Meta Llama
  'meta-llama/llama-3.3-70b-instruct': {
    pricePerMillionInputTokens: 0.12,
    pricePerMillionOutputTokens: 0.30,
    currency: 'USD',
  },
  'meta-llama/llama-3.3-70b-instruct:free': {
    pricePerMillionInputTokens: 0.0,
    pricePerMillionOutputTokens: 0.0,
    currency: 'USD',
  },

  // OpenRouter — Anthropic Claude
  'anthropic/claude-3.5-sonnet': {
    pricePerMillionInputTokens: 3.00,
    pricePerMillionOutputTokens: 15.00,
    currency: 'USD',
  },
  'anthropic/claude-3.5-haiku': {
    pricePerMillionInputTokens: 0.80,
    pricePerMillionOutputTokens: 4.00,
    currency: 'USD',
  },

  // OpenRouter — OpenAI
  'openai/gpt-4o-mini': {
    pricePerMillionInputTokens: 0.15,
    pricePerMillionOutputTokens: 0.60,
    currency: 'USD',
  },
  'openai/gpt-4o': {
    pricePerMillionInputTokens: 2.50,
    pricePerMillionOutputTokens: 10.00,
    currency: 'USD',
  },

  // OpenRouter — Qwen & Mistral
  'qwen/qwen-2.5-72b-instruct': {
    pricePerMillionInputTokens: 0.35,
    pricePerMillionOutputTokens: 0.40,
    currency: 'USD',
  },
  'mistralai/mistral-large-2411': {
    pricePerMillionInputTokens: 2.00,
    pricePerMillionOutputTokens: 6.00,
    currency: 'USD',
  },

  // Default fallback
  'openrouter-default': {
    pricePerMillionInputTokens: 0.15,
    pricePerMillionOutputTokens: 0.60,
    currency: 'USD',
  },
};

/**
 * Baseline average token consumption per verification pipeline run:
 * (query expansion: ~250 in, ~100 out; extraction: ~300 in, ~100 out; assessment: ~750 in, ~150 out; analysis: ~1200 in, ~400 out)
 */
export const ESTIMATED_BASELINE_INPUT_TOKENS = 2100;
export const ESTIMATED_BASELINE_OUTPUT_TOKENS = 550;

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
