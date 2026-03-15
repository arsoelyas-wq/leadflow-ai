export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
}

function calcScore(lead: any): number {
  let score = 30;
  if (lead.phone) score += 25;
  if (lead.website || lead.instagram || lead.linkedin) score += 15;
  if (lead.email) score += 20;
  if (lead.city) score += 5;
  if (lead.name && lead.name.length > 3) score += 5;
  return Math.min(score, 100);
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

// ── DUPLICATE KONTROLÜ ────────────────────────────────────
async function isAlreadyFound(userId: string, identifier: string): Promise<boolean> {
  if (!identifier) return false;
  const { data } = await supabase
    .from('competitor_leads')
    .select('id')
    .eq('user_id', userId)
    .eq('identifier', identifier)
    .limit(1);
  return (data?.length || 0) > 0;
}

async function markAsFound(userId: string, competitorId: string, identifiers: string[]) {
  const records = identifiers
    .filter(i => i && i.length > 0)
    .map(identifier => ({ user_id: userId, competitor_id: competitorId, identifier }));
  if (records.length > 0) {
    await supabase.from('competitor_leads').upsert(records, { onConflict: 'user_id,identifier', ignoreDuplicates: true });
  }
}

// ── GOOGLE MAPS ───────────────────────────────────────────
async function scrapeGoogleMaps(query: string, maxResults: number): Promise<any[]> {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus',
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'tr', maxResultCount: Math.min(20, maxResults) }),
    });
    if (!response.ok) return [];
    const data: any = await response.json();
    return (data.places || [])
      .filter((p: any) => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map((p: any) => ({
        name: p.displayName?.text || '',
        phone: cleanPhone(p.nationalPhoneNumber || p.internationalPhoneNumber || ''),
        website: p.websiteUri || null,
        address: p.formattedAddress || null,
        rating: p.rating || null,
        reviewCount: p.userRatingCount || 0,
        type: 'business',
        source_channel: 'Google Maps',
      }));
  } catch (e: any) {
    console.error('Google Maps error:', e.message);
    return [];
  }
}

// ── GOOGLE SEARCH ─────────────────────────────────────────
async function scrapeGoogleSearch(query: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=tr`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('div.g').each((_: any, el: any) => {
      const title = $(el).find('h3').first().text().trim();
      const url = $(el).find('a').first().attr('href') || '';
      const snippet = $(el).find('.VwiC3b').first().text().trim();
      if (title && url.startsWith('http') && !url.includes('google.com')) {
        results.push({ title, url, snippet });
      }
    });
    return results.slice(0, 8);
  } catch (e: any) {
    console.error('Google Search error:', e.message);
    return [];
  }
}

// ── ŞİKAYETVAR ────────────────────────────────────────────
async function scrapeŞikayetVar(competitorName: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://www.sikayetvar.com/search?q=${encodeURIComponent(competitorName)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(response.data);
    const complaints: string[] = [];
    $('.complaint-title, .sb-card__title, h3.title').each((_: any, el: any) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) complaints.push(text);
    });
    const countText = $('.complaint-count, .total-complaint').first().text().trim();
    const countMatch = countText.match(/[\d.]+/);
    return {
      complaintCount: countMatch ? parseInt(countMatch[0].replace('.', '')) : 0,
      complaints: complaints.slice(0, 10),
      source: 'Şikayetvar',
    };
  } catch (e: any) {
    console.error('Şikayetvar error:', e.message);
    return null;
  }
}

// ── TRUSTPILOT ────────────────────────────────────────────
async function scrapeTrustpilot(competitorName: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://www.trustpilot.com/search?query=${encodeURIComponent(competitorName)}`,
      { headers: { ...HEADERS, 'Accept-Language': 'en-US,en;q=0.9' }, timeout: 10000 }
    );
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('[data-business-unit-id], .businessUnitCard').each((_: any, el: any) => {
      const name = $(el).find('h3, .title').first().text().trim();
      const ratingLabel = $(el).find('[data-rating-typography], .star-rating').first().attr('aria-label') || '';
      const reviewText = $(el).find('.reviews-count').first().text().trim();
      if (name) {
        results.push({
          name,
          rating: ratingLabel.match(/[\d.]+/)?.[0] || null,
          reviewCount: reviewText.match(/[\d,]+/)?.[0] || '0',
          source: 'Trustpilot',
        });
      }
    });
    return results[0] || null;
  } catch (e: any) {
    console.error('Trustpilot error:', e.message);
    return null;
  }
}

