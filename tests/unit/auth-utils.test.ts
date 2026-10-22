import * as authUtils from '@/lib/auth/auth-utils';
import { signInWithOAuth, signOut } from '@/lib/auth/auth-utils';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client');

describe('auth-utils', () => {
  const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>;

  let mockSupabase: {
    auth: {
      signInWithOAuth: jest.Mock;
      signOut: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        signInWithOAuth: jest.fn(),
        signOut: jest.fn(),
      },
    };
    mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);
  });

  it('exposes no browser-side password sign-in that would skip the 2FA code', () => {
    expect(authUtils).not.toHaveProperty('signInWithEmail');
    expect(authUtils).not.toHaveProperty('signUpWithEmail');
    expect(authUtils).not.toHaveProperty('resetPassword');
  });

  describe('signInWithOAuth', () => {
    it('triggers OAuth sign in with provider', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });

      await signInWithOAuth('google');

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({ redirectTo: expect.stringContaining('/auth/callback') }),
      });
    });
  });

  describe('signOut', () => {
    it('calls supabase auth signOut', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
