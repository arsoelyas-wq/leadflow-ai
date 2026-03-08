export {};
const express = require('express');
const { ApifyClient } = require('apify-client');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Google Maps scraping
router.post('/google-maps', async (req: any, res: any) => {
  try {
    const { keyword, city, maxResults = 20 } = req.body;
    const userId = req.userId; // authMiddleware'den gelir

    if (!keyword || !city) {
      return res.status(400).json({ error: 'keyword ve city zorunlu' });
    }

    // Apify token yoksa mock data döndür (test için)
    if (!process.env.APIFY_TOKEN) {
      const mockLeads = Array.from({ length: 5 }, (_, i) => ({
        user_id: userId,
        company_name: `${keyword} Firması ${i + 1}`,
        phone: `+905${Math.floor(Math.random() * 900000000 + 100000000)}`,
        website: null,
        city,
        sector: keyword,
        source: 'google_maps',
        status: 'new',
        score: Math.floor(Math.random() * 40 + 60),
        notes: `${city}, Türkiye`,
      }));

      const { data: saved, error } = await supabase
        .from('leads').insert(mockLeads).select();
      if (error) throw error;
      return res.json({ message: `${saved.length} test lead eklendi`, count: saved.length, leads: saved });
    }

    const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });
    const searchQuery = `${keyword} ${city} Turkey`;

    const run = await apify.actor('compass/crawler-google-places').call({
      searchStringsArray: [searchQuery],
      maxCrawledPlacesPerSearch: maxResults,
      language: 'tr',
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false,
    });

    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    if (!items?.length) return res.json({ message: 'Sonuç bulunamadı', count: 0, leads: [] });

    const leadsToInsert = items.map((place: any) => ({
      user_id: userId,
      company_name: place.title || 'Bilinmiyor',
      phone: place.phone || place.phoneUnformatted || null,
      website: place.website || null,
      city,
      sector: keyword,
      source: 'google_maps',
      status: 'new',
      score: calcScore(place),
      notes: place.address || null,
    }));

    const { data: saved, error } = await supabase
      .from('leads').insert(leadsToInsert).select();
    if (error) throw error;

    res.json({ message: `${saved.length} lead eklendi`, count: saved.length, leads: saved });
  } catch (e: any) {
    console.error('Scrape Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

function calcScore(place: any): number {
  let s = 50;
  if (place.phone) s += 20;
  if (place.website) s += 10;
  if (place.reviewsCount > 10) s += 10;
  if (place.totalScore > 4) s += 10;
  return Math.min(s, 100);
}

module.exports = router;