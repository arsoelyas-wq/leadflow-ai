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

function gHeaders(token: string, cid: string): object {
  return {
    Authorization: `Bearer ${token}`,
    'developer-token': DEVELOPER_TOKEN,
    'login-customer-id': cid.replace('customers/', '').replace(/-/g, ''),
    'Content-Type': 'application/json',
  };
}

async function getUserCreds(userId: string): Promise<{ accessToken: string; customerId: string } | null> {
  try {
    const { data, error } = await supabase
      .from('google_ads_connections')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (error || !data || !data.access_token) return null;

    let customerId = '';
    try {
      const accounts = JSON.parse(data.ad_accounts || '[]');
      customerId = accounts[0]?.id || '';
    } catch {}

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
        console.error('[GoogleAdv] listAccessibleCustomers skip:', fetchErr.response?.data?.error?.message || fetchErr.message);
      }
    }

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
        console.error('[GoogleAdv] Token refresh hata:', refreshErr.message);
        return null;
      }
    }

    return { accessToken: data.access_token, customerId };
  } catch (e: any) {
    console.error('[GoogleAdv] getUserCreds hata:', e.message);
    return null;
  }
}

async function gaqlSearch(cid: string, token: string, query: string): Promise<any[]> {
  try {
    const cleanCid = cid.replace('customers/', '').replace(/-/g, '');
    const r = await axios.post(
      `${GOOGLE_ADS_BASE}/customers/${cleanCid}/googleAds:search`,
      { query, pageSize: 500 },
      { headers: gHeaders(token, cid), timeout: 20000 }
    );
    return r.data?.results || [];
  } catch (e: any) {
    console.error('[GoogleAdv] gaqlSearch hata:', e.response?.data?.error?.message || e.message);
    return [];
  }
}

// ── ENDPOINT 1: GET /conversion/status ──────────────────────────────────────

router.get('/conversion/status', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { accessToken, customerId } = creds;
    const rows = await gaqlSearch(customerId, accessToken, `
      SELECT conversion_action.id, conversion_action.name, conversion_action.type,
        conversion_action.status, conversion_action.include_in_conversions_metric,
        metrics.conversions
      FROM conversion_action
      WHERE conversion_action.status = 'ENABLED'
      LIMIT 50
    `);

    const conversions = rows.map((row: any) => ({
      id: row.conversionAction?.id || '',
      name: row.conversionAction?.name || '',
      type: row.conversionAction?.type || '',
      status: row.conversionAction?.status || '',
      includeInConversions: row.conversionAction?.includeInConversionsMetric || false,
      conversions: row.metrics?.conversions || 0,
    }));

    return res.json({ ok: true, conversions });
  } catch (e: any) {
    console.error('[GoogleAdv] conversion/status hata:', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

// ── ENDPOINT 2: POST /conversion/import-calls ────────────────────────────────

router.post('/conversion/import-calls', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { accessToken, customerId } = creds;
    const { conversionActionId, calls } = req.body;
    const cleanCid = customerId.replace('customers/', '').replace(/-/g, '');

    const conversions = (calls || []).map((c: any) => ({
      callerId: c.callerId,
      callStartDateTime: c.callStartDateTime,
      callDurationSeconds: c.callDurationSeconds,
      conversionAction: `customers/${cleanCid}/conversionActions/${conversionActionId}`,
    }));

    const r = await axios.post(
      `${GOOGLE_ADS_BASE}/customers/${cleanCid}/conversionUploads:uploadCallConversions`,
      { conversions, partialFailure: true },
      { headers: gHeaders(accessToken, customerId), timeout: 15000 }
    );

    return res.json({
      ok: true,
      uploaded: conversions.length,
      partialFailureError: r.data?.partialFailureError || null,
    });
  } catch (e: any) {
    console.error('[GoogleAdv] conversion/import-calls hata:', e.message);
    return res.json({ ok: false, error: e.response?.data?.error?.message || e.message });
  }
});

// ── ENDPOINT 3: GET /abtests ─────────────────────────────────────────────────

