export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const cheerio  = require('cheerio');
const axios    = require('axios');
const dns      = require('dns').promises;
const net      = require('net');

const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const GOOGLE_CSE_KEY = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
const GOOGLE_CSE_ID  = process.env.GOOGLE_SEARCH_ENGINE_ID;
const LINKEDIN_LI_AT = process.env.LINKEDIN_LI_AT;

// ── Types ─────────────────────────────────────────────────────────────────────

interface DecisionMaker {
  name:         string | null;
  title:        string | null;
  email:        string | null;
  phone:        string | null;
  linkedinUrl:  string | null;
  source:       string;
  confidence:   'high' | 'medium' | 'low';
  isDecisionMaker: boolean;
  emailStatus?: 'valid' | 'accept-all' | 'invalid' | 'unknown';
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DM_TITLES = [
  // EN C-level
  'ceo','coo','cfo','cto','cmo','founder','co-founder','owner','co-owner',
  'president','vice president','vp','managing director','general manager',
  'head of','chief','partner','principal','director',
  // EN functional
  'procurement manager','purchasing manager','buying manager','supply chain manager',
  'sales director','sales manager','business development','marketing director',
  'marketing manager','operations director','operations manager',
  // TR C-level
  'genel müdür','yönetim kurulu başkanı','icra kurulu başkanı',
  'kurucu','kurucu ortak','yönetici ortak','genel koordinatör',
  'direktör','başkan','yönetici',
  // TR functional
  'satın alma müdürü','tedarik müdürü','tedarik zinciri müdürü',
  'satış müdürü','satış direktörü','pazarlama müdürü','pazarlama direktörü',
  'ticaret müdürü','ihracat müdürü','ithalat müdürü','dış ticaret müdürü',
  'fabrika müdürü','üretim müdürü','işletme müdürü','finans müdürü',
  // TR partial
  'müdürü','direktörü','başkanı','kurucusu','sahibi','ortağı',
];

const GENERIC_LOCAL = new Set([
  'info','contact','hello','mail','email','admin','support','sales','whatsapp',
  'iletisim','bilgi','hizmet','destek','rezervasyon','muhasebe','hr','ik',
  'webmaster','noreply','no-reply','satis','kariyer','careers','press','media',
  'marketing','pazarlama','teknik','service','help','billing','invoice','fatura',
  'hello','hi','team','office','reception','sekreterya',
]);

// 12 Hunter.io–style email pattern templates
const EMAIL_PATTERNS: Array<(f: string, l: string) => string> = [
  (f, l) => `${f}.${l}`,
  (f, l) => `${f}${l}`,
  (f, l) => f,
  (f, l) => `${f[0]}${l}`,
  (f, l) => `${f}_${l}`,
  (f, l) => `${f[0]}.${l}`,
  (f, l) => `${l}.${f}`,
  (f, l) => l,
  (f, l) => `${f[0]}${l[0]}`,
  (f, l) => `${l}${f[0]}`,
  (f, l) => `${l}${f}`,
  (f, l) => `${f}.${l[0]}`,
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Text utilities ────────────────────────────────────────────────────────────

function latinize(s: string): string {
  return s
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normNamePart(s: string): string {
  return latinize(s).toLowerCase().replace(/[^a-z]/g, '');
}

function isRealName(name: string | null): boolean {
  if (!name || name.length < 4 || name.length > 60) return false;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return false;
  if (/^\d/.test(name)) return false;
  if (name.includes('@') || name.includes('http') || name.includes('.com')) return false;
  const lower = name.toLowerCase();
  if (GENERIC_LOCAL.has(lower)) return false;
  return true;
}

function isDMTitle(title: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return DM_TITLES.some(dt => t.includes(dt));
}

function cleanPhone(raw: string): string {
  const d = raw.replace(/[^\d+]/g, '');
  if (d.length < 10) return '';
  if (d.startsWith('0') && d.length === 11) return '+90' + d.slice(1);
  if (d.startsWith('90') && d.length === 12) return '+' + d;
  if (d.startsWith('+90') && d.length === 13) return d;
  if (d.length === 10 && !d.startsWith('0')) return '+90' + d;
  return d.length >= 10 ? d : '';
}

function extractPhones(text: string): string[] {
  const s = new Set<string>();
  const re = /(?:(?:\+90|0090|0)\s?)?(?:\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{2}[\s\-\.]?\d{2})(?!\d)/g;
  for (const m of text.match(re) || []) {
    const c = cleanPhone(m.trim());
    if (c && c.length >= 12) s.add(c);
  }
  return [...s].slice(0, 5);
}

function extractEmails(text: string): string[] {
  const re = /\b[a-zA-Z0-9][a-zA-Z0-9._%+\-]{0,48}@[a-zA-Z0-9][a-zA-Z0-9.\-]{0,48}\.[a-zA-Z]{2,6}\b/g;
  return [...new Set(text.match(re) || [])].filter(e => {
    const [local, dom] = e.split('@');
    if (!dom || e.length > 80) return false;
    if (/\.(jpg|png|gif|svg|css|js)$/i.test(dom)) return false;
    const JUNK = ['example.com','test.com','domain.com','google.com','sentry.io','wordpress.com'];
    if (JUNK.includes(dom.toLowerCase())) return false;
    return local.length >= 2;
  });
}

function getDomain(website: string): string {
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return website.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0];
  }
}

// ── LinkedIn — 4-layer strategy ───────────────────────────────────────────────
//
//  Layer 1: Voyager API via residential proxy (LINKEDIN_PROXY_URL env var)
//           e.g. http://user:pass@proxy.example.com:8000
//           OR   http://auto:APIFY_TOKEN@proxy.apify.com:8000  (Apify proxy)
//  Layer 2: Apify actor (apify/linkedin-profile-scraper) — APIFY_TOKEN
//  Layer 3: Google CSE → extract LinkedIn profile URLs → parse name/title
//  Layer 4: Google-indexed LinkedIn (existing, no LinkedIn access needed)
//
//  WHY 404s: Railway uses datacenter IPs; LinkedIn blocks them silently (404 not 403).
//  All professional scrapers (Apify, PhantomBuster) use residential proxies.

interface LiSession { liAt: string; csrf: string; expiresAt: number; }
let liSession: LiSession | null = null;

// Build axios config — adds residential proxy if LINKEDIN_PROXY_URL is set
function liAxiosConfig(s: LiSession, extraOptions: any = {}): any {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
    'x-li-lang': 'tr_TR',
    'x-restli-protocol-version': '2.0.0',
    'x-li-track': JSON.stringify({ clientVersion: '1.13.14', osName: 'web', timezoneOffset: 3, timezone: 'Europe/Istanbul', mpName: 'voyager-web' }),
    'csrf-token': s.csrf,
    'Cookie': `li_at=${s.liAt}; JSESSIONID="${s.csrf}"`,
    'x-requested-with': 'XMLHttpRequest',
    'Referer': 'https://www.linkedin.com/search/results/people/',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
  };

