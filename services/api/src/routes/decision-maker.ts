export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

const DECISION_MAKER_TITLES = [
  'genel müdür','ceo','yönetim kurulu','satın alma','tedarik',
  'ticaret müdürü','ihracat müdürü','pazarlama müdürü','satış müdürü',
  'kurucu','ortak','direktör','başkan','founder','owner','director',
  'manager','head of','vp','vice president','procurement','purchasing',
];

const GENERIC_PREFIXES = [
  'info','contact','hello','mail','email','admin','support','sales',
  'whatsapp','iletisim','bilgi','hizmet','destek','rezervasyon',
  'muhasebe','hr','ik','webmaster','noreply','no-reply','satis',
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function isRealName(name: string): boolean {
  if (!name || name.length < 4 || name.length > 50) return false;
  if (GENERIC_PREFIXES.some(g => name.toLowerCase().includes(g))) return false;
  if (/^\d/.test(name)) return false;
  if (name.includes('@') || name.includes('http') || name.includes('.com')) return false;
  if (/^[A-Z\s]+$/.test(name) && name.length > 20) return false;
  return true;
}

function cleanPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 10) return '';
  if (cleaned.startsWith('0')) return '+90' + cleaned.slice(1);
  if (cleaned.startsWith('90') && cleaned.length === 12) return '+' + cleaned;
  if (cleaned.startsWith('+90')) return cleaned;
  if (cleaned.length === 10) return '+90' + cleaned;
  return cleaned;
}

function extractPhones(text: string): string[] {
  const patterns = [
    /(\+90|0090|0)?[\s\-\.]?(\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{2}[\s\-\.]?\d{2})/g,
    /(\+90|0090)[\s\-\.]?\d{10}/g,
  ];
  const phones = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const m of matches) {
      const cleaned = cleanPhone(m);
      if (cleaned.length >= 12) phones.add(cleaned);
    }
  }
  return Array.from(phones).slice(0, 3);
}

function extractEmails(text: string): string[] {
  const emailRegex = /\b[a-zA-Z0-9._%+-]{1,50}@[a-zA-Z0-9.-]{1,50}\.[a-zA-Z]{2,6}\b/g;
  const matches = text.match(emailRegex) || [];
  return matches.filter(e =>
    !e.includes('example') && !e.includes('placeholder') &&
    !e.includes('domain') && e.length < 80
  ).slice(0, 5);
}

