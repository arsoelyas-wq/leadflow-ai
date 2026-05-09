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

async function getGoogleToken(userId: string): Promise<{ accessToken: string; customerId: string } | null> {
  const { data } = await supabase.from('google_ads_connections')
    .select('access_token, refresh_token, customer_id, token_expires_at')
    .eq('user_id', userId).single();
  if (!data || !data.customer_id) return null;

  // Token expire olduysa refresh et
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    try {
      const r = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        refresh_token: data.refresh_token, grant_type: 'refresh_token',
      });
      const newToken = r.data.access_token;
      const expiresAt = new Date(Date.now() + r.data.expires_in * 1000).toISOString();
      await supabase.from('google_ads_connections').update({
        access_token: newToken, token_expires_at: expiresAt,
      }).eq('user_id', userId);
      return { accessToken: newToken, customerId: data.customer_id };
    } catch { return null; }
  }

  return { accessToken: data.access_token, customerId: data.customer_id };
}

function googleHeaders(accessToken: string, customerId?: string) {
  const h: any = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
  if (customerId) h['login-customer-id'] = customerId.replace('customers/', '');
  return h;
}

// Google Ads GAQL query
async function gaqlQuery(customerId: string, query: string, accessToken: string) {
  const cid = customerId.replace('customers/', '').replace(/-/g, '');
  const r = await axios.post(
    `${GOOGLE_ADS_BASE}/customers/${cid}/googleAds:searchStream`,
    { query },
    { headers: googleHeaders(accessToken, customerId), timeout: 15000 }
  );
  const results: any[] = [];
  for (const batch of r.data || []) {
    for (const row of batch.results || []) {
      results.push(row);
    }
  }
  return results;
}

// ── LEAD EXTRACTION ──────────────────────────────────────
async function extractGoogleLeads(_userId: string, customerId: string, accessToken: string) {
  const leads: any[] = [];
  const cid = customerId.replace('customers/', '').replace(/-/g, '');

  try {
    // 1. Lead Form Assets
    try {
      const r = await axios.get(
        `${GOOGLE_ADS_BASE}/customers/${cid}/leadFormSubmissions`,
        { headers: googleHeaders(accessToken, customerId), timeout: 15000 }
      );
      for (const sub of r.data?.leadFormSubmissions || []) {
        const fields: any = {};
        for (const f of sub.customLeadFormFields || []) {
          fields[f.questionType?.toLowerCase() || 'field'] = f.stringAnswer;
        }
        leads.push({
          source: 'google_lead_form',
          meta_lead_id: sub.id,
          name: `${sub.firstName || ''} ${sub.lastName || ''}`.trim(),
          email: sub.email,
          phone: sub.phoneNumber,
          company: fields.company_name || fields.business_name,
          campaign_id: sub.campaign,
          created_at: sub.submissionDateTime,
        });
      }
    } catch {}

    // 2. Conversion actions - lead conversions
    try {
      const rows = await gaqlQuery(customerId, `
        SELECT
          conversion_action.name,
          conversion_action.type,
          metrics.conversions,
          metrics.conversion_value,
          campaign.name,
          campaign.id
        FROM conversion_action
        WHERE conversion_action.type IN ('UPLOAD_CLICKS', 'WEBPAGE', 'PHONE_CALL')
          AND metrics.conversions > 0
          AND segments.date DURING LAST_30_DAYS
      `, accessToken);

      for (const row of rows) {
        if (row.metrics?.conversions > 0) {
          leads.push({
            source: 'google_conversion',
            meta_lead_id: `gconv_${row.conversionAction?.resourceName}`,
            name: row.conversionAction?.name,
            company: row.campaign?.name,
            campaign_id: row.campaign?.id,
            conversions: row.metrics?.conversions,
            conversion_value: row.metrics?.conversionValue,
          });
        }
      }
    } catch {}

  } catch (e: any) {
    console.error('[GoogleLeads] Hata:', e.message);
  }

  return leads;
}

