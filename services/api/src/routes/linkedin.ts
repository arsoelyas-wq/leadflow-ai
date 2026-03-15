export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const DECISION_TITLES = [
  'ceo', 'genel müdür', 'kurucu', 'founder', 'owner', 'sahip',
  'direktör', 'director', 'müdür', 'manager', 'başkan', 'president',
  'satın alma', 'procurement', 'purchasing', 'tedarik',
  'satış', 'sales', 'ticaret', 'ihracat', 'pazarlama', 'marketing',
  'cmo', 'coo', 'cto', 'cfo', 'partner', 'ortak', 'yönetici', 'vp',
];

function getHeaders(liAt: string) {
  return {
    'Cookie': `li_at=${liAt}; lang=v=2&lang=tr-tr`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.linkedin.com/',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'upgrade-insecure-requests': '1',
  };
}

// LinkedIn şirket sayfasından çalışanları çek
async function scrapeLinkedInCompanyPage(companyName: string, liAt: string): Promise<any[]> {
  const persons: any[] = [];

  try {
    // 1. Şirket arama sayfası
    const searchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
    const searchRes = await axios.get(searchUrl, {
      headers: getHeaders(liAt),
      timeout: 15000,
      maxRedirects: 3,
    });

    const $search = cheerio.load(searchRes.data);

    // JSON-LD veya inline data'dan şirket slug bul
    let companySlug = '';
    $search('a[href*="/company/"]').each((_: any, el: any) => {
      const href = $search(el).attr('href') || '';
      const match = href.match(/\/company\/([^/?]+)/);
      if (match && !companySlug) companySlug = match[1];
    });

    if (!companySlug) {
      // Alternatif: script tag içinden bul
      $search('script[type="application/ld+json"]').each((_: any, el: any) => {
        try {
          const data = JSON.parse($search(el).html() || '{}');
          if (data.url?.includes('/company/')) {
            const match = data.url.match(/\/company\/([^/?]+)/);
            if (match) companySlug = match[1];
          }
        } catch {}
      });
    }

    if (companySlug) {
      await sleep(1500);

      // 2. Şirket people sayfası
      const peopleUrl = `https://www.linkedin.com/company/${companySlug}/people/`;
      const peopleRes = await axios.get(peopleUrl, {
        headers: getHeaders(liAt),
        timeout: 15000,
        maxRedirects: 3,
      });

      const $people = cheerio.load(peopleRes.data);

      // Çalışan kartlarını parse et
      $people('.org-people-profile-card, [data-member-id], .artdeco-entity-lockup').each((_: any, el: any) => {
        const name = $people(el).find('.org-people-profile-card__profile-title, dt, h3, .artdeco-entity-lockup__title').first().text().trim();
        const title = $people(el).find('.lt-line-clamp, dd, .org-people-profile-card__profile-position, .artdeco-entity-lockup__subtitle').first().text().trim();
        const profileUrl = $people(el).find('a[href*="/in/"]').first().attr('href') || '';

        if (name && name.length > 2 && name.length < 60) {
          const isDecision = DECISION_TITLES.some(t => title.toLowerCase().includes(t));
          persons.push({
            full_name: name,
            title: title || 'Çalışan',
            linkedin_url: profileUrl ? `https://linkedin.com${profileUrl.split('?')[0]}` : null,
            source: 'LinkedIn Company Page',
            confidence: 90,
            isDecisionMaker: isDecision,
          });
        }
      });

      // JSON içindeki veriyi de parse et
      $people('script').each((_: any, el: any) => {
        try {
          const content = $people(el).html() || '';
          if (content.includes('firstName') && content.includes('lastName')) {
            const matches = content.match(/"firstName":"([^"]+)","lastName":"([^"]+)"/g) || [];
            matches.forEach((match: string) => {
              const nameMatch = match.match(/"firstName":"([^"]+)","lastName":"([^"]+)"/);
              if (nameMatch) {
                const name = `${nameMatch[1]} ${nameMatch[2]}`.trim();
                if (name.length > 2 && !persons.find((p: any) => p.full_name === name)) {
                  persons.push({
                    full_name: name,
                    title: 'Çalışan',
                    source: 'LinkedIn JSON',
                    confidence: 85,
                    isDecisionMaker: false,
                  });
                }
              }
            });
          }
        } catch {}
      });
    }

    await sleep(1000);

    // 3. LinkedIn kişi arama sayfası
    const peopleSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName + ' CEO Genel Müdür')}&origin=GLOBAL_SEARCH_HEADER`;
    const peopleSearchRes = await axios.get(peopleSearchUrl, {
      headers: getHeaders(liAt),
      timeout: 15000,
    });

    const $ps = cheerio.load(peopleSearchRes.data);

    $ps('.entity-result, .search-result, [data-chameleon-result-urn]').each((_: any, el: any) => {
      const name = $ps(el).find('.entity-result__title-text, .actor-name, span[aria-hidden="true"]').first().text().trim();
      const title = $ps(el).find('.entity-result__primary-subtitle, .subline-level-1').first().text().trim();
      const profileUrl = $ps(el).find('a[href*="/in/"]').first().attr('href') || '';

      if (name && name.length > 2 && name.length < 60) {
        const isDecision = DECISION_TITLES.some(t => title.toLowerCase().includes(t));
        if (isDecision && !persons.find((p: any) => p.full_name === name)) {
          persons.push({
            full_name: name,
            title,
            linkedin_url: profileUrl ? `https://linkedin.com${profileUrl.split('?')[0]}` : null,
            source: 'LinkedIn People Search',
            confidence: 88,
            isDecisionMaker: true,
          });
        }
      }
    });

  } catch (e: any) {
    console.error('LinkedIn scrape error:', e.message);
  }

  // Tekrarları kaldır + karar vericileri önce sırala
  const seen = new Set<string>();
  return persons
    .filter(p => {
      const key = (p.linkedin_url || p.full_name || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a: any, b: any) => (b.isDecisionMaker ? 1 : 0) - (a.isDecisionMaker ? 1 : 0))
    .slice(0, 20);
}

