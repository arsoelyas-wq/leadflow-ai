export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

// Karar verici unvanlar — Türkçe + İngilizce + global
const DECISION_MAKER_TITLES = [
  // Türkçe
  'genel müdür', 'ceo', 'yönetim kurulu', 'satın alma', 'tedarik',
  'ticaret müdürü', 'ihracat müdürü', 'pazarlama müdürü', 'satış müdürü',
  'kurucu', 'ortak', 'direktör', 'başkan',
  // İngilizce
  'ceo', 'coo', 'cmo', 'founder', 'owner', 'director', 'manager',
  'head of', 'vp of', 'vice president', 'procurement', 'purchasing',
  'supply chain', 'business development', 'sales director',
  // Global
  'geschäftsführer', 'directeur', 'gerente', 'direttore',
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Google Search
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

// LinkedIn'den karar verici bul
async function findLinkedInDecisionMakers(companyName: string, city: string): Promise<any[]> {
  const titles = ['CEO', 'Genel Müdür', 'Satın Alma Müdürü', 'Kurucu', 'Direktör', 'Satış Müdürü'];
  const results: any[] = [];

  for (const title of titles.slice(0, 3)) {
    try {
      const query = `"${companyName}" "${title}" site:linkedin.com/in`;
      const searchResults = await googleSearch(query, 3);

      for (const r of searchResults) {
        if (!r.url.includes('linkedin.com/in/')) continue;

        // İsim parse et
        const nameMatch = r.title.match(/^([^|–-]+)/);
        const name = nameMatch ? nameMatch[1].replace(title, '').trim() : r.title;

        // Snippet'ten email ara
        const emailMatch = r.snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        results.push({
          name: name.replace(' - LinkedIn', '').replace(' | LinkedIn', '').trim(),
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

// Web sitesinden iletişim bilgilerini çek
async function scrapeWebsiteContacts(website: string): Promise<any[]> {
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const contactUrls = [url, `${url}/iletisim`, `${url}/contact`, `${url}/hakkimizda`, `${url}/about`];
    const results: any[] = [];
    const emails = new Set<string>();

    for (const contactUrl of contactUrls.slice(0, 2)) {
      try {
        const response = await axios.get(contactUrl, { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(response.data);
        const text = $('body').text();

        // Email bul
        const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        emailMatches.forEach((email: string) => {
          if (!email.includes('example') && !email.includes('placeholder') && !emails.has(email)) {
            emails.add(email);
          }
        });

        // İsim + unvan bul (schema.org veya meta)
        $('[itemtype*="Person"], .team-member, .staff-member, .about-person').each((_: any, el: any) => {
          const name = $(el).find('[itemprop="name"], .name, h3, h4').first().text().trim();
          const jobTitle = $(el).find('[itemprop="jobTitle"], .title, .position').first().text().trim();
          const email = $(el).find('[itemprop="email"], a[href^="mailto:"]').first().text().trim().replace('mailto:', '');

          if (name && name.length > 2) {
            const isDecisionMaker = DECISION_MAKER_TITLES.some(t =>
              jobTitle.toLowerCase().includes(t.toLowerCase())
            );
            if (isDecisionMaker || !jobTitle) {
              results.push({
                name,
                title: jobTitle || 'Yetkili',
                email: email || null,
                source: 'Website',
                confidence: 'high',
              });
            }
          }
        });

        await sleep(300);
      } catch {}
    }

    // Email'leri ekle
    emails.forEach(email => {
      const domain = email.split('@')[1];
      const websiteDomain = new URL(url).hostname.replace('www.', '');
      if (domain === websiteDomain || domain.includes(websiteDomain.split('.')[0])) {
        results.push({
          name: email.split('@')[0].replace(/[._-]/g, ' '),
          title: 'Yetkili',
          email,
          source: 'Website',
          confidence: 'high',
        });
      }
    });

    return results;
  } catch (e: any) {
    console.error('Website scrape error:', e.message);
    return [];
  }
}

// Google'dan karar verici bul
async function findGoogleDecisionMakers(companyName: string, city: string): Promise<any[]> {
  const results: any[] = [];

  try {
    // Genel müdür / CEO arama
    const queries = [
      `"${companyName}" "genel müdür" OR "CEO" OR "kurucu" ${city}`,
      `"${companyName}" yönetici iletişim email`,
      `"${companyName}" satın alma sorumlusu`,
    ];

    for (const query of queries) {
      const searchResults = await googleSearch(query, 5);

      for (const r of searchResults) {
        const snippet = r.snippet + ' ' + r.title;

        // İsim pattern: Türkçe isimler
        const namePatterns = [
          /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)/g,
        ];

        for (const pattern of namePatterns) {
          const matches = snippet.match(pattern) || [];
          for (const name of matches.slice(0, 2)) {
            if (name.length > 5 && name.length < 40) {
              // Unvan tespiti
              const titleMatch = DECISION_MAKER_TITLES.find(t =>
                snippet.toLowerCase().includes(t)
              );

              results.push({
                name,
                title: titleMatch || 'Yetkili',
                company: companyName,
                source: 'Google',
                sourceUrl: r.url,
                confidence: 'low',
              });
            }
          }
        }

        // Email bul
        const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          results.push({
            name: emailMatch[0].split('@')[0],
            email: emailMatch[0],
            title: 'Yetkili',
            company: companyName,
            source: 'Google',
            confidence: 'medium',
          });
        }
      }

      await sleep(500);
    }
  } catch (e: any) {
    console.error('Google decision maker error:', e.message);
  }

  return results;
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/decision-maker/find — Tek firma için karar verici bul
router.post('/find', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, website, city, leadId } = req.body;

    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    console.log(`Finding decision makers for: ${companyName}`);

    // Paralel arama
    const [linkedinResults, googleResults, websiteResults] = await Promise.allSettled([
      findLinkedInDecisionMakers(companyName, city || ''),
      findGoogleDecisionMakers(companyName, city || ''),
      website ? scrapeWebsiteContacts(website) : Promise.resolve([]),
    ]);

    const allResults: any[] = [];
    if (linkedinResults.status === 'fulfilled') allResults.push(...linkedinResults.value);
    if (googleResults.status === 'fulfilled') allResults.push(...googleResults.value);
    if (websiteResults.status === 'fulfilled') allResults.push(...websiteResults.value);

    // Tekrarları kaldır (isim bazlı)
    const seen = new Set<string>();
    const unique = allResults.filter(r => {
      const key = r.name?.toLowerCase().replace(/\s/g, '') || r.email || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Güven skoruna göre sırala
    const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    unique.sort((a, b) => (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0));

    // Lead'i güncelle
    if (leadId && unique.length > 0) {
      const best = unique[0];
      await supabase.from('leads').update({
        contact_name: best.name,
        email: best.email || undefined,
        notes: `Karar verici: ${best.name} (${best.title}) - ${best.source}`,
      }).eq('id', leadId).eq('user_id', userId);
    }

    res.json({
      company: companyName,
      found: unique.length,
      decisionMakers: unique.slice(0, 10),
    });

  } catch (e: any) {
    console.error('Decision maker find error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/decision-maker/batch — Toplu lead tarama
router.post('/batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, maxLeads = 10 } = req.body;

    // Lead'leri getir
    let query = supabase
      .from('leads')
      .select('id, company_name, website, city, contact_name')
      .eq('user_id', userId)
      .is('contact_name', null) // Henüz karar verici bulunmamış
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
          const best = all.sort((a, b) => {
            const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
            return (order[b.confidence] || 0) - (order[a.confidence] || 0);
          })[0];

          await supabase.from('leads').update({
            contact_name: best.name,
            email: best.email || undefined,
            notes: `Karar verici: ${best.name} (${best.title})`,
            score: Math.min((lead as any).score + 15, 100),
          }).eq('id', lead.id);

          results.push({ id: lead.id, company: lead.company_name, found: best.name, title: best.title });
          updated++;
        }

        await sleep(1000);
      } catch (e: any) {
        console.error(`Decision maker error for ${lead.company_name}:`, e.message);
      }
    }

    res.json({
      message: `${updated}/${leads.length} lead güncellendi`,
      updated,
      results,
    });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/decision-maker/stats
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