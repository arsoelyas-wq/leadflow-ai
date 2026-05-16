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
    const { status, source, city, search, sector, ids, list, page = 1, limit = 20 } = req.query;
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
    if (sector) query = query.ilike('sector', `%${sector}%`);
    if (search) query = query.ilike('company_name', `%${search}%`);
    if (ids) {
      const idList = String(ids).split(',').filter(Boolean);
      if (idList.length > 0) query = query.in('id', idList);
    }
    if (list) query = query.ilike('notes', `[📁 ${list}]%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ leads: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/sectors — Distinct sector list for filter dropdown
router.get('/sectors', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('sector')
      .eq('user_id', req.userId)
      .not('sector', 'is', null);
    if (error) throw error;
    const sectors = [...new Set((data || []).map((r: any) => r.sector).filter(Boolean))].sort();
    res.json({ sectors });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/export — Excel/CSV download
router.get('/export', authMiddleware, async (req: any, res: any) => {
  try {
    const { status, sector, search, ids } = req.query;

    let query = supabase
      .from('leads')
      .select('company_name,contact_name,phone,email,website,city,sector,source,score,status,notes,created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (ids) {
      const idList = String(ids).split(',').filter(Boolean);
      if (idList.length > 0) query = query.in('id', idList);
    } else {
      if (status) query = query.eq('status', status);
      if (sector) query = query.ilike('sector', `%${sector}%`);
      if (search) query = query.ilike('company_name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const xlsx = require('xlsx');
    const colMap: Record<string, string> = {
      company_name: 'Firma Adı', contact_name: 'Karar Verici', phone: 'Telefon',
      email: 'E-posta', website: 'Web Sitesi', city: 'Şehir', sector: 'Sektör',
      source: 'Kaynak', score: 'Puan', status: 'Durum', notes: 'Notlar', created_at: 'Tarih',
    };
    const statusTR: Record<string, string> = {
      new: 'Yeni', contacted: 'İletişime Geçildi', qualified: 'Nitelikli',
      replied: 'Cevap Verdi', offered: 'Teklif Verildi', won: 'Kazanıldı', lost: 'Kaybedildi',
    };

    const rows = (data || []).map((l: any) => {
      const row: any = {};
      for (const [k, label] of Object.entries(colMap)) {
        let val = l[k];
        if (k === 'status') val = statusTR[val] || val;
        if (k === 'created_at') val = val ? new Date(val).toLocaleDateString('tr-TR') : '';
        row[label] = val ?? '';
      }
      return row;
    });

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Leadler');

    // Auto column widths
    const colWidths = Object.values(colMap).map((h: string) => ({ wch: Math.max(h.length + 2, 14) }));
    ws['!cols'] = colWidths;

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `leadflow-leads-${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/lists — Distinct named list names parsed from notes field
router.get('/lists', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('notes')
      .eq('user_id', req.userId)
      .ilike('notes', '[📁%')
      .limit(2000);
    if (error) throw error;

    const listSet = new Set<string>();
    const re = /^\[📁 (.+?)\]/;
    for (const row of data || []) {
      const m = (row.notes || '').match(re);
      if (m) listSet.add(m[1]);
    }
    res.json({ lists: [...listSet].sort() });
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