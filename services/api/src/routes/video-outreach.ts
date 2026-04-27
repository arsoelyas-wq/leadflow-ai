export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HEYGEN_KEY = process.env.HEYGEN_API_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const HEYGEN_BASE = 'https://api.heygen.com';
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

function heygenHeaders() { return { 'X-Api-Key': HEYGEN_KEY, 'Content-Type': 'application/json' }; }
function elevenHeaders() { return { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' }; }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Claude ile kisisel script yaz
async function generateScript(lead: any, profile: any, language: string): Promise<string> {
  const langNames: Record<string, string> = {
    tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', ar: 'Arapça', fr: 'Fransızca',
    ru: 'Rusça', es: 'İspanyolca', it: 'İtalyanca', nl: 'Hollandaca',
  };
  try {
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
  } catch { return `Merhaba ${lead.contact_name || lead.company_name}! ${profile?.company?.name || 'Şirketimiz'} adına sizinle iletişime geçmek istedik. Size özel bir teklifimiz var, görüşmek ister misiniz?`; }
}

// ElevenLabs ile ses üret - base64 döndür
async function generateAudio(text: string, voiceId: string): Promise<string> {
  const r = await axios.post(
    `${ELEVEN_BASE}/text-to-speech/${voiceId}`,
    { text, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: 0.75, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true } },
    { headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer', timeout: 30000 }
  );
  return Buffer.from(r.data).toString('base64');
}

// HeyGen video oluştur - ElevenLabs sesiyle
async function generateHeygenVideo(params: {
  avatarId: string;
  audioBase64: string;
  aspectRatio: string;
}): Promise<string> {
  const { avatarId, audioBase64, aspectRatio } = params;

  const dimensions: Record<string, { width: number; height: number }> = {
    '9:16': { width: 720, height: 1280 },
    '16:9': { width: 1280, height: 720 },
    '1:1': { width: 720, height: 720 },
  };
  const dim = dimensions[aspectRatio] || dimensions['9:16'];

  const r = await axios.post(
    `${HEYGEN_BASE}/v2/video/generate`,
    {
      video_inputs: [{
        character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
        voice: { type: 'audio', audio_base64: audioBase64, audio_encoding: 'mp3' },
      }],
      dimension: dim,
      test: false,
    },
    { headers: heygenHeaders(), timeout: 30000 }
  );

  const videoId = r.data?.data?.video_id;
  if (!videoId) throw new Error('HeyGen video ID alinamadi: ' + JSON.stringify(r.data));
  return videoId;
}

// Video durumunu kontrol et
async function checkVideoStatus(videoId: string): Promise<{ status: string; url?: string; thumbnail?: string }> {
  const r = await axios.get(
    `${HEYGEN_BASE}/v1/video_status.get?video_id=${videoId}`,
    { headers: heygenHeaders(), timeout: 10000 }
  );
  const d = r.data?.data;
  return { status: d?.status || 'processing', url: d?.video_url, thumbnail: d?.thumbnail_url };
}

// GET /api/video-outreach/avatars - Tum HeyGen avatarları
router.get('/avatars', async (req: any, res: any) => {
  try {
    const { search = '', gender = '', page = 1 } = req.query;
    const r = await axios.get(`${HEYGEN_BASE}/v2/avatars`, { headers: heygenHeaders(), timeout: 15000 });
    let avatars = r.data?.data?.avatars || [];

    // Filtrele
    if (search) avatars = avatars.filter((a: any) => a.avatar_name?.toLowerCase().includes((search as string).toLowerCase()));
    if (gender) avatars = avatars.filter((a: any) => a.gender?.toLowerCase() === gender);

    // Sayfalama
    const pageSize = 30;
    const pageNum = Number(page);
    const total = avatars.length;
    const paged = avatars.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({
      avatars: paged.map((a: any) => ({
        avatar_id: a.avatar_id,
        name: a.avatar_name,
        gender: a.gender,
        preview_image: a.preview_image_url || a.preview_video_url,
        preview_video: a.preview_video_url,
        tags: a.tags || [],
      })),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/eleven-voices - ElevenLabs sesler dil bazli
router.get('/eleven-voices', async (req: any, res: any) => {
  try {
    const { language = 'tr' } = req.query;
    const norm = (v: any) => ({
      voice_id: v.voice_id, name: v.name,
      preview_url: v.preview_url || null,
      gender: v.labels?.gender || v.gender || null,
      accent: v.labels?.accent || v.accent || null,
    });
    const [r1, r2] = await Promise.allSettled([
      axios.get(`${ELEVEN_BASE}/voices`, { headers: elevenHeaders() }),
      axios.get(`${ELEVEN_BASE}/shared-voices?page_size=100&language=${language}`, { headers: elevenHeaders() }),
    ]);
    const myV = r1.status === 'fulfilled' ? r1.value.data.voices.map(norm) : [];
    const langV = r2.status === 'fulfilled' ? r2.value.data.voices.map(norm) : [];
    res.json({ my: myV, language: langV, total: langV.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/generate/single - Tek video uret
router.post('/generate/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, avatarId, voiceId, aspectRatio = '9:16', language = 'tr', autoSend = false } = req.body;
    if (!leadId || !avatarId || !voiceId) return res.status(400).json({ error: 'leadId, avatarId, voiceId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadi' });

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();

    // DB kaydı oluştur
    const { data: videoRecord } = await supabase.from('video_outreach').insert([{
      user_id: userId, lead_id: leadId,
      avatar_id: avatarId, voice_id: voiceId,
      aspect_ratio: aspectRatio, language,
      auto_send: autoSend, status: 'generating',
    }]).select().single();

    res.json({ ok: true, videoId: videoRecord?.id, message: 'Video olusturuluyor...' });

    // Arka planda pipeline
    (async () => {
      try {
        // 1. Script yaz
        const script = await generateScript(lead, profile, language);
        await supabase.from('video_outreach').update({ script }).eq('id', videoRecord?.id);

        // 2. ElevenLabs ile ses üret
        const audioBase64 = await generateAudio(script, voiceId);

        // 3. HeyGen video oluştur
        const heygenVideoId = await generateHeygenVideo({ avatarId, audioBase64, aspectRatio });
        await supabase.from('video_outreach').update({ heygen_video_id: heygenVideoId, status: 'processing' }).eq('id', videoRecord?.id);

        console.log(`Video olusturuldu: ${heygenVideoId} (lead: ${lead.company_name})`);
      } catch (err: any) {
        console.error('Video hatasi:', err.message);
        await supabase.from('video_outreach').update({ status: 'failed', error_message: err.message }).eq('id', videoRecord?.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/generate/campaign - Toplu video
router.post('/generate/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, avatarId, voiceId, aspectRatio = '9:16', language, autoSend = false, campaignName } = req.body;
    if (!leadIds?.length || !avatarId || !voiceId) return res.status(400).json({ error: 'Parametreler eksik' });

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();

    // Kampanya kaydı
    const { data: campaign } = await supabase.from('video_campaigns').insert([{
      user_id: userId, name: campaignName || `Video Kampanyasi ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length, status: 'running', avatar_id: avatarId, voice_id: voiceId,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} video olusturuluyor` });

    // Arka planda
    (async () => {
      let done = 0;
      for (const leadId of leadIds) {
        try {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead) { done++; continue; }

          const callLanguage = language || getLanguageByCountry(lead.country_code || '') || 'tr';
          const script = await generateScript(lead, profile, callLanguage);
          const audioBase64 = await generateAudio(script, voiceId);
          const heygenVideoId = await generateHeygenVideo({ avatarId, audioBase64, aspectRatio });

          await supabase.from('video_outreach').insert([{
            user_id: userId, lead_id: leadId, campaign_id: campaign?.id,
            avatar_id: avatarId, voice_id: voiceId,
            heygen_video_id: heygenVideoId, script,
            aspect_ratio: aspectRatio, language: callLanguage,
            auto_send: autoSend, status: 'processing',
          }]);

          await supabase.from('video_campaigns').update({ videos_created: done + 1 }).eq('id', campaign?.id);
          done++;
          await sleep(2000); // Rate limit
        } catch (err: any) { console.error(`Lead ${leadId} video hatasi:`, err.message); done++; }
      }
      await supabase.from('video_campaigns').update({ status: 'completed' }).eq('id', campaign?.id);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/videos - Video listesi
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
    const { data } = await supabase.from('video_outreach').select('status, sent_via, language').eq('user_id', req.userId);
    const videos = data || [];
    res.json({
      total: videos.length,
      completed: videos.filter((v: any) => v.status === 'completed').length,
      processing: videos.filter((v: any) => v.status === 'processing').length,
      sent: videos.filter((v: any) => v.sent_at).length,
      failed: videos.filter((v: any) => v.status === 'failed').length,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/send - Videoyu WhatsApp ile gonder
router.post('/send', async (req: any, res: any) => {
  try {
    const { videoId } = req.body;
    const { data: video } = await supabase.from('video_outreach')
      .select('*, leads(phone, contact_name, company_name)').eq('id', videoId).eq('user_id', req.userId).single();
    if (!video) return res.status(404).json({ error: 'Video bulunamadi' });
    if (video.status !== 'completed' || !video.video_url) return res.status(400).json({ error: 'Video hazir degil' });

    const lead = video.leads;
    if (!lead?.phone) return res.status(400).json({ error: 'Lead telefon numarasi yok' });

    const firstName = (lead.contact_name || lead.company_name || '').split(' ')[0];
    const message = `Merhaba ${firstName}! Size ozel hazirladigimiz videoyu izleyin:\n\n${video.video_url}`;

    const { sendWhatsAppMessage } = require('./settings');
    await sendWhatsAppMessage(req.userId, lead.phone, message);

    await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', videoId);
    res.json({ ok: true, message: 'Video gonderildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Yardimci
function getLanguageByCountry(countryCode: string): string {
  const map: Record<string, string> = {
    TR: 'tr', DE: 'de', GB: 'en', US: 'en', FR: 'fr',
    AE: 'ar', SA: 'ar', RU: 'ru', IT: 'it', ES: 'es', NL: 'nl',
  };
  return map[countryCode?.toUpperCase()] || 'en';
}

// Her 5 dakikada processing videoları kontrol et
setInterval(async () => {
  try {
    const { data: processing } = await supabase.from('video_outreach')
      .select('id, heygen_video_id, auto_send, lead_id, user_id').eq('status', 'processing').limit(10);

    for (const v of processing || []) {
      try {
        const result = await checkVideoStatus(v.heygen_video_id);
        if (result.status === 'completed' && result.url) {
          await supabase.from('video_outreach').update({
            status: 'completed', video_url: result.url, thumbnail_url: result.thumbnail,
          }).eq('id', v.id);

          if (v.auto_send) {
            const { data: lead } = await supabase.from('leads').select('phone, contact_name, company_name').eq('id', v.lead_id).single();
            if (lead?.phone) {
              const firstName = (lead.contact_name || lead.company_name || '').split(' ')[0];
              const { sendWhatsAppMessage } = require('./settings');
              await sendWhatsAppMessage(v.user_id, lead.phone,
                `Merhaba ${firstName}! Size ozel hazirladigimiz videoyu izleyin:\n\n${result.url}`
              ).catch(() => {});
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