async function googleSearch(query: string, maxResults = 8): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}&hl=tr`,
      { headers: HEADERS, timeout: 12000 }
    );
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('div.g, div[data-sokoban-feature]').each((_: any, el: any) => {
      const title = $(el).find('h3').first().text().trim();
      const url = $(el).find('a[href]').first().attr('href') || '';
      const snippet = $(el).find('.VwiC3b, [data-sncf], .IsZvec').first().text().trim();
      if (title && url.startsWith('http') && !url.includes('google.com') && snippet) {
        results.push({ title, url, snippet });
      }
    });
    return results.slice(0, maxResults);
  } catch (e: any) {
    console.error('Google search error:', e.message);
    return [];
  }
}

async function findViaLinkedIn(companyName: string): Promise<any[]> {
  const titles = ['CEO', 'Genel Müdür', 'Kurucu', 'Satın Alma Müdürü', 'Direktör', 'Sahip'];
  const results: any[] = [];

  for (const title of titles.slice(0, 4)) {
    try {
      const query = `"${companyName}" "${title}" site:linkedin.com/in`;
      const searchResults = await googleSearch(query, 3);

      for (const r of searchResults) {
        if (!r.url.includes('linkedin.com/in/')) continue;
        const nameMatch = r.title.match(/^([^|–\-]+)/);
        if (!nameMatch) continue;
        let name = nameMatch[1]
          .replace(/ - LinkedIn/gi, '')
          .replace(/ \| LinkedIn/gi, '')
          .replace(new RegExp(title, 'gi'), '')
          .trim();
        if (!isRealName(name)) continue;

        results.push({
          name,
          title,
          company: companyName,
          linkedinUrl: r.url,
          source: 'LinkedIn',
          confidence: 'medium',
        });
      }
      await sleep(600);
    } catch {}
  }
  return results;
}

async function findViaGoogle(companyName: string, city: string): Promise<any[]> {
  const results: any[] = [];
  const queries = [
    `"${companyName}" "genel müdür" OR "CEO" OR "kurucu" OR "sahip" ${city}`,
    `"${companyName}" yönetici telefon iletişim`,
    `"${companyName}" site:linkedin.com CEO OR "Genel Müdür" OR Kurucu`,
  ];

  for (const query of queries) {
    try {
      const searchResults = await googleSearch(query, 5);
      for (const r of searchResults) {
        const text = r.snippet + ' ' + r.title;

        // Türkçe isim pattern
        const namePattern = /([A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,15}\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,20}(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]{1,15})?)/g;
        const names = text.match(namePattern) || [];
        for (const name of names.slice(0, 2)) {
          if (!isRealName(name)) continue;
          const titleMatch = DECISION_MAKER_TITLES.find(t => text.toLowerCase().includes(t));
          results.push({
            name,
            title: titleMatch || 'Yetkili',
            company: companyName,
            source: 'Google',
            sourceUrl: r.url,
            confidence: 'low',
          });
        }

        // Telefon bul
        const phones = extractPhones(text);
        for (const phone of phones) {
          results.push({
            name: null,
            phone,
            title: 'Yetkili',
            company: companyName,
            source: 'Google',
            confidence: 'medium',
          });
        }
      }
      await sleep(500);
    } catch {}
  }
  return results;
}

async function scrapeWebsite(website: string, companyName: string): Promise<any[]> {
  const results: any[] = [];
  try {
    const base = website.startsWith('http') ? website : `https://${website}`;
    const pages = [
      base,
      `${base}/iletisim`,
      `${base}/contact`,
      `${base}/hakkimizda`,
      `${base}/about`,
      `${base}/ekibimiz`,
      `${base}/yonetim`,
    ];

    for (const pageUrl of pages.slice(0, 4)) {
      try {
        const res = await axios.get(pageUrl, { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(res.data);

        // Sayfa metnini temiz al
        $('script, style, noscript').remove();
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

        // Telefon numaraları
        const phones = extractPhones(bodyText);
        for (const phone of phones) {
          results.push({
            name: null,
            phone,
            title: 'Şirket Hattı',
            source: 'Website',
            confidence: 'high',
          });
        }

        // Email adresleri
        const emails = extractEmails(bodyText);
        for (const email of emails) {
          const prefix = email.split('@')[0].toLowerCase();
          if (GENERIC_PREFIXES.some(g => prefix.includes(g))) {
            // Genel email - sadece email kaydet, isim yok
            results.push({ name: null, email, title: 'İletişim', source: 'Website', confidence: 'medium' });
          } else {
            // Kişisel email olabilir
            const nameParts = prefix.replace(/[._-]/g, ' ').split(' ');
            const possibleName = nameParts.length >= 2
              ? nameParts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
              : null;
            results.push({
              name: possibleName && isRealName(possibleName) ? possibleName : null,
              email,
              title: 'Yetkili',
              source: 'Website',
              confidence: 'medium',
            });
          }
        }

        // Kişi schema markup
        $('[itemtype*="Person"], .team-member, .staff, .ekip, .yonetim, .management, .about-team').each((_: any, el: any) => {
          const name = $(el).find('[itemprop="name"], .name, .isim, h3, h4').first().text().trim();
          const jobTitle = $(el).find('[itemprop="jobTitle"], .title, .unvan, .pozisyon').first().text().trim();
          const phone = $(el).find('[itemprop="telephone"], a[href^="tel:"]').first().text().trim();
          const email = $(el).find('[itemprop="email"], a[href^="mailto:"]').first().text().trim().replace('mailto:', '');

          if (name && isRealName(name)) {
            const isDecisionMaker = DECISION_MAKER_TITLES.some(t => jobTitle.toLowerCase().includes(t));
            if (isDecisionMaker || !jobTitle) {
              results.push({
                name,
                title: jobTitle || 'Yetkili',
                phone: phone ? cleanPhone(phone) : null,
                email: email || null,
                source: 'Website',
                confidence: 'high',
              });
            }
          }
        });

        // tel: linklerinden telefon
        $('a[href^="tel:"]').each((_: any, el: any) => {
          const href = $(el).attr('href') || '';
          const phone = cleanPhone(href.replace('tel:', ''));
          if (phone.length >= 12) {
            results.push({ name: null, phone, title: 'Şirket Hattı', source: 'Website', confidence: 'high' });
          }
        });

        await sleep(400);
      } catch {}
    }
  } catch {}
  return results;
}

