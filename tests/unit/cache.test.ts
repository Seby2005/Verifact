const mockSingle = jest.fn();
const mockUpdateEq = jest.fn();
const mockUpsert = jest.fn();

const mockFrom = jest.fn((_table: string) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  single: mockSingle,
  update: jest.fn(() => ({ eq: mockUpdateEq })),
  upsert: mockUpsert,
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { getCached, setCached } from '@/lib/verification/cache';
import type { VerificationReport } from '@/types/verification';

const SAMPLE_REPORT: VerificationReport = {
  id: 'report-1',
  inputText: 'claim',
  inputType: 'text',
  verdict: 'true',
  score: 90,
  confidenceLevel: 'high',
  executiveSummary: 'summary',
  scoreBreakdown: { finalScore: 90, availableLayers: 4, weights: { factCheck: 0.35, news: 0.3, official: 0.25 } },
  sources: [],
  createdAt: new Date().toISOString(),
  isPublic: false,
  language: 'ro',
};

describe('getCached', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('returns the cached report when a fresh row is found', async () => {
    mockSingle.mockResolvedValue({ data: { result_json: SAMPLE_REPORT, hits: 3 }, error: null });

    const result = await getCached('some-hash');

    expect(result).toEqual(SAMPLE_REPORT);
  });

  it('returns null when no row matches', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });

    const result = await getCached('missing-hash');

    expect(result).toBeNull();
  });

  it('returns null (not throw) when the client itself throws', async () => {
    mockSingle.mockRejectedValue(new Error('connection lost'));

    await expect(getCached('any-hash')).resolves.toBeNull();
  });

  it('fires a hit-count increment without blocking the return value', async () => {
    mockSingle.mockResolvedValue({ data: { result_json: SAMPLE_REPORT, hits: 3 }, error: null });

    await getCached('some-hash');
    await Promise.resolve(); // let the detached update() microtask run

    expect(mockUpdateEq).toHaveBeenCalledWith('content_hash', 'some-hash');
  });

  it('defaults hits to 0 when the row has no hits value', async () => {
    mockSingle.mockResolvedValue({ data: { result_json: SAMPLE_REPORT }, error: null });

    await getCached('some-hash');
    await Promise.resolve();

    expect(mockUpdateEq).toHaveBeenCalled();
  });
});

describe('setCached', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('upserts the report keyed by content hash with a 7-day expiry', async () => {
    const before = Date.now();
    await setCached('some-hash', SAMPLE_REPORT);
    const after = Date.now();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [payload, options] = mockUpsert.mock.calls[0];

    expect(payload.content_hash).toBe('some-hash');
    expect(payload.result_json).toEqual(SAMPLE_REPORT);
    expect(payload.hits).toBe(0);
    expect(options).toEqual({ onConflict: 'content_hash' });

    const expiresAt = new Date(payload.expires_at).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 5000);
    expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs + 5000);
  });

  it('does not throw when the upsert fails', async () => {
    mockUpsert.mockRejectedValue(new Error('db unavailable'));

    await expect(setCached('some-hash', SAMPLE_REPORT)).resolves.toBeUndefined();
  });
});
