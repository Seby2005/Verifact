import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResponse {
  id: string;
  provider: 'resend' | 'brevo';
}

/**
 * Sends an email using Resend HTTP API.
 */
export async function sendEmailWithResend(
  payload: SendEmailPayload,
  apiKey?: string
): Promise<SendEmailResponse> {
  const key = apiKey || process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const fromEmail = payload.from || process.env.EMAIL_FROM || 'Verifact <noreply@verifact.ro>';
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

  const response = await withCircuitBreaker('resend', () =>
    fetchWithRetry(
      'https://api.resend.com/emails',
      () => ({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          from: fromEmail,
          to: recipients,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      }),
      { label: 'resend-email' }
    ).then((res) => {
      if (!res.ok) throw new Error(`Resend API HTTP error: ${res.status}`);
      return res;
    })
  );

  const data = (await response.json()) as { id: string };
  return {
    id: data.id,
    provider: 'resend',
  };
}
