"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// WhatsApp state — memory'de tut
const waState = {};
// Gelen mesajı işle — intent analizi + kaydet
async function handleIncomingMessage(userId, msg) {
    try {
        const from = msg.key?.remoteJid || '';
        const text = msg.message?.conversation
            || msg.message?.extendedTextMessage?.text
            || msg.message?.buttonsResponseMessage?.selectedDisplayText
            || '';
        if (!text || from.endsWith('@g.us'))
            return; // Grup mesajlarını atla
        const phone = from.replace('@s.whatsapp.net', '');
        // Lead bul veya oluştur
        let { data: lead } = await supabase
            .from('leads')
            .select('id, company_name, status')
            .eq('user_id', userId)
            .eq('phone', phone)
            .single();
        if (!lead) {
            // Bilinmeyen numara — yeni lead oluştur
            const { data: newLead } = await supabase
                .from('leads')
                .insert([{
                    user_id: userId,
                    phone,
                    company_name: phone,
                    source: 'WhatsApp Gelen',
                    status: 'new',
                    score: 50,
                }])
                .select()
                .single();
            lead = newLead;
        }
        if (!lead)
            return;
        // Mesajı kaydet
        await supabase.from('messages').insert([{
                lead_id: lead.id,
                user_id: userId,
                channel: 'whatsapp',
                direction: 'in',
                content: text,
                status: 'received',
                sent_at: new Date().toISOString(),
            }]);
        // Intent analizi — basit keyword bazlı
        const lowerText = text.toLowerCase();
        let intent = 'unknown';
        let newStatus = lead.status;
        if (/fiyat|ücret|kaç para|maliyet|teklif/i.test(lowerText)) {
            intent = 'price_inquiry';
            newStatus = 'contacted';
        }
        else if (/evet|tamam|ilgileniyorum|olur|istiyor|gönder/i.test(lowerText)) {
            intent = 'interested';
            newStatus = 'qualified';
        }
        else if (/hayır|istemiyorum|dur|iptal|stop/i.test(lowerText)) {
            intent = 'not_interested';
            newStatus = 'lost';
        }
        else if (/merhaba|selam|iyi günler/i.test(lowerText)) {
            intent = 'greeting';
            newStatus = 'contacted';
        }
        // Lead durumunu güncelle
        if (newStatus !== lead.status) {
            await supabase
                .from('leads')
                .update({ status: newStatus })
                .eq('id', lead.id);
        }
        console.log(`WA incoming [${userId}] from ${phone}: "${text}" → intent: ${intent}`);
        // STOP komutu — blacklist
        if (/^stop$/i.test(text.trim())) {
            await supabase
                .from('leads')
                .update({ status: 'lost', notes: 'STOP komutu gönderdi — blacklist' })
                .eq('id', lead.id);
            console.log(`Blacklisted: ${phone}`);
        }
    }
    catch (err) {
        console.error('handleIncomingMessage error:', err.message);
    }
}
// Baileys'i başlat
async function startWhatsApp(userId) {
    try {
        const baileys = await Promise.resolve().then(() => __importStar(require('@whiskeysockets/baileys')));
        const makeWASocket = baileys.default;
        const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = baileys;
        const pino = require('pino');
        const authDir = path.join('/tmp', 'wa_auth', userId);
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
        sock.ev.on('connection.update', async (update) => {
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
                const code = lastDisconnect?.error?.output?.statusCode;
                const loggedOut = code === DisconnectReason.loggedOut;
                if (loggedOut) {
                    waState[userId] = { status: 'disconnected', qr: '', sock: null };
                    await supabase.from('user_settings').upsert({
                        user_id: userId,
                        whatsapp_status: 'disconnected',
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });
                    fs.rmSync(authDir, { recursive: true, force: true });
                }
                else {
                    console.log(`Reconnecting WhatsApp for user ${userId}...`);
                    setTimeout(() => startWhatsApp(userId), 3000);
                }
            }
        });
        // ── GELEN MESAJLARI DİNLE ────────────────────────────────
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify')
                return;
            for (const msg of messages) {
                if (msg.key?.fromMe)
                    continue; // Kendi gönderdiğimizi atla
                await handleIncomingMessage(userId, msg);
            }
        });
        return sock;
    }
    catch (err) {
        console.error('Baileys error:', err.message);
        waState[userId] = { status: 'disconnected', qr: '', sock: null };
        throw err;
    }
}
// Ayarları getir
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
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
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Ayarları kaydet
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { email_host, email_port, email_user, email_pass, email_from, company_name } = req.body;
        const { error } = await supabase
            .from('user_settings')
            .upsert({
            user_id: userId,
            email_host: email_host || 'smtp.gmail.com',
            email_port: email_port || 587,
            email_user,
            email_pass,
            email_from,
            company_name,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        if (error)
            throw error;
        res.json({ message: 'Ayarlar kaydedildi!' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// WhatsApp bağlan — QR üret
router.post('/whatsapp/connect', async (req, res) => {
    try {
        const userId = req.userId;
        if (waState[userId]?.sock) {
            try {
                waState[userId].sock.end?.();
            }
            catch { }
        }
        waState[userId] = { status: 'connecting', qr: '', sock: null };
        startWhatsApp(userId).catch(console.error);
        let waited = 0;
        while ((!waState[userId]?.qr) && waited < 15000) {
            await new Promise(r => setTimeout(r, 500));
            waited += 500;
        }
        const state = waState[userId];
        res.json({
            status: state?.status || 'connecting',
            qr: state?.qr || null,
        });
    }
    catch (error) {
        console.error('WhatsApp connect error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// WhatsApp durum + QR polling
router.get('/whatsapp/status', async (req, res) => {
    const userId = req.userId;
    const state = waState[userId];
    res.json({
        status: state?.status || 'disconnected',
        qr: state?.qr || null,
    });
});
// WhatsApp bağlantıyı kes
router.post('/whatsapp/disconnect', async (req, res) => {
    try {
        const userId = req.userId;
        if (waState[userId]?.sock) {
            try {
                waState[userId].sock.end?.();
            }
            catch { }
        }
        waState[userId] = { status: 'disconnected', qr: '', sock: null };
        const authDir = path.join('/tmp', 'wa_auth', userId);
        fs.rmSync(authDir, { recursive: true, force: true });
        await supabase.from('user_settings').upsert({
            user_id: userId,
            whatsapp_status: 'disconnected',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        res.json({ message: 'WhatsApp bağlantısı kesildi' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Email test
router.post('/email/test', async (req, res) => {
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
            html: '<h2>✅ Email bağlantınız başarıyla test edildi!</h2><p>LeadFlow AI kampanyalarınız bu adres üzerinden gönderilecek.</p>',
        });
        await supabase.from('user_settings').upsert({
            user_id: userId,
            email_host,
            email_port: Number(email_port) || 587,
            email_user,
            email_pass,
            email_from,
            email_status: 'connected',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        res.json({ message: 'Test emaili gönderildi! Gelen kutunuzu kontrol edin.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Email hatası: ' + error.message });
    }
});
// WhatsApp mesaj gönder (kampanyadan kullanılır)
const sendWhatsAppMessage = async (userId, phone, message) => {
    const state = waState[userId];
    if (!state || state.status !== 'connected') {
        throw new Error('WhatsApp bağlı değil');
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
        : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;
    await state.sock.sendMessage(`${formattedPhone}@s.whatsapp.net`, { text: message });
};
// Email gönder (kampanyadan kullanılır)
const sendEmail = async (userId, to, subject, html) => {
    const { data: settings } = await supabase
        .from('user_settings')
        .select('email_host, email_port, email_user, email_pass, email_from')
        .eq('user_id', userId)
        .single();
    if (!settings?.email_user)
        throw new Error('Email ayarları yapılmamış');
    const transporter = nodemailer.createTransport({
        host: settings.email_host || 'smtp.gmail.com',
        port: Number(settings.email_port) || 587,
        secure: false,
        auth: { user: settings.email_user, pass: settings.email_pass },
    });
    await transporter.sendMail({
        from: settings.email_from || settings.email_user,
        to, subject, html,
    });
};
module.exports = { router, sendWhatsAppMessage, sendEmail, waState };