router.get('/abtests', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { accessToken, customerId } = creds;
    const rows = await gaqlSearch(customerId, accessToken, `
      SELECT ad_group_ad.ad.id, ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.status,
        ad_group.name, campaign.name, metrics.impressions, metrics.clicks,
        metrics.ctr, metrics.conversions, metrics.cost_micros
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED' AND ad_group.status = 'ENABLED'
        AND ad_group_ad.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
      LIMIT 100
    `);

    const ads = rows.map((row: any) => {
      const rsa = row.adGroupAd?.ad?.responsiveSearchAd || {};
      const headlines: string[] = (rsa.headlines || []).map((h: any) => h.text || '').filter(Boolean);
      const descriptions: string[] = (rsa.descriptions || []).map((d: any) => d.text || '').filter(Boolean);
      return {
        id: row.adGroupAd?.ad?.id || '',
        adGroupName: row.adGroup?.name || '',
        campaignName: row.campaign?.name || '',
        headlines,
        descriptions,
        status: row.adGroupAd?.status || '',
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        ctr: row.metrics?.ctr || 0,
        conversions: row.metrics?.conversions || 0,
        costMicros: row.metrics?.costMicros || 0,
      };
    });

    return res.json({ ok: true, ads });
  } catch (e: any) {
    console.error('[GoogleAdv] abtests hata:', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

// ── ENDPOINT 4: POST /abtests/generate ──────────────────────────────────────

router.post('/abtests/generate', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { adGroupName, campaignName, currentHeadlines, currentDescriptions, goal } = req.body;

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are an expert Google Ads copywriter. Generate 2 improved RSA variants. Rules: each variant has exactly 15 headlines (max 30 chars each, truncate if needed) and 4 descriptions (max 90 chars each). Be specific, use action verbs, create urgency. Return ONLY valid JSON: { "variants": [{ "headlines": string[], "descriptions": string[] }, { "headlines": string[], "descriptions": string[] }] }',
      messages: [
        {
          role: 'user',
          content: `Campaign: ${campaignName}\nAd Group: ${adGroupName}\nGoal: ${goal}\nCurrent headlines: ${(currentHeadlines || []).join(', ')}\nCurrent descriptions: ${(currentDescriptions || []).join(', ')}\n\nGenerate 2 improved variants.`,
        },
      ],
    });

    const raw = (msg.content[0] as any)?.text || '{}';
    let parsed: any = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return res.json({ ok: false, error: 'Claude yanıtı parse edilemedi' });
    }

    const variants = (parsed.variants || []).map((v: any) => ({
      headlines: (v.headlines || []).slice(0, 15).map((h: string) => h.slice(0, 30)),
      descriptions: (v.descriptions || []).slice(0, 4).map((d: string) => d.slice(0, 90)),
    }));

    return res.json({ ok: true, variants });
  } catch (e: any) {
    console.error('[GoogleAdv] abtests/generate hata:', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

// ── ENDPOINT 5: POST /abtests/create-ad ─────────────────────────────────────

router.post('/abtests/create-ad', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { accessToken, customerId } = creds;
    const { adGroupResourceName, finalUrl, headlines, descriptions } = req.body;
    const cleanCid = customerId.replace('customers/', '').replace(/-/g, '');

    const body = {
      operations: [
        {
          adGroupAd: {
            ad: {
              responsiveSearchAd: {
                headlines: (headlines || []).slice(0, 15).map((text: string) => ({ text: text.slice(0, 30) })),
                descriptions: (descriptions || []).slice(0, 4).map((text: string) => ({ text: text.slice(0, 90) })),
              },
              finalUrls: [finalUrl],
            },
            adGroup: adGroupResourceName,
            status: 'PAUSED',
          },
          operator: 'CREATE',
        },
      ],
    };

    const r = await axios.post(
      `${GOOGLE_ADS_BASE}/customers/${cleanCid}/adGroupAds:mutate`,
      body,
      { headers: gHeaders(accessToken, customerId), timeout: 15000 }
    );

    const resourceName = r.data?.results?.[0]?.resourceName || '';
    return res.json({ ok: true, resourceName });
  } catch (e: any) {
    console.error('[GoogleAdv] abtests/create-ad hata:', e.message);
    return res.json({ ok: false, error: e.response?.data?.error?.message || e.message });
  }
});

