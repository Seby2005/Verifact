import { canUserVerify, TIER_LIMITS } from '@/lib/tier-limits';

describe('canUserVerify', () => {
  it('allows verification when under the tier limit', () => {
    const result = canUserVerify('free', 1, new Date());
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(TIER_LIMITS.free.verificationsPerMonth - 1);
  });

  it('disallows verification at the tier limit', () => {
    const result = canUserVerify('free', TIER_LIMITS.free.verificationsPerMonth, new Date());
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('uses the correct limit per tier', () => {
    expect(canUserVerify('pro', 0, new Date()).remaining).toBe(TIER_LIMITS.pro.verificationsPerMonth);
    expect(canUserVerify('business', 0, new Date()).remaining).toBe(TIER_LIMITS.business.verificationsPerMonth);
  });

  it('defaults to the free tier limit for an unrecognised tier', () => {
    const result = canUserVerify('made-up-tier' as never, 0, new Date());
    expect(result.remaining).toBe(TIER_LIMITS.free.verificationsPerMonth);
  });

  it('resets the count when the reset date is from a previous month', () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const result = canUserVerify('free', TIER_LIMITS.free.verificationsPerMonth, lastMonth);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(TIER_LIMITS.free.verificationsPerMonth);
  });

  it('does not reset the count when the reset date is within the current month', () => {
    const result = canUserVerify('free', 3, new Date());
    expect(result.remaining).toBe(TIER_LIMITS.free.verificationsPerMonth - 3);
  });

  it('accepts a string reset date', () => {
    const result = canUserVerify('free', 2, new Date().toISOString());
    expect(result.remaining).toBe(TIER_LIMITS.free.verificationsPerMonth - 2);
  });

  it('never returns a negative remaining count', () => {
    const result = canUserVerify('free', TIER_LIMITS.free.verificationsPerMonth + 10, new Date());
    expect(result.remaining).toBe(0);
  });

  it('resetsAt is always the first of next month', () => {
    const result = canUserVerify('free', 0, new Date());
    expect(result.resetsAt.getDate()).toBe(1);
  });
});
