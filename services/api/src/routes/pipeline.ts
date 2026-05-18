export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const STAGES = ['new', 'contacted', 'replied', 'proposal', 'negotiation', 'won', 'lost'];

// GET /api/pipeline/board — Full Kanban board with rich card data
router.get('/board', async (req: any, res: any) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id, company_name, contact_name, phone, email,
        status, sector, city, source, score, ai_grade,
        hot_score, last_activity_at, ai_summary,
        created_at, updated_at
      `)
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const board: Record<string, any[]> = {};
    STAGES.forEach(s => { board[s] = []; });

    const now = Date.now();
    (leads || []).forEach((lead: any) => {
      const stage = STAGES.includes(lead.status) ? lead.status : 'new';
      // Days in current stage (proxy: time since last status update)
      const lastUpdate = lead.updated_at || lead.created_at;
      const daysInStage = Math.floor((now - new Date(lastUpdate).getTime()) / 86400000);
      board[stage].push({ ...lead, daysInStage });
    });

    // Stats
    const total = leads?.length || 0;
    const won   = board['won'].length;
    const lost  = board['lost'].length;
    const inProgress = total - won - lost;
    const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    // Conversion rates between adjacent stages
    const funnel = STAGES.slice(0, 6).map((stage, i) => ({
      stage,
      count: board[stage].length,
      rate: i > 0 && board[STAGES[i - 1]].length > 0
        ? Math.round((board[stage].length / board[STAGES[i - 1]].length) * 100)
        : 100,
    }));

    res.json({
      board,
      stages: STAGES,
      stats: { total, won, lost, inProgress, winRate },
      funnel,
    });
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

    // Log activity event
    try {
      await supabase.from('lead_activities').insert({
        lead_id:    leadId,
        user_id:    req.userId,
        event_type: 'status_change',
        metadata:   { from: null, to: newStage },
      });
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
