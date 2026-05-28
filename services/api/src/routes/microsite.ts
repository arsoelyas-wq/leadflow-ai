export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APP_URL = process.env.FRONTEND_URL || 'https://leadflow-ai-web-kappa.vercel.app';

// ── AI İçerik Üretimi ─────────────────────────────────────────────────────────
async function generateMicrositeContent(lead: any, products: any[], customMessage?: string): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const productList = products.length
      ? products.slice(0, 8).map((p: any) => `- ${p.name}${p.price ? ` (${p.price})` : ''}${p.description ? `: ${p.description}` : ''}`).join('\n')
      : 'Ürün kataloğu henüz yüklenmedi';

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Türkçe B2B satış kataloğu için kişisel sayfa içeriği oluştur.

Müşteri: ${lead.company_name}
Sektör: ${lead.sector || 'genel ticaret'}
Şehir: ${lead.city || 'Türkiye'}
İletişim: ${lead.contact_name || ''}
${customMessage ? `Özel not: ${customMessage}` : ''}
Ürünler:\n${productList}

JSON formatında döndür (başka hiçbir şey yazma):
{
  "headline": "60 karakter max kişisel başlık",
  "subheadline": "100 karakter max alt başlık",
  "intro": "200 karakter max kişisel giriş paragrafı",
  "badge": "20 karakter max rozet metni (örn: Özel Seçim)",
  "ctaText": "Hemen İletişime Geçin",
  "ctaSubtext": "Ücretsiz danışmanlık için bizi arayın",
  "features": [
    {"icon": "emoji", "title": "başlık", "desc": "açıklama 60 karakter max"},
    {"icon": "emoji", "title": "başlık", "desc": "açıklama 60 karakter max"},
    {"icon": "emoji", "title": "başlık", "desc": "açıklama 60 karakter max"}
  ]
}`
      }]
    });

    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}

  return {
    headline: `${lead.company_name} için Özel Koleksiyon`,
    subheadline: `${lead.city || 'Türkiye'}'nin ${lead.sector || 'sektöründe'} lider firmalar için hazırlandı`,
    intro: `Sayın ${lead.contact_name || lead.company_name} yetkilisi, sizin için özel olarak hazırladığımız ürün ve hizmet seçkimizi incelemenizi rica ederiz.`,
    badge: 'Özel Seçim',
    ctaText: 'Hemen İletişime Geçin',
    ctaSubtext: 'Ücretsiz danışmanlık için bizi arayın',
    features: [
      { icon: '🎯', title: 'Kişiselleştirilmiş', desc: 'Sadece sizin ihtiyaçlarınıza göre seçildi' },
      { icon: '⚡', title: 'Hızlı Teslimat', desc: 'Türkiye genelinde hızlı kargo imkânı' },
      { icon: '💎', title: 'Premium Kalite', desc: 'En yüksek kalite standartlarında ürünler' },
    ],
  };
}

// ── POST /api/microsite/create ─────────────────────────────────────────────────
router.post('/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, productIds, customMessage } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Önceki micrositeleri deaktive et
    await supabase.from('microsites')
      .update({ active: false })
      .eq('user_id', userId)
      .eq('lead_id', leadId)
      .eq('active', true);

    const products: any[] = [];

    const content = await generateMicrositeContent(lead, products, customMessage);
    const slug = `${lead.company_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;

    const { data: microsite } = await supabase.from('microsites').insert([{
      user_id: userId,
      lead_id: leadId,
      slug,
      headline: content.headline,
      subheadline: content.subheadline,
      intro: content.intro,
      badge: content.badge,
      cta_text: content.ctaText,
      cta_subtext: content.ctaSubtext,
      features: content.features,
      custom_message: customMessage || null,
      product_ids: productIds || [],
      views: 0,
      active: true,
    }]).select().single();

    const url = `${APP_URL}/catalog/${slug}`;
    res.json({ microsite, url, message: 'Katalog sayfası oluşturuldu!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/microsite/list ────────────────────────────────────────────────────
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('microsites')
      .select('*, leads(company_name, contact_name, phone, city, sector)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    res.json({ microsites: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/microsite/view/:slug — Public (auth yok) ─────────────────────────
router.get('/view/:slug', async (req: any, res: any) => {
  try {
    // Try with full join first; fall back to minimal select if it fails
    let ms: any = null;
    const { data: d1, error: e1 } = await supabase.from('microsites')
      .select('*, leads(company_name, contact_name, phone, sector, city)')
      .eq('slug', req.params.slug)
      .maybeSingle();
    if (!e1 && d1) {
      ms = d1;
    } else {
      const { data: d2 } = await supabase.from('microsites')
        .select('*, leads(company_name, contact_name)')
        .eq('slug', req.params.slug)
        .maybeSingle();
      ms = d2;
    }

    if (!ms || !ms.active) return res.status(404).json({ error: 'Sayfa bulunamadı' });

    // View artır
    await supabase.from('microsites').update({ views: (ms.views || 0) + 1 }).eq('id', ms.id);

    // Satışçıya WhatsApp bildirimi gönder (sadece ilk ve her 5. görüntülemede)
    const newViews = (ms.views || 0) + 1;
    if (newViews === 1 || newViews % 5 === 0) {
      try {
        const { data: userSettings } = await supabase
          .from('user_settings').select('phone').eq('user_id', ms.user_id).single();
        if (userSettings?.phone) {
          const { sendWhatsAppMessage } = require('./settings');
          const emoji = newViews === 1 ? '🔥' : '📊';
          const msg = `${emoji} *Katalog Görüntülendi!*\n\n*${ms.leads?.company_name}* firması kataloğunuzu şu an inceliyor.\n\nGörüntüleme: ${newViews}. kez\nSayfa: ${APP_URL}/catalog/${ms.slug}\n\n💡 Hemen arayın — sıcak lead!`;
          sendWhatsAppMessage(ms.user_id, userSettings.phone, msg).catch(() => {});
        }
      } catch {}
    }

    res.json({ microsite: ms, appUrl: APP_URL });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/microsite/stats ───────────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('microsites')
      .select('views, active').eq('user_id', req.userId);
    const total = data?.length || 0;
    const active = data?.filter((m: any) => m.active).length || 0;
    const totalViews = data?.reduce((a: number, m: any) => a + (m.views || 0), 0) || 0;
    const hotLeads = data?.filter((m: any) => (m.views || 0) >= 3).length || 0;
    res.json({ total, active, totalViews, hotLeads });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/microsite/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('microsites')
      .delete().eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    res.json({ message: 'Katalog silindi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/microsite/:id/toggle ───────────────────────────────────────────
router.patch('/:id/toggle', async (req: any, res: any) => {
  try {
    const { data: ms } = await supabase.from('microsites')
      .select('active').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!ms) return res.status(404).json({ error: 'Bulunamadı' });

    await supabase.from('microsites')
      .update({ active: !ms.active }).eq('id', req.params.id);
    res.json({ active: !ms.active });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
