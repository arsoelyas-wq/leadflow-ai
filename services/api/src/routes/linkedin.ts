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
  'satış müdürü', 'sales director', 'ticaret müdürü', 'ihracat',
  'pazarlama', 'marketing', 'cmo', 'coo', 'cto', 'cfo',
  'partner', 'ortak', 'yönetici', 'executive', 'vp',
];

// li_at cookie ile LinkedIn API çağrısı
function getLinkedInHeaders(liAt: string) {
  return {
    'Cookie': `li_at=${liAt}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'X-Li-Lang': 'tr_TR',
    'X-RestLi-Protocol-Version': '2.0.0',
    'csrf-token': 'ajax:0123456789',
    'X-Li-PageInstance': 'urn:li:page:d_flagship3_search_srp_people',
  };
}

// LinkedIn şirket araması
async function searchLinkedInCompany(companyName: string, liAt: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://www.linkedin.com/voyager/api/typeahead/hitsV2?keywords=${encodeURIComponent(companyName)}&origin=OTHER&q=type&type=COMPANY&useCase=PEOPLE_SEARCH`,
      {
        headers: getLinkedInHeaders(liAt),
        timeout: 10000,
      }
    );

    const hits = response.data?.data?.elements || [];
    if (hits.length > 0) {
      const company = hits[0];
      return company?.hitInfo?.['com.linkedin.voyager.search.BlendedSearchHit']?.objectUrn ||
             company?.targetUrn || null;
    }
    return null;
  } catch (e: any) {
    console.error('LinkedIn company search error:', e.message);
    return null;
  }
}

// LinkedIn şirket çalışanları
async function getCompanyEmployees(companyUrn: string, liAt: string): Promise<any[]> {
  try {
    const companyId = companyUrn.split(':').pop();
    const response = await axios.get(
      `https://www.linkedin.com/voyager/api/search/blended?decorationId=com.linkedin.voyager.deco.search.SearchHitV2-4&count=20&filters=List(currentCompany-%3E${companyId},resultType-%3EPEOPLE)&origin=COMPANY_PAGE_CANNED_SEARCH&q=all&start=0`,
      {
        headers: getLinkedInHeaders(liAt),
        timeout: 15000,
      }
    );

    const elements = response.data?.data?.elements || [];
    const persons: any[] = [];

    for (const el of elements) {
      const hits = el?.elements || [];
      for (const hit of hits) {
        const profile = hit?.hitInfo?.['com.linkedin.voyager.search.SearchProfile'];
        if (!profile) continue;

        const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        const title = profile.headline || '';
        const profileId = profile.publicIdentifier || '';

        if (!name || name.length < 3) continue;

        const isDecision = DECISION_TITLES.some(t => title.toLowerCase().includes(t));

        persons.push({
          full_name: name,
          title,
          linkedin_url: profileId ? `https://linkedin.com/in/${profileId}` : null,
          source: 'LinkedIn API',
          confidence: 92,
          isDecisionMaker: isDecision,
        });
      }
    }

    return persons;
  } catch (e: any) {
    console.error('LinkedIn employees error:', e.message);
    return [];
  }
}

