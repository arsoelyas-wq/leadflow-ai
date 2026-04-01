export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/reports/weekly
router.get('/weekly', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [leads, messages, campaigns, invoices, coaching] = await Promise.all([
      supabase.from('leads').select('id, status, source, created_at').eq('user_id', userId).gte('created_at', weekAgo),
      supabase.from('messages').select('id, direction, channel').eq('user_id', userId).gte('sent_at', weekAgo),
      supabase.from('campaigns').select('id, status').eq('user_id', userId),
      supabase.from('invoices').select('amount, status').eq('user_id', userId),
      supabase.from('sales_coaching').select('analysis_score').eq('user_id', userId).gte('created_at', weekAgo),
    ]);

    const newLeads = leads.data?.length || 0;
    const wonLeads = leads.data?.filter((l: any) => l.status === 'won').length || 0;
    const sentMessages = messages.data?.filter((m: any) => m.direction === 'out').length || 0;
    const totalRevenue = invoices.data?.filter((i: any) => i.status === 'paid').reduce((a: number, i: any) => a + parseFloat(i.amount || 0), 0) || 0;
    const avgCoaching = coaching.data?.length ? Math.round(coaching.data.reduce((a: number, c: any) => a + (c.analysis_score || 0), 0) / coaching.data.length) : 0;

    const sourceCounts: Record<string, number> = {};
    leads.data?.forEach((l: any) => { sourceCounts[l.source || 'manual'] = (sourceCounts[l.source || 'manual'] || 0) + 1; });

    res.json({
      period: '7 gün',
      newLeads,
      wonLeads,
      conversionRate: newLeads > 0 ? Math.round((wonLeads / newLeads) * 100) : 0,
      sentMessages,
      totalRevenue,
      avgCoachingScore: avgCoaching,
      topSource: Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'manual',
      sourceCounts,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/reports/monthly
router.get('/monthly', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [leads, messages, invoices] = await Promise.all([
      supabase.from('leads').select('id, status, source, created_at').eq('user_id', userId).gte('created_at', monthAgo),
      supabase.from('messages').select('id, direction').eq('user_id', userId).gte('sent_at', monthAgo),
      supabase.from('invoices').select('amount, status').eq('user_id', userId).gte('created_at', monthAgo),
    ]);

    res.json({
      period: '30 gün',
      newLeads: leads.data?.length || 0,
      wonLeads: leads.data?.filter((l: any) => l.status === 'won').length || 0,
      sentMessages: messages.data?.filter((m: any) => m.direction === 'out').length || 0,
      totalRevenue: invoices.data?.filter((i: any) => i.status === 'paid').reduce((a: number, i: any) => a + parseFloat(i.amount || 0), 0) || 0,
      overdueAmount: invoices.data?.filter((i: any) => i.status === 'overdue').reduce((a: number, i: any) => a + parseFloat(i.amount || 0), 0) || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;