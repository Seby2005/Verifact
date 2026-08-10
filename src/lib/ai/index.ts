import { generateAIAssessment as geminiAssessment, generateAIAnalysis as geminiAnalysis } from './gemini';
import {
  generateOpenRouterAssessment,
  generateOpenRouterAnalysis,
  filterRelevantSourcesWithOpenRouter,
  type SourceCandidate,
} from './openrouter';
import { logger } from '@/lib/utils/logger';
import { normalizeRomanianDiacritics } from '@/lib/utils/romanian-text';
import type { AIAnalysisContext } from '@/types/verification';
import type { AIAssessment } from './gemini';

export type { AIAssessment };
export type { SourceCandidate };

type Provider = 'openrouter' | 'gemini';

/**
 * Unified AI dispatcher, mirroring src/lib/ocr/index.ts: picks a provider from
 * DEFAULT_AI_PROVIDER, or in 'auto' mode prefers OpenRouter when its key is
 * configured and falls back to Gemini otherwise.
 *
 * 'auto' prefers OpenRouter deliberately: Gemini's free tier is the one that
 * runs out (a 429 there is what left reports without an AI section), while
 * OpenRouter fronts several models behind one key.
 */
function resolveProvider(): Provider {
  const configured = process.env.DEFAULT_AI_PROVIDER;
  if (configured === 'openrouter' || configured === 'gemini') return configured;
  return process.env.OPENROUTER_API_KEY ? 'openrouter' : 'gemini';
}

/**
 * Decides which candidate sources are actually about the claim.
 *
 * OpenRouter only, unlike the two functions below. There is no Gemini
 * equivalent because this step was added while Gemini sat at a zero free-tier
 * quota, and writing a second implementation nothing would call was not worth
 * it. When no OpenRouter key is configured this returns null, which the caller
 * reads as "keep every source" — the pipeline degrades to the keyword filter
 * in verification/relevance.ts rather than failing.
 */
export async function filterRelevantSources(
  claim: string,
  candidates: SourceCandidate[]
): Promise<string[] | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;
  return filterRelevantSourcesWithOpenRouter(claim, candidates);
}

/**
 * Scores a claim against the evidence gathered by the search layers.
 *
 * No cross-provider fallback here, unlike generateAIAnalysis below: both
 * implementations already catch their own failures and return a neutral
 * 'insufficient' assessment rather than throwing, so there is no error for a
 * chain to react to. Detecting the fallback by its shape would be guesswork.
 */
export async function generateAIAssessment(context: AIAnalysisContext): Promise<AIAssessment> {
  if (resolveProvider() === 'openrouter') {
    return generateOpenRouterAssessment(context);
  }
  return geminiAssessment(context);
}

/**
 * Writes the prose analysis shown to the reader.
 *
 * Models trained on older Romanian corpora mix cedilla and comma diacritics
 * mid-sentence, so the text is normalised on the way out — the report builder
 * derives the executive summary from this same string, and a report that
 * spells "instrucţiuni" next to "instrucțiuni" reads as sloppy.
 */
export async function generateAIAnalysis(context: AIAnalysisContext): Promise<string> {
  return normalizeRomanianDiacritics(await requestAnalysis(context));
}

/**
 * Both implementations throw when the model is unreachable or returns nothing
 * usable, so a failure on the preferred provider is retried on the other one.
 * If that fails too the error propagates, and the orchestrator falls back to a
 * factual summary of the layers (see verifyContent).
 */
// A second, equally cheap OpenRouter model to retry on before giving up. Keeping
// the fallback inside OpenRouter (rather than the direct Gemini SDK, which needs
// its own often-misconfigured key) is why a slow primary no longer strands the
// report without an AI section.
const OPENROUTER_FALLBACK_MODEL = 'deepseek/deepseek-chat';

async function requestAnalysis(context: AIAnalysisContext): Promise<string> {
  const provider = resolveProvider();

  if (provider === 'openrouter') {
    try {
      return await generateOpenRouterAnalysis(context);
    } catch (error) {
      logger.warn('Primary OpenRouter analysis model failed, retrying with fallback model', {
        service: 'ai',
        error: String(error),
      });
      return generateOpenRouterAnalysis(context, undefined, OPENROUTER_FALLBACK_MODEL);
    }
  }

  // provider === 'gemini' — only when explicitly configured with a valid key.
  try {
    return await geminiAnalysis(context);
  } catch (error) {
    if (!process.env.OPENROUTER_API_KEY) throw error;
    logger.warn('Gemini analysis failed, falling back to OpenRouter', {
      service: 'ai',
      error: String(error),
    });
    return generateOpenRouterAnalysis(context);
  }
}
