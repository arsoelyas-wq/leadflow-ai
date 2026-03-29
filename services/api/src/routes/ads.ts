export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'https://leadflow-ai-web-kappa.vercel.app/api/auth/meta/callback';

// ── OAUTH URL OLUŞTUR ─────────────────────────────────────
router.get('/oauth-url', async (req: any, res: any) => {
  const scopes = [
    'ads_read', 'ads_management', 'business_management',
    'pages_read_engagement', 'leads_retrieval', 'pages_manage_ads'
  ].join(',');

  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${req.userId}&response_type=code`;
  res.json({ url });
});

// ── TOKEN EXCHANGE ────────────────────────────────────────
router.post('/exchange-token', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code zorunlu' });

    // Short-lived token al
    const tokenResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT_URI, code }
    });
    const shortToken = tokenResp.data.access_token;

    // Long-lived token al (60 gün)
    const longResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: shortToken }
    });
    const longToken = longResp.data.access_token;

    // Kullanıcı bilgisi
    const meResp = await axios.get(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${longToken}`);

    // Ad hesapları
    const adAccountsResp = await axios.get(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,balance&access_token=${longToken}`
    );

    // DB'ye kaydet
    await supabase.from('meta_connections').upsert([{
      user_id: req.userId,
      meta_user_id: meResp.data.id,
      meta_user_name: meResp.data.name,
      access_token: longToken,
      ad_accounts: JSON.stringify(adAccountsResp.data.data || []),
      connected_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    }], { onConflict: 'user_id' });

    res.json({
      success: true,
      userName: meResp.data.name,
      adAccounts: adAccountsResp.data.data || [],
      message: 'Meta hesabı bağlandı!'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── BAĞLI HESAP BİLGİSİ ──────────────────────────────────
router.get('/connection', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('meta_connections')
      .select('*').eq('user_id', req.userId).single();

    if (!data) return res.json({ connected: false });

    const adAccounts = JSON.parse(data.ad_accounts || '[]');
    res.json({
      connected: true,
      userName: data.meta_user_name,
      adAccounts,
      connectedAt: data.connected_at,
      expiresAt: data.token_expires_at,
    });
  } catch { res.json({ connected: false }); }
});

// ── KAMPANYA ANALİZİ ──────────────────────────────────────
router.get('/analyze/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabı bağlı değil' });

    const token = conn.access_token;
    const accountId = req.params.adAccountId;

    // Kampanyaları çek
    const campResp = await axios.get(
      `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,insights{impressions,clicks,spend,ctr,cpm,reach,actions}&access_token=${token}&limit=20`
    );

    const campaigns = campResp.data?.data || [];

    // AI ile analiz et
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const summary = campaigns.map((c: any) => {
      const ins = c.insights?.data?.[0] || {};
      return `Kampanya: ${c.name} | Durum: ${c.status} | Gösterim: ${ins.impressions||0} | Tıklama: ${ins.clicks||0} | CTR: ${ins.ctr||0}% | Harcama: $${ins.spend||0}`;
    }).join('\n');

    const aiResp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Bu Meta reklam kampanyalarını analiz et ve JSON döndür:

${summary}

JSON:
{
  "overallScore": 7,
  "issues": ["sorun1", "sorun2"],
  "opportunities": ["fırsat1", "fırsat2"],
  "recommendations": ["öneri1", "öneri2"],
  "alertLevel": "low/medium/high",
  "summary": "genel değerlendirme"
}`
      }]
    });

    const m = aiResp.content[0]?.text?.match(/\{[\s\S]*\}/);
    const analysis = m ? JSON.parse(m[0]) : null;

    // Analizi kaydet
    await supabase.from('ad_analyses').insert([{
      user_id: req.userId,
      ad_account_id: accountId,
      campaigns_analyzed: campaigns.length,
      analysis: JSON.stringify(analysis),
      analyzed_at: new Date().toISOString(),
    }]).catch(() => {});

    res.json({ campaigns, analysis, total: campaigns.length });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── KAMPANYA OLUŞTUR ──────────────────────────────────────
