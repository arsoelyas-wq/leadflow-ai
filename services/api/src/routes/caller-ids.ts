export {};
/**
 * LeadFlow — Müşteri Arama Numaraları (Caller ID)
 *
 * Doğrulama akışı: SMS OTP (sesli çağrı değil)
 *   1. /add → SMS ile 6 haneli kod gönder
 *   2. /sms-verify → kod + telefon numarasını kontrol et → is_verified = true
 */

const express = require('express');
const twilio  = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const router   = express.Router();
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Bellekte geçici OTP deposu (10dk TTL). Railway restart olmadıkça güvenilir.
const _otpStore = new Map<string, { code: string; expiresAt: number }>();

function _generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function _otpKey(userId: string, phone: string): string {
  return `${userId}:${phone}`;
}

function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID veya TWILIO_AUTH_TOKEN eksik');
  return twilio(sid, token);
}

// E.164 normalizasyon
function normalizeE164(phone: string): string {
  let num = phone.replace(/[\s\-\(\)\.]/g, '');
  if (num.startsWith('+')) return num;
  if (num.startsWith('00')) return '+' + num.slice(2);
  if (num.startsWith('0') && num.length >= 10) return '+90' + num.slice(1);
  return '+' + num;
}

// ─── GET /api/voice/caller-ids ────────────────────────────────────────────────
// Kullanıcının tüm numaralarını listele
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
// Yeni numara ekle ve Twilio doğrulama çağrısı başlat
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
      return res.status(409).json({ error: 'Bu numara zaten doğrulanmış' });
    }

    // 6 haneli OTP üret — bellekte sakla (10 dakika geçerli)
    const otp = _generateOtp();
    _otpStore.set(_otpKey(req.userId, normalized), { code: otp, expiresAt: Date.now() + 600_000 });
    console.log(`[CallerID] OTP generated for ${normalized}: ${otp}`);

    // OTP'yi SMS ile gönder
    const client = getTwilioClient();
    let smsError = '';
    try {
      const fromSms = process.env.TWILIO_PHONE_TR || process.env.TWILIO_PHONE_EN
        || [...Object.keys(process.env)].find(k => k.startsWith('TWILIO_PHONE_'))
          && process.env[[...Object.keys(process.env)].find(k => k.startsWith('TWILIO_PHONE_'))!]
        || '';
      if (!fromSms) throw new Error('SMS gönderim numarası bulunamadı');
      await client.messages.create({
        body: `LeadFlow dogrulama kodunuz: ${otp}. 10 dakika gecerlidir.`,
        from: fromSms,
        to:   normalized,
      });
      console.log(`[CallerID] SMS sent to ${normalized}`);
    } catch (sErr: any) {
      smsError = sErr.message;
      console.warn('[CallerID] SMS error:', sErr.message);
    }

    // DB'ye kaydet (veya güncelle)
    if (existing) {
      await supabase
        .from('user_caller_ids')
        .update({ friendly_name: friendlyName, country_code: countryCode })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_caller_ids').insert([{
        user_id:      req.userId,
        phone_number: normalized,
        friendly_name: friendlyName || normalized,
        country_code: countryCode || '',
        is_verified:  false,
        is_default:   false,
      }]);
    }

    if (smsError) {
      return res.status(500).json({ error: `SMS gönderilemedi: ${smsError}` });
    }

    res.json({
      ok:             true,
      phoneNumber:    normalized,
      smsVerification: true,
      message:        `${normalized} numarasına 6 haneli doğrulama kodu SMS ile gönderildi.`,
    });
  } catch (e: any) {
    console.error('[CallerID] /add error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/voice/caller-ids/sms-verify ───────────────────────────────────
// Kullanıcının SMS ile gelen kodu UI'a girip gönderdiği endpoint
router.post('/sms-verify', async (req: any, res: any) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) return res.status(400).json({ error: 'phoneNumber ve code zorunlu' });

    const normalized = normalizeE164(phoneNumber);
    const key        = _otpKey(req.userId, normalized);
    const entry      = _otpStore.get(key);

    if (!entry) {
      return res.status(400).json({ error: 'Kod bulunamadı veya süresi dolmuş. Yeni kod isteyin.' });
    }
    if (Date.now() > entry.expiresAt) {
      _otpStore.delete(key);
      return res.status(400).json({ error: 'Kodun süresi dolmuş. Yeni kod isteyin.' });
    }
    if (entry.code !== String(code).trim()) {
      return res.status(400).json({ error: 'Yanlış kod. Tekrar deneyin.' });
    }

    // Kod doğru — OTP'yi temizle, DB'yi güncelle
    _otpStore.delete(key);

    const { data: record } = await supabase
      .from('user_caller_ids')
      .select('id, is_verified')
      .eq('user_id', req.userId)
      .eq('phone_number', normalized)
      .maybeSingle();

    if (!record) return res.status(404).json({ error: 'Numara kayıtlı değil. Önce ekleyin.' });
    if (record.is_verified) return res.json({ ok: true, message: 'Zaten doğrulanmış' });

    await supabase
      .from('user_caller_ids')
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq('id', record.id);

    // İlk doğrulanan numara ise varsayılan yap
    const { count } = await supabase
      .from('user_caller_ids')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('is_verified', true);

    if ((count ?? 0) <= 1) {
      await supabase.from('user_caller_ids').update({ is_default: true }).eq('id', record.id);
    }

    console.log(`[CallerID] SMS verified: ${normalized} userId=${req.userId}`);
    res.json({ ok: true, message: `${normalized} başarıyla doğrulandı! Aramalar artık bu numaradan görünür.` });
  } catch (e: any) {
    console.error('[CallerID] /sms-verify error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/voice/caller-ids/verify ───────────────────────────────────────
// Eski Twilio sesli doğrulama endpoint'i — artık /sms-verify'a yönlendir
router.post('/verify', async (req: any, res: any) => {
  res.status(400).json({
    error: 'Sesli doğrulama artık kullanılmıyor. Lütfen SMS doğrulamasını kullanın.',
    useSmSVerify: true,
  });
});

// ─── POST /api/voice/caller-ids/:id/set-default ───────────────────────────────
// Varsayılan numarayı değiştir
router.post('/:id/set-default', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Önce tüm default'ları kaldır
    await supabase
      .from('user_caller_ids')
      .update({ is_default: false })
      .eq('user_id', req.userId);

    // Seçilen numarayı default yap
    const { data, error } = await supabase
      .from('user_caller_ids')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', req.userId)
      .eq('is_verified', true)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Numara bulunamadı veya doğrulanmamış' });

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

    // Twilio'dan da kaldır (hata olsa da devam et)
    try {
      const client = getTwilioClient();
      const outgoing = await client.outgoingCallerIds.list({ phoneNumber: record.phone_number });
      for (const oci of outgoing) {
        await client.outgoingCallerIds(oci.sid).remove();
      }
    } catch {}

    await supabase.from('user_caller_ids').delete().eq('id', id).eq('user_id', req.userId);

    // Silinen varsayılan numaraysa, başka bir doğrulanan numarayı varsayılan yap
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
// Aramalarda kullanılan varsayılan numarayı döndür (call-engine için)
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
