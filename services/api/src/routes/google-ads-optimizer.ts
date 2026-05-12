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

// ── HELPER: Google Ads istek headerlari ─────────────────────────────────────

function gHeaders(token: string, cid: string): object {
  return {
    Authorization: `Bearer ${token}`,
    'developer-token': DEVELOPER_TOKEN,
    'login-customer-id': cid.replace('customers/', '').replace(/-/g, ''),
    'Content-Type': 'application/json',
  };
}

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
        console.error('[GoogleOptimizer] listAccessibleCustomers skip:', fetchErr.response?.data?.error?.message || fetchErr.message);
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
        console.error('[GoogleOptimizer] Token refresh hata:', refreshErr.message);
        return null;
      }
    }

    return { accessToken: data.access_token, customerId };
  } catch (e: any) {
    console.error('[GoogleOptimizer] getUserCreds hata:', e.message);
    return null;
  }
}

// ── HELPER: GAQL search ──────────────────────────────────────────────────────

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
    console.error('[GoogleOptimizer] gaqlSearch hata:', e.response?.data?.error?.message || e.message);
    return [];
  }
}

// ── ENDPOINT 1: GET /quality-scores ─────────────────────────────────────────

router.get('/quality-scores', async (req: any, res: any) => {
  try {
    const creds = await getUserCreds(req.userId);
    if (!creds) {
      return res.json({
        ok: true,
        keywords: [],
        summary: { avgQs: 0, below6Count: 0, above7Count: 0, healthScore: 0, estimatedMonthlySavings: 0 },
        mode: 'no_data',
      });
    }

    const { accessToken, customerId } = creds;
    const cid = customerId.replace('customers/', '').replace(/-/g, '');

    const results = await gaqlSearch(cid, accessToken, `
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.quality_info.quality_score,
        ad_group_criterion.quality_info.creative_quality_score,
        ad_group_criterion.quality_info.post_click_quality_score,
        ad_group_criterion.quality_info.search_predicted_ctr,
        campaign.name,
        campaign.id,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.conversions
      FROM keyword_view
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_criterion.status = 'ENABLED'
        AND ad_group_criterion.type = 'KEYWORD'
      ORDER BY ad_group_criterion.quality_info.quality_score ASC
      LIMIT 200
    `);

    if (!results || results.length === 0) {
      return res.json({
        ok: true,
        keywords: [],
        summary: { avgQs: 0, below6Count: 0, above7Count: 0, healthScore: 0, estimatedMonthlySavings: 0 },
        mode: 'no_data',
      });
    }

    const keywords = results.map((r: any) => ({
      keyword: r.adGroupCriterion?.keyword?.text,
      matchType: r.adGroupCriterion?.keyword?.matchType,
      qualityScore: r.adGroupCriterion?.qualityInfo?.qualityScore || 0,
      expectedCtr: r.adGroupCriterion?.qualityInfo?.searchPredictedCtr || 'UNKNOWN',
      adRelevance: r.adGroupCriterion?.qualityInfo?.creativeQualityScore || 'UNKNOWN',
      landingPageExperience: r.adGroupCriterion?.qualityInfo?.postClickQualityScore || 'UNKNOWN',
      campaignName: r.campaign?.name,
      adGroupName: r.adGroup?.name,
      impressions: r.metrics?.impressions || 0,
      clicks: r.metrics?.clicks || 0,
      spend: ((r.metrics?.costMicros || 0) / 1_000_000).toFixed(2),
      ctr: (((r.metrics?.ctr || 0) * 100)).toFixed(2),
      conversions: r.metrics?.conversions || 0,
    }));

    const total = keywords.length;
    const avgQs = total > 0 ? keywords.reduce((sum: number, k: any) => sum + (k.qualityScore || 0), 0) / total : 0;
    const below6Count = keywords.filter((k: any) => k.qualityScore < 6).length;
    const above7Count = keywords.filter((k: any) => k.qualityScore >= 7).length;
    const estimatedMonthlySavings = keywords
      .filter((k: any) => k.qualityScore < 7)
      .reduce((sum: number, k: any) => sum + parseFloat(k.spend) * 0.28, 0);
    const healthScore = total > 0 ? (above7Count / total) * 100 : 0;

    const summary = {
      avgQs: parseFloat(avgQs.toFixed(1)),
      below6Count,
      above7Count,
      healthScore: parseFloat(healthScore.toFixed(1)),
      estimatedMonthlySavings: parseFloat(estimatedMonthlySavings.toFixed(2)),
    };

    try {
      await supabase.from('google_qs_snapshots').insert([{
        user_id: req.userId,
        customer_id: cid,
        keyword_data: keywords,
        summary,
        recorded_at: new Date().toISOString(),
      }]);
    } catch (snapErr: any) {
      console.error('[GoogleOptimizer] QS snapshot kayit hata:', snapErr.message);
    }

    return res.json({ ok: true, keywords, summary });
  } catch (e: any) {
    console.error('[GoogleOptimizer] quality-scores hata:', e.message);
    return res.json({
      ok: true,
      keywords: [],
      summary: { avgQs: 0, below6Count: 0, above7Count: 0, healthScore: 0, estimatedMonthlySavings: 0 },
      mode: 'no_data',
    });
  }
});

