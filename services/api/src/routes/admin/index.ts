export {};
const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { ADMIN_EMAILS, ADMIN_SECRET } = require('../../middleware/adminAuth');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Helper: audit log ─────────────────────────────────────────────────────────
async function audit(email: string, action: string, targetId?: string, details?: object, ip?: string) {
  try {
    await supabase.from('admin_audit_logs').insert([{
      admin_email: email,
      action,
      target_user_id: targetId || null,
      details: details || {},
      ip_address: ip || null,
    }])
  } catch { /* audit failure should never block main action */ }
}

// ── POST /api/admin/auth/login ────────────────────────────────────────────────
router.post('/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email ve şifre gerekli' });
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      return res.status(403).json({ error: 'Bu email admin yetkisine sahip değil' });
    }
    const adminPass = process.env.ADMIN_PASSWORD || 'leadflow-admin-2026';
    if (password !== adminPass) return res.status(401).json({ error: 'Yanlış şifre' });

    const token = jwt.sign(
      { email, isAdmin: true },
      ADMIN_SECRET,
      { expiresIn: '8h' }
    );
    await audit(email, 'auth.login', undefined, {}, req.ip);
    res.json({ token, email });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/overview ───────────────────────────────────────────────────
router.get('/overview', async (req: any, res: any) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const dayAgo = new Date(Date.now() - 864e5).toISOString();

    const [users, leads, campaigns, messages, newUsers, errors] = await Promise.all([
      supabase.from('users').select('id, plan_type, credits_total, credits_used, created_at', { count: 'exact' }),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo).catch(() => ({ count: 0 })),
    ]);

    const planCounts: Record<string, number> = {};
    (users.data || []).forEach((u: any) => {
      planCounts[u.plan_type] = (planCounts[u.plan_type] || 0) + 1;
    });

    res.json({
      users: { total: users.count || 0, new_this_week: newUsers.count || 0, by_plan: planCounts },
      leads: { total: leads.count || 0 },
      campaigns: { total: campaigns.count || 0 },
      messages: { total: messages.count || 0 },
      errors_24h: (errors as any).count || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', async (req: any, res: any) => {
  try {
    const { page = '1', limit = '50', search, plan, sort = 'created_at' } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('users')
      .select('id, email, name, company, plan_type, credits_total, credits_used, created_at, country_code, language_code, onboarding_done, is_suspended', { count: 'exact' })
      .order(sort, { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (search) query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`);
    if (plan) query = query.eq('plan_type', plan);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ users: data || [], total: count || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
router.get('/users/:id', async (req: any, res: any) => {
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.params.id).single();
    if (error || !user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const [leads, campaigns, messages, credits] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', req.params.id),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('user_id', req.params.id),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', req.params.id),
      supabase.from('credit_logs').select('amount, action, created_at').eq('user_id', req.params.id)
        .order('created_at', { ascending: false }).limit(20).catch(() => ({ data: [] })),
    ]);

    res.json({
      user,
      stats: {
        leads: leads.count || 0,
        campaigns: campaigns.count || 0,
        messages: messages.count || 0,
      },
      credit_history: (credits as any).data || [],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/admin/users/:id ────────────────────────────────────────────────
router.patch('/users/:id', async (req: any, res: any) => {
  try {
    const allowed = ['plan_type', 'credits_total', 'credits_used', 'name', 'company', 'is_suspended'];
    const updates: any = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const { error } = await supabase.from('users').update(updates).eq('id', req.params.id);
    if (error) throw error;
    await audit(req.adminEmail, 'user.update', req.params.id, req.body, req.ip);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/users/:id/impersonate ─────────────────────────────────────
router.post('/users/:id/impersonate', async (req: any, res: any) => {
  try {
    const { data: user, error } = await supabase.from('users').select('id, email, name').eq('id', req.params.id).single();
    if (error || !user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const impersonateToken = jwt.sign(
      { userId: user.id, email: user.email, impersonatedBy: req.adminEmail },
      process.env.JWT_SECRET || 'leadflow-super-secret-jwt-key-2026',
      { expiresIn: '2h' }
    );
    await audit(req.adminEmail, 'user.impersonate', req.params.id, { target_email: user.email }, req.ip);
    res.json({ token: impersonateToken, user });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/users/:id/credits ────────────────────────────────────────
router.post('/users/:id/credits', async (req: any, res: any) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || !reason) return res.status(400).json({ error: 'Miktar ve sebep gerekli' });

    const { data: user, error: ue } = await supabase.from('users').select('credits_total').eq('id', req.params.id).single();
    if (ue || !user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const newTotal = Math.max(0, (user.credits_total || 0) + parseInt(amount));
    await supabase.from('users').update({ credits_total: newTotal, updated_at: new Date().toISOString() }).eq('id', req.params.id);

    // Log to credit_logs if table exists
    try {
      await supabase.from('credit_logs').insert([{
        user_id: req.params.id, amount: parseInt(amount),
        action: `admin: ${reason}`, created_at: new Date().toISOString()
      }])
    } catch { /* table may not exist */ }

    await audit(req.adminEmail, 'user.credits_adjust', req.params.id, { amount, reason, new_total: newTotal }, req.ip);
    res.json({ ok: true, new_total: newTotal });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/users/:id/data ─────────────────────────────────────────────
// Full cross-user data view: leads, campaigns, messages
router.get('/users/:id/data', async (req: any, res: any) => {
  try {
    const { type = 'leads', page = '1' } = req.query as any;
    const offset = (parseInt(page) - 1) * 20;
    let data: any = null

    if (type === 'leads') {
      const r = await supabase.from('leads').select('id, company_name, status, score, city, sector, created_at', { count: 'exact' })
        .eq('user_id', req.params.id).order('created_at', { ascending: false }).range(offset, offset + 19)
      data = { items: r.data || [], total: r.count || 0 }
    } else if (type === 'campaigns') {
      const r = await supabase.from('campaigns').select('id, name, status, total_sent, total_replied, created_at', { count: 'exact' })
        .eq('user_id', req.params.id).order('created_at', { ascending: false }).range(offset, offset + 19)
      data = { items: r.data || [], total: r.count || 0 }
    } else if (type === 'messages') {
      const r = await supabase.from('messages').select('id, content, direction, channel, sent_at', { count: 'exact' })
        .eq('user_id', req.params.id).order('sent_at', { ascending: false }).range(offset, offset + 19)
      data = { items: r.data || [], total: r.count || 0 }
    }

    await audit(req.adminEmail, `user.view_data.${type}`, req.params.id, {}, req.ip);
    res.json(data || { items: [], total: 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Banners ───────────────────────────────────────────────────────────────────
router.get('/content/banners', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('admin_banners').select('*').order('created_at', { ascending: false });
    res.json({ banners: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/content/banners', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('admin_banners').insert([req.body]).select().single();
    if (error) throw error;
    await audit(req.adminEmail, 'banner.create', undefined, { title: req.body.title }, req.ip);
    res.json({ banner: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/content/banners/:id', async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('admin_banners').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    await audit(req.adminEmail, 'banner.update', undefined, { id: req.params.id }, req.ip);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/content/banners/:id', async (req: any, res: any) => {
  try {
    await supabase.from('admin_banners').delete().eq('id', req.params.id);
    await audit(req.adminEmail, 'banner.delete', undefined, { id: req.params.id }, req.ip);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/content/banners/active — Public: get active banners for a context
router.get('/content/banners/active', async (req: any, res: any) => {
  try {
    const { type = 'dashboard', slug, plan } = req.query as any;
    const now = new Date().toISOString();
    let q = supabase.from('admin_banners').select('*').eq('is_active', true).eq('type', type)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
    if (slug) q = q.or(`target_slug.eq.all,target_slug.eq.${slug}`)
    if (plan) q = q.or(`target_plan.eq.all,target_plan.eq.${plan}`)
    const { data } = await q
    res.json({ banners: data || [] })
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── System ────────────────────────────────────────────────────────────────────
router.get('/system/config', async (req: any, res: any) => {
  try {
    const dayAgo = new Date(Date.now() - 864e5).toISOString();
    const { count: errCount } = await supabase.from('error_logs').select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo).catch(() => ({ count: 0 }));

    res.json({
      plans: {
        starter:    { credits: 500,   price: 99  },
        growth:     { credits: 2000,  price: 299 },
        pro:        { credits: 10000, price: 799 },
        enterprise: { credits: -1,    price: 0   },
      },
      credit_packages: {
        small:  { credits: 100,  amount_try: 200 },
        medium: { credits: 300,  amount_try: 450 },
        large:  { credits: 700,  amount_try: 800 },
      },
      api_keys: {
        anthropic:     !!process.env.ANTHROPIC_API_KEY,
        elevenlabs:    !!process.env.ELEVENLABS_API_KEY,
        perplexity:    !!process.env.PERPLEXITY_API_KEY,
        stripe:        !!process.env.STRIPE_SECRET_KEY,
        google_places: !!process.env.GOOGLE_PLACES_API_KEY,
        resend:        !!process.env.RESEND_API_KEY,
        google_ads:    !!process.env.GOOGLE_ADS_CLIENT_ID,
      },
      errors_24h: (errCount as any) || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/system/errors', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('error_logs').select('*')
      .order('created_at', { ascending: false }).limit(100)
      .catch(() => ({ data: [] }));
    res.json({ errors: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/system/uptime', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('uptime_logs').select('*')
      .order('checked_at', { ascending: false }).limit(50)
      .catch(() => ({ data: [] }));
    res.json({ logs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/analytics ──────────────────────────────────────────────────
router.get('/analytics', async (req: any, res: any) => {
  try {
    const { data: users } = await supabase.from('users').select('country_code, language_code, plan_type, created_at');
    const countryMap: Record<string, number> = {};
    const langMap: Record<string, number> = {};
    const monthMap: Record<string, number> = {};

    (users || []).forEach((u: any) => {
      if (u.country_code) countryMap[u.country_code] = (countryMap[u.country_code] || 0) + 1;
      if (u.language_code) langMap[u.language_code] = (langMap[u.language_code] || 0) + 1;
      const month = u.created_at?.slice(0, 7);
      if (month) monthMap[month] = (monthMap[month] || 0) + 1;
    });

    const countryArr = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([country, count]) => ({ country, count }));
    const monthArr = Object.entries(monthMap).sort().map(([month, count]) => ({ month, count }));

    res.json({ by_country: countryArr, by_language: langMap, signups_by_month: monthArr });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Notifications broadcast ───────────────────────────────────────────────────
router.post('/notifications/broadcast', async (req: any, res: any) => {
  try {
    const { title, message, target_plan, href } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Başlık ve mesaj gerekli' });

    let query = supabase.from('users').select('id');
    if (target_plan && target_plan !== 'all') query = query.eq('plan_type', target_plan);
    const { data: users } = await query;

    if (!users?.length) return res.json({ ok: true, sent: 0 });

    const notifications = users.map((u: any) => ({
      user_id: u.id, type: 'admin', title, message,
      href: href || '/dashboard', is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) throw error;

    await audit(req.adminEmail, 'notification.broadcast', undefined, { title, count: users.length, target_plan }, req.ip);
    res.json({ ok: true, sent: users.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Audit log ─────────────────────────────────────────────────────────────────
router.get('/audit', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('admin_audit_logs').select('*')
      .order('created_at', { ascending: false }).limit(200)
      .catch(() => ({ data: [] }));
    res.json({ logs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Revenue ───────────────────────────────────────────────────────────────────
router.get('/revenue', async (req: any, res: any) => {
  try {
    const { data: users } = await supabase.from('users').select('plan_type, created_at, credits_total, credits_used');
    const prices: Record<string, number> = { starter: 99, growth: 299, pro: 799, enterprise: 0 };
    let mrr = 0;
    const planRevenue: Record<string, number> = {};

    (users || []).forEach((u: any) => {
      const p = prices[u.plan_type] || 0;
      mrr += p;
      planRevenue[u.plan_type] = (planRevenue[u.plan_type] || 0) + p;
    });

    // Credit usage (proxy for AI cost)
    const totalCreditsUsed = (users || []).reduce((s: number, u: any) => s + (u.credits_used || 0), 0);

    res.json({
      mrr,
      arr: mrr * 12,
      by_plan: planRevenue,
      total_credits_used: totalCreditsUsed,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Promo codes ───────────────────────────────────────────────────────────────
router.get('/promo', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] }));
    res.json({ codes: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/promo', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('promo_codes').insert([{ ...req.body, created_by: req.adminEmail }]).select().single();
    if (error) throw error;
    await audit(req.adminEmail, 'promo.create', undefined, { code: req.body.code }, req.ip);
    res.json({ code: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/promo/:id', async (req: any, res: any) => {
  try {
    await supabase.from('promo_codes').update(req.body).eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
