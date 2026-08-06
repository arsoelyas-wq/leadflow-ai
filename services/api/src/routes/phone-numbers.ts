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

// Twilio'nun numara sağladığı ülkeler — bazı ülkeler 'national' tipini kullanır (örn. TR)
const SUPPORTED_COUNTRIES = [
  // ── Popüler ────────────────────────────────────────────────────────────────
  { code: 'TR', name: 'Türkiye',                           flag: '🇹🇷', defaultType: 'local' },
  { code: 'US', name: 'Amerika Birleşik Devletleri',       flag: '🇺🇸', defaultType: 'local' },
  { code: 'GB', name: 'Birleşik Krallık',                  flag: '🇬🇧', defaultType: 'local' },
  { code: 'DE', name: 'Almanya',                           flag: '🇩🇪', defaultType: 'local' },
  { code: 'FR', name: 'Fransa',                            flag: '🇫🇷', defaultType: 'local' },
  { code: 'AU', name: 'Avustralya',                        flag: '🇦🇺', defaultType: 'local' },
  { code: 'CA', name: 'Kanada',                            flag: '🇨🇦', defaultType: 'local' },
  { code: 'AE', name: 'BAE (Dubai)',                       flag: '🇦🇪', defaultType: 'local' },
  // ── Avrupa ─────────────────────────────────────────────────────────────────
  { code: 'AT', name: 'Avusturya',                         flag: '🇦🇹', defaultType: 'local' },
  { code: 'BE', name: 'Belçika',                           flag: '🇧🇪', defaultType: 'local' },
  { code: 'BG', name: 'Bulgaristan',                       flag: '🇧🇬', defaultType: 'local' },
  { code: 'CH', name: 'İsviçre',                           flag: '🇨🇭', defaultType: 'local' },
  { code: 'CY', name: 'Kıbrıs',                            flag: '🇨🇾', defaultType: 'local' },
  { code: 'CZ', name: 'Çek Cumhuriyeti',                   flag: '🇨🇿', defaultType: 'local' },
  { code: 'DK', name: 'Danimarka',                         flag: '🇩🇰', defaultType: 'local' },
  { code: 'EE', name: 'Estonya',                           flag: '🇪🇪', defaultType: 'local' },
  { code: 'ES', name: 'İspanya',                           flag: '🇪🇸', defaultType: 'local' },
  { code: 'FI', name: 'Finlandiya',                        flag: '🇫🇮', defaultType: 'local' },
  { code: 'GR', name: 'Yunanistan',                        flag: '🇬🇷', defaultType: 'local' },
  { code: 'HR', name: 'Hırvatistan',                       flag: '🇭🇷', defaultType: 'local' },
  { code: 'HU', name: 'Macaristan',                        flag: '🇭🇺', defaultType: 'local' },
  { code: 'IE', name: 'İrlanda',                           flag: '🇮🇪', defaultType: 'local' },
  { code: 'IL', name: 'İsrail',                            flag: '🇮🇱', defaultType: 'local' },
  { code: 'IT', name: 'İtalya',                            flag: '🇮🇹', defaultType: 'local' },
  { code: 'LT', name: 'Litvanya',                          flag: '🇱🇹', defaultType: 'local' },
  { code: 'LU', name: 'Lüksemburg',                        flag: '🇱🇺', defaultType: 'local' },
  { code: 'LV', name: 'Letonya',                           flag: '🇱🇻', defaultType: 'local' },
  { code: 'MT', name: 'Malta',                             flag: '🇲🇹', defaultType: 'local' },
  { code: 'NL', name: 'Hollanda',                          flag: '🇳🇱', defaultType: 'local' },
  { code: 'NO', name: 'Norveç',                            flag: '🇳🇴', defaultType: 'local' },
  { code: 'PL', name: 'Polonya',                           flag: '🇵🇱', defaultType: 'local' },
  { code: 'PT', name: 'Portekiz',                          flag: '🇵🇹', defaultType: 'local' },
  { code: 'RO', name: 'Romanya',                           flag: '🇷🇴', defaultType: 'local' },
  { code: 'RS', name: 'Sırbistan',                         flag: '🇷🇸', defaultType: 'local' },
  { code: 'SE', name: 'İsveç',                             flag: '🇸🇪', defaultType: 'local' },
  { code: 'SI', name: 'Slovenya',                          flag: '🇸🇮', defaultType: 'local' },
  { code: 'SK', name: 'Slovakya',                          flag: '🇸🇰', defaultType: 'local' },
  // ── Amerika ────────────────────────────────────────────────────────────────
  { code: 'AR', name: 'Arjantin',                          flag: '🇦🇷', defaultType: 'local' },
  { code: 'BR', name: 'Brezilya',                          flag: '🇧🇷', defaultType: 'local' },
  { code: 'CL', name: 'Şili',                              flag: '🇨🇱', defaultType: 'local' },
  { code: 'CO', name: 'Kolombiya',                         flag: '🇨🇴', defaultType: 'local' },
  { code: 'MX', name: 'Meksika',                           flag: '🇲🇽', defaultType: 'local' },
  { code: 'PE', name: 'Peru',                              flag: '🇵🇪', defaultType: 'local' },
  // ── Asya-Pasifik ───────────────────────────────────────────────────────────
  { code: 'HK', name: 'Hong Kong',                         flag: '🇭🇰', defaultType: 'local' },
  { code: 'ID', name: 'Endonezya',                         flag: '🇮🇩', defaultType: 'mobile' },
  { code: 'IN', name: 'Hindistan',                         flag: '🇮🇳', defaultType: 'local' },
  { code: 'JP', name: 'Japonya',                           flag: '🇯🇵', defaultType: 'local' },
  { code: 'KR', name: 'Güney Kore',                        flag: '🇰🇷', defaultType: 'local' },
  { code: 'MY', name: 'Malezya',                           flag: '🇲🇾', defaultType: 'local' },
  { code: 'NZ', name: 'Yeni Zelanda',                      flag: '🇳🇿', defaultType: 'local' },
  { code: 'PH', name: 'Filipinler',                        flag: '🇵🇭', defaultType: 'local' },
  { code: 'SG', name: 'Singapur',                          flag: '🇸🇬', defaultType: 'local' },
  { code: 'TH', name: 'Tayland',                           flag: '🇹🇭', defaultType: 'local' },
  { code: 'TW', name: 'Tayvan',                            flag: '🇹🇼', defaultType: 'local' },
  { code: 'VN', name: 'Vietnam',                           flag: '🇻🇳', defaultType: 'local' },
  // ── Orta Doğu & Afrika ─────────────────────────────────────────────────────
  { code: 'BH', name: 'Bahreyn',                           flag: '🇧🇭', defaultType: 'local' },
  { code: 'EG', name: 'Mısır',                             flag: '🇪🇬', defaultType: 'local' },
  { code: 'KW', name: 'Kuveyt',                            flag: '🇰🇼', defaultType: 'local' },
  { code: 'NG', name: 'Nijerya',                           flag: '🇳🇬', defaultType: 'local' },
  { code: 'QA', name: 'Katar',                             flag: '🇶🇦', defaultType: 'local' },
  { code: 'SA', name: 'Suudi Arabistan',                   flag: '🇸🇦', defaultType: 'local' },
  { code: 'ZA', name: 'Güney Afrika',                      flag: '🇿🇦', defaultType: 'local' },
];

