export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── HABER VE PAZAR TARAMA ─────────────────────────────────
async function scanMarketNews(sector: string, country: string = 'TR'): Promise<any[]> {
  const alerts: any[] = [];
  try {
    const queries = [
      `${sector} sektörü fiyat artış düşüş`,
      `${sector} ihracat ithalat gümrük vergi`,
      `${sector} pazar fırsat kriz`,
    ];

    for (const query of queries) {
      const resp = await axios.get(
        `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`,
        { timeout: 8000 }
      );
      const text = resp.data || '';
      const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const item of items.slice(0, 3)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

        if (title) {
          const type = title.includes('artış') || title.includes('yüksel') ? 'opportunity' :
                       title.includes('düşüş') || title.includes('kriz') ? 'crisis' : 'info';
          alerts.push({ title, link, pubDate, type, sector, query });
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (e: any) {
    console.error('Crisis radar scan error:', e.message);
  }
  return alerts.slice(0, 10);
}

// ── AI ANALİZ ─────────────────────────────────────────────
async function analyzeAlerts(alerts: any[], userSector: string): Promise<string> {
  if (!alerts.length) return 'Dikkat çekici gelişme tespit edilmedi.';
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `${userSector} sektöründe faaliyet gösteren bir işletme sahibi için şu haberleri analiz et ve kısa strateji öner:

${alerts.map(a => `- ${a.title}`).join('\n')}

3-4 cümle ile: Ne yapmalı? Hangi fırsat var? Hangi risk var?`
      }]
    });
    return resp.content[0]?.text?.trim() || '';
  } catch { return ''; }
}

// GET /api/crisis/scan
router.get('/scan', async (req: any, res: any) => {
  try {
    const { sector, country } = req.query;
    if (!sector) return res.status(400).json({ error: 'sector zorunlu' });

    const alerts = await scanMarketNews(sector as string, country as string);
    const analysis = await analyzeAlerts(alerts, sector as string);

    // DB'ye kaydet
    if (alerts.length > 0) {
      await supabase.from('crisis_alerts').insert(
        alerts.map(a => ({
          user_id: req.userId,
          title: a.title,
          link: a.link,
          type: a.type,
          sector: a.sector,
          scanned_at: new Date().toISOString(),
        }))
      ).catch(() => {});
    }

    res.json({ alerts, analysis, total: alerts.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/crisis/alerts — Geçmiş alarmlar
router.get('/alerts', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('crisis_alerts')
      .select('*').eq('user_id', req.userId)
      .order('scanned_at', { ascending: false }).limit(30);
    res.json({ alerts: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/crisis/auto-scan — Otomatik tarama ayarları
router.post('/auto-scan', async (req: any, res: any) => {
  try {
    const { sectors, active } = req.body;
    await supabase.from('crisis_settings').upsert([{
      user_id: req.userId, sectors, active,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    res.json({ message: 'Otomatik tarama ayarlandı' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/crisis/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('crisis_alerts').select('type').eq('user_id', req.userId);
    res.json({
      total: data?.length || 0,
      opportunities: data?.filter((d: any) => d.type === 'opportunity').length || 0,
      crises: data?.filter((d: any) => d.type === 'crisis').length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Her 6 saatte bir otomatik tara
setInterval(async () => {
  try {
    const { data: settings } = await supabase.from('crisis_settings').select('*').eq('active', true);
    for (const setting of settings || []) {
      for (const sector of (setting.sectors || [])) {
        const alerts = await scanMarketNews(sector);
        if (alerts.length > 0) {
          await supabase.from('crisis_alerts').insert(
            alerts.map((a: any) => ({ user_id: setting.user_id, ...a, scanned_at: new Date().toISOString() }))
          ).catch(() => {});
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } catch {}
}, 6 * 60 * 60 * 1000);

module.exports = router;