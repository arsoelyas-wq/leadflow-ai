export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// POST /api/automations/webhook â€” Gelen webhook'u iÅŸle
router.post('/webhook/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const data = req.body;

    // Webhook'u kaydet
    await supabase.from('automation_logs').insert([{
      user_id: userId, type: 'incoming',
      payload: JSON.stringify(data),
      source: req.headers['x-source'] || 'webhook',
      received_at: new Date().toISOString(),
    }]);

    // Lead olarak ekle
    if (data.name || data.company || data.phone || data.email) {
      const { data: existing } = await supabase.from('leads').select('id')
        .eq('user_id', userId)
        .eq('phone', data.phone || '').maybeSingle();

      if (!existing && (data.phone || data.email)) {
        await supabase.from('leads').insert([{
          user_id: userId,
          company_name: data.company || data.name || 'Webhook Lead',
          contact_name: data.name || null,
          phone: data.phone || null,
          email: data.email || null,
          source: data.source || 'zapier',
          status: 'new',
          notes: data.notes || null,
        }]);
      }
    }

    res.json({ success: true, message: 'Webhook iÅŸlendi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/automations/webhook-url â€” Webhook URL'sini al
router.get('/webhook-url', async (req: any, res: any) => {
  const url = `https://leadflow-ai-production.up.railway.app/api/automations/webhook/${req.userId}`;
  res.json({ url, userId: req.userId });
});

// POST /api/automations/zap â€” Zapier'e veri gÃ¶nder
router.post('/zap', async (req: any, res: any) => {
  try {
    const { zapierWebhookUrl, leadId, eventType } = req.body;
    if (!zapierWebhookUrl) return res.status(400).json({ error: 'zapierWebhookUrl zorunlu' });

    let payload: any = { event: eventType || 'new_lead', timestamp: new Date().toISOString() };

    if (leadId) {
      const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
      if (lead) payload = { ...payload, lead };
    }

    await axios.post(zapierWebhookUrl, payload, { timeout: 10000 });

    await supabase.from('automation_logs').insert([{
      user_id: req.userId, type: 'outgoing',
      payload: JSON.stringify(payload),
      destination: zapierWebhookUrl,
      sent_at: new Date().toISOString(),
    }]);

    res.json({ success: true, message: 'Zapier\'e gÃ¶nderildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/automations/settings â€” Zapier URL kaydet
router.post('/settings', async (req: any, res: any) => {
  try {
    const { zapierUrl, makeUrl, n8nUrl, autoSendNewLeads } = req.body;
    await supabase.from('automation_settings').upsert([{
      user_id: req.userId, zapier_url: zapierUrl, make_url: makeUrl,
      n8n_url: n8nUrl, auto_send_new_leads: autoSendNewLeads || false,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    res.json({ message: 'Otomasyon ayarlarÄ± kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/automations/settings
router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('automation_settings').select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || null });
  } catch { res.json({ settings: null }); }
});

// GET /api/automations/logs
router.get('/logs', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('automation_logs').select('*')
      .eq('user_id', req.userId).order('received_at', { ascending: false }).limit(20);
    res.json({ logs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/automations/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('automation_logs').select('type').eq('user_id', req.userId);
    const { data: settings } = await supabase.from('automation_settings').select('zapier_url').eq('user_id', req.userId).single();
    res.json({
      total: data?.length || 0,
      incoming: data?.filter((d: any) => d.type === 'incoming').length || 0,
      outgoing: data?.filter((d: any) => d.type === 'outgoing').length || 0,
      configured: !!(settings?.zapier_url),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;