// ── LİNKEDİN ─────────────────────────────────────────────
async function scrapeLinkedIn(query: string): Promise<any[]> {
  try {
    const results = await scrapeGoogleSearch(`${query} site:linkedin.com/in OR site:linkedin.com/company`);
    return results
      .filter(r => r.url.includes('linkedin.com'))
      .map(r => ({
        name: r.title.replace('| LinkedIn', '').replace('- LinkedIn', '').trim(),
        website: r.url,
        notes: r.snippet,
        type: r.url.includes('/in/') ? 'person' : 'business',
        source_channel: 'LinkedIn',
        linkedin: r.url,
      }));
  } catch (e: any) {
    console.error('LinkedIn error:', e.message);
    return [];
  }
}

// ── FACEBOOK ──────────────────────────────────────────────
async function scrapeFacebook(query: string): Promise<any[]> {
  try {
    const results = await scrapeGoogleSearch(`${query} site:facebook.com`);
    return results
      .filter(r => r.url.includes('facebook.com') && !r.url.includes('/posts/'))
      .map(r => ({
        name: r.title.replace('| Facebook', '').replace('- Facebook', '').trim(),
        website: r.url,
        notes: r.snippet,
        type: 'business',
        source_channel: 'Facebook',
      }));
  } catch (e: any) {
    console.error('Facebook error:', e.message);
    return [];
  }
}

// ── İNSTAGRAM ─────────────────────────────────────────────
async function scrapeInstagram(keyword: string): Promise<any[]> {
  try {
    const results = await scrapeGoogleSearch(`${keyword} firma OR şirket OR işletme site:instagram.com`);
    return results
      .filter(r => r.url.includes('instagram.com'))
      .map(r => {
        const username = r.url.match(/instagram\.com\/([^/?]+)/)?.[1] || '';
        return {
          name: r.title.replace('• Instagram', '').replace('(@', '').replace(')', '').trim(),
          instagram: `https://instagram.com/${username}`,
          website: `https://instagram.com/${username}`,
          notes: r.snippet,
          type: 'person_or_business',
          source_channel: 'Instagram',
        };
      });
  } catch (e: any) {
    console.error('Instagram error:', e.message);
    return [];
  }
}

// ── ULUSLARARASI ──────────────────────────────────────────
async function scrapeInternational(query: string): Promise<any[]> {
  const results: any[] = [];
  try {
    const [kompass, europages] = await Promise.allSettled([
      scrapeGoogleSearch(`${query} site:kompass.com`),
      scrapeGoogleSearch(`${query} site:europages.com`),
    ]);
    if (kompass.status === 'fulfilled') {
      results.push(...kompass.value.filter((r: any) => r.url.includes('kompass.com')).map((r: any) => ({
        name: r.title, website: r.url, notes: r.snippet, type: 'business', source_channel: 'Kompass B2B',
      })));
    }
    if (europages.status === 'fulfilled') {
      results.push(...europages.value.filter((r: any) => r.url.includes('europages')).map((r: any) => ({
        name: r.title, website: r.url, notes: r.snippet, type: 'business', source_channel: 'Europages',
      })));
    }
  } catch (e: any) {
    console.error('International error:', e.message);
  }
  return results;
}

// ── ANA TARAMA FONKSİYONU ─────────────────────────────────
async function runCompetitorScan(
  userId: string,
  competitorId: string,
  competitorName: string,
  city: string,
  sector: string,
  channels: string[],
  maxResults: number
): Promise<{ saved: number; skipped: number; leads: any[] }> {

  const allRaw: any[] = [];
  const query = `${sector || competitorName} ${city} müşterileri`;

  // Paralel tarama
  const tasks: Promise<any[]>[] = [];
  if (channels.includes('google')) tasks.push(scrapeGoogleMaps(`${sector || competitorName} ${city} Türkiye`, Math.ceil(maxResults / 2)));
  if (channels.includes('linkedin')) tasks.push(scrapeLinkedIn(`${competitorName} ${city} müşteri`));
  if (channels.includes('facebook')) tasks.push(scrapeFacebook(`${competitorName} ${city}`));
  if (channels.includes('instagram')) tasks.push(scrapeInstagram(`${sector || competitorName} ${city}`));
  if (channels.includes('international')) tasks.push(scrapeInternational(`${sector || competitorName}`));

  const results = await Promise.allSettled(tasks);
  results.forEach(r => {
    if (r.status === 'fulfilled') allRaw.push(...r.value);
  });

  // Tekrar önleme — hem DB'de hem bu batch'te
  const batchSeen = new Set<string>();
  const unique: any[] = [];

  for (const lead of allRaw) {
    const identifier = lead.phone || lead.instagram || lead.linkedin || lead.website || lead.name;
    if (!identifier) continue;
    if (batchSeen.has(identifier)) continue;
    batchSeen.add(identifier);

    // DB'de var mı?
    const exists = await isAlreadyFound(userId, identifier);
    if (!exists) unique.push(lead);
  }

  const limited = unique.slice(0, maxResults);
  if (!limited.length) return { saved: 0, skipped: allRaw.length - unique.length, leads: [] };

  // Leads tablosuna kaydet
  const toInsert = limited.map(lead => ({
    user_id: userId,
    company_name: lead.name || 'Bilinmiyor',
    phone: lead.phone || null,
    email: lead.email || null,
    website: lead.website || lead.instagram || lead.linkedin || null,
    city,
    sector: sector || competitorName,
    source: `Rakip: ${competitorName} (${lead.source_channel})`,
    status: 'new',
    score: calcScore(lead),
    notes: lead.notes || lead.address || null,
    contact_name: lead.type === 'person' ? lead.name : null,
  }));

  const { data: saved, error } = await supabase.from('leads').insert(toInsert).select();
  if (error) throw error;

  // Duplicate kayıt — bir daha çekmeyelim
  const identifiers = limited.map(l => l.phone || l.instagram || l.linkedin || l.website || l.name).filter(Boolean);
  await markAsFound(userId, competitorId, identifiers);

  // Competitor stats güncelle
  await supabase.from('competitors')
    .update({
      last_scanned_at: new Date().toISOString(),
      total_leads_found: supabase.rpc('increment', { x: saved.length }),
    })
    .eq('id', competitorId);

  return { saved: saved.length, skipped: allRaw.length - unique.length, leads: saved };
}

