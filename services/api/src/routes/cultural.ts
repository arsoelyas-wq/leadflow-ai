export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Kültürel profiller
const CULTURAL_PROFILES: Record<string, any> = {
  TR: {
    language: 'Türkçe', greeting: 'Merhaba', formal: true,
    businessHours: '09:00-18:00', holidays: ['Ramazan', 'Kurban', 'Cumhuriyet'],
    communication: 'ilişki_odaklı', decisionStyle: 'hiyerarşik',
    tips: ['Önce güven kur', 'Aile ve sağlık sor', 'Kişisel temas önemli'],
    avoidTopics: ['Siyaset', 'Din tartışması'],
  },
  AE: {
    language: 'Arapça', greeting: 'السلام عليكم', formal: true,
    businessHours: '09:00-17:00', holidays: ['Ramazan', 'Eid'],
    communication: 'ilişki_odaklı', decisionStyle: 'üst_onay',
    tips: ['Sabır göster', 'Hediye kültürü var', 'Cuma günü arama'],
    avoidTopics: ['Alkol', 'Faiz', 'Domuz eti'],
  },
  DE: {
    language: 'Almanca', greeting: 'Guten Tag', formal: true,
    businessHours: '08:00-17:00', holidays: ['Noel', 'Paskalya'],
    communication: 'görev_odaklı', decisionStyle: 'konsensüs',
    tips: ['Dakikliğe çok dikkat et', 'Teknik detay iste', 'Resmi hitap'],
    avoidTopics: ['WW2', 'Siyaset'],
  },
  US: {
    language: 'İngilizce', greeting: 'Hi there', formal: false,
    businessHours: '09:00-17:00', holidays: ['Thanksgiving', 'Noel'],
    communication: 'doğrudan', decisionStyle: 'bireysel',
    tips: ['Hızlı ol', 'ROI göster', 'İlk isimle hitap'],
    avoidTopics: [],
  },
  SA: {
    language: 'Arapça', greeting: 'مرحبا', formal: true,
    businessHours: '09:00-16:00', holidays: ['Ramazan', 'Eid', 'Kuruluş'],
    communication: 'ilişki_odaklı', decisionStyle: 'üst_onay',
    tips: ['Kral ailesi saygısı', 'İslami finans', 'Uzun müzakere'],
    avoidTopics: ['Siyasi eleştiri', 'Din'],
  },
};

// AI ile kültürel uyum mesajı
async function generateCulturalMessage(
  lead: any, targetCountry: string, originalMessage: string
): Promise<any> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const profile = CULTURAL_PROFILES[targetCountry] || CULTURAL_PROFILES.TR;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Mesajı ${targetCountry} (${profile.language}) kültürüne uyarla.

Orijinal mesaj: "${originalMessage}"
Şirket: ${lead.company_name}
Kişi: ${lead.contact_name || 'Yetkili'}
Kültürel profil: ${JSON.stringify(profile)}

JSON döndür:
{
  "adaptedMessage": "${profile.language} dilinde uyarlanmış mesaj",
  "translatedMessage": "Türkçe çeviri (kontrol için)",
  "culturalTips": ["bu mesajla ilgili kültürel ipucu"],
  "bestSendTime": "Bu ülke için en iyi gönderim saati",
  "greetingStyle": "Kullanılan hitap tarzı açıklaması"
}`
    }]
  });

  const text = response.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// POST /api/cultural/adapt
router.post('/adapt', async (req: any, res: any) => {
  try {
    const { leadId, targetCountry, message } = req.body;
    if (!leadId || !targetCountry || !message) {
      return res.status(400).json({ error: 'leadId, targetCountry, message zorunlu' });
    }

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const adapted = await generateCulturalMessage(lead, targetCountry, message);
    const profile = CULTURAL_PROFILES[targetCountry] || {};

    res.json({ adapted, profile, country: targetCountry });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/cultural/translate-campaign
router.post('/translate-campaign', async (req: any, res: any) => {
  try {
    const { message, countries } = req.body;
    if (!message || !countries?.length) {
      return res.status(400).json({ error: 'message ve countries zorunlu' });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const results: Record<string, any> = {};

    for (const country of countries.slice(0, 10)) {
      const profile = CULTURAL_PROFILES[country] || { language: country, formal: true };
      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `Bu mesajı ${profile.language} diline ${profile.formal ? 'resmi' : 'samimi'} tonda çevir ve kültüre uyarla. Sadece çeviriyi yaz:\n\n${message}`
          }]
        });
        results[country] = {
          language: profile.language,
          message: response.content[0]?.text || message,
          greeting: profile.greeting,
        };
        await new Promise(r => setTimeout(r, 300));
      } catch {
        results[country] = { language: profile.language, message, greeting: '' };
      }
    }

    res.json({ translations: results, original: message });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/cultural/profiles
router.get('/profiles', (req: any, res: any) => {
  res.json({ profiles: CULTURAL_PROFILES });
});

module.exports = router;