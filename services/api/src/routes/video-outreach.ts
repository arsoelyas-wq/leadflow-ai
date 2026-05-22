export {};
const express   = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios     = require('axios');
const crypto    = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

const router    = express.Router();
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HEYGEN_KEY  = process.env.HEYGEN_API_KEY;
const ELEVEN_KEY  = process.env.ELEVENLABS_API_KEY;
const HEYGEN_BASE = 'https://api.heygen.com';
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';
const API_BASE    = process.env.API_URL || 'https://leadflow-ai-production.up.railway.app';

const MAX_CAMPAIGN_LEADS = 20;

function heygenHeaders() { return { 'X-Api-Key': HEYGEN_KEY, 'Content-Type': 'application/json' }; }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function makeTrackingCode() { return crypto.randomBytes(10).toString('hex'); }
function trackingUrl(code: string) { return `${API_BASE}/v/${code}`; }

// ─── AI HELPERS ──────────────────────────────────────────────────────────────

async function generateScript(lead: any, profile: any, language: string): Promise<string> {
  const langNames: Record<string, string> = {
    tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', ar: 'Arapça', fr: 'Fransızca',
    ru: 'Rusça', es: 'İspanyolca', it: 'İtalyanca', nl: 'Hollandaca',
  };
  try {
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `${profile?.company?.name || 'Şirket'} adına ${lead.company_name} firmasına ${langNames[language] || 'Türkçe'} dilinde kişisel satış videosu için script yaz.
Ürün: ${profile?.product?.description || ''}
Muhatap: ${lead.contact_name || lead.company_name}
Sektör: ${lead.sector || ''}
Ülke: ${lead.country || ''}

KURALLAR:
- Max 30 saniye (60-80 kelime)
- Doğal, samimi, insan gibi konuş
- İsmi kullan: ${lead.contact_name || lead.company_name}
- Değer öner, randevu veya numune teklif et
- Yapay zeka olduğunu ASLA söyleme
- ${langNames[language] || 'Türkçe'} dilinde yaz

Sadece konuşma metnini yaz, başka bir şey yazma.`
      }]
    });
    return r.content[0]?.text || '';
  } catch {
    return `Merhaba ${lead.contact_name || lead.company_name}! ${profile?.company?.name || 'Şirketimiz'} adına sizinle iletişime geçmek istedik. Size özel bir teklifimiz var, görüşmek ister misiniz?`;
  }
}

// Claude Haiku — hızlı, ucuz, WhatsApp intro mesajı
async function generateWhatsAppIntro(lead: any, profile: any): Promise<string> {
  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `Kısa WhatsApp mesajı yaz. Alıcı: ${lead.contact_name || lead.company_name}. Şirket: ${profile?.company?.name || 'bizim şirket'}. Ürün: ${profile?.product?.description || 'hizmetlerimiz'}. Amaç: kişiye özel hazırladığımız videoyu izlemesini istemek. Samimi, 1-2 cümle. Emoji veya link yok. Sadece mesaj metni.`
      }]
    });
    return (r.content[0]?.text || '').trim();
  } catch {
    const firstName = (lead.contact_name || lead.company_name || '').split(' ')[0];
    return `Merhaba ${firstName}! Sizin için özel bir video hazırladık, izlemenizi isteriz.`;
  }
}

// ─── HEYGEN / ELEVENLABS PIPELINE ────────────────────────────────────────────

async function generateAudio(text: string, voiceId: string): Promise<Buffer> {
  const r = await axios.post(
    `${ELEVEN_BASE}/text-to-speech/${voiceId}`,
    { text, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: 0.75, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true } },
    { headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer', timeout: 30000 }
  );
  return Buffer.from(r.data);
}

async function uploadAudioToHeygen(audioBuffer: Buffer): Promise<string> {
  const r = await axios.post(
    'https://upload.heygen.com/v1/asset',
    audioBuffer,
    { headers: { 'X-Api-Key': HEYGEN_KEY, 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length }, timeout: 30000, maxBodyLength: Infinity }
  );
  const assetId = r.data?.data?.id;
  if (!assetId) throw new Error('HeyGen asset ID alınamadı: ' + JSON.stringify(r.data));
  return assetId;
}

