export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ── GOOGLE MAPS — Places API ──────────────────────────────
async function scrapeGoogleMaps(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const query = `${keyword} in ${city}`;
    const resp = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      { textQuery: query, maxResultCount: Math.min(limit, 20), languageCode: 'tr' },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.businessStatus',
        },
        timeout: 15000,
      }
    );

    for (const place of resp.data?.places || []) {
      if (place.businessStatus === 'OPERATIONAL' || !place.businessStatus) {
        results.push({
          company_name: place.displayName?.text || '',
          phone: place.nationalPhoneNumber?.replace(/\s/g, '') || null,
          address: place.formattedAddress || null,
          website: place.websiteUri || null,
          city,
          sector: keyword,
          source: 'google_maps',
          status: 'new',
        });
      }
    }
  } catch (e: any) {
    console.error('Google Maps error:', e.message);
  }
  return results.slice(0, limit);
}

// ── INSTAGRAM — Meta Graph API ────────────────────────────
async function scrapeInstagram(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    // Instagram Basic Display API veya Graph API ile iş hesabı ara
    // Meta WA token'ı kullan
    const META_TOKEN = process.env.META_WA_TOKEN;
    if (!META_TOKEN) throw new Error('META_WA_TOKEN eksik');

    // Instagram hashtag araması
    const hashtagQuery = keyword.replace(/\s/g, '').toLowerCase();
    const resp = await axios.get(
      `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${process.env.META_WA_BUSINESS_ID}&q=${hashtagQuery}&access_token=${META_TOKEN}`,
      { timeout: 10000 }
    );

    const hashtagId = resp.data?.data?.[0]?.id;
    if (!hashtagId) throw new Error('Hashtag bulunamadı');

    const mediaResp = await axios.get(
      `https://graph.facebook.com/v18.0/${hashtagId}/top_media?fields=id,caption,username,media_type,permalink&access_token=${META_TOKEN}&limit=${limit}`,
      { timeout: 10000 }
    );

    for (const media of mediaResp.data?.data || []) {
      if (media.username) {
        const phoneMatch = (media.caption || '').match(/(0[35]\d{9}|0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/);
        const emailMatch = (media.caption || '').match(/[\w.-]+@[\w.-]+\.\w+/);

        if (!results.find(r => r.instagram_username === media.username)) {
          results.push({
            company_name: media.username,
            instagram_username: media.username,
            instagram_url: `https://instagram.com/${media.username}`,
            phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
            email: emailMatch?.[0] || null,
            city,
            sector: keyword,
            source: 'instagram',
            status: 'new',
          });
        }
      }
    }
  } catch (e: any) {
    console.error('Instagram API error:', e.message);
    // Fallback: Puppeteer ile çek
    results.push(...await scrapeInstagramPuppeteer(keyword, city, limit));
  }
  return results.slice(0, limit);
}

// Instagram Puppeteer fallback
async function scrapeInstagramPuppeteer(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
      headless: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const searchUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(keyword.replace(/\s/g,''))}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);

    const usernames = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/"]'));
      return links
        .map((a: any) => a.href?.match(/instagram\.com\/([\w.]+)\//)?.[1])
        .filter((u: any) => u && !['explore','p','reel','stories','accounts','about','legal','help'].includes(u))
        .filter((u: any, i: any, arr: any) => arr.indexOf(u) === i)
        .slice(0, 10);
    });

    for (const username of usernames) {
      results.push({
        company_name: username,
        instagram_username: username,
        instagram_url: `https://instagram.com/${username}`,
        phone: null,
        city, sector: keyword, source: 'instagram', status: 'new',
      });
    }

    await browser.close();
  } catch (e: any) {
    console.error('Instagram Puppeteer error:', e.message);
  }
  return results;
}

// ── FACEBOOK — Graph API ──────────────────────────────────
async function scrapeFacebook(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const META_TOKEN = process.env.META_WA_TOKEN;
    if (!META_TOKEN) throw new Error('META_WA_TOKEN eksik');

    // Facebook Pages Search
    const resp = await axios.get(
      `https://graph.facebook.com/v18.0/pages/search?q=${encodeURIComponent(keyword + ' ' + city)}&fields=id,name,phone,website,location,category&access_token=${META_TOKEN}&limit=${limit}`,
      { timeout: 10000 }
    );

    for (const page of resp.data?.data || []) {
      results.push({
        company_name: page.name,
        phone: page.phone?.replace(/\s/g,'') || null,
        website: page.website || null,
        facebook_url: `https://facebook.com/${page.id}`,
        city: page.location?.city || city,
        sector: keyword,
        source: 'facebook',
        status: 'new',
      });
    }
  } catch (e: any) {
    console.error('Facebook API error:', e.message);
  }
  return results.slice(0, limit);
}

// ── TIKTOK — Puppeteer ile ────────────────────────────────
async function scrapeTikTok(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
      headless: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const searchUrl = `https://www.tiktok.com/search/user?q=${encodeURIComponent(keyword + ' ' + city)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3000);

    const accounts = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-e2e="search-user-item"], .tiktok-1f2kn0i-DivUserItem'));
      return items.slice(0, 10).map((item: any) => ({
        username: item.querySelector('[data-e2e="user-unique-id"], .tiktok-1b5kp1h-SpanUniqueId')?.textContent?.trim() || '',
        nickname: item.querySelector('[data-e2e="user-nickname"], .tiktok-5e2vqk-SpanNickName')?.textContent?.trim() || '',
        bio: item.querySelector('[data-e2e="user-bio"], .tiktok-wb6ij-SpanBioText')?.textContent?.trim() || '',
      }));
    });

    for (const acc of accounts) {
      if (!acc.username) continue;
      const phoneMatch = acc.bio?.match(/(0[35]\d{9}|0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/);
      const emailMatch = acc.bio?.match(/[\w.-]+@[\w.-]+\.\w+/);

      results.push({
        company_name: acc.nickname || acc.username,
        tiktok_username: acc.username,
        tiktok_url: `https://tiktok.com/@${acc.username}`,
        phone: phoneMatch?.[0]?.replace(/\s/g,'') || null,
        email: emailMatch?.[0] || null,
        city, sector: keyword, source: 'tiktok', status: 'new',
      });
    }

    await browser.close();
  } catch (e: any) {
    console.error('TikTok error:', e.message);
  }
  return results.slice(0, limit);
}

