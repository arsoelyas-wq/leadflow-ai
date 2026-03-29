export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'https://leadflow-ai-web-kappa.vercel.app/api/auth/meta/callback';

// OAuth URL
router.get('/oauth-url', async (req: any, res: any) => {
  const scopes = 'ads_read,ads_management,business_management,pages_read_engagement,leads_retrieval,pages_manage_ads';
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${req.userId}&response_type=code`;
  res.json({ url });
});

// Token Exchange
router.post('/exchange-token', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    const tokenResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT_URI, code }
    });
    const shortToken = tokenResp.data.access_token;
    const longResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: shortToken }
    });
    const longToken = longResp.data.access_token;
    const meResp = await axios.get(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${longToken}`);
    const adAccountsResp = await axios.get(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,balance&access_token=${longToken}`);

    await supabase.from('meta_connections').upsert([{
      user_id: req.userId,
      meta_user_id: meResp.data.id,
      meta_user_name: meResp.data.name,
      access_token: longToken,
      ad_accounts: JSON.stringify(adAccountsResp.data.data || []),
      connected_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    }], { onConflict: 'user_id' });

    res.json({ success: true, userName: meResp.data.name, adAccounts: adAccountsResp.data.data || [], message: 'Meta hesabi baglandi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// Connection
router.get('/connection', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('meta_connections').select('*').eq('user_id', req.userId).single();
    if (!data) return res.json({ connected: false });
    res.json({ connected: true, userName: data.meta_user_name, adAccounts: JSON.parse(data.ad_accounts || '[]'), connectedAt: data.connected_at, expiresAt: data.token_expires_at });
  } catch { res.json({ connected: false }); }
});

// Kampanya Analizi
router.get('/analyze/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabi bagli degil' });

    const campResp = await axios.get(
      `https://graph.facebook.com/v18.0/${req.params.adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,insights{impressions,clicks,spend,ctr,cpm,reach}&access_token=${conn.access_token}&limit=20`
    );
    const campaigns = campResp.data?.data || [];

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const summary = campaigns.length > 0
      ? campaigns.map((c: any) => {
          const ins = c.insights?.data?.[0] || {};
          return `Kampanya: ${c.name} | Durum: ${c.status} | Gosterim: ${ins.impressions||0} | Tiklama: ${ins.clicks||0} | CTR: %${ins.ctr||0} | Harcama: $${ins.spend||0}`;
        }).join('\n')
      : 'Hic kampanya yok';

    const aiResp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Meta reklam uzmani olarak analiz et ve JSON dondur (Turkce):

${summary}

JSON:
{
  "overallScore": 7,
  "issues": ["sorun1", "sorun2"],
  "opportunities": ["firsat1", "firsat2"],
  "recommendations": ["oneri1", "oneri2"],
  "alertLevel": "high",
  "summary": "genel degerlendirme",
  "budgetSuggestion": "butce onerisi",
  "audienceSuggestion": "hedef kitle onerisi"
}`
      }]
    });

    const m = aiResp.content[0]?.text?.match(/\{[\s\S]*\}/);
    const analysis = m ? JSON.parse(m[0]) : null;

    try {
      await supabase.from('ad_analyses').insert([{
        user_id: req.userId,
        ad_account_id: req.params.adAccountId,
        campaigns_analyzed: campaigns.length,
        analysis: JSON.stringify(analysis),
        analyzed_at: new Date().toISOString(),
      }]);
    } catch {}

    res.json({ campaigns, analysis, total: campaigns.length });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// Kampanya Olustur — SADECE kampanya, adset yok
router.post('/create-campaign', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabi bagli degil' });

    const { adAccountId, name, objective, dailyBudget, targetCountries, targetAgeMin, targetAgeMax } = req.body;
    if (!adAccountId || !name || !objective) return res.status(400).json({ error: 'adAccountId, name, objective zorunlu' });

    // Sadece kampanya olustur
    const campResp = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      {
        name,
        objective,
        status: 'PAUSED',
        special_ad_categories: [],
        daily_budget: dailyBudget ? Math.max(100, parseInt(dailyBudget) * 100) : undefined,
      },
      { params: { access_token: conn.access_token } }
    );

    const campaignId = campResp.data?.id;

    await supabase.from('ad_campaigns').insert([{
      user_id: req.userId,
      platform: 'meta',
      campaign_id: campaignId,
      name, objective,
      daily_budget: dailyBudget,
      status: 'paused',
      ad_account_id: adAccountId,
    }]);

    res.json({ campaignId, message: 'Kampanya olusturuldu! Meta Ads Managerde hedef kitle ekleyebilirsiniz.' });
  } catch (e: any) {
    console.error('Campaign error:', JSON.stringify(e.response?.data || e.message));
    res.status(500).json({ error: e.response?.data?.error?.message || e.message, details: e.response?.data?.error });
  }
});

// Kampanya Baslat/Durdur
router.patch('/campaign/:id/status', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabi bagli degil' });
    const { status } = req.body;
    await axios.post(`https://graph.facebook.com/v18.0/${req.params.id}`, { status }, { params: { access_token: conn.access_token } });
    await supabase.from('ad_campaigns').update({ status: status.toLowerCase() }).eq('campaign_id', req.params.id).eq('user_id', req.userId);
    res.json({ message: `Kampanya ${status === 'ACTIVE' ? 'baslatildi' : 'durduruldu'}` });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// Lead Ads'dan Lead Cek
router.get('/leads/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabi bagli degil' });

    const formsResp = await axios.get(
      `https://graph.facebook.com/v18.0/${req.params.adAccountId}/leadgen_forms?fields=id,name,leads_count&access_token=${conn.access_token}&limit=10`
    );

    let totalAdded = 0;
    for (const form of formsResp.data?.data || []) {
      const leadsResp = await axios.get(
        `https://graph.facebook.com/v18.0/${form.id}/leads?fields=field_data,created_time&access_token=${conn.access_token}&limit=50`
      );
      for (const lead of leadsResp.data?.data || []) {
        const fields: any = {};
        (lead.field_data || []).forEach((f: any) => { fields[f.name] = f.values?.[0]; });
        const phone = fields['phone_number']?.replace(/\s/g, '');
        const email = fields['email'];
        if (!phone && !email) continue;
        let query = supabase.from('leads').select('id').eq('user_id', req.userId);
        if (phone) query = query.eq('phone', phone);
        else query = query.eq('email', email);
        const { data: existing } = await query.maybeSingle();
        if (existing) continue;
        await supabase.from('leads').insert([{
          user_id: req.userId,
          company_name: fields['company_name'] || fields['full_name'] || 'Meta Lead',
          contact_name: fields['full_name'] || null,
          phone: phone || null,
          email: email || null,
          source: 'meta_ads',
          status: 'new',
        }]);
        totalAdded++;
      }
    }
    res.json({ formsFound: formsResp.data?.data?.length || 0, leadsAdded: totalAdded });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// 7/24 Monitor
