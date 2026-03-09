export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Bekleme fonksiyonu
function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// Lead skoru hesapla
function calcScore(place: any): number {
  let score = 40;
  if (place.nationalPhoneNumber || place.internationalPhoneNumber) score += 25;
  if (place.websiteUri) score += 15;
  if (place.rating >= 4.0) score += 10;
  if (place.userRatingCount > 20) score += 10;
  return Math.min(score, 100);
}

// Telefon numarasını temizle
function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
}

// Google Places API (New) ile arama
async function searchPlaces(keyword: string, city: string, maxResults: number) {
  const results: any[] = [];
  let nextPageToken: string | null = null;
  let attempts = 0;

  do {
    attempts++;
    const body: any = {
      textQuery: `${keyword} ${city} Türkiye`,
      languageCode: 'tr',
      maxResultCount: Math.min(20, maxResults - results.length),
    };

    if (nextPageToken) {
      body.pageToken = nextPageToken;
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.nationalPhoneNumber',
            'places.internationalPhoneNumber',
            'places.websiteUri',
            'places.rating',
            'places.userRatingCount',
            'places.businessStatus',
            'places.regularOpeningHours',
            'nextPageToken',
          ].join(','),
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google Places API hatası: ${err}`);
    }

    const data: any = await response.json();
    const places = data.places || [];

    for (const place of places) {
      if (place.businessStatus === 'CLOSED_PERMANENTLY') continue;

      results.push({
        name: place.displayName?.text || 'Bilinmiyor',
        phone: cleanPhone(place.nationalPhoneNumber || place.internationalPhoneNumber || ''),
        website: place.websiteUri || null,
        address: place.formattedAddress || null,
        rating: place.rating || null,
        reviewCount: place.userRatingCount || 0,
        score: calcScore(place),
      });

      if (results.length >= maxResults) break;
    }

    nextPageToken = data.nextPageToken || null;

    // Google zorunlu bekleme (nextPageToken aktifleşmesi için)
    if (nextPageToken && results.length < maxResults) {
      await sleep(2000);
    }

  } while (nextPageToken && results.length < maxResults && attempts < 5);

  return results;
}

// POST /api/scrape/google-maps
router.post('/google-maps', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, city, maxResults = 20 } = req.body;

    if (!keyword || !city) {
      return res.status(400).json({ error: 'keyword ve city zorunlu' });
    }

    const limit = Math.min(Number(maxResults), 100);

    // Kredi kontrolü
    const { data: userData } = await supabase
      .from('users')
      .select('credits_total, credits_used')
      .eq('id', userId)
      .single();

    const availableCredits = (userData?.credits_total || 0) - (userData?.credits_used || 0);
    if (availableCredits < limit) {
      return res.status(400).json({
        error: `Yetersiz kredi. Gerekli: ${limit}, Mevcut: ${availableCredits}`
      });
    }

    // Google Places API key yoksa mock data
    if (!GOOGLE_API_KEY) {
      const mockLeads = Array.from({ length: Math.min(5, limit) }, (_, i) => ({
        user_id: userId,
        company_name: `${keyword} Firması ${i + 1}`,
        phone: `+9053${Math.floor(Math.random() * 10000000 + 10000000)}`,
        website: null,
        city,
        sector: keyword,
        source: 'Google Maps',
        status: 'new',
        score: Math.floor(Math.random() * 30 + 60),
        notes: `${city}, Türkiye (Test verisi)`,
      }));

      const { data: saved, error } = await supabase.from('leads').insert(mockLeads).select();
      if (error) throw error;
      return res.json({ message: `${saved.length} test lead eklendi`, count: saved.length, leads: saved });
    }

    // Google Places API ile çek
    console.log(`Scraping: "${keyword} ${city}" - max ${limit} sonuç`);
    const places = await searchPlaces(keyword, city, limit);

    if (!places.length) {
      return res.json({ message: 'Sonuç bulunamadı', count: 0, leads: [] });
    }

    // Leads tablosuna kaydet
    const leadsToInsert = places.map((place: any) => ({
      user_id: userId,
      company_name: place.name,
      phone: place.phone || null,
      website: place.website || null,
      city,
      sector: keyword,
      source: 'Google Maps',
      status: 'new',
      score: place.score,
      notes: place.address || null,
    }));

    const { data: saved, error } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select();

    if (error) throw error;

    // Kredi düş
    await supabase
      .from('users')
      .update({ credits_used: (userData?.credits_used || 0) + saved.length })
      .eq('id', userId);

    console.log(`Scrape done: ${saved.length} leads saved for user ${userId}`);

    res.json({
      message: `${saved.length} lead başarıyla eklendi!`,
      count: saved.length,
      leads: saved,
    });

  } catch (e: any) {
    console.error('Scrape Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;