export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios    = require('axios');
const cheerio  = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
  confidence:  number;
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── DM title keywords ─────────────────────────────────────────────────────────

const DM_KW = [
  'ceo','coo','cfo','cto','cmo','founder','co-founder','owner','president',
  'vice president','vp','managing director','general manager','head of','chief',
  'partner','principal','director','procurement','purchasing','business development',
  'genel müdür','yönetim kurulu','kurucu','ortak','direktör','başkan','yönetici',
  'satın alma','tedarik','satış müdürü','satış direktörü','pazarlama müdürü',
  'ticaret müdürü','ihracat müdürü','üretim müdürü','işletme müdürü','sahibi',
];

function isDM(title: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return DM_KW.some(k => t.includes(k));
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function latinize(s: string): string {
  return s.replace(/[çÇ]/g,'c').replace(/[ğĞ]/g,'g').replace(/[ıİ]/g,'i')
    .replace(/[öÖ]/g,'o').replace(/[şŞ]/g,'s').replace(/[üÜ]/g,'u')
    .normalize('NFD').replace(/[̀-ͯ]/g,'');
}
function normName(s: string): string { return latinize(s).toLowerCase().replace(/[^a-z]/g,''); }

function isRealName(name: string | null): boolean {
  if (!name || name.length < 4 || name.length > 60) return false;
  if (name.trim().split(/\s+/).length < 2) return false;
  if (/^\d/.test(name) || name.includes('@') || name.includes('http')) return false;
  return true;
}

function extractDomain(website: string): string {
  try {
    const u = website.startsWith('http') ? website : `https://${website}`;
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return website.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0];
  }
}

function extractEmails(text: string, domain?: string): string[] {
  const re = /\b[a-zA-Z0-9][a-zA-Z0-9._%+\-]{0,48}@[a-zA-Z0-9][a-zA-Z0-9.\-]{0,48}\.[a-zA-Z]{2,6}\b/g;
  const WEBMAIL = new Set(['gmail.com','hotmail.com','yahoo.com','outlook.com','yandex.com','icloud.com','live.com']);
  const JUNK    = new Set(['example.com','test.com','domain.com','google.com','sentry.io','wordpress.com']);
  const GENERIC_LOCAL = new Set(['info','contact','hello','mail','email','admin','support','sales',
    'iletisim','bilgi','hizmet','destek','rezervasyon','muhasebe','hr','webmaster','noreply','no-reply',
    'satis','kariyer','careers','press','marketing','pazarlama','teknik','service','help','billing']);
  return [...new Set(text.match(re) || [])].filter(e => {
    const [local, dom] = e.split('@');
    if (!dom || e.length > 80 || local.length < 2) return false;
    if (JUNK.has(dom.toLowerCase())) return false;
    if (/\.(jpg|png|gif|svg|css|js)$/i.test(dom)) return false;
    if (domain && dom.toLowerCase() === domain) return !GENERIC_LOCAL.has(local.toLowerCase());
    return !WEBMAIL.has(dom.toLowerCase());
  });
}

const EMAIL_PATS: Array<(f: string, l: string) => string> = [
  (f,l) => `${f}.${l}`, (f,l) => `${f}${l}`, (f,l) => f,
  (f,l) => `${f[0]}${l}`, (f,l) => `${f[0]}.${l}`,
];

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

// ── LinkdAPI helper ────────────────────────────────────────────────────────────

async function linkd(path: string, params: any = {}): Promise<any> {
  if (!LINKDAPI_KEY) throw new Error('LINKDAPI_KEY not set');
  const r = await axios.get(`${LINKDAPI_BASE}${path}`, {
    headers: { 'X-linkdapi-apikey': LINKDAPI_KEY },
    params, timeout: 15000,
  });
  return r.data?.data ?? r.data;
}

// ── Source A: Hunter.io domain-search (primary — no IP restrictions) ───────────
// Returns people with name + title + email found at a domain.

