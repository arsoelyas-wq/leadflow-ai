export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const REDIRECT_URI = process.env.GOOGLE_ADS_REDIRECT_URI || 'https://leadflow-ai-web-kappa.vercel.app/api/auth/google-ads/callback';

// OAuth URL
router.get('/oauth-url', async (req: any, res: any) => {
  const scopes = 'https://www.googleapis.com/auth/adwords';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${req.userId}`;
  res.json({ url });
});

// Token Exchange
router.post('/exchange-token', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    // userId: header'dan veya state'den al
    const stateUserId = req.headers['x-user-state'];
    if (stateUserId && stateUserId !== 'undefined' && !req.userId) {
      req.userId = stateUserId;
    }
    if (!req.userId) return res.status(401).json({ error: 'Kullanici kimlik dogrulamasi gerekli' });

    const tokenResp = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
    });

    const { access_token, refresh_token } = tokenResp.data;

    // Kullanıcı bilgisi
    const meResp = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // Google Ads hesaplarını listele
    let accounts = [];
    try {
      const accountsResp = await axios.get(
        'https://googleads.googleapis.com/v14/customers:listAccessibleCustomers',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'developer-token': GOOGLE_DEVELOPER_TOKEN,
          }
        }
      );
      const customerIds = accountsResp.data?.resourceNames?.map((r: string) => r.replace('customers/', '')) || [];
      accounts = customerIds.slice(0, 10).map((id: string) => ({ id, name: `Google Ads Hesap ${id}`, currency: 'USD' }));
    } catch (adsErr: any) {
      console.log('Google Ads accounts fetch skipped:', adsErr.response?.data?.error?.message || adsErr.message);
      // Token exchange basarili ama ads hesaplari alinamadi - yine de kaydet
    }

    // DB'ye kaydet
    await supabase.from('google_ads_connections').upsert([{
      user_id: req.userId,
      google_user_id: meResp.data.id,
      google_user_name: meResp.data.name,
      google_email: meResp.data.email,
      access_token,
      refresh_token,
      ad_accounts: JSON.stringify(accounts),
      connected_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }], { onConflict: 'user_id' });

    res.json({ success: true, userName: meResp.data.name, adAccounts: accounts, message: 'Google Ads hesabi baglandi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.response?.data?.error_description || e.message });
  }
});

// Token yenile
async function refreshGoogleToken(userId: string): Promise<string | null> {
  try {
    const { data: conn } = await supabase.from('google_ads_connections')
      .select('refresh_token, access_token, token_expires_at').eq('user_id', userId).single();
    if (!conn) return null;

    // Token hala geçerliyse döndür
    if (new Date(conn.token_expires_at) > new Date()) return conn.access_token;

    // Refresh
    const resp = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    });

    await supabase.from('google_ads_connections').update({
      access_token: resp.data.access_token,
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    }).eq('user_id', userId);

    return resp.data.access_token;
  } catch { return null; }
}

// Connection
router.get('/connection', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('google_ads_connections').select('*').eq('user_id', req.userId).single();
    if (!data) return res.json({ connected: false });
    res.json({
      connected: true,
      userName: data.google_user_name,
      email: data.google_email,
      adAccounts: JSON.parse(data.ad_accounts || '[]'),
      connectedAt: data.connected_at,
    });
  } catch { res.json({ connected: false }); }
});

// Kampanya Listesi
router.get('/campaigns/:customerId', async (req: any, res: any) => {
  try {
    const token = await refreshGoogleToken(req.userId);
    if (!token) return res.status(401).json({ error: 'Google hesabi bagli degil' });

    const resp = await axios.post(
      `https://googleads.googleapis.com/v14/customers/${req.params.customerId}/googleAds:search`,
      {
        query: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                campaign_budget.amount_micros, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr
                FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.impressions DESC LIMIT 20`
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'developer-token': GOOGLE_DEVELOPER_TOKEN,
          'login-customer-id': req.params.customerId,
        }
      }
    );

    const campaigns = (resp.data?.results || []).map((r: any) => ({
      id: r.campaign?.id,
      name: r.campaign?.name,
      status: r.campaign?.status,
      type: r.campaign?.advertisingChannelType,
      budget: r.campaignBudget?.amountMicros ? parseInt(r.campaignBudget.amountMicros) / 1000000 : 0,
      impressions: r.metrics?.impressions || 0,
      clicks: r.metrics?.clicks || 0,
      spend: r.metrics?.costMicros ? parseInt(r.metrics.costMicros) / 1000000 : 0,
      ctr: r.metrics?.ctr || 0,
    }));

    res.json({ campaigns });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.[0]?.error?.message || e.message });
  }
});

// Kampanya Analizi — AI ile
router.get('/analyze/:customerId', async (req: any, res: any) => {
  try {
    const token = await refreshGoogleToken(req.userId);
    if (!token) return res.status(401).json({ error: 'Google hesabi bagli degil' });

    const resp = await axios.post(
      `https://googleads.googleapis.com/v14/customers/${req.params.customerId}/googleAds:search`,
      {
        query: `SELECT campaign.name, campaign.status, metrics.impressions, metrics.clicks,
                metrics.cost_micros, metrics.ctr, metrics.conversions, metrics.cost_per_conversion
                FROM campaign WHERE segments.date DURING LAST_30_DAYS LIMIT 20`
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'developer-token': GOOGLE_DEVELOPER_TOKEN,
          'login-customer-id': req.params.customerId,
        }
      }
    );

    const campaigns = resp.data?.results || [];
    const summary = campaigns.length > 0
      ? campaigns.map((r: any) => `${r.campaign?.name}: ${r.campaign?.status} | Gosterim: ${r.metrics?.impressions||0} | CTR: %${((r.metrics?.ctr||0)*100).toFixed(2)} | Harcama: $${((r.metrics?.costMicros||0)/1000000).toFixed(2)}`).join('\n')
      : 'Aktif kampanya yok';

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const aiResp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Google Ads uzmani olarak analiz et (Turkce JSON):

${summary}

{"overallScore":7,"issues":["sorun1"],"opportunities":["firsat1"],"recommendations":["oneri1"],"alertLevel":"medium","summary":"ozet","budgetSuggestion":"butce onerisi","keywordSuggestion":"anahtar kelime onerisi"}`
      }]
    });

    const m = aiResp.content[0]?.text?.match(/\{[\s\S]*\}/);
    res.json({ campaigns: campaigns.slice(0, 10), analysis: m ? JSON.parse(m[0]) : null });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.[0]?.error?.message || e.message });
  }
});

// Kampanya Olustur
router.post('/create-campaign', async (req: any, res: any) => {
  try {
    const token = await refreshGoogleToken(req.userId);
    if (!token) return res.status(401).json({ error: 'Google hesabi bagli degil' });

    const { customerId, name, budget, targetLocations } = req.body;

    // Budget olustur
    const budgetResp = await axios.post(
      `https://googleads.googleapis.com/v14/customers/${customerId}/campaignBudgets:mutate`,
      {
        operations: [{
          create: {
            name: `${name} Budget`,
            amountMicros: parseInt(budget) * 1000000,
            deliveryMethod: 'STANDARD',
          }
        }]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'developer-token': GOOGLE_DEVELOPER_TOKEN,
          'login-customer-id': customerId,
        }
      }
    );

    const budgetResourceName = budgetResp.data?.results?.[0]?.resourceName;

    // Kampanya olustur
    const campResp = await axios.post(
      `https://googleads.googleapis.com/v14/customers/${customerId}/campaigns:mutate`,
      {
        operations: [{
          create: {
            name,
            status: 'PAUSED',
            advertisingChannelType: 'SEARCH',
            campaignBudget: budgetResourceName,
            targetSpend: {},
          }
        }]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'developer-token': GOOGLE_DEVELOPER_TOKEN,
          'login-customer-id': customerId,
        }
      }
    );

    const campaignResourceName = campResp.data?.results?.[0]?.resourceName;

    await supabase.from('ad_campaigns').insert([{
      user_id: req.userId,
      platform: 'google',
      campaign_id: campaignResourceName,
      name,
      daily_budget: budget,
      status: 'paused',
      ad_account_id: customerId,
    }]);

    res.json({ campaign: campaignResourceName, message: 'Google Ads kampanyasi olusturuldu!' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.[0]?.error?.message || e.message });
  }
});

// Stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('google_ads_connections')
      .select('google_user_name').eq('user_id', req.userId).single().catch(() => ({ data: null }));
    const { data: campaigns } = await supabase.from('ad_campaigns')
      .select('status').eq('user_id', req.userId).eq('platform', 'google');
    res.json({
      connected: !!conn,
      userName: conn?.google_user_name,
      totalCampaigns: campaigns?.length || 0,
      activeCampaigns: campaigns?.filter((c: any) => c.status === 'active').length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;