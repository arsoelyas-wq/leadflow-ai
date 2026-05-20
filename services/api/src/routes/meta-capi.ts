export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');
const { fireCapiEvent } = require('../services/meta-capi');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

// GET /api/meta-capi/settings
router.get('/settings', authMiddleware, async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('meta_pixel_id, meta_access_token, meta_test_code, meta_capi_enabled')
      .eq('user_id', req.userId)
      .single();

    res.json({
      pixelId:     data?.meta_pixel_id     || '',
      accessToken: data?.meta_access_token ? '***' : '',  // never return raw token
      testCode:    data?.meta_test_code     || '',
      enabled:     data?.meta_capi_enabled  ?? false,
      hasToken:    !!data?.meta_access_token,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/meta-capi/settings
router.post('/settings', authMiddleware, async (req: any, res: any) => {
  try {
    const { pixelId, accessToken, testCode, enabled } = req.body;

    const update: any = {
      user_id:          req.userId,
      meta_capi_enabled: enabled !== undefined ? enabled : true,
      updated_at:        new Date().toISOString(),
    };
    if (pixelId !== undefined)     update.meta_pixel_id     = pixelId;
    if (testCode !== undefined)    update.meta_test_code     = testCode;
    if (accessToken && !accessToken.startsWith('***')) update.meta_access_token = accessToken;

    await supabase.from('user_settings').upsert(update, { onConflict: 'user_id' });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── TEST EVENT ───────────────────────────────────────────────────────────────

// POST /api/meta-capi/test — fire a TestLead event to verify connection
router.post('/test', authMiddleware, async (req: any, res: any) => {
  try {
    const fakeLead = {
      id:           'test-lead-' + Date.now(),
      email:        req.body.email || 'test@example.com',
      phone:        req.body.phone || '+905001234567',
      contact_name: 'Test User',
      company_name: 'Test Company',
      city:         'Istanbul',
      sector:       'Test',
    };
    await fireCapiEvent(supabase, req.userId, fakeLead, 'Lead');
    res.json({ success: true, message: 'Test Lead eventi Meta\'ya gönderildi. Events Manager > Test Events panelinde kontrol edin.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── EVENT LOG ────────────────────────────────────────────────────────────────

// GET /api/meta-capi/events — recent CAPI event log
router.get('/events', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('meta_capi_events')
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

// ─── ATTRIBUTION DASHBOARD ────────────────────────────────────────────────────

// GET /api/meta-capi/attribution — UTM → leads → won → revenue breakdown
router.get('/attribution', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, company_name, status, utm_source, utm_medium, utm_campaign, utm_content, deal_value, fbc, created_at, won_at')
      .eq('user_id', req.userId)
      .not('utm_source', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;

    // Group by utm_campaign
    const campaignMap: Record<string, {
      campaign: string; source: string; medium: string;
      leads: number; contacted: number; proposals: number; won: number;
      revenue: number; hasFbc: number;
    }> = {};

    for (const lead of leads || []) {
      const key = lead.utm_campaign || lead.utm_source || 'unknown';
      if (!campaignMap[key]) {
        campaignMap[key] = {
          campaign:  lead.utm_campaign || '—',
          source:    lead.utm_source   || '—',
          medium:    lead.utm_medium   || '—',
          leads:     0, contacted: 0, proposals: 0, won: 0,
          revenue:   0, hasFbc:    0,
        };
      }
      const c = campaignMap[key];
      c.leads++;
      if (['contacted', 'replied', 'proposal', 'negotiation', 'won'].includes(lead.status)) c.contacted++;
      if (['proposal', 'negotiation', 'won'].includes(lead.status)) c.proposals++;
      if (lead.status === 'won') { c.won++; c.revenue += Number(lead.deal_value || 0); }
      if (lead.fbc) c.hasFbc++;
    }

    const rows = Object.values(campaignMap).map(c => ({
      ...c,
      cpl:      c.leads   > 0 ? null : null,   // cost per lead — needs ad spend from Meta API
      winRate:  c.leads   > 0 ? Math.round((c.won      / c.leads)    * 100) : 0,
      convRate: c.leads   > 0 ? Math.round((c.contacted / c.leads)   * 100) : 0,
      avgDeal:  c.won     > 0 ? Math.round(c.revenue / c.won)               : 0,
      fbcPct:   c.leads   > 0 ? Math.round((c.hasFbc   / c.leads)    * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Summary
    const totalLeads   = leads?.length || 0;
    const totalWon     = rows.reduce((s, r) => s + r.won, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const withFbc      = (leads || []).filter((l: any) => l.fbc).length;

    res.json({
      rows,
      summary: {
        totalLeads,
        totalWon,
        totalRevenue,
        fbcCoverage: totalLeads > 0 ? Math.round((withFbc / totalLeads) * 100) : 0,
        campaigns:   rows.length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CUSTOM AUDIENCE EXPORT ────────────────────────────────────────────────────

// GET /api/meta-capi/audience/won — hashed won leads for Custom Audience upload
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
      const parts    = (l.contact_name || '').trim().split(/\s+/);
      const fn       = parts[0] || '';
      const ln       = parts.slice(1).join(' ') || '';
      return {
        email: l.email ? hash(l.email) : '',
        phone: l.phone ? hash(l.phone.replace(/[\s\-().]/g, '')) : '',
        fn:    fn      ? hash(fn)      : '',
        ln:    ln      ? hash(ln)      : '',
      };
    }).filter((r: any) => r.email || r.phone);

    // Return as CSV for direct Meta Custom Audience upload
    const csv = ['email,phone,fn,ln', ...rows.map((r: any) => `${r.email},${r.phone},${r.fn},${r.ln}`)].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="meta-audience-won-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/meta-capi/audience/lost — hashed lost leads for retargeting
router.get('/audience/lost', authMiddleware, async (req: any, res: any) => {
  try {
    const crypto = require('crypto');
    const hash   = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

    const { data, error } = await supabase
      .from('leads')
      .select('email, phone, contact_name')
      .eq('user_id', req.userId)
      .eq('status', 'lost');

    if (error) throw error;

    const rows = (data || []).map((l: any) => {
      const parts = (l.contact_name || '').trim().split(/\s+/);
      return {
        email: l.email ? hash(l.email) : '',
        phone: l.phone ? hash(l.phone.replace(/[\s\-().]/g, '')) : '',
        fn:    parts[0]          ? hash(parts[0])              : '',
        ln:    parts.slice(1).join(' ') ? hash(parts.slice(1).join(' ')) : '',
      };
    }).filter((r: any) => r.email || r.phone);

    const csv = ['email,phone,fn,ln', ...rows.map((r: any) => `${r.email},${r.phone},${r.fn},${r.ln}`)].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="meta-audience-lost-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
