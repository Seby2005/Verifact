import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { DELETE } from '@/app/api/user/delete/route';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limit';

jest.mock('@/lib/supabase/auth-helpers');
jest.mock('@/lib/supabase/admin');
jest.mock('@/lib/utils/rate-limit');

describe('DELETE /api/user/delete', () => {
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
  const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;
  const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 3600000 });
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/user/delete', { method: 'DELETE' });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Trebuie să fii autentificat pentru a efectua această acțiune.');
  });

  it('should return 429 if rate limit is exceeded', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' } as unknown as User);
    mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 3600000 });

    const req = new NextRequest('http://localhost:3000/api/user/delete', { method: 'DELETE' });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toContain('Ai depășit limita');
  });

  it('should return 500 with Romanian error message if Supabase deleteUser fails', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' } as unknown as User);

    const mockAdminDeleteUser = jest.fn().mockResolvedValue({ error: new Error('Supabase Auth error') });
    const mockFrom = jest.fn().mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
    const mockStorageFrom = jest.fn().mockReturnValue({
      list: jest.fn().mockResolvedValue({ data: [] }),
      remove: jest.fn().mockResolvedValue({ data: [] }),
    });

    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { deleteUser: mockAdminDeleteUser } },
      from: mockFrom,
      storage: { from: mockStorageFrom },
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new NextRequest('http://localhost:3000/api/user/delete', { method: 'DELETE' });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('A apărut o eroare la ștergerea contului. Te rugăm să încerci din nou mai târziu.');
  });

  it('should return 200 on successful account deletion', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' } as unknown as User);

    const mockAdminDeleteUser = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn().mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
    const mockStorageFrom = jest.fn().mockReturnValue({
      list: jest.fn().mockResolvedValue({ data: [{ name: 'avatar.png' }] }),
      remove: jest.fn().mockResolvedValue({ data: [] }),
    });

    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { deleteUser: mockAdminDeleteUser } },
      from: mockFrom,
      storage: { from: mockStorageFrom },
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new NextRequest('http://localhost:3000/api/user/delete', { method: 'DELETE' });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAdminDeleteUser).toHaveBeenCalledWith('user-123');
  });
});
