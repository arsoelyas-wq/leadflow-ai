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
  status: 'running' | 'enriching' | 'done' | 'error';
  total: number;
  found: number;
  saved: number;
  enriched: number;       // leads with email discovered
  withPhone: number;
  withEmail: number;
  withWebsite: number;
  keyword: string;
  city: string;
  country: string;
  phase: string;          // human-readable current step
  error?: string;
  startedAt: number;
}
const jobs = new Map<string, Job>();

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.startedAt < cutoff) jobs.delete(id);
  }
}, 30 * 60 * 1000);

// ── City coordinates for precision geotargeting ───────────────────────────────
const CITY_COORDS: Record<string, { lat: number; lng: number; radius: number }> = {
  // Turkey
  istanbul:  { lat: 41.0082, lng: 28.9784, radius: 25000 },
  ankara:    { lat: 39.9334, lng: 32.8597, radius: 20000 },
  izmir:     { lat: 38.4192, lng: 27.1287, radius: 18000 },
  bursa:     { lat: 40.1826, lng: 29.0665, radius: 15000 },
  antalya:   { lat: 36.8969, lng: 30.7133, radius: 15000 },
  adana:     { lat: 37.0000, lng: 35.3213, radius: 12000 },
  konya:     { lat: 37.8714, lng: 32.4844, radius: 12000 },
  gaziantep: { lat: 37.0662, lng: 37.3833, radius: 12000 },
  kayseri:   { lat: 38.7312, lng: 35.4787, radius: 12000 },
  mersin:    { lat: 36.8000, lng: 34.6333, radius: 12000 },
  // France
  paris:     { lat: 48.8566, lng: 2.3522, radius: 20000 },
  lyon:      { lat: 45.7640, lng: 4.8357, radius: 15000 },
  marseille: { lat: 43.2965, lng: 5.3698, radius: 15000 },
  toulouse:  { lat: 43.6047, lng: 1.4442, radius: 12000 },
  nice:      { lat: 43.7102, lng: 7.2620, radius: 10000 },
  // Germany
  berlin:    { lat: 52.5200, lng: 13.4050, radius: 22000 },
  hamburg:   { lat: 53.5753, lng: 10.0153, radius: 18000 },
  münchen:   { lat: 48.1351, lng: 11.5820, radius: 18000 },
  köln:      { lat: 50.9333, lng: 6.9500, radius: 15000 },
  frankfurt: { lat: 50.1109, lng: 8.6821, radius: 15000 },
  // UK
  london:    { lat: 51.5074, lng: -0.1278, radius: 25000 },
  birmingham:{ lat: 52.4862, lng: -1.8904, radius: 15000 },
  manchester:{ lat: 53.4808, lng: -2.2426, radius: 15000 },
};

function getCityCoords(city: string) {
  const key = city.toLowerCase()
    .replace('İ', 'i').replace(/[^a-z]/g, '');
  return CITY_COORDS[key] || null;
}

// ── District expansion for large cities ──────────────────────────────────────
const DISTRICTS: Record<string, string[]> = {
  istanbul: ['Kadıköy','Beşiktaş','Şişli','Bakırköy','Üsküdar','Fatih','Ataşehir','Maltepe','Pendik','Kartal','Bağcılar','Bahçelievler','Beyoğlu','Esenyurt','Kağıthane','Sarıyer','Zeytinburnu','Beylikdüzü','Avcılar','Güngören'],
  ankara:   ['Çankaya','Keçiören','Mamak','Yenimahalle','Etimesgut','Sincan','Altındağ','Pursaklar','Gölbaşı','Polatlı'],
  izmir:    ['Konak','Bornova','Karşıyaka','Buca','Çiğli','Menemen','Bayraklı','Gaziemir','Balçova','Narlıdere'],
  paris:    ['Paris 1er','Paris 3e','Paris 8e','Paris 11e','Paris 13e','Paris 15e','Paris 17e','Saint-Denis','Boulogne-Billancourt','Levallois-Perret','Montreuil'],
  berlin:   ['Mitte','Prenzlauer Berg','Kreuzberg','Friedrichshain','Charlottenburg','Neukölln','Tempelhof','Spandau','Pankow','Steglitz'],
  london:   ['City of London','Shoreditch','Camden','Hackney','Islington','Southwark','Lambeth','Wandsworth','Greenwich','Canary Wharf'],
};

