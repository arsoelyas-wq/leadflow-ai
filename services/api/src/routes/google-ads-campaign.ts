export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v17';
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

// ── HELPER: Kullanici Google Ads credentials al ──────────────────────────────

async function getUserCreds(userId: string): Promise<{ accessToken: string; customerId: string } | null> {
  try {
    const { data, error } = await supabase
      .from('google_ads_connections')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (error || !data || !data.access_token) return null;

    // customerId: stored ad_accounts JSON'dan al
    let customerId = '';
    try {
      const accounts = JSON.parse(data.ad_accounts || '[]');
      customerId = accounts[0]?.id || '';
    } catch {}

    // customerId hala yoksa Google Ads API'dan dinamik cek
    if (!customerId && DEVELOPER_TOKEN) {
      try {
        const r = await axios.get(`${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
            'developer-token': DEVELOPER_TOKEN,
          },
          timeout: 10000,
        });
        const ids: string[] = (r.data?.resourceNames || []).map((n: string) => n.replace('customers/', ''));
        customerId = ids[0] || '';
      } catch (fetchErr: any) {
        console.log('[GoogleAdsCampaign] listAccessibleCustomers skip:', fetchErr.response?.data?.error?.message || fetchErr.message);
      }
    }

    // Token expire olduysa refresh_token ile yenile
    if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
      if (!data.refresh_token) return null;
      try {
        const r = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: data.refresh_token,
          grant_type: 'refresh_token',
        });
        const newToken: string = r.data.access_token;
        const expiresAt = new Date(Date.now() + (r.data.expires_in || 3600) * 1000).toISOString();
        await supabase
          .from('google_ads_connections')
          .update({ access_token: newToken, token_expires_at: expiresAt })
          .eq('user_id', userId);
        return { accessToken: newToken, customerId };
      } catch (refreshErr: any) {
        console.error('[GoogleAdsCampaign] Token refresh hata:', refreshErr.message);
        return null;
      }
    }

    return { accessToken: data.access_token, customerId };
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] getUserCreds hata:', e.message);
    return null;
  }
}

// ── HELPER: Google Ads istek headerlari ─────────────────────────────────────

function gHeaders(token: string, cid: string): object {
  return {
    Authorization: `Bearer ${token}`,
    'developer-token': DEVELOPER_TOKEN,
    'login-customer-id': cid.replace('customers/', '').replace(/-/g, ''),
    'Content-Type': 'application/json',
  };
}

// ── HELPER: Campaign Budget olustur ─────────────────────────────────────────

async function createBudget(
  cid: string,
  token: string,
  name: string,
  dailyBudget: number
): Promise<string> {
  const resp = await axios.post(
    `${GOOGLE_ADS_BASE}/customers/${cid}/campaignBudgets:mutate`,
    {
      operations: [
        {
          create: {
            name: `${name} Budget`,
            amountMicros: Math.round(dailyBudget * 1_000_000),
            deliveryMethod: 'STANDARD',
          },
        },
      ],
    },
    { headers: gHeaders(token, cid), timeout: 15000 }
  );
  return resp.data?.results?.[0]?.resourceName || '';
}

// ── HELPER: Campaign olustur ─────────────────────────────────────────────────

async function createGoogleCampaign(
  cid: string,
  token: string,
  name: string,
  budgetResource: string,
  goal: string
): Promise<string> {
  // Hedef -> bid strategy mapping
  let biddingStrategy: any = {};
  const g = (goal || '').toLowerCase();
  if (g === 'sales' || g === 'calls' || g === 'leads') {
    biddingStrategy = { maximizeConversions: {} };
  } else if (g === 'traffic') {
    biddingStrategy = { maximizeClicks: {} };
  } else {
    biddingStrategy = { maximizeConversions: {} };
  }

  const resp = await axios.post(
    `${GOOGLE_ADS_BASE}/customers/${cid}/campaigns:mutate`,
    {
      operations: [
        {
          create: {
            name,
            status: 'ENABLED',
            advertisingChannelType: 'SEARCH',
            campaignBudget: budgetResource,
            networkSettings: {
              targetGoogleSearch: true,
              targetSearchNetwork: true,
              targetContentNetwork: false,
            },
            ...biddingStrategy,
          },
        },
      ],
    },
    { headers: gHeaders(token, cid), timeout: 15000 }
  );
  return resp.data?.results?.[0]?.resourceName || '';
}

// ── HELPER: Ad Group olustur ─────────────────────────────────────────────────

async function createAdGroup(
  cid: string,
  token: string,
  campaignResource: string,
  name: string,
  cpcBid: number
): Promise<string> {
  const resp = await axios.post(
    `${GOOGLE_ADS_BASE}/customers/${cid}/adGroups:mutate`,
    {
      operations: [
        {
          create: {
            name,
            campaign: campaignResource,
            type: 'SEARCH_STANDARD',
            cpcBidMicros: Math.round(cpcBid * 1_000_000),
            status: 'ENABLED',
          },
        },
      ],
    },
    { headers: gHeaders(token, cid), timeout: 15000 }
  );
  return resp.data?.results?.[0]?.resourceName || '';
}

// ── HELPER: Keywords ekle ────────────────────────────────────────────────────

async function addKeywords(
  cid: string,
  token: string,
  adGroupResource: string,
  keywords: any[]
): Promise<void> {
  if (!keywords || keywords.length === 0) return;

  const operations = keywords.map((kw: any) => ({
    create: {
      adGroup: adGroupResource,
      status: 'ENABLED',
      keyword: {
        text: kw.text || kw.keyword || kw,
        matchType: kw.matchType || kw.match_type || 'BROAD',
      },
    },
  }));

  await axios.post(
    `${GOOGLE_ADS_BASE}/customers/${cid}/adGroupCriteria:mutate`,
    { operations },
    { headers: gHeaders(token, cid), timeout: 15000 }
  );
}

// ── HELPER: Negative keywords ekle ──────────────────────────────────────────

async function addNegativeKeywords(
  cid: string,
  token: string,
  campaignResource: string,
  negatives: string[]
): Promise<void> {
  if (!negatives || negatives.length === 0) return;

  const operations = negatives.map((kw: string) => ({
    create: {
      campaign: campaignResource,
      negative: true,
      keyword: {
        text: kw,
        matchType: 'BROAD',
      },
    },
  }));

  await axios.post(
    `${GOOGLE_ADS_BASE}/customers/${cid}/campaignCriteria:mutate`,
    { operations },
    { headers: gHeaders(token, cid), timeout: 15000 }
  );
}

// ── HELPER: Responsive Search Ad olustur ────────────────────────────────────

async function createRSA(
  cid: string,
  token: string,
  adGroupResource: string,
  ad: any,
  finalUrl: string
): Promise<void> {
  // Headlines: max 30 karakter, max 15 adet
  const rawHeadlines: string[] = (ad.headlines || []).slice(0, 15);
  const headlines = rawHeadlines.map((h: string, i: number) => ({
    text: h.slice(0, 30),
    pinnedField: i === 0 ? 'HEADLINE_1' : i === 1 ? 'HEADLINE_2' : undefined,
  })).map((h: any) => {
    if (!h.pinnedField) delete h.pinnedField;
    return h;
  });

  // Descriptions: max 90 karakter, max 4 adet
  const rawDescs: string[] = (ad.descriptions || []).slice(0, 4);
  const descriptions = rawDescs.map((d: string, i: number) => ({
    text: d.slice(0, 90),
    pinnedField: i === 0 ? 'DESCRIPTION_1' : i === 1 ? 'DESCRIPTION_2' : undefined,
  })).map((d: any) => {
    if (!d.pinnedField) delete d.pinnedField;
    return d;
  });

  if (headlines.length === 0 || descriptions.length === 0) return;

  const rsaAd: any = {
    headlines,
    descriptions,
  };

  if (ad.display_path && ad.display_path.length > 0) {
    rsaAd.path1 = (ad.display_path[0] || '').slice(0, 15);
    if (ad.display_path[1]) rsaAd.path2 = (ad.display_path[1] || '').slice(0, 15);
  }

  await axios.post(
    `${GOOGLE_ADS_BASE}/customers/${cid}/adGroupAds:mutate`,
    {
      operations: [
        {
          create: {
            adGroup: adGroupResource,
            status: 'ENABLED',
            ad: {
              finalUrls: [finalUrl],
              responsiveSearchAd: rsaAd,
            },
          },
        },
      ],
    },
    { headers: gHeaders(token, cid), timeout: 15000 }
  );
}

// ── ROUTE: POST /analyze-business ───────────────────────────────────────────

router.post('/analyze-business', async (req: any, res: any) => {
  try {
    const {
      businessDescription,
      product,
      differentiator,
      targetCustomer,
      budget,
      location,
      language,
      goal,
      websiteUrl,
    } = req.body;

    if (!businessDescription || !product) {
      return res.status(400).json({ error: 'businessDescription ve product zorunlu' });
    }

    const userMessage = `You are creating a Google Ads campaign for the following business:

Business Description: ${businessDescription}
Product/Service: ${product}
Unique Differentiator: ${differentiator || 'Not specified'}
Target Customer: ${targetCustomer || 'Not specified'}
Monthly Budget: $${budget || 500}
Target Location: ${location || 'Not specified'}
Target Language: ${language || 'English'}
Campaign Goal: ${goal || 'leads'}
Website URL: ${websiteUrl || 'Not specified'}

Create a complete, highly optimized Google Ads campaign plan. All headlines MUST be under 30 characters. All descriptions MUST be under 90 characters. Include 15-20 keywords organized into 2-3 tightly themed ad groups. Include 8-10 negative keywords to prevent wasted spend. Keywords and ads must be in the target language (${language || 'English'}).

Return ONLY valid JSON with this exact structure:
{
  "campaign_name": "string",
  "campaign_type": "SEARCH",
  "bid_strategy": "MAXIMIZE_CONVERSIONS",
  "keywords": [
    {"keyword": "string", "match_type": "BROAD|PHRASE|EXACT", "estimated_cpc": 0.50, "intent": "commercial|informational|transactional"}
  ],
  "negative_keywords": ["string"],
  "ad_groups": [
    {
      "name": "string",
      "theme": "string",
      "keywords": ["string"],
      "cpc_bid": 1.0,
      "ads": [
        {
          "headlines": ["max 30 chars each", "headline2", "headline3", "headline4", "headline5"],
          "descriptions": ["max 90 chars each - include CTA", "description2"],
          "display_path": ["path1", "path2"]
        }
      ]
    }
  ],
  "budget_recommendation": {
    "daily_budget": 50,
    "monthly_estimate": 1500,
    "expected_clicks": 1000,
    "expected_conversions": 30,
    "expected_impressions": 15000
  },
  "targeting": {
    "locations": ["string"],
    "languages": ["string"],
    "device_bid_adjustments": {"mobile": 1.1, "desktop": 1.0, "tablet": 0.9}
  },
  "quality_score_tips": ["tip1", "tip2", "tip3"],
  "expert_notes": "string"
}`;

    const aiResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: "You are the world's leading Google Ads expert with 15+ years managing $500M+ in ad spend. Create complete, highly optimized campaigns that achieve Quality Score 8-10 from day one. Focus on: keyword-ad-landing page relevance trifecta, compelling RSA copy with clear CTAs, negative keyword prevention of wasted spend, and bid strategy matched to conversion goals. Output ONLY valid JSON.",
      messages: [{ role: 'user', content: userMessage }],
    });

    const text: string = aiResp.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[GoogleAdsCampaign] Claude JSON parse hata, raw:', text.slice(0, 200));
      return res.status(500).json({ error: 'AI yaniti JSON formatinda degil' });
    }

    let plan: any;
    try {
      plan = JSON.parse(match[0]);
    } catch (parseErr: any) {
      console.error('[GoogleAdsCampaign] JSON.parse hata:', parseErr.message);
      return res.status(500).json({ error: 'AI yaniti parse edilemedi' });
    }

    return res.json({ ok: true, plan });
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] analyze-business hata:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── ROUTE: POST /create ──────────────────────────────────────────────────────

router.post('/create', async (req: any, res: any) => {
  try {
    const { campaignPlan: plan, finalUrl, goal: userGoal } = req.body;

    if (!plan) return res.status(400).json({ error: 'campaignPlan zorunlu' });

    const goalValue = userGoal || plan.bid_strategy || 'MAXIMIZE_CONVERSIONS';
    const creds = await getUserCreds(req.userId);
    const rawCustomerId: string = creds?.customerId || '';
    const cid = rawCustomerId.replace('customers/', '').replace(/-/g, '');

    // Creds veya customerId yoksa draft olarak kaydet
    if (!creds || !cid) {
      const { data: savedRow, error: insertErr } = await supabase
        .from('google_campaigns')
        .insert([{
          user_id: req.userId,
          name: plan.campaign_name || 'Yeni Kampanya',
          status: 'draft',
          goal: goalValue,
          daily_budget: plan.budget_recommendation?.daily_budget || 0,
          campaign_plan: plan,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (insertErr) console.error('[GoogleAdsCampaign] Draft kayit hata:', insertErr.message);

      return res.json({
        ok: true,
        campaign: savedRow,
        mode: 'draft',
        message: 'Kampanya plani kaydedildi. Google Ads API baglantisi kurulunca otomatik aktive edilecek.',
      });
    }

    // Google Ads API ile gercek kampanya olusturma
    let campaignResourceName = '';
    let apiMode = 'live';

    try {
      const token = creds.accessToken;
      const dailyBudget = plan.budget_recommendation?.daily_budget || 10;
      const campaignName = plan.campaign_name || 'LeadFlow Kampanyasi';

      // 1. Budget olustur
      const budgetResource = await createBudget(cid, token, campaignName, dailyBudget);

      // 2. Campaign olustur
      campaignResourceName = await createGoogleCampaign(cid, token, campaignName, budgetResource, goalValue);

      // 3. Ad Groups, Keywords ve RSA'lar
      for (const adGroup of (plan.ad_groups || [])) {
        try {
          const adGroupResource = await createAdGroup(
            cid, token, campaignResourceName,
            adGroup.name || 'Ad Group', adGroup.cpc_bid || 1.0
          );

          // Keywords
          if (adGroup.keywords && adGroup.keywords.length > 0) {
            const kwObjects = adGroup.keywords.map((kw: any) => ({
              text: typeof kw === 'string' ? kw : kw.keyword || String(kw),
              matchType: kw.match_type || 'BROAD',
            }));
            await addKeywords(cid, token, adGroupResource, kwObjects).catch((kwErr: any) => {
              console.error('[GoogleAdsCampaign] addKeywords hata:', kwErr.response?.data || kwErr.message);
            });
          }

          // RSA ads
          for (const ad of (adGroup.ads || [])) {
            await createRSA(cid, token, adGroupResource, ad, finalUrl || '').catch((rsaErr: any) => {
              console.error('[GoogleAdsCampaign] createRSA hata:', rsaErr.response?.data || rsaErr.message);
            });
          }
        } catch (agErr: any) {
          console.error('[GoogleAdsCampaign] AdGroup hata:', agErr.response?.data || agErr.message);
        }
      }

      // 4. Negative keywords
      if (plan.negative_keywords && plan.negative_keywords.length > 0) {
        await addNegativeKeywords(cid, token, campaignResourceName, plan.negative_keywords).catch((negErr: any) => {
          console.error('[GoogleAdsCampaign] addNegativeKeywords hata:', negErr.response?.data || negErr.message);
        });
      }

    } catch (apiErr: any) {
      const errMsg = apiErr.response?.data?.[0]?.error?.message || apiErr.response?.data?.error?.message || apiErr.message || '';
      console.error('[GoogleAdsCampaign] Google Ads API hata:', errMsg);
      apiMode = 'pending_api';

      const { data: pendingRow, error: pendingErr } = await supabase
        .from('google_campaigns')
        .insert([{
          user_id: req.userId,
          name: plan.campaign_name || 'Yeni Kampanya',
          status: 'pending_api',
          goal: goalValue,
          daily_budget: plan.budget_recommendation?.daily_budget || 0,
          campaign_plan: plan,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (pendingErr) console.error('[GoogleAdsCampaign] Pending kayit hata:', pendingErr.message);

      return res.json({
        ok: true,
        campaign: pendingRow,
        mode: 'pending_api',
        message: 'Kampanya plani kaydedildi. Google Ads API onaylama sureci tamamlaninca aktive edilecek.',
      });
    }

    // Basarili: DB'ye kaydet
    const { data: savedRow, error: saveErr } = await supabase
      .from('google_campaigns')
      .insert([{
        user_id: req.userId,
        google_campaign_id: campaignResourceName,
        name: plan.campaign_name || 'LeadFlow Kampanyasi',
        status: 'active',
        goal: goalValue,
        daily_budget: plan.budget_recommendation?.daily_budget || 0,
        campaign_plan: plan,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (saveErr) console.error('[GoogleAdsCampaign] Active kayit hata:', saveErr.message);

    return res.json({ ok: true, campaign: savedRow, mode: apiMode });
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] create hata:', e.message);
    try {
      const { campaignPlan: plan, goal: userGoal } = req.body;
      const { data: fallbackRow } = await supabase
        .from('google_campaigns')
        .insert([{
          user_id: req.userId,
          name: plan?.campaign_name || 'Yeni Kampanya',
          status: 'draft',
          goal: userGoal || plan?.bid_strategy || 'MAXIMIZE_CONVERSIONS',
          daily_budget: plan?.budget_recommendation?.daily_budget || 0,
          campaign_plan: plan || {},
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      return res.json({ ok: true, campaign: fallbackRow, mode: 'draft', message: 'Kampanya plani kaydedildi.' });
    } catch {
      return res.json({ ok: true, mode: 'draft', message: 'Kampanya plani alindi.' });
    }
  }
});

// ── ROUTE: GET /list ─────────────────────────────────────────────────────────

router.get('/list', async (req: any, res: any) => {
  try {
    const { data: campaigns, error } = await supabase
      .from('google_campaigns')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GoogleAdsCampaign] list hata:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ campaigns: campaigns || [] });
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] list catch hata:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── ROUTE: GET /performance/:campaignId ─────────────────────────────────────

router.get('/performance/:campaignId', async (req: any, res: any) => {
  try {
    const { campaignId } = req.params;

    const { data: campaign, error: fetchErr } = await supabase
      .from('google_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', req.userId)
      .single();

    if (fetchErr || !campaign) {
      return res.status(404).json({ error: 'Kampanya bulunamadi' });
    }

    let performance: any = null;

    // Canli performans: creds ve google_campaign_id varsa cek
    if (campaign.google_campaign_id) {
      const creds = await getUserCreds(req.userId);
      if (creds) {
        try {
          const { accessToken, customerId } = creds;
          const cid = customerId.replace('customers/', '').replace(/-/g, '');
          const resourceId = campaign.google_campaign_id.split('/').pop() || '';

          if (cid && resourceId) {
            const perfResp = await axios.post(
              `${GOOGLE_ADS_BASE}/customers/${cid}/googleAds:search`,
              {
                query: `SELECT
                  campaign.id,
                  campaign.name,
                  campaign.status,
                  metrics.impressions,
                  metrics.clicks,
                  metrics.cost_micros,
                  metrics.ctr,
                  metrics.average_cpc,
                  metrics.conversions,
                  metrics.cost_per_conversion,
                  metrics.interaction_rate
                FROM campaign
                WHERE campaign.id = ${resourceId}
                  AND segments.date DURING LAST_30_DAYS`,
              },
              {
                headers: gHeaders(accessToken, cid),
                timeout: 15000,
              }
            );

            const rows = perfResp.data?.results || [];
            if (rows.length > 0) {
              const r = rows[0];
              performance = {
                impressions: r.metrics?.impressions || 0,
                clicks: r.metrics?.clicks || 0,
                spend: ((r.metrics?.costMicros || 0) / 1_000_000).toFixed(2),
                ctr: (((r.metrics?.ctr || 0) * 100)).toFixed(2),
                avg_cpc: ((r.metrics?.averageCpc || 0) / 1_000_000).toFixed(2),
                conversions: r.metrics?.conversions || 0,
                cost_per_conversion: ((r.metrics?.costPerConversion || 0) / 1_000_000).toFixed(2),
                interaction_rate: (((r.metrics?.interactionRate || 0) * 100)).toFixed(2),
                status: r.campaign?.status,
              };
            }
          }
        } catch (perfErr: any) {
          console.log('[GoogleAdsCampaign] Canli performans cekme hata:', perfErr.response?.data?.error?.message || perfErr.message);
        }
      }
    }

    return res.json({ ok: true, campaign, performance });
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] performance hata:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── ROUTE: POST /auto-optimize ───────────────────────────────────────────────

router.post('/auto-optimize', async (req: any, res: any) => {
  try {
    const { data: campaigns, error: fetchErr } = await supabase
      .from('google_campaigns')
      .select('*')
      .eq('user_id', req.userId)
      .neq('status', 'draft');

    if (fetchErr) {
      return res.status(500).json({ error: fetchErr.message });
    }

    const creds = await getUserCreds(req.userId);
    let optimized = 0;
    const actions: any[] = [];

    for (const campaign of (campaigns || [])) {
      try {
        let performanceData: any = null;

        // Canli performans verisi cek
        if (campaign.google_campaign_id && creds) {
          try {
            const { accessToken, customerId } = creds;
            const cid = customerId.replace('customers/', '').replace(/-/g, '');
            const resourceId = campaign.google_campaign_id.split('/').pop() || '';

            if (cid && resourceId) {
              const perfResp = await axios.post(
                `${GOOGLE_ADS_BASE}/customers/${cid}/googleAds:search`,
                {
                  query: `SELECT
                    campaign.id,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.ctr,
                    metrics.conversions,
                    metrics.cost_per_conversion,
                    metrics.average_cpc
                  FROM campaign
                  WHERE campaign.id = ${resourceId}
                    AND segments.date DURING LAST_7_DAYS`,
                },
                { headers: gHeaders(accessToken, cid), timeout: 15000 }
              );

              const rows = perfResp.data?.results || [];
              if (rows.length > 0) {
                const m = rows[0].metrics;
                performanceData = {
                  clicks: m?.clicks || 0,
                  impressions: m?.impressions || 0,
                  spend: ((m?.costMicros || 0) / 1_000_000).toFixed(2),
                  ctr: (((m?.ctr || 0) * 100)).toFixed(3),
                  conversions: m?.conversions || 0,
                  cost_per_conversion: ((m?.costPerConversion || 0) / 1_000_000).toFixed(2),
                  avg_cpc: ((m?.averageCpc || 0) / 1_000_000).toFixed(2),
                };
              }
            }
          } catch (liveErr: any) {
            console.log('[GoogleAdsCampaign] auto-optimize live perf hata:', liveErr.message);
          }
        }

        // clicks > 100 sartini kontrol et
        const clicks = performanceData?.clicks || 0;
        if (clicks <= 100) continue;

        // AI ile optimizasyon onerisi al
        const aiResp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          messages: [
            {
              role: 'user',
              content: `Google Ads kampanya optimizasyonu:
Kampanya: ${campaign.name}
Hedef: ${campaign.goal || 'MAXIMIZE_CONVERSIONS'}
Son 7 Gun Performans:
- Tiklama: ${performanceData.clicks}
- Gosterim: ${performanceData.impressions}
- Harcama: $${performanceData.spend}
- CTR: %${performanceData.ctr}
- Donusum: ${performanceData.conversions}
- Donusum Maliyeti: $${performanceData.cost_per_conversion}
- Ort. CPC: $${performanceData.avg_cpc}

JSON ile 3 somut optimizasyon onerisi ver:
{"recommendations":[{"action":"string","reason":"string","priority":"high|medium|low"}],"overall_health":"good|warning|critical","summary":"string"}`,
            },
          ],
        });

        const aiText: string = aiResp.content?.[0]?.text || '';
        const aiMatch = aiText.match(/\{[\s\S]*\}/);
        let optimizationResult: any = { recommendations: [], summary: aiText.slice(0, 200) };
        if (aiMatch) {
          try {
            optimizationResult = JSON.parse(aiMatch[0]);
          } catch {}
        }

        // Log'a kaydet
        for (const rec of (optimizationResult.recommendations || [])) {
          const { error: logErr } = await supabase
            .from('google_optimization_logs')
            .insert([{
              campaign_id: campaign.id,
              user_id: req.userId,
              action: rec.action || '',
              reason: rec.reason || '',
              result: JSON.stringify(optimizationResult),
              created_at: new Date().toISOString(),
            }]);

          if (logErr) console.error('[GoogleAdsCampaign] Optimization log kayit hata:', logErr.message);

          actions.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            action: rec.action,
            reason: rec.reason,
            priority: rec.priority,
          });
        }

        optimized++;
      } catch (campErr: any) {
        console.error('[GoogleAdsCampaign] auto-optimize kampanya hata:', campErr.message);
      }
    }

    return res.json({ ok: true, optimized, actions });
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] auto-optimize hata:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── ROUTE: POST /generate-keywords ──────────────────────────────────────────

router.post('/generate-keywords', async (req: any, res: any) => {
  try {
    const { businessType, product, location, language } = req.body;

    if (!businessType || !product) {
      return res.status(400).json({ error: 'businessType ve product zorunlu' });
    }

    const aiResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Google Ads anahtar kelime uzmani olarak su isletme icin 50 anahtar kelime uret:

Isletme Turu: ${businessType}
Urun/Hizmet: ${product}
Konum: ${location || 'Turkiye'}
Dil: ${language || 'Turkce'}

50 anahtar kelimeyi 3 intent grubuna ayir (informational, commercial, transactional). Her kelime icin match type belirt.

JSON formatinda don:
{
  "keywords": [
    {
      "keyword": "string",
      "match_type": "BROAD|PHRASE|EXACT",
      "intent": "informational|commercial|transactional",
      "estimated_cpc": 0.50,
      "competition": "low|medium|high"
    }
  ],
  "groups": {
    "informational": ["keyword1", "keyword2"],
    "commercial": ["keyword1", "keyword2"],
    "transactional": ["keyword1", "keyword2"]
  },
  "negative_suggestions": ["negatif1", "negatif2", "negatif3"]
}`,
        },
      ],
    });

    const text: string = aiResp.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ error: 'AI yaniti parse edilemedi' });
    }

    let keywords: any;
    try {
      keywords = JSON.parse(match[0]);
    } catch (parseErr: any) {
      console.error('[GoogleAdsCampaign] generate-keywords JSON parse hata:', parseErr.message);
      return res.status(500).json({ error: 'AI yaniti JSON formatinda degil' });
    }

    return res.json({ ok: true, keywords });
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] generate-keywords hata:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── ROUTE: POST /ai-create-simple ───────────────────────────────────────────

