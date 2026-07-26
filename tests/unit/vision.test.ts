jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

import { processImageOCR } from '@/lib/ocr/vision';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, statusText: ok ? 'OK' : 'Error', json: () => Promise.resolve(body) };
}

describe('processImageOCR', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GOOGLE_CLOUD_API_KEY;
  });

  it('returns a simulated result without calling fetch when no API key is configured', async () => {
    global.fetch = jest.fn();

    const result = await processImageOCR('base64data');

    expect(result.text.length).toBeGreaterThan(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('extracts text from a successful Vision API response', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        responses: [
          {
            textAnnotations: [{ description: 'Textul extras din imagine', locale: 'ro' }],
          },
        ],
      })
    );

    const result = await processImageOCR('base64data', 'test-key');

    expect(result.text).toBe('Textul extras din imagine');
    expect(result.language).toBe('ro');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('reads the API key from GOOGLE_CLOUD_API_KEY when not passed explicitly', async () => {
    process.env.GOOGLE_CLOUD_API_KEY = 'env-key';
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ responses: [{ textAnnotations: [{ description: 'text', locale: 'ro' }] }] })
    );

    await processImageOCR('base64data');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('key=env-key'),
      expect.any(Object)
    );
  });

  it('collapses runs of 3+ newlines down to 2', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        responses: [{ textAnnotations: [{ description: 'Line one\n\n\n\nLine two', locale: 'ro' }] }],
      })
    );

    const result = await processImageOCR('base64data', 'test-key');

    expect(result.text).toBe('Line one\n\nLine two');
  });

  it('defaults language to "ro" when no locale is present', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ responses: [{ textAnnotations: [{ description: 'text' }] }] })
    );

    const result = await processImageOCR('base64data', 'test-key');

    expect(result.language).toBe('ro');
  });

  it('throws NO_TEXT_FOUND when there are no annotations', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ responses: [{}] }));

    await expect(processImageOCR('base64data', 'test-key')).rejects.toThrow('NO_TEXT_FOUND');
  });

  it('throws NO_TEXT_FOUND when the extracted text is only whitespace', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ responses: [{ textAnnotations: [{ description: '   \n  ' }] }] })
    );

    await expect(processImageOCR('base64data', 'test-key')).rejects.toThrow('NO_TEXT_FOUND');
  });

  it('throws a descriptive error on an HTTP failure', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 403));

    await expect(processImageOCR('base64data', 'test-key')).rejects.toThrow('Google Vision API HTTP error: 403');
  });
});
