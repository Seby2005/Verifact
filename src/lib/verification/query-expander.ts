import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/utils/logger';
import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import type { TokenUsageDetail } from '@/types/verification';
import { PRIMARY_MODEL, NO_REASONING } from '@/lib/ai/models';

export interface ExpandedQueries {
  primary: string;
  romanianQuery: string;
  englishQuery: string;
  keywords: string[];
  namedEntities: string[];
  /** Targeted query for existing debunks and fact-check registries */
  factCheckAngle: string;
  /** Targeted query for official government, institutional, or legislative records */
  officialAngle: string;
  /** Targeted query for original reporting, context, origin, and viral distribution */
  contextOriginAngle: string;
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

export function buildFallbackQueries(text: string, language: 'ro' | 'en' | 'fr' = 'ro'): ExpandedQueries {
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

  const baseRo = roStr || text.slice(0, 100);
  const baseEn = enStr || text.slice(0, 100);

  if (language === 'en') {
    return {
      primary: text,
      romanianQuery: baseRo,
      englishQuery: baseEn,
      keywords: unique.slice(0, 8),
      namedEntities,
      factCheckAngle: `${baseEn} fact check debunk false claim`,
      officialAngle: `${baseEn} official statement press release document government`,
      contextOriginAngle: `${baseEn} news media origin background context report`,
    };
  }

  if (language === 'fr') {
    return {
      primary: text,
      romanianQuery: baseRo,
      englishQuery: baseEn,
      keywords: unique.slice(0, 8),
      namedEntities,
      factCheckAngle: `${baseRo} fact check vérification faux désintox`,
      officialAngle: `${baseRo} gouvernement officiel communiqué déclaration`,
      contextOriginAngle: `${baseRo} actualité presse contexte origine rapport`,
    };
  }

  return {
    primary: text,
    romanianQuery: baseRo,
    englishQuery: baseEn,
    keywords: unique.slice(0, 8),
    namedEntities,
    factCheckAngle: `${baseRo} fact check verificare fals debunk`,
    officialAngle: `${baseRo} guvern minister oficial comunicat decizie lege`,
    contextOriginAngle: `${baseRo} stire presa context declaratie origine`,
  };
}

const EXPANSION_PROMPT = (claim: string) => `Ești un specialist în regăsirea informației și investigație jurnalistică la Verifact.
Analizează afirmația de mai jos și generează 3 unghiuri de căutare precise pentru verificare jurnalistică, fără zgomot:

AFIRMAȚIE:
"${claim}"

Cerințe:
1. romanianQuery: 2-5 cuvinte cheie în română, fără cuvinte de legătură (ex: "Papa Francisc geacă albă")
2. englishQuery: traducerea în engleză a cuvintelor cheie (ex: "Pope Francis white puffer jacket")
3. factCheckAngle: interogare orientată spre depistarea verificărilor existente și a demontărilor (ex: "Papa geacă albă fact check fals debunk")
4. officialAngle: termeni orientați spre surse oficiale, ministere, legi, monitorul oficial sau instituții competente (ex: "Vatican comunicat oficial Papa geacă")
5. contextOriginAngle: interogare pentru găsirea originii primare a imaginii/afirmației și contextului de apariție (ex: "origine imagine Midjourney AI Balenciaga")
6. keywords: 3-6 cuvinte cheie esențiale
7. namedEntities: persoane, instituții, locații identificate

Răspunde EXCLUSIV cu un obiect JSON valid:
{
  "romanianQuery": "...",
  "englishQuery": "...",
  "factCheckAngle": "...",
  "officialAngle": "...",
  "contextOriginAngle": "...",
  "keywords": ["..."],
  "namedEntities": ["..."]
}`;

/**
 * Uses LLM to deconstruct a claim into targeted search queries across 3 distinct investigative angles.
 */
export async function expandClaimQueries(
  text: string,
  language: 'ro' | 'en' | 'fr' = 'ro'
): Promise<ExpandedQueries> {
  const fallback = buildFallbackQueries(text, language);
  if (!text || text.trim().length < 15) {
    return fallback;
  }

  // Provider priority: OpenRouter first (if key set), then direct Gemini
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (openRouterKey) {
    try {
      const model = PRIMARY_MODEL;
      const response = await withCircuitBreaker('openrouter', () =>
        fetchWithRetry(
          'https://openrouter.ai/api/v1/chat/completions',
          () => ({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openRouterKey}`,
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
              'X-Title': 'Verifact Query Expander',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: EXPANSION_PROMPT(text) }],
              temperature: 0.1,
              response_format: { type: 'json_object' },
              ...NO_REASONING,
            }),
            signal: AbortSignal.timeout(3500),
          }),
          { label: 'query-expansion-openrouter', attempts: 1 }
        ).then(async (r) => {
          if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`);
          return r.json() as Promise<{
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          }>;
        })
      );

      const content = response.choices?.[0]?.message?.content;
      if (content) {
        // Some models wrap the object in a ```json fence despite json_object mode.
        const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? content) as Partial<ExpandedQueries>;
        if (parsed.romanianQuery && parsed.englishQuery) {
          return {
            primary: text,
            romanianQuery: String(parsed.romanianQuery).trim(),
            englishQuery: String(parsed.englishQuery).trim(),
            factCheckAngle: String(parsed.factCheckAngle || fallback.factCheckAngle).trim(),
            officialAngle: String(parsed.officialAngle || fallback.officialAngle).trim(),
            contextOriginAngle: String(parsed.contextOriginAngle || fallback.contextOriginAngle).trim(),
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : fallback.keywords,
            namedEntities: Array.isArray(parsed.namedEntities) ? parsed.namedEntities.map(String) : fallback.namedEntities,
            tokenUsage: response.usage
              ? {
                  provider: 'openrouter',
                  model,
                  step: 'query_expansion',
                  inputTokens: response.usage.prompt_tokens ?? 0,
                  outputTokens: response.usage.completion_tokens ?? 0,
                }
              : undefined,
          };
        }
      }
    } catch (err) {
      logger.warn('OpenRouter query expansion failed, checking fallback', {
        service: 'query-expander',
        error: String(err),
      });
    }
  }

  // Direct Gemini fallback if key is configured
  if (geminiKey && !geminiKey.startsWith('AQ')) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await Promise.race([
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: EXPANSION_PROMPT(text) }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini query expansion timeout')), 3500)
        ),
      ]);

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText) as Partial<ExpandedQueries>;

      if (parsed.romanianQuery && parsed.englishQuery) {
        const usage = result.response.usageMetadata;
        return {
          primary: text,
          romanianQuery: String(parsed.romanianQuery).trim(),
          englishQuery: String(parsed.englishQuery).trim(),
          factCheckAngle: String(parsed.factCheckAngle || fallback.factCheckAngle).trim(),
          officialAngle: String(parsed.officialAngle || fallback.officialAngle).trim(),
          contextOriginAngle: String(parsed.contextOriginAngle || fallback.contextOriginAngle).trim(),
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : fallback.keywords,
          namedEntities: Array.isArray(parsed.namedEntities) ? parsed.namedEntities.map(String) : fallback.namedEntities,
          tokenUsage: usage
            ? {
                provider: 'gemini',
                model: modelName,
                step: 'query_expansion',
                inputTokens: usage.promptTokenCount ?? 0,
                outputTokens: usage.candidatesTokenCount ?? 0,
              }
            : undefined,
        };
      }
    } catch (err) {
      logger.warn('Gemini query expansion failed, using rule-based fallback', {
        service: 'query-expander',
        error: String(err),
      });
    }
  }

  return fallback;
}