// ── ROUTES ────────────────────────────────────────────────

router.post('/search', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, city, leadId } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    // li_at: env > kullanıcı DB
    let liAt = process.env.LINKEDIN_LI_AT || '';

    if (!liAt) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('linkedin_cookies, linkedin_status')
        .eq('user_id', userId)
        .single();

      if (settings?.linkedin_cookies && settings.linkedin_status === 'connected') {
        try {
          const cookies = JSON.parse(Buffer.from(settings.linkedin_cookies, 'base64').toString('utf8'));
          const liAtCookie = cookies.find((c: any) => c.name === 'li_at');
          if (liAtCookie?.value) liAt = liAtCookie.value;
        } catch {}
      }
    }

    if (!liAt) {
      return res.status(400).json({
        error: 'LinkedIn bağlı değil',
        needsConnection: true,
      });
    }

    console.log(`LinkedIn scraping: ${companyName}`);
    const persons = await scrapeLinkedInCompanyPage(companyName, liAt);

    // Veritabanına kaydet
    for (const person of persons) {
      try {
        await supabase.from('person_database').upsert({
          full_name: person.full_name,
          title: person.title,
          company_name: companyName,
          linkedin_url: person.linkedin_url || null,
          city: city || null,
          source: person.source,
          confidence: person.confidence,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'linkedin_url', ignoreDuplicates: false });
      } catch {}
    }

    if (leadId && persons.length > 0) {
      const best = persons.find((p: any) => p.isDecisionMaker) || persons[0];
      await supabase.from('leads').update({
        contact_name: best.full_name,
        notes: `Karar verici: ${best.full_name} (${best.title})`,
      }).eq('id', leadId).eq('user_id', userId);
    }

    res.json({ company: companyName, found: persons.length, persons });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/status', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const hasEnvToken = !!process.env.LINKEDIN_LI_AT;
    const { data } = await supabase
      .from('user_settings')
      .select('linkedin_email, linkedin_status')
      .eq('user_id', userId)
      .single();

    res.json({
      connected: hasEnvToken || data?.linkedin_status === 'connected',
      email: data?.linkedin_email || (hasEnvToken ? 'Sistem hesabı (li_at)' : null),
      status: hasEnvToken ? 'connected' : (data?.linkedin_status || 'disconnected'),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/connect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { liAt, email } = req.body;

    if (!liAt) return res.status(400).json({ error: 'liAt cookie zorunlu' });

    await supabase.from('user_settings').upsert({
      user_id: userId,
      linkedin_email: email || 'li_at cookie',
      linkedin_status: 'connected',
      linkedin_cookies: Buffer.from(JSON.stringify([{ name: 'li_at', value: liAt }])).toString('base64'),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({ success: true, message: 'LinkedIn bağlandı! 🎉' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/disconnect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('user_settings').upsert({
      user_id: userId,
      linkedin_email: null,
      linkedin_status: 'disconnected',
      linkedin_cookies: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    res.json({ message: 'LinkedIn bağlantısı kesildi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;