export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// POST /api/sms/send
router.post('/send', async (req: any, res: any) => {
  try {
    const { message, leadIds, fromNumber } = req.body;
    if (!message || !leadIds?.length) return res.status(400).json({ error: 'message ve leadIds zorunlu' });

    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_FROM = fromNumber || process.env.TWILIO_PHONE_NUMBER;

    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
      return res.status(400).json({ error: 'Twilio ayarları eksik — Railway\'e TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER ekleyin' });
    }

    const { data: leads } = await supabase.from('leads').select('id, phone, contact_name, company_name')
      .eq('user_id', req.userId).in('id', leadIds).not('phone', 'is', null);

    let sent = 0, failed = 0;
    for (const lead of leads || []) {
      try {
        const personalizedMsg = message
          .replace(/\{isim\}/g, lead.contact_name || lead.company_name || 'Sayın Yetkili');

        await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
          new URLSearchParams({ From: TWILIO_FROM, To: lead.phone, Body: personalizedMsg }),
          { auth: { username: TWILIO_SID, password: TWILIO_TOKEN } }
        );

        await supabase.from('messages').insert([{
          user_id: req.userId, lead_id: lead.id,
          direction: 'out', content: personalizedMsg,
          channel: 'sms', sent_at: new Date().toISOString(),
        }]);
        sent++;
        await new Promise(r => setTimeout(r, 200));
      } catch { failed++; }
    }

    res.json({ sent, failed, message: `${sent} SMS gönderildi` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/sms/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('messages').select('id').eq('user_id', req.userId).eq('channel', 'sms');
    res.json({ totalSent: data?.length || 0, configured: !!(process.env.TWILIO_ACCOUNT_SID) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;