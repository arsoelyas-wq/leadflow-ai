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
const waState = {};
async function handleIncomingMessage(userId, msg) {
    try {
        const from = msg.key?.remoteJid || '';
        const text = msg.message?.conversation
            || msg.message?.extendedTextMessage?.text
            || msg.message?.buttonsResponseMessage?.selectedDisplayText
            || '';
        if (!text || from.endsWith('@g.us') || from === 'status@broadcast')
            return;
        const rawPhone = from.replace('@s.whatsapp.net', '').replace('@lid', '');
        const phone = rawPhone.replace(/\D/g, '');
        if (!phone || phone.length < 7)
            return;
        let { data: lead } = await supabase
            .from('leads')
            .select('id, company_name, status')
            .eq('user_id', userId)
            .eq('phone', phone)
            .maybeSingle();
        if (!lead) {
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
        await supabase.from('messages').insert([{
                lead_id: lead.id,
                user_id: userId,
                channel: 'whatsapp',
                direction: 'in',
                content: text,
                status: 'received',
                sent_at: new Date().toISOString(),
            }]);
        if (/^stop$/i.test(text.trim())) {
            await supabase.from('leads').update({
                status: 'lost', notes: 'STOP komutu — blacklist'
            }).eq('id', lead.id);
            return;
        }
        let newStatus = lead.status;
        if (/fiyat|ücret|kaç para|maliyet|teklif/i.test(text))
            newStatus = 'contacted';
        if (/evet|tamam|ilgileniyorum|sipariş/i.test(text))
            newStatus = 'qualified';
        if (/hayır|istemiyorum|iptal/i.test(text))
            newStatus = 'lost';
        if (newStatus !== lead.status) {
            await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
        }
        console.log(`WA incoming [${userId}] from ${phone}: "${text.slice(0, 50)}"`);
        const { data: settings } = await supabase
            .from('user_settings')
            .select('auto_reply_enabled, company_name')
            .eq('user_id', userId)
            .maybeSingle();
        if (!settings?.auto_reply_enabled)
            return;
        // Spam önleme — 5 dk içinde yanıt verdik mi?
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentReply } = await supabase
            .from('messages')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('direction', 'out')
            .gte('sent_at', fiveMinAgo)
            .limit(1);
        if (recentReply && recentReply.length > 0)
            return;
        // Son 20 mesajı çek — konuşma geçmişi
        const { data: history } = await supabase
            .from('messages')
            .select('direction, content, sent_at')
            .eq('lead_id', lead.id)
            .eq('channel', 'whatsapp')
            .order('sent_at', { ascending: false })
            .limit(20);
        const sortedHistory = (history || []).reverse();
        const conversationMessages = sortedHistory.map((m) => ({
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
        if (!replyText)
            return;
        const waEntry = waState[userId];
        if (!waEntry || waEntry.status !== 'connected')
            return;
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
    }
    catch (err) {
        console.error('handleIncomingMessage error:', err.message);
    }
}
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
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify')
                return;
            for (const m of messages) {
                if (m.key?.fromMe)
                    continue;
                await handleIncomingMessage(userId, m);
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
                auto_reply_enabled: data?.auto_reply_enabled || false,
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', async (req, res) => {
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
        if (error)
            throw error;
        res.json({ message: 'Ayarlar kaydedildi!' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
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
        res.json({ status: state?.status || 'connecting', qr: state?.qr || null });
    }
    catch (error) {
        console.error('WhatsApp connect error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
router.get('/whatsapp/status', async (req, res) => {
    const userId = req.userId;
    const state = waState[userId];
    res.json({ status: state?.status || 'disconnected', qr: state?.qr || null });
});
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
    }
    catch (error) {
        res.status(500).json({ error: 'Email hatası: ' + error.message });
    }
});
const sendWhatsAppMessage = async (userId, phone, message) => {
    const state = waState[userId];
    if (!state || state.status !== 'connected')
        throw new Error('WhatsApp bağlı değil');
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
        : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;
    await state.sock.sendMessage(`${formattedPhone}@s.whatsapp.net`, { text: message });
};
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
    await transporter.sendMail({ from: settings.email_from || settings.email_user, to, subject, html });
};
module.exports = { router, sendWhatsAppMessage, sendEmail, waState };
