export {};
/**
 * LeadFlow — Müşteri Arama Numaraları (Caller ID)
 *
 * Twilio Verified Caller ID akışı:
 *   1. POST /add           → Twilio doğrulama araması başlatır, validationCode döner
 *   2. POST /check-status/:id → Twilio'da doğrulandı mı kontrol eder
 *   3. POST /:id/set-default  → Varsayılan numara seç
 *   4. DELETE /:id            → Numarayı sil
 *
 * Twilio bu numarayı arar, kullanıcı * + doğrulamaKodu tuşlar → doğrulanır.
 * Sadece Twilio Verified Caller ID olarak kayıtlı numaralar from olarak kullanılabilir.
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

function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID veya TWILIO_AUTH_TOKEN eksik');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require('twilio');
  return twilio(sid, token);
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

    if (error) throw new Error(error.message);
    res.json({ callerIds: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/voice/caller-ids/add ──────────────────────────────────────────
// Twilio doğrulama araması başlatır. Twilio kullanıcının telefonunu arar,
// doğrulama kodunu sesli okur. Kullanıcı * + kodu tuşlar → numara doğrulanır.
router.post('/add', async (req: any, res: any) => {
  try {
    const { phoneNumber, friendlyName } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber zorunlu' });

    const normalized = normalizeE164(phoneNumber);

    // Zaten doğrulanmış ve aktifse hata ver
    const { data: existing } = await supabase
      .from('user_caller_ids')
      .select('id, is_verified')
      .eq('user_id', req.userId)
      .eq('phone_number', normalized)
      .maybeSingle();

    if (existing?.is_verified) {
      return res.status(409).json({ error: 'Bu numara zaten doğrulanmış ve aktif' });
    }

    // Twilio Verified Caller ID doğrulama araması başlat
    const client = getTwilioClient();
    let validationCode: string;
    let callSid: string | null = null;

    try {
      const validation = await client.validationRequests.create({
        phoneNumber:  normalized,
        friendlyName: friendlyName || normalized,
      });
      validationCode = validation.validationCode;
      callSid        = validation.callSid || null;
    } catch (twilioErr: any) {
      console.error('[CallerID] Twilio validation error:', twilioErr.message);
      return res.status(502).json({
        error: `Twilio doğrulama başlatılamadı: ${twilioErr.message}. Numara formatını kontrol edin (+90 ile başlamalı).`,
      });
    }

    const now = new Date().toISOString();

    if (existing) {
      await supabase
        .from('user_caller_ids')
        .update({
          friendly_name:         friendlyName || normalized,
          is_verified:           false,
          verified_at:           null,
          twilio_validation_sid: callSid,
          updated_at:            now,
        })
        .eq('id', existing.id);

      return res.json({
        ok:             true,
        id:             existing.id,
        phoneNumber:    normalized,
        validationCode,
        message:        `Twilio ${normalized} numaranızı arıyor. Aramayı yanıtlayın ve telefonunuzdan * tuşuna ardından ${validationCode} kodunu girin.`,
      });
    }

    const { data: newRow, error: insertErr } = await supabase
      .from('user_caller_ids')
      .insert([{
        user_id:               req.userId,
        phone_number:          normalized,
        friendly_name:         friendlyName || normalized,
        country_code:          normalized.startsWith('+90') ? 'TR' : '',
        is_verified:           false,
        twilio_validation_sid: callSid,
        is_default:            false,
        created_at:            now,
        updated_at:            now,
      }])
      .select('id')
      .single();

    if (insertErr) {
      console.error('[CallerID] insert error:', insertErr);
      return res.status(500).json({ error: `Kayıt hatası: ${insertErr.message}` });
    }

    console.log(`[CallerID] Twilio verification started: ${normalized} userId=${req.userId}`);
    res.json({
      ok:             true,
      id:             newRow.id,
      phoneNumber:    normalized,
      validationCode,
      message:        `Twilio ${normalized} numaranızı arıyor. Aramayı yanıtlayın ve telefonunuzdan * tuşuna ardından ${validationCode} kodunu girin.`,
    });
  } catch (e: any) {
    console.error('[CallerID] /add error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/voice/caller-ids/check-status/:id ─────────────────────────────
// Twilio'da doğrulama tamamlandı mı kontrol eder.
// Kullanıcı * + kodu tuşladıktan sonra bu endpoint'i çağırır.
router.post('/check-status/:id', async (req: any, res: any) => {
  try {
    const { data: row, error: rowErr } = await supabase
      .from('user_caller_ids')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (rowErr || !row) return res.status(404).json({ error: 'Numara bulunamadı' });
    if (row.is_verified)  return res.json({ verified: true, phoneNumber: row.phone_number });

    // Twilio'da doğrulandı mı kontrol et
    const client = getTwilioClient();
    const callerIds = await client.outgoingCallerIds.list({ phoneNumber: row.phone_number });
    const isVerifiedInTwilio = callerIds.some((c: any) => c.phoneNumber === row.phone_number);

    if (!isVerifiedInTwilio) {
      return res.json({ verified: false, message: 'Henüz doğrulanmadı. Twilio aramasını yanıtlayıp * + kodu girin.' });
    }

    // Doğrulandı — DB'yi güncelle
    const { count: verifiedCount } = await supabase
      .from('user_caller_ids')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('is_verified', true);

    const isFirst = (verifiedCount ?? 0) === 0;
    const now     = new Date().toISOString();

    await supabase
      .from('user_caller_ids')
      .update({
        is_verified: true,
        verified_at: now,
        is_default:  isFirst,
        updated_at:  now,
      })
      .eq('id', row.id);

    // İlk doğrulanmışsa diğer is_default'ları kaldır
    if (isFirst) {
      await supabase
        .from('user_caller_ids')
        .update({ is_default: false })
        .eq('user_id', req.userId)
        .neq('id', row.id);
    }

    console.log(`[CallerID] Verified by Twilio: ${row.phone_number} userId=${req.userId}`);
    res.json({ verified: true, phoneNumber: row.phone_number, isDefault: isFirst });
  } catch (e: any) {
    console.error('[CallerID] /check-status error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/voice/caller-ids/sms-verify ───────────────────────────────────
// Geriye uyumluluk — artık kullanılmıyor
router.post('/sms-verify', async (_req: any, res: any) => {
  res.json({ ok: true, message: 'Twilio telefon doğrulama kullanılıyor. /check-status/:id endpoint\'ini kullanın.' });
});

// ─── POST /api/voice/caller-ids/verify ───────────────────────────────────────
router.post('/verify', async (_req: any, res: any) => {
  res.json({ ok: true, message: 'Twilio telefon doğrulama kullanılıyor. /check-status/:id endpoint\'ini kullanın.' });
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

    if (error || !data) return res.status(404).json({ error: 'Numara bulunamadı veya henüz doğrulanmamış' });

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
      .select('phone_number, is_default, is_verified')
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
