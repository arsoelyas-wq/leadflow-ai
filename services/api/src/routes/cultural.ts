export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { getCountryByCode, getAllCountries } = require('../config/countries');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Persistent cache — try Supabase first, then in-memory fallback
const profileCache: Record<string, any> = {};

async function getCachedProfile(code: string): Promise<any | null> {
  if (profileCache[code]) return profileCache[code];
  try {
    const { data } = await supabase.from('cultural_profiles_cache')
      .select('profile').eq('country_code', code).maybeSingle();
    if (data?.profile) { profileCache[code] = data.profile; return data.profile; }
  } catch {}
  return null;
}

async function setCachedProfile(code: string, profile: any): Promise<void> {
  profileCache[code] = profile;
  try {
    await supabase.from('cultural_profiles_cache').upsert([{
      country_code: code, profile, updated_at: new Date().toISOString(),
    }], { onConflict: 'country_code' });
  } catch {}
}

// ── HARDCODED DETAILED CULTURAL PROFILES (core 8 markets) ─────────────────────
const CULTURAL_PROFILES: Record<string, any> = {
  TR: {
    language: 'Türkçe', greeting: 'Merhaba', greetingFormal: 'Sayın', formal: true,
    businessHours: '09:00-18:00', bestCallDays: 'Salı-Perşembe',
    communication: 'İlişki Odaklı', decisionStyle: 'Hiyerarşik',
    tips: ['Önce güven kur, işi sonra yap', 'Aile ve sağlık sorularıyla başla', 'Kişisel iletişim önemli', 'Çay/kahve ritüellerine saygı göster'],
    avoidTopics: ['Siyaset', 'Din tartışması', 'Kürt meselesi'],
    negotiationStyle: 'Uzun pazarlık, sabır gerektirir',
    giftGiving: 'Evet, özellikle ilk toplantıda',
    emoji: '🇹🇷',
  },
  AE: {
    language: 'Arapça', greeting: 'السلام عليكم', greetingFormal: 'حضرة', formal: true,
    businessHours: '09:00-17:00', bestCallDays: 'Pazartesi-Perşembe',
    communication: 'İlişki Odaklı', decisionStyle: 'Üst Onay Gerektirir',
    tips: ['Sabır çok önemli', 'Hediye kültürü var', 'Cuma günü arama', 'Ramazan döneminde dikkatli ol'],
    avoidTopics: ['Alkol', 'Faiz (riba)', 'Domuz eti', 'İsrail meselesi'],
    negotiationStyle: 'Statü ve hiyerarşi çok önemli',
    giftGiving: 'Evet, kaliteli ve pahalı olmalı',
    emoji: '🇦🇪',
  },
  DE: {
    language: 'Almanca', greeting: 'Guten Tag', greetingFormal: 'Sehr geehrte/r', formal: true,
    businessHours: '08:00-17:00', bestCallDays: 'Salı-Perşembe',
    communication: 'Görev Odaklı', decisionStyle: 'Konsensüs ile',
    tips: ['Dakikliğe çok dikkat et', 'Teknik detay ve veri iste', 'Resmi hitap kullan (Sie)', 'Doğrudan ve net ol'],
    avoidTopics: ['WW2', 'Nazi dönemi', 'Aşırı milliyetçilik'],
    negotiationStyle: 'Detaylı analiz, uzun karar süreci',
    giftGiving: 'Sınırlı, iş dünyasında nadir',
    emoji: '🇩🇪',
  },
  US: {
    language: 'İngilizce', greeting: 'Hi there', greetingFormal: 'Dear', formal: false,
    businessHours: '09:00-17:00', bestCallDays: 'Salı-Perşembe',
    communication: 'Doğrudan', decisionStyle: 'Bireysel Karar',
    tips: ['Hızlı ve net ol', 'ROI ve değeri ön plana çıkar', 'İlk isimle hitap et', 'Küçük konuşma (small talk) yap'],
    avoidTopics: ['Politika', 'Din', 'Ücret miktarları'],
    negotiationStyle: 'Hızlı karar, win-win odaklı',
    giftGiving: 'Nadir, iş kartı daha uygun',
    emoji: '🇺🇸',
  },
  SA: {
    language: 'Arapça', greeting: 'مرحبا', greetingFormal: 'معالي', formal: true,
    businessHours: '09:00-16:00', bestCallDays: 'Pazartesi-Çarşamba',
    communication: 'İlişki Odaklı', decisionStyle: 'Üst Onay + Kral Ailesi',
    tips: ['Kral ailesine saygı', 'İslami finans kurallarına uy', 'Uzun müzakere sürecine hazırlan', 'Wasta (tanıdık) çok önemli'],
    avoidTopics: ['Siyasi eleştiri', 'Din sorgulaması', 'Kadın hakları'],
    negotiationStyle: 'Hiyerarşi ve statü belirleyici',
    giftGiving: 'Evet, lüks olmalı',
    emoji: '🇸🇦',
  },
  GB: {
    language: 'İngilizce', greeting: 'Good day', greetingFormal: 'Dear Sir/Madam', formal: true,
    businessHours: '09:00-17:00', bestCallDays: 'Salı-Perşembe',
    communication: 'Nezaket Odaklı', decisionStyle: 'Temkinli Konsensüs',
    tips: ['Kibarca başla, doğrudan bitir', 'Küçük konuşma önemli (hava durumu vb.)', 'Alçakgönüllülük göster', 'Sıraya uymak çok önemli'],
    avoidTopics: ['Brexit tartışması', 'Kraliyet ailesi eleştirisi'],
    negotiationStyle: 'Temkinli, uzun karar süreci',
    giftGiving: 'Sınırlı, sembolik',
    emoji: '🇬🇧',
  },
  FR: {
    language: 'Fransızca', greeting: 'Bonjour', greetingFormal: 'Monsieur/Madame', formal: true,
    businessHours: '09:00-18:00', bestCallDays: 'Salı-Perşembe',
    communication: 'Entelektüel Tartışma', decisionStyle: 'Hiyerarşik + Politika',
    tips: ['Fransızca selamlama takdir edilir', 'Felsefi tartışmadan çekinme', 'Öğle arası kutsal', 'Lüks ve kaliteyi vurgula'],
    avoidTopics: ['Fransa\'ya eleştiri', 'WW2 teslimiyeti'],
    negotiationStyle: 'Uzun, entelektüel, sezgisel',
    giftGiving: 'Evet, kaliteli şarap veya hediye',
    emoji: '🇫🇷',
  },
  KZ: {
    language: 'Kazakça/Rusça', greeting: 'Сәлем / Здравствуйте', greetingFormal: 'Уважаемый', formal: true,
    businessHours: '09:00-18:00', bestCallDays: 'Pazartesi-Cuma',
    communication: 'İlişki Odaklı (Rus etkisi)', decisionStyle: 'Hiyerarşik',
    tips: ['Rusça veya Kazakça selamlama takdir edilir', 'İlişki önce gelir', 'Vodka ritüellerine saygı', 'Misafirperverlik çok önemli'],
    avoidTopics: ['Rusya eleştirisi', 'Sovyet dönemi'],
    negotiationStyle: 'Yavaş, güven temelli',
    giftGiving: 'Evet, özellikle Türk malları',
    emoji: '🇰🇿',
  },
};

