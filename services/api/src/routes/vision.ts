export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── WEB SİTESİ SCREENSHOT → BASE64 ───────────────────────
async function captureWebsite(url: string): Promise<string | null> {
  try {
    // Puppeteer ile screenshot al
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url.startsWith('http') ? url : `https://${url}`, {
      waitUntil: 'domcontentloaded', timeout: 15000
    });
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    await browser.close();
    return (screenshot as Buffer).toString('base64');
  } catch (e: any) {
    console.error('Screenshot error:', e.message);
    return null;
  }
}

// ── CLAUDE VISION ANALİZİ ─────────────────────────────────
async function analyzeWithVision(imageBase64: string, lead: any): Promise<any> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        {
          type: 'text',
          text: `Bu web sitesi ekran görüntüsünü analiz et. Şirket: ${lead.company_name}

JSON döndür:
{
  "businessType": "İş türü (restoran/ofis/mağaza vb)",
  "style": "Modern/klasik/minimal/renkli",
  "primaryColors": ["renk1", "renk2"],
  "targetAudience": "Hedef kitle tahmini",
  "productService": "Temel ürün/hizmet",
  "quality": "premium | orta | ekonomik",
  "painPoints": ["olası sorun 1", "olası sorun 2"],
  "personalizedMessage": "Bu görsele özel Türkçe WhatsApp mesajı (max 130 karakter)",
  "icebreaker": "Buz kırıcı başlangıç cümlesi"
}`
        }
      ]
    }]
  });

  const text = response.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// POST /api/vision/analyze-lead
router.post('/analyze-lead', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId } = req.body;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.website) return res.status(400).json({ error: 'Lead\'in website bilgisi yok' });

    // Screenshot al
    const imageBase64 = await captureWebsite(lead.website);
    if (!imageBase64) return res.status(500).json({ error: 'Screenshot alınamadı' });

    // Claude Vision analizi
    const analysis = await analyzeWithVision(imageBase64, lead);

    // Kaydet
    await supabase.from('leads').update({
      vision_analysis: JSON.stringify(analysis),
      vision_analyzed_at: new Date().toISOString(),
    }).eq('id', leadId);

    res.json({ leadId, company: lead.company_name, analysis });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/vision/analyze-batch
router.post('/analyze-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.body;

    const { data: leads } = await supabase.from('leads').select('*')
      .eq('user_id', userId).not('website', 'is', null)
      .is('vision_analysis', null).limit(limit);

    if (!leads?.length) return res.json({ message: 'Analiz edilecek lead yok', analyzed: 0 });

    res.json({ message: `${leads.length} lead analiz ediliyor...`, total: leads.length });

    (async () => {
      let analyzed = 0;
      for (const lead of leads) {
        try {
          const imageBase64 = await captureWebsite(lead.website);
          if (imageBase64) {
            const analysis = await analyzeWithVision(imageBase64, lead);
            await supabase.from('leads').update({
              vision_analysis: JSON.stringify(analysis),
              vision_analyzed_at: new Date().toISOString(),
            }).eq('id', lead.id);
            analyzed++;
          }
          await new Promise(r => setTimeout(r, 2000));
        } catch (e: any) {
          console.error(`Vision error ${lead.company_name}:`, e.message);
        }
      }
      console.log(`Vision batch done: ${analyzed}/${leads.length}`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/vision/analyzed
router.get('/analyzed', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase.from('leads')
      .select('id, company_name, contact_name, website, vision_analysis, vision_analyzed_at')
      .eq('user_id', userId).not('vision_analysis', 'is', null)
      .order('vision_analyzed_at', { ascending: false }).limit(50);

    res.json({
      leads: (data || []).map((l: any) => ({
        ...l,
        analysis: l.vision_analysis ? (() => { try { return JSON.parse(l.vision_analysis); } catch { return null; } })() : null
      }))
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;