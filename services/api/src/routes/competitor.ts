export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const axios = require('axios');
const { getCountryByCode } = require('../config/countries');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GOOGLE_API_KEY  = process.env.GOOGLE_PLACES_API_KEY;
const EXA_API_KEY     = process.env.EXA_API_KEY;      // exa.ai — 1B+ LinkedIn, 1000/mo free
const BRAVE_API_KEY   = process.env.BRAVE_API_KEY;    // brave.com/search/api — 1000/mo free
const SERPER_API_KEY  = process.env.SERPER_API_KEY;   // serper.dev — $1/1000, best price for Google
const TAVILY_API_KEY  = process.env.TAVILY_API_KEY;   // tavily.com — 1000/mo free
// Meta Graph API token — META_GRAPH_TOKEN (User/Page Token) kullan
// App Access Token için: graph.facebook.com/oauth/access_token?grant_type=client_credentials
// Mevcut META_GRAPH_TOKEN (EAAM... formatı) sayfa araması için çalışır
const META_APP_TOKEN = process.env.META_GRAPH_TOKEN || process.env.META_WA_TOKEN;

// DuckDuckGo locale codes per country (kl parameter)
const DDG_KL: Record<string, string> = {
  TR:'tr-tr', US:'us-en', GB:'uk-en', DE:'de-de', FR:'fr-fr', ES:'es-es',
  IT:'it-it', NL:'nl-nl', PL:'pl-pl', SE:'se-sv', NO:'no-no', DK:'dk-da',
  FI:'fi-fi', CH:'ch-de', AT:'at-de', BE:'be-nl', PT:'pt-pt', GR:'gr-el',
  RO:'ro-ro', CZ:'cz-cs', HU:'hu-hu', IE:'ie-en', HR:'hr-hr', SK:'sk-sk',
  BG:'bg-bg', UA:'uk-ua',
  // Americas
  BR:'br-pt', MX:'mx-es', AR:'ar-es', CL:'cl-es', CO:'co-es',
  PE:'pe-es', VE:'ve-es', EC:'ec-es', BO:'bo-es', PY:'py-es', UY:'uy-es',
  CA:'ca-en',
  // Arab / MENA → xa-ar covers all Arabic locales
  SA:'xa-ar', AE:'xa-ar', EG:'xa-ar', QA:'xa-ar', KW:'xa-ar', BH:'xa-ar',
  OM:'xa-ar', JO:'xa-ar', LB:'xa-ar', IQ:'xa-ar', MA:'xa-ar', DZ:'xa-ar',
  TN:'xa-ar', LY:'xa-ar', SD:'xa-ar', YE:'xa-ar', SY:'xa-ar', PS:'xa-ar',
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function cleanPhone(p: string): string { return (p || '').replace(/\s/g, '').replace(/[^\d+]/g, ''); }
function calcScore(lead: any): number {
  let s = 30;
  if (lead.phone) s += 25;
  if (lead.website || lead.instagram || lead.linkedin) s += 15;
  if (lead.email) s += 20;
  if (lead.city) s += 5;
  if (lead.name?.length > 3) s += 5;
  // Şikayet eden = rakipten memnun değil = daha değerli lead
  if (lead.score_boost) s += lead.score_boost;
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
    if (!res.ok) { console.error('Google Maps HTTP', res.status, '(Places API billing/key sorunu — ilerleyen adımda çözülecek)'); return []; }
    const data: any = await res.json();
    if (data.error) { console.error('Google Maps API error:', data.error?.message); return []; }
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

// ── DUCKDUCKGO SEARCH (free, no API key, stable HTML, 75 countries) ───────────
// Confirmed working: curl POST with minimal q+kl params returns .result__a elements
async function searchViaDDG(query: string, langCode: string, countryCode: string): Promise<any[]> {
  const kl = DDG_KL[countryCode.toUpperCase()] || 'wt-wt';
  try {
    // CRITICAL: only send q and kl — extra params (o, api, dc) break the HTML response
    const body = `q=${encodeURIComponent(query)}&kl=${kl}`;
    const res = await axios.post(
      'https://html.duckduckgo.com/html/',
      body,
      {
        headers: {
          'User-Agent': randUA(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': `${langCode},en;q=0.7`,
          'Referer': 'https://duckduckgo.com/',
          'Origin': 'https://duckduckgo.com',
        },
        timeout: 14000,
      }
    );
    const $ = cheerio.load(res.data);
    const results: any[] = [];
    const seen = new Set<string>();

    // DDG HTML structure (stable): .result__body > a.result__a[href] + .result__snippet
    $('.result__body').each((_: any, el: any) => {
      const $el = $(el);
      const $a = $el.find('.result__a').first();
      const href = $a.attr('href') || '';
      const title = $a.text().trim();
      const snippet = $el.find('.result__snippet').first().text().trim();
      if (title && href.startsWith('http') && !href.includes('duckduckgo') && !seen.has(href)) {
        seen.add(href);
        results.push({ title, url: href, snippet });
      }
    });

    // Fallback: any anchor with result class
    if (results.length === 0) {
      $('a.result__a[href^="http"], a[class*="result"][href^="http"]').each((_: any, el: any) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim();
        if (title && !href.includes('duckduckgo') && !seen.has(href)) {
          seen.add(href);
          results.push({ title, url: href, snippet: '' });
        }
      });
    }

    return results.slice(0, 8);
  } catch (e: any) {
    console.error('DDG search:', e.message?.slice(0, 60));
    return [];
  }
}

// ── BING SEARCH (free fallback) ───────────────────────────────────────────────
async function searchViaBing(query: string, langCode: string, countryCode: string): Promise<any[]> {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.bing.com/',
        'Cache-Control': 'no-cache',
      },
      timeout: 12000,
    });
    const $ = cheerio.load(res.data);
    const results: any[] = [];
    const seen = new Set<string>();

    // Multiple Bing selectors (structure varies by response)
    const containers = ['li.b_algo', '.b_algo', '#b_results li', 'li[class*="algo"]'];
    for (const sel of containers) {
      if ($(sel).length === 0) continue;
      $(sel).each((_: any, el: any) => {
        const $el = $(el);
        const $a = $el.find('h2 a, h3 a').first();
        const href = $a.attr('href') || '';
        const title = $a.text().trim();
        const snippet = $el.find('p, .b_caption p').first().text().trim();
        if (title && href.startsWith('http') && !href.includes('bing.com') && !href.includes('microsoft.com') && !seen.has(href)) {
          seen.add(href);
          results.push({ title, url: href, snippet });
        }
      });
      if (results.length > 0) break;
    }

    // Ultimate fallback: all external <a href> with nearby h2/h3
    if (results.length === 0) {
      $('a[href^="https://"]').each((_: any, el: any) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.closest('li, div').find('h2, h3').first().text().trim() || $el.text().trim();
        if (title && title.length > 5 && !href.includes('bing.com') && !href.includes('microsoft.com') && !seen.has(href)) {
          seen.add(href);
          results.push({ title, url: href, snippet: '' });
        }
      });
    }

    return results.slice(0, 8);
  } catch (e: any) {
    console.error('Bing search:', e.message?.slice(0, 60));
    return [];
  }
}

