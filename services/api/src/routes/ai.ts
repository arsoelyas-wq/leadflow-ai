export {};
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Sen LeadFlow AI'nin profesyonel satis danismanisin.
Gorev: Kullanicinin isletmesini anlamak ve ona ozel bir B2B satis stratejisi olusturmak.

Her cevabi SADECE JSON formatinda ver, baska hicbir sey yazma:
{
  "message": "Kullaniciya gosterilecek mesaj (Turkce, samimi, profesyonel)",
  "isComplete": false,
  "quickReplies": ["Secnek 1", "Secnek 2", "Secnek 3"],
  "profile": null
}

isComplete true oldugunda profile doldur:
{
  "message": "...",
  "isComplete": true,
  "quickReplies": [],
  "profile": {
    "sector": "sektor adi",
    "productTypes": ["urun1", "urun2"],
    "priceSegment": "ekonomik|orta|premium",
    "targetCities": ["sehir1", "sehir2"],
    "targetCustomer": "toptan|perakende|ihracat",
    "mainChannel": "whatsapp|email|instagram",
    "monthlyLeadTarget": 200,
    "messageTone": "profesyonel|samimi|resmi",
    "keyPoints": ["nokta1", "nokta2"]
  }
}

Kurallar:
- Her turde 1 soru sor
- QuickReplies maksimum 3 secnek
- 3-4 turde profili tamamla
- Turkce yaz, samimi ol
- Son turde profili olustur ve isComplete: true yap`;

router.post('/chat', async (req: any, res: any) => {
  try {
    const { messages, sector } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Mesajlar eksik' });
    }

    let systemPrompt = SYSTEM_PROMPT;
    if (sector) {
      systemPrompt += `\n\nKullanicinin sektoru: ${sector}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content
      }))
    });

    const rawText = response.content[0].text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI yanit formati hatali' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);

  } catch (error: any) {
    console.error('AI Chat Error:', error.message);
    res.status(500).json({ error: 'AI servisi hatasi: ' + error.message });
  }
});

router.post('/generate-messages', async (req: any, res: any) => {
  try {
    const { profile, leadName, leadCity } = req.body;

    const prompt = `Bu firma profili icin 3 kanal mesaji yaz:
Profil: ${JSON.stringify(profile, null, 2)}
Hedef firma: ${leadName}, ${leadCity}

SADECE JSON don:
{
  "whatsapp": "WhatsApp mesaji (max 300 karakter, samimi)",
  "emailSubject": "Email konusu",
  "emailBody": "Email icerigi (HTML olmadan, 3-4 paragraf)",
  "instagramDm": "Instagram DM (max 200 karakter)"
}

Her mesajda [FIRMA_ADI] ve [SEHIR] placeholder kullan.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const rawText = response.content[0].text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI yanit formati hatali' });
    }

    res.json(JSON.parse(jsonMatch[0]));

  } catch (error: any) {
    console.error('Generate Messages Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/sales-chat — Landing page chatbot
router.post('/sales-chat', async (req: any, res: any) => {
  try {
    const { answers } = req.body;

    const prompt = `Sen LeadFlow AI'nin satis asistanisin. Bir potansiyel musteri su bilgileri verdi:
Sektor: ${answers.welcome || 'Belirtilmedi'}
En buyuk zorluk: ${answers.goal || 'Belirtilmedi'}
Sehir: ${answers.city || 'Belirtilmedi'}
Hedef musteri sayisi: ${answers.size || 'Belirtilmedi'}

Bu kisiye LeadFlow AI'nin nasil yardimci olabilecegini anlatan kisa, ikna edici Turkce mesaj yaz.
- Emoji kullan ama abartma
- Maksimum 5-6 satir
- Sektore ve sehire gore ozellestir
- Sonda ucretsiz denemeye davet et`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ message: text });
  } catch (e: any) {
    console.error('Sales chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;