// ── ROUTES ────────────────────────────────────────────────

// Rakip listesi getir
router.get('/list', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ competitors: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Rakip ekle
router.post('/list', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, city, sector, channels, auto_scan } = req.body;
    if (!name) return res.status(400).json({ error: 'name zorunlu' });

    const { data, error } = await supabase
      .from('competitors')
      .insert([{
        user_id: userId,
        name,
        city: city || '',
        sector: sector || '',
        channels: channels || ['google', 'linkedin'],
        auto_scan: auto_scan !== false,
      }])
      .select()
      .single();
    if (error) throw error;
    res.json({ competitor: data, message: 'Rakip eklendi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Rakip sil
router.delete('/list/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('competitors').delete().eq('id', req.params.id).eq('user_id', userId);
    res.json({ message: 'Rakip silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Manuel tarama başlat
router.post('/scan/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: competitor } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (!competitor) return res.status(404).json({ error: 'Rakip bulunamadı' });

    const { data: userData } = await supabase
      .from('users')
      .select('credits_total, credits_used')
      .eq('id', userId)
      .single();

    const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
    if (available < 5) return res.status(400).json({ error: 'Yetersiz kredi' });

    const maxResults = Math.min(req.body.maxResults || 20, available);

    // Arka planda çalıştır
    runCompetitorScan(
      userId, competitor.id, competitor.name,
      competitor.city, competitor.sector,
      competitor.channels, maxResults
    ).then(async result => {
      // Kredi düş
      await supabase.from('users')
        .update({ credits_used: (userData?.credits_used || 0) + result.saved })
        .eq('id', userId);
      console.log(`Scan done for ${competitor.name}: ${result.saved} saved, ${result.skipped} skipped`);
    }).catch(console.error);

    res.json({ message: `${competitor.name} taranıyor...`, competitor });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Tüm rakipleri tara (günlük cron için)
router.post('/scan-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: competitors } = await supabase
      .from('competitors')
      .select('*')
      .eq('user_id', userId)
      .eq('auto_scan', true);

    if (!competitors?.length) return res.json({ message: 'Taranacak rakip yok' });

    let totalSaved = 0;
    for (const comp of competitors) {
      try {
        const { data: userData } = await supabase
          .from('users').select('credits_total, credits_used').eq('id', userId).single();
        const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
        if (available < 5) break;

        const result = await runCompetitorScan(userId, comp.id, comp.name, comp.city, comp.sector, comp.channels, 10);
        totalSaved += result.saved;

        await supabase.from('users')
          .update({ credits_used: (userData?.credits_used || 0) + result.saved })
          .eq('id', userId);

        await sleep(2000);
      } catch (e: any) {
        console.error(`Scan failed for ${comp.name}:`, e.message);
      }
    }

    res.json({ message: `${competitors.length} rakip tarandı, ${totalSaved} yeni lead bulundu` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Hızlı hijack (rakip listesine eklemeden)
router.post('/hijack', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { competitorName, city, targetSector, maxResults = 20, channels = ['google', 'linkedin'] } = req.body;

    if (!competitorName || !city) return res.status(400).json({ error: 'competitorName ve city zorunlu' });

    const { data: userData } = await supabase
      .from('users').select('credits_total, credits_used').eq('id', userId).single();
    const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
    if (available < 5) return res.status(400).json({ error: `Yetersiz kredi. Mevcut: ${available}` });

    // Geçici competitor ID
    const tempId = `temp-${userId}-${Date.now()}`;

    const result = await runCompetitorScan(userId, tempId, competitorName, city, targetSector || '', channels, Math.min(maxResults, available));

    await supabase.from('users')
      .update({ credits_used: (userData?.credits_used || 0) + result.saved })
      .eq('id', userId);

    res.json({
      message: `${result.saved} yeni lead bulundu! (${result.skipped} tekrar atlandı)`,
      count: result.saved,
      skipped: result.skipped,
      competitor: competitorName,
      leads: result.leads,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Rakip analizi
router.post('/analyze', async (req: any, res: any) => {
  try {
    const { competitorName, city } = req.body;
    if (!competitorName) return res.status(400).json({ error: 'competitorName zorunlu' });

    const [googleResults, sikayetvarData, trustpilotData, linkedinData] = await Promise.allSettled([
      scrapeGoogleMaps(`${competitorName} ${city || ''}`, 3),
      scrapeŞikayetVar(competitorName),
      scrapeTrustpilot(competitorName),
      scrapeLinkedIn(`${competitorName} ${city || ''}`),
    ]);

    const googlePlace = googleResults.status === 'fulfilled' ? googleResults.value[0] : null;
    const complaints = sikayetvarData.status === 'fulfilled' ? sikayetvarData.value : null;
    const trustpilot = trustpilotData.status === 'fulfilled' ? trustpilotData.value : null;
    const linkedin = linkedinData.status === 'fulfilled' ? linkedinData.value[0] : null;

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const analysis = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `"${competitorName}" rakip analizi:
Google Maps: ${googlePlace ? `${googlePlace.name}, Rating: ${googlePlace.rating}/5, ${googlePlace.reviewCount} yorum` : 'Bulunamadı'}
Şikayetvar: ${complaints ? `${complaints.complaintCount} şikayet` : 'Veri yok'}
Trustpilot: ${trustpilot ? `Rating: ${trustpilot.rating}` : 'Veri yok'}
LinkedIn: ${linkedin ? linkedin.name : 'Veri yok'}

SADECE JSON döndür:
{
  "weaknesses": ["zayıflık 1", "zayıflık 2"],
  "opportunities": ["fırsat 1", "fırsat 2"],
  "customerComplaints": ["şikayet 1"],
  "targetCustomerProfile": "hedef müşteri profili",
  "suggestedWhatsApp": "WhatsApp mesaj taslağı (max 200 karakter)",
  "suggestedEmail": "email konu satırı",
  "competitorStrength": "güçlü yönleri"
}`,
      }],
    });

    const rawText = analysis.content[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    res.json({
      found: !!(googlePlace || complaints),
      competitor: { name: googlePlace?.name || competitorName, ...googlePlace },
      channels: { googleMaps: googlePlace, sikayetvar: complaints, trustpilot, linkedin },
      analysis: jsonMatch ? JSON.parse(jsonMatch[0]) : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Rakip kaynaklı leadleri getir
router.get('/leads', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('leads').select('*').eq('user_id', userId)
      .ilike('source', 'Rakip:%')
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const grouped: Record<string, any[]> = {};
    (data || []).forEach((lead: any) => {
      const competitor = lead.source?.replace('Rakip: ', '').split(' (')[0] || 'Diğer';
      if (!grouped[competitor]) grouped[competitor] = [];
      grouped[competitor].push(lead);
    });
    res.json({ total: data?.length || 0, grouped, leads: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── OTOMATİK GÜNLÜK TARAMA ────────────────────────────────
async function dailyScanAllUsers() {
  console.log('Daily competitor scan started...');
  try {
    const { data: allCompetitors } = await supabase
      .from('competitors')
      .select('*, users!inner(credits_total, credits_used)')
      .eq('auto_scan', true);

    for (const comp of (allCompetitors || [])) {
      try {
        const available = (comp.users?.credits_total || 0) - (comp.users?.credits_used || 0);
        if (available < 5) continue;

        const result = await runCompetitorScan(
          comp.user_id, comp.id, comp.name, comp.city, comp.sector, comp.channels, 10
        );

        await supabase.from('users')
          .update({ credits_used: (comp.users?.credits_used || 0) + result.saved })
          .eq('id', comp.user_id);

        console.log(`Daily scan: ${comp.name} → ${result.saved} new leads`);
        await sleep(3000);
      } catch (e: any) {
        console.error(`Daily scan failed for ${comp.name}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('Daily scan error:', e.message);
  }
}

// Her gece 02:00'de çalıştır
const now = new Date();
const nextRun = new Date();
nextRun.setHours(2, 0, 0, 0);
if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
const msUntilNextRun = nextRun.getTime() - now.getTime();

setTimeout(() => {
  dailyScanAllUsers();
  setInterval(dailyScanAllUsers, 24 * 60 * 60 * 1000);
}, msUntilNextRun);

console.log(`Daily competitor scan scheduled for ${nextRun.toLocaleString('tr-TR')}`);

module.exports = router;