// ── ENDPOINT 2: POST /improve-qs ─────────────────────────────────────────────

router.post('/improve-qs', async (req: any, res: any) => {
  try {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords dizisi zorunlu' });
    }

    const userMessage = `Fix these low Quality Score keywords. For each one, identify the root cause and provide specific fixes.

Keywords to fix:
${keywords.slice(0, 10).map((k: any) => `- "${k.keyword}" (QS: ${k.qualityScore}/10) | Expected CTR: ${k.expectedCtr} | Ad Relevance: ${k.adRelevance} | Landing Page: ${k.landingPageExperience} | Campaign: ${k.campaignName}`).join('\n')}

Return JSON array:
[{
  "keyword": "exact keyword text",
  "current_qs": 4,
  "primary_issue": "ad_relevance|expected_ctr|landing_page",
  "issue_explanation": "specific explanation why this component is failing",
  "new_headlines": ["headline with keyword max 30 chars", "second headline", "third", "fourth", "fifth"],
  "new_descriptions": ["description with CTA max 90 chars", "second description"],
  "negative_keywords": ["irrelevant term 1", "term 2", "term 3", "term 4", "term 5"],
  "needs_own_ad_group": true,
  "qs_improvement_tip": "one specific actionable tip",
  "expected_qs_after": 8
}]

RULES:
- Headlines MUST be under 30 characters
- Descriptions MUST be under 90 characters
- Each new headline MUST contain the keyword or its core words
- negative_keywords must be genuinely irrelevant search terms users might type
- expected_qs_after must be realistic (if current is 3, expected after fix should be 6-8)`;

    const aiResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: "You are the world's leading Google Ads Quality Score expert. QS 10 gives a 50% CPC discount vs QS 5. Quality Score has 3 equal components: (1) Expected CTR - compelling copy matching search intent, (2) Ad Relevance - headline must contain the exact keyword phrase, (3) Landing Page Experience - fast, relevant page. Your job is to diagnose exactly which component is failing and provide specific fixes. Output ONLY valid JSON.",
      messages: [{ role: 'user', content: userMessage }],
    });

    const text: string = aiResp.content?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error('[GoogleOptimizer] improve-qs JSON parse hata, raw:', text.slice(0, 300));
      return res.status(500).json({ error: 'AI yaniti JSON formatinda degil' });
    }

    let improvements: any[];
    try {
      improvements = JSON.parse(match[0]);
    } catch (parseErr: any) {
      console.error('[GoogleOptimizer] improve-qs JSON.parse hata:', parseErr.message);
      return res.status(500).json({ error: 'AI yaniti parse edilemedi' });
    }

    return res.json({ ok: true, improvements });
  } catch (e: any) {
    console.error('[GoogleOptimizer] improve-qs hata:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── ENDPOINT 3: POST /search-terms/mine ──────────────────────────────────────

router.post('/search-terms/mine', async (req: any, res: any) => {
  try {
    const creds = await getUserCreds(req.userId);
    if (!creds) {
      return res.json({
        ok: true,
        searchTerms: [],
        stats: { totalFound: 0, toAddAsKeyword: 0, toAddAsNegative: 0, potentialSavings: 0 },
        mode: 'no_data',
      });
    }

    const { accessToken, customerId } = creds;
    const cid = customerId.replace('customers/', '').replace(/-/g, '');

    const results = await gaqlSearch(cid, accessToken, `
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        campaign.name,
        campaign.id,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM search_term_view
      WHERE segments.date DURING LAST_14_DAYS
        AND campaign.status = 'ENABLED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 300
    `);

    const searchTerms = results.map((r: any) => {
      const impressions = r.metrics?.impressions || 0;
      const clicks = r.metrics?.clicks || 0;
      const cost = (r.metrics?.costMicros || 0) / 1_000_000;
      const conversions = r.metrics?.conversions || 0;
      const ctr = r.metrics?.ctr || 0;

      let recommended_action = 'ok';
      if (impressions > 50 && ctr > 0.03 && conversions > 0) {
        recommended_action = 'add_keyword';
      } else if (impressions > 100 && clicks === 0 && cost > 0) {
        recommended_action = 'add_negative';
      } else if (ctr < 0.005 && impressions > 200) {
        recommended_action = 'add_negative';
      } else if (impressions > 30) {
        recommended_action = 'review';
      }

      return {
        searchTerm: r.searchTermView?.searchTerm,
        status: r.searchTermView?.status,
        campaignName: r.campaign?.name,
        campaignId: r.campaign?.id,
        adGroupName: r.adGroup?.name,
        impressions,
        clicks,
        cost: cost.toFixed(2),
        conversions,
        ctr: (ctr * 100).toFixed(2),
        avgCpc: ((r.metrics?.averageCpc || 0) / 1_000_000).toFixed(2),
        recommended_action,
        ai_flagged: false,
      };
    });

    // AI categorization for top 20 zero-conversion expensive terms
    const expensiveZeroConv = searchTerms
      .filter((t: any) => t.conversions === 0 && parseFloat(t.cost) > 0)
      .sort((a: any, b: any) => parseFloat(b.cost) - parseFloat(a.cost))
      .slice(0, 20);

    if (expensiveZeroConv.length > 0) {
      try {
        const aiResp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: "You are a Google Ads negative keyword expert. Identify which search terms are clearly irrelevant and wasting budget. Output ONLY valid JSON.",
          messages: [{
            role: 'user',
            content: `These search terms have zero conversions but cost money. Identify which ones are clearly irrelevant and should be negative keywords.

Terms:
${expensiveZeroConv.map((t: any) => `- "${t.searchTerm}" (Cost: $${t.cost}, Impressions: ${t.impressions}, CTR: ${t.ctr}%)`).join('\n')}

Return JSON: { "clear_negatives": ["term1", "term2"], "needs_review": ["term3"] }`,
          }],
        });

        const aiText: string = aiResp.content?.[0]?.text || '';
        const aiMatch = aiText.match(/\{[\s\S]*\}/);
        if (aiMatch) {
          try {
            const aiResult = JSON.parse(aiMatch[0]);
            const clearNegatives: string[] = aiResult.clear_negatives || [];
            for (const term of searchTerms) {
              if (clearNegatives.includes(term.searchTerm)) {
                term.recommended_action = 'add_negative';
                term.ai_flagged = true;
              }
            }
          } catch {}
        }
      } catch (aiErr: any) {
        console.error('[GoogleOptimizer] search-terms AI categorization hata:', aiErr.message);
      }
    }

    const toAddAsKeyword = searchTerms.filter((t: any) => t.recommended_action === 'add_keyword').length;
    const toAddAsNegative = searchTerms.filter((t: any) => t.recommended_action === 'add_negative').length;
    const potentialSavings = searchTerms
      .filter((t: any) => t.recommended_action === 'add_negative')
      .reduce((sum: number, t: any) => sum + parseFloat(t.cost), 0);

    return res.json({
      ok: true,
      searchTerms,
      stats: {
        totalFound: searchTerms.length,
        toAddAsKeyword,
        toAddAsNegative,
        potentialSavings: parseFloat(potentialSavings.toFixed(2)),
      },
    });
  } catch (e: any) {
    console.error('[GoogleOptimizer] search-terms/mine hata:', e.message);
    return res.json({
      ok: true,
      searchTerms: [],
      stats: { totalFound: 0, toAddAsKeyword: 0, toAddAsNegative: 0, potentialSavings: 0 },
      mode: 'no_data',
    });
  }
});