// ── DYNAMIC PROFILE GENERATOR via Claude (for 75+ countries) ─────────────────
async function getDynamicProfile(countryCode: string): Promise<any> {
  if (CULTURAL_PROFILES[countryCode]) return CULTURAL_PROFILES[countryCode];
  if (profileCache[countryCode]) return profileCache[countryCode];

  try {
    const countryConf = getCountryByCode(countryCode);
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `${countryConf.name} (${countryCode}) ülkesi için B2B satış kültür profili oluştur.

SADECE JSON döndür:
{
  "language": "${countryConf.language}",
  "greeting": "yaygın selamlama",
  "greetingFormal": "resmi hitap",
  "formal": true,
  "businessHours": "09:00-17:00",
  "bestCallDays": "en iyi arama günleri",
  "communication": "iletişim stili",
  "decisionStyle": "karar alma stili",
  "tips": ["ipucu1","ipucu2","ipucu3"],
  "avoidTopics": ["konu1","konu2"],
  "negotiationStyle": "müzakere stili",
  "giftGiving": "hediye kültürü açıklaması",
  "emoji": "ülke bayrağı emoji"
}`
      }],
    });

    const text = res.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const profile = JSON.parse(match[0]);
      profileCache[countryCode] = profile;
      return profile;
    }
  } catch (e: any) {
    console.error(`Dynamic profile ${countryCode}:`, e.message?.slice(0, 60));
  }

  // Fallback minimal profile
  const countryConf = getCountryByCode(countryCode);
  const fallback = {
    language: countryConf.language, greeting: 'Merhaba', greetingFormal: 'Sayın',
    formal: true, businessHours: '09:00-17:00', bestCallDays: 'Salı-Perşembe',
    communication: 'Profesyonel', decisionStyle: 'Standart',
    tips: ['Profesyonel ve saygılı ol', 'Yerel kültürü araştır'],
    avoidTopics: ['Siyaset'], negotiationStyle: 'Standart iş müzakeresi',
    giftGiving: 'Şirket kurallarına göre değişir', emoji: '🌍',
  };
  profileCache[countryCode] = fallback;
  return fallback;
}