router.post('/create-campaign', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabı bağlı değil' });

    const token = conn.access_token;
    const { adAccountId, name, objective, dailyBudget, targetCountries, targetAgeMin, targetAgeMax, interests } = req.body;

    // Kampanya oluştur
    const campResp = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      { name, objective: objective || 'OUTCOME_LEADS', status: 'PAUSED', special_ad_categories: [] },
      { params: { access_token: token } }
    );
    const campaignId = campResp.data.id;

    // Ad Set oluştur
    const adSetResp = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/adsets`,
      {
        name: `${name} - Hedef Kitle`,
        campaign_id: campaignId,
        daily_budget: parseInt(dailyBudget) * 100,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LEAD_GENERATION',
        status: 'PAUSED',
        targeting: {
          geo_locations: { countries: targetCountries || ['TR'] },
          age_min: targetAgeMin || 25,
          age_max: targetAgeMax || 55,
        },
        start_time: new Date(Date.now() + 3600000).toISOString(),
      },
      { params: { access_token: token } }
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
      ad_account_id: adAccountId,
    }]);

    res.json({ campaignId, adSetId: adSetResp.data?.id, message: 'Kampanya oluşturuldu!' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── LEAD ADS'DAN LEAD ÇEK ────────────────────────────────
router.get('/leads/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabı bağlı değil' });

    const token = conn.access_token;
    const accountId = req.params.adAccountId;

    // Lead formlarını bul
    const formsResp = await axios.get(
      `https://graph.facebook.com/v18.0/${accountId}/leadgen_forms?fields=id,name,leads_count&access_token=${token}&limit=10`
    );

    let totalAdded = 0;
    for (const form of formsResp.data?.data || []) {
      const leadsResp = await axios.get(
        `https://graph.facebook.com/v18.0/${form.id}/leads?fields=field_data,created_time&access_token=${token}&limit=50`
      );

      for (const lead of leadsResp.data?.data || []) {
        const fields: any = {};
        (lead.field_data || []).forEach((f: any) => { fields[f.name] = f.values?.[0]; });

        // Duplicate kontrol
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

// ── 7/24 İZLEME ──────────────────────────────────────────
router.get('/monitor/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabı bağlı değil' });

    const token = conn.access_token;
    const accountId = req.params.adAccountId;

    const campResp = await axios.get(
      `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,insights{impressions,clicks,spend,ctr,actions,cost_per_action_type}&access_token=${token}&limit=20`
    );

    const alerts: any[] = [];
    for (const camp of campResp.data?.data || []) {
      const ins = camp.insights?.data?.[0] || {};
      const ctr = parseFloat(ins.ctr || '0');
      const spend = parseFloat(ins.spend || '0');
      const impressions = parseInt(ins.impressions || '0');

      if (ctr < 0.5 && impressions > 1000) {
        alerts.push({ campaignId: camp.id, name: camp.name, type: 'low_ctr', message: `CTR çok düşük: %${ctr.toFixed(2)} — Hedef kitle veya reklam metni değiştirilmeli`, severity: 'high' });
      }
      if (spend > 0 && parseInt(ins.clicks || '0') === 0) {
        alerts.push({ campaignId: camp.id, name: camp.name, type: 'no_clicks', message: 'Harcama var ama tıklama yok — Reklam görsel/metni ilgi çekmiyor', severity: 'critical' });
      }
      if (ctr > 3) {
        alerts.push({ campaignId: camp.id, name: camp.name, type: 'high_performance', message: `Mükemmel performans! CTR: %${ctr.toFixed(2)} — Bütçeyi artırabilirsiniz`, severity: 'positive' });
      }
    }

    // Alertleri kaydet
    if (alerts.length > 0) {
      await supabase.from('ad_alerts').insert(alerts.map(a => ({
        user_id: req.userId, ...a, checked_at: new Date().toISOString()
      }))).catch(() => {});
    }

    res.json({ campaigns: campResp.data?.data || [], alerts, monitored: campResp.data?.data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── AI OPTİMİZASYON ÖNERİSİ ──────────────────────────────
router.post('/optimize', async (req: any, res: any) => {
  try {
    const { campaignData, goal } = req.body;
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Bu Meta reklam kampanyasını optimize et. Hedef: ${goal || 'daha fazla lead'}

Kampanya verisi: ${JSON.stringify(campaignData)}

JSON döndür:
{
  "budgetChange": "+20% artır veya -10% azalt",
  "audienceChange": "25-45 yaş, İstanbul, mobilya ilgisi ekle",
  "adCopyChange": "Başlığı şöyle değiştir: ...",
  "scheduleChange": "Hafta içi 9-18 arası yayınla",
  "estimatedImprovement": "%30 daha fazla lead bekleniyor",
  "priority": "high/medium/low"
}`
      }]
    });

    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    res.json({ optimization: m ? JSON.parse(m[0]) : null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── STATS ─────────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('connected_at, meta_user_name').eq('user_id', req.userId).single();

    const { data: campaigns } = await supabase.from('ad_campaigns')
      .select('status').eq('user_id', req.userId);

    const { data: alerts } = await supabase.from('ad_alerts')
      .select('severity').eq('user_id', req.userId);

    const { data: adLeads } = await supabase.from('leads')
      .select('id').eq('user_id', req.userId).eq('source', 'meta_ads');

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

// Her 2 saatte bir tüm bağlı hesapları izle
setInterval(async () => {
  try {
    const { data: connections } = await supabase.from('meta_connections').select('user_id, access_token, ad_accounts');
    for (const conn of connections || []) {
      const adAccounts = JSON.parse(conn.ad_accounts || '[]');
      for (const account of adAccounts.slice(0, 1)) {
        try {
          const campResp = await axios.get(
            `https://graph.facebook.com/v18.0/${account.id}/campaigns?fields=id,name,status,insights{impressions,clicks,spend,ctr}&access_token=${conn.access_token}&limit=10`
          );
          for (const camp of campResp.data?.data || []) {
            const ins = camp.insights?.data?.[0] || {};
            const ctr = parseFloat(ins.ctr || '0');
            if (ctr < 0.5 && parseInt(ins.impressions || '0') > 1000) {
              await supabase.from('ad_alerts').insert([{
                user_id: conn.user_id,
                campaignId: camp.id,
                name: camp.name,
                type: 'low_ctr',
                message: `CTR çok düşük: %${ctr.toFixed(2)} — Acil optimizasyon gerekiyor`,
                severity: 'high',
                checked_at: new Date().toISOString(),
              }]).catch(() => {});
            }
          }
          await new Promise(r => setTimeout(r, 1000));
        } catch {}
      }
    }
  } catch {}
}, 2 * 60 * 60 * 1000);

module.exports = router;