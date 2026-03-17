export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

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

// ── AVATAR LİSTESİ ────────────────────────────────────────
router.get('/avatars', async (req: any, res: any) => {
  try {
    const response = await axios.get(`${HEYGEN_BASE}/v2/avatars`, {
      headers: heygenHeaders(),
      timeout: 10000,
    });
    res.json({ avatars: response.data?.data?.avatars || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── SES LİSTESİ ───────────────────────────────────────────
router.get('/voices', async (req: any, res: any) => {
  try {
    const response = await axios.get(`${HEYGEN_BASE}/v2/voices`, {
      headers: heygenHeaders(),
      timeout: 10000,
    });
    const voices = response.data?.data?.voices || [];
    // Türkçe sesleri önce sırala
    const turkish = voices.filter((v: any) => v.language?.toLowerCase().includes('turkish') || v.language?.toLowerCase().includes('tr'));
    const others = voices.filter((v: any) => !v.language?.toLowerCase().includes('turkish') && !v.language?.toLowerCase().includes('tr'));
    res.json({ voices: [...turkish, ...others] });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── AI SCRIPT ÜRETİMİ ─────────────────────────────────────
async function generateVideoScript(lead: any, template: string, customPrompt: string): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `${customPrompt || 'B2B satış video scripti yaz. Kısa, kişisel, ikna edici. Max 45 saniye (yaklaşık 100 kelime). Türkçe.'}

Firma: ${lead.company_name}
İletişim: ${lead.contact_name || 'Yetkili'}
Şehir: ${lead.city || ''}
Sektör: ${lead.sector || ''}
${template ? `Şablon: ${template}` : ''}

Sadece scripti yaz, başka açıklama ekleme.`,
      }],
    });

    return response.content[0]?.text || '';
  } catch (e: any) {
    console.error('Script generation error:', e.message);
    return template || `Merhaba ${lead.contact_name || lead.company_name}, sizinle iletişime geçmek istedim. Ürünlerimiz hakkında kısa bir görüşme yapabilir miyiz?`;
  }
}

// ── VİDEO OLUŞTUR ─────────────────────────────────────────
router.post('/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const {
      leadId,
      avatarId,
      voiceId,
      script,
      template,
      customPrompt,
      aspectRatio = '16:9',
    } = req.body;

    if (!leadId || !avatarId || !voiceId) {
      return res.status(400).json({ error: 'leadId, avatarId, voiceId zorunlu' });
    }

    // Lead bilgilerini getir
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single();

    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Script üret (verilmemişse AI ile)
    const finalScript = script || await generateVideoScript(lead, template || '', customPrompt || '');
    if (!finalScript) return res.status(400).json({ error: 'Script oluşturulamadı' });

    // HeyGen video oluştur
    const videoPayload = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id: avatarId,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          voice_id: voiceId,
          input_text: finalScript,
          speed: 1.0,
        },
        background: {
          type: 'color',
          value: '#1a1a2e',
        },
      }],
      aspect_ratio: aspectRatio,
      test: false,
    };

    const response = await axios.post(
      `${HEYGEN_BASE}/v2/video/generate`,
      videoPayload,
      { headers: heygenHeaders(), timeout: 30000 }
    );

    const videoId = response.data?.data?.video_id;
    if (!videoId) throw new Error('Video ID alınamadı');

    // Veritabanına kaydet
    const { data: videoRecord } = await supabase
      .from('video_outreach')
      .insert([{
        user_id: userId,
        lead_id: leadId,
        heygen_video_id: videoId,
        script: finalScript,
        avatar_id: avatarId,
        voice_id: voiceId,
        status: 'processing',
        aspect_ratio: aspectRatio,
      }])
      .select()
      .single();

    res.json({
      videoId,
      recordId: videoRecord?.id,
      script: finalScript,
      status: 'processing',
      message: 'Video oluşturuluyor (~2-3 dakika)',
    });
  } catch (e: any) {
    console.error('HeyGen create error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── VİDEO DURUMU ─────────────────────────────────────────
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

    // Tamamlandıysa DB'yi güncelle
    if (status === 'completed' && videoUrl) {
      await supabase
        .from('video_outreach')
        .update({ status: 'completed', video_url: videoUrl, thumbnail_url: thumbnailUrl })
        .eq('heygen_video_id', req.params.videoId);
    } else if (status === 'failed') {
      await supabase
        .from('video_outreach')
        .update({ status: 'failed' })
        .eq('heygen_video_id', req.params.videoId);
    }

    res.json({ status, videoUrl, thumbnailUrl, data });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── VİDEO LİSTESİ ────────────────────────────────────────
router.get('/list', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('video_outreach')
      .select('*, leads(company_name, contact_name, phone, email)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ videos: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── TOPLU VİDEO ───────────────────────────────────────────
router.post('/batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, avatarId, voiceId, template, customPrompt } = req.body;

    if (!leadIds?.length || !avatarId || !voiceId) {
      return res.status(400).json({ error: 'leadIds, avatarId, voiceId zorunlu' });
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds)
      .eq('user_id', userId);

    if (!leads?.length) return res.status(400).json({ error: 'Lead bulunamadı' });

    let created = 0;
    const results = [];

    for (const lead of leads) {
      try {
        const script = await generateVideoScript(lead, template || '', customPrompt || '');

        const videoPayload = {
          video_inputs: [{
            character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
            voice: { type: 'text', voice_id: voiceId, input_text: script, speed: 1.0 },
            background: { type: 'color', value: '#1a1a2e' },
          }],
          aspect_ratio: '16:9',
          test: false,
        };

        const response = await axios.post(
          `${HEYGEN_BASE}/v2/video/generate`,
          videoPayload,
          { headers: heygenHeaders(), timeout: 30000 }
        );

        const videoId = response.data?.data?.video_id;
        if (videoId) {
          await supabase.from('video_outreach').insert([{
            user_id: userId,
            lead_id: lead.id,
            heygen_video_id: videoId,
            script,
            avatar_id: avatarId,
            voice_id: voiceId,
            status: 'processing',
          }]);

          results.push({ lead: lead.company_name, videoId, status: 'processing' });
          created++;
        }

        await new Promise(r => setTimeout(r, 2000));
      } catch (e: any) {
        console.error(`Video creation error for ${lead.company_name}:`, e.message);
      }
    }

    res.json({ message: `${created}/${leads.length} video oluşturuldu`, created, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── VİDEOYU WHATSAPP'A GÖNDER ─────────────────────────────
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

    const phone = video.leads?.phone;
    if (!phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    // WhatsApp'a video gönder
    const { sendWhatsAppMessage } = require('./settings');
    const message = `Merhaba ${video.leads?.contact_name || video.leads?.company_name}! Size özel hazırladığımız videoyu izlemenizi ister miyiz? 🎬\n${video.video_url}`;
    await sendWhatsAppMessage(userId, phone, message);

    // Gönderildi olarak işaretle
    await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', req.params.recordId);

    res.json({ message: 'Video WhatsApp ile gönderildi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── STATS ─────────────────────────────────────────────────
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

module.exports = router;