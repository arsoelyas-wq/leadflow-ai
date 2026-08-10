export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({
      settings: {
        ...(data || {}),
        whatsapp_status: data?.whatsapp_status || 'disconnected',
        whatsapp_number: data?.whatsapp_number || '',
        email_host: data?.email_host || 'smtp.gmail.com',
        email_port: data?.email_port || 587,
        email_user: data?.email_user || '',
        email_from: data?.email_from || '',
        company_name: data?.company_name || '',
        auto_reply_enabled: data?.auto_reply_enabled || false,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { email_host, email_port, email_user, email_pass, email_from, company_name, auto_reply_enabled } = req.body;
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        email_host: email_host || 'smtp.gmail.com',
        email_port: email_port || 587,
        email_user, email_pass, email_from, company_name,
        auto_reply_enabled: auto_reply_enabled || false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) throw error;
    res.json({ message: 'Ayarlar kaydedildi!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/settings — onboarding_done, onboarding_step, company_name, sector, city, website
router.patch('/', async (req: any, res: any) => {
  const userId = req.userId;
  const errors: string[] = [];

  try {
    const ALLOWED = ['company_name', 'sector', 'city', 'website', 'onboarding_done', 'onboarding_step'];
    const update: Record<string, any> = { user_id: userId, updated_at: new Date().toISOString() };
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    try {
      const { error } = await supabase.from('user_settings').upsert(update, { onConflict: 'user_id' });
      if (error) errors.push(`user_settings: ${error.message}`);
    } catch (e: any) {
      errors.push(`user_settings: ${e.message}`);
    }

    if (req.body.onboarding_done !== undefined) {
      const { error: userErr } = await supabase
        .from('users')
        .update({ onboarding_done: req.body.onboarding_done })
        .eq('id', userId);
      if (userErr) {
        return res.status(500).json({
          error: `onboarding_done yazılamadı: ${userErr.message}. Supabase migration'ını çalıştırın.`
        });
      }
    }

    res.json({ ok: true, warnings: errors.length ? errors : undefined });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoint — WA bağlantıları artık /api/wa-numbers üzerinden (waGateway) yönetilir
router.post('/whatsapp/connect', async (req: any, res: any) => {
  res.status(410).json({ error: 'Bu endpoint kullanım dışı. WhatsApp bağlantısı için /api/wa-numbers kullanın.' });
});

router.get('/whatsapp/status', async (req: any, res: any) => {
  const userId = req.userId;

  const { count: instConnected } = await supabase
    .from('wa_instances').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'connected');
  if (instConnected && instConnected > 0) {
    return res.json({ status: 'connected', qr: null, source: 'gateway' });
  }

  const { count: numConnected } = await supabase
    .from('wa_numbers').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'connected');
  if (numConnected && numConnected > 0) {
    return res.json({ status: 'connected', qr: null, source: 'wa_numbers' });
  }

  res.json({ status: 'disconnected', qr: null });
});

router.post('/whatsapp/disconnect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const authDir = path.join(process.env.WA_AUTH_DIR || '/tmp', 'wa_auth', userId);
    fs.rmSync(authDir, { recursive: true, force: true });
    await supabase.from('user_settings').upsert({
      user_id: userId,
      whatsapp_status: 'disconnected',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    res.json({ message: 'WhatsApp bağlantısı kesildi' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/email/test', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { email_host, email_port, email_user, email_pass, email_from } = req.body;
    if (!email_user || !email_pass) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }
    const transporter = nodemailer.createTransport({
      host: email_host || 'smtp.gmail.com',
      port: Number(email_port) || 587,
      secure: false,
      auth: { user: email_user, pass: email_pass },
    });
    await transporter.sendMail({
      from: email_from || email_user,
      to: email_user,
      subject: 'LeadFlow AI - Email Bağlantı Testi',
      html: '<h2>✅ Email bağlantınız başarıyla test edildi!</h2>',
    });
    await supabase.from('user_settings').upsert({
      user_id: userId,
      email_host, email_port: Number(email_port) || 587,
      email_user, email_pass, email_from,
      email_status: 'connected',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    res.json({ message: 'Test emaili gönderildi!' });
  } catch (error: any) {
    res.status(500).json({ error: 'Email hatası: ' + error.message });
  }
});

const sendWhatsAppMessage = async (userId: string, phone: string, message: string, skipSafeHours = false) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
    : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;

  if (!skipSafeHours) {
    const turkeyHour = (new Date().getUTCHours() + 3) % 24;
    if (turkeyHour < 9 || turkeyHour >= 20) {
      console.log('[WA] Safe hours dışında — mesaj ertelendi');
      throw new Error('WhatsApp mesajları sadece 09:00-20:00 arası gönderilir');
    }
  }

  let sent = false;
  try {
    const { data: numbers } = await supabase.from('wa_numbers')
      .select('id, phone_number, daily_limit, sent_today, status, is_primary, session_data')
      .eq('user_id', userId).eq('status', 'connected')
      .order('is_primary', { ascending: false });

    if (numbers?.length) {
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      const { count: todaySentCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('channel', 'whatsapp')
        .eq('direction', 'out')
        .neq('status', 'failed')
        .gte('sent_at', todayUTC.toISOString());

      const totalDailyCapacity = numbers.reduce((sum: number, n: any) => sum + (n.daily_limit || 100), 0);
      const available = (todaySentCount || 0) < totalDailyCapacity ? numbers : [];

      if (available.length) {
        available.sort((a: any, b: any) => (a.sent_today || 0) / (a.daily_limit || 100) - (b.sent_today || 0) / (b.daily_limit || 100));
        const chosen = available[0];

        try {
          const { data: instRows } = await supabase.from('wa_instances')
            .select('instance_id').eq('phone', chosen.phone_number).eq('status', 'connected')
            .order('connected_at', { ascending: false }).limit(1);
          const instance = instRows?.[0] || null;
          if (instance?.instance_id) {
            if (instance.instance_id.startsWith('green-')) {
              const creds = (chosen as any).session_data?.greenApi;
              if (!creds) throw new Error('Green API credentials not found in session_data');
              const { sendMessage: greenSend } = require('../lib/greenApiService');
              await greenSend(creds.apiUrl, creds.idInstance, creds.apiToken, formattedPhone, message);
              sent = true;
              console.log(`[WA] Green API gönderim başarılı — ${formattedPhone}`);
            } else {
              const { sendMessage: gatewaySend } = require('../lib/waGateway');
              await gatewaySend(instance.instance_id, formattedPhone, message);
              sent = true;
              console.log(`[WA] Gateway gönderim başarılı — ${formattedPhone}`);
            }
          }
        } catch (gaErr: any) {
          console.error(`[WA] Gönderim hatası — ${gaErr.message}`);
          // Sadece waGateway "not found" hatalarında bağlantıyı kopar; Green API hataları statüsü değiştirmez
          if (gaErr.message?.includes('instance not ready') || gaErr.message?.includes('not found')) {
            await supabase.from('wa_numbers').update({ status: 'disconnected' }).eq('id', chosen.id);
          }
        }

        if (sent) {
          await supabase.from('wa_numbers').update({
            sent_today: (chosen.sent_today || 0) + 1,
          }).eq('id', chosen.id);
          return;
        }
      }
    }

    // wa_numbers boşsa wa_instances'dan doğrudan gönder
    if (!sent) {
      const { data: instRows } = await supabase.from('wa_instances')
        .select('instance_id, phone').eq('user_id', userId).eq('status', 'connected')
        .order('connected_at', { ascending: false }).limit(1);
      const directInst = instRows?.[0];
      if (directInst?.instance_id) {
        if (directInst.instance_id.startsWith('green-')) {
          const { data: numRow } = await supabase.from('wa_numbers')
            .select('session_data').eq('user_id', userId).eq('phone_number', directInst.phone)
            .eq('status', 'connected').single();
          const creds = numRow?.session_data?.greenApi;
          if (creds) {
            const { sendMessage: greenSend } = require('../lib/greenApiService');
            await greenSend(creds.apiUrl, creds.idInstance, creds.apiToken, formattedPhone, message);
            sent = true;
            console.log(`[WA] Green API direct başarılı — ${formattedPhone}`);
          }
        } else {
          const { sendMessage: gatewaySend } = require('../lib/waGateway');
          await gatewaySend(directInst.instance_id, formattedPhone, message);
          sent = true;
          console.log(`[WA] Direct instance başarılı — ${formattedPhone}`);
        }
      }
    }
  } catch {}

  if (!sent) {
    throw new Error('WhatsApp bağlı değil — Ayarlar > WhatsApp Hatlarım\'dan QR kodu tarayarak yeniden bağlanın');
  }
};

const sendEmail = async (userId: string, to: string, subject: string, html: string) => {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('email_host, email_port, email_user, email_pass, email_from')
    .eq('user_id', userId)
    .single();
  if (!settings?.email_user) throw new Error('Email ayarları yapılmamış');
  const transporter = nodemailer.createTransport({
    host: settings.email_host || 'smtp.gmail.com',
    port: Number(settings.email_port) || 587,
    secure: false,
    auth: { user: settings.email_user, pass: settings.email_pass },
  });
  await transporter.sendMail({ from: settings.email_from || settings.email_user, to, subject, html });
};

module.exports = { router, sendWhatsAppMessage, sendEmail };
