export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios    = require('axios');
const cheerio  = require('cheerio');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];
const randUA = () => UAS[Math.floor(Math.random() * UAS.length)];

// ── SAFE JSON PARSE ───────────────────────────────────────────────────────────
function safeJson(v: any, fallback: any) {
  if (!v) return fallback;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return fallback; } }
  return Array.isArray(v) || typeof v === 'object' ? v : fallback;
}

// ── PRICE SCRAPER ─────────────────────────────────────────────────────────────
async function scrapePrice(url: string, retries = 2): Promise<{ price: number | null; currency: string; title: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
    const resp = await axios.get(url, {
      headers: {
        'User-Agent': randUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      timeout: 15000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(resp.data);

    // Multi-strategy price selectors (ordered: structured data → site-specific → generic)
    const priceSelectors = [
      '[itemprop="price"][content]',        // Structured data attr
      '[itemprop="price"]',                  // Structured data text
      'meta[property="product:price:amount"]',
      '.prc-dsc', '.prc-org',               // Trendyol
      '.rnf-fiyat', '.product-price-new',   // Hepsiburada
      '.product_price', '.product-price',
      '.price-box .price', '.price-wrapper',
      '[class*="ProductPrice"]', '[class*="product-price"]',
      '[class*="PriceText"]', '[class*="price-text"]',
      '.fiyat', '[class*="fiyat"]',
      '[class*="price"]:not(script):not(style)',
      'span.price', 'p.price', 'div.price',
    ];

    let rawPrice = '';
    for (const sel of priceSelectors) {
      const el = $(sel).first();
      if (!el.length) continue;
      rawPrice = el.attr('content') || el.attr('data-price') || el.text().trim();
      if (rawPrice && /\d/.test(rawPrice)) break;
    }

    // Parse price — handle multiple locales
    let price: number | null = null;
    if (rawPrice) {
      // Remove currency symbols and text
      let cleaned = rawPrice.replace(/[₺$€£¥₩TL TRY USD EUR GBP]/gi, '').trim();
      // Handle different decimal/thousands separators
      if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
        // Turkish/European format: 1.234,56
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleaned)) {
        // US format: 1,234.56
        cleaned = cleaned.replace(/,/g, '');
      } else {
        cleaned = cleaned.replace(/[^\d.,]/g, '').replace(',', '.');
      }
      const match = cleaned.match(/\d+\.?\d*/);
      if (match) price = parseFloat(match[0]);
    }

    // Currency detection — comprehensive multi-source
    let currency = 'TRY';
    const metaCurr = $('meta[property="product:price:currency"]').attr('content')
      || $('meta[itemprop="priceCurrency"]').attr('content')
      || '';
    if (metaCurr) {
      currency = metaCurr.toUpperCase();
    } else if (/\$|USD/i.test(rawPrice)) currency = 'USD';
    else if (/€|EUR/i.test(rawPrice)) currency = 'EUR';
    else if (/£|GBP/i.test(rawPrice)) currency = 'GBP';
    else if (/₺|TL|TRY/i.test(rawPrice)) currency = 'TRY';
    else if (/AED|د\.إ/i.test(rawPrice)) currency = 'AED';
    else if (/SAR|ر\.س/i.test(rawPrice)) currency = 'SAR';
    else if (/PLN|zł/i.test(rawPrice)) currency = 'PLN';
    else if (/RUB|₽/i.test(rawPrice)) currency = 'RUB';
    else if (/SEK|kr/i.test(rawPrice)) currency = 'SEK';
    else {
      const htmlLang = $('html').attr('lang') || '';
      const langCurrMap: Record<string, string> = { tr: 'TRY', en: 'USD', de: 'EUR', fr: 'EUR', ar: 'AED', ru: 'RUB', pl: 'PLN', es: 'EUR', it: 'EUR', nl: 'EUR', pt: 'EUR' };
      if (htmlLang && langCurrMap[htmlLang.slice(0, 2)]) currency = langCurrMap[htmlLang.slice(0, 2)];
    }

    const title = $('h1').first().text().trim()
      || $('title').text().replace('|', '').trim().slice(0, 80)
      || '';

    return { price, currency, title };
  } catch (e: any) {
    if (attempt < retries) { await sleep(1000 * (attempt + 1)); continue; }
    console.error(`scrapePrice error [${url.slice(0, 60)}]:`, e.message?.slice(0, 80));
    return { price: null, currency: 'TRY', title: '' };
  }
  }
  return { price: null, currency: 'TRY', title: '' };
}

