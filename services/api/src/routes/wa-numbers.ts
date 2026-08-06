export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── ROUTES ────────────────────────────────────────────────

// GET /api/wa-numbers
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('wa_numbers')
      .select('id, phone_number, display_name, status, daily_limit, sent_today, is_primary, last_reset_at, created_at')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });
    if (error) throw error;
    res.json({ numbers: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wa-numbers/connect — Yeni numara ekle + QR
router.post('/connect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { displayName, dailyLimit } = req.body;

    // Kaç aktif numara var kontrol et (disconnected sayılmaz)
    const { count } = await supabase
      .from('wa_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['connected', 'connecting']);

    const { data: user } = await supabase
      .from('users')
      .select('plan_type')
      .eq('id', userId)
      .single();

    const limits: Record<string, number> = { starter: 1, professional: 3, enterprise: 10 };
    const maxNumbers = limits[user?.plan_type || 'starter'] || 1;

    if ((count || 0) >= maxNumbers) {
      return res.status(400).json({
        error: `Planınız maksimum ${maxNumbers} numara destekliyor. Upgrade için /billing sayfasına gidin.`
      });
    }

    // Yeni numara kaydı oluştur
    const isPrimary = (count || 0) === 0;
    const { data: newNumber, error } = await supabase
      .from('wa_numbers')
      .insert([{
        user_id: userId,
        display_name: displayName || `Numara ${(count || 0) + 1}`,
        status: 'connecting',
        daily_limit: dailyLimit || 100,
        is_primary: isPrimary,
      }])
      .select()
      .single();

    if (error) throw error;

    // Embedded WA Gateway ile instance oluştur (Railway API içinde Baileys)
    const instanceId = `${userId.slice(0, 8)}-${Date.now()}`;
    await supabase.from('wa_instances').insert([{
      user_id: userId, instance_id: instanceId, status: 'creating',
    }]);

    try {
      const { startNewInstance } = require('../lib/waGateway');
      const qr = await startNewInstance(instanceId, userId);
      if (qr) {
        return res.json({ number: newNumber, qr, status: 'qr_pending', instanceId });
      }
    } catch (e: any) {
      console.error('[WA Numbers] Embedded gateway error:', e.message?.slice(0, 80));
    }

    res.json({ number: newNumber, status: 'pending' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wa-numbers/:id/disconnect
router.post('/:id/disconnect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('wa_numbers')
      .update({ status: 'disconnected', session_data: null })
      .eq('id', req.params.id)
      .eq('user_id', userId);
    res.json({ message: 'Numara bağlantısı kesildi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wa-numbers/:id/reconnect — Bağlantısı kesik numarayı yeniden bağla
router.post('/:id/reconnect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: num } = await supabase.from('wa_numbers')
      .select('id, status').eq('id', req.params.id).eq('user_id', userId).single();
    if (!num) return res.status(404).json({ error: 'Numara bulunamadı' });

    // Durumu 'connecting' yap ki onConnected handler doğru bulabilsin
    await supabase.from('wa_numbers').update({ status: 'connecting' }).eq('id', req.params.id);

    // Yeni instance oluştur
    const instanceId = `${userId.slice(0, 8)}-${Date.now()}`;
    await supabase.from('wa_instances').insert([{
      user_id: userId, instance_id: instanceId, status: 'creating',
    }]);

    const { startNewInstance } = require('../lib/waGateway');
    const qr = await startNewInstance(instanceId, userId);
    if (qr) {
      return res.json({ qr, status: 'qr_pending', instanceId });
    }

    res.json({ status: 'pending' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/wa-numbers/:id — Güncelle
router.patch('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { displayName, dailyLimit, isPrimary } = req.body;
    const updates: any = {};
    if (displayName) updates.display_name = displayName;
    if (dailyLimit) updates.daily_limit = dailyLimit;

    if (isPrimary) {
      // Diğerlerinin primary'sini kaldır
      await supabase.from('wa_numbers')
        .update({ is_primary: false })
        .eq('user_id', userId);
      updates.is_primary = true;
    }

    await supabase.from('wa_numbers').update(updates).eq('id', req.params.id).eq('user_id', userId);
    res.json({ message: 'Güncellendi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/wa-numbers/:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('wa_numbers').delete().eq('id', req.params.id).eq('user_id', userId);
    res.json({ message: 'Numara silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wa-numbers/qr-status — QR polling (Green API + Baileys)
router.get('/qr-status', async (req: any, res: any) => {
  try {
    // 1. Check wa_numbers — any recently connected?
    const { data: nums } = await supabase.from('wa_numbers')
      .select('status, phone_number').eq('user_id', req.userId).eq('status', 'connected').limit(1);
    if (nums?.length) return res.json({ status: 'connected', connected: true, qr: null });

    // 2. Check wa_instances — any connected?
    const { data: inst } = await supabase.from('wa_instances')
      .select('status, phone, instance_id').eq('user_id', req.userId).eq('status', 'connected').limit(1);
    if (inst?.length) {
      // Sync to wa_numbers
      const { data: pending } = await supabase.from('wa_numbers')
        .select('id').eq('user_id', req.userId).eq('status', 'connecting')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (pending) {
        await supabase.from('wa_numbers').update({ status: 'connected', phone_number: inst[0].phone }).eq('id', pending.id);
      }
      return res.json({ status: 'connected', connected: true, qr: null });
    }

    // 3. Embedded gateway'den QR al
    const { data: creating } = await supabase.from('wa_instances')
      .select('instance_id').eq('user_id', req.userId).eq('status', 'creating')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (creating?.instance_id) {
      const { getQR, getStatus } = require('../lib/waGateway');
      const qr = getQR(creating.instance_id);
      const status = getStatus(creating.instance_id);
      if (status === 'connected') return res.json({ status: 'connected', connected: true, qr: null });
      if (qr) return res.json({ status: 'qr_ready', connected: false, qr });
    }

    // 4. Baileys fallback (eski bağlantılar için)
    const { waState } = require('./settings');
    const state = waState[req.userId];
    res.json({
      status: state?.status || 'disconnected',
      qr: state?.qr || null,
      connected: state?.status === 'connected',
    });
  } catch { res.json({ status: 'disconnected', qr: null, connected: false }); }
});

// GET /api/wa-numbers/stats — Gunluk gonderim istatistikleri
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('wa_numbers')
      .select('id, phone_number, display_name, status, daily_limit, sent_today, is_primary')
      .eq('user_id', userId);
    if (error) throw error;

    const total = (data || []).reduce((s: number, n: any) => s + (n.daily_limit || 0), 0);
    const used = (data || []).reduce((s: number, n: any) => s + (n.sent_today || 0), 0);
    const connected = (data || []).filter((n: any) => n.status === 'connected').length;

    res.json({
      numbers: data || [],
      totalCapacity: total,
      usedToday: used,
      remaining: total - used,
      connected,
      total: data?.length || 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wa-numbers/diagnose — Tam zinciri teşhis et
router.get('/diagnose', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const WA_GATEWAY = process.env.WA_GATEWAY_URL || 'http://207.154.248.119:3003';
    const axios = require('axios');
    const report: any = { userId, gateway: WA_GATEWAY, numbers: [], instances: [], gatewayHealth: null };

    // wa_numbers
    const { data: numbers } = await supabase.from('wa_numbers')
      .select('id, phone_number, display_name, status, daily_limit, sent_today, is_primary, created_at')
      .eq('user_id', userId);
    report.numbers = numbers || [];

    // wa_instances
    const { data: instances } = await supabase.from('wa_instances')
      .select('instance_id, status, phone, connected_at, created_at')
      .eq('user_id', userId);
    report.instances = instances || [];

    // phone match check
    report.phoneMatchCheck = (numbers || []).map((n: any) => {
      const match = (instances || []).find((i: any) => i.phone === n.phone_number && i.status === 'connected');
      return {
        wa_number_id: n.id,
        wa_number_phone: n.phone_number,
        wa_number_status: n.status,
        matching_instance: match ? match.instance_id : null,
        match_ok: !!match,
      };
    });

    // Gateway health check
    try {
      const health = await axios.get(`${WA_GATEWAY}/health`, { timeout: 5000 });
      report.gatewayHealth = { ok: true, status: health.status, data: health.data };
    } catch (e: any) {
      report.gatewayHealth = { ok: false, error: e.message };
    }

    // For each connected instance, check gateway instance status
    report.gatewayInstanceStatus = [];
    for (const inst of (instances || []).filter((i: any) => i.status === 'connected')) {
      try {
        const statusRes = await axios.get(`${WA_GATEWAY}/instance/${inst.instance_id}/status`, { timeout: 5000 });
        report.gatewayInstanceStatus.push({ instance_id: inst.instance_id, data: statusRes.data });
      } catch (e: any) {
        report.gatewayInstanceStatus.push({ instance_id: inst.instance_id, error: e.message });
      }
    }

    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wa-numbers/test-send — Test mesajı gönder
router.post('/test-send', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { phone, message = 'Test mesajı — LeadFlow AI' } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone zorunlu' });

    const WA_GATEWAY = process.env.WA_GATEWAY_URL || 'http://207.154.248.119:3003';
    const axios = require('axios');
    const log: string[] = [];

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
      : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;
    log.push(`Hedef numara: ${formattedPhone}`);

    // wa_numbers bul
    const { data: numbers } = await supabase.from('wa_numbers')
      .select('id, phone_number, daily_limit, sent_today, status, is_primary')
      .eq('user_id', userId).eq('status', 'connected');
    log.push(`Bağlı numara sayısı: ${numbers?.length || 0}`);

    if (!numbers?.length) {
      return res.json({ success: false, log, error: 'Bağlı WhatsApp numarası yok' });
    }

    const available = numbers.filter((n: any) => (n.sent_today || 0) < (n.daily_limit || 100));
    if (!available.length) {
      return res.json({ success: false, log, error: 'Tüm numaralar günlük limitte' });
    }

    const chosen = available[0];
    log.push(`Seçilen numara: ${chosen.phone_number}`);

    // wa_instances bul
    const { data: instance } = await supabase.from('wa_instances')
      .select('instance_id, status, phone').eq('phone', chosen.phone_number).eq('status', 'connected').maybeSingle();
    log.push(`wa_instances kaydı: ${instance ? `bulundu (${instance.instance_id})` : 'YOK — phone eşleşmesi yok'}`);

    if (!instance) {
      const { data: allInst } = await supabase.from('wa_instances').select('instance_id, status, phone').eq('user_id', userId);
      log.push(`Tüm wa_instances: ${JSON.stringify(allInst?.map((i: any) => ({ id: i.instance_id, status: i.status, phone: i.phone })))}`);
      return res.json({ success: false, log, error: 'wa_instances kaydı bulunamadı — phone format uyuşmazlığı olabilir' });
    }

    // Gateway'e gönder
    try {
      log.push(`Gateway'e gönderiliyor: ${WA_GATEWAY}/send`);
      const sendRes = await axios.post(`${WA_GATEWAY}/send`, {
        instanceId: instance.instance_id,
        phone: formattedPhone,
        message,
      }, { timeout: 15000 });
      log.push(`Gateway yanıtı: ${JSON.stringify(sendRes.data)}`);
      res.json({ success: true, log, gatewayResponse: sendRes.data });
    } catch (e: any) {
      log.push(`Gateway hatası: ${e.message}`);
      res.json({ success: false, log, error: `Gateway hatası: ${e.message}` });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wa-numbers/reset-daily — Günlük sayaçları sıfırla (cron)
router.post('/reset-daily', async (req: any, res: any) => {
  try {
    await supabase.from('wa_numbers').update({
      sent_today: 0,
      last_reset_at: new Date().toISOString(),
    }).lt('last_reset_at', new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString());
    res.json({ message: 'Günlük sayaçlar sıfırlandı' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Her gece 00:00'da sayaçları sıfırla
const now = new Date();
const midnight = new Date();
midnight.setHours(0, 0, 0, 0);
midnight.setDate(midnight.getDate() + 1);
setTimeout(() => {
  supabase.from('wa_numbers').update({ sent_today: 0, last_reset_at: new Date().toISOString() }).neq('id', 'none');
  setInterval(() => {
    supabase.from('wa_numbers').update({ sent_today: 0, last_reset_at: new Date().toISOString() }).neq('id', 'none');
  }, 24 * 60 * 60 * 1000);
}, midnight.getTime() - now.getTime());

module.exports = router;