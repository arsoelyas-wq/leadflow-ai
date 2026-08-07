export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const waState: Record<string, {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
  qr: string;
  sock: any;
}> = {};

async function handleIncomingMessage(userId: string, msg: any) {
  try {
    const from = msg.key?.remoteJid || '';
    const text = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.buttonsResponseMessage?.selectedDisplayText
      || '';

    if (!text || from.endsWith('@g.us') || from === 'status@broadcast') return;

    const rawPhone = from.replace('@s.whatsapp.net', '').replace('@lid', '');
    const phone = rawPhone.replace(/\D/g, '');
    if (!phone || phone.length < 7) return;

    let { data: lead } = await supabase
      .from('leads')
      .select('id, company_name, status')
      .eq('user_id', userId)
      .eq('phone', phone)
      .maybeSingle();

    if (!lead) {
      // Lead dedup: telefon numarasının farklı formatlarını da dene
      const phoneVariants = [phone, '0' + phone.slice(-10), '90' + phone.slice(-10), phone.slice(-10)];
      for (const v of phoneVariants) {
        const { data: found } = await supabase.from('leads').select('id, company_name, status')
          .eq('user_id', userId).eq('phone', v).maybeSingle();
        if (found) { lead = found; break; }
      }
    }

    if (!lead) {
      // Yeni lead — telefon numarasını şirket adı yapma, daha akıllı bir isim üret
      const displayName = `+${phone.startsWith('90') ? phone : '90' + phone.slice(-10)}`;
      const { data: newLead } = await supabase.from('leads').insert([{
        user_id: userId,
        phone,
        company_name: displayName,  // Telefon formatlanmış, şirketi öğrenince güncellenecek
        source: 'WhatsApp Gelen',
        status: 'new',
        score: 50,
        channel_contacts: { whatsapp: phone },
      }]).select().single();
      lead = newLead;
    } else if (lead) {
      // Varsa durumu güncelle
      await supabase.from('leads').update({
        status: lead.status === 'new' ? 'replied' : lead.status,
        last_contacted_at: new Date().toISOString(),
      }).eq('id', lead.id);
    }

    if (!lead) return;

    await supabase.from('messages').insert([{
      lead_id: lead.id,
      user_id: userId,
      channel: 'whatsapp',
      direction: 'in',
      content: text,
      status: 'received',
      sent_at: new Date().toISOString(),
      metadata: { raw_from: from, phone },
    }]);

    if (/^stop$/i.test(text.trim())) {
      await supabase.from('leads').update({
        status: 'lost', notes: 'STOP komutu — blacklist'
      }).eq('id', lead.id);
      return;
    }

    let newStatus = lead.status;
    if (/fiyat|ücret|kaç para|maliyet|teklif/i.test(text)) newStatus = 'contacted';
    if (/evet|tamam|ilgileniyorum|sipariş/i.test(text)) newStatus = 'qualified';
    if (/hayır|istemiyorum|iptal/i.test(text)) newStatus = 'lost';
    if (newStatus !== lead.status) {
      await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
    }

    console.log(`WA incoming [${userId}] from ${phone}: "${text.slice(0, 50)}"`);

    const { data: settings } = await supabase
      .from('user_settings')
      .select('auto_reply_enabled, company_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (!settings?.auto_reply_enabled) return;

    // Spam önleme — 5 dk içinde yanıt verdik mi?
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentReply } = await supabase
      .from('messages')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('direction', 'out')
      .gte('sent_at', fiveMinAgo)
      .limit(1);

    if (recentReply && recentReply.length > 0) return;

    // Son 20 mesajı çek — konuşma geçmişi
    const { data: history } = await supabase
      .from('messages')
      .select('direction, content, sent_at')
      .eq('lead_id', lead.id)
      .eq('channel', 'whatsapp')
      .order('sent_at', { ascending: false })
      .limit(20);

    const sortedHistory = (history || []).reverse();

    const conversationMessages = sortedHistory.map((m: any) => ({
      role: m.direction === 'out' ? 'assistant' : 'user',
      content: m.content,
    }));

    // Son mesaj user olmalı
    if (conversationMessages.length === 0 ||
        conversationMessages[conversationMessages.length - 1].role !== 'user') {
      conversationMessages.push({ role: 'user', content: text });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `Sen ${settings.company_name || 'şirketin'} müşteri temsilcisisin.
Görev: WhatsApp üzerinden gelen müşteri mesajlarına doğal, samimi, kısa Türkçe yanıt ver.

Kurallar:
- Kendini AI veya asistan olarak tanıtma — normal bir müşteri temsilcisi gibi davran
- Maksimum 3-4 cümle, doğal konuş
- Emoji kullanabilirsin ama abartma
- Fiyat sorarsa "size özel fiyat için sizi arayacağız, numaranızı alabilir miyiz?" de
- Sipariş için "detayları konuşmak için sizi arayacağız" de
- Müşteri veda ederse (teşekkür, görüşürüz vb.) sıcak bir vedayla bitir
- ASLA uydurma fiyat veya ürün bilgisi verme
- Konuşma geçmişini dikkate al, aynı şeyi tekrar sorma`,
      messages: conversationMessages,
    });

    const replyText = aiResponse.content[0]?.text || '';
    if (!replyText) return;

    const waEntry = waState[userId];
    if (!waEntry || waEntry.status !== 'connected') return;

    const formattedPhone = phone.startsWith('90') ? phone
      : phone.startsWith('0') ? '9' + phone : '90' + phone;

    await waEntry.sock.sendMessage(`${formattedPhone}@s.whatsapp.net`, { text: replyText });

    await supabase.from('messages').insert([{
      lead_id: lead.id,
      user_id: userId,
      channel: 'whatsapp',
      direction: 'out',
      content: replyText,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }]);

    console.log(`AI auto-reply to ${phone}: "${replyText.slice(0, 60)}"`);

  } catch (err: any) {
    console.error('handleIncomingMessage error:', err.message);
  }
}

