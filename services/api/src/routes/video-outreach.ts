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
  return { 'X-Api-Key': HEYGEN_API_KEY, 'Content-Type': 'application/json' };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchCompanyBackground(website: string): Promise<string | null> {
  try {
    if (!website) return null;
    const url = website.startsWith('http') ? website : `https://${website}`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000
    });
    const $ = cheerio.load(response.data);
    for (const sel of ['img[class*="logo"]', 'img[alt*="logo"]', 'header img']) {
      const src = $(sel).first().attr('src');
      if (src) return src.startsWith('http') ? src : `${url}${src.startsWith('/') ? '' : '/'}${src}`;
    }
    return null;
  } catch { return null; }
}

async function generateScript(lead: any, settings: any): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const firstName = (lead.contact_name || lead.company_name).split(' ')[0];
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: `Kısa B2B satış video scripti yaz. MAX 80 kelime. Türkçe. Samimi.
Hedef: ${firstName} / ${lead.company_name} / ${lead.city || ''} / ${lead.sector || ''}
Sadece scripti yaz.` }]
    });
    return response.content[0]?.text || '';
  } catch {
    const firstName = (lead.contact_name || lead.company_name).split(' ')[0];
    return `Merhaba ${firstName} Bey/Hanım, ${lead.company_name} olarak yaptığınız çalışmaları takip ediyorum. Size özel bir çözüm sunmak için kısa bir görüşme yapabilir miyiz?`;
  }
}

