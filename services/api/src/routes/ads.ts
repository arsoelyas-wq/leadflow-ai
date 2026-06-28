export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'https://sovlo.io/api/auth/meta/callback';

// OAuth URL — includes CAPI + Pixel permissions
router.get('/oauth-url', async (req: any, res: any) => {
  const source = req.query.source || 'ads';
  const scopes = 'ads_read,ads_management,business_management,pages_read_engagement,leads_retrieval,pages_manage_ads';
  const state = source === 'settings' ? 'settings' : 'meta';
  const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${state}&response_type=code`;
  res.json({ url });
});

// Token Exchange
router.post('/exchange-token', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    const tokenResp = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: { client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT_URI, code }
    });
    const shortToken = tokenResp.data.access_token;
    const longResp = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: shortToken }
    });
    const longToken = longResp.data.access_token;
    const meResp = await axios.get(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${longToken}`);
    const adAccountsResp = await axios.get(`https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_status,currency,balance&access_token=${longToken}`);

    // Auto-fetch Pixel IDs from ad accounts
    let pixelIds: string[] = [];
    const adAccounts = adAccountsResp.data.data || [];
    console.log(`[Meta] ${adAccounts.length} ad accounts found`);
    for (const acc of adAccounts.slice(0, 5)) {
      try {
        console.log(`[Meta] Fetching pixels for ${acc.id} (status: ${acc.account_status})`);
        const pixelResp = await axios.get(`https://graph.facebook.com/v20.0/${acc.id}/adspixels`, {
          params: { access_token: longToken, fields: 'id,name,is_unavailable' }, timeout: 10000,
        });
        const pixels = pixelResp.data?.data || [];
        console.log(`[Meta] ${acc.id}: ${pixels.length} pixels found`);
        for (const p of pixels) {
          if (!p.is_unavailable) pixelIds.push(p.id);
        }
      } catch (pixErr: any) {
        console.log(`[Meta] ${acc.id} pixel fetch error: ${pixErr.response?.data?.error?.message || pixErr.message}`);
      }
    }
    console.log(`[Meta] Total pixels: ${pixelIds.length}`, pixelIds);

    // Save connection (without pixel_ids column — may not exist)
    const connData: any = {
      user_id: req.userId,
      meta_user_id: meResp.data.id,
      meta_user_name: meResp.data.name,
      access_token: longToken,
      ad_accounts: JSON.stringify(adAccountsResp.data.data || []),
      connected_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const { error: connErr } = await supabase.from('meta_connections').upsert([connData], { onConflict: 'user_id' });
    if (connErr) console.error('[Meta] Connection save error:', connErr.message);

    // Auto-save CAPI settings — always update with real pixel + token
    let capiAutoSetup = false;
    if (pixelIds.length > 0) {
      const { error: capiErr } = await supabase.from('user_settings')
        .update({ meta_pixel_id: pixelIds[0], meta_capi_token: longToken, meta_capi_enabled: true, updated_at: new Date().toISOString() })
        .eq('user_id', req.userId);
      if (capiErr) {
        // Row doesn't exist yet — insert
        await supabase.from('user_settings').insert([{ user_id: req.userId, meta_pixel_id: pixelIds[0], meta_capi_token: longToken, meta_capi_enabled: true }]);
      }
      capiAutoSetup = true;
      console.log(`[Meta] CAPI auto-setup: pixel=${pixelIds[0]}`);
    } else {
      // No pixel found but save token anyway
      await supabase.from('user_settings')
        .update({ meta_capi_token: longToken, updated_at: new Date().toISOString() })
        .eq('user_id', req.userId);
    }

    console.log(`[Meta] Connected: ${meResp.data.name}, pixels: ${pixelIds.length}, capi: ${capiAutoSetup}`);
    res.json({ success: true, userName: meResp.data.name, adAccounts: adAccountsResp.data.data || [], pixelIds, capiAutoSetup, message: capiAutoSetup ? 'Meta + CAPI otomatik kuruldu!' : 'Meta hesabi baglandi!' });
  } catch (e: any) {
    console.error('[Meta Exchange] Error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// Connection + auto token refresh
router.get('/connection', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('meta_connections').select('*').eq('user_id', req.userId).single();
    if (!data) return res.json({ connected: false });

    // Token expiry check — refresh if < 7 days remaining
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
    const daysLeft = Math.max(0, Math.round((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
    let tokenRefreshed = false;

    if (daysLeft < 7 && daysLeft > 0 && data.access_token) {
      try {
        const refreshResp = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
          params: { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: data.access_token },
        });
        if (refreshResp.data?.access_token) {
          await supabase.from('meta_connections').update({
            access_token: refreshResp.data.access_token,
            token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('user_id', req.userId);
          tokenRefreshed = true;
          console.log(`[Meta] Token refreshed for ${req.userId.slice(0, 8)}, ${daysLeft} days remaining`);
        }
      } catch (refreshErr: any) {
        console.log('[Meta] Token refresh failed:', refreshErr.message?.slice(0, 60));
      }
    }

    let pixelIds: string[] = [];
    try { pixelIds = JSON.parse(data.pixel_ids || '[]'); } catch {}

    res.json({
      connected: true,
      userName: data.meta_user_name,
      adAccounts: JSON.parse(data.ad_accounts || '[]'),
      pixelIds,
      connectedAt: data.connected_at,
      expiresAt: data.token_expires_at,
      daysLeft,
      tokenRefreshed,
      tokenWarning: daysLeft <= 7 && daysLeft > 0 ? `Token ${daysLeft} gun sonra expire olacak` : daysLeft === 0 ? 'Token expired — tekrar baglanin' : null,
    });
  } catch { res.json({ connected: false }); }
});

// Kampanya Analizi
router.get('/analyze/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabi bagli degil' });

    const campResp = await axios.get(
      `https://graph.facebook.com/v20.0/${req.params.adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,insights{impressions,clicks,spend,ctr,cpm,reach}&access_token=${conn.access_token}&limit=20`
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

// Kampanya Olustur â€” SADECE kampanya, adset yok
router.post('/create-campaign', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabi bagli degil' });

    const { adAccountId, name, objective, dailyBudget, targetCountries, targetAgeMin, targetAgeMax } = req.body;
    if (!adAccountId || !name || !objective) return res.status(400).json({ error: 'adAccountId, name, objective zorunlu' });

    // Sadece kampanya olustur
    const campResp = await axios.post(
      `https://graph.facebook.com/v20.0/${adAccountId}/campaigns`,
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
    await axios.post(`https://graph.facebook.com/v20.0/${req.params.id}`, { status }, { params: { access_token: conn.access_token } });
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
      `https://graph.facebook.com/v20.0/${req.params.adAccountId}/leadgen_forms?fields=id,name,leads_count&access_token=${conn.access_token}&limit=10`
    );

    let totalAdded = 0;
    for (const form of formsResp.data?.data || []) {
      const leadsResp = await axios.get(
        `https://graph.facebook.com/v20.0/${form.id}/leads?fields=field_data,created_time&access_token=${conn.access_token}&limit=50`
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
      `https://graph.facebook.com/v20.0/${req.params.adAccountId}/campaigns?fields=id,name,status,insights{impressions,clicks,spend,ctr}&access_token=${conn.access_token}&limit=20`
    );

    const alerts: any[] = [];
    for (const camp of campResp.data?.data || []) {
      const ins = camp.insights?.data?.[0] || {};
      const ctr = parseFloat(ins.ctr || '0');
      const spend = parseFloat(ins.spend || '0');
      const impressions = parseInt(ins.impressions || '0');
      if (ctr < 0.5 && impressions > 1000) alerts.push({ campaign_id: camp.id, name: camp.name, type: 'low_ctr', message: `CTR cok dusuk: %${ctr.toFixed(2)} â€” Hedef kitle veya reklam metni degistirilmeli`, severity: 'high' });
      if (spend > 0 && parseInt(ins.clicks || '0') === 0) alerts.push({ campaign_id: camp.id, name: camp.name, type: 'no_clicks', message: 'Harcama var ama tiklama yok â€” Reklam gorseli ilgi cekmiyor', severity: 'critical' });
      if (ctr > 3) alerts.push({ campaign_id: camp.id, name: camp.name, type: 'high_performance', message: `Mukemmel performans! CTR: %${ctr.toFixed(2)} â€” Butceyi artirabilisiniz`, severity: 'positive' });
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

router.delete('/connection', async (req: any, res: any) => {
  try {
    await supabase.from('meta_connections').delete().eq('user_id', req.userId);
    res.json({ message: 'Meta baglantisi kesildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


module.exports = router;