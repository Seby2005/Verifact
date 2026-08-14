import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/utils/logger';
import type { TokenUsageDetail } from '@/types/verification';

export interface ExpandedQueries {
  romanianQuery: string;
  englishQuery: string;
  keywords: string[];
  namedEntities: string[];
  tokenUsage?: TokenUsageDetail;
}

const STOP_WORDS = new Set([
  'imaginea', 'cu', 'a', 'fost', 'de', 'pe', 'sau', 'si', 'și', 'din', 'la', 'cu', 'un', 'o',
  'este', 'sunt', 'era', 'au', 'ce', 'care', 'ca', 'pentru', 'prin', 'fara', 'fără', 'despre',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for',
  'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
]);

const RO_EN_LEXICON: Record<string, string> = {
  papa: 'pope',
  francisc: 'francis',
  geaca: 'jacket',
  geacă: 'jacket',
  puffoasa: 'puffer',
  puffoasă: 'puffer',
  pufos: 'puffer',
  alba: 'white',
  albă: 'white',
  inteligența: 'intelligence',
  inteligenta: 'intelligence',
  artificială: 'artificial',
  artificiala: 'artificial',
  generata: 'generated',
  generată: 'generated',
  imaginea: 'image',
  imagine: 'image',
  poza: 'photo',
  poză: 'photo',
  fotografie: 'photo',
  vaccin: 'vaccine',
  vaccinuri: 'vaccines',
  vaccinurile: 'vaccines',
  vaccinare: 'vaccination',
  arnm: 'mrna',
  adn: 'dna',
  adnul: 'dna',
  virus: 'virus',
  pandemie: 'pandemic',
  coronavirus: 'coronavirus',
  covid: 'covid',
  pamant: 'earth',
  pământ: 'earth',
  plat: 'flat',
  razboi: 'war',
  război: 'war',
  ucraina: 'ukraine',
  rusia: 'russia',
  alegeri: 'elections',
  alegerile: 'elections',
  frauda: 'fraud',
  fraudă: 'fraud',
  rechin: 'shark',
  inundație: 'flood',
  inundatie: 'flood',
  autostrada: 'highway',
  autostradă: 'highway',
  lamai: 'lemon',
  lămâie: 'lemon',
  cancer: 'cancer',
  usturoi: 'garlic',
  vindeca: 'cure',
  vindecă: 'cure',
};

function buildFallbackQueries(text: string): ExpandedQueries {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const unique = Array.from(new Set(words));

  const enWords = unique.map((w) => RO_EN_LEXICON[w] || w);
  const roStr = unique.slice(0, 6).join(' ');
  const enStr = Array.from(new Set(enWords)).slice(0, 6).join(' ');

  const entityMatches = text.match(/\b[A-ZĂÂÎȘȚ][a-zăâîșțA-ZĂÂÎȘȚ0-9\-]{2,}\b/g) || [];
  const namedEntities = Array.from(new Set(entityMatches)).filter(
    (e) => !['Imaginea', 'Afirmația', 'Stirea', 'Poza'].includes(e)
  );

  return {
    romanianQuery: roStr || text.slice(0, 100),
    englishQuery: enStr || text.slice(0, 100),
    keywords: unique.slice(0, 8),
    namedEntities,
  };
}

export async function expandClaimQueries(text: string): Promise<ExpandedQueries> {
  // Short claims (< 80 chars) are processed instantly via algorithmic extraction (0ms latency)
  if (!text || text.trim().length < 80) {
    return buildFallbackQueries(text);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  // If GEMINI_API_KEY is not a valid Gemini API Key (e.g. starts with AQ), fallback immediately
  if (!apiKey || apiKey.startsWith('AQ')) {
    return buildFallbackQueries(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
    });

    const prompt = `Analizează afirmația de mai jos și extrage interogări de căutare optimizate pentru motoare de căutare și baze de fact-checking.

Afirmație: "${text}"

Răspunde EXCLUSIV cu un obiect JSON valid având această structură exactă:
{
  "romanianQuery": "2-5 cuvinte cheie în română fără stop-words (ex: Papa Francisc geaca alba AI)",
  "englishQuery": "2-5 cuvinte cheie traduse în engleză (ex: Pope Francis white puffer jacket AI Midjourney)",
  "keywords": ["cuvânt1", "cuvânt2", "cuvânt3"],
  "namedEntities": ["Nume Persoană", "Organizație/Loc/Concept"]
}`;

    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM query expansion timeout')), 3500)
      ),
    ]);

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as Partial<ExpandedQueries>;

    if (parsed.romanianQuery && parsed.englishQuery) {
      const usage = result.response.usageMetadata;
      const tokenUsage: TokenUsageDetail | undefined = usage
        ? {
            provider: 'gemini',
            model: modelName,
            step: 'query_expansion',
            inputTokens: usage.promptTokenCount ?? 0,
            outputTokens: usage.candidatesTokenCount ?? 0,
          }
        : undefined;

      return {
        romanianQuery: String(parsed.romanianQuery).trim(),
        englishQuery: String(parsed.englishQuery).trim(),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
        namedEntities: Array.isArray(parsed.namedEntities) ? parsed.namedEntities.map(String) : [],
        tokenUsage,
      };
    }
  } catch (error) {
    logger.warn('AI query expansion fallback used', {
      service: 'query-expander',
      error: String(error),
    });
  }

  return buildFallbackQueries(text);
}
