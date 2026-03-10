"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BASE_URL = process.env.API_URL || 'https://leadflow-ai-production.up.railway.app';
// Kısa kod üret
function generateShortCode() {
    return crypto.randomBytes(4).toString('hex'); // 8 karakter
}
// URL'deki linkleri takip linkine çevir
function wrapLinks(text, trackingMap) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        if (trackingMap[url])
            return trackingMap[url];
        return url;
    });
}
// POST /api/links/create — Takip linki oluştur
router.post('/create', async (req, res) => {
    try {
        const userId = req.userId;
        const { url, campaign_id, lead_id } = req.body;
        if (!url)
            return res.status(400).json({ error: 'url zorunlu' });
        const shortCode = generateShortCode();
        const { data, error } = await supabase
            .from('tracked_links')
            .insert([{
                user_id: userId,
                campaign_id: campaign_id || null,
                lead_id: lead_id || null,
                original_url: url,
                short_code: shortCode,
                clicks: 0,
            }])
            .select()
            .single();
        if (error)
            throw error;
        res.json({
            short_url: `${BASE_URL}/t/${shortCode}`,
            short_code: shortCode,
            original_url: url,
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /t/:code — Tıklamayı kaydet ve yönlendir
router.get('/redirect/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const { data: link, error } = await supabase
            .from('tracked_links')
            .select('*')
            .eq('short_code', code)
            .single();
        if (error || !link)
            return res.status(404).send('Link bulunamadı');
        // Tıklamayı kaydet
        await supabase
            .from('tracked_links')
            .update({
            clicks: (link.clicks || 0) + 1,
            last_clicked_at: new Date().toISOString(),
        })
            .eq('short_code', code);
        // Lead'i güncelle — link açıldı
        if (link.lead_id) {
            await supabase
                .from('leads')
                .update({ status: 'contacted' })
                .eq('id', link.lead_id)
                .eq('status', 'new'); // Sadece new ise güncelle
            // Mesaj olarak kaydet
            await supabase.from('messages').insert([{
                    lead_id: link.lead_id,
                    user_id: link.user_id,
                    channel: 'whatsapp',
                    direction: 'in',
                    content: `[Link açıldı: ${link.original_url}]`,
                    status: 'received',
                    sent_at: new Date().toISOString(),
                }]);
        }
        console.log(`Link clicked: ${code} → ${link.original_url} (lead: ${link.lead_id})`);
        // Orijinal URL'e yönlendir
        res.redirect(301, link.original_url);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/links — Kullanıcının linklerini getir
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { campaign_id } = req.query;
        let query = supabase
            .from('tracked_links')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (campaign_id)
            query = query.eq('campaign_id', campaign_id);
        const { data, error } = await query;
        if (error)
            throw error;
        res.json({ links: data || [] });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/links/stats — Özet istatistik
router.get('/stats', async (req, res) => {
    try {
        const userId = req.userId;
        const { data, error } = await supabase
            .from('tracked_links')
            .select('clicks, created_at, last_clicked_at, original_url, short_code')
            .eq('user_id', userId)
            .order('clicks', { ascending: false })
            .limit(20);
        if (error)
            throw error;
        const totalClicks = (data || []).reduce((sum, l) => sum + (l.clicks || 0), 0);
        const totalLinks = (data || []).length;
        const clickRate = totalLinks > 0 ? Math.round((totalClicks / totalLinks) * 100) / 100 : 0;
        res.json({
            totalLinks,
            totalClicks,
            clickRate,
            topLinks: data || [],
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
