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
  'satın alma', 'procurement', 'purchasing', 'tedarik', 'supply chain',
  'satış müdürü', 'sales director', 'ticaret müdürü', 'ihracat',
  'pazarlama müdürü', 'marketing director', 'cmo', 'coo', 'cto',
  'partner', 'ortak', 'yönetici', 'executive',
];

// ── EMAIL PATTERN ENGINE ──────────────────────────────────
function generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase().replace(/[çğıöşü]/g, (c: string) =>
    ({ 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u' } as any)[c] || c
  );
  const l = lastName.toLowerCase().replace(/[çğıöşü]/g, (c: string) =>
    ({ 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u' } as any)[c] || c
  );

  return [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}.${l[0]}@${domain}`,
    `${f[0]}.${l}@${domain}`,
    `${l}.${f}@${domain}`,
    `${f}@${domain}`,
    `info@${domain}`,
    `contact@${domain}`,
    `sales@${domain}`,
    `iletisim@${domain}`,
    `bilgi@${domain}`,
  ];
}

// ── EMAIL VERIFICATION ────────────────────────────────────
async function verifyEmail(email: string): Promise<{ valid: boolean; confidence: number; reason: string }> {
  try {
    const domain = email.split('@')[1];

    // MX kontrolü
    let mxHost = '';
    try {
      const mx = await dns.resolveMx(domain);
      if (!mx?.length) return { valid: false, confidence: 0, reason: 'MX yok' };
      mxHost = mx.sort((a: any, b: any) => a.priority - b.priority)[0].exchange;
    } catch {
      return { valid: false, confidence: 0, reason: 'DNS hatası' };
    }

    // Role-based email — orta güven
    const local = email.split('@')[0].toLowerCase();
    const roleBased = ['info', 'contact', 'sales', 'bilgi', 'iletisim', 'support'].includes(local);
    if (roleBased) return { valid: true, confidence: 60, reason: 'Role-based email' };

    // SMTP ping
    const smtpResult = await smtpVerify(email, mxHost);
    return smtpResult;

  } catch (e: any) {
    return { valid: false, confidence: 0, reason: e.message };
  }
}

async function smtpVerify(email: string, mxHost: string): Promise<{ valid: boolean; confidence: number; reason: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ valid: true, confidence: 50, reason: 'SMTP timeout (muhtemelen geçerli)' });
    }, 6000);

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
          if (step === 0 && line.startsWith('220')) {
            socket.write('EHLO leadflow-checker.com\r\n');
            step = 1;
          } else if (step === 1 && line.startsWith('250') && !line.startsWith('250-')) {
            socket.write(`MAIL FROM:<check@leadflow-checker.com>\r\n`);
            step = 2;
          } else if (step === 2 && line.startsWith('250')) {
            socket.write(`RCPT TO:<${email}>\r\n`);
            step = 3;
          } else if (step === 3) {
            clearTimeout(timeout);
            socket.write('QUIT\r\n');
            socket.destroy();
            if (line.startsWith('250') || line.startsWith('251')) {
              resolve({ valid: true, confidence: 95, reason: 'SMTP doğrulandı' });
            } else if (line.startsWith('550') || line.startsWith('551') || line.startsWith('553')) {
              resolve({ valid: false, confidence: 0, reason: 'Email mevcut değil' });
            } else {
              resolve({ valid: true, confidence: 60, reason: 'SMTP belirsiz yanıt' });
            }
          }
        }
        buffer = lines[lines.length - 1] || '';
      });
      socket.on('error', () => { clearTimeout(timeout); resolve({ valid: true, confidence: 45, reason: 'SMTP bağlantı hatası' }); });
      socket.on('timeout', () => { clearTimeout(timeout); socket.destroy(); resolve({ valid: true, confidence: 50, reason: 'SMTP timeout' }); });
    } catch {
      clearTimeout(timeout);
      resolve({ valid: true, confidence: 40, reason: 'SMTP başlatılamadı' });
    }
  });
}

// ── WEB SCRAPER ───────────────────────────────────────────
async function scrapeWebsite(url: string): Promise<{
  emails: string[];
  phones: string[];
  persons: any[];
  domain: string;
}> {
  const result = { emails: [] as string[], phones: [] as string[], persons: [] as any[], domain: '' };

  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    result.domain = new URL(fullUrl).hostname.replace('www.', '');

    const pagesToCheck = [
      fullUrl,
      `${fullUrl}/iletisim`,
      `${fullUrl}/contact`,
      `${fullUrl}/hakkimizda`,
      `${fullUrl}/about`,
      `${fullUrl}/ekibimiz`,
      `${fullUrl}/team`,
      `${fullUrl}/kadromuz`,
    ];

    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();

    for (const pageUrl of pagesToCheck.slice(0, 4)) {
      try {
        const response = await axios.get(pageUrl, {
          headers: HEADERS, timeout: 8000,
          maxRedirects: 3,
        });
        const $ = cheerio.load(response.data);
        const text = $.text();
        const html = response.data;

        // Email bul
        const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        emailMatches.forEach((e: string) => {
          if (!e.includes('example') && !e.includes('placeholder') &&
              !e.includes('.png') && !e.includes('.jpg') && e.length < 100) {
            emailSet.add(e.toLowerCase());
          }
        });

        // Telefon bul
        const phoneMatches = text.match(/(\+90|0)[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g) || [];
        phoneMatches.forEach((p: string) => phoneSet.add(p.replace(/[\s\-]/g, '')));

        // Schema.org Person
        $('[itemtype*="Person"]').each((_: any, el: any) => {
          const name = $(el).find('[itemprop="name"]').first().text().trim();
          const jobTitle = $(el).find('[itemprop="jobTitle"]').first().text().trim();
          const email = $(el).find('[itemprop="email"], a[href^="mailto:"]').first().text().trim().replace('mailto:', '');
          const tel = $(el).find('[itemprop="telephone"]').first().text().trim();

          if (name && name.length > 2) {
            result.persons.push({ name, title: jobTitle, email: email || null, phone: tel || null, source: 'Schema.org' });
          }
        });

        // Ekip sayfası pattern
        $('.team-member, .staff, .team-card, .person-card, .ekip-uye, [class*="team"], [class*="staff"]').each((_: any, el: any) => {
          const name = $(el).find('h2, h3, h4, .name, .isim').first().text().trim();
          const title = $(el).find('.title, .position, .unvan, p').first().text().trim();
          const email = $(el).find('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '') || '';

          if (name && name.length > 3 && name.length < 50) {
            const isDecision = DECISION_TITLES.some(t => title.toLowerCase().includes(t));
            if (isDecision || result.persons.length === 0) {
              result.persons.push({ name, title: title || 'Yetkili', email: email || null, source: 'Team Page' });
            }
          }
        });

        await sleep(300);
      } catch {}
    }

    result.emails = Array.from(emailSet).filter(e => {
      const domain = e.split('@')[1];
      return domain && !['gmail.com','hotmail.com','yahoo.com','outlook.com'].includes(domain);
    }).slice(0, 10);
    result.phones = Array.from(phoneSet).slice(0, 5);

  } catch (e: any) {
    console.error('Web scrape error:', e.message);
  }

  return result;
}

// ── GOOGLE SEARCH ─────────────────────────────────────────
async function googleSearch(query: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&num=8&hl=tr`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('div.g').each((_: any, el: any) => {
      const title = $(el).find('h3').first().text().trim();
      const url = $(el).find('a').first().attr('href') || '';
      const snippet = $(el).find('.VwiC3b').first().text().trim();
      if (title && url.startsWith('http')) results.push({ title, url, snippet });
    });
    return results.slice(0, 6);
  } catch {
    return [];
  }
}

// ── LİNKEDİN PROFIL BULDURMA ─────────────────────────────
async function findLinkedInProfiles(companyName: string, city: string): Promise<any[]> {
  const persons: any[] = [];
  const titleGroups = [
    '"CEO" OR "Genel Müdür" OR "Kurucu" OR "Founder"',
    '"Satın Alma" OR "Procurement" OR "Purchasing"',
    '"Satış Müdürü" OR "Sales Director" OR "Ticaret Müdürü"',
  ];

  for (const titleGroup of titleGroups) {
    try {
      const query = `"${companyName}" ${titleGroup} ${city} site:linkedin.com/in`;
      const results = await googleSearch(query);

      for (const r of results) {
        if (!r.url.includes('linkedin.com/in/')) continue;
        const snippet = r.snippet || '';
        const titleMatch = r.title + ' ' + snippet;

        // İsim çıkar
        const nameMatch = r.title.match(/^([A-ZÇĞİÖŞÜa-zçğıöşü\s]+?)(?:\s*[-–|]|$)/);
        const name = nameMatch ? nameMatch[1].trim() : '';

        // Unvan çıkar
        const titleFound = DECISION_TITLES.find(t =>
          titleMatch.toLowerCase().includes(t.toLowerCase())
        );

        // Email çıkar
        const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        if (name && name.length > 3 && name.length < 50) {
          persons.push({
            full_name: name.replace(' - LinkedIn', '').replace(' | LinkedIn', '').trim(),
            title: titleFound || 'Yetkili',
            linkedin_url: r.url,
            email: emailMatch ? emailMatch[0] : null,
            source: 'LinkedIn',
            confidence: 75,
          });
        }
      }
      await sleep(800);
    } catch {}
  }

  return persons;
}

// ── ANA ENRICHMENT FONKSİYONU ─────────────────────────────
async function enrichCompany(companyName: string, website: string, city: string): Promise<any[]> {
  const allPersons: any[] = [];

  // 1. Web sitesi tara
  if (website) {
    const webData = await scrapeWebsite(website);

    // Web'den bulunan kişiler
    allPersons.push(...webData.persons.map((p: any) => ({
      ...p,
      company_name: companyName,
      company_domain: webData.domain,
      confidence: 85,
    })));

    // Web'den email + email pattern ile kişi oluştur
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

    // Domain'den email pattern üret (isim yoksa)
    if (allPersons.length === 0 && webData.domain) {
      const patterns = ['info', 'sales', 'contact', 'bilgi', 'iletisim'];
      for (const p of patterns) {
        allPersons.push({
          full_name: companyName,
          title: 'İletişim',
          email: `${p}@${webData.domain}`,
          company_name: companyName,
          company_domain: webData.domain,
          source: 'Email Pattern',
          confidence: 50,
        });
      }
    }
  }

  // 2. LinkedIn tara
  const linkedinPersons = await findLinkedInProfiles(companyName, city);
  allPersons.push(...linkedinPersons.map((p: any) => ({
    ...p,
    company_name: companyName,
  })));

  // 3. İsimden email üret (domain varsa)
  const domain = allPersons.find((p: any) => p.company_domain)?.company_domain ||
    (website ? new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace('www.', '') : '');

  if (domain) {
    for (const person of allPersons.filter((p: any) => !p.email && p.full_name)) {
      const nameParts = person.full_name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        const patterns = generateEmailPatterns(nameParts[0], nameParts[nameParts.length - 1], domain);
        person.email_patterns = patterns.slice(0, 5);
        person.email = patterns[0]; // En olası pattern
        person.company_domain = domain;
      }
    }
  }

  // Tekrarları kaldır
  const seen = new Set<string>();
  const unique = allPersons.filter(p => {
    const key = (p.email || p.linkedin_url || p.full_name || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Güven skoru sırala
  return unique.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 15);
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/persons/find — Firma için kişi bul
router.post('/find', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, website, city, leadId, verifyEmails = false } = req.body;

    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    console.log(`Enriching: ${companyName}`);
    const persons = await enrichCompany(companyName, website || '', city || '');

    // Email doğrulama (isteğe bağlı)
    if (verifyEmails) {
      for (const person of persons.filter((p: any) => p.email)) {
        const verify = await verifyEmail(person.email);
        person.email_verified = verify.valid;
        person.email_confidence = verify.confidence;
        person.email_reason = verify.reason;
        await sleep(200);
      }
    }

    // Veritabanına kaydet
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

    // Lead güncelle
    if (leadId && persons.length > 0) {
      const best = persons[0];
      await supabase.from('leads').update({
        contact_name: best.full_name,
        email: best.email || undefined,
        notes: `Karar verici: ${best.full_name} (${best.title}) - Güven: %${best.confidence}`,
      }).eq('id', leadId).eq('user_id', userId);
    }

    res.json({
      company: companyName,
      found: persons.length,
      persons,
    });
  } catch (e: any) {
    console.error('Person find error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/persons/verify-email
router.post('/verify-email', async (req: any, res: any) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email zorunlu' });
    const result = await verifyEmail(email);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/persons/generate-emails
router.post('/generate-emails', async (req: any, res: any) => {
  try {
    const { firstName, lastName, domain } = req.body;
    if (!firstName || !lastName || !domain) {
      return res.status(400).json({ error: 'firstName, lastName, domain zorunlu' });
    }
    const patterns = generateEmailPatterns(firstName, lastName, domain);

    // Hepsini verify et
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

// POST /api/persons/batch — Toplu lead enrichment
router.post('/batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { maxLeads = 5 } = req.body;

    const { data: leads } = await supabase
      .from('leads')
      .select('id, company_name, website, city, contact_name')
      .eq('user_id', userId)
      .is('contact_name', null)
      .not('website', 'is', null)
      .limit(maxLeads);

    if (!leads?.length) {
      return res.json({ message: 'Taranacak lead yok (website olan)', updated: 0 });
    }

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
            score: Math.min((lead as any).score + 20, 100),
          }).eq('id', lead.id);

          results.push({
            company: lead.company_name,
            found: best.full_name,
            title: best.title,
            email: best.email,
            confidence: best.confidence,
          });
          updated++;
        }

        await sleep(1500);
      } catch (e: any) {
        console.error(`Batch error for ${lead.company_name}:`, e.message);
      }
    }

    res.json({ message: `${updated}/${leads.length} lead güncellendi`, updated, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/persons/database — Kişi veritabanı
router.get('/database', async (req: any, res: any) => {
  try {
    const { search, company, limit = 50 } = req.query;

    let query = supabase
      .from('person_database')
      .select('*')
      .order('confidence', { ascending: false })
      .limit(Number(limit));

    if (search) query = query.ilike('full_name', `%${search}%`);
    if (company) query = query.ilike('company_name', `%${company}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ persons: data || [], total: data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/persons/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;

    const [
      { count: totalPersons },
      { count: verifiedEmails },
      { count: withLinkedIn },
      { count: totalLeads },
      { count: withContact },
    ] = await Promise.all([
      supabase.from('person_database').select('id', { count: 'exact', head: true }),
      supabase.from('person_database').select('id', { count: 'exact', head: true }).eq('email_verified', true),
      supabase.from('person_database').select('id', { count: 'exact', head: true }).not('linkedin_url', 'is', null),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('contact_name', 'is', null),
    ]);

    res.json({
      totalPersons: totalPersons || 0,
      verifiedEmails: verifiedEmails || 0,
      withLinkedIn: withLinkedIn || 0,
      totalLeads: totalLeads || 0,
      withContact: withContact || 0,
      coverageRate: totalLeads ? Math.round(((withContact || 0) / totalLeads) * 100) : 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;