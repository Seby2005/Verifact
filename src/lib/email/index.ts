import { sendEmailWithResend, type SendEmailPayload, type SendEmailResponse } from './resend';
import { sendEmailWithBrevo } from './brevo';
import { sendEmailWithMailjet } from './mailjet';
import { logger } from '@/lib/utils/logger';

export type { SendEmailPayload, SendEmailResponse };

/**
 * Unified Email Dispatcher — sends via the first configured provider and
 * falls through to the next if it fails, in priority order:
 * 1. Mailjet (if MAILJET_API_KEY + MAILJET_SECRET_KEY are set)
 * 2. Resend  (if RESEND_API_KEY is set)
 * 3. Brevo   (if BREVO_API_KEY is set)
 *
 * If no provider is configured, logs a simulated send (dev mode). If every
 * configured provider fails, the last error is re-thrown.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  const providers: Array<{ name: SendEmailResponse['provider']; send: () => Promise<SendEmailResponse> }> = [];

  if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
    providers.push({ name: 'mailjet', send: () => sendEmailWithMailjet(payload) });
  }
  if (process.env.RESEND_API_KEY) {
    providers.push({ name: 'resend', send: () => sendEmailWithResend(payload) });
  }
  if (process.env.BREVO_API_KEY) {
    providers.push({ name: 'brevo', send: () => sendEmailWithBrevo(payload) });
  }

  // Dev / fallback log mode when no provider is configured.
  if (providers.length === 0) {
    logger.info('Simulated email sending (no MAILJET/RESEND/BREVO keys configured)', {
      to: payload.to,
      subject: payload.subject,
    });
    return {
      id: `simulated-${Date.now()}`,
      provider: 'mailjet',
    };
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await provider.send();
    } catch (error) {
      lastError = error;
      logger.warn(`${provider.name} email failed, attempting next provider`, {
        service: 'email',
        provider: provider.name,
        error: String(error),
      });
    }
  }

  throw lastError;
}