  const cfg: any = { headers, timeout: 15000, ...extraOptions };

  const proxyUrl = process.env.LINKEDIN_PROXY_URL;
  if (proxyUrl) {
    try {
      const p = new URL(proxyUrl);
      cfg.proxy = {
        protocol: p.protocol.replace(':', ''),
        host: p.hostname,
        port: parseInt(p.port) || 8000,
        auth: p.username ? { username: decodeURIComponent(p.username), password: decodeURIComponent(p.password) } : undefined,
      };
      console.log(`[LinkedIn] Using proxy: ${p.hostname}:${p.port}`);
    } catch (e: any) { console.warn('[LinkedIn] Invalid proxy URL:', e.message); }
  }

  return cfg;
}

async function getLiSession(): Promise<LiSession | null> {
  if (!LINKEDIN_LI_AT) return null;
  if (liSession && liSession.expiresAt > Date.now()) return liSession;

  const proxyUrl = process.env.LINKEDIN_PROXY_URL;
  const axiosCfg: any = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Cookie': `li_at=${LINKEDIN_LI_AT}`,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'tr-TR,tr;q=0.9',
    },
    timeout: 15000,
    maxRedirects: 3,
  };

  if (proxyUrl) {
    try {
      const p = new URL(proxyUrl);
      axiosCfg.proxy = {
        protocol: p.protocol.replace(':', ''),
        host: p.hostname,
        port: parseInt(p.port) || 8000,
        auth: p.username ? { username: decodeURIComponent(p.username), password: decodeURIComponent(p.password) } : undefined,
      };
    } catch {}
  }

  try {
    const resp = await axios.get('https://www.linkedin.com/feed/', axiosCfg);
    let csrf = '';
    for (const c of (resp.headers['set-cookie'] || [])) {
      const m = c.match(/JSESSIONID=([^;]+)/i);
      if (m) { csrf = m[1].replace(/"/g, '').trim(); break; }
    }
    if (!csrf) {
      const m = String(resp.data).match(/"JSESSIONID"\s*:\s*"([^"]+)"/);
      if (m) csrf = m[1].trim();
    }
    if (!csrf) {
      console.warn('[LinkedIn] No JSESSIONID — session may be expired or IP blocked');
      return null;
    }
    if (!csrf.startsWith('ajax:')) csrf = `ajax:${csrf}`;
    liSession = { liAt: LINKEDIN_LI_AT, csrf, expiresAt: Date.now() + 25 * 60 * 1000 };
    console.log('[LinkedIn] Session OK' + (proxyUrl ? ' (proxy)' : ' (direct — may be blocked by Railway IP)'));
    return liSession;
  } catch (e: any) {
    console.error('[LinkedIn] Session error:', e.message?.slice(0, 80));
    return null;
  }
}

// Extract urn:li:company:ID from any nested value
function extractCompanyId(obj: any): string | null {
  const str = JSON.stringify(obj);
  const m = str.match(/urn:li:company:(\d+)/);
  return m ? m[1] : null;
}

// Parse people array from any blended search response shape
function extractPeopleFromBlended(data: any): DecisionMaker[] {
  const results: DecisionMaker[] = [];
  const seen = new Set<string>();
  const groups = data?.elements || data?.data?.elements || [];
  for (const group of groups) {
    for (const hit of (group.elements || group.items || [])) {
      const name  = hit.title?.text?.trim() || hit.name?.trim() || null;
      const title = hit.primarySubtitle?.text?.trim() || hit.headline?.text?.trim() || hit.occupation?.trim() || null;
      const url   = hit.navigationUrl || hit.profileUrl || '';
      if (!name || !isRealName(name)) continue;
      const nk = latinize(name).toLowerCase();
      if (seen.has(nk)) continue;
      seen.add(nk);
      results.push({
        name, title, email: null, phone: null,
        linkedinUrl: url ? (url.startsWith('http') ? url : `https://www.linkedin.com${url}`) : null,
        source: 'LinkedIn',
        confidence: isDMTitle(title || '') ? 'high' : 'medium',
        isDecisionMaker: isDMTitle(title || ''),
      });
    }
  }
  return results;
}

// ── Layer 1: Voyager API (works with proxy; blocked without on Railway) ────────

async function liCompanyId(name: string, s: LiSession): Promise<string | null> {
  const cleanName = name.length > 60 ? name.slice(0, 60) : name; // LI rejects long queries

  // Try 1: typeahead/hits (replaces deprecated hitsV2)
  try {
    const resp = await axios.get('https://www.linkedin.com/voyager/api/typeahead/hits',
      { ...liAxiosConfig(s), params: { keywords: cleanName, q: 'type', type: 'COMPANY', useCase: 'PEOPLE_SEARCH' } }
    );
    for (const el of resp.data?.elements || []) {
      const id = extractCompanyId(el);
      if (id) { console.log(`[LinkedIn/Voyager] typeahead: "${cleanName}" → ${id}`); return id; }
    }
  } catch (e: any) { console.warn('[LinkedIn/Voyager] typeahead:', e.response?.status || e.message?.slice(0, 50)); }

  // Try 2: blended search with company filter
  try {
    const resp = await axios.get('https://www.linkedin.com/voyager/api/search/blended',
      { ...liAxiosConfig(s), params: { keywords: cleanName, q: 'blended', origin: 'SWITCH_SEARCH_VERTICAL', filters: 'List(resultType->COMPANY)' } }
    );
    for (const group of resp.data?.elements || []) {
      for (const el of group.elements || []) {
        const id = extractCompanyId(el);
        if (id) { console.log(`[LinkedIn/Voyager] blended company: "${cleanName}" → ${id}`); return id; }
      }
    }
  } catch (e: any) { console.warn('[LinkedIn/Voyager] blended company:', e.response?.status || e.message?.slice(0, 50)); }

  return null;
}

