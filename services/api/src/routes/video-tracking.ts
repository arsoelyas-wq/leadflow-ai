export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { advanceSequenceOnWatch } = require('./video-sequences');

// ─── CUSTOM VIDEO PLAYER PAGE ─────────────────────────────────────────────────

function buildPlayerHTML(opts: {
  code: string;
  videoUrl: string;
  thumbnailUrl?: string;
  viewId: string;
  brandName?: string;
  companyName?: string;
}): string {
  const { code, videoUrl, thumbnailUrl, viewId, brandName, companyName } = opts;
  const safeCode     = JSON.stringify(code);
  const safeViewId   = JSON.stringify(viewId);
  const safeVideoUrl = videoUrl.replace(/"/g, '&quot;');
  const safeThumb    = (thumbnailUrl || '').replace(/"/g, '&quot;');
  const displayName  = brandName || '';
  const senderName   = companyName || '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta property="og:type" content="video">
<meta property="og:video" content="${safeVideoUrl}">
${thumbnailUrl ? `<meta property="og:image" content="${safeThumb}">` : ''}
<title>${senderName ? senderName + ' — ' : ''}Size Özel Video</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;background:#08080f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;min-height:100vh}
  .wrap{width:100%;max-width:500px}
  .top{text-align:center;margin-bottom:18px}
  .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);border-radius:99px;padding:5px 14px;font-size:11px;color:#a78bfa;letter-spacing:.06em;margin-bottom:10px}
  .dot{width:6px;height:6px;background:#8b5cf6;border-radius:50%;animation:pulse 1.5s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
  .title{color:#fff;font-size:17px;font-weight:600;line-height:1.4}
  .sub{color:#6b7280;font-size:13px;margin-top:4px}
  .player-wrap{position:relative;border-radius:18px;overflow:hidden;background:#111;box-shadow:0 25px 60px rgba(0,0,0,.7)}
  video{width:100%;display:block;max-height:80vh}
  .progress-bar{height:3px;background:rgba(255,255,255,.08);position:relative}
  .progress-fill{height:100%;background:linear-gradient(90deg,#7c3aed,#4f46e5);width:0;transition:width .5s linear}
  .footer{text-align:center;margin-top:14px;color:#374151;font-size:11px}
  .footer a{color:#6b7280;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div class="badge"><span class="dot"></span>KİŞİSEL VIDEO</div>
    ${displayName ? `<p class="title">Merhaba ${displayName}!</p>` : '<p class="title">Size özel bir video hazırladık</p>'}
    ${senderName ? `<p class="sub">${senderName} ekibinden</p>` : ''}
  </div>
  <div class="player-wrap">
    <video id="v" controls playsinline${thumbnailUrl ? ` poster="${safeThumb}"` : ''}>
      <source src="${safeVideoUrl}" type="video/mp4">
      <p style="padding:20px;color:#9ca3af;text-align:center">
        Videonuzu <a href="${safeVideoUrl}" style="color:#8b5cf6">buradan</a> izleyebilirsiniz.
      </p>
    </video>
    <div class="progress-bar"><div class="progress-fill" id="pf"></div></div>
  </div>
  <p class="footer">Bu kişisel bir video mesajıdır · <a href="mailto:?">Yanıtla</a></p>
</div>
<script>
(function(){
  var vid=document.getElementById('v');
  var pf=document.getElementById('pf');
  var code=${safeCode};
  var viewId=${safeViewId};
  var lastPct=-1;
  var thresholds=[20,60,90];
  var sent={};

  function beat(){
    if(!vid.duration||vid.readyState<2)return;
    var pct=Math.min(100,Math.floor(vid.currentTime/vid.duration*100));
    if(pf)pf.style.width=pct+'%';
    if(pct===lastPct)return;
    lastPct=pct;
    var body=JSON.stringify({percent:pct,seconds:Math.floor(vid.currentTime),viewId:viewId});
    if(navigator.sendBeacon){
      navigator.sendBeacon('/v/'+code+'/beat',body);
    } else {
      fetch('/v/'+code+'/beat',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){});
    }
  }

  vid.addEventListener('timeupdate',beat);
  vid.addEventListener('ended',function(){beat();});
  vid.addEventListener('pause',beat);
  setInterval(beat,5000);
})();
</script>
</body>
</html>`;
}

// ─── GET /v/:code — Serve video player ───────────────────────────────────────

router.get('/:code', async (req: any, res: any) => {
  if (req.params.code === 'beat') return; // handled by POST below
  try {
    const { code } = req.params;
    const ip      = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
    const ua      = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';

    const { data: video } = await supabase
      .from('video_outreach')
      .select('id, video_url, thumbnail_url, user_id, lead_id, tracking_code, view_count, research_data')
      .eq('tracking_code', code)
      .single();

    if (!video?.video_url) {
      return res.status(404).send('Video bulunamadı.');
    }

    // Record view
    const now = new Date().toISOString();
    const { data: viewRecord } = await supabase.from('video_views').insert([{
      video_id:   video.id,
      user_id:    video.user_id,
      lead_id:    video.lead_id,
      ip_address: ip,
      user_agent: ua,
      referer,
      viewed_at:  now,
    }]).select('id').single();

    const isFirst = !video.view_count || video.view_count === 0;
    await supabase.from('video_outreach').update({
      view_count:      (video.view_count || 0) + 1,
      first_viewed_at: isFirst ? now : undefined,
      last_viewed_at:  now,
    }).eq('id', video.id);

    if (video.lead_id) {
      await supabase.from('leads').update({ status: 'responded', last_activity_at: now }).eq('id', video.lead_id).catch(() => {});
    }

    // Auto-call on first view
    if (isFirst && video.user_id) {
      const { data: settings } = await supabase
        .from('video_outreach_settings').select('auto_call_on_view, call_delay_minutes')
        .eq('user_id', video.user_id).single();

      if (settings?.auto_call_on_view) {
        const delayMs = (settings.call_delay_minutes || 5) * 60 * 1000;
        setTimeout(async () => {
          try {
            const { data: lead }    = await supabase.from('leads').select('phone').eq('id', video.lead_id).single();
            const { data: vsettings } = await supabase.from('voice_settings').select('*').eq('user_id', video.user_id).single();
            const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', video.user_id).single();
            if (!lead?.phone) return;

            const agentName   = vsettings?.agent_name || 'Satış Temsilcisi';
            const companyName = profile?.company?.name || 'Şirketimiz';
            const brandName   = video.research_data?.brandName || '';

            await axios.post(
              'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
              {
                agent_id: process.env.ELEVENLABS_AGENT_ID,
                agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
                to_number: lead.phone,
                conversation_initiation_client_data: {
                  dynamic_variables: {
                    agent_name:          agentName,
                    company_name:        companyName,
                    product_description: profile?.product?.description || '',
                    opening_line:        `Merhaba${brandName ? ' ' + brandName.split(' ')[0] : ''}! Ben ${agentName}, ${companyName}'den arıyorum. Gönderdiğimiz videoyu izlediğinizi gördük, sorularınız var mı?`,
                    language:            'tr',
                  },
                },
              },
              { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' } }
            );
            await supabase.from('video_outreach').update({ auto_call_triggered: true }).eq('id', video.id);
          } catch (err: any) { console.error('[AutoCall]', err.message); }
        }, delayMs);
      }
    }

    // Serve HTML player
    const brandName   = video.research_data?.brandName || '';
    const { data: profile } = await supabase.from('business_profiles').select('company').eq('user_id', video.user_id).single().catch(() => ({ data: null }));
    const companyName = (profile as any)?.company?.name || '';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.send(buildPlayerHTML({
      code,
      videoUrl:     video.video_url,
      thumbnailUrl: video.thumbnail_url,
      viewId:       viewRecord?.id || '',
      brandName,
      companyName,
    }));
  } catch (e: any) {
    console.error('[Tracking]', e.message);
    res.status(500).send('Hata oluştu.');
  }
});

