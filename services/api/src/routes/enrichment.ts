export {};
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');
const { addEnrichmentJob, processEnrichmentJobs } = require('../lib/queue');
const { logActivity } = require('./activity');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HUNTER_KEY  = process.env.HUNTER_API_KEY;
const CLAUDE_KEY  = process.env.ANTHROPIC_API_KEY;

// ── Revenue estimation heuristic ──────────────────────────────────────────────
function estimateRevenue(companySize: string | null, sector: string | null): string {
  if (!companySize) return 'Bilinmiyor';
  const n = parseInt(companySize) || 0;
  if (n <= 5)   return '< ₺1M / yıl';
  if (n <= 20)  return '₺1M – ₺5M / yıl';
  if (n <= 50)  return '₺5M – ₺20M / yıl';
  if (n <= 200) return '₺20M – ₺100M / yıl';
  return '₺100M+ / yıl';
}

// ── Behavioral ML score (rule-based with event weighting) ─────────────────────
async function calcBehavioralScore(leadId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: events } = await supabase
    .from('lead_activities')
    .select('event_type')
    .eq('lead_id', leadId)
    .gte('created_at', since);

  const counts: Record<string, number> = {};
  for (const e of events || []) counts[e.event_type] = (counts[e.event_type] || 0) + 1;

  // Weights
  let bonus = 0;
  bonus += Math.min(counts['email_open']     || 0, 5)  * 3;
  bonus += Math.min(counts['email_click']    || 0, 3)  * 8;
  bonus += Math.min(counts['whatsapp_reply'] || 0, 3)  * 12;
  bonus += Math.min(counts['site_visit']     || 0, 5)  * 5;
  bonus += Math.min(counts['call_made']      || 0, 3)  * 4;

  return Math.min(bonus, 40); // max +40 behavioral bonus
}

// ── Core enrichment pipeline ──────────────────────────────────────────────────
async function enrichLead(leadId: string, userId: string, opts: { website?: string; companyName?: string; city?: string; sector?: string }) {
  const { website, companyName, city, sector } = opts;
  const updates: any = { enrichment_status: 'running' };

  await supabase.from('leads').update(updates).eq('id', leadId);

  try {
    // 1. Hunter domain-search → company size estimate
    if (website && HUNTER_KEY) {
      try {
        const domain = website.replace(/^https?:\/\//, '').split('/')[0];
        const { data: hData } = await axios.get('https://api.hunter.io/v2/domain-search', {
          params: { domain, api_key: HUNTER_KEY, limit: 5 },
          timeout: 8000,
        });
        const org = hData?.data?.organization;
        if (org) {
          updates.company_size    = org.headcount ? String(org.headcount) : null;
          updates.revenue_estimate = estimateRevenue(updates.company_size, sector || null);
        }
      } catch {}
    }

    // 2. Claude AI — company summary (Turkish)
    if (companyName && CLAUDE_KEY) {
      try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const claude = new Anthropic({ apiKey: CLAUDE_KEY });
        const msg = await claude.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `"${companyName}" şirketi hakkında 2-3 cümlelik Türkçe özet yaz. Şehir: ${city || '?'}. Sektör: ${sector || '?'}. Satış potansiyeli ve yaklaşım önerisiyle bitir. Kısa ve pratik ol.`,
          }],
        });
        updates.ai_summary = (msg.content[0] as any)?.text || null;
      } catch {}
    }

    // 3. Behavioral score boost
    const behavioralBonus = await calcBehavioralScore(leadId);
    if (behavioralBonus > 0) {
      const { data: lead } = await supabase.from('leads').select('score').eq('id', leadId).single();
      if (lead) {
        updates.score = Math.min(100, (lead.score || 50) + behavioralBonus);
      }
    }

    updates.enriched_at       = new Date().toISOString();
    updates.enrichment_status = 'done';
    await supabase.from('leads').update(updates).eq('id', leadId);
    await logActivity(leadId, userId, 'enriched', { company_size: updates.company_size, behavioral_bonus: behavioralBonus });
  } catch (e: any) {
    await supabase.from('leads').update({ enrichment_status: 'error' }).eq('id', leadId);
  }
}

// Register queue processor
processEnrichmentJobs(async (data: any) => {
  await enrichLead(data.leadId, data.userId, data);
});

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/enrichment/trigger/:leadId
router.post('/trigger/:leadId', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, user_id, website, company_name, city, sector')
      .eq('id', req.params.leadId)
      .eq('user_id', req.userId)
      .single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    await addEnrichmentJob({
      leadId: lead.id, userId: lead.user_id,
      website: lead.website, companyName: lead.company_name,
      city: lead.city, sector: lead.sector,
    });
    res.json({ queued: true, leadId: lead.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/enrichment/bulk
router.post('/bulk', authMiddleware, async (req: any, res: any) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || !leadIds.length) return res.status(400).json({ error: 'leadIds gerekli' });

    const { data: leads } = await supabase
      .from('leads')
      .select('id, user_id, website, company_name, city, sector')
      .eq('user_id', req.userId)
      .in('id', leadIds.slice(0, 50));

    let queued = 0;
    for (const lead of leads || []) {
      await addEnrichmentJob({
        leadId: lead.id, userId: lead.user_id,
        website: lead.website, companyName: lead.company_name,
        city: lead.city, sector: lead.sector,
      });
      queued++;
    }
    res.json({ queued, total: leadIds.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/enrichment/status/:leadId
router.get('/status/:leadId', authMiddleware, async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('leads')
      .select('id, enrichment_status, enriched_at, ai_summary, company_size, revenue_estimate, hot_score, score')
      .eq('id', req.params.leadId)
      .eq('user_id', req.userId)
      .single();
    res.json(data || {});
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, enrichLead };