// LinkedIn kişi araması (şirket + unvan)
async function searchLinkedInPeople(companyName: string, city: string, liAt: string): Promise<any[]> {
  const persons: any[] = [];

  try {
    // Şirket ID'sini bul
    const companyUrn = await searchLinkedInCompany(companyName, liAt);

    if (companyUrn) {
      // Şirket çalışanlarını getir
      const employees = await getCompanyEmployees(companyUrn, liAt);
      persons.push(...employees);
      await sleep(1000);
    }

    // Direkt kişi araması — CEO, Genel Müdür vb.
    if (persons.filter((p: any) => p.isDecisionMaker).length < 3) {
      const titleGroups = [
        'CEO OR "Genel Müdür" OR Kurucu OR Founder',
        '"Satın Alma" OR Procurement OR "Satış Müdürü"',
      ];

      for (const titleGroup of titleGroups) {
        try {
          const query = encodeURIComponent(`${companyName} ${titleGroup}`);
          const response = await axios.get(
            `https://www.linkedin.com/voyager/api/search/blended?decorationId=com.linkedin.voyager.deco.search.SearchHitV2-4&count=10&keywords=${query}&origin=GLOBAL_SEARCH_HEADER&q=all&filters=List(resultType-%3EPEOPLE)&start=0`,
            {
              headers: getLinkedInHeaders(liAt),
              timeout: 12000,
            }
          );

          const elements = response.data?.data?.elements || [];
          for (const el of elements) {
            const hits = el?.elements || [];
            for (const hit of hits.slice(0, 5)) {
              const profile = hit?.hitInfo?.['com.linkedin.voyager.search.SearchProfile'];
              if (!profile) continue;

              const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
              const title = profile.headline || '';
              const profileId = profile.publicIdentifier || '';
              const location = profile.location?.defaultLocalizedName || '';

              if (!name || name.length < 3) continue;

              const isDecision = DECISION_TITLES.some(t => title.toLowerCase().includes(t));
              if (!isDecision) continue;

              persons.push({
                full_name: name,
                title,
                linkedin_url: profileId ? `https://linkedin.com/in/${profileId}` : null,
                city: location,
                source: 'LinkedIn People Search',
                confidence: 88,
                isDecisionMaker: true,
              });
            }
          }
          await sleep(800);
        } catch (e: any) {
          console.error('LinkedIn people search error:', e.message);
        }
      }
    }
  } catch (e: any) {
    console.error('LinkedIn search error:', e.message);
  }

  // Tekrarları kaldır
  const seen = new Set<string>();
  return persons.filter(p => {
    const key = (p.linkedin_url || p.full_name || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a: any, b: any) => (b.isDecisionMaker ? 1 : 0) - (a.isDecisionMaker ? 1 : 0));
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/linkedin/search — li_at ile arama
router.post('/search', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, city, leadId } = req.body;

    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    // li_at'yi şu sırayla al: kullanıcı DB > env variable
    let liAt = process.env.LINKEDIN_LI_AT || '';

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

    if (!liAt) {
      return res.status(400).json({
        error: 'LinkedIn bağlı değil — Ayarlar > LinkedIn Bağla veya LINKEDIN_LI_AT env ekleyin',
        needsConnection: true,
      });
    }

    console.log(`LinkedIn search: ${companyName} (${city})`);
    const persons = await searchLinkedInPeople(companyName, city || '', liAt);

    // Veritabanına kaydet
    for (const person of persons) {
      try {
        await supabase.from('person_database').upsert({
          full_name: person.full_name,
          title: person.title,
          company_name: companyName,
          linkedin_url: person.linkedin_url || null,
          city: person.city || city || null,
          source: person.source,
          confidence: person.confidence,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'linkedin_url', ignoreDuplicates: false });
      } catch {}
    }

    // Lead güncelle
    if (leadId && persons.length > 0) {
      const best = persons.find((p: any) => p.isDecisionMaker) || persons[0];
      await supabase.from('leads').update({
        contact_name: best.full_name,
        notes: `Karar verici: ${best.full_name} (${best.title}) - LinkedIn`,
      }).eq('id', leadId).eq('user_id', userId);
    }

    res.json({ company: companyName, found: persons.length, persons });

  } catch (e: any) {
    console.error('LinkedIn search error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/linkedin/status
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
      email: data?.linkedin_email || (hasEnvToken ? 'Sistem hesabı' : null),
      status: hasEnvToken ? 'connected' : (data?.linkedin_status || 'disconnected'),
      source: hasEnvToken ? 'system' : 'user',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/linkedin/connect — Playwright ile giriş (fallback)
router.post('/connect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { email, password, liAt } = req.body;

    // Direkt li_at cookie ile bağla
    if (liAt) {
      await supabase.from('user_settings').upsert({
        user_id: userId,
        linkedin_email: email || 'manual',
        linkedin_status: 'connected',
        linkedin_cookies: Buffer.from(JSON.stringify([{ name: 'li_at', value: liAt }])).toString('base64'),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return res.json({ success: true, message: 'LinkedIn bağlandı! 🎉' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'email, password veya liAt zorunlu' });
    }

    // Playwright ile giriş
    const { chromium } = require('playwright');
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--disable-gpu'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);
    await page.fill('#username', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await sleep(4000);

    const currentUrl = page.url();

    if (currentUrl.includes('checkpoint') || currentUrl.includes('challenge')) {
      await browser.close();
      return res.status(400).json({ error: 'LinkedIn doğrulama gerektiriyor. li_at cookie yöntemini kullanın.' });
    }

    if (currentUrl.includes('feed') || currentUrl.includes('mynetwork')) {
      const cookies = await context.cookies();
      const liAtCookie = cookies.find((c: any) => c.name === 'li_at');
      await browser.close();

      if (liAtCookie) {
        await supabase.from('user_settings').upsert({
          user_id: userId,
          linkedin_email: email,
          linkedin_status: 'connected',
          linkedin_cookies: Buffer.from(JSON.stringify(cookies)).toString('base64'),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        return res.json({ success: true, message: 'LinkedIn başarıyla bağlandı! 🎉', email });
      }
    }

    await browser.close();
    return res.status(400).json({ error: 'Giriş başarısız' });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/linkedin/disconnect
router.post('/disconnect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('user_settings').upsert({
      user_id: userId,
      linkedin_email: null,
      linkedin_password: null,
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