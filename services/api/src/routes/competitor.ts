export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const axios = require('axios');
const { getCountryByCode } = require('../config/countries');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GOOGLE_API_KEY  = process.env.GOOGLE_PLACES_API_KEY;
const APIFY_TOKEN     = process.env.APIFY_TOKEN;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function cleanPhone(p: string): string { return (p || '').replace(/\s/g, '').replace(/[^\d+]/g, ''); }
function calcScore(lead: any): number {
  let s = 30;
  if (lead.phone) s += 25;
  if (lead.website || lead.instagram || lead.linkedin) s += 15;
  if (lead.email) s += 20;
  if (lead.city) s += 5;
  if (lead.name?.length > 3) s += 5;
  return Math.min(s, 100);
}

// Random UA rotation to reduce blocking
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];
const randUA = () => UAS[Math.floor(Math.random() * UAS.length)];

// ── BATCH DEDUPLICATION ───────────────────────────────────────────────────────
async function filterAlreadyFound(userId: string, identifiers: string[]): Promise<Set<string>> {
  if (!identifiers.length) return new Set();
  const { data } = await supabase.from('competitor_leads')
    .select('identifier').eq('user_id', userId).in('identifier', identifiers);
  return new Set((data || []).map((r: any) => r.identifier));
}

async function markAsFound(userId: string, competitorId: string, identifiers: string[]) {
  const records = identifiers.filter(Boolean).map(i => ({ user_id: userId, competitor_id: competitorId, identifier: i }));
  if (records.length) await supabase.from('competitor_leads').upsert(records, { onConflict: 'user_id,identifier', ignoreDuplicates: true });
}

// ── GOOGLE MAPS (Places API v1) ───────────────────────────────────────────────
async function scrapeGoogleMaps(query: string, maxResults: number, langCode = 'tr'): Promise<any[]> {
  if (!GOOGLE_API_KEY) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus',
      },
      body: JSON.stringify({ textQuery: query, languageCode: langCode, maxResultCount: Math.min(20, maxResults) }),
    });
    if (!res.ok) { console.error('Google Maps HTTP', res.status); return []; }
    const data: any = await res.json();
    if (data.error) { console.error('Google Maps API error:', data.error.message); return []; }
    return (data.places || [])
      .filter((p: any) => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map((p: any) => ({
        name: p.displayName?.text || '',
        phone: cleanPhone(p.nationalPhoneNumber || p.internationalPhoneNumber || ''),
        website: p.websiteUri || null,
        address: p.formattedAddress || null,
        rating: p.rating || null,
        reviewCount: p.userRatingCount || 0,
        placeId: p.id || null,
        type: 'business',
        source_channel: 'Google Maps',
      }));
  } catch (e: any) { console.error('Google Maps:', e.message); return []; }
}

// ── GOOGLE PLACE DETAILS (for reviews) ───────────────────────────────────────
async function getPlaceReviews(placeId: string, langCode: string): Promise<any[]> {
  if (!GOOGLE_API_KEY || !placeId) return [];
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'reviews',
        'X-Goog-LanguageCode': langCode,
      }
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return data.reviews || [];
  } catch { return []; }
}

// ── GOOGLE REVIEWS (low-star reviewers = unhappy competitor customers) ────────
async function scrapeGoogleReviews(competitorName: string, city: string, langCode = 'tr'): Promise<any[]> {
  try {
    const places = await scrapeGoogleMaps(`${competitorName} ${city}`, 3, langCode);
    const reviewLeads: any[] = [];
    for (const place of places.slice(0, 2)) {
      if (!place.placeId) continue;
      const reviews = await getPlaceReviews(place.placeId, langCode);
      for (const rev of reviews) {
        if ((rev.rating || 5) <= 2 && rev.text?.text?.length > 10) {
          reviewLeads.push({
            name: rev.authorAttribution?.displayName || 'Google Yorumcu',
            notes: `⭐${rev.rating}/5 @ ${place.name} — "${rev.text.text.slice(0, 120)}"`,
            source_channel: 'Google Yorum',
            type: 'person',
          });
        }
      }
    }
    return reviewLeads;
  } catch { return []; }
}

