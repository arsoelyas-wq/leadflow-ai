export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios    = require('axios');
const cheerio  = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Correct base URL and auth header from official docs (linkdapi.com/docs)
const LINKDAPI_BASE = 'https://linkdapi.com';
const LINKDAPI_KEY  = process.env.LINKDAPI_KEY;
const HUNTER_KEY    = process.env.HUNTER_API_KEY;

// ── Types ─────────────────────────────────────────────────────────────────────

interface DMResult {
  firstName:   string;
  lastName:    string;
  fullName:    string;
  title:       string | null;
  email:       string | null;
  phone:       string | null;
  linkedinUrl: string | null;
  confidence:  number; // 0-100
  source:      string;
}

interface DMJob {
  status:    'running' | 'done' | 'error';
  total:     number;
  completed: number;
  results:   Array<{ leadId: string; company: string; found: boolean; name?: string; title?: string; email?: string }>;
  error?:    string;
  startedAt: number;
}

const jobs = new Map<string, DMJob>();
setInterval(() => {
  const cut = Date.now() - 4 * 60 * 60 * 1000;
  for (const [id, j] of jobs) if (j.startedAt < cut) jobs.delete(id);
}, 30 * 60 * 1000);

// Simple in-memory Google CSE cache (1 hour) to avoid 429s
const googleCache = new Map<string, { results: string[]; ts: number }>();
const GOOGLE_CACHE_TTL = 60 * 60 * 1000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Decision maker title keywords ─────────────────────────────────────────────

const DM_KW_EN = ['ceo','coo','cfo','cto','cmo','founder','co-founder','owner',
  'president','vice president','vp','managing director','general manager','head of',
  'chief','partner','principal','director','procurement','purchasing','buying',
  'supply chain','business development'];

const DM_KW_TR = ['genel müdür','yönetim kurulu','icra kurulu','kurucu','ortak',
  'direktör','başkan','yönetici','satın alma müdürü','tedarik müdürü',
  'satış müdürü','satış direktörü','pazarlama müdürü','pazarlama direktörü',
  'ticaret müdürü','ihracat müdürü','fabrika müdürü','üretim müdürü',
  'işletme müdürü','finans müdürü','müdürü','direktörü','kurucusu','sahibi'];

function isDM(title: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return [...DM_KW_EN, ...DM_KW_TR].some(k => t.includes(k));
}

// ── Text utilities ─────────────────────────────────────────────────────────────

function latinize(s: string): string {
  return s.replace(/[çÇ]/g,'c').replace(/[ğĞ]/g,'g')
    .replace(/[ıİ]/g,'i').replace(/[öÖ]/g,'o')
    .replace(/[şŞ]/g,'s').replace(/[üÜ]/g,'u')
    .normalize('NFD').replace(/[̀-ͯ]/g,'');
}

function normName(s: string): string {
  return latinize(s).toLowerCase().replace(/[^a-z]/g,'');
}

function isRealName(name: string | null): boolean {
  if (!name || name.length < 4 || name.length > 60) return false;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return false;
  if (/^\d/.test(name)) return false;
  if (name.includes('@') || name.includes('http') || name.includes('.com')) return false;
  return true;
}

function extractDomain(website: string): string {
  try {
    const u = website.startsWith('http') ? website : `https://${website}`;
    return new URL(u).hostname.replace(/^www\./,'');
  } catch {
    return website.replace(/^(?:https?:\/\/)?(?:www\.)?/,'').split('/')[0];
  }
}

function extractEmails(text: string, domain?: string): string[] {
  const re = /\b[a-zA-Z0-9][a-zA-Z0-9._%+\-]{0,48}@[a-zA-Z0-9][a-zA-Z0-9.\-]{0,48}\.[a-zA-Z]{2,6}\b/g;
  const WEBMAIL = ['gmail.com','hotmail.com','yahoo.com','outlook.com','yandex.com','icloud.com','live.com'];
  const JUNK    = ['example.com','test.com','domain.com','google.com','sentry.io','wordpress.com'];
  return [...new Set(text.match(re) || [])].filter(e => {
    const [local, dom] = e.split('@');
    if (!dom || e.length > 80) return false;
    if (JUNK.includes(dom.toLowerCase())) return false;
    if (/\.(jpg|png|gif|svg|css|js)$/i.test(dom)) return false;
    if (local.length < 2) return false;
    if (domain && dom.toLowerCase() === domain) return true;
    return !WEBMAIL.includes(dom.toLowerCase());
  });
}

