export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/leads — Liste (filtre + sayfalama)
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { status, source, city, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);
    if (city)   query = query.ilike('city', `%${city}%`);
    if (search) query = query.ilike('company_name', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ leads: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/:id — Tek lead detayı
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !lead) return res.status(404).json({ error: 'Lead bulunamadi' });
    res.json({ lead });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/leads/:id — Güncelle
router.patch('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const allowed = ['status', 'notes', 'score', 'contact_name', 'phone', 'email'];
    const updates: any = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ lead: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/leads/bulk-status — Toplu durum güncelle
router.post('/bulk-status', authMiddleware, async (req: any, res: any) => {
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) return res.status(400).json({ error: 'ids ve status gerekli' });

    const { error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true, updated: ids.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;