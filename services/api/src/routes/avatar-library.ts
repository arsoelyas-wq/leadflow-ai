export {};
const express  = require('express');
const axios    = require('axios');
const { createClient } = require('@supabase/supabase-js');

const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── GET /api/avatar-library — list all stock avatars ────────────────────────

router.get('/', async (req: any, res: any) => {
  try {
    const { gender, style, language, featured } = req.query;

    let query = supabase
      .from('stock_avatars')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('sort_order',  { ascending: true });

    if (gender)              query = query.eq('gender', gender);
    if (style)               query = query.eq('style', style);
    if (featured === 'true') query = query.eq('is_featured', true);
    if (language)            query = query.contains('languages', [language]);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ avatars: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/avatar-library/:id — single avatar ─────────────────────────────

router.get('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('stock_avatars')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Avatar bulunamadı' });
    res.json({ avatar: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/avatar-library/:id/preview-url ─────────────────────────────────
// Returns seed video URL directly — no generation needed, just show the person

router.get('/:id/preview-url', async (req: any, res: any) => {
  try {
    const { data: avatar } = await supabase
      .from('stock_avatars')
      .select('id, latentsync_video_url, preview_video_url, thumbnail_url')
      .eq('id', req.params.id)
      .single();

    if (!avatar) return res.status(404).json({ error: 'Avatar bulunamadı' });

    res.json({
      previewVideoUrl: avatar.preview_video_url || avatar.latentsync_video_url || null,
      thumbnailUrl:   avatar.thumbnail_url || null,
      hasSeedVideo:   !!avatar.latentsync_video_url,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/avatar-library/generate ───────────────────────────────────────
// Start LatentSync job for a stock avatar + audio URL
// Returns predictionId — poll /replicate/status/:id for completion

router.post('/generate', async (req: any, res: any) => {
  try {
    const { avatarId, audioUrl } = req.body || {};
    if (!avatarId)  return res.status(400).json({ error: 'avatarId gerekli' });
    if (!audioUrl)  return res.status(400).json({ error: 'audioUrl gerekli' });

    const { data: avatar } = await supabase
      .from('stock_avatars')
      .select('*')
      .eq('id', avatarId)
      .single();

    if (!avatar)                      return res.status(404).json({ error: 'Avatar bulunamadı' });
    if (!avatar.latentsync_video_url) return res.status(400).json({ error: 'Bu avatar için seed video henüz yüklenmedi. Admin panelinden yükleyin.' });
    if (!process.env.REPLICATE_API_TOKEN) return res.status(400).json({ error: 'REPLICATE_API_TOKEN yapılandırılmamış' });

    const replicateRes = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'a84b0568a4ef50a63d0e9e1d2e7b47daed1b17e35fed7e8fbe4b70bce3a2bea5',
        input: {
          video:     avatar.latentsync_video_url,
          audio:     audioUrl,
          sync_conf: 0.85,
          fps:       25,
        },
      },
      {
        headers: {
          Authorization:  `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const predictionId = replicateRes.data?.id;
    if (!predictionId) return res.status(500).json({ error: 'Replicate job başlatılamadı' });

    res.json({ predictionId, provider: 'replicate-latentsync', avatarName: avatar.display_name });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/avatar-library/replicate/status/:id — poll Replicate ───────────

router.get('/replicate/status/:predId', async (req: any, res: any) => {
  try {
    if (!process.env.REPLICATE_API_TOKEN) return res.status(400).json({ error: 'REPLICATE_API_TOKEN eksik' });

    const r = await axios.get(
      `https://api.replicate.com/v1/predictions/${req.params.predId}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` }, timeout: 10000 }
    );

    const { status, output, error } = r.data;
    const videoUrl = status === 'succeeded' && output
      ? (Array.isArray(output) ? output[0] : output)
      : null;

    res.json({ status, videoUrl, error: error || null });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: POST /api/avatar-library/admin/upload-url ────────────────────────
// Get a signed Supabase upload URL for a seed video

router.post('/admin/upload-url', async (req: any, res: any) => {
  try {
    const { filename, contentType = 'video/mp4' } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename gerekli' });

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path     = `avatar-seeds/${Date.now()}_${safeName}`;

    const { data, error } = await supabase.storage
      .from('video-assets')
      .createSignedUploadUrl(path, { upsert: true });

    if (error) throw error;

    const { data: pubData } = supabase.storage.from('video-assets').getPublicUrl(path);

    res.json({ uploadUrl: data.signedUrl, publicUrl: pubData.publicUrl, path });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: POST /api/avatar-library/admin/upsert ────────────────────────────
// Create or update a stock avatar record

router.post('/admin/upsert', async (req: any, res: any) => {
  try {
    const {
      id, name, display_name, gender = 'neutral', age_group = 'adult',
      style = 'professional', languages = ['tr', 'en'],
      thumbnail_url, latentsync_video_url, preview_video_url,
      tags = [], is_featured = false, sort_order = 99, is_active = true,
    } = req.body || {};

    if (!name)         return res.status(400).json({ error: 'name gerekli' });
    if (!display_name) return res.status(400).json({ error: 'display_name gerekli' });

    const payload: any = {
      name, display_name, gender, age_group, style, languages,
      thumbnail_url, latentsync_video_url, preview_video_url,
      tags, is_featured, sort_order, is_active,
    };

    let result;
    if (id) {
      const { data, error } = await supabase
        .from('stock_avatars')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('stock_avatars')
        .upsert([payload], { onConflict: 'name' })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json({ ok: true, avatar: result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: POST /api/avatar-library/admin/test-latentsync ───────────────────
// Quick test: run LatentSync on an avatar with a sample audio to verify quality

router.post('/admin/test-latentsync', async (req: any, res: any) => {
  try {
    const { avatarId, testAudioUrl } = req.body || {};
    if (!avatarId || !testAudioUrl) return res.status(400).json({ error: 'avatarId ve testAudioUrl gerekli' });
    if (!process.env.REPLICATE_API_TOKEN) return res.status(400).json({ error: 'REPLICATE_API_TOKEN eksik' });

    const { data: avatar } = await supabase.from('stock_avatars').select('*').eq('id', avatarId).single();
    if (!avatar?.latentsync_video_url) return res.status(400).json({ error: 'Avatar seed video yok' });

    const r = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'a84b0568a4ef50a63d0e9e1d2e7b47daed1b17e35fed7e8fbe4b70bce3a2bea5',
        input: { video: avatar.latentsync_video_url, audio: testAudioUrl, sync_conf: 0.85, fps: 25 },
      },
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } }
    );

    res.json({ predictionId: r.data?.id, message: `Test başlatıldı — /api/avatar-library/replicate/status/${r.data?.id} ile takip edin` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
