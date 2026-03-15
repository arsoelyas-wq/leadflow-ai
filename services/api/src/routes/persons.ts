export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

const DECISION_TITLES = [
  'ceo', 'genel müdür', 'kurucu', 'founder', 'owner', 'sahip',
  'direktör', 'director', 'müdür', 'manager', 'başkan', 'president',
  'satın alma', 'procurement', 'purchasing', 'tedarik',
  'satış müdürü', 'sales director', 'ticaret müdürü', 'ihracat',
  'pazarlama müdürü', 'marketing director', 'cmo', 'coo', 'cto',
  'partner', 'ortak', 'yönetici', 'executive', 'vp', 'vice president',
];

// ── EMAIL PATTERN ENGINE ──────────────────────────────────
function generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const normalize = (s: string) => s.toLowerCase().replace(/[çğıöşü]/g, (c: string) =>
    ({ 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u' } as any)[c] || c
  );
  const f = normalize(firstName);
  const l = normalize(lastName);
  return [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}.${l[0]}@${domain}`,
    `${f[0]}.${l}@${domain}`,
    `${l}.${f}@${domain}`,
    `${f}@${domain}`,
    `info@${domain}`,
    `iletisim@${domain}`,
    `bilgi@${domain}`,
    `sales@${domain}`,
    `contact@${domain}`,
  ];
}

// ── EMAIL VERIFICATION ────────────────────────────────────
async function verifyEmail(email: string): Promise<{ valid: boolean; confidence: number; reason: string }> {
  try {
    const domain = email.split('@')[1];
    let mxHost = '';
    try {
      const mx = await dns.resolveMx(domain);
      if (!mx?.length) return { valid: false, confidence: 0, reason: 'MX yok' };
      mxHost = mx.sort((a: any, b: any) => a.priority - b.priority)[0].exchange;
    } catch {
      return { valid: false, confidence: 0, reason: 'DNS hatası' };
    }
    const local = email.split('@')[0].toLowerCase();
    const roleBased = ['info', 'contact', 'sales', 'bilgi', 'iletisim', 'support'].includes(local);
    if (roleBased) return { valid: true, confidence: 60, reason: 'Role-based email' };
    return await smtpVerify(email, mxHost);
  } catch (e: any) {
    return { valid: false, confidence: 0, reason: e.message };
  }
}

async function smtpVerify(email: string, mxHost: string): Promise<{ valid: boolean; confidence: number; reason: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ valid: true, confidence: 50, reason: 'SMTP timeout' }), 6000);
    try {
      const socket = net.createConnection(25, mxHost);
      let buffer = '';
      let step = 0;
      socket.setTimeout(5000);
      socket.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        for (const line of lines) {
          if (!line) continue;
          if (step === 0 && line.startsWith('220')) { socket.write('EHLO leadflow.com\r\n'); step = 1; }
          else if (step === 1 && line.startsWith('250') && !line.startsWith('250-')) { socket.write(`MAIL FROM:<x@leadflow.com>\r\n`); step = 2; }
          else if (step === 2 && line.startsWith('250')) { socket.write(`RCPT TO:<${email}>\r\n`); step = 3; }
          else if (step === 3) {
            clearTimeout(timeout); socket.write('QUIT\r\n'); socket.destroy();
            if (line.startsWith('250') || line.startsWith('251')) resolve({ valid: true, confidence: 95, reason: 'SMTP doğrulandı' });
            else if (line.startsWith('550') || line.startsWith('551')) resolve({ valid: false, confidence: 0, reason: 'Email yok' });
            else resolve({ valid: true, confidence: 60, reason: 'SMTP belirsiz' });
          }
        }
        buffer = lines[lines.length - 1] || '';
      });
      socket.on('error', () => { clearTimeout(timeout); resolve({ valid: true, confidence: 45, reason: 'SMTP hata' }); });
      socket.on('timeout', () => { clearTimeout(timeout); socket.destroy(); resolve({ valid: true, confidence: 50, reason: 'Timeout' }); });
    } catch { clearTimeout(timeout); resolve({ valid: true, confidence: 40, reason: 'SMTP başlatılamadı' }); }
  });
}

// ── LİNKEDİN PLAYWRIGHT SCRAPER ──────────────────────────
async function scrapeLinkedInDirect(companyName: string, city: string): Promise<any[]> {
  try {
    const { chromium } = require('playwright');
    const persons: any[] = [];

    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--disable-gpu'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'tr-TR',
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      // @ts-ignore
      Object.defineProperty(window.navigator, 'webdriver', { get: () => undefined });
    });

    // LinkedIn login varsa giriş yap
    const liEmail = process.env.LINKEDIN_EMAIL;
    const liPass = process.env.LINKEDIN_PASSWORD;

    if (liEmail && liPass) {
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);
      await page.fill('#username', liEmail);
      await page.fill('#password', liPass);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Şirket ara
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName)}&origin=GLOBAL_SEARCH_HEADER`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2500);

      // Sonuçları tara
      const results = await page.$$eval('.entity-result', (cards: any[]) =>
        cards.slice(0, 20).map(card => ({
          name: card.querySelector('.entity-result__title-text')?.textContent?.trim() || '',
          title: card.querySelector('.entity-result__primary-subtitle')?.textContent?.trim() || '',
          location: card.querySelector('.entity-result__secondary-subtitle')?.textContent?.trim() || '',
          profileUrl: card.querySelector('a.app-aware-link')?.href || '',
        }))
      ).catch(() => []);

      for (const r of results) {
        if (!r.name || r.name.length < 3) continue;
        const isDecision = DECISION_TITLES.some(t => r.title.toLowerCase().includes(t));
        if (isDecision) {
          persons.push({
            full_name: r.name,
            title: r.title,
            linkedin_url: r.profileUrl,
            city: r.location,
            source: 'LinkedIn Direct',
            confidence: 92,
          });
        }
      }

      // Şirket sayfası çalışanları
      if (persons.length < 5) {
        const companySearch = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
        await page.goto(companySearch, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);

        const firstCompany = await page.$('a[href*="/company/"]');
        if (firstCompany) {
          const href = await firstCompany.getAttribute('href') || '';
          const companyUrl = `https://www.linkedin.com${href.split('?')[0]}/people/`;
          await page.goto(companyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(2500);

          const employees = await page.$$eval('[data-member-id], .org-people-profile-card', (cards: any[]) =>
            cards.slice(0, 30).map(card => ({
              name: card.querySelector('dt, .org-people-profile-card__profile-title, h3')?.textContent?.trim() || '',
              title: card.querySelector('dd, .lt-line-clamp, .org-people-profile-card__profile-position')?.textContent?.trim() || '',
              profileUrl: card.querySelector('a[href*="/in/"]')?.href || '',
            }))
          ).catch(() => []);

          for (const e of employees) {
            if (!e.name || e.name.length < 3) continue;
            const isDecision = DECISION_TITLES.some(t => e.title.toLowerCase().includes(t));
            if (isDecision) {
              persons.push({
                full_name: e.name,
                title: e.title,
                linkedin_url: e.profileUrl,
                source: 'LinkedIn Company Page',
                confidence: 95,
              });
            }
          }
        }
      }
    }

    await browser.close();

    // LinkedIn login yoksa veya az sonuç — Google SERP fallback
    if (persons.length === 0) {
      return await scrapeLinkedInViaGoogle(companyName, city);
    }

    return persons;
  } catch (e: any) {
    console.error('LinkedIn Playwright error:', e.message);
    return await scrapeLinkedInViaGoogle(companyName, city);
  }
}

