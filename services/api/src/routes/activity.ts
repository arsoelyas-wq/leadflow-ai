export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 1x1 transparent GIF bytes
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Hot score weights per event type (decays over time)
const EVENT_WEIGHT: Record<string, number> = {
  email_open:      20,
  email_click:     35,
  site_visit:      25,
  whatsapp_reply:  50,
  call_made:       15,
  status_change:   10,
  dm_found:        10,
  enriched:         5,
};

async function logActivity(leadId: string, userId: string, eventType: string, metadata: any = {}) {
  try {
    await supabase.from('lead_activities').insert({ lead_id: leadId, user_id: userId, event_type: eventType, metadata });

    // Recalculate hot_score from last 7 days of events
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: events } = await supabase
      .from('lead_activities')
      .select('event_type, created_at')
      .eq('lead_id', leadId)
      .gte('created_at', since);

    let hotScore = 0;
    const now = Date.now();
    for (const ev of events || []) {
      const ageDays = (now - new Date(ev.created_at).getTime()) / 86400000;
      const decay = Math.max(0, 1 - ageDays / 7); // linear decay over 7 days
      hotScore += (EVENT_WEIGHT[ev.event_type] || 5) * decay;
    }

    await supabase
      .from('leads')
      .update({ hot_score: Math.round(hotScore), last_activity_at: new Date().toISOString() })
      .eq('id', leadId);
  } catch {}
}

// Public: pixel tracking (no auth — embedded in emails)
// GET /api/activity/pixel/:token
router.get('/pixel/:token', async (req: any, res: any) => {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.send(PIXEL_GIF);

  // Fire-and-forget: log the open
  const token = req.params.token;
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, user_id')
      .eq('pixel_token', token)
      .single();
    if (lead) {
      const userAgent = req.headers['user-agent'] || '';
      // Skip bot/preview opens
      const isBot = /bot|crawl|preview|fetch|scanner|check/i.test(userAgent);
      if (!isBot) {
        await logActivity(lead.id, lead.user_id, 'email_open', {
          ip: req.ip,
          ua: userAgent.slice(0, 120),
        });
      }
    }
  } catch {}
});

// POST /api/activity/pixel/create — Generate tracking pixel token for a lead
router.post('/pixel/create', authMiddleware, async (req: any, res: any) => {
  try {
    const { leadId } = req.body;
    const token = `${leadId.slice(0,8)}_${Date.now().toString(36)}`;
    await supabase.from('leads').update({ pixel_token: token }).eq('id', leadId).eq('user_id', req.userId);
    const API = process.env.API_BASE_URL || 'https://leadflow-ai-production.up.railway.app';
    res.json({ token, pixelUrl: `${API}/api/activity/pixel/${token}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/activity/log — Log any activity event
router.post('/log', authMiddleware, async (req: any, res: any) => {
  try {
    const { leadId, eventType, metadata } = req.body;
    await logActivity(leadId, req.userId, eventType, metadata || {});
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/lead/:leadId — Timeline for a lead
router.get('/lead/:leadId', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', req.params.leadId)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ activities: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/hot — Hot leads sorted by hot_score
router.get('/hot', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, company_name, city, sector, hot_score, last_activity_at, status, score, ai_grade')
      .eq('user_id', req.userId)
      .gt('hot_score', 0)
      .order('hot_score', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json({ leads: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, logActivity };