// ── GENERATE CULTURAL MESSAGE ─────────────────────────────────────────────────
async function generateCulturalMessage(lead: any, countryCode: string, message: string, profile: any): Promise<any> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Mesajı ${countryCode} (${profile.language}) kültürüne uyarla.

Orijinal mesaj: "${message}"
Şirket: ${lead.company_name}
Kişi: ${lead.contact_name || 'Yetkili'}
Sektör: ${lead.sector || 'genel'}

Kültürel profil:
- İletişim: ${profile.communication}
- Karar stili: ${profile.decisionStyle}
- İpuçları: ${(profile.tips || []).join(', ')}
- Kaçınılacak konular: ${(profile.avoidTopics || []).join(', ')}

SADECE JSON döndür:
{
  "adaptedMessage": "${profile.language} dilinde kültüre uyarlanmış mesaj",
  "translatedMessage": "Türkçe karşılığı (doğrulama için)",
  "culturalTips": ["bu kişiye özel kültürel ipucu 1", "ipucu 2"],
  "bestSendTime": "${profile.businessHours} arası, ${profile.bestCallDays || ''}",
  "greetingStyle": "${profile.greetingFormal || profile.greeting} ile başla"
}`
    }],
  });

  const text = res.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ── AI MEMORY: Save adaptation to Supabase ────────────────────────────────────
async function saveAdaptation(userId: string, leadId: string, countryCode: string, original: string, adapted: any) {
  try {
    await supabase.from('cultural_adaptations').upsert([{
      user_id: userId,
      lead_id: leadId,
      country_code: countryCode,
      original_message: original,
      adapted_message: adapted?.adaptedMessage || '',
      profile_snapshot: await getDynamicProfile(countryCode),
      created_at: new Date().toISOString(),
    }], { onConflict: 'user_id,lead_id,country_code', ignoreDuplicates: false });
  } catch { /* table may not exist yet */ }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// GET /profiles — Return all supported countries
router.get('/profiles', async (_req: any, res: any) => {
  try {
    const all = getAllCountries();
    const countries = all.map((c: any) => ({
      code: c.code,
      name: c.name,
      language: c.language,
      region: c.region,
      hasDetailedProfile: !!CULTURAL_PROFILES[c.code],
    }));
    res.json({ countries, totalCountries: countries.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /adapt — Adapt message for a specific lead + country
router.post('/adapt', async (req: any, res: any) => {
  try {
    const { leadId, targetCountry, message } = req.body;
    if (!leadId || !targetCountry || !message) {
      return res.status(400).json({ error: 'leadId, targetCountry, message zorunlu' });
    }
    if (message.length > 2000) return res.status(400).json({ error: 'Mesaj çok uzun (max 2000 karakter)' });

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const profile = await getDynamicProfile(targetCountry);
    const adapted = await generateCulturalMessage(lead, targetCountry, message, profile);

    // AI Memory: save adaptation
    saveAdaptation(req.userId, leadId, targetCountry, message, adapted).catch(() => {});

    res.json({ adapted, profile, country: targetCountry });
  } catch (e: any) {
    console.error('Cultural adapt:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /translate-campaign — Translate to multiple countries
router.post('/translate-campaign', async (req: any, res: any) => {
  try {
    const { message, countries } = req.body;
    if (!message || !countries?.length) {
      return res.status(400).json({ error: 'message ve countries zorunlu' });
    }
    if (message.length > 2000) return res.status(400).json({ error: 'Mesaj çok uzun' });

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const translations: Record<string, any> = {};
    const targetCountries = countries.slice(0, 10);

    for (const countryCode of targetCountries) {
      try {
        const profile = await getDynamicProfile(countryCode);
        const res2 = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 250,
          messages: [{
            role: 'user',
            content: `Şu mesajı ${countryCode} (${profile.language}) kültürüne uyarla ve çevir.