// ── ENDPOINT 4: POST /search-terms/apply ─────────────────────────────────────

router.post('/search-terms/apply', async (req: any, res: any) => {
  try {
    const { action, searchTerm, adGroupResource, campaignResource, matchType } = req.body;
    if (!action || !searchTerm) {
      return res.status(400).json({ error: 'action ve searchTerm zorunlu' });
    }

    const creds = await getUserCreds(req.userId);
    if (!creds) return res.status(400).json({ error: 'Google Ads bagli degil' });

    const { accessToken, customerId } = creds;
    const cid = customerId.replace('customers/', '').replace(/-/g, '');

    if (action === 'keyword') {
      if (!adGroupResource) return res.status(400).json({ error: 'adGroupResource zorunlu' });
      await axios.post(
        `${GOOGLE_ADS_BASE}/customers/${cid}/adGroupCriteria:mutate`,
        {
          operations: [{
            create: {
              adGroup: adGroupResource,
              status: 'ENABLED',
              keyword: {
                text: searchTerm,
                matchType: matchType || 'PHRASE',
              },
            },
          }],
        },
        { headers: gHeaders(accessToken, cid), timeout: 15000 }
      );
    } else if (action === 'negative') {
      if (!campaignResource) return res.status(400).json({ error: 'campaignResource zorunlu' });
      await axios.post(
        `${GOOGLE_ADS_BASE}/customers/${cid}/campaignCriteria:mutate`,
        {
          operations: [{
            create: {
              campaign: campaignResource,
              negative: true,
              keyword: {
                text: searchTerm,
                matchType: 'BROAD',
              },
            },
          }],
        },
        { headers: gHeaders(accessToken, cid), timeout: 15000 }
      );
    } else {
      return res.status(400).json({ error: 'action keyword veya negative olmali' });
    }

    try {
      await supabase.from('google_search_term_actions').insert([{
        user_id: req.userId,
        customer_id: cid,
        action,
        search_term: searchTerm,
        ad_group_resource: adGroupResource || null,
        campaign_resource: campaignResource || null,
        match_type: matchType || (action === 'negative' ? 'BROAD' : 'PHRASE'),
        applied_at: new Date().toISOString(),
      }]);
    } catch (logErr: any) {
      console.error('[GoogleOptimizer] search-term action log hata:', logErr.message);
    }

    return res.json({ ok: true, message: `"${searchTerm}" basariyla ${action === 'keyword' ? 'anahtar kelime' : 'negatif kelime'} olarak eklendi` });
  } catch (e: any) {
    console.error('[GoogleOptimizer] search-terms/apply hata:', e.response?.data?.error?.message || e.message);
    return res.status(500).json({ error: e.response?.data?.error?.message || e.message });
  }
});

