export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { PLANS, CREDIT_COSTS, TOPUP_PACKAGES } = require('../config/plan-limits');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Balance helper ────────────────────────────────────────────────────────────

async function getUserCredits(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('credits_total, credits_used, credits_rollover, plan_type, subscription_renews_at')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('Kullanıcı bulunamadı');

  const monthly   = user.credits_total  || 0;
  const used      = user.credits_used   || 0;
  const rollover  = user.credits_rollover || 0;
  const remaining = Math.max(0, monthly - used) + rollover;

  return { user, monthly, used, rollover, remaining };
}

// ── GET /api/credits/balance ──────────────────────────────────────────────────

router.get('/balance', async (req: any, res: any) => {
  try {
    const { monthly, used, rollover, remaining, user } = await getUserCredits(req.userId);

    const { data: txns } = await supabase
      .from('credit_transactions')
      .select('id, action, amount, description, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({
      monthly,
      used,
      rollover,
      remaining,
      plan:           user.plan_type || 'trial',
      renewsAt:       user.subscription_renews_at,
      usagePercent:   monthly > 0 ? Math.round((used / monthly) * 100) : 0,
      transactions:   txns || [],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/credits/use ─────────────────────────────────────────────────────

router.post('/use', async (req: any, res: any) => {
  try {
    const { action, amount, description } = req.body;
    const cost = Number(amount) || CREDIT_COSTS[action] || 1;

    if (cost === 0) return res.json({ success: true, cost: 0, remaining: null, free: true });

    const { user, monthly, used, rollover, remaining } = await getUserCredits(req.userId);

    if (remaining < cost) {
      return res.status(402).json({
        error: 'Yetersiz kredi — lütfen kredi satın alın',
        remaining,
        required: cost,
        upgradeUrl: '/billing',
      });
    }

    // Spend from rollover first, then from monthly allocation
    let rolloverUsed = Math.min(cost, rollover);
    let monthlyUsed  = cost - rolloverUsed;

    await supabase.from('users').update({
      credits_rollover: rollover - rolloverUsed,
      credits_used:     used + monthlyUsed,
    }).eq('id', req.userId);

    await supabase.from('credit_transactions').insert({
      user_id:       req.userId,
      action:        action || 'manual',
      amount:        -cost,
      description:   description || action || 'Kredi harcama',
      balance_after: remaining - cost,
    });

    // Keep credit_logs in sync for backward compat
    await supabase.from('credit_logs').insert({
      user_id:     req.userId,
      action,
      cost,
      description: description || action,
    }).catch(() => {});

    res.json({ success: true, cost, remaining: remaining - cost });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/credits/plans ────────────────────────────────────────────────────

router.get('/plans', (_req: any, res: any) => {
  const plans = Object.values(PLANS).map((p: any) => ({
    id:            p.id,
    name:          p.name,
    nameLocal:     p.nameLocal,
    monthlyCredits: p.monthlyCredits,
    rolloverMonths: p.rolloverMonths,
    priceMonthly:  p.priceMonthly,
    priceAnnual:   p.priceAnnual,
    color:         p.color,
    popular:       p.popular,
    features:      p.features,
    limits:        p.limits,
  }));
  res.json({ plans, creditCosts: CREDIT_COSTS, topupPackages: TOPUP_PACKAGES });
});

// ── GET /api/credits/transactions ────────────────────────────────────────────

router.get('/transactions', async (req: any, res: any) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { data, count } = await supabase
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    res.json({ transactions: data || [], total: count || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/credits/stats ────────────────────────────────────────────────────

router.get('/stats', async (req: any, res: any) => {
  try {
    const now      = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const { data: txns } = await supabase
      .from('credit_transactions')
      .select('action, amount')
      .eq('user_id', req.userId)
      .lt('amount', 0)  // only spending, not top-ups
      .gte('created_at', monthAgo);

    const byAction: Record<string, number> = {};
    let totalSpent = 0;
    (txns || []).forEach((t: any) => {
      const cost = Math.abs(t.amount);
      totalSpent += cost;
      byAction[t.action] = (byAction[t.action] || 0) + cost;
    });

    const topActions = Object.entries(byAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    res.json({ totalSpent, byAction, topActions });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
