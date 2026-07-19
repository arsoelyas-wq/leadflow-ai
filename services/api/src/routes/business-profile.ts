export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// POST /api/settings/business-profile — Profili kaydet
router.post('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { company, product, target, salesStyle, faq, objections } = req.body;

    await supabase.from('business_profiles').upsert([{
      user_id: userId,
      company, product, target, sales_style: salesStyle,
      faq, objections,
      updated_at: new Date().toISOString(),
    }]);

    // Voice settings güncelle
    if (salesStyle?.agent_name) {
      await supabase.from('voice_settings').upsert([{
        user_id: userId,
        agent_name: salesStyle.agent_name,
        company_name: company?.name,
        product_description: product?.description,
      }]);
    }

    res.json({ ok: true, message: 'Profil kaydedildi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/settings/business-profile — Profili al
router.get('/', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('business_profiles').select('*').eq('user_id', req.userId).single();
    res.json({ profile: data || null });
  } catch {
    res.json({ profile: null });
  }
});

// GET /api/settings/business-profile/ai-context — AI için tam context
router.get('/ai-context', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('business_profiles').select('*').eq('user_id', req.userId).single();
    if (!data) return res.json({ context: null });

    // AI için optimize edilmiş context string
    const ctx = buildAIContext(data);
    res.json({ context: ctx, profile: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/settings/business-profile/analyze-website — AI ile web sitesinden bilgi çıkar
router.post('/analyze-website', async (req: any, res: any) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL gerekli' });

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    let pageText = '';
    try {
      const https = require('https');
      const http = require('http');
      const client = fullUrl.startsWith('https') ? https : http;
      pageText = await new Promise((resolve, reject) => {
        const request = client.get(fullUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadflowBot/1.0)' },
          timeout: 10000,
        }, (r: any) => {
          let data = '';
          r.setEncoding('utf8');
          r.on('data', (chunk: string) => { if (data.length < 200000) data += chunk; });
          r.on('end', () => resolve(data));
        });
        request.on('error', reject);
        request.on('timeout', () => { request.destroy(); reject(new Error('timeout')); });
      });
    } catch {
      return res.status(400).json({ error: 'Website erişilemedi. URL\'yi kontrol edin.' });
    }

    // HTML'i temizle ve kısalt
    const cleanText = String(pageText)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);

    if (!cleanText || cleanText.length < 50) {
      return res.status(400).json({ error: 'Web sitesinden içerik okunamadı.' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI servisi şu an kullanılamıyor.' });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Bu web sitesi metninden şirket bilgilerini çıkar ve aşağıdaki JSON formatında döndür. Türkçe yaz.

Metin:
${cleanText}

JSON (sadece bu formatı döndür, başka hiçbir şey yazma):
{
  "company_name": "şirket adı veya boş string",
  "sector": "sadece şunlardan biri seç: Teknoloji / Yazılım | İmalat / Üretim | İnşaat / Gayrimenkul | Tekstil / Moda | Gıda / İçecek | Sağlık / İlaç | Eğitim | Finans / Sigorta | Lojistik / Nakliye | Turizm / Otelcilik | Perakende / E-ticaret | Danışmanlık / Hizmet | Diğer",
  "product_name": "ana ürün veya hizmet adı",
  "product_description": "2-3 cümleyle ne yaptıklarını açıkla",
  "advantages": ["1. avantaj", "2. avantaj", "3. avantaj"],
  "target_result": "müşteriye sağlanan somut değer",
  "city": "şehir (yoksa boş bırak)"
}`,
      }],
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Analiz sonucu yorumlanamadı.' });

    let data: any;
    try {
      data = JSON.parse(match[0]);
    } catch {
      return res.status(500).json({ error: 'Analiz sonucu formatı hatalı.' });
    }

    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Analiz başarısız' });
  }
});

function buildAIContext(profile: any): string {
  const { company, product, target, sales_style, faq, objections } = profile;
  return `
ŞİRKET: ${company?.name || ''}
SEKTÖR: ${company?.sector || ''}
ŞEHİR: ${company?.city || ''}

ÜRÜN/HİZMET: ${product?.name || ''}
AÇIKLAMA: ${product?.description || ''}
FİYAT: ${product?.price_range || ''}
AVANTAJLAR: ${(product?.advantages || []).filter(Boolean).join(' | ')}
MÜŞTERİ KAZANCI: ${product?.target_result || ''}
TESLİMAT: ${product?.delivery_time || ''}

HEDEF MÜŞTERİ:
- Sektörler: ${(target?.sectors || []).join(', ')}
- Büyüklük: ${target?.company_size || ''}
- Karar Verici: ${target?.decision_maker || ''}
- Sorunları: ${(target?.pain_points || []).filter(Boolean).join(' | ')}

SATIŞ TARZI:
- Ton: ${sales_style?.tone || 'friendly'}
- Dil: ${sales_style?.language_style || 'formal'}
- Açılış: ${sales_style?.opening_line || ''}
- Kullanılmayacak kelimeler: ${sales_style?.avoid_words || ''}

SSS:
${(faq || []).filter((f: any) => f.q && f.a).map((f: any) => `S: ${f.q}\nC: ${f.a}`).join('\n\n')}

İTİRAZ KARŞILAMA:
${(objections || []).filter((o: any) => o.a).map((o: any) => `"${o.q}" derse: ${o.a}`).join('\n')}
`.trim();
}

module.exports = router;