// ── DB KAYDET ─────────────────────────────────────────────
async function saveLeads(userId: string, leads: any[]): Promise<{added: number, duplicate: number}> {
  let added = 0, duplicate = 0;
  for (const lead of leads) {
    try {
      if (!lead.company_name) continue;
      let query = supabase.from('leads').select('id').eq('user_id', userId);
      if (lead.phone) query = query.eq('phone', lead.phone);
      else if (lead.instagram_url) query = query.eq('instagram_url', lead.instagram_url);
      else if (lead.facebook_url) query = query.eq('facebook_url', lead.facebook_url);
      else query = query.eq('company_name', lead.company_name).eq('city', lead.city || '');

      const { data: existing } = await query.maybeSingle();
      if (existing) { duplicate++; continue; }

      await supabase.from('leads').insert([{ user_id: userId, ...lead }]);
      added++;
    } catch {}
  }
  return { added, duplicate };
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/sources/scrape
router.post('/scrape', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { source, keyword, city, limit = 20 } = req.body;
    if (!keyword || !source) return res.status(400).json({ error: 'source ve keyword zorunlu' });

    console.log(`Scraping ${source}: ${keyword} / ${city}`);
    let leads: any[] = [];

    switch (source) {
      case 'google_maps': leads = await scrapeGoogleMaps(keyword, city || 'Istanbul', limit); break;
      case 'instagram': leads = await scrapeInstagram(keyword, city || 'Istanbul', limit); break;
      case 'facebook': leads = await scrapeFacebook(keyword, city || 'Istanbul', limit); break;
      case 'tiktok': leads = await scrapeTikTok(keyword, city || 'Istanbul', limit); break;
      default: return res.status(400).json({ error: 'Geçersiz kaynak. google_maps, instagram, facebook, tiktok' });
    }

    console.log(`Found ${leads.length} leads for ${source}/${keyword}`);
    const { added, duplicate } = await saveLeads(userId, leads);
    res.json({ found: leads.length, added, duplicate, message: `${added} yeni lead eklendi (${source})` });
  } catch (e: any) {
    console.error('Scrape error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sources/scrape-batch
router.post('/scrape-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { sources, keywords, cities, limitPerCombination = 10 } = req.body;
    if (!keywords?.length) return res.status(400).json({ error: 'keywords zorunlu' });

    const srcList = sources || ['google_maps'];
    const cityList = cities || ['Istanbul'];
    const total = srcList.length * keywords.length * cityList.length;

    res.json({ message: `${total} kombinasyon taranıyor arka planda...`, total });

    (async () => {
      let totalAdded = 0;
      for (const keyword of keywords) {
        for (const source of srcList) {
          for (const city of cityList) {
            try {
              let leads: any[] = [];
              switch (source) {
                case 'google_maps': leads = await scrapeGoogleMaps(keyword, city, limitPerCombination); break;
                case 'instagram': leads = await scrapeInstagram(keyword, city, limitPerCombination); break;
                case 'facebook': leads = await scrapeFacebook(keyword, city, limitPerCombination); break;
                case 'tiktok': leads = await scrapeTikTok(keyword, city, limitPerCombination); break;
              }
              const { added } = await saveLeads(userId, leads);
              totalAdded += added;
              console.log(`Batch: ${source}/${keyword}/${city} => ${added} added`);
              await sleep(2000);
            } catch (e: any) {
              console.error(`Batch error ${source}/${keyword}/${city}:`, e.message);
            }
          }
        }
      }
      console.log(`Batch done: ${totalAdded} total leads`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sources/referral
router.post('/referral', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { referrerLeadId, companyName, contactName, phone, email, sector } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    let referrerName = 'Referans';
    if (referrerLeadId) {
      const { data: referrer } = await supabase.from('leads').select('company_name,contact_name').eq('id', referrerLeadId).single();
      referrerName = referrer?.contact_name || referrer?.company_name || 'Referans';
    }

    if (phone) {
      const { data: existing } = await supabase.from('leads').select('id').eq('user_id', userId).eq('phone', phone).maybeSingle();
      if (existing) return res.status(400).json({ error: 'Bu telefon zaten kayıtlı' });
    }

    const { data: newLead } = await supabase.from('leads').insert([{
      user_id: userId, company_name: companyName,
      contact_name: contactName || null, phone: phone || null,
      email: email || null, sector: sector || null,
      source: 'referral', referrer: referrerName,
      status: 'new', notes: `${referrerName} tarafından önerildi`,
    }]).select().single();

    res.json({ lead: newLead, message: `Referans lead eklendi! (${referrerName} tarafından)` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sources/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads').select('source').eq('user_id', req.userId);
    const stats: Record<string, number> = {};
    (data || []).forEach((d: any) => { stats[d.source || 'manual'] = (stats[d.source || 'manual'] || 0) + 1; });
    res.json({ stats, total: data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;