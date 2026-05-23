export {};
const express  = require('express');
const axios    = require('axios');
const { createClient } = require('@supabase/supabase-js');

const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DID_BASE = 'https://api.d-id.com';

function didHeaders() {
  const key = process.env.DID_API_KEY || '';
  const encoded = Buffer.from(key).toString('base64');
  return { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/json' };
}

// ─── GET /api/avatar-library — list all stock avatars ────────────────────────

router.get('/', async (req: any, res: any) => {
  try {
    const { gender, style, language, featured } = req.query;

    let query = supabase
      .from('stock_avatars')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true });

    if (gender)   query = query.eq('gender', gender);
    if (style)    query = query.eq('style', style);
    if (featured === 'true') query = query.eq('is_featured', true);
    if (language) query = query.contains('languages', [language]);

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

// ─── POST /api/avatar-library/:id/preview — generate 5-sec D-ID preview ─────

router.post('/:id/preview', async (req: any, res: any) => {
  try {
    const { text = 'Merhaba! Ben sizin için buradayım. Nasıl yardımcı olabilirim?' } = req.body || {};

    const { data: avatar } = await supabase
      .from('stock_avatars')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!avatar) return res.status(404).json({ error: 'Avatar bulunamadı' });

    if (avatar.preview_video_url) {
      return res.json({ videoUrl: avatar.preview_video_url, cached: true });
    }

    if (!avatar.did_presenter_id) {
      return res.status(400).json({ error: 'Bu avatar için önizleme mevcut değil' });
    }

    if (!process.env.DID_API_KEY) {
      return res.status(400).json({ error: 'DID_API_KEY yapılandırılmamış' });
    }

    // Generate via D-ID
    const talkRes = await axios.post(`${DID_BASE}/talks`, {
      source_url: `https://create-images-results.d-id.com/DefaultPresenters/${avatar.did_presenter_id}/image.jpeg`,
      script: {
        type: 'text',
        input: text.slice(0, 200),
        provider: {
          type: 'microsoft',
          voice_id: 'tr-TR-EmelNeural',
        },
      },
      config: { fluent: true, pad_audio: 0.0 },
    }, { headers: didHeaders(), timeout: 30000 });

    const talkId = talkRes.data?.id;
    if (!talkId) return res.status(500).json({ error: 'D-ID talk oluşturulamadı' });

    // Poll for result (max 90s)
    let videoUrl = '';
    for (let i = 0; i < 18; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const statusRes = await axios.get(`${DID_BASE}/talks/${talkId}`, { headers: didHeaders() });
      const { status, result_url } = statusRes.data;
      if (status === 'done' && result_url) { videoUrl = result_url; break; }
      if (status === 'error') return res.status(500).json({ error: 'D-ID önizleme hatası' });
    }

    if (!videoUrl) return res.status(504).json({ error: 'D-ID önizleme zaman aşımı' });

    // Cache preview URL
    await supabase.from('stock_avatars').update({ preview_video_url: videoUrl }).eq('id', avatar.id);

    res.json({ videoUrl });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/avatar-library/generate — generate full video with stock avatar

router.post('/generate', async (req: any, res: any) => {
  try {
    const { avatarId, audioUrl, language = 'tr', voiceId } = req.body || {};
    if (!avatarId) return res.status(400).json({ error: 'avatarId required' });

    const { data: avatar } = await supabase
      .from('stock_avatars')
      .select('*')
      .eq('id', avatarId)
      .single();

    if (!avatar) return res.status(404).json({ error: 'Avatar bulunamadı' });

    if (!process.env.DID_API_KEY) {
      return res.status(400).json({ error: 'DID_API_KEY yapılandırılmamış' });
    }

    if (!avatar.did_presenter_id) {
      return res.status(400).json({ error: 'Bu avatar D-ID ile desteklenmiyor' });
    }

    const voiceMap: Record<string, string> = {
      tr: 'tr-TR-EmelNeural',
      en: 'en-US-JennyNeural',
      de: 'de-DE-KatjaNeural',
      ar: 'ar-SA-ZariyahNeural',
      fr: 'fr-FR-DeniseNeural',
      ru: 'ru-RU-SvetlanaNeural',
      es: 'es-ES-ElviraNeural',
    };

    const payload: any = {
      source_url: `https://create-images-results.d-id.com/DefaultPresenters/${avatar.did_presenter_id}/image.jpeg`,
      config: { fluent: true, pad_audio: 0.5, stitch: true },
    };

    if (audioUrl) {
      payload.script = { type: 'audio', audio_url: audioUrl };
    } else {
      payload.script = {
        type: 'text',
        input: 'Bu bir test mesajıdır.',
        provider: { type: 'microsoft', voice_id: voiceMap[language] || 'tr-TR-EmelNeural' },
      };
    }

    const talkRes = await axios.post(`${DID_BASE}/talks`, payload, {
      headers: didHeaders(), timeout: 30000,
    });

    res.json({ talkId: talkRes.data?.id, provider: 'd-id' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/avatar-library/did/status/:talkId — poll D-ID job ──────────────

router.get('/did/status/:talkId', async (req: any, res: any) => {
  try {
    if (!process.env.DID_API_KEY) return res.status(400).json({ error: 'DID_API_KEY eksik' });

    const r = await axios.get(`${DID_BASE}/talks/${req.params.talkId}`, {
      headers: didHeaders(), timeout: 15000,
    });
    res.json({
      status:    r.data.status,
      videoUrl:  r.data.result_url || null,
      error:     r.data.error?.description || null,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: POST /api/avatar-library/admin/sync-did ──────────────────────────
// Fetch D-ID's full presenter list and upsert into our table

router.post('/admin/sync-did', async (req: any, res: any) => {
  try {
    if (!process.env.DID_API_KEY) return res.status(400).json({ error: 'DID_API_KEY eksik' });

    const r = await axios.get(`${DID_BASE}/presenters`, {
      headers: didHeaders(),
      params: { limit: 100 },
      timeout: 20000,
    });

    const presenters = r.data?.presenters || [];
    let upserted = 0;

    for (const p of presenters) {
      const gender = p.gender === 'male' ? 'male' : p.gender === 'female' ? 'female' : 'neutral';
      await supabase.from('stock_avatars').upsert([{
        name:            `did_${p.presenter_id}`,
        display_name:    p.name || p.presenter_id,
        gender,
        age_group:       'adult',
        style:           'professional',
        languages:       ['en', 'tr'],
        thumbnail_url:   p.thumbnail_url || null,
        did_presenter_id: p.presenter_id,
        is_active:       true,
      }], { onConflict: 'name' });
      upserted++;
    }

    res.json({ ok: true, synced: upserted });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
