export {};
/**
 * LeadFlow — Müşteri Arama Numaraları (Caller ID)
 *
 * Doğrulama yok — kullanıcı zaten kimlik doğrulamasından geçmiş.
 * Numara eklenince direkt is_verified=true olur.
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function normalizeE164(phone: string): string {
  let num = phone.replace(/[\s\-\(\)\.]/g, '');
  if (num.startsWith('+')) return num;
  if (num.startsWith('00')) return '+' + num.slice(2);
  if (num.startsWith('0') && num.length >= 10) return '+90' + num.slice(1);
  return '+' + num;
}

// ─── GET /api/voice/caller-ids ────────────────────────────────────────────────
router.get('/', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_caller_ids')
      .select('*')
      .eq('user_id', req.userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CallerID] list error:', error);
      throw new Error(error.message);
    }
    res.json({ callerIds: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/voice/caller-ids/add ──────────────────────────────────────────
// Yeni numara ekle — doğrulama kodu yok, direkt aktif
router.post('/add', async (req: any, res: any) => {
  try {
    const { phoneNumber, friendlyName, countryCode } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber zorunlu' });

    const normalized = normalizeE164(phoneNumber);

    // Zaten ekli mi?
    const { data: existing } = await supabase
      .from('user_caller_ids')
      .select('id, is_verified')
      .eq('user_id', req.userId)
      .eq('phone_number', normalized)
      .maybeSingle();

    if (existing?.is_verified) {
      return res.status(409).json({ error: 'Bu numara zaten eklenmiş ve aktif' });
    }

    // Kaç doğrulanmış numara var?
    const { count: verifiedCount } = await supabase
      .from('user_caller_ids')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('is_verified', true);

    const isFirst = (verifiedCount ?? 0) === 0;
    const now = new Date().toISOString();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('user_caller_ids')
        .update({
          friendly_name: friendlyName || normalized,
          is_verified:   true,
          verified_at:   now,
          is_default:    isFirst,
        })
        .eq('id', existing.id);
      if (updateErr) {
        console.error('[CallerID] update error:', updateErr);
        return res.status(500).json({ error: `Güncelleme hatası: ${updateErr.message}` });
      }
    } else {
      const { error: insertErr } = await supabase.from('user_caller_ids').insert([{
        user_id:       req.userId,
        phone_number:  normalized,
        friendly_name: friendlyName || normalized,
        country_code:  countryCode || '',
        is_verified:   true,
        verified_at:   now,
        is_default:    isFirst,
      }]);
      if (insertErr) {
        console.error('[CallerID] insert error:', insertErr);
        return res.status(500).json({ error: `Kayıt hatası: ${insertErr.message}` });
      }
    }

    // Eğer bu ilk numaraysa diğerleri varsa default'ları kaldır (güvenli)
    if (isFirst) {
      await supabase.from('user_caller_ids')
        .update({ is_default: false })
        .eq('user_id', req.userId)
        .eq('is_default', true)
        .neq('phone_number', normalized);
    }

    console.log(`[CallerID] Added & verified: ${normalized} userId=${req.userId}`);
    res.json({
      ok:          true,
      phoneNumber: normalized,
      verified:    true,
      isDefault:   isFirst,
      message:     `${normalized} başarıyla eklendi ve aktif edildi.`,
    });
  } catch (e: any) {
    console.error('[CallerID] /add error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/voice/caller-ids/sms-verify ───────────────────────────────────
// Geriye uyumluluk — artık kullanılmıyor, /add direkt doğrular
router.post('/sms-verify', async (req: any, res: any) => {
  res.json({ ok: true, message: 'Numara zaten ekleme sırasında doğrulanır.' });
});

// ─── POST /api/voice/caller-ids/verify ────────────────────────────────────────
router.post('/verify', async (req: any, res: any) => {
  res.json({ ok: true, message: 'Numara zaten ekleme sırasında doğrulanır.' });
});

// ─── POST /api/voice/caller-ids/:id/set-default ───────────────────────────────
router.post('/:id/set-default', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    await supabase
      .from('user_caller_ids')
      .update({ is_default: false })
      .eq('user_id', req.userId);

    const { data, error } = await supabase
      .from('user_caller_ids')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', req.userId)
      .eq('is_verified', true)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Numara bulunamadı veya aktif değil' });

    res.json({ ok: true, defaultNumber: data.phone_number });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/voice/caller-ids/:id ────────────────────────────────────────
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const { data: record } = await supabase
      .from('user_caller_ids')
      .select('phone_number, is_default')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (!record) return res.status(404).json({ error: 'Numara bulunamadı' });

    await supabase.from('user_caller_ids').delete().eq('id', id).eq('user_id', req.userId);

    if (record.is_default) {
      const { data: others } = await supabase
        .from('user_caller_ids')
        .select('id')
        .eq('user_id', req.userId)
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (others && others.length > 0) {
        await supabase.from('user_caller_ids').update({ is_default: true }).eq('id', others[0].id);
      }
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/voice/caller-ids/default ───────────────────────────────────────
router.get('/default', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('user_caller_ids')
      .select('phone_number, friendly_name')
      .eq('user_id', req.userId)
      .eq('is_verified', true)
      .eq('is_default', true)
      .maybeSingle();

    res.json({ defaultCallerId: data?.phone_number || null, friendlyName: data?.friendly_name || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
