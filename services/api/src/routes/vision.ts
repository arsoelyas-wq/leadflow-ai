export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Module-level Anthropic singleton
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── WEB SİTESİ SCREENSHOT → BASE64 ───────────────────────────────────────────
async function captureWebsite(url: string): Promise<string | null> {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 65, fullPage: false });
    return (screenshot as Buffer).toString('base64');
  } catch (e: any) {
    console.error('Screenshot error:', e.message);
    return null;
  } finally {
    await browser.close();
  }
}

// ── CLAUDE VISION ANALİZİ ─────────────────────────────────────────────────────
async function analyzeWithVision(imageBase64: string, lead: any): Promise<any> {
  const TIMEOUT_MS = 30000;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Claude Vision timeout after 30s')), TIMEOUT_MS)
  );

  const claudePromise = anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        {
          type: 'text',
          text: `Bu web sitesi ekran görüntüsünü analiz et. Şirket: ${lead.company_name}

SADECE JSON döndür, başka hiçbir metin ekleme:
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

  const response = await Promise.race([claudePromise, timeoutPromise]);
  const text: string = (response as any).content[0]?.text || '';

  // Strip markdown code fences if Claude wraps in ```json ... ```
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  // Extract first JSON object
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ── POST /api/vision/analyze-lead ────────────────────────────────────────────
router.post('/analyze-lead', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId } = req.body;

    const { data: lead } = await supabase
      .from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.website) return res.status(400).json({ error: "Lead'in website bilgisi yok" });

    const imageBase64 = await captureWebsite(lead.website);
    if (!imageBase64) return res.status(500).json({ error: 'Screenshot alınamadı — site erişilemiyor olabilir' });

    const analysis = await analyzeWithVision(imageBase64, lead);
    if (!analysis) return res.status(500).json({ error: 'Claude analizi başarısız — JSON döndürülemedi' });

    await supabase.from('leads').update({
      vision_analysis: JSON.stringify(analysis),
      vision_analyzed_at: new Date().toISOString(),
    }).eq('id', leadId).eq('user_id', userId);

    res.json({ leadId, company: lead.company_name, analysis });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/vision/reanalyze-lead (force re-analysis) ──────────────────────
router.post('/reanalyze-lead', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId } = req.body;

    // Clear existing analysis first so it can be re-processed
    await supabase.from('leads')
      .update({ vision_analysis: null, vision_analyzed_at: null })
      .eq('id', leadId).eq('user_id', userId);

    const { data: lead } = await supabase
      .from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead?.website) return res.status(400).json({ error: "Lead'in website bilgisi yok" });

    const imageBase64 = await captureWebsite(lead.website);
    if (!imageBase64) return res.status(500).json({ error: 'Screenshot alınamadı' });

    const analysis = await analyzeWithVision(imageBase64, lead);
    if (!analysis) return res.status(500).json({ error: 'Claude analizi başarısız' });

    await supabase.from('leads').update({
      vision_analysis: JSON.stringify(analysis),
      vision_analyzed_at: new Date().toISOString(),
    }).eq('id', leadId).eq('user_id', userId);

    res.json({ leadId, company: lead.company_name, analysis });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/vision/analyze-batch ───────────────────────────────────────────
router.post('/analyze-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.body;

    const { data: leads } = await supabase
      .from('leads').select('id, company_name, website')
      .eq('user_id', userId)
      .not('website', 'is', null)
      .neq('website', '')
      // Exclude rows where vision_analysis has already been set (including the "null" string bug)
      .or('vision_analysis.is.null,vision_analysis.eq.null')
      .limit(limit);

    if (!leads?.length) return res.json({ message: 'Analiz edilecek lead yok', total: 0 });

    res.json({ message: `${leads.length} lead analiz kuyruğa alındı`, total: leads.length });

    (async () => {
      let ok = 0, failed = 0;
      for (const lead of leads) {
        try {
          const imageBase64 = await captureWebsite(lead.website);
          if (imageBase64) {
            const analysis = await analyzeWithVision(imageBase64, lead);
            if (analysis) {
              await supabase.from('leads').update({
                vision_analysis: JSON.stringify(analysis),
                vision_analyzed_at: new Date().toISOString(),
              }).eq('id', lead.id);
              ok++;
            } else {
              failed++;
              console.warn(`Vision: Claude returned null for ${lead.company_name}`);
            }
          } else {
            failed++;
          }
          await new Promise(r => setTimeout(r, 2000));
        } catch (e: any) {
          failed++;
          console.error(`Vision batch error [${lead.company_name}]:`, e.message);
        }
      }
      console.log(`Vision batch done: ${ok} ok, ${failed} failed`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/vision/analyzed ─────────────────────────────────────────────────
router.get('/analyzed', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase
      .from('leads')
      .select('id, company_name, website, vision_analysis, vision_analyzed_at')
      .eq('user_id', userId)
      .not('vision_analysis', 'is', null)
      .neq('vision_analysis', 'null')
      .order('vision_analyzed_at', { ascending: false })
      .limit(100);

    res.json({
      leads: (data || []).map((l: any) => ({
        ...l,
        analysis: (() => { try { return JSON.parse(l.vision_analysis); } catch { return null; } })(),
      })).filter((l: any) => l.analysis !== null),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
