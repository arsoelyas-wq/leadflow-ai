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

// Playwright ile li_at cookie kullanarak LinkedIn tara
async function scrapeWithPlaywright(companyName: string, liAt: string): Promise<any[]> {
  let browser: any = null;
  const persons: any[] = [];

  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--no-zygote', '--disable-gpu', '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'tr-TR',
    });

    // li_at cookie'yi ekle
    await context.addCookies([
      { name: 'li_at', value: liAt, domain: '.linkedin.com', path: '/' },
      { name: 'lang', value: 'v=2&lang=tr-tr', domain: '.linkedin.com', path: '/' },
    ]);

    const page = await context.newPage();
    await page.addInitScript(() => {
      try { Object.defineProperty((window as any).navigator, 'webdriver', { get: () => undefined }); } catch {}
    });

    // Şirket arama
    const searchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(3000);

    // Login gerekiyor mu?
    if (page.url().includes('login') || page.url().includes('authwall')) {
      await browser.close();
      return [];
    }

    // İlk şirket sonucunu bul ve tıkla
    const companyLink = await page.$('a[href*="/company/"]');
    if (!companyLink) {
      await browser.close();
      return [];
    }

    const href = await companyLink.getAttribute('href') || '';
    const companySlug = href.match(/\/company\/([^/?]+)/)?.[1];

    if (companySlug) {
      // People sayfası
      await page.goto(`https://www.linkedin.com/company/${companySlug}/people/`, {
        waitUntil: 'domcontentloaded', timeout: 20000
      });
      await sleep(3000);
      await page.evaluate(() => (window as any).scrollTo(0, 600));
      await sleep(1500);

      // Çalışanları çek
      const employees = await page.evaluate((): any[] => {
        const results: any[] = [];
        const cards = (document as any).querySelectorAll(
          '[data-member-id], .org-people-profile-card, .artdeco-entity-lockup, .scaffold-layout__list-item'
        );
        cards.forEach((card: any) => {
          const name = card.querySelector(
            '.org-people-profile-card__profile-title, dt, h3, .artdeco-entity-lockup__title, [aria-hidden="true"]'
          )?.textContent?.trim() || '';
          const title = card.querySelector(
            '.lt-line-clamp, dd, .org-people-profile-card__profile-position, .artdeco-entity-lockup__subtitle'
          )?.textContent?.trim() || '';
          const url = card.querySelector('a[href*="/in/"]')?.href || '';
          if (name && name.length > 2 && name.length < 60) {
            results.push({ name, title, url });
          }
        });
        return results;
      }).catch(() => []);

      for (const emp of employees) {
        const isDecision = DECISION_TITLES.some(t => emp.title.toLowerCase().includes(t));
        persons.push({
          full_name: emp.name,
          title: emp.title || 'Çalışan',
          linkedin_url: emp.url ? emp.url.split('?')[0] : null,
          source: 'LinkedIn Company (Playwright)',
          confidence: 93,
          isDecisionMaker: isDecision,
        });
      }
    }

    // Kişi araması — CEO/Müdür
    if (persons.filter((p: any) => p.isDecisionMaker).length < 2) {
      await page.goto(
        `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName + ' CEO Genel Müdür Kurucu')}&origin=GLOBAL_SEARCH_HEADER`,
        { waitUntil: 'domcontentloaded', timeout: 20000 }
      );
      await sleep(2500);

      const searchResults = await page.evaluate((): any[] => {
        const results: any[] = [];
        const cards = (document as any).querySelectorAll('.entity-result, [data-chameleon-result-urn]');
        cards.forEach((card: any) => {
          const name = card.querySelector(
            '.entity-result__title-text span[aria-hidden="true"], .actor-name'
          )?.textContent?.trim() || '';
          const title = card.querySelector(
            '.entity-result__primary-subtitle, .subline-level-1'
          )?.textContent?.trim() || '';
          const url = card.querySelector('a[href*="/in/"]')?.href || '';
          if (name && name.length > 2) results.push({ name, title, url });
        });
        return results;
      }).catch(() => []);

      for (const r of searchResults) {
        const isDecision = DECISION_TITLES.some(t => r.title.toLowerCase().includes(t));
        if (isDecision && !persons.find((p: any) => p.full_name === r.name)) {
          persons.push({
            full_name: r.name,
            title: r.title,
            linkedin_url: r.url ? r.url.split('?')[0] : null,
            source: 'LinkedIn People Search (Playwright)',
            confidence: 90,
            isDecisionMaker: true,
          });
        }
      }
    }

    await browser.close();
  } catch (e: any) {
    console.error('LinkedIn Playwright error:', e.message);
    if (browser) try { await browser.close(); } catch {}
  }

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

      if (settings?.linkedin_cookies) {
        try {
          const cookies = JSON.parse(Buffer.from(settings.linkedin_cookies, 'base64').toString('utf8'));
          const liAtCookie = cookies.find((c: any) => c.name === 'li_at');
          if (liAtCookie?.value) liAt = liAtCookie.value;
        } catch {}
      }
    }

    if (!liAt) {
      return res.status(400).json({ error: 'LinkedIn bağlı değil', needsConnection: true });
    }

    console.log(`LinkedIn Playwright scraping: ${companyName}`);
    const persons = await scrapeWithPlaywright(companyName, liAt);

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
      email: data?.linkedin_email || (hasEnvToken ? 'Sistem (li_at)' : null),
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