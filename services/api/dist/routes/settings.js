"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// WhatsApp client store (memory - per user)
const waClients = {};
const waQRCodes = {};
const waStatus = {};
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
        res.json({
            settings: data || {
                whatsapp_number: '',
                whatsapp_status: waStatus[userId] || 'disconnected',
                email_host: 'smtp.gmail.com',
                email_port: 587,
                email_user: '',
                email_from: '',
                company_name: '',
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
        if (error)
            throw error;
        res.json({ message: 'Ayarlar kaydedildi!' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// WhatsApp QR kod üret
router.post('/whatsapp/connect', async (req, res) => {
    try {
        const userId = req.userId;
        // Önceki client varsa temizle
        if (waClients[userId]) {
            try {
                await waClients[userId].destroy();
            }
            catch { }
            delete waClients[userId];
        }
        waStatus[userId] = 'connecting';
        waQRCodes[userId] = '';
        const { Client, LocalAuth } = require('whatsapp-web.js');
        const qrcode = require('qrcode');
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: userId }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            }
        });
        waClients[userId] = client;
        client.on('qr', async (qr) => {
            const qrImage = await qrcode.toDataURL(qr);
            waQRCodes[userId] = qrImage;
            waStatus[userId] = 'qr_ready';
        });
        client.on('ready', async () => {
            waStatus[userId] = 'connected';
            waQRCodes[userId] = '';
            const number = client.info?.wid?.user || '';
            await supabase.from('user_settings').upsert({
                user_id: userId,
                whatsapp_number: number,
                whatsapp_status: 'connected',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        });
        client.on('disconnected', async () => {
            waStatus[userId] = 'disconnected';
            delete waClients[userId];
            await supabase.from('user_settings').upsert({
                user_id: userId,
                whatsapp_status: 'disconnected',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        });
        client.initialize();
        // QR hazır olana kadar bekle (max 30 saniye)
        let waited = 0;
        while (waStatus[userId] !== 'qr_ready' && waStatus[userId] !== 'connected' && waited < 30000) {
            await new Promise(r => setTimeout(r, 500));
            waited += 500;
        }
        res.json({
            status: waStatus[userId],
            qr: waQRCodes[userId] || null,
        });
    }
    catch (error) {
        console.error('WhatsApp connect error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// WhatsApp durum kontrol
router.get('/whatsapp/status', async (req, res) => {
    try {
        const userId = req.userId;
        const status = waStatus[userId] || 'disconnected';
        const qr = waQRCodes[userId] || null;
        res.json({ status, qr });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// WhatsApp bağlantıyı kes
router.post('/whatsapp/disconnect', async (req, res) => {
    try {
        const userId = req.userId;
        if (waClients[userId]) {
            try {
                await waClients[userId].destroy();
            }
            catch { }
            delete waClients[userId];
        }
        waStatus[userId] = 'disconnected';
        waQRCodes[userId] = '';
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
// Email test gönder
router.post('/email/test', async (req, res) => {
    try {
        const userId = req.userId;
        const { email_host, email_port, email_user, email_pass, email_from } = req.body;
        const transporter = nodemailer.createTransporter({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Email bağlantısı başarısız: ' + error.message });
    }
});
// WhatsApp mesaj gönder (kampanyadan kullanılır)
const sendWhatsAppMessage = async (userId, phone, message) => {
    const client = waClients[userId];
    if (!client || waStatus[userId] !== 'connected') {
        throw new Error('WhatsApp bağlı değil');
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
        : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;
    await client.sendMessage(`${formattedPhone}@c.us`, message);
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
    const transporter = nodemailer.createTransporter({
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
module.exports = { router, sendWhatsAppMessage, sendEmail, waClients, waStatus };
