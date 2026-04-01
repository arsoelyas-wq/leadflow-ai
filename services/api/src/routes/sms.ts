export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── PROVIDER'LARA GÖRE SMS GÖNDER ────────────────────────
async function sendSMSViaProvider(provider: string, config: any, to: string, message: string): Promise<void> {
  switch (provider) {

    case 'netgsm': {
      // Türkiye — netgsm.com.tr
      await axios.get('https://api.netgsm.com.tr/sms/send/get', {
        params: {
          usercode: config.api_key,
          password: config.api_secret,
          gsmno: to.replace(/\D/g, ''),
          message: encodeURIComponent(message),
          msgheader: config.sender_id || 'LEADFLOW',
          dil: 'TR',
        }
      });
      break;
    }

    case 'vonage': {
      // Global — vonage.com (eski Nexmo)
      await axios.post('https://rest.nexmo.com/sms/json', {
        api_key: config.api_key,
        api_secret: config.api_secret,
        from: config.sender_id || 'LeadFlow',
        to: to.replace(/\D/g, ''),
        text: message,
      });
      break;
    }

    case 'messagebird': {
      // Global — messagebird.com
      await axios.post('https://rest.messagebird.com/messages', {
        originator: config.sender_id || 'LeadFlow',
        recipients: [to.replace(/\D/g, '')],
        body: message,
      }, {
        headers: { Authorization: `AccessKey ${config.api_key}` }
      });
      break;
    }

    case 'twilio': {
      // Global — twilio.com
      const accountSid = config.api_key;
      const authToken = config.api_secret;
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: config.sender_id || config.phone_number,
          To: to,
          Body: message,
        }),
        { auth: { username: accountSid, password: authToken } }
      );
      break;
    }

    case 'infobip': {
      // Global — infobip.com
      await axios.post(
        `https://${config.base_url}/sms/2/text/advanced`,
        {
          messages: [{
            from: config.sender_id || 'LeadFlow',
            destinations: [{ to: to.replace(/\D/g, '') }],
            text: message,
          }]
        },
        { headers: { Authorization: `App ${config.api_key}`, 'Content-Type': 'application/json' } }
      );
      break;
    }

    case 'aws_sns': {
      // Global — AWS SNS
      const AWS = require('aws-sdk');
      const sns = new AWS.SNS({
        accessKeyId: config.api_key,
        secretAccessKey: config.api_secret,
        region: config.region || 'us-east-1',
      });
      await sns.publish({
        Message: message,
        PhoneNumber: to,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: config.sender_id || 'LeadFlow' },
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
        },
      }).promise();
      break;
    }

    case 'custom_http': {
      // Özel HTTP API
      await axios({
        method: config.method || 'POST',
        url: config.endpoint,
        headers: { Authorization: `Bearer ${config.api_key}`, ...JSON.parse(config.headers || '{}') },
        data: {
          to: to.replace(/\D/g, ''),
          message,
          sender: config.sender_id,
          ...JSON.parse(config.extra_params || '{}'),
        },
      });
      break;
    }

    default:
      throw new Error(`Desteklenmeyen SMS sağlayıcısı: ${provider}`);
  }
}

