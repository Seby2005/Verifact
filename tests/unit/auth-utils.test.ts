import {
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  signOut,
  resetPassword,
} from '@/lib/auth/auth-utils';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { ensureProfileExists } from '@/lib/supabase/auth-helpers';

jest.mock('@/lib/supabase/client');
jest.mock('@/lib/supabase/auth-helpers');

describe('auth-utils', () => {
  const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>;
  const mockEnsureProfileExists = ensureProfileExists as jest.MockedFunction<typeof ensureProfileExists>;

  let mockSupabase: {
    auth: {
      signInWithPassword: jest.Mock;
      signUp: jest.Mock;
      signInWithOAuth: jest.Mock;
      signOut: jest.Mock;
      resetPasswordForEmail: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signInWithOAuth: jest.fn(),
        signOut: jest.fn(),
        resetPasswordForEmail: jest.fn(),
      },
    };
    mockCreateBrowserClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createBrowserClient>);
  });

  describe('signInWithEmail', () => {
    it('returns success and calls ensureProfileExists when credentials are valid', async () => {
      const mockUser = { id: 'usr-1', email: 'test@example.com' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await signInWithEmail('test@example.com', 'password123');

      expect(res.success).toBe(true);
      expect(res.user).toEqual(mockUser);
      expect(mockEnsureProfileExists).toHaveBeenCalledWith('usr-1', 'test@example.com');
    });

    it('returns Romanian error message on invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const res = await signInWithEmail('test@example.com', 'wrong');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Email sau parolă incorectă');
    });

    it('returns Romanian error message on unconfirmed email', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email not confirmed' },
      });

      const res = await signInWithEmail('test@example.com', 'password123');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Contul nu a fost confirmat. Verifică emailul.');
    });
  });

  describe('signUpWithEmail', () => {
    it('returns success and user when signup succeeds', async () => {
      const mockUser = { id: 'usr-2', email: 'new@example.com' };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await signUpWithEmail('new@example.com', 'password123');

      expect(res.success).toBe(true);
      expect(res.user).toEqual(mockUser);
      expect(mockEnsureProfileExists).toHaveBeenCalledWith('usr-2', 'new@example.com');
    });

    it('returns error message when signup fails', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      const res = await signUpWithEmail('existing@example.com', 'password123');

      expect(res.success).toBe(false);
      expect(res.error).toBe('User already registered');
    });
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

  describe('resetPassword', () => {
    it('returns success on valid password reset request', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const res = await resetPassword('user@example.com');

      expect(res.success).toBe(true);
    });

    it('returns error message when reset fails', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'Rate limit exceeded' } });

      const res = await resetPassword('user@example.com');

      expect(res.success).toBe(false);
      expect(res.error).toBe('Rate limit exceeded');
    });
  });
});
