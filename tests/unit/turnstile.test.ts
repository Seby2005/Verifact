import { validateTurnstileToken } from '@/lib/security/turnstile';

describe('validateTurnstileToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('bypasses verification in non-production mode when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

    const result = await validateTurnstileToken(undefined);
    expect(result.success).toBe(true);
  });

  it('fails in production mode when secret is missing', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    const result = await validateTurnstileToken('some-token');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/incompletă/);
  });

  it('rejects empty or missing token when secret is set', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    const result = await validateTurnstileToken('');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/obligatorie/);
  });

  it('handles ALWAYS_BLOCK test key directly', async () => {
    process.env.TURNSTILE_SECRET_KEY = '2x0000000000000000000000000000000AB';

    const result = await validateTurnstileToken('dummy-token');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/test block/);
  });

  it('returns success on valid Cloudflare response', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'valid-secret';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        hostname: 'verifact.ro',
        action: 'verify',
        challenge_ts: '2026-08-14T12:00:00Z',
      }),
    });

    const result = await validateTurnstileToken('valid-client-token', '1.2.3.4', 'verify');
    expect(result.success).toBe(true);
    expect(result.hostname).toBe('verifact.ro');
    expect(result.action).toBe('verify');
  });

  it('rejects when Cloudflare siteverify returns success: false', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'valid-secret';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    });

    const result = await validateTurnstileToken('bad-token', '1.2.3.4');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/eșuat/);
  });

  it('rejects when expectedAction does not match response action', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'valid-secret';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        action: 'login',
      }),
    });

    const result = await validateTurnstileToken('valid-token', '1.2.3.4', 'verify');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/nevalidă/);
  });

  it('handles network error gracefully and fails closed', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'valid-secret';

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

    const result = await validateTurnstileToken('valid-token');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/reîncerci/);
  });
});
