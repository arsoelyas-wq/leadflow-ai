export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ── TÜRKİYE İLLERİ ──────────────────────────────────────
const TURKEY_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya',
  'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Kayseri',
  'Eskişehir', 'Diyarbakır', 'Samsun', 'Denizli', 'Şanlıurfa',
  'Adapazarı', 'Malatya', 'Kahramanmaraş', 'Erzurum', 'Van',
  'Batman', 'Elazığ', 'Trabzon', 'Gebze', 'Sivas',
  'Manisa', 'Balıkesir', 'Kocaeli', 'Tekirdağ', 'Hatay',
];

// ── SEKTÖRLER ────────────────────────────────────────────
const SECTORS = [
  // İmalat & Sanayi
  'dekorasyon', 'mobilya', 'inşaat', 'tekstil', 'gıda üretimi',
  'plastik imalat', 'metal işleme', 'ambalaj', 'kimya',
  // Ticaret
  'toptan gıda', 'toptan tekstil', 'ihracat', 'ithalat',
  'otomotiv yedek parça', 'elektrik malzeme',
  // Hizmet
  'yazılım', 'muhasebe', 'hukuk bürosu', 'reklam ajansı',
  'mühendislik', 'temizlik hizmetleri', 'güvenlik hizmetleri',
  // Perakende
  'restoran', 'kafe', 'market', 'eczane', 'optik',
  // Sağlık
  'klinik', 'diş hekimi', 'fizik tedavi',
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function calcScore(place: any): number {
  let score = 30;
  if (place.nationalPhoneNumber || place.internationalPhoneNumber) score += 30;
  if (place.websiteUri) score += 20;
  if (place.rating >= 4.0) score += 10;
  if (place.userRatingCount > 20) score += 10;
  return Math.min(score, 100);
}

function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
}

// ── GOOGLE PLACES ARAMA ──────────────────────────────────
async function searchGooglePlaces(keyword: string, city: string, maxResults = 20): Promise<any[]> {
  if (!GOOGLE_API_KEY) return [];
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
    if (nextPageToken) body.pageToken = nextPageToken;

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': [
            'places.id', 'places.displayName', 'places.formattedAddress',
            'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
            'places.websiteUri', 'places.rating', 'places.userRatingCount',
            'places.businessStatus', 'nextPageToken',
          ].join(','),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) break;
      const data: any = await response.json();

      for (const place of (data.places || [])) {
        if (place.businessStatus === 'CLOSED_PERMANENTLY') continue;
        results.push({
          company_name: place.displayName?.text || '',
          phone: cleanPhone(place.nationalPhoneNumber || place.internationalPhoneNumber || ''),
          website: place.websiteUri || null,
          address: place.formattedAddress || null,
          rating: place.rating || null,
          review_count: place.userRatingCount || 0,
          confidence_score: calcScore(place),
        });
        if (results.length >= maxResults) break;
      }

      nextPageToken = data.nextPageToken || null;
      if (nextPageToken && results.length < maxResults) await sleep(2000);
    } catch { break; }

  } while (nextPageToken && results.length < maxResults && attempts < 5);

  return results;
}

