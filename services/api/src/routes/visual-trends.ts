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

// ── PINTEREST SCRAPER ─────────────────────────────────────
async function scrapePinterest(keyword: string, limit = 10): Promise<any[]> {
  const images: any[] = [];
  try {
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}&rs=typed`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 12000 });
    const $ = cheerio.load(response.data);

    // Script tag'lerden JSON veri çek
    $('script').each((_: any, el: any) => {
      const content = $(el).html() || '';
      if (content.includes('pinimg.com') && content.includes('images')) {
        const urlMatches = content.match(/https:\/\/i\.pinimg\.com\/[^"'\\]+\.(jpg|jpeg|png|webp)/g) || [];
        urlMatches.forEach((imgUrl: string) => {
          const cleanUrl = imgUrl.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
          if (cleanUrl.includes('736x') || cleanUrl.includes('originals')) {
            const title = keyword;
            if (!images.find((i: any) => i.imageUrl === cleanUrl)) {
              images.push({
                id: Math.random().toString(36).slice(2),
                title,
                imageUrl: cleanUrl,
                source: 'Pinterest',
                saves: 0,
              });
            }
          }
        });
      }
    });

    // img tag fallback
    if (images.length < 3) {
      $('img[src*="pinimg.com"]').each((_: any, el: any) => {
        const src = $(el).attr('src') || '';
        const alt = $(el).attr('alt') || keyword;
        if (src && !src.includes('avatar') && !src.includes('60x60')) {
          const highRes = src.replace('/236x/', '/736x/').replace('/60x60/', '/736x/');
          if (!images.find((i: any) => i.imageUrl === highRes)) {
            images.push({ id: Math.random().toString(36).slice(2), title: alt, imageUrl: highRes, source: 'Pinterest', saves: 0 });
          }
        }
      });
    }
  } catch (e: any) {
    console.error('Pinterest error:', e.message);
  }
  return images.slice(0, limit);
}

// ── GOOGLE GÖRSELLERİ ────────────────────────────────────
async function scrapeGoogleImages(keyword: string, limit = 8): Promise<any[]> {
  const images: any[] = [];
  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(keyword + ' trend 2025')}&tbm=isch&hl=tr`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(response.data);

    $('script').each((_: any, el: any) => {
      const content = $(el).html() || '';
      const matches = content.match(/https?:\/\/[^\s"'\\]+\.(jpg|jpeg|png|webp)/g) || [];
      matches.forEach((url: string) => {
        if (!url.includes('google') && !url.includes('gstatic') && url.length < 300 && images.length < limit) {
          if (!images.find((i: any) => i.imageUrl === url)) {
            images.push({ id: Math.random().toString(36).slice(2), title: keyword, imageUrl: url, source: 'Google Images' });
          }
        }
      });
    });
  } catch (e: any) {
    console.error('Google images error:', e.message);
  }
  return images.slice(0, limit);
}

// ── INSTAGRAM TREND SCRAPER ───────────────────────────────
async function scrapeInstagramTrends(keyword: string): Promise<any[]> {
  const results: any[] = [];
  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent('#' + keyword.replace(/\s/g, '') + ' site:instagram.com')}&num=5&hl=tr`,
      { headers: HEADERS, timeout: 8000 }
    );
    const $ = cheerio.load(response.data);
    $('div.g').each((_: any, el: any) => {
      const title = $(el).find('h3').first().text().trim();
      const url = $(el).find('a').first().attr('href') || '';
      const snippet = $(el).find('.VwiC3b').first().text().trim();
      if (url.includes('instagram.com')) {
        results.push({ title, url, snippet, source: 'Instagram' });
      }
    });
  } catch {}
  return results.slice(0, 5);
}

// ── CLAUDE VISION ANALİZİ ─────────────────────────────────
async function analyzeImageWithClaude(imageUrl: string, keyword: string, sector: string): Promise<any> {
  try {
    // Önce resmi indir ve base64'e çevir
    const imgResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': HEADERS['User-Agent'] },
    });

    const base64 = Buffer.from(imgResponse.data).toString('base64');
    const contentType = imgResponse.headers['content-type'] || 'image/jpeg';

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: contentType, data: base64 },
          },
          {
            type: 'text',
            text: `Bu görseli "${keyword}" / "${sector}" sektörü bağlamında analiz et. Kısa JSON döndür:
{
  "trend": "Temsil ettiği trend (2-3 kelime)",
  "style": "Görsel stil (minimalist/canlı/doğal/lüks/modern)",
  "colors": ["ana renk 1", "ana renk 2"],
  "targetAudience": "Hedef kitle (5 kelime)",
  "campaignIdea": "Bu trendi kullanan WhatsApp mesajı (max 120 karakter, Türkçe)",
  "score": 8
}`,
          }
        ]
      }]
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e: any) {
    console.error('Claude vision error:', e.message);
    return null;
  }
}

// ── AI TREND RAPORU ───────────────────────────────────────
async function generateTrendReport(keyword: string, sector: string, analyses: any[]): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const validAnalyses = analyses.filter(Boolean).slice(0, 5);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `"${keyword}" (${sector || 'genel'} sektörü) görsel trend analizi:
${JSON.stringify(validAnalyses)}

Kapsamlı trend raporu JSON döndür:
{
  "summary": "2-3 cümle genel trend özeti",
  "topTrends": ["trend1", "trend2", "trend3", "trend4"],
  "dominantColors": ["renk1", "renk2", "renk3"],
  "dominantStyles": ["stil1", "stil2"],
  "targetAudience": "Ana hedef kitle",
  "marketOpportunity": "Pazar fırsatı (2 cümle)",
  "campaignIdeas": [
    {
      "title": "Kampanya adı",
      "channel": "whatsapp",
      "message": "Hazır WhatsApp mesaj taslağı [FIRMA_ADI] değişkeni ile",
      "targetGroup": "Hedef grup"
    },
    {
      "title": "Email Kampanya",
      "channel": "email",
      "message": "Email konu satırı",
      "targetGroup": "Hedef grup"
    }
  ],
  "bestPostingTime": "Günün en iyi paylaşım zamanı",
  "weeklyTrend": "Bu hafta yükselen/düşen",
  "actionPlan": ["eylem1", "eylem2", "eylem3"]
}`
      }]
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e: any) {
    console.error('Trend report error:', e.message);
    return null;
  }
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/visual-trends/analyze
router.post('/analyze', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, sector, analyzeImages = true } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword zorunlu' });

    console.log(`Visual trend: ${keyword} / ${sector || 'genel'}`);

    // Görselleri paralel çek
    const [pinterestRes, googleRes, instagramRes] = await Promise.allSettled([
      scrapePinterest(keyword, 8),
      scrapeGoogleImages(keyword, 6),
      scrapeInstagramTrends(keyword),
    ]);

    const pinterestImages = pinterestRes.status === 'fulfilled' ? pinterestRes.value : [];
    const googleImages = googleRes.status === 'fulfilled' ? googleRes.value : [];
    const instagramPosts = instagramRes.status === 'fulfilled' ? instagramRes.value : [];

    const allImages = [...pinterestImages, ...googleImages];

    // Claude Vision ile ilk 3 görseli analiz et
    const analyses: any[] = [];
    if (analyzeImages && allImages.length > 0) {
      for (const img of allImages.slice(0, 3)) {
        if (img.imageUrl) {
          const analysis = await analyzeImageWithClaude(img.imageUrl, keyword, sector || '');
          if (analysis) {
            img.aiAnalysis = analysis;
            analyses.push(analysis);
          }
          await sleep(800);
        }
      }
    }

    // Trend raporu üret
    const report = await generateTrendReport(keyword, sector || '', analyses);

    // DB'ye kaydet
    try {
      await supabase.from('trend_analyses').upsert([{
        user_id: userId,
        keyword,
        sector: sector || null,
        images_data: JSON.stringify(allImages.slice(0, 12)),
        report_data: JSON.stringify(report),
        analyzed_at: new Date().toISOString(),
      }], { onConflict: 'user_id,keyword', ignoreDuplicates: false });
    } catch {}

    res.json({
      keyword,
      sector,
      images: allImages.slice(0, 12),
      instagramPosts,
      report,
      analyzedCount: analyses.length,
    });
  } catch (e: any) {
    console.error('Visual trend error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/visual-trends/history
router.get('/history', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('trend_analyses')
      .select('id, keyword, sector, analyzed_at, report_data')
      .eq('user_id', userId)
      .order('analyzed_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json({ history: (data || []).map((h: any) => ({ ...h, report: h.report_data ? JSON.parse(h.report_data) : null })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/visual-trends/trending — Popüler sektör trendleri
router.get('/trending', async (req: any, res: any) => {
  try {
    const { sector } = req.query;
    const keywords = sector
      ? [`${sector} trend`, `${sector} 2025`, `${sector} yeni ürün`]
      : ['dekorasyon trend', 'mobilya 2025', 'ofis tasarım', 'iç mekan trend'];

    const results: any[] = [];
    for (const kw of keywords.slice(0, 2)) {
      const images = await scrapePinterest(kw, 4);
      results.push({ keyword: kw, images });
      await sleep(500);
    }

    res.json({ trending: results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;