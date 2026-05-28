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

    const c = (color || '00bcd4').replace('#', '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&format=png&margin=12&color=${c}&bgcolor=ffffff`;

    const { data } = await supabase.from('qr_codes').insert([{
      user_id: req.userId,
      url,
      label: label || url,
      type: type || 'url',
      qr_image_url: qrUrl,
      color: c,
      scans: 0,
    }]).select().single();

    res.json({ qr: data, qrUrl, message: 'QR kod oluşturuldu!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/qr/list
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('qr_codes')
      .select('*').eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    res.json({ qrCodes: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/qr/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('qr_codes').select('scans, type').eq('user_id', req.userId);
    const totalScans = data?.reduce((a: number, q: any) => a + (q.scans || 0), 0) || 0;
    const topType = data?.length
      ? Object.entries(data.reduce((acc: any, q: any) => ({ ...acc, [q.type]: (acc[q.type] || 0) + 1 }), {}))
          .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '-'
      : '-';
    res.json({ total: data?.length || 0, totalScans, topType });
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