// ── ENDPOINT 5: GET /impression-share ────────────────────────────────────────

router.get('/impression-share', async (req: any, res: any) => {
  try {
    const creds = await getUserCreds(req.userId);
    if (!creds) return res.json({ ok: true, campaigns: [], mode: 'no_data' });

    const { accessToken, customerId } = creds;
    const cid = customerId.replace('customers/', '').replace(/-/g, '');

    const results = await gaqlSearch(cid, accessToken, `
      SELECT
        campaign.name,
        campaign.id,
        campaign.status,
        metrics.search_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share,
        metrics.search_top_impression_share,
        metrics.search_absolute_top_impression_share,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.advertising_channel_type = 'SEARCH'
      ORDER BY metrics.cost_micros DESC
      LIMIT 20
    `);

    const campaigns = results.map((r: any) => ({
      campaignName: r.campaign?.name,
      impressionShare: ((r.metrics?.searchImpressionShare || 0) * 100).toFixed(1),
      lostToBudget: ((r.metrics?.searchBudgetLostImpressionShare || 0) * 100).toFixed(1),
      lostToRank: ((r.metrics?.searchRankLostImpressionShare || 0) * 100).toFixed(1),
      topImpressionShare: ((r.metrics?.searchTopImpressionShare || 0) * 100).toFixed(1),
      absoluteTopShare: ((r.metrics?.searchAbsoluteTopImpressionShare || 0) * 100).toFixed(1),
      impressions: r.metrics?.impressions || 0,
      spend: ((r.metrics?.costMicros || 0) / 1_000_000).toFixed(2),
      recommendation: (r.metrics?.searchBudgetLostImpressionShare || 0) > 0.2
        ? 'Bütçeyi artırın - %' + ((r.metrics?.searchBudgetLostImpressionShare || 0) * 100).toFixed(0) + ' bütçe yetersizliğinden kaybediliyor'
        : (r.metrics?.searchRankLostImpressionShare || 0) > 0.2
        ? 'Teklifi artırın veya QS iyileştirin - kalite düşüklüğünden kaybediliyor'
        : 'İyi performans',
    }));

    return res.json({ ok: true, campaigns });
  } catch (e: any) {
    console.error('[GoogleOptimizer] impression-share hata:', e.message);
    return res.json({ ok: true, campaigns: [], mode: 'no_data' });
  }
});

