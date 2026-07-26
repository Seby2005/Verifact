const mockAdminUpdate = jest.fn();
const mockAdminMaybeSingle = jest.fn();
const mockAdminFrom = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { fileDispute } from '@/lib/verification/disputes';
import { createContentHash } from '@/lib/utils/hash';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type SupabaseLike = SupabaseClient<Database>;

const PUBLIC_VERIFICATION = {
  id: 'verification-1',
  user_id: 'owner-1',
  is_public: true,
  input_text: 'Pământul este plat.',
  language: 'ro',
};

const PRIVATE_VERIFICATION = {
  ...PUBLIC_VERIFICATION,
  id: 'verification-2',
  is_public: false,
};

/** Builds a mock user-scoped client: verifications select + disputes insert. */
function makeUserClient(options: {
  verification?: typeof PUBLIC_VERIFICATION | null;
  fetchError?: { message: string } | null;
  insertError?: { message: string } | null;
}) {
  const { verification = PUBLIC_VERIFICATION, fetchError = null, insertError = null } = options;

  const verificationsSingle = jest.fn().mockResolvedValue({
    data: fetchError ? null : verification,
    error: fetchError,
  });

  const disputesInsert = jest.fn().mockResolvedValue({ error: insertError });

  const from = jest.fn((table: string) => {
    if (table === 'verifications') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: verificationsSingle,
      };
    }
    if (table === 'disputes') {
      return { insert: disputesInsert };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { supabase: { from } as unknown as SupabaseLike, disputesInsert, verificationsSingle };
}

describe('fileDispute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockAdminUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'verifications') {
        return { update: mockAdminUpdate };
      }
      if (table === 'cached_results') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: mockAdminMaybeSingle,
          update: mockAdminUpdate,
        };
      }
      throw new Error(`Unexpected admin table: ${table}`);
    });
  });

  it('returns 404 when the verification does not exist', async () => {
    const { supabase } = makeUserClient({ fetchError: { message: 'not found' } });

    const result = await fileDispute(
      { verificationId: 'missing', reason: 'This is wrong', email: null, userId: null },
      supabase
    );

    expect(result).toEqual({ success: false, status: 404, error: expect.any(String) });
  });

  it('returns 403 when the report is private and the caller is not the owner', async () => {
    const { supabase } = makeUserClient({ verification: PRIVATE_VERIFICATION });

    const result = await fileDispute(
      { verificationId: PRIVATE_VERIFICATION.id, reason: 'This is wrong', email: null, userId: 'someone-else' },
      supabase
    );

    expect(result).toEqual({ success: false, status: 403, error: expect.any(String) });
  });

  it('returns 403 for an anonymous caller on a private report', async () => {
    const { supabase } = makeUserClient({ verification: PRIVATE_VERIFICATION });

    const result = await fileDispute(
      { verificationId: PRIVATE_VERIFICATION.id, reason: 'This is wrong', email: null, userId: null },
      supabase
    );

    expect(result.success).toBe(false);
  });

  it('succeeds for an anonymous caller on a public report', async () => {
    const { supabase, disputesInsert } = makeUserClient({ verification: PUBLIC_VERIFICATION });

    const result = await fileDispute(
      { verificationId: PUBLIC_VERIFICATION.id, reason: 'This claim is false', email: null, userId: null },
      supabase
    );

    expect(result).toEqual({ success: true });
    expect(disputesInsert).toHaveBeenCalledWith({
      verification_id: PUBLIC_VERIFICATION.id,
      reporter_email: null,
      reporter_user_id: null,
      reason: 'This claim is false',
      resolved_by: null,
      resolution_note: null,
    });
  });

  it('succeeds when the private report belongs to the caller', async () => {
    const { supabase } = makeUserClient({ verification: PRIVATE_VERIFICATION });

    const result = await fileDispute(
      { verificationId: PRIVATE_VERIFICATION.id, reason: 'This claim is false', email: null, userId: 'owner-1' },
      supabase
    );

    expect(result.success).toBe(true);
  });

  it('returns 500 when the dispute insert fails', async () => {
    const { supabase } = makeUserClient({ insertError: { message: 'db down' } });

    const result = await fileDispute(
      { verificationId: PUBLIC_VERIFICATION.id, reason: 'This claim is false', email: null, userId: null },
      supabase
    );

    expect(result).toEqual({ success: false, status: 500, error: expect.any(String) });
  });

  it('flags the verification as disputed via the admin client on success', async () => {
    const { supabase } = makeUserClient({ verification: PUBLIC_VERIFICATION });
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    mockAdminUpdate.mockReturnValue({ eq: eqMock });

    await fileDispute(
      { verificationId: PUBLIC_VERIFICATION.id, reason: 'This claim is false', email: null, userId: null },
      supabase
    );

    expect(mockAdminFrom).toHaveBeenCalledWith('verifications');
    expect(mockAdminUpdate).toHaveBeenCalledWith({ disputed: true });
    expect(eqMock).toHaveBeenCalledWith('id', PUBLIC_VERIFICATION.id);
  });

  it('invalidates the matching cached_results entry when one exists', async () => {
    const { supabase } = makeUserClient({ verification: PUBLIC_VERIFICATION });
    mockAdminMaybeSingle.mockResolvedValue({ data: { disputed_count: 2 }, error: null });
    const cacheEq = jest.fn().mockResolvedValue({ error: null });
    const verificationsEq = jest.fn().mockResolvedValue({ error: null });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'verifications') {
        return { update: jest.fn().mockReturnValue({ eq: verificationsEq }) };
      }
      if (table === 'cached_results') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: mockAdminMaybeSingle,
          update: jest.fn().mockReturnValue({ eq: cacheEq }),
        };
      }
      throw new Error(`Unexpected admin table: ${table}`);
    });

    await fileDispute(
      { verificationId: PUBLIC_VERIFICATION.id, reason: 'This claim is false', email: null, userId: null },
      supabase
    );

    const expectedHash = createContentHash(PUBLIC_VERIFICATION.input_text, PUBLIC_VERIFICATION.language);
    expect(cacheEq).toHaveBeenCalledWith('content_hash', expectedHash);
  });

  it('does not fail the whole request when no matching cache entry exists', async () => {
    const { supabase } = makeUserClient({ verification: PUBLIC_VERIFICATION });
    mockAdminMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await fileDispute(
      { verificationId: PUBLIC_VERIFICATION.id, reason: 'This claim is false', email: null, userId: null },
      supabase
    );

    expect(result).toEqual({ success: true });
  });

  it('still reports success to the caller even if the best-effort flag/invalidate step fails', async () => {
    const { supabase } = makeUserClient({ verification: PUBLIC_VERIFICATION });
    mockAdminUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: { message: 'boom' } }) });

    const result = await fileDispute(
      { verificationId: PUBLIC_VERIFICATION.id, reason: 'This claim is false', email: null, userId: null },
      supabase
    );

    // The dispute record itself was saved successfully — that's the part
    // the caller needs to know worked. The flag/invalidate failure is
    // logged, not surfaced, matching saveVerification's non-fatal-cache
    // pattern elsewhere in this codebase.
    expect(result).toEqual({ success: true });
  });

  it('passes the reporter email through when provided', async () => {
    const { supabase, disputesInsert } = makeUserClient({ verification: PUBLIC_VERIFICATION });

    await fileDispute(
      {
        verificationId: PUBLIC_VERIFICATION.id,
        reason: 'This claim is false',
        email: 'reporter@example.com',
        userId: null,
      },
      supabase
    );

    expect(disputesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ reporter_email: 'reporter@example.com' })
    );
  });
});
