const mockCreateClient = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { createClientFromToken } from '@/lib/supabase/from-token';

describe('from-token createClientFromToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a Supabase client with Authorization Bearer header and disabled session persistence', () => {
    const token = 'jwt.access.token.123';
    mockCreateClient.mockReturnValue({ auth: { getUser: jest.fn() } });

    const client = createClientFromToken(token);

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })
    );
    expect(client).toBeDefined();
  });
});
