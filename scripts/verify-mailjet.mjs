// Optional dev helper — verifies your Mailjet keys + sender are live.
//
//   node --env-file=.env.local scripts/verify-mailjet.mjs [recipient@email]
//
// Performs ONE real Mailjet Send API v3.1 call (mirrors sendEmailWithMailjet),
// so a success/failure here isolates account/keys/sender config from the app
// code — which is already covered by tests/unit/email.test.ts. Safe to delete.

const apiKey = process.env.MAILJET_API_KEY;
const secretKey = process.env.MAILJET_SECRET_KEY;
const from = process.env.EMAIL_FROM || 'Verifact <noreply@verifact.ro>';
const to = process.argv[2] || 'sebi.iancu23@gmail.com';

if (!apiKey || !secretKey) {
  console.error('MAILJET_API_KEY / MAILJET_SECRET_KEY missing — did you pass --env-file=.env.local ?');
  process.exit(1);
}

// Parse "Name <email>" exactly like the provider does.
let senderName = 'Verifact';
let senderEmail = 'noreply@verifact.ro';
const m = from.match(/^(.*?)\s*<([^>]+)>$/);
if (m) {
  senderName = m[1].trim();
  senderEmail = m[2].trim();
}

const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

console.log(`Sending test email as "${senderName} <${senderEmail}>" to ${to} ...`);

const res = await fetch('https://api.mailjet.com/v3.1/send', {
  method: 'POST',
  headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    Messages: [
      {
        From: { Email: senderEmail, Name: senderName },
        To: [{ Email: to }],
        Subject: 'Verifact — Mailjet test',
        TextPart: 'If you received this, Mailjet is wired up correctly.',
        HTMLPart: '<p>If you received this, <strong>Mailjet is wired up correctly.</strong></p>',
      },
    ],
  }),
});

const body = await res.json().catch(() => ({}));
if (res.ok) {
  const uuid = body?.Messages?.[0]?.To?.[0]?.MessageUUID;
  console.log(`OK — HTTP ${res.status}. MessageUUID: ${uuid}`);
} else {
  console.error(`FAILED — HTTP ${res.status}`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