// ── GOOGLE SEARCH via Apify (reliable, works globally) ───────────────────────
async function searchViaApify(query: string, langCode: string, countryCode: string): Promise<any[]> {
  if (!APIFY_TOKEN) return [];
  try {
    const { ApifyClient } = require('apify-client');
    const client = new ApifyClient({ token: APIFY_TOKEN });
    const run = await Promise.race([
      client.actor('apify/google-search-scraper').call({
        queries: query,
        languageCode: langCode.toLowerCase().slice(0, 2),
        countryCode: countryCode.toUpperCase().slice(0, 2),
        maxPagesPerQuery: 1,
        resultsPerPage: 10,
        customDataFunction: 'async ({ input, $, contentType, request, response }) => { return { organicResults: $(".g").map((i,el) => ({ title: $(el).find("h3").text(), url: $(el).find("a").attr("href"), description: $(el).find("[data-sncf],.VwiC3b").text() })).toArray() }; }',
      }),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('Apify timeout')), 45_000)),
    ]) as any;
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 10 });
    return (items || []).flatMap((item: any) =>
      (item.organicResults || []).slice(0, 8)
        .filter((r: any) => r.url?.startsWith('http') && !r.url?.includes('google.com') && r.title)
        .map((r: any) => ({ title: r.title || '', url: r.url || '', snippet: r.description || '' }))
    );
  } catch (e: any) { console.error('Apify Search:', e.message); return []; }
}

// ── GOOGLE SEARCH via direct scraping (improved selectors, fallback) ──────────
async function searchViaDirect(query: string, langCode: string, googleDomain: string): Promise<any[]> {
  try {
    const url = `https://www.${googleDomain}/search?q=${encodeURIComponent(query)}&num=10&hl=${langCode}&safe=off`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': randUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': `${langCode},en;q=0.7`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': `https://www.${googleDomain}/`,
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      timeout: 12000,
    });
    const $ = cheerio.load(res.data);
    const results: any[] = [];
    const seen = new Set<string>();

    // Strategy 1: <a> elements that contain <h3> (2024+ Google HTML)
    $('a').each((_: any, el: any) => {
      const $el = $(el);
      if (!$el.find('h3').length) return;
      const href = $el.attr('href') || '';
      if (!href.startsWith('http') || href.includes('google.com') || seen.has(href)) return;
      const title = $el.find('h3').first().text().trim();
      if (!title || title.length < 3) return;
      const snippet = $el.closest('div[data-async-type], [jscontroller]').find('[data-sncf], .VwiC3b, span').filter((_: any, s: any) => $(s).text().length > 25).first().text().trim() || '';
      seen.add(href);
      results.push({ title, url: href, snippet });
    });

    // Strategy 2: classic div.g (older Google HTML)
    if (results.length === 0) {
      $('div.g, .tF2Cxc, .MjjYud > div').each((_: any, el: any) => {
        const $el = $(el);
        const title = $el.find('h3').first().text().trim();
        const href = $el.find('a[href^="http"]').first().attr('href') || '';
        const snippet = $el.find('.VwiC3b, [data-sncf]').first().text().trim();
        if (title && href && !href.includes('google.com') && !seen.has(href)) {
          seen.add(href);
          results.push({ title, url: href, snippet });
        }
      });
    }

    // Strategy 3: Extract from cite elements + h3 siblings
    if (results.length === 0) {
      $('cite').each((_: any, el: any) => {
        const $cite = $(el);
        const $parent = $cite.closest('div');
        const h3 = $parent.find('h3').first().text().trim();
        const url = $cite.text().trim();
        if (h3 && url?.includes('.') && !url.includes('google') && !seen.has(url)) {
          seen.add(url);
          results.push({ title: h3, url: `https://${url.replace(/^https?:\/\//, '')}`, snippet: '' });
        }
      });
    }

    return results.slice(0, 8);
  } catch (e: any) {
    console.error(`Direct search (${googleDomain}):`, e.message?.slice(0, 80));
    return [];
  }
}

// ── MASTER GOOGLE SEARCH (Apify primary, direct fallback) ─────────────────────
async function scrapeGoogleSearch(query: string, langCode = 'tr', googleDomain = 'google.com', countryCode = 'TR'): Promise<any[]> {
  // Try Apify first (reliable, globally works)
  if (APIFY_TOKEN) {
    const r = await searchViaApify(query, langCode, countryCode);
    if (r.length > 0) return r;
  }
  // Fallback: direct scraping with improved selectors
  return searchViaDirect(query, langCode, googleDomain);
}

