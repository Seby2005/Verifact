import { getAnonymousUsage, incrementAnonymousUsage, isAnonymousLimitReached } from '@/lib/usage/anonymous';

// jest.config.cjs runs tests under testEnvironment: 'node' — there is no
// `window`/`localStorage`, which is exactly the SSR context these
// SSR-safety guards exist for.
describe('anonymous usage helpers (no-window / SSR environment)', () => {
  it('getAnonymousUsage returns a zeroed record instead of throwing', () => {
    expect(getAnonymousUsage()).toEqual({ count: 0, lastReset: '' });
  });

  it('incrementAnonymousUsage is a safe no-op', () => {
    expect(() => incrementAnonymousUsage()).not.toThrow();
  });

  it('isAnonymousLimitReached is false when there is no usage record', () => {
    expect(isAnonymousLimitReached()).toBe(false);
  });
});