function getDistricts(city: string, maxResults: number): string[] {
  if (maxResults <= 100) return [city];
  const key = city.toLowerCase().replace(/[^a-z]/g, '');
  return DISTRICTS[key] || [city];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
}

function validatePhone(phone: string, country: string): string | null {
  if (!phone) return null;
  const p = cleanPhone(phone);
  if (p.length < 7) return null;
  if (country === 'TR') {
    if (p.startsWith('+90') && p.length === 13) return p;
    if (p.startsWith('90') && p.length === 12) return '+' + p;
    if (p.startsWith('0') && p.length === 11) return '+90' + p.slice(1);
    if (p.length === 10) return '+90' + p;
    return p;
  }
  if (country === 'FR') {
    if (p.startsWith('+33')) return p;
    if (p.startsWith('0') && p.length === 10) return '+33' + p.slice(1);
  }
  if (country === 'DE') {
    if (p.startsWith('+49')) return p;
  }
  if (country === 'GB') {
    if (p.startsWith('+44')) return p;
    if (p.startsWith('0') && p.length >= 10) return '+44' + p.slice(1);
  }
  return p.length >= 7 ? p : null;
}

// ── Email Discovery ───────────────────────────────────────────────────────────
const EMAIL_BLACKLIST = new Set([
  'example.com','test.com','domain.com','email.com','noreply',
  'no-reply','sentry.io','wixpress.com','squarespace.com',
  'wordpress.com','cloudflare.com','google.com','schema.org',
]);

const EMAIL_REGEX = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;

function isValidEmail(email: string): boolean {
  if (email.length > 80) return false;
  const domain = email.split('@')[1] || '';
  if (EMAIL_BLACKLIST.has(domain)) return false;
  if (domain.includes('.jpg') || domain.includes('.png')) return false;
  if (/\d{4,}/.test(domain)) return false; // numeric-heavy domains are usually artifacts
  return true;
}

function rankEmail(email: string): number {
  const local = email.split('@')[0].toLowerCase();
  if (['info','iletisim','contact','hello','mail','sales','hola'].includes(local)) return 10;
  if (['bilgi','destek','support','office'].includes(local)) return 8;
  if (local.length < 15) return 5; // shorter locals are usually real
  return 2;
}

async function discoverEmail(website: string): Promise<string | null> {
  if (!website) return null;
  const base = website.startsWith('http') ? website : `https://${website}`;

  const contactPaths = ['', '/contact', '/iletisim', '/about', '/hakkimizda',
    '/contact-us', '/bize-ulasin', '/contacto', '/kontakt', '/impressum'];

  for (const path of contactPaths) {
    try {
      const resp = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(6000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          'Accept': 'text/html',
        },
      });
      if (!resp.ok) continue;
      const html = await resp.text();

      // Decode HTML entities first
      const decoded = html
        .replace(/&amp;/g, '&')
        .replace(/&#64;/g, '@')
        .replace(/\[at\]/gi, '@')
        .replace(/\(at\)/gi, '@')
        .replace(/&#x40;/gi, '@');

      const found = (decoded.match(EMAIL_REGEX) || []).filter(isValidEmail);
      if (found.length === 0) continue;

      // Sort by preference
      found.sort((a, b) => rankEmail(b) - rankEmail(a));
      return found[0];
    } catch { continue; }
  }
  return null;
}

// Run email discovery with bounded concurrency
async function enrichWithEmails(
  leads: any[],
  onProgress?: (enriched: number) => void
): Promise<any[]> {
  const CONCURRENCY = 6;
  let enriched = 0;

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (lead) => {
        if (!lead.website) return;
        try {
          const email = await discoverEmail(lead.website);
          if (email) lead.email = email;
        } catch {}
        enriched++;
        onProgress?.(enriched);
      })
    );
  }

  return leads;
}