// ── SOCIAL REVIEWS (Facebook & Instagram complaints) ─────────────────────────
async function scrapeSocialReviews(competitorName: string, country: any): Promise<any[]> {
  const { language, queries, googleDomain, code } = country;
  const results: any[] = [];
  try {
    const [fb, ig] = await Promise.allSettled([
      scrapeGoogleSearch(`"${competitorName}" ${queries.complaint} site:facebook.com`, language, googleDomain, code),
      scrapeGoogleSearch(`"${competitorName}" ${queries.complaint} site:instagram.com`, language, googleDomain, code),
    ]);
    if (fb.status === 'fulfilled') fb.value.filter((r: any) => !r.url.includes('/posts/')).forEach((r: any) => results.push({
      name: r.title.replace('| Facebook', '').replace('- Facebook', '').trim(),
      website: r.url, notes: r.snippet, source_channel: 'Facebook Yorum', type: 'business',
    }));
    if (ig.status === 'fulfilled') ig.value.forEach((r: any) => {
      const username = r.url.match(/instagram\.com\/([^/?]+)/)?.[1] || '';
      if (username) results.push({
        name: r.title.replace('• Instagram', '').trim(),
        instagram: `https://instagram.com/${username}`,
        website: `https://instagram.com/${username}`,
        notes: r.snippet, source_channel: 'Instagram Yorum', type: 'person_or_business',
      });
    });
  } catch {}
  return results;
}

// ── LINKEDIN ─────────────────────────────────────────────────────────────────
async function scrapeLinkedIn(query: string, langCode: string, googleDomain: string, countryCode: string): Promise<any[]> {
  try {
    const results = await scrapeGoogleSearch(`${query} site:linkedin.com/in OR site:linkedin.com/company`, langCode, googleDomain, countryCode);
    return results.filter((r: any) => r.url.includes('linkedin.com')).map((r: any) => ({
      name: r.title.replace('| LinkedIn', '').replace('- LinkedIn', '').trim(),
      website: r.url, notes: r.snippet,
      type: r.url.includes('/in/') ? 'person' : 'business',
      source_channel: 'LinkedIn', linkedin: r.url,
    }));
  } catch { return []; }
}

// ── FACEBOOK ─────────────────────────────────────────────────────────────────
async function scrapeFacebook(query: string, langCode: string, googleDomain: string, countryCode: string): Promise<any[]> {
  try {
    const results = await scrapeGoogleSearch(`${query} site:facebook.com`, langCode, googleDomain, countryCode);
    return results.filter((r: any) => r.url.includes('facebook.com') && !r.url.includes('/posts/')).map((r: any) => ({
      name: r.title.replace('| Facebook', '').replace('- Facebook', '').trim(),
      website: r.url, notes: r.snippet, type: 'business', source_channel: 'Facebook',
    }));
  } catch { return []; }
}

// ── INSTAGRAM ────────────────────────────────────────────────────────────────
async function scrapeInstagram(keyword: string, country: any): Promise<any[]> {
  const { language, queries, googleDomain, code } = country;
  try {
    const results = await scrapeGoogleSearch(`${keyword} ${queries.business} site:instagram.com`, language, googleDomain, code);
    return results.filter((r: any) => r.url.includes('instagram.com')).map((r: any) => {
      const username = r.url.match(/instagram\.com\/([^/?]+)/)?.[1] || '';
      return { name: r.title.replace('• Instagram', '').trim(), instagram: `https://instagram.com/${username}`, website: `https://instagram.com/${username}`, notes: r.snippet, type: 'person_or_business', source_channel: 'Instagram' };
    });
  } catch { return []; }
}

// ── LOCAL COMPLAINT SITE ──────────────────────────────────────────────────────
async function scrapeComplaintSite(competitorName: string, site: { id: string; name: string; domain: string }, langCode: string, googleDomain: string, countryCode: string): Promise<any[]> {
  try {
    const results = await scrapeGoogleSearch(`"${competitorName}" site:${site.domain}`, langCode, googleDomain, countryCode);
    return results.filter((r: any) => r.url.includes(site.domain)).map((r: any) => ({
      name: r.title.split('|')[0].split('-')[0].trim(),
      website: r.url, notes: r.snippet, type: 'person',
      source_channel: site.name, isComplaint: true,
    }));
  } catch { return []; }
}