async function liPeople(companyId: string, s: LiSession): Promise<DecisionMaker[]> {
  // Try 1: classic filter format
  try {
    const resp = await axios.get('https://www.linkedin.com/voyager/api/search/blended',
      { ...liAxiosConfig(s), params: { count: 25, filters: `List(currentCompany->${companyId})`, origin: 'COMPANY_PAGE_CANNED_SEARCH', q: 'people' } }
    );
    const found = extractPeopleFromBlended(resp.data);
    if (found.length > 0) { console.log(`[LinkedIn/Voyager] ${found.length} people via company ID`); return found; }
  } catch (e: any) { console.warn('[LinkedIn/Voyager] people classic:', e.response?.status || e.message?.slice(0, 50)); }

  // Try 2: structured filter format (newer LinkedIn API)
  try {
    const resp = await axios.get('https://www.linkedin.com/voyager/api/search/blended',
      { ...liAxiosConfig(s), params: { count: 25, q: 'people', origin: 'COMPANY_PAGE_CANNED_SEARCH', filters: `List((name:currentCompany,values:List((id:${companyId},selectionType:INCLUDED))))` } }
    );
    const found = extractPeopleFromBlended(resp.data);
    if (found.length > 0) { console.log(`[LinkedIn/Voyager] ${found.length} people via structured filter`); return found; }
  } catch (e: any) { console.warn('[LinkedIn/Voyager] people structured:', e.response?.status || e.message?.slice(0, 50)); }

  return [];
}

async function liPeopleByKeyword(companyName: string, s: LiSession): Promise<DecisionMaker[]> {
  try {
    const resp = await axios.get('https://www.linkedin.com/voyager/api/search/blended',
      { ...liAxiosConfig(s), params: { keywords: companyName.slice(0, 60), q: 'people', count: 25, origin: 'GLOBAL_SEARCH_HEADER' } }
    );
    const found = extractPeopleFromBlended(resp.data);
    if (found.length > 0) console.log(`[LinkedIn/Voyager] ${found.length} people via keyword`);
    return found;
  } catch (e: any) {
    console.warn('[LinkedIn/Voyager] keyword:', e.response?.status || e.message?.slice(0, 50));
    return [];
  }
}

// ── Layer 2: Apify linkedin-profile-scraper ───────────────────────────────────
// Input: array of LinkedIn profile URLs found via Google
// Apify uses residential proxies — bypasses LinkedIn IP blocks

async function apifyLinkedInEnrich(profileUrls: string[]): Promise<DecisionMaker[]> {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN || !profileUrls.length) return [];

  console.log(`[Apify/LinkedIn] Enriching ${profileUrls.length} profiles...`);
  try {
    const { ApifyClient } = require('apify-client');
    const client = new ApifyClient({ token: APIFY_TOKEN });
    const run = await Promise.race([
      client.actor('apify/linkedin-profile-scraper').call({ profileUrls: profileUrls.slice(0, 10) }),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('Apify timeout')), 90_000)),
    ]) as any;

    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 15 });
    const results: DecisionMaker[] = (items || [])
      .filter((item: any) => isRealName(item.fullName || item.name || ''))
      .map((item: any) => ({
        name:          item.fullName || item.name || null,
        title:         item.headline || item.occupation || null,
        email:         item.email    || null,
        phone:         null,
        linkedinUrl:   item.url      || item.linkedinUrl || null,
        source:        'LinkedIn (Apify)',
        confidence:    isDMTitle(item.headline || '') ? 'high' : 'medium',
        isDecisionMaker: isDMTitle(item.headline || ''),
      }));

    console.log(`[Apify/LinkedIn] ${results.length} profiles enriched`);
    return results;
  } catch (e: any) {
    console.warn('[Apify/LinkedIn]', e.message?.slice(0, 80));
    return [];
  }
}

// ── Layer 3: Google CSE → LinkedIn profile URLs → name/title extraction ────────
// Works without LinkedIn access. Google indexes LinkedIn's public snippets.

async function findViaGoogleLinkedIn(companyName: string): Promise<DecisionMaker[]> {
  const short = companyName.replace(/\s+(A\.Ş\.|Ltd\.?|Ş\.?T\.?İ\.?|ve Tic\.?|San\.?|Dış|İnş\.?|Otomotiv).*$/i, '').trim().slice(0, 50);

  const queries = [
    `site:linkedin.com/in "${short}" CEO OR kurucu OR "genel müdür" OR founder OR director OR sahip OR owner`,
    `site:linkedin.com/in "${short}" müdür OR manager OR direktör OR ortak OR partner`,
    `site:linkedin.com/in "${short}"`,
    `"${short}" site:linkedin.com/in satın alma OR pazarlama OR ticaret OR üretim`,
  ];

  const results: DecisionMaker[] = [];
  const seenUrls = new Set<string>();
  const seenNames = new Set<string>();

  for (const q of queries) {
    try {
      const items = await googleCSE(q, 8);
      for (const item of items) {
        if (!item.url.includes('linkedin.com/in/') || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);

        // "Ahmet Yılmaz - CEO at Firma | LinkedIn" → name: "Ahmet Yılmaz", title: "CEO"
        const titleParts = item.title.replace(/\s*\|\s*LinkedIn.*$/i, '').split(/\s*[-–]\s*/);
        const name  = titleParts[0]?.trim() || '';
        const title = titleParts[1]?.replace(/\s+at\s+.*/i, '').trim() || null;

        if (!isRealName(name)) continue;
        const nk = latinize(name).toLowerCase();
        if (seenNames.has(nk)) continue;
        seenNames.add(nk);

        const isDM = isDMTitle(title || '') || isDMTitle(item.snippet);
        results.push({
          name, title, email: null, phone: null,
          linkedinUrl: item.url,
          source: 'LinkedIn (Google)',
          confidence: isDM ? 'medium' : 'low',
          isDecisionMaker: isDM,
        });
      }
      await sleep(200);
    } catch {}
  }

  // If we found URLs and have Apify, enrich them
  const profileUrls = [...seenUrls];
  if (profileUrls.length > 0 && process.env.APIFY_TOKEN) {
    const enriched = await apifyLinkedInEnrich(profileUrls);
    if (enriched.length > 0) {
      // Merge enriched data into existing results
      for (const e of enriched) {
        const nk = latinize(e.name || '').toLowerCase();
        const existing = results.find(r => latinize(r.name || '').toLowerCase() === nk);
        if (existing) {
          existing.email       = existing.email       || e.email;
          existing.title       = existing.title       || e.title;
          existing.confidence  = 'high'; // Apify-confirmed
          existing.source      = 'LinkedIn (Apify)';
        } else if (isRealName(e.name)) {
          results.push(e);
        }
      }
    }
  }

  console.log(`[LinkedIn/Google] ${results.length} people from ${seenUrls.size} profile URLs`);
  return results;
}