// ── ENDPOINT 6: GET /auction-insights ────────────────────────────────────────

router.get('/auction-insights', async (req: any, res: any) => {
  try {
    const creds = await getUserCreds(req.userId);
    if (!creds) return res.json({ ok: true, competitors: [], mode: 'no_data' });

    const { accessToken, customerId } = creds;
    const cid = customerId.replace('customers/', '').replace(/-/g, '');

    const results = await gaqlSearch(cid, accessToken, `
      SELECT
        auction_insight.domain,
        auction_insight.impression_share,
        auction_insight.overlap_rate,
        auction_insight.position_above_rate,
        auction_insight.top_of_page_rate,
        auction_insight.outranking_share,
        campaign.name
      FROM auction_insight
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY auction_insight.impression_share DESC
      LIMIT 20
    `);

    const competitors = results.map((r: any) => ({
      domain: r.auctionInsight?.domain,
      impressionShare: ((r.auctionInsight?.impressionShare || 0) * 100).toFixed(1),
      overlapRate: ((r.auctionInsight?.overlapRate || 0) * 100).toFixed(1),
      positionAboveRate: ((r.auctionInsight?.positionAboveRate || 0) * 100).toFixed(1),
      topOfPageRate: ((r.auctionInsight?.topOfPageRate || 0) * 100).toFixed(1),
      outRankingShare: ((r.auctionInsight?.outrankingShare || 0) * 100).toFixed(1),
      campaign: r.campaign?.name,
      threat: (r.auctionInsight?.outrankingShare || 0) > 0.5
        ? 'high'
        : (r.auctionInsight?.outrankingShare || 0) > 0.3
        ? 'medium'
        : 'low',
    }));

    return res.json({ ok: true, competitors });
  } catch (e: any) {
    console.error('[GoogleOptimizer] auction-insights hata:', e.message);
    return res.json({ ok: true, competitors: [], mode: 'no_data' });
  }
});

// ── ENDPOINT 7: GET /device-performance ──────────────────────────────────────

router.get('/device-performance', async (req: any, res: any) => {
  try {
    const creds = await getUserCreds(req.userId);
    if (!creds) return res.json({ ok: true, devices: [], recommendations: [], mode: 'no_data' });

    const { accessToken, customerId } = creds;
    const cid = customerId.replace('customers/', '').replace(/-/g, '');

    const results = await gaqlSearch(cid, accessToken, `
      SELECT
        segments.device,
        campaign.name,
        campaign.id,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr,
        metrics.conversion_rate,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status = 'ENABLED'
        AND campaign.advertising_channel_type = 'SEARCH'
    `);

    const deviceMap: Record<string, any> = {};
    for (const r of results) {
      const device: string = r.segments?.device || 'UNKNOWN';
      if (!deviceMap[device]) {
        deviceMap[device] = { device, impressions: 0, clicks: 0, spend: 0, conversions: 0 };
      }
      deviceMap[device].impressions += r.metrics?.impressions || 0;
      deviceMap[device].clicks += r.metrics?.clicks || 0;
      deviceMap[device].spend += (r.metrics?.costMicros || 0) / 1_000_000;
      deviceMap[device].conversions += r.metrics?.conversions || 0;
    }

    const devices = Object.values(deviceMap).map((d: any) => ({
      device: d.device,
      impressions: d.impressions,
      clicks: d.clicks,
      spend: d.spend.toFixed(2),
      conversions: d.conversions,
      ctr: d.clicks > 0 && d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : '0.00',
      conversionRate: d.clicks > 0 && d.conversions > 0 ? ((d.conversions / d.clicks) * 100).toFixed(2) : '0.00',
      cpa: d.conversions > 0 ? (d.spend / d.conversions).toFixed(2) : null,
    }));

    const recommendations: string[] = [];
    const mobile = devices.find((d: any) => d.device === 'MOBILE');
    const desktop = devices.find((d: any) => d.device === 'DESKTOP');
    const tablet = devices.find((d: any) => d.device === 'TABLET');

    if (mobile && desktop && mobile.cpa && desktop.cpa) {
      const mobileCpa = parseFloat(mobile.cpa);
      const desktopCpa = parseFloat(desktop.cpa);
      if (mobileCpa < desktopCpa * 0.8) {
        recommendations.push('Mobil CPA masaüstünden %20 daha düşük — mobil teklifleri +%20 artırın');
      } else if (mobileCpa > desktopCpa * 1.3) {
        recommendations.push('Mobil CPA masaüstünden %30 daha yüksek — mobil teklifleri -%20 azaltın');
      }
    }

    if (tablet && tablet.conversions === 0 && parseFloat(tablet.spend) > 10) {
      recommendations.push(`Tablet hiç dönüşüm üretmedi ($${tablet.spend} harcandı) — tablet teklifini -%100 yaparak hariç tutun`);
    }

    return res.json({ ok: true, devices, recommendations });
  } catch (e: any) {
    console.error('[GoogleOptimizer] device-performance hata:', e.message);
    return res.json({ ok: true, devices: [], recommendations: [], mode: 'no_data' });
  }
});