async function saveGoogleLeadToCRM(userId: string, lead: any) {
  try {
    if (lead.meta_lead_id) {
      const { data: existing } = await supabase.from('leads')
        .select('id').eq('meta_lead_id', lead.meta_lead_id).eq('user_id', userId).single();
      if (existing) return null;
    }
    const { data: newLead } = await supabase.from('leads').insert([{
      user_id: userId,
      company_name: lead.company || lead.name || 'Google Ads Lead',
      contact_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      meta_lead_id: lead.meta_lead_id,
      status: 'new',
      notes: `Google Ads ${lead.source} - Kampanya: ${lead.company || ''}`,
      created_at: lead.created_at || new Date().toISOString(),
    }]).select().single();
    return newLead;
  } catch { return null; }
}

// ── PERFORMANS ANALİZİ ───────────────────────────────────
async function analyzeGooglePerformance(userId: string, customerId: string, accessToken: string) {
  const alerts: any[] = [];
  try {
    const rows = await gaqlQuery(customerId, `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND segments.date DURING LAST_7_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 20
    `, accessToken);

    for (const row of rows) {
      const ctr = row.metrics?.ctr || 0;
      const impressions = row.metrics?.impressions || 0;
      const costMicros = row.metrics?.costMicros || 0;
      const spend = costMicros / 1000000;
      const clicks = row.metrics?.clicks || 0;
      const avgCpc = (row.metrics?.averageCpc || 0) / 1000000;
      const conversions = row.metrics?.conversions || 0;
      const costPerConversion = (row.metrics?.costPerConversion || 0) / 1000000;

      if (ctr < 0.02 && impressions > 1000) {
        alerts.push({
          type: 'low_ctr', severity: 'warning',
          campaign_id: row.campaign?.id, campaign_name: row.campaign?.name,
          message: `CTR cok dusuk: %${(ctr * 100).toFixed(2)} (Google'da hedef %2-5)`,
          recommendation: 'Reklam basligi ve aciklamasini yenileyin. Anahtar kelimeleri gozden gecirin.',
          value: ctr, platform: 'google',
        });
      }

      if (spend > 50 && conversions === 0) {
        alerts.push({
          type: 'no_conversion', severity: 'critical',
          campaign_id: row.campaign?.id, campaign_name: row.campaign?.name,
          message: `$${spend.toFixed(2)} harcandi ama hic donusum yok`,
          recommendation: 'Landing page ve donusum takibini kontrol edin. Hedef kitleyi daraltın.',
          value: spend, platform: 'google',
        });
      }

      if (avgCpc > 5 && clicks > 20) {
        alerts.push({
          type: 'high_cpc', severity: 'warning',
          campaign_id: row.campaign?.id, campaign_name: row.campaign?.name,
          message: `CPC cok yuksek: $${avgCpc.toFixed(2)}`,
          recommendation: 'Dusuk performansli anahtar kelimeleri negatif listeye alin.',
          value: avgCpc, platform: 'google',
        });
      }

      if (costPerConversion > 100 && conversions > 0) {
        alerts.push({
          type: 'high_cpa', severity: 'warning',
          campaign_id: row.campaign?.id, campaign_name: row.campaign?.name,
          message: `Donusum basina maliyet cok yuksek: $${costPerConversion.toFixed(2)}`,
          recommendation: 'Smart Bidding stratejisini deneyin veya hedef CPA belirleyin.',
          value: costPerConversion, platform: 'google',
        });
      }

      for (const alert of alerts) {
        await supabase.from('ad_alerts').upsert([{
          user_id: userId,
          campaign_id: `google_${alert.campaign_id}`,
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          recommendation: alert.recommendation,
          value: alert.value,
          is_read: false,
          platform: 'google',
          created_at: new Date().toISOString(),
        }], { onConflict: 'user_id,campaign_id,alert_type' });
      }
    }
  } catch (e: any) {
    console.error('[GooglePerf] Hata:', e.message);
  }
  return alerts;
}

// ── ROUTES ───────────────────────────────────────────────

