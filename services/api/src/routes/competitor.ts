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

function calcScore(place: any): number {
  let score = 40;
  if (place.phone) score += 25;
  if (place.website) score += 15;
  if (place.rating >= 4.0) score += 10;
  if (place.reviewCount > 20) score += 10;
  return Math.min(score, 100);
}

// ── HEADERS ───────────────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

// ── GOOGLE MAPS ───────────────────────────────────────────
async function scrapeGoogleMaps(query: string, maxResults: number): Promise<any[]> {
  try {
    const results: any[] = [];
    const body: any = {
      textQuery: query,
      languageCode: 'tr',
      maxResultCount: Math.min(20, maxResults),
    };
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return [];
    const data: any = await response.json();
    for (const place of (data.places || [])) {
      if (place.businessStatus === 'CLOSED_PERMANENTLY') continue;
      results.push({
        name: place.displayName?.text || '',
        phone: cleanPhone(place.nationalPhoneNumber || place.internationalPhoneNumber || ''),
        website: place.websiteUri || null,
        address: place.formattedAddress || null,
        rating: place.rating || null,
        reviewCount: place.userRatingCount || 0,
        source: 'Google Maps',
      });
    }
    return results;
  } catch (e: any) {
    console.error('Google Maps error:', e.message);
    return [];
  }
}

// ── ŞİKAYETVAR ────────────────────────────────────────────
async function scrapeŞikayetVar(competitorName: string): Promise<any[]> {
  try {
    const results: any[] = [];
    const searchUrl = `https://www.sikayetvar.com/search?q=${encodeURIComponent(competitorName)}`;

    const response = await axios.get(searchUrl, {
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Şikayetleri çek
    const complaints: string[] = [];
    $('.complaint-title, .sb-card__title, h3.title').each((_: any, el: any) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) complaints.push(text);
    });

    // Şirket bilgisi
    const companyInfo = {
      name: competitorName,
      complaintCount: 0,
      rating: null as any,
      complaints: complaints.slice(0, 10),
      source: 'Şikayetvar',
    };

    // Şikayet sayısı
    const countText = $('.complaint-count, .total-complaint').first().text().trim();
    if (countText) {
      const match = countText.match(/[\d.]+/);
      if (match) companyInfo.complaintCount = parseInt(match[0].replace('.', ''));
    }

    if (complaints.length > 0) results.push(companyInfo);
    return results;
  } catch (e: any) {
    console.error('Şikayetvar error:', e.message);
    return [];
  }
}