// ── ENDPOINT 8: GET /schedule-performance ────────────────────────────────────

router.get('/schedule-performance', async (req: any, res: any) => {
  try {
    const creds = await getUserCreds(req.userId);
    if (!creds) return res.json({ ok: true, hourlyData: [], dayData: [], peakHours: [], deadHours: [], recommendations: [], mode: 'no_data' });

    const { accessToken, customerId } = creds;
    const cid = customerId.replace('customers/', '').replace(/-/g, '');

    const results = await gaqlSearch(cid, accessToken, `
      SELECT
        segments.hour,
        segments.day_of_week,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status = 'ENABLED'
      ORDER BY segments.hour ASC
      LIMIT 200
    `);

    const hourMap: Record<number, any> = {};
    const dayMap: Record<string, any> = {};

    for (const r of results) {
      const hour: number = r.segments?.hour ?? -1;
      const day: string = r.segments?.dayOfWeek || 'UNKNOWN';
      const impressions = r.metrics?.impressions || 0;
      const clicks = r.metrics?.clicks || 0;
      const conversions = r.metrics?.conversions || 0;
      const spend = (r.metrics?.costMicros || 0) / 1_000_000;

      if (hour >= 0) {
        if (!hourMap[hour]) hourMap[hour] = { hour, impressions: 0, clicks: 0, conversions: 0, spend: 0 };
        hourMap[hour].impressions += impressions;
        hourMap[hour].clicks += clicks;
        hourMap[hour].conversions += conversions;
        hourMap[hour].spend += spend;
      }

      if (day !== 'UNKNOWN') {
        if (!dayMap[day]) dayMap[day] = { day, impressions: 0, clicks: 0, conversions: 0, spend: 0 };
        dayMap[day].impressions += impressions;
        dayMap[day].clicks += clicks;
        dayMap[day].conversions += conversions;
        dayMap[day].spend += spend;
      }
    }

    const hourlyData = Object.values(hourMap).sort((a: any, b: any) => a.hour - b.hour).map((h: any) => ({
      hour: h.hour,
      impressions: h.impressions,
      clicks: h.clicks,
      conversions: h.conversions,
      spend: h.spend.toFixed(2),
    }));

    const dayData = Object.values(dayMap).map((d: any) => ({
      day: d.day,
      impressions: d.impressions,
      clicks: d.clicks,
      conversions: d.conversions,
      spend: d.spend.toFixed(2),
    }));

    const maxConv = Math.max(...hourlyData.map((h: any) => h.conversions), 0);
    const peakHours = hourlyData
      .filter((h: any) => h.conversions > 0 && h.conversions >= maxConv * 0.7)
      .map((h: any) => h.hour);

    const deadHours = hourlyData
      .filter((h: any) => h.conversions === 0 && parseFloat(h.spend) > 5)
      .map((h: any) => h.hour);

    const recommendations: string[] = [];

    if (deadHours.length > 0) {
      const ranges: string[] = [];
      let start = deadHours[0];
      let prev = deadHours[0];
      for (let i = 1; i <= deadHours.length; i++) {
        if (i === deadHours.length || deadHours[i] !== prev + 1) {
          ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
          if (i < deadHours.length) { start = deadHours[i]; prev = deadHours[i]; }
        } else {
          prev = deadHours[i];
        }
      }
      recommendations.push(`Saat ${ranges.join(', ')} arasında dönüşüm yok — bu saatlerde reklamları durdurabilirsiniz`);
    }

    if (peakHours.length > 0) {
      const peakHourData = hourlyData.find((h: any) => h.hour === peakHours[0]);
      if (peakHourData) {
        const convRate = peakHourData.clicks > 0 ? ((peakHourData.conversions / peakHourData.clicks) * 100).toFixed(1) : '0';
        recommendations.push(`Saat ${peakHours[0]} en yüksek dönüşüm oranı (%${convRate}) — %20 teklif artışı önerilebilir`);
      }
    }

    return res.json({ ok: true, hourlyData, dayData, peakHours, deadHours, recommendations });
  } catch (e: any) {
    console.error('[GoogleOptimizer] schedule-performance hata:', e.message);
    return res.json({ ok: true, hourlyData: [], dayData: [], peakHours: [], deadHours: [], recommendations: [], mode: 'no_data' });
  }
});

