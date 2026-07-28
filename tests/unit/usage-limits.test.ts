const mockSingle = jest.fn();
const mockUpdateEq = jest.fn();
const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSingle,
  update: jest.fn(() => ({ eq: mockUpdateEq })),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { checkUsageLimit } from '@/lib/usage/limits';

describe('checkUsageLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('returns a default free-tier allowance when no profile row exists', async () => {
    // PGRST116 is what PostgREST actually returns for .single() with no rows.
    // The code matters now: checkUsageLimit treats any other error as a failed
    // read and throws, rather than reporting it as zero usage.
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'not found', code: 'PGRST116' },
    });

    const result = await checkUsageLimit('missing-user');

    expect(result).toEqual({
      allowed: true,
      current: 0,
      limit: 10,
      resetDate: expect.any(String),
      tier: 'free',
      percentageUsed: 0,
    });
  });

  it('allows and reports usage under the limit', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockSingle.mockResolvedValue({
      data: { tier: 'free', verifications_count: 3, verifications_reset: today },
      error: null,
    });

    const result = await checkUsageLimit('user-1');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.percentageUsed).toBe(30);
  });

  it('disallows at the tier limit', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockSingle.mockResolvedValue({
      data: { tier: 'free', verifications_count: 10, verifications_reset: today },
      error: null,
    });

    const result = await checkUsageLimit('user-1');

    expect(result.allowed).toBe(false);
  });

  it('uses the correct limit for a paid tier', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockSingle.mockResolvedValue({
      data: { tier: 'pro', verifications_count: 5, verifications_reset: today },
      error: null,
    });

    const result = await checkUsageLimit('user-1');

    expect(result.limit).toBe(200);
    expect(result.tier).toBe('pro');
  });

  it('resets the count when the reset date is in the past', async () => {
    mockSingle.mockResolvedValue({
      data: { tier: 'free', verifications_count: 10, verifications_reset: '2020-01-01' },
      error: null,
    });

    const result = await checkUsageLimit('user-1');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('defaults to the free tier when the profile has no tier set', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockSingle.mockResolvedValue({
      data: { tier: null, verifications_count: 0, verifications_reset: today },
      error: null,
    });

    const result = await checkUsageLimit('user-1');

    expect(result.tier).toBe('free');
    expect(result.limit).toBe(10);
  });

  it('caps percentageUsed at 100', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockSingle.mockResolvedValue({
      data: { tier: 'free', verifications_count: 25, verifications_reset: today },
      error: null,
    });

    const result = await checkUsageLimit('user-1');

    expect(result.percentageUsed).toBe(100);
  });
});