const EMAIL_PATS: Array<(f: string, l: string) => string> = [
  (f,l) => `${f}.${l}`, (f,l) => `${f}${l}`, (f,l) => f,
  (f,l) => `${f[0]}${l}`, (f,l) => `${f}_${l}`, (f,l) => `${f[0]}.${l}`,
];

const GENERIC_LOCAL = new Set(['info','contact','hello','mail','email','admin','support','sales',
  'iletisim','bilgi','hizmet','destek','rezervasyon','muhasebe','hr','webmaster','noreply','no-reply',
  'satis','kariyer','careers','press','marketing','pazarlama','teknik','service','help','billing']);

// ── Claude AI helper ───────────────────────────────────────────────────────────

async function claudeAnalyze(prompt: string, maxTokens = 300): Promise<string> {
  const Anthropic = require('@anthropic-ai/sdk');
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await ai.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return r.content[0]?.text?.trim() || '';
}

// ── LinkdAPI helper (correct URL + auth) ──────────────────────────────────────

async function linkd(path: string, params: any = {}): Promise<any> {
  if (!LINKDAPI_KEY) throw new Error('LINKDAPI_KEY not set');
  const r = await axios.get(`${LINKDAPI_BASE}${path}`, {
    headers: { 'X-linkdapi-apikey': LINKDAPI_KEY },
    params,
    timeout: 15000,
  });
  return r.data?.data ?? r.data;
}

const GOOGLE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

// ── Step 1: Find LinkedIn profile URLs via direct Google HTML scraping ─────────
// No API key needed — no daily quota limits.