router.get('/monitor/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabi bagli degil' });

    const campResp = await axios.get(
      `https://graph.facebook.com/v18.0/${req.params.adAccountId}/campaigns?fields=id,name,status,insights{impressions,clicks,spend,ctr}&access_token=${conn.access_token}&limit=20`
    );

    const alerts: any[] = [];
    for (const camp of campResp.data?.data || []) {
      const ins = camp.insights?.data?.[0] || {};
      const ctr = parseFloat(ins.ctr || '0');
      const spend = parseFloat(ins.spend || '0');
      const impressions = parseInt(ins.impressions || '0');
      if (ctr < 0.5 && impressions > 1000) alerts.push({ campaign_id: camp.id, name: camp.name, type: 'low_ctr', message: `CTR cok dusuk: %${ctr.toFixed(2)} — Hedef kitle veya reklam metni degistirilmeli`, severity: 'high' });
      if (spend > 0 && parseInt(ins.clicks || '0') === 0) alerts.push({ campaign_id: camp.id, name: camp.name, type: 'no_clicks', message: 'Harcama var ama tiklama yok — Reklam gorseli ilgi cekmiyor', severity: 'critical' });
      if (ctr > 3) alerts.push({ campaign_id: camp.id, name: camp.name, type: 'high_performance', message: `Mukemmel performans! CTR: %${ctr.toFixed(2)} — Butceyi artirabilisiniz`, severity: 'positive' });
    }

    if (alerts.length > 0) {
      try {
        await supabase.from('ad_alerts').insert(alerts.map((a: any) => ({ user_id: req.userId, ...a, checked_at: new Date().toISOString() })));
      } catch {}
    }

    res.json({ campaigns: campResp.data?.data || [], alerts, monitored: campResp.data?.data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// AI Reklam Metni
router.post('/generate-copy', async (req: any, res: any) => {
  try {
    const { product, sector, target, platform } = req.body;
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `${platform || 'Meta'} reklami icin profesyonel metin yaz. SADECE JSON dondur:
Urun: ${product}
Sektor: ${sector || 'genel'}
Hedef: ${target || 'isletme sahipleri'}

{"headline":"max 30 karakter","description":"max 90 karakter","cta":"Hemen Incele","keywords":["k1","k2","k3"],"targetingTips":"oneri"}`
      }]
    });
    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    res.json({ copy: m ? JSON.parse(m[0]) : null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('connected_at,meta_user_name').eq('user_id', req.userId).single().catch(() => ({ data: null }));
    const { data: campaigns } = await supabase.from('ad_campaigns').select('status').eq('user_id', req.userId);
    const { data: alerts } = await supabase.from('ad_alerts').select('severity').eq('user_id', req.userId);
    const { data: adLeads } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('source', 'meta_ads');
    res.json({
      connected: !!conn,
      userName: conn?.meta_user_name,
      totalCampaigns: campaigns?.length || 0,
      activeCampaigns: campaigns?.filter((c: any) => c.status === 'active').length || 0,
      totalAlerts: alerts?.length || 0,
      criticalAlerts: alerts?.filter((a: any) => a.severity === 'critical').length || 0,
      leadsFromAds: adLeads?.length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// My campaigns
router.get('/my-campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_campaigns').select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;