// ── WHATSAPP ALERT ────────────────────────────────────────────────────────────
async function sendPriceAlert(userId: string, tracker: any, oldPrice: number, newPrice: number, isTargetHit = false): Promise<void> {
  try {
    const { data: us } = await supabase.from('user_settings').select('phone').eq('user_id', userId).single();
    if (!us?.phone) return;
    const { sendWhatsAppMessage } = require('./settings');
    const dir = newPrice < oldPrice ? '📉' : '📈';
    const diff = Math.abs(((newPrice - oldPrice) / oldPrice) * 100).toFixed(1);
    const curr = tracker.currency || 'TRY';

    let msg = isTargetHit
      ? `🎯 *Hedef Fiyat Tutturuldu!*\n\n*${tracker.name}* (${tracker.competitor_name})\n\nHedef: ${tracker.target_price?.toLocaleString('tr-TR')} ${curr}\nMevcut: ${newPrice.toLocaleString('tr-TR')} ${curr}\n\n💡 Rakip fiyatınızın altına indi!\n🔗 ${tracker.url}`
      : `${dir} *Fiyat ${newPrice < oldPrice ? 'Düştü' : 'Arttı'}!*\n\n*${tracker.name}* (${tracker.competitor_name})\n\n${oldPrice.toLocaleString('tr-TR')} → ${newPrice.toLocaleString('tr-TR')} ${curr} (%${diff})\n\n🔗 ${tracker.url}`;

    sendWhatsAppMessage(userId, us.phone, msg).catch(() => {});
  } catch { /* silent */ }
}