// E.164 prefix → ISO-2 (uzun prefix'ler önce — '+1' US/CA çakışmasını engeller)
const PREFIX_TO_COUNTRY: Record<string, string> = {
  '+971': 'AE', '+966': 'SA', '+973': 'BH', '+974': 'QA', '+965': 'KW',
  '+972': 'IL', '+234': 'NG', '+27':  'ZA', '+20':  'EG',
  '+65':  'SG', '+91':  'IN', '+62':  'ID', '+81':  'JP', '+82':  'KR',
  '+60':  'MY', '+63':  'PH', '+66':  'TH', '+886': 'TW', '+84':  'VN',
  '+852': 'HK', '+64':  'NZ', '+61':  'AU',
  '+55':  'BR', '+54':  'AR', '+56':  'CL', '+57':  'CO', '+51':  'PE', '+52':  'MX',
  '+47':  'NO', '+46':  'SE', '+45':  'DK', '+358': 'FI', '+353': 'IE',
  '+31':  'NL', '+33':  'FR', '+49':  'DE', '+44':  'GB', '+43':  'AT',
  '+32':  'BE', '+41':  'CH', '+34':  'ES', '+351': 'PT', '+39':  'IT',
  '+30':  'GR', '+48':  'PL', '+420': 'CZ', '+421': 'SK', '+36':  'HU',
  '+40':  'RO', '+359': 'BG', '+381': 'RS', '+386': 'SI', '+370': 'LT',
  '+371': 'LV', '+372': 'EE', '+352': 'LU', '+356': 'MT', '+357': 'CY',
  '+385': 'HR', '+90':  'TR',
  '+1':   'US',
};