// ── WEB SİTESİNDEN İLETİŞİM ÇEK ────────────────────────
async function scrapeWebsiteContacts(website: string): Promise<{ email?: string; ownerName?: string; ownerPhone?: string }> {
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const pages = [url, `${url}/iletisim`, `${url}/contact`, `${url}/hakkimizda`, `${url}/about`];

    for (const page of pages.slice(0, 3)) {
      try {
        const res = await axios.get(page, {
          timeout: 6000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
        });
        const $ = cheerio.load(res.data);
        const text = $('body').text();

        // Email bul
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const validEmail = emails.find((e: string) => {
          const domain = e.split('@')[1];
          return !e.includes('example') && !e.includes('placeholder') &&
            (website.includes(domain?.split('.')[0]) || domain?.endsWith('.com.tr') || domain?.endsWith('.net.tr'));
        });

        // Telefon bul
        const phones = text.match(/(?:\+90|0)?(?:\s?\(?\d{3}\)?\s?\d{3}\s?\d{2}\s?\d{2})/g) || [];
        const validPhone = phones[0]?.replace(/\s/g, '');

        // İsim bul (schema.org veya meta)
        let ownerName = '';
        $('[itemtype*="Person"], .team-member, .yonetim, .management').each((_: any, el: any) => {
          const name = $(el).find('[itemprop="name"], .name, h3, h4').first().text().trim();
          if (name && name.length > 3 && name.length < 50) ownerName = name;
        });

        if (validEmail || validPhone || ownerName) {
          return { email: validEmail, ownerName: ownerName || undefined, ownerPhone: validPhone };
        }
      } catch { continue; }
    }
  } catch { }
  return {};
}