Mesaj: "${message}"
Stil: ${profile.communication}, ${profile.decisionStyle}
Selamlama: ${profile.greeting}

SADECE JSON döndür: {"language":"${profile.language}","message":"çeviri","greeting":"${profile.greeting}"}`
          }],
        });

        const text = res2.content[0]?.text || '';
        const match = text.match(/\{[\s\S]*?\}/);
        if (match) {
          try {
            translations[countryCode] = JSON.parse(match[0]);
          } catch {
            translations[countryCode] = { language: profile.language, message, greeting: profile.greeting };
          }
        } else {
          translations[countryCode] = { language: profile.language, message, greeting: profile.greeting };
        }
      } catch {
        translations[countryCode] = { language: countryCode, message, greeting: '—' };
      }
      await new Promise(r => setTimeout(r, 250));
    }

    res.json({ translations });
  } catch (e: any) {
    console.error('Translate campaign:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /adapt-batch — Adapt message for multiple leads at once
router.post('/adapt-batch', async (req: any, res: any) => {
  try {
    const { leadIds, targetCountry, message } = req.body;
    if (!leadIds?.length || !targetCountry || !message) {
      return res.status(400).json({ error: 'leadIds, targetCountry, message zorunlu' });
    }
    if (message.length > 2000) return res.status(400).json({ error: 'Mesaj çok uzun' });
    if (leadIds.length > 20) return res.status(400).json({ error: 'Maksimum 20 lead' });

    const profile = await getDynamicProfile(targetCountry);
    const results: any[] = [];

    for (const leadId of leadIds) {
      try {
        const { data: lead } = await supabase.from('leads').select('*')
          .eq('id', leadId).eq('user_id', req.userId).single();
        if (!lead) continue;

        const adapted = await generateCulturalMessage(lead, targetCountry, message, profile);
        saveAdaptation(req.userId, leadId, targetCountry, message, adapted).catch(() => {});
        results.push({ leadId, leadName: lead.company_name, adapted, success: true });
      } catch (e: any) {
        results.push({ leadId, success: false, error: e.message });
      }
      await new Promise(r => setTimeout(r, 200));
    }

    res.json({ results, profile, country: targetCountry, totalProcessed: results.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /history/:leadId — Get past adaptations for a lead (AI Memory)
router.get('/history/:leadId', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('cultural_adaptations')
      .select('country_code,adapted_message,original_message,created_at')
      .eq('user_id', req.userId)
      .eq('lead_id', req.params.leadId)
      .order('created_at', { ascending: false })
      .limit(10);
    res.json({ history: data || [] });
  } catch { res.json({ history: [] }); }
});

// GET /lead-profile/:leadId — Get cultural profile for a lead's country
router.get('/lead-profile/:leadId', async (req: any, res: any) => {
  try {
    const { data: lead } = await supabase.from('leads').select('country,city,sector,company_name')
      .eq('id', req.params.leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const countryCode = lead.country || 'TR';
    const profile = await getDynamicProfile(countryCode);
    res.json({ lead, profile, countryCode });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