// GET /api/video-outreach/avatars
router.get('/avatars', async (req: any, res: any) => {
  try {
    const response = await axios.get(`${HEYGEN_BASE}/v2/avatars`, { headers: heygenHeaders(), timeout: 10000 });
    res.json({ avatars: response.data?.data?.avatars || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// GET /api/video-outreach/voices
router.get('/voices', async (req: any, res: any) => {
  try {
    const response = await axios.get(`${HEYGEN_BASE}/v2/voices`, { headers: heygenHeaders(), timeout: 10000 });
    const voices = response.data?.data?.voices || [];
    const tr = voices.filter((v: any) => v.language?.toLowerCase().includes('tr') || v.language?.toLowerCase().includes('turkish'));
    const others = voices.filter((v: any) => !v.language?.toLowerCase().includes('tr') && !v.language?.toLowerCase().includes('turkish'));
    res.json({ voices: [...tr, ...others] });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// GET /api/video-outreach/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const [a, b, c, d] = await Promise.all([
      supabase.from('video_outreach').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('video_outreach').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'processing'),
      supabase.from('video_outreach').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
      supabase.from('video_outreach').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('sent_at', 'is', null),
    ]);
    res.json({ total: a.count || 0, processing: b.count || 0, completed: c.count || 0, sent: d.count || 0 });
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

// POST /api/video-outreach/create
router.post('/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, avatarId, voiceId, script, aspectRatio = '9:16', autoSend = false } = req.body;

    if (!leadId || !avatarId || !voiceId) {
      return res.status(400).json({ error: 'leadId, avatarId, voiceId zorunlu' });
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (leadError || !lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const { data: settings } = await supabase
      .from('user_settings').select('*').eq('user_id', userId).single();

    const finalScript = script || await generateScript(lead, settings);
    const bgUrl = await fetchCompanyBackground(lead.website || '');

    // HeyGen video oluştur
    const payload = {
      video_inputs: [{
        character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
        voice: { type: 'text', voice_id: voiceId, input_text: finalScript, speed: 1.0 },
        background: bgUrl
          ? { type: 'image', url: bgUrl }
          : { type: 'color', value: '#0f172a' },
      }],
      aspect_ratio: aspectRatio,
      test: false,
    };

    const heygenRes = await axios.post(`${HEYGEN_BASE}/v2/video/generate`, payload, {
      headers: heygenHeaders(), timeout: 30000
    });

    const videoId = heygenRes.data?.data?.video_id;
    if (!videoId) throw new Error('HeyGen video ID alınamadı: ' + JSON.stringify(heygenRes.data));

    // DB'ye kaydet
    const insertData = {
      user_id: userId,
      lead_id: leadId,
      heygen_video_id: videoId,
      script: finalScript,
      avatar_id: avatarId,
      voice_id: voiceId,
      status: 'processing',
      aspect_ratio: aspectRatio,
      background_url: bgUrl,
      auto_send: autoSend,
    };

    const { data: record, error: insertError } = await supabase
      .from('video_outreach')
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error('DB insert error:', insertError);
    }

    res.json({
      videoId,
      recordId: record?.id,
      script: finalScript,
      backgroundUsed: !!bgUrl,
      status: 'processing',
      message: 'Video oluşturuluyor (~2-3 dakika)',
    });
  } catch (e: any) {
    console.error('Video create error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// POST /api/video-outreach/batch
router.post('/batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, avatarId, voiceId, aspectRatio = '9:16', autoSend = false, maxLeads = 50 } = req.body;

    if (!avatarId || !voiceId) return res.status(400).json({ error: 'avatarId, voiceId zorunlu' });

    let query = supabase.from('leads').select('*').eq('user_id', userId).limit(maxLeads);
    if (leadIds?.length) query = query.in('id', leadIds);

    const { data: leads } = await query;
    if (!leads?.length) return res.json({ message: 'Lead yok', created: 0 });

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();

    res.json({
      message: `${leads.length} lead için video oluşturma başladı!`,
      total: leads.length,
      estimatedMinutes: Math.ceil(leads.length * 3),
    });

    // Asenkron işle
    (async () => {
      let created = 0;
      for (const lead of leads) {
        try {
          const script = await generateScript(lead, settings);
          const bgUrl = await fetchCompanyBackground(lead.website || '');
          const payload = {
            video_inputs: [{
              character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
              voice: { type: 'text', voice_id: voiceId, input_text: script, speed: 1.0 },
              background: bgUrl ? { type: 'image', url: bgUrl } : { type: 'color', value: '#0f172a' },
            }],
            aspect_ratio: aspectRatio,
            test: false,
          };
          const heygenRes = await axios.post(`${HEYGEN_BASE}/v2/video/generate`, payload, {
            headers: heygenHeaders(), timeout: 30000
          });
          const videoId = heygenRes.data?.data?.video_id;
          if (videoId) {
            await supabase.from('video_outreach').insert([{
              user_id: userId, lead_id: lead.id, heygen_video_id: videoId,
              script, avatar_id: avatarId, voice_id: voiceId,
              status: 'processing', aspect_ratio: aspectRatio,
              background_url: bgUrl, auto_send: autoSend,
            }]);
            created++;
          }
          await sleep(2000);
        } catch (e: any) { console.error(`Batch error ${lead.company_name}:`, e.message); }
      }
      console.log(`Batch done: ${created}/${leads.length}`);
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
    const { status, video_url, thumbnail_url } = data || {};

    if (status === 'completed' && video_url) {
      const { data: record } = await supabase.from('video_outreach')
        .update({ status: 'completed', video_url, thumbnail_url })
        .eq('heygen_video_id', req.params.videoId)
        .select('*, leads(phone, contact_name, company_name), auto_send, user_id')
        .single();

      if (record?.auto_send && record?.leads?.phone) {
        try {
          const { sendWhatsAppMessage } = require('./settings');
          const firstName = (record.leads.contact_name || record.leads.company_name).split(' ')[0];
          await sendWhatsAppMessage(record.user_id, record.leads.phone,
            `Merhaba ${firstName} Bey/Hanım! 👋\n\nSizin için özel hazırladığımız videoyu izleyin 🎬\n\n${video_url}`);
          await supabase.from('video_outreach')
            .update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' })
            .eq('heygen_video_id', req.params.videoId);
        } catch {}
      }
    } else if (status === 'failed') {
      await supabase.from('video_outreach').update({ status: 'failed' }).eq('heygen_video_id', req.params.videoId);
    }

    res.json({ status, videoUrl: video_url, thumbnailUrl: thumbnail_url });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// POST /api/video-outreach/check-all
router.post('/check-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: processing } = await supabase
      .from('video_outreach').select('heygen_video_id, auto_send, lead_id')
      .eq('user_id', userId).eq('status', 'processing').limit(20);

    if (!processing?.length) return res.json({ message: 'Kontrol edilecek video yok', updated: 0 });

    let updated = 0;
    for (const v of processing) {
      try {
        const r = await axios.get(`${HEYGEN_BASE}/v1/video_status.get?video_id=${v.heygen_video_id}`,
          { headers: heygenHeaders(), timeout: 8000 });
        const d = r.data?.data;
        if (d?.status === 'completed' && d?.video_url) {
          await supabase.from('video_outreach')
            .update({ status: 'completed', video_url: d.video_url, thumbnail_url: d.thumbnail_url })
            .eq('heygen_video_id', v.heygen_video_id);
          updated++;
        } else if (d?.status === 'failed') {
          await supabase.from('video_outreach').update({ status: 'failed' }).eq('heygen_video_id', v.heygen_video_id);
        }
        await sleep(500);
      } catch {}
    }
    res.json({ message: `${updated} video güncellendi`, updated, total: processing.length });
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
      .eq('id', req.params.recordId).eq('user_id', userId).single();

    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    if (video.status !== 'completed') return res.status(400).json({ error: 'Video henüz hazır değil' });
    if (!video.video_url) return res.status(400).json({ error: 'Video URL yok' });
    if (!video.leads?.phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const { sendWhatsAppMessage } = require('./settings');
    const firstName = (video.leads.contact_name || video.leads.company_name).split(' ')[0];
    await sendWhatsAppMessage(userId, video.leads.phone,
      `Merhaba ${firstName} Bey/Hanım! 👋\n\nSizin için özel hazırladığımız videoyu izleyin 🎬\n\n${video.video_url}`);
    await supabase.from('video_outreach')
      .update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' })
      .eq('id', req.params.recordId);

    res.json({ message: 'Video WhatsApp ile gönderildi! ✅' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/video-outreach/send-all
router.post('/send-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: ready } = await supabase
      .from('video_outreach')
      .select('*, leads(phone, company_name, contact_name)')
      .eq('user_id', userId).eq('status', 'completed').is('sent_at', null).limit(50);

    if (!ready?.length) return res.json({ message: 'Gönderilecek hazır video yok', sent: 0 });

    const { sendWhatsAppMessage } = require('./settings');
    let sent = 0;
    for (const v of ready) {
      if (!v.leads?.phone || !v.video_url) continue;
      try {
        const firstName = (v.leads.contact_name || v.leads.company_name).split(' ')[0];
        await sendWhatsAppMessage(userId, v.leads.phone,
          `Merhaba ${firstName} Bey/Hanım! 👋\n\nSizin için özel hazırladığımız videoyu izleyin 🎬\n\n${v.video_url}`);
        await supabase.from('video_outreach')
          .update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' })
          .eq('id', v.id);
        sent++;
        await sleep(12000);
      } catch {}
    }
    res.json({ message: `${sent} video gönderildi!`, sent });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Her 5 dakikada processing videoları kontrol et
setInterval(async () => {
  try {
    const { data: processing } = await supabase
      .from('video_outreach')
      .select('heygen_video_id, auto_send, lead_id, user_id')
      .eq('status', 'processing').limit(10);

    for (const v of processing || []) {
      try {
        const r = await axios.get(`${HEYGEN_BASE}/v1/video_status.get?video_id=${v.heygen_video_id}`,
          { headers: heygenHeaders(), timeout: 8000 });
        const d = r.data?.data;
        if (d?.status === 'completed' && d?.video_url) {
          await supabase.from('video_outreach')
            .update({ status: 'completed', video_url: d.video_url, thumbnail_url: d.thumbnail_url })
            .eq('heygen_video_id', v.heygen_video_id);

          if (v.auto_send) {
            const { data: lead } = await supabase.from('leads')
              .select('phone, contact_name, company_name').eq('id', v.lead_id).single();
            if (lead?.phone) {
              const { sendWhatsAppMessage } = require('./settings');
              const firstName = (lead.contact_name || lead.company_name).split(' ')[0];
              await sendWhatsAppMessage(v.user_id, lead.phone,
                `Merhaba ${firstName} Bey/Hanım! 👋\n\nSizin için özel hazırladığımız videoyu izleyin 🎬\n\n${d.video_url}`
              ).catch(() => {});
              await supabase.from('video_outreach')
                .update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' })
                .eq('heygen_video_id', v.heygen_video_id);
            }
          }
        } else if (d?.status === 'failed') {
          await supabase.from('video_outreach').update({ status: 'failed' }).eq('heygen_video_id', v.heygen_video_id);
        }
        await sleep(500);
      } catch {}
    }
  } catch {}
}, 5 * 60 * 1000);

module.exports = router;