export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

router.get('/predictions', async (req: any, res: any) => {
  try {
    const { data: leads } = await supabase.from('leads').select('id, company_name, status, created_at, last_contact_at, score, won_at').eq('user_id', req.userId).eq('status', 'won');

    const predictions = await Promise.all((leads || []).map(async (lead: any) => {
      const { data: messages } = await supabase.from('messages').select('sent_at').eq('lead_id', lead.id).order('sent_at', { ascending: false }).limit(1);
      const { data: invoices } = await supabase.from('invoices').select('status, created_at').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1);

      const lastMessage = messages?.[0]?.sent_at;
      const daysSinceContact = lastMessage ? Math.floor((Date.now() - new Date(lastMessage).getTime()) / 86400000) : 999;
      const lastInvoice = invoices?.[0];

      // Churn skoru hesapla
      let churnScore = 0;
      if (daysSinceContact > 90) churnScore += 40;
      else if (daysSinceContact > 60) churnScore += 25;
      else if (daysSinceContact > 30) churnScore += 10;
      if (lastInvoice?.status === 'overdue') churnScore += 30;
      if (!lastMessage) churnScore += 20;

      const risk = churnScore >= 60 ? 'high' : churnScore >= 30 ? 'medium' : 'low';

      return { lead, churnScore, risk, daysSinceContact, lastMessageDate: lastMessage, lastInvoiceStatus: lastInvoice?.status };
    }));

    predictions.sort((a, b) => b.churnScore - a.churnScore);

    res.json({ predictions: predictions.slice(0, 20), highRisk: predictions.filter(p => p.risk === 'high').length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads').select('id, status').eq('user_id', req.userId);
    res.json({ total: data?.filter((l: any) => l.status === 'won').length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;