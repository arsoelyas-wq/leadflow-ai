"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { ApifyClient } = require('apify-client');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// POST /api/scrape — Google Maps'ten lead çek
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { keyword, city, limit = 20 } = req.body;
        if (!keyword || !city) {
            return res.status(400).json({ error: 'keyword ve city gerekli' });
        }
        // Kredi kontrolü
        const { data: userData } = await supabase
            .from('users')
            .select('credits_total, credits_used')
            .eq('id', userId)
            .single();
        const availableCredits = (userData?.credits_total || 0) - (userData?.credits_used || 0);
        const requestedLimit = Math.min(limit, 50); // max 50 per request
        if (availableCredits < requestedLimit) {
            return res.status(400).json({
                error: `Yetersiz kredi. Gerekli: ${requestedLimit}, Mevcut: ${availableCredits}`
            });
        }
        const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
        // Google Maps Scraper çalıştır
        const run = await client.actor('compass/crawler-google-places').call({
            searchStringsArray: [`${keyword} ${city}`],
            maxCrawledPlacesPerSearch: requestedLimit,
            language: 'tr',
            maxReviews: 0,
            maxImages: 0,
        });
        // Sonuçları al
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (!items || items.length === 0) {
            return res.json({ message: 'Sonuç bulunamadı', leads: [], count: 0 });
        }
        // Leads'e kaydet
        const leadsToInsert = items.map((item) => {
            const phone = item.phone || item.phoneUnformatted || null;
            const website = item.website || null;
            const address = item.address || item.street || null;
            // AI skorlama — telefon ve email varsa yüksek skor
            let score = 50;
            if (phone)
                score += 20;
            if (item.website)
                score += 10;
            if (item.reviewsCount > 10)
                score += 10;
            if (item.totalScore > 4)
                score += 10;
            return {
                user_id: userId,
                company_name: item.title || item.name || 'Bilinmiyor',
                contact_name: null,
                phone: phone,
                email: item.email || null,
                website: website,
                city: city,
                sector: keyword,
                source: 'Google Maps',
                score: Math.min(score, 100),
                status: 'new',
                notes: address,
                created_at: new Date().toISOString(),
            };
        });
        const { data: inserted, error } = await supabase
            .from('leads')
            .insert(leadsToInsert)
            .select();
        if (error)
            throw error;
        // Kredi düş
        await supabase
            .from('users')
            .update({ credits_used: (userData?.credits_used || 0) + inserted.length })
            .eq('id', userId);
        res.json({
            message: `${inserted.length} lead başarıyla eklendi!`,
            leads: inserted,
            count: inserted.length,
        });
    }
    catch (error) {
        console.error('Scrape error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// GET /api/scrape/status/:runId — Çalışan scrape'in durumunu kontrol et
router.get('/status/:runId', async (req, res) => {
    try {
        const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
        const run = await client.run(req.params.runId).get();
        res.json({ status: run?.status, finished: run?.status === 'SUCCEEDED' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = { router };
