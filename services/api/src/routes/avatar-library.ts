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

// ─── GET /api/avatar-library/grouped — characters grouped with their scenes ──
// Returns one card per character_group, each with its available scene variants
// (studio/office/home/outdoor/field). UI lets user pick character → scene.

router.get('/grouped', async (req: any, res: any) => {
  try {
    const { gender, style, language } = req.query;

    let query = supabase
      .from('stock_avatars')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('sort_order',  { ascending: true });

    if (gender)   query = query.eq('gender', gender);
    if (style)    query = query.eq('style', style);
    if (language) query = query.contains('languages', [language]);

    const { data, error } = await query;
    if (error) throw error;

    const groups: Record<string, any> = {};
    for (const avatar of (data || [])) {
      const key = avatar.character_group || avatar.name;
      if (!groups[key]) {
        groups[key] = {
          character_group: key,
          display_name: avatar.display_name,
          gender: avatar.gender,
          age_group: avatar.age_group,
          style: avatar.style,
          languages: avatar.languages,
          is_featured: avatar.is_featured,
          tags: avatar.tags,
          scenes: [],
        };
      }
      groups[key].scenes.push({
        id: avatar.id,
        scene_type: avatar.scene_type,
        thumbnail_url: avatar.thumbnail_url,
        preview_video_url: avatar.preview_video_url,
        has_seed_video: !!avatar.latentsync_video_url,
      });
    }

    const result = Object.values(groups).sort((a: any, b: any) =>
      (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)
    );

    res.json({ characters: result });
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

// NOTE: Admin management (upload/upsert/test) moved to /api/admin/avatar-library
// — protected by adminAuthMiddleware. Previously these lived here under regular
// user authMiddleware, which meant any logged-in customer could write to the
// shared stock_avatars table. See routes/admin/avatar-library.ts.

module.exports = router;