// ── Main LinkedIn orchestrator ────────────────────────────────────────────────

async function findViaLinkedInVoyager(companyName: string): Promise<DecisionMaker[]> {
  const hasProxy = !!process.env.LINKEDIN_PROXY_URL;

  // Layer 1: Voyager API — only reliable with proxy (Railway IPs are blocked)
  const s = await getLiSession();
  if (s) {
    const id = await liCompanyId(companyName, s);
    if (id) {
      await sleep(500);
      const byId = await liPeople(id, s);
      if (byId.length > 0) return byId;
    }
    if (hasProxy) {
      // Only bother with keyword search if proxy is configured (saves time otherwise)
      await sleep(400);
      const byKw = await liPeopleByKeyword(companyName, s);
      if (byKw.length > 0) return byKw;
    } else {
      console.log('[LinkedIn] No proxy configured — Voyager API will not work from Railway IP. Add LINKEDIN_PROXY_URL.');
    }
  }

  // Layers 2+3: Google CSE + optional Apify enrichment (always available)
  return findViaGoogleLinkedIn(companyName);
}

// Legacy alias — now delegates to the unified findViaGoogleLinkedIn
async function findViaLinkedInGoogle(companyName: string): Promise<DecisionMaker[]> {
  return findViaGoogleLinkedIn(companyName);
}

// ── Google CSE helper ─────────────────────────────────────────────────────────

async function googleCSE(query: string, num = 10): Promise<Array<{ title: string; url: string; snippet: string }>> {
  if (!GOOGLE_CSE_KEY || !GOOGLE_CSE_ID) return [];
  try {
    const resp = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: GOOGLE_CSE_KEY, cx: GOOGLE_CSE_ID, q: query, num: Math.min(num, 10), hl: 'tr', gl: 'tr' },
      timeout: 8000,
    });
    return (resp.data.items || []).map((i: any) => ({ title: i.title || '', url: i.link || '', snippet: i.snippet || '' }));
  } catch { return []; }
}

// ── Website Deep Scraper ──────────────────────────────────────────────────────

