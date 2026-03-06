"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-r2fxkzrjv-arsoelyas-4547s-projects.vercel.app';
const PACKAGES = {
    small: { credits: 100, amount: 20000, name: 'Başlangıç Paketi' }, // ₺200
    medium: { credits: 300, amount: 45000, name: 'Profesyonel Paket' }, // ₺450
    large: { credits: 700, amount: 80000, name: 'İşletme Paketi' }, // ₺800
};
// POST /api/payments/topup — Stripe checkout
router.post('/topup', async (req, res) => {
    try {
        const { packageId } = req.body;
        const userId = req.userId;
        const pkg = PACKAGES[packageId];
        if (!pkg)
            return res.status(400).json({ error: 'Geçersiz paket' });
        // Stripe yoksa test modu
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_live_...') {
            // Direkt kredi ekle (test)
            const { data: user } = await supabase
                .from('users').select('credits_total').eq('id', userId).single();
            await supabase.from('users').update({
                credits_total: (user?.credits_total || 50) + pkg.credits
            }).eq('id', userId);
            return res.json({ url: `${APP_URL}/billing?success=true&credits=${pkg.credits}`, testMode: true });
        }
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                    price_data: {
                        currency: 'try',
                        product_data: { name: `LeadFlow AI — ${pkg.name}` },
                        unit_amount: pkg.amount,
                    },
                    quantity: 1,
                }],
            mode: 'payment',
            success_url: `${APP_URL}/billing?payment=success`,
            cancel_url: `${APP_URL}/billing?payment=cancelled`,
            metadata: { userId, credits: pkg.credits.toString() },
        });
        res.json({ url: session.url });
    }
    catch (e) {
        console.error('Payment Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const sig = req.headers['stripe-signature'];
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        if (event.type === 'checkout.session.completed') {
            const { userId, credits } = event.data.object.metadata;
            await supabase.from('users').update({
                credits_total: supabase.rpc('increment', { x: parseInt(credits) })
            }).eq('id', userId);
        }
        res.json({ received: true });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// GET /api/payments/plans
router.get('/plans', (_req, res) => {
    res.json({ packages: PACKAGES });
});
module.exports = router;
