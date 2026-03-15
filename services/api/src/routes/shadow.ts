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

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

// ── RAKİP VERİ TOPLAMA ────────────────────────────────────

async function fetchCompetitorData(name: string, website: string): Promise<any> {
  const data: any = {
    name,
    timestamp: new Date().toISOString(),
    pricing: [],
    products: [],
    reviews: { count: 0, avg: 0, recent: [] },
    social: { instagram: null, facebook: null, linkedin: null },
    ads: [],
    traffic: null,
    techStack: [],
    jobPostings: [],
    changes: [],
  };

  // 1. Web sitesi analizi
  if (website) {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
      const $ = cheerio.load(response.data);

      // Fiyat bilgileri
      $('[class*="price"], [class*="fiyat"], [class*="preis"]').each((_: any, el: any) => {
        const text = $(el).text().trim();
        const priceMatch = text.match(/[\d.,]+\s*(₺|TL|USD|\$|EUR|€)/);
        if (priceMatch && !data.pricing.includes(priceMatch[0])) {
          data.pricing.push(priceMatch[0]);
        }
      });

      // Ürünler/hizmetler
      $('[class*="product"], [class*="service"], [class*="urun"], [class*="hizmet"]').each((_: any, el: any) => {
        const text = $(el).find('h2, h3, h4').first().text().trim();
        if (text && text.length > 3 && text.length < 100 && !data.products.includes(text)) {
          data.products.push(text);
        }
      });

      // Sosyal medya linkleri
      $('a[href*="instagram.com"]').each((_: any, el: any) => {
        const href = $(el).attr('href') || '';
        if (!data.social.instagram) data.social.instagram = href;
      });
      $('a[href*="facebook.com"]').each((_: any, el: any) => {
        const href = $(el).attr('href') || '';
        if (!data.social.facebook) data.social.facebook = href;
      });
      $('a[href*="linkedin.com"]').each((_: any, el: any) => {
        const href = $(el).attr('href') || '';
        if (!data.social.linkedin) data.social.linkedin = href;
      });

      // Tech stack
      const html = response.data;
      const techs: string[] = [];
      if (html.includes('wp-content')) techs.push('WordPress');
      if (html.includes('shopify')) techs.push('Shopify');
      if (html.includes('wix.com')) techs.push('Wix');
      if (html.includes('gtag') || html.includes('google-analytics')) techs.push('Google Analytics');
      if (html.includes('facebook.net/en_US/fbevents')) techs.push('Meta Pixel');
      if (html.includes('hotjar')) techs.push('Hotjar');
      data.techStack = techs;

    } catch (e: any) {
      console.error(`Website fetch error for ${name}:`, e.message);
    }
  }

  // 2. Google'dan yorum/rating al
  try {
    const query = `"${name}" yorumlar site:google.com OR site:yandex.com.tr OR site:trustpilot.com`;
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(name + ' müşteri yorumları')}&num=5&hl=tr`,
      { headers: HEADERS, timeout: 8000 }
    );
    const $ = cheerio.load(response.data);

    // Rating
    const ratingText = $('[data-attrid*="rating"]').first().text().trim();
    const ratingMatch = ratingText.match(/([\d.]+)\s*\/?\s*5/);
    if (ratingMatch) data.reviews.avg = parseFloat(ratingMatch[1]);

    const reviewText = $('[data-attrid*="review"]').first().text().trim();
    const reviewMatch = reviewText.match(/[\d.,]+/);
    if (reviewMatch) data.reviews.count = parseInt(reviewMatch[0].replace('.', ''));

    await sleep(500);
  } catch {}

  // 3. Şikayetvar
  try {
    const response = await axios.get(
      `https://www.sikayetvar.com/search?q=${encodeURIComponent(name)}`,
      { headers: HEADERS, timeout: 8000 }
    );
    const $ = cheerio.load(response.data);
    const complaints: string[] = [];
    $('.complaint-title, .sb-card__title').each((_: any, el: any) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) complaints.push(text);
    });
    if (complaints.length > 0) {
      data.reviews.recent = complaints.slice(0, 5);
    }
    await sleep(500);
  } catch {}

  // 4. İş ilanları (büyüme sinyali)
  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(name + ' iş ilanı kariyer')}&num=3&hl=tr`,
      { headers: HEADERS, timeout: 8000 }
    );
    const $ = cheerio.load(response.data);
    $('div.g').each((_: any, el: any) => {
      const title = $(el).find('h3').first().text().trim();
      if (title.toLowerCase().includes('ilan') || title.toLowerCase().includes('kariyer')) {
        data.jobPostings.push(title);
      }
    });
    await sleep(500);
  } catch {}

  return data;
}

// Değişiklikleri karşılaştır
function detectChanges(oldData: any, newData: any): string[] {
  const changes: string[] = [];
  if (!oldData) return ['İlk tarama'];

  // Fiyat değişiklikleri
  const newPrices = newData.pricing.filter((p: string) => !oldData.pricing?.includes(p));
  const removedPrices = (oldData.pricing || []).filter((p: string) => !newData.pricing.includes(p));
  if (newPrices.length) changes.push(`Yeni fiyat: ${newPrices.join(', ')}`);
  if (removedPrices.length) changes.push(`Kaldırılan fiyat: ${removedPrices.join(', ')}`);

  // Yeni ürünler
  const newProducts = newData.products.filter((p: string) => !(oldData.products || []).includes(p));
  if (newProducts.length) changes.push(`Yeni ürün/hizmet: ${newProducts.slice(0, 2).join(', ')}`);

  // Yorum sayısı değişimi
  if (oldData.reviews?.count && newData.reviews.count > oldData.reviews.count + 10) {
    changes.push(`Yorum sayısı arttı: ${oldData.reviews.count} → ${newData.reviews.count}`);
  }

  // Rating değişimi
  if (oldData.reviews?.avg && Math.abs(newData.reviews.avg - oldData.reviews.avg) >= 0.2) {
    changes.push(`Rating değişti: ${oldData.reviews.avg} → ${newData.reviews.avg}`);
  }

  // İş ilanı
  if (newData.jobPostings.length > (oldData.jobPostings?.length || 0)) {
    changes.push('Yeni iş ilanı yayınladı — büyüme sinyali!');
  }

  return changes;
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/shadow/list
router.get('/list', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('competitors')
      .select('id, name, city, sector, last_scanned_at, shadow_data, shadow_changes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ competitors: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/shadow/scan/:id — Tek rakip tara
router.post('/scan/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: competitor } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (!competitor) return res.status(404).json({ error: 'Rakip bulunamadı' });

    // Eski veriyi al
    const oldData = competitor.shadow_data ? JSON.parse(competitor.shadow_data) : null;

    // Yeni veri çek
    const website = competitor.website || '';
    const newData = await fetchCompetitorData(competitor.name, website);

    // Değişiklikleri tespit et
    const changes = detectChanges(oldData, newData);

    // AI analiz
    let aiInsight = '';
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Rakip analizi: ${competitor.name}
Fiyatlar: ${newData.pricing.slice(0,3).join(', ') || 'Bulunamadı'}
Ürünler: ${newData.products.slice(0,3).join(', ') || 'Bulunamadı'}
Rating: ${newData.reviews.avg || 'Bilinmiyor'}/5 (${newData.reviews.count} yorum)
Son şikayetler: ${newData.reviews.recent.slice(0,2).join(' | ') || 'Yok'}
Değişiklikler: ${changes.join(', ') || 'Yok'}
İş ilanları: ${newData.jobPostings.length > 0 ? 'Var' : 'Yok'}

3 cümle Türkçe strateji önerisi ver. JSON döndür: {"insight": "...", "opportunity": "...", "threat": "..."}`
        }]
      });
      const text = response.content[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) aiInsight = match[0];
    } catch {}

    // Kaydet
    await supabase.from('competitors').update({
      shadow_data: JSON.stringify(newData),
      shadow_changes: JSON.stringify(changes),
      last_scanned_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    res.json({
      competitor: competitor.name,
      data: newData,
      changes,
      aiInsight: aiInsight ? JSON.parse(aiInsight) : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/shadow/scan-all — Tüm rakipleri tara
router.post('/scan-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: competitors } = await supabase
      .from('competitors').select('*').eq('user_id', userId);

    if (!competitors?.length) return res.json({ message: 'Rakip yok' });

    let scanned = 0;
    const allChanges: any[] = [];

    for (const comp of competitors) {
      try {
        const oldData = comp.shadow_data ? JSON.parse(comp.shadow_data) : null;
        const newData = await fetchCompetitorData(comp.name, comp.website || '');
        const changes = detectChanges(oldData, newData);

        await supabase.from('competitors').update({
          shadow_data: JSON.stringify(newData),
          shadow_changes: JSON.stringify(changes),
          last_scanned_at: new Date().toISOString(),
        }).eq('id', comp.id);

        if (changes.length > 0) {
          allChanges.push({ competitor: comp.name, changes });
        }
        scanned++;
        await sleep(2000);
      } catch (e: any) {
        console.error(`Shadow scan error for ${comp.name}:`, e.message);
      }
    }

    res.json({ scanned, changesDetected: allChanges.length, changes: allChanges });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/shadow/add-website/:id — Rakibe website ekle
router.post('/add-website/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { website } = req.body;
    if (!website) return res.status(400).json({ error: 'website zorunlu' });

    await supabase.from('competitors')
      .update({ website })
      .eq('id', req.params.id)
      .eq('user_id', userId);

    res.json({ message: 'Website eklendi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;