const mockGte = jest.fn();
const mockEq = jest.fn(() => ({ gte: mockGte }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { computeAnonymousHash, checkAnonymousLimit } from '@/lib/usage/anonymous-limit';

describe('computeAnonymousHash', () => {
  it('produces a 64-character hex SHA-256 digest', async () => {
    const hash = await computeAnonymousHash('203.0.113.4', 'Mozilla/5.0');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same IP and user agent', async () => {
    const a = await computeAnonymousHash('203.0.113.4', 'Mozilla/5.0');
    const b = await computeAnonymousHash('203.0.113.4', 'Mozilla/5.0');
    expect(a).toBe(b);
  });

  it('is case-insensitive on the user agent', async () => {
    const a = await computeAnonymousHash('203.0.113.4', 'Mozilla/5.0 CHROME');
    const b = await computeAnonymousHash('203.0.113.4', 'mozilla/5.0 chrome');
    expect(a).toBe(b);
  });

  it('produces a different hash for a different IP', async () => {
    const a = await computeAnonymousHash('203.0.113.4', 'Mozilla/5.0');
    const b = await computeAnonymousHash('203.0.113.5', 'Mozilla/5.0');
    expect(a).not.toBe(b);
  });
});

describe('checkAnonymousLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the request when under the limit of 3', async () => {
    mockGte.mockResolvedValue({ count: 2, error: null });

    const result = await checkAnonymousLimit('203.0.113.4', 'Mozilla/5.0');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(2);
    expect(result.limit).toBe(3);
  });

  it('disallows the request at the limit', async () => {
    mockGte.mockResolvedValue({ count: 3, error: null });

    const result = await checkAnonymousLimit('203.0.113.4', 'Mozilla/5.0');

    expect(result.allowed).toBe(false);
  });

  it('fails open (allows) when the count query errors', async () => {
    mockGte.mockResolvedValue({ count: null, error: { message: 'db down' } });

    const result = await checkAnonymousLimit('203.0.113.4', 'Mozilla/5.0');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
  });

  it('queries verifications filtered by the computed hash', async () => {
    mockGte.mockResolvedValue({ count: 0, error: null });

    const result = await checkAnonymousLimit('203.0.113.4', 'Mozilla/5.0');

    expect(mockFrom).toHaveBeenCalledWith('verifications');
    expect(mockEq).toHaveBeenCalledWith('anonymous_hash', result.hash);
  });
});
