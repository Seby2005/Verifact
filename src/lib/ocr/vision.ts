import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';

export interface VisionOCRResult {
  text: string;
  confidence: number;
  language: string;
}

/**
 * Runs Google Cloud Vision TEXT_DETECTION over an image.
 *
 * @param base64Image - Base64 encoded image string (with or without data URI prefix)
 * @param apiKey - Optional Vision API key (defaults to process.env.GOOGLE_CLOUD_API_KEY)
 */
export async function processImageOCR(
  base64Image: string,
  apiKey?: string
): Promise<VisionOCRResult> {
  const key = apiKey || process.env.GOOGLE_CLOUD_API_KEY;

  if (!key) {
    // If no API key is provided in dev/test environment, return simulated result
    return {
      text: 'Guvernul a anunțat noi măsuri economice aplicabile de la 1 august 2025 pentru sprijinirea sectorului IMM.',
      confidence: 0.92,
      language: 'ro',
    };
  }

  // Vision wants raw base64 — a data URI prefix fails to decode server-side
  // and comes back as zero annotations, i.e. indistinguishable from a blank
  // image. Strip it here so either form works; ocr-space.ts normalises the
  // other way because its API wants the prefix, which lets the dispatcher in
  // ./index.ts hand the same string to whichever provider it picks.
  const content = base64Image.replace(/^data:image\/[a-z+.-]+;base64,/i, '');

  // Each retry attempt gets its own fresh AbortSignal.timeout(...) (built
  // inside the thunk) rather than sharing one AbortController across
  // attempts — a single-use signal that already fired would make every
  // retry after the first fail instantly.
  //
  // Only the fetch + HTTP-status check runs through the circuit breaker —
  // NO_TEXT_FOUND below is a legitimate "this image has no text" outcome,
  // not a Vision API failure, and must not count against the breaker.
  const response = await withCircuitBreaker('vision', () =>
    fetchWithRetry(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          requests: [
            {
              image: { content },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }),
      }),
      { label: 'vision-ocr' }
    ).then((res) => {
      if (!res.ok) throw new Error(`Google Vision API HTTP error: ${res.status}`);
      return res;
    })
  );

  const data = await response.json();
  const annotations = data.responses?.[0]?.textAnnotations;

  if (!annotations || annotations.length === 0) {
    throw new Error('NO_TEXT_FOUND');
  }

  // First annotation contains the entire extracted text block
  const fullText = annotations[0].description || '';
  const cleanText = fullText.replace(/\n{3,}/g, '\n\n').trim();

  if (!cleanText) {
    throw new Error('NO_TEXT_FOUND');
  }

  const detectedLang = annotations[0].locale || 'ro';

  return {
    text: cleanText,
    confidence: 0.9,
    language: detectedLang,
  };
}
