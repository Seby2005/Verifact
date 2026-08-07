import { fetchWithRetry } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/utils/circuit-breaker';
import type { SendEmailPayload, SendEmailResponse } from './resend';

/**
 * Sends an email using the Mailjet Send API v3.1.
 */
export async function sendEmailWithMailjet(
  payload: SendEmailPayload,
  apiKey?: string,
  secretKey?: string
): Promise<SendEmailResponse> {
  const key = apiKey || process.env.MAILJET_API_KEY;
  const secret = secretKey || process.env.MAILJET_SECRET_KEY;
  if (!key || !secret) {
    throw new Error('MAILJET_API_KEY / MAILJET_SECRET_KEY is not configured');
  }

  const fromString = payload.from || process.env.EMAIL_FROM || 'Verifact <noreply@verifact.ro>';
  let senderName = 'Verifact';
  let senderEmail = 'noreply@verifact.ro';

  const match = fromString.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    senderName = match[1].trim();
    senderEmail = match[2].trim();
  }

  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to]).map((e) => ({ Email: e }));

  // Mailjet uses HTTP Basic Auth (public API key : secret key), unlike the
  // single-token headers Resend/Brevo use.
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');

  const response = await withCircuitBreaker('mailjet', () =>
    fetchWithRetry(
      'https://api.mailjet.com/v3.1/send',
      () => ({
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: senderEmail, Name: senderName },
              To: recipients,
              Subject: payload.subject,
              TextPart: payload.text,
              HTMLPart: payload.html,
            },
          ],
        }),
      }),
      { label: 'mailjet-email' }
    ).then((res) => {
      if (!res.ok) throw new Error(`Mailjet API HTTP error: ${res.status}`);
      return res;
    })
  );

  // Read MessageUUID (a string), not MessageID: the latter is a JSON number
  // that can exceed Number.MAX_SAFE_INTEGER, so parsing it via res.json()
  // would silently lose precision.
  const data = (await response.json()) as {
    Messages: Array<{ To: Array<{ MessageUUID: string }> }>;
  };
  return {
    id: data.Messages[0].To[0].MessageUUID,
    provider: 'mailjet',
  };
}