// ── SMS AYARLARI OKU ──────────────────────────────────────
async function getSmsSettings(userId: string): Promise<any> {
  const { data } = await supabase.from('sms_settings').select('*').eq('user_id', userId).single();
  return data;
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/sms/providers — Desteklenen sağlayıcılar
router.get('/providers', (req: any, res: any) => {
  res.json({
    providers: [
      { key: 'netgsm', label: 'NetGSM', country: 'Türkiye', website: 'netgsm.com.tr', fields: ['api_key', 'api_secret', 'sender_id'] },
      { key: 'vonage', label: 'Vonage (Nexmo)', country: 'Global', website: 'vonage.com', fields: ['api_key', 'api_secret', 'sender_id'] },
      { key: 'messagebird', label: 'MessageBird', country: 'Global', website: 'messagebird.com', fields: ['api_key', 'sender_id'] },
      { key: 'twilio', label: 'Twilio', country: 'Global', website: 'twilio.com', fields: ['api_key', 'api_secret', 'sender_id'] },
      { key: 'infobip', label: 'Infobip', country: 'Global', website: 'infobip.com', fields: ['api_key', 'base_url', 'sender_id'] },
      { key: 'aws_sns', label: 'AWS SNS', country: 'Global', website: 'aws.amazon.com/sns', fields: ['api_key', 'api_secret', 'region', 'sender_id'] },
      { key: 'custom_http', label: 'Özel HTTP API', country: 'Herhangi', website: '-', fields: ['endpoint', 'api_key', 'method', 'sender_id', 'headers', 'extra_params'] },
    ]
  });
});

// GET /api/sms/settings
router.get('/settings', async (req: any, res: any) => {
  try {
    const settings = await getSmsSettings(req.userId);
    if (!settings) return res.json({ configured: false });
    // Şifreyi gizle
    const safe = { ...settings, api_secret: settings.api_secret ? '••••••••' : null };
    res.json({ configured: true, settings: safe });
  } catch { res.json({ configured: false }); }
});

// POST /api/sms/settings — Ayarları kaydet
router.post('/settings', async (req: any, res: any) => {
  try {
    const { provider, api_key, api_secret, sender_id, phone_number, base_url, region, method, endpoint, headers, extra_params } = req.body;
    if (!provider || !api_key) return res.status(400).json({ error: 'provider ve api_key zorunlu' });

    const { data: existing } = await supabase.from('sms_settings').select('id').eq('user_id', req.userId).single();

    const settingsData = {
      user_id: req.userId,
      provider, api_key, api_secret: api_secret || null,
      sender_id: sender_id || 'LeadFlow',
      phone_number: phone_number || null,
      base_url: base_url || null,
      region: region || null,
      method: method || 'POST',
      endpoint: endpoint || null,
      headers: headers || '{}',
      extra_params: extra_params || '{}',
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from('sms_settings').update(settingsData).eq('user_id', req.userId);
    } else {
      await supabase.from('sms_settings').insert([settingsData]);
    }

    res.json({ message: `${provider} SMS ayarları kaydedildi!` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/sms/test — Test SMS gönder
router.post('/test', async (req: any, res: any) => {
  try {
    const settings = await getSmsSettings(req.userId);
    if (!settings) return res.status(400).json({ error: 'SMS ayarları bulunamadı' });

    const { testPhone } = req.body;
    if (!testPhone) return res.status(400).json({ error: 'Test telefon numarası gerekli' });

    await sendSMSViaProvider(settings.provider, settings, testPhone, 'LeadFlow AI — SMS sistemi başarıyla çalışıyor! 🎉');
    res.json({ message: 'Test SMS gönderildi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/sms/send — Toplu SMS gönder
router.post('/send', async (req: any, res: any) => {
  try {
    const settings = await getSmsSettings(req.userId);
    if (!settings) return res.status(400).json({ error: 'SMS ayarları yapılmamış — Önce SMS sağlayıcısı ekleyin' });

    const { message, leadIds } = req.body;
    if (!message || !leadIds?.length) return res.status(400).json({ error: 'message ve leadIds zorunlu' });

    const { data: leads } = await supabase.from('leads')
      .select('id, phone, contact_name, company_name')
      .eq('user_id', req.userId)
      .in('id', leadIds)
      .not('phone', 'is', null);

    let sent = 0, failed = 0;
    const errors: string[] = [];

    for (const lead of leads || []) {
      try {
        const personalizedMsg = message
          .replace(/\{isim\}/g, lead.contact_name || lead.company_name?.split(' ')[0] || 'Sayın Yetkili')
          .replace(/\{sirket\}/g, lead.company_name || '');

        await sendSMSViaProvider(settings.provider, settings, lead.phone, personalizedMsg);

        await supabase.from('messages').insert([{
          user_id: req.userId, lead_id: lead.id,
          direction: 'out', content: personalizedMsg,
          channel: 'sms', sent_at: new Date().toISOString(),
        }]);

        sent++;
        await new Promise(r => setTimeout(r, 300));
      } catch (e: any) {
        failed++;
        errors.push(`${lead.phone}: ${e.message}`);
      }
    }

    // Kampanya kaydet
    await supabase.from('sms_campaigns').insert([{
      user_id: req.userId, message, provider: settings.provider,
      sent_count: sent, failed_count: failed,
      lead_count: leadIds.length, sent_at: new Date().toISOString(),
    }]).catch(() => {});

    res.json({ sent, failed, errors: errors.slice(0, 5), message: `${sent} SMS gönderildi` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/sms/campaigns
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('sms_campaigns').select('*')
      .eq('user_id', req.userId).order('sent_at', { ascending: false }).limit(20);
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/sms/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const settings = await getSmsSettings(req.userId).catch(() => null);
    const { data } = await supabase.from('messages')
      .select('id').eq('user_id', req.userId).eq('channel', 'sms');
    res.json({
      totalSent: data?.length || 0,
      configured: !!settings,
      provider: settings?.provider || null,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;