export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/admin/support-tickets — list all tickets with optional status filter
router.get('/', async (req: any, res: any) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('support_tickets')
      .select('id, ticket_number, user_email, user_name, category, title, priority, status, admin_reply, admin_name, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    // Status counts for tab badges
    const { data: allRows } = await supabase.from('support_tickets').select('status');
    const statusCounts = (allRows || []).reduce((acc: any, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({ tickets: data || [], statusCounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/support-tickets/:id — full detail with attachments
router.get('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Bulunamadı' });
    res.json({ ticket: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/support-tickets/:id — update status and/or admin reply
router.patch('/:id', async (req: any, res: any) => {
  try {
    const { status, admin_reply } = req.body;
    const updateData: any = {};

    if (status) updateData.status = status;
    if (admin_reply !== undefined && admin_reply !== null) {
      updateData.admin_reply = admin_reply;
      updateData.admin_name = req.adminEmail;
      updateData.admin_replied_at = new Date().toISOString();
    }
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Güncellenecek alan yok' });
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', req.params.id)
      .select('id, ticket_number, status, admin_reply, admin_name, admin_replied_at, updated_at')
      .single();

    if (error) throw error;
    res.json({ ticket: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
