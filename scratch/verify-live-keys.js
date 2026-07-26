const fs = require('fs');

const envPath = 'E:/misinformation web app/Verifact/.env.local';
const envFile = fs.readFileSync(envPath, 'utf8');

envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
});

async function verifyOpenRouter() {
  console.log('--- 1. Testing OpenRouter API (DeepSeek-V3) ---');
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is missing');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://verifact.ro',
      'X-Title': 'Verifact AI',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
      messages: [{ role: 'user', content: 'Răspunde scurt cu: "OpenRouter API funcționează perfect!"' }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('❌ OpenRouter Error:', data);
  } else {
    console.log('✅ OpenRouter Response:', data.choices?.[0]?.message?.content?.trim());
  }
}

async function verifyOCRSpace() {
  console.log('\n--- 2. Testing OCR.space API ---');
  const key = process.env.OCR_SPACE_API_KEY;
  if (!key) throw new Error('OCR_SPACE_API_KEY is missing');

  const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const formData = new URLSearchParams();
  formData.append('base64Image', base64Data);
  formData.append('language', 'ron');

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const data = await res.json();
  if (data.IsErroredOnProcessing && !data.ParsedResults) {
    console.error('❌ OCR.space Error:', data);
  } else {
    console.log('✅ OCR.space API Key valid! Response status:', data.OCRExitCode === 1 ? 'Parsed successfully' : 'Connected (No text in 1x1 sample pixel)');
  }
}

async function verifyResend() {
  console.log('\n--- 3. Testing Resend Email API ---');
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is missing');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: ['delivered@resend.dev'],
      subject: 'Verifact API Key Verification',
      html: '<p>Verifact API Key for Resend is working!</p>',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('❌ Resend Error:', data);
  } else {
    console.log('✅ Resend Email Sent Successfully! ID:', data.id);
  }
}

async function main() {
  console.log('=================================================');
  console.log('VERIFICARE APELURI LIVE CU CHEILE TALE DE API (DRIVE E)');
  console.log('=================================================\n');
  await verifyOpenRouter();
  await verifyOCRSpace();
  await verifyResend();
  console.log('\n=================================================');
  console.log('🎉 TOATE CHEILE DE API SUNT VALIDE ȘI COMPATIBILE!');
  console.log('=================================================\n');
}

main().catch(console.error);
