export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// POST /api/qr/generate
router.post('/generate', async (req: any, res: any) => {
  try {
    const { url, label, type, color } = req.body;
    if (!url) return res.status(400).json({ error: 'url zorunlu' });
    const VALID_TYPES = ['url', 'whatsapp', 'phone', 'email', 'wifi', 'microsite'];
    if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Gecersiz QR tipi. Desteklenen: ' + VALID_TYPES.join(', ') });

    const c = (color || '06b6d4').replace('#', '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&format=png&margin=12&color=${c}&bgcolor=ffffff`;

    const record: any = {
      user_id: req.userId,
      url,
      label: label || url,
      type: type || 'url',
      qr_image_url: qrUrl,
      scans: 0,
    };

    // Try with color column first; if schema doesn't have it, retry without
    let data: any = null;
    let insertError: any = null;

    const r1 = await supabase.from('qr_codes').insert([{ ...record, color: c }]).select().single();
    if (!r1.error) {
      data = r1.data;
    } else {
      // Retry without color column (backward compat)
      const r2 = await supabase.from('qr_codes').insert([record]).select().single();
      if (r2.error) insertError = r2.error;
      else data = r2.data;
    }

    if (insertError) return res.status(500).json({ error: insertError.message });

    res.json({ qr: data, qrUrl, message: 'QR kod oluşturuldu!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/qr/list
router.get('/list', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('qr_codes')
      .select('*').eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ qrCodes: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/qr/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('qr_codes').select('scans, type').eq('user_id', req.userId);
    const list = data || [];
    const totalScans = list.reduce((a: number, q: any) => a + (q.scans || 0), 0);
    const typeCount: Record<string, number> = {};
    list.forEach((q: any) => { typeCount[q.type] = (typeCount[q.type] || 0) + 1 });
    const topType = Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a])[0] || '-';
    res.json({ total: list.length, totalScans, topType });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/qr/:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    await supabase.from('qr_codes').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'QR kod silindi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/qr/:id/track — scan tracking (public link redirector'dan çağrılır)
router.post('/:id/track', async (req: any, res: any) => {
  try {
    const { data: qr } = await supabase.from('qr_codes').select('scans').eq('id', req.params.id).single();
    if (qr) await supabase.from('qr_codes').update({ scans: (qr.scans || 0) + 1 }).eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
