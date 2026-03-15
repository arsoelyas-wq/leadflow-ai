export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── WEBHOOK TETIKLEYICILER ────────────────────────────────
// new_lead, lead_replied, lead_status_changed, campaign_completed, sequence_completed

// Webhook gönder
async function sendWebhook(webhook: any, payload: any) {
  try {
    const signature = crypto
      .createHmac('sha256', webhook.secret || '')
      .update(JSON.stringify(payload))
      .digest('hex');

    await axios.post(webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-LeadFlow-Signature': `sha256=${signature}`,
        'X-LeadFlow-Event': payload.event,
        'User-Agent': 'LeadFlow-Webhook/1.0',
      },
      timeout: 10000,
    });

    // Başarılı log
    await supabase.from('webhook_logs').insert([{
      webhook_id: webhook.id,
      event: payload.event,
      status: 'success',
      payload: JSON.stringify(payload),
    }]);

    return true;
  } catch (e: any) {
    // Hata log
    await supabase.from('webhook_logs').insert([{
      webhook_id: webhook.id,
      event: payload.event,
      status: 'failed',
      error: e.message,
      payload: JSON.stringify(payload),
    }]).catch(() => {});

    return false;
  }
}

// Tüm kullanıcı webhook'larını tetikle
async function triggerWebhooks(userId: string, event: string, data: any) {
  try {
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .contains('events', [event]);

    if (!webhooks?.length) return;

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    await Promise.allSettled(webhooks.map((wh: any) => sendWebhook(wh, payload)));
  } catch (e: any) {
    console.error('Webhook trigger error:', e.message);
  }
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/webhooks
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ webhooks: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/webhooks — Yeni webhook
router.post('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, url, events } = req.body;

    if (!name || !url || !events?.length) {
      return res.status(400).json({ error: 'name, url, events zorunlu' });
    }

    // URL doğrula
    try { new URL(url); } catch { return res.status(400).json({ error: 'Geçersiz URL' }); }

    const secret = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabase
      .from('webhooks')
      .insert([{ user_id: userId, name, url, events, secret, active: true }])
      .select().single();

    if (error) throw error;
    res.json({ webhook: data, secret, message: 'Webhook oluşturuldu!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/webhooks/:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('webhooks').delete().eq('id', req.params.id).eq('user_id', userId);
    res.json({ message: 'Webhook silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/webhooks/:id/toggle
router.patch('/:id/toggle', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: wh } = await supabase.from('webhooks').select('active').eq('id', req.params.id).eq('user_id', userId).single();
    await supabase.from('webhooks').update({ active: !wh?.active }).eq('id', req.params.id);
    res.json({ active: !wh?.active });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/webhooks/:id/test — Test gönder
router.post('/:id/test', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: wh } = await supabase.from('webhooks').select('*').eq('id', req.params.id).eq('user_id', userId).single();
    if (!wh) return res.status(404).json({ error: 'Webhook bulunamadı' });

    const success = await sendWebhook(wh, {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'LeadFlow webhook test', userId },
    });

    res.json({ success, message: success ? 'Test başarılı!' : 'Test başarısız' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/webhooks/:id/logs
router.get('/:id/logs', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: wh } = await supabase.from('webhooks').select('id').eq('id', req.params.id).eq('user_id', userId).single();
    if (!wh) return res.status(404).json({ error: 'Webhook bulunamadı' });

    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ logs: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, triggerWebhooks };