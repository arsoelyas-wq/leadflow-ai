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

function _generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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

    // 6 haneli OTP üret — Supabase DB'ye kaydet (15 dakika geçerli)
    const otp = _generateOtp();
    // Önceki OTP'leri sil, yenisini ekle
    await supabase.from('caller_id_otps').delete()
      .eq('user_id', req.userId).eq('phone_number', normalized);
    await supabase.from('caller_id_otps').insert({
      user_id: req.userId,
      phone_number: normalized,
      otp_code: otp,
    });
    console.log(`[CallerID] OTP generated for ${normalized}: ${otp}`);

    // Kullanıcının e-posta adresini al
    const { data: userProfile } = await supabase.auth.admin.getUserById(req.userId);
    const userEmail = userProfile?.user?.email || '';
    if (!userEmail) {
      return res.status(400).json({ error: 'Kullanıcı e-posta adresi bulunamadı.' });
    }

    // OTP'yi e-posta ile gönder (Resend)
    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    if (!resendKey) {
      return res.status(500).json({ error: 'E-posta servisi yapılandırılmamış (RESEND_API_KEY eksik)' });
    }

    const { Resend } = require('resend');
    const resend = new Resend(resendKey);
    try {
      await resend.emails.send({
        from:    resendFrom,
        to:      userEmail,
        subject: 'LeadFlow – Telefon Doğrulama Kodu',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:#1a1a1a;margin-bottom:8px">Telefon Doğrulama</h2>
            <p style="color:#555;margin-bottom:24px">${normalized} numarasını doğrulamak için aşağıdaki kodu kullanın:</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111">${otp}</span>
            </div>
            <p style="color:#999;font-size:13px">Bu kod 10 dakika geçerlidir. Eğer bu işlemi siz yapmadıysanız bu e-postayı görmezden gelin.</p>
          </div>
        `,
      });
      console.log(`[CallerID] OTP email sent to ${userEmail} for number ${normalized}`);
    } catch (emailErr: any) {
      console.error('[CallerID] Email error:', emailErr.message);
      return res.status(500).json({ error: `Doğrulama e-postası gönderilemedi: ${emailErr.message}` });
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

    res.json({
      ok:              true,
      phoneNumber:     normalized,
      smsVerification: true,
      sentTo:          userEmail,
      message:         `Doğrulama kodu ${userEmail} adresine e-posta ile gönderildi.`,
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

    // Süresi dolmuş OTP'leri temizle
    await supabase.rpc('cleanup_expired_otps').catch(() => {});
    // Geçerli OTP'yi DB'den al
    const { data: otpRow } = await supabase
      .from('caller_id_otps')
      .select('otp_code')
      .eq('user_id', req.userId)
      .eq('phone_number', normalized)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!otpRow || otpRow.otp_code !== String(code).trim()) {
      return res.status(400).json({ error: 'Kod hatalı veya süresi dolmuş' });
    }

    // Kod doğru — kullanılmış OTP'yi sil, DB'yi güncelle
    await supabase.from('caller_id_otps').delete()
      .eq('user_id', req.userId).eq('phone_number', normalized);

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
