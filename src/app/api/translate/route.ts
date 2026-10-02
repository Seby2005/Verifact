import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { getClientIp } from '@/lib/utils/client-ip';

export const dynamic = 'force-dynamic';

const MAX_TRANSLATE_CHARS = 3000;
const VALID_LANGS = ['ro', 'en', 'fr'] as const;
type ValidLang = typeof VALID_LANGS[number];

export async function POST(request: Request) {
  // 1. Rate limiting per IP (60 req/min — allows feeding cards while stopping scraping/DoS)
  const clientIp = getClientIp(request);
  const rateCheck = await checkRateLimit(`translate:${clientIp}`, 60, 60 * 1000);
  if (!rateCheck.success) {
    return Response.json(
      { error: 'Prea multe cereri de traducere. Te rugăm să aștepți un minut.' },
      { status: 429 }
    );
  }

  // 2. Body parsing and validation
  let body: { text?: unknown; targetLang?: unknown };
  try {
    body = (await request.json()) as { text?: unknown; targetLang?: unknown };
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { text, targetLang } = body;
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'text parameter is required' }, { status: 400 });
  }

  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    return Response.json({ translatedText: '' });
  }

  if (trimmedText.length > MAX_TRANSLATE_CHARS) {
    return Response.json(
      { error: `Textul depășește limita maximă de ${MAX_TRANSLATE_CHARS} de caractere.` },
      { status: 400 }
    );
  }

  const selectedLang: ValidLang =
    typeof targetLang === 'string' && VALID_LANGS.includes(targetLang as ValidLang)
      ? (targetLang as ValidLang)
      : 'ro';

  const lang = selectedLang === 'en' ? 'English' : selectedLang === 'fr' ? 'French' : 'Romanian';

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ translatedText: trimmedText });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash' });

    const prompt = `You are a professional translator for a fact-checking web app. Translate the following text into ${lang}. Maintain original formatting, tone, and factual accuracy. Return ONLY the translated text without extra comments or quotes.\n\nText:\n"""\n${trimmedText}\n"""`;

    const response = await model.generateContent(prompt);
    const translatedText = response.response.text().trim();

    return Response.json({ translatedText: translatedText || trimmedText });
  } catch {
    return Response.json({ translatedText: trimmedText });
  }
}
