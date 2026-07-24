/**
 * Contract tests for POST /api/verify.
 *
 * These exist because the request and response shapes had silently drifted
 * apart from the client:
 *
 *   - the client posts `inputText` (as declared by VerifyRequest) while the
 *     route validated `text`, so every submission from the home page came back
 *     400 "Textul trebuie sa aiba minim 10 caractere";
 *   - the route answered `{ success, report }` while the client reads
 *     `data.reportId` (as declared by VerifyAPIResponse), so even a successful
 *     verification surfaced "Raspunsul de la server nu contine un ID de raport
 *     valid".
 *
 * The verification pipeline and Supabase are mocked — this file is about the
 * HTTP contract, not about the layers.
 */

import type { VerificationReport } from '@/types/verification';

const verifyContent = jest.fn();
const saveVerification = jest.fn();
const incrementUsageCount = jest.fn();
const checkUsageLimit = jest.fn();

jest.mock('@/lib/verification/orchestrator', () => ({
  verifyContent: (...args: unknown[]) => verifyContent(...args),
}));

jest.mock('@/lib/verification/db-operations', () => ({
  saveVerification: (...args: unknown[]) => saveVerification(...args),
  incrementUsageCount: (...args: unknown[]) => incrementUsageCount(...args),
  checkUsageLimit: (...args: unknown[]) => checkUsageLimit(...args),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('@/app/api/verify/route') as typeof import('@/app/api/verify/route');

const REPORT: Partial<VerificationReport> = {
  id: '11111111-2222-3333-4444-555555555555',
  verdict: 'partial',
  score: 72,
  confidenceLevel: 'medium',
  inputText: 'x',
  sources: [],
};

function post(body: unknown, ip = '10.0.0.1'): Promise<Response> {
  return POST(
    new Request('http://localhost:3000/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    })
  );
}

const VALID_CLAIM = 'Romania a aderat la Uniunea Europeana in anul 2007.';

beforeEach(() => {
  jest.clearAllMocks();
  verifyContent.mockResolvedValue(REPORT);
  saveVerification.mockResolvedValue(undefined);
  checkUsageLimit.mockResolvedValue({ allowed: true, limit: 10, used: 0 });
});

describe('POST /api/verify — request contract', () => {
  it('accepts `inputText`, the field the client actually sends', async () => {
    const res = await post(
      { inputType: 'text', inputText: VALID_CLAIM, language: 'ro', isPublic: true },
      '10.0.0.10'
    );
    expect(res.status).toBe(200);
    expect(verifyContent).toHaveBeenCalledWith(
      expect.objectContaining({ text: VALID_CLAIM, language: 'ro', inputType: 'text' })
    );
  });

  it('still accepts the legacy `text` field', async () => {
    const res = await post(
      { inputType: 'text', text: VALID_CLAIM, language: 'ro', isPublic: true },
      '10.0.0.11'
    );
    expect(res.status).toBe(200);
  });

  it('trims the claim before handing it to the pipeline', async () => {
    await post(
      { inputType: 'text', inputText: `   ${VALID_CLAIM}   `, language: 'ro', isPublic: true },
      '10.0.0.12'
    );
    expect(verifyContent).toHaveBeenCalledWith(expect.objectContaining({ text: VALID_CLAIM }));
  });

  it('rejects empty input with 400 INPUT_INVALID', async () => {
    const res = await post({ inputType: 'text', inputText: '', language: 'ro', isPublic: true }, '10.0.0.13');
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ success: false, code: 'INPUT_INVALID' });
    expect(verifyContent).not.toHaveBeenCalled();
  });

  it('rejects input shorter than 10 characters', async () => {
    const res = await post({ inputType: 'text', inputText: '123456789', language: 'ro', isPublic: true }, '10.0.0.14');
    expect(res.status).toBe(400);
  });

  it('accepts input at exactly 10 characters', async () => {
    const res = await post({ inputType: 'text', inputText: '1234567890', language: 'ro', isPublic: true }, '10.0.0.15');
    expect(res.status).toBe(200);
  });

  it('rejects input longer than 2000 characters', async () => {
    const res = await post({ inputType: 'text', inputText: 'a'.repeat(2001), language: 'ro', isPublic: true }, '10.0.0.16');
    expect(res.status).toBe(400);
    expect(verifyContent).not.toHaveBeenCalled();
  });

  it('accepts input at exactly 2000 characters', async () => {
    const res = await post({ inputType: 'text', inputText: 'a'.repeat(2000), language: 'ro', isPublic: true }, '10.0.0.17');
    expect(res.status).toBe(200);
  });

  it('falls back to `unknown` for an unrecognised language', async () => {
    await post({ inputType: 'text', inputText: VALID_CLAIM, language: 'ja', isPublic: true }, '10.0.0.18');
    expect(verifyContent).toHaveBeenCalledWith(expect.objectContaining({ language: 'unknown' }));
  });

  it('falls back to `text` for an unrecognised input type', async () => {
    await post({ inputType: 'telepathy', inputText: VALID_CLAIM, language: 'ro', isPublic: true }, '10.0.0.19');
    expect(verifyContent).toHaveBeenCalledWith(expect.objectContaining({ inputType: 'text' }));
  });

  it('rejects a malformed JSON body with 400', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.20' },
        body: 'not json',
      })
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/verify — response contract', () => {
  it('returns reportId, verdict and score alongside the report', async () => {
    const res = await post(
      { inputType: 'text', inputText: VALID_CLAIM, language: 'ro', isPublic: true },
      '10.0.0.30'
    );
    const body = await res.json();

    // The client reads data.reportId to start the progress tracker.
    expect(body.reportId).toBe(REPORT.id);
    expect(body.reportId).toBe(body.report.id);
    expect(body.verdict).toBe(REPORT.verdict);
    expect(body.score).toBe(REPORT.score);
    expect(body.success).toBe(true);
  });

  it('maps ALL_LAYERS_FAILED to 503 rather than a generic 500', async () => {
    verifyContent.mockRejectedValueOnce(new Error('ALL_LAYERS_FAILED'));
    const res = await post(
      { inputType: 'text', inputText: VALID_CLAIM, language: 'ro', isPublic: true },
      '10.0.0.31'
    );
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ code: 'ALL_LAYERS_FAILED' });
  });

  it('maps an unexpected pipeline error to 500 SERVER_ERROR', async () => {
    verifyContent.mockRejectedValueOnce(new Error('boom'));
    const res = await post(
      { inputType: 'text', inputText: VALID_CLAIM, language: 'ro', isPublic: true },
      '10.0.0.32'
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ code: 'SERVER_ERROR' });
  });

  it('rate limits after 10 requests from the same IP', async () => {
    const ip = '10.0.0.99';
    for (let i = 0; i < 10; i++) {
      const res = await post({ inputType: 'text', inputText: VALID_CLAIM, language: 'ro', isPublic: true }, ip);
      expect(res.status).toBe(200);
    }
    const limited = await post({ inputType: 'text', inputText: VALID_CLAIM, language: 'ro', isPublic: true }, ip);
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toMatchObject({ code: 'RATE_LIMIT' });
  });
});
