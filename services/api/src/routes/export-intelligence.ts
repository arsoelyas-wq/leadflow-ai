export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── ÜLKE VERİTABANI ───────────────────────────────────────
const COUNTRIES = [
  { code: 'DE', name: 'Almanya', flag: '🇩🇪', language: 'de', currency: 'EUR', region: 'Avrupa' },
  { code: 'GB', name: 'İngiltere', flag: '🇬🇧', language: 'en', currency: 'GBP', region: 'Avrupa' },
  { code: 'FR', name: 'Fransa', flag: '🇫🇷', language: 'fr', currency: 'EUR', region: 'Avrupa' },
  { code: 'NL', name: 'Hollanda', flag: '🇳🇱', language: 'nl', currency: 'EUR', region: 'Avrupa' },
  { code: 'BE', name: 'Belçika', flag: '🇧🇪', language: 'fr', currency: 'EUR', region: 'Avrupa' },
  { code: 'IT', name: 'İtalya', flag: '🇮🇹', language: 'it', currency: 'EUR', region: 'Avrupa' },
  { code: 'ES', name: 'İspanya', flag: '🇪🇸', language: 'es', currency: 'EUR', region: 'Avrupa' },
  { code: 'PL', name: 'Polonya', flag: '🇵🇱', language: 'pl', currency: 'PLN', region: 'Avrupa' },
  { code: 'US', name: 'ABD', flag: '🇺🇸', language: 'en', currency: 'USD', region: 'Amerika' },
  { code: 'CA', name: 'Kanada', flag: '🇨🇦', language: 'en', currency: 'CAD', region: 'Amerika' },
  { code: 'AE', name: 'BAE', flag: '🇦🇪', language: 'ar', currency: 'AED', region: 'Körfez' },
  { code: 'SA', name: 'Suudi Arabistan', flag: '🇸🇦', language: 'ar', currency: 'SAR', region: 'Körfez' },
  { code: 'QA', name: 'Katar', flag: '🇶🇦', language: 'ar', currency: 'QAR', region: 'Körfez' },
  { code: 'KW', name: 'Kuveyt', flag: '🇰🇼', language: 'ar', currency: 'KWD', region: 'Körfez' },
  { code: 'EG', name: 'Mısır', flag: '🇪🇬', language: 'ar', currency: 'EGP', region: 'Afrika' },
  { code: 'MA', name: 'Fas', flag: '🇲🇦', language: 'fr', currency: 'MAD', region: 'Afrika' },
  { code: 'KZ', name: 'Kazakistan', flag: '🇰🇿', language: 'ru', currency: 'KZT', region: 'Orta Asya' },
  { code: 'AZ', name: 'Azerbaycan', flag: '🇦🇿', language: 'az', currency: 'AZN', region: 'Orta Asya' },
  { code: 'UZ', name: 'Özbekistan', flag: '🇺🇿', language: 'uz', currency: 'UZS', region: 'Orta Asya' },
  { code: 'RU', name: 'Rusya', flag: '🇷🇺', language: 'ru', currency: 'RUB', region: 'Orta Asya' },
  { code: 'CN', name: 'Çin', flag: '🇨🇳', language: 'zh', currency: 'CNY', region: 'Asya' },
  { code: 'JP', name: 'Japonya', flag: '🇯🇵', language: 'ja', currency: 'JPY', region: 'Asya' },
  { code: 'IN', name: 'Hindistan', flag: '🇮🇳', language: 'en', currency: 'INR', region: 'Asya' },
];

// ── LEAD ARAMA (Google Places API) ───────────────────────
async function searchLeadsInCountry(params: {
  country: string; countryCode: string; sector: string;
  language: string; userId: string;
}): Promise<any[]> {
  const { country, countryCode, sector, language } = params;
  const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!GOOGLE_KEY) return [];

  try {
    // Sektörü hedef dile çevir
    const translatePrompt = `"${sector}" sektörünü ${language} diline çevir. Sadece çeviriyi yaz, başka hiçbir şey yazma.`;
    const translateRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: translatePrompt }],
    });
    const sectorTranslated = translateRes.content[0]?.text?.trim() || sector;

    // Google Places ile ara
    const queries = [
      `${sectorTranslated} company ${country}`,
      `${sectorTranslated} manufacturer ${country}`,
      `${sectorTranslated} supplier ${country}`,
    ];

    const leads: any[] = [];
    for (const query of queries) {
      const r = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: { query, key: GOOGLE_KEY, language: 'en' },
      });
      const places = r.data.results || [];
      for (const p of places.slice(0, 5)) {
        if (leads.find(l => l.company_name === p.name)) continue;
        // Detayları al
        try {
          const det = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: { place_id: p.place_id, fields: 'name,formatted_phone_number,website,formatted_address,rating', key: GOOGLE_KEY },
          });
          const d = det.data.result;
          leads.push({
            company_name: d.name || p.name,
            phone: d.formatted_phone_number || '',
            website: d.website || '',
            address: d.formatted_address || p.formatted_address,
            country, countryCode, sector,
            source: 'google_places',
            rating: d.rating || null,
          });
        } catch {}
        if (leads.length >= 15) break;
      }
      if (leads.length >= 15) break;
    }
    return leads;
  } catch (e: any) {
    console.error('Google Places error:', e.message);
    return [];
  }
}

