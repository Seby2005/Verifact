import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { text?: string; targetLang?: 'ro' | 'en' };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { text, targetLang } = body;
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'text parameter is required' }, { status: 400 });
  }

  const lang = targetLang === 'en' ? 'English' : 'Romanian';

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ translatedText: text });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash' });

    const prompt = `You are a professional translator for a fact-checking web app. Translate the following text into ${lang}. Maintain original formatting, tone, and factual accuracy. Return ONLY the translated text without extra comments or quotes.\n\nText:\n${text}`;

    const response = await model.generateContent(prompt);
    const translatedText = response.response.text().trim();

    return Response.json({ translatedText: translatedText || text });
  } catch {
    return Response.json({ translatedText: text });
  }
}