router.post('/ai-create-simple', async (req: any, res: any) => {
  try {
    const { websiteUrl, businessDescription, goal, dailyBudget, location, avgDealValue } = req.body;

    let fullDescription = businessDescription || '';

    // If URL provided, try to fetch and extract text
    if (websiteUrl) {
      try {
        const pageResp = await axios.get(websiteUrl, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html: string = pageResp.data || '';
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000);
        fullDescription = `Web sitesi içeriği: ${text}\n\n${businessDescription || ''}`;
      } catch { /* URL erişilemiyorsa description ile devam */ }
    }

    if (!fullDescription.trim()) {
      return res.status(400).json({ ok: false, error: 'İşletme açıklaması gerekli' });
    }

    const goalMap: Record<string, string> = {
      LEADS: 'Daha fazla müşteri adayı (lead) topla',
      CALLS: 'Telefon araması al',
      TRAFFIC: 'Web siteme ziyaretçi çek',
      SALES: 'Satış artır'
    };

    const aiResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: `Sen Google'ın en iyi sertifikalı reklam uzmanısın, Platinum Partner seviyesinde, $50M+ yıllık reklam bütçesi yönetiyorsun. Google'ın Quality Score algoritmasını içinden biliyorsun.

TÜRK PAZARI (HER ZAMAN UYGULA):
- Sadece yüksek niyetli, ticari/işlemsel anahtar kelimeler hedefle
- Mobile-first: Türk kullanıcıların %78'i mobilde
- Türkçe reklam metinleri kullan
- Aciliyet ve sosyal kanıt kullan: "5000+ müşteri", "Ücretsiz danışmanlık", "Hemen ara"
- Fiyat duyarlı pazar: değer mesajı ver
- Gerçekçi TRY TBM: düşük rekabet ≈ 2-5 TRY, yüksek ≈ 10-25 TRY
- Konum: ${location || 'Türkiye'}

Quality Score 8+ hedefle. Sıkı reklam grubu yapısı kullan (tema başına 1 grup).

SADECE geçerli JSON döndür, markdown yok.`,
      messages: [{
        role: 'user',
        content: `İşletme: ${fullDescription}\nHedef: ${goalMap[goal] || goal}\nGünlük Bütçe: ${dailyBudget || 150} TRY\nOrtalama Müşteri Değeri: ${avgDealValue || 'belirtilmedi'} TRY`
      }],
    });

    const text: string = aiResp.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ ok: false, error: 'AI yanıtı işlenemedi' });

    let plan: any;
    try { plan = JSON.parse(match[0]); }
    catch { return res.status(500).json({ ok: false, error: 'AI yanıtı işlenemedi' }); }

    // Save draft to ad_campaigns or google_campaigns
    let draftId = '';
    try {
      const { data: draft } = await supabase.from('ad_campaigns').insert([{
        user_id: (req as any).userId,
        platform: 'google',
        name: plan.campaign_name || 'Google Kampanyası',
        status: 'draft',
        goal: goal || 'LEADS',
        daily_budget: dailyBudget || 150,
        campaign_plan: plan,
        avg_deal_value: avgDealValue || 0,
        created_at: new Date().toISOString(),
      }]).select().single();
      draftId = draft?.id || '';
    } catch { /* ad_campaigns tablosu yoksa devam */ }

    return res.json({ ok: true, draft: { id: draftId, ...plan } });
  } catch (e: any) {
    console.error('[GoogleCampaign] ai-create-simple hata:', e.message);
    return res.status(500).json({ ok: false, error: 'Kampanya planı oluşturulamadı, lütfen tekrar deneyin.' });
  }
});

