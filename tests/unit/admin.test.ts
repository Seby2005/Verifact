const mockGetUser = jest.fn();
const mockSingle = jest.fn();
const mockServerFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSingle,
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  }),
}));

const mockAdminInsert = jest.fn();
const mockAdminFrom = jest.fn(() => ({ insert: mockAdminInsert }));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { requireAdmin, logAdminAction, AuthorizationError } from '@/lib/auth/admin';

const ADMIN_USER = { id: 'user-admin', email: 'admin@example.com' };

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws a 401 AuthorizationError when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });

  it('throws a 401 when getUser errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('bad session') });

    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('throws a 403 when the profile cannot be found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: new Error('not found') });

    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });

  it('throws a 403 when the user role is "user"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockSingle.mockResolvedValue({ data: { role: 'user' }, error: null });

    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });

  it('throws a 403 for a moderator when allowModerator is not set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockSingle.mockResolvedValue({ data: { role: 'moderator' }, error: null });

    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });

  it('resolves with the user and role for an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });

    const result = await requireAdmin();

    expect(result.user).toBe(ADMIN_USER);
    expect(result.role).toBe('admin');
  });

  it('resolves for a moderator when allowModerator is true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockSingle.mockResolvedValue({ data: { role: 'moderator' }, error: null });

    const result = await requireAdmin({ allowModerator: true });

    expect(result.role).toBe('moderator');
  });
});

describe('logAdminAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminInsert.mockResolvedValue({ error: null });
  });

  it('inserts the action with the expected shape via the admin client', async () => {
    await logAdminAction({
      adminId: 'user-admin',
      actionType: 'dispute.resolve',
      targetTable: 'disputes',
      targetId: 'dispute-1',
      details: { note: 'resolved as kept' },
    });

    expect(mockAdminFrom).toHaveBeenCalledWith('admin_actions');
    expect(mockAdminInsert).toHaveBeenCalledWith({
      admin_id: 'user-admin',
      action_type: 'dispute.resolve',
      target_table: 'disputes',
      target_id: 'dispute-1',
      details: { note: 'resolved as kept' },
    });
  });

  it('defaults details to null when not provided', async () => {
    await logAdminAction({
      adminId: 'user-admin',
      actionType: 'profile.role_change',
      targetTable: 'profiles',
      targetId: 'user-2',
    });

    expect(mockAdminInsert).toHaveBeenCalledWith(
      expect.objectContaining({ details: null })
    );
  });

  it('does not throw when the insert fails — logging failure is non-fatal', async () => {
    mockAdminInsert.mockResolvedValue({ error: { message: 'insert failed' } });

    await expect(
      logAdminAction({
        adminId: 'user-admin',
        actionType: 'dispute.resolve',
        targetTable: 'disputes',
        targetId: 'dispute-1',
      })
    ).resolves.toBeUndefined();
  });
});
