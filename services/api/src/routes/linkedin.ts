export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// LinkedIn'e Playwright ile giriş yap ve cookie'leri sakla
async function linkedInLogin(email: string, password: string): Promise<{
  success: boolean;
  cookies?: string;
  error?: string;
}> {
  let browser: any = null;
  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch({
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
      try { Object.defineProperty((window as any).navigator, 'webdriver', { get: () => undefined }); } catch {}
    });

    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);

    await page.fill('#username', email);
    await sleep(500);
    await page.fill('#password', password);
    await sleep(500);
    await page.click('button[type="submit"]');
    await sleep(4000);

    const currentUrl = page.url();

    // Captcha veya verification kontrolü
    if (currentUrl.includes('checkpoint') || currentUrl.includes('challenge')) {
      await browser.close();
      return { success: false, error: 'LinkedIn doğrulama gerektiriyor — lütfen tarayıcıdan manuel giriş yapın' };
    }

    // Başarılı giriş kontrolü
    if (currentUrl.includes('feed') || currentUrl.includes('mynetwork') || currentUrl.includes('linkedin.com/in/')) {
      // Cookie'leri kaydet
      const cookies = await context.cookies();
      const cookieStr = JSON.stringify(cookies);
      await browser.close();
      return { success: true, cookies: cookieStr };
    }

    // Hata sayfası
    const errorMsg = await page.$eval('.alert-content, .error-for-username, .error-for-password', (el: any) => el.textContent?.trim()).catch(() => '');
    await browser.close();
    return { success: false, error: errorMsg || 'Giriş başarısız — email/şifre kontrol edin' };

  } catch (e: any) {
    if (browser) try { await browser.close(); } catch {}
    return { success: false, error: e.message };
  }
}

