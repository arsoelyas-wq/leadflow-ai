export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk').default;
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── AI ile en iyi gönderim saatini hesapla ───────────────────────────────────
router.post('/analyze', authMiddleware, async (req: any, res: any) => {
  const { lead_id, channel } = req.body;
  const userId = req.userId;

  try {
    const { data: messages } = await supabase
      .from('messages')
      .select('created_at, status, direction')
      .eq('lead_id', lead_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: lead } = await supabase
      .from('leads')
      .select('city, sector, company_name, country')
      .eq('id', lead_id)
      .single();

    const interactionHours = (messages || [])
      .filter((m: any) => m.direction === 'inbound')
      .map((m: any) => new Date(m.created_at).getHours());

    const prompt = `You are a global B2B sales expert. Based on the data below, suggest the best time to send a message to this lead.

Lead Info:
- City: ${lead?.city || 'Unknown'}
- Country: ${lead?.country || 'Unknown'}
- Sector: ${lead?.sector || 'Unknown'}
- Company: ${lead?.company_name || 'Unknown'}
- Channel: ${channel}

Past interaction hours: ${interactionHours.length > 0 ? interactionHours.join(', ') : 'No data'}
Total messages: ${messages?.length || 0}

Consider local business culture and timezone. Return ONLY valid JSON:
{
  "best_hour": 10,
  "best_days": ["Tuesday", "Wednesday", "Thursday"],
  "avoid_hours": [12, 13, 17, 18],
  "reasoning": "explanation",
  "confidence": 85,
  "timezone": "Europe/Istanbul"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const timing = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!timing) throw new Error('AI response could not be parsed');

    await supabase.from('send_timing_cache').upsert({
      user_id: userId,
      lead_id,
      channel,
      best_hour: timing.best_hour,
      best_days: timing.best_days,
      avoid_hours: timing.avoid_hours,
      reasoning: timing.reasoning,
      confidence: timing.confidence,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,lead_id,channel' });

    res.json({ success: true, timing });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Zamanlanmış gönderimler listesi ─────────────────────────────────────────
router.get('/scheduled', authMiddleware, async (req: any, res: any) => {
  const userId = req.userId;
  const { status } = req.query;

  try {
    let query = supabase
      .from('scheduled_sends')
      .select(`*, leads(company_name, phone, email), campaigns(name, channel)`)
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query.limit(200);
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Manuel zamanlama oluştur ─────────────────────────────────────────────────
router.post('/schedule', authMiddleware, async (req: any, res: any) => {
  const { lead_id, campaign_id, message, channel, scheduled_at, use_ai } = req.body;
  const userId = req.userId;

  try {
    let finalScheduledAt = scheduled_at;

    if (use_ai) {
      const { data: cache } = await supabase
        .from('send_timing_cache')
        .select('best_hour, best_days')
        .eq('lead_id', lead_id)
        .eq('channel', channel)
        .single();

      if (cache) {
        const now = new Date();
        const candidate = new Date(now);
        candidate.setHours(cache.best_hour, 0, 0, 0);
        if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
        finalScheduledAt = candidate.toISOString();
      }
    }

    const { data, error } = await supabase.from('scheduled_sends').insert({
      user_id: userId,
      lead_id,
      campaign_id,
      message,
      channel,
      scheduled_at: finalScheduledAt,
      status: 'pending',
      created_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cron: Bekleyen gönderimler işle ─────────────────────────────────────────
router.post('/cron/process', async (req: any, res: any) => {
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();

    const { data: pending } = await supabase
      .from('scheduled_sends')
      .select('*, leads(phone, email)')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(50);

    let processed = 0;
    let failed = 0;

    for (const send of pending || []) {
      try {
        await supabase.from('messages').insert({
          user_id: send.user_id,
          lead_id: send.lead_id,
          campaign_id: send.campaign_id,
          content: send.message,
          channel: send.channel,
          direction: 'outbound',
          status: 'sent',
          created_at: new Date().toISOString()
        });

        await supabase
          .from('scheduled_sends')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', send.id);

        processed++;
      } catch {
        await supabase.from('scheduled_sends').update({ status: 'failed' }).eq('id', send.id);
        failed++;
      }
    }

    res.json({ success: true, processed, failed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;