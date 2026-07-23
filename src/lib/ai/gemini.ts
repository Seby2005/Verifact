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
  context.layer1.results.forEach(r => r.reviewUrl && validUrls.add(r.reviewUrl));
  context.layer2.results.forEach(a => a.articleUrl && validUrls.add(a.articleUrl));
  context.layer3.results.forEach(o => o.documentUrl && validUrls.add(o.documentUrl));
  context.layer4.results.forEach(p => p.postUrl && validUrls.add(p.postUrl));

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
 * Generates an AI analysis of the fact-checking results using Gemini 2.0 Flash.
 *
 * Key configuration:
 * - temperature: 0.1 (very low — maximizes factual adherence, minimizes creativity)
 * - topP: 0.8 (reduces probability of unlikely tokens)
 * - maxOutputTokens: 1024 (caps analysis length)
 */
export async function generateAIAnalysis(context: AIAnalysisContext): Promise<string> {
  const genAI = createGenAIClient();

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.1,       // CRITICAL: very low temperature → more factual, less creative
      maxOutputTokens: 1024,
      topP: 0.8,
    },
  });

  const prompt = buildAnalysisPrompt(context);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text || text.trim().length < 50) {
    throw new Error('Gemini returned empty or too-short analysis');
  }

  // Validate output for hallucinated URLs
  validateAIOutput(text, context);

  return text;
}
