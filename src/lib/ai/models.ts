/**
 * Which OpenRouter models the verification pipeline calls, decided in one place.
 *
 * Training cutoff matters more than raw quality here: the pipeline judges
 * current events, and a model that still believes Iohannis is president and
 * VAT is 19% "corrects" true 2025 facts to false even when shown sources that
 * confirm them (measured in the 2026-10-08 mass benchmark with
 * gemini-2.5-flash). Pick models that know the recent past.
 *
 * claude-haiku-5.5 leads on the same benchmark: 56/64 correct and 3 inverted
 * verdicts, against 50/64 and 9 for gpt-5.6-luna, at the lowest price of the
 * three. OPENROUTER_MODEL overrides the primary for every step.
 */
export const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-5.5';

/** Tried in order when the primary fails or times out. */
export const FALLBACK_MODELS = ['openai/gpt-5.6-luna', 'deepseek/deepseek-v4.1-flash'] as const;

/** Primary first, then the fallbacks, without duplicates. */
export const MODEL_CHAIN: readonly string[] = [...new Set([PRIMARY_MODEL, ...FALLBACK_MODELS])];

/**
 * Spread into the request body of mechanical steps (query expansion, claim
 * extraction and decomposition, prose analysis). Current models think before
 * answering by default, which tripled their latency past those steps'
 * timeouts and, in the analysis, spent the max_tokens budget before any prose
 * came out. The judgement steps (assessment, source stances) keep reasoning:
 * without it the model's recall of recent facts got shaky again.
 */
export const NO_REASONING = { reasoning: { enabled: false } } as const;
