import { POST } from '@/app/api/ocr/route';
import { clearRateLimits } from '@/lib/utils/rate-limit';
import { NextRequest } from 'next/server';

// Never hit the real Google Vision API from tests — it's slow, costs real
// quota once a live key is configured, and CI sets a non-empty placeholder
// GOOGLE_CLOUD_API_KEY that would otherwise trigger a genuine (and failing)
// network request. This suite only exercises the route's own logic
// (validation, rate limiting, response shape), not the Vision integration.
jest.mock('@/lib/ocr/vision', () => ({
  processImageOCR: jest.fn().mockResolvedValue({
    text: 'Test OCR Content',
    confidence: 0.92,
    language: 'ro',
  }),
}));

describe('OCR API Route /api/ocr', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it('returns 400 for invalid or missing image input', async () => {
    const req = new NextRequest('http://localhost:3000/api/ocr', {
      method: 'POST',
      body: JSON.stringify({ image: '', mimeType: 'image/jpeg' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('INVALID_INPUT');
  });

  it('returns 400 for invalid mimeType', async () => {
    const req = new NextRequest('http://localhost:3000/api/ocr', {
      method: 'POST',
      body: JSON.stringify({ image: 'SGVsbG8=', mimeType: 'image/gif' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('INVALID_INPUT');
  });

  it('returns successful OCR text response for valid base64 image', async () => {
    const validBase64 = Buffer.from('Test OCR Content').toString('base64');
    const req = new NextRequest('http://localhost:3000/api/ocr', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.1' },
      body: JSON.stringify({ image: validBase64, mimeType: 'image/png' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.text).toBeDefined();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const validBase64 = Buffer.from('Test').toString('base64');
    const clientIp = '10.0.0.1';

    for (let i = 0; i < 10; i++) {
      const req = new NextRequest('http://localhost:3000/api/ocr', {
        method: 'POST',
        headers: { 'x-forwarded-for': clientIp },
        body: JSON.stringify({ image: validBase64, mimeType: 'image/png' }),
      });
      await POST(req);
    }

    // 11th request should trigger 429
    const req11 = new NextRequest('http://localhost:3000/api/ocr', {
      method: 'POST',
      headers: { 'x-forwarded-for': clientIp },
      body: JSON.stringify({ image: validBase64, mimeType: 'image/png' }),
    });
    const res11 = await POST(req11);
    expect(res11.status).toBe(429);
    const data = await res11.json();
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
