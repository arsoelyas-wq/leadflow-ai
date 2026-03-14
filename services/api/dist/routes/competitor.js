"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
function calcScore(place) {
    let score = 40;
    if (place.nationalPhoneNumber || place.internationalPhoneNumber)
        score += 25;
    if (place.websiteUri)
        score += 15;
    if (place.rating >= 4.0)
        score += 10;
    if (place.userRatingCount > 20)
        score += 10;
    return Math.min(score, 100);
}
function cleanPhone(phone) {
    if (!phone)
        return '';
    return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
}
// Google Places text search
async function searchPlaces(query, maxResults) {
    const results = [];
    let nextPageToken = null;
    let attempts = 0;
    do {
        attempts++;
        const body = {
            textQuery: query,
            languageCode: 'tr',
            maxResultCount: Math.min(20, maxResults - results.length),
        };
        if (nextPageToken)
            body.pageToken = nextPageToken;
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': [
                    'places.id', 'places.displayName', 'places.formattedAddress',
                    'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
                    'places.websiteUri', 'places.rating', 'places.userRatingCount',
                    'places.businessStatus', 'places.location', 'nextPageToken',
                ].join(','),
            },
            body: JSON.stringify(body),
        });
        if (!response.ok)
            throw new Error(`Google Places API hatası: ${await response.text()}`);
        const data = await response.json();
        const places = data.places || [];
        for (const place of places) {
            if (place.businessStatus === 'CLOSED_PERMANENTLY')
                continue;
            results.push({
                name: place.displayName?.text || 'Bilinmiyor',
                phone: cleanPhone(place.nationalPhoneNumber || place.internationalPhoneNumber || ''),
                website: place.websiteUri || null,
                address: place.formattedAddress || null,
                rating: place.rating || null,
                reviewCount: place.userRatingCount || 0,
                score: calcScore(place),
                location: place.location || null,
            });
            if (results.length >= maxResults)
                break;
        }
        nextPageToken = data.nextPageToken || null;
        if (nextPageToken && results.length < maxResults)
            await sleep(2000);
    } while (nextPageToken && results.length < maxResults && attempts < 5);
    return results;
}
// ── POST /api/competitor/hijack ───────────────────────────
// Rakip firma adıyla arama yap, çevresindeki potansiyel müşterileri bul
router.post('/hijack', async (req, res) => {
    try {
        const userId = req.userId;
        const { competitorName, city, targetSector, maxResults = 30 } = req.body;
        if (!competitorName || !city) {
            return res.status(400).json({ error: 'competitorName ve city zorunlu' });
        }
        // Kredi kontrolü
        const { data: userData } = await supabase
            .from('users')
            .select('credits_total, credits_used')
            .eq('id', userId)
            .single();
        const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
        if (available < maxResults) {
            return res.status(400).json({ error: `Yetersiz kredi. Gerekli: ${maxResults}, Mevcut: ${available}` });
        }
        console.log(`Competitor hijack: "${competitorName}" in ${city}, target: ${targetSector || 'genel'}`);
        // Strateji: 3 farklı arama yap
        const searches = [
            // 1. Rakibin müşteri sektörünü hedefle
            targetSector
                ? `${targetSector} ${city} Türkiye`
                : `${competitorName} müşterileri ${city}`,
            // 2. Rakibin yakınındaki benzer firmalar
            `${competitorName} rakipleri ${city} Türkiye`,
            // 3. Rakibin sektörü + şehir
            `${competitorName} sektörü ${city} Türkiye`,
        ];
        const allResults = [];
        const perSearch = Math.ceil(maxResults / searches.length);
        for (const query of searches) {
            try {
                const places = await searchPlaces(query, perSearch);
                allResults.push(...places);
                await sleep(1000);
            }
            catch (e) {
                console.error(`Search failed: ${query}`, e.message);
            }
        }
        // Tekrarları kaldır (telefon bazlı)
        const seen = new Set();
        const unique = allResults.filter(p => {
            if (!p.phone)
                return true;
            if (seen.has(p.phone))
                return false;
            seen.add(p.phone);
            return true;
        });
        // Skora göre sırala
        const sorted = unique.sort((a, b) => b.score - a.score).slice(0, maxResults);
        if (!sorted.length) {
            return res.json({ message: 'Sonuç bulunamadı', count: 0, leads: [] });
        }
        // Leads tablosuna kaydet
        const leadsToInsert = sorted.map(place => ({
            user_id: userId,
            company_name: place.name,
            phone: place.phone || null,
            website: place.website || null,
            city,
            sector: targetSector || competitorName,
            source: `Rakip: ${competitorName}`,
            status: 'new',
            score: place.score,
            notes: place.address || null,
        }));
        const { data: saved, error } = await supabase
            .from('leads')
            .insert(leadsToInsert)
            .select();
        if (error)
            throw error;
        // Kredi düş
        await supabase
            .from('users')
            .update({ credits_used: (userData?.credits_used || 0) + saved.length })
            .eq('id', userId);
        console.log(`Competitor hijack done: ${saved.length} leads saved`);
        res.json({
            message: `${saved.length} potansiyel müşteri bulundu!`,
            count: saved.length,
            competitor: competitorName,
            city,
            leads: saved,
        });
    }
    catch (e) {
        console.error('Competitor hijack error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
// ── POST /api/competitor/analyze ─────────────────────────
// Rakip firma hakkında bilgi topla
router.post('/analyze', async (req, res) => {
    try {
        const { competitorName, city } = req.body;
        if (!competitorName)
            return res.status(400).json({ error: 'competitorName zorunlu' });
        const places = await searchPlaces(`${competitorName} ${city || ''} Türkiye`, 5);
        if (!places.length) {
            return res.json({ found: false, message: 'Rakip bulunamadı' });
        }
        const competitor = places[0];
        // AI ile rakip analizi
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const analysis = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            messages: [{
                    role: 'user',
                    content: `"${competitorName}" firması hakkında kısa B2B satış analizi yap:
- Firma: ${competitor.name}
- Adres: ${competitor.address}
- Rating: ${competitor.rating} (${competitor.reviewCount} yorum)
- Website: ${competitor.website || 'yok'}

Şunları Türkçe olarak analiz et (JSON formatında):
{
  "weaknesses": ["zayıf nokta 1", "zayıf nokta 2"],
  "opportunities": ["fırsat 1", "fırsat 2"],
  "targetCustomers": "bu rakibin hedef müşteri profili",
  "pitchAngle": "bu rakibin müşterilerine nasıl yaklaşmalıyız",
  "suggestedMessage": "kısa WhatsApp mesaj taslağı"
}`,
                }],
        });
        const rawText = analysis.content[0]?.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        res.json({
            found: true,
            competitor: {
                name: competitor.name,
                address: competitor.address,
                rating: competitor.rating,
                reviewCount: competitor.reviewCount,
                website: competitor.website,
                score: competitor.score,
            },
            analysis: aiAnalysis,
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/competitor/leads — Rakip kaynaklı leadleri getir
router.get('/leads', async (req, res) => {
    try {
        const userId = req.userId;
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', userId)
            .ilike('source', 'Rakip:%')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error)
            throw error;
        // Rakip bazlı grupla
        const grouped = {};
        (data || []).forEach((lead) => {
            const competitor = lead.source?.replace('Rakip: ', '') || 'Diğer';
            if (!grouped[competitor])
                grouped[competitor] = [];
            grouped[competitor].push(lead);
        });
        res.json({
            total: data?.length || 0,
            grouped,
            leads: data || [],
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