async function scrapeWebsite(website: string, companyName: string): Promise<{
  persons: DecisionMaker[];
  emails:  string[];
  phones:  string[];
  domain:  string;
}> {
  const domain = getDomain(website);
  const base   = (website.startsWith('http') ? website : `https://${website}`).replace(/\/$/, '');

  const pages = [
    base,
    `${base}/hakkimizda`, `${base}/hakkinda`, `${base}/biz-kimiz`,
    `${base}/ekibimiz`,   `${base}/yonetim`,  `${base}/yonetim-kurulu`,
    `${base}/iletisim`,   `${base}/contact`,  `${base}/contact-us`,
    `${base}/about`,      `${base}/about-us`, `${base}/team`,
    `${base}/management`, `${base}/our-team`, `${base}/people`,
  ];

  const persons: DecisionMaker[] = [];
  const allEmails = new Set<string>();
  const allPhones = new Set<string>();
  const seenNames = new Set<string>();
  const UAs = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
  ];

  let checked = 0;
  for (const url of pages) {
    if (checked >= 7) break;
    try {
      const resp = await axios.get(url, {
        headers: { 'User-Agent': UAs[checked % 2], 'Accept': 'text/html', 'Accept-Language': 'tr-TR,tr;q=0.9' },
        timeout: 8000, maxRedirects: 3,
      });
      const $ = cheerio.load(resp.data);
      $('script:not([type="application/ld+json"]), style, noscript, nav').remove();

      // 1. JSON-LD Person schema (highest quality)
      $('script[type="application/ld+json"]').each((_: any, el: any) => {
        try {
          const raw  = JSON.parse($(el).html() || '{}');
          const nodes: any[] = Array.isArray(raw) ? raw : (raw['@graph'] ? raw['@graph'] : [raw]);
          for (const node of nodes) {
            const type = node['@type'];
            if (type === 'Person' || type === 'Employee' || type === 'OrganizationRole') {
              const name = node.name;
              const title = node.jobTitle || '';
              if (name && isRealName(name) && !seenNames.has(name.toLowerCase())) {
                seenNames.add(name.toLowerCase());
                const ph = node.telephone ? cleanPhone(node.telephone) : null;
                persons.push({ name, title: title || null, email: node.email || null, phone: ph, linkedinUrl: node.url || null, source: 'Website (JSON-LD)', confidence: 'high', isDecisionMaker: isDMTitle(title) });
                if (node.email) allEmails.add(node.email);
                if (ph) allPhones.add(ph);
              }
            }
            if (['Organization','LocalBusiness','Corporation'].includes(type)) {
              if (node.email) allEmails.add(node.email);
              if (node.telephone) { const p = cleanPhone(node.telephone); if (p) allPhones.add(p); }
            }
          }
        } catch {}
      });

      // 2. Semantic team/person sections
      const TEAM_SELECTORS = [
        '.team-member,.staff-member,.person,.ekip-uyesi,.yonetici',
        '[itemtype*="Person"]',
        '.team .card,.team .item,.team-item,.team-box',
        '.management .member,.leadership .item,.board-member',
        '.about-team .col,.yonetim-kurulu .item',
      ];
      for (const sel of TEAM_SELECTORS) {
        $(sel).each((_: any, el: any) => {
          const name  = $(el).find('[itemprop="name"],.name,.isim,h3,h4,.card-title,.member-name').first().text().trim();
          const title = $(el).find('[itemprop="jobTitle"],.title,.position,.unvan,.role,.job-title,p').first().text().trim();
          const ph    = cleanPhone($(el).find('a[href^="tel:"]').attr('href')?.replace('tel:','') || '');
          const email = $(el).find('a[href^="mailto:"]').attr('href')?.replace('mailto:','').split('?')[0].trim() || '';
          if (!name || !isRealName(name) || seenNames.has(name.toLowerCase())) return;
          seenNames.add(name.toLowerCase());
          persons.push({ name, title: title || null, email: email || null, phone: ph || null, linkedinUrl: null, source: 'Website (Team)', confidence: 'high', isDecisionMaker: isDMTitle(title) });
          if (email) allEmails.add(email);
          if (ph) allPhones.add(ph);
        });
      }

      // 3. All tel: and mailto: links
      $('a[href^="tel:"]').each((_: any, el: any) => {
        const p = cleanPhone($(el).attr('href')?.replace('tel:','') || '');
        if (p && p.length >= 12) allPhones.add(p);
      });
      $('a[href^="mailto:"]').each((_: any, el: any) => {
        const e = $(el).attr('href')?.replace('mailto:','').split('?')[0].trim().toLowerCase();
        if (e && e.includes('@')) allEmails.add(e);
      });

      // 4. Body text extraction
      const body = $('body').text().replace(/\s+/g, ' ');
      extractPhones(body).forEach(p => allPhones.add(p));
      extractEmails(body).forEach(e => allEmails.add(e));

      // 5. LinkedIn profile links → name hint
      $('a[href*="linkedin.com/in/"]').each((_: any, el: any) => {
        const href = $(el).attr('href') || '';
        const name = ($(el).closest('[class]').find('h3,h4,.name').first().text()
                   || $(el).parent().prev('h3,h4,p').first().text()).trim();
        if (name && isRealName(name) && !seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase());
          persons.push({ name, title: null, email: null, phone: null, linkedinUrl: href, source: 'Website (LinkedIn link)', confidence: 'medium', isDecisionMaker: false });
        }
      });

      checked++;
      await sleep(250);
    } catch { checked++; }
  }

  // Filter emails: only keep own-domain or non-webmail
  const WEBMAIL = ['gmail.com','hotmail.com','yahoo.com','outlook.com','yandex.com','icloud.com','live.com'];
  const relevantEmails = [...allEmails].filter(e => {
    const dom = e.split('@')[1]?.toLowerCase();
    if (!dom) return false;
    if (dom === domain) return true;
    return !WEBMAIL.includes(dom);
  });

  return { persons, emails: relevantEmails, phones: [...allPhones], domain };
}

// ── RDAP / WHOIS ──────────────────────────────────────────────────────────────

async function rdapLookup(domain: string): Promise<{ emails: string[]; phones: string[] }> {
  try {
    const resp = await axios.get(`https://rdap.org/domain/${domain}`, { timeout: 7000, headers: { 'User-Agent': 'LeadFlow-AI/1.0' } });
    const txt = JSON.stringify(resp.data);
    return { emails: extractEmails(txt), phones: extractPhones(txt) };
  } catch { return { emails: [], phones: [] }; }
}

// ── Enhanced Google search ────────────────────────────────────────────────────

async function findViaGoogle(companyName: string, city: string, domain?: string): Promise<DecisionMaker[]> {
  const results: DecisionMaker[] = [];
  const seen = new Set<string>();

  const queries = [
    `"${companyName}" "genel müdür" OR "ceo" OR "kurucu" OR "sahip" OR "yönetici" telefon`,
    `"${companyName}" CEO OR founder OR director "${city}"`,
    `"${companyName}" "satın alma" OR "purchasing" OR "tedarik" müdür`,
    domain ? `"@${domain}" "${companyName}"` : null,
    `"${companyName}" yetkilisi iletişim site:firma.com.tr OR site:firmarehberi.com`,
  ].filter(Boolean) as string[];

  const NAME_RE = /([A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,20}(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,20}){1,2})/g;

  for (const q of queries) {
    try {
      for (const item of await googleCSE(q, 8)) {
        const text = item.title + ' ' + item.snippet;
        for (const m of text.matchAll(NAME_RE)) {
          const name = m[1].trim();
          if (!isRealName(name) || seen.has(name.toLowerCase())) continue;
          // Skip if it's likely a city/product name
          if (['İstanbul','Ankara','İzmir','Bursa','Antalya','Almanya','Türkiye'].some(c => name.includes(c))) continue;
          seen.add(name.toLowerCase());
          const titleHit = DM_TITLES.find(t => text.toLowerCase().includes(t));
          results.push({
            name, title: titleHit || null, email: null, phone: null,
            linkedinUrl: item.url.includes('linkedin.com') ? item.url : null,
            source: item.url.includes('linkedin.com') ? 'LinkedIn (Google)' : 'Google',
            confidence: item.url.includes('linkedin.com') ? 'medium' : 'low',
            isDecisionMaker: !!titleHit,
          });
        }
        for (const phone of extractPhones(text)) {
          results.push({ name: null, title: 'Yetkili', email: null, phone, linkedinUrl: null, source: 'Google', confidence: 'medium', isDecisionMaker: false });
        }
      }
      await sleep(150);
    } catch {}
  }
  return results;
}

// ── Email Pattern Engine (Hunter.io equivalent) ───────────────────────────────

