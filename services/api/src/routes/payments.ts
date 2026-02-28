export {};
const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Planlar
const PLANS = {
  starter: {
    name: 'Starter',
    price: 299,
    credits: 100,
    priceId: 'price_starter'
  },
  pro: {
    name: 'Pro',
    price: 699,
    credits: 500,
    priceId: 'price_pro'
  },
  enterprise: {
    name: 'Enterprise',
    price: 1499,
    credits: 2000,
    priceId: 'price_enterprise'
  }
};

// Checkout session olustur
router.post('/create-checkout', async (req: any, res: any) => {
  try {
    const { plan, userId, userEmail } = req.body;

    if (!plan || !userId || !userEmail) {
      return res.status(400).json({ error: 'plan, userId ve userEmail zorunlu' });
    }

    const planData = PLANS[plan as keyof typeof PLANS];
    if (!planData) {
      return res.status(400).json({ error: 'Gecersiz plan' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [{
        price_data: {
          currency: 'try',
          product_data: {
            name: `LeadFlow AI - ${planData.name} Plan`,
            description: `${planData.credits} lead kredisi / ay`,
          },
          unit_amount: planData.price * 100, // kuruş cinsinden
          recurring: { interval: 'month' }
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `http://192.168.1.37:3000/dashboard?payment=success&plan=${plan}`,
      cancel_url: `http://192.168.1.37:3000/dashboard?payment=cancelled`,
      metadata: { userId, plan, credits: planData.credits.toString() }
    });

    res.json({
      message: 'Checkout oturumu olusturuldu',
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    console.error('Checkout Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Planları getir
router.get('/plans', (req: any, res: any) => {
  res.json({
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        price: 299,
        currency: 'TRY',
        credits: 100,
        features: [
          '100 lead/ay',
          'Google Maps scraping',
          'WhatsApp otomasyonu',
          'Email otomasyonu',
          'AI mesaj oluşturma'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 699,
        currency: 'TRY',
        credits: 500,
        features: [
          '500 lead/ay',
          'Tüm Starter özellikleri',
          'Instagram scraping',
          'LinkedIn scraping',
          'Öncelikli destek'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 1499,
        currency: 'TRY',
        credits: 2000,
        features: [
          '2000 lead/ay',
          'Tüm Pro özellikleri',
          'API erişimi',
          'Özel entegrasyonlar',
          '7/24 destek'
        ]
      }
    ]
  });
});

// Stripe webhook (ödeme tamamlandı)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, plan, credits } = session.metadata;

    // Kullanicinin planini guncelle
    await supabase
      .from('users')
      .update({
        plan_type: plan,
        credits_total: parseInt(credits),
        credits_used: 0
      })
      .eq('id', userId);

    console.log(`Plan guncellendi: ${userId} -> ${plan}`);
  }

  res.json({ received: true });
});

// Kullanicinin abonelik durumu
router.get('/subscription/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('plan_type, credits_total, credits_used')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.json({
      plan: user.plan_type || 'free',
      creditsTotal: user.credits_total || 50,
      creditsUsed: user.credits_used || 0,
      creditsRemaining: (user.credits_total || 50) - (user.credits_used || 0)
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;