// ── ENDPOINT 6: GET /budget-pacing ──────────────────────────────────────────

router.get('/budget-pacing', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { accessToken, customerId } = creds;
    const rows = await gaqlSearch(customerId, accessToken, `
      SELECT campaign.id, campaign.name, campaign.resource_name,
        campaign_budget.amount_micros, metrics.cost_micros,
        metrics.impressions, metrics.clicks
      FROM campaign
      WHERE campaign.status = 'ENABLED' AND segments.date DURING TODAY
    `);

    const currentHour = new Date().getHours();

    const campaigns = rows.map((row: any) => {
      const budgetMicros = row.campaignBudget?.amountMicros || 0;
      const spentMicros = row.metrics?.costMicros || 0;
      const pacingPct = budgetMicros > 0 ? (spentMicros / budgetMicros * 100) : 0;
      const expectedPct = (currentHour / 24) * 100;

      let status: string;
      let recommendation: string;
      if (pacingPct > expectedPct + 15) {
        status = 'over';
        recommendation = 'Bütçeniz hızla tükeniyor. Teklif limitlerini düşürmeyi veya bütçeyi artırmayı düşünün.';
      } else if (pacingPct < expectedPct - 20) {
        status = 'under';
        recommendation = 'Bütçeniz yavaş tüketiliyor. Teklifleriniz düşük olabilir veya reklam kalitesi yetersiz.';
      } else {
        status = 'on_track';
        recommendation = 'Bütçe harcaması planlandığı gibi gidiyor.';
      }

      return {
        id: row.campaign?.id || '',
        name: row.campaign?.name || '',
        resourceName: row.campaign?.resourceName || '',
        budgetMicros,
        spentMicros,
        pacingPct: Math.round(pacingPct * 10) / 10,
        expectedPct: Math.round(expectedPct * 10) / 10,
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        status,
        recommendation,
      };
    });

    const totalBudgetUsd = campaigns.reduce((s: number, c: any) => s + c.budgetMicros, 0) / 1_000_000;
    const totalSpentUsd = campaigns.reduce((s: number, c: any) => s + c.spentMicros, 0) / 1_000_000;
    const projectedDayEndUsd = currentHour > 0 ? (totalSpentUsd / currentHour) * 24 : 0;

    return res.json({
      ok: true,
      campaigns,
      summary: {
        totalBudgetUsd: Math.round(totalBudgetUsd * 100) / 100,
        totalSpentUsd: Math.round(totalSpentUsd * 100) / 100,
        projectedDayEndUsd: Math.round(projectedDayEndUsd * 100) / 100,
      },
    });
  } catch (e: any) {
    console.error('[GoogleAdv] budget-pacing hata:', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

// ── ENDPOINT 7: POST /landing-page/analyze ───────────────────────────────────

router.post('/landing-page/analyze', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { url, keywords } = req.body;

    let score = 0;
    let lcp = 'N/A';
    let cls = 'N/A';
    let fid = 'N/A';

    try {
      const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${process.env.PAGESPEED_API_KEY || ''}`;
      const psRes = await axios.get(psUrl, { timeout: 15000 });
      const result = psRes.data;
      score = Math.round((result.lighthouseResult?.categories?.performance?.score || 0) * 100);
      lcp = result.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue || 'N/A';
      cls = result.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue || 'N/A';
      fid = result.lighthouseResult?.audits?.['total-blocking-time']?.displayValue || 'N/A';
    } catch (psErr: any) {
      console.error('[GoogleAdv] landing-page/analyze pagespeed hata:', psErr.message);
    }

    let keywordRelevance: any[] = [];
    try {
      const htmlRes = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html: string = htmlRes.data || '';
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const titleText = (titleMatch ? titleMatch[1] : '').toLowerCase();
      const h1Matches = [...html.matchAll(/<h[12][^>]*>(.*?)<\/h[12]>/gis)].map(m => m[1]);
      const h1Text = h1Matches.join(' ').replace(/<[^>]+>/g, '').toLowerCase();
      const bodyText = html.replace(/<[^>]+>/g, '').toLowerCase();

      keywordRelevance = (keywords || []).map((keyword: string) => {
        const kw = keyword.toLowerCase();
        const inTitle = titleText.includes(kw);
        const inH1 = h1Text.includes(kw);
        const inBody = bodyText.includes(kw);
        const kwScore = (inTitle ? 1 : 0) + (inH1 ? 1 : 0) + (inBody ? 1 : 0);
        return { keyword, inTitle, inH1, inBody, score: kwScore };
      });
    } catch (htmlErr: any) {
      console.error('[GoogleAdv] landing-page/analyze html fetch hata:', htmlErr.message);
      keywordRelevance = (keywords || []).map((keyword: string) => ({
        keyword, inTitle: false, inH1: false, inBody: false, score: 0,
      }));
    }

    const avgKeywordScore = keywordRelevance.length > 0
      ? keywordRelevance.reduce((s: number, k: any) => s + k.score, 0) / keywordRelevance.length
      : 0;
    const overallScore = Math.round((score + avgKeywordScore * 20) / 2);

    let recommendations: string[] = [];
    let claudeInsights = '';
    try {
      const claudeMsg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Sayfa performans verileri:\n- Performans skoru: ${score}/100\n- LCP: ${lcp}\n- CLS: ${cls}\n- FID/TBT: ${fid}\n\nAnahtar kelime alaka düzeyi:\n${keywordRelevance.map((k: any) => `- "${k.keyword}": başlık=${k.inTitle}, h1=${k.inH1}, içerik=${k.inBody}`).join('\n')}\n\nGoogle Ads Kalite Skorunu artırmak için 5 spesifik öneri ver. Türkçe yanıtla. JSON formatında döndür: { "recommendations": ["öneri1", "öneri2", "öneri3", "öneri4", "öneri5"], "insights": "genel analiz" }`,
          },
        ],
      });
      const raw = (claudeMsg.content[0] as any)?.text || '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      recommendations = parsed.recommendations || [];
      claudeInsights = parsed.insights || '';
    } catch (claudeErr: any) {
      console.error('[GoogleAdv] landing-page/analyze claude hata:', claudeErr.message);
    }

    return res.json({
      ok: true,
      url,
      performance: { score, lcp, cls, fid },
      keywordRelevance,
      overallScore,
      recommendations,
      claudeInsights,
    });
  } catch (e: any) {
    console.error('[GoogleAdv] landing-page/analyze hata:', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

// ── ENDPOINT 8: GET /smart-bid/status ───────────────────────────────────────

router.get('/smart-bid/status', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { accessToken, customerId } = creds;
    const rows = await gaqlSearch(customerId, accessToken, `
      SELECT campaign.id, campaign.name, campaign.resource_name,
        campaign.bidding_strategy_type, campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas, campaign.maximize_conversions.target_cpa_micros,
        metrics.cost_micros, metrics.conversions, metrics.conversions_value,
        metrics.average_cpc
      FROM campaign
      WHERE campaign.status = 'ENABLED'
      LIMIT 50
    `);

    const campaigns = rows.map((row: any) => ({
      id: row.campaign?.id || '',
      name: row.campaign?.name || '',
      resourceName: row.campaign?.resourceName || '',
      biddingStrategyType: row.campaign?.biddingStrategyType || '',
      targetCpaMicros: row.campaign?.targetCpa?.targetCpaMicros || row.campaign?.maximizeConversions?.targetCpaMicros || 0,
      targetRoas: row.campaign?.targetRoas?.targetRoas || 0,
      costMicros: row.metrics?.costMicros || 0,
      conversions: row.metrics?.conversions || 0,
      conversionsValue: row.metrics?.conversionsValue || 0,
      avgCpc: row.metrics?.averageCpc || 0,
    }));

    return res.json({ ok: true, campaigns });
  } catch (e: any) {
    console.error('[GoogleAdv] smart-bid/status hata:', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

// ── ENDPOINT 9: POST /smart-bid/simulate ────────────────────────────────────

router.post('/smart-bid/simulate', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { accessToken, customerId } = creds;
    const { campaignId, scenario, targetValue } = req.body;

    const rows = await gaqlSearch(customerId, accessToken, `
      SELECT campaign.name, metrics.cost_micros, metrics.conversions,
        metrics.clicks, metrics.impressions, metrics.conversions_value
      FROM campaign
      WHERE campaign.id = '${campaignId}' AND segments.date DURING LAST_30_DAYS
    `);

    const totals = rows.reduce(
      (acc: any, row: any) => {
        acc.costMicros += row.metrics?.costMicros || 0;
        acc.conversions += row.metrics?.conversions || 0;
        acc.clicks += row.metrics?.clicks || 0;
        acc.impressions += row.metrics?.impressions || 0;
        acc.conversionsValue += row.metrics?.conversionsValue || 0;
        return acc;
      },
      { costMicros: 0, conversions: 0, clicks: 0, impressions: 0, conversionsValue: 0 }
    );

    const costUsd = totals.costMicros / 1_000_000;
    const cpa = totals.conversions > 0 ? costUsd / totals.conversions : 0;

    const claudeMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a Google Ads bidding expert. Given campaign metrics and a proposed bid strategy change, provide realistic outcome projections. Be conservative and data-driven. Return ONLY valid JSON.',
      messages: [
        {
          role: 'user',
          content: `Current 30-day metrics: cost=$${costUsd.toFixed(2)}, conversions=${totals.conversions}, CPA=$${cpa.toFixed(2)}, clicks=${totals.clicks}, impressions=${totals.impressions}\nProposed strategy: ${scenario} with target: ${targetValue}\n\nReturn JSON: { "projectedMetrics": { "impressions": number, "clicks": number, "conversions": number, "costUsd": number, "cpa": number, "roas": number }, "confidence": "high"|"medium"|"low", "recommendation": "string", "risks": ["string"] }`,
        },
      ],
    });

    const raw = (claudeMsg.content[0] as any)?.text || '{}';
    let parsed: any = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      parsed = {};
    }

    return res.json({
      ok: true,
      currentMetrics: {
        costUsd,
        conversions: totals.conversions,
        cpa,
        clicks: totals.clicks,
        impressions: totals.impressions,
        conversionsValue: totals.conversionsValue,
      },
      projectedMetrics: parsed.projectedMetrics || {},
      confidence: parsed.confidence || 'low',
      recommendation: parsed.recommendation || '',
      risks: parsed.risks || [],
    });
  } catch (e: any) {
    console.error('[GoogleAdv] smart-bid/simulate hata:', e.message);
    return res.json({ ok: false, error: e.message });
  }
});