async function hunterDomainSearch(domain: string): Promise<DMResult[]> {
  if (!HUNTER_KEY || !domain) return [];
  try {
    const r = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: { domain, api_key: HUNTER_KEY, limit: 20, type: 'personal' },
      timeout: 10000,
    });
    const emails: any[] = r.data?.data?.emails || [];
    console.log(`[DMFinder] Hunter.io: ${emails.length} emails at ${domain}`);

    const dms: DMResult[] = emails
      .filter((e: any) => isDM(e.position || ''))
      .map((e: any) => ({
        firstName:   e.first_name  || '',
        lastName:    e.last_name   || '',
        fullName:    `${e.first_name || ''} ${e.last_name || ''}`.trim(),
        title:       e.position    || null,
        email:       e.value       || null,
        phone:       null,
        linkedinUrl: e.linkedin    || null,
        confidence:  Math.min(e.confidence || 60, 100),
        source:      'Hunter.io',
      }))
      .filter((d: DMResult) => isRealName(d.fullName));

    if (dms.length === 0 && emails.length > 0) {
      // No title match — return highest-confidence person
      const best = emails.sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))[0];
      if (best && isRealName(`${best.first_name} ${best.last_name}`)) {
        dms.push({
          firstName: best.first_name || '', lastName: best.last_name || '',
          fullName: `${best.first_name || ''} ${best.last_name || ''}`.trim(),
          title: best.position || null, email: best.value || null,
          phone: null, linkedinUrl: best.linkedin || null,
          confidence: best.confidence || 50, source: 'Hunter.io',
        });
      }
    }
    return dms;
  } catch (e: any) {
    console.warn('[DMFinder] Hunter.io domain-search:', e.message?.slice(0, 70));
    return [];
  }
}

// ── Source B: Hunter.io email-finder (targeted — name + domain) ────────────────

async function hunterEmailFinder(firstName: string, lastName: string, domain: string): Promise<string | null> {
  if (!HUNTER_KEY || !domain) return null;
  try {
    const r = await axios.get('https://api.hunter.io/v2/email-finder', {
      params: { domain, first_name: firstName, last_name: lastName, api_key: HUNTER_KEY },
      timeout: 8000,
    });
    return r.data?.data?.email || null;
  } catch { return null; }
}

// ── Source C: LinkdAPI profile (enrichment — if profile URL known) ────────────

