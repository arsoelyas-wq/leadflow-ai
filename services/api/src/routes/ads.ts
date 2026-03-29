export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const META_TOKEN = process.env.META_PAGE_TOKEN || process.env.META_WA_TOKEN;
const META_AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID;
const GOOGLE_ADS_TOKEN = process.env.GOOGLE_ADS_TOKEN;
const GOOGLE_ADS_CUSTOMER = process.env.GOOGLE_ADS_CUSTOMER_ID;

// ── AI İLE REKLAM METNİ ÜRET ─────────────────────────────
async function generateAdCopy(product: string, sector: string, target: string, platform: string): Promise<any> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `${platform} reklamı için profesyonel metin yaz. SADECE JSON döndür.
Ürün/Hizmet: ${product}
Sektör: ${sector}
Hedef Kitle: ${target}

JSON:
{
  "headline": "max 30 karakter başlık",
  "description": "max 90 karakter açıklama",
  "cta": "Hemen İncele/Teklif Al/Ücretsiz Dene",
  "keywords": ["anahtar1","anahtar2","anahtar3"],
  "targetingTips": "hedefleme önerisi"
}`
    }]
  });
  const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

// ── META REKLAM HESABI BİLGİSİ ────────────────────────────
router.get('/meta/account', async (req: any, res: any) => {
  try {
    if (!META_TOKEN) return res.json({ connected: false, error: 'META_PAGE_TOKEN eksik' });

    const resp = await axios.get(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,balance,currency&access_token=${META_TOKEN}`,
      { timeout: 10000 }
    );

    res.json({ connected: true, accounts: resp.data?.data || [] });
  } catch (e: any) {
    res.json({ connected: false, error: e.response?.data?.error?.message || e.message });
  }
});

// ── META KAMPANYA LİSTESİ ─────────────────────────────────
router.get('/meta/campaigns', async (req: any, res: any) => {
  try {
    if (!META_TOKEN || !META_AD_ACCOUNT) return res.status(400).json({ error: 'Meta reklam hesabı ayarlanmamış' });

    const resp = await axios.get(
      `https://graph.facebook.com/v18.0/${META_AD_ACCOUNT}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,insights{impressions,clicks,spend,ctr}&access_token=${META_TOKEN}`,
      { timeout: 10000 }
    );

    res.json({ campaigns: resp.data?.data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── META REKLAM OLUŞTUR ───────────────────────────────────
router.post('/meta/create-campaign', async (req: any, res: any) => {
  try {
    if (!META_TOKEN || !META_AD_ACCOUNT) return res.status(400).json({ error: 'Meta reklam hesabı ayarlanmamış' });

    const { name, objective, dailyBudget, targetCountries, targetAgeMin, targetAgeMax, targetInterests } = req.body;
    if (!name || !objective || !dailyBudget) return res.status(400).json({ error: 'name, objective, dailyBudget zorunlu' });

    // Kampanya oluştur
    const campaignResp = await axios.post(
      `https://graph.facebook.com/v18.0/${META_AD_ACCOUNT}/campaigns`,
      {
        name,
        objective: objective || 'OUTCOME_LEADS',
        status: 'PAUSED',
        special_ad_categories: [],
      },
      { params: { access_token: META_TOKEN }, timeout: 10000 }
    );

    const campaignId = campaignResp.data?.id;

    // Ad Set oluştur
    const adSetResp = await axios.post(
      `https://graph.facebook.com/v18.0/${META_AD_ACCOUNT}/adsets`,
      {
        name: `${name} - Ad Set`,
        campaign_id: campaignId,
        daily_budget: parseInt(dailyBudget) * 100, // kuruş
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LEAD_GENERATION',
        status: 'PAUSED',
        targeting: {
          geo_locations: { countries: targetCountries || ['TR'] },
          age_min: targetAgeMin || 25,
          age_max: targetAgeMax || 55,
          interests: targetInterests || [],
        },
      },
      { params: { access_token: META_TOKEN }, timeout: 10000 }
    );

    // DB'ye kaydet
    await supabase.from('ad_campaigns').insert([{
      user_id: req.userId,
      platform: 'meta',
      campaign_id: campaignId,
      adset_id: adSetResp.data?.id,
      name, objective,
      daily_budget: dailyBudget,
      status: 'paused',
    }]);

    res.json({ campaignId, adSetId: adSetResp.data?.id, message: 'Meta kampanyası oluşturuldu!' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── META KAMPANYA BAŞLAT/DURDUR ───────────────────────────
router.patch('/meta/campaign/:id/status', async (req: any, res: any) => {
  try {
    const { status } = req.body; // ACTIVE veya PAUSED
    await axios.post(
      `https://graph.facebook.com/v18.0/${req.params.id}`,
      { status },
      { params: { access_token: META_TOKEN }, timeout: 10000 }
    );
    await supabase.from('ad_campaigns').update({ status: status.toLowerCase() })
      .eq('campaign_id', req.params.id).eq('user_id', req.userId);
    res.json({ message: `Kampanya ${status === 'ACTIVE' ? 'başlatıldı' : 'durduruldu'}` });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── META HEDEF KİTLE OLUŞTUR ──────────────────────────────
router.post('/meta/custom-audience', async (req: any, res: any) => {
  try {
    if (!META_TOKEN || !META_AD_ACCOUNT) return res.status(400).json({ error: 'Meta hesabı eksik' });

    const { name, description, phones } = req.body;

    // WhatsApp numaralarını custom audience olarak yükle
    const resp = await axios.post(
      `https://graph.facebook.com/v18.0/${META_AD_ACCOUNT}/customaudiences`,
      {
        name: name || 'LeadFlow Müşteriler',
        description: description || 'LeadFlow AI ile toplanan leadler',
        subtype: 'CUSTOM',
      },
      { params: { access_token: META_TOKEN }, timeout: 10000 }
    );

    res.json({ audienceId: resp.data?.id, message: 'Hedef kitle oluşturuldu!' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── AI REKLAM METNİ ÜRET ─────────────────────────────────
router.post('/generate-copy', async (req: any, res: any) => {
  try {
    const { product, sector, target, platform } = req.body;
    if (!product) return res.status(400).json({ error: 'product zorunlu' });

    const copy = await generateAdCopy(product, sector || 'genel', target || 'işletme sahipleri', platform || 'Meta');
    res.json({ copy });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── REKLAM PERFORMANS ─────────────────────────────────────
router.get('/meta/insights/:campaignId', async (req: any, res: any) => {
  try {
    if (!META_TOKEN) return res.status(400).json({ error: 'Meta token eksik' });

    const resp = await axios.get(
      `https://graph.facebook.com/v18.0/${req.params.campaignId}/insights?fields=impressions,clicks,spend,ctr,cpm,reach,frequency&date_preset=last_7d&access_token=${META_TOKEN}`,
      { timeout: 10000 }
    );

    res.json({ insights: resp.data?.data?.[0] || null });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── DB'DEN KAMPANYALAR ────────────────────────────────────
router.get('/my-campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_campaigns').select('*')
      .eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_campaigns').select('status, platform').eq('user_id', req.userId);
    res.json({
      total: data?.length || 0,
      active: data?.filter((d: any) => d.status === 'active').length || 0,
      meta: data?.filter((d: any) => d.platform === 'meta').length || 0,
      google: data?.filter((d: any) => d.platform === 'google').length || 0,
      metaConnected: !!META_TOKEN,
      googleConnected: !!GOOGLE_ADS_TOKEN,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;