// ── ENDPOINT 9: GET /rsa-performance ─────────────────────────────────────────

router.get('/rsa-performance', async (req: any, res: any) => {
  try {
    const creds = await getUserCreds(req.userId);
    if (!creds) return res.json({ ok: true, ads: [], mode: 'no_data' });

    const { accessToken, customerId } = creds;
    const cid = customerId.replace('customers/', '').replace(/-/g, '');

    const results = await gaqlSearch(cid, accessToken, `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad_strength,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        campaign.name,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions,
        metrics.cost_micros
      FROM ad_group_ad
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `);

    const ads = results.map((r: any) => ({
      adId: r.adGroupAd?.ad?.id,
      adStrength: r.adGroupAd?.adStrength,
      headlines: (r.adGroupAd?.ad?.responsiveSearchAd?.headlines || []).map((h: any) => h.text),
      descriptions: (r.adGroupAd?.ad?.responsiveSearchAd?.descriptions || []).map((d: any) => d.text),
      campaignName: r.campaign?.name,
      adGroupName: r.adGroup?.name,
      impressions: r.metrics?.impressions || 0,
      clicks: r.metrics?.clicks || 0,
      ctr: (((r.metrics?.ctr || 0) * 100)).toFixed(2),
      conversions: r.metrics?.conversions || 0,
      spend: ((r.metrics?.costMicros || 0) / 1_000_000).toFixed(2),
      needsImprovement: r.adGroupAd?.adStrength === 'POOR' || r.adGroupAd?.adStrength === 'FAIR',
    }));

    return res.json({ ok: true, ads });
  } catch (e: any) {
    console.error('[GoogleOptimizer] rsa-performance hata:', e.message);
    return res.json({ ok: true, ads: [], mode: 'no_data' });
  }
});

// ── ENDPOINT 10: POST /weekly-report ─────────────────────────────────────────

