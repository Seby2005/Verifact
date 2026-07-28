jest.mock('@/lib/utils/retry', () => ({
  fetchWithRetry: (input: string, init: RequestInit | (() => RequestInit)) =>
    fetch(input, typeof init === 'function' ? init() : init),
}));

jest.mock('@/lib/utils/circuit-breaker', () => ({
  withCircuitBreaker: (_name: string, fn: () => Promise<unknown>) => fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { processOCR } from '@/lib/ocr';

const VISION_HOST = 'vision.googleapis.com';

function visionText(description: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ responses: [{ textAnnotations: [{ description, locale: 'ro' }] }] }),
  };
}

function visionNoText() {
  return { ok: true, status: 200, json: async () => ({ responses: [{}] }) };
}

function visionDown() {
  return { ok: false, status: 503, json: async () => ({}) };
}

function ocrSpaceText(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ IsErroredOnProcessing: false, ParsedResults: [{ ParsedText: text }] }),
  };
}

/** Routes the mocked fetch to a per-provider response based on the URL. */
function route(handlers: { vision?: () => unknown; ocrSpace?: () => unknown }) {
  global.fetch = jest.fn(async (url: unknown) => {
    const isVision = String(url).includes(VISION_HOST);
    const handler = isVision ? handlers.vision : handlers.ocrSpace;
    if (!handler) throw new Error(`unexpected call to ${isVision ? 'Vision' : 'OCR.space'}`);
    return handler();
  }) as unknown as typeof fetch;
}

function calledHosts(): string[] {
  return (global.fetch as jest.Mock).mock.calls.map(([url]) =>
    String(url).includes(VISION_HOST) ? 'vision' : 'ocr-space'
  );
}

describe('processOCR dispatcher', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GOOGLE_CLOUD_API_KEY = 'test-vision-key';
    process.env.OCR_SPACE_API_KEY = 'test-ocr-key';
    delete process.env.DEFAULT_OCR_PROVIDER;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('asks Vision first when both providers are configured', async () => {
    route({ vision: () => visionText('Textul din imagine') });

    const result = await processOCR('base64data');

    expect(result.text).toBe('Textul din imagine');
    expect(calledHosts()).toEqual(['vision']);
  });

  it('falls back to OCR.space when Vision is down', async () => {
    route({ vision: () => visionDown(), ocrSpace: () => ocrSpaceText('Text de rezerva') });

    const result = await processOCR('base64data');

    expect(result.text).toBe('Text de rezerva');
    expect(calledHosts()).toEqual(['vision', 'ocr-space']);
  });

  it('does not spend a second round trip when the image genuinely has no text', async () => {
    route({ vision: () => visionNoText() });

    await expect(processOCR('base64data')).rejects.toThrow('NO_TEXT_FOUND');
    expect(calledHosts()).toEqual(['vision']);
  });

  it('surfaces the Vision failure when OCR.space has no key to fall back on', async () => {
    delete process.env.OCR_SPACE_API_KEY;
    route({ vision: () => visionDown() });

    await expect(processOCR('base64data')).rejects.toThrow('Google Vision API HTTP error: 503');
    expect(calledHosts()).toEqual(['vision']);
  });

  it('leads with OCR.space when only that provider is configured', async () => {
    delete process.env.GOOGLE_CLOUD_API_KEY;
    route({ ocrSpace: () => ocrSpaceText('Text prin OCR.space') });

    const result = await processOCR('base64data');

    expect(result.text).toBe('Text prin OCR.space');
    expect(calledHosts()).toEqual(['ocr-space']);
  });

  it('honours an explicit ocr-space preference', async () => {
    route({ ocrSpace: () => ocrSpaceText('Text cerut explicit') });

    const result = await processOCR('base64data', 'ocr-space');

    expect(result.text).toBe('Text cerut explicit');
    expect(calledHosts()).toEqual(['ocr-space']);
  });

  it('rewrites cedilla diacritics to the Romanian comma forms', async () => {
    route({ vision: () => visionText('Ştirea a fost dezminţită de instituţii') });

    const result = await processOCR('base64data');

    expect(result.text).toBe('Știrea a fost dezmințită de instituții');
  });
});
