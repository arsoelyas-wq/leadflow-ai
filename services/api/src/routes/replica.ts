export {};
const express    = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios      = require('axios');
const { trainReplicaModel } = require('../services/video-engine');

const router   = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── GET /api/replica — List user replicas ────────────────────────────────────

router.get('/', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_replicas')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ replicas: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/replica/grouped — ready replicas grouped by person/character ───

router.get('/grouped', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_replicas')
      .select('*')
      .eq('user_id', req.userId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const groups: Record<string, any> = {};
    for (const r of (data || [])) {
      const key = r.character_group || r.name;
      if (!groups[key]) {
        groups[key] = {
          character_group: key,
          display_name: (r.name || '').split(' - ')[0].trim() || r.name,
          is_default: false,
          scenes: [],
        };
      }
      groups[key].scenes.push({
        id: r.id, scene_type: r.scene_type || 'studio', name: r.name,
        preview_video_url: r.preview_video_url, is_default: r.is_default,
      });
      if (r.is_default) groups[key].is_default = true;
    }

    res.json({ characters: Object.values(groups) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/replica/:id ─────────────────────────────────────────────────────

router.get('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_replicas')
      .select('*, replica_jobs(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ replica: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/replica/upload-seed — Get signed upload URL ───────────────────

router.post('/upload-seed', async (req: any, res: any) => {
  try {
    const { filename, contentType = 'video/mp4' } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename required' });

    const safeFilename = filename.replace(/[^a-z0-9._-]/gi, '_');
    const path = `${req.userId}/${Date.now()}_${safeFilename}`;

    const { data, error } = await supabase.storage
      .from('replica-seeds')
      .createSignedUploadUrl(path, { expiresIn: 600 });

    if (error) throw error;

    res.json({
      signedUrl: data.signedUrl,
      path,
      token: data.token,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/replica/train — Create replica & start training ────────────────

const MIN_SEED_DURATION_SEC = 8;
const RECOMMENDED_MIN_SEC = 30;

router.post('/train', async (req: any, res: any) => {
  try {
    const {
      name,
      language    = 'tr',
      engine      = 'museTalk',     // kendi RunPod altyapımız — yegane secenek (LatentSync sadece otomatik fallback)
      seedVideoPath,               // path in replica-seeds bucket
      cloneVoice  = true,
      durationSec,                 // measured client-side from recorded/uploaded video
      sceneType   = 'studio',      // studio | office | home | outdoor | field
      characterGroup,              // optional — groups multiple scenes of the same person
    } = req.body || {};

    if (!name || !seedVideoPath)
      return res.status(400).json({ error: 'name and seedVideoPath required' });

    const validScenes = ['studio', 'office', 'home', 'outdoor', 'field'];
    if (!validScenes.includes(sceneType)) {
      return res.status(400).json({ error: `Geçersiz sahne tipi. Geçerli: ${validScenes.join(', ')}` });
    }

    if (typeof durationSec === 'number') {
      if (durationSec < MIN_SEED_DURATION_SEC) {
        return res.status(400).json({ error: `Video en az ${MIN_SEED_DURATION_SEC} saniye olmalı — kalite için yeterli yüz/ses verisi gerekiyor.` });
      }
    }

    // Get public URL of seed video (signed)
    const { data: signedData } = await supabase.storage
      .from('replica-seeds')
      .createSignedUrl(seedVideoPath, 3600 * 24);

    const seedVideoUrl = signedData?.signedUrl;
    if (!seedVideoUrl) return res.status(400).json({ error: 'Could not access seed video' });

    // Create replica record
    const baseInsert: any = {
      user_id:       req.userId,
      name,
      language,
      engine,
      status:        'processing',
      seed_video_url: seedVideoUrl,
    };
    const sceneFields = {
      scene_type:     sceneType,
      character_group: (characterGroup || name).toLowerCase().split(' - ')[0].trim(),
    };

    let replica: any, insertErr: any;
    ({ data: replica, error: insertErr } = await supabase
      .from('user_replicas').insert([{ ...baseInsert, ...sceneFields }]).select().single());

    // Migration 20260630_avatar_scenes.sql not yet applied — retry without new columns
    if (insertErr && /column .*(scene_type|character_group)/i.test(insertErr.message || '')) {
      console.warn('[Replica] scene_type/character_group columns missing — run migrations/20260630_avatar_scenes.sql. Falling back.');
      ({ data: replica, error: insertErr } = await supabase
        .from('user_replicas').insert([baseInsert]).select().single());
    }

    if (insertErr || !replica) throw insertErr || new Error('Insert failed');

    // Kick off parallel tasks (non-blocking)
    void runTrainingPipeline(replica.id, req.userId, seedVideoUrl, engine, cloneVoice);

    const qualityWarning = typeof durationSec === 'number' && durationSec < RECOMMENDED_MIN_SEC
      ? `Video ${Math.round(durationSec)}sn — ${RECOMMENDED_MIN_SEC}sn+ önerilir, ses klonu kalitesi düşük olabilir.`
      : null;

    res.json({ replica, message: 'Eğitim başlatıldı', qualityWarning });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/replica/:id/set-default ───────────────────────────────────────

router.post('/:id/set-default', async (req: any, res: any) => {
  try {
    // Unset existing default
    await supabase.from('user_replicas')
      .update({ is_default: false })
      .eq('user_id', req.userId);

    // Set new default
    const { error } = await supabase.from('user_replicas')
      .update({ is_default: true })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .eq('status', 'ready');

    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/replica/:id ──────────────────────────────────────────────────

router.delete('/:id', async (req: any, res: any) => {
  try {
    const { data: replica } = await supabase
      .from('user_replicas')
      .select('id, seed_video_url, elevenlabs_voice_id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (!replica) return res.status(404).json({ error: 'Not found' });

    // XTTS zero-shot — ses eğitimi yok, temizlik gerekmiyor
    if (replica.elevenlabs_voice_id) {
      await supabase.from('cloned_voices').delete().eq('id', replica.elevenlabs_voice_id).eq('user_id', req.userId).catch(() => {});
    }

    await supabase.from('user_replicas').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/replica/:id/test-video — Generate a sample video ───────────────

router.post('/:id/test-video', async (req: any, res: any) => {
  try {
    const { text = 'Merhaba! Bu benim video replikam. Ses ve yüz hareketlerimi inceliyorum.' } = req.body || {};

    const { data: replica } = await supabase
      .from('user_replicas')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (!replica) return res.status(404).json({ error: 'Not found' });
    if (replica.status !== 'ready') return res.status(400).json({ error: 'Replica henüz hazır değil' });

    // XTTS ile ses üret — klonlanmış ses ID'si varsa sample_url'yi al, yoksa serbest TTS
    let audioBuffer: Buffer;
    if (replica.elevenlabs_voice_id) {
      const { synthesizeXtts } = require('../services/xtts-engine');
      const { data: cv } = await supabase.from('cloned_voices').select('sample_url').eq('id', replica.elevenlabs_voice_id).single();
      if (!cv?.sample_url) return res.status(400).json({ error: 'Ses örneği bulunamadı' });
      audioBuffer = await synthesizeXtts(text, cv.sample_url, 'tr');
    } else {
      // Serbest TTS fallback (Google Translate)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=tr&client=tw-ob`;
      const ttsRes = await axios.get(ttsUrl, { responseType: 'arraybuffer', timeout: 15000 });
      audioBuffer = Buffer.from(ttsRes.data);
    }

    // Generate video
    const { generateVideo } = require('../services/video-engine');
    const result = await generateVideo({
      engine:       replica.engine,
      audioBuffer,
      avatarVideoUrl: replica.gaussian_model_url || replica.seed_video_url,
      avatarId:     replica.metadata?.heygen_avatar_id,
      userId:       req.userId,
    });

    // Save preview
    await supabase.from('user_replicas')
      .update({ preview_video_url: result.videoUrl })
      .eq('id', replica.id);

    res.json({ videoUrl: result.videoUrl, engine: result.engine });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/replica/:id/status — Poll training status ──────────────────────

router.get('/:id/status', async (req: any, res: any) => {
  try {
    const { data: replica } = await supabase
      .from('user_replicas')
      .select('status, error_message, elevenlabs_voice_id, gaussian_model_url, preview_video_url')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (!replica) return res.status(404).json({ error: 'Not found' });
    res.json(replica);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── TRAINING PIPELINE (background, non-blocking) ────────────────────────────

async function runTrainingPipeline(
  replicaId: string,
  userId: string,
  seedVideoUrl: string,
  engine: string,
  cloneVoice: boolean
): Promise<void> {
  try {
    let voiceId: string | null = null;

    // Step 1: Ses klonu — XTTS zero-shot (kendi sistemimiz, eğitim gerektirmez)
    // Seed video ses örneği olarak cloned_voices tablosuna kaydedilir
    if (cloneVoice) {
      try {
        await supabase.from('replica_jobs').insert([{
          replica_id: replicaId, user_id: userId,
          job_type: 'voice_clone', provider: 'xtts', status: 'running',
          started_at: new Date().toISOString(),
        }]);

        const { data: replica } = await supabase.from('user_replicas').select('name').eq('id', replicaId).single();

        // seed video URL → cloned_voices tablosuna kaydet (XTTS zero-shot için sample_url kullanılır)
        const { data: cloneRecord, error: cloneErr } = await supabase
          .from('cloned_voices')
          .insert([{ user_id: userId, name: replica?.name || `Replica_${replicaId.slice(0, 8)}`, sample_url: seedVideoUrl }])
          .select('id')
          .single();

        if (cloneErr) throw cloneErr;
        voiceId = cloneRecord.id;

        if (voiceId) {
          await supabase.from('user_replicas').update({ elevenlabs_voice_id: voiceId }).eq('id', replicaId);
          await supabase.from('replica_jobs').update({ status: 'succeeded', finished_at: new Date().toISOString() })
            .eq('replica_id', replicaId).eq('job_type', 'voice_clone');
          console.log(`[Replica] XTTS voice clone kaydedildi: ${voiceId}`);
        }
      } catch (voiceErr: any) {
        console.error('[Replica] Voice clone error:', voiceErr.message);
        await supabase.from('replica_jobs')
          .update({ status: 'failed', error: voiceErr.message, finished_at: new Date().toISOString() })
          .eq('replica_id', replicaId).eq('job_type', 'voice_clone');
      }
    }

    // Step 2: Train video model
    try {
      const { jobId, provider } = await trainReplicaModel({
        seedVideoUrl,
        replicaId,
        userId,
        engine: engine as 'latentsync' | 'gaussian' | 'museTalk',
      });

      await supabase.from('replica_jobs').insert([{
        replica_id: replicaId, user_id: userId,
        job_type: 'model_train', provider,
        provider_job_id: jobId,
        status: 'succeeded',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }]);
    } catch (trainErr: any) {
      console.error('[Replica] Training error:', trainErr.message);
      await supabase.from('user_replicas')
        .update({ status: 'failed', error_message: trainErr.message })
        .eq('id', replicaId);
      return;
    }

    // All done
    await supabase.from('user_replicas')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', replicaId);

    console.log(`[Replica] Ready: ${replicaId}`);
  } catch (e: any) {
    console.error('[Replica] Pipeline error:', e.message);
    await supabase.from('user_replicas')
      .update({ status: 'failed', error_message: e.message })
      .eq('id', replicaId);
  }
}

module.exports = router;
