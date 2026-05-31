export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/loyalty/scores → returns customers with health score fields
router.get('/scores', async (req: any, res: any) => {
  try {
    const { data: leads } = await supabase.from('leads')
      .select('id, company_name, contact_name, status, won_at, phone, city, sector, created_at')
      .eq('user_id', req.userId)
      .not('status', 'eq', 'lost')
      .order('created_at', { ascending: false })
      .limit(200);

    const customers = await Promise.all((leads || []).map(async (lead: any) => {
      const [{ data: messages }, { data: repliedMsgs }, { data: invoices }, { data: lastMsg }] = await Promise.all([
        supabase.from('messages').select('id').eq('lead_id', lead.id),
        supabase.from('messages').select('id').eq('lead_id', lead.id).eq('direction', 'in'),
        supabase.from('invoices').select('amount, status').eq('lead_id', lead.id),
        supabase.from('messages').select('sent_at').eq('lead_id', lead.id).order('sent_at', { ascending: false }).limit(1),
      ]);

      const totalPaid = (invoices || []).filter((i: any) => i.status === 'paid').reduce((a: number, i: any) => a + parseFloat(i.amount || 0), 0);

      return {
        id: lead.id,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        status: lead.status,
        city: lead.city,
        sector: lead.sector,
        total_paid: totalPaid,
        total_messages: messages?.length || 0,
        replied_messages: repliedMsgs?.length || 0,
        last_contact: lastMsg?.[0]?.sent_at || lead.won_at || null,
      };
    }));

    res.json({ customers });
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
