"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const WATI_ENDPOINT = process.env.WATI_API_ENDPOINT;
const WATI_TOKEN = process.env.WATI_ACCESS_TOKEN;
// Tek mesaj gonder
router.post('/send', async (req, res) => {
    try {
        const { phone, message, leadId } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: 'Telefon ve mesaj zorunlu' });
        }
        // Telefonu formatla (90 ile baslayan 12 haneli)
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('90')
            ? cleanPhone
            : cleanPhone.startsWith('0')
                ? '9' + cleanPhone
                : '90' + cleanPhone;
        // WATI API ile mesaj gonder
        const response = await fetch(`${WATI_ENDPOINT}/api/v1/sendSessionMessage/${formattedPhone}`, {
            method: 'POST',
            headers: {
                'Authorization': WATI_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messageText: message })
        });
        const result = await response.json();
        // Mesaji veritabanina kaydet
        if (leadId) {
            await supabase.from('messages').insert([{
                    lead_id: leadId,
                    channel: 'whatsapp',
                    direction: 'outbound',
                    content: message,
                    status: response.ok ? 'sent' : 'failed',
                    sent_at: new Date().toISOString()
                }]);
            // Lead durumunu guncelle
            await supabase.from('leads')
                .update({ status: 'contacted' })
                .eq('id', leadId);
        }
        if (!response.ok) {
            return res.status(400).json({
                error: 'Mesaj gonderilemedi',
                detail: result
            });
        }
        res.json({
            message: 'WhatsApp mesaji gonderildi!',
            phone: formattedPhone,
            result
        });
    }
    catch (error) {
        console.error('WhatsApp Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// Toplu mesaj gonder (kampanya)
router.post('/bulk-send', async (req, res) => {
    try {
        const { leadIds, messageTemplate, userId } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || !messageTemplate) {
            return res.status(400).json({ error: 'leadIds ve messageTemplate zorunlu' });
        }
        // Leadleri cek
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .in('id', leadIds);
        if (error)
            throw error;
        const results = { sent: 0, failed: 0, skipped: 0 };
        for (const lead of leads) {
            if (!lead.phone) {
                results.skipped++;
                continue;
            }
            // Mesaji kisisellestir
            const personalizedMessage = messageTemplate
                .replace('[FIRMA_ADI]', lead.company_name || 'Firma')
                .replace('[SEHIR]', lead.city || '')
                .replace('[SEKTOR]', lead.sector || '');
            try {
                const cleanPhone = lead.phone.replace(/\D/g, '');
                const formattedPhone = cleanPhone.startsWith('90')
                    ? cleanPhone
                    : cleanPhone.startsWith('0')
                        ? '9' + cleanPhone
                        : '90' + cleanPhone;
                const response = await fetch(`${WATI_ENDPOINT}/api/v1/sendSessionMessage/${formattedPhone}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': WATI_TOKEN,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ messageText: personalizedMessage })
                });
                if (response.ok) {
                    results.sent++;
                    await supabase.from('messages').insert([{
                            lead_id: lead.id,
                            channel: 'whatsapp',
                            direction: 'outbound',
                            content: personalizedMessage,
                            status: 'sent',
                            sent_at: new Date().toISOString()
                        }]);
                    await supabase.from('leads').update({ status: 'contacted' }).eq('id', lead.id);
                }
                else {
                    results.failed++;
                }
                // Rate limit: 1 saniye bekle
                await new Promise(r => setTimeout(r, 1000));
            }
            catch (e) {
                results.failed++;
            }
        }
        res.json({
            message: 'Toplu gonderim tamamlandi!',
            results,
            total: leads.length
        });
    }
    catch (error) {
        console.error('Bulk Send Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// AI ile mesaj olustur ve gonder
router.post('/ai-send', async (req, res) => {
    try {
        const { leadId, profile } = req.body;
        const { data: lead, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();
        if (error || !lead) {
            return res.status(404).json({ error: 'Lead bulunamadi' });
        }
        if (!lead.phone) {
            return res.status(400).json({ error: 'Bu leadin telefon numarasi yok' });
        }
        // AI ile mesaj olustur
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const aiResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [{
                    role: 'user',
                    content: `WhatsApp mesaji yaz (max 250 karakter, Turkce, samimi):
Gonderen profili: ${JSON.stringify(profile || {})}
Alici firma: ${lead.company_name}, ${lead.city}
Sektor: ${lead.sector}
Sadece mesaj metnini yaz, baska hicbir sey yazma.`
                }]
        });
        const aiMessage = aiResponse.content[0].text.trim();
        // Mesaji gonder
        const cleanPhone = lead.phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('90')
            ? cleanPhone
            : cleanPhone.startsWith('0')
                ? '9' + cleanPhone
                : '90' + cleanPhone;
        const watiResponse = await fetch(`${WATI_ENDPOINT}/api/v1/sendSessionMessage/${formattedPhone}`, {
            method: 'POST',
            headers: {
                'Authorization': WATI_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messageText: aiMessage })
        });
        const watiResult = await watiResponse.json();
        await supabase.from('messages').insert([{
                lead_id: lead.id,
                channel: 'whatsapp',
                direction: 'outbound',
                content: aiMessage,
                status: watiResponse.ok ? 'sent' : 'failed',
                sent_at: new Date().toISOString()
            }]);
        res.json({
            message: 'AI mesaji olusturuldu ve gonderildi!',
            aiMessage,
            phone: formattedPhone,
            watiResult
        });
    }
    catch (error) {
        console.error('AI Send Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