// ── ROUTE: GET /campaigns-with-roi ──────────────────────────────────────────

router.get('/campaigns-with-roi', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;

    // 1. Fetch google_campaigns for user
    const { data: campaigns } = await supabase
      .from('google_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!campaigns || campaigns.length === 0) {
      return res.json({ ok: true, campaigns: [] });
    }

    // 2. For each campaign, count leads
    const enriched = await Promise.all(campaigns.map(async (camp: any) => {
      try {
        // Count all google-source leads for this user
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .or('source.ilike.google%,source.ilike.google_ads%');

        // Count positive/converted leads
        const { count: positiveLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('outcome', 'positive')
          .or('source.ilike.google%,source.ilike.google_ads%');

        const leads = totalLeads || 0;
        const converted = positiveLeads || 0;
        const avgDeal = camp.avg_deal_value || 0;
        const spend = parseFloat(camp.daily_budget || 0) * 30; // estimate

        // ROI calculation: (conversions * deal_value - spend) / spend * 100
        const revenue = converted * avgDeal;
        const roi = spend > 0 && avgDeal > 0
          ? Math.round((revenue - spend) / spend * 100)
          : null;

        return {
          ...camp,
          leads_count: leads,
          converted_count: converted,
          estimated_revenue: revenue,
          roi_percent: roi,
          spend_estimate: spend,
        };
      } catch {
        return { ...camp, leads_count: 0, converted_count: 0, roi_percent: null };
      }
    }));

    return res.json({ ok: true, campaigns: enriched });
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] campaigns-with-roi hata:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── CRON: 24 saatte bir otomatik optimizasyon ────────────────────────────────

async function runAutoOptimizeCron(): Promise<void> {
  try {
    console.log('[GoogleAdsCampaign] Cron: auto-optimize basliyor...');

    const { data: activeCampaigns, error: fetchErr } = await supabase
      .from('google_campaigns')
      .select('*')
      .eq('status', 'active');

    if (fetchErr) {
      console.error('[GoogleAdsCampaign] Cron: kampanya cekme hata:', fetchErr.message);
      return;
    }

    for (const campaign of (activeCampaigns || [])) {
      try {
        const creds = await getUserCreds(campaign.user_id);
        if (!creds) continue;

        const { accessToken, customerId } = creds;
        const cid = customerId.replace('customers/', '').replace(/-/g, '');
        const resourceId = (campaign.google_campaign_id || '').split('/').pop() || '';

        if (!cid || !resourceId) continue;

        // Hafif performans kontrolu
        let perfData: any = null;
        try {
          const perfResp = await axios.post(
            `${GOOGLE_ADS_BASE}/customers/${cid}/googleAds:search`,
            {
              query: `SELECT
                campaign.id,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.ctr
              FROM campaign
              WHERE campaign.id = ${resourceId}
                AND segments.date DURING LAST_7_DAYS`,
            },
            { headers: gHeaders(accessToken, cid), timeout: 15000 }
          );

          const rows = perfResp.data?.results || [];
          if (rows.length > 0) {
            const m = rows[0].metrics;
            perfData = {
              clicks: m?.clicks || 0,
              spend: ((m?.costMicros || 0) / 1_000_000),
              conversions: m?.conversions || 0,
              ctr: m?.ctr || 0,
            };
          }
        } catch (perfFetchErr: any) {
          console.log('[GoogleAdsCampaign] Cron perf fetch hata:', perfFetchErr.message);
          continue;
        }

        if (!perfData) continue;

        // Basit kural tabanli log: dusuk CTR veya yuksek harcama/0 donusum
        const actionItems: string[] = [];
        if (perfData.ctr < 0.01 && perfData.clicks > 50) {
          actionItems.push('CTR %1in altinda - reklam metinlerini guncelle');
        }
        if (perfData.spend > 100 && perfData.conversions === 0) {
          actionItems.push('$100 uzerinde harcama yapildi ama hic donusum yok - landing page kontrol et');
        }
        if (perfData.clicks > 200 && perfData.conversions > 0) {
          actionItems.push('Yeterli veri mevcut - Smart Bidding aktive edilebilir');
        }

        for (const action of actionItems) {
          await supabase.from('google_optimization_logs').insert([{
            campaign_id: campaign.id,
            user_id: campaign.user_id,
            action,
            reason: 'Otomatik performans analizi',
            result: JSON.stringify(perfData),
            created_at: new Date().toISOString(),
          }]).then(({ error: logErr }: any) => {
            if (logErr) console.error('[GoogleAdsCampaign] Cron log hata:', logErr.message);
          });
        }

        if (actionItems.length > 0) {
          console.log(`[GoogleAdsCampaign] Cron: ${campaign.name} icin ${actionItems.length} aksiyon loglandı`);
        }
      } catch (campCronErr: any) {
        console.error('[GoogleAdsCampaign] Cron kampanya loop hata:', campCronErr.message);
      }
    }

    console.log('[GoogleAdsCampaign] Cron: auto-optimize tamamlandi');
  } catch (e: any) {
    console.error('[GoogleAdsCampaign] Cron genel hata:', e.message);
  }
}

// 24 saatte bir calis
setInterval(runAutoOptimizeCron, 24 * 60 * 60 * 1000);
// Sunucu basladiktan 10 dakika sonra ilk calistirma
setTimeout(runAutoOptimizeCron, 10 * 60 * 1000);

module.exports = router;
