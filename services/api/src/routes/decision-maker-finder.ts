export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios    = require('axios');
const cheerio  = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const LINKDAPI_KEY  = process.env.LINKDAPI_KEY;
const LINKDAPI_BASE = 'https://api.linkdapi.com/v1';
const GOOGLE_KEY    = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
const GOOGLE_CX     = process.env.GOOGLE_SEARCH_ENGINE_ID;
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

interface CompanyInfo {
  linkedinUrl:   string;
  companyId:     string;
  employeeCount: number;
  industry:      string;
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
    if (domain && dom.toLowerCase() === domain) return true; // own domain always ok
    return !WEBMAIL.includes(dom.toLowerCase());
  });
}

const EMAIL_PATS: Array<(f: string, l: string) => string> = [
  (f,l) => `${f}.${l}`, (f,l) => `${f}${l}`, (f,l) => f,
  (f,l) => `${f[0]}${l}`, (f,l) => `${f}_${l}`, (f,l) => `${f[0]}.${l}`,
  (f,l) => `${l}.${f}`, (f,l) => l,
];

const GENERIC_LOCAL = new Set(['info','contact','hello','mail','email','admin','support','sales',
  'iletisim','bilgi','hizmet','destek','rezervasyon','muhasebe','hr','webmaster','noreply','no-reply',
  'satis','kariyer','careers','press','marketing','pazarlama','teknik','service','help','billing']);

// ── Step 0: Anthropic client helper ───────────────────────────────────────────

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

// ── Step 0B: LinkdAPI request helper ─────────────────────────────────────────

async function linkd(endpoint: string, params: any = {}): Promise<any> {
  if (!LINKDAPI_KEY) throw new Error('LINKDAPI_KEY not set');
  const r = await axios.get(`${LINKDAPI_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${LINKDAPI_KEY}`, 'Content-Type': 'application/json' },
    params,
    timeout: 15000,
  });
  return r.data;
}

// ── Step 1: Find company LinkedIn page ────────────────────────────────────────

async function findCompanyLinkedIn(companyName: string, website?: string): Promise<CompanyInfo | null> {
  const fmt = (d: any): CompanyInfo => ({
    linkedinUrl:   d.linkedinUrl  || d.url        || '',
    companyId:     d.universalName || d.id || d.companyId || '',
    employeeCount: d.employeeCount || d.staffCount  || 0,
    industry:      d.industry     || d.specialties || '',
  });

  // Method A: LinkdAPI company search by name
  if (LINKDAPI_KEY) {
    try {
      const res = await linkd('/company/search', { query: companyName, limit: 5 });
      const companies: any[] = res.data || res.results || [];
      if (companies.length > 0) {
        // Let Claude pick the best match
        let best = companies[0];
        if (companies.length > 1) {
          const prompt = `Which LinkedIn company best matches "${companyName}"${website ? ` (website: ${website})` : ''}?

Candidates:
${companies.map((c,i) => `${i}: ${c.name||c.companyName||''} - ${c.description||c.tagline||''} - ${c.location||c.headquarter||''}`).join('\n')}

Reply ONLY with the index number (0,1,2…) of the best match, or -1 if none match.`;
          const idx = parseInt(await claudeAnalyze(prompt, 50));
          if (idx >= 0 && idx < companies.length) best = companies[idx];
          else if (idx === -1) best = null as any;
        }
        if (best) {
          console.log(`[DMFinder] Company found via LinkdAPI search: ${best.name || companyName}`);
          return fmt(best);
        }
      }
    } catch (e: any) { console.warn('[DMFinder] LinkdAPI company search:', e.message?.slice(0,80)); }

    // Method B: LinkdAPI by domain
    if (website) {
      try {
        const domain = extractDomain(website);
        const res = await linkd('/company/by-domain', { domain });
        const d = res.data || res;
        if (d?.universalName || d?.companyId) {
          console.log(`[DMFinder] Company found via domain: ${domain}`);
          return fmt(d);
        }
      } catch (e: any) { console.warn('[DMFinder] LinkdAPI domain lookup:', e.message?.slice(0,60)); }
    }
  }

  // Method C: Google CSE → find LinkedIn company URL → LinkdAPI enrich
  try {
    const shortName = companyName.replace(/\s+(A\.Ş\.|Ltd\.?|Ş\.?T\.?İ\.?|ve Tic\.?|San\.?|Dış|İnş\.?).*$/i,'').trim().slice(0,50);
    const r = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: GOOGLE_KEY, cx: GOOGLE_CX, q: `site:linkedin.com/company "${shortName}"`, num: 3 },
      timeout: 8000,
    });
    const items: any[] = r.data?.items || [];
    for (const item of items) {
      if (item.link?.includes('linkedin.com/company/')) {
        console.log(`[DMFinder] Company URL via Google: ${item.link}`);
        // Enrich via LinkdAPI if key available
        if (LINKDAPI_KEY) {
          try {
            const res = await linkd('/company', { linkedin_url: item.link });
            const d = res.data || res;
            if (d) return fmt({ ...d, linkedinUrl: item.link });
          } catch {}
        }
        // Return minimal info without enrichment
        const slug = item.link.split('/company/')[1]?.replace(/\//,'') || '';
        return { linkedinUrl: item.link, companyId: slug, employeeCount: 0, industry: '' };
      }
    }
  } catch (e: any) { console.warn('[DMFinder] Google company search:', e.message?.slice(0,60)); }

  return null;
}

