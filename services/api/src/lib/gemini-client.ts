export {};
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function geminiChat(opts: {
  prompt: string;
  max_tokens?: number;
}): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { maxOutputTokens: opts.max_tokens || 1000 },
  });
  const result = await model.generateContent(opts.prompt);
  return result.response.text() || '';
}
