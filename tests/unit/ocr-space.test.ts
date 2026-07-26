import { processOCRSpace } from '@/lib/ocr/ocr-space';
import { processOCR } from '@/lib/ocr';
import { resetAllCircuits } from '@/lib/utils/circuit-breaker';

describe('OCR.space Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    resetAllCircuits();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('parses text from OCR.space API response', async () => {
    const mockResponse = {
      IsErroredOnProcessing: false,
      ParsedResults: [
        {
          ParsedText: 'Guvernul a adoptat o nouă ordonanță de urgență.',
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await processOCRSpace('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    expect(result.text).toBe('Guvernul a adoptat o nouă ordonanță de urgență.');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('throws NO_TEXT_FOUND if no text is parsed', async () => {
    const mockResponse = {
      IsErroredOnProcessing: false,
      ParsedResults: [{ ParsedText: '' }],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await expect(
      processOCRSpace('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    ).rejects.toThrow('NO_TEXT_FOUND');
  });

  it('unified processOCR dispatcher delegates to OCR.space when requested', async () => {
    process.env.OCR_SPACE_API_KEY = 'test-ocr-key';

    const mockResponse = {
      IsErroredOnProcessing: false,
      ParsedResults: [{ ParsedText: 'Text extras prin dispecer' }],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await processOCR('base64data', 'ocr-space');
    expect(result.text).toBe('Text extras prin dispecer');
  });
});
