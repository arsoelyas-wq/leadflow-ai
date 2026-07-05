export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { PLANS, TOPUP_PACKAGES } = require('../config/plan-limits');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sovlo.io';

function formatPrice(kurus: number): string {
  return (kurus / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── GET /api/payments/plans ───────────────────────────────────────────────────

const DEFAULT_ENTERPRISE = {
  title: 'Enterprise',
  desc: 'Büyük ekipler için özel çözüm',
  price_label: 'Özel Fiyat',
  features: ['Sınırsız kredi & ekip', 'White-Label & API', 'SLA %99.9 garantisi', 'Dedicated Account Manager'],
  cta_text: 'Bizimle İletişime Geçin',
  cta_url: 'mailto:enterprise@sovlo.io',
  color: '#ec4899',
};

const DEFAULT_COMPARISON = {
  title: 'Neden Sovlo?',
  items: [
    { label: 'Apollo Pro + Smartlead + WA aracı', price: '≈ ₺10.500/ay', icon: '🔴' },
    { label: 'Sovlo Growth — hepsi tek pakette', price: '₺2.990/ay', icon: '🟢' },
    { label: 'Kredi rollover (rakipler sıfırlıyor)', price: '2 ay taşınır', icon: '✅' },
    { label: 'WhatsApp mesajı (rakipler +₺0.50/msj)', price: 'Sınırsız ücretsiz', icon: '✅' },
  ],
};

router.get('/plans', async (_req: any, res: any) => {
  // Read admin overrides from site_settings
  let adminCfg: any = null;
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'landing_home')
      .single();
    if (data?.value) adminCfg = data.value;
  } catch (_e) { /* use defaults */ }

  // Build admin plan lookup by id
  const adminPlans: Record<string, any> = {};
  if (Array.isArray(adminCfg?.plans)) {
    for (const p of adminCfg.plans) {
      if (p.id) adminPlans[p.id] = p;
    }
  }

  const subscriptionPlans = Object.values(PLANS)
    .filter((p: any) => p.id !== 'enterprise')
    .map((p: any) => {
      const adm = adminPlans[p.id];
      const features = adm?.features
        ? adm.features.filter((f: any) => f.inc !== false).map((f: any) => f.text)
        : p.features;
      const priceMonthly = adm?.monthly_price != null ? Math.round(adm.monthly_price * 100) : p.priceMonthly;
      const priceAnnual  = adm?.annual_price  != null ? Math.round(adm.annual_price  * 100) : p.priceAnnual;
      const monthlyCredits = adm?.credits != null
        ? parseInt(String(adm.credits).replace(/[^\d]/g, ''), 10) || p.monthlyCredits
        : p.monthlyCredits;
      return {
        id:             p.id,
        name:           p.name,
        nameLocal:      adm?.name      || p.nameLocal,
        desc:           adm?.desc      || '',
        monthlyCredits,
        rolloverMonths: p.rolloverMonths,
        priceMonthly,
        priceAnnual,
        color:          p.color,
        popular:        adm ? (adm.popular ?? p.popular) : p.popular,
        features,
        ctaText:        adm?.cta_text  || '',
        ctaUrl:         adm?.cta_url   || '',
      };
    });

  const topupPackages = Object.entries(TOPUP_PACKAGES).map(([id, pkg]: [string, any]) => ({
    id,
    name:    pkg.name,
    credits: pkg.credits,
    price:   pkg.price,
    badge:   pkg.badge,
    popular: pkg.popular || false,
    pricePerCredit: Math.round(pkg.price / pkg.credits),
  }));

  const enterprise  = { ...DEFAULT_ENTERPRISE,  ...(adminCfg?.enterprise  || {}) };
  const comparison  = { ...DEFAULT_COMPARISON,  ...(adminCfg?.comparison  || {}) };

  res.json({ subscriptionPlans, topupPackages, enterprise, comparison });
});

// ── POST /api/payments/topup ──────────────────────────────────────────────────