// ── 10-Signal Lead Quality Score ─────────────────────────────────────────────
function calcScore(place: any, emailFound?: boolean): number {
  let score = 0;

  // Phone validity (+20)
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
  if (phone && cleanPhone(phone).length >= 7) score += 20;

  // Email discovered (+25 — biggest signal)
  if (emailFound) score += 25;

  // Has website (+10)
  if (place.websiteUri) score += 10;

  // Review quality (+15 max)
  const rating = place.rating || 0;
  const reviews = place.userRatingCount || 0;
  if (rating >= 4.5) score += 15;
  else if (rating >= 4.0) score += 10;
  else if (rating >= 3.0) score += 5;

  // Review volume (+10 max)
  if (reviews >= 50) score += 10;
  else if (reviews >= 20) score += 7;
  else if (reviews >= 5) score += 4;

  // Business is open / has hours (+5)
  if (place.regularOpeningHours?.periods?.length > 0) score += 5;

  // Has primary type / category (+5)
  if (place.primaryTypeDisplayName || place.types?.length > 0) score += 5;

  // Has photos (+5)
  if (place.photos?.length > 0) score += 5;

  return Math.min(score, 100);
}

// ── Google Places API fetch ───────────────────────────────────────────────────
async function fetchPlacesPage(opts: {
  query: string;
  lang: string;
  coords?: { lat: number; lng: number; radius: number };
  pageToken?: string;
}): Promise<{ places: any[]; nextPageToken: string | null }> {
  const body: any = {
    textQuery: opts.query,
    languageCode: opts.lang,
    maxResultCount: 20,
  };
  if (opts.pageToken) body.pageToken = opts.pageToken;
  if (opts.coords && !opts.pageToken) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.coords.lat, longitude: opts.coords.lng },
        radius: opts.coords.radius,
      },
    };
  }

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
        'places.regularOpeningHours',
        'places.primaryTypeDisplayName',
        'places.photos',
        'nextPageToken',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`Places API error: ${await resp.text()}`);
  const data: any = await resp.json();
  return { places: data.places || [], nextPageToken: data.nextPageToken || null };
}

// ── Keyword expansion ─────────────────────────────────────────────────────────
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
  ].filter((v, i, a) => a.indexOf(v) === i);
}

