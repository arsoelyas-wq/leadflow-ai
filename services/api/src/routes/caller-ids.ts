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
    let alreadyVerified = false;

    try {
      const validation = await client.validationRequests.create({
        phoneNumber:  normalized,
        friendlyName: friendlyName || normalized,
      });
      validationCode = validation.validationCode;
      callSid        = validation.callSid || null;
    } catch (twilioErr: any) {
      const msg = (twilioErr.message || '').toLowerCase();
      // Twilio "already verified" durumu → doğrudan aktifleştir
      if (msg.includes('already verified') || msg.includes('already been verified') || twilioErr.code === 21617) {
        alreadyVerified = true;
        validationCode  = '';
      } else {
        console.error('[CallerID] Twilio validation error:', twilioErr.message);
        return res.status(502).json({
          error: `Twilio doğrulama başlatılamadı: ${twilioErr.message}`,
        });
      }
    }

    // Numara zaten Twilio'da doğrulanmışsa direkt aktifleştir
    if (alreadyVerified) {
      const { count: verifiedCount } = await supabase
        .from('user_caller_ids')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .eq('is_verified', true);

      const isFirst = (verifiedCount ?? 0) === 0;
      const now     = new Date().toISOString();

      if (existing) {
        await supabase.from('user_caller_ids').update({
          friendly_name: friendlyName || normalized,
          is_verified:   true,
          verified_at:   now,
          is_default:    isFirst,
          updated_at:    now,
        }).eq('id', existing.id);
        return res.json({ ok: true, id: existing.id, phoneNumber: normalized, alreadyVerified: true,
          message: `${normalized} Twilio'da zaten doğrulanmış — numara aktifleştirildi!` });
      } else {
        const { data: newRow } = await supabase.from('user_caller_ids').insert([{
          user_id:      req.userId,
          phone_number: normalized,
          friendly_name: friendlyName || normalized,
          country_code: normalized.startsWith('+90') ? 'TR' : '',
          is_verified:  true,
          verified_at:  now,
          is_default:   isFirst,
          created_at:   now,
          updated_at:   now,
        }]).select('id').single();
        return res.json({ ok: true, id: newRow?.id, phoneNumber: normalized, alreadyVerified: true,
          message: `${normalized} Twilio'da zaten doğrulanmış — numara aktifleştirildi!` });
      }
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

// ─── GET /api/voice/caller-ids/from-purchased ────────────────────────────────
// Kullanıcının satın aldığı, ses kapasiteli numaraları döner.
// Bu numaralar zaten Twilio hesabımızda — doğrulama adımı gerekmez.
router.get('/from-purchased', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_phone_numbers')
      .select('id, phone_number, friendly_name, country_code, country_name')
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .eq('capabilities_voice', true)
      .order('purchased_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json({
      numbers: (data || []).map((n: any) => ({
        id:           n.id,
        phoneNumber:  n.phone_number,
        friendlyName: n.friendly_name || n.phone_number,
        countryCode:  n.country_code,
        countryName:  n.country_name,
        source:       'purchased',
      })),
    });
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

// ─── TWILIO NUMARA SATIN ALMA SİSTEMİ ────────────────────────────────────────

const API_BASE = process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app';

function getCountryName(iso: string): string {
  const m: Record<string, string> = {
    US:'Amerika', CA:'Kanada', GB:'Birleşik Krallık', DE:'Almanya',
    FR:'Fransa', NL:'Hollanda', ES:'İspanya', IT:'İtalya',
    SE:'İsveç', NO:'Norveç', BE:'Belçika', AT:'Avusturya',
    CH:'İsviçre', AU:'Avustralya', TR:'Türkiye', PL:'Polonya',
    DK:'Danimarka', FI:'Finlandiya', PT:'Portekiz', IE:'İrlanda',
  };
  return m[iso] || iso;
}

// Desteklenen ülkeler ve Twilio numara tipleri
const PURCHASABLE_COUNTRIES = [
  { code: 'US', name: 'Amerika',             flag: '🇺🇸', types: ['local', 'mobile', 'tollFree'] },
  { code: 'CA', name: 'Kanada',              flag: '🇨🇦', types: ['local', 'tollFree'] },
  { code: 'GB', name: 'Birleşik Krallık',   flag: '🇬🇧', types: ['local', 'mobile'] },
  { code: 'DE', name: 'Almanya',             flag: '🇩🇪', types: ['local', 'mobile'] },
  { code: 'FR', name: 'Fransa',              flag: '🇫🇷', types: ['local', 'mobile'] },
  { code: 'NL', name: 'Hollanda',            flag: '🇳🇱', types: ['local', 'mobile'] },
  { code: 'ES', name: 'İspanya',             flag: '🇪🇸', types: ['local', 'mobile'] },
  { code: 'IT', name: 'İtalya',              flag: '🇮🇹', types: ['local', 'mobile'] },
  { code: 'SE', name: 'İsveç',              flag: '🇸🇪', types: ['local', 'mobile'] },
  { code: 'NO', name: 'Norveç',             flag: '🇳🇴', types: ['local', 'mobile'] },
  { code: 'BE', name: 'Belçika',             flag: '🇧🇪', types: ['local', 'mobile'] },
  { code: 'AT', name: 'Avusturya',           flag: '🇦🇹', types: ['local', 'mobile'] },
  { code: 'CH', name: 'İsviçre',            flag: '🇨🇭', types: ['local', 'mobile'] },
  { code: 'AU', name: 'Avustralya',          flag: '🇦🇺', types: ['local', 'mobile'] },
  { code: 'PL', name: 'Polonya',             flag: '🇵🇱', types: ['local', 'mobile'] },
  { code: 'DK', name: 'Danimarka',           flag: '🇩🇰', types: ['local', 'mobile'] },
  { code: 'PT', name: 'Portekiz',            flag: '🇵🇹', types: ['local', 'mobile'] },
  { code: 'IE', name: 'İrlanda',            flag: '🇮🇪', types: ['local', 'mobile'] },
];

// GET /api/voice/caller-ids/countries
router.get('/countries', (_req: any, res: any) => {
  res.json({ countries: PURCHASABLE_COUNTRIES });
});

// GET /api/voice/caller-ids/search-available?country=US&type=local&pattern=415
router.get('/search-available', async (req: any, res: any) => {
  try {
    const { country = 'US', type = 'local', pattern } = req.query;
    const client = getTwilioClient();

    const opts: any = { voiceEnabled: true, limit: 20 };
    if (pattern && String(pattern).trim()) opts.contains = String(pattern).trim();

    const validTypes = ['local', 'mobile', 'tollFree'];
    const twilioType = validTypes.includes(String(type)) ? String(type) : 'local';

    let numbers: any[] = [];
    try {
      numbers = await (client.availablePhoneNumbers(String(country)) as any)[twilioType].list(opts);
    } catch (e: any) {
      if (e.status === 404 || e.code === 20404 || (e.message || '').includes('not found')) {
        return res.json({ numbers: [] });
      }
      throw e;
    }

    res.json({
      numbers: numbers.map((n: any) => ({
        phoneNumber:  n.phoneNumber,
        friendlyName: n.friendlyName,
        locality:     n.locality || '',
        region:       n.region || '',
        isoCountry:   n.isoCountry,
        capabilities: { voice: !!n.capabilities?.voice, sms: !!n.capabilities?.sms },
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/caller-ids/purchase-number
router.post('/purchase-number', async (req: any, res: any) => {
  try {
    const { phoneNumber, friendlyName } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber zorunlu' });

    const client = getTwilioClient();

    // Twilio'dan satın al
    let purchased: any;
    try {
      purchased = await client.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: friendlyName || phoneNumber,
      });
    } catch (twilioErr: any) {
      return res.status(502).json({ error: `Numara satın alınamadı: ${twilioErr.message}` });
    }

    // Bu kullanıcının ilk numarası mı?
    const { count } = await supabase
      .from('user_phone_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('status', 'active');
    const isFirst = !count || count === 0;

    // Varsa eski default'ları temizle
    if (isFirst) {
      await supabase.from('user_phone_numbers')
        .update({ is_default: false })
        .eq('user_id', req.userId);
    }

    const { data: newNum, error: insertErr } = await supabase
      .from('user_phone_numbers')
      .insert([{
        user_id:            req.userId,
        phone_number:       purchased.phoneNumber,
        twilio_sid:         purchased.sid,
        friendly_name:      friendlyName || purchased.phoneNumber,
        country_code:       purchased.isoCountry || 'UN',
        country_name:       getCountryName(purchased.isoCountry || ''),
        capabilities_voice: purchased.capabilities?.voice !== false,
        capabilities_sms:   purchased.capabilities?.sms === true,
        status:             'active',
        is_default:         isFirst,
        twilio_monthly_cost: 100,
        our_monthly_price:   0,
        purchased_at:       new Date().toISOString(),
      }])
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    console.log(`[PhoneNumbers] Purchased ${purchased.phoneNumber} for user=${req.userId} isDefault=${isFirst}`);
    res.json({ ok: true, number: newNum });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/caller-ids/purchased
router.get('/purchased', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_phone_numbers')
      .select('id, phone_number, friendly_name, country_code, country_name, capabilities_voice, capabilities_sms, is_default, purchased_at')
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .order('is_default', { ascending: false })
      .order('purchased_at', { ascending: true });
    if (error) throw new Error(error.message);
    res.json({ numbers: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/caller-ids/purchased/:id/set-default
router.post('/purchased/:id/set-default', async (req: any, res: any) => {
  try {
    await supabase.from('user_phone_numbers')
      .update({ is_default: false })
      .eq('user_id', req.userId);
    const { error } = await supabase.from('user_phone_numbers')
      .update({ is_default: true })
      .eq('id', req.params.id)
      .eq('user_id', req.userId);
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/voice/caller-ids/purchased/:id
router.delete('/purchased/:id', async (req: any, res: any) => {
  try {
    const { data: num } = await supabase
      .from('user_phone_numbers')
      .select('twilio_sid, is_default')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (!num) return res.status(404).json({ error: 'Numara bulunamadı' });

    // Twilio'dan yayınla
    const client = getTwilioClient();
    if (num.twilio_sid) {
      try { await client.incomingPhoneNumbers(num.twilio_sid).remove(); } catch (e: any) {
        console.warn(`[PhoneNumbers] Twilio release warn: ${e.message}`);
      }
    }

    await supabase.from('user_phone_numbers')
      .update({ status: 'released', released_at: new Date().toISOString(), is_default: false })
      .eq('id', req.params.id);

    // Default ise bir sonrakini yap
    if (num.is_default) {
      const { data: others } = await supabase
        .from('user_phone_numbers')
        .select('id')
        .eq('user_id', req.userId)
        .eq('status', 'active')
        .order('purchased_at', { ascending: true })
        .limit(1);
      if (others && others.length > 0) {
        await supabase.from('user_phone_numbers').update({ is_default: true }).eq('id', others[0].id);
      }
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