router.post('/topup', async (req: any, res: any) => {
  try {
    const { packageId } = req.body;
    const userId = req.userId;
    const pkg = TOPUP_PACKAGES[packageId];

    if (!pkg) return res.status(400).json({ error: 'Geçersiz paket seçimi' });

    // Test modu — Stripe key yoksa kredileri direkt ekle
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_placeholder')) {
      const { data: user } = await supabase
        .from('users')
        .select('credits_total, credits_used')
        .eq('id', userId)
        .single();

      const currentMonthly = user?.credits_total || 0;
      const currentUsed    = user?.credits_used   || 0;

      await supabase.from('users').update({
        credits_total: currentMonthly + pkg.credits,
      }).eq('id', userId);

      await supabase.from('credit_transactions').insert({
        user_id:       userId,
        action:        'topup',
        amount:        pkg.credits,
        description:   `${pkg.name} — ${pkg.credits} kredi satın alındı`,
        balance_after: (currentMonthly - currentUsed) + pkg.credits,
      });

      return res.json({
        url: `${APP_URL}/billing?success=true&credits=${pkg.credits}`,
        testMode: true,
      });
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'try',
          product_data: {
            name:        `Sovlo — ${pkg.name} Kredi Paketi`,
            description: `${pkg.credits.toLocaleString('tr-TR')} kredi`,
          },
          unit_amount: pkg.price,
        },
        quantity: 1,
      }],
      mode:        'payment',
      success_url: `${APP_URL}/billing?payment=success&credits=${pkg.credits}`,
      cancel_url:  `${APP_URL}/billing?payment=cancelled`,
      metadata:    { userId, type: 'topup', packageId, credits: pkg.credits.toString() },
      locale:      'tr',
    });

    res.json({ url: session.url });
  } catch (e: any) {
    console.error('Topup error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/payments/subscribe ─────────────────────────────────────────────

router.post('/subscribe', async (req: any, res: any) => {
  try {
    const { planId, billing = 'monthly' } = req.body;
    const userId = req.userId;
    const plan = PLANS[planId];

    if (!plan || planId === 'trial' || planId === 'enterprise') {
      return res.status(400).json({ error: 'Geçersiz plan' });
    }

    const price = billing === 'annual' ? plan.priceAnnual : plan.priceMonthly;

    // Test modu
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_placeholder')) {
      const renewsAt = new Date(Date.now() + 30 * 86400000).toISOString();

      await supabase.from('users').update({
        plan_type:             planId,
        credits_total:         plan.monthlyCredits,
        credits_used:          0,
        credits_rollover:      0,
        subscription_renews_at: renewsAt,
      }).eq('id', userId);

      await supabase.from('credit_transactions').insert({
        user_id:       userId,
        action:        'subscription',
        amount:        plan.monthlyCredits,
        description:   `${plan.name} planı aktif — ${plan.monthlyCredits.toLocaleString()} kredi yüklendi`,
        balance_after: plan.monthlyCredits,
      });

      return res.json({
        url: `${APP_URL}/billing?success=true&plan=${planId}`,
        testMode: true,
      });
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get or create Stripe customer
    const { data: user } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = user?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user?.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:   'try',
          recurring:  { interval: billing === 'annual' ? 'year' : 'month' },
          product_data: {
            name:        `Sovlo ${plan.name} Plan`,
            description: `${plan.monthlyCredits.toLocaleString('tr-TR')} kredi/ay`,
          },
          unit_amount: billing === 'annual' ? price * 12 : price,
        },
        quantity: 1,
      }],
      mode:        'subscription',
      success_url: `${APP_URL}/billing?payment=success&plan=${planId}`,
      cancel_url:  `${APP_URL}/billing?payment=cancelled`,
      metadata:    { userId, type: 'subscription', planId, billing },
      locale:      'tr',
    });

    res.json({ url: session.url });
  } catch (e: any) {
    console.error('Subscribe error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/payments/webhook ────────────────────────────────────────────────

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.json({ received: true });
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig    = req.headers['stripe-signature'];
    const event  = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session  = event.data.object;
      const { userId, type, planId, credits, billing } = session.metadata;

      if (type === 'topup') {
        const addCredits = parseInt(credits);
        const { data: user } = await supabase.from('users').select('credits_total, credits_used').eq('id', userId).single();
        const newTotal = (user?.credits_total || 0) + addCredits;

        await supabase.from('users').update({ credits_total: newTotal }).eq('id', userId);
        await supabase.from('credit_transactions').insert({
          user_id:       userId,
          action:        'topup',
          amount:        addCredits,
          description:   `${addCredits.toLocaleString()} kredi satın alındı`,
          balance_after: newTotal - (user?.credits_used || 0),
        });
      }

      if (type === 'subscription') {
        const plan      = PLANS[planId];
        const renewsAt  = new Date(Date.now() + (billing === 'annual' ? 365 : 30) * 86400000).toISOString();

        await supabase.from('users').update({
          plan_type:             planId,
          credits_total:         plan.monthlyCredits,
          credits_used:          0,
          credits_rollover:      0,
          subscription_renews_at: renewsAt,
        }).eq('id', userId);

        await supabase.from('credit_transactions').insert({
          user_id:       userId,
          action:        'subscription',
          amount:        plan.monthlyCredits,
          description:   `${plan.name} planı aktif`,
          balance_after: plan.monthlyCredits,
        });
      }
    }

    // Handle recurring subscription renewal
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      if (invoice.billing_reason === 'subscription_cycle') {
        const customer = await supabase
          .from('users')
          .select('id, plan_type, credits_total, credits_used, credits_rollover')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (customer.data) {
          const user     = customer.data;
          const plan     = PLANS[user.plan_type];
          if (!plan) return res.json({ received: true });

          // Calculate rollover
          const unusedThisMonth   = Math.max(0, (user.credits_total || 0) - (user.credits_used || 0));
          const existingRollover  = user.credits_rollover || 0;
          const maxRollover       = plan.monthlyCredits * plan.rolloverMonths;
          const newRollover       = Math.min(unusedThisMonth + existingRollover, maxRollover);
          const renewsAt          = new Date(Date.now() + 30 * 86400000).toISOString();

          await supabase.from('users').update({
            credits_total:         plan.monthlyCredits,
            credits_used:          0,
            credits_rollover:      newRollover,
            subscription_renews_at: renewsAt,
          }).eq('id', user.id);

          await supabase.from('credit_transactions').insert({
            user_id:       user.id,
            action:        'monthly_refresh',
            amount:        plan.monthlyCredits,
            description:   `Aylık ${plan.monthlyCredits.toLocaleString()} kredi yenilendi`,
            balance_after: plan.monthlyCredits + newRollover,
          });
        }
      }
    }

    res.json({ received: true });
  } catch (e: any) {
    console.error('Webhook error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// ── GET /api/payments/history ─────────────────────────────────────────────────

router.get('/history', async (req: any, res: any) => {
  try {
    const { limit = 50 } = req.query;
    const { data } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', req.userId)
      .gt('amount', 0)  // only top-ups and subscriptions
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    const payments = (data || []).map((t: any) => ({
      id:          t.id,
      action:      t.action,
      credits:     t.amount,
      description: t.description,
      date:        t.created_at,
      amount:      t.amount,
    }));

    res.json({ payments });
  } catch (e: any) {
    res.json({ payments: [] });
  }
});

module.exports = router;