// ── Core scraping engine ──────────────────────────────────────────────────────
async function scrapeLeads(opts: {
  keyword: string;
  city: string;
  country: string;
  maxResults: number;
  userId: string;
  minScore?: number;
  requirePhone?: boolean;
  requireWebsite?: boolean;
  discoverEmails?: boolean;
  onProgress?: (phase: string, found: number, saved: number, enriched: number) => void;
}): Promise<{ saved: number; stats: { withPhone: number; withEmail: number; withWebsite: number } }> {
  const {
    keyword, city, country, maxResults, userId,
    minScore = 0, requirePhone = false, requireWebsite = false,
    discoverEmails = false, onProgress,
  } = opts;

  const lang: Record<string, string> = { TR: 'tr', FR: 'fr', DE: 'de', GB: 'en', NL: 'nl', BE: 'fr' };
  const countryName: Record<string, string> = { TR: 'Türkiye', FR: 'France', DE: 'Deutschland', GB: 'United Kingdom', NL: 'Nederland', BE: 'Belgique' };

  // Load existing leads for deduplication
  const { data: existing } = await supabase
    .from('leads')
    .select('company_name, phone')
    .eq('user_id', userId)
    .limit(3000);

  const existingNames = new Set((existing || []).map((l: any) => (l.company_name || '').toLowerCase().trim()));
  const existingPhones = new Set((existing || []).map((l: any) => l.phone).filter(Boolean));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const collected: any[] = [];

  const keywords = expandKeywords(keyword);
  const districts = getDistricts(city, maxResults);
  const coords = getCityCoords(city);
  const cName = countryName[country] || country;
  const langCode = lang[country] || 'en';

  let queryIdx = 0;

  onProgress?.('Tarama başlatılıyor...', 0, 0, 0);

  outer:
  for (const district of districts) {
    const location = district.toLowerCase() === city.toLowerCase()
      ? `${city} ${cName}`
      : `${district} ${city} ${cName}`;

    for (const kw of keywords) {
      if (collected.length >= maxResults) break outer;

      const query = `${kw} ${location}`;
      let pageToken: string | null = null;
      let pages = 0;

      do {
        if (collected.length >= maxResults) break;
        try {
          const { places, nextPageToken } = await fetchPlacesPage({
            query,
            lang: langCode,
            coords: coords && !pageToken ? coords : undefined,
            pageToken: pageToken || undefined,
          });

          for (const p of places) {
            if (collected.length >= maxResults) break;
            if (p.businessStatus === 'CLOSED_PERMANENTLY') continue;
            if (seenIds.has(p.id)) continue;

            const name = (p.displayName?.text || '').trim();
            if (!name) continue;
            const nameLower = name.toLowerCase();
            const phone = validatePhone(
              p.nationalPhoneNumber || p.internationalPhoneNumber || '',
              country
            );

            // Dedup against CRM and within batch
            if (existingNames.has(nameLower) || seenNames.has(nameLower)) continue;
            if (phone && existingPhones.has(phone)) continue;

            // Quality filter: require phone
            if (requirePhone && !phone) continue;
            // Quality filter: require website
            if (requireWebsite && !p.websiteUri) continue;

            seenIds.add(p.id);
            seenNames.add(nameLower);

            const score = calcScore(p);
            if (score < minScore) continue;

            collected.push({
              _placeId: p.id,
              name,
              phone: phone || null,
              website: p.websiteUri || null,
              address: p.formattedAddress || null,
              rating: p.rating || null,
              reviewCount: p.userRatingCount || 0,
              score,
              district: district.toLowerCase() !== city.toLowerCase() ? district : null,
              email: null as string | null,
            });
          }

          pageToken = nextPageToken;
          pages++;
          onProgress?.(`"${kw}" taranıyor...`, collected.length, 0, 0);
          if (pageToken) await sleep(2200);
        } catch (e: any) {
          console.error(`[Scrape] query "${query}" failed:`, e.message);
          break;
        }
      } while (pageToken && pages < 3);

      queryIdx++;
      if (queryIdx % 4 === 0 && collected.length < maxResults) await sleep(300);
    }
  }

  // ── Email discovery phase ──────────────────────────────────────────────────
  if (discoverEmails && collected.length > 0) {
    onProgress?.(`${collected.length} lead için email aranıyor...`, collected.length, 0, 0);
    await enrichWithEmails(collected, (enrichedN: number) => {
      onProgress?.(`Email keşfi: ${enrichedN}/${collected.length}`, collected.length, 0, enrichedN);
    });
    // Recalculate scores now that we know which leads have emails
    for (const lead of collected) {
      lead.score = Math.min(100, lead.score + (lead.email ? 25 : 0));
    }
  }

  // ── Filter leads that now meet minScore (after email enrichment) ───────────
  const finalLeads = collected.filter(l => l.score >= minScore);

  if (!finalLeads.length) {
    return { saved: 0, stats: { withPhone: 0, withEmail: 0, withWebsite: 0 } };
  }

  // ── Batch insert ──────────────────────────────────────────────────────────
  const leadsToInsert = finalLeads.map(l => ({
    user_id: userId,
    company_name: l.name,
    phone: l.phone,
    email: l.email,
    website: l.website,
    city: l.district ? `${l.district}, ${city}` : city,
    sector: keyword,
    source: 'Google Maps',
    status: 'new',
    score: l.score,
    notes: l.address || null,
    rating: l.rating,
  }));

  let totalSaved = 0;
  for (let i = 0; i < leadsToInsert.length; i += 50) {
    const batch = leadsToInsert.slice(i, i + 50);
    const { data, error } = await supabase.from('leads').insert(batch).select('id');
    if (!error && data) totalSaved += data.length;
    onProgress?.('Kaydediliyor...', finalLeads.length, totalSaved, 0);
  }

  const stats = {
    withPhone: finalLeads.filter(l => l.phone).length,
    withEmail: finalLeads.filter(l => l.email).length,
    withWebsite: finalLeads.filter(l => l.website).length,
  };

  return { saved: totalSaved, stats };
}