// ── Step 2: Get company employees ─────────────────────────────────────────────

async function getCompanyEmployees(companyId: string, limit = 30): Promise<any[]> {
  if (!LINKDAPI_KEY || !companyId) return [];
  try {
    const res = await linkd('/company/employees', {
      company_id: companyId,
      limit,
      fields: 'firstName,lastName,headline,title,profileUrl,location',
    });
    const employees = res.data || res.results || [];
    console.log(`[DMFinder] ${employees.length} employees from LinkdAPI`);
    return employees;
  } catch (e: any) {
    console.warn('[DMFinder] Get employees:', e.message?.slice(0,80));
    return [];
  }
}

// ── Step 3: Claude AI — identify decision makers ──────────────────────────────

async function identifyDecisionMakers(employees: any[], targetRole?: string): Promise<any[]> {
  if (!employees.length) return [];

  // Fast pre-filter
  const preFiltered = employees.filter(e => isDM(e.headline || e.title || ''));
  const toAnalyze   = preFiltered.length > 0 ? preFiltered : employees.slice(0, 20);

  if (toAnalyze.length <= 3) return toAnalyze.slice(0, 3);

  try {
    const prompt = `You are a B2B sales expert. Identify the TOP 3 decision makers who approve purchasing decisions.
${targetRole ? `We are selling: ${targetRole}` : 'Focus on C-level, General Manager, Procurement, Purchasing, Director roles.'}

Profiles (index: Name — Title):
${toAnalyze.map((e,i) => `${i}: ${e.firstName||''} ${e.lastName||''} — ${e.headline||e.title||'Unknown'}`).join('\n')}

Return ONLY a JSON array of up to 3 index numbers, highest authority first. Example: [2, 0, 4]`;

    const text = await claudeAnalyze(prompt, 100);
    const match = text.match(/\[[\d,\s]+\]/);
    if (match) {
      const indices: number[] = JSON.parse(match[0]);
      return indices.filter(i => i >= 0 && i < toAnalyze.length).map(i => toAnalyze[i]).slice(0, 3);
    }
  } catch {}

  return toAnalyze.slice(0, 3);
}

// ── Step 4: Get full profile details ─────────────────────────────────────────

async function getProfileDetails(profileUrl: string): Promise<any | null> {
  if (!LINKDAPI_KEY || !profileUrl) return null;
  try {
    const username = profileUrl.split('/in/').pop()?.replace(/\/$/, '') || '';
    if (!username) return null;
    const res = await linkd('/profile', { username });
    return res.data || res;
  } catch (e: any) {
    console.warn('[DMFinder] Profile details:', e.message?.slice(0,60));
    return null;
  }
}

// ── Step 5: Email enrichment ──────────────────────────────────────────────────

