export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── AI İLE KİŞİSEL KATALOĞ OLUŞTUR ───────────────────────
async function generateMicrositeContent(lead: any, products: any[]): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `${lead.company_name} için kişisel katalog sayfası içeriği oluştur.
Sektör: ${lead.sector || 'genel'}
Şehir: ${lead.city || ''}
Ürünler: ${products.slice(0, 5).map((p: any) => p.name).join(', ')}

JSON döndür:
{
  "headline": "Kişisel başlık max 60 karakter",
  "subheadline": "Alt başlık max 100 karakter",
  "intro": "Kişisel giriş paragrafı max 150 karakter",
  "ctaText": "Hemen İletişime Geç"
}`
      }]
    });
    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {
      headline: `${lead.company_name} için Özel Koleksiyon`,
      subheadline: 'Size özel seçilmiş ürünler',
      intro: 'Sizin için hazırladığımız özel ürün seçkisi',
      ctaText: 'Hemen İletişime Geç',
    };
  } catch {
    return {
      headline: `${lead.company_name} için Özel Koleksiyon`,
      subheadline: 'Sizin için seçilmiş ürünler',
      intro: 'Özel ürün seçkimizi inceleyin',
      ctaText: 'İletişime Geç',
    };
  }
}

// POST /api/microsite/create — Microsite oluştur
router.post('/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, productIds, customMessage } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Ürünleri al (varsa)
    const products = productIds?.length ? await supabase.from('products')
      .select('*').in('id', productIds).eq('user_id', userId).then((r: any) => r.data || []) : [];

    const content = await generateMicrositeContent(lead, products);
    const slug = `${lead.company_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    const { data: microsite } = await supabase.from('microsites').insert([{
      user_id: userId,
      lead_id: leadId,
      slug,
      headline: content.headline,
      subheadline: content.subheadline,
      intro: content.intro,
      cta_text: content.ctaText,
      custom_message: customMessage || null,
      product_ids: productIds || [],
      views: 0,
      active: true,
    }]).select().single();

    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-web-kappa.vercel.app'}/catalog/${slug}`;

    res.json({ microsite, url, message: 'Microsite oluşturuldu!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/microsite/list
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('microsites')
      .select('*, leads(company_name, contact_name)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    res.json({ microsites: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/microsite/view/:slug — Public microsite görüntüle (auth yok)
router.get('/view/:slug', async (req: any, res: any) => {
  try {
    const { data: ms } = await supabase.from('microsites')
      .select('*, leads(company_name, contact_name, sector)').eq('slug', req.params.slug).single();
    if (!ms || !ms.active) return res.status(404).json({ error: 'Sayfa bulunamadı' });

    // View sayısını artır
    await supabase.from('microsites').update({ views: (ms.views || 0) + 1 }).eq('id', ms.id);

    res.json({ microsite: ms });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/microsite/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('microsites').select('views, active').eq('user_id', req.userId);
    res.json({
      total: data?.length || 0,
      totalViews: data?.reduce((a: number, m: any) => a + (m.views || 0), 0) || 0,
      active: data?.filter((m: any) => m.active).length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;