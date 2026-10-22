import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import type { UserTier } from '@/types/user';

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface ApiKeyCreatedResult {
  id: string;
  name: string;
  keyPrefix: string;
  rawKey: string;
  createdAt: string;
}

interface ApiKeyDbRow {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface ProfileDbRow {
  id: string;
  tier: string | null;
  role: string | null;
}

/** The operations a key can be granted. `verify` is the only one the API has. */
const ALLOWED_SCOPES = ['verify'] as const;
/** Active (unrevoked) keys one account may hold, so a revocation sweep stays tractable. */
const MAX_ACTIVE_KEYS = 10;
const MAX_KEY_NAME_LENGTH = 64;

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const KEY_PREFIX_HEADER = 'vf_live_';

/**
 * Generates a cryptographically secure random base62 string of a given length.
 */
export function generateRandomBase62(length = 36): string {
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE62_CHARS[randomBytes[i] % BASE62_CHARS.length];
  }
  return result;
}

/**
 * Computes SHA-256 hash in hex format.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Extracts a safe prefix for key identification in UI (e.g. vf_live_a1b2c3d4...).
 */
export function getKeyPrefix(rawKey: string): string {
  if (!rawKey.startsWith(KEY_PREFIX_HEADER)) {
    return rawKey.slice(0, 16);
  }
  // Return prefix header + first 8 random characters
  return rawKey.slice(0, KEY_PREFIX_HEADER.length + 8);
}

/**
 * Generates a new raw API key in format vf_live_<32+ base62 chars>
 * along with its SHA-256 hash and display prefix.
 */
