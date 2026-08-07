import { sendEmailWithResend } from '@/lib/email/resend';
import { sendEmailWithBrevo } from '@/lib/email/brevo';
import { sendEmailWithMailjet } from '@/lib/email/mailjet';
import { sendEmail } from '@/lib/email';
import { resetAllCircuits } from '@/lib/utils/circuit-breaker';

describe('Transactional Email Service (Mailjet, Resend & Brevo)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    resetAllCircuits();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends email via Resend API', async () => {
    process.env.RESEND_API_KEY = 're_123456789';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'resend-msg-123' }),
    });

    const res = await sendEmailWithResend({
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Test content</p>',
    });

    expect(res.id).toBe('resend-msg-123');
    expect(res.provider).toBe('resend');
  });

  it('sends email via Brevo API', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-123456789';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messageId: '<brevo-msg-456@brevo>' }),
    });

    const res = await sendEmailWithBrevo({
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Test content</p>',
    });

    expect(res.id).toBe('<brevo-msg-456@brevo>');
    expect(res.provider).toBe('brevo');
  });

  it('unified sendEmail falls back to Brevo if Resend fails', async () => {
    process.env.RESEND_API_KEY = 're_fail';
    process.env.BREVO_API_KEY = 'xkeysib-ok';

    // Resend fails
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Resend down'));
    // Brevo succeeds
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messageId: 'brevo-fallback-789' }),
    });

    const res = await sendEmail({
      to: 'user@example.com',
      subject: 'Fallback Test',
      html: '<p>Content</p>',
    });

    expect(res.provider).toBe('brevo');
    expect(res.id).toBe('brevo-fallback-789');
  });

  it('sends email via Mailjet API', async () => {
    process.env.MAILJET_API_KEY = 'mj-api-key';
    process.env.MAILJET_SECRET_KEY = 'mj-secret-key';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Messages: [
          {
            Status: 'success',
            To: [{ Email: 'user@example.com', MessageUUID: 'mj-uuid-123', MessageID: 20547681647433000 }],
          },
        ],
      }),
    });

    const res = await sendEmailWithMailjet({
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Test content</p>',
    });

    expect(res.id).toBe('mj-uuid-123');
    expect(res.provider).toBe('mailjet');

    // Basic Auth header is base64(apiKey:secretKey).
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('mj-api-key:mj-secret-key').toString('base64')}`);
  });

  it('unified sendEmail uses Mailjet first when configured', async () => {
    process.env.MAILJET_API_KEY = 'mj-api-key';
    process.env.MAILJET_SECRET_KEY = 'mj-secret-key';
    process.env.RESEND_API_KEY = 're_should_not_be_used';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ Messages: [{ Status: 'success', To: [{ MessageUUID: 'mj-primary-1' }] }] }),
    });

    const res = await sendEmail({
      to: 'user@example.com',
      subject: 'Primary Test',
      html: '<p>Content</p>',
    });

    expect(res.provider).toBe('mailjet');
    expect(res.id).toBe('mj-primary-1');
    // Resend must not have been attempted.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('unified sendEmail falls back to Resend if Mailjet fails', async () => {
    process.env.MAILJET_API_KEY = 'mj-api-key';
    process.env.MAILJET_SECRET_KEY = 'mj-secret-key';
    process.env.RESEND_API_KEY = 're_ok';

    // Mailjet fails
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Mailjet down'));
    // Resend succeeds
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'resend-after-mailjet' }),
    });

    const res = await sendEmail({
      to: 'user@example.com',
      subject: 'Fallback Test',
      html: '<p>Content</p>',
    });

    expect(res.provider).toBe('resend');
    expect(res.id).toBe('resend-after-mailjet');
  });
});
