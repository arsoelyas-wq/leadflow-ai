export {};
/**
 * LeadFlow — Müşteri Arama Numaraları (Caller ID)
 *
 * Müşteri kendi telefon numarasını sisteme ekler.
 * Twilio Verified Caller ID ile doğrulanır.
 * Onaylanan numara outbound aramalarda "from" olarak görünür.
 *
 * Twilio mekanizması:
 *   validationRequests.create() → Twilio o numarayı arar → 6 haneli kod söyler
 *   Kullanıcı kodu girer → validationRequests getinde status kontrol edilir
 */

const express = require('express');
const twilio  = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const router   = express.Router();
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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

    // Twilio doğrulama isteği
    const client = getTwilioClient();
    let validationSid = '';
    let twilioError   = '';

    try {
      const validation = await client.validationRequests.create({
        phoneNumber:  normalized,
        friendlyName: friendlyName || `LeadFlow ${normalized}`,
      });
      validationSid = validation.validationCode; // Twilio'nun doğrulama kodu
      console.log(`[CallerID] Validation started: ${normalized} code=${validationSid}`);
    } catch (tErr: any) {
      // Test/dev ortamında Twilio yoksa devam et
      twilioError = tErr.message;
      console.warn('[CallerID] Twilio validation error (dev?):', tErr.message);
    }

    // DB'ye kaydet (veya güncelle)
    if (existing) {
      await supabase
        .from('user_caller_ids')
        .update({ twilio_validation_sid: validationSid, friendly_name: friendlyName, country_code: countryCode })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_caller_ids').insert([{
        user_id:               req.userId,
        phone_number:          normalized,
        friendly_name:         friendlyName || normalized,
        country_code:          countryCode || '',
        twilio_validation_sid: validationSid,
        is_verified:           false,
        is_default:            false,
      }]);
    }

    res.json({
      ok:             true,
      phoneNumber:    normalized,
      validationCode: validationSid,  // UI'da göster: "Twilio sizi arayacak, telefonda bu kodu söyleyin"
      message:        twilioError
        ? `Doğrulama çağrısı başlatılamadı: ${twilioError}`
        : `${normalized} numarası aranıyor. Telefonda size söylenecek 6 haneli kodu girin.`,
      twilioError: twilioError || undefined,
    });
  } catch (e: any) {
    console.error('[CallerID] /add error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/voice/caller-ids/verify ───────────────────────────────────────
// Kullanıcı doğrulama kodunu girer
router.post('/verify', async (req: any, res: any) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) return res.status(400).json({ error: 'phoneNumber ve code zorunlu' });

    const normalized = normalizeE164(phoneNumber);

    const { data: record } = await supabase
      .from('user_caller_ids')
      .select('*')
      .eq('user_id', req.userId)
      .eq('phone_number', normalized)
      .maybeSingle();

    if (!record) return res.status(404).json({ error: 'Numara bulunamadı. Önce ekleyin.' });
    if (record.is_verified) return res.json({ ok: true, message: 'Zaten doğrulanmış' });

    // Twilio'dan validation_code ile karşılaştır
    // Twilio validationRequests'te code DB'de saklıdır (validationCode field)
    const storedCode = record.twilio_validation_sid || '';

    // Twilio Verified Caller ID: kod eşleşmesi client side'da olmaz,
    // Twilio kendi sisteminde tutar. Biz DB'deki kod ile karşılaştırırız
    // (validationRequests.create() bize validationCode döner, kullanıcı bunu girer)
    const enteredCode = String(code).replace(/\s/g, '');

    if (storedCode && enteredCode !== storedCode) {
      return res.status(400).json({ error: 'Yanlış doğrulama kodu. Telefonda söylenen kodu girin.' });
    }

    // Doğrulama başarılı — kayıt güncelle
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
      await supabase
        .from('user_caller_ids')
        .update({ is_default: true })
        .eq('id', record.id);
    }

    console.log(`[CallerID] Verified: ${normalized} userId=${req.userId}`);
    res.json({ ok: true, message: `${normalized} başarıyla doğrulandı ve aramalar için hazır!` });
  } catch (e: any) {
    console.error('[CallerID] /verify error:', e.message);
    res.status(500).json({ error: e.message });
  }
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
