export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Sektör → ihracat ülke eşleşmeleri
const SECTOR_EXPORT_MARKETS: Record<string, any[]> = {
  'mobilya': [
    { country: 'Almanya', demand: 'yüksek', avgOrderSize: '50K-200K EUR', tip: 'Kalite sertifikası şart (FSC, CE)' },
    { country: 'İngiltere', demand: 'yüksek', avgOrderSize: '30K-150K GBP', tip: 'Brexit sonrası UKCA gerekli' },
    { country: 'ABD', demand: 'orta', avgOrderSize: '100K-500K USD', tip: 'CARB sertifikası gerekli' },
    { country: 'BAE', demand: 'yüksek', avgOrderSize: '50K-300K USD', tip: 'Lüks segment çok talep görüyor' },
  ],
  'tekstil': [
    { country: 'Almanya', demand: 'çok yüksek', avgOrderSize: '20K-100K EUR', tip: 'OEKO-TEX sertifikası kritik' },
    { country: 'Fransa', demand: 'yüksek', avgOrderSize: '15K-80K EUR', tip: 'Moda haftası bağlantıları değerli' },
    { country: 'ABD', demand: 'yüksek', avgOrderSize: '50K-250K USD', tip: 'Amazon ve Walmart tedarikçisi olabilirsiniz' },
  ],
  'inşaat': [
    { country: 'Katar', demand: 'çok yüksek', avgOrderSize: '500K-5M USD', tip: 'Katar 2030 vizyonu projeleri' },
    { country: 'BAE', demand: 'yüksek', avgOrderSize: '200K-2M USD', tip: 'Dubai Expo sonrası altyapı yatırımları' },
    { country: 'Kazakistan', demand: 'orta', avgOrderSize: '100K-1M USD', tip: 'Türk müteahhitlere yakın pazar' },
  ],
  'gıda': [
    { country: 'Almanya', demand: 'yüksek', avgOrderSize: '10K-50K EUR', tip: 'Helal sertifikası Türk pazarına avantaj' },
    { country: 'İngiltere', demand: 'yüksek', avgOrderSize: '15K-75K GBP', tip: 'Türk diaspora pazarı büyük' },
    { country: 'Körfez', demand: 'çok yüksek', avgOrderSize: '30K-200K USD', tip: 'Helal gıda talebi yüksek' },
  ],
  'dekorasyon': [
    { country: 'BAE', demand: 'çok yüksek', avgOrderSize: '30K-150K USD', tip: 'Lüks villa projeleri' },
    { country: 'Almanya', demand: 'yüksek', avgOrderSize: '20K-100K EUR', tip: 'El yapımı ürünlere talep var' },
    { country: 'ABD', demand: 'orta', avgOrderSize: '25K-120K USD', tip: 'Etsy ve Amazon Handmade için uygun' },
  ],
};

// AI ihracat analizi
async function generateExportAnalysis(lead: any, targetMarkets: any[]): Promise<any> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Türk şirket için ihracat fırsatı analizi:

Şirket: ${lead.company_name}
Sektör: ${lead.sector || 'bilinmiyor'}
Şehir: ${lead.city || ''}
Website: ${lead.website || 'yok'}
Hedef pazarlar: ${JSON.stringify(targetMarkets)}

JSON döndür:
{
  "exportReadiness": 1-10,
  "topMarkets": ["market1", "market2", "market3"],
  "quickWins": ["hızlı kazanım 1", "hızlı kazanım 2"],
  "challenges": ["zorluk 1", "zorluk 2"],
  "firstStep": "İlk yapılacak somut adım",
  "estimatedRevenue": "Yıllık tahmini ihracat geliri",
  "outreachMessage": "İhracat fırsatı için WhatsApp mesajı (Türkçe)"
}`
    }]
  });

  const text = response.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// GET /api/export/markets — Sektör bazlı pazarlar
router.get('/markets', async (req: any, res: any) => {
  try {
    const { sector } = req.query;
    if (sector) {
      const sectorLower = (sector as string).toLowerCase();
      const markets = Object.entries(SECTOR_EXPORT_MARKETS).find(([key]) =>
        sectorLower.includes(key)
      );
      return res.json({ sector, markets: markets?.[1] || [], allSectors: Object.keys(SECTOR_EXPORT_MARKETS) });
    }
    res.json({ sectors: SECTOR_EXPORT_MARKETS });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/export/analyze-lead
router.post('/analyze-lead', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId } = req.body;

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const sectorLower = (lead.sector || '').toLowerCase();
    const relevantMarkets = Object.entries(SECTOR_EXPORT_MARKETS).find(([key]) =>
      sectorLower.includes(key)
    );
    const targetMarkets = relevantMarkets?.[1] || SECTOR_EXPORT_MARKETS['mobilya'];

    const analysis = await generateExportAnalysis(lead, targetMarkets);

    res.json({ lead: lead.company_name, sector: lead.sector, targetMarkets, analysis });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/export/analyze-batch — Tüm leadleri analiz et
router.post('/analyze-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: leads } = await supabase.from('leads').select('*')
      .eq('user_id', userId).not('sector', 'is', null).limit(20);

    if (!leads?.length) return res.json({ message: 'Sektör bilgisi olan lead yok', analyzed: 0 });

    res.json({ message: `${leads.length} lead için ihracat analizi başlıyor...`, total: leads.length });

    (async () => {
      for (const lead of leads) {
        try {
          const sectorLower = (lead.sector || '').toLowerCase();
          const relevantMarkets = Object.entries(SECTOR_EXPORT_MARKETS).find(([key]) => sectorLower.includes(key));
          const targetMarkets = relevantMarkets?.[1] || [];
          if (!targetMarkets.length) continue;

          const analysis = await generateExportAnalysis(lead, targetMarkets);
          await supabase.from('leads').update({
            export_analysis: JSON.stringify(analysis),
            export_analyzed_at: new Date().toISOString(),
          }).eq('id', lead.id);
          await new Promise(r => setTimeout(r, 500));
        } catch {}
      }
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/export/opportunities — İhracat fırsatları
router.get('/opportunities', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: leads } = await supabase.from('leads')
      .select('id, company_name, sector, city, export_analysis')
      .eq('user_id', userId).not('export_analysis', 'is', null)
      .order('created_at', { ascending: false }).limit(50);

    res.json({
      leads: (leads || []).map((l: any) => ({
        ...l,
        analysis: l.export_analysis ? (() => { try { return JSON.parse(l.export_analysis); } catch { return null; } })() : null,
      }))
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;