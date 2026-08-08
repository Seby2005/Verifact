import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGeminiKey() {
  const apiKey = 'AIzaSyBkYIJSHOINr0G5xpLo_3KU3WW-SDtw6W8';
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const res = await model.generateContent('Say hello in Romanian');
    console.log('Gemini response:', res.response.text());
  } catch (err) {
    console.error('Gemini Key Error:', err);
  }
}

testGeminiKey();
