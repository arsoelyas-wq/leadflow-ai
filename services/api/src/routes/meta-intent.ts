export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const META_ACCESS_TOKEN = process.env.META_WA_TOKEN;
const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_API_BASE = 'https://graph.facebook.com/v18.0';

// ── META CONVERSIONS API ──────────────────────────────────
async function sendConversionEvent(eventData: any): Promise<any> {
  if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
    console.log('Meta Pixel not configured');
    return null;
  }

  try {
    const response = await axios.post(
      `${META_API_BASE}/${META_PIXEL_ID}/events`,
      {
        data: [eventData],
        access_token: META_ACCESS_TOKEN,
      }
    );
    return response.data;
  } catch (e: any) {
    console.error('Meta Conversions API error:', e.response?.data || e.message);
    return null;
  }
}

// Hash fonksiyonu (PII için)
function hashData(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
}

// ── LEAD EVENT GÖNDER ─────────────────────────────────────
router.post('/track-lead', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, eventName = 'Lead' } = req.body;

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const eventData: any = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'system_generated',
      user_data: {},
      custom_data: {
        company: lead.company_name,
        city: lead.city,
        sector: lead.sector,
        lead_id: lead.id,
      },
    };

    if (lead.phone) eventData.user_data.ph = [hashData(lead.phone)];
    if (lead.email) eventData.user_data.em = [hashData(lead.email)];

    const result = await sendConversionEvent(eventData);

    // Log kaydet
    await supabase.from('meta_events').insert([{
      user_id: userId,
      lead_id: leadId,
      event_name: eventName,
      sent_at: new Date().toISOString(),
      result: JSON.stringify(result),
    }]).catch(() => {});

    res.json({ success: true, result, eventName });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/meta/track-batch — Toplu event
router.post('/track-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { eventName = 'Lead', status } = req.body;

    let query = supabase.from('leads').select('*').eq('user_id', userId);
    if (status) query = query.eq('status', status);
    const { data: leads } = await query.limit(100);

    if (!leads?.length) return res.json({ message: 'Lead yok', sent: 0 });

    const events = leads.map((lead: any) => {
      const event: any = {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system_generated',
        user_data: {},
        custom_data: { company: lead.company_name, city: lead.city, sector: lead.sector },
      };
      if (lead.phone) event.user_data.ph = [hashData(lead.phone)];
      if (lead.email) event.user_data.em = [hashData(lead.email)];
      return event;
    });

    // Max 1000 event/istek
    let sent = 0;
    for (let i = 0; i < events.length; i += 100) {
      const batch = events.slice(i, i + 100);
      if (META_ACCESS_TOKEN && META_PIXEL_ID) {
        await axios.post(`${META_API_BASE}/${META_PIXEL_ID}/events`, {
          data: batch,
          access_token: META_ACCESS_TOKEN,
        }).catch(() => {});
      }
      sent += batch.length;
      await new Promise(r => setTimeout(r, 500));
    }

    res.json({ message: `${sent} event gönderildi`, sent, eventName });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/meta/custom-audience — Özel kitle oluştur
router.post('/custom-audience', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, status, sector } = req.body;

    let query = supabase.from('leads').select('phone, email').eq('user_id', userId);
    if (status) query = query.eq('status', status);
    if (sector) query = query.ilike('sector', `%${sector}%`);
    const { data: leads } = await query.limit(500);

    if (!leads?.length) return res.status(400).json({ error: 'Yeterli lead yok' });

    // Hashlenmiş veriler
    const phones = leads.filter((l: any) => l.phone).map((l: any) => hashData(l.phone));
    const emails = leads.filter((l: any) => l.email).map((l: any) => hashData(l.email));

    res.json({
      audienceName: name || `LeadFlow_${status || 'all'}_${new Date().toLocaleDateString('tr-TR')}`,
      totalContacts: leads.length,
      phones: phones.length,
      emails: emails.length,
      message: 'Meta Business Manager\'dan Custom Audience oluşturun ve bu verileri yükleyin',
      data: { phones: phones.slice(0, 10), emails: emails.slice(0, 10) },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/meta/pixel-code — Pixel kodu üret
router.get('/pixel-code', async (req: any, res: any) => {
  const pixelId = META_PIXEL_ID || 'YOUR_PIXEL_ID';
  const code = `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<!-- End Meta Pixel Code -->`;

  res.json({ pixelId, code, configured: !!META_PIXEL_ID });
});

// GET /api/meta/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase.from('meta_events')
      .select('event_name, sent_at').eq('user_id', userId)
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const byEvent = (data || []).reduce((acc: any, e: any) => {
      acc[e.event_name] = (acc[e.event_name] || 0) + 1;
      return acc;
    }, {});

    res.json({ total: data?.length || 0, byEvent, configured: !!META_PIXEL_ID });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;