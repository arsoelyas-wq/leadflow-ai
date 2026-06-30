export {};
const express  = require('express');
const axios    = require('axios');
const { createClient } = require('@supabase/supabase-js');

const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// All routes here are mounted under /api/admin/avatar-library and protected
// by adminAuthMiddleware (applied at the /api/admin level in index.ts).

// ─── GET / — list all avatars (including inactive), grouped by character ─────

router.get('/', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('stock_avatars')
      .select('*')
      .order('character_group', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;

    const groups: Record<string, any[]> = {};
    for (const a of (data || [])) {
      const key = a.character_group || a.name;
      (groups[key] = groups[key] || []).push(a);
    }

    res.json({ avatars: data || [], groups });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /upload-url — signed upload URL for a new seed video ───────────────

router.post('/upload-url', async (req: any, res: any) => {
  try {
    const { filename } = req.body || {};
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

// ─── POST /upsert — create/update a stock avatar (one scene of a character) ──

router.post('/upsert', async (req: any, res: any) => {
  try {
    const {
      id, name, display_name, character_group,
      gender = 'neutral', age_group = 'adult',
      style = 'professional', languages = ['tr', 'en'],
      scene_type = 'studio',
      thumbnail_url, latentsync_video_url, preview_video_url,
      tags = [], is_featured = false, sort_order = 99, is_active = true,
    } = req.body || {};

    if (!name)         return res.status(400).json({ error: 'name gerekli (benzersiz kod, orn: ayse_ofis)' });
    if (!display_name) return res.status(400).json({ error: 'display_name gerekli (orn: Ayşe — Ofis)' });

    const payload: any = {
      name, display_name,
      character_group: character_group || name,
      gender, age_group, style, languages, scene_type,
      thumbnail_url, latentsync_video_url, preview_video_url,
      tags, is_featured, sort_order, is_active,
    };

    let result;
    if (id) {
      const { data, error } = await supabase.from('stock_avatars').update(payload).eq('id', id).select().single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase.from('stock_avatars').upsert([payload], { onConflict: 'name' }).select().single();
      if (error) throw error;
      result = data;
    }

    res.json({ ok: true, avatar: result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /:id — remove a scene/avatar ──────────────────────────────────────

router.delete('/:id', async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('stock_avatars').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /test-latentsync — verify lip-sync quality on a sample ─────────────

router.post('/test-latentsync', async (req: any, res: any) => {
  try {
    const { avatarId, testAudioUrl } = req.body || {};
    if (!avatarId || !testAudioUrl) return res.status(400).json({ error: 'avatarId ve testAudioUrl gerekli' });
    if (!process.env.REPLICATE_API_TOKEN) return res.status(400).json({ error: 'REPLICATE_API_TOKEN eksik' });

    const { data: avatar } = await supabase.from('stock_avatars').select('*').eq('id', avatarId).single();
    if (!avatar?.latentsync_video_url) return res.status(400).json({ error: 'Avatar seed video yok' });

    const r = await axios.post(
      'https://api.replicate.com/v1/predictions',
      { version: 'a84b0568a4ef50a63d0e9e1d2e7b47daed1b17e35fed7e8fbe4b70bce3a2bea5', input: { video: avatar.latentsync_video_url, audio: testAudioUrl, sync_conf: 0.85, fps: 25 } },
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } }
    );

    res.json({ predictionId: r.data?.id, message: `Test başlatıldı — /api/avatar-library/replicate/status/${r.data?.id} ile takip edin` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