// Cookie ile LinkedIn'de şirket çalışanlarını tara
async function searchLinkedInWithCookies(
  cookies: string,
  companyName: string,
  city: string
): Promise<any[]> {
  let browser: any = null;
  const persons: any[] = [];

  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--disable-gpu'],
    });

    const parsedCookies = JSON.parse(cookies);
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1280, height: 800 },
    });

    await context.addCookies(parsedCookies);
    const page = await context.newPage();
    await page.addInitScript(() => {
      try { Object.defineProperty((window as any).navigator, 'webdriver', { get: () => undefined }); } catch {}
    });

    // Şirket ara
    const companySearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
    await page.goto(companySearchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);

    // Session süresi doldu mu?
    if (page.url().includes('login') || page.url().includes('authwall')) {
      await browser.close();
      return [];
    }

    // İlk şirket sonucunu bul
    const companyLink = await page.$('a[href*="/company/"]');
    if (!companyLink) {
      await browser.close();
      return [];
    }

    const href = await companyLink.getAttribute('href') || '';
    const baseCompanyUrl = `https://www.linkedin.com${href.split('?')[0]}`;

    // Şirket people sayfasına git
    await page.goto(`${baseCompanyUrl}/people/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    // Scroll yaparak daha fazla yükle
    await page.evaluate(() => (window as any).scrollTo(0, 500));
    await sleep(1000);

    // Çalışanları tara
    const employees = await page.evaluate((): any[] => {
      const cards = (document as any).querySelectorAll('[data-member-id], .org-people-profile-card, .artdeco-entity-lockup');
      const results: any[] = [];
      cards.forEach((card: any) => {
        const name = card.querySelector('dt, .org-people-profile-card__profile-title, .artdeco-entity-lockup__title, h3')?.textContent?.trim() || '';
        const title = card.querySelector('dd, .lt-line-clamp, .org-people-profile-card__profile-position, .artdeco-entity-lockup__subtitle')?.textContent?.trim() || '';
        const profileUrl = card.querySelector('a[href*="/in/"]')?.href || '';
        if (name && name.length > 2) results.push({ name, title, profileUrl });
      });
      return results;
    }).catch(() => []);

    // Karar verici unvanları
    const DECISION_TITLES = [
      'ceo', 'genel müdür', 'kurucu', 'founder', 'owner', 'sahip',
      'direktör', 'director', 'müdür', 'manager', 'başkan',
      'satın alma', 'procurement', 'purchasing',
      'satış', 'sales', 'ticaret', 'ihracat', 'export',
      'pazarlama', 'marketing', 'cmo', 'coo', 'cto', 'cfo',
      'partner', 'ortak', 'yönetici', 'executive', 'vp',
    ];

    for (const emp of employees) {
      if (!emp.name || emp.name.length < 3) continue;
      const titleLower = (emp.title || '').toLowerCase();
      const isDecision = DECISION_TITLES.some(t => titleLower.includes(t));

      if (isDecision || persons.length < 3) {
        persons.push({
          full_name: emp.name,
          title: emp.title || 'Çalışan',
          linkedin_url: emp.profileUrl || null,
          source: 'LinkedIn (Kullanıcı Hesabı)',
          confidence: 95,
          isDecisionMaker: isDecision,
        });
      }
    }

    // Ayrıca kişi aramasında şirket + CEO ara
    if (persons.filter((p: any) => p.isDecisionMaker).length === 0) {
      const peopleSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName + ' CEO OR Genel Müdür OR Kurucu')}&origin=GLOBAL_SEARCH_HEADER`;
      await page.goto(peopleSearchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(2500);

      const searchResults = await page.evaluate((): any[] => {
        const cards = (document as any).querySelectorAll('.entity-result');
        const results: any[] = [];
        cards.forEach((card: any) => {
          const name = card.querySelector('.entity-result__title-text')?.textContent?.trim() || '';
          const title = card.querySelector('.entity-result__primary-subtitle')?.textContent?.trim() || '';
          const location = card.querySelector('.entity-result__secondary-subtitle')?.textContent?.trim() || '';
          const url = card.querySelector('a.app-aware-link')?.href || '';
          if (name) results.push({ name, title, location, url });
        });
        return results;
      }).catch(() => []);

      for (const r of searchResults.slice(0, 5)) {
        const titleLower = (r.title || '').toLowerCase();
        const isDecision = DECISION_TITLES.some(t => titleLower.includes(t));
        if (isDecision) {
          persons.push({
            full_name: r.name,
            title: r.title,
            linkedin_url: r.url,
            city: r.location,
            source: 'LinkedIn Search (Kullanıcı Hesabı)',
            confidence: 93,
            isDecisionMaker: true,
          });
        }
      }
    }

    await browser.close();
  } catch (e: any) {
    console.error('LinkedIn cookie search error:', e.message);
    if (browser) try { await browser.close(); } catch {}
  }

  return persons;
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/linkedin/connect — LinkedIn hesabı bağla
router.post('/connect', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre zorunlu' });
    }

    console.log(`LinkedIn login attempt for user ${userId}`);

    const result = await linkedInLogin(email, password);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Cookie'leri şifreli sakla (basit base64 — production'da şifreleme ekle)
    const encodedCookies = Buffer.from(result.cookies || '').toString('base64');

    await supabase.from('user_settings').upsert({
      user_id: userId,
      linkedin_email: email,
      linkedin_password: Buffer.from(password).toString('base64'), // basit encoding
      linkedin_status: 'connected',
      linkedin_cookies: encodedCookies,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    console.log(`LinkedIn connected for user ${userId}: ${email}`);

    res.json({
      success: true,
      message: 'LinkedIn başarıyla bağlandı! 🎉',
      email,
    });

  } catch (e: any) {
    console.error('LinkedIn connect error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/linkedin/search — Bağlı hesapla arama yap
router.post('/search', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { companyName, city } = req.body;

    if (!companyName) return res.status(400).json({ error: 'companyName zorunlu' });

    // Kullanıcının LinkedIn bilgilerini getir
    const { data: settings } = await supabase
      .from('user_settings')
      .select('linkedin_email, linkedin_cookies, linkedin_status')
      .eq('user_id', userId)
      .single();

    if (!settings?.linkedin_cookies || settings.linkedin_status !== 'connected') {
      return res.status(400).json({
        error: 'LinkedIn bağlı değil — Ayarlar > LinkedIn Bağla',
        needsConnection: true,
      });
    }

    // Cookie'leri decode et
    const cookies = Buffer.from(settings.linkedin_cookies, 'base64').toString('utf8');

    console.log(`LinkedIn search for: ${companyName} (user: ${userId})`);
    const persons = await searchLinkedInWithCookies(cookies, companyName, city || '');

    // Cookie süresi dolmuşsa yenile
    if (persons.length === 0 && settings.linkedin_email) {
      console.log('Cookies expired, trying re-login...');
      const liPass = Buffer.from(settings.linkedin_password || '', 'base64').toString('utf8');
      const relogin = await linkedInLogin(settings.linkedin_email, liPass);

      if (relogin.success) {
        const newCookies = Buffer.from(relogin.cookies || '').toString('base64');
        await supabase.from('user_settings').upsert({
          user_id: userId,
          linkedin_cookies: newCookies,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        const newCookiesDecoded = Buffer.from(newCookies, 'base64').toString('utf8');
        const retryPersons = await searchLinkedInWithCookies(newCookiesDecoded, companyName, city || '');
        return res.json({ company: companyName, found: retryPersons.length, persons: retryPersons });
      }
    }

    // Kişileri veritabanına kaydet
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

    res.json({ company: companyName, found: persons.length, persons });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/linkedin/status
router.get('/status', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase
      .from('user_settings')
      .select('linkedin_email, linkedin_status')
      .eq('user_id', userId)
      .single();

    res.json({
      connected: data?.linkedin_status === 'connected',
      email: data?.linkedin_email || null,
      status: data?.linkedin_status || 'disconnected',
    });
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