export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9',
};

// ── GOOGLE'DAN İNSTAGRAM İŞLETME HESABI BUL ─────────────
async function findInstagramAccounts(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  const queries = [
    `${keyword} ${city} instagram.com işletme`,
    `site:instagram.com ${keyword} ${city}`,
    `"${keyword}" "${city}" instagram iletişim telefon`,
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

        if (link.includes('instagram.com/') && !link.includes('/p/') && !link.includes('/reel/')) {
          const igMatch = link.match(/instagram\.com\/([\w.]+)/);
          const username = igMatch?.[1];

          if (username && username.length > 2 && !['explore', 'reels', 'stories', 'accounts'].includes(username)) {
            const phoneMatch = (snippet + title).match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
            const emailMatch = (snippet + title).match(/[\w.-]+@[\w.-]+\.\w+/);

            if (!results.find(r => r.instagram_username === username)) {
              results.push({
                company_name: title.split(/[-|–]/)[0].trim() || username,
                instagram_username: username,
                instagram_url: `https://instagram.com/${username}`,
                phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
                email: emailMatch?.[0] || null,
                city: city,
                sector: keyword,
                source: 'instagram',
                status: 'new',
              });
            }
          }
        }

        // Snippet'ten telefon çek
        const phoneMatch = (snippet + title).match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
        if (phoneMatch && results.length > 0) {
          const last = results[results.length - 1];
          if (!last.phone) last.phone = phoneMatch[0].replace(/\s/g, '');
        }
      });

      await sleep(800);
      if (results.length >= limit) break;
    } catch (e: any) {
      console.error('Instagram search error:', e.message);
    }
  }

  return results.slice(0, limit);
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/instagram/scrape
router.post('/scrape', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, city, limit = 20 } = req.body;
    if (!keyword || !city) return res.status(400).json({ error: 'keyword ve city zorunlu' });

    const accounts = await findInstagramAccounts(keyword, city, limit);

    let added = 0, duplicate = 0;
    for (const account of accounts) {
      // Duplicate kontrol
      const { data: existing } = await supabase.from('leads')
        .select('id').eq('user_id', userId)
        .or(`instagram_url.eq.${account.instagram_url},phone.eq.${account.phone || 'null'}`)
        .maybeSingle();

      if (existing) { duplicate++; continue; }

      await supabase.from('leads').insert([{ user_id: userId, ...account }]);
      added++;
    }

    res.json({ found: accounts.length, added, duplicate, message: `${added} yeni Instagram lead eklendi` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/instagram/scrape-batch — Çoklu şehir/sektör
router.post('/scrape-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keywords, cities, limitPerCombination = 10 } = req.body;
    if (!keywords?.length || !cities?.length) return res.status(400).json({ error: 'keywords ve cities zorunlu' });

    res.json({ message: `${keywords.length * cities.length} kombinasyon taranıyor...`, total: keywords.length * cities.length });

    (async () => {
      let totalAdded = 0;
      for (const keyword of keywords) {
        for (const city of cities) {
          try {
            const accounts = await findInstagramAccounts(keyword, city, limitPerCombination);
            for (const account of accounts) {
              const { data: existing } = await supabase.from('leads').select('id').eq('user_id', userId)
                .eq('instagram_url', account.instagram_url).maybeSingle();
              if (!existing) {
                await supabase.from('leads').insert([{ user_id: userId, ...account }]);
                totalAdded++;
              }
            }
            await sleep(1500);
          } catch (e: any) { console.error(`Instagram batch error ${keyword}/${city}:`, e.message); }
        }
      }
      console.log(`Instagram batch done: ${totalAdded} leads added`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/instagram/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('source', 'instagram');
    res.json({ total: data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;