// ── TRUSTPILOT (Uluslararası) ─────────────────────────────
async function scrapeTrustpilot(competitorName: string): Promise<any> {
  try {
    const searchUrl = `https://www.trustpilot.com/search?query=${encodeURIComponent(competitorName)}`;
    const response = await axios.get(searchUrl, {
      headers: { ...HEADERS, 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results: any[] = [];

    // Sonuçları parse et
    $('[data-business-unit-id], .businessUnitCard').each((_: any, el: any) => {
      const name = $(el).find('h3, .title, [data-company-name]').first().text().trim();
      const rating = $(el).find('[data-rating-typography], .star-rating').first().attr('aria-label') || '';
      const reviewCount = $(el).find('.reviews-count, [data-reviews-count]').first().text().trim();
      const website = $(el).find('a').first().attr('href') || '';

      if (name) {
        results.push({
          name,
          rating: rating.match(/[\d.]+/)?.[0] || null,
          reviewCount: reviewCount.match(/[\d,]+/)?.[0] || '0',
          trustpilotUrl: website.startsWith('http') ? website : `https://www.trustpilot.com${website}`,
          source: 'Trustpilot',
        });
      }
    });

    return results.slice(0, 5);
  } catch (e: any) {
    console.error('Trustpilot error:', e.message);
    return [];
  }
}

// ── GOOGLE SEARCH (Genel web araması) ─────────────────────
async function scrapeGoogleSearch(query: string): Promise<any[]> {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=tr`;
    const response = await axios.get(searchUrl, {
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results: any[] = [];

    // Organik sonuçları çek
    $('div.g, div[data-sokoban-container]').each((_: any, el: any) => {
      const title = $(el).find('h3').first().text().trim();
      const url = $(el).find('a').first().attr('href') || '';
      const snippet = $(el).find('.VwiC3b, .lyLwlc, span[data-ved]').first().text().trim();

      if (title && url.startsWith('http') && !url.includes('google.com')) {
        results.push({ title, url, snippet, source: 'Google Search' });
      }
    });

    return results.slice(0, 8);
  } catch (e: any) {
    console.error('Google Search error:', e.message);
    return [];
  }
}

// ── INSTAGRAM (Hashtag arama) ─────────────────────────────
async function scrapeInstagram(keyword: string): Promise<any[]> {
  try {
    // Instagram'ın public API'si ile hashtag arama
    const tag = keyword.toLowerCase().replace(/\s+/g, '');
    const url = `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/?__a=1&__d=dis`;

    const response = await axios.get(url, {
      headers: {
        ...HEADERS,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 8000,
    });

    const data = response.data;
    const posts = data?.data?.recent?.sections?.[0]?.layout_content?.medias || [];

    const results: any[] = [];
    for (const post of posts.slice(0, 10)) {
      const user = post?.media?.user;
      if (user) {
        results.push({
          name: user.full_name || user.username,
          username: user.username,
          instagram: `https://instagram.com/${user.username}`,
          followers: user.follower_count,
          source: 'Instagram',
        });
      }
    }

    return results;
  } catch (e: any) {
    console.error('Instagram error:', e.message);
    return [];
  }
}

// ── LINKEDIN (Firma arama) ────────────────────────────────
async function scrapeLinkedIn(competitorName: string, city: string): Promise<any[]> {
  try {
    const query = `${competitorName} ${city} site:linkedin.com/company`;
    const results = await scrapeGoogleSearch(query);

    return results
      .filter(r => r.url.includes('linkedin.com/company'))
      .map(r => ({
        name: r.title.replace('| LinkedIn', '').replace('- LinkedIn', '').trim(),
        linkedinUrl: r.url,
        description: r.snippet,
        source: 'LinkedIn',
      }))
      .slice(0, 5);
  } catch (e: any) {
    console.error('LinkedIn error:', e.message);
    return [];
  }
}

// ── FACEBOOK (Sayfa arama) ────────────────────────────────
async function scrapeFacebook(competitorName: string, city: string): Promise<any[]> {
  try {
    const query = `${competitorName} ${city} site:facebook.com`;
    const results = await scrapeGoogleSearch(query);

    return results
      .filter(r => r.url.includes('facebook.com') && !r.url.includes('facebook.com/posts'))
      .map(r => ({
        name: r.title.replace('| Facebook', '').replace('- Facebook', '').trim(),
        facebookUrl: r.url,
        description: r.snippet,
        source: 'Facebook',
      }))
      .slice(0, 5);
  } catch (e: any) {
    console.error('Facebook error:', e.message);
    return [];
  }
}

// ── SEKTÖRE GÖRE ULUSLARARASI SİTELER ────────────────────
async function scrapeInternational(competitorName: string, sector: string): Promise<any[]> {
  const results: any[] = [];

  try {
    // B2B için Kompass
    const kompassQuery = `${competitorName} ${sector} site:kompass.com`;
    const kompassResults = await scrapeGoogleSearch(kompassQuery);
    results.push(...kompassResults.filter(r => r.url.includes('kompass.com')).map(r => ({ ...r, source: 'Kompass B2B' })));

    await sleep(500);

    // Europages
    const europagesQuery = `${competitorName} ${sector} site:europages.com`;
    const europagesResults = await scrapeGoogleSearch(europagesQuery);
    results.push(...europagesResults.filter(r => r.url.includes('europages')).map(r => ({ ...r, source: 'Europages' })));

  } catch (e: any) {
    console.error('International scrape error:', e.message);
  }

  return results;
}