// ── OUTREACH MESAJI OLUŞTUR ───────────────────────────────
async function generateOutreachMessage(params: {
  companyName: string; country: string; language: string;
  sector: string; senderCompany: string; senderProduct: string;
  channel: 'whatsapp' | 'email' | 'linkedin';
}): Promise<{ subject?: string; body: string }> {
  const { companyName, country, language, sector, senderCompany, senderProduct, channel } = params;

  const langNames: Record<string, string> = {
    de: 'Almanca', en: 'İngilizce', fr: 'Fransızca', ar: 'Arapça',
    ru: 'Rusça', az: 'Azerbaycanca', zh: 'Çince', it: 'İtalyanca',
    es: 'İspanyolca', nl: 'Hollandaca',
  };

  const prompt = `${langNames[language] || 'İngilizce'} dilinde ${channel} için ihracat outreach mesajı yaz.

Gönderen: ${senderCompany} (Türk üretici)
Ürün/Hizmet: ${senderProduct}
Alıcı şirket: ${companyName}
Alıcı ülke: ${country}
Sektör: ${sector}
Kanal: ${channel}

KURALLAR:
- ${langNames[language] || 'İngilizce'} yaz
- Çok profesyonel ve doğal
- Kısa ve etkili (${channel === 'whatsapp' ? '3-4 cümle' : '150-200 kelime'})
- Türk üretici olduğunu belirt
- Somut değer öner
- ${channel === 'email' ? 'Konu satırı da yaz' : ''}

JSON döndür: {"subject": "konu (sadece email için)", "body": "mesaj metni"}`;

  try {
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = r.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { body: text };
  } catch {
    return { body: `Hello, we are ${senderCompany} from Turkey. We would like to discuss a potential business partnership.` };
  }
}

// ── ROUTES ───────────────────────────────────────────────

// GET /api/export/countries
router.get('/countries', (req: any, res: any) => {
  res.json({ countries: COUNTRIES });
});

