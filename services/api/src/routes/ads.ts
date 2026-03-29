export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'https://leadflow-ai-web-kappa.vercel.app/api/auth/meta/callback';

// Ã¢â€â‚¬Ã¢â€â‚¬ OAUTH URL OLUÃ…Å¾TUR Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
router.get('/oauth-url', async (req: any, res: any) => {
  const scopes = [
    'ads_read', 'ads_management', 'business_management',
    'pages_read_engagement', 'leads_retrieval', 'pages_manage_ads'
  ].join(',');

  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${req.userId}&response_type=code`;
  res.json({ url });
});

// Ã¢â€â‚¬Ã¢â€â‚¬ TOKEN EXCHANGE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
router.post('/exchange-token', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code zorunlu' });

    // Short-lived token al
    const tokenResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT_URI, code }
    });
    const shortToken = tokenResp.data.access_token;

    // Long-lived token al (60 gÃƒÂ¼n)
    const longResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: shortToken }
    });
    const longToken = longResp.data.access_token;

    // KullanÃ„Â±cÃ„Â± bilgisi
    const meResp = await axios.get(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${longToken}`);

    // Ad hesaplarÃ„Â±
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
      message: 'Meta hesabÃ„Â± baÃ„Å¸landÃ„Â±!'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message, details: e.response?.data?.error });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬ BAÃ„Å¾LI HESAP BÃ„Â°LGÃ„Â°SÃ„Â° Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

// Ã¢â€â‚¬Ã¢â€â‚¬ KAMPANYA ANALÃ„Â°ZÃ„Â° Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
router.get('/analyze/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabÃ„Â± baÃ„Å¸lÃ„Â± deÃ„Å¸il' });

    const token = conn.access_token;
    const accountId = req.params.adAccountId;

    // KampanyalarÃ„Â± ÃƒÂ§ek
    const campResp = await axios.get(
      `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,insights{impressions,clicks,spend,ctr,cpm,reach,actions}&access_token=${token}&limit=20`
    );

    const campaigns = campResp.data?.data || [];

    // AI ile analiz et
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const summary = campaigns.map((c: any) => {
      const ins = c.insights?.data?.[0] || {};
      return `Kampanya: ${c.name} | Durum: ${c.status} | GÃƒÂ¶sterim: ${ins.impressions||0} | TÃ„Â±klama: ${ins.clicks||0} | CTR: %${ins.ctr||0} | Harcama: $${ins.spend||0} | CPM: $${ins.cpm||0}`;
    }).join('\n');

    const aiResp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Sen uzman bir Meta reklam analistisÃ„Â±n. Bu kampanyalarÃ„Â± detaylÃ„Â±ca analiz et ve JSON dÃƒÂ¶ndÃƒÂ¼r:

${summary || 'Aktif kampanya yok Ã¢â‚¬â€ yeni kampanya ÃƒÂ¶ner'}

