export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_BASE = 'https://api.heygen.com';

function heygenHeaders() {
  return {
    'X-Api-Key': HEYGEN_API_KEY,
    'Content-Type': 'application/json',
  };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── ŞİRKET LOGOsu / SCREENSHOT ───────────────────────────
async function fetchCompanyBackground(website: string, companyName: string): Promise<string | null> {
  try {
    if (!website) return null;
    const url = website.startsWith('http') ? website : `https://${website}`;

    // Logo çek
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 8000,
    });
    const $ = cheerio.load(response.data);

    // Logo URL'si bul
    const logoSelectors = [
      'img[class*="logo"]',
      'img[alt*="logo"]',
      'img[alt*="Logo"]',
      '.logo img',
      '#logo img',
      'header img',
    ];

    for (const selector of logoSelectors) {
      const img = $(selector).first();
      if (img.length) {
        const src = img.attr('src') || '';
        if (src) {
          const logoUrl = src.startsWith('http') ? src : `${url}${src.startsWith('/') ? '' : '/'}${src}`;
          return logoUrl;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── KİŞİSELLEŞTİRİLMİŞ SCRIPT ────────────────────────────
async function generatePersonalizedScript(lead: any, userSettings: any): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const contactName = lead.contact_name || lead.company_name;
    const firstName = contactName.split(' ')[0];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: `Profesyonel B2B satış video scripti yaz. MAX 40 saniye (80-90 kelime). Türkçe. Samimi ve kişisel.

Gönderen şirket: ${userSettings?.company_name || 'Şirketimiz'}
Hedef kişi: ${firstName}
Hedef şirket: ${lead.company_name}
Hedef şehir: ${lead.city || ''}
Sektör: ${lead.sector || ''}

Script formatı:
- Selamlama: "Merhaba ${firstName} Bey/Hanım" 
- Kişiselleştirme: ${lead.company_name} hakkında 1 cümle
- Değer önerisi: Ürün/hizmet 1-2 cümle
- CTA: Kısa görüşme teklifi

Sadece scripti yaz, başka açıklama yok.`
      }],
    });

    return response.content[0]?.text || '';
  } catch (e: any) {
    console.error('Script gen error:', e.message);
    const firstName = (lead.contact_name || lead.company_name).split(' ')[0];
    return `Merhaba ${firstName} Bey, ${lead.company_name} olarak yaptığınız çalışmaları yakından takip ediyorum. Size özel hazırladığımız koleksiyonumuzu tanıtmak için kısa bir görüşme yapabilir miyiz?`;
  }
}

