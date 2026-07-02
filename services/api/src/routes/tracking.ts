export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 1x1 şeffaf GIF — tracking pixel için
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// GET /api/tracking/email/:messageId/open.gif — Email açma tespiti
// Bu URL kampanya emaillerine gömülür: <img src="...open.gif" width="1" height="1">
router.get('/email/:messageId/open.gif', async (req: any, res: any) => {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.send(TRANSPARENT_GIF);

  // Arka planda kayıt — response'u bloklamadan
  setImmediate(async () => {
    try {
      const { messageId } = req.params;
      const { data: msg } = await supabase.from('messages')
        .select('id, lead_id, user_id').eq('id', messageId).single();
      if (!msg) return;

      // Lead skoru artır (email açma = ilgi sinyali)
      await supabase.from('message_events').insert([{
        message_id: messageId,
        lead_id: msg.lead_id,
        user_id: msg.user_id,
        event_type: 'email_opened',
        metadata: {
          ip: req.ip,
          ua: req.headers['user-agent']?.slice(0, 100),
          opened_at: new Date().toISOString(),
        },
      }]).catch(() => {}); // Tablo yoksa sessizce geç

      // Lead hot_score artır
      const { data: lead } = await supabase.from('leads')
        .select('score').eq('id', msg.lead_id).single();
      const newScore = Math.min(100, (lead?.score || 50) + 5);
      await supabase.from('leads').update({ score: newScore }).eq('id', msg.lead_id).catch(() => {});

      // email_opened workflow trigger
      const { triggerWorkflowByEvent } = require('./workflow-v2');
      if (typeof triggerWorkflowByEvent === 'function') {
        await triggerWorkflowByEvent(msg.user_id, msg.lead_id, 'email_opened', { messageId }).catch(() => {});
      }

      console.log(`[Tracking] Email opened: message=${messageId} lead=${msg.lead_id}`);
    } catch (err: any) { console.warn('[Tracking] Email open log failed:', err.message?.slice(0, 60)); }
  });
});

// GET /api/tracking/link/:messageId/:encodedUrl — Link tıklama takibi
router.get('/link/:messageId/:encodedUrl', async (req: any, res: any) => {
  const targetUrl = Buffer.from(req.params.encodedUrl, 'base64').toString('utf8');

  // Hemen yönlendir
  res.redirect(302, targetUrl);

  setImmediate(async () => {
    try {
      const { messageId } = req.params;
      const { data: msg } = await supabase.from('messages')
        .select('id, lead_id, user_id').eq('id', messageId).single();
      if (!msg) return;

      await supabase.from('message_events').insert([{
        message_id: messageId,
        lead_id: msg.lead_id,
        user_id: msg.user_id,
        event_type: 'link_clicked',
        metadata: { url: targetUrl, clicked_at: new Date().toISOString() },
      }]).catch(() => {});

      console.log(`[Tracking] Link clicked: message=${messageId} url=${targetUrl.slice(0, 60)}`);
    } catch {}
  });
});

// GET /api/tracking/stats/:userId — Kullanıcı bazlı tracking istatistikleri
router.get('/stats', async (req: any, res: any) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days as string) * 86400000).toISOString();

    const { data: events } = await supabase.from('message_events')
      .select('event_type')
      .eq('user_id', req.userId)
      .gte('occurred_at', since);

    const counts: Record<string, number> = {};
    for (const e of (events || [])) {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    }

    res.json({ period: `${days} gün`, stats: counts });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
