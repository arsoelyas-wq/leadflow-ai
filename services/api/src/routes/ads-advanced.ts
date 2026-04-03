export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// â”€â”€ HELPER: Meta token al â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getMetaToken(userId: string): Promise<string | null> {
  const { data } = await supabase.from('meta_connections').select('access_token').eq('user_id', userId).single();
  return data?.access_token || null;
}

async function getMetaAdAccount(userId: string): Promise<string | null> {
  const { data } = await supabase.from('meta_connections').select('ad_accounts').eq('user_id', userId).single();
  const accounts = JSON.parse(data?.ad_accounts || '[]');
  return accounts[0]?.id || null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. SMART AD LAUNCH â€” Tek tuÅŸla reklam
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/smart-launch', async (req: any, res: any) => {
  try {
    const token = await getMetaToken(req.userId);
    const adAccountId = await getMetaAdAccount(req.userId);
    if (!token || !adAccountId) return res.status(401).json({ error: 'Meta hesabÄ± baÄŸlÄ± deÄŸil' });

    const { product, sector, budget, targetCountries, targetAge } = req.body;
    if (!product || !budget) return res.status(400).json({ error: 'product ve budget zorunlu' });

    // AI ile reklam iÃ§eriÄŸi Ã¼ret
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const aiResp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Meta reklam kampanyasÄ± iÃ§in JSON Ã¼ret:
ÃœrÃ¼n: ${product}, SektÃ¶r: ${sector || 'genel'}
{"campaignName":"kampanya adÄ±","headline":"max 30 karakter","description":"max 90 karakter","objective":"OUTCOME_LEADS","targetInterests":["ilgi1","ilgi2"]}`
      }]
    });
    const m = aiResp.content[0]?.text?.match(/\{[\s\S]*\}/);
    const adContent = m ? JSON.parse(m[0]) : { campaignName: `${product} KampanyasÄ±`, headline: product, description: `${product} iÃ§in Ã¶zel teklif`, objective: 'OUTCOME_LEADS', targetInterests: [] };

    // Kampanya oluÅŸtur
    const campResp = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      { name: adContent.campaignName, objective: adContent.objective, status: 'PAUSED', special_ad_categories: [] },
      { params: { access_token: token } }
    );

    // DB'ye kaydet
    await supabase.from('ad_campaigns').insert([{
      user_id: req.userId, platform: 'meta',
      campaign_id: campResp.data?.id,
      name: adContent.campaignName,
      objective: adContent.objective,
      daily_budget: budget,
      status: 'paused',
      ad_account_id: adAccountId,
      ai_generated: true,
    }]);

    res.json({
      campaignId: campResp.data?.id,
      adContent,
      message: `âœ… "${adContent.campaignName}" kampanyasÄ± AI ile oluÅŸturuldu!`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2. 7/24 AD MONITOR â€” 15 dakikada bir kontrol
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/monitor/start', async (req: any, res: any) => {
  try {
    const { adAccountId, alertThresholds } = req.body;
    await supabase.from('ad_monitor_settings').upsert([{
      user_id: req.userId,
      ad_account_id: adAccountId,
      min_ctr: alertThresholds?.minCtr || 0.5,
      max_cpm: alertThresholds?.maxCpm || 50,
      min_roas: alertThresholds?.minRoas || 1.5,
      active: true,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    res.json({ message: '7/24 izleme baÅŸladÄ± â€” her 15 dakikada kontrol edilecek' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/monitor/alerts', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_monitor_alerts')
      .select('*').eq('user_id', req.userId)
      .order('created_at', { ascending: false }).limit(20);
    res.json({ alerts: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 3. CONVERSION API (CAPI) â€” Meta CAPI Back-Feeding
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/capi/event', async (req: any, res: any) => {
  try {
    const token = await getMetaToken(req.userId);
    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', req.userId).single();
    const pixelId = process.env.META_PIXEL_ID;

    if (!token || !pixelId) return res.status(400).json({ error: 'Meta token veya Pixel ID eksik' });

    const { eventName, phone, email, leadId, value, currency } = req.body;

    // Hash fonksiyonu
    const crypto = require('crypto');
    const hash = (val: string) => crypto.createHash('sha256').update(val.toLowerCase().trim()).digest('hex');

    const userData: any = {};
    if (phone) userData.ph = [hash(phone.replace(/\D/g, ''))];
    if (email) userData.em = [hash(email)];

    const eventData = {
      data: [{
        event_name: eventName || 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: userData,
        custom_data: { value: value || 0, currency: currency || 'TRY', lead_id: leadId },
      }],
      test_event_code: process.env.META_TEST_EVENT_CODE || undefined,
    };

    const resp = await axios.post(
      `https://graph.facebook.com/v18.0/${pixelId}/events`,
      eventData,
      { params: { access_token: token } }
    );

    // Log kaydet
    await supabase.from('capi_events').insert([{
      user_id: req.userId,
      event_name: eventName,
      lead_id: leadId || null,
      sent_at: new Date().toISOString(),
      response: JSON.stringify(resp.data),
    }]);

    res.json({ success: true, eventsSent: resp.data?.events_received, message: 'CAPI eventi gÃ¶nderildi' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

router.get('/capi/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('capi_events').select('event_name').eq('user_id', req.userId);
    const byEvent: Record<string, number> = {};
    (data || []).forEach((e: any) => { byEvent[e.event_name] = (byEvent[e.event_name] || 0) + 1; });
    res.json({ total: data?.length || 0, byEvent });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4. COMPETITOR AD MIRRORING â€” Meta Ad Library
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/competitor-ads', async (req: any, res: any) => {
  try {
    const { pageId, keywords, country } = req.query;
    const token = await getMetaToken(req.userId);
    if (!token) return res.status(401).json({ error: 'Meta hesabÄ± baÄŸlÄ± deÄŸil' });

    const params: any = {
      access_token: token,
      ad_type: 'ALL',
      ad_active_status: 'ACTIVE',
      limit: 20,
      fields: 'id,ad_creative_body,ad_creative_link_title,ad_delivery_start_time,page_name,spend,impressions',
    };

    if (pageId) params.search_page_ids = pageId;
    if (keywords) params.search_terms = keywords;
    if (country) params.ad_reached_countries = [country];

    const resp = await axios.get('https://graph.facebook.com/v18.0/ads_archive', { params, timeout: 15000 });

    const ads = (resp.data?.data || []).map((ad: any) => ({
      id: ad.id,
      pageName: ad.page_name,
      body: ad.ad_creative_body,
      title: ad.ad_creative_link_title,
      startDate: ad.ad_delivery_start_time,
      impressions: ad.impressions,
      spend: ad.spend,
    }));

    // Kaydet
    for (const ad of ads) {
      await supabase.from('competitor_ads').upsert([{
        user_id: req.userId,
        ad_id: ad.id,
        page_name: ad.pageName,
        body: ad.body,
        title: ad.title,
        impressions: ad.impressions?.lower_bound || 0,
        scraped_at: new Date().toISOString(),
      }], { onConflict: 'ad_id' });
    }

    res.json({ ads, total: ads.length });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// AI ile rakip reklam analizi
router.post('/competitor-ads/analyze', async (req: any, res: any) => {
  try {
    const { ads } = req.body;
    if (!ads?.length) return res.status(400).json({ error: 'ads zorunlu' });

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const summary = ads.slice(0, 5).map((a: any) => `${a.pageName}: "${a.title}" - ${a.body?.slice(0, 100)}`).join('\n');

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Bu rakip reklamlarÄ± analiz et ve JSON dÃ¶ndÃ¼r:
${summary}

{"patterns":["ortak tema1","ortak tema2"],"weaknesses":["zayÄ±flÄ±k1"],"opportunities":["fÄ±rsat1"],"suggestedAngle":"Ã¶nerilen aÃ§Ä±","hookIdea":"dikkat Ã§ekici baÅŸlÄ±k Ã¶nerisi"}`
      }]
    });

    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    res.json({ analysis: m ? JSON.parse(m[0]) : null });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5. PREDICTIVE ROAS OPTIMIZER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/predict-roas', async (req: any, res: any) => {
  try {
    const token = await getMetaToken(req.userId);
    const adAccountId = await getMetaAdAccount(req.userId);
    if (!token || !adAccountId) return res.status(401).json({ error: 'Meta hesabÄ± baÄŸlÄ± deÄŸil' });

    // Son 30 gÃ¼nlÃ¼k performans Ã§ek
    const campResp = await axios.get(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,insights.date_preset(last_30d){spend,impressions,clicks,actions,purchase_roas}&access_token=${token}&limit=10`
    );

    const campaigns = campResp.data?.data || [];

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const perfData = campaigns.map((c: any) => {
      const ins = c.insights?.data?.[0] || {};
      const purchases = ins.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
      const roas = ins.purchase_roas?.[0]?.value || 0;
      return `${c.name}: ROAS=${roas}, Harcama=$${ins.spend || 0}, TÄ±klama=${ins.clicks || 0}, SatÄ±n Alma=${purchases}`;
    }).join('\n');

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Bu Meta reklam verilerine gÃ¶re 30 gÃ¼nlÃ¼k ROAS tahmini yap ve JSON dÃ¶ndÃ¼r:
${perfData || 'Veri yok â€” genel tahmin yap'}

{"predicted30DayRoas":2.5,"confidenceScore":75,"budgetRecommendation":"GÃ¼nlÃ¼k bÃ¼tÃ§eyi $20 artÄ±r","topPerformer":"kampanya adÄ±","pauseRecommendation":"dÃ¼ÅŸÃ¼k performanslÄ± kampanya","keyInsight":"ana iÃ§gÃ¶rÃ¼","actionPlan":["adÄ±m1","adÄ±m2","adÄ±m3"]}`
      }]
    });

    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    const prediction = m ? JSON.parse(m[0]) : null;

    // Kaydet
    if (prediction) {
      await supabase.from('roas_predictions').insert([{
        user_id: req.userId,
        prediction: JSON.stringify(prediction),
        campaigns_analyzed: campaigns.length,
        predicted_at: new Date().toISOString(),
      }]);
    }

    res.json({ prediction, campaignsAnalyzed: campaigns.length });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6. KEYWORD INTELLIGENCE â€” Negatif Liste
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/keyword-intelligence', async (req: any, res: any) => {
  try {
    const { customerId, campaignId } = req.body;
    const { data: conn } = await supabase.from('google_ads_connections')
      .select('access_token').eq('user_id', req.userId).single();

    let searchTerms: any[] = [];

    if (conn?.access_token && customerId) {
      try {
        const resp = await axios.post(
          `https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`,
          { query: `SELECT search_term_view.search_term, metrics.clicks, metrics.impressions, metrics.conversions, metrics.cost_micros FROM search_term_view WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.clicks DESC LIMIT 50` },
          {
            headers: {
              Authorization: `Bearer ${conn.access_token}`,
              'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
              'login-customer-id': customerId,
            }
          }
        );
        searchTerms = resp.data?.results || [];
      } catch {}
    }

    // AI ile analiz
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const termsText = searchTerms.slice(0, 20).map((t: any) =>
      `"${t.searchTermView?.searchTerm}": ${t.metrics?.clicks || 0} tÄ±klama, ${t.metrics?.conversions || 0} dÃ¶nÃ¼ÅŸÃ¼m`
    ).join('\n') || 'Google Ads verisi yok â€” genel analiz';

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Google Ads arama terimleri analiz et, negatif anahtar kelime listesi Ã¶ner. JSON dÃ¶ndÃ¼r:
${termsText}

{"negativeKeywords":["negatif1","negatif2","negatif3"],"positiveKeywords":["pozitif1","pozitif2"],"broadToExact":["geniÅŸâ†’tam1"],"insight":"ana iÃ§gÃ¶rÃ¼","estimatedWastedBudget":"tahmini boÅŸa harcanan bÃ¼tÃ§e yÃ¼zdesi"}`
      }]
    });

    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    res.json({ analysis: m ? JSON.parse(m[0]) : null, searchTermsAnalyzed: searchTerms.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 7. AI BID-WAR SENTINEL â€” Teklif YÃ¶netimi
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/bid-sentinel/analyze', async (req: any, res: any) => {
  try {
    const { customerId } = req.body;
    const { data: conn } = await supabase.from('google_ads_connections')
      .select('access_token').eq('user_id', req.userId).single();

    let auctionData: any[] = [];

    if (conn?.access_token && customerId) {
      try {
        const resp = await axios.post(
          `https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`,
          { query: `SELECT auction_insight.domain, auction_insight.impression_share, auction_insight.average_position, auction_insight.overlap_rate, auction_insight.outranking_share FROM auction_insight_view WHERE segments.date DURING LAST_30_DAYS LIMIT 10` },
          {
            headers: {
              Authorization: `Bearer ${conn.access_token}`,
              'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
              'login-customer-id': customerId,
            }
          }
        );
        auctionData = resp.data?.results || [];
      } catch {}
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const auctionText = auctionData.slice(0, 10).map((a: any) =>
      `${a.auctionInsight?.domain}: IS=${a.auctionInsight?.impressionShare}, Overlap=${a.auctionInsight?.overlapRate}`
    ).join('\n') || 'Google Ads baÄŸlantÄ±sÄ± yok â€” genel strateji Ã¶ner';

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Google Ads aÃ§Ä±k artÄ±rma analizi yap. JSON dÃ¶ndÃ¼r:
${auctionText}

{"mainCompetitors":["rakip1","rakip2"],"bidStrategy":"Ã¶nerilen teklif stratejisi","impressionShareTarget":"%70","budgetIncrease":"gerekli bÃ¼tÃ§e artÄ±ÅŸÄ±","actionItems":["adÄ±m1","adÄ±m2"],"urgencyLevel":"low/medium/high"}`
      }]
    });

    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    res.json({ analysis: m ? JSON.parse(m[0]) : null, competitorsFound: auctionData.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8. DYNAMIC RETARGETING CYCLE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/retargeting/setup', async (req: any, res: any) => {
  try {
    const token = await getMetaToken(req.userId);
    const adAccountId = await getMetaAdAccount(req.userId);
    if (!token || !adAccountId) return res.status(401).json({ error: 'Meta hesabÄ± baÄŸlÄ± deÄŸil' });

    const { audienceName, days, leads } = req.body;

    // Custom Audience oluÅŸtur
    const audienceResp = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/customaudiences`,
      {
        name: audienceName || 'LeadFlow Retargeting',
        description: `${days || 30} gÃ¼nlÃ¼k retargeting listesi`,
        subtype: 'CUSTOM',
        customer_file_source: 'USER_PROVIDED_ONLY',
      },
      { params: { access_token: token } }
    );

    const audienceId = audienceResp.data?.id;

    // Lead telefon/email listesi yÃ¼kle
    if (leads?.length && audienceId) {
      const crypto = require('crypto');
      const hash = (val: string) => crypto.createHash('sha256').update(val.toLowerCase().trim()).digest('hex');

      const schema = ['PHONE'];
      const data = leads.filter((l: any) => l.phone).map((l: any) => [hash(l.phone.replace(/\D/g, ''))]);

      if (data.length > 0) {
        await axios.post(
          `https://graph.facebook.com/v18.0/${audienceId}/users`,
          { payload: { schema, data } },
          { params: { access_token: token } }
        );
      }
    }

    // DB kaydet
    await supabase.from('retargeting_audiences').insert([{
      user_id: req.userId,
      audience_id: audienceId,
      audience_name: audienceName || 'LeadFlow Retargeting',
      platform: 'meta',
      size: leads?.length || 0,
      created_at: new Date().toISOString(),
    }]);

    res.json({ audienceId, message: `Retargeting kitlesi oluÅŸturuldu: ${audienceName}` });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

router.get('/retargeting/audiences', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('retargeting_audiences')
      .select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ audiences: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STATS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/advanced/stats', async (req: any, res: any) => {
  try {
    const [capi, roas, compAds, audiences] = await Promise.all([
      supabase.from('capi_events').select('id').eq('user_id', req.userId),
      supabase.from('roas_predictions').select('id').eq('user_id', req.userId),
      supabase.from('competitor_ads').select('id').eq('user_id', req.userId),
      supabase.from('retargeting_audiences').select('id').eq('user_id', req.userId),
    ]);

    const metaConnected = !!(await getMetaToken(req.userId));

    res.json({
      capiEvents: capi.data?.length || 0,
      roasPredictions: roas.data?.length || 0,
      competitorAds: compAds.data?.length || 0,
      retargetingAudiences: audiences.data?.length || 0,
      metaConnected,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 15 dakikada bir ad monitor
setInterval(async () => {
  try {
    const { data: monitors } = await supabase.from('ad_monitor_settings').select('*').eq('active', true);
    for (const monitor of monitors || []) {
      const token = await getMetaToken(monitor.user_id);
      if (!token) continue;

      const resp = await axios.get(
        `https://graph.facebook.com/v18.0/${monitor.ad_account_id}/campaigns?fields=id,name,status,insights{ctr,cpm,spend,purchase_roas}&access_token=${token}&limit=10`
      ).catch(() => null);

      if (!resp?.data?.data) continue;

      for (const camp of resp.data.data) {
        const ins = camp.insights?.data?.[0] || {};
        const ctr = parseFloat(ins.ctr || '0');
        const cpm = parseFloat(ins.cpm || '0');

        if (ctr < monitor.min_ctr && ctr > 0) {
          await supabase.from('ad_monitor_alerts').insert([{
            user_id: monitor.user_id,
            campaign_id: camp.id,
            campaign_name: camp.name,
            alert_type: 'low_ctr',
            value: ctr,
            threshold: monitor.min_ctr,
            message: `CTR Ã§ok dÃ¼ÅŸÃ¼k: %${ctr.toFixed(2)} (EÅŸik: %${monitor.min_ctr})`,
            created_at: new Date().toISOString(),
          }]).catch(() => {});
        }

        if (cpm > monitor.max_cpm && cpm > 0) {
          await supabase.from('ad_monitor_alerts').insert([{
            user_id: monitor.user_id,
            campaign_id: camp.id,
            campaign_name: camp.name,
            alert_type: 'high_cpm',
            value: cpm,
            threshold: monitor.max_cpm,
            message: `CPM Ã§ok yÃ¼ksek: $${cpm.toFixed(2)} (EÅŸik: $${monitor.max_cpm})`,
            created_at: new Date().toISOString(),
          }]).catch(() => {});
        }
      }
    }
  } catch {}
}, 15 * 60 * 1000);

module.exports = router;