async function googleLinkedInSearch(query: string): Promise<string[]> {
  const cacheKey = query;
  const cached = googleCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < GOOGLE_CACHE_TTL) return cached.results;

  try {
    const r = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&num=8&hl=tr`,
      { headers: GOOGLE_HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(r.data);
    const urls: string[] = [];

    // Extract href from all anchor tags in result divs
    $('a[href]').each((_: any, el: any) => {
      const href = $(el).attr('href') || '';
      // Google wraps URLs in /url?q=... or exposes them directly
      const match = href.match(/(?:\/url\?q=)?(https?:\/\/(?:www\.)?linkedin\.com\/in\/[^&"'\s/]+)/);
      if (match) {
        const url = decodeURIComponent(match[1]).split('?')[0];
        if (!urls.includes(url)) urls.push(url);
      }
    });

    googleCache.set(cacheKey, { results: urls, ts: Date.now() });
    console.log(`[DMFinder] Google HTML found ${urls.length} LinkedIn URLs`);
    return urls;
  } catch (e: any) {
    console.warn(`[DMFinder] Google HTML scrape:`, e.message?.slice(0, 60));
    return [];
  }
}

async function findDMProfileUrls(companyName: string): Promise<string[]> {
  // Strip Turkish legal suffixes + special chars + limit length
  const shortName = companyName
    .replace(/[|&]/g, ' ')
    .replace(/\s+(A\.Ş\.|Ltd\.?|Ş\.?T\.?İ\.?|ve Tic\.?|San\.?|Dış Tic\.?|İnş\.?)\s*/gi, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 45);

  const seen = new Set<string>();
  const urls: string[] = [];

  const addUrls = (found: string[]) => {
    for (const u of found) if (!seen.has(u)) { seen.add(u); urls.push(u); }
  };

  // English DM titles query
  const q1 = `site:linkedin.com/in "${shortName}" (CEO OR founder OR director OR "general manager" OR owner OR "managing director" OR "procurement")`;
  addUrls(await googleLinkedInSearch(q1));
  await sleep(700);

  // Turkish DM titles query (only if first query found nothing)
  if (urls.length === 0) {
    const q2 = `site:linkedin.com/in "${shortName}" (kurucu OR "genel müdür" OR direktör OR "satın alma" OR yönetici OR sahibi)`;
    addUrls(await googleLinkedInSearch(q2));
    await sleep(700);
  }

  console.log(`[DMFinder] Google found ${urls.length} profile URLs for "${shortName}"`);
  return urls.slice(0, 5);
}

// ── Step 2: Fetch profile via LinkdAPI ────────────────────────────────────────

async function fetchProfile(profileUrl: string): Promise<any | null> {
  if (!LINKDAPI_KEY || !profileUrl) return null;
  const username = profileUrl.split('/in/').pop()?.replace(/[\/?#].*/,'');
  if (!username || username.length < 2) return null;

  try {
    const data = await linkd('/api/v1/profile/full', { username });
    console.log(`[DMFinder] LinkdAPI profile OK: ${username}`);
    return { ...data, profileUrl };
  } catch (e: any) {
    console.warn(`[DMFinder] LinkdAPI profile/${username}:`, e.response?.status || e.message?.slice(0,50));
  }

  try {
    const data = await linkd('/api/v1/profile/overview', { username });
    return { ...data, profileUrl };
  } catch {}

  return null;
}

// ── Step 3: Get contact info ──────────────────────────────────────────────────

async function fetchContactInfo(profileUrl: string): Promise<any | null> {
  if (!LINKDAPI_KEY) return null;
  const username = profileUrl.split('/in/').pop()?.replace(/[\/?#].*/,'');
  if (!username) return null;
  try {
    return await linkd('/api/v1/profile/contact-info', { username });
  } catch { return null; }
}

// ── Step 4: Email enrichment ──────────────────────────────────────────────────

async function enrichEmail(firstName: string, lastName: string, website?: string): Promise<string | null> {
  if (!website) return null;
  const domain = extractDomain(website);
  const fLow   = firstName.toLowerCase();
  const lLow   = lastName.toLowerCase();

  // A: scrape company website pages
  const pages = [
    `https://${domain}/iletisim`, `https://${domain}/contact`,
    `https://${domain}/hakkimizda`, `https://${domain}/about`,
    `https://${domain}/ekip`, `https://${domain}/team`,
    `https://${domain}`,
  ];
  for (const url of pages) {
    try {
      const r = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' }, maxRedirects: 2 });
      const emails = extractEmails(r.data, domain);
      const personal = emails.find(e => {
        const local = e.split('@')[0].toLowerCase();
        return local.includes(fLow) || local.includes(lLow) || local === `${fLow[0]}${lLow}` || local === `${fLow}.${lLow}`;
      });
      if (personal) return personal;
      const biz = emails.find(e => !GENERIC_LOCAL.has(e.split('@')[0].toLowerCase()) && e.endsWith(`@${domain}`));
      if (biz) return biz;
    } catch {}
  }

  // B: Hunter.io
  if (HUNTER_KEY) {
    try {
      const r = await axios.get('https://api.hunter.io/v2/email-finder', {
        params: { domain, first_name: firstName, last_name: lastName, api_key: HUNTER_KEY },
        timeout: 8000,
      });
      if (r.data.data?.email) return r.data.data.email;
    } catch {}
  }

  // C: generate most likely pattern (first.last@domain) + MX check
  const f = normName(firstName);
  const l = normName(lastName);
  if (f.length >= 2 && l.length >= 2) {
    const candidates = EMAIL_PATS.slice(0, 3).map(p => { try { return `${p(f,l)}@${domain}`; } catch { return ''; } }).filter(Boolean);
    for (const cand of candidates) {
      try {
        const r = await axios.get(`https://dns.google/resolve?name=${domain}&type=MX`, { timeout: 3000 });
        if ((r.data.Answer || []).length > 0) return cand;
      } catch {}
      break;
    }
  }

  return null;
}

// ── Step 5: Website DM fallback ───────────────────────────────────────────────

