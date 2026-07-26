import { processImageOCR as processGoogleVision, type VisionOCRResult } from './vision';
import { processOCRSpace } from './ocr-space';
import { logger } from '@/lib/utils/logger';

export type { VisionOCRResult };

/**
 * Unified OCR Dispatcher — automatically selects the best available OCR provider:
 * 1. OCR.space (if OCR_SPACE_API_KEY is configured or provider='ocr-space')
 * 2. Google Cloud Vision (if GOOGLE_CLOUD_API_KEY is configured)
 * 3. Fallback / Dev mode simulation if neither key is provided
 *
 * @param base64Image - Base64 encoded image string
 * @param preferredProvider - Optional explicit provider preference ('vision' | 'ocr-space')
 */
export async function processOCR(
  base64Image: string,
  preferredProvider?: 'vision' | 'ocr-space'
): Promise<VisionOCRResult> {
  const provider = preferredProvider || process.env.DEFAULT_OCR_PROVIDER || 'auto';

  if (provider === 'ocr-space' || (provider === 'auto' && process.env.OCR_SPACE_API_KEY)) {
    try {
      return await processOCRSpace(base64Image);
    } catch (error) {
      logger.warn('OCR.space failed, falling back to Google Cloud Vision', {
        service: 'ocr',
        error: String(error),
      });
    }
  }

  // Fallback / default to Google Cloud Vision
  return processGoogleVision(base64Image);
}
