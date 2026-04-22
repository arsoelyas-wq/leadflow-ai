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