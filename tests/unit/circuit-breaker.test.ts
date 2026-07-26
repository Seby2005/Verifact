import {
  withCircuitBreaker,
  getCircuitState,
  resetAllCircuits,
  CircuitOpenError,
} from '@/lib/utils/circuit-breaker';

describe('withCircuitBreaker', () => {
  beforeEach(() => {
    resetAllCircuits();
  });

  it('stays closed and calls through on repeated success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    for (let i = 0; i < 10; i++) {
      await withCircuitBreaker('svc-success', fn);
    }

    expect(getCircuitState('svc-success')).toBe('closed');
    expect(fn).toHaveBeenCalledTimes(10);
  });

  it('opens after `failureThreshold` consecutive failures', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    for (let i = 0; i < 3; i++) {
      await expect(
        withCircuitBreaker('svc-fail', fn, { failureThreshold: 3 })
      ).rejects.toThrow('boom');
    }

    expect(getCircuitState('svc-fail')).toBe('open');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('fails fast with CircuitOpenError once open, without calling fn again', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    for (let i = 0; i < 3; i++) {
      await expect(
        withCircuitBreaker('svc-fastfail', fn, { failureThreshold: 3, cooldownMs: 60_000 })
      ).rejects.toThrow('boom');
    }
    fn.mockClear();

    await expect(withCircuitBreaker('svc-fastfail', fn, { failureThreshold: 3, cooldownMs: 60_000 })).rejects.toThrow(
      CircuitOpenError
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not open before the failure threshold is reached', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(withCircuitBreaker('svc-under-threshold', fn, { failureThreshold: 5 })).rejects.toThrow('boom');
    await expect(withCircuitBreaker('svc-under-threshold', fn, { failureThreshold: 5 })).rejects.toThrow('boom');

    expect(getCircuitState('svc-under-threshold')).toBe('closed');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('a success resets the consecutive failure count', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'));

    await expect(withCircuitBreaker('svc-reset', fn, { failureThreshold: 3 })).rejects.toThrow();
    await expect(withCircuitBreaker('svc-reset', fn, { failureThreshold: 3 })).rejects.toThrow();
    await expect(withCircuitBreaker('svc-reset', fn, { failureThreshold: 3 })).resolves.toBe('ok');
    // Two more failures after the reset — still below threshold of 3.
    await expect(withCircuitBreaker('svc-reset', fn, { failureThreshold: 3 })).rejects.toThrow();
    await expect(withCircuitBreaker('svc-reset', fn, { failureThreshold: 3 })).rejects.toThrow();

    expect(getCircuitState('svc-reset')).toBe('closed');
  });

  it('allows a trial call through (half-open) after the cooldown elapses, and closes on success', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');

    await expect(withCircuitBreaker('svc-cooldown', fn, { failureThreshold: 2, cooldownMs: 5 })).rejects.toThrow();
    await expect(withCircuitBreaker('svc-cooldown', fn, { failureThreshold: 2, cooldownMs: 5 })).rejects.toThrow();
    expect(getCircuitState('svc-cooldown')).toBe('open');

    await new Promise((r) => setTimeout(r, 15)); // let the cooldown elapse

    const result = await withCircuitBreaker('svc-cooldown', fn, { failureThreshold: 2, cooldownMs: 5 });

    expect(result).toBe('recovered');
    expect(getCircuitState('svc-cooldown')).toBe('closed');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('a failed half-open trial re-opens immediately, not after another full threshold', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('still down'));

    await expect(withCircuitBreaker('svc-half-open-fail', fn, { failureThreshold: 2, cooldownMs: 5 })).rejects.toThrow();
    await expect(withCircuitBreaker('svc-half-open-fail', fn, { failureThreshold: 2, cooldownMs: 5 })).rejects.toThrow();
    expect(getCircuitState('svc-half-open-fail')).toBe('open');

    await new Promise((r) => setTimeout(r, 15));

    // The half-open trial call also fails — should re-open on this single
    // failure, not require hitting the threshold again.
    await expect(withCircuitBreaker('svc-half-open-fail', fn, { failureThreshold: 2, cooldownMs: 5 })).rejects.toThrow(
      'still down'
    );
    expect(getCircuitState('svc-half-open-fail')).toBe('open');

    // Immediately after, still open (no second cooldown elapsed yet).
    await expect(
      withCircuitBreaker('svc-half-open-fail', fn, { failureThreshold: 2, cooldownMs: 60_000 })
    ).rejects.toThrow(CircuitOpenError);
  });

  it('resetAllCircuits clears state so a previously-open circuit closes', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(withCircuitBreaker('svc-manual-reset', fn, { failureThreshold: 1 })).rejects.toThrow();
    expect(getCircuitState('svc-manual-reset')).toBe('open');

    resetAllCircuits();

    expect(getCircuitState('svc-manual-reset')).toBe('closed');
  });

  it('tracks independent services separately', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('boom'));
    const healthy = jest.fn().mockResolvedValue('ok');

    await expect(withCircuitBreaker('svc-a', failing, { failureThreshold: 1 })).rejects.toThrow();
    await withCircuitBreaker('svc-b', healthy);

    expect(getCircuitState('svc-a')).toBe('open');
    expect(getCircuitState('svc-b')).toBe('closed');
  });
});
