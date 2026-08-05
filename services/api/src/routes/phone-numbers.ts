export {};
/**
 * LeadFlow — Phone Number Store
 *
 * Numara sahipliği plan'a dahildir — ayrı ödeme yok.
 * Kullanıcı plan limitine kadar numara alabilir; plan aktif olduğu sürece numara aktif kalır.
 *
 * Endpoints:
 *   GET  /countries            — desteklenen ülkeler
 *   GET  /catalog              — Twilio'dan mevcut numaralar
 *   GET  /my                   — kullanıcının aktif numaraları
 *   GET  /limit                — plan limiti ve mevcut kullanım
 *   POST /purchase             — numara satın al (plan limitine göre)
 *   POST /:id/set-friendly-name
 *   DELETE /:id                — numarayı bırak
 *   POST /:id/register-whatsapp — Twilio Messaging Service kur
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { PLANS } = require('../config/plan-limits');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID veya TWILIO_AUTH_TOKEN eksik');
  return require('twilio')(sid, token);
}

async function getUserPlan(userId: string): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('plan_type')
    .eq('id', userId)
    .single();
  return data?.plan_type || 'trial';
}

function getPlanPhoneLimit(planType: string): number {
  const plan = PLANS[planType] || PLANS.trial;
  return plan.limits.included_phone_numbers ?? 0;
}

const SUPPORTED_COUNTRIES = [
  { code: 'TR', name: 'Türkiye',                        flag: '🇹🇷' },
  { code: 'US', name: 'Amerika Birleşik Devletleri',    flag: '🇺🇸' },
  { code: 'GB', name: 'Birleşik Krallık',               flag: '🇬🇧' },
  { code: 'DE', name: 'Almanya',                        flag: '🇩🇪' },
  { code: 'FR', name: 'Fransa',                         flag: '🇫🇷' },
  { code: 'NL', name: 'Hollanda',                       flag: '🇳🇱' },
  { code: 'SE', name: 'İsveç',                          flag: '🇸🇪' },
  { code: 'NO', name: 'Norveç',                         flag: '🇳🇴' },
  { code: 'AU', name: 'Avustralya',                     flag: '🇦🇺' },
  { code: 'CA', name: 'Kanada',                         flag: '🇨🇦' },
  { code: 'BR', name: 'Brezilya',                       flag: '🇧🇷' },
  { code: 'IN', name: 'Hindistan',                      flag: '🇮🇳' },
  { code: 'SG', name: 'Singapur',                       flag: '🇸🇬' },
  { code: 'AE', name: 'BAE (Dubai)',                    flag: '🇦🇪' },
  { code: 'SA', name: 'Suudi Arabistan',                flag: '🇸🇦' },
];

// E.164 prefix → ISO-2
const PREFIX_TO_COUNTRY: Record<string, string> = {
  '+971': 'AE', '+966': 'SA', '+65': 'SG', '+91': 'IN',
  '+55': 'BR',  '+61': 'AU',  '+47': 'NO', '+46': 'SE',
  '+31': 'NL',  '+33': 'FR',  '+49': 'DE', '+44': 'GB',
  '+90': 'TR',  '+1':  'US',
};

function countryFromE164(e164: string): string {
  for (const [prefix, code] of Object.entries(PREFIX_TO_COUNTRY)) {
    if (e164.startsWith(prefix)) return code;
  }
  return 'US';
}

// ─── GET /api/phone-numbers/countries ─────────────────────────────────────────
router.get('/countries', (_req: any, res: any) => {
  res.json({ countries: SUPPORTED_COUNTRIES });
});

// ─── GET /api/phone-numbers/limit ─────────────────────────────────────────────
router.get('/limit', async (req: any, res: any) => {
  try {
    const planType = await getUserPlan(req.userId);
    const limit    = getPlanPhoneLimit(planType);

    const { count } = await supabase
      .from('user_phone_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('status', 'active');

    res.json({ limit, used: count ?? 0, planType });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/phone-numbers/catalog ───────────────────────────────────────────
// Query: country=TR, type=local|toll_free|mobile, capabilities=voice,sms
router.get('/catalog', async (req: any, res: any) => {
  try {
    const country    = ((req.query.country as string) || 'US').toUpperCase();
    const type       = (req.query.type as string) || 'local';
    const capsParam  = (req.query.capabilities as string) || '';
    const wantsVoice = capsParam.includes('voice');
    const wantsSms   = capsParam.includes('sms');

    const client = getTwilioClient();
    const searchParams: any = { limit: 20 };
    if (wantsVoice) searchParams.voiceEnabled = true;
    if (wantsSms)   searchParams.smsEnabled   = true;

    let twNumbers: any[] = [];
    try {
      if (type === 'toll_free') {
        twNumbers = await client.availablePhoneNumbers(country).tollFree.list(searchParams);
      } else if (type === 'mobile') {
        twNumbers = await client.availablePhoneNumbers(country).mobile.list(searchParams);
      } else {
        twNumbers = await client.availablePhoneNumbers(country).local.list(searchParams);
      }
    } catch (e: any) {
      console.warn(`[PhoneNumbers] catalog ${country}/${type} not available:`, e.message);
      return res.json({ numbers: [] });
    }

    const numbers = twNumbers.map((n: any) => ({
      phoneNumber:  n.phoneNumber,
      friendlyName: n.friendlyName,
      region:       n.region || '',
      isoCountry:   n.isoCountry,
      capabilities: {
        voice: !!n.capabilities?.voice,
        sms:   !!n.capabilities?.sms,
        mms:   !!n.capabilities?.mms,
      },
    }));

    res.json({ numbers });
  } catch (e: any) {
    console.error('[PhoneNumbers] /catalog error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/phone-numbers/my ────────────────────────────────────────────────
router.get('/my', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_phone_numbers')
      .select('*')
      .eq('user_id', req.userId)
      .neq('status', 'released')
      .order('purchased_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json({ numbers: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/phone-numbers/purchase ─────────────────────────────────────────
router.post('/purchase', async (req: any, res: any) => {
  try {
    const { phoneNumber, friendlyName } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber zorunlu' });

    // Plan limit kontrolü
    const planType = await getUserPlan(req.userId);
    const limit    = getPlanPhoneLimit(planType);

    if (limit === 0) {
      return res.status(403).json({
        error: 'Mevcut planınız telefon numarası içermiyor. Growth veya daha yüksek bir plana geçin.',
      });
    }

    if (limit !== -1) {
      const { count } = await supabase
        .from('user_phone_numbers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .eq('status', 'active');

      if ((count ?? 0) >= limit) {
        return res.status(403).json({
          error: `Planınız en fazla ${limit} numara destekliyor. Mevcut numaralarınızdan birini bırakın veya planınızı yükseltin.`,
        });
      }
    }

    // Zaten bu numara var mı?
    const { data: existing } = await supabase
      .from('user_phone_numbers')
      .select('id')
      .eq('user_id', req.userId)
      .eq('phone_number', phoneNumber)
      .neq('status', 'released')
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'Bu numara zaten hesabınızda kayıtlı' });

    // Twilio'da provision et
    const client = getTwilioClient();
    let incomingNumber: any;
    try {
      incomingNumber = await client.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: friendlyName || phoneNumber,
        voiceUrl: process.env.TWILIO_VOICE_WEBHOOK_URL || '',
        smsUrl:   process.env.TWILIO_SMS_WEBHOOK_URL   || '',
      });
    } catch (e: any) {
      console.error('[PhoneNumbers] Twilio provision error:', e.message);
      return res.status(502).json({ error: `Numara alınamadı: ${e.message}` });
    }

    const countryCode = countryFromE164(phoneNumber);
    const countryMeta = SUPPORTED_COUNTRIES.find(c => c.code === countryCode)
      || { code: countryCode, name: countryCode, flag: '' };
    const now = new Date().toISOString();

    const { data: row, error: insertErr } = await supabase
      .from('user_phone_numbers')
      .insert([{
        user_id:            req.userId,
        phone_number:       phoneNumber,
        friendly_name:      friendlyName || phoneNumber,
        country_code:       countryMeta.code,
        country_name:       countryMeta.name,
        capabilities_voice: incomingNumber.capabilities?.voice  ?? false,
        capabilities_sms:   incomingNumber.capabilities?.sms    ?? false,
        twilio_sid:         incomingNumber.sid,
        twilio_monthly_cost: 0,  // tracked internally, not charged to user
        our_monthly_price:   0,  // plan'a dahil — ayrı ücret yok
        status:              'active',
        purchased_at:        now,
        updated_at:          now,
      }])
      .select('id')
      .single();

    if (insertErr) {
      // Hata durumunda Twilio numarasını geri bırak
      try { await client.incomingPhoneNumbers(incomingNumber.sid).remove(); } catch (_e) {}
      return res.status(500).json({ error: `Kayıt hatası: ${insertErr.message}` });
    }

    console.log(`[PhoneNumbers] Purchased: ${phoneNumber} userId=${req.userId} plan=${planType}`);
    res.json({
      ok:          true,
      id:          row.id,
      phoneNumber,
      message:     `${phoneNumber} numarası başarıyla eklendi! Planınıza dahildir, ek ücret alınmaz.`,
    });
  } catch (e: any) {
    console.error('[PhoneNumbers] /purchase error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/phone-numbers/:id/set-friendly-name ────────────────────────────
router.post('/:id/set-friendly-name', async (req: any, res: any) => {
  try {
    const { friendlyName } = req.body;
    if (!friendlyName) return res.status(400).json({ error: 'friendlyName zorunlu' });

    const { data, error } = await supabase
      .from('user_phone_numbers')
      .update({ friendly_name: friendlyName, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .select('twilio_sid')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Numara bulunamadı' });

    try {
      await getTwilioClient().incomingPhoneNumbers(data.twilio_sid).update({ friendlyName });
    } catch (_e) { /* non-fatal */ }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/phone-numbers/:id ────────────────────────────────────────────
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { data: row, error } = await supabase
      .from('user_phone_numbers')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .neq('status', 'released')
      .single();

    if (error || !row) return res.status(404).json({ error: 'Numara bulunamadı' });

    await supabase.from('user_phone_numbers')
      .update({ status: 'releasing', updated_at: new Date().toISOString() })
      .eq('id', row.id);

    try {
      await getTwilioClient().incomingPhoneNumbers(row.twilio_sid).remove();
    } catch (e: any) {
      console.error('[PhoneNumbers] Twilio release error:', e.message);
    }

    await supabase.from('user_phone_numbers')
      .update({ status: 'released', released_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', row.id);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/phone-numbers/:id/register-whatsapp ────────────────────────────
router.post('/:id/register-whatsapp', async (req: any, res: any) => {
  try {
    const { data: row, error } = await supabase
      .from('user_phone_numbers')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .single();

    if (error || !row) return res.status(404).json({ error: 'Numara bulunamadı' });
    if (row.wa_registered) return res.status(409).json({ error: 'Bu numara zaten WhatsApp için kayıtlı' });

    const client = getTwilioClient();
    let messagingService: any;
    try {
      messagingService = await client.messaging.v1.services.create({
        friendlyName: `LeadFlow WA — ${row.phone_number}`,
        useInboundWebhookOnNumber: false,
      });
      await client.messaging.v1.services(messagingService.sid).phoneNumbers.create({
        phoneNumberSid: row.twilio_sid,
      });
    } catch (e: any) {
      return res.status(502).json({ error: `WhatsApp kayıt hatası: ${e.message}` });
    }

    await supabase.from('user_phone_numbers')
      .update({
        wa_registered:            true,
        wa_messaging_service_sid: messagingService.sid,
        capabilities_whatsapp:    true,
        updated_at:               new Date().toISOString(),
      })
      .eq('id', row.id);

    res.json({
      ok:                 true,
      messagingServiceSid: messagingService.sid,
      message:            'WhatsApp Messaging Service oluşturuldu. Meta Business doğrulaması sonrası kampanyalarda kullanabilirsiniz.',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
