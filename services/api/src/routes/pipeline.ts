export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { fireCapiEvent } = require('../services/meta-capi');
const { fireGoogleConversion } = require('../services/google-enhanced-conversions');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const STAGES = ['new', 'contacted', 'replied', 'proposal', 'negotiation', 'won', 'lost'];
const CARDS_PER_PAGE = 30;

// GET /api/pipeline/board — Optimized board with per-stage pagination
router.get('/board', async (req: any, res: any) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, company_name, contact_name, phone, email, website, status, sector, city, source, score, created_at, updated_at')
      .eq('user_id', req.userId)
      .order('score', { ascending: false });

    if (error) throw error;

    const board: Record<string, any[]> = {};
    const stageCounts: Record<string, number> = {};
    const stageScoreSum: Record<string, number> = {};
    const stageDaysSum: Record<string, number> = {};
    STAGES.forEach(s => { board[s] = []; stageCounts[s] = 0; stageScoreSum[s] = 0; stageDaysSum[s] = 0; });

    const now = Date.now();
    (leads || []).forEach((lead: any) => {
      const stage = STAGES.includes(lead.status) ? lead.status : 'new';
      const lastUpdate = lead.updated_at || lead.created_at;
      const daysInStage = Math.floor((now - new Date(lastUpdate).getTime()) / 86400000);

      stageCounts[stage]++;
      stageScoreSum[stage] += (lead.score || 0);
      stageDaysSum[stage] += daysInStage;

      // Only send first CARDS_PER_PAGE cards per stage (rest loaded on demand)
      if (board[stage].length < CARDS_PER_PAGE) {
        board[stage].push({ ...lead, daysInStage });
      }
    });

    const total = leads?.length || 0;
    const won   = stageCounts['won'];
    const lost  = stageCounts['lost'];
    const inProgress = total - won - lost;
    const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    // Per-stage analytics
    const stageAnalytics: Record<string, { count: number; avgScore: number; avgDays: number; hasMore: boolean }> = {};
    STAGES.forEach(s => {
      const c = stageCounts[s];
      stageAnalytics[s] = {
        count: c,
        avgScore: c > 0 ? Math.round(stageScoreSum[s] / c) : 0,
        avgDays: c > 0 ? Math.round(stageDaysSum[s] / c) : 0,
        hasMore: c > CARDS_PER_PAGE,
      };
    });

    // Conversion funnel
    const funnel = STAGES.slice(0, 6).map((stage, i) => ({
      stage,
      count: stageCounts[stage],
      rate: i > 0 && stageCounts[STAGES[i - 1]] > 0
        ? Math.round((stageCounts[stage] / stageCounts[STAGES[i - 1]]) * 100)
        : 100,
    }));

    // Bottleneck: stage with highest avg days (excluding won/lost)
    const activeStages = STAGES.filter(s => !['won', 'lost'].includes(s) && stageCounts[s] > 0);
    const bottleneck = activeStages.length > 0
      ? activeStages.reduce((a, b) => stageAnalytics[a].avgDays > stageAnalytics[b].avgDays ? a : b)
      : null;

    res.json({
      board,
      stages: STAGES,
      stageCounts,
      stageAnalytics,
      stats: { total, won, lost, inProgress, winRate, bottleneck },
      funnel,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pipeline/stage/:stage — Load more cards for a stage
router.get('/stage/:stage', async (req: any, res: any) => {
  try {
    const { stage } = req.params;
    const offset = parseInt(req.query.offset || '0', 10);
    const limit  = parseInt(req.query.limit  || String(CARDS_PER_PAGE), 10);

    if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Geçersiz aşama' });

    const { data, error } = await supabase
      .from('leads')
      .select('id, company_name, contact_name, phone, email, website, status, sector, city, source, score, created_at, updated_at')
      .eq('user_id', req.userId)
      .eq('status', stage)
      .order('score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const now = Date.now();
    const cards = (data || []).map((lead: any) => {
      const lastUpdate = lead.updated_at || lead.created_at;
      const daysInStage = Math.floor((now - new Date(lastUpdate).getTime()) / 86400000);
      return { ...lead, daysInStage };
    });

    res.json({ cards, hasMore: cards.length === limit });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/pipeline/move — Move lead to new stage
router.patch('/move', async (req: any, res: any) => {
  try {
    const { leadId, newStage } = req.body;
    if (!leadId || !newStage) return res.status(400).json({ error: 'leadId ve newStage zorunlu' });
    if (!STAGES.includes(newStage)) return res.status(400).json({ error: 'Geçersiz aşama' });

    const updateData: any = {
      status: newStage,
      updated_at: new Date().toISOString(),
    };
    if (newStage === 'won') updateData.won_at = new Date().toISOString();

    await supabase.from('leads')
      .update(updateData)
      .eq('id', leadId)
      .eq('user_id', req.userId);

    // Trigger workflow automations
    const workflowMap: Record<string, string> = {
      proposal: 'proposal_sent',
      won:      'won_customer',
      lost:     'retargeting',
    };
    if (workflowMap[newStage]) {
      await supabase.from('workflow_enrollments').insert([{
        user_id:       req.userId,
        lead_id:       leadId,
        workflow_type: workflowMap[newStage],
        current_step:  0,
        status:        'active',
        started_at:    new Date().toISOString(),
        next_step_at:  new Date().toISOString(),
      }]).catch(() => {});
    }

    try {
      await supabase.from('lead_activities').insert({
        lead_id:    leadId,
        user_id:    req.userId,
        event_type: 'status_change',
        metadata:   { from: null, to: newStage },
      });
    } catch {}

    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (lead) {
        if (newStage === 'won') {
          await fireCapiEvent(supabase, req.userId, lead, 'Purchase', { value: lead.deal_value || 0, orderId: `won-${leadId}` });
          await fireGoogleConversion(supabase, req.userId, lead, 'Purchase', { value: lead.deal_value || 0 });
        } else if (newStage === 'proposal') {
          await fireCapiEvent(supabase, req.userId, lead, 'InitiateCheckout');
        } else if (newStage === 'contacted' || newStage === 'replied') {
          await fireCapiEvent(supabase, req.userId, lead, 'Contact');
          await fireGoogleConversion(supabase, req.userId, lead, 'LeadFormSubmit');
        }
      }
    } catch {}

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pipeline/stats — Summary stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('leads')
      .select('status')
      .eq('user_id', req.userId);

    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s] = 0; });
    (data || []).forEach((d: any) => {
      const s = STAGES.includes(d.status) ? d.status : 'new';
      counts[s]++;
    });

    const total      = data?.length || 0;
    const won        = counts['won'] || 0;
    const lost       = counts['lost'] || 0;
    const inProgress = total - won - lost;
    const winRate    = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    res.json({ counts, total, won, lost, inProgress, winRate });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
