export {};
const express = require('express');
const { ApifyClient } = require('apify-client');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Google Maps'ten lead cek
router.post('/google-maps', async (req: any, res: any) => {
  try {
    const { keyword, city, userId, maxResults = 20 } = req.body;

    if (!keyword || !city || !userId) {
      return res.status(400).json({ error: 'keyword, city ve userId zorunlu' });
    }

    const searchQuery = `${keyword} ${city} Turkey`;
    console.log(`Scraping basliyor: ${searchQuery}`);

    // Apify Google Maps Scraper calistir
    const run = await apify.actor('compass/crawler-google-places').call({
      searchStringsArray: [searchQuery],
      maxCrawledPlacesPerSearch: maxResults,
      language: 'tr',
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false,
    });

    // Sonuclari al
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      return res.json({ message: 'Sonuc bulunamadi', count: 0, leads: [] });
    }

    // Leadleri veritabanina kaydet
    const leadsToInsert = items.map((place: any) => ({
      user_id: userId,
      company_name: place.title || 'Bilinmiyor',
      phone: place.phone || place.phoneUnformatted || null,
      website: place.website || null,
      city: city,
      sector: keyword,
      source: 'Google Maps',
      status: 'new',
      score: calculateScore(place),
      notes: place.address || null,
    }));

    const { data: savedLeads, error } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select();

    if (error) throw error;

    res.json({
      message: `${savedLeads.length} lead basariyla eklendi!`,
      count: savedLeads.length,
      leads: savedLeads
    });

  } catch (error: any) {
    console.error('Scraping Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Lead skoru hesapla
function calculateScore(place: any): number {
  let score = 50;
  if (place.phone) score += 20;
  if (place.website) score += 10;
  if (place.reviewsCount > 10) score += 10;
  if (place.totalScore > 4) score += 10;
  return Math.min(score, 100);
}

// Kayitli leadleri getir
router.get('/leads/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { status, source, limit = 50 } = req.query;

    let query = supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ count: data.length, leads: data });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Lead durumunu guncelle
router.patch('/leads/:leadId', async (req: any, res: any) => {
  try {
    const { leadId } = req.params;
    const { status, notes } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Lead guncellendi', lead: data });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;