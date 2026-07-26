import {
  reserveUsageSlot,
  releaseUsageSlot,
  saveVerification,
} from '@/lib/verification/db-operations';
import type { VerificationReport } from '@/types/verification';

type RpcResult<T> = { data: T | null; error: { message: string } | null };
type SupabaseLike = Parameters<typeof reserveUsageSlot>[0];

/**
 * Simulates Postgres's `SELECT ... FOR UPDATE` row lock used by
 * reserve_usage_slot/release_usage_slot (supabase/migrations/002_atomic_usage_rpc.sql):
 * only one "transaction" executes the check-and-increment critical section
 * at a time, no matter how many callers arrive concurrently. This models
 * exactly the atomicity guarantee the migration relies on, so a test built
 * on it proves reserveUsageSlot()'s calling code doesn't reintroduce a race
 * on top of an atomic backend.
 */
function createAtomicUsageStore(initialCount: number, limit: number) {
  let count = initialCount;
  let lockChain: Promise<unknown> = Promise.resolve();

  const rpc = jest.fn((fn: string): Promise<RpcResult<unknown>> => {
    const run = async (): Promise<RpcResult<unknown>> => {
      if (fn === 'reserve_usage_slot') {
        if (count >= limit) {
          return { data: [{ allowed: false, usage_limit: limit, used: count }], error: null };
        }
        count += 1;
        return { data: [{ allowed: true, usage_limit: limit, used: count }], error: null };
      }
      if (fn === 'release_usage_slot') {
        count = Math.max(count - 1, 0);
        return { data: null, error: null };
      }
      throw new Error(`Unexpected rpc call: ${fn}`);
    };

    const result = lockChain.then(run);
    // Keep the chain alive even if a call errors, so later calls still queue.
    lockChain = result.catch(() => undefined);
    return result;
  });

  return { rpc, getCount: () => count };
}

describe('reserveUsageSlot concurrency', () => {
  it('never allows more than `limit` reservations under 20 concurrent callers', async () => {
    const LIMIT = 10;
    const store = createAtomicUsageStore(0, LIMIT);
    const supabase = { rpc: store.rpc } as unknown as SupabaseLike;

    const results = await Promise.all(
      Array.from({ length: 20 }, () => reserveUsageSlot(supabase))
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(LIMIT);
    expect(results.length - allowedCount).toBe(10); // the other 10 were rejected
    expect(store.getCount()).toBe(LIMIT); // counter never overshoots the limit
  });

  it('starting near the limit still stops exactly at the limit under concurrency', async () => {
    const LIMIT = 10;
    const store = createAtomicUsageStore(8, LIMIT); // 8 already used, 2 slots left
    const supabase = { rpc: store.rpc } as unknown as SupabaseLike;

    const results = await Promise.all(
      Array.from({ length: 20 }, () => reserveUsageSlot(supabase))
    );

    expect(results.filter((r) => r.allowed).length).toBe(2);
    expect(store.getCount()).toBe(LIMIT);
  });

  it('releasing a reservation frees a slot for a subsequent call', async () => {
    const LIMIT = 1;
    const store = createAtomicUsageStore(0, LIMIT);
    const supabase = { rpc: store.rpc } as unknown as SupabaseLike;

    const first = await reserveUsageSlot(supabase);
    expect(first.allowed).toBe(true);

    const second = await reserveUsageSlot(supabase);
    expect(second.allowed).toBe(false);

    await releaseUsageSlot(supabase);

    const third = await reserveUsageSlot(supabase);
    expect(third.allowed).toBe(true);
  });

  it('fails open when the RPC errors, so an outage does not block every verification', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'connection lost' } });
    const supabase = { rpc } as unknown as SupabaseLike;

    const result = await reserveUsageSlot(supabase);

    expect(result.allowed).toBe(true);
    expect(rpc).toHaveBeenCalledWith('reserve_usage_slot');
  });

  it('release calls the release_usage_slot RPC with no arguments', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { rpc } as unknown as SupabaseLike;

    await releaseUsageSlot(supabase);

    expect(rpc).toHaveBeenCalledWith('release_usage_slot');
  });
});

describe('saveVerification', () => {
  const baseReport: VerificationReport = {
    id: 'report-1',
    inputText: 'Claim text',
    inputType: 'text',
    verdict: 'partial',
    score: 60,
    confidenceLevel: 'medium',
    executiveSummary: 'Summary',
    scoreBreakdown: {
      finalScore: 60,
      availableLayers: 4,
      weights: { factCheck: 0.35, news: 0.3, official: 0.25 },
    },
    sources: [],
    createdAt: new Date().toISOString(),
    isPublic: false,
    language: 'ro',
  };

  function makeSupabase(error: { message: string } | null) {
    const insert = jest.fn().mockResolvedValue({ error });
    const from = jest.fn().mockReturnValue({ insert });
    return { supabase: { from } as unknown as SupabaseLike, insert };
  }

  it('returns true and inserts the report on success', async () => {
    const { supabase, insert } = makeSupabase(null);

    const result = await saveVerification(baseReport, supabase);

    expect(result).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    const insertedRow = insert.mock.calls[0][0];
    expect(insertedRow.id).toBe('report-1');
    expect(insertedRow.user_id).toBeNull();
    expect(insertedRow.anonymous_hash).toBeNull();
  });

  it('stores the anonymous hash for unauthenticated reports', async () => {
    const { supabase, insert } = makeSupabase(null);

    await saveVerification(baseReport, supabase, 'abc123hash');

    expect(insert.mock.calls[0][0].anonymous_hash).toBe('abc123hash');
  });

  it('does not store an anonymous hash when the report belongs to a user', async () => {
    const { supabase, insert } = makeSupabase(null);

    await saveVerification({ ...baseReport, userId: 'user-1' }, supabase, 'abc123hash');

    expect(insert.mock.calls[0][0].anonymous_hash).toBeNull();
    expect(insert.mock.calls[0][0].user_id).toBe('user-1');
  });

  it('returns false when the insert fails, so callers can release a reserved slot', async () => {
    const { supabase } = makeSupabase({ message: 'insert failed' });

    const result = await saveVerification(baseReport, supabase);

    expect(result).toBe(false);
  });
});