// ── HEYGEN VİDEO OLUŞTUR ─────────────────────────────────
async function createHeyGenVideo(
  script: string,
  avatarId: string,
  voiceId: string,
  backgroundUrl: string | null,
  aspectRatio: string
): Promise<string> {
  const background = backgroundUrl
    ? { type: 'image', url: backgroundUrl }
    : { type: 'color', value: '#0f172a' };

  const payload = {
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: avatarId,
        avatar_style: 'normal',
      },
      voice: {
        type: 'text',
        voice_id: voiceId,
        input_text: script,
        speed: 1.0,
        pitch: 0,
      },
      background,
    }],
    aspect_ratio: aspectRatio,
    test: false,
    caption: false,
  };

  const response = await axios.post(
    `${HEYGEN_BASE}/v2/video/generate`,
    payload,
    { headers: heygenHeaders(), timeout: 30000 }
  );

  const videoId = response.data?.data?.video_id;
  if (!videoId) throw new Error('HeyGen video ID alınamadı');
  return videoId;
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/video-outreach/avatars
router.get('/avatars', async (req: any, res: any) => {
  try {
    const response = await axios.get(`${HEYGEN_BASE}/v2/avatars`, {
      headers: heygenHeaders(), timeout: 10000
    });
    res.json({ avatars: response.data?.data?.avatars || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// GET /api/video-outreach/voices
router.get('/voices', async (req: any, res: any) => {
  try {
    const response = await axios.get(`${HEYGEN_BASE}/v2/voices`, {
      headers: heygenHeaders(), timeout: 10000
    });
    const voices = response.data?.data?.voices || [];
    const turkish = voices.filter((v: any) =>
      v.language?.toLowerCase().includes('turkish') ||
      v.language?.toLowerCase().includes('tr') ||
      v.locale?.toLowerCase().includes('tr')
    );
    const others = voices.filter((v: any) =>
      !v.language?.toLowerCase().includes('turkish') &&
      !v.language?.toLowerCase().includes('tr')
    );
    res.json({ voices: [...turkish, ...others] });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// GET /api/video-outreach/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const [{ count: total }, { count: processing }, { count: completed }, { count: sent }] = await Promise.all([
      supabase.from('video_outreach').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('video_outreach').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'processing'),
      supabase.from('video_outreach').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
      supabase.from('video_outreach').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('sent_at', 'is', null),
    ]);
    res.json({ total: total || 0, processing: processing || 0, completed: completed || 0, sent: sent || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/video-outreach/list
router.get('/list', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('video_outreach')
      .select('*, leads(company_name, contact_name, phone, email, website, city)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ videos: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/video-outreach/create — Tek video
router.post('/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, avatarId, voiceId, script, customPrompt, aspectRatio = '16:9' } = req.body;

    if (!leadId || !avatarId || !voiceId) {
      return res.status(400).json({ error: 'leadId, avatarId, voiceId zorunlu' });
    }

    const [{ data: lead }, { data: settings }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    ]);

    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Kişisel avatar/voice varsa kullan
    const finalAvatarId = avatarId || settings?.heygen_avatar_id;
    const finalVoiceId = voiceId || settings?.heygen_voice_id;
    if (!finalAvatarId || !finalVoiceId) {
      return res.status(400).json({ error: 'Avatar veya ses bulunamadı. Ayarlar > Kanallar > AI Video Avatar bölümünden yükleyin.' });
    }

    // Script üret
    const finalScript = script || await generatePersonalizedScript(lead, settings);

    // Şirket backgroundu çek
    const bgUrl = await fetchCompanyBackground(lead.website || '', lead.company_name);

    // HeyGen video oluştur
    const videoId = await createHeyGenVideo(finalScript, finalAvatarId, finalVoiceId, bgUrl, aspectRatio);

    // Kaydet
    const { data: record } = await supabase.from('video_outreach').insert([{
      user_id: userId,
      lead_id: leadId,
      heygen_video_id: videoId,
      script: finalScript,
      avatar_id: finalAvatarId,
      voice_id: finalVoiceId,
      status: 'processing',
      aspect_ratio: aspectRatio,
      background_url: bgUrl,
    }]).select().single();

    res.json({
      videoId,
      recordId: record?.id,
      script: finalScript,
      backgroundUsed: !!bgUrl,
      status: 'processing',
      message: 'Video oluşturuluyor (~2-3 dakika)',
    });
  } catch (e: any) {
    console.error('Video create error:', e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// POST /api/video-outreach/batch — TOPLU video (tüm leadler için)
router.post('/batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const {
      leadIds, // boşsa tüm leadler
      avatarId,
      voiceId,
      aspectRatio = '16:9',
      customPrompt,
      autoSend = false, // tamamlanınca otomatik WA gönder
      maxLeads = 50,
    } = req.body;

    if (!avatarId || !voiceId) {
      return res.status(400).json({ error: 'avatarId, voiceId zorunlu' });
    }

    // Leadleri getir
    let query = supabase.from('leads').select('*').eq('user_id', userId).limit(maxLeads);
    if (leadIds?.length) {
      query = query.in('id', leadIds);
    } else {
      // Video oluşturulmamış leadler
      const { data: existingVideos } = await supabase
        .from('video_outreach')
        .select('lead_id')
        .eq('user_id', userId);
      const existingLeadIds = (existingVideos || []).map((v: any) => v.lead_id);
      if (existingLeadIds.length) {
        query = query.not('id', 'in', `(${existingLeadIds.join(',')})`);
      }
    }

    const { data: leads } = await query;
    if (!leads?.length) return res.json({ message: 'İşlenecek lead yok', created: 0 });

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();

    // Arka planda işle
    res.json({
      message: `${leads.length} lead için video oluşturma başladı!`,
      total: leads.length,
      estimatedMinutes: Math.ceil(leads.length * 3),
    });

    // Asenkron olarak işle
    (async () => {
      let created = 0;

      for (const lead of leads) {
        try {
          // Script üret
          const script = await generatePersonalizedScript(lead, settings);

          // Şirket backgroundu
          const bgUrl = await fetchCompanyBackground(lead.website || '', lead.company_name);

          // HeyGen video oluştur
          const videoId = await createHeyGenVideo(script, avatarId, voiceId, bgUrl, aspectRatio);

          // Kaydet
          await supabase.from('video_outreach').insert([{
            user_id: userId,
            lead_id: lead.id,
            heygen_video_id: videoId,
            script,
            avatar_id: avatarId,
            voice_id: voiceId,
            status: 'processing',
            aspect_ratio: aspectRatio,
            background_url: bgUrl,
            auto_send: autoSend,
          }]);

          created++;
          console.log(`Video created for ${lead.company_name}: ${videoId}`);
          await sleep(2000); // HeyGen rate limit
        } catch (e: any) {
          console.error(`Video error for ${lead.company_name}:`, e.message);
        }
      }

      console.log(`Batch complete: ${created}/${leads.length} videos created`);
    })();

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/video-outreach/status/:videoId
router.get('/status/:videoId', async (req: any, res: any) => {
  try {
    const response = await axios.get(
      `${HEYGEN_BASE}/v1/video_status.get?video_id=${req.params.videoId}`,
      { headers: heygenHeaders(), timeout: 10000 }
    );

    const data = response.data?.data;
    const status = data?.status;
    const videoUrl = data?.video_url;
    const thumbnailUrl = data?.thumbnail_url;

    if (status === 'completed' && videoUrl) {
      // DB güncelle
      const { data: record } = await supabase
        .from('video_outreach')
        .update({ status: 'completed', video_url: videoUrl, thumbnail_url: thumbnailUrl })
        .eq('heygen_video_id', req.params.videoId)
        .select('*, leads(phone, company_name, contact_name), auto_send, user_id')
        .single();

      // Otomatik gönder
      if (record?.auto_send && record?.leads?.phone) {
        try {
          const { sendWhatsAppMessage } = require('./settings');
          const msg = `Merhaba ${record.leads.contact_name || record.leads.company_name}! Size özel hazırladığımız videoyu izleyin 🎬\n\n${videoUrl}`;
          await sendWhatsAppMessage(record.user_id, record.leads.phone, msg);
          await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('heygen_video_id', req.params.videoId);
        } catch (e: any) {
          console.error('Auto-send error:', e.message);
        }
      }
    } else if (status === 'failed') {
      await supabase.from('video_outreach').update({ status: 'failed' }).eq('heygen_video_id', req.params.videoId);
    }

    res.json({ status, videoUrl, thumbnailUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// POST /api/video-outreach/check-all — Tüm processing videoları kontrol et
router.post('/check-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: processingVideos } = await supabase
      .from('video_outreach')
      .select('heygen_video_id, auto_send, lead_id')
      .eq('user_id', userId)
      .eq('status', 'processing')
      .limit(20);

    if (!processingVideos?.length) return res.json({ message: 'Kontrol edilecek video yok', updated: 0 });

    let updated = 0;
    for (const video of processingVideos) {
      try {
        const response = await axios.get(
          `${HEYGEN_BASE}/v1/video_status.get?video_id=${video.heygen_video_id}`,
          { headers: heygenHeaders(), timeout: 8000 }
        );
        const data = response.data?.data;
        if (data?.status === 'completed' && data?.video_url) {
          await supabase.from('video_outreach')
            .update({ status: 'completed', video_url: data.video_url, thumbnail_url: data.thumbnail_url })
            .eq('heygen_video_id', video.heygen_video_id);
          updated++;

          // Otomatik gönder
          if (video.auto_send) {
            const { data: lead } = await supabase.from('leads').select('phone, contact_name, company_name').eq('id', video.lead_id).single();
            if (lead?.phone) {
              const { sendWhatsAppMessage } = require('./settings');
              const msg = `Merhaba ${lead.contact_name || lead.company_name}! Size özel hazırladığımız videoyu izleyin 🎬\n\n${data.video_url}`;
              await sendWhatsAppMessage(userId, lead.phone, msg).catch(() => {});
              await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('heygen_video_id', video.heygen_video_id);
            }
          }
        } else if (data?.status === 'failed') {
          await supabase.from('video_outreach').update({ status: 'failed' }).eq('heygen_video_id', video.heygen_video_id);
        }
        await sleep(500);
      } catch {}
    }

    res.json({ message: `${updated} video güncellendi`, updated, total: processingVideos.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/video-outreach/send-whatsapp/:recordId
router.post('/send-whatsapp/:recordId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: video } = await supabase
      .from('video_outreach')
      .select('*, leads(phone, company_name, contact_name)')
      .eq('id', req.params.recordId)
      .eq('user_id', userId)
      .single();

    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    if (video.status !== 'completed') return res.status(400).json({ error: 'Video henüz hazır değil' });
    if (!video.video_url) return res.status(400).json({ error: 'Video URL yok' });
    if (!video.leads?.phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const { sendWhatsAppMessage } = require('./settings');
    const contactName = video.leads.contact_name || video.leads.company_name;
    const firstName = contactName.split(' ')[0];
    const message = `Merhaba ${firstName} Bey/Hanım! 👋\n\nSizin için özel hazırladığımız kısa videoyu izlemenizi ister miydik? 🎬\n\n${video.video_url}\n\nGörüşmek dileğiyle 🙏`;

    await sendWhatsAppMessage(userId, video.leads.phone, message);
    await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', req.params.recordId);

    res.json({ message: 'Video WhatsApp ile gönderildi! ✅' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/video-outreach/send-all — Tüm hazır videoları gönder
router.post('/send-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: readyVideos } = await supabase
      .from('video_outreach')
      .select('*, leads(phone, company_name, contact_name)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .is('sent_at', null)
      .limit(50);

    if (!readyVideos?.length) return res.json({ message: 'Gönderilecek hazır video yok', sent: 0 });

    let sent = 0;
    const { sendWhatsAppMessage } = require('./settings');

    for (const video of readyVideos) {
      if (!video.leads?.phone || !video.video_url) continue;
      try {
        const firstName = (video.leads.contact_name || video.leads.company_name).split(' ')[0];
        const message = `Merhaba ${firstName} Bey/Hanım! 👋\n\nSizin için özel hazırladığımız kısa videoyu izlemenizi ister miydik? 🎬\n\n${video.video_url}\n\nGörüşmek dileğiyle 🙏`;
        await sendWhatsAppMessage(userId, video.leads.phone, message);
        await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', video.id);
        sent++;
        await sleep(12000); // WhatsApp anti-ban
      } catch (e: any) {
        console.error(`Send error for ${video.leads.company_name}:`, e.message);
      }
    }

    res.json({ message: `${sent} video WhatsApp ile gönderildi!`, sent });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Her 5 dakikada processing videoları kontrol et
setInterval(async () => {
  try {
    const { data: processingVideos } = await supabase
      .from('video_outreach')
      .select('heygen_video_id, auto_send, lead_id, user_id')
      .eq('status', 'processing')
      .limit(10);

    if (!processingVideos?.length) return;

    for (const video of processingVideos) {
      try {
        const response = await axios.get(
          `${HEYGEN_BASE}/v1/video_status.get?video_id=${video.heygen_video_id}`,
          { headers: heygenHeaders(), timeout: 8000 }
        );
        const data = response.data?.data;
        if (data?.status === 'completed' && data?.video_url) {
          await supabase.from('video_outreach')
            .update({ status: 'completed', video_url: data.video_url, thumbnail_url: data.thumbnail_url })
            .eq('heygen_video_id', video.heygen_video_id);

          if (video.auto_send) {
            const { data: lead } = await supabase.from('leads').select('phone, contact_name, company_name').eq('id', video.lead_id).single();
            if (lead?.phone) {
              const { sendWhatsAppMessage } = require('./settings');
              const firstName = (lead.contact_name || lead.company_name).split(' ')[0];
              const msg = `Merhaba ${firstName} Bey/Hanım! 👋\n\nSizin için özel hazırladığımız kısa videoyu izlemenizi ister miydik? 🎬\n\n${data.video_url}`;
              await sendWhatsAppMessage(video.user_id, lead.phone, msg).catch(() => {});
              await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('heygen_video_id', video.heygen_video_id);
            }
          }
        } else if (data?.status === 'failed') {
          await supabase.from('video_outreach').update({ status: 'failed' }).eq('heygen_video_id', video.heygen_video_id);
        }
        await sleep(500);
      } catch {}
    }
  } catch {}
}, 5 * 60 * 1000);

module.exports = router;