function detectPattern(emails: string[], pairs: Array<{ first: string; last: string }>): { idx: number; conf: number } | null {
  if (!emails.length || !pairs.length) return null;
  const scores = new Array(EMAIL_PATTERNS.length).fill(0);
  let tested = 0;
  for (const email of emails) {
    const local = email.split('@')[0].toLowerCase();
    if (GENERIC_LOCAL.has(local)) continue;
    for (const { first, last } of pairs) {
      const nf = normNamePart(first);
      const nl = normNamePart(last);
      if (!nf || !nl || nf.length < 2 || nl.length < 2) continue;
      EMAIL_PATTERNS.forEach((gen, i) => { try { if (gen(nf, nl) === local) scores[i]++; } catch {} });
      tested++;
    }
  }
  if (!tested) return null;
  const max = Math.max(...scores);
  if (!max) return null;
  return { idx: scores.indexOf(max), conf: Math.min(max / tested, 1) };
}

function genEmail(firstName: string, lastName: string, domain: string, patIdx: number): string {
  const nf = normNamePart(firstName);
  const nl = normNamePart(lastName);
  if (!nf || !nl) return '';
  try { return `${EMAIL_PATTERNS[patIdx](nf, nl)}@${domain}`; } catch { return ''; }
}

// ── SMTP Verification (RCPT TO — no email sent) ───────────────────────────────

type SmtpStatus = 'valid' | 'invalid' | 'accept-all' | 'unknown';

async function smtpVerify(email: string): Promise<SmtpStatus> {
  const domain = email.split('@')[1];
  if (!domain) return 'unknown';

  let mxHost: string;
  try {
    const records = await dns.resolveMx(domain);
    if (!records?.length) return 'invalid';
    mxHost = records.sort((a: any, b: any) => a.priority - b.priority)[0].exchange;
  } catch { return 'unknown'; }

  return new Promise<SmtpStatus>(resolve => {
    const probe  = `probe${Date.now()}@${domain}`;
    let step = 0, buf = '', catchAll: boolean | null = null, done = false;

    const finish = (r: SmtpStatus) => {
      if (done) return; done = true;
      clearTimeout(timer);
      try { sock.destroy(); } catch {}
      resolve(r);
    };

    const sock  = net.createConnection({ host: mxHost, port: 25, timeout: 7000 });
    const timer = setTimeout(() => finish('unknown'), 10000);

    sock.on('error',   () => finish('unknown'));
    sock.on('timeout', () => finish('unknown'));

    sock.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      const lines = buf.split('\r\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3), 10);
        try {
          if      (step === 0 && code === 220) { sock.write('EHLO leadflow.ai\r\n');              step = 1; }
          else if (step === 1 && code === 250) { sock.write('MAIL FROM:<v@leadflow.ai>\r\n');     step = 2; }
          else if (step === 2 && code === 250) { sock.write(`RCPT TO:<${probe}>\r\n`);            step = 3; }
          else if (step === 3)                 { catchAll = code === 250; sock.write(`RCPT TO:<${email}>\r\n`); step = 4; }
          else if (step === 4) {
            sock.write('QUIT\r\n');
            if (catchAll)                                        finish('accept-all');
            else if (code === 250)                               finish('valid');
            else if ([550,551,552,553,554,450,452].includes(code)) finish('invalid');
            else                                                 finish('unknown');
          }
          else if ([421, 451].includes(code)) finish('unknown');
          else if (code >= 500 && step < 3)   finish('unknown');
        } catch {}
      }
    });
  });
}

// ── Email enrichment orchestrator ─────────────────────────────────────────────

async function enrichPersonEmails(
  persons: DecisionMaker[],
  knownEmails: string[],
  domain: string,
): Promise<DecisionMaker[]> {
  if (!domain) return persons;

  // Build name-pair hints from known email locals
  const pairs: Array<{ first: string; last: string }> = [];
  for (const em of knownEmails) {
    if (!em.endsWith(`@${domain}`)) continue;
    const local = em.split('@')[0];
    if (GENERIC_LOCAL.has(local)) continue;
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) pairs.push({ first: parts[0], last: parts[parts.length - 1] });
  }

  // Also add pairs from persons who already have domain emails
  for (const p of persons) {
    if (p.email?.endsWith(`@${domain}`) && p.name) {
      const pts = p.name.trim().split(/\s+/);
      if (pts.length >= 2) pairs.push({ first: pts[0], last: pts[pts.length - 1] });
    }
  }

  const pattern = detectPattern(knownEmails.filter(e => e.endsWith(`@${domain}`)), pairs);

  // Generate candidates for persons without email
  const candidates: Array<{ person: DecisionMaker; email: string }> = [];
  for (const p of persons) {
    if (p.email || !p.name) continue;
    const pts = p.name.trim().split(/\s+/);
    if (pts.length < 2) continue;
    const [first, ...rest] = pts;
    const last = rest[rest.length - 1];

    if (pattern && pattern.conf >= 0.4) {
      const cand = genEmail(first, last, domain, pattern.idx);
      if (cand) candidates.push({ person: p, email: cand });
    } else {
      // No pattern — try 3 most common: first.last, firstlast, flast
      for (const pi of [0, 1, 3]) {
        const cand = genEmail(first, last, domain, pi);
        if (cand) { candidates.push({ person: p, email: cand }); break; }
      }
    }
  }

  // SMTP verify in batches of 3
  for (let i = 0; i < candidates.length; i += 3) {
    await Promise.allSettled(candidates.slice(i, i + 3).map(async ({ person, email }) => {
      try {
        const status = await smtpVerify(email);
        console.log(`[SMTP] ${email} → ${status}`);
        if (status === 'valid' || status === 'accept-all') {
          person.email       = email;
          person.emailStatus = status;
          if (status === 'valid') person.confidence = 'high';
        }
      } catch {}
    }));
  }

  return persons;
}

// ── Result merger ─────────────────────────────────────────────────────────────

