export {};
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GPT_MODEL env'den alınır; varsayılan gpt-4o (kullanıcı gpt-5 vb. ile override edebilir)
const GPT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export async function gptChat(opts: {
  messages: { role: 'user' | 'system' | 'assistant'; content: string }[];
  max_tokens?: number;
  model?: string;
}): Promise<string> {
  const resp = await openai.chat.completions.create({
    model: opts.model || GPT_MODEL,
    max_tokens: opts.max_tokens || 500,
    messages: opts.messages,
  });
  return resp.choices[0]?.message?.content || '';
}
