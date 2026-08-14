import { logger } from '@/lib/utils/logger';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { fetchWithRetry } from '@/lib/utils/retry';
import type { TokenUsageDetail } from '@/types/verification';

export type HarmRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DecomposedClaim {
  originalText: string;
  subClaims: string[];
  riskLevel: HarmRiskLevel;
  riskReasoning: string;
  category: 'health' | 'finance_scam' | 'election_politics' | 'conspiracy' | 'general';
  tokenUsage?: TokenUsageDetail;
}

const DEFAULT_DECOMPOSITION: DecomposedClaim = {
  originalText: '',
  subClaims: [],
  riskLevel: 'low',
  riskReasoning: 'Scor implicit de risc scăzut.',
  category: 'general',
};

const OPENROUTER_MODELS = [
  process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
  'google/gemini-2.0-flash-lite-001:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
];

/**
 * Uses LLM to decompose a claim into sub-claims and evaluate misinformation risk/harm.
 */
export async function decomposeAndAssessRisk(text: string): Promise<DecomposedClaim> {
  if (!text || text.trim().length < 5) {
    return { ...DEFAULT_DECOMPOSITION, originalText: text };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return buildRuleBasedDecomposition(text);
  }

  const prompt = `Analizează această afirmație pentru sistemul de fact-checking Verifact:

AFIRMAȚIE: "${text}"

Sarcini:
1. Descompune afirmația în 1-3 sub-afirmații atomice verificabile.
2. Evaluează nivelul de Risc / Pericol al dezinformării dacă această afirmație ar fi falsă ("low" | "medium" | "high" | "critical").
3. Clasifică categoria ("health" | "finance_scam" | "election_politics" | "conspiracy" | "general").

Răspunde EXCLUSIV cu un obiect JSON structurat:
{
  "subClaims": ["sub-afirmație 1", "sub-afirmație 2"],
  "riskLevel": "low" | "medium" | "high" | "critical",
  "riskReasoning": "Explicație scurtă în română despre riscul potențial",
  "category": "health" | "finance_scam" | "election_politics" | "conspiracy" | "general"
}`;

  for (const model of OPENROUTER_MODELS) {
    try {
      const data = await withCircuitBreaker('openrouter-decompose', () =>
        fetchWithRetry(
          'https://openrouter.ai/api/v1/chat/completions',
          () => ({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
              'X-Title': 'Verifact Decomposer',
            },
            signal: AbortSignal.timeout(6000),
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1,
            }),
          }),
          { label: `Decompose ${model}` }
        ).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          }>;
        })
      );

      const raw = data.choices?.[0]?.message?.content ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<DecomposedClaim>;
        const tokenUsage: TokenUsageDetail = {
          provider: 'openrouter',
          model,
          step: 'claim_decomposition',
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        };

        return {
          originalText: text,
          subClaims: Array.isArray(parsed.subClaims) && parsed.subClaims.length > 0 ? parsed.subClaims : [text],
          riskLevel: validateRiskLevel(parsed.riskLevel),
          riskReasoning: parsed.riskReasoning || 'Evaluare efectuată prin analiză contextuală.',
          category: parsed.category || 'general',
          tokenUsage,
        };
      }
    } catch (err) {
      logger.warn(`Decomposer model ${model} failed, trying fallback`, { service: 'decomposer', error: String(err) });
    }
  }

  return buildRuleBasedDecomposition(text);
}

function validateRiskLevel(level?: string): HarmRiskLevel {
  if (level === 'critical' || level === 'high' || level === 'medium' || level === 'low') {
    return level;
  }
  return 'low';
}

function buildRuleBasedDecomposition(text: string): DecomposedClaim {
  const lower = text.toLowerCase();
  let riskLevel: HarmRiskLevel = 'low';
  let category: DecomposedClaim['category'] = 'general';
  let riskReasoning = 'Afirmație cu potențial redus de prejudiciu direct.';

  if (lower.includes('cancer') || lower.includes('tratament') || lower.includes('vaccin') || lower.includes('leac')) {
    riskLevel = 'high';
    category = 'health';
    riskReasoning = 'Afirmație privind sănătatea publică sau tratamente medicale neverificate.';
  } else if (lower.includes('bani') || lower.includes('investiție') || lower.includes('bancă') || lower.includes('banca') || lower.includes('cripto') || lower.includes('castiga')) {
    riskLevel = 'high';
    category = 'finance_scam';
    riskReasoning = 'Afirmație cu risc de fraudă financiară sau scam.';
  } else if (lower.includes('alegeri') || lower.includes('vot') || lower.includes('fraudă electorală') || lower.includes('politica')) {
    riskLevel = 'medium';
    category = 'election_politics';
    riskReasoning = 'Afirmație privind procesul electoral sau discurs politic public.';
  }

  return {
    originalText: text,
    subClaims: [text],
    riskLevel,
    riskReasoning,
    category,
  };
}
