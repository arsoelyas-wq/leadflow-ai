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


// ═══════════════════════════════════════════════════════════════
// GERÇEK KURAL MOTORU — IF-THEN Otomasyon Engine
// ═══════════════════════════════════════════════════════════════

// ── KURAL YÜRÜTÜCÜ ──────────────────────────────────────────────
async function executeRule(rule: any, lead: any): Promise<{ success: boolean; message: string }> {
  try {
    const { sendWhatsAppMessage } = require('./settings');

    if (rule.action === 'send_whatsapp') {
      if (!lead.phone) return { success: false, message: 'Telefon numarası yok' };
      const message = (rule.action_message || 'Merhaba {ad}, sizi aramak istedik.')
        .replace('{ad}', lead.contact_name || lead.company_name || 'Değerli Müşteri')
        .replace('{firma}', lead.company_name || '')
        .replace('{telefon}', lead.phone || '');
      await sendWhatsAppMessage(rule.user_id, lead.phone, message);
      return { success: true, message: `WhatsApp gönderildi: ${lead.phone}` };
    }

    if (rule.action === 'change_status') {
      await supabase.from('leads').update({ status: rule.action_value || 'contacted' }).eq('id', lead.id);
      return { success: true, message: `Durum değiştirildi: ${rule.action_value}` };
    }

    if (rule.action === 'add_note') {
      const note = (rule.action_message || 'Otomasyon notu: {kural}')
        .replace('{kural}', rule.name || 'Otomasyon');
      const current = lead.notes || '';
      await supabase.from('leads').update({ notes: `${current}\n[${new Date().toLocaleDateString('tr-TR')}] ${note}`.trim() }).eq('id', lead.id);
      return { success: true, message: 'Not eklendi' };
    }

    if (rule.action === 'add_to_campaign') {
      if (!rule.action_campaign_id) return { success: false, message: 'Kampanya seçilmemiş' };
      const { data: campaign } = await supabase.from('campaigns').select('id, leads_list').eq('id', rule.action_campaign_id).single();
      if (!campaign) return { success: false, message: 'Kampanya bulunamadı' };
      const currentLeads: string[] = campaign.leads_list || [];
      if (!currentLeads.includes(lead.id)) {
        await supabase.from('campaigns').update({ leads_list: [...currentLeads, lead.id] }).eq('id', rule.action_campaign_id);
      }
      return { success: true, message: `Kampanyaya eklendi: ${rule.action_campaign_id}` };
    }

    return { success: false, message: `Bilinmeyen aksiyon: ${rule.action}` };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// ── KURAL KONTROL — belirli bir kural için lead'leri tara ────────
async function checkRule(rule: any): Promise<number> {
  try {
    const now = new Date();
    let matchedLeads: any[] = [];

    if (rule.trigger === 'no_reply') {
      const days = parseInt(rule.trigger_days || '2', 10);
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
      // Leads with no reply since cutoff, not won/lost
      const { data: leads } = await supabase.from('leads')
        .select('id, company_name, contact_name, phone, email, status, notes, last_contact_at')
        .eq('user_id', rule.user_id)
        .not('status', 'in', '("won","lost")')
        .or(`last_contact_at.lt.${cutoff},last_contact_at.is.null`)
        .limit(50);
      matchedLeads = leads || [];
    }

    if (rule.trigger === 'new_lead') {
      const minutesAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // son 1 saat
      const { data: leads } = await supabase.from('leads')
        .select('id, company_name, contact_name, phone, email, status, notes')
        .eq('user_id', rule.user_id)
        .eq('status', 'new')
        .gt('created_at', minutesAgo)
        .limit(50);
      matchedLeads = leads || [];
    }

    if (rule.trigger === 'deal_won') {
      const minutesAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const { data: leads } = await supabase.from('leads')
        .select('id, company_name, contact_name, phone, email, status, notes')
        .eq('user_id', rule.user_id)
        .eq('status', 'won')
        .gt('won_at', minutesAgo)
        .limit(50);
      matchedLeads = leads || [];
    }

    if (rule.trigger === 'no_contact_7d') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: leads } = await supabase.from('leads')
        .select('id, company_name, contact_name, phone, email, status, notes')
        .eq('user_id', rule.user_id)
        .not('status', 'in', '("won","lost")')
        .or(`last_contact_at.lt.${cutoff},last_contact_at.is.null`)
        .limit(50);
      matchedLeads = leads || [];
    }

    let execCount = 0;
    for (const lead of matchedLeads) {
      // Check if this rule already ran for this lead recently (avoid duplicates)
      const { data: existingLog } = await supabase.from('automation_logs')
        .select('id').eq('user_id', rule.user_id)
        .eq('rule_id', rule.id).eq('lead_id', lead.id)
        .gt('received_at', new Date(now.getTime() - (parseInt(rule.trigger_days||'1',10) * 24 * 60 * 60 * 1000)).toISOString())
        .maybeSingle();

      if (existingLog) continue; // Already ran for this lead in this period

      const result = await executeRule(rule, lead);

      await supabase.from('automation_logs').insert([{
        user_id: rule.user_id,
        rule_id: rule.id,
        lead_id: lead.id,
        type: 'rule_execution',
        source: rule.name,
        payload: JSON.stringify({ trigger: rule.trigger, action: rule.action, lead_id: lead.id }),
        destination: result.message,
        received_at: now.toISOString(),
      }]);

      if (result.success) execCount++;
      await new Promise(r => setTimeout(r, 3000)); // 3s between executions
    }

    // Update rule run count and last_run
    await supabase.from('automation_rules')
      .update({ run_count: (rule.run_count || 0) + execCount, last_run_at: now.toISOString() })
      .eq('id', rule.id);

    return execCount;
  } catch (e: any) {
    console.error(`[RuleEngine] Rule ${rule.id} error:`, e.message);
    return 0;
  }
}

