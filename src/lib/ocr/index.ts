import { processImageOCR as processGoogleVision, type VisionOCRResult } from './vision';
import { processOCRSpace } from './ocr-space';
import { logger } from '@/lib/utils/logger';
import { normalizeRomanianDiacritics } from '@/lib/utils/romanian-text';

export type { VisionOCRResult };

type Provider = 'vision' | 'ocr-space';

function callProvider(provider: Provider, base64Image: string): Promise<VisionOCRResult> {
  return provider === 'vision' ? processGoogleVision(base64Image) : processOCRSpace(base64Image);
}

/**
 * An image that genuinely holds no text is an answer, not an outage. Asking a
 * second provider would spend another round trip to hear the same thing, so
 * only operational failures are worth a retry elsewhere.
 */
function canFallBackTo(secondary: Provider, error: unknown): boolean {
  if (error instanceof Error && error.message === 'NO_TEXT_FOUND') return false;
  return secondary !== 'ocr-space' || Boolean(process.env.OCR_SPACE_API_KEY);
}

/**
 * Extracts text from an image, hiding which OCR provider actually served it.
 *
 * Google Cloud Vision leads: measured against the same screenshot it reads
 * Romanian diacritics correctly and returns faster than OCR.space, which has
 * no Romanian model at all. OCR.space is therefore the degraded safety net
 * for when Vision is down or out of quota, not a cheaper equal. Set
 * DEFAULT_OCR_PROVIDER=ocr-space to invert the order deliberately.
 *
 * @param base64Image - Base64 encoded image, with or without a data URI prefix
 * @param preferredProvider - Forces the primary provider, overriding DEFAULT_OCR_PROVIDER
 */
export async function processOCR(
  base64Image: string,
  preferredProvider?: Provider
): Promise<VisionOCRResult> {
  const configured = preferredProvider ?? process.env.DEFAULT_OCR_PROVIDER;

  // vision.ts answers with canned dev text when it has no key, which would
  // shadow a perfectly good OCR.space setup, so only lead with it when it can
  // actually reach the API.
  const leadWithOcrSpace =
    configured === 'ocr-space' ||
    (!process.env.GOOGLE_CLOUD_API_KEY && Boolean(process.env.OCR_SPACE_API_KEY));

  const primary: Provider = leadWithOcrSpace ? 'ocr-space' : 'vision';
  const secondary: Provider = leadWithOcrSpace ? 'vision' : 'ocr-space';

  let result: VisionOCRResult;

  try {
    result = await callProvider(primary, base64Image);
  } catch (error) {
    if (!canFallBackTo(secondary, error)) throw error;

    logger.warn(`${primary} OCR failed, falling back to ${secondary}`, {
      service: 'ocr',
      error: String(error),
    });
    result = await callProvider(secondary, base64Image);
  }

  return { ...result, text: normalizeRomanianDiacritics(result.text) };
}
