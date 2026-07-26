import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import type { SendEmailPayload, SendEmailResponse } from './resend';

/**
 * Sends an email using Brevo (Sendinblue) v3 REST API.
 */
export async function sendEmailWithBrevo(
  payload: SendEmailPayload,
  apiKey?: string
): Promise<SendEmailResponse> {
  const key = apiKey || process.env.BREVO_API_KEY;
  if (!key) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const fromString = payload.from || process.env.EMAIL_FROM || 'Verifact <noreply@verifact.ro>';
  let senderName = 'Verifact';
  let senderEmail = 'noreply@verifact.ro';

  const match = fromString.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    senderName = match[1].trim();
    senderEmail = match[2].trim();
  }

  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to]).map((e) => ({ email: e }));

  const response = await withCircuitBreaker('brevo', () =>
    fetchWithRetry(
      'https://api.brevo.com/v3/smtp/email',
      () => ({
        method: 'POST',
        headers: {
          'api-key': key,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: recipients,
          subject: payload.subject,
          htmlContent: payload.html,
          textContent: payload.text,
        }),
      }),
      { label: 'brevo-email' }
    ).then((res) => {
      if (!res.ok) throw new Error(`Brevo API HTTP error: ${res.status}`);
      return res;
    })
  );

  const data = (await response.json()) as { messageId: string };
  return {
    id: data.messageId,
    provider: 'brevo',
  };
}