// ── ENDPOINT 10: POST /smart-bid/apply ──────────────────────────────────────

router.post('/smart-bid/apply', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const creds = await getUserCreds(userId);
    if (!creds) return res.json({ ok: false, error: 'Google Ads bağlantısı bulunamadı' });

    const { accessToken, customerId } = creds;
    const { campaignResourceName, strategy, targetCpaMicros, targetRoas } = req.body;
    const cleanCid = customerId.replace('customers/', '').replace(/-/g, '');

    let strategyObject: any = {};
    if (strategy === 'TARGET_CPA') {
      strategyObject = { targetCpa: { targetCpaMicros } };
    } else if (strategy === 'TARGET_ROAS') {
      strategyObject = { targetRoas: { targetRoas } };
    } else if (strategy === 'MAXIMIZE_CONVERSIONS') {
      strategyObject = { maximizeConversions: {} };
    } else if (strategy === 'MAXIMIZE_CLICKS') {
      strategyObject = { maximizeClicks: {} };
    }

    const body = {
      operations: [
        {
          updateMask: 'biddingStrategyType,targetCpa,targetRoas,maximizeConversions,maximizeClicks',
          update: {
            resourceName: campaignResourceName,
            biddingStrategyType: strategy,
            ...strategyObject,
          },
        },
      ],
    };

    await axios.post(
      `${GOOGLE_ADS_BASE}/customers/${cleanCid}/campaigns:mutate`,
      body,
      { headers: gHeaders(accessToken, customerId), timeout: 15000 }
    );

    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[GoogleAdv] smart-bid/apply hata:', e.message);
    return res.json({ ok: false, error: e.response?.data?.error?.message || e.message });
  }
});

module.exports = router;
