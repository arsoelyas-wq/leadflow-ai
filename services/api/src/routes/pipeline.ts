export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const STAGES = ['new', 'contacted', 'replied', 'proposal', 'negotiation', 'won', 'lost'];

// GET /api/pipeline/board — Kanban board
router.get('/board', async (req: any, res: any) => {
  try {
    const { data: leads } = await supabase.from('leads')
      .select('id, company_name, contact_name, phone, status, sector, city, source, ai_grade, created_at, last_contacted_at')
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false });

    const board: Record<string, any[]> = {};
    STAGES.forEach(s => { board[s] = []; });

    (leads || []).forEach((lead: any) => {
      const stage = STAGES.includes(lead.status) ? lead.status : 'new';
      board[stage].push(lead);
    });

    const stats = {
      total: leads?.length || 0,
      won: board['won'].length,
      lost: board['lost'].length,
      inProgress: (leads?.length || 0) - board['won'].length - board['lost'].length,
    };

    res.json({ board, stages: STAGES, stats });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/pipeline/move — Lead'i taşı
router.patch('/move', async (req: any, res: any) => {
  try {
    const { leadId, newStage } = req.body;
    if (!leadId || !newStage) return res.status(400).json({ error: 'leadId ve newStage zorunlu' });
    if (!STAGES.includes(newStage)) return res.status(400).json({ error: 'Geçersiz aşama' });

    const updateData: any = { status: newStage, updated_at: new Date().toISOString() };
    if (newStage === 'won') updateData.won_at = new Date().toISOString();

    await supabase.from('leads').update(updateData)
      .eq('id', leadId).eq('user_id', req.userId);

    // Workflow tetikle
    if (['proposal', 'won', 'lost'].includes(newStage)) {
      const workflowMap: Record<string, string> = {
        proposal: 'proposal_sent',
        won: 'won_customer',
        lost: 'retargeting',
      };
      await supabase.from('workflow_enrollments').insert([{
        user_id: req.userId, lead_id: leadId,
        workflow_type: workflowMap[newStage],
        current_step: 0, status: 'active',
        started_at: new Date().toISOString(),
        next_step_at: new Date().toISOString(),
      }]).catch(() => {});
    }

    res.json({ success: true, message: `Lead ${newStage} aşamasına taşındı` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/pipeline/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads').select('status').eq('user_id', req.userId);
    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s] = 0; });
    (data || []).forEach((d: any) => {
      const s = STAGES.includes(d.status) ? d.status : 'new';
      counts[s]++;
    });
    res.json({ counts, total: data?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;