async function enrichEmail(firstName: string, lastName: string, website?: string, companyName?: string): Promise<string | null> {
  if (!website && !companyName) return null;

  const domain = website ? extractDomain(website) : null;

  // Method A: scrape company website pages
  if (domain) {
    const pages = [
      `https://${domain}/iletisim`, `https://${domain}/contact`,
      `https://${domain}/hakkimizda`, `https://${domain}/about`,
      `https://${domain}/ekip`, `https://${domain}/team`,
      `https://${domain}/yonetim`, `https://${domain}/management`,
    ];
    const fLow = firstName.toLowerCase();
    const lLow = lastName.toLowerCase();
    for (const url of pages) {
      try {
        const r = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' }, maxRedirects: 2 });
        const emails = extractEmails(r.data, domain);
        const personal = emails.find(e => {
          const local = e.split('@')[0].toLowerCase();
          return local.includes(fLow) || local.includes(lLow) || local === `${fLow[0]}${lLow}` || local === `${fLow}.${lLow}`;
        });
        if (personal) { console.log(`[DMFinder] Personal email from website: ${personal}`); return personal; }
        const bizEmail = emails.find(e => !GENERIC_LOCAL.has(e.split('@')[0].toLowerCase()) && e.endsWith(`@${domain}`));
        if (bizEmail) { console.log(`[DMFinder] Business email from website: ${bizEmail}`); return bizEmail; }
      } catch {}
    }
  }

  // Method B: Hunter.io
  if (HUNTER_KEY && domain) {
    try {
      const r = await axios.get('https://api.hunter.io/v2/email-finder', {
        params: { domain, first_name: firstName, last_name: lastName, api_key: HUNTER_KEY },
        timeout: 8000,
      });
      if (r.data.data?.email) {
        console.log(`[DMFinder] Email from Hunter.io: ${r.data.data.email}`);
        return r.data.data.email;
      }
    } catch {}
  }

  // Method C: generate patterns + SMTP verify
  if (domain) {
    const f = normName(firstName);
    const l = normName(lastName);
    if (f.length >= 2 && l.length >= 2) {
      const candidates = EMAIL_PATS.slice(0, 4).map(p => { try { return `${p(f,l)}@${domain}`; } catch { return ''; } }).filter(Boolean);
      for (const cand of candidates) {
        try {
          const domPart = cand.split('@')[1];
          const r = await axios.get(`https://dns.google/resolve?name=${domPart}&type=MX`, { timeout: 3000 });
          if ((r.data.Answer || []).length > 0) { return cand; } // MX exists — pattern is plausible
        } catch {}
        break; // only try first pattern if DNS check fails
      }
    }
  }

  return null;
}

