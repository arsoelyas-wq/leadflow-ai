export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/developer/keys
router.get('/keys', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase.from('api_keys')
      .select('id, name, key_preview, created_at, last_used_at, is_active, requests_count')
      .eq('user_id', userId).order('created_at', { ascending: false });
    res.json({ keys: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/developer/keys
router.post('/keys', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name zorunlu' });

    const apiKey = `lf_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    await supabase.from('api_keys').insert([{
      user_id: userId,
      name,
      key_hash: keyHash,
      key_preview: `lf_...${apiKey.slice(-8)}`,
      is_active: true,
    }]);

    res.json({ apiKey, message: 'API key oluşturuldu — sadece bir kez gösterilir!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/developer/keys/:id
router.delete('/keys/:id', async (req: any, res: any) => {
  try {
    await supabase.from('api_keys')
      .update({ is_active: false })
      .eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'API key devre dışı bırakıldı' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/developer/docs — API Dokümantasyon
router.get('/docs', async (req: any, res: any) => {
  const docs = {
    version: '1.0',
    baseUrl: 'https://leadflow-ai-production.up.railway.app',
    authentication: 'Bearer token veya API Key (X-API-Key header)',
    endpoints: [
      { method: 'GET', path: '/api/leads', description: 'Tüm leadleri listele', params: 'limit, offset, status, city' },
      { method: 'POST', path: '/api/leads', description: 'Yeni lead ekle', body: '{ company_name, phone, email, city, sector }' },
      { method: 'POST', path: '/api/campaigns', description: 'Kampanya oluştur', body: '{ name, message, leadIds }' },
      { method: 'GET', path: '/api/analytics/financial', description: 'Finansal analitik' },
      { method: 'POST', path: '/api/video-outreach/create', description: 'Video oluştur', body: '{ leadId, avatarId, voiceId }' },
      { method: 'GET', path: '/api/video-outreach/list', description: 'Video listesi' },
      { method: 'POST', path: '/api/proposals/create', description: 'Teklif oluştur', body: '{ leadId, items, notes }' },
      { method: 'GET', path: '/api/health-scores/scores', description: 'Müşteri sağlık skorları' },
    ],
  };
  res.json(docs);
});

// GET /api/developer/usage
router.get('/usage', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: keys } = await supabase.from('api_keys')
      .select('requests_count').eq('user_id', userId).eq('is_active', true);
    const totalRequests = (keys || []).reduce((s: number, k: any) => s + (k.requests_count || 0), 0);
    res.json({ totalRequests, limit: 10000, remaining: 10000 - totalRequests });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;