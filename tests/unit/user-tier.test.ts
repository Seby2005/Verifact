import { fetchIsPremium } from '@/components/verify/ReportView/useUserTier';

describe('fetchIsPremium', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns true for admin users with unlimited flag set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        usage: { tier: 'free', unlimited: true, allowed: true },
      }),
    } as Response);

    const isPremium = await fetchIsPremium();
    expect(isPremium).toBe(true);
  });

  it('returns true for paid pro/business tiers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        usage: { tier: 'pro', allowed: true },
      }),
    } as Response);

    const isPremium = await fetchIsPremium();
    expect(isPremium).toBe(true);
  });

  it('returns false for free tier non-admin users', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        usage: { tier: 'free', allowed: true },
      }),
    } as Response);

    const isPremium = await fetchIsPremium();
    expect(isPremium).toBe(false);
  });
});
