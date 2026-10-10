import type { User } from '@supabase/supabase-js';
import { GET as getKeys, POST as createKeyRoute } from '@/app/api/user/keys/route';
import { DELETE as deleteKeyRoute } from '@/app/api/user/keys/[id]/route';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/auth/api-keys';

jest.mock('@/lib/supabase/auth-helpers');
jest.mock('@/lib/auth/api-keys');

describe('/api/user/keys route handlers', () => {
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
  const mockListApiKeys = listApiKeys as jest.MockedFunction<typeof listApiKeys>;
  const mockCreateApiKey = createApiKey as jest.MockedFunction<typeof createApiKey>;
  const mockRevokeApiKey = revokeApiKey as jest.MockedFunction<typeof revokeApiKey>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/keys', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const res = await getKeys();
      expect(res.status).toBe(401);
    });

    it('returns 200 with keys list when authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-123' } as User);
      mockListApiKeys.mockResolvedValue([
        {
          id: 'key-1',
          name: 'Prod',
          keyPrefix: 'vf_live_12345678',
          scopes: ['verify'],
          lastUsedAt: null,
          createdAt: '2026-08-20T00:00:00Z',
          revokedAt: null,
        },
      ]);

      const res = await getKeys();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.keys).toHaveLength(1);
      expect(data.keys[0].name).toBe('Prod');
    });
  });

  describe('POST /api/user/keys', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const req = new Request('http://localhost/api/user/keys', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Key' }),
      });
      const res = await createKeyRoute(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not on Business tier', async () => {
      mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-123' } as User);
      mockCreateApiKey.mockRejectedValue(new Error('FORBIDDEN: Only Business accounts may create API keys'));

      const req = new Request('http://localhost/api/user/keys', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Key' }),
      });
      const res = await createKeyRoute(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Business');
    });

    it('returns 200 with rawKey and key metadata for Business user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-biz' } as User);
      mockCreateApiKey.mockResolvedValue({
        id: 'key-new',
        name: 'New Key',
        keyPrefix: 'vf_live_abcdef12',
        rawKey: 'vf_live_abcdef12345678901234567890123456',
        createdAt: '2026-08-20T00:00:00Z',
      });

      const req = new Request('http://localhost/api/user/keys', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Key' }),
      });
      const res = await createKeyRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.apiKey.rawKey).toBe('vf_live_abcdef12345678901234567890123456');
    });
  });

  describe('DELETE /api/user/keys/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const req = new Request('http://localhost/api/user/keys/key-1', { method: 'DELETE' });
      const res = await deleteKeyRoute(req, { params: Promise.resolve({ id: 'key-1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 200 when revoke succeeds', async () => {
      mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-123' } as User);
      mockRevokeApiKey.mockResolvedValue(true);

      const req = new Request('http://localhost/api/user/keys/key-1', { method: 'DELETE' });
      const res = await deleteKeyRoute(req, { params: Promise.resolve({ id: 'key-1' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRevokeApiKey).toHaveBeenCalledWith('key-1', 'user-123');
    });
  });
});
