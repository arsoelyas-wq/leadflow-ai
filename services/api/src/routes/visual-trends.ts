export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const GOOGLE_API_KEY = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

// ── GOOGLE CSE GÖRSEL ARAMA ───────────────────────────────
async function searchGoogleImages(keyword: string, limit = 10): Promise<any[]> {
  const images: any[] = [];
  try {
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      console.error('GOOGLE_PLACES_API_KEY veya GOOGLE_CSE_ID eksik');
      return [];
    }

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        q: keyword,
        searchType: 'image',
        num: Math.min(limit, 10),
        imgSize: 'large',
        imgType: 'photo',
        safe: 'active',
        hl: 'tr',
      },
      timeout: 10000,
    });

    const items = response.data?.items || [];
    items.forEach((item: any) => {
      images.push({
        id: Math.random().toString(36).slice(2),
        title: item.title || keyword,
        imageUrl: item.link,
        thumbnailUrl: item.image?.thumbnailLink,
        contextUrl: item.image?.contextLink,
        source: 'Google Images',
        width: item.image?.width,
        height: item.image?.height,
      });
    });
  } catch (e: any) {
    console.error('Google CSE images error:', e.response?.data?.error?.message || e.message);
  }
  return images;
}

// ── GOOGLE CSE WEB ARAMA ──────────────────────────────────
async function searchGoogleWeb(keyword: string, limit = 8): Promise<any[]> {
  const results: any[] = [];
  try {
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) return [];

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        q: keyword,
        num: Math.min(limit, 10),
        hl: 'tr',
      },
      timeout: 10000,
    });

    const items = response.data?.items || [];
    items.forEach((item: any) => {
      results.push({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: new URL(item.link).hostname,
      });
    });
  } catch (e: any) {
    console.error('Google CSE web error:', e.response?.data?.error?.message || e.message);
  }
  return results;
}

// ── PINTEREST SCRAPER (GOOGLE CSE ile) ───────────────────
async function searchPinterest(keyword: string, limit = 8): Promise<any[]> {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        q: `${keyword} site:pinterest.com`,
        searchType: 'image',
        num: Math.min(limit, 10),
        hl: 'tr',
      },
      timeout: 10000,
    });

    return (response.data?.items || []).map((item: any) => ({
      id: Math.random().toString(36).slice(2),
      title: item.title || keyword,
      imageUrl: item.link,
      thumbnailUrl: item.image?.thumbnailLink,
      contextUrl: item.image?.contextLink,
      source: 'Pinterest',
    }));
  } catch (e: any) {
    console.error('Pinterest CSE error:', e.response?.data?.error?.message || e.message);
    return [];
  }
}

// ── INSTAGRAM TREND ARAMA ────────────────────────────────
async function searchInstagramTrends(keyword: string): Promise<any[]> {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        q: `${keyword} site:instagram.com`,
        num: 5,
        hl: 'tr',
      },
      timeout: 10000,
    });

    return (response.data?.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: 'Instagram',
    }));
  } catch (e: any) {
    console.error('Instagram CSE error:', e.message);
    return [];
  }
}

// ── CLAUDE VISION ANALİZİ ─────────────────────────────────
async function analyzeImageWithClaude(imageUrl: string, keyword: string, sector: string): Promise<any> {
  try {
    const imgResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadFlowBot/1.0)' },
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
          { type: 'image', source: { type: 'base64', media_type: contentType, data: base64 } },
          {
            type: 'text',
            text: `Bu görseli "${keyword}" / "${sector || 'genel'}" bağlamında analiz et. JSON döndür:
{
  "trend": "Temsil ettiği trend (2-3 kelime)",
  "style": "Görsel stil",
  "colors": ["renk1", "renk2"],
  "targetAudience": "Hedef kitle",
  "campaignIdea": "WhatsApp mesaj taslağı (max 120 karakter, Türkçe)",
  "score": 8
}`,
          }
        ]
      }]
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*?\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e: any) {
    console.error('Claude vision error:', e.message);
    return null;
  }
}