// GET /api/google-intelligence/dashboard
router.get('/dashboard', async (req: any, res: any) => {
  try {
    const tokenData = await getGoogleToken(req.userId);
    if (!tokenData) return res.status(400).json({ error: 'Google Ads bagli degil' });

    const { accessToken, customerId } = tokenData;

    const [accountMetrics, alerts, recentLeads] = await Promise.allSettled([
      gaqlQuery(customerId, `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.conversions,
          metrics.average_cpc
        FROM customer
        WHERE segments.date DURING LAST_30_DAYS
      `, accessToken),
      supabase.from('ad_alerts').select('*').eq('user_id', req.userId).eq('is_read', false).eq('platform', 'google').limit(5),
      supabase.from('leads').select('*').eq('user_id', req.userId).like('source', 'google%').order('created_at', { ascending: false }).limit(10),
    ]);

    const m = accountMetrics.status === 'fulfilled' ? accountMetrics.value[0]?.metrics : null;
    res.json({
      connected: true,
      customerId,
      summary: m ? {
        spend: (m.costMicros || 0) / 1000000,
        impressions: m.impressions || 0,
        clicks: m.clicks || 0,
        ctr: (m.ctr || 0) * 100,
        avg_cpc: (m.averageCpc || 0) / 1000000,
        conversions: m.conversions || 0,
      } : { spend: 0, impressions: 0, clicks: 0, ctr: 0, avg_cpc: 0, conversions: 0 },
      alerts: alerts.status === 'fulfilled' ? alerts.value.data || [] : [],
      recent_leads: recentLeads.status === 'fulfilled' ? recentLeads.value.data || [] : [],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/google-intelligence/campaigns
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const tokenData = await getGoogleToken(req.userId);
    if (!tokenData) return res.status(400).json({ error: 'Google Ads bagli degil' });
    const { accessToken, customerId } = tokenData;

    const rows = await gaqlQuery(customerId, `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.conversions,
        metrics.average_cpc,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date DURING LAST_7_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `, accessToken);

    const campaigns = rows.map((r: any) => ({
      id: r.campaign?.id,
      name: r.campaign?.name,
      status: r.campaign?.status,
      type: r.campaign?.advertisingChannelType,
      bidding: r.campaign?.biddingStrategyType,
      impressions: r.metrics?.impressions || 0,
      clicks: r.metrics?.clicks || 0,
      spend: (r.metrics?.costMicros || 0) / 1000000,
      ctr: ((r.metrics?.ctr || 0) * 100).toFixed(2),
      conversions: r.metrics?.conversions || 0,
      avg_cpc: ((r.metrics?.averageCpc || 0) / 1000000).toFixed(2),
      cost_per_conversion: ((r.metrics?.costPerConversion || 0) / 1000000).toFixed(2),
    }));

    res.json({ campaigns, total: campaigns.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/google-intelligence/extract-leads
router.get('/extract-leads', async (req: any, res: any) => {
  try {
    const tokenData = await getGoogleToken(req.userId);
    if (!tokenData) return res.status(400).json({ error: 'Google Ads bagli degil' });
    const { accessToken, customerId } = tokenData;

    const leads = await extractGoogleLeads(req.userId, customerId, accessToken);
    const { data: settings } = await supabase.from('ad_settings').select('*').eq('user_id', req.userId).single();

    let saved = 0;
    for (const lead of leads) {
      const result = await saveGoogleLeadToCRM(req.userId, lead);
      if (result) {
        saved++;
        // 5 Dakika Kurali
        if (settings?.five_minute_rule !== false && lead.phone) {
          const delay = (settings?.call_delay_minutes || 5) * 60 * 1000;
          const { data: vsettings } = await supabase.from('voice_settings').select('*').eq('user_id', req.userId).single();
          const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();
          setTimeout(async () => {
            try {
              await axios.post(
                'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
                {
                  agent_id: process.env.ELEVENLABS_AGENT_ID,
                  agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
                  to_number: lead.phone,
                  conversation_initiation_client_data: {
                    dynamic_variables: {
                      agent_name: vsettings?.agent_name || 'Satis Temsilcisi',
                      company_name: profile?.company?.name || 'Sirketimiz',
                      product_description: profile?.product?.description || '',
                      lead_name: lead.name || '',
                      lead_company: lead.company || '',
                      language: 'tr',
                      avoid_words: '',
                      opening_line: `Merhaba! Google reklamimizi gordunuz ve ilginizi cekti, kisa bilgi vermek istedim.`,
                    },
                  },
                },
                { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' } }
              );
            } catch {}
          }, delay);
        }
      }
    }

    res.json({ ok: true, total_found: leads.length, new_leads: saved, leads });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/google-intelligence/performance
router.get('/performance', async (req: any, res: any) => {
  try {
    const tokenData = await getGoogleToken(req.userId);
    if (!tokenData) return res.status(400).json({ error: 'Google Ads bagli degil' });
    const { accessToken, customerId } = tokenData;
    const alerts = await analyzeGooglePerformance(req.userId, customerId, accessToken);
    res.json({ ok: true, alerts, total_alerts: alerts.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/google-intelligence/alerts
router.get('/alerts', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_alerts').select('*')
      .eq('user_id', req.userId).eq('is_read', false).eq('platform', 'google')
      .order('created_at', { ascending: false });
    res.json({ alerts: data || [], count: data?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/google-intelligence/ai-optimize
router.post('/ai-optimize', async (req: any, res: any) => {
  try {
    const { campaignName, metrics } = req.body;
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();

    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Google Ads kampanyasi analiz et.
Sirket: ${profile?.company?.name || ''}
Urun: ${profile?.product?.description || ''}
Kampanya: ${campaignName}
Metrikler (son 7 gun):
- Harcama: $${metrics?.spend || 0}
- Gosterim: ${metrics?.impressions || 0}
- Tiklama: ${metrics?.clicks || 0}
- CTR: %${metrics?.ctr || 0}
- Ort. CPC: $${metrics?.avg_cpc || 0}
- Donusum: ${metrics?.conversions || 0}
- Donusum Bas. Maliyet: $${metrics?.cost_per_conversion || 0}

Google Ads benchmark: CTR %2-5, CPC $1-3 olmali.

JSON don:
{
  "overall_score": 1-10,
  "summary": "Turkce ozet",
  "health": "good|warning|critical",
  "problems": ["sorun"],
  "quick_wins": [{"action": "is", "impact": "high|medium|low"}],
  "keyword_suggestions": ["anahtar kelime 1", "anahtar kelime 2"],
  "negative_keywords": ["negatif kelime 1"],
  "ad_copy_alternatives": ["alternatif metin 1", "alternatif metin 2"],
  "bidding_suggestion": "teklif stratejisi onerisi",
  "audience_suggestion": "hedef kitle onerisi"
}`
      }],
    });

    const text = r.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    const analysis = match ? JSON.parse(match[0]) : { summary: text };
    res.json({ ok: true, analysis });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/google-intelligence/connection
router.get('/connection', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('google_ads_connections')
      .select('customer_id, customer_name, google_email, connected_at').eq('user_id', req.userId).single();
    res.json({ connected: !!data && !!data.customer_id, connection: data });
  } catch { res.json({ connected: false }); }
});

// ── OTOMATİK SİSTEM ─────────────────────────────────────
async function runGoogleAutoSystem() {
  try {
    const { data: connections } = await supabase.from('google_ads_connections')
      .select('user_id, access_token, customer_id').not('access_token', 'is', null);

    for (const conn of connections || []) {
      try {
        const leads = await extractGoogleLeads(conn.user_id, conn.customer_id, conn.access_token);
        let saved = 0;
        for (const lead of leads) {
          const result = await saveGoogleLeadToCRM(conn.user_id, lead);
          if (result) saved++;
        }
        await analyzeGooglePerformance(conn.user_id, conn.customer_id, conn.access_token);
        if (saved > 0) console.log(`[GoogleAuto] User ${conn.user_id}: ${saved} yeni lead`);
      } catch {}
    }
  } catch {}
}

setInterval(runGoogleAutoSystem, 30 * 60 * 1000);
setTimeout(runGoogleAutoSystem, 3 * 60 * 1000);

module.exports = router;