JSON (TÃƒÂ¼rkÃƒÂ§e yaz):
{
  "overallScore": 7,
  "issues": ["CTR %0.5 altÃ„Â±nda - hedef kitle geniÃ…Å¸ tutulmuÃ…Å¸", "BÃƒÂ¼tÃƒÂ§e verimsiz kullanÃ„Â±lÃ„Â±yor"],
  "opportunities": ["Benzer kitle (Lookalike) oluÃ…Å¸turulabilir", "Video reklam denenebilir"],
  "recommendations": ["Hedef yaÃ…Å¸ aralÃ„Â±Ã„Å¸Ã„Â±nÃ„Â± 30-45 olarak daralt", "Reklam gÃƒÂ¶rseli deÃ„Å¸iÃ…Å¸tirilmeli", "A/B test baÃ…Å¸lat"],
  "alertLevel": "high",
  "summary": "Kampanyalar genel olarak dÃƒÂ¼Ã…Å¸ÃƒÂ¼k performans gÃƒÂ¶steriyor. CTR ve dÃƒÂ¶nÃƒÂ¼Ã…Å¸ÃƒÂ¼m oranlarÃ„Â± sektÃƒÂ¶r ortalamasÃ„Â±nÃ„Â±n altÃ„Â±nda.",
  "budgetSuggestion": "GÃƒÂ¼nlÃƒÂ¼k bÃƒÂ¼tÃƒÂ§eyi $20 artÃ„Â±r ve performanslÃ„Â± reklam setine yÃƒÂ¶nlendir",
  "audienceSuggestion": "Ã„Â°stanbul, Ankara, 28-45 yaÃ…Å¸, mobilya ve ev dekorasyon ilgisi"
}`
      }]
    });

    const m = aiResp.content[0]?.text?.match(/\{[\s\S]*\}/);
    const analysis = m ? JSON.parse(m[0]) : null;

    // Analizi kaydet
    try {
      await supabase.from('ad_analyses').insert([{
        user_id: req.userId,
        ad_account_id: accountId,
        campaigns_analyzed: campaigns.length,
        analysis: JSON.stringify(analysis),
        analyzed_at: new Date().toISOString(),
      }]);
    } catch {}

    res.json({ campaigns, analysis, total: campaigns.length });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message, details: e.response?.data?.error });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬ KAMPANYA OLUÃ…Å¾TUR Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
router.post('/create-campaign', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabÃ„Â± baÃ„Å¸lÃ„Â± deÃ„Å¸il' });

    const token = conn.access_token;
    const { adAccountId, name, objective, dailyBudget, targetCountries, targetAgeMin, targetAgeMax, interests } = req.body;

    // Kampanya oluÃ…Å¸tur
    const campResp = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      { name, objective: objective || 'OUTCOME_LEADS', status: 'PAUSED', special_ad_categories: [] },
      { params: { access_token: token } }
    );
    const campaignId = campResp.data.id;

    // Ad Set oluÃ…Å¸tur Ã¢â‚¬â€ objective'e gÃƒÂ¶re doÃ„Å¸ru optimization_goal seÃƒÂ§
    const objectiveGoalMap: Record<string, {optimization_goal: string, billing_event: string}> = {
      'OUTCOME_LEADS': { optimization_goal: 'LEAD_GENERATION', billing_event: 'IMPRESSIONS' },
      'OUTCOME_TRAFFIC': { optimization_goal: 'LINK_CLICKS', billing_event: 'LINK_CLICKS' },
      'OUTCOME_AWARENESS': { optimization_goal: 'REACH', billing_event: 'IMPRESSIONS' },
      'OUTCOME_SALES': { optimization_goal: 'OFFSITE_CONVERSIONS', billing_event: 'IMPRESSIONS' },
    };
    const goalConfig = objectiveGoalMap[objective] || objectiveGoalMap['OUTCOME_AWARENESS'];

    const adSetResp = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/adsets`,
      {
        name: `${name} - Hedef Kitle`,
        campaign_id: campaignId,
        daily_budget: Math.max(100, parseInt(dailyBudget) * 100),
        is_adset_budget_sharing_enabled: false,
        billing_event: goalConfig.billing_event,
        optimization_goal: goalConfig.optimization_goal,
        status: 'PAUSED',
        targeting: {
          geo_locations: { countries: targetCountries || ['TR'] },
          age_min: targetAgeMin || 25,
          age_max: targetAgeMax || 55,
        },
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

    res.json({ campaignId, adSetId: adSetResp.data?.id, message: 'Kampanya oluÃ…Å¸turuldu!' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message, details: e.response?.data?.error });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬ LEAD ADS'DAN LEAD Ãƒâ€¡EK Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
router.get('/leads/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabÃ„Â± baÃ„Å¸lÃ„Â± deÃ„Å¸il' });

    const token = conn.access_token;
    const accountId = req.params.adAccountId;

    // Lead formlarÃ„Â±nÃ„Â± bul
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
    res.status(500).json({ error: e.response?.data?.error?.message || e.message, details: e.response?.data?.error });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬ 7/24 Ã„Â°ZLEME Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