const axios = require('axios');

// ─── POST /v/:code/beat — Watch time heartbeat ────────────────────────────────

router.post('/:code/beat', async (req: any, res: any) => {
  try {
    const { code } = req.params;
    const { percent = 0, seconds = 0, viewId } = req.body || {};

    res.sendStatus(204); // Respond immediately

    // Find video
    const { data: video } = await supabase
      .from('video_outreach')
      .select('id, user_id, lead_id, max_watch_percent, avg_watch_percent, view_count')
      .eq('tracking_code', code)
      .single();

    if (!video) return;

    const pct     = Math.min(100, Math.max(0, Math.floor(Number(percent))));
    const secs    = Math.floor(Number(seconds));
    const isDone  = pct >= 95;

    // Update the specific view record if viewId provided
    if (viewId) {
      await supabase.from('video_views').update({
        watch_seconds: secs,
        watch_percent: pct,
        completed:     isDone,
      }).eq('id', viewId).catch(() => {});
    }

    // Update max/avg on the video record
    const newMax = Math.max(video.max_watch_percent || 0, pct);
    await supabase.from('video_outreach').update({
      max_watch_percent: newMax,
      // Simple running avg approximation
      avg_watch_percent: Math.round(((video.avg_watch_percent || 0) * Math.max(1, (video.view_count || 1) - 1) + pct) / Math.max(1, video.view_count || 1)),
    }).eq('id', video.id).catch(() => {});

    // Advance sequence based on watch percent
    await advanceSequenceOnWatch(video.id, pct);

    // Log to performance matrix (throttled — only on threshold crossings)
    if ([20, 60, 90].includes(pct)) {
      await supabase.from('video_performance_log').upsert([{
        user_id:      video.user_id,
        video_id:     video.id,
        watch_percent: pct,
      }], { onConflict: 'video_id,watch_percent' }).catch(() => {});
    }
  } catch (e: any) {
    console.error('[Heartbeat]', e.message);
  }
});

// ─── GET /v/stats/:videoId ────────────────────────────────────────────────────

router.get('/stats/:videoId', async (req: any, res: any) => {
  try {
    const { data: views } = await supabase
      .from('video_views')
      .select('*')
      .eq('video_id', req.params.videoId)
      .order('viewed_at', { ascending: false });

    const { data: video } = await supabase
      .from('video_outreach')
      .select('view_count, first_viewed_at, last_viewed_at, auto_call_triggered, avg_watch_percent, max_watch_percent')
      .eq('id', req.params.videoId)
      .single();

    res.json({
      views:                views || [],
      total:                video?.view_count || 0,
      avg_watch_percent:    video?.avg_watch_percent || 0,
      max_watch_percent:    video?.max_watch_percent || 0,
      first_viewed_at:      video?.first_viewed_at,
      last_viewed_at:       video?.last_viewed_at,
      auto_call_triggered:  video?.auto_call_triggered,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
