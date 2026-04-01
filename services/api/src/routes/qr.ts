export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// POST /api/qr/generate
router.post('/generate', async (req: any, res: any) => {
  try {
    const { url, label, type } = req.body;
    if (!url) return res.status(400).json({ error: 'url zorunlu' });

    // QR kod API - ücretsiz
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&format=png&margin=10`;

    await supabase.from('qr_codes').insert([{
      user_id: req.userId,
      url, label: label || url,
      type: type || 'url',
      qr_image_url: qrUrl,
      scans: 0,
      created_at: new Date().toISOString(),
    }]);

    res.json({ qrUrl, message: 'QR kod oluşturuldu!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/qr/list
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('qr_codes').select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ qrCodes: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/qr/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('qr_codes').select('scans').eq('user_id', req.userId);
    res.json({ total: data?.length || 0, totalScans: data?.reduce((a: number, q: any) => a + (q.scans || 0), 0) || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;