export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// WhatsApp state store
const waState: Record<string, {
  status: string;
  qr: string;
  socket: any;
}> = {};

// Ayarları getir
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const state = waState[userId];

    res.json({
      settings: {
        ...(data || {}),
        whatsapp_status: state?.status || data?.whatsapp_status || 'disconnected',
        email_host: data?.email_host || 'smtp.gmail.com',
        email_port: data?.email_port || 587,
        email_user: data?.email_user || '',
        email_from: data?.email_from || '',
        company_name: data?.company_name || '',
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Ayarları kaydet
router.post('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { whatsapp_number, email_host, email_port, email_user, email_pass, email_from, company_name } = req.body;

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        whatsapp_number,
        email_host: email_host || 'smtp.gmail.com',
        email_port: email_port || 587,
        email_user,
        email_pass,
        email_from,
        company_name,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
    res.json({ message: 'Ayarlar kaydedildi!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// WhatsApp QR bağlantı - Baileys
router.post('/whatsapp/connect', async (req: any, res: any) => {
  try {
    const userId = req.userId;

    // Önceki socket varsa kapat
    if (waState[userId]?.socket) {
      try { waState[userId].socket.end(); } catch {}
    }

    waState[userId] = { status: 'connecting', qr: '', socket: null };

    const {
      default: makeWASocket,
      DisconnectReason,
      useMultiFileAuthState,
      fetchLatestBaileysVersion,
    } = require('@whiskeysockets/baileys');
    const qrcode = require('qrcode');
    const path = require('path');
    const fs = require('fs');

    const authDir = path.join('/tmp', 'wa_auth', userId);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: require('pino')({ level: 'silent' }),
    });

    waState[userId].socket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrImage = await qrcode.toDataURL(qr);
        waState[userId].qr = qrImage;
        waState[userId].status = 'qr_ready';
      }

      if (connection === 'open') {
        waState[userId].status = 'connected';
        waState[userId].qr = '';
        const number = sock.user?.id?.split(':')[0] || '';
        await supabase.from('user_settings').upsert({
          user_id: userId,
          whatsapp_number: number,
          whatsapp_status: 'connected',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (!shouldReconnect) {
          waState[userId].status = 'disconnected';
          await supabase.from('user_settings').upsert({
            user_id: userId,
            whatsapp_status: 'disconnected',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
      }
    });

    // QR hazır olana kadar bekle (max 20 saniye)
    let waited = 0;
    while (waState[userId].status === 'connecting' && waited < 20000) {
      await new Promise(r => setTimeout(r, 500));
      waited += 500;
    }

    res.json({
      status: waState[userId].status,
      qr: waState[userId].qr || null,
    });
  } catch (error: any) {
    console.error('WhatsApp connect error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WhatsApp durum kontrol
router.get('/whatsapp/status', async (req: any, res: any) => {
  const userId = req.userId;
  const state = waState[userId];
  res.json({
    status: state?.status || 'disconnected',
    qr: state?.qr || null,
  });
});

// WhatsApp bağlantıyı kes
router.post('/whatsapp/disconnect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    if (waState[userId]?.socket) {
      try { waState[userId].socket.end(); } catch {}
    }
    delete waState[userId];

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

// Email test
router.post('/email/test', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { email_host, email_port, email_user, email_pass, email_from } = req.body;

    if (!email_user || !email_pass) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }

    const transporter = nodemailer.createTransport({
      host: email_host || 'smtp.gmail.com',
      port: email_port || 587,
      secure: false,
      auth: { user: email_user, pass: email_pass },
    });

    await transporter.sendMail({
      from: email_from || email_user,
      to: email_user,
      subject: 'LeadFlow AI - Email Bağlantı Testi',
      html: '<h2>✅ Email bağlantınız başarıyla test edildi!</h2><p>LeadFlow AI kampanyalarınız bu adres üzerinden gönderilecek.</p>',
    });

    await supabase.from('user_settings').upsert({
      user_id: userId,
      email_host,
      email_port,
      email_user,
      email_pass,
      email_from,
      email_status: 'connected',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({ message: 'Test emaili gönderildi! Gelen kutunuzu kontrol edin.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Email bağlantısı başarısız: ' + error.message });
  }
});

// WhatsApp mesaj gönder (kampanyadan kullanılır)
const sendWhatsAppMessage = async (userId: string, phone: string, message: string) => {
  const state = waState[userId];
  if (!state || state.status !== 'connected') {
    throw new Error('WhatsApp bağlı değil. Ayarlar sayfasından bağlayın.');
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
    : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;
  await state.socket.sendMessage(`${formattedPhone}@s.whatsapp.net`, { text: message });
};

// Email gönder (kampanyadan kullanılır)
const sendEmail = async (userId: string, to: string, subject: string, html: string) => {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('email_host, email_port, email_user, email_pass, email_from')
    .eq('user_id', userId)
    .single();

  if (!settings?.email_user) throw new Error('Email ayarları yapılmamış');

  const transporter = nodemailer.createTransport({
    host: settings.email_host || 'smtp.gmail.com',
    port: settings.email_port || 587,
    secure: false,
    auth: { user: settings.email_user, pass: settings.email_pass },
  });

  await transporter.sendMail({
    from: settings.email_from || settings.email_user,
    to,
    subject,
    html,
  });
};

module.exports = { router, sendWhatsAppMessage, sendEmail, waState };