router.post('/weekly-report', async (req: any, res: any) => {
  try {
    const [campaignsRes, qsSnapshotRes, searchTermActionsRes] = await Promise.allSettled([
      supabase.from('google_campaigns').select('*').eq('user_id', req.userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('google_qs_snapshots').select('*').eq('user_id', req.userId).order('recorded_at', { ascending: false }).limit(1).single(),
      supabase.from('google_search_term_actions').select('*').eq('user_id', req.userId).gte('applied_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const campaigns = campaignsRes.status === 'fulfilled' ? campaignsRes.value.data || [] : [];
    const qsSnapshot = qsSnapshotRes.status === 'fulfilled' ? qsSnapshotRes.value.data : null;
    const searchTermActions = searchTermActionsRes.status === 'fulfilled' ? searchTermActionsRes.value.data || [] : [];

    const reportMessage = `Generate a weekly Google Ads performance report.

Campaign Data (${campaigns.length} campaigns):
${campaigns.slice(0, 5).map((c: any) => `- ${c.name}: Status=${c.status}, Goal=${c.goal}, Budget=$${c.daily_budget}/day`).join('\n')}

Quality Score Snapshot:
${qsSnapshot ? `- Avg QS: ${qsSnapshot.summary?.avgQs || 'N/A'}\n- Below 6: ${qsSnapshot.summary?.below6Count || 0} keywords\n- Above 7: ${qsSnapshot.summary?.above7Count || 0} keywords\n- Health Score: ${qsSnapshot.summary?.healthScore || 0}%\n- Estimated Monthly Savings if fixed: $${qsSnapshot.summary?.estimatedMonthlySavings || 0}` : 'No QS data available'}

Search Term Actions (Last 7 days): ${searchTermActions.length} actions taken
${searchTermActions.slice(0, 5).map((a: any) => `- ${a.action}: "${a.search_term}"`).join('\n')}

Return JSON:
{
  "overallScore": 7,
  "headline": "Haftalık Google Ads Raporu",
  "keyMetrics": [{"metric": "string", "value": "string", "trend": "up|down|stable"}],
  "improvements": [{"title": "string", "description": "string", "impact": "high|medium|low"}],
  "warnings": [{"title": "string", "description": "string", "urgency": "critical|warning|info"}],
  "nextWeekFocus": ["odak 1", "odak 2", "odak 3"],
  "estimatedImpact": "string"
}`;

    const aiResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a Google Ads performance analyst. Generate a concise, data-driven weekly report in Turkish.',
      messages: [{ role: 'user', content: reportMessage }],
    });

    const text: string = aiResp.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    let report: any = { overallScore: 0, headline: 'Rapor hazırlanamadı', keyMetrics: [], improvements: [], warnings: [], nextWeekFocus: [], estimatedImpact: '' };

    if (match) {
      try {
        report = JSON.parse(match[0]);
      } catch (parseErr: any) {
        console.error('[GoogleOptimizer] weekly-report JSON parse hata:', parseErr.message);
      }
    }

    return res.json({ ok: true, report });
  } catch (e: any) {
    console.error('[GoogleOptimizer] weekly-report hata:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── CRON: Daily Auto-Mine ────────────────────────────────────────────────────

async function dailyAutoMine(): Promise<void> {
  try {
    console.log('[GoogleOptimizer] dailyAutoMine basliyor...');
    const { data: connections, error } = await supabase
      .from('google_ads_connections')
      .select('user_id')
      .not('access_token', 'is', null);

    if (error) {
      console.error('[GoogleOptimizer] dailyAutoMine connections hata:', error.message);
      return;
    }

    for (const conn of connections || []) {
      try {
        const creds = await getUserCreds(conn.user_id);
        if (!creds) continue;

        const { accessToken, customerId } = creds;
        const cid = customerId.replace('customers/', '').replace(/-/g, '');

        if (!cid) continue;

        const results = await gaqlSearch(cid, accessToken, `
          SELECT
            search_term_view.search_term,
            search_term_view.status,
            campaign.name,
            campaign.id,
            ad_group.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
          FROM search_term_view
          WHERE segments.date DURING LAST_14_DAYS
            AND campaign.status = 'ENABLED'
          ORDER BY metrics.cost_micros DESC
          LIMIT 300
        `);

        const negatives = results.filter((r: any) => {
          const impressions = r.metrics?.impressions || 0;
          const clicks = r.metrics?.clicks || 0;
          const cost = (r.metrics?.costMicros || 0) / 1_000_000;
          const ctr = r.metrics?.ctr || 0;
          return (impressions > 100 && clicks === 0 && cost > 0) || (ctr < 0.005 && impressions > 200);
        });

        if (results.length > 0 || negatives.length > 0) {
          await supabase.from('google_optimization_logs').insert([{
            user_id: conn.user_id,
            customer_id: cid,
            action: 'daily_auto_mine',
            reason: 'Otomatik gunluk arama terimi analizi',
            result: JSON.stringify({
              totalSearchTerms: results.length,
              potentialNegatives: negatives.length,
              topNegatives: negatives.slice(0, 5).map((r: any) => r.searchTermView?.searchTerm),
            }),
            created_at: new Date().toISOString(),
          }]).then(({ error: logErr }: any) => {
            if (logErr) console.error('[GoogleOptimizer] dailyAutoMine log hata:', logErr.message);
          });
        }

        console.log(`[GoogleOptimizer] dailyAutoMine user ${conn.user_id}: ${results.length} terim, ${negatives.length} potansiyel negatif`);
      } catch (userErr: any) {
        console.error('[GoogleOptimizer] dailyAutoMine user hata:', conn.user_id, userErr.message);
      }
    }

    console.log('[GoogleOptimizer] dailyAutoMine tamamlandi');
  } catch (e: any) {
    console.error('[GoogleOptimizer] dailyAutoMine genel hata:', e.message);
  }
}

setInterval(dailyAutoMine, 24 * 60 * 60 * 1000);
setTimeout(dailyAutoMine, 15 * 60 * 1000);

module.exports = router;