async function linkdProfile(profileUrl: string): Promise<any | null> {
  if (!LINKDAPI_KEY || !profileUrl) return null;
  const username = profileUrl.split('/in/').pop()?.replace(/[\/?#].*/,'');
  if (!username || username.length < 2) return null;
  try {
    return await linkd('/api/v1/profile/full', { username });
  } catch {}
  try {
    return await linkd('/api/v1/profile/overview', { username });
  } catch { return null; }
}

async function linkdContactInfo(profileUrl: string): Promise<any | null> {
  if (!LINKDAPI_KEY) return null;
  const username = profileUrl.split('/in/').pop()?.replace(/[\/?#].*/,'');
  if (!username) return null;
  try {
    return await linkd('/api/v1/profile/contact-info', { username });
  } catch { return null; }
}

// ── Source D: Website scraping + Claude AI ────────────────────────────────────

async function scrapeWebsiteDM(website: string, companyName: string): Promise<DMResult | null> {
  if (!website) return null;
  const domain = extractDomain(website);
  const pages = [
    `https://${domain}/hakkimizda`, `https://${domain}/about`,
    `https://${domain}/ekip`,       `https://${domain}/team`,
    `https://${domain}/yonetim`,    `https://${domain}/management`,
    `https://${domain}/iletisim`,   `https://${domain}/contact`,
    `https://${domain}`,
  ];

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  for (const url of pages) {
    try {
      const r = await axios.get(url, { timeout: 6000, headers: { 'User-Agent': UA }, maxRedirects: 3 });
      const $ = cheerio.load(r.data);
      $('script,style,noscript').remove();

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
                title: node.jobTitle || null, email: node.email || null,
                phone: null, linkedinUrl: null, confidence: 70, source: 'Website (JSON-LD)',
              };
            }
          }
        } catch {}
      });
      if (found) return found;

      // Email bul
      const bodyText = $('body').text().replace(/\s+/g, ' ');
      const emails = extractEmails(bodyText, domain);

      // Schema.org / team HTML patterns
      let schemaName: string | null = null;
      let schemaTitle: string | null = null;
      $('[itemtype*="Person"], .team-member, .staff-member, .about-person, .yonetim').each((_: any, el: any) => {
        const name  = $(el).find('[itemprop="name"], .name, h3, h4').first().text().trim();
        const title = $(el).find('[itemprop="jobTitle"], .title, .position, .role').first().text().trim();
        if (isRealName(name) && isDM(title)) { schemaName = name; schemaTitle = title; }
      });
      if (schemaName) {
        const [f, ...rest] = (schemaName as string).trim().split(/\s+/);
        return {
          firstName: f, lastName: rest.join(' '), fullName: schemaName as string,
          title: schemaTitle, email: emails[0] || null,
          phone: null, linkedinUrl: null, confidence: 65, source: 'Website (Schema)',
        };
      }

      // Claude AI text extraction
      const text = bodyText.slice(0, 3000);
      if (text.length > 300 && process.env.ANTHROPIC_API_KEY) {
        try {
          const reply = await claudeAnalyze(
            `Find the top decision maker (CEO, founder, owner, general manager, genel müdür, kurucu) from this Turkish company webpage.
Company: ${companyName}
Text: ${text}
Return ONLY JSON like: {"firstName":"Ali","lastName":"Yılmaz","title":"Genel Müdür"}
If no real person found, return: null`, 200);
          if (reply && reply.trim() !== 'null') {
            const m = reply.match(/\{[\s\S]*?\}/);
            if (m) {
              const p = JSON.parse(m[0]);
              if (p.firstName && isRealName(`${p.firstName} ${p.lastName || ''}`)) {
                return {
                  firstName: p.firstName, lastName: p.lastName || '',
                  fullName: `${p.firstName} ${p.lastName || ''}`.trim(),
                  title: p.title || null, email: emails[0] || null,
                  phone: null, linkedinUrl: null, confidence: 55, source: 'Website (Claude)',
                };
              }
            }
          }
        } catch {}
      }

      // If we found emails at least, return domain-level contact
      if (emails.length > 0) {
        return {
          firstName: '', lastName: '', fullName: '',
          title: null, email: emails[0], phone: null,
          linkedinUrl: null, confidence: 30, source: 'Website (email)',
        };
      }
    } catch {}
  }
  return null;
}

// ── Source E: Email pattern + MX verify ──────────────────────────────────────

async function guessEmail(firstName: string, lastName: string, domain: string): Promise<string | null> {
  const f = normName(firstName);
  const l = normName(lastName);
  if (f.length < 2 || l.length < 2) return null;
  try {
    const r = await axios.get(`https://dns.google/resolve?name=${domain}&type=MX`, { timeout: 3000 });
    if ((r.data.Answer || []).length === 0) return null;
    // MX exists — first.last is the most common Turkish business pattern
    return EMAIL_PATS[0](f, l) + '@' + domain;
  } catch { return null; }
}

// ── Main chain ─────────────────────────────────────────────────────────────────

async function runChain(lead: any, userId: string): Promise<DMResult[]> {
  const { company_name, website } = lead;
  console.log(`[DMFinder] ── START: ${company_name} ──`);

  const domain = website ? extractDomain(website) : null;
  let results: DMResult[] = [];

  // ── A: Hunter.io domain-search (best source — no IP restrictions) ──────────
  if (domain) {
    results = await hunterDomainSearch(domain);
    if (results.length > 0) {
      // Enrich LinkedIn if available from Hunter result
      for (const dm of results.slice(0, 1)) {
        if (dm.linkedinUrl && LINKDAPI_KEY) {
          await sleep(400);
          const profile = await linkdProfile(dm.linkedinUrl);
          if (profile) {
            if (!dm.email) {
              const contact = await linkdContactInfo(dm.linkedinUrl);
              dm.email = contact?.email || dm.email;
            }
            dm.title  = dm.title  || profile.headline || profile.title || null;
          }
        }
        // Fill in missing email
        if (!dm.email) {
          dm.email = await hunterEmailFinder(dm.firstName, dm.lastName, domain)
                  || await guessEmail(dm.firstName, dm.lastName, domain);
        }
      }
      await saveDMToLead(lead, userId, results[0]);
      console.log(`[DMFinder] Done via Hunter.io: ${results[0].fullName}`);
      return results;
    }
  }

  // ── B: Website scraping + Claude AI ───────────────────────────────────────
  if (website) {
    console.log(`[DMFinder] Trying website scraping for "${company_name}"`);
    const webDM = await scrapeWebsiteDM(website, company_name);
    if (webDM) {
      // Enrich email if we have a name
      if (!webDM.email && webDM.firstName && domain) {
        webDM.email = await hunterEmailFinder(webDM.firstName, webDM.lastName, domain)
                   || await guessEmail(webDM.firstName, webDM.lastName, domain);
      }
      if (webDM.fullName || webDM.email) {
        results = [webDM];
        await saveDMToLead(lead, userId, webDM);
      }
    }
  }

  console.log(`[DMFinder] Done: ${results.length} DMs for "${company_name}"`);
  return results;
}

