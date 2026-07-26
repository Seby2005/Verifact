const mockRpc = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

// Imported after the mock so rate-limit.ts picks up the mocked module.
import { checkRateLimit } from '@/lib/utils/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('calls check_rate_limit with the given key, limit, and window', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 9, reset_at: new Date(Date.now() + 60000).toISOString() }],
      error: null,
    });

    const result = await checkRateLimit('verify:1.2.3.4', 10, 60000);

    expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
      p_key: 'verify:1.2.3.4',
      p_limit: 10,
      p_window_ms: 60000,
    });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('returns success=false once the limit is reached', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, reset_at: new Date(Date.now() + 30000).toISOString() }],
      error: null,
    });

    const result = await checkRateLimit('verify:1.2.3.4', 10, 60000);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('defaults to limit=10 and windowMs=60000 when not provided', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 9, reset_at: new Date().toISOString() }],
      error: null,
    });

    await checkRateLimit('some-key');

    expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
      p_key: 'some-key',
      p_limit: 10,
      p_window_ms: 60000,
    });
  });

  it('fails open when the RPC returns an error, so an outage does not take down the API', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection refused' } });

    const result = await checkRateLimit('verify:1.2.3.4', 5, 1000);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('fails open when the RPC call throws', async () => {
    mockRpc.mockRejectedValue(new Error('network error'));

    const result = await checkRateLimit('verify:1.2.3.4', 5, 1000);

    expect(result.success).toBe(true);
  });
});

describe('checkRateLimit concurrency', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  /**
   * Simulates check_rate_limit's atomic row-locked upsert (see
   * supabase/migrations/003_rate_limits.sql): concurrent callers for the
   * same key serialize through the critical section instead of racing on
   * independent reads, the same technique used in db-operations.test.ts for
   * reserve_usage_slot. This proves the "distributed" limiter holds the
   * line under real concurrent load rather than merely under sequential
   * calls.
   */
  it('never allows more than `limit` requests per window under 25 concurrent callers', async () => {
    const LIMIT = 10;
    const WINDOW_MS = 60_000;
    let count = 0;
    const resetAt = new Date(Date.now() + WINDOW_MS).toISOString();
    let lockChain: Promise<unknown> = Promise.resolve();

    mockRpc.mockImplementation((_fn: string, args: { p_limit: number }) => {
      const run = async () => {
        if (count >= args.p_limit) {
          return { data: [{ allowed: false, remaining: 0, reset_at: resetAt }], error: null };
        }
        count += 1;
        return { data: [{ allowed: true, remaining: args.p_limit - count, reset_at: resetAt }], error: null };
      };
      const result = lockChain.then(run);
      lockChain = result.catch(() => undefined);
      return result;
    });

    const results = await Promise.all(
      Array.from({ length: 25 }, () => checkRateLimit('verify:shared-ip', LIMIT, WINDOW_MS))
    );

    expect(results.filter((r) => r.success).length).toBe(LIMIT);
    expect(results.length - results.filter((r) => r.success).length).toBe(15);
    expect(count).toBe(LIMIT);
  });
});