// ── INTERNATIONAL B2B ─────────────────────────────────────────────────────────
async function scrapeInternational(query: string): Promise<any[]> {
  const results: any[] = [];
  const [k, e] = await Promise.allSettled([
    scrapeGoogleSearch(`${query} site:kompass.com`, 'en', 'google.com', 'US'),
    scrapeGoogleSearch(`${query} site:europages.com`, 'en', 'google.com', 'US'),
  ]);
  if (k.status === 'fulfilled') results.push(...k.value.filter((r: any) => r.url.includes('kompass.com')).map((r: any) => ({
    name: r.title, website: r.url, notes: r.snippet, type: 'business', source_channel: 'Kompass B2B',
  })));
  if (e.status === 'fulfilled') results.push(...e.value.filter((r: any) => r.url.includes('europages')).map((r: any) => ({
    name: r.title, website: r.url, notes: r.snippet, type: 'business', source_channel: 'Europages',
  })));
  return results;
}

// ── ŞİKAYETVAR ────────────────────────────────────────────────────────────────
async function scrapeŞikayetVar(competitorName: string): Promise<any> {
  try {
    const res = await axios.get(`https://www.sikayetvar.com/search?q=${encodeURIComponent(competitorName)}`,
      { headers: { 'User-Agent': randUA() }, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const complaints: string[] = [];
    $('.complaint-title, .sb-card__title, h3.title').each((_: any, el: any) => {
      const t = $(el).text().trim();
      if (t?.length > 10) complaints.push(t);
    });
    const countMatch = $('.complaint-count, .total-complaint').first().text().trim().match(/[\d.]+/);
    return { complaintCount: countMatch ? parseInt(countMatch[0].replace('.', '')) : 0, complaints: complaints.slice(0, 10), source: 'Şikayetvar' };
  } catch { return null; }
}

// ── TRUSTPILOT ────────────────────────────────────────────────────────────────
async function scrapeTrustpilot(competitorName: string): Promise<any> {
  try {
    const res = await axios.get(`https://www.trustpilot.com/search?query=${encodeURIComponent(competitorName)}`,
      { headers: { 'User-Agent': randUA(), 'Accept-Language': 'en-US,en;q=0.9' }, timeout: 10000 });
    const $ = cheerio.load(res.data);
    const results: any[] = [];
    $('[data-business-unit-id], .businessUnitCard').each((_: any, el: any) => {
      const name = $(el).find('h3, .title').first().text().trim();
      const rating = $(el).find('[data-rating-typography], .star-rating').first().attr('aria-label')?.match(/[\d.]+/)?.[0] || null;
      if (name) results.push({ name, rating, source: 'Trustpilot' });
    });
    return results[0] || null;
  } catch { return null; }
}

// ── MAIN SCAN ─────────────────────────────────────────────────────────────────
async function runCompetitorScan(
  userId: string, competitorId: string, competitorName: string,
  city: string, sector: string, channels: string[], maxResults: number, countryCode = 'TR'
): Promise<{ saved: number; skipped: number; leads: any[]; channelStats: Record<string, number> }> {

  const country = getCountryByCode(countryCode);
  const { language, queries, name: countryName, localComplaintSites, googleDomain, code } = country;
  const allRaw: any[] = [];
  const channelStats: Record<string, number> = {};

  const keyword = sector || competitorName;
  const tasks: Array<Promise<any[]>> = [];
  const taskLabels: string[] = [];

  if (channels.includes('google')) {
    tasks.push(scrapeGoogleMaps(`${keyword} ${city} ${countryName}`, Math.ceil(maxResults / 2), language));
    taskLabels.push('google');
  }
  if (channels.includes('google_reviews')) {
    tasks.push(scrapeGoogleReviews(competitorName, city, language));
    taskLabels.push('google_reviews');
  }
  if (channels.includes('linkedin')) {
    tasks.push(scrapeLinkedIn(`${competitorName} ${city} ${queries.customers}`, language, googleDomain, code));
    taskLabels.push('linkedin');
  }
  if (channels.includes('facebook')) {
    tasks.push(scrapeFacebook(`${competitorName} ${city}`, language, googleDomain, code));
    taskLabels.push('facebook');
  }
  if (channels.includes('instagram')) {
    tasks.push(scrapeInstagram(`${keyword} ${city}`, country));
    taskLabels.push('instagram');
  }
  if (channels.includes('social_reviews')) {
    tasks.push(scrapeSocialReviews(competitorName, country));
    taskLabels.push('social_reviews');
  }
  if (channels.includes('international')) {
    tasks.push(scrapeInternational(keyword));
    taskLabels.push('international');
  }
  if (channels.includes('complaints')) {
    for (const site of localComplaintSites) {
      tasks.push(scrapeComplaintSite(competitorName, site, language, googleDomain, code));
      taskLabels.push(`complaints_${site.id}`);
    }
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    const label = taskLabels[i] || `task_${i}`;
    if (r.status === 'fulfilled') {
      allRaw.push(...r.value);
      channelStats[label] = r.value.length;
    } else {
      channelStats[label] = 0;
      console.error(`Channel ${label} failed:`, (r as any).reason?.message);
    }
  });

  // Batch dedup
  const batchSeen = new Set<string>();
  const candidateIds: string[] = [];
  const candidateLeads: any[] = [];
  for (const lead of allRaw) {
    const id = lead.phone || lead.instagram || lead.linkedin || lead.website || lead.name;
    if (!id || batchSeen.has(id)) continue;
    batchSeen.add(id);
    candidateIds.push(id);
    candidateLeads.push(lead);
  }

  const alreadyInDB = await filterAlreadyFound(userId, candidateIds);
  const unique = candidateLeads.filter(l => !alreadyInDB.has(l.phone || l.instagram || l.linkedin || l.website || l.name));
  const limited = unique.slice(0, maxResults);

  if (!limited.length) return { saved: 0, skipped: allRaw.length - unique.length, leads: [], channelStats };

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

  const { data: savedData, error } = await supabase.from('leads').insert(toInsert).select();
  if (error) throw error;

  const identifiers = limited.map(l => l.phone || l.instagram || l.linkedin || l.website || l.name).filter(Boolean);
  await markAsFound(userId, competitorId, identifiers);

  // Fix: proper increment (was broken with supabase.rpc)
  const { data: curr } = await supabase.from('competitors').select('total_leads_found').eq('id', competitorId).maybeSingle();
  await supabase.from('competitors').update({
    last_scanned_at: new Date().toISOString(),
    total_leads_found: (curr?.total_leads_found || 0) + (savedData?.length || 0),
  }).eq('id', competitorId);

  return { saved: savedData?.length || 0, skipped: allRaw.length - unique.length, leads: savedData || [], channelStats };
}

// ── DIAGNOSE endpoint — tests every channel, returns status ──────────────────
router.get('/diagnose', async (req: any, res: any) => {
  const name = (req.query.name as string) || 'Dekonil';
  const city = (req.query.city as string) || 'İstanbul';
  const country = getCountryByCode((req.query.country as string) || 'TR');

  const results: Record<string, any> = {
    env: {
      GOOGLE_PLACES_API_KEY: GOOGLE_API_KEY ? '✅ set' : '❌ missing',
      APIFY_TOKEN: APIFY_TOKEN ? '✅ set' : '❌ missing',
    },
  };

  const run = async (label: string, fn: () => Promise<any[]>) => {
    const t = Date.now();
    try {
      const r = await fn();
      results[label] = { status: r.length > 0 ? '✅ working' : '⚠️ 0 results', count: r.length, ms: Date.now() - t };
    } catch (e: any) {
      results[label] = { status: '❌ error', error: e.message?.slice(0, 100), ms: Date.now() - t };
    }
  };

  await run('google_maps', () => scrapeGoogleMaps(`${name} ${city}`, 3, country.language));
  await run('google_reviews', () => scrapeGoogleReviews(name, city, country.language));
  await run('linkedin', () => scrapeLinkedIn(`${name} ${city}`, country.language, country.googleDomain, country.code));
  await run('facebook', () => scrapeFacebook(`${name} ${city}`, country.language, country.googleDomain, country.code));
  await run('instagram', () => scrapeInstagram(`${name} ${city}`, country));
  await run('social_reviews', () => scrapeSocialReviews(name, country));
  await run('international', () => scrapeInternational(name));
  if (country.localComplaintSites?.length) {
    await run(`complaints_${country.localComplaintSites[0].id}`, () =>
      scrapeComplaintSite(name, country.localComplaintSites[0], country.language, country.googleDomain, country.code)
    );
  }

  res.json({ competitor: `${name} @ ${city}`, country: country.name, results });
});

// ── ROUTES ────────────────────────────────────────────────────────────────────

router.get('/list', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('competitors').select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ competitors: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/list', async (req: any, res: any) => {
  try {
    const { name, city, sector, channels, auto_scan, country } = req.body;
    if (!name) return res.status(400).json({ error: 'name zorunlu' });
    const { data, error } = await supabase.from('competitors').insert([{
      user_id: req.userId, name, city: city || '', sector: sector || '',
      channels: channels || ['google', 'linkedin', 'social_reviews'],
      auto_scan: auto_scan !== false, country: country || 'TR',
    }]).select().single();
    if (error) throw error;
    res.json({ competitor: data, message: 'Rakip eklendi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/list/:id', async (req: any, res: any) => {
  try {
    await supabase.from('competitors').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Rakip silindi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/scan/:id', async (req: any, res: any) => {
  try {
    const { data: comp } = await supabase.from('competitors').select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!comp) return res.status(404).json({ error: 'Rakip bulunamadı' });
    const { data: ud } = await supabase.from('users').select('credits_total, credits_used').eq('id', req.userId).single();
    const available = (ud?.credits_total || 0) - (ud?.credits_used || 0);
    if (available < 5) return res.status(400).json({ error: 'Yetersiz kredi' });
    const maxResults = Math.min(req.body.maxResults || 20, available);

    runCompetitorScan(req.userId, comp.id, comp.name, comp.city, comp.sector, comp.channels, maxResults, comp.country || 'TR')
      .then(async result => {
        const { data: fresh } = await supabase.from('users').select('credits_used').eq('id', req.userId).single();
        await supabase.from('users').update({ credits_used: (fresh?.credits_used || 0) + result.saved }).eq('id', req.userId);
        console.log(`Scan ${comp.name}: ${result.saved} saved | channels:`, result.channelStats);
      }).catch(console.error);

    res.json({ message: `${comp.name} taranıyor...`, competitor: comp });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/scan-all', async (req: any, res: any) => {
  try {
    const { data: competitors } = await supabase.from('competitors').select('*').eq('user_id', req.userId).eq('auto_scan', true);
    if (!competitors?.length) return res.json({ message: 'Taranacak rakip yok' });
    let totalSaved = 0;
    for (const comp of competitors) {
      try {
        const { data: ud } = await supabase.from('users').select('credits_total, credits_used').eq('id', req.userId).single();
        const available = (ud?.credits_total || 0) - (ud?.credits_used || 0);
        if (available < 5) break;
        const result = await runCompetitorScan(req.userId, comp.id, comp.name, comp.city, comp.sector, comp.channels, 10, comp.country || 'TR');
        totalSaved += result.saved;
        await supabase.from('users').update({ credits_used: (ud?.credits_used || 0) + result.saved }).eq('id', req.userId);
        await sleep(2000);
      } catch (e: any) { console.error(`Scan failed ${comp.name}:`, e.message); }
    }
    res.json({ message: `${competitors.length} rakip tarandı, ${totalSaved} yeni lead` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/hijack', async (req: any, res: any) => {
  try {
    const { competitorName, city, targetSector, maxResults = 20, channels = ['google', 'linkedin', 'social_reviews'], country = 'TR' } = req.body;
    if (!competitorName || !city) return res.status(400).json({ error: 'competitorName ve city zorunlu' });
    const { data: ud } = await supabase.from('users').select('credits_total, credits_used').eq('id', req.userId).single();
    const available = (ud?.credits_total || 0) - (ud?.credits_used || 0);
    if (available < 5) return res.status(400).json({ error: `Yetersiz kredi. Mevcut: ${available}` });
    const result = await runCompetitorScan(req.userId, `temp-${req.userId}-${Date.now()}`, competitorName, city, targetSector || '', channels, Math.min(maxResults, available), country);
    await supabase.from('users').update({ credits_used: (ud?.credits_used || 0) + result.saved }).eq('id', req.userId);
    res.json({ message: `${result.saved} yeni lead! (${result.skipped} tekrar)`, count: result.saved, skipped: result.skipped, competitor: competitorName, leads: result.leads, channelStats: result.channelStats });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze', async (req: any, res: any) => {
  try {
    const { competitorName, city, country = 'TR' } = req.body;
    if (!competitorName) return res.status(400).json({ error: 'competitorName zorunlu' });
    const countryConf = getCountryByCode(country);
    const { language } = countryConf;

    const [googleRes, sikayetvarRes, trustpilotRes, linkedinRes, socialRes] = await Promise.allSettled([
      scrapeGoogleMaps(`${competitorName} ${city || ''}`, 3, language),
      scrapeŞikayetVar(competitorName),
      scrapeTrustpilot(competitorName),
      scrapeLinkedIn(`${competitorName} ${city || ''}`, language, countryConf.googleDomain, countryConf.code),
      scrapeSocialReviews(competitorName, countryConf),
    ]);

    const googlePlace = googleRes.status === 'fulfilled' ? googleRes.value[0] : null;
    const complaints = sikayetvarRes.status === 'fulfilled' ? sikayetvarRes.value : null;
    const trustpilot = trustpilotRes.status === 'fulfilled' ? trustpilotRes.value : null;
    const linkedin = linkedinRes.status === 'fulfilled' ? linkedinRes.value[0] : null;
    const socialMentions = socialRes.status === 'fulfilled' ? socialRes.value.slice(0, 3) : [];

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const analysis = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: `Rakip analizi: "${competitorName}" — ${city || ''} (${countryConf.name})
Google Maps: ${googlePlace ? `Rating: ${googlePlace.rating}/5, ${googlePlace.reviewCount} yorum` : 'Bulunamadı'}
Şikayetvar: ${complaints ? `${complaints.complaintCount} şikayet` : 'Veri yok'}
Trustpilot: ${trustpilot ? `Rating: ${trustpilot.rating}` : 'Veri yok'}
LinkedIn: ${linkedin ? linkedin.name : 'Veri yok'}
Sosyal medya şikayetleri: ${socialMentions.length} paylaşım

SADECE JSON döndür:
{"weaknesses":["..."],"opportunities":["..."],"customerComplaints":["..."],"targetCustomerProfile":"...","suggestedWhatsApp":"max 200 karakter mesaj","suggestedEmail":"konu satırı","competitorStrength":"...","threatLevel":"low|medium|high"}`
      }],
    });
    const rawText = analysis.content[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    res.json({ found: !!(googlePlace || complaints), competitor: { name: googlePlace?.name || competitorName, ...googlePlace }, channels: { googleMaps: googlePlace, sikayetvar: complaints, trustpilot, linkedin }, socialMentions, analysis: jsonMatch ? JSON.parse(jsonMatch[0]) : null, country: countryConf.name });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/leads', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('leads').select('*').eq('user_id', req.userId).ilike('source', 'Rakip:%').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    const grouped: Record<string, any[]> = {};
    (data || []).forEach((lead: any) => {
      const comp = lead.source?.replace('Rakip: ', '').split(' (')[0] || 'Diğer';
      if (!grouped[comp]) grouped[comp] = [];
      grouped[comp].push(lead);
    });
    res.json({ total: data?.length || 0, grouped, leads: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/countries', (_req: any, res: any) => {
  const { getAllCountries, REGION_LABELS } = require('../config/countries');
  res.json({ countries: getAllCountries(), regionLabels: REGION_LABELS });
});

// ── DAILY AUTO-SCAN ───────────────────────────────────────────────────────────
async function dailyScanAllUsers() {
  try {
    const { data: all } = await supabase.from('competitors').select('*, users!inner(credits_total, credits_used)').eq('auto_scan', true);
    for (const comp of (all || [])) {
      try {
        const available = (comp.users?.credits_total || 0) - (comp.users?.credits_used || 0);
        if (available < 5) continue;
        const result = await runCompetitorScan(comp.user_id, comp.id, comp.name, comp.city, comp.sector, comp.channels, 10, comp.country || 'TR');
        const { data: fresh } = await supabase.from('users').select('credits_used').eq('id', comp.user_id).single();
        await supabase.from('users').update({ credits_used: (fresh?.credits_used || 0) + result.saved }).eq('id', comp.user_id);
        await sleep(3000);
      } catch (e: any) { console.error(`Daily scan failed ${comp.name}:`, e.message); }
    }
  } catch (e: any) { console.error('Daily scan error:', e.message); }
}

const now = new Date(), nextRun = new Date();
nextRun.setHours(2, 0, 0, 0);
if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
setTimeout(() => { dailyScanAllUsers(); setInterval(dailyScanAllUsers, 86400000); }, nextRun.getTime() - now.getTime());

module.exports = router;