// ── Save to lead ──────────────────────────────────────────────────────────────

async function saveDMToLead(lead: any, userId: string, dm: DMResult) {
  const upd: any = { updated_at: new Date().toISOString() };
  if (dm.fullName) upd.contact_name = dm.fullName;
  if (dm.email)    upd.email        = dm.email;
  if (dm.phone)    upd.phone        = dm.phone;
  if (dm.linkedinUrl) {
    const notes = lead.notes || '';
    if (!notes.includes('[LI:')) upd.notes = `[LI: ${dm.linkedinUrl}]` + (notes ? ` ${notes}` : '');
  }
  if (lead.score !== undefined) upd.score = Math.min((lead.score || 50) + 15, 100);
  await supabase.from('leads').update(upd).eq('id', lead.id).eq('user_id', userId);
}

// ── Bulk job ──────────────────────────────────────────────────────────────────

async function runBulkJob(jobId: string, leadIds: string[], userId: string) {
  const job = jobs.get(jobId)!;
  const { data: leads } = await supabase.from('leads').select('*').in('id', leadIds).eq('user_id', userId);

  for (const lead of leads || []) {
    try {
      const dms = await runChain(lead, userId);
      job.completed++;
      if (dms.length > 0 && (dms[0].fullName || dms[0].email)) {
        job.results.push({ leadId: lead.id, company: lead.company_name, found: true,
          name: dms[0].fullName || undefined, title: dms[0].title || undefined, email: dms[0].email || undefined });
      } else {
        job.results.push({ leadId: lead.id, company: lead.company_name, found: false });
      }
      await sleep(1200);
    } catch (e: any) {
      job.completed++;
      job.results.push({ leadId: lead.id, company: lead.company_name, found: false });
      console.error(`[DMFinder] Bulk error (${lead.company_name}):`, e.message?.slice(0,80));
    }
  }
  job.status = 'done';
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/find', async (req: any, res: any) => {
  try {
    const { leadId } = req.body;
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    const dms = await runChain(lead, req.userId);
    res.json({
      ok: true, leadId, company: lead.company_name,
      found: dms.length, decisionMakers: dms,
      hasLinkedIn: !!(dms[0]?.linkedinUrl),
      bestName:  dms[0]?.fullName || null,
      bestTitle: dms[0]?.title    || null,
      bestEmail: dms[0]?.email    || null,
    });
  } catch (e: any) {
    console.error('[DMFinder] /find error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

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
    res.json({ ok: true, jobId, total: leadIds.length,
      message: `${leadIds.length} lead için karar verici aranıyor...`,
      estimatedMinutes: Math.ceil(leadIds.length * 0.5) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/job/:jobId', (req: any, res: any) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'İş bulunamadı' });
  res.json({ status: job.status, total: job.total, completed: job.completed,
    pct: job.total ? Math.round((job.completed / job.total) * 100) : 0,
    results: job.results, error: job.error });
});

router.get('/status', (_req: any, res: any) => {
  res.json({
    hunter:   !!HUNTER_KEY,
    linkdapi: !!LINKDAPI_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    websiteScraping: true,
    mode: HUNTER_KEY
      ? 'Hunter.io domain-search → website scraping → Claude AI'
      : 'website scraping → Claude AI (add HUNTER_API_KEY for better results)',
  });
});

module.exports = router;
