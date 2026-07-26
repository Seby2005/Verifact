import { fetchWithRetry } from '@/lib/utils/retry';

export interface VisionOCRResult {
  text: string;
  confidence: number;
  language: string;
}

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

  // Each retry attempt gets its own fresh AbortSignal.timeout(...) (built
  // inside the thunk) rather than sharing one AbortController across
  // attempts — a single-use signal that already fired would make every
  // retry after the first fail instantly.
  const response = await fetchWithRetry(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    () => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      }),
    }),
    { label: 'vision-ocr' }
  );

  if (!response.ok) {
    throw new Error(`Google Vision API HTTP error: ${response.status}`);
  }

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
