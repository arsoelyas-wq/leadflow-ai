export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Kredi planları
const PLANS = {
  starter: { name: 'Starter', credits: 500, price: 99, features: ['500 Kredi/ay', 'WhatsApp Kampanya', 'Lead Scraper', 'AI Analiz'] },
  growth: { name: 'Growth', credits: 2000, price: 299, features: ['2000 Kredi/ay', 'Tüm Starter özellikler', 'Email Kampanya', 'SMS Kampanya', 'Reklam Yönetimi'] },
  pro: { name: 'Pro', credits: 10000, price: 799, features: ['10000 Kredi/ay', 'Tüm Growth özellikler', 'White-Label', 'API Erişimi', 'Öncelikli Destek'] },
  enterprise: { name: 'Enterprise', credits: 999999, price: 0, features: ['Sınırsız Kredi', 'Özel entegrasyon', 'SLA garantisi', 'Dedicated destek'] },
};

// Kredi kullanım kaydı
const CREDIT_COSTS: Record<string, number> = {
  whatsapp_message: 1,
  email_send: 1,
  sms_send: 2,
  lead_scrape: 5,
  ai_analysis: 3,
  ai_video: 20,
  voice_call: 15,
  capi_event: 1,
  roas_prediction: 5,
};

// Kredi durumu
router.get('/balance', async (req: any, res: any) => {
  try {
    const { data: user } = await supabase.from('users').select('credits_total, credits_used, plan_type').eq('id', req.userId).single();
    const { data: history } = await supabase.from('credit_logs').select('*').eq('user_id', req.userId).order('created_at', { ascending: false }).limit(10);

    res.json({
      total: user?.credits_total || 0,
      used: user?.credits_used || 0,
      remaining: (user?.credits_total || 0) - (user?.credits_used || 0),
      plan: user?.plan_type || 'starter',
      usagePercent: user?.credits_total ? Math.round((user.credits_used / user.credits_total) * 100) : 0,
      history: history || [],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Kredi kullan
router.post('/use', async (req: any, res: any) => {
  try {
    const { action, amount, description } = req.body;
    const cost = amount || CREDIT_COSTS[action] || 1;

    const { data: user } = await supabase.from('users').select('credits_total, credits_used').eq('id', req.userId).single();
    const remaining = (user?.credits_total || 0) - (user?.credits_used || 0);

    if (remaining < cost) return res.status(402).json({ error: 'Yetersiz kredi — lütfen planınızı yükseltin' });

    await supabase.from('users').update({ credits_used: (user?.credits_used || 0) + cost }).eq('id', req.userId);
    await supabase.from('credit_logs').insert([{
      user_id: req.userId, action, cost,
      description: description || action,
      created_at: new Date().toISOString(),
    }]);

    res.json({ success: true, cost, remaining: remaining - cost });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Plan bilgileri
router.get('/plans', (req: any, res: any) => {
  res.json({ plans: PLANS, creditCosts: CREDIT_COSTS });
});

// Planı yükselt
router.post('/upgrade', async (req: any, res: any) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan as keyof typeof PLANS]) return res.status(400).json({ error: 'Geçersiz plan' });

    const planData = PLANS[plan as keyof typeof PLANS];
    await supabase.from('users').update({
      plan_type: plan,
      credits_total: planData.credits,
      credits_used: 0,
    }).eq('id', req.userId);

    res.json({ message: `${planData.name} planına geçildi! ${planData.credits} kredi yüklendi.`, plan: planData });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Kredi istatistikleri
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: logs } = await supabase.from('credit_logs').select('action, cost').eq('user_id', req.userId);
    const byAction: Record<string, number> = {};
    (logs || []).forEach((l: any) => { byAction[l.action] = (byAction[l.action] || 0) + l.cost; });

    res.json({
      totalSpent: logs?.reduce((s: number, l: any) => s + l.cost, 0) || 0,
      byAction,
      topAction: Object.entries(byAction).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;