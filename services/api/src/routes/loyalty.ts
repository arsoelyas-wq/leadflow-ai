export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/loyalty/scores
router.get('/scores', async (req: any, res: any) => {
  try {
    const { data: leads } = await supabase.from('leads').select('id, company_name, contact_name, status, won_at, phone')
      .eq('user_id', req.userId).not('status', 'eq', 'lost');

    const scores = await Promise.all((leads || []).map(async (lead: any) => {
      const { data: messages } = await supabase.from('messages').select('id, sent_at').eq('lead_id', lead.id);
      const { data: invoices } = await supabase.from('invoices').select('amount, status').eq('lead_id', lead.id);

      const msgCount = messages?.length || 0;
      const totalPaid = invoices?.filter((i: any) => i.status === 'paid').reduce((a: number, i: any) => a + parseFloat(i.amount || 0), 0) || 0;
      const isWon = lead.status === 'won';

      // Puan hesapla
      let points = 0;
      if (isWon) points += 100;
      points += Math.min(msgCount * 5, 50);
      points += Math.min(Math.floor(totalPaid / 100), 200);

      const tier = points >= 300 ? 'platinum' : points >= 200 ? 'gold' : points >= 100 ? 'silver' : 'bronze';

      return { lead, points, tier, msgCount, totalPaid };
    }));

    scores.sort((a, b) => b.points - a.points);
    res.json({ scores: scores.slice(0, 50) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/loyalty/add-points
router.post('/add-points', async (req: any, res: any) => {
  try {
    const { leadId, points, reason } = req.body;
    await supabase.from('loyalty_points').insert([{
      user_id: req.userId, lead_id: leadId,
      points, reason, created_at: new Date().toISOString(),
    }]);
    res.json({ message: `${points} puan eklendi` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/loyalty/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads').select('status').eq('user_id', req.userId);
    res.json({ total: data?.length || 0, won: data?.filter((d: any) => d.status === 'won').length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;