function mergeResults(all: any[]): any[] {
  // Telefon ve email bazlı birleştir
  const merged: any[] = [];
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const seenNames = new Set<string>();

  // Önce gerçek isimli sonuçlar
  const withName = all.filter(r => r.name && isRealName(r.name));
  const withoutName = all.filter(r => !r.name || !isRealName(r.name));

  for (const r of [...withName, ...withoutName]) {
    const nameKey = r.name?.toLowerCase().replace(/\s/g, '') || '';
    const phoneKey = r.phone || '';
    const emailKey = r.email?.toLowerCase() || '';

    if (nameKey && seenNames.has(nameKey)) continue;
    if (phoneKey && seenPhones.has(phoneKey)) continue;
    if (emailKey && seenEmails.has(emailKey)) continue;

    if (nameKey) seenNames.add(nameKey);
    if (phoneKey) seenPhones.add(phoneKey);
    if (emailKey) seenEmails.add(emailKey);

    merged.push(r);
  }

  const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
  return merged.sort((a, b) => (order[b.confidence] || 0) - (order[a.confidence] || 0));
}

router.post('/find', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, website, city, leadId } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    console.log(`Decision maker searching: ${companyName}`);

    const [linkedinRes, googleRes, websiteRes] = await Promise.allSettled([
      findViaLinkedIn(companyName),
      findViaGoogle(companyName, city || ''),
      website ? scrapeWebsite(website, companyName) : Promise.resolve([]),
    ]);

    const all: any[] = [];
    if (linkedinRes.status === 'fulfilled') all.push(...linkedinRes.value);
    if (googleRes.status === 'fulfilled') all.push(...googleRes.value);
    if (websiteRes.status === 'fulfilled') all.push(...websiteRes.value);

    const unique = mergeResults(all);

    if (leadId && unique.length > 0) {
      const best = unique.find(r => isRealName(r.name)) || unique[0];
      const updateData: any = {};
      if (best.name && isRealName(best.name)) updateData.contact_name = best.name;
      if (best.email) updateData.email = best.email;
      if (best.phone) updateData.phone = best.phone;
      updateData.notes = `Karar verici: ${best.name || best.email || best.phone} (${best.title}) - ${best.source}`;
      if (Object.keys(updateData).length > 1) {
        await supabase.from('leads').update(updateData).eq('id', leadId).eq('user_id', userId);
      }
    }

    res.json({ company: companyName, found: unique.length, decisionMakers: unique.slice(0, 15) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, maxLeads = 10 } = req.body;

    let query = supabase
      .from('leads')
      .select('id, company_name, website, city, contact_name, score')
      .eq('user_id', userId)
      .is('contact_name', null)
      .limit(maxLeads);

    if (leadIds?.length) query = query.in('id', leadIds);

    const { data: leads, error } = await query;
    if (error) throw error;
    if (!leads?.length) return res.json({ message: 'Taranacak lead yok', updated: 0 });

    let updated = 0;
    const results = [];

    for (const lead of leads) {
      try {
        const [linkedinRes, googleRes, websiteRes] = await Promise.allSettled([
          findViaLinkedIn(lead.company_name),
          findViaGoogle(lead.company_name, lead.city || ''),
          lead.website ? scrapeWebsite(lead.website, lead.company_name) : Promise.resolve([]),
        ]);

        const all: any[] = [];
        if (linkedinRes.status === 'fulfilled') all.push(...linkedinRes.value);
        if (googleRes.status === 'fulfilled') all.push(...googleRes.value);
        if (websiteRes.status === 'fulfilled') all.push(...websiteRes.value);

        const unique = mergeResults(all);
        if (unique.length > 0) {
          const best = unique.find(r => isRealName(r.name)) || unique[0];
          const updateData: any = {
            score: Math.min((lead.score || 50) + 15, 100),
            notes: `Karar verici: ${best.name || best.email || best.phone} (${best.title}) - ${best.source}`,
          };
          if (best.name && isRealName(best.name)) updateData.contact_name = best.name;
          if (best.email) updateData.email = best.email;
          if (best.phone) updateData.phone = best.phone;

          await supabase.from('leads').update(updateData).eq('id', lead.id);
          results.push({
            id: lead.id,
            company: lead.company_name,
            found: best.name || best.email || best.phone,
            title: best.title,
            phone: best.phone || null,
            email: best.email || null,
          });
          updated++;
        }
        await sleep(1500);
      } catch (e: any) {
        console.error(`Error for ${lead.company_name}:`, e.message);
      }
    }

    res.json({ message: `${updated}/${leads.length} lead güncellendi`, updated, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const [{ count: total }, { count: withContact }, { count: withEmail }, { count: withPhone }] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('contact_name', 'is', null),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('email', 'is', null),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('phone', 'is', null),
    ]);
    res.json({
      totalLeads: total || 0,
      withContact: withContact || 0,
      withEmail: withEmail || 0,
      withPhone: withPhone || 0,
      coverageRate: total ? Math.round(((withContact || 0) / total) * 100) : 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;