// ── CHECK SINGLE TRACKER ──────────────────────────────────────────────────────
async function checkTracker(tracker: any, userId: string): Promise<{ changed: boolean; oldPrice: number | null; newPrice: number | null; direction: string }> {
  const { price: newPrice } = await scrapePrice(tracker.url);
  if (!newPrice) return { changed: false, oldPrice: tracker.current_price, newPrice: null, direction: 'same' };

  const oldPrice: number = tracker.current_price || newPrice;
  const changed = Math.abs(newPrice - oldPrice) > 0.01; // epsilon for float comparison
  const direction = !changed ? 'same' : newPrice < oldPrice ? 'down' : 'up';

  // Update price history
  const history: Array<{ price: number; date: string }> = safeJson(tracker.price_history, []);
  const newHistory = [...history.slice(-29), { price: newPrice, date: new Date().toISOString() }];

  await supabase.from('price_trackers').update({
    current_price: newPrice,
    last_checked: new Date().toISOString(),
    price_history: newHistory,
  }).eq('id', tracker.id);

  if (changed) {
    // Save alert
    await supabase.from('price_alerts').insert([{
      user_id: userId,
      tracker_id: tracker.id,
      old_price: oldPrice,
      new_price: newPrice,
      direction,
      checked_at: new Date().toISOString(),
    }]);

    // WhatsApp: significant change (>1%) OR target price hit
    const changePct = Math.abs((newPrice - oldPrice) / oldPrice);
    const targetHit = tracker.target_price && newPrice <= tracker.target_price && oldPrice > tracker.target_price;

    if (changePct >= 0.01 || targetHit) {
      sendPriceAlert(userId, tracker, oldPrice, newPrice, targetHit).catch(() => {});
    }
  }

  return { changed, oldPrice, newPrice, direction };
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// POST /add — Add a new URL to track
router.post('/add', async (req: any, res: any) => {
  try {
    const { url, name, competitorName, targetPrice } = req.body;
    if (!url) return res.status(400).json({ error: 'URL zorunlu' });

    const { price, currency, title } = await scrapePrice(url);

    const { data, error } = await supabase.from('price_trackers').insert([{
      user_id: req.userId,
      url,
      name: name || title || url,
      competitor_name: competitorName || '',
      currency,
      initial_price: price,
      current_price: price,
      target_price: targetPrice ? parseFloat(targetPrice) : null,
      price_history: price ? [{ price, date: new Date().toISOString() }] : [],
      last_checked: new Date().toISOString(),
    }]).select().single();

    if (error) throw error;
    res.json({ tracker: data, currentPrice: price, currency, message: `Fiyat tespit edildi: ${price?.toLocaleString('tr-TR')} ${currency}` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /list — List all trackers with computed fields
router.get('/list', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('price_trackers')
      .select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    if (error) throw error;

    // Normalize price_history from strings or objects
    const normalized = (data || []).map((t: any) => ({
      ...t,
      price_history: safeJson(t.price_history, []),
      change_pct: t.initial_price && t.current_price
        ? ((t.current_price - t.initial_price) / t.initial_price) * 100
        : 0,
      target_gap_pct: t.target_price && t.current_price
        ? ((t.current_price - t.target_price) / t.current_price) * 100
        : null,
    }));

    res.json({ trackers: normalized });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const [tRes, aRes] = await Promise.allSettled([
      supabase.from('price_trackers').select('id', { count: 'exact', head: true }).eq('user_id', req.userId),
      supabase.from('price_alerts').select('direction').eq('user_id', req.userId),
    ]);
    const total = (tRes as any).value?.count || 0;
    const alerts: any[] = (aRes as any).value?.data || [];
    res.json({
      total,
      priceDrops: alerts.filter(a => a.direction === 'down').length,
      priceRises: alerts.filter(a => a.direction === 'up').length,
      targetHits: 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /alerts
router.get('/alerts', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('price_alerts')
      .select('*, price_trackers(name, url, competitor_name, currency)')
      .eq('user_id', req.userId)
      .order('checked_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    res.json({ alerts: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /check/:id — Check single tracker
router.post('/check/:id', async (req: any, res: any) => {
  try {
    const { data: tracker, error } = await supabase.from('price_trackers')
      .select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (error || !tracker) return res.status(404).json({ error: 'Bulunamadı' });

    const result = await checkTracker(tracker, req.userId);
    const dir = result.direction === 'down' ? '📉 Düştü' : result.direction === 'up' ? '📈 Arttı' : '→ Değişmedi';
    res.json({ ...result, message: `${result.newPrice?.toLocaleString('tr-TR')} ${tracker.currency} ${dir}` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /check-all — Check all trackers (background)
router.post('/check-all', async (req: any, res: any) => {
  try {
    const { data: trackers } = await supabase.from('price_trackers')
      .select('*').eq('user_id', req.userId);
    if (!trackers?.length) return res.json({ message: 'Takip edilen ürün yok' });
    res.json({ message: `${trackers.length} ürün kontrol ediliyor...` });
    (async () => {
      for (const t of trackers) {
        try { await checkTracker(t, req.userId); } catch {}
        await sleep(1500);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    await supabase.from('price_trackers').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Silindi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /:id/target — Update target price
router.patch('/:id/target', async (req: any, res: any) => {
  try {
    const { targetPrice } = req.body;
    await supabase.from('price_trackers').update({ target_price: parseFloat(targetPrice) }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Hedef fiyat güncellendi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── AUTO CHECK EVERY 6 HOURS ──────────────────────────────────────────────────
async function autoCheckAll() {
  console.log('[PriceTracker] Otomatik fiyat kontrolü başladı');
  try {
    const { data: trackers } = await supabase.from('price_trackers').select('*, users!inner(id)');
    for (const t of (trackers || [])) {
      try { await checkTracker(t, t.user_id); } catch {}
      await sleep(2000);
    }
    console.log('[PriceTracker] Otomatik kontrol tamamlandı');
  } catch (e: any) { console.error('[PriceTracker] Auto check error:', e.message); }
}
setInterval(autoCheckAll, 6 * 60 * 60 * 1000);

module.exports = router;
