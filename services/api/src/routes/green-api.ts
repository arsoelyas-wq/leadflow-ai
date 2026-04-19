export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const WA_GATEWAY = process.env.WA_GATEWAY || 'http://207.154.248.119:3003';
const WA_SECRET = process.env.WA_SECRET || 'leadflow-wa-secret-2026';

// POST /api/green-api/webhook — Gateway'den gelen mesajlar
router.post('/webhook', async (req: any, res: any) => {
  try {
    const { secret, instanceId, userId, phone, text, timestamp, messageId } = req.body;
    if (secret !== WA_SECRET) return res.status(403).json({ error: 'Yetkisiz' });

    res.json({ ok: true });

    // Hangi üyeye ait bu instance?
    const { data: instance } = await supabase
      .from('wa_instances')
      .select('*, ti_members(*)')
      .eq('instance_id', instanceId)
      .single();

    if (!instance) {
      console.log('Instance bulunamadi:', instanceId);
      return;
    }

    const realUserId = instance.user_id;
    const memberId = instance.member_id;
    const memberName = instance.ti_members?.name || 'Temsilci';

    // Lead bul veya oluştur
    let { data: lead } = await supabase
      .from('leads')
      .select('id, company_name')
      .eq('user_id', realUserId)
      .eq('phone', phone)
      .single();

    if (!lead) {
      const { data: newLead } = await supabase
        .from('leads')
        .insert([{ user_id: realUserId, phone, company_name: phone, status: 'new' }])
        .select().single();
      lead = newLead;
    }

    // Mesajı kaydet
    await supabase.from('messages').insert([{
      user_id: realUserId,
      lead_id: lead?.id,
      channel: 'whatsapp',
      direction: 'in',
      content: text,
      status: 'received',
      sent_at: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : new Date().toISOString(),
      agent_id: memberId,
      agent_name: memberName,
    }]);

    console.log(`Mesaj kaydedildi: ${memberName} -> ${phone}: ${text.slice(0, 50)}`);
  } catch (e: any) {
    console.error('Webhook error:', e.message);
  }
});

// POST /api/green-api/connected — Bağlantı başarılı bildirimi
router.post('/connected', async (req: any, res: any) => {
  try {
    const { secret, instanceId, userId, phone } = req.body;
    if (secret !== WA_SECRET) return res.status(403).json({ error: 'Yetkisiz' });

    await supabase.from('wa_instances')
      .update({ status: 'connected', phone, connected_at: new Date().toISOString() })
      .eq('instance_id', instanceId);

    // ti_members tablosunda wa_phone güncelle
    const { data: instance } = await supabase
      .from('wa_instances').select('member_id').eq('instance_id', instanceId).single();

    if (instance?.member_id) {
      await supabase.from('ti_members')
        .update({ wa_phone: phone })
        .eq('id', instance.member_id);
    }

    console.log(`Instance baglandi: ${instanceId} - ${phone}`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/green-api/instance/create — Yeni instance oluştur
router.post('/instance/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: 'memberId zorunlu' });

    const instanceId = `${userId.slice(0,8)}-${memberId.slice(0,8)}-${Date.now()}`;

    // Veritabanına kaydet
    const { data, error } = await supabase.from('wa_instances').insert([{
      user_id: userId,
      member_id: memberId,
      instance_id: instanceId,
      status: 'creating',
    }]).select().single();
    if (error) throw error;

    // Gateway'e bildir
    await axios.post(`${WA_GATEWAY}/instance/create`, {
      secret: WA_SECRET, instanceId, userId,
    });

    res.json({ ok: true, instanceId, message: 'Instance olusturuldu, QR bekleniyor' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/green-api/instance/:instanceId/qr — QR kod al
router.get('/instance/:instanceId/qr', async (req: any, res: any) => {
  try {
    const { instanceId } = req.params;
    const r = await axios.get(`${WA_GATEWAY}/instance/${instanceId}/qr`);
    res.json(r.data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/green-api/instance/:instanceId/status
router.get('/instance/:instanceId/status', async (req: any, res: any) => {
  try {
    const { instanceId } = req.params;
    const [gatewayStatus, dbStatus] = await Promise.allSettled([
      axios.get(`${WA_GATEWAY}/instance/${instanceId}/status`),
      supabase.from('wa_instances').select('*').eq('instance_id', instanceId).single(),
    ]);

    const gateway = gatewayStatus.status === 'fulfilled' ? gatewayStatus.value.data : null;
    const db = dbStatus.status === 'fulfilled' ? dbStatus.value.data : null;

    res.json({ instanceId, gateway, db });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/green-api/instance/:instanceId
router.delete('/instance/:instanceId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { instanceId } = req.params;

    await axios.delete(`${WA_GATEWAY}/instance/${instanceId}`, {
      data: { secret: WA_SECRET }
    });

    await supabase.from('wa_instances')
      .update({ status: 'deleted' })
      .eq('instance_id', instanceId)
      .eq('user_id', userId);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/green-api/instances — Tüm instancelar
router.get('/instances', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase
      .from('wa_instances')
      .select('*, ti_members(name, role)')
      .eq('user_id', userId)
      .neq('status', 'deleted');
    res.json({ instances: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/green-api/send — Mesaj gönder
router.post('/send', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { instanceId, phone, text } = req.body;

    const r = await axios.post(`${WA_GATEWAY}/send`, {
      secret: WA_SECRET, instanceId, phone, text
    });

    // Giden mesajı kaydet
    const { data: instance } = await supabase
      .from('wa_instances').select('member_id, ti_members(name)').eq('instance_id', instanceId).single();

    await supabase.from('messages').insert([{
      user_id: userId,
      channel: 'whatsapp',
      direction: 'out',
      content: text,
      status: 'sent',
      sent_at: new Date().toISOString(),
      agent_id: instance?.member_id,
      agent_name: (instance as any)?.ti_members?.name,
    }]);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;