// ── GOOGLE'DAN KİŞİ ARA ────────────────────────────────
async function findOwnerViaGoogle(companyName: string, city: string): Promise<{ ownerName?: string; ownerTitle?: string; ownerLinkedin?: string }> {
  try {
    const queries = [
      `"${companyName}" "genel müdür" OR "CEO" OR "kurucu" OR "sahip" ${city}`,
      `"${companyName}" site:linkedin.com/in CEO OR "Genel Müdür"`,
    ];

    for (const q of queries) {
      const res = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(q)}&num=5&hl=tr`, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
      });
      const $ = cheerio.load(res.data);
      let found = { ownerName: '', ownerTitle: '', ownerLinkedin: '' };

      $('div.g').each((_: any, el: any) => {
        const snippet = $(el).find('.VwiC3b').text();
        const url = $(el).find('a').first().attr('href') || '';

        // LinkedIn profil linki
        if (url.includes('linkedin.com/in/') && !found.ownerLinkedin) {
          found.ownerLinkedin = url.split('?')[0];
          const titleMatch = ['CEO', 'Genel Müdür', 'Kurucu', 'Sahip', 'Direktör', 'Müdür'].find(t =>
            snippet.toLowerCase().includes(t.toLowerCase())
          );
          if (titleMatch) found.ownerTitle = titleMatch;
        }

        // İsim pattern
        const nameMatch = snippet.match(/([A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)/);
        if (nameMatch && !found.ownerName) found.ownerName = nameMatch[1];
      });

      if (found.ownerName || found.ownerLinkedin) return found;
      await sleep(500);
    }
  } catch { }
  return {};
}

// ── TEK ŞİRKET ENRİCH ────────────────────────────────────
async function enrichCompany(company: any): Promise<any> {
  const enriched = { ...company };

  // Website'den iletişim çek
  if (company.website) {
    const webContacts = await scrapeWebsiteContacts(company.website);
    if (webContacts.email) enriched.email = webContacts.email;
    if (webContacts.ownerName) enriched.owner_name = webContacts.ownerName;
    if (webContacts.ownerPhone) enriched.owner_phone = webContacts.ownerPhone;
  }

  // Google'dan sahip bul
  if (!enriched.owner_name && company.company_name) {
    const googleOwner = await findOwnerViaGoogle(company.company_name, company.city || '');
    if (googleOwner.ownerName) enriched.owner_name = googleOwner.ownerName;
    if (googleOwner.ownerTitle) enriched.owner_title = googleOwner.ownerTitle;
    if (googleOwner.ownerLinkedin) enriched.owner_linkedin = googleOwner.ownerLinkedin;
  }

  enriched.enriched = true;
  enriched.enriched_at = new Date().toISOString();
  enriched.confidence_score = Math.min(
    (enriched.confidence_score || 30) +
    (enriched.email ? 15 : 0) +
    (enriched.owner_name ? 20 : 0) +
    (enriched.owner_phone ? 15 : 0) +
    (enriched.owner_linkedin ? 10 : 0),
    100
  );

  return enriched;
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/data-collector/collect — Belirli keyword+city tara
router.post('/collect', async (req: any, res: any) => {
  try {
    const { keyword, city, maxResults = 20, enrich = false } = req.body;
    if (!keyword || !city) return res.status(400).json({ error: 'keyword ve city zorunlu' });

    // Job kaydı
    await supabase.from('collection_jobs').upsert([{
      keyword, city, status: 'running', started_at: new Date().toISOString()
    }], { onConflict: 'keyword,city' });

    const places = await searchGooglePlaces(keyword, city, maxResults);

    let saved = 0, skipped = 0;
    const results = [];

    for (const place of places) {
      if (!place.company_name) continue;

      let data: any = { ...place, city, sector: keyword, source: 'google_maps', sources: ['google_maps'] };

      // Enrich istenirse
      if (enrich && (place.website || place.phone)) {
        data = await enrichCompany(data);
        await sleep(500);
      }

      const { error } = await supabase.from('company_database').upsert([data], {
        onConflict: 'company_name,phone',
        ignoreDuplicates: true,
      });

      if (error) { skipped++; continue; }
      saved++;
      results.push(data.company_name);
    }

    // Job tamamla
    await supabase.from('collection_jobs').update({
      status: 'completed', results_count: saved, completed_at: new Date().toISOString()
    }).eq('keyword', keyword).eq('city', city);

    res.json({ message: `${saved} şirket kaydedildi`, saved, skipped, keyword, city });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/data-collector/bulk — Çoklu keyword+city kombinasyonu
router.post('/bulk', async (req: any, res: any) => {
  try {
    const { cities = TURKEY_CITIES.slice(0, 5), sectors = SECTORS.slice(0, 5), maxPerJob = 20 } = req.body;

    const jobs = [];
    for (const city of cities) {
      for (const sector of sectors) {
        // Daha önce tarandı mı?
        const { data: existing } = await supabase.from('collection_jobs')
          .select('status').eq('keyword', sector).eq('city', city).single();
        if (existing?.status === 'completed') continue;
        jobs.push({ keyword: sector, city });
      }
    }

    res.json({ message: `${jobs.length} iş kuyruğa alındı`, jobs: jobs.length, preview: jobs.slice(0, 5) });

    // Arka planda çalıştır
    (async () => {
      for (const job of jobs) {
        try {
          const places = await searchGooglePlaces(job.keyword, job.city, maxPerJob);
          let saved = 0;

          for (const place of places) {
            if (!place.company_name) continue;
            await supabase.from('company_database').upsert([{
              ...place, city: job.city, sector: job.keyword,
              source: 'google_maps', sources: ['google_maps'],
            }], { onConflict: 'company_name,phone', ignoreDuplicates: true });
            saved++;
          }

          await supabase.from('collection_jobs').upsert([{
            keyword: job.keyword, city: job.city,
            status: 'completed', results_count: saved,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          }], { onConflict: 'keyword,city' });

          console.log(`✓ ${job.keyword} / ${job.city}: ${saved} şirket`);
          await sleep(1500); // Rate limit
        } catch (e: any) {
          console.error(`✗ ${job.keyword} / ${job.city}:`, e.message);
          await supabase.from('collection_jobs').upsert([{
            keyword: job.keyword, city: job.city, status: 'error', error: e.message,
          }], { onConflict: 'keyword,city' });
        }
      }
      console.log('Bulk collection done!');
    })();

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/data-collector/enrich-batch — Enrichment olmayan şirketleri zenginleştir
router.post('/enrich-batch', async (req: any, res: any) => {
  try {
    const { limit = 20 } = req.body;

    const { data: companies, error } = await supabase
      .from('company_database')
      .select('*')
      .eq('enriched', false)
      .not('website', 'is', null)
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!companies?.length) return res.json({ message: 'Enrich edilecek şirket yok', updated: 0 });

    res.json({ message: `${companies.length} şirket enrich ediliyor...`, total: companies.length });

    (async () => {
      let updated = 0;
      for (const company of companies) {
        try {
          const enriched = await enrichCompany(company);
          await supabase.from('company_database').update(enriched).eq('id', company.id);
          updated++;
          await sleep(800);
        } catch (e: any) {
          console.error(`Enrich error ${company.company_name}:`, e.message);
        }
      }
      console.log(`Enrich done: ${updated}/${companies.length}`);
    })();

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/data-collector/search — Veritabanında ara
router.get('/search', async (req: any, res: any) => {
  try {
    const { q, city, sector, hasOwner, hasEmail, hasPhone, limit = 20, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('company_database')
      .select('*', { count: 'exact' })
      .order('confidence_score', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (q) query = query.ilike('company_name', `%${q}%`);
    if (city) query = query.eq('city', city);
    if (sector) query = query.eq('sector', sector);
    if (hasOwner === 'true') query = query.not('owner_name', 'is', null);
    if (hasEmail === 'true') query = query.not('email', 'is', null);
    if (hasPhone === 'true') query = query.not('phone', 'is', null);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ companies: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/data-collector/stats — İstatistikler
router.get('/stats', async (req: any, res: any) => {
  try {
    const [total, enriched, withOwner, withEmail, withPhone, jobs] = await Promise.all([
      supabase.from('company_database').select('id', { count: 'exact', head: true }),
      supabase.from('company_database').select('id', { count: 'exact', head: true }).eq('enriched', true),
      supabase.from('company_database').select('id', { count: 'exact', head: true }).not('owner_name', 'is', null),
      supabase.from('company_database').select('id', { count: 'exact', head: true }).not('email', 'is', null),
      supabase.from('company_database').select('id', { count: 'exact', head: true }).not('phone', 'is', null),
      supabase.from('collection_jobs').select('status, results_count').order('created_at', { ascending: false }).limit(50),
    ]);

    const completedJobs = jobs.data?.filter((j: any) => j.status === 'completed').length || 0;
    const totalCollected = jobs.data?.reduce((s: number, j: any) => s + (j.results_count || 0), 0) || 0;

    res.json({
      totalCompanies: total.count || 0,
      enrichedCompanies: enriched.count || 0,
      withOwner: withOwner.count || 0,
      withEmail: withEmail.count || 0,
      withPhone: withPhone.count || 0,
      completedJobs,
      totalCollected,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/data-collector/jobs — Job listesi
router.get('/jobs', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('collection_jobs')
      .select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json({ jobs: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Cron için export
async function runNightlyCollection() {
  console.log('🌙 Gece otomatik veri toplama başladı...');
  const cities = TURKEY_CITIES.slice(0, 10);
  const sectors = SECTORS.slice(0, 8);
  let total = 0;

  for (const city of cities) {
    for (const sector of sectors) {
      const { data: existing } = await supabase.from('collection_jobs')
        .select('status').eq('keyword', sector).eq('city', city).single();
      if (existing?.status === 'completed') continue;

      try {
        const places = await searchGooglePlaces(sector, city, 20);
        let saved = 0;
        for (const place of places) {
          if (!place.company_name) continue;
          await supabase.from('company_database').upsert([{
            ...place, city, sector, source: 'google_maps', sources: ['google_maps'],
          }], { onConflict: 'company_name,phone', ignoreDuplicates: true });
          saved++;
        }
        await supabase.from('collection_jobs').upsert([{
          keyword: sector, city, status: 'completed',
          results_count: saved, completed_at: new Date().toISOString(),
        }], { onConflict: 'keyword,city' });
        total += saved;
        await sleep(1200);
      } catch (e: any) {
        console.error(`Nightly error ${sector}/${city}:`, e.message);
      }
    }
  }
  console.log(`🌙 Gece toplama bitti: ${total} şirket`);
}

module.exports = router;
module.exports.runNightlyCollection = runNightlyCollection;
module.exports.TURKEY_CITIES = TURKEY_CITIES;
module.exports.SECTORS = SECTORS;