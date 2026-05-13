export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ── In-memory job store ───────────────────────────────────────────────────────
interface Job {
  status: 'running' | 'done' | 'error';
  total: number;
  found: number;
  saved: number;
  keyword: string;
  city: string;
  error?: string;
  startedAt: number;
}
const jobs = new Map<string, Job>();

// Cleanup jobs older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.startedAt < cutoff) jobs.delete(id);
  }
}, 30 * 60 * 1000);

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function calcScore(place: any): number {
  let score = 40;
  if (place.nationalPhoneNumber || place.internationalPhoneNumber) score += 25;
  if (place.websiteUri) score += 15;
  if (place.rating >= 4.0) score += 10;
  if (place.userRatingCount > 20) score += 10;
  return Math.min(score, 100);
}

function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
}

// ── Multi-query keyword expansion ─────────────────────────────────────────────
function expandKeywords(base: string): string[] {
  const b = base.trim();
  return [
    b,
    `${b} firması`,
    `${b} mağazası`,
    `${b} şirketi`,
    `${b} toptancısı`,
    `${b} imalatçı`,
    `${b} satış`,
    `${b} toptan`,
  ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate
}

// ── District expansion for large cities ──────────────────────────────────────
const DISTRICTS: Record<string, string[]> = {
  istanbul: ['Kadıköy','Beşiktaş','Şişli','Bakırköy','Üsküdar','Fatih','Ataşehir','Maltepe','Pendik','Kartal','Bağcılar','Bahçelievler','Beyoğlu','Esenyurt','Kağıthane','Sarıyer','Zeytinburnu','Beylikdüzü','Avcılar','Güngören'],
  ankara:   ['Çankaya','Keçiören','Mamak','Yenimahalle','Etimesgut','Sincan','Altındağ','Pursaklar','Gölbaşı','Polatlı'],
  izmir:    ['Konak','Bornova','Karşıyaka','Buca','Çiğli','Menemen','Bayraklı','Gaziemir','Balçova','Narlıdere'],
  paris:    ['Paris 1er','Paris 3e','Paris 8e','Paris 11e','Paris 13e','Paris 15e','Paris 17e','Paris 18e','Saint-Denis','Boulogne-Billancourt','Levallois-Perret','Montreuil','Vincennes','Nanterre'],
  berlin:   ['Mitte','Prenzlauer Berg','Kreuzberg','Friedrichshain','Charlottenburg','Neukölln','Tempelhof','Spandau','Pankow','Steglitz'],
  london:   ['City of London','Canary Wharf','Shoreditch','Camden','Hackney','Islington','Southwark','Lambeth','Wandsworth','Greenwich'],
};

function getDistricts(city: string, country: string, maxResults: number): string[] {
  if (maxResults <= 100) return [city]; // small requests: city-level only
  const key = city.toLowerCase().replace(/\s+/g, '');
  return DISTRICTS[key] || [city];
}

// ── Single Places API page fetch ──────────────────────────────────────────────
async function fetchPlacesPage(
  query: string,
  country: string,
  pageToken?: string
): Promise<{ places: any[]; nextPageToken: string | null }> {
  const body: any = {
    textQuery: query,
    languageCode: country === 'TR' ? 'tr' : country === 'FR' ? 'fr' : country === 'DE' ? 'de' : 'en',
    maxResultCount: 20,
  };
  if (pageToken) body.pageToken = pageToken;

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
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
        'nextPageToken',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`Places API error: ${await resp.text()}`);
  const data: any = await resp.json();
  return { places: data.places || [], nextPageToken: data.nextPageToken || null };
}

