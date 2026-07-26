import { sendEmailWithResend } from '@/lib/email/resend';
import { sendEmailWithBrevo } from '@/lib/email/brevo';
import { sendEmail } from '@/lib/email';
import { resetAllCircuits } from '@/lib/utils/circuit-breaker';

describe('Transactional Email Service (Resend & Brevo)', () => {
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
});
