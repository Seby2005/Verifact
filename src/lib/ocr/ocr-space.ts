import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import type { VisionOCRResult } from './vision';

export interface OCRSpaceParsedResult {
  ParsedText: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

export interface OCRSpaceResponse {
  ParsedResults?: OCRSpaceParsedResult[];
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string | string[];
}

/**
 * OCR.space ships no Romanian model. Asking for 'ron' doesn't degrade the
 * result, it fails the whole parse with "Language not supported"
 * (OCRExitCode 3) — which is why this provider silently never worked for the
 * app's primary language. 'eng' does read Romanian text, but flattens the
 * diacritics to their base letters (ă→a, ș→s, ț→t), so OCR.space is a
 * degraded stand-in for Vision rather than an equal alternative to it.
 */
const ENGINE_LANGUAGE = 'eng';

/**
 * Processes an image using OCR.space free/pro API.
 *
 * @param base64Image - Base64 encoded image string (with or without data URI prefix)
 * @param apiKey - Optional OCR.space API key (defaults to process.env.OCR_SPACE_API_KEY)
 * @param language - Target language code ('ro' | 'en')
 */
export async function processOCRSpace(
  base64Image: string,
  apiKey?: string,
  language = 'ro'
): Promise<VisionOCRResult> {
  const key = apiKey || process.env.OCR_SPACE_API_KEY;

  if (!key) {
    throw new Error('OCR_SPACE_API_KEY is not configured');
  }

  // Ensure base64 string includes data URI prefix for OCR.space
  const base64WithPrefix = base64Image.startsWith('data:image/')
    ? base64Image
    : `data:image/png;base64,${base64Image}`;

  const formData = new URLSearchParams();
  formData.append('base64Image', base64WithPrefix);
  formData.append('language', ENGINE_LANGUAGE);
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');

  const response = await withCircuitBreaker('ocr-space', () =>
    fetchWithRetry(
      'https://api.ocr.space/parse/image',
      () => ({
        method: 'POST',
        headers: {
          'apikey': key,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: AbortSignal.timeout(15000),
        body: formData.toString(),
      }),
      { label: 'ocr-space' }
    ).then((res) => {
      if (!res.ok) throw new Error(`OCR.space API HTTP error: ${res.status}`);
      return res;
    })
  );

  const data = (await response.json()) as OCRSpaceResponse;

  if (data.IsErroredOnProcessing || !data.ParsedResults || data.ParsedResults.length === 0) {
    const err = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : data.ErrorMessage;
    throw new Error(err || 'NO_TEXT_FOUND');
  }

  const rawText = data.ParsedResults[0]?.ParsedText || '';
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (!cleanText) {
    throw new Error('NO_TEXT_FOUND');
  }

  return {
    text: cleanText,
    confidence: 0.88,
    language,
  };
}
