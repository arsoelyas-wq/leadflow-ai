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

    // Kaç numara var kontrol et (plan bazlı limit)
    const { count } = await supabase
      .from('wa_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

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

    // WhatsApp bağlantısını başlat
    try {
      const { initWhatsApp } = require('./settings');
      const result = await initWhatsApp(userId, newNumber.id);

      if (result.qr) {
        return res.json({ number: newNumber, qr: result.qr, status: 'qr_pending' });
      }
      if (result.status === 'connected') {
        await supabase.from('wa_numbers')
          .update({ status: 'connected', phone_number: result.phone })
          .eq('id', newNumber.id);
        return res.json({ number: newNumber, status: 'connected' });
      }
    } catch (e: any) {
      console.error('WA init error:', e.message);
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

// GET /api/wa-numbers/stats — Günlük gönderim istatistikleri
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