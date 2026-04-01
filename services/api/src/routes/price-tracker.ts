export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function scrapePrice(url: string): Promise<{ price: number | null, currency: string, title: string }> {
  try {
    const resp = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(resp.data);

    // Fiyat seç
    const priceSelectors = [
      '[itemprop="price"]', '.price', '.product-price', '.fiyat',
      '[class*="price"]', '[class*="fiyat"]', '.prc-dsc', '.rnf-fiyat'
    ];

    let priceText = '';
    for (const sel of priceSelectors) {
      const el = $(sel).first();
      if (el.length) { priceText = el.text().trim(); break; }
    }

    // Fiyatı parse et
    const priceMatch = priceText.replace(/\./g, '').replace(',', '.').match(/[\d]+\.?\d*/);
    const price = priceMatch ? parseFloat(priceMatch[0]) : null;

    const currency = priceText.includes('$') ? 'USD' : priceText.includes('€') ? 'EUR' : 'TRY';
    const title = $('title').text().trim().slice(0, 100) || $('h1').first().text().trim().slice(0, 100);

    return { price, currency, title };
  } catch { return { price: null, currency: 'TRY', title: '' }; }
}

// POST /api/price-tracker/add
router.post('/add', async (req: any, res: any) => {
  try {
    const { url, name, targetPrice, competitorName } = req.body;
    if (!url) return res.status(400).json({ error: 'url zorunlu' });

    const { price, currency, title } = await scrapePrice(url);

    const { data } = await supabase.from('price_trackers').insert([{
      user_id: req.userId,
      url, name: name || title || url,
      competitor_name: competitorName || 'Rakip',
      current_price: price,
      initial_price: price,
      target_price: targetPrice || null,
      currency, last_checked: new Date().toISOString(),
    }]).select().single();

    res.json({ tracker: data, currentPrice: price, message: `Fiyat takibi başladı: ${price} ${currency}` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/price-tracker/list
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('price_trackers').select('*')
      .eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ trackers: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/price-tracker/check/:id
router.post('/check/:id', async (req: any, res: any) => {
  try {
    const { data: tracker } = await supabase.from('price_trackers')
      .select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!tracker) return res.status(404).json({ error: 'Takip bulunamadı' });

    const { price, currency } = await scrapePrice(tracker.url);
    const oldPrice = tracker.current_price;
    const changed = price && oldPrice && price !== oldPrice;
    const direction = changed ? (price < oldPrice ? 'down' : 'up') : 'same';

    await supabase.from('price_trackers').update({
      current_price: price || oldPrice,
      last_checked: new Date().toISOString(),
      price_history: JSON.stringify([
        ...(JSON.parse(tracker.price_history || '[]').slice(-29)),
        { price, date: new Date().toISOString() }
      ])
    }).eq('id', req.params.id);

    // Alert kaydet
    if (changed) {
      await supabase.from('price_alerts').insert([{
        user_id: req.userId, tracker_id: tracker.id,
        old_price: oldPrice, new_price: price,
        direction, checked_at: new Date().toISOString(),
      }]).catch(() => {});
    }

    res.json({ oldPrice, newPrice: price, changed, direction, message: changed ? `Fiyat ${direction === 'down' ? 'düştü' : 'yükseldi'}!` : 'Fiyat değişmedi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/price-tracker/check-all
router.post('/check-all', async (req: any, res: any) => {
  try {
    const { data: trackers } = await supabase.from('price_trackers').select('*').eq('user_id', req.userId);
    res.json({ message: `${trackers?.length || 0} fiyat kontrol ediliyor...` });

    (async () => {
      for (const tracker of trackers || []) {
        const { price } = await scrapePrice(tracker.url);
        if (price) {
          await supabase.from('price_trackers').update({
            current_price: price, last_checked: new Date().toISOString(),
          }).eq('id', tracker.id);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/price-tracker/alerts
router.get('/alerts', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('price_alerts')
      .select('*, price_trackers(name, url)')
      .eq('user_id', req.userId).order('checked_at', { ascending: false }).limit(20);
    res.json({ alerts: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/price-tracker/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: trackers } = await supabase.from('price_trackers').select('id').eq('user_id', req.userId);
    const { data: alerts } = await supabase.from('price_alerts').select('direction').eq('user_id', req.userId);
    res.json({
      total: trackers?.length || 0,
      priceDrops: alerts?.filter((a: any) => a.direction === 'down').length || 0,
      priceRises: alerts?.filter((a: any) => a.direction === 'up').length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Her 6 saatte bir kontrol
setInterval(async () => {
  try {
    const { data: trackers } = await supabase.from('price_trackers').select('id, url, current_price, user_id');
    for (const tracker of trackers || []) {
      const { price } = await scrapePrice(tracker.url);
      if (price && price !== tracker.current_price) {
        await supabase.from('price_trackers').update({ current_price: price, last_checked: new Date().toISOString() }).eq('id', tracker.id);
        await supabase.from('price_alerts').insert([{ user_id: tracker.user_id, tracker_id: tracker.id, old_price: tracker.current_price, new_price: price, direction: price < tracker.current_price ? 'down' : 'up', checked_at: new Date().toISOString() }]).catch(() => {});
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch {}
}, 6 * 60 * 60 * 1000);

module.exports = router;