async function findDMFromWebsite(website: string, companyName: string): Promise<DMResult | null> {
  if (!website) return null;
  const domain = extractDomain(website);
  const pages = [
    `https://${domain}/hakkimizda`, `https://${domain}/about`,
    `https://${domain}/ekip`,       `https://${domain}/team`,
    `https://${domain}/yonetim`,    `https://${domain}/management`,
    `https://${domain}`,
  ];

  for (const url of pages) {
    try {
      const r = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(r.data);
      $('script,style,noscript').remove();
      const text = $('body').text().replace(/\s+/g,' ').slice(0, 3000);

      // JSON-LD Person
      let found: DMResult | null = null;
      $('script[type="application/ld+json"]').each((_: any, el: any) => {
        try {
          const raw = JSON.parse($(el).html() || '{}');
          const nodes = Array.isArray(raw) ? raw : raw['@graph'] ? raw['@graph'] : [raw];
          for (const node of nodes) {
            if ((node['@type'] === 'Person' || node['@type'] === 'Employee') && isRealName(node.name)) {
              const parts = (node.name || '').trim().split(/\s+/);
              found = {
                firstName: parts[0], lastName: parts.slice(1).join(' '), fullName: node.name,
                title: node.jobTitle || null, email: node.email || null, phone: null,
                linkedinUrl: null, confidence: 70, source: 'Website (JSON-LD)',
              };
            }
          }
        } catch {}
      });
      if (found) return found;

      // Claude extraction
      if (text.length > 200 && process.env.ANTHROPIC_API_KEY) {
        try {
          const prompt = `Find the decision maker (CEO, General Manager, Owner, Kurucu, Genel Müdür) from this company page.
Text: ${text}
Return JSON: {"firstName":"...","lastName":"...","title":"..."} or null if no real person found.`;
          const reply = await claudeAnalyze(prompt, 200);
          if (reply && reply !== 'null') {
            const m = reply.match(/\{[\s\S]*?\}/);
            if (m) {
              const p = JSON.parse(m[0]);
              if (p.firstName && isRealName(`${p.firstName} ${p.lastName}`)) {
                return {
                  firstName: p.firstName, lastName: p.lastName || '',
                  fullName: `${p.firstName} ${p.lastName || ''}`.trim(),
                  title: p.title || null, email: extractEmails(text, domain)[0] || null,
                  phone: null, linkedinUrl: null, confidence: 50, source: 'Website (Claude)',
                };
              }
            }
          }
        } catch {}
      }
    } catch {}
  }
  return null;
}

// ── Main chain ─────────────────────────────────────────────────────────────────

async function runChain(lead: any, userId: string): Promise<DMResult[]> {
  const { company_name, website } = lead;
  console.log(`[DMFinder] ── START: ${company_name} ──`);

  const results: DMResult[] = [];

  // Step 1: find LinkedIn profile URLs via Google HTML scraping
  const profileUrls = await findDMProfileUrls(company_name);

  if (profileUrls.length > 0 && LINKDAPI_KEY) {
    // Step 2+3: fetch profile + contact info for each URL
    for (const url of profileUrls.slice(0, 3)) {
      await sleep(500);
      const profile = await fetchProfile(url);
      if (!profile) continue;

      const firstName = profile.firstName || profile.first_name || '';
      const lastName  = profile.lastName  || profile.last_name  || '';
      const title     = profile.headline  || profile.title      || profile.currentPosition || null;

      if (!isRealName(`${firstName} ${lastName}`)) continue;

      // Only keep if looks like a DM (or if few results)
      if (results.length > 0 && !isDM(title || '')) continue;

      await sleep(300);
      const contact = await fetchContactInfo(url);
      let email = contact?.email || profile.email || null;
      let phone = contact?.phone || profile.phone || null;

      // Step 4: enrich email if missing
      if (!email && website) {
        email = await enrichEmail(firstName, lastName, website);
      }

      const confidence = calcConfidence(firstName, lastName, title, email, url);
      results.push({
        firstName, lastName, fullName: `${firstName} ${lastName}`.trim(),
        title, email, phone, linkedinUrl: url,
        confidence, source: 'LinkedIn (LinkdAPI)',
      });
    }
  }

  // Fallback: website scraping
  if (results.length === 0 && website) {
    console.log(`[DMFinder] No LinkedIn results — trying website fallback`);
    const webDM = await findDMFromWebsite(website, company_name);
    if (webDM) {
      if (!webDM.email) webDM.email = await enrichEmail(webDM.firstName, webDM.lastName, website);
      results.push(webDM);
    }
  }

  if (results.length > 0) {
    await saveDMToLead(lead, userId, results[0]);
  }

  console.log(`[DMFinder] Done: ${results.length} DMs for "${company_name}"`);
  return results;
}

// ── Save best DM to lead ──────────────────────────────────────────────────────

