const mockAdminFrom = jest.fn();
const mockAdminRpc = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  }),
}));

import {
  generateRandomBase62,
  hashApiKey,
  getKeyPrefix,
  generateRawApiKey,
  authenticateApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  reserveUsageSlotFor,
  releaseUsageSlotFor,
} from '@/lib/auth/api-keys';

describe('API Keys Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Key Generation & Hashing', () => {
    it('generateRandomBase62 generates url-safe base62 string of requested length', () => {
      const str = generateRandomBase62(36);
      expect(str).toHaveLength(36);
      expect(str).toMatch(/^[0-9A-Za-z]+$/);
    });

    it('generateRawApiKey returns key with vf_live_ prefix, length >= 40, matching hash and prefix', () => {
      const { rawKey, keyHash, keyPrefix } = generateRawApiKey();
      expect(rawKey.startsWith('vf_live_')).toBe(true);
      expect(rawKey.length).toBeGreaterThanOrEqual(40);
      expect(keyHash).toBe(hashApiKey(rawKey));
      expect(keyPrefix).toBe(rawKey.slice(0, 16));
    });

    it('hashApiKey returns SHA-256 hex string', () => {
      const hash1 = hashApiKey('vf_live_test123');
      const hash2 = hashApiKey('vf_live_test123');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('getKeyPrefix returns prefix of rawKey', () => {
      expect(getKeyPrefix('vf_live_12345678abcdef')).toBe('vf_live_12345678');
      expect(getKeyPrefix('short')).toBe('short');
    });
  });

  describe('authenticateApiKey', () => {
    it('returns null for empty, invalid format, or non-vf_live_ keys', async () => {
      expect(await authenticateApiKey('')).toBeNull();
      expect(await authenticateApiKey('invalid_prefix_123')).toBeNull();
      expect(await authenticateApiKey('bearer token')).toBeNull();
    });

    it('returns null when key hash is not found in database', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

      mockAdminFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const res = await authenticateApiKey('vf_live_validformatbutnotindb1234567890');
      expect(res).toBeNull();
    });

    it('returns null when key is revoked (revoked_at is set)', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'key-123',
          user_id: 'user-456',
          scopes: ['verify'],
          revoked_at: '2026-08-20T00:00:00.000Z',
        },
        error: null,
      });

      mockAdminFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const res = await authenticateApiKey('vf_live_revokedkey1234567890123456');
      expect(res).toBeNull();
    });

    it('returns user credentials and updates last_used_at for valid active key', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockUpdateEq = jest.fn().mockResolvedValue({ data: null, error: null });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'api_keys') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'key-123',
                user_id: 'user-456',
                scopes: ['verify'],
                revoked_at: null,
              },
              error: null,
            }),
            update: mockUpdate.mockReturnValue({
              eq: mockUpdateEq,
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'user-456',
                tier: 'business',
                role: 'user',
              },
              error: null,
            }),
          };
        }
        return {};
      });

      const res = await authenticateApiKey('vf_live_validactivekey1234567890123');
      expect(res).toEqual({
        userId: 'user-456',
        tier: 'business',
        scopes: ['verify'],
      });
    });

    it('returns user credentials when user role is admin', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'api_keys') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'key-admin',
                user_id: 'admin-user',
                scopes: ['verify'],
                revoked_at: null,
              },
              error: null,
            }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'admin-user',
                tier: 'pro',
                role: 'admin',
              },
              error: null,
            }),
          };
        }
        return {};
      });

      const res = await authenticateApiKey('vf_live_adminkey123456789012345678');
      expect(res).toEqual({
        userId: 'admin-user',
        tier: 'pro',
        scopes: ['verify'],
      });
    });
  });

  describe('createApiKey', () => {
    it('throws FORBIDDEN error when user tier is free or pro without admin role', async () => {
      mockAdminFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { tier: 'pro', role: 'user' },
          error: null,
        }),
      });

      await expect(createApiKey('user-pro-id', 'Test Key')).rejects.toThrow(
        /FORBIDDEN: Only Business accounts may create API keys/
      );
    });

    it('creates and returns API key for business tier user', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'key-new-id',
          name: 'Production Bot',
          key_prefix: 'vf_live_12345678',
          created_at: '2026-08-20T01:00:00.000Z',
        },
        error: null,
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { tier: 'business', role: 'user' },
              error: null,
            }),
          };
        }
        if (table === 'api_keys') {
          return {
            insert: mockInsert.mockReturnValue({
              select: mockSelect.mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
        return {};
      });

      const res = await createApiKey('user-biz-id', 'Production Bot');
      expect(res.id).toBe('key-new-id');
      expect(res.name).toBe('Production Bot');
      expect(res.keyPrefix).toBe('vf_live_12345678');
      expect(res.rawKey.startsWith('vf_live_')).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-biz-id',
          name: 'Production Bot',
          scopes: ['verify'],
        })
      );
    });
  });

  describe('listApiKeys and revokeApiKey', () => {
    it('listApiKeys returns mapped keys array without hashes or raw keys', async () => {
      mockAdminFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'key-1',
              name: 'Key 1',
              key_prefix: 'vf_live_11111111',
              scopes: ['verify'],
              last_used_at: null,
              created_at: '2026-08-20T00:00:00Z',
              revoked_at: null,
            },
          ],
          error: null,
        }),
      });

      const keys = await listApiKeys('user-123');
      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('Key 1');
      expect(keys[0].keyPrefix).toBe('vf_live_11111111');
      expect((keys[0] as unknown as { rawKey?: string }).rawKey).toBeUndefined();
      expect((keys[0] as unknown as { key_hash?: string }).key_hash).toBeUndefined();
    });

    it('revokeApiKey updates revoked_at for the target key and user', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });

      mockAdminFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq1.mockReturnValue({
            eq: mockEq2,
          }),
        }),
      });

      const success = await revokeApiKey('key-1', 'user-123');
      expect(success).toBe(true);
    });
  });

  describe('RPC helpers: reserveUsageSlotFor and releaseUsageSlotFor', () => {
    it('reserveUsageSlotFor calls rpc reserve_usage_slot_for with p_user_id', async () => {
      mockAdminRpc.mockResolvedValue({
        data: [{ allowed: true, usage_limit: 1000, used: 5 }],
        error: null,
      });

      const res = await reserveUsageSlotFor('user-biz-123');
      expect(mockAdminRpc).toHaveBeenCalledWith('reserve_usage_slot_for', {
        p_user_id: 'user-biz-123',
      });
      expect(res).toEqual({ allowed: true, limit: 1000, used: 5 });
    });

    it('releaseUsageSlotFor calls rpc release_usage_slot_for with p_user_id', async () => {
      mockAdminRpc.mockResolvedValue({ error: null });

      await releaseUsageSlotFor('user-biz-123');
      expect(mockAdminRpc).toHaveBeenCalledWith('release_usage_slot_for', {
        p_user_id: 'user-biz-123',
      });
    });
  });
});