router.get('/monitor/:adAccountId', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections')
      .select('access_token').eq('user_id', req.userId).single();
    if (!conn) return res.status(401).json({ error: 'Meta hesabÃ„Â± baÃ„Å¸lÃ„Â± deÃ„Å¸il' });

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
        alerts.push({ campaignId: camp.id, name: camp.name, type: 'low_ctr', message: `CTR ÃƒÂ§ok dÃƒÂ¼Ã…Å¸ÃƒÂ¼k: %${ctr.toFixed(2)} Ã¢â‚¬â€ Hedef kitle veya reklam metni deÃ„Å¸iÃ…Å¸tirilmeli`, severity: 'high' });
      }
      if (spend > 0 && parseInt(ins.clicks || '0') === 0) {
        alerts.push({ campaignId: camp.id, name: camp.name, type: 'no_clicks', message: 'Harcama var ama tÃ„Â±klama yok Ã¢â‚¬â€ Reklam gÃƒÂ¶rsel/metni ilgi ÃƒÂ§ekmiyor', severity: 'critical' });
      }
      if (ctr > 3) {
        alerts.push({ campaignId: camp.id, name: camp.name, type: 'high_performance', message: `MÃƒÂ¼kemmel performans! CTR: %${ctr.toFixed(2)} Ã¢â‚¬â€ BÃƒÂ¼tÃƒÂ§eyi artÃ„Â±rabilirsiniz`, severity: 'positive' });
      }
    }

    // Alertleri kaydet
    if (alerts.length > 0) {
      try {
        await supabase.from('ad_alerts').insert(alerts.map((a: any) => ({
          user_id: req.userId, ...a, checked_at: new Date().toISOString()
        })));
      } catch {}
    }

    res.json({ campaigns: campResp.data?.data || [], alerts, monitored: campResp.data?.data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message, details: e.response?.data?.error });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬ AI OPTÃ„Â°MÃ„Â°ZASYON Ãƒâ€“NERÃ„Â°SÃ„Â° Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
        content: `Bu Meta reklam kampanyasÃ„Â±nÃ„Â± optimize et. Hedef: ${goal || 'daha fazla lead'}

Kampanya verisi: ${JSON.stringify(campaignData)}

JSON dÃƒÂ¶ndÃƒÂ¼r:
{
  "budgetChange": "+20% artÃ„Â±r veya -10% azalt",
  "audienceChange": "25-45 yaÃ…Å¸, Ã„Â°stanbul, mobilya ilgisi ekle",
  "adCopyChange": "BaÃ…Å¸lÃ„Â±Ã„Å¸Ã„Â± Ã…Å¸ÃƒÂ¶yle deÃ„Å¸iÃ…Å¸tir: ...",
  "scheduleChange": "Hafta iÃƒÂ§i 9-18 arasÃ„Â± yayÃ„Â±nla",
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

// Ã¢â€â‚¬Ã¢â€â‚¬ STATS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

// Her 2 saatte bir tÃƒÂ¼m baÃ„Å¸lÃ„Â± hesaplarÃ„Â± izle
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
              try {
                await supabase.from('ad_alerts').insert([{
                  user_id: conn.user_id,
                  campaign_id: camp.id,
                  name: camp.name,
                  type: 'low_ctr',
                  message: `CTR ÃƒÂ§ok dÃƒÂ¼Ã…Å¸ÃƒÂ¼k: %${ctr.toFixed(2)} Ã¢â‚¬â€ Acil optimizasyon gerekiyor`,
                  severity: 'high',
                  checked_at: new Date().toISOString(),
                }]);
              } catch {}
            }
          }
          await new Promise(r => setTimeout(r, 1000));
        } catch {}
      }
    }
  } catch {}
}, 2 * 60 * 60 * 1000);

module.exports = router; 