// ── AI TREND RAPORU ───────────────────────────────────────
async function generateTrendReport(keyword: string, sector: string, analyses: any[], webResults: any[]): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const validAnalyses = analyses.filter(Boolean).slice(0, 5);
    const webSnippets = webResults.slice(0, 3).map((r: any) => r.snippet).join(' | ');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `"${keyword}" (${sector || 'genel'} sektörü) kapsamlı trend analizi:

Görsel analizler: ${JSON.stringify(validAnalyses)}
Web bulguları: ${webSnippets}

JSON döndür (geçerli JSON olsun):
{
  "summary": "2-3 cümle genel trend özeti",
  "topTrends": ["trend1", "trend2", "trend3"],
  "dominantColors": ["renk1", "renk2"],
  "dominantStyles": ["stil1", "stil2"],
  "targetAudience": "Ana hedef kitle",
  "marketOpportunity": "Pazar fırsatı",
  "campaignIdeas": [
    {"title": "WA Kampanya", "channel": "whatsapp", "message": "Mesaj taslağı [FIRMA_ADI] ile", "targetGroup": "Hedef"},
    {"title": "Email", "channel": "email", "message": "Konu satırı", "targetGroup": "Hedef"}
  ],
  "bestPostingTime": "En iyi paylaşım zamanı",
  "actionPlan": ["eylem1", "eylem2", "eylem3"]
}`
      }]
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    // Güvenli JSON parse
    const cleaned = match[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.error('Trend report error:', e.message);
    return null;
  }
}

// ── ROUTES ────────────────────────────────────────────────

router.post('/analyze', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, sector, analyzeImages = true } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword zorunlu' });

    console.log(`Visual trend: ${keyword} / ${sector || 'genel'}`);

    // Paralel arama — Google CSE
    const [pinterestRes, googleImgRes, webRes, instagramRes] = await Promise.allSettled([
      searchPinterest(keyword, 6),
      searchGoogleImages(`${keyword} trend 2025`, 6),
      searchGoogleWeb(`${keyword} trend pazar analiz`, 5),
      searchInstagramTrends(keyword),
    ]);

    const pinterestImages = pinterestRes.status === 'fulfilled' ? pinterestRes.value : [];
    const googleImages = googleImgRes.status === 'fulfilled' ? googleImgRes.value : [];
    const webResults = webRes.status === 'fulfilled' ? webRes.value : [];
    const instagramPosts = instagramRes.status === 'fulfilled' ? instagramRes.value : [];

    // Tüm görseller — Pinterest önce
    const allImages = [...pinterestImages, ...googleImages];

    // Claude Vision analizi
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

    // Trend raporu
    const report = await generateTrendReport(keyword, sector || '', analyses, webResults);

    // DB kaydet
    try {
      await supabase.from('trend_analyses').upsert([{
        user_id: userId,
        keyword,
        sector: sector || null,
        images_data: JSON.stringify(allImages.slice(0, 12)),
        report_data: report ? JSON.stringify(report) : null,
        analyzed_at: new Date().toISOString(),
      }], { onConflict: 'user_id,keyword', ignoreDuplicates: false });
    } catch {}

    res.json({
      keyword,
      sector,
      images: allImages.slice(0, 12),
      webResults,
      instagramPosts,
      report,
      analyzedCount: analyses.length,
    });
  } catch (e: any) {
    console.error('Visual trend error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

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
    res.json({
      history: (data || []).map((h: any) => ({
        ...h,
        report: h.report_data ? (() => { try { return JSON.parse(h.report_data); } catch { return null; } })() : null
      }))
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/trending', async (req: any, res: any) => {
  try {
    const { sector } = req.query;
    const keywords = sector
      ? [`${sector} trend 2025`, `${sector} yeni ürün`]
      : ['dekorasyon trend 2025', 'mobilya modern'];

    const results: any[] = [];
    for (const kw of keywords.slice(0, 2)) {
      const images = await searchGoogleImages(kw, 4);
      results.push({ keyword: kw, images });
      await sleep(300);
    }
    res.json({ trending: results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;