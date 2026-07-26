import { sendEmailWithResend, type SendEmailPayload, type SendEmailResponse } from './resend';
import { sendEmailWithBrevo } from './brevo';
import { logger } from '@/lib/utils/logger';

export type { SendEmailPayload, SendEmailResponse };

/**
 * Unified Email Dispatcher — automatically sends emails via:
 * 1. Resend (if RESEND_API_KEY is configured)
 * 2. Brevo (if BREVO_API_KEY is configured or as fallback if Resend fails)
 * 3. Simulated log mode in development if no email keys are set
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  const resendKey = process.env.RESEND_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;

  // Try Resend first
  if (resendKey) {
    try {
      return await sendEmailWithResend(payload);
    } catch (error) {
      logger.warn('Resend email failed, attempting Brevo fallback', {
        service: 'email',
        error: String(error),
      });
      if (brevoKey) {
        return sendEmailWithBrevo(payload);
      }
      throw error;
    }
  }

  // Try Brevo if set
  if (brevoKey) {
    return sendEmailWithBrevo(payload);
  }

  // Dev / Fallback log mode
  logger.info('Simulated email sending (No RESEND_API_KEY or BREVO_API_KEY configured)', {
    to: payload.to,
    subject: payload.subject,
  });

  return {
    id: `simulated-${Date.now()}`,
    provider: 'resend',
  };
}
