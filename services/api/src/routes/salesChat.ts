export {};
const express = require('express');
const router = express.Router();

// POST /api/ai/sales-chat — Landing page chatbot için AI mesaj üret
router.post('/sales-chat', async (req: any, res: any) => {
  try {
    const { answers } = req.body;

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Sen LeadFlow AI'nın satış asistanısın. Bir potansiyel müşteri sana şu bilgileri verdi:

Sektör: ${answers.welcome || 'Belirtilmedi'}
En büyük zorluk: ${answers.goal || 'Belirtilmedi'}
Şehir: ${answers.city || 'Belirtilmedi'}
Hedef müşteri sayısı: ${answers.size || 'Belirtilmedi'}

Bu kişiye LeadFlow AI'nın nasıl yardımcı olabileceğini anlatan kısa, ikna edici, samimi bir Türkçe mesaj yaz. 
- Emoji kullan ama abartma
- Maksimum 5-6 satır
- Spesifik ol (sektörüne ve şehrine göre özelleştir)
- Sonda ücretsiz denemeye davet et
- Heyecan verici ama samimi ol`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    res.json({ message: text });
  } catch (e: any) {
    console.error('Sales chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = { salesChatRouter: router };