function merge(all: DecisionMaker[]): DecisionMaker[] {
  const byName  = new Map<string, number>();
  const byPhone = new Map<string, number>();
  const byEmail = new Map<string, number>();
  const merged: DecisionMaker[] = [];
  const CONF: Record<string, number> = { high: 3, medium: 2, low: 1 };

  const sorted = [
    ...all.filter(r => r.isDecisionMaker && isRealName(r.name)),
    ...all.filter(r => !r.isDecisionMaker && isRealName(r.name)),
    ...all.filter(r => !r.name && (r.phone || r.email)),
  ];

  for (const item of sorted) {
    const nk = item.name ? latinize(item.name).toLowerCase().replace(/\s+/g, '') : null;
    const pk = item.phone  || null;
    const ek = item.email?.toLowerCase() || null;

    let dup: number | undefined;
    if (nk && nk.length > 4 && byName.has(nk))  dup = byName.get(nk);
    else if (pk && byPhone.has(pk))               dup = byPhone.get(pk);
    else if (ek && byEmail.has(ek))               dup = byEmail.get(ek);

    if (dup !== undefined) {
      const ex = merged[dup];
      ex.email       = ex.email       || item.email;
      ex.phone       = ex.phone       || item.phone;
      ex.title       = ex.title       || item.title;
      ex.linkedinUrl = ex.linkedinUrl || item.linkedinUrl;
      ex.isDecisionMaker = ex.isDecisionMaker || item.isDecisionMaker;
      if ((CONF[item.confidence] || 0) > (CONF[ex.confidence] || 0)) ex.confidence = item.confidence;
    } else {
      const idx = merged.length;
      merged.push({ ...item });
      if (nk && nk.length > 4) byName.set(nk, idx);
      if (pk) byPhone.set(pk, idx);
      if (ek) byEmail.set(ek, idx);
    }
  }

  return merged.sort((a, b) => {
    if (a.isDecisionMaker !== b.isDecisionMaker) return a.isDecisionMaker ? -1 : 1;
    return (CONF[b.confidence] || 0) - (CONF[a.confidence] || 0);
  });
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

async function findDecisionMakers(params: { companyName: string; website?: string; city?: string }): Promise<DecisionMaker[]> {
  const { companyName, website, city = '' } = params;
  console.log(`[DM] Searching: ${companyName}`);

  // Phase 1 — parallel data collection
  const [liRes, webRes, googleRes] = await Promise.allSettled([
    findViaLinkedInVoyager(companyName),
    website ? scrapeWebsite(website, companyName) : Promise.resolve({ persons: [], emails: [], phones: [], domain: '' }),
    findViaGoogle(companyName, city, website ? getDomain(website) : undefined),
  ]);

  let liPersons    = liRes.status    === 'fulfilled' ? liRes.value    : [];
  const webData    = webRes.status   === 'fulfilled' ? webRes.value   : { persons: [], emails: [], phones: [], domain: '' };
  const googlePers = googleRes.status === 'fulfilled' ? googleRes.value : [];

  // LinkedIn Voyager fallback → Google-indexed LinkedIn
  if (liPersons.length === 0) {
    liPersons = await findViaLinkedInGoogle(companyName);
  }

  // RDAP lookup
  const rdap = webData.domain ? await rdapLookup(webData.domain).catch(() => ({ emails: [], phones: [] })) : { emails: [], phones: [] };

  // Phone-only records from website & RDAP
  const phoneRecords: DecisionMaker[] = [
    ...webData.phones.map(p => ({ name: null, title: 'Şirket Hattı',      email: null, phone: p, linkedinUrl: null, source: 'Website',    confidence: 'high'   as const, isDecisionMaker: false })),
    ...rdap.phones.map(p   => ({ name: null, title: 'Kayıt İletişim',     email: null, phone: p, linkedinUrl: null, source: 'RDAP/WHOIS', confidence: 'medium' as const, isDecisionMaker: false })),
  ];

  // Collect all persons
  let all: DecisionMaker[] = [
    ...liPersons,
    ...webData.persons,
    ...googlePers,
    ...phoneRecords,
  ];

  // Phase 2 — email enrichment (pattern detection + SMTP verification)
  const knownEmails = [...webData.emails, ...rdap.emails];
  if (webData.domain) {
    all = await enrichPersonEmails(all, knownEmails, webData.domain);
  }

  // Generic contact emails as standalone results
  for (const em of knownEmails) {
    const local = em.split('@')[0].toLowerCase();
    if (GENERIC_LOCAL.has(local)) {
      all.push({ name: null, title: 'Genel İletişim', email: em, phone: null, linkedinUrl: null, source: 'Email', confidence: 'medium', isDecisionMaker: false });
    }
  }

  const results = merge(all).slice(0, 50);
  console.log(`[DM] Done: ${results.length} results (${results.filter(r => r.isDecisionMaker).length} DM, ${results.filter(r => r.email).length} emails, ${results.filter(r => r.phone).length} phones)`);
  return results;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// LinkedIn-only employee search (no website/Google)
router.post('/linkedin', async (req: any, res: any) => {
  try {
    const { companyName, leadId } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    // 1. LinkedIn Voyager API (direct)
    let employees = await findViaLinkedInVoyager(companyName);

    // 2. Fallback: Google-indexed LinkedIn profiles
    if (employees.length === 0) {
      employees = await findViaLinkedInGoogle(companyName);
    }

    // 3. Auto-save best DM if leadId provided
    if (leadId && employees.length > 0) {
      const best = employees.find(e => e.isDecisionMaker && isRealName(e.name)) || employees[0];
      const upd: any = {};
      if (best.name  && isRealName(best.name)) upd.contact_name = best.name;
      if (best.phone) upd.phone = best.phone;
      if (best.email) upd.email = best.email;
      if (Object.keys(upd).length) {
        await supabase.from('leads').update(upd).eq('id', leadId).eq('user_id', req.userId);
      }
    }

    res.json({ company: companyName, found: employees.length, employees });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/find', async (req: any, res: any) => {
  try {
    const { companyName, website, city, leadId } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    const dms = await findDecisionMakers({ companyName, website, city });

    if (leadId && dms.length > 0) {
      const best = dms.find(r => r.isDecisionMaker && isRealName(r.name)) || dms[0];
      const upd: any = {};
      if (best.name  && isRealName(best.name)) upd.contact_name = best.name;
      if (best.email) upd.email = best.email;
      if (best.phone) upd.phone = best.phone;
      if (Object.keys(upd).length) {
        upd.notes = `KV: ${best.name || best.email || best.phone} (${best.title || '-'}) · ${best.source}${best.emailStatus === 'valid' ? ' ✓' : ''}`;
        await supabase.from('leads').update(upd).eq('id', leadId).eq('user_id', req.userId);
      }
    }

    res.json({ company: companyName, found: dms.length, decisionMakers: dms });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/batch', async (req: any, res: any) => {
  try {
    const { leadIds, maxLeads = 20 } = req.body;
    let q = supabase.from('leads').select('id,company_name,website,city,contact_name,score').eq('user_id', req.userId).is('contact_name', null);
    if (leadIds?.length) {
      q = q.in('id', leadIds); // explicit selection — no arbitrary limit
    } else {
      q = q.limit(maxLeads);
    }
    const { data: leads, error } = await q;
    if (error) throw error;
    if (!leads?.length) return res.json({ message: 'Taranacak lead yok', updated: 0 });

    let updated = 0;
    const results = [];
    for (const lead of leads) {
      try {
        const dms = await findDecisionMakers({ companyName: lead.company_name, website: lead.website, city: lead.city });
        if (dms.length > 0) {
          const best = dms.find(r => r.isDecisionMaker && isRealName(r.name)) || dms[0];
          const upd: any = { score: Math.min((lead.score || 50) + 15, 100) };
          if (best.name  && isRealName(best.name)) upd.contact_name = best.name;
          if (best.email) upd.email = best.email;
          if (best.phone) upd.phone = best.phone;
          upd.notes = `KV: ${best.name || best.email || best.phone} (${best.title || '-'}) · ${best.source}`;
          await supabase.from('leads').update(upd).eq('id', lead.id);
          results.push({ id: lead.id, company: lead.company_name, name: best.name, title: best.title, phone: best.phone, email: best.email, source: best.source });
          updated++;
        }
        await sleep(1800);
      } catch (e: any) { console.error(`[DM] ${lead.company_name}:`, e.message); }
    }
    res.json({ message: `${updated}/${leads.length} lead güncellendi`, updated, results });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req: any, res: any) => {
  try {
    const uid = req.userId;
    const [{ count: total }, { count: withContact }, { count: withEmail }, { count: withPhone }] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', uid).not('contact_name', 'is', null),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', uid).not('email', 'is', null),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', uid).not('phone', 'is', null),
    ]);
    res.json({ totalLeads: total || 0, withContact: withContact || 0, withEmail: withEmail || 0, withPhone: withPhone || 0, coverageRate: total ? Math.round(((withContact || 0) / total) * 100) : 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Public diagnostic — no auth
// Usage: GET /api/decision-maker/test-linkedin?company=Microsoft
router.get('/test-linkedin', async (req: any, res: any) => {
  const t0 = Date.now();
  liSession = null;

  const hasProxy  = !!process.env.LINKEDIN_PROXY_URL;
  const hasApify  = !!process.env.APIFY_TOKEN;
  const hasLiAt   = !!LINKEDIN_LI_AT;
  const testCompany = (req.query.company as string) || 'Microsoft';

  const report: any = {
    config: {
      LINKEDIN_LI_AT: hasLiAt ? 'set' : 'MISSING',
      LINKEDIN_PROXY_URL: hasProxy ? process.env.LINKEDIN_PROXY_URL!.replace(/:[^:@]+@/, ':***@') : 'not set — Voyager API blocked on Railway without this',
      APIFY_TOKEN: hasApify ? 'set (Layer 2 active)' : 'not set (Layer 2 disabled)',
    },
    explanation: 'Railway datacenter IPs are blocked by LinkedIn (returns 404). Set LINKEDIN_PROXY_URL to a residential proxy to enable Voyager API. Without proxy, system uses Google+Apify fallback.',
    tests: {},
    durationMs: 0,
  };

  if (!hasLiAt) {
    report.tests.session = { ok: false, error: 'LINKEDIN_LI_AT not set' };
  } else {
    // Session test
    const s = await getLiSession();
    if (!s) {
      report.tests.session = { ok: false, error: hasProxy ? 'Session failed — check proxy + li_at validity' : 'Session failed — likely IP blocked (add LINKEDIN_PROXY_URL)' };
    } else {
      report.tests.session = { ok: true, csrf: s.csrf.slice(0, 18) + '...' };

      // Voyager typeahead test
      try {
        const r = await axios.get('https://www.linkedin.com/voyager/api/typeahead/hits',
          { ...liAxiosConfig(s), params: { keywords: testCompany, q: 'type', type: 'COMPANY', useCase: 'PEOPLE_SEARCH' } }
        );
        const id = r.data?.elements?.length ? extractCompanyId(r.data.elements[0]) : null;
        report.tests.voyager_company = { ok: true, results: r.data?.elements?.length || 0, sampleId: id };
      } catch (e: any) {
        report.tests.voyager_company = { ok: false, status: e.response?.status, error: e.message?.slice(0, 80),
          hint: e.response?.status === 404 ? 'IP blocked by LinkedIn — add LINKEDIN_PROXY_URL' : 'Check li_at validity' };
      }

      // Voyager people search test
      try {
        const r = await axios.get('https://www.linkedin.com/voyager/api/search/blended',
          { ...liAxiosConfig(s), params: { keywords: testCompany, q: 'people', count: 5, origin: 'GLOBAL_SEARCH_HEADER' } }
        );
        const people = extractPeopleFromBlended(r.data);
        report.tests.voyager_people = { ok: true, results: people.length, sample: people[0]?.name || null };
      } catch (e: any) {
        report.tests.voyager_people = { ok: false, status: e.response?.status, error: e.message?.slice(0, 80) };
      }
    }
  }

  // Google → LinkedIn URL test (always works)
  try {
    const items = await googleCSE(`site:linkedin.com/in "${testCompany}" CEO OR director`, 3);
    const urls = items.filter(i => i.url.includes('linkedin.com/in/')).map(i => i.url);
    report.tests.google_linkedin = { ok: true, urlsFound: urls.length, sample: urls[0] || null };
  } catch (e: any) {
    report.tests.google_linkedin = { ok: false, error: e.message?.slice(0, 80) };
  }

  report.durationMs = Date.now() - t0;
  report.testCompany = testCompany;
  res.json(report);
});

module.exports = router;