// ── KURAL MOTORU ANA FONKSIYON ────────────────────────────────────
async function runRuleEngine(userId?: string) {
  try {
    let query = supabase.from('automation_rules').select('*').eq('active', true);
    if (userId) query = query.eq('user_id', userId);
    const { data: rules } = await query;
    if (!rules?.length) return;

    let total = 0;
    for (const rule of rules) {
      const count = await checkRule(rule);
      total += count;
    }
    console.log(`[RuleEngine] ${rules.length} kural çalıştı, ${total} aksiyon gerçekleşti`);
  } catch (e: any) {
    console.error('[RuleEngine] Hata:', e.message);
  }
}

// Saatte bir kez kural motorunu çalıştır
setInterval(() => runRuleEngine(), 60 * 60 * 1000);

// ── KURAL CRUD ROUTES ────────────────────────────────────────────

// GET /api/automations/rules — Kuralları listele
router.get('/rules', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('automation_rules')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ rules: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/automations/rules — Kural oluştur
router.post('/rules', async (req: any, res: any) => {
  try {
    const { name, trigger, trigger_days, action, action_message, action_value, action_campaign_id } = req.body;
    if (!name || !trigger || !action) return res.status(400).json({ error: 'name, trigger, action zorunlu' });

    const { data, error } = await supabase.from('automation_rules').insert([{
      user_id: req.userId, name, trigger, trigger_days: trigger_days || '2',
      action, action_message, action_value, action_campaign_id,
      active: true, run_count: 0,
      created_at: new Date().toISOString(),
    }]).select().single();
    if (error) throw error;
    res.json({ rule: data, message: 'Kural oluşturuldu!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/automations/rules/:id/toggle — Kural aktif/pasif
router.patch('/rules/:id/toggle', async (req: any, res: any) => {
  try {
    const { data: rule } = await supabase.from('automation_rules').select('active').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!rule) return res.status(404).json({ error: 'Kural bulunamadı' });
    const { data } = await supabase.from('automation_rules').update({ active: !rule.active }).eq('id', req.params.id).select().single();
    res.json({ rule: data, active: !rule.active });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/automations/rules/:id — Kural güncelle
router.patch('/rules/:id', async (req: any, res: any) => {
  try {
    const { name, trigger, trigger_days, action, action_message, action_value, action_campaign_id, active } = req.body;
    const { data, error } = await supabase.from('automation_rules').update({
      name, trigger, trigger_days, action, action_message, action_value, action_campaign_id, active,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('user_id', req.userId).select().single();
    if (error) throw error;
    res.json({ rule: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/automations/rules/:id — Kural sil
router.delete('/rules/:id', async (req: any, res: any) => {
  try {
    await supabase.from('automation_rules').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Kural silindi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/automations/rules/:id/run — Kural manuel çalıştır (test)
router.post('/rules/:id/run', async (req: any, res: any) => {
  try {
    const { data: rule } = await supabase.from('automation_rules').select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!rule) return res.status(404).json({ error: 'Kural bulunamadı' });
    res.json({ message: 'Kural çalışıyor...', ruleId: rule.id });
    const count = await checkRule(rule);
    console.log(`[RuleEngine] Manuel çalıştırma: ${count} aksiyon`);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/automations/rules/logs — Kural yürütme logları
router.get('/rules/logs', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('automation_logs')
      .select('*')
      .eq('user_id', req.userId)
      .eq('type', 'rule_execution')
      .order('received_at', { ascending: false })
      .limit(50);
    res.json({ logs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;