async function generateHeygenVideo(params: { avatarId: string; audioBuffer: Buffer; aspectRatio: string }): Promise<string> {
  const { avatarId, audioBuffer, aspectRatio } = params;
  const audioAssetId = await uploadAudioToHeygen(audioBuffer);
  const dimensions: Record<string, { width: number; height: number }> = {
    '9:16': { width: 720, height: 1280 },
    '16:9': { width: 1280, height: 720 },
    '1:1':  { width: 720, height: 720 },
  };
  const dim = dimensions[aspectRatio] || dimensions['9:16'];
  const r = await axios.post(
    `${HEYGEN_BASE}/v2/video/generate`,
    { video_inputs: [{ character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' }, voice: { type: 'audio', audio_asset_id: audioAssetId } }], dimension: dim },
    { headers: heygenHeaders(), timeout: 30000 }
  );
  const videoId = r.data?.data?.video_id;
  if (!videoId) throw new Error('HeyGen video ID alınamadı: ' + JSON.stringify(r.data));
  return videoId;
}

async function checkVideoStatus(heygenVideoId: string): Promise<{ status: string; url?: string; thumbnail?: string }> {
  const r = await axios.get(
    `${HEYGEN_BASE}/v1/video_status.get?video_id=${heygenVideoId}`,
    { headers: heygenHeaders(), timeout: 10000 }
  );
  const d = r.data?.data;
  return { status: d?.status || 'processing', url: d?.video_url, thumbnail: d?.thumbnail_url };
}

async function sendWhatsApp(userId: string, phone: string, message: string) {
  const { sendWhatsAppMessage } = require('./settings');
  await sendWhatsAppMessage(userId, phone, message);
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// GET /api/video-outreach/avatars
router.get('/avatars', async (req: any, res: any) => {
  try {
    const { search = '', gender = '', page = 1 } = req.query;
    const r = await axios.get(`${HEYGEN_BASE}/v2/avatars`, { headers: heygenHeaders(), timeout: 15000 });
    let avatars = r.data?.data?.avatars || [];
    if (search) avatars = avatars.filter((a: any) => a.avatar_name?.toLowerCase().includes((search as string).toLowerCase()));
    if (gender) avatars = avatars.filter((a: any) => a.gender?.toLowerCase() === gender);
    const pageSize = 30;
    const pageNum  = Number(page);
    const total    = avatars.length;
    res.json({
      avatars: avatars.slice((pageNum - 1) * pageSize, pageNum * pageSize).map((a: any) => ({
        avatar_id: a.avatar_id, name: a.avatar_name, gender: a.gender,
        preview_image: a.preview_image_url || a.preview_video_url,
        preview_video: a.preview_video_url, tags: a.tags || [],
      })),
      total, page: pageNum, pages: Math.ceil(total / pageSize),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/eleven-voices
router.get('/eleven-voices', async (req: any, res: any) => {
  try {
    const { language = 'tr' } = req.query;
    const norm = (v: any) => ({ voice_id: v.voice_id, name: v.name, preview_url: v.preview_url || null, gender: v.labels?.gender || v.gender || null, accent: v.labels?.accent || v.accent || null });
    const [r1, r2] = await Promise.allSettled([
      axios.get(`${ELEVEN_BASE}/voices`, { headers: { 'xi-api-key': ELEVEN_KEY } }),
      axios.get(`${ELEVEN_BASE}/shared-voices?page_size=100&language=${language}`, { headers: { 'xi-api-key': ELEVEN_KEY } }),
    ]);
    const myV   = r1.status === 'fulfilled' ? r1.value.data.voices.map(norm) : [];
    const langV = r2.status === 'fulfilled' ? r2.value.data.voices.map(norm) : [];
    res.json({ my: myV, language: langV, total: langV.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/check-duplicates?leadIds=id1,id2
router.get('/check-duplicates', async (req: any, res: any) => {
  try {
    const leadIds = (req.query.leadIds as string || '').split(',').filter(Boolean);
    if (!leadIds.length) return res.json({ existing: [] });
    const { data } = await supabase
      .from('video_outreach')
      .select('lead_id, status, created_at')
      .eq('user_id', req.userId)
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false });
    // Keep latest per lead
    const seen = new Set<string>();
    const existing = (data || []).filter((v: any) => { if (seen.has(v.lead_id)) return false; seen.add(v.lead_id); return true; });
    res.json({ existing });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/status/:id — tek video durumu
router.get('/status/:id', async (req: any, res: any) => {
  try {
    const { data: video } = await supabase
      .from('video_outreach')
      .select('id, status, video_url, thumbnail_url, heygen_video_id, view_count, first_viewed_at, error_message, leads(company_name)')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });

    // Eğer hâlâ processing ise HeyGen'den canlı kontrol et
    if (video.status === 'processing' && video.heygen_video_id) {
      try {
        const result = await checkVideoStatus(video.heygen_video_id);
        if (result.status === 'completed' && result.url) {
          await supabase.from('video_outreach').update({ status: 'completed', video_url: result.url, thumbnail_url: result.thumbnail }).eq('id', video.id);
          return res.json({ ...video, status: 'completed', video_url: result.url, thumbnail_url: result.thumbnail });
        } else if (result.status === 'failed') {
          await supabase.from('video_outreach').update({ status: 'failed' }).eq('id', video.id);
          return res.json({ ...video, status: 'failed' });
        }
      } catch {}
    }
    res.json(video);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/campaign/:id — kampanya ilerleme
router.get('/campaign/:id', async (req: any, res: any) => {
  try {
    const { data: campaign } = await supabase
      .from('video_campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    const { data: videos } = await supabase
      .from('video_outreach')
      .select('id, status, video_url, thumbnail_url, leads(company_name), view_count')
      .eq('campaign_id', req.params.id)
      .eq('user_id', req.userId);

    const vids = videos || [];
    res.json({
      campaign,
      videos: vids,
      progress: {
        total:      campaign.total_leads,
        created:    vids.length,
        completed:  vids.filter((v: any) => v.status === 'completed').length,
        processing: vids.filter((v: any) => v.status === 'processing').length,
        failed:     vids.filter((v: any) => v.status === 'failed').length,
        percent:    campaign.total_leads > 0 ? Math.round((vids.filter((v: any) => v.status === 'completed').length / campaign.total_leads) * 100) : 0,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/generate/single
router.post('/generate/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, avatarId, voiceId, aspectRatio = '9:16', language = 'tr', autoSend = false, customScript = null } = req.body;
    if (!leadId || !avatarId || !voiceId) return res.status(400).json({ error: 'leadId, avatarId, voiceId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const code = makeTrackingCode();

    const { data: videoRecord } = await supabase.from('video_outreach').insert([{
      user_id: userId, lead_id: leadId,
      avatar_id: avatarId, voice_id: voiceId,
      aspect_ratio: aspectRatio, language,
      auto_send: autoSend, status: 'generating',
      tracking_code: code,
    }]).select().single();

    res.json({ ok: true, videoId: videoRecord?.id, message: 'Video oluşturuluyor...' });

    // Arka plan pipeline
    (async () => {
      try {
        const script = customScript || await generateScript(lead, profile, language);
        await supabase.from('video_outreach').update({ script }).eq('id', videoRecord?.id);

        const audioBuffer  = await generateAudio(script, voiceId);
        const heygenVideoId = await generateHeygenVideo({ avatarId, audioBuffer, aspectRatio });
        await supabase.from('video_outreach').update({ heygen_video_id: heygenVideoId, status: 'processing' }).eq('id', videoRecord?.id);
        console.log(`[Video] HeyGen ID: ${heygenVideoId} (${lead.company_name})`);
      } catch (err: any) {
        console.error('[Video] Hata:', err.message);
        await supabase.from('video_outreach').update({ status: 'failed', error_message: err.message }).eq('id', videoRecord?.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/generate/campaign
router.post('/generate/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    let { leadIds, avatarId, voiceId, aspectRatio = '9:16', language, autoSend = false, campaignName } = req.body;
    if (!leadIds?.length || !avatarId || !voiceId) return res.status(400).json({ error: 'Parametreler eksik' });

    // Maksimum 20 lead
    if (leadIds.length > MAX_CAMPAIGN_LEADS) {
      leadIds = leadIds.slice(0, MAX_CAMPAIGN_LEADS);
    }

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const { data: campaign } = await supabase.from('video_campaigns').insert([{
      user_id: userId,
      name: campaignName || `Video Kampanyası ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length, status: 'running',
      avatar_id: avatarId, voice_id: voiceId,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} video oluşturuluyor` });

    (async () => {
      let created = 0;
      for (const leadId of leadIds) {
        try {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead) { created++; continue; }

          const callLang = language || getLanguageByCountry(lead.country_code || '') || 'tr';
          const script   = await generateScript(lead, profile, callLang);
          const audio    = await generateAudio(script, voiceId);
          const heygenId = await generateHeygenVideo({ avatarId, audioBuffer: audio, aspectRatio });
          const code     = makeTrackingCode();

          await supabase.from('video_outreach').insert([{
            user_id: userId, lead_id: leadId, campaign_id: campaign?.id,
            avatar_id: avatarId, voice_id: voiceId,
            heygen_video_id: heygenId, script,
            aspect_ratio: aspectRatio, language: callLang,
            auto_send: autoSend, status: 'processing',
            tracking_code: code,
          }]);

          created++;
          await supabase.from('video_campaigns').update({ videos_created: created }).eq('id', campaign?.id);
          await sleep(2000);
        } catch (err: any) { console.error(`[Campaign] Lead ${leadId}:`, err.message); created++; }
      }
      await supabase.from('video_campaigns').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', campaign?.id);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/retry/:id — başarısız videoyu yeniden dene
router.post('/retry/:id', async (req: any, res: any) => {
  try {
    const { data: video } = await supabase.from('video_outreach').select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    if (video.status !== 'failed') return res.status(400).json({ error: 'Sadece başarısız videolar yeniden denenebilir' });

    const { data: lead }    = await supabase.from('leads').select('*').eq('id', video.lead_id).single();
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();

    await supabase.from('video_outreach').update({ status: 'generating', error_message: null }).eq('id', video.id);
    res.json({ ok: true, message: 'Video yeniden oluşturuluyor' });

    (async () => {
      try {
        const script = video.script || await generateScript(lead, profile, video.language || 'tr');
        if (!video.script) await supabase.from('video_outreach').update({ script }).eq('id', video.id);
        const audio  = await generateAudio(script, video.voice_id);
        const heygenId = await generateHeygenVideo({ avatarId: video.avatar_id, audioBuffer: audio, aspectRatio: video.aspect_ratio });
        await supabase.from('video_outreach').update({ heygen_video_id: heygenId, status: 'processing' }).eq('id', video.id);
      } catch (err: any) {
        await supabase.from('video_outreach').update({ status: 'failed', error_message: err.message }).eq('id', video.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/send — Tracking URL'li kişisel WhatsApp mesajıyla gönder
router.post('/send', async (req: any, res: any) => {
  try {
    const { videoId } = req.body;
    const { data: video } = await supabase.from('video_outreach')
      .select('*, leads(phone, contact_name, company_name)').eq('id', videoId).eq('user_id', req.userId).single();
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    if (video.status !== 'completed' || !video.video_url) return res.status(400).json({ error: 'Video henüz hazır değil' });

    const lead = video.leads;
    if (!lead?.phone) return res.status(400).json({ error: 'Lead telefon numarası yok' });

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();
    const intro   = await generateWhatsAppIntro(lead, profile);
    const tUrl    = video.tracking_code ? trackingUrl(video.tracking_code) : video.video_url;
    const message = `${intro}\n\n${tUrl}`;

    await sendWhatsApp(req.userId, lead.phone, message);
    await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', videoId);
    res.json({ ok: true, message: 'Video gönderildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/videos
router.get('/videos', async (req: any, res: any) => {
  try {
    const { limit = 20, campaignId } = req.query;
    let query = supabase.from('video_outreach')
      .select('*, leads(company_name, contact_name, phone, country)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));
    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data } = await query;
    res.json({ videos: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('video_outreach').select('status, sent_at, view_count, language').eq('user_id', req.userId);
    const videos = data || [];
    res.json({
      total:      videos.length,
      completed:  videos.filter((v: any) => v.status === 'completed').length,
      processing: videos.filter((v: any) => ['processing','generating'].includes(v.status)).length,
      sent:       videos.filter((v: any) => v.sent_at).length,
      failed:     videos.filter((v: any) => v.status === 'failed').length,
      viewed:     videos.filter((v: any) => (v.view_count || 0) > 0).length,
      total_views: videos.reduce((s: number, v: any) => s + (v.view_count || 0), 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/preview-script
router.post('/preview-script', async (req: any, res: any) => {
  try {
    const { leadId, language } = req.body;
    const { data: lead }    = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();
    const script = await generateScript(lead, profile, language || 'tr');
    res.json({ ok: true, script, leadId, leadName: lead.company_name });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/heygen-webhook — HeyGen'den video hazır bildirimi
router.post('/heygen-webhook', async (req: any, res: any) => {
  try {
    res.sendStatus(200); // HeyGen'e hemen OK
    const { event, event_data } = req.body;
    if (!event_data?.video_id) return;

    const heygenVideoId = event_data.video_id;
    const { data: video } = await supabase.from('video_outreach')
      .select('id, user_id, lead_id, auto_send, tracking_code')
      .eq('heygen_video_id', heygenVideoId)
      .single();
    if (!video) return;

    if (event === 'video_status.success') {
      await supabase.from('video_outreach').update({
        status: 'completed',
        video_url: event_data.video_url,
        thumbnail_url: event_data.thumbnail_url,
      }).eq('id', video.id);

      if (video.auto_send) {
        const { data: lead }    = await supabase.from('leads').select('phone, contact_name, company_name').eq('id', video.lead_id).single();
        const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', video.user_id).single();
        if (lead?.phone) {
          const intro   = await generateWhatsAppIntro(lead, profile);
          const tUrl    = video.tracking_code ? trackingUrl(video.tracking_code) : event_data.video_url;
          const message = `${intro}\n\n${tUrl}`;
          await sendWhatsApp(video.user_id, lead.phone, message).catch(() => {});
          await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', video.id);
        }
      }
    } else if (event === 'video_status.fail') {
      await supabase.from('video_outreach').update({ status: 'failed', error_message: event_data.error || 'HeyGen hatası' }).eq('id', video.id);
    }
  } catch (e: any) { console.error('[HeyGen Webhook]', e.message); }
});

// ─── YARDIMCI ────────────────────────────────────────────────────────────────

function getLanguageByCountry(countryCode: string): string {
  const map: Record<string, string> = {
    TR: 'tr', DE: 'de', GB: 'en', US: 'en', FR: 'fr',
    AE: 'ar', SA: 'ar', RU: 'ru', IT: 'it', ES: 'es', NL: 'nl',
  };
  return map[countryCode?.toUpperCase()] || 'en';
}

// ─── 5 DAKİKA POLLING — HeyGen webhook yedek olarak ──────────────────────────
setInterval(async () => {
  try {
    const { data: processing } = await supabase.from('video_outreach')
      .select('id, heygen_video_id, auto_send, lead_id, user_id, tracking_code')
      .eq('status', 'processing').limit(10);

    for (const v of processing || []) {
      try {
        const result = await checkVideoStatus(v.heygen_video_id);
        if (result.status === 'completed' && result.url) {
          await supabase.from('video_outreach').update({
            status: 'completed', video_url: result.url, thumbnail_url: result.thumbnail,
          }).eq('id', v.id);

          if (v.auto_send) {
            const { data: lead }    = await supabase.from('leads').select('phone, contact_name, company_name').eq('id', v.lead_id).single();
            const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', v.user_id).single();
            if (lead?.phone) {
              const intro   = await generateWhatsAppIntro(lead, profile);
              const tUrl    = v.tracking_code ? trackingUrl(v.tracking_code) : result.url;
              const message = `${intro}\n\n${tUrl}`;
              await sendWhatsApp(v.user_id, lead.phone, message).catch(() => {});
              await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', v.id);
            }
          }
        } else if (result.status === 'failed') {
          await supabase.from('video_outreach').update({ status: 'failed' }).eq('id', v.id);
        }
        await sleep(500);
      } catch {}
    }
  } catch {}
}, 5 * 60 * 1000);

module.exports = router;
