export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GRAPH = 'https://graph.facebook.com/v20.0';

async function getMetaCreds(userId: string): Promise<{ token: string; adAccountId: string } | null> {
  const { data } = await supabase.from('meta_connections').select('access_token, ad_accounts').eq('user_id', userId).single();
  if (!data?.access_token) return null;
  let adAccountId = '';
  try { const accs = JSON.parse(data.ad_accounts || '[]'); adAccountId = accs[0]?.id || ''; } catch {}
  if (!adAccountId) return null;
  return { token: data.access_token, adAccountId };
}

async function metaGet(path: string, token: string, params: any = {}) {
  const r = await axios.get(`${GRAPH}${path}`, { params: { ...params, access_token: token }, timeout: 15000 });
  return r.data;
}

async function metaPost(path: string, token: string, data: any = {}) {
  const r = await axios.post(`${GRAPH}${path}`, { ...data, access_token: token }, { timeout: 15000 });
  return r.data;
}

router.get('/creative-performance', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getMetaCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Meta bağlantısı bulunamadı' });
    const { token, adAccountId } = creds;

    let result: any;
    try {
      result = await metaGet(`/${adAccountId}/ads`, token, {
        fields: 'id,name,status,creative{title,body,image_url},adset{name,targeting},insights{impressions,clicks,ctr,spend,cpm,reach,frequency,actions,cost_per_action_type}',
        date_preset: 'last_30d',
        limit: 50,
      });
    } catch (e: any) {
      console.error('[MetaOpt] creative-performance fetch error', e?.response?.data || e.message);
      return res.json({ ok: false, error: 'Meta verisi alınamadı' });
    }

    const raw: any[] = result?.data || [];

    const ads = raw.map((ad: any) => {
      const ins = ad.insights?.data?.[0] || {};
      const actions: any[] = ins.actions || [];
      const leads = actions.filter((a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
        .reduce((s: number, a: any) => s + parseInt(a.value || '0', 10), 0);
      const ctr = parseFloat(ins.ctr || '0');
      const frequency = parseFloat(ins.frequency || '0');
      const spend = parseFloat(ins.spend || '0');
      const freqScore = frequency < 3 ? 30 : frequency < 5 ? 20 : 5;
      const score = Math.round((ctr * 20) + freqScore + (spend > 0 ? 30 : 0));

      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        creative: {
          title: ad.creative?.title || '',
          body: ad.creative?.body || '',
          imageUrl: ad.creative?.image_url || '',
        },
        adSetName: ad.adset?.name || '',
        impressions: parseInt(ins.impressions || '0', 10),
        clicks: parseInt(ins.clicks || '0', 10),
        spend,
        ctr: parseFloat(ctr.toFixed(2)),
        cpm: parseFloat(parseFloat(ins.cpm || '0').toFixed(2)),
        frequency: parseFloat(frequency.toFixed(1)),
        reach: parseInt(ins.reach || '0', 10),
        leads,
        score,
      };
    });

    ads.sort((a: any, b: any) => b.score - a.score);

    const activeAds = ads.filter((a: any) => a.status === 'ACTIVE').length;
    const totalLeads = ads.reduce((s: number, a: any) => s + a.leads, 0);
    const avgCtr = ads.length ? (ads.reduce((s: number, a: any) => s + a.ctr, 0) / ads.length).toFixed(2) : '0.00';
    const avgFrequency = ads.length ? (ads.reduce((s: number, a: any) => s + a.frequency, 0) / ads.length).toFixed(1) : '0.0';

    return res.json({
      ok: true,
      ads,
      summary: { totalAds: ads.length, activeAds, totalLeads, avgCtr, avgFrequency },
    });
  } catch (e: any) {
    console.error('[MetaOpt] creative-performance error', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

router.post('/creative-generate', async (req: any, res: any) => {
  try {
    const { adName, currentTitle, currentBody, goal, product, targetAudience } = req.body;

    let parsed: any;
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: 'You are a world-class Meta Ads copywriter specializing in Turkish market. Generate 3 high-converting ad variants. Rules: headline max 40 chars (Turkish), primary text max 125 chars, description max 30 chars. Use emotional triggers, urgency, social proof. Return ONLY valid JSON.',
        messages: [{
          role: 'user',
          content: `Product: ${product}\nGoal: ${goal}\nTarget: ${targetAudience}\nCurrent headline: ${currentTitle}\nCurrent body: ${currentBody}\n\nGenerate 3 improved variants:\n{ "variants": [{ "headline": string, "primaryText": string, "description": string, "callToAction": string, "emotionalHook": string }, ...] }`,
        }],
      });
      const text = (msg.content[0] as any).text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e: any) {
      console.error('[MetaOpt] creative-generate claude error', e.message);
      return res.json({ ok: false, error: 'AI yanıtı alınamadı' });
    }

    const variants = (parsed.variants || []).map((v: any) => ({
      headline: (v.headline || '').slice(0, 40),
      primaryText: (v.primaryText || '').slice(0, 125),
      description: (v.description || '').slice(0, 30),
      callToAction: v.callToAction || '',
      emotionalHook: v.emotionalHook || '',
    }));

    return res.json({ ok: true, variants });
  } catch (e: any) {
    console.error('[MetaOpt] creative-generate error', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

router.get('/audience-breakdown', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getMetaCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Meta bağlantısı bulunamadı' });
    const { token, adAccountId } = creds;

    let ageGenderRaw: any[] = [];
    let placementRaw: any[] = [];

    try {
      const ag = await metaGet(`/${adAccountId}/insights`, token, {
        fields: 'impressions,clicks,spend,ctr,actions',
        breakdowns: 'age,gender',
        date_preset: 'last_30d',
        level: 'account',
      });
      ageGenderRaw = ag?.data || [];
    } catch (e: any) {
      console.error('[MetaOpt] audience age/gender fetch error', e?.response?.data || e.message);
    }

    try {
      const pl = await metaGet(`/${adAccountId}/insights`, token, {
        fields: 'impressions,clicks,spend,ctr',
        breakdowns: 'publisher_platform,platform_position',
        date_preset: 'last_30d',
        level: 'account',
      });
      placementRaw = pl?.data || [];
    } catch (e: any) {
      console.error('[MetaOpt] audience placement fetch error', e?.response?.data || e.message);
    }

    const ageMap: Record<string, any> = {};
    for (const row of ageGenderRaw) {
      const age = row.age || 'unknown';
      if (!ageMap[age]) ageMap[age] = { age, male: null, female: null };
      const entry = {
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        spend: parseFloat(row.spend || '0'),
        ctr: parseFloat(row.ctr || '0'),
      };
      if (row.gender === 'male') ageMap[age].male = entry;
      else if (row.gender === 'female') ageMap[age].female = entry;
    }
    const ageGender = Object.values(ageMap);

    const platMap: Record<string, any> = {};
    for (const row of placementRaw) {
      const platform = row.publisher_platform || 'unknown';
      if (!platMap[platform]) platMap[platform] = { platform, positions: [] };
      platMap[platform].positions.push({
        position: row.platform_position || '',
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        spend: parseFloat(row.spend || '0'),
        ctr: parseFloat(row.ctr || '0'),
      });
    }
    const placements = Object.values(platMap);

    return res.json({ ok: true, ageGender, placements });
  } catch (e: any) {
    console.error('[MetaOpt] audience-breakdown error', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

router.get('/campaign-health', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getMetaCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Meta bağlantısı bulunamadı' });
    const { token, adAccountId } = creds;

    let raw: any[] = [];
    try {
      const result = await metaGet(`/${adAccountId}/campaigns`, token, {
        fields: 'id,name,status,objective,daily_budget,insights.date_preset(last_7d){impressions,clicks,spend,ctr,cpm,reach,frequency,actions}',
        limit: 20,
      });
      raw = result?.data || [];
    } catch (e: any) {
      console.error('[MetaOpt] campaign-health fetch error', e?.response?.data || e.message);
      return res.json({ ok: false, error: 'Meta kampanya verisi alınamadı' });
    }

    const alerts: any[] = [];

    const campaigns = raw.map((c: any) => {
      const ins = c.insights?.data?.[0] || {};
      const frequency = parseFloat(ins.frequency || '0');
      const ctr = parseFloat(ins.ctr || '0');
      const spend = parseFloat(ins.spend || '0');
      const actions: any[] = ins.actions || [];
      const leads = actions.filter((a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
        .reduce((s: number, a: any) => s + parseInt(a.value || '0', 10), 0);

      const frequencyStatus = frequency < 3 ? 'good' : frequency < 5 ? 'warning' : 'fatigue';
      const dailyBudget = parseInt(c.daily_budget || '0', 10);
      const budgetPacing = dailyBudget > 0 ? parseFloat(((spend / (dailyBudget / 100)) * 100).toFixed(1)) : 0;

      let healthScore = 0;
      if (frequency < 3) healthScore += 30;
      if (ctr > 1) healthScore += 30;
      if (spend > 0) healthScore += 20;
      if (leads > 0) healthScore += 20;

      if (frequency >= 5) {
        alerts.push({ campaignId: c.id, campaignName: c.name, issue: 'Ad Yorgunluğu — Kreatif değiştirin', severity: 'high' });
      }
      if (ctr < 0.5 && spend > 0) {
        alerts.push({ campaignId: c.id, campaignName: c.name, issue: 'Düşük CTR — Hedef kitleyi veya reklamı değiştirin', severity: 'medium' });
      }
      if (leads === 0 && spend > 0) {
        alerts.push({ campaignId: c.id, campaignName: c.name, issue: 'Dönüşüm Yok — Hedefle veya CAPI bağlantısını kontrol edin', severity: 'medium' });
      }

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        dailyBudget,
        impressions: parseInt(ins.impressions || '0', 10),
        clicks: parseInt(ins.clicks || '0', 10),
        spend,
        ctr: parseFloat(ctr.toFixed(2)),
        cpm: parseFloat(parseFloat(ins.cpm || '0').toFixed(2)),
        reach: parseInt(ins.reach || '0', 10),
        frequency: parseFloat(frequency.toFixed(1)),
        leads,
        frequencyStatus,
        budgetPacing,
        healthScore,
      };
    });

    return res.json({ ok: true, campaigns, alerts });
  } catch (e: any) {
    console.error('[MetaOpt] campaign-health error', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

router.get('/budget-optimizer', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getMetaCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Meta bağlantısı bulunamadı' });
    const { token, adAccountId } = creds;

    let raw: any[] = [];
    try {
      const result = await metaGet(`/${adAccountId}/campaigns`, token, {
        fields: 'id,name,daily_budget,insights.date_preset(last_30d){spend,actions,cpm,ctr}',
        limit: 20,
      });
      raw = result?.data || [];
    } catch (e: any) {
      console.error('[MetaOpt] budget-optimizer fetch error', e?.response?.data || e.message);
      return res.json({ ok: false, error: 'Meta kampanya verisi alınamadı' });
    }

    const campaigns = raw.map((c: any) => {
      const ins = c.insights?.data?.[0] || {};
      const spend = parseFloat(ins.spend || '0');
      const actions: any[] = ins.actions || [];
      const leads = actions.filter((a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
        .reduce((s: number, a: any) => s + parseInt(a.value || '0', 10), 0);
      const cpl = leads > 0 ? parseFloat((spend / leads).toFixed(2)) : null;

      return {
        id: c.id,
        name: c.name,
        daily_budget: parseInt(c.daily_budget || '0', 10),
        spend,
        leads,
        cpl,
        ctr: parseFloat(ins.ctr || '0'),
        cpm: parseFloat(ins.cpm || '0'),
      };
    });

    let recommendations: any[] = [];
    let summary = '';

    try {
      const campaignLines = campaigns.map((c: any) =>
        `${c.name}: Budget=$${(c.daily_budget / 100).toFixed(0)}/day, Spend=$${c.spend}, Leads=${c.leads}, CPL=${c.cpl ?? 'N/A'}`
      ).join('\n');

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: 'You are a Meta Ads budget optimization expert. Analyze campaign performance and recommend budget reallocation to maximize leads. Return ONLY valid JSON.',
        messages: [{
          role: 'user',
          content: `Campaigns (last 30 days):\n${campaignLines}\n\nReturn: { "recommendations": [{ "campaignId": string, "campaignName": string, "action": "increase"|"decrease"|"pause", "newBudget": number, "reason": string, "expectedImpact": string }], "summary": string }`,
        }],
      });
      const text = (msg.content[0] as any).text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      recommendations = parsed.recommendations || [];
      summary = parsed.summary || '';
    } catch (e: any) {
      console.error('[MetaOpt] budget-optimizer claude error', e.message);
    }

    return res.json({ ok: true, campaigns, recommendations, summary });
  } catch (e: any) {
    console.error('[MetaOpt] budget-optimizer error', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

router.post('/budget-optimizer/apply', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getMetaCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Meta bağlantısı bulunamadı' });
    const { token } = creds;
    const { campaignId, newDailyBudgetCents } = req.body;

    if (!campaignId || !newDailyBudgetCents) return res.json({ ok: false, error: 'campaignId ve newDailyBudgetCents gerekli' });

    let adsetId = '';
    try {
      const camData = await metaGet(`/${campaignId}`, token, { fields: 'adsets{id,budget_remaining,daily_budget}' });
      adsetId = camData?.adsets?.data?.[0]?.id || '';
    } catch (e: any) {
      console.error('[MetaOpt] budget-apply fetch adset error', e?.response?.data || e.message);
      return res.json({ ok: false, error: 'Ad set bilgisi alınamadı' });
    }

    if (!adsetId) return res.json({ ok: false, error: 'Ad set bulunamadı' });

    try {
      await metaPost(`/${adsetId}`, token, { daily_budget: newDailyBudgetCents });
    } catch (e: any) {
      console.error('[MetaOpt] budget-apply update error', e?.response?.data || e.message);
      return res.json({ ok: false, error: 'Bütçe güncellenemedi' });
    }

    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[MetaOpt] budget-optimizer/apply error', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

router.post('/ai-campaign/plan', async (req: any, res: any) => {
  try {
    const { product, budget, goal, location, targetAge, targetGender, language } = req.body;

    let plan: any;
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: 'You are a world-class Meta Ads strategist with 10+ years experience. Create a complete campaign plan for the Turkish market. Return ONLY valid JSON.',
        messages: [{
          role: 'user',
          content: `Product/Service: ${product}\nDaily Budget: $${budget}\nGoal: ${goal}\nLocation: ${location}\nAge: ${targetAge}\nGender: ${targetGender}\nLanguage: ${language}\n\nCreate a complete Meta Ads campaign plan:\n{\n  "campaignName": string,\n  "objective": "OUTCOME_LEADS"|"OUTCOME_SALES"|"OUTCOME_AWARENESS",\n  "adSetName": string,\n  "targeting": { "ageMin": number, "ageMax": number, "genders": [1,2], "interests": [{"id": "6003067", "name": string}], "locales": [24] },\n  "ads": [{ "headline": string, "primaryText": string, "description": string, "callToAction": "LEARN_MORE"|"SIGN_UP"|"GET_QUOTE"|"CONTACT_US" }],\n  "estimatedCPL": number,\n  "estimatedLeadsPerDay": number,\n  "strategyRationale": string,\n  "warnings": [string]\n}`,
        }],
      });
      const text = (msg.content[0] as any).text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      plan = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e: any) {
      console.error('[MetaOpt] ai-campaign/plan claude error', e.message);
      return res.json({ ok: false, error: 'AI yanıtı alınamadı' });
    }

    return res.json({ ok: true, plan });
  } catch (e: any) {
    console.error('[MetaOpt] ai-campaign/plan error', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

router.post('/ai-campaign/create', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getMetaCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Meta bağlantısı bulunamadı' });
    const { token, adAccountId } = creds;
    const { plan } = req.body;

    if (!plan) return res.json({ ok: false, error: 'Plan verisi gerekli' });

    let campaignId = '';
    try {
      const camResult = await metaPost(`/${adAccountId}/campaigns`, token, {
        name: plan.campaignName,
        objective: plan.objective || 'OUTCOME_LEADS',
        status: 'PAUSED',
        special_ad_categories: [],
      });
      campaignId = camResult?.id || '';
    } catch (e: any) {
      console.error('[MetaOpt] ai-campaign/create campaign error', e?.response?.data || e.message);
      return res.json({ ok: false, error: 'Kampanya oluşturulamadı' });
    }

    if (!campaignId) return res.json({ ok: false, error: 'Kampanya ID alınamadı' });

    let adSetId = '';
    try {
      const adsetResult = await metaPost(`/${adAccountId}/adsets`, token, {
        name: plan.adSetName,
        campaign_id: campaignId,
        daily_budget: plan.dailyBudgetCents || 1000,
        billing_event: 'IMPRESSIONS',
        optimization_goal: plan.objective === 'OUTCOME_LEADS' ? 'LEAD_GENERATION' : 'REACH',
        targeting: {
          age_min: plan.targeting?.ageMin || 18,
          age_max: plan.targeting?.ageMax || 65,
          genders: plan.targeting?.genders || [1, 2],
          geo_locations: { countries: ['TR'] },
          locales: [24],
        },
        status: 'PAUSED',
      });
      adSetId = adsetResult?.id || '';
    } catch (e: any) {
      console.error('[MetaOpt] ai-campaign/create adset error', e?.response?.data || e.message);
      return res.json({ ok: true, campaignId, warning: 'Ad seti oluşturulamadı' });
    }

    try {
      const firstAd = plan.ads?.[0];
      if (firstAd && adSetId) {
        await metaPost(`/${adAccountId}/ads`, token, {
          name: firstAd.headline || plan.campaignName,
          adset_id: adSetId,
          status: 'ACTIVE',
          creative: {
            object_story_spec: {
              page_id: '',
              link_data: {
                message: firstAd.primaryText || '',
                name: firstAd.headline || '',
                description: firstAd.description || '',
                call_to_action: { type: firstAd.callToAction || 'LEARN_MORE' },
              },
            },
          },
        });
      }
    } catch (e: any) {
      console.error('[MetaOpt] ai-campaign/create ad error (non-fatal)', e?.response?.data || e.message);
    }

    try {
      await supabase.from('meta_campaigns').insert({
        user_id: userId,
        campaign_id: campaignId,
        adset_id: adSetId,
        name: plan.campaignName,
        objective: plan.objective,
        daily_budget: plan.dailyBudgetCents || 1000,
        status: 'paused',
        ai_generated: true,
        plan,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[MetaOpt] ai-campaign/create db save error (non-fatal)', e.message);
    }

    return res.json({ ok: true, campaignId, adSetId, message: 'Kampanya başarıyla oluşturuldu (Duraklatıldı)' });
  } catch (e: any) {
    console.error('[MetaOpt] ai-campaign/create error', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREATIVE FATIGUE DETECTION + AUTO-PAUSE
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/creative-fatigue', async (req: any, res: any) => {
  try {
    const creds = await getMetaCreds(req.userId);
    if (!creds) return res.json({ fatigued: [], healthy: 0 });

    const { token, adAccountId } = creds;
    const r = await axios.get(`${GRAPH}/${adAccountId}/ads`, {
      params: { access_token: token, fields: 'id,name,status,creative{title},insights{frequency,ctr,cpm,spend,impressions,actions}', effective_status: '["ACTIVE"]', limit: 50 },
      timeout: 15000,
    });

    const fatigued: any[] = [];
    const ads = r.data?.data || [];

    for (const ad of ads) {
      const ins = ad.insights?.data?.[0] || {};
      const freq = parseFloat(ins.frequency || '0');
      const ctr = parseFloat(ins.ctr || '0');
      const spend = parseFloat(ins.spend || '0');
      const createdDays = Math.floor((Date.now() - new Date(ad.created_time || Date.now()).getTime()) / (24 * 60 * 60 * 1000));

      let fatigueScore = 0;
      let reasons: string[] = [];

      if (freq >= 5) { fatigueScore += 40; reasons.push(`Frekans ${freq.toFixed(1)} — ayni kisiler tekrar goruyor`); }
      if (freq >= 3 && ctr < 0.5) { fatigueScore += 30; reasons.push(`CTR %${ctr.toFixed(2)} — tiklanma dustu`); }
      if (createdDays >= 21) { fatigueScore += 20; reasons.push(`${createdDays} gundur aktif — yenileme zamani`); }
      if (spend > 200 && ctr < 0.3) { fatigueScore += 10; reasons.push(`₺${spend.toFixed(0)} harcanmis ama CTR cok dusuk`); }

      if (fatigueScore >= 30) {
        fatigued.push({
          adId: ad.id, name: ad.name, fatigueScore: Math.min(100, fatigueScore),
          frequency: freq, ctr, spend, createdDays, reasons,
          action: fatigueScore >= 70 ? 'Hemen durdur + yeni kreatif' : fatigueScore >= 50 ? 'Yenileme planla' : 'Izle',
        });
      }
    }

    fatigued.sort((a, b) => b.fatigueScore - a.fatigueScore);
    res.json({ fatigued, healthy: ads.length - fatigued.length, total: ads.length });
  } catch (e: any) { res.json({ fatigued: [], healthy: 0, error: e.message?.slice(0, 80) }); }
});

// Auto-pause fatigued ads
router.post('/creative-fatigue/auto-pause', async (req: any, res: any) => {
  try {
    const creds = await getMetaCreds(req.userId);
    if (!creds) return res.status(400).json({ error: 'Meta bagli degil' });

    const { adIds } = req.body;
    if (!adIds?.length) return res.status(400).json({ error: 'adIds zorunlu' });

    let paused = 0;
    for (const adId of adIds) {
      try {
        await axios.post(`${GRAPH}/${adId}`, { status: 'PAUSED', access_token: creds.token }, { timeout: 10000 });
        paused++;
      } catch {}
    }
    res.json({ ok: true, paused, message: `${paused} yorgun reklam durduruldu` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WASTED SPEND DETECTION + ACCOUNT HEALTH SCORE
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/account-health', async (req: any, res: any) => {
  try {
    const creds = await getMetaCreds(req.userId);
    if (!creds) return res.json({ score: 0, connected: false });

    const { token, adAccountId } = creds;
    const r = await axios.get(`${GRAPH}/${adAccountId}/campaigns`, {
      params: { access_token: token, fields: 'id,name,status,daily_budget,insights{spend,impressions,clicks,ctr,cpm,actions,frequency}', effective_status: '["ACTIVE","PAUSED"]', limit: 30 },
      timeout: 15000,
    });

    const campaigns = r.data?.data || [];
    let totalSpend = 0, totalLeads = 0, wastedSpend = 0;
    let healthScore = 100;
    const issues: any[] = [];
    const wastedCampaigns: any[] = [];

    for (const c of campaigns) {
      const ins = c.insights?.data?.[0] || {};
      const spend = parseFloat(ins.spend || '0');
      const leads = parseInt((ins.actions || []).find((a: any) => a.action_type === 'lead')?.value || '0');
      const ctr = parseFloat(ins.ctr || '0');
      const freq = parseFloat(ins.frequency || '0');
      totalSpend += spend;
      totalLeads += leads;

      // Wasted spend: spend > 50 ama 0 lead
      if (spend > 50 && leads === 0) {
        wastedSpend += spend;
        wastedCampaigns.push({ name: c.name, spend, message: `₺${spend.toFixed(0)} harcanmis — 0 lead` });
        healthScore -= 10;
        issues.push({ type: 'wasted_spend', severity: 'critical', campaign: c.name, message: `₺${spend.toFixed(0)} israf — durdurun veya optimize edin` });
      }
      // Low CTR
      if (ctr < 0.5 && spend > 20) {
        healthScore -= 5;
        issues.push({ type: 'low_ctr', severity: 'warning', campaign: c.name, message: `CTR %${ctr.toFixed(2)} — reklam metni/gorseli iyilestirin` });
      }
      // Ad fatigue
      if (freq > 5) {
        healthScore -= 8;
        issues.push({ type: 'ad_fatigue', severity: 'warning', campaign: c.name, message: `Frekans ${freq.toFixed(1)} — ayni kisiler cok goruyor` });
      }
    }

    // CAPI kontrolu
    const { data: events } = await supabase.from('meta_capi_events').select('id').eq('user_id', req.userId).limit(1);
    if (!events?.length) {
      healthScore -= 15;
      issues.push({ type: 'no_capi', severity: 'critical', message: 'CAPI aktif degil — algoritma doğru ogrenemez' });
    }

    // Pixel kontrolu
    const { data: settings } = await supabase.from('user_settings').select('meta_pixel_id').eq('user_id', req.userId).maybeSingle();
    if (!settings?.meta_pixel_id) {
      healthScore -= 10;
      issues.push({ type: 'no_pixel', severity: 'warning', message: 'Pixel tanimli degil — web donusumleri izlenemiyor' });
    }

    healthScore = Math.max(0, Math.min(100, healthScore));
    const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D';

    res.json({
      score: healthScore, grade,
      totalSpend, totalLeads, wastedSpend,
      wastedCampaigns,
      issues: issues.sort((a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1)),
      campaigns: campaigns.length,
      costPerLead: totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0,
      connected: true,
    });
  } catch (e: any) { res.json({ score: 0, connected: false, error: e.message?.slice(0, 80) }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO BID MANAGEMENT (CPA/ROAS hedef bazli)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/auto-bid', async (req: any, res: any) => {
  try {
    const { targetCPA, targetROAS } = req.body;
    const creds = await getMetaCreds(req.userId);
    if (!creds) return res.status(400).json({ error: 'Meta bagli degil' });

    const { token, adAccountId } = creds;
    const r = await axios.get(`${GRAPH}/${adAccountId}/adsets`, {
      params: { access_token: token, fields: 'id,name,daily_budget,optimization_goal,insights{spend,actions,action_values}', effective_status: '["ACTIVE"]', limit: 20 },
      timeout: 15000,
    });

    const adsets = r.data?.data || [];
    const adjustments: any[] = [];

    for (const adset of adsets) {
      const ins = adset.insights?.data?.[0] || {};
      const spend = parseFloat(ins.spend || '0');
      const leads = parseInt((ins.actions || []).find((a: any) => a.action_type === 'lead')?.value || '0');
      const currentCPA = leads > 0 ? spend / leads : 0;
      const currentBudget = parseInt(adset.daily_budget || '0') / 100;

      if (targetCPA && currentCPA > 0) {
        const ratio = targetCPA / currentCPA;
        let action = 'keep';
        let newBudget = currentBudget;

        if (ratio < 0.7) { action = 'decrease'; newBudget = Math.round(currentBudget * 0.8); }
        else if (ratio > 1.3 && leads >= 3) { action = 'increase'; newBudget = Math.round(currentBudget * 1.2); }

        if (action !== 'keep') {
          adjustments.push({
            adsetId: adset.id, name: adset.name,
            currentBudget, newBudget, currentCPA: Math.round(currentCPA), targetCPA,
            action, reason: action === 'increase' ? 'CPA hedefin altinda — butce arttir' : 'CPA hedefin ustunde — butce azalt',
          });
        }
      }
    }

    res.json({ adjustments, totalAdsets: adsets.length, message: `${adjustments.length} adset icin butce onerisi` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Apply bid adjustments
router.post('/auto-bid/apply', async (req: any, res: any) => {
  try {
    const creds = await getMetaCreds(req.userId);
    if (!creds) return res.status(400).json({ error: 'Meta bagli degil' });

    const { adjustments } = req.body;
    if (!adjustments?.length) return res.status(400).json({ error: 'adjustments zorunlu' });

    let applied = 0;
    for (const adj of adjustments) {
      try {
        await axios.post(`${GRAPH}/${adj.adsetId}`, {
          daily_budget: Math.round(adj.newBudget * 100),
          access_token: creds.token,
        }, { timeout: 10000 });
        applied++;
      } catch {}
    }
    res.json({ ok: true, applied, message: `${applied} adset butcesi guncellendi` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREATIVE REFRESH ALERT
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/creative-refresh-alerts', async (req: any, res: any) => {
  try {
    const creds = await getMetaCreds(req.userId);
    if (!creds) return res.json({ alerts: [] });

    const { token, adAccountId } = creds;
    const r = await axios.get(`${GRAPH}/${adAccountId}/ads`, {
      params: { access_token: token, fields: 'id,name,created_time,status,insights{frequency,ctr,spend}', effective_status: '["ACTIVE"]', limit: 30 },
      timeout: 15000,
    });

    const alerts: any[] = [];
    for (const ad of (r.data?.data || [])) {
      const createdDays = Math.floor((Date.now() - new Date(ad.created_time || Date.now()).getTime()) / (24 * 60 * 60 * 1000));
      const ins = ad.insights?.data?.[0] || {};
      const freq = parseFloat(ins.frequency || '0');
      const ctr = parseFloat(ins.ctr || '0');

      if (createdDays >= 21) {
        alerts.push({
          adId: ad.id, name: ad.name, daysActive: createdDays,
          frequency: freq, ctr,
          urgency: createdDays >= 35 ? 'critical' : createdDays >= 28 ? 'high' : 'medium',
          message: `${createdDays} gundur aktif${freq >= 4 ? `, frekans ${freq.toFixed(1)}` : ''} — yeni kreatif yukleyin`,
        });
      }
    }

    alerts.sort((a, b) => b.daysActive - a.daysActive);
    res.json({ alerts, total: alerts.length });
  } catch (e: any) { res.json({ alerts: [], error: e.message?.slice(0, 80) }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREATIVE UPLOAD — gorsel/video yukle → Meta Ad Account'a otomatik yukle
// ═══════════════════════════════════════════════════════════════════════════════

const multer = require('multer');
const creativeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/upload-creative', creativeUpload.single('file'), async (req: any, res: any) => {
  try {
    const creds = await getMetaCreds(req.userId);
    if (!creds) return res.status(400).json({ error: 'Meta bagli degil' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Dosya yuklenmedi' });

    const { token, adAccountId } = creds;
    const isVideo = file.mimetype.startsWith('video/');
    let metaId = '', metaUrl = '';

    if (isVideo) {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('source', file.buffer, { filename: file.originalname, contentType: file.mimetype });
      form.append('access_token', token);
      const r = await axios.post(`${GRAPH}/${adAccountId}/advideos`, form, {
        headers: form.getHeaders(), timeout: 120000, maxContentLength: 50 * 1024 * 1024,
      });
      metaId = r.data?.id || '';
    } else {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('filename', file.originalname);
      form.append('bytes', file.buffer.toString('base64'));
      form.append('access_token', token);
      const r = await axios.post(`${GRAPH}/${adAccountId}/adimages`, form, {
        headers: form.getHeaders(), timeout: 60000,
      });
      const images = r.data?.images || {};
      const firstKey = Object.keys(images)[0];
      if (firstKey) { metaId = images[firstKey].hash; metaUrl = images[firstKey].url; }
    }

    const { data: saved } = await supabase.from('ad_creatives').insert([{
      user_id: req.userId, platform: 'meta',
      type: isVideo ? 'video' : 'image',
      filename: file.originalname, file_size: file.size, mime_type: file.mimetype,
      meta_id: metaId, meta_url: metaUrl,
      created_at: new Date().toISOString(),
    }]).select().single();

    res.json({ ok: true, id: saved?.id, metaId, metaUrl, type: isVideo ? 'video' : 'image', message: `${isVideo ? 'Video' : 'Gorsel'} Meta'ya yuklendi!` });
  } catch (e: any) {
    console.error('[Creative Upload]', e.response?.data || e.message);
    res.status(500).json({ error: e.message?.slice(0, 80) });
  }
});

router.get('/creatives', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_creatives').select('*').eq('user_id', req.userId).order('created_at', { ascending: false }).limit(20);
    res.json({ creatives: data || [] });
  } catch { res.json({ creatives: [] }); }
});

module.exports = router;