async function startWhatsApp(userId: string) {
  try {
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default;
    const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = baileys;
    const pino = require('pino');

    const authDir = path.join(process.env.WA_AUTH_DIR || '/tmp', 'wa_auth', userId);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['LeadFlow AI', 'Chrome', '1.0.0'],
    });

    waState[userId] = { status: 'connecting', qr: '', sock };

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrImage = await qrcode.toDataURL(qr);
        waState[userId] = { ...waState[userId], status: 'qr_ready', qr: qrImage };
      }

      if (connection === 'open') {
        const number = sock.user?.id?.split(':')[0] || '';
        waState[userId] = { ...waState[userId], status: 'connected', qr: '' };
        await supabase.from('user_settings').upsert({
          user_id: userId,
          whatsapp_number: number,
          whatsapp_status: 'connected',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        console.log(`WhatsApp connected for user ${userId}: ${number}`);
      }

      if (connection === 'close') {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        if (loggedOut) {
          waState[userId] = { status: 'disconnected', qr: '', sock: null };
          await supabase.from('user_settings').upsert({
            user_id: userId,
            whatsapp_status: 'disconnected',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
          fs.rmSync(authDir, { recursive: true, force: true });
        } else {
          console.log(`Reconnecting WhatsApp for user ${userId}...`);
          setTimeout(() => startWhatsApp(userId), 3000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        if (m.key?.fromMe) continue;
        await handleIncomingMessage(userId, m);
      }
    });

    return sock;
  } catch (err: any) {
    console.error('Baileys error:', err.message);
    waState[userId] = { status: 'disconnected', qr: '', sock: null };
    throw err;
  }
}

router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    const memState = waState[userId];
    res.json({
      settings: {
        ...(data || {}),
        whatsapp_status: memState?.status || data?.whatsapp_status || 'disconnected',
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
    // Build update object — only include fields present in the request
    const ALLOWED = ['company_name', 'sector', 'city', 'website', 'onboarding_done', 'onboarding_step'];
    const update: Record<string, any> = { user_id: userId, updated_at: new Date().toISOString() };
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Try user_settings upsert (non-critical — column might be missing in some envs)
    try {
      const { error } = await supabase.from('user_settings').upsert(update, { onConflict: 'user_id' });
      if (error) errors.push(`user_settings: ${error.message}`);
    } catch (e: any) {
      errors.push(`user_settings: ${e.message}`);
    }

    // Critical: write onboarding_done to users table — this is what /me reads
    if (req.body.onboarding_done !== undefined) {
      const { error: userErr } = await supabase
        .from('users')
        .update({ onboarding_done: req.body.onboarding_done })
        .eq('id', userId);
      if (userErr) {
        // If column doesn't exist yet, this is a hard error — tell client
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

router.post('/whatsapp/connect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    if (waState[userId]?.sock) {
      try { waState[userId].sock.end?.(); } catch {}
    }
    waState[userId] = { status: 'connecting', qr: '', sock: null };
    startWhatsApp(userId).catch(console.error);
    let waited = 0;
    while ((!waState[userId]?.qr) && waited < 15000) {
      await new Promise(r => setTimeout(r, 500));
      waited += 500;
    }
    const state = waState[userId];
    res.json({ status: state?.status || 'connecting', qr: state?.qr || null });
  } catch (error: any) {
    console.error('WhatsApp connect error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/whatsapp/status', async (req: any, res: any) => {
  const userId = req.userId;
  const state = waState[userId];
  res.json({ status: state?.status || 'disconnected', qr: state?.qr || null });
});

router.post('/whatsapp/disconnect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    if (waState[userId]?.sock) {
      try { waState[userId].sock.end?.(); } catch {}
    }
    waState[userId] = { status: 'disconnected', qr: '', sock: null };
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

const sendWhatsAppMessage = async (userId: string, phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
    : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;

  // Safe hours check (09:00-20:00 Turkey time = UTC+3)
  const turkeyHour = (new Date().getUTCHours() + 3) % 24;
  if (turkeyHour < 9 || turkeyHour >= 20) {
    console.log('[WA] Safe hours disinda — mesaj ertelendi');
    throw new Error('WhatsApp mesajlari sadece 09:00-20:00 arasi gonderilir');
  }

  // Multi-number routing: pick number with lowest usage + available capacity
  let sent = false;
  try {
    const { data: numbers } = await supabase.from('wa_numbers')
      .select('id, phone_number, daily_limit, sent_today, status, is_primary')
      .eq('user_id', userId).eq('status', 'connected')
      .order('is_primary', { ascending: false });

    if (numbers?.length) {
      // Gerçek günlük sayım — sent_today hiç sıfırlanmadığından DB'den al
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      const { count: todaySentCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('channel', 'whatsapp')
        .eq('direction', 'out')
        .gte('sent_at', todayUTC.toISOString());

      // Toplam günlük kapasiteye (tüm numaraların limiti toplamı) göre filtrele
      const totalDailyCapacity = numbers.reduce((sum: number, n: any) => sum + (n.daily_limit || 100), 0);
      const available = (todaySentCount || 0) < totalDailyCapacity ? numbers : [];

      if (available.length) {
        // Yük dengeleme: bugün en az kullanan numara önce
        available.sort((a: any, b: any) => (a.sent_today || 0) / (a.daily_limit || 100) - (b.sent_today || 0) / (b.daily_limit || 100));
        const chosen = available[0];

        // Embedded WA Gateway ile gönder
        try {
          // Aynı telefona bağlı birden fazla instance olabilir — en son bağlananı al
          const { data: instances } = await supabase.from('wa_instances')
            .select('instance_id').eq('phone', chosen.phone_number).eq('status', 'connected')
            .order('connected_at', { ascending: false }).limit(1);
          const instance = instances?.[0] || null;
          if (instance?.instance_id) {
            console.log(`[WA] Embedded gateway ile gönderiliyor — instance: ${instance.instance_id}, hedef: ${formattedPhone}`);
            const { sendMessage: gatewaySend } = require('../lib/waGateway');
            await gatewaySend(instance.instance_id, formattedPhone, message);
            sent = true;
            console.log(`[WA] Embedded gateway başarılı — ${formattedPhone}`);
          } else {
            console.log(`[WA] wa_instances bulunamadı — chosen.phone_number: ${chosen.phone_number}, Baileys'e düşülüyor`);
          }
        } catch (gaErr: any) {
          console.error(`[WA] Embedded gateway hatası — ${gaErr.message}`);
        }

        if (sent) {
          await supabase.from('wa_numbers').update({
            sent_today: (chosen.sent_today || 0) + 1,
          }).eq('id', chosen.id);
          return;
        }
      }
    }
  } catch {}

  // Fallback: direct Baileys socket (single connection)
  const state = waState[userId];
  if (!state || state.status !== 'connected') throw new Error('WhatsApp bagli degil — Ayarlar > WhatsApp\'tan baglanti kurun');
  await state.sock.sendMessage(`${formattedPhone}@s.whatsapp.net`, { text: message });
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

module.exports = { router, sendWhatsAppMessage, sendEmail, waState, initWhatsApp: startWhatsApp };