// ── LİNKEDİN GOOGLE SERP FALLBACK ────────────────────────
async function scrapeLinkedInViaGoogle(companyName: string, city: string): Promise<any[]> {
  const persons: any[] = [];
  const titleGroups = [
    ['CEO', 'Genel Müdür', 'Kurucu', 'Founder'],
    ['Satın Alma Müdürü', 'Procurement Manager'],
    ['Satış Müdürü', 'Sales Director', 'Ticaret Müdürü'],
    ['Pazarlama Müdürü', 'Marketing Director'],
    ['CFO', 'COO', 'CTO', 'Direktör'],
  ];

  for (const group of titleGroups) {
    try {
      const titleQuery = group.map(t => `"${t}"`).join(' OR ');
      const query = `"${companyName}" (${titleQuery}) ${city} site:linkedin.com/in`;
      const response = await axios.get(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&num=6&hl=tr`,
        { headers: HEADERS, timeout: 8000 }
      );
      const $ = cheerio.load(response.data);

      $('div.g').each((_: any, el: any) => {
        const titleText = $(el).find('h3').first().text().trim();
        const url = $(el).find('a').first().attr('href') || '';
        const snippet = $(el).find('.VwiC3b').first().text().trim();

        if (!url.includes('linkedin.com/in/')) return;

        const nameMatch = titleText.match(/^([A-ZÇĞİÖŞÜa-zçğıöşü\s]+?)(?:\s*[-–|]|$)/);
        const name = nameMatch ? nameMatch[1].replace('LinkedIn', '').trim() : '';

        const foundTitle = group.find(t => (titleText + snippet).toLowerCase().includes(t.toLowerCase()));

        if (name && name.length > 3 && name.length < 50) {
          persons.push({
            full_name: name,
            title: foundTitle || 'Yetkili',
            linkedin_url: url,
            source: 'LinkedIn (Google)',
            confidence: 75,
          });
        }
      });

      await sleep(700);
    } catch {}
  }

  const seen = new Set<string>();
  return persons.filter(p => {
    const key = p.full_name.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── WEB SCRAPER ───────────────────────────────────────────
async function scrapeWebsite(url: string): Promise<{ emails: string[]; phones: string[]; persons: any[]; domain: string }> {
  const result = { emails: [] as string[], phones: [] as string[], persons: [] as any[], domain: '' };
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    result.domain = new URL(fullUrl).hostname.replace('www.', '');
    const pages = [fullUrl, `${fullUrl}/iletisim`, `${fullUrl}/contact`, `${fullUrl}/hakkimizda`, `${fullUrl}/team`];
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();

    for (const pageUrl of pages.slice(0, 3)) {
      try {
        const response = await axios.get(pageUrl, { headers: HEADERS, timeout: 8000, maxRedirects: 3 });
        const $ = cheerio.load(response.data);
        const text = $.text();

        const emailMatches = response.data.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        emailMatches.forEach((e: string) => {
          if (!e.includes('example') && !e.includes('.png') && e.length < 100) emailSet.add(e.toLowerCase());
        });

        const phoneMatches = text.match(/(\+90|0)[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g) || [];
        phoneMatches.forEach((p: string) => phoneSet.add(p.replace(/[\s\-]/g, '')));
        
        // Uluslararası telefon formatları
        const intlPhones = text.match(/\+[1-9][0-9]{1,3}[\s\-]?[0-9]{6,12}/g) || [];
        intlPhones.forEach((p: string) => phoneSet.add(p.replace(/[\s\-]/g, '')));

        $('[itemtype*="Person"], .team-member, .staff, [class*="team-card"]').each((_: any, el: any) => {
          const name = $(el).find('[itemprop="name"], h3, h4, .name').first().text().trim();
          const title = $(el).find('[itemprop="jobTitle"], .title, .position').first().text().trim();
          const email = $(el).find('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '') || '';
          if (name && name.length > 2 && name.length < 50) {
            result.persons.push({ name, title: title || 'Yetkili', email: email || null, source: 'Website' });
          }
        });

        await sleep(300);
      } catch {}
    }

    result.emails = Array.from(emailSet).filter(e => {
      const domain = e.split('@')[1];
      return domain && !['gmail.com','hotmail.com','yahoo.com','outlook.com'].includes(domain);
    }).slice(0, 8);
    result.phones = Array.from(phoneSet).slice(0, 5);
  } catch {}
  return result;
}

// ── ANA ENRICHMENT ────────────────────────────────────────
async function enrichCompany(companyName: string, website: string, city: string, usePlaywright = true): Promise<any[]> {
  const allPersons: any[] = [];

  // 1. LinkedIn (Playwright önce, fallback Google)
  console.log(`LinkedIn scanning: ${companyName}`);
  const linkedinPersons = usePlaywright
    ? await scrapeLinkedInDirect(companyName, city)
    : await scrapeLinkedInViaGoogle(companyName, city);
  allPersons.push(...linkedinPersons);

  // 2. Web sitesi
  if (website) {
    const webData = await scrapeWebsite(website);
    allPersons.push(...webData.persons.map((p: any) => ({
      full_name: p.name,
      title: p.title,
      email: p.email,
      company_name: companyName,
      company_domain: webData.domain,
      source: 'Website',
      confidence: 85,
    })));

    for (const email of webData.emails.slice(0, 5)) {
      allPersons.push({
        full_name: email.split('@')[0].replace(/[._]/g, ' '),
        title: 'Yetkili',
        email,
        company_name: companyName,
        company_domain: webData.domain,
        source: 'Website Email',
        confidence: 70,
      });
    }
  }

  // 3. İsimden email üret
  const domain = allPersons.find((p: any) => p.company_domain)?.company_domain ||
    (website ? (() => { try { return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace('www.', ''); } catch { return ''; } })() : '');

  if (domain) {
    for (const person of allPersons.filter((p: any) => !p.email && p.full_name)) {
      const parts = person.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        const patterns = generateEmailPatterns(parts[0], parts[parts.length - 1], domain);
        person.email = patterns[0];
        person.email_patterns = patterns.slice(0, 5);
        person.company_domain = domain;
      }
    }
  }

  // Tekrar önleme + güven sırala
  const seen = new Set<string>();
  return allPersons
    .filter(p => {
      const key = (p.email || p.linkedin_url || p.full_name || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 15);
}

// ── ROUTES ────────────────────────────────────────────────
router.post('/find', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, website, city, leadId, verifyEmails = false } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    console.log(`Enriching: ${companyName}`);
    const persons = await enrichCompany(companyName, website || '', city || '');

    if (verifyEmails) {
      for (const person of persons.filter((p: any) => p.email)) {
        const verify = await verifyEmail(person.email);
        person.email_verified = verify.valid;
        person.email_confidence = verify.confidence;
        person.email_reason = verify.reason;
        await sleep(200);
      }
    }

    for (const person of persons) {
      try {
        await supabase.from('person_database').upsert({
          full_name: person.full_name,
          title: person.title,
          company_name: companyName,
          company_domain: person.company_domain,
          email: person.email || null,
          email_verified: person.email_verified || false,
          phone: person.phone || null,
          linkedin_url: person.linkedin_url || null,
          city: city || null,
          source: person.source,
          confidence: person.confidence || 50,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email', ignoreDuplicates: false });
      } catch {}
    }

    if (leadId && persons.length > 0) {
      const best = persons[0];
      // Telefonu olan kişiyi önceliklendir
      const bestWithPhone = persons.find((p: any) => p.phone) || best;
      await supabase.from('leads').update({
        contact_name: bestWithPhone.full_name || best.full_name,
        email: bestWithPhone.email || best.email || undefined,
        phone: bestWithPhone.phone || undefined,
        notes: `Karar verici: ${bestWithPhone.full_name} (${bestWithPhone.title}) - %${bestWithPhone.confidence} güven`,
      }).eq('id', leadId).eq('user_id', userId);
    }

    res.json({ company: companyName, found: persons.length, persons });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/verify-email', async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email zorunlu' });
  res.json(await verifyEmail(email));
});

router.post('/generate-emails', async (req: any, res: any) => {
  try {
    const { firstName, lastName, domain } = req.body;
    if (!firstName || !lastName || !domain) return res.status(400).json({ error: 'firstName, lastName, domain zorunlu' });
    const patterns = generateEmailPatterns(firstName, lastName, domain);
    const results = [];
    for (const email of patterns.slice(0, 6)) {
      const verify = await verifyEmail(email);
      results.push({ email, ...verify });
      await sleep(300);
    }
    results.sort((a, b) => b.confidence - a.confidence);
    res.json({ patterns: results, bestGuess: results[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { maxLeads = 5 } = req.body;
    const { data: leads } = await supabase
      .from('leads').select('id, company_name, website, city, contact_name, score')
      .eq('user_id', userId).is('contact_name', null).limit(maxLeads);

    if (!leads?.length) return res.json({ message: 'Taranacak lead yok', updated: 0 });

    let updated = 0;
    const results = [];

    for (const lead of leads) {
      try {
        const persons = await enrichCompany(lead.company_name, lead.website || '', lead.city || '');
        if (persons.length > 0) {
          const best = persons[0];
          await supabase.from('leads').update({
            contact_name: best.full_name,
            email: best.email || undefined,
            score: Math.min((lead.score || 50) + 20, 100),
          }).eq('id', lead.id);
          results.push({ company: lead.company_name, found: best.full_name, title: best.title, email: best.email, confidence: best.confidence });
          updated++;
        }
        await sleep(2000);
      } catch (e: any) {
        console.error(`Batch error ${lead.company_name}:`, e.message);
      }
    }

    res.json({ message: `${updated}/${leads.length} lead güncellendi`, updated, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/database', async (req: any, res: any) => {
  try {
    const { search, company, limit = 50 } = req.query;
    let query = supabase.from('person_database').select('*').order('confidence', { ascending: false }).limit(Number(limit));
    if (search) query = query.ilike('full_name', `%${search}%`);
    if (company) query = query.ilike('company_name', `%${company}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ persons: data || [], total: data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const [{ count: totalPersons }, { count: verifiedEmails }, { count: withLinkedIn }, { count: totalLeads }, { count: withContact }] = await Promise.all([
      supabase.from('person_database').select('id', { count: 'exact', head: true }),
      supabase.from('person_database').select('id', { count: 'exact', head: true }).eq('email_verified', true),
      supabase.from('person_database').select('id', { count: 'exact', head: true }).not('linkedin_url', 'is', null),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('contact_name', 'is', null),
    ]);
    res.json({
      totalPersons: totalPersons || 0, verifiedEmails: verifiedEmails || 0,
      withLinkedIn: withLinkedIn || 0, totalLeads: totalLeads || 0,
      withContact: withContact || 0,
      coverageRate: totalLeads ? Math.round(((withContact || 0) / totalLeads) * 100) : 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

// ── TELEFON ÖNCELİKLİ ARAMA ──────────────────────────────
// Bu kısım mevcut router'a eklenir

router.post('/find-phone', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, website, city, leadId } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    const phones: string[] = [];
    const emails: string[] = [];
    let domain = '';

    // 1. Web sitesinden telefon çek
    if (website) {
      try {
        const fullUrl = website.startsWith('http') ? website : `https://${website}`;
        domain = new URL(fullUrl).hostname.replace('www.', '');
        const pages = [fullUrl, `${fullUrl}/iletisim`, `${fullUrl}/contact`];

        for (const pageUrl of pages) {
          try {
            const response = await axios.get(pageUrl, { headers: HEADERS, timeout: 8000 });
            const $ = cheerio.load(response.data);
            const text = $.text();
            const html = response.data;

            // TR telefon
            const trPhones = text.match(/(\+90|0)[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g) || [];
            trPhones.forEach((p: string) => {
              const clean = p.replace(/[\s\-]/g, '');
              const formatted = clean.startsWith('0') ? '+9' + clean : clean.startsWith('90') ? '+' + clean : clean;
              if (!phones.includes(formatted)) phones.push(formatted);
            });

            // Uluslararası
            const intlPhones = text.match(/\+[1-9][0-9]{8,14}/g) || [];
            intlPhones.forEach((p: string) => { if (!phones.includes(p)) phones.push(p); });

            // Tel: link'leri
            const telLinks = html.match(/href="tel:([^"]+)"/g) || [];
            telLinks.forEach((link: string) => {
              const num = link.replace('href="tel:', '').replace('"', '').replace(/[\s\-]/g, '');
              if (num && !phones.includes(num)) phones.push(num);
            });

            // Email
            const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
            emailMatches.forEach((e: string) => {
              if (!e.includes('example') && !e.includes('.png') && e.length < 100 &&
                  !['gmail.com','hotmail.com','yahoo.com'].includes(e.split('@')[1])) {
                if (!emails.includes(e)) emails.push(e);
              }
            });

            if (phones.length >= 3) break;
          } catch {}
        }
      } catch {}
    }

    // 2. Google'dan telefon bul
    if (phones.length === 0) {
      try {
        const query = `"${companyName}" ${city} telefon iletişim`;
        const response = await axios.get(
          `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5&hl=tr`,
          { headers: HEADERS, timeout: 8000 }
        );
        const $ = cheerio.load(response.data);
        const text = $.text();
        const trPhones = text.match(/(\+90|0)[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g) || [];
        trPhones.slice(0, 3).forEach((p: string) => {
          const clean = p.replace(/[\s\-]/g, '');
          const formatted = clean.startsWith('0') ? '+9' + clean : clean;
          if (!phones.includes(formatted)) phones.push(formatted);
        });
      } catch {}
    }

    // 3. Lead güncelle
    if (leadId && (phones.length > 0 || emails.length > 0)) {
      const updateData: any = {};
      if (phones.length > 0) updateData.phone = phones[0];
      if (emails.length > 0) updateData.email = emails[0];
      if (Object.keys(updateData).length > 0) {
        await supabase.from('leads').update(updateData).eq('id', leadId).eq('user_id', userId);
      }
    }

    // 4. WhatsApp linkleri kontrol et
    const whatsappNumbers = phones.filter(p => {
      const digits = p.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 13;
    });

    res.json({
      company: companyName,
      phones,
      emails: emails.slice(0, 5),
      whatsappReady: whatsappNumbers,
      domain,
      bestPhone: whatsappNumbers[0] || phones[0] || null,
      bestEmail: emails[0] || (domain ? `info@${domain}` : null),
    });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});