// ── ANA ROUTES ────────────────────────────────────────────

// POST /api/competitor/hijack — Çok kanallı lead toplama
router.post('/hijack', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { competitorName, city, targetSector, maxResults = 30, channels = ['google', 'sikayetvar', 'linkedin'] } = req.body;

    if (!competitorName || !city) {
      return res.status(400).json({ error: 'competitorName ve city zorunlu' });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('credits_total, credits_used')
      .eq('id', userId)
      .single();

    const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
    if (available < 10) {
      return res.status(400).json({ error: `Yetersiz kredi. Mevcut: ${available}` });
    }

    console.log(`Multi-channel competitor hijack: "${competitorName}" in ${city}`);

    const allLeads: any[] = [];
    const channelStats: Record<string, number> = {};

    // Google Maps
    if (channels.includes('google')) {
      const query = targetSector
        ? `${targetSector} ${city} Türkiye`
        : `${competitorName} müşterileri ${city} Türkiye`;
      const places = await scrapeGoogleMaps(query, Math.ceil(maxResults / 2));
      channelStats['Google Maps'] = places.length;
      allLeads.push(...places);
      await sleep(1000);
    }

    // Instagram
    if (channels.includes('instagram') && targetSector) {
      const igResults = await scrapeInstagram(targetSector);
      channelStats['Instagram'] = igResults.length;
      allLeads.push(...igResults.map(r => ({
        name: r.name,
        phone: null,
        website: r.instagram,
        source_channel: 'Instagram',
        instagram: r.instagram,
      })));
      await sleep(800);
    }

    // LinkedIn
    if (channels.includes('linkedin')) {
      const liResults = await scrapeLinkedIn(competitorName, city);
      channelStats['LinkedIn'] = liResults.length;
      allLeads.push(...liResults.map(r => ({
        name: r.name,
        phone: null,
        website: r.linkedinUrl,
        source_channel: 'LinkedIn',
        notes: r.description,
      })));
      await sleep(800);
    }

    // Facebook
    if (channels.includes('facebook')) {
      const fbResults = await scrapeFacebook(competitorName, city);
      channelStats['Facebook'] = fbResults.length;
      allLeads.push(...fbResults.map(r => ({
        name: r.name,
        phone: null,
        website: r.facebookUrl,
        source_channel: 'Facebook',
        notes: r.description,
      })));
      await sleep(800);
    }

    // Uluslararası
    if (channels.includes('international') && targetSector) {
      const intlResults = await scrapeInternational(competitorName, targetSector);
      channelStats['Uluslararası'] = intlResults.length;
      allLeads.push(...intlResults.map(r => ({
        name: r.title,
        phone: null,
        website: r.url,
        source_channel: r.source,
        notes: r.snippet,
      })));
    }

    // Tekrarları kaldır
    const seen = new Set<string>();
    const unique = allLeads.filter(l => {
      const key = l.phone || l.website || l.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const limited = unique.slice(0, maxResults);

    if (!limited.length) {
      return res.json({ message: 'Sonuç bulunamadı', count: 0, leads: [], channelStats });
    }

    // Leads tablosuna kaydet
    const leadsToInsert = limited.map(lead => ({
      user_id: userId,
      company_name: lead.name || 'Bilinmiyor',
      phone: lead.phone || null,
      website: lead.website || null,
      city,
      sector: targetSector || competitorName,
      source: `Rakip: ${competitorName} (${lead.source_channel || lead.source || 'Multi-channel'})`,
      status: 'new',
      score: calcScore(lead),
      notes: lead.notes || lead.address || null,
    }));

    const { data: saved, error } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select();

    if (error) throw error;

    await supabase
      .from('users')
      .update({ credits_used: (userData?.credits_used || 0) + saved.length })
      .eq('id', userId);

    res.json({
      message: `${saved.length} potansiyel müşteri bulundu!`,
      count: saved.length,
      competitor: competitorName,
      city,
      channelStats,
      leads: saved,
    });

  } catch (e: any) {
    console.error('Competitor hijack error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/competitor/analyze — Çok kanallı rakip analizi
router.post('/analyze', async (req: any, res: any) => {
  try {
    const { competitorName, city } = req.body;
    if (!competitorName) return res.status(400).json({ error: 'competitorName zorunlu' });

    console.log(`Analyzing competitor: ${competitorName}`);

    // Paralel analiz
    const [googleResults, sikayetvarData, trustpilotData, linkedinData] = await Promise.allSettled([
      scrapeGoogleMaps(`${competitorName} ${city || ''}`, 3),
      scrapeŞikayetVar(competitorName),
      scrapeTrustpilot(competitorName),
      scrapeLinkedIn(competitorName, city || ''),
    ]);

    const googlePlace = googleResults.status === 'fulfilled' ? googleResults.value[0] : null;
    const complaints = sikayetvarData.status === 'fulfilled' ? sikayetvarData.value[0] : null;
    const trustpilot = trustpilotData.status === 'fulfilled' ? trustpilotData.value[0] : null;
    const linkedin = linkedinData.status === 'fulfilled' ? linkedinData.value[0] : null;

    // AI analizi
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const contextData = {
      googleMaps: googlePlace ? `${googlePlace.name}, Rating: ${googlePlace.rating}/5 (${googlePlace.reviewCount} yorum), Website: ${googlePlace.website}` : 'Bulunamadı',
      sikayetvar: complaints ? `${complaints.complaintCount} şikayet. Örnek: ${complaints.complaints?.slice(0, 3).join(', ')}` : 'Veri yok',
      trustpilot: trustpilot ? `Rating: ${trustpilot.rating}, ${trustpilot.reviewCount} yorum` : 'Veri yok',
      linkedin: linkedin ? `${linkedin.name} - ${linkedin.description}` : 'Veri yok',
    };

    const analysis = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `"${competitorName}" rakip analizi için toplanan veriler:

Google Maps: ${contextData.googleMaps}
Şikayetvar: ${contextData.sikayetvar}
Trustpilot: ${contextData.trustpilot}
LinkedIn: ${contextData.linkedin}

Bu verilere dayanarak B2B satış perspektifinden analiz yap. SADECE JSON döndür:
{
  "overallScore": 65,
  "weaknesses": ["zayıflık 1", "zayıflık 2", "zayıflık 3"],
  "opportunities": ["fırsat 1", "fırsat 2"],
  "customerComplaints": ["şikayet konusu 1", "şikayet konusu 2"],
  "targetCustomerProfile": "bu rakibin hedef müşteri profili",
  "pitchAngle": "bu rakibin müşterilerine nasıl yaklaşmalı",
  "suggestedWhatsApp": "kısa WhatsApp mesaj taslağı (max 200 karakter)",
  "suggestedEmail": "email konu satırı önerisi",
  "competitorStrength": "güçlü yönleri"
}`,
      }],
    });

    const rawText = analysis.content[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.json({
      found: !!(googlePlace || complaints),
      competitor: {
        name: googlePlace?.name || competitorName,
        address: googlePlace?.address,
        rating: googlePlace?.rating,
        reviewCount: googlePlace?.reviewCount,
        website: googlePlace?.website,
      },
      channels: {
        googleMaps: googlePlace,
        sikayetvar: complaints,
        trustpilot,
        linkedin,
      },
      analysis: aiAnalysis,
    });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/competitor/leads
router.get('/leads', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .ilike('source', 'Rakip:%')
      .order('created_at', { ascending: false })
      .limit(100);

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

module.exports = router;