// ── POST /api/scrape/google-maps ──────────────────────────────────────────────
router.post('/google-maps', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const {
      keyword, city, country = 'TR', maxResults = 20,
      minScore = 0, requirePhone = false, requireWebsite = false,
      discoverEmails = false,
    } = req.body;

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

    // No API key → mock
    if (!GOOGLE_API_KEY) {
      const count = Math.min(8, limit);
      const mock = Array.from({ length: count }, (_, i) => ({
        user_id: userId,
        company_name: `${keyword} Firması ${i + 1}`,
        phone: `+9053${Math.floor(Math.random() * 10000000 + 10000000)}`,
        email: i % 3 === 0 ? `info@firma${i}.com` : null,
        website: i % 2 === 0 ? `https://firma${i}.com` : null,
        city, sector: keyword, source: 'Google Maps',
        status: 'new', score: Math.floor(Math.random() * 40 + 50),
        notes: `${city} (Test verisi)`,
      }));
      const { data: saved, error } = await supabase.from('leads').insert(mock).select();
      if (error) throw error;
      return res.json({
        message: `${saved.length} test lead eklendi`, count: saved.length,
        stats: { withPhone: saved.length, withEmail: Math.floor(saved.length / 3), withWebsite: Math.floor(saved.length / 2) },
      });
    }

    // Large requests → background job
    if (limit > 100 || discoverEmails) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      jobs.set(jobId, {
        status: 'running', total: limit, found: 0, saved: 0, enriched: 0,
        withPhone: 0, withEmail: 0, withWebsite: 0,
        keyword, city, country, phase: 'Başlatılıyor...', startedAt: Date.now(),
      });

      // Reserve credits
      await supabase.from('users').update({ credits_used: (userData.credits_used || 0) + limit }).eq('id', userId);

      scrapeLeads({
        keyword, city, country, maxResults: limit,
        userId, minScore, requirePhone, requireWebsite, discoverEmails,
        onProgress: (phase, found, saved, enriched) => {
          const j = jobs.get(jobId);
          if (j) {
            j.phase = phase; j.found = found; j.saved = saved; j.enriched = enriched;
            if (found > j.total) j.total = found; // dynamic update if more found
          }
        },
      }).then(({ saved: count, stats }) => {
        const j = jobs.get(jobId);
        if (j) {
          j.status = 'done'; j.saved = count;
          j.withPhone = stats.withPhone; j.withEmail = stats.withEmail; j.withWebsite = stats.withWebsite;
        }
        // Refund unused credits
        const diff = limit - count;
        if (diff > 0) {
          supabase.from('users').update({ credits_used: Math.max(0, (userData.credits_used || 0) + count) }).eq('id', userId);
        }
      }).catch(e => {
        const j = jobs.get(jobId);
        if (j) { j.status = 'error'; j.error = e.message; }
        supabase.from('users').update({ credits_used: userData.credits_used || 0 }).eq('id', userId);
      });

      return res.json({ jobId, async: true, total: limit, message: 'Arka planda çalışıyor...' });
    }

    // Small synchronous request
    const { saved, stats } = await scrapeLeads({
      keyword, city, country, maxResults: limit,
      userId, minScore, requirePhone, requireWebsite, discoverEmails: false,
    });

    await supabase.from('users').update({
      credits_used: (userData.credits_used || 0) + saved,
    }).eq('id', userId);

    res.json({ message: `${saved} lead başarıyla eklendi!`, count: saved, stats });

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
