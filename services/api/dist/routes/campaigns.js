"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// Tüm kampanyaları getir
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        const campaigns = (data || []).map((c) => ({
            id: c.id,
            name: c.name,
            channel: c.channel,
            status: c.status,
            totalSent: c.total_sent || 0,
            totalReplied: c.total_replied || 0,
            createdAt: c.created_at,
            messageTemplate: c.message_template,
            leadIds: c.lead_ids || [],
            sequence: c.sequence || [],
        }));
        res.json({ campaigns });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Yeni kampanya oluştur
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { name, channel, messageTemplate, leadIds, sequence } = req.body;
        if (!name || !channel || !messageTemplate) {
            return res.status(400).json({ error: 'name, channel ve messageTemplate zorunlu' });
        }
        const { data, error } = await supabase
            .from('campaigns')
            .insert([{
                user_id: userId,
                name,
                channel,
                message_template: messageTemplate,
                lead_ids: leadIds || [],
                sequence: sequence || [],
                status: 'draft',
                total_sent: 0,
                total_replied: 0,
            }])
            .select()
            .single();
        if (error)
            throw error;
        res.json({ campaign: data, message: 'Kampanya oluşturuldu!' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Kampanya detayı
router.get('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', userId)
            .single();
        if (error || !data)
            return res.status(404).json({ error: 'Kampanya bulunamadı' });
        res.json({
            campaign: {
                id: data.id,
                name: data.name,
                channel: data.channel,
                status: data.status,
                totalSent: data.total_sent || 0,
                totalReplied: data.total_replied || 0,
                createdAt: data.created_at,
                messageTemplate: data.message_template,
                leadIds: data.lead_ids || [],
                sequence: data.sequence || [],
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Kampanyayı başlat
router.post('/:id/start', async (req, res) => {
    try {
        const userId = req.userId;
        // Kampanyayı getir
        const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', userId)
            .single();
        if (error || !campaign)
            return res.status(404).json({ error: 'Kampanya bulunamadı' });
        // Kullanıcı ayarlarını getir (email SMTP + WhatsApp durumu)
        const { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
        // Kullanıcı kreditini kontrol et
        const { data: userData } = await supabase
            .from('users')
            .select('credits_total, credits_used')
            .eq('id', userId)
            .single();
        const availableCredits = (userData?.credits_total || 0) - (userData?.credits_used || 0);
        // Leadleri getir
        const { data: leads } = await supabase
            .from('leads')
            .select('*')
            .in('id', campaign.lead_ids || []);
        if (!leads || leads.length === 0) {
            return res.status(400).json({ error: 'Kampanyada lead bulunamadı' });
        }
        if (availableCredits < leads.length) {
            return res.status(400).json({
                error: `Yetersiz kredi. Gerekli: ${leads.length}, Mevcut: ${availableCredits}`
            });
        }
        // Kanal kontrolü
        if (campaign.channel === 'email' && !userSettings?.email_user) {
            return res.status(400).json({ error: 'Email ayarları yapılmamış. Ayarlar sayfasından SMTP bağlayın.' });
        }
        if (campaign.channel === 'whatsapp' && userSettings?.whatsapp_status !== 'connected') {
            return res.status(400).json({ error: 'WhatsApp bağlı değil. Ayarlar sayfasından bağlayın.' });
        }
        // Status'u active yap
        await supabase.from('campaigns').update({ status: 'active' }).eq('id', req.params.id);
        // Arka planda gönderimi başlat (non-blocking)
        sendCampaignMessages(campaign, leads, userSettings, userId).catch(console.error);
        res.json({ message: 'Kampanya başlatıldı! Mesajlar gönderiliyor...', total: leads.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Arka planda mesaj gönderme fonksiyonu
async function sendCampaignMessages(campaign, leads, userSettings, userId) {
    let sent = 0;
    let failed = 0;
    const nodemailer = require('nodemailer');
    // Email transporter
    let transporter = null;
    if (campaign.channel === 'email' && userSettings?.email_user) {
        transporter = nodemailer.createTransport({
            host: userSettings.email_host || 'smtp.gmail.com',
            port: Number(userSettings.email_port) || 587,
            secure: false,
            auth: {
                user: userSettings.email_user,
                pass: userSettings.email_pass,
            },
        });
    }
    for (const lead of leads) {
        try {
            // Mesajı kişiselleştir
            const personalizedMsg = (campaign.message_template || '')
                .replace(/\[FIRMA_ADI\]/g, lead.company_name || lead.contact_name || 'Sayın Yetkili')
                .replace(/\[SEHIR\]/g, lead.city || '')
                .replace(/\[SEKTOR\]/g, lead.sector || '')
                .replace(/\[AD\]/g, lead.contact_name || '')
                .replace(/\[TELEFON\]/g, lead.phone || '');
            let success = false;
            if (campaign.channel === 'whatsapp' && lead.phone) {
                // Meta Cloud API ile gönder
                const META_TOKEN = process.env.META_WA_TOKEN;
                const META_PHONE_ID = process.env.META_WA_PHONE_ID;
                const cleanPhone = lead.phone.replace(/\D/g, '');
                const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
                    : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;
                const resp = await fetch(`https://graph.facebook.com/v22.0/${META_PHONE_ID}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${META_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: formattedPhone,
                        type: 'text',
                        text: { body: personalizedMsg }
                    })
                });
                success = resp.ok;
            }
            else if (campaign.channel === 'email' && lead.email && transporter) {
                // SMTP ile gönder
                await transporter.sendMail({
                    from: userSettings.email_from || userSettings.email_user,
                    to: lead.email,
                    subject: campaign.name,
                    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            ${personalizedMsg.replace(/\n/g, '<br>')}
          </div>`,
                });
                success = true;
            }
            if (success) {
                sent++;
                // Mesajı kaydet
                await supabase.from('messages').insert([{
                        lead_id: lead.id,
                        channel: campaign.channel,
                        direction: 'out',
                        content: personalizedMsg,
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                    }]);
                // Kredi düş
                await supabase.from('users')
                    .update({ credits_used: supabase.rpc('increment', { x: 1 }) })
                    .eq('id', userId);
            }
            else {
                failed++;
            }
            // Rate limiting — her mesaj arası 1 saniye
            await new Promise(r => setTimeout(r, 1000));
        }
        catch (e) {
            console.error('Send error:', e.message);
            failed++;
        }
    }
    // Kampanya sonucunu güncelle
    await supabase.from('campaigns').update({
        total_sent: (campaign.total_sent || 0) + sent,
        status: failed === leads.length ? 'paused' : 'completed',
    }).eq('id', campaign.id);
    console.log(`Campaign ${campaign.id} done: ${sent} sent, ${failed} failed`);
}
// Kampanyayı duraklat
router.post('/:id/pause', async (req, res) => {
    try {
        const userId = req.userId;
        await supabase.from('campaigns')
            .update({ status: 'paused' })
            .eq('id', req.params.id)
            .eq('user_id', userId);
        res.json({ message: 'Kampanya duraklatıldı' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Kampanyayı sil
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        await supabase.from('campaigns')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', userId);
        res.json({ message: 'Kampanya silindi' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
