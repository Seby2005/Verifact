import type { Language, InputType } from '@/types/verification';
import { isValidHttpUrl } from '@/lib/verification/url-extract';

export const MAX_TEXT_LENGTH = 2000;

export interface ValidatedInput {
  text: string;
  language: Language;
  isPublic: boolean;
  inputType: InputType;
}

/**
 * Validates and normalizes a verification request body. Shared by the website's
 * streaming /api/verify route and the programmatic /api/v1/verify route so the
 * two can never drift on what counts as valid input (length bounds, URL check,
 * language/inputType allowlists).
 */
export function validateVerifyInput(
  body: unknown
): { success: true; data: ValidatedInput } | { success: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { success: false, error: 'Corp cerere invalid' };
  }

  const b = body as Record<string, unknown>;

  // URL input is validated as a URL; its article text is fetched separately
  // before verification, so the length rules below do not apply to it.
  if (b.inputType === 'url') {
    if (typeof b.text !== 'string' || !isValidHttpUrl(b.text)) {
      return { success: false, error: 'Link-ul introdus nu este valid.' };
    }
    const urlLang: Language = b.language === 'fr' ? 'fr' : b.language === 'en' ? 'en' : 'ro';
    return {
      success: true,
      data: { text: b.text.trim(), language: urlLang, isPublic: Boolean(b.isPublic), inputType: 'url' },
    };
  }

  if (typeof b.text !== 'string' || b.text.trim().length < 10) {
    return { success: false, error: 'Textul trebuie sa aiba minim 10 caractere' };
  }

  // Long input is truncated rather than rejected: pasting a whole article is a
  // normal thing to do, and the first 2000 characters carry the claim in
  // practice. Rejecting it outright just made the tool look broken.
  const text = b.text.length > MAX_TEXT_LENGTH ? b.text.slice(0, MAX_TEXT_LENGTH) : b.text;

  const validLanguages: Language[] = ['ro', 'en', 'fr', 'unknown'];
  const language: Language = validLanguages.includes(b.language as Language)
    ? (b.language as Language)
    : 'unknown';

  const validInputTypes: InputType[] = ['text', 'screenshot', 'url'];
  const inputType: InputType = validInputTypes.includes(b.inputType as InputType)
    ? (b.inputType as InputType)
    : 'text';

  return {
    success: true,
    data: {
      text: text.trim(),
      language,
      isPublic: Boolean(b.isPublic),
      inputType,
    },
  };
}
