export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GRAPH = 'https://graph.facebook.com/v18.0';

// ── HELPER: week label ────────────────────────────────────
function getISOWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ── HELPER: score a single lead row ──────────────────────
function scoreLead(lead: any): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let score = 0;

  // phone: +30
  if (lead.phone && String(lead.phone).trim().length > 0) {
    breakdown.phone = 30;
    score += 30;
  } else {
    breakdown.phone = 0;
  }

  // email: +20
  if (lead.email && String(lead.email).trim().length > 0) {
    breakdown.email = 20;
    score += 20;
  } else {
    breakdown.email = 0;
  }

  // company_name not a phone number (length > 5 AND not all digits): +15
  const cn = String(lead.company_name || '');
  if (cn.length > 5 && !/^\d+$/.test(cn)) {
    breakdown.company_name = 15;
    score += 15;
  } else {
    breakdown.company_name = 0;
  }

  // source: highest intent
  if (lead.source === 'meta_lead_form') {
    breakdown.source = 20;
    score += 20;
  } else if (lead.source === 'google_ads') {
    breakdown.source = 15;
    score += 15;
  } else {
    breakdown.source = 0;
  }

  // fresh (within last 24h): +10
  const created = lead.created_at ? new Date(lead.created_at).getTime() : 0;
  if (created > 0 && Date.now() - created < 24 * 60 * 60 * 1000) {
    breakdown.fresh = 10;
    score += 10;
  } else {
    breakdown.fresh = 0;
  }

  // already contacted: -5
  if (lead.status === 'contacted') {
    breakdown.contacted = -5;
    score -= 5;
  } else {
    breakdown.contacted = 0;
  }

  return { score: Math.max(0, Math.min(100, score)), breakdown };
}

