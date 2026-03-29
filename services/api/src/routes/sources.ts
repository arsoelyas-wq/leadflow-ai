export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Ã¢â€â‚¬Ã¢â€â‚¬ GOOGLE MAPS Ã¢â‚¬â€ Places API Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function formatPhone(raw: string | null): string | null {
  if (!raw) return null;
  let phone = raw.replace(/\s/g, '').replace(/\+90/, '0').replace(/[^0-9]/g, '');
  if (phone.startsWith('90') && phone.length === 12) phone = '0' + phone.slice(2);
  if (!phone.startsWith('0')) phone = '0' + phone;
  if (phone.length < 10 || phone.length > 11) return null;
  return phone;
}

async function scrapeGoogleMaps(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const query = `${keyword} ${city}`;

    // 1. Text Search Ã¢â‚¬â€ tÃƒÂ¼m alanlarÃ„Â± iste
    const resp = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: query,
        maxResultCount: Math.min(limit, 20),
        languageCode: 'tr',
        regionCode: 'TR',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.businessStatus',
        },
        timeout: 15000,
      }
    );

    const places = resp.data?.places || [];

    for (const place of places) {
      if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') continue;

      const name = place.displayName?.text;
      if (!name || name.length < 2) continue;

      let phone = formatPhone(place.nationalPhoneNumber) || formatPhone(place.internationalPhoneNumber);

      // 2. Telefon yoksa Place Details API ile dene
      if (!phone && place.id) {
        try {
          const detailResp = await axios.get(
            `https://places.googleapis.com/v1/${place.id}`,
            {
              headers: {
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': 'nationalPhoneNumber,internationalPhoneNumber,websiteUri',
              },
              timeout: 8000,
            }
          );
          phone = formatPhone(detailResp.data?.nationalPhoneNumber) ||
                  formatPhone(detailResp.data?.internationalPhoneNumber);
        } catch {}
        await sleep(200);
      }

      results.push({
        company_name: name,
        phone: phone || null,
        address: place.formattedAddress || null,
        website: place.websiteUri || null,
        city,
        sector: keyword,
        source: 'google_maps',
        status: 'new',
      });
    }

    console.log(`Google Maps: ${results.length} found, ${results.filter(r => r.phone).length} with phone`);
  } catch (e: any) {
    console.error('Google Maps error:', e.message);
  }
  return results.slice(0, limit);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ INSTAGRAM Ã¢â‚¬â€ Meta Graph API Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function scrapeInstagram(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const META_TOKEN = process.env.META_PAGE_TOKEN || process.env.META_WA_TOKEN;
    const IG_ACCOUNT_ID = process.env.META_INSTAGRAM_ACCOUNT_ID;

    if (!META_TOKEN || !IG_ACCOUNT_ID) throw new Error('META_PAGE_TOKEN veya META_INSTAGRAM_ACCOUNT_ID eksik');

    // 1. Hashtag ID al
    const hashtagQuery = keyword.replace(/\s/g, '').toLowerCase();
    const hashResp = await axios.get(
      `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${IG_ACCOUNT_ID}&q=${encodeURIComponent(hashtagQuery)}&access_token=${META_TOKEN}`,
      { timeout: 10000 }
    );

    const hashtagId = hashResp.data?.data?.[0]?.id;
    if (!hashtagId) throw new Error('Hashtag ID bulunamadi');

    // 2. Top media al
    const mediaResp = await axios.get(
      `https://graph.facebook.com/v18.0/${hashtagId}/top_media?fields=id,caption,username,permalink,media_type&user_id=${IG_ACCOUNT_ID}&access_token=${META_TOKEN}&limit=${Math.min(limit, 50)}`,
      { timeout: 10000 }
    );

    for (const media of mediaResp.data?.data || []) {
      if (!media.username) continue;

      const caption = media.caption || '';
      const phoneMatch = caption.match(/(0[35]\d{9}|0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/);
      const emailMatch = caption.match(/[\w.-]+@[\w.-]+\.\w+/);

      if (!results.find(r => r.instagram_username === media.username)) {
        results.push({
          company_name: media.username,
          instagram_username: media.username,
          instagram_url: media.permalink || `https://instagram.com/${media.username}`,
          phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
          email: emailMatch?.[0] || null,
          city,
          sector: keyword,
          source: 'instagram',
          status: 'new',
        });
      }
    }

    // 3. Recent media de al
    if (results.length < limit) {
      const recentResp = await axios.get(
        `https://graph.facebook.com/v18.0/${hashtagId}/recent_media?fields=id,caption,username,permalink&user_id=${IG_ACCOUNT_ID}&access_token=${META_TOKEN}&limit=${limit}`,
        { timeout: 10000 }
      );

      for (const media of recentResp.data?.data || []) {
        if (!media.username || results.find(r => r.instagram_username === media.username)) continue;
        const caption = media.caption || '';
        const phoneMatch = caption.match(/(0[35]\d{9}|0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/);
        const emailMatch = caption.match(/[\w.-]+@[\w.-]+\.\w+/);

        results.push({
          company_name: media.username,
          instagram_username: media.username,
          instagram_url: media.permalink || `https://instagram.com/${media.username}`,
          phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
          email: emailMatch?.[0] || null,
          city, sector: keyword, source: 'instagram', status: 'new',
        });

        if (results.length >= limit) break;
      }
    }

    console.log(`Instagram: ${results.length} accounts found for #${hashtagQuery}`);
  } catch (e: any) {
    console.error('Instagram API error:', e.message);
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

// Ã¢â€â‚¬Ã¢â€â‚¬ FACEBOOK Ã¢â‚¬â€ Graph API Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function scrapeFacebook(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const META_TOKEN = process.env.META_PAGE_TOKEN || process.env.META_WA_TOKEN;
    const PAGE_ID = process.env.META_PAGE_ID || process.env.META_WA_BUSINESS_ID;

    if (!META_TOKEN) throw new Error('META_PAGE_TOKEN eksik');

    // 1. Sayfa yorumlarÃ„Â±ndan lead cek
    try {
      const feedResp = await axios.get(
        `https://graph.facebook.com/v18.0/${PAGE_ID}/feed?fields=message,from,created_time&access_token=${META_TOKEN}&limit=${limit}`,
        { timeout: 10000 }
      );

      for (const post of feedResp.data?.data || []) {
        if (!post.from?.name) continue;
        const text = post.message || '';
        const phoneMatch = text.match(/(0[35]\d{9}|0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/);
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);

        if (phoneMatch || emailMatch) {
          results.push({
            company_name: post.from.name,
            phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
            email: emailMatch?.[0] || null,
            facebook_url: `https://facebook.com/${post.from.id}`,
            city, sector: keyword, source: 'facebook', status: 'new',
          });
        }
      }
    } catch {}

    // 2. Lead Ads formlarÃ„Â±ndan lead cek
    try {
      const leadsResp = await axios.get(
        `https://graph.facebook.com/v18.0/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count&access_token=${META_TOKEN}&limit=10`,
        { timeout: 10000 }
      );

      for (const form of leadsResp.data?.data || []) {
        const leadDataResp = await axios.get(
          `https://graph.facebook.com/v18.0/${form.id}/leads?fields=field_data,created_time&access_token=${META_TOKEN}&limit=${limit}`,
          { timeout: 10000 }
        );

        for (const lead of leadDataResp.data?.data || []) {
          const fields: any = {};
          (lead.field_data || []).forEach((f: any) => { fields[f.name] = f.values?.[0]; });

          results.push({
            company_name: fields['company_name'] || fields['full_name'] || 'Facebook Lead',
            contact_name: fields['full_name'] || null,
            phone: fields['phone_number']?.replace(/\s/g, '') || null,
            email: fields['email'] || null,
            city, sector: keyword, source: 'facebook', status: 'new',
          });
        }
      }
    } catch {}

    console.log(`Facebook: ${results.length} leads found for ${keyword}/${city}`);
  } catch (e: any) {
    console.error('Facebook API error:', e.message);
  }
  return results.slice(0, limit);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ TIKTOK Ã¢â‚¬â€ Herkese aÃƒÂ§Ã„Â±k arama sayfasÃ„Â± Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function scrapeTikTok(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  let browser: any = null;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox','--disable-setuid-sandbox',
        '--disable-dev-shm-usage','--disable-gpu',
        '--window-size=1280,800',
      ],
      headless: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
    await page.setViewport({ width: 390, height: 844 });

    // 1. KullanÃ„Â±cÃ„Â± aramasÃ„Â±
    const searchUrl = `https://www.tiktok.com/search/user?q=${encodeURIComponent(keyword + ' ' + city)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2500);

    // TÃƒÂ¼m metin iÃƒÂ§eriÃ„Å¸ini al
    const pageText = await page.evaluate(() => document.body.innerText);
    const pageHtml = await page.content();

    // Username'leri ÃƒÂ§ek
    const usernameMatches = pageHtml.match(/"uniqueId":"([\w.]+)"/g) || [];
    const nicknameMatches = pageHtml.match(/"nickname":"([^"]+)"/g) || [];
    const bioMatches = pageHtml.match(/"signature":"([^"]+)"/g) || [];

    const seen = new Set();
    for (let i = 0; i < Math.min(usernameMatches.length, limit); i++) {
      const username = usernameMatches[i]?.replace(/"uniqueId":"/, '').replace(/"/, '');
      const nickname = nicknameMatches[i]?.replace(/"nickname":"/, '').replace(/"/, '') || username;
      const bio = bioMatches[i]?.replace(/"signature":"/, '').replace(/"/, '') || '';

      if (!username || seen.has(username)) continue;
      seen.add(username);

      const phoneMatch = bio.match(/(0[35]\d{9}|0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/);
      const emailMatch = bio.match(/[\w.-]+@[\w.-]+\.\w+/);

      results.push({
        company_name: nickname,
        tiktok_username: username,
        tiktok_url: `https://tiktok.com/@${username}`,
        phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
        email: emailMatch?.[0] || null,
        city, sector: keyword, source: 'tiktok', status: 'new',
      });
    }

    // 2. Hashtag aramasÃ„Â± Ã¢â‚¬â€ daha fazla sonuÃƒÂ§
    if (results.length < limit) {
      const hashUrl = `https://www.tiktok.com/tag/${encodeURIComponent(keyword.replace(/\s/g, ''))}`;
      await page.goto(hashUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(2000);

      const hashHtml = await page.content();
      const hashUsernames = hashHtml.match(/"uniqueId":"([\w.]+)"/g) || [];

      for (const match of hashUsernames.slice(0, limit - results.length)) {
        const username = match.replace(/"uniqueId":"/, '').replace(/"/, '');
        if (!username || seen.has(username)) continue;
        seen.add(username);
        results.push({
          company_name: username,
          tiktok_username: username,
          tiktok_url: `https://tiktok.com/@${username}`,
          phone: null, email: null,
          city, sector: keyword, source: 'tiktok', status: 'new',
        });
      }
    }

    await browser.close();
    console.log(`TikTok found: ${results.length} for ${keyword}/${city}`);
  } catch (e: any) {
    if (browser) await browser.close().catch(() => {});
    console.error('TikTok error:', e.message);
  }
  return results.slice(0, limit);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ DB KAYDET Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function saveLeads(userId: string, leads: any[]): Promise<{added: number, duplicate: number}> {
  let added = 0, duplicate = 0;
  for (const lead of leads) {
    try {
      if (!lead.company_name) continue;
      if (!lead.phone && !lead.email && lead.source !== 'instagram') continue; // Instagram hariç telefon zorunlu
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

// Ã¢â€â‚¬Ã¢â€â‚¬ ROUTES Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
      default: return res.status(400).json({ error: 'GeÃƒÂ§ersiz kaynak. google_maps, instagram, facebook, tiktok' });
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

    res.json({ message: `${total} kombinasyon taranÃ„Â±yor arka planda...`, total });

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
      if (existing) return res.status(400).json({ error: 'Bu telefon zaten kayÃ„Â±tlÃ„Â±' });
    }

    const { data: newLead } = await supabase.from('leads').insert([{
      user_id: userId, company_name: companyName,
      contact_name: contactName || null, phone: phone || null,
      email: email || null, sector: sector || null,
      source: 'referral', referrer: referrerName,
      status: 'new', notes: `${referrerName} tarafÃ„Â±ndan ÃƒÂ¶nerildi`,
    }]).select().single();

    res.json({ lead: newLead, message: `Referans lead eklendi! (${referrerName} tarafÃ„Â±ndan)` });
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