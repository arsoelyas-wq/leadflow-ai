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
    const dayAgo  = new Date(Date.now() - 864e5).toISOString();

    // Use Promise.allSettled so one failing table doesn't crash everything
    const [usersR, leadsR, campaignsR, messagesR, newUsersR, errorsR] = await Promise.allSettled([
      supabase.from('users').select('id, plan_type, credits_total, credits_used, created_at', { count: 'exact' }),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
    ]);

    const users     = usersR.status     === 'fulfilled' ? usersR.value     : { data: [], count: 0 };
    const leads     = leadsR.status     === 'fulfilled' ? leadsR.value     : { count: 0 };
    const campaigns = campaignsR.status === 'fulfilled' ? campaignsR.value : { count: 0 };
    const messages  = messagesR.status  === 'fulfilled' ? messagesR.value  : { count: 0 };
    const newUsers  = newUsersR.status  === 'fulfilled' ? newUsersR.value  : { count: 0 };
    const errors    = errorsR.status    === 'fulfilled' ? errorsR.value    : { count: 0 };

    const planCounts: Record<string, number> = {};
    ((users as any).data || []).forEach((u: any) => {
      planCounts[u.plan_type] = (planCounts[u.plan_type] || 0) + 1;
    });

    res.json({
      users:    { total: (users as any).count || 0, new_this_week: (newUsers as any).count || 0, by_plan: planCounts },
      leads:    { total: (leads as any).count || 0 },
      campaigns:{ total: (campaigns as any).count || 0 },
      messages: { total: (messages as any).count || 0 },
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
        .order('created_at', { ascending: false }).limit(20),
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
      .gte('created_at', dayAgo);

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
      ;
    res.json({ errors: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/system/uptime', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('uptime_logs').select('*')
      .order('checked_at', { ascending: false }).limit(50)
      ;
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
      ;
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
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
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

// ── 2FA Setup & Verify ────────────────────────────────────────────────────────
const ADMIN_2FA_SECRET = process.env.ADMIN_2FA_SECRET || '';

router.post('/auth/2fa/setup', async (req: any, res: any) => {
  try {
    const { email } = req.body;
    if (!ADMIN_EMAILS.includes(email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin değil' });
    }
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');
    const secret = speakeasy.generateSecret({ name: `LeadFlow Admin (${email})`, length: 20 });
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
    // Store secret temporarily (in production, save to DB per admin)
    res.json({ secret: secret.base32, qr_url: qrUrl, otpauth: secret.otpauth_url });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/auth/2fa/verify', async (req: any, res: any) => {
  try {
    const { email, password, totp_code, totp_secret } = req.body;
    if (!ADMIN_EMAILS.includes(email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin değil' });
    }
    const adminPass = process.env.ADMIN_PASSWORD || 'leadflow-admin-2026';
    if (password !== adminPass) return res.status(401).json({ error: 'Yanlış şifre' });

    // If 2FA is configured, verify TOTP
    const secret = totp_secret || ADMIN_2FA_SECRET;
    if (secret && totp_code) {
      const speakeasy = require('speakeasy');
      const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: totp_code, window: 1 });
      if (!valid) return res.status(401).json({ error: 'Geçersiz 2FA kodu' });
    } else if (secret && !totp_code) {
      return res.status(400).json({ error: '2FA kodu gerekli', requires_2fa: true });
    }

    const token = jwt.sign({ email, isAdmin: true }, ADMIN_SECRET, { expiresIn: '8h' });
    await audit(email, 'auth.login_2fa', undefined, {}, req.ip);
    res.json({ token, email });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Invoices (cross-user) ─────────────────────────────────────────────────────
router.get('/invoices', async (req: any, res: any) => {
  try {
    const { page = '1', status, user_id } = req.query as any;
    const offset = (parseInt(page) - 1) * 50;
    let q = supabase.from('invoices')
      .select('*, users!invoices_user_id_fkey(email, name, company)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + 49);
    if (status) q = q.eq('status', status);
    if (user_id) q = q.eq('user_id', user_id);
    const { data, count, error } = await q;
    if (error) throw error;
    res.json({ invoices: data || [], total: count || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/invoices/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('invoices').select('total, status, created_at');
    const total_revenue = (data||[]).filter((i:any)=>i.status==='paid').reduce((s:number,i:any)=>s+(i.total||0),0);
    const pending = (data||[]).filter((i:any)=>i.status==='pending').length;
    const paid = (data||[]).filter((i:any)=>i.status==='paid').length;
    res.json({ total_revenue, pending, paid, total: data?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/invoices/:id', async (req: any, res: any) => {
  try {
    const { status } = req.body;
    await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    await audit(req.adminEmail, 'invoice.update', undefined, { id: req.params.id, status }, req.ip);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Feature Usage Map ─────────────────────────────────────────────────────────
router.get('/usage-map', async (req: any, res: any) => {
  try {
    const [leads, campaigns, messages, sequences, proposals, microsites, tenders, products, reports] = await Promise.allSettled([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('sequences').select('id', { count: 'exact', head: true }),
      supabase.from('proposals').select('id', { count: 'exact', head: true }),
      supabase.from('microsites').select('id', { count: 'exact', head: true }),
      supabase.from('tenders').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('report_logs').select('id', { count: 'exact', head: true }),
    ]);
    const get = (r: any) => r.status === 'fulfilled' ? (r.value?.count || 0) : 0;
    res.json({
      features: [
        { name: '🎯 Lead Toplama', key: 'leads', count: get(leads), category: 'core' },
        { name: '📢 Kampanyalar', key: 'campaigns', count: get(campaigns), category: 'core' },
        { name: '💬 Mesajlar', key: 'messages', count: get(messages), category: 'core' },
        { name: '🔄 Sekanslar', key: 'sequences', count: get(sequences), category: 'sales' },
        { name: '📋 Teklifler', key: 'proposals', count: get(proposals), category: 'sales' },
        { name: '🌐 Microsites', key: 'microsites', count: get(microsites), category: 'marketing' },
        { name: '📜 İhaleler', key: 'tenders', count: get(tenders), category: 'advanced' },
        { name: '📦 Ürünler', key: 'products', count: get(products), category: 'advanced' },
        { name: '📊 Raporlar', key: 'reports', count: get(reports), category: 'analytics' },
      ].sort((a, b) => b.count - a.count)
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Feature Flags ─────────────────────────────────────────────────────────────
router.get('/flags', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('feature_flags').select('*').order('flag_key');
    res.json({ flags: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/flags', async (req: any, res: any) => {
  try {
    const { flag_key, is_enabled, description, enabled_for_plans, rollout_percent } = req.body;
    const { data, error } = await supabase.from('feature_flags')
      .upsert([{ flag_key, is_enabled, description: description || '', enabled_for_plans: enabled_for_plans || [], rollout_percent: rollout_percent || 0, updated_at: new Date().toISOString() }], { onConflict: 'flag_key' })
      .select().single();
    if (error) throw error;
    await audit(req.adminEmail, `flag.${is_enabled?'enable':'disable'}`, undefined, { flag_key }, req.ip);
    res.json({ flag: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Export all users (CSV) ────────────────────────────────────────────────────
router.get('/export/users', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('users')
      .select('id, email, name, company, plan_type, credits_total, credits_used, created_at, country_code, language_code');
    const header = 'id,email,name,company,plan_type,credits_total,credits_used,created_at,country_code,language_code';
    const rows = (data||[]).map((u: any) =>
      [u.id,u.email,u.name||'',u.company||'',u.plan_type,u.credits_total,u.credits_used,u.created_at,u.country_code||'',u.language_code||''].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leadflow-users.csv');
    res.send([header, ...rows].join('\n'));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Banner click/dismiss tracking (public — no admin auth needed) ─────────────
router.post('/content/banners/:id/click', async (req: any, res: any) => {
  try {
    await supabase.from('admin_banners').update({ click_count: supabase.rpc ? undefined : 0 })
      .eq('id', req.params.id);
    // Simple increment via raw update
    const { data } = await supabase.from('admin_banners').select('click_count').eq('id', req.params.id).single();
    await supabase.from('admin_banners').update({ click_count: ((data as any)?.click_count || 0) + 1 }).eq('id', req.params.id);
    res.json({ ok: true });
  } catch { res.json({ ok: true }); } // non-critical
});

router.post('/content/banners/:id/view', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('admin_banners').select('view_count').eq('id', req.params.id).single();
    await supabase.from('admin_banners').update({ view_count: ((data as any)?.view_count || 0) + 1 }).eq('id', req.params.id);
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
});

// ── POST /api/admin/users/bulk — Bulk credit update ───────────────────────────
router.post('/users/bulk', async (req: any, res: any) => {
  try {
    const { plan_filter, action, value, reason } = req.body;
    if (!action || !value) return res.status(400).json({ error: 'action ve value gerekli' });

    let query = supabase.from('users').select('id, credits_total');
    if (plan_filter && plan_filter !== 'all') query = query.eq('plan_type', plan_filter);
    const { data: users } = await query;
    if (!users?.length) return res.json({ ok: true, updated: 0 });

    let updated = 0;
    for (const u of users) {
      if (action === 'add_credits') {
        await supabase.from('users').update({ credits_total: (u.credits_total || 0) + parseInt(value) }).eq('id', u.id);
        updated++;
      }
    }
    await audit(req.adminEmail, 'users.bulk', undefined, { action, value, plan_filter, count: updated, reason }, req.ip);
    res.json({ ok: true, updated });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/churn — Churn analysis ─────────────────────────────────────
router.get('/churn', async (req: any, res: any) => {
  try {
    const { data: users } = await supabase.from('users')
      .select('id, email, name, plan_type, credits_total, credits_used, created_at, country_code');

    // Simple churn risk: users with <10% credits left
    const highRisk = (users||[]).filter((u: any) => {
      const left = (u.credits_total||0) - (u.credits_used||0);
      const pct = u.credits_total ? (left/u.credits_total)*100 : 100;
      return pct < 10;
    });
    const medRisk = (users||[]).filter((u: any) => {
      const left = (u.credits_total||0) - (u.credits_used||0);
      const pct = u.credits_total ? (left/u.credits_total)*100 : 100;
      return pct >= 10 && pct < 30;
    });

    res.json({ high_risk: highRisk, medium_risk: medRisk, total: users?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/promo/redeem — User redeems promo code ────────────────────
router.post('/promo/redeem', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    const userId = req.userId; // from user auth (not admin)
    if (!code || !userId) return res.status(400).json({ error: 'Kod ve kullanıcı gerekli' });

    const { data: promo } = await supabase.from('promo_codes').select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();
    if (!promo) return res.status(404).json({ error: 'Geçersiz veya süresi dolmuş promo kodu' });
    if (promo.max_uses && promo.uses_count >= promo.max_uses) return res.status(400).json({ error: 'Bu kod kullanım limitine ulaştı' });

    // Apply the promo
    if (promo.type === 'credits') {
      const { data: user } = await supabase.from('users').select('credits_total').eq('id', userId).single();
      await supabase.from('users').update({ credits_total: ((user as any)?.credits_total || 0) + promo.value }).eq('id', userId);
    }
    await supabase.from('promo_codes').update({ uses_count: (promo.uses_count || 0) + 1 }).eq('id', promo.id);

    res.json({ ok: true, type: promo.type, value: promo.value, message: `${promo.value} kredi hesabınıza eklendi!` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// ── Banner click/dismiss tracking (public — no admin auth) ─────────────────────