// ─────────────────────────────────────────────────────────
// 1. GET /combined-roi
// ─────────────────────────────────────────────────────────
router.get('/combined-roi', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      metaLeads7Result,
      metaLeads30Result,
      googleLeads7Result,
      googleLeads30Result,
      campaignsResult,
    ] = await Promise.allSettled([
      supabase.from('leads').select('id, ad_spend, created_at', { count: 'exact' })
        .eq('user_id', userId).ilike('source', 'meta%').gte('created_at', d7),
      supabase.from('leads').select('id, ad_spend, created_at', { count: 'exact' })
        .eq('user_id', userId).ilike('source', 'meta%').gte('created_at', d30),
      supabase.from('leads').select('id, created_at', { count: 'exact' })
        .eq('user_id', userId).ilike('source', 'google%').gte('created_at', d7),
      supabase.from('leads').select('id, created_at', { count: 'exact' })
        .eq('user_id', userId).ilike('source', 'google%').gte('created_at', d30),
      supabase.from('ad_campaigns').select('platform, spend_today, daily_budget, created_at')
        .eq('user_id', userId).gte('created_at', d30),
    ]);

    const safeData = (r: PromiseSettledResult<any>) =>
      r.status === 'fulfilled' ? (r.value.data || []) : [];
    const safeCount = (r: PromiseSettledResult<any>) =>
      r.status === 'fulfilled' ? (r.value.count || r.value.data?.length || 0) : 0;

    const metaLeads7 = safeCount(metaLeads7Result);
    const metaLeads30 = safeCount(metaLeads30Result);
    const googleLeads7 = safeCount(googleLeads7Result);
    const googleLeads30 = safeCount(googleLeads30Result);

    // sum ad_spend from leads rows
    const metaLeads7Data = safeData(metaLeads7Result);
    const metaLeads30Data = safeData(metaLeads30Result);
    const metaSpend7FromLeads = metaLeads7Data.reduce((s: number, l: any) => s + (parseFloat(l.ad_spend) || 0), 0);
    const metaSpend30FromLeads = metaLeads30Data.reduce((s: number, l: any) => s + (parseFloat(l.ad_spend) || 0), 0);

    // aggregate spend from ad_campaigns
    const campaigns = safeData(campaignsResult);
    let metaSpend30Camp = 0;
    let googleSpend30Camp = 0;
    let metaSpend7Camp = 0;
    let googleSpend7Camp = 0;
    for (const c of campaigns) {
      const spend = parseFloat(c.spend_today) || 0;
      const isRecent7 = c.created_at && new Date(c.created_at).getTime() >= new Date(d7).getTime();
      if (c.platform === 'meta' || c.platform === 'facebook') {
        metaSpend30Camp += spend;
        if (isRecent7) metaSpend7Camp += spend;
      } else if (c.platform === 'google') {
        googleSpend30Camp += spend;
        if (isRecent7) googleSpend7Camp += spend;
      }
    }

    const metaSpend7 = metaSpend7FromLeads + metaSpend7Camp;
    const metaSpend30 = metaSpend30FromLeads + metaSpend30Camp;
    const googleSpend7 = googleSpend7Camp;
    const googleSpend30 = googleSpend30Camp;

    const metaCpl7 = metaLeads7 > 0 ? parseFloat((metaSpend7 / metaLeads7).toFixed(2)) : 0;
    const googleCpl7 = googleLeads7 > 0 ? parseFloat((googleSpend7 / googleLeads7).toFixed(2)) : 0;

    const totalLeads = metaLeads7 + googleLeads7;
    const totalSpend = metaSpend7 + googleSpend7;
    const avgCpl = totalLeads > 0 ? parseFloat((totalSpend / totalLeads).toFixed(2)) : 0;
    const bestChannel = metaLeads7 > googleLeads7 ? 'meta' : googleLeads7 > metaLeads7 ? 'google' : totalLeads === 0 ? 'none' : 'meta';

    // weekly trend — last 4 weeks
    const weeklyTrend: any[] = [];
    const allMetaLeads30 = safeData(metaLeads30Result);
    const allGoogleLeads30 = safeData(googleLeads30Result);
    const weekMap: Record<string, { meta_leads: number; google_leads: number }> = {};
    for (const l of allMetaLeads30) {
      const wk = getISOWeekLabel(new Date(l.created_at));
      if (!weekMap[wk]) weekMap[wk] = { meta_leads: 0, google_leads: 0 };
      weekMap[wk].meta_leads++;
    }
    for (const l of allGoogleLeads30) {
      const wk = getISOWeekLabel(new Date(l.created_at));
      if (!weekMap[wk]) weekMap[wk] = { meta_leads: 0, google_leads: 0 };
      weekMap[wk].google_leads++;
    }
    for (const [week, counts] of Object.entries(weekMap).sort()) {
      weeklyTrend.push({ week, meta_leads: counts.meta_leads, google_leads: counts.google_leads });
    }

    res.json({
      ok: true,
      meta: {
        leads_7d: metaLeads7,
        leads_30d: metaLeads30,
        spend_7d: parseFloat(metaSpend7.toFixed(2)),
        spend_30d: parseFloat(metaSpend30.toFixed(2)),
        cpl_7d: metaCpl7,
      },
      google: {
        leads_7d: googleLeads7,
        leads_30d: googleLeads30,
        spend_7d: parseFloat(googleSpend7.toFixed(2)),
        spend_30d: parseFloat(googleSpend30.toFixed(2)),
        cpl_7d: googleCpl7,
      },
      combined: {
        total_leads: totalLeads,
        total_spend: parseFloat(totalSpend.toFixed(2)),
        avg_cpl: avgCpl,
        best_channel: bestChannel,
      },
      weekly_trend: weeklyTrend,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// 2. GET /smart-alerts
// ─────────────────────────────────────────────────────────
router.get('/smart-alerts', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [alertsResult, leads24hResult, adSettingsResult] = await Promise.allSettled([
      supabase.from('ad_alerts').select('type, severity, message, campaign_name, created_at')
        .eq('user_id', userId).eq('read', false).order('created_at', { ascending: false }).limit(50),
      supabase.from('leads').select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', since24h)
        .or('source.ilike.meta%,source.ilike.google%'),
      supabase.from('ad_settings').select('five_minute_rule').eq('user_id', userId).single(),
    ]);

    const rawAlerts = alertsResult.status === 'fulfilled' ? (alertsResult.value.data || []) : [];
    const leads24h = leads24hResult.status === 'fulfilled'
      ? (leads24hResult.value.count || leads24hResult.value.data?.length || 0)
      : 0;
    const adSettings = adSettingsResult.status === 'fulfilled' ? adSettingsResult.value.data : null;

    const alerts: any[] = rawAlerts.map((a: any) => ({
      type: a.type,
      severity: a.severity || 'info',
      message: a.message,
      campaign_name: a.campaign_name || null,
      created_at: a.created_at,
      action: a.type === 'high_cpm' ? 'Hedef kitleyi daralt' :
              a.type === 'low_ctr' ? 'Reklam kreatifini değiştir' :
              a.type === 'budget_depleted' ? 'Günlük bütçeyi artır' : 'İncele',
    }));

    // synthetic: no new leads in 24h
    if (leads24h === 0) {
      alerts.unshift({
        type: 'no_new_leads',
        severity: 'warning',
        message: 'Son 24 saatte Meta veya Google\'dan yeni lead gelmedi.',
        action: 'Kampanya durumunu ve bütçeyi kontrol et',
      });
    }

    // synthetic: 5-minute rule disabled but leads exist today
    if (adSettings && adSettings.five_minute_rule === false && leads24h > 0) {
      alerts.push({
        type: 'five_minute_disabled',
        severity: 'info',
        message: '5 Dakika Kuralı kapalı — yeni leadler otomatik aranmıyor.',
        action: 'Ayarlar → Ads Intelligence\'dan etkinleştir',
      });
    }

    res.json({
      ok: true,
      alerts,
      new_leads_24h: leads24h,
      unread_count: rawAlerts.length,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// 3. POST /score-lead
// ─────────────────────────────────────────────────────────
router.post('/score-lead', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ ok: false, error: 'leadId zorunlu' });

    const { data: lead, error: fetchErr } = await supabase
      .from('leads')
      .select('id, phone, email, company_name, source, created_at, status')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !lead) {
      return res.status(404).json({ ok: false, error: 'Lead bulunamadı' });
    }

    const { score, breakdown } = scoreLead(lead);

    await supabase
      .from('leads')
      .update({ lead_score: score })
      .eq('id', leadId)
      .eq('user_id', userId);

    res.json({ ok: true, leadId, score, breakdown });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// 4. POST /score-all-leads
// ─────────────────────────────────────────────────────────
router.post('/score-all-leads', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;

    const { data: leads, error: fetchErr } = await supabase
      .from('leads')
      .select('id, phone, email, company_name, source, created_at, status')
      .eq('user_id', userId)
      .or('source.ilike.meta%,source.ilike.google%');

    if (fetchErr) return res.status(500).json({ ok: false, error: fetchErr.message });
    if (!leads || leads.length === 0) return res.json({ ok: true, scored: 0, avg_score: 0 });

    let totalScore = 0;
    let scored = 0;

    // batch updates — run in parallel chunks of 20
    const CHUNK = 20;
    for (let i = 0; i < leads.length; i += CHUNK) {
      const chunk = leads.slice(i, i + CHUNK);
      await Promise.allSettled(
        chunk.map(async (lead: any) => {
          const { score } = scoreLead(lead);
          totalScore += score;
          scored++;
          await supabase
            .from('leads')
            .update({ lead_score: score })
            .eq('id', lead.id)
            .eq('user_id', userId);
        })
      );
    }

    const avg_score = scored > 0 ? parseFloat((totalScore / scored).toFixed(1)) : 0;
    res.json({ ok: true, scored, avg_score });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// 5. POST /auto-pause-check
// ─────────────────────────────────────────────────────────
router.post('/auto-pause-check', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;

    // If ad_campaigns table doesn't exist, return ok with 0s
    let campaigns: any[] = [];
    try {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('id, campaign_id, platform, status, daily_budget, spend_today, ctr')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        // table may not exist
        return res.json({ ok: true, paused: 0, checked: 0 });
      }
      campaigns = data || [];
    } catch {
      return res.json({ ok: true, paused: 0, checked: 0 });
    }

    // Fetch meta token once (may be null — that's ok)
    let metaToken: string | null = null;
    try {
      const { data } = await supabase
        .from('meta_connections')
        .select('access_token')
        .eq('user_id', userId)
        .single();
      metaToken = data?.access_token || null;
    } catch {}

    const checked = campaigns.length;
    let paused = 0;
    const details: any[] = [];

    for (const camp of campaigns) {
      const ctr = parseFloat(camp.ctr) || 0;
      const spend = parseFloat(camp.spend_today) || 0;

      const shouldPause = ctr < 0.3 && spend > 20;
      if (!shouldPause) continue;

      const reason = `CTR çok düşük (${ctr.toFixed(2)}) — günlük harcama $${spend.toFixed(2)}`;

      if (camp.platform === 'meta' || camp.platform === 'facebook') {
        if (metaToken && camp.campaign_id) {
          try {
            await axios.post(
              `${GRAPH}/${camp.campaign_id}`,
              { status: 'PAUSED' },
              { params: { access_token: metaToken }, timeout: 15000 }
            );
          } catch {
            // non-fatal — still mark in DB
          }
        }
        await supabase
          .from('ad_campaigns')
          .update({ status: 'PAUSED', paused_reason: reason })
          .eq('id', camp.id)
          .eq('user_id', userId);

        paused++;
        details.push({ campaignId: camp.campaign_id || camp.id, reason });
      } else if (camp.platform === 'google') {
        // Google: flag only — do not call API
        await supabase
          .from('ad_campaigns')
          .update({ status: 'PAUSED', paused_reason: reason })
          .eq('id', camp.id)
          .eq('user_id', userId);

        paused++;
        details.push({ campaignId: camp.campaign_id || camp.id, reason: `[Google — flagged] ${reason}` });
      }
    }

    res.json({ ok: true, paused, checked, details });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
