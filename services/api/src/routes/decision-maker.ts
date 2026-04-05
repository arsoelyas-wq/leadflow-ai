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
  'kurucu','ortak','direktör','başkan',
  'coo','cmo','founder','owner','director','manager',
  'head of','vp of','vice president','procurement','purchasing',
  'supply chain','business development','sales director',
];

const GENERIC_EMAIL_PREFIXES = [
  'info','contact','hello','mail','email','admin','support',
  'sales','whatsapp','iletisim','bilgi','hizmet','destek','rezervasyon',
  'muhasebe','finans','hr','ik','webmaster','noreply','no-reply',
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function isRealName(name: string): boolean {
  if (!name || name.length < 4 || name.length > 50) return false;
  if (GENERIC_EMAIL_PREFIXES.some(g => name.toLowerCase().includes(g))) return false;
  if (/^\d/.test(name)) return false;
  if (name.includes('@')) return false;
  return true;
}

function emailPrefixToName(prefix: string): string | null {
  const lower = prefix.toLowerCase();
  if (GENERIC_EMAIL_PREFIXES.some(g => lower.includes(g))) return null;
  if (/^[a-z]+[._][a-z]+$/.test(lower)) {
    return lower.replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
  return null;
}

async function googleSearch(query: string, maxResults = 8): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}&hl=tr`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('div.g').each((_: any, el: any) => {
      const title = $(el).find('h3').first().text().trim();
      const url = $(el).find('a').first().attr('href') || '';
      const snippet = $(el).find('.VwiC3b').first().text().trim();
      if (title && url.startsWith('http') && !url.includes('google.com')) {
        results.push({ title, url, snippet });
      }
    });
    return results.slice(0, maxResults);
  } catch (e: any) {
    console.error('Google search error:', e.message);
    return [];
  }
}

async function findLinkedInDecisionMakers(companyName: string, city: string): Promise<any[]> {
  const titles = ['CEO', 'Genel Müdür', 'Satın Alma Müdürü', 'Kurucu', 'Direktör'];
  const results: any[] = [];

  for (const title of titles.slice(0, 3)) {
    try {
      const query = `"${companyName}" "${title}" site:linkedin.com/in`;
      const searchResults = await googleSearch(query, 3);

      for (const r of searchResults) {
        if (!r.url.includes('linkedin.com/in/')) continue;
        const nameMatch = r.title.match(/^([^|–-]+)/);
        let name = nameMatch ? nameMatch[1].replace(title, '').trim() : r.title;
        name = name.replace(' - LinkedIn', '').replace(' | LinkedIn', '').trim();
        if (!isRealName(name)) continue;

        const emailMatch = r.snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        results.push({
          name,
          title,
          company: companyName,
          linkedinUrl: r.url,
          email: emailMatch ? emailMatch[0] : null,
          source: 'LinkedIn',
          confidence: 'medium',
        });
      }
      await sleep(500);
    } catch (e: any) {
      console.error(`LinkedIn search error for ${title}:`, e.message);
    }
  }
  return results;
}

async function scrapeWebsiteContacts(website: string): Promise<any[]> {
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const contactUrls = [url, `${url}/iletisim`, `${url}/contact`, `${url}/hakkimizda`, `${url}/about`];
    const results: any[] = [];
    const emails = new Set<string>();

    for (const contactUrl of contactUrls.slice(0, 3)) {
      try {
        const response = await axios.get(contactUrl, { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(response.data);
        const text = $('body').text();

        const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        emailMatches.forEach((email: string) => {
          if (!email.includes('example') && !email.includes('placeholder')) emails.add(email);
        });

        $('[itemtype*="Person"], .team-member, .staff-member, .about-person, .ekibimiz, .yonetim').each((_: any, el: any) => {
          const name = $(el).find('[itemprop="name"], .name, h3, h4').first().text().trim();
          const jobTitle = $(el).find('[itemprop="jobTitle"], .title, .position, .unvan').first().text().trim();
          const emailEl = $(el).find('[itemprop="email"], a[href^="mailto:"]').first().text().trim().replace('mailto:', '');

          if (name && isRealName(name)) {
            const isDecisionMaker = DECISION_MAKER_TITLES.some(t =>
              jobTitle.toLowerCase().includes(t.toLowerCase())
            );
            if (isDecisionMaker || !jobTitle) {
              results.push({
                name,
                title: jobTitle || 'Yetkili',
                email: emailEl || null,
                source: 'Website',
                confidence: 'high',
              });
            }
          }
        });

        await sleep(300);
      } catch {}
    }

    // Email'leri işle - prefix isim olarak kullanma
    emails.forEach(email => {
      try {
        const domain = email.split('@')[1];
        const websiteDomain = new URL(url).hostname.replace('www.', '');
        if (domain === websiteDomain || domain.includes(websiteDomain.split('.')[0])) {
          const prefix = email.split('@')[0];
          const nameFromPrefix = emailPrefixToName(prefix);
          // Sadece email olarak kaydet, name null bırak (generic ise)
          results.push({
            name: nameFromPrefix,
            title: 'Yetkili',
            email,
            source: 'Website',
            confidence: nameFromPrefix ? 'medium' : 'high',
          });
        }
      } catch {}
    });

    return results;
  } catch (e: any) {
    console.error('Website scrape error:', e.message);
    return [];
  }
}

async function findGoogleDecisionMakers(companyName: string, city: string): Promise<any[]> {
  const results: any[] = [];

  try {
    const queries = [
      `"${companyName}" "genel müdür" OR "CEO" OR "kurucu" ${city}`,
      `"${companyName}" yönetici iletişim`,
      `"${companyName}" satın alma müdürü`,
    ];

    for (const query of queries) {
      const searchResults = await googleSearch(query, 5);

      for (const r of searchResults) {
        const snippet = r.snippet + ' ' + r.title;

        const namePattern = /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)/g;
        const matches = snippet.match(namePattern) || [];
        for (const name of matches.slice(0, 2)) {
          if (!isRealName(name)) continue;
          const titleMatch = DECISION_MAKER_TITLES.find(t => snippet.toLowerCase().includes(t));
          results.push({
            name,
            title: titleMatch || 'Yetkili',
            company: companyName,
            source: 'Google',
            sourceUrl: r.url,
            confidence: 'low',
          });
        }

        // Email bul - prefix isim olarak kullanma
        const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          const prefix = emailMatch[0].split('@')[0];
          const nameFromPrefix = emailPrefixToName(prefix);
          if (!GENERIC_EMAIL_PREFIXES.some(g => prefix.toLowerCase().includes(g))) {
            results.push({
              name: nameFromPrefix,
              email: emailMatch[0],
              title: 'Yetkili',
              company: companyName,
              source: 'Google',
              confidence: 'medium',
            });
          }
        }
      }
      await sleep(500);
    }
  } catch (e: any) {
    console.error('Google decision maker error:', e.message);
  }

  return results;
}

router.post('/find', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, website, city, leadId } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    const [linkedinResults, googleResults, websiteResults] = await Promise.allSettled([
      findLinkedInDecisionMakers(companyName, city || ''),
      findGoogleDecisionMakers(companyName, city || ''),
      website ? scrapeWebsiteContacts(website) : Promise.resolve([]),
    ]);

    const allResults: any[] = [];
    if (linkedinResults.status === 'fulfilled') allResults.push(...linkedinResults.value);
    if (googleResults.status === 'fulfilled') allResults.push(...googleResults.value);
    if (websiteResults.status === 'fulfilled') allResults.push(...websiteResults.value);

    const seen = new Set<string>();
    const unique = allResults.filter(r => {
      const key = r.name?.toLowerCase().replace(/\s/g, '') || r.email || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    unique.sort((a, b) => (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0));

    if (leadId && unique.length > 0) {
      const best = unique[0];
      const updateData: any = {
        notes: `Karar verici: ${best.name || best.email} (${best.title}) - ${best.source}`,
      };
      if (best.email) updateData.email = best.email;
      if (best.name && isRealName(best.name)) updateData.contact_name = best.name;
      await supabase.from('leads').update(updateData).eq('id', leadId).eq('user_id', userId);
    }

    res.json({ company: companyName, found: unique.length, decisionMakers: unique.slice(0, 10) });
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
          findLinkedInDecisionMakers(lead.company_name, lead.city || ''),
          findGoogleDecisionMakers(lead.company_name, lead.city || ''),
          lead.website ? scrapeWebsiteContacts(lead.website) : Promise.resolve([]),
        ]);

        const all: any[] = [];
        if (linkedinRes.status === 'fulfilled') all.push(...linkedinRes.value);
        if (googleRes.status === 'fulfilled') all.push(...googleRes.value);
        if (websiteRes.status === 'fulfilled') all.push(...websiteRes.value);

        if (all.length > 0) {
          const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
          const sorted = all.sort((a, b) => (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0));

          // Önce gerçek isim olan sonucu seç
          const best = sorted.find(r => isRealName(r.name)) || sorted[0];

          const updateData: any = {
            notes: `Karar verici: ${best.name || best.email} (${best.title}) - ${best.source}`,
            score: Math.min((lead.score || 50) + 15, 100),
          };
          if (best.email) updateData.email = best.email;
          if (best.name && isRealName(best.name)) updateData.contact_name = best.name;

          await supabase.from('leads').update(updateData).eq('id', lead.id);
          results.push({ id: lead.id, company: lead.company_name, found: best.name || best.email, title: best.title });
          updated++;
        }

        await sleep(1000);
      } catch (e: any) {
        console.error(`Decision maker error for ${lead.company_name}:`, e.message);
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
    const [{ count: totalLeads }, { count: withContact }, { count: withEmail }] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('contact_name', 'is', null),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('email', 'is', null),
    ]);
    res.json({
      totalLeads: totalLeads || 0,
      withContact: withContact || 0,
      withEmail: withEmail || 0,
      coverageRate: totalLeads ? Math.round(((withContact || 0) / totalLeads) * 100) : 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;