function countryFromE164(e164: string): string {
  // Uzun prefix'lerden kısa olanlara doğru tara
  const sorted = Object.keys(PREFIX_TO_COUNTRY).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (e164.startsWith(prefix)) return PREFIX_TO_COUNTRY[prefix];
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

async function fetchTwilioNumbers(client: any, country: string, type: string, params: any): Promise<any[]> {
  // excludeAllAddressRequired=false → adres gerektiren numaraları da göster (TR, DE vs.)
  // excludeLocalAddressRequired=false → yerel adres gerektirenleri dahil et
  // excludeForeignAddressRequired=false → yabancı adres gerektirenleri dahil et
  const p = {
    ...params,
    excludeAllAddressRequired:     false,
    excludeLocalAddressRequired:   false,
    excludeForeignAddressRequired: false,
  };
  if (type === 'toll_free') return client.availablePhoneNumbers(country).tollFree.list(p);
  if (type === 'mobile')    return client.availablePhoneNumbers(country).mobile.list(p);
  if (type === 'national')  return client.availablePhoneNumbers(country).national.list(p);
  return client.availablePhoneNumbers(country).local.list(p);
}

// ─── GET /api/phone-numbers/catalog ───────────────────────────────────────────
// Query: country=TR, type=local|national|toll_free|mobile, capabilities=voice,sms
// Eğer istenen tip boş dönerse ülkenin defaultType'ı otomatik denenir.
router.get('/catalog', async (req: any, res: any) => {
  try {
    const country    = ((req.query.country as string) || 'US').toUpperCase();
    const capsParam  = (req.query.capabilities as string) || '';
    const wantsVoice = capsParam.includes('voice');
    const wantsSms   = capsParam.includes('sms');

    // Ülkenin Twilio'daki varsayılan tipini bul
    const countryMeta = SUPPORTED_COUNTRIES.find(c => c.code === country);
    const defaultType = countryMeta?.defaultType || 'local';
    const requestedType = (req.query.type as string) || defaultType;

    const client = getTwilioClient();
    const searchParams: any = { limit: 20 };
    if (wantsVoice) searchParams.voiceEnabled = true;
    if (wantsSms)   searchParams.smsEnabled   = true;

    let twNumbers: any[] = [];

    // Önce istenen tipi dene
    try {
      twNumbers = await fetchTwilioNumbers(client, country, requestedType, searchParams);
    } catch (e: any) {
      console.warn(`[PhoneNumbers] ${country}/${requestedType} failed:`, e.message);
    }

    // Boş döndüyse ülkenin default tipini dene (farklıysa)
    if (twNumbers.length === 0 && requestedType !== defaultType) {
      try {
        twNumbers = await fetchTwilioNumbers(client, country, defaultType, searchParams);
      } catch (e: any) {
        console.warn(`[PhoneNumbers] ${country}/${defaultType} fallback failed:`, e.message);
      }
    }

    // Hâlâ boşsa diğer tipleri sırayla dene
    if (twNumbers.length === 0) {
      for (const fallbackType of ['local', 'national', 'mobile', 'toll_free']) {
        if (fallbackType === requestedType || fallbackType === defaultType) continue;
        try {
          twNumbers = await fetchTwilioNumbers(client, country, fallbackType, searchParams);
          if (twNumbers.length > 0) break;
        } catch (_e) {}
      }
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

    res.json({ numbers, countryDefaultType: defaultType });
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
      console.error('[PhoneNumbers] Twilio provision error:', e.message, 'code:', e.code);
      const msg = (e.message || '').toLowerCase();
      if (msg.includes('address') || e.code === 21609 || e.code === 21614 || e.code === 21636) {
        return res.status(402).json({
          error: 'Bu numara için Twilio hesabınızda adres doğrulaması gerekiyor. Twilio konsolundan "Regulatory Compliance" bölümünden adresinizi doğrulayın, ardından tekrar deneyin.',
          requiresAddress: true,
        });
      }
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
