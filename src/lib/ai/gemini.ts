import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIAnalysisContext } from '@/types/verification';
import { buildAnalysisPrompt } from './prompts';

/**
 * Creates the Gemini AI client.
 * Uses lazy initialization to avoid startup errors when API key is not yet set.
 */
function createGenAIClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Validates that the AI output doesn't contain URLs not present in source data.
 * This guards against hallucinated citations.
 */
function validateAIOutput(output: string, context: AIAnalysisContext): void {
  // Extract all URLs mentioned in the output
  const urlPattern = /https?:\/\/[^\s)"']+/g;
  const mentionedUrls = output.match(urlPattern) ?? [];

  if (mentionedUrls.length === 0) return; // No URLs = nothing to validate

  // Build set of valid source URLs from context
  const validUrls = new Set<string>();
  context.layers?.layer1?.results?.forEach(r => r.reviewUrl && validUrls.add(r.reviewUrl));
  context.layers?.layer2?.results?.forEach(a => a.articleUrl && validUrls.add(a.articleUrl));
  context.layers?.layer3?.results?.forEach(o => o.documentUrl && validUrls.add(o.documentUrl));
  context.layers?.layer4?.results?.forEach(p => p.postUrl && validUrls.add(p.postUrl));

  // Check for hallucinated URLs
  for (const url of mentionedUrls) {
    // Only flag URLs that are not substrings of any valid URL (allow partial matches)
    const isValid = Array.from(validUrls).some(validUrl =>
      validUrl.includes(url) || url.includes(validUrl)
    );

    if (!isValid) {
      console.error(`[Gemini] Potential hallucinated URL detected: ${url}`);
      // Log but don't throw — we still want to return the analysis
      // The prompt instructs Gemini not to include URLs, so this is extra safety
    }
  }
}

/**
 * Generates a fallback summary when Gemini API is unavailable or rate-limited.
 */
function generateFallbackAnalysis(context: AIAnalysisContext): string {
  const claimText = context.claim || context.inputText || '';
  const language = context.language;
  const layers = context.layers;
  const scoreBreakdown = context.scoreBreakdown;

  const isRo = language === 'ro';
  const scorePercent = Math.round(scoreBreakdown?.finalScore ?? 50);

  const l1Count = layers?.layer1?.results?.length ?? 0;
  const l2Count = layers?.layer2?.results?.length ?? 0;
  const l3Count = layers?.layer3?.results?.length ?? 0;
  const l4Count = layers?.layer4?.results?.length ?? 0;

  if (isRo) {
    return (
      `Sinteză automată: Afirmația „${claimText.slice(0, 150)}...” a fost analizată pe 4 straturi de verificare, ` +
      `obținând un scor agregat de veridicitate de ${scorePercent}%. ` +
      `Au fost identificate ${l1Count} verificări anterioare, ${l2Count} articole de presă, ` +
      `${l3Count} documente oficiale și ${l4Count} mențiuni în social media. ` +
      `Pentru detalii specifice despre fiecare sursă, consultați secțiunile de mai jos.`
    );
  }

  return (
    `Automated synthesis: The claim "${claimText.slice(0, 150)}..." was analyzed across 4 verification layers, ` +
    `achieving an aggregate credibility score of ${scorePercent}%. ` +
    `Found ${l1Count} prior fact-checks, ${l2Count} news articles, ` +
    `${l3Count} official documents, and ${l4Count} social media mentions. ` +
    `Please refer to the source breakdowns below for detailed evidence.`
  );
}

/**
 * Generates an AI analysis of the fact-checking results using Gemini API.
 *
 * Tries multiple model candidates in order of preference.
 * Falls back to a deterministic structured summary if the API is unavailable or rate-limited.
 */
export async function generateAIAnalysis(context: AIAnalysisContext): Promise<string> {
  let genAI: GoogleGenerativeAI;
  try {
    genAI = createGenAIClient();
  } catch (err) {
    console.warn('[Gemini] Client initialization failed:', err);
    return generateFallbackAnalysis(context);
  }

  const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];
  const prompt = buildAnalysisPrompt(context);

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          topP: 0.8,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text && text.trim().length >= 50) {
        validateAIOutput(text, context);
        return text;
      }
    } catch (err) {
      console.warn(`[Gemini] Model ${modelName} failed:`, err instanceof Error ? err.message : String(err));
    }
  }

  console.warn('[Gemini] All AI models failed/rate-limited. Returning fallback analysis.');
  return generateFallbackAnalysis(context);
}