// ── Step 6: Website DM fallback (when LinkedIn not found) ─────────────────────

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
              const [first,...rest] = (node.name || '').trim().split(/\s+/);
              found = {
                firstName: first, lastName: rest.join(' '), fullName: node.name,
                title: node.jobTitle || null, email: node.email || null, phone: null,
                linkedinUrl: null, confidence: 70, source: 'Website (JSON-LD)',
              };
            }
          }
        } catch {}
      });
      if (found) return found;

      // Claude extraction from text
      if (text.length > 200) {
        try {
          const prompt = `Extract the main decision maker (CEO, General Manager, Owner, Director, Kurucu, Genel Müdür, Yönetici) from this company page text.

Text: ${text}

Return JSON with these fields: {"firstName": "...", "lastName": "...", "title": "..."}
If no real person found, return: null`;
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
  const { company_name, website, city } = lead;
  console.log(`[DMFinder] ── START: ${company_name} ──`);

  // Step 1: find company LinkedIn
  const company = await findCompanyLinkedIn(company_name, website);
  if (!company) {
    console.log(`[DMFinder] No LinkedIn company — trying website fallback`);
    const webDM = await findDMFromWebsite(website, company_name);
    if (webDM) {
      webDM.email = webDM.email || await enrichEmail(webDM.firstName, webDM.lastName, website, company_name);
      await saveDMToLead(lead, userId, webDM, null);
      return [webDM];
    }
    return [];
  }

  await sleep(700);

  // Step 2: get employees
  const employees = await getCompanyEmployees(company.companyId);
  await sleep(500);

  // Step 3: identify decision makers
  const topProfiles = await identifyDecisionMakers(employees);
  if (!topProfiles.length) {
    console.log(`[DMFinder] No DMs from employees — trying website fallback`);
    const webDM = await findDMFromWebsite(website, company_name);
    if (webDM) {
      webDM.email = webDM.email || await enrichEmail(webDM.firstName, webDM.lastName, website, company_name);
      await saveDMToLead(lead, userId, webDM, company);
      return [webDM];
    }
    return [];
  }

  const results: DMResult[] = [];

  for (const profile of topProfiles.slice(0, 3)) {
    await sleep(400);

    // Step 4: get full profile details
    let details: any = null;
    if (profile.profileUrl) {
      details = await getProfileDetails(profile.profileUrl);
      await sleep(300);
    }

    const firstName = details?.firstName || profile.firstName || '';
    const lastName  = details?.lastName  || profile.lastName  || '';
    const title     = details?.headline  || details?.title || profile.headline || profile.title || null;
    const email     = details?.email || null;
    const profileUrl = profile.profileUrl || details?.profileUrl || null;

    if (!isRealName(`${firstName} ${lastName}`)) continue;

    // Step 5: enrich email
    const finalEmail = email || await enrichEmail(firstName, lastName, website, company_name);

    const confidence = calcConfidence(firstName, lastName, title, finalEmail, profileUrl);

    const dm: DMResult = {
      firstName, lastName, fullName: `${firstName} ${lastName}`.trim(),
      title, email: finalEmail, phone: null, linkedinUrl: profileUrl,
      confidence, source: LINKDAPI_KEY ? 'LinkedIn (LinkdAPI)' : 'LinkedIn (Google)',
    };

    results.push(dm);
  }

  if (results.length > 0) {
    await saveDMToLead(lead, userId, results[0], company);
  }

  console.log(`[DMFinder] Done: ${results.length} DMs found for ${company_name}`);
  return results;
}

// ── Save best result to lead ──────────────────────────────────────────────────

async function saveDMToLead(lead: any, userId: string, dm: DMResult, company: CompanyInfo | null) {
  const upd: any = { updated_at: new Date().toISOString() };
  if (dm.fullName)    upd.contact_name = dm.fullName;
  if (dm.email)       upd.email        = dm.email;
  if (dm.phone)       upd.phone        = dm.phone;

  // Store LinkedIn URL in notes prefix if not already there
  if (dm.linkedinUrl || company?.linkedinUrl) {
    const liUrl = dm.linkedinUrl || company?.linkedinUrl;
    const notePrefix = `[LI: ${liUrl}]`;
    const currentNotes = lead.notes || '';
    if (!currentNotes.includes('[LI:')) {
      upd.notes = notePrefix + (currentNotes ? ` ${currentNotes}` : '');
    }
  }

  // Boost score for having a DM
  if (lead.score !== undefined) {
    upd.score = Math.min((lead.score || 50) + 15, 100);
  }

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
      await sleep(1200); // rate limit
    } catch (e: any) {
      job.completed++;
      job.results.push({ leadId: lead.id, company: lead.company_name, found: false });
      console.error(`[DMFinder] Bulk lead error (${lead.company_name}):`, e.message?.slice(0,80));
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
      ok: true,
      leadId,
      company: lead.company_name,
      found: dms.length,
      decisionMakers: dms,
      hasLinkedIn: !!(dms[0]?.linkedinUrl),
      bestName: dms[0]?.fullName || null,
      bestTitle: dms[0]?.title || null,
      bestEmail: dms[0]?.email || null,
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
    jobs.set(jobId, {
      status: 'running', total: leadIds.length, completed: 0,
      results: [], startedAt: Date.now(),
    });

    runBulkJob(jobId, leadIds, req.userId).catch(e => {
      const j = jobs.get(jobId);
      if (j) { j.status = 'error'; j.error = e.message; }
    });

    res.json({
      ok: true, jobId,
      total: leadIds.length,
      message: `${leadIds.length} lead için karar verici aranıyor...`,
      estimatedMinutes: Math.ceil(leadIds.length * 0.5),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/decision-maker-finder/job/:jobId
router.get('/job/:jobId', async (req: any, res: any) => {
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
// Returns config status (which APIs are active)
router.get('/status', async (req: any, res: any) => {
  res.json({
    linkdapi: !!LINKDAPI_KEY,
    hunter:   !!HUNTER_KEY,
    googleCse: !!(GOOGLE_KEY && GOOGLE_CX),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    mode: LINKDAPI_KEY ? 'full' : 'fallback',
    hint: !LINKDAPI_KEY
      ? 'LINKDAPI_KEY eklenirse LinkedIn çalışan listesi aktif olur. Şu an web scraping + Google modu aktif.'
      : 'Tüm özellikler aktif.',
  });
});

module.exports = router;
