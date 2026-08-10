import { logger } from '@/lib/utils/logger';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { fetchWithRetry } from '@/lib/utils/retry';
import type { Language } from '@/types/verification';

/**
 * The result of pulling a checkable claim out of noisy input.
 *
 * A screenshot of a TikTok that reshares a Facebook post carries three things
 * at once: interface chrome (usernames, like counts, "See translation"), the
 * factual claim being spread, and the sharer's own take on it. Verifying the
 * whole blob finds nothing (the search is polluted) and cannot tell a true
 * underlying post from a false spin laid over it. This splits them.
 */
export interface ExtractedClaim {
  /** The core verifiable factual statement, cleaned and standalone. */
  primaryClaim: string;
  /** The sharer's own opinion/interpretation, if distinct from the claim; else ''. */
  commentary: string;
  /** A short provenance note when evident ("postare Facebook pe TikTok"); else ''. */
  sourceContext: string;
}

const OPENROUTER_MODELS = [
  process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
  'google/gemini-2.0-flash-lite-001:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

const MAX_INPUT_CHARS = 1500;

/**
 * Splits raw submitted text into the factual claim to verify and the sharer's
 * separate commentary. Falls back to treating the whole text as the claim when
 * no model is available or the call fails, so extraction can only ever help the
 * pipeline, never block it.
 */
export async function extractClaim(
  rawText: string,
  language: Language
): Promise<ExtractedClaim> {
  const trimmed = rawText.trim();
  const fallback: ExtractedClaim = { primaryClaim: trimmed, commentary: '', sourceContext: '' };

  if (trimmed.length < 12) return fallback;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return fallback;

  const lang = language === 'en' ? 'engleză' : 'română';
  const prompt = `Ai primit textul brut extras (OCR) dintr-o captură de ecran sau dintr-o postare pe rețele sociale. Textul poate conține trei lucruri amestecate:
1. Interfața aplicației (nume de utilizator, ore, număr de like-uri, "Vezi traducerea", "Follow", butoane).
2. AFIRMAȚIA FACTUALĂ care se răspândește (ce li se cere oamenilor să creadă).
3. COMENTARIUL celui care a distribuit (opinia, reacția sau concluzia lui personală adăugată peste afirmație).

TEXT BRUT:
"""
${trimmed.slice(0, MAX_INPUT_CHARS)}
"""

SARCINA:
- Extrage "primaryClaim": afirmația factuală centrală, verificabilă, rescrisă ca o singură propoziție clară și de sine stătătoare, în limba ${lang}. Elimină complet interfața și numele de utilizator. Dacă sunt mai multe fapte, alege-l pe cel principal.
- Extrage "commentary": opinia/interpretarea/concluzia personală a celui care a distribuit, DACĂ este distinctă de afirmația factuală. Foarte important: uneori afirmația partajată este adevărată, dar comentariul trage o concluzie falsă — separă-le. Dacă nu există comentariu distinct, pune "".
- Extrage "sourceContext": o notă scurtă despre proveniență dacă e evidentă (ex: "postare de Facebook distribuită pe TikTok"). Dacă nu e clar, pune "".

Răspunde EXCLUSIV cu un obiect JSON:
{
  "primaryClaim": "...",
  "commentary": "...",
  "sourceContext": "..."
}`;

  for (const model of OPENROUTER_MODELS) {
    try {
      const data = await withCircuitBreaker('openrouter-extract', () =>
        fetchWithRetry(
          'https://openrouter.ai/api/v1/chat/completions',
          () => ({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
              'X-Title': 'Verifact Claim Extractor',
            },
            signal: AbortSignal.timeout(7000),
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1,
            }),
          }),
          { label: `Extract ${model}` }
        ).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
        })
      );

      const raw = data.choices?.[0]?.message?.content ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as Partial<ExtractedClaim>;
      const primaryClaim = typeof parsed.primaryClaim === 'string' ? parsed.primaryClaim.trim() : '';
      // A too-short extraction is a sign the model lost the claim — keep the
      // original text rather than searching on a fragment.
      if (primaryClaim.length < 12) return fallback;

      return {
        primaryClaim,
        commentary: typeof parsed.commentary === 'string' ? parsed.commentary.trim() : '',
        sourceContext: typeof parsed.sourceContext === 'string' ? parsed.sourceContext.trim() : '',
      };
    } catch (err) {
      logger.warn(`Claim extractor model ${model} failed, trying fallback`, {
        service: 'claim-extractor',
        error: String(err),
      });
    }
  }

  return fallback;
}

/**
 * Whether the input is noisy enough to be worth an extraction pass. Screenshots
 * always are (OCR drags in interface chrome and the sharer's caption); pasted
 * text only when it's long or multi-paragraph — a short typed claim is already
 * clean, and the extra model call would just add latency.
 */
export function shouldExtractClaim(inputType: string, text: string): boolean {
  if (inputType === 'screenshot') return true;
  if (inputType === 'text') {
    const lineBreaks = (text.match(/\n/g) ?? []).length;
    return text.length > 220 || lineBreaks >= 2;
  }
  return false;
}
