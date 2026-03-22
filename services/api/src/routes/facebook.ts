export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9',
};

// ── GOOGLE'DAN FACEBOOK İŞLETME SAYFASI BUL ──────────────
async function findFacebookPages(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];

  const queries = [
    `site:facebook.com "${keyword}" "${city}" işletme iletişim`,
    `"${keyword}" "${city}" facebook.com/pages telefon`,
    `"${keyword}" "${city}" facebook iletişim`,
  ];

  for (const query of queries) {
    try {
      const response = await axios.get(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=tr`,
        { headers: HEADERS, timeout: 10000 }
      );
      const $ = cheerio.load(response.data);

      $('div.g, .tF2Cxc').each((_: any, el: any) => {
        const link = $(el).find('a').first().attr('href') || '';
        const title = $(el).find('h3').text() || '';
        const snippet = $(el).find('.VwiC3b').text() || '';

        const isFacebook = link.includes('facebook.com/') &&
          !link.includes('/posts/') && !link.includes('/photos/') &&
          !link.includes('/events/') && !link.includes('/groups/');

        if (isFacebook) {
          const fbMatch = link.match(/facebook\.com\/([\w.]+|pages\/[^/?]+)/);
          const fbSlug = fbMatch?.[1];

          if (fbSlug && !['marketplace', 'watch', 'login', 'help', 'share'].includes(fbSlug)) {
            const phoneMatch = (snippet + title).match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
            const emailMatch = (snippet + title).match(/[\w.-]+@[\w.-]+\.\w+/);
            const companyName = title.split(/[-|–]/)[0].trim() || fbSlug;

            if (!results.find(r => r.facebook_url === `https://facebook.com/${fbSlug}`)) {
              results.push({
                company_name: companyName,
                facebook_url: `https://facebook.com/${fbSlug}`,
                phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
                email: emailMatch?.[0] || null,
                city,
                sector: keyword,
                source: 'facebook',
                status: 'new',
              });
            }
          }
        }
      });

      await sleep(800);
      if (results.length >= limit) break;
    } catch (e: any) {
      console.error('Facebook search error:', e.message);
    }
  }

  return results.slice(0, limit);
}

// POST /api/facebook/scrape
router.post('/scrape', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, city, limit = 20 } = req.body;
    if (!keyword || !city) return res.status(400).json({ error: 'keyword ve city zorunlu' });

    const pages = await findFacebookPages(keyword, city, limit);

    let added = 0, duplicate = 0;
    for (const page of pages) {
      const { data: existing } = await supabase.from('leads').select('id').eq('user_id', userId)
        .or(`facebook_url.eq.${page.facebook_url},phone.eq.${page.phone || 'null'}`).maybeSingle();

      if (existing) { duplicate++; continue; }
      await supabase.from('leads').insert([{ user_id: userId, ...page }]);
      added++;
    }

    res.json({ found: pages.length, added, duplicate, message: `${added} yeni Facebook lead eklendi` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/facebook/scrape-batch
router.post('/scrape-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keywords, cities, limitPerCombination = 10 } = req.body;
    if (!keywords?.length || !cities?.length) return res.status(400).json({ error: 'keywords ve cities zorunlu' });

    res.json({ message: `${keywords.length * cities.length} kombinasyon taranıyor...` });

    (async () => {
      let totalAdded = 0;
      for (const keyword of keywords) {
        for (const city of cities) {
          try {
            const pages = await findFacebookPages(keyword, city, limitPerCombination);
            for (const page of pages) {
              const { data: existing } = await supabase.from('leads').select('id').eq('user_id', userId)
                .eq('facebook_url', page.facebook_url).maybeSingle();
              if (!existing) {
                await supabase.from('leads').insert([{ user_id: userId, ...page }]);
                totalAdded++;
              }
            }
            await sleep(1500);
          } catch (e: any) { console.error(`Facebook batch error:`, e.message); }
        }
      }
      console.log(`Facebook batch done: ${totalAdded} leads added`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/facebook/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('source', 'facebook');
    res.json({ total: data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;