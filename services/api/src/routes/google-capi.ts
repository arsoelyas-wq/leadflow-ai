export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');
const { fireGoogleConversion } = require('../services/google-enhanced-conversions');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

// GET /api/google-capi/settings
router.get('/settings', authMiddleware, async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('google_customer_id, google_conversion_action_id, google_capi_enabled')
      .eq('user_id', req.userId)
      .single();

    const { data: conn } = await supabase
      .from('google_ads_connections')
      .select('access_token, customer_name, connected_at')
      .eq('user_id', req.userId)
      .maybeSingle();

    res.json({
      customerId:         data?.google_customer_id || '',
      conversionActionId: data?.google_conversion_action_id || '',
      enabled:            data?.google_capi_enabled          ?? false,
      hasConnection:      !!(conn?.access_token),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/google-capi/settings
router.post('/settings', authMiddleware, async (req: any, res: any) => {
  try {
    const { customerId, conversionActionId, enabled } = req.body;

    const update: any = {
      user_id:          req.userId,
      google_capi_enabled: enabled !== undefined ? enabled : true,
      updated_at:        new Date().toISOString(),
    };
    if (customerId         !== undefined) update.google_customer_id          = customerId;
    if (conversionActionId !== undefined) update.google_conversion_action_id = conversionActionId;

    await supabase.from('user_settings').upsert(update, { onConflict: 'user_id' });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── TEST ─────────────────────────────────────────────────────────────────────

// POST /api/google-capi/test
router.post('/test', authMiddleware, async (req: any, res: any) => {
  try {
    const fakeLead = {
      id:           'test-' + Date.now(),
      email:        req.body.email || 'test@example.com',
      phone:        req.body.phone || '+905001234567',
      contact_name: 'Test Kullanıcı',
      company_name: 'Test Firma',
      gclid:        req.body.gclid || '',
    };
    await fireGoogleConversion(supabase, req.userId, fakeLead, 'LeadFormSubmit');
    res.json({ success: true, message: 'Test dönüşümü Google Ads\'e gönderildi. Google Ads → Araçlar → Dönüşümler → Dönüşüm İşlemleri\'nden kontrol edin.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── EVENT LOG ────────────────────────────────────────────────────────────────

// GET /api/google-capi/events
router.get('/events', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('google_capi_events')
      .select('*, leads(company_name)')
      .eq('user_id', req.userId)
      .order('fired_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ events: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ATTRIBUTION ──────────────────────────────────────────────────────────────

// GET /api/google-capi/attribution — gclid → leads → won → revenue
router.get('/attribution', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, company_name, status, utm_source, utm_medium, utm_campaign, deal_value, gclid, created_at, won_at')
      .eq('user_id', req.userId)
      .or('gclid.not.is.null,utm_source.eq.google,utm_source.eq.google-ads,utm_source.eq.adwords')
      .order('created_at', { ascending: false })
      ;

    if (error) throw error;

    const campaignMap: Record<string, any> = {};
    for (const lead of leads || []) {
      const key = lead.utm_campaign || (lead.gclid ? 'Google (gclid)' : lead.utm_source) || 'unknown';
      if (!campaignMap[key]) {
        campaignMap[key] = { campaign: key, source: lead.utm_source || 'google', leads: 0, won: 0, revenue: 0, hasGclid: 0 };
      }
      const c = campaignMap[key];
      c.leads++;
      if (lead.status === 'won') { c.won++; c.revenue += Number(lead.deal_value || 0); }
      if (lead.gclid) c.hasGclid++;
    }

    const rows = Object.values(campaignMap).map((c: any) => ({
      ...c,
      winRate: c.leads > 0 ? Math.round((c.won / c.leads) * 100) : 0,
      avgDeal: c.won   > 0 ? Math.round(c.revenue / c.won)       : 0,
      gclidPct: c.leads > 0 ? Math.round((c.hasGclid / c.leads) * 100) : 0,
    })).sort((a: any, b: any) => b.revenue - a.revenue);

    const totalLeads   = leads?.length || 0;
    const totalWon     = rows.reduce((s: number, r: any) => s + r.won, 0);
    const totalRevenue = rows.reduce((s: number, r: any) => s + r.revenue, 0);
    const withGclid    = (leads || []).filter((l: any) => l.gclid).length;

    res.json({
      rows,
      summary: {
        totalLeads, totalWon, totalRevenue,
        gclidCoverage: totalLeads > 0 ? Math.round((withGclid / totalLeads) * 100) : 0,
        campaigns: rows.length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CUSTOMER MATCH EXPORT ────────────────────────────────────────────────────

// GET /api/google-capi/audience/won — hashed won leads for Customer Match
router.get('/audience/won', authMiddleware, async (req: any, res: any) => {
  try {
    const crypto = require('crypto');
    const hash   = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

    const { data, error } = await supabase
      .from('leads')
      .select('email, phone, contact_name')
      .eq('user_id', req.userId)
      .eq('status', 'won');

    if (error) throw error;

    const rows = (data || []).map((l: any) => {
      const parts = (l.contact_name || '').trim().split(/\s+/);
      return {
        email: l.email ? hash(l.email)  : '',
        phone: l.phone ? hash(l.phone.replace(/[\s\-().]/g, ''))  : '',
        fn:    parts[0]                 ? hash(parts[0])          : '',
        ln:    parts.slice(1).join(' ') ? hash(parts.slice(1).join(' ')) : '',
      };
    }).filter((r: any) => r.email || r.phone);

    const csv = ['Email,Phone,FirstName,LastName', ...rows.map((r: any) => `${r.email},${r.phone},${r.fn},${r.ln}`)].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="google-customer-match-won-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