async function saveDMToLead(lead: any, userId: string, dm: DMResult) {
  const upd: any = { updated_at: new Date().toISOString() };
  if (dm.fullName) upd.contact_name = dm.fullName;
  if (dm.email)    upd.email        = dm.email;
  if (dm.phone)    upd.phone        = dm.phone;

  if (dm.linkedinUrl) {
    const currentNotes = lead.notes || '';
    if (!currentNotes.includes('[LI:')) {
      upd.notes = `[LI: ${dm.linkedinUrl}]` + (currentNotes ? ` ${currentNotes}` : '');
    }
  }

  if (lead.score !== undefined) upd.score = Math.min((lead.score || 50) + 15, 100);

  await supabase.from('leads').update(upd).eq('id', lead.id).eq('user_id', userId);
}

function calcConfidence(first: string, last: string, title: string | null, email: string | null, linkedin: string | null): number {
  let s = 0;
  if (first)   s += 20;
  if (last)    s += 15;
  if (title)   s += 20;
  if (email)   s += 30;
  if (linkedin) s += 15;
  return s;
}

// ── Background bulk job ────────────────────────────────────────────────────────

async function runBulkJob(jobId: string, leadIds: string[], userId: string) {
  const job = jobs.get(jobId)!;
  const { data: leads } = await supabase.from('leads').select('*').in('id', leadIds).eq('user_id', userId);

  for (const lead of leads || []) {
    try {
      const dms = await runChain(lead, userId);
      job.completed++;
      if (dms.length > 0) {
        job.results.push({ leadId: lead.id, company: lead.company_name, found: true, name: dms[0].fullName, title: dms[0].title || undefined, email: dms[0].email || undefined });
      } else {
        job.results.push({ leadId: lead.id, company: lead.company_name, found: false });
      }
      await sleep(1500); // rate limit between leads
    } catch (e: any) {
      job.completed++;
      job.results.push({ leadId: lead.id, company: lead.company_name, found: false });
      console.error(`[DMFinder] Bulk error (${lead.company_name}):`, e.message?.slice(0,80));
    }
  }

  job.status = 'done';
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/decision-maker-finder/find
router.post('/find', async (req: any, res: any) => {
  try {
    const { leadId } = req.body;
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const dms = await runChain(lead, req.userId);

    res.json({
      ok: true, leadId,
      company:        lead.company_name,
      found:          dms.length,
      decisionMakers: dms,
      hasLinkedIn:    !!(dms[0]?.linkedinUrl),
      bestName:       dms[0]?.fullName  || null,
      bestTitle:      dms[0]?.title     || null,
      bestEmail:      dms[0]?.email     || null,
    });
  } catch (e: any) {
    console.error('[DMFinder] /find error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/decision-maker-finder/bulk
router.post('/bulk', async (req: any, res: any) => {
  try {
    const { leadIds } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead ID listesi boş' });
    if (leadIds.length > 50) return res.status(400).json({ error: 'Maksimum 50 lead seçilebilir' });

    const jobId = uuidv4();
    jobs.set(jobId, { status: 'running', total: leadIds.length, completed: 0, results: [], startedAt: Date.now() });

    runBulkJob(jobId, leadIds, req.userId).catch(e => {
      const j = jobs.get(jobId);
      if (j) { j.status = 'error'; j.error = e.message; }
    });

    res.json({
      ok: true, jobId,
      total: leadIds.length,
      message: `${leadIds.length} lead için karar verici aranıyor...`,
      estimatedMinutes: Math.ceil(leadIds.length * 0.6),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/decision-maker-finder/job/:jobId
router.get('/job/:jobId', (req: any, res: any) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'İş bulunamadı' });
  res.json({
    status:    job.status,
    total:     job.total,
    completed: job.completed,
    pct:       job.total ? Math.round((job.completed / job.total) * 100) : 0,
    results:   job.results,
    error:     job.error,
  });
});

// GET /api/decision-maker-finder/status
router.get('/status', (_req: any, res: any) => {
  res.json({
    linkdapi:   !!LINKDAPI_KEY,
    hunter:     !!HUNTER_KEY,
    googleScrape: true, // always available — no API key needed
    anthropic:  !!process.env.ANTHROPIC_API_KEY,
    linkdapiBase: LINKDAPI_BASE,
    mode: LINKDAPI_KEY ? 'full (Google scrape → LinkdAPI profile → Hunter.io)' : 'fallback (Google scrape → website scraping)',
  });
});

module.exports = router;