// ── EXA.AI SEARCH (Perplexity gibi, ama daha ucuz — LinkedIn 1B+ profil) ──────
// exa.ai = aynı PerplexityBot teknolojisi. 1000 sorgu/ay ÜCRETSİZ.
// includeDomains ile LinkedIn, Facebook, Instagram doğrudan aranır.
// NOT: Bing Web Search API Ağustos 2025'te kapandı. Exa onun yerini aldı.
async function searchViaExa(query: string, domains: string[], langCode: string, countryCode: string): Promise<any[]> {
  if (!EXA_API_KEY) { console.log('[Search] Exa: key yok, atlandı'); return []; }
  console.log(`[Exa] "${query.slice(0,60)}" domains:${domains.join(',') || 'all'}`);
  try {
    const body: any = {
      query,
      numResults: 10,
      type: 'neural',          // semantic search — better than keyword for company names
      useAutoprompt: true,     // Exa optimizes query automatically
    };
    if (domains.length > 0) body.includeDomains = domains.slice(0, 10);

    const res = await axios.post('https://api.exa.ai/search', body, {
      headers: { 'x-api-key': EXA_API_KEY, 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    return (res.data.results || []).map((r: any) => ({
      name: r.title || r.author || r.url?.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || '',
      website: r.url || '',
      notes: r.text?.slice(0, 200) || r.snippet?.slice(0, 200) || '',
      source_channel: domains.length === 1 ? domains[0].split('.')[0].toUpperCase() : 'Exa',
      type: 'business',
    })).filter((r: any) => r.name && r.website).slice(0, 8);
  } catch (e: any) { console.error('Exa search:', e.message?.slice(0, 60)); return []; }
}

// ── SERPER.DEV — En ucuz Google sonuçları ($1/1000, 2500 ücretsiz) ───────────
// Gerçek Google indexinden sonuçlar. site: filtering çalışıyor.
async function searchViaSerper(query: string, langCode: string, countryCode: string, domains: string[]): Promise<any[]> {
  if (!SERPER_API_KEY) return [];
  try {
    // Add site: filter if single domain
    const q = domains.length === 1 ? `site:${domains[0]} ${query}` : query;
    const body: any = { q, num: 10 };
    if (countryCode) body.gl = countryCode.toLowerCase().slice(0, 2);
    if (langCode) body.hl = langCode.slice(0, 2);

    const res = await axios.post('https://google.serper.dev/search', body, {
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    const organic = res.data?.organic || [];
    return organic.map((r: any) => ({
      name: r.title || '',
      website: r.link || '',
      notes: r.snippet || '',
      source_channel: domains.length === 1 ? domains[0].split('.')[0].toUpperCase() : 'Serper',
      type: 'business',
    })).filter((r: any) => r.name && r.website).slice(0, 8);
  } catch (e: any) { console.error('Serper search:', e.message?.slice(0, 60)); return []; }
}

// ── TAVILY — LinkedIn, Şikayet siteleri, B2B için (FB/IG'yi crawl edemiyor) ───
// UYARI: Facebook/Instagram botları engelliyor → include_domains=['facebook.com'] = 0 sonuç
// Tavily şunlar için çalışır: linkedin.com, sikayetvar.com, trustpilot.com, kompass.com, europages.com
const TAVILY_BLOCKED_DOMAINS = new Set(['facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com']);

async function searchViaTavily(query: string, domains: string[], countryCode: string): Promise<any[]> {
  if (!TAVILY_API_KEY) { return []; }
  // FB/IG için Tavily kullanma — kredi boşa harcanır, sonuç 0
  if (domains.length > 0 && domains.every(d => TAVILY_BLOCKED_DOMAINS.has(d))) {
    return [];
  }
  console.log(`[Tavily] "${query.slice(0,60)}" domains:${domains.join(',') || 'all'}`);
  try {
    const body: any = {
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 8,
    };
    // Sadece crawl edebileceği domainler için filtre uygula
    const allowedDomains = domains.filter(d => !TAVILY_BLOCKED_DOMAINS.has(d));
    if (allowedDomains.length > 0) body.include_domains = allowedDomains.slice(0, 5);

    const res = await axios.post('https://api.tavily.com/search', body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const results = res.data?.results || [];
    return results.map((r: any) => ({
      name: r.title || '',
      website: r.url || '',
      notes: r.content?.slice(0, 200) || '',
      source_channel: domains.length === 1 ? domains[0].split('.')[0].toUpperCase() : 'Tavily',
      type: 'business',
    })).filter((r: any) => r.name && r.website).slice(0, 8);
  } catch (e: any) { console.error('Tavily search:', e.message?.slice(0, 60)); return []; }
}

// ── BRAVE SEARCH API (bağımsız index, genel web için) ─────────────────────────
// Brave'in kendi 30B+ sayfalık indexi — Google/Bing'den bağımsız.
// 1000 sorgu/ay ÜCRETSİZ. Tüm ülkeler çalışır.
async function searchViaBrave(query: string, langCode: string, countryCode: string, domains: string[]): Promise<any[]> {
  if (!BRAVE_API_KEY) return [];
  try {
    // Add site: filter if domains specified
    const q = domains.length === 1 ? `${query} site:${domains[0]}` : query;
    const cc = countryCode.toUpperCase().slice(0, 2);
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10&country=${cc}&search_lang=${langCode.slice(0, 2)}`;

    const res = await axios.get(url, {
      headers: {
        'X-Subscription-Token': BRAVE_API_KEY,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
      },
      timeout: 12000,
    });

    const results = res.data?.web?.results || [];
    return results.map((r: any) => ({
      name: r.title || '',
      website: r.url || '',
      notes: r.description || '',
      source_channel: domains.length === 1 ? domains[0].split('.')[0].toUpperCase() : 'Brave',
      type: 'business',
    })).filter((r: any) => r.name && r.website).slice(0, 8);
  } catch (e: any) { console.error('Brave search:', e.message?.slice(0, 60)); return []; }
}

// ── MASTER SEARCH: 5 engine zinciri ──────────────────────────────────────────
async function scrapeGoogleSearch(
  query: string, langCode = 'tr', googleDomain = 'google.com',
  countryCode = 'TR', domains: string[] = []
): Promise<any[]> {

  const isSocialDomain = domains.length > 0 && domains.every(d => TAVILY_BLOCKED_DOMAINS.has(d));

  // 1. Tavily — LinkedIn, şikayet siteleri, B2B için (FB/IG'yi atlıyor)
  if (TAVILY_API_KEY && !isSocialDomain) {
    const r = await searchViaTavily(query, domains, countryCode);
    if (r.length > 0) return r;
  }

  // 2. Exa.ai — LinkedIn için mükemmel
  if (EXA_API_KEY) {
    const r = await searchViaExa(query, domains, langCode, countryCode);
    if (r.length > 0) return r;
  }

  // 3. Serper.dev — En ucuz Google sonuçları ($1/1000, 2500 ücretsiz signup)
  if (SERPER_API_KEY) {
    const r = await searchViaSerper(query, langCode, countryCode, domains);
    if (r.length > 0) return r;
  }

  // 4. Brave Search API (bağımsız index, ~250/ay ücretsiz)
  if (BRAVE_API_KEY) {
    const r = await searchViaBrave(query, langCode, countryCode, domains);
    if (r.length > 0) return r;
  }

  // 5. DuckDuckGo (ücretsiz, datacenter IP'den bloke olabilir)
  const ddg = await searchViaDDG(query, langCode, countryCode);
  if (ddg.length > 0) return ddg;

  // 6. Bing direkt scraping
  const bing = await searchViaBing(query, langCode, countryCode);
  if (bing.length > 0) return bing;

  // 7. Google direkt (son çare)
  try {
    const url = `https://www.${googleDomain}/search?q=${encodeURIComponent(query)}&num=10&hl=${langCode}&pws=0`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': randUA(), 'Accept-Language': `${langCode},en;q=0.7`, 'Referer': `https://www.${googleDomain}/` },
      timeout: 10000,
    });
    const $ = cheerio.load(res.data);
    const results: any[] = [];
    const seen = new Set<string>();
    $('a').each((_: any, el: any) => {
      const $el = $(el);
      if (!$el.find('h3').length) return;
      const href = $el.attr('href') || '';
      if (!href.startsWith('http') || href.includes('google') || seen.has(href)) return;
      const title = $el.find('h3').first().text().trim();
      if (title && title.length > 2) { seen.add(href); results.push({ title, url: href, snippet: '' }); }
    });
    return results.slice(0, 8);
  } catch { return []; }
}

// ── SOCIAL REVIEWS — Rakibin şikayetçileri (direkt + sosyal) ─────────────────
async function scrapeSocialReviews(competitorName: string, country: any): Promise<any[]> {
  const { language, queries, googleDomain, code, localComplaintSites } = country;
  const results: any[] = [];
  // Tırnak içinde aramak şart — aksi halde farklı firmalar gelir
  const exactName = `"${competitorName}"`;

  const tasks: Promise<any[]>[] = [];

  // 1. TR: Şikayetvar DOĞRUDAN scraping (Tavily değil)
  if (code === 'TR') {
    tasks.push(
      scrapeŞikayetVar(competitorName).then((data: any) => {
        if (!data?.complaints?.length) return [];
        return data.complaints.map((text: string) => ({
          name: text.slice(0, 80),
          website: `https://www.sikayetvar.com/search?q=${encodeURIComponent(competitorName)}`,
          notes: text,
          source_channel: 'Şikayetvar',
          type: 'person',
          score_boost: 25,
        }));
      }).catch(() => [])
    );
  }

  // 2. Diğer ülkelerin yerel şikayet siteleri — direkt Google araması (tırnaklı)
  for (const site of (localComplaintSites || []).slice(0, 2)) {
    if (site.domain === 'sikayetvar.com') continue; // zaten üstte
    tasks.push(scrapeGoogleSearch(`${exactName} site:${site.domain}`, language, googleDomain, code, [site.domain]));
  }

  // 3. Trustpilot — tırnaklı, global
  tasks.push(scrapeGoogleSearch(`${exactName} site:trustpilot.com`, 'en', 'google.com', 'US', ['trustpilot.com']));

  // 4. Facebook şikayetleri — tırnaklı, yalnızca bu rakip
  tasks.push(scrapeGoogleSearch(`${exactName} ${queries.complaint} site:facebook.com`, language, googleDomain, code, ['facebook.com']));

  // 5. Instagram şikayetleri — tırnaklı
  tasks.push(scrapeGoogleSearch(`${exactName} ${queries.complaint} site:instagram.com`, language, googleDomain, code, ['instagram.com']));

  const settled = await Promise.allSettled(tasks);

  settled.forEach((r) => {
    if (r.status !== 'fulfilled') return;
    r.value.forEach((item: any) => {
      const url: string = item.website || item.url || '';
      if (!url) return;

      // Sadece bu rakibi içeren sonuçları al
      const nameCheck = competitorName.toLowerCase();
      const contentCheck = (item.name + ' ' + item.notes).toLowerCase();
      if (!contentCheck.includes(nameCheck.split(' ')[0]?.toLowerCase() || '')) return;

      const isFB = url.includes('facebook.com');
      const isIG = url.includes('instagram.com');
      const isTP = url.includes('trustpilot.com');
      const isSV = url.includes('sikayetvar.com');

      if (isFB && url.includes('/posts/')) return;

      const channel = isSV ? 'Şikayetvar' : isTP ? 'Trustpilot' : isFB ? 'Facebook Yorum' : isIG ? 'Instagram Yorum' : 'Şikayet Sitesi';
      const igUser = isIG ? url.match(/instagram\.com\/([^/?]+)/)?.[1] || '' : '';

      results.push({
        name: item.name || 'Şikayetçi',
        website: igUser ? `https://instagram.com/${igUser}` : url,
        instagram: igUser ? `https://instagram.com/${igUser}` : undefined,
        notes: `[${channel}] ${item.notes || ''}`.slice(0, 300),
        source_channel: channel,
        type: 'person',
        score_boost: isSV ? 25 : 15,
      });
    });
  });

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = results.filter(r => {
    if (seen.has(r.website)) return false;
    seen.add(r.website);
    return true;
  });

  console.log(`[SocialReviews] ${unique.length} şikayet kaydı (${competitorName})`);
  return unique.slice(0, 12);
}

// ── LINKEDIN ─────────────────────────────────────────────────────────────────
async function scrapeLinkedIn(query: string, langCode: string, googleDomain: string, countryCode: string): Promise<any[]> {
  try {
    const results = await scrapeGoogleSearch(`${query} site:linkedin.com/in OR site:linkedin.com/company`, langCode, googleDomain, countryCode, ['linkedin.com']);
    return results.filter((r: any) => r.url.includes('linkedin.com')).map((r: any) => ({
      name: r.title.replace('| LinkedIn', '').replace('- LinkedIn', '').trim(),
      website: r.url, notes: r.snippet,
      type: r.url.includes('/in/') ? 'person' : 'business',
      source_channel: 'LinkedIn', linkedin: r.url,
    }));
  } catch { return []; }
}

// ── FACEBOOK — Ad Library API (public, no App Review) + page lookup ────────────
async function scrapeFacebook(query: string, langCode: string, googleDomain: string, countryCode: string): Promise<any[]> {
  // 1. Facebook Ad Library API — reklam veren şirketler (public endpoint, no App Review)
  if (META_APP_TOKEN) {
    try {
      const country = countryCode.toUpperCase().slice(0, 2);
      const res = await axios.get('https://graph.facebook.com/v19.0/ads_archive', {
        params: {
          search_terms: query,
          ad_reached_countries: `["${country}"]`,
          fields: 'page_name,page_id,ad_snapshot_url',
          access_token: META_APP_TOKEN,
          limit: 20,
        },
        timeout: 12000,
      });
      const ads = res.data?.data || [];
      // Deduplicate by page_id
      const seen = new Set<string>();
      const pages: any[] = [];
      for (const ad of ads) {
        if (ad.page_id && !seen.has(ad.page_id)) {
          seen.add(ad.page_id);
          pages.push(ad);
        }
      }
      if (pages.length > 0) {
        console.log(`[Facebook] Ad Library: ${pages.length} şirket bulundu`);
        // Get page details for each
        const enriched = await Promise.all(pages.slice(0, 8).map(async (p: any) => {
          try {
            const detail = await axios.get(`https://graph.facebook.com/v19.0/${p.page_id}`, {
              params: { fields: 'name,website,phone,username,location', access_token: META_APP_TOKEN },
              timeout: 6000,
            });
            const d = detail.data;
            const username = d.username || '';
            const messengerLink = username ? 'https://m.me/' + username : '';
            return {
              name: d.name || p.page_name || '',
              website: d.website || messengerLink || `https://facebook.com/${p.page_id}`,
              phone: cleanPhone(d.phone || ''),
              address: d.location?.city || '',
              notes: messengerLink ? '💬 ' + messengerLink : '',
              source_channel: 'Facebook',
              type: 'business',
            };
          } catch {
            return {
              name: p.page_name || '',
              website: `https://facebook.com/${p.page_id}`,
              phone: '',
              notes: '',
              source_channel: 'Facebook',
              type: 'business',
            };
          }
        }));
        return enriched.filter((p: any) => p.name);
      }
    } catch (e: any) {
      console.error('[Facebook] Ad Library:', e.response?.data?.error?.message || e.message?.slice(0, 80));
    }
  }

  // 2. Tavily/Exa/Serper fallback + Messenger link
  const results = await scrapeGoogleSearch(query + ' site:facebook.com', langCode, googleDomain, countryCode, ['facebook.com']);
  return results
    .filter((r: any) => r.url && r.url.includes('facebook.com') && !r.url.includes('/posts/') && !r.url.includes('/events/'))
    .map((r: any) => {
      const fbUrl: string = r.website || r.url || '';
      const username = fbUrl.match(/facebook\.com\/([^/?#]+)/)?.[1] || '';
      const skip = ['watch', 'groups', 'pages', 'profile', 'share', 'photo'];
      const messengerLink = username && !skip.includes(username) ? 'https://m.me/' + username : '';
      return {
        name: r.name || (r.title || '').replace('| Facebook', '').replace('- Facebook', '').trim(),
        website: messengerLink || fbUrl,
        phone: cleanPhone(r.phone || ''),
        notes: (r.notes || r.snippet || '') + (messengerLink ? ' | 💬 ' + messengerLink : ''),
        type: 'business',
        source_channel: 'Facebook',
      };
    });
}

// ── INSTAGRAM — Hashtag API (META_INSTAGRAM_ACCOUNT_ID ile) + arama fallback ─
async function scrapeInstagram(keyword: string, country: any): Promise<any[]> {
  const { language, queries, googleDomain, code } = country;

  // 1. Instagram Hashtag Search (Instagram Business Account gerekli)
  const igAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  const igToken = process.env.META_PAGE_TOKEN || META_APP_TOKEN;
  if (igAccountId && igToken) {
    try {
      const hashtagWord = keyword.split(' ')[0].replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9]/g, '');
      const htRes = await axios.get('https://graph.facebook.com/v19.0/ig_hashtag_search', {
        params: { user_id: igAccountId, q: hashtagWord, access_token: igToken },
        timeout: 8000,
      });
      const hashtagId = htRes.data?.data?.[0]?.id;
      if (hashtagId) {
        const mediaRes = await axios.get(`https://graph.facebook.com/v19.0/${hashtagId}/recent_media`, {
          params: { user_id: igAccountId, fields: 'username,permalink,caption', access_token: igToken, limit: 10 },
          timeout: 8000,
        });
        const posts = (mediaRes.data?.data || []).filter((p: any) => p.username);
        if (posts.length > 0) {
          return posts.map((p: any) => ({
            name: `@${p.username}`, instagram: `https://instagram.com/${p.username}`,
            website: `https://instagram.com/${p.username}`,
            notes: p.caption?.slice(0, 150) || '', source_channel: 'Instagram', type: 'person_or_business',
          }));
        }
      }
    } catch (e: any) { console.error('Instagram Hashtag:', e.response?.data?.error?.message || e.message?.slice(0, 60)); }
  }

  // 2. Exa/Serper/DDG ile Instagram profil araması (Tavily IG'yi crawl edemez)
  const results = await scrapeGoogleSearch(`${keyword} ${queries.business} site:instagram.com`, language, googleDomain, code, ['instagram.com']);
  return results
    .filter((r: any) => r.url?.includes('instagram.com'))
    .map((r: any) => {
      // instagram.com/username → username çıkar (post URL'leri atla: /p/, /reel/)
      const urlPath = r.url.replace(/https?:\/\/(www\.)?instagram\.com/, '').replace(/\/$/, '');
      const isPost = urlPath.startsWith('/p/') || urlPath.startsWith('/reel/') || urlPath.startsWith('/tv/');
      if (isPost) return null;

      const username = urlPath.split('/').filter(Boolean)[0] || '';
      if (!username || username.length < 2) return null;

      const profileUrl = `https://instagram.com/${username}`;
      const cleanName = (r.title || r.name || '')
        .replace('• Instagram photos and videos', '')
        .replace('• Instagram', '')
        .replace(/\(@[^)]+\)/, '')
        .trim() || `@${username}`;

      return {
        name: cleanName || `@${username}`,
        instagram: profileUrl,
        website: profileUrl,
        phone: '',
        notes: `📸 Instagram DM: ${profileUrl} | ${(r.snippet || '').slice(0, 120)}`,
        type: 'person_or_business',
        source_channel: 'Instagram',
      };
    })
    .filter(Boolean);
}

// ── LOCAL COMPLAINT SITE ──────────────────────────────────────────────────────
async function scrapeComplaintSite(competitorName: string, site: { id: string; name: string; domain: string }, langCode: string, googleDomain: string, countryCode: string): Promise<any[]> {
  try {
    const results = await scrapeGoogleSearch(`"${competitorName}" site:${site.domain}`, langCode, googleDomain, countryCode, [site.domain]);
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
    scrapeGoogleSearch(`${query} site:kompass.com`, 'en', 'google.com', 'US', ['kompass.com']),
    scrapeGoogleSearch(`${query} site:europages.com`, 'en', 'google.com', 'US', ['europages.com']),
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
    // Facebook için: website yoksa Messenger linki, Instagram için profil URL
    website: lead.website || lead.instagram || lead.linkedin
      || (lead.notes?.match(/https:\/\/m\.me\/[^\s|]+/)?.[0] || null),
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
      GOOGLE_PLACES_API_KEY: GOOGLE_API_KEY ? '✅ set' : '❌ missing (Google Maps disabled)',
      EXA_API_KEY:    EXA_API_KEY    ? '✅ set' : '⚠️  missing → dashboard.exa.ai (1000/mo free, LinkedIn 1B+)',
      TAVILY_API_KEY: TAVILY_API_KEY ? '✅ set' : '⚠️  missing → tavily.com (1000/mo free, LinkedIn search)',
      SERPER_API_KEY: SERPER_API_KEY ? '✅ set' : '⚠️  missing → serper.dev ($1/1000, 2500 free signup)',
      BRAVE_API_KEY:  BRAVE_API_KEY  ? '✅ set' : '⚠️  missing → brave.com/search/api (~250/mo free)',
      search_chain: 'Exa.ai → Tavily → Serper.dev → Brave → DuckDuckGo → Bing → Google',
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