// ── Core scraping engine ──────────────────────────────────────────────────────
async function scrapeLeads(opts: {
  keyword: string;
  city: string;
  country: string;
  maxResults: number;
  userId: string;
  onProgress?: (found: number, saved: number) => void;
}): Promise<{ saved: number }> {
  const { keyword, city, country, maxResults, userId, onProgress } = opts;

  // Load existing leads for deduplication
  const { data: existing } = await supabase
    .from('leads')
    .select('company_name, phone')
    .eq('user_id', userId)
    .limit(2000);

  const existingNames = new Set((existing || []).map((l: any) => (l.company_name || '').toLowerCase()));
  const existingPhones = new Set((existing || []).map((l: any) => l.phone).filter(Boolean));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const collected: any[] = [];

  const keywords = expandKeywords(keyword);
  const districts = getDistricts(city, country, maxResults);
  const countryName = { TR: 'Türkiye', FR: 'France', DE: 'Deutschland', GB: 'United Kingdom', NL: 'Netherlands', BE: 'Belgium' }[country] || country;

  let queryIdx = 0;

  outer:
  for (const district of districts) {
    const location = district.toLowerCase() === city.toLowerCase()
      ? `${city} ${countryName}`
      : `${district} ${city} ${countryName}`;

    for (const kw of keywords) {
      if (collected.length >= maxResults) break outer;

      const query = `${kw} ${location}`;
      let pageToken: string | null = null;
      let pages = 0;

      do {
        if (collected.length >= maxResults) break;
        try {
          const { places, nextPageToken } = await fetchPlacesPage(query, country, pageToken || undefined);

          for (const p of places) {
            if (collected.length >= maxResults) break;
            if (p.businessStatus === 'CLOSED_PERMANENTLY') continue;
            if (seenIds.has(p.id)) continue;

            const name = p.displayName?.text || '';
            const nameLower = name.toLowerCase();
            const phone = cleanPhone(p.nationalPhoneNumber || p.internationalPhoneNumber || '');

            if (existingNames.has(nameLower) || seenNames.has(nameLower)) continue;
            if (phone && existingPhones.has(phone)) continue;

            seenIds.add(p.id);
            seenNames.add(nameLower);

            collected.push({
              user_id: userId,
              company_name: name,
              phone: phone || null,
              website: p.websiteUri || null,
              city: district.toLowerCase() !== city.toLowerCase() ? `${district}, ${city}` : city,
              sector: keyword,
              source: 'Google Maps',
              status: 'new',
              score: calcScore(p),
              notes: p.formattedAddress || null,
              rating: p.rating || null,
            });
          }

          pageToken = nextPageToken;
          pages++;
          onProgress?.(collected.length, 0);
          if (pageToken) await sleep(2200); // Google requires delay before using pageToken
        } catch (e: any) {
          console.error(`[Scrape] query "${query}" failed:`, e.message);
          break;
        }
      } while (pageToken && pages < 3);

      queryIdx++;
      if (queryIdx % 4 === 0 && collected.length < maxResults) await sleep(300);
    }
  }

  if (!collected.length) return { saved: 0 };

  // Batch-insert in groups of 50
  let totalSaved = 0;
  for (let i = 0; i < collected.length; i += 50) {
    const batch = collected.slice(i, i + 50);
    const { data, error } = await supabase.from('leads').insert(batch).select('id');
    if (!error && data) totalSaved += data.length;
    onProgress?.(collected.length, totalSaved);
  }

  return { saved: totalSaved };
}

// ── POST /api/scrape/google-maps ──────────────────────────────────────────────
router.post('/google-maps', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, city, country = 'TR', maxResults = 20 } = req.body;

    if (!keyword || !city) {
      return res.status(400).json({ error: 'keyword ve city zorunlu' });
    }

    const limit = Math.max(10, Math.min(Number(maxResults), 1000));

    // Credit check
    const { data: userData } = await supabase
      .from('users')
      .select('credits_total, credits_used')
      .eq('id', userId)
      .single();

    const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
    if (available < limit) {
      return res.status(400).json({
        error: `Yetersiz kredi. Gerekli: ${limit}, Mevcut: ${available}`,
        needCredits: limit - available,
      });
    }

    // No API key → mock data
    if (!GOOGLE_API_KEY) {
      const count = Math.min(8, limit);
      const mock = Array.from({ length: count }, (_, i) => ({
        user_id: userId,
        company_name: `${keyword} Firması ${i + 1}`,
        phone: `+9053${Math.floor(Math.random() * 10000000 + 10000000)}`,
        website: null, city, sector: keyword, source: 'Google Maps',
        status: 'new', score: Math.floor(Math.random() * 30 + 60),
        notes: `${city} (Test verisi)`,
      }));
      const { data: saved, error } = await supabase.from('leads').insert(mock).select();
      if (error) throw error;
      return res.json({ message: `${saved.length} test lead eklendi`, count: saved.length });
    }

    // Large requests (>100) → background job
    if (limit > 100) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      jobs.set(jobId, { status: 'running', total: limit, found: 0, saved: 0, keyword, city, startedAt: Date.now() });

      // Reserve credits
      await supabase.from('users').update({ credits_used: (userData.credits_used || 0) + limit }).eq('id', userId);

      scrapeLeads({ keyword, city, country, maxResults: limit, userId, onProgress: (found, saved) => {
        const j = jobs.get(jobId);
        if (j) { j.found = found; j.saved = saved; }
      }}).then(({ saved: count }) => {
        const j = jobs.get(jobId);
        if (j) { j.status = 'done'; j.saved = count; }
        // Refund difference if fewer found
        const diff = limit - count;
        if (diff > 0) {
          supabase.from('users').update({ credits_used: Math.max(0, (userData.credits_used || 0) + count) }).eq('id', userId);
        }
      }).catch(e => {
        const j = jobs.get(jobId);
        if (j) { j.status = 'error'; j.error = e.message; }
        supabase.from('users').update({ credits_used: userData.credits_used || 0 }).eq('id', userId);
      });

      return res.json({ jobId, async: true, total: limit, message: `${limit} lead toplanıyor, arka planda çalışıyor...` });
    }

    // Small request → synchronous
    const { saved } = await scrapeLeads({ keyword, city, country, maxResults: limit, userId });

    await supabase.from('users').update({
      credits_used: (userData.credits_used || 0) + saved,
    }).eq('id', userId);

    res.json({ message: `${saved} lead başarıyla eklendi!`, count: saved });

  } catch (e: any) {
    console.error('[Scrape] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/scrape/job/:jobId ─────────────────────────────────────────────────
router.get('/job/:jobId', (req: any, res: any) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job bulunamadı' });
  res.json(job);
});

module.exports = router;