export function generateRawApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = generateRandomBase62(36);
  const rawKey = `${KEY_PREFIX_HEADER}${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Authenticates an incoming raw API key (Mode B).
 *
 * Rules (CONTRACT_v1.md):
 * - Must start with 'vf_live_' and exist in api_keys by sha256(rawKey).
 * - Reject revoked (revoked_at is set) keys with null.
 * - Resolves user profile and tier.
 * - Updates `last_used_at` asynchronously on success (best-effort, non-blocking).
 * - Never logs or stores raw keys.
 */
export async function authenticateApiKey(
  rawKey: string
): Promise<{ userId: string; keyId: string; tier: UserTier; scopes: string[] } | null> {
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.startsWith(KEY_PREFIX_HEADER)) {
    return null;
  }

  const hash = hashApiKey(rawKey);

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    logger.error('Failed to create admin client for API key authentication', {
      service: 'auth/api-keys',
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  const { data: keyData, error: keyError } = await (adminClient
    .from('api_keys')
    .select('id, user_id, scopes, revoked_at')
    .eq('key_hash', hash)
    .maybeSingle() as unknown as Promise<{ data: Pick<ApiKeyDbRow, 'id' | 'user_id' | 'scopes' | 'revoked_at'> | null; error: { message: string } | null }>);

  if (keyError || !keyData) {
    return null;
  }

  // Reject revoked keys
  if (keyData.revoked_at) {
    return null;
  }

  // Look up user profile to determine current tier and role
  const { data: profileData, error: profileError } = await (adminClient
    .from('profiles')
    .select('id, tier, role')
    .eq('id', keyData.user_id)
    .maybeSingle() as unknown as Promise<{ data: ProfileDbRow | null; error: { message: string } | null }>);

  if (profileError || !profileData) {
    return null;
  }

  // Update last_used_at asynchronously (best-effort, non-blocking)
  void (async () => {
    try {
      await (adminClient
        .from('api_keys') as unknown as { update: (data: { last_used_at: string }) => { eq: (col: string, val: string) => Promise<unknown> } })
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id);
    } catch {
      // ignore non-blocking update failure
    }
  })();

  const tier = (profileData.tier as UserTier) || 'free';
  const scopes = Array.isArray(keyData.scopes) ? keyData.scopes : ['verify'];

  return {
    userId: profileData.id,
    keyId: keyData.id,
    tier,
    scopes,
  };
}

/**
 * Creates a new API key for a business user.
 * Validates that the user has 'business' tier (or admin role), and that the
 * account is under MAX_ACTIVE_KEYS. `name` and `scopes` come straight from a
 * request body, so anything malformed is replaced rather than stored: a name
 * that is not a short string becomes the default, and scopes are filtered to
 * ALLOWED_SCOPES. Errors carry a stable code (FORBIDDEN, KEY_LIMIT), never a
 * database message.
 * The rawKey is returned ONLY in the result of this function and is never stored.
 */
export async function createApiKey(
  userId: string,
  nameInput: unknown = 'Default Key',
  scopesInput: unknown = ['verify']
): Promise<ApiKeyCreatedResult> {
  const name =
    typeof nameInput === 'string' && nameInput.trim()
      ? nameInput.trim().slice(0, MAX_KEY_NAME_LENGTH)
      : 'Default Key';
  const requested: unknown[] = Array.isArray(scopesInput) ? scopesInput : [];
  const scopes: string[] = ALLOWED_SCOPES.filter((scope) => requested.includes(scope));
  if (scopes.length === 0) scopes.push('verify');

  const adminClient = createAdminClient();

  // Validate tier: only business tier (or admin) may create keys
  const { data: profileData, error: profileError } = await (adminClient
    .from('profiles')
    .select('tier, role')
    .eq('id', userId)
    .maybeSingle() as unknown as Promise<{ data: Pick<ProfileDbRow, 'tier' | 'role'> | null; error: { message: string } | null }>);

  if (profileError || !profileData) {
    throw new Error('User profile not found');
  }

  const isAllowed = profileData.tier === 'business' || profileData.role === 'admin';
  if (!isAllowed) {
    throw new Error('FORBIDDEN: Only Business accounts may create API keys');
  }

  const { count: activeKeys } = await (adminClient
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null) as unknown as Promise<{ count: number | null }>);
  if ((activeKeys ?? 0) >= MAX_ACTIVE_KEYS) {
    throw new Error('KEY_LIMIT: Too many active API keys');
  }

  const { rawKey, keyHash, keyPrefix } = generateRawApiKey();

  const insertPayload = {
    user_id: userId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes,
  };

  const { data, error } = await (adminClient
    .from('api_keys') as unknown as {
      insert: (payload: typeof insertPayload) => {
        select: (cols: string) => {
          single: () => Promise<{ data: Pick<ApiKeyDbRow, 'id' | 'name' | 'key_prefix' | 'created_at'> | null; error: { message: string } | null }>;
        };
      };
    })
    .insert(insertPayload)
    .select('id, name, key_prefix, created_at')
    .single();

  if (error || !data) {
    logger.error('Failed to insert API key', {
      service: 'auth/api-keys',
      userId,
      error: error?.message,
    });
    throw new Error('Failed to create API key');
  }

  return {
    id: data.id,
    name: data.name,
    keyPrefix: data.key_prefix,
    rawKey,
    createdAt: data.created_at,
  };
}

/**
 * Lists all API keys for a user (without exposing raw keys or hashes).
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const adminClient = createAdminClient();

  const { data, error } = await (adminClient
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, created_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as unknown as Promise<{ data: ApiKeyDbRow[] | null; error: { message: string } | null }>);

  if (error) {
    logger.error('Failed to list API keys', {
      service: 'auth/api-keys',
      userId,
      error: error.message,
    });
    throw new Error('Failed to list API keys');
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }));
}

/**
 * Revokes one of the user's API keys. 'not_found' covers both a wrong id and
 * someone else's key, so the answer never says which keys exist.
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<'revoked' | 'not_found' | 'error'> {
  const adminClient = createAdminClient();

  const { data, error } = await (adminClient
    .from('api_keys') as unknown as {
      update: (data: { revoked_at: string }) => {
        eq: (col1: string, val1: string) => {
          eq: (col2: string, val2: string) => {
            select: (cols: string) => Promise<{ data: { id: string }[] | null; error: { message: string } | null }>;
          };
        };
      };
    })
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    logger.error('Failed to revoke API key', {
      service: 'auth/api-keys',
      keyId,
      userId,
      error: error.message,
    });
    return 'error';
  }

  return data && data.length > 0 ? 'revoked' : 'not_found';
}
