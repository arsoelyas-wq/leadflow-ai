export {};
const axios = require('axios');

const VAPI_KEY      = process.env.VAPI_API_KEY || '';
const VAPI_PHONE_ID = 'c5103fbb-47da-411e-b690-2329c2fe4f06';

const CALL_VOICES: Record<string, string> = {
  tr: '5a31e4fb-f823-4359-aa91-82c0ae9a991c',
  en: '79a125e8-cd45-4c13-8a67-188112f4dd22',
  de: '3f6e78a8-5283-42aa-b5e7-af82e8bb310c',
  fr: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d',
  ar: '3b554bf4-e0d4-4a74-ae96-3c1f6db66f82',
  default: 'b7d50908-b17c-442d-ad8d-810c63997ed9',
};

function normalizePhoneE164(phone: string): string {
  let num = phone.replace(/[\s\-\(\)\.]/g, '');
  if (num.startsWith('+')) return num;
  if (num.startsWith('0') && num.length >= 10) return '+90' + num.slice(1);
  if (num.length === 10 && !num.startsWith('0')) return '+90' + num;
  return '+' + num;
}

interface TriggerCallParams {
  toNumber: string;
  agentName: string;
  companyName: string;
  productDesc?: string;
  openingLine: string;
  language?: string;
  userPhoneId?: string;
}

async function triggerOutboundCall(params: TriggerCallParams): Promise<void> {
  if (!VAPI_KEY) throw new Error('VAPI_API_KEY ayarlanmamış');

  const lang    = params.language || 'tr';
  const phoneId = params.userPhoneId || VAPI_PHONE_ID;
  const number  = normalizePhoneE164(params.toNumber);

  const deepgramLang: Record<string, string> = {
    tr: 'tr', en: 'en-US', de: 'de', fr: 'fr', ar: 'ar',
  };

  const systemPrompt = [
    `Sen ${params.agentName} adlı bir satış temsilcisisin, ${params.companyName} adına arıyorsun.`,
    params.productDesc ? `Ürün/hizmet: ${params.productDesc}` : '',
    'Kısa, doğal ve kibar konuş. Müşterinin sorularını yanıtla. Randevu almaya çalış.',
  ].filter(Boolean).join('\n');

  await axios.post(
    'https://api.vapi.ai/call/phone',
    {
      phoneNumberId: phoneId,
      customer:      { number },
      assistant: {
        transcriber: {
          provider:   'deepgram',
          model:      'nova-3',
          language:   deepgramLang[lang] || 'tr',
          smartFormat: true,
        },
        model: {
          provider:    'anthropic',
          model:       'claude-haiku-4-5-20251001',
          messages:    [{ role: 'system', content: systemPrompt }],
          temperature: 0.4,
          maxTokens:   120,
        },
        voice: {
          provider: 'cartesia',
          voiceId:  CALL_VOICES[lang] || CALL_VOICES.default,
          model:    'sonic-3',
          language: lang === 'tr' ? 'tr' : undefined,
        },
        firstMessage:      params.openingLine,
        backgroundSound:   'off',
        maxDurationSeconds: 600,
      },
    },
    { headers: { Authorization: `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' }, timeout: 30000 }
  );
}

module.exports = { triggerOutboundCall };
