export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { PLANS } = require('../config/plan-limits');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Fallback prices from plan-limits.ts — used only when admin has NOT set a custom price
const PLAN_PRICE_FALLBACK: Record<string, { monthly_price: number; annual_price: number; credits: string }> = {
  starter: { monthly_price: Math.round(PLANS.starter.priceMonthly / 100), annual_price: Math.round(PLANS.starter.priceAnnual / 100), credits: PLANS.starter.monthlyCredits.toLocaleString('en-US') },
  growth:  { monthly_price: Math.round(PLANS.growth.priceMonthly  / 100), annual_price: Math.round(PLANS.growth.priceAnnual  / 100), credits: PLANS.growth.monthlyCredits.toLocaleString('en-US')  },
  scale:   { monthly_price: Math.round(PLANS.scale.priceMonthly   / 100), annual_price: Math.round(PLANS.scale.priceAnnual   / 100), credits: PLANS.scale.monthlyCredits.toLocaleString('en-US')   },
};

// GET /api/market-pages/public/:slug — No auth required
// Called by Next.js ISR to render the public market page
router.get('/:slug', async (req: any, res: any) => {
  try {
    const slug = req.params.slug;

    // Landing page home config — stored in site_settings table
    if (slug === 'home') {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'landing_home')
        .single();

      const cfg = data?.value && Object.keys(data.value).length > 0 ? { ...data.value } : {};

      // Normalize plan prices: admin price wins; fall back to plan-limits.ts only if admin has not set one
      if (Array.isArray(cfg.plans)) {
        cfg.plans = cfg.plans.map((p: any) => {
          const fb = PLAN_PRICE_FALLBACK[p.id];
          return {
            ...p,
            monthly_price: (p.monthly_price > 0) ? p.monthly_price : (fb?.monthly_price ?? 0),
            annual_price:  (p.annual_price  > 0) ? p.annual_price  : (fb?.annual_price  ?? 0),
            credits:       p.credits || fb?.credits || '0',
          };
        });
      } else {
        cfg.plans = Object.entries(PLAN_PRICE_FALLBACK).map(([id, v]) => ({ id, ...v }));
      }

      // Always normalize trial period to 3 days (source of truth is code)
      const cfgStr = JSON.stringify(cfg)
        .replace(/14 günlük/g, '3 günlük')
        .replace(/14 gün/g, '3 gün')
        .replace(/14 Gün/g, '3 Gün')
        .replace(/14 Days Free/g, '3 Days Free')
        .replace(/14 days free/g, '3 days free')
        .replace(/Start free for 14 days/g, 'Start free for 3 days')
        .replace(/for 14 days\./g, 'for 3 days.');
      Object.assign(cfg, JSON.parse(cfgStr));

      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ page: Object.keys(cfg).length > 0 ? cfg : null });
    }

    // Other market pages — user-owned records in market_pages table
    const { data, error } = await supabase
      .from('market_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Market page not found' });
    }

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ page: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