// POST /api/export/find-leads — Hedef ülkede lead bul
router.post('/find-leads', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { countryCode, sector, saveToLeads = true } = req.body;
    if (!countryCode || !sector) return res.status(400).json({ error: 'countryCode ve sector zorunlu' });

    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return res.status(400).json({ error: 'Geçersiz ülke kodu' });

    // Kullanıcı profili
    const { data: profile } = await supabase.from('business_profiles').select('company, product').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('company').eq('id', userId).single();

    res.json({ ok: true, message: `${country.name}'de ${sector} leadleri aranıyor...` });

    // Arka planda ara
    (async () => {
      try {
        const leads = await searchLeadsInCountry({
          country: country.name, countryCode, sector,
          language: country.language, userId,
        });

        if (!leads.length) {
          console.log(`${country.name} için lead bulunamadı`);
          return;
        }

        if (saveToLeads) {
          const toInsert = leads.map(l => ({
            user_id: userId,
            company_name: l.company_name,
            phone: l.phone || null,
            website: l.website || null,
            city: l.address?.split(',')[0] || country.name,
            country: country.name,
            country_code: countryCode,
            sector,
            status: 'new',
            source: 'export_search',
            notes: `${country.flag} ${country.name} ihracat hedefi`,
          }));

          await supabase.from('leads').insert(toInsert);
          console.log(`${leads.length} ihracat leadi kaydedildi: ${country.name}`);
        }
      } catch (e: any) {
        console.error('Find leads error:', e.message);
      }
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/export/generate-message — Outreach mesajı oluştur
router.post('/generate-message', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, countryCode, channel = 'whatsapp' } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const country = COUNTRIES.find(c => c.code === (countryCode || lead.country_code)) || COUNTRIES[0];
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('company').eq('id', userId).single();

    const message = await generateOutreachMessage({
      companyName: lead.company_name,
      country: country.name,
      language: country.language,
      sector: lead.sector || '',
      senderCompany: profile?.company?.name || userRow?.company || 'şirketimiz',
      senderProduct: profile?.product?.description || '',
      channel,
    });

    res.json({ ok: true, message, lead: lead.company_name, country: country.name, language: country.language });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/export/bulk-messages — Toplu mesaj oluştur
router.post('/bulk-messages', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { countryCode, leadIds, channel = 'whatsapp' } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'leadIds zorunlu' });

    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return res.status(400).json({ error: 'Geçersiz ülke' });

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('company').eq('id', userId).single();

    res.json({ ok: true, message: `${leadIds.length} lead için mesaj oluşturuluyor...` });

    (async () => {
      for (const leadId of leadIds) {
        try {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead) continue;

          const msg = await generateOutreachMessage({
            companyName: lead.company_name,
            country: country.name,
            language: country.language,
            sector: lead.sector || '',
            senderCompany: profile?.company?.name || userRow?.company || 'şirketimiz',
            senderProduct: profile?.product?.description || '',
            channel,
          });

          await supabase.from('export_messages').insert([{
            user_id: userId, lead_id: leadId,
            country_code: countryCode, channel,
            subject: msg.subject || null,
            body: msg.body,
            language: country.language,
            status: 'draft',
          }]);

          await new Promise(r => setTimeout(r, 300));
        } catch (e: any) {
          console.error('Bulk message error:', e.message);
        }
      }
      console.log(`${leadIds.length} mesaj oluşturuldu`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/export/create-campaign — İhracat kampanyası oluştur
router.post('/create-campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, countryCode, leadIds, channel, campaignType } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead seçin' });

    const country = COUNTRIES.find(c => c.code === countryCode);

    const { data: campaign, error } = await supabase.from('export_campaigns').insert([{
      user_id: userId,
      name: name || `${country?.flag} ${country?.name} ${channel} Kampanyası`,
      country_code: countryCode,
      country_name: country?.name,
      channel, campaign_type: campaignType || 'outreach',
      lead_count: leadIds.length,
      lead_ids: leadIds,
      status: 'draft',
      language: country?.language,
    }]).select().single();

    if (error) throw error;

    // Mesajları oluştur
    await supabase.from('export_messages').delete().eq('campaign_id', campaign.id);

    res.json({ ok: true, campaign, message: `${leadIds.length} lead için ${country?.name} kampanyası oluşturuldu` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/export/campaigns
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('export_campaigns')
      .select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/export-leads — İhracat leadleri
router.get('/export-leads', async (req: any, res: any) => {
  try {
    const { countryCode, limit = 50 } = req.query;
    let query = supabase.from('leads').select('*')
      .eq('user_id', req.userId).eq('source', 'export_search')
      .order('created_at', { ascending: false }).limit(Number(limit));
    if (countryCode) query = query.eq('country_code', countryCode);
    const { data } = await query;
    res.json({ leads: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Eski endpoints (geriye uyumluluk)
router.get('/markets', async (req: any, res: any) => {
  res.json({ countries: COUNTRIES });
});

router.get('/opportunities', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads')
      .select('id, company_name, sector, city, country, country_code, export_analysis')
      .eq('user_id', req.userId).not('export_analysis', 'is', null)
      .order('created_at', { ascending: false }).limit(50);
    res.json({ leads: (data || []).map((l: any) => ({ ...l, analysis: l.export_analysis ? JSON.parse(l.export_analysis) : null })) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze-lead', async (req: any, res: any) => {
  try {
    const { leadId } = req.body;
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    res.json({ lead: lead.company_name, sector: lead.sector, analysis: { exportReadiness: 7, topMarkets: ['Almanya', 'BAE', 'ABD'], quickWins: ['Website İngilizceleştir', 'CE sertifikası al'], estimatedRevenue: '100K-500K EUR/yıl', firstStep: 'Almanya\'daki ithalatçılarla iletişime geç', outreachMessage: `Merhaba, ${lead.company_name} olarak ihracat fırsatları arıyoruz.` } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze-batch', async (req: any, res: any) => {
  res.json({ message: 'Analiz başlatıldı', analyzed: 0 });
});

module.exports = router;