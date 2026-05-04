export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/video-tracking/:code - Redirect ve kayit
router.get('/:code', async (req: any, res: any) => {
  try {
    const { code } = req.params;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const ua = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';

    // Kodu bul
    const { data: video } = await supabase
      .from('video_outreach')
      .select('id, video_url, user_id, lead_id, tracking_code, view_count')
      .eq('tracking_code', code)
      .single();

    if (!video || !video.video_url) {
      return res.status(404).send('Video bulunamadi');
    }

    // Gorunum kaydet
    const now = new Date().toISOString();
    await supabase.from('video_views').insert([{
      video_id: video.id,
      user_id: video.user_id,
      lead_id: video.lead_id,
      ip_address: ip,
      user_agent: ua,
      referer,
      viewed_at: now,
    }]);

    // Ilk acilis mi?
    const isFirst = !video.view_count || video.view_count === 0;
    await supabase.from('video_outreach').update({
      view_count: (video.view_count || 0) + 1,
      first_viewed_at: isFirst ? now : undefined,
      last_viewed_at: now,
    }).eq('id', video.id);

    // Lead'i guncelle
    if (video.lead_id) {
      await supabase.from('leads').update({
        status: 'responded',
        last_activity_at: now,
      }).eq('id', video.lead_id);
    }

    // Tetikleyici: ilk acilista sesli arama baslatilsin mi?
    if (isFirst && video.user_id) {
      const { data: settings } = await supabase
        .from('video_outreach_settings')
        .select('auto_call_on_view, call_delay_minutes')
        .eq('user_id', video.user_id)
        .single();

      if (settings?.auto_call_on_view) {
        const delayMs = (settings.call_delay_minutes || 5) * 60 * 1000;
        setTimeout(async () => {
          try {
            const axios = require('axios');
            const { data: lead } = await supabase
              .from('leads').select('phone').eq('id', video.lead_id).single();
            if (!lead?.phone) return;

            const { data: vsettings } = await supabase
              .from('voice_settings').select('*').eq('user_id', video.user_id).single();
            const { data: profile } = await supabase
              .from('business_profiles').select('*').eq('user_id', video.user_id).single();

            const agentName = vsettings?.agent_name || 'Satis Temsilcisi';
            const companyName = profile?.company?.name || 'Sirketimiz';
            const openingLine = `Merhaba! Ben ${agentName}, ${companyName}'den ariyorum. Az once size gonderdigimiz videoyu izlediginizi gorduk, sormak istediginiz bir sey var mi?`;

            await axios.post(
              'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
              {
                agent_id: process.env.ELEVENLABS_AGENT_ID,
                agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
                to_number: lead.phone,
                conversation_initiation_client_data: {
                  dynamic_variables: {
                    agent_name: agentName,
                    company_name: companyName,
                    product_description: profile?.product?.description || '',
                    opening_line: openingLine,
                    language: 'tr',
                  },
                },
              },
              { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' } }
            );

            await supabase.from('video_outreach').update({ auto_call_triggered: true }).eq('id', video.id);
            console.log(`Video acildi, otomatik arama tetiklendi: ${lead.phone}`);
          } catch (err: any) {
            console.error('Auto-call error:', err.message);
          }
        }, delayMs);
      }
    }

    // Video URL'sine redirect
    res.redirect(301, video.video_url);
  } catch (e: any) {
    console.error('Tracking error:', e.message);
    res.status(500).send('Hata');
  }
});

// GET /api/video-tracking/stats/:videoId - Video istatistikleri
router.get('/stats/:videoId', async (req: any, res: any) => {
  try {
    const { data: views } = await supabase
      .from('video_views')
      .select('*')
      .eq('video_id', req.params.videoId)
      .order('viewed_at', { ascending: false });

    const { data: video } = await supabase
      .from('video_outreach')
      .select('view_count, first_viewed_at, last_viewed_at, auto_call_triggered')
      .eq('id', req.params.videoId)
      .single();

    res.json({
      views: views || [],
      total: video?.view_count || 0,
      first_viewed_at: video?.first_viewed_at,
      last_viewed_at: video?.last_viewed_at,
      auto_call_triggered: video?.auto_call_triggered,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;