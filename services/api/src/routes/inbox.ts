export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/inbox/messages — Tüm kanallardan mesajlar
router.get('/messages', async (req: any, res: any) => {
  try {
    const { channel, unread, limit = 50, offset = 0 } = req.query;
    const userId = req.userId;

    let query = supabase.from('messages')
      .select('*, leads(id, company_name, contact_name, phone, source)')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(parseInt(limit as string))
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (channel) query = query.eq('channel', channel);
    if (unread === 'true') query = query.eq('read', false);

    const { data, error } = await query;
    if (error) throw error;

    // Kanallardan özet
    const { data: channels } = await supabase.from('messages')
      .select('channel').eq('user_id', userId);

    const channelCounts: Record<string, number> = {};
    (channels || []).forEach((m: any) => {
      channelCounts[m.channel || 'whatsapp'] = (channelCounts[m.channel || 'whatsapp'] || 0) + 1;
    });

    res.json({ messages: data || [], channelCounts, total: data?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/inbox/conversations — Lead bazlı konuşmalar
router.get('/conversations', async (req: any, res: any) => {
  try {
    const { channel, limit = 30 } = req.query;
    const userId = req.userId;

    // Her lead için son mesajı al
    const { data: leads } = await supabase.from('leads')
      .select('id, company_name, contact_name, phone, source, status')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit as string));

    const conversations = await Promise.all((leads || []).map(async (lead: any) => {
      let query = supabase.from('messages')
        .select('content, direction, sent_at, channel, read')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: false })
        .limit(1);

      if (channel) query = query.eq('channel', channel);
      const { data: lastMsg } = await query;

      const { data: unreadCount } = await supabase.from('messages')
        .select('id').eq('lead_id', lead.id).eq('direction', 'in').eq('read', false);

      return {
        lead,
        lastMessage: lastMsg?.[0] || null,
        unreadCount: unreadCount?.length || 0,
      };
    }));

    // Son mesajı olanlara göre sırala
    const sorted = conversations
      .filter(c => c.lastMessage)
      .sort((a, b) => new Date(b.lastMessage!.sent_at).getTime() - new Date(a.lastMessage!.sent_at).getTime());

    res.json({ conversations: sorted });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/inbox/send — Tüm kanallardan mesaj gönder
router.post('/send', async (req: any, res: any) => {
  try {
    const { leadId, content, channel = 'whatsapp' } = req.body;
    if (!leadId || !content) return res.status(400).json({ error: 'leadId ve content zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const now = new Date().toISOString();

    if (channel === 'whatsapp') {
      if (!lead.phone) return res.status(400).json({ error: 'Telefon numarası yok' });
      const { sendWhatsAppMessage } = require('./settings');
      await sendWhatsAppMessage(req.userId, lead.phone, content);
    } else if (channel === 'email') {
      // Email gönder — Resend API
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey || !lead.email) return res.status(400).json({ error: 'Email veya Resend API key yok' });
      const axios = require('axios');
      await axios.post('https://api.resend.com/emails', {
        from: 'onboarding@resend.dev',
        to: lead.email,
        subject: `${lead.company_name} için mesaj`,
        text: content,
      }, { headers: { Authorization: `Bearer ${resendKey}` } });
    }

    const { data: msg } = await supabase.from('messages').insert([{
      user_id: req.userId, lead_id: leadId,
      direction: 'out', content, channel,
      sent_at: now, read: true,
    }]).select().single();

    // Lead son iletişim tarihini güncelle
    await supabase.from('leads').update({ last_contacted_at: now }).eq('id', leadId);

    res.json({ message: msg, success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/inbox/read/:leadId — Okundu işaretle
router.patch('/read/:leadId', async (req: any, res: any) => {
  try {
    await supabase.from('messages').update({ read: true })
      .eq('lead_id', req.params.leadId).eq('direction', 'in');
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/inbox/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: unread } = await supabase.from('messages')
      .select('id').eq('user_id', req.userId).eq('direction', 'in').eq('read', false);
    const { data: today } = await supabase.from('messages')
      .select('id').eq('user_id', req.userId)
      .gte('sent_at', new Date().toISOString().split('T')[0]);
    const { data: total } = await supabase.from('messages')
      .select('id').eq('user_id', req.userId);

    res.json({
      unread: unread?.length || 0,
      today: today?.length || 0,
      total: total?.length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;