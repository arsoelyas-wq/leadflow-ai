export {};
const axios      = require('axios');
const FormData   = require('form-data');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface VideoEngineParams {
  engine:          'museTalk' | 'latentsync' | 'heygen' | 'gaussian';
  audioBuffer:     Buffer;
  avatarVideoUrl?: string;   // seed video (personal replica or stock avatar)
  avatarId?:       string;   // HeyGen avatar ID
  backgroundUrl?:  string;
  aspectRatio?:    string;   // '9:16' | '16:9' | '1:1'
  emotionProfile?: any;
  userId?:         string;
  voiceId?:        string;
  language?:       string;
  skipEnhance?:    boolean;  // skip CodeFormer+ESRGAN for speed
}

export interface VideoEngineResult {
  videoUrl:   string;
  engine:     string;
  durationMs: number;
  stages?:    string[];
}

// ─── QUALITY NOTES ────────────────────────────────────────────────────────────
// museTalk (RunPod):  ⭐⭐⭐⭐⭐ head movement + eye blink + CodeFormer + 4x upscale
// latentsync (Repl):  ⭐⭐⭐⭐  lips only, photorealistic, no head movement
// heygen:             ⭐⭐⭐⭐⭐ industry standard, but expensive
// Priority: museTalk → latentsync → heygen

// ─── MAIN DISPATCHER ──────────────────────────────────────────────────────────

export async function generateVideo(params: VideoEngineParams): Promise<VideoEngineResult> {
  const t0 = Date.now();

  // MuseTalk (RunPod) — highest quality, requires RUNPOD_API_KEY + RUNPOD_ENDPOINT_ID
  if (params.engine === 'museTalk' || params.engine === 'gaussian') {
    if (process.env.RUNPOD_API_KEY && process.env.RUNPOD_ENDPOINT_ID) {
      // Auto-retry up to 2 times for GPU queue issues
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await generateWithMuseTalk(params);
          return { ...result, durationMs: Date.now() - t0 };
        } catch (mErr: any) {
          console.warn(`[VideoEngine] MuseTalk attempt ${attempt} failed: ${mErr.message?.slice(0, 80)}`);
          if (attempt < 2 && mErr.message?.includes('timed out')) {
            console.log('[VideoEngine] Retrying MuseTalk in 10s...');
            await new Promise(r => setTimeout(r, 10000));
            continue;
          }
          // Final fallback to LatentSync
          console.warn('[VideoEngine] MuseTalk failed — falling back to LatentSync');
          try {
            const url = await generateWithLatentSync(params);
            return { videoUrl: url, engine: 'latentsync', durationMs: Date.now() - t0 };
          } catch { throw mErr; }
        }
      }
    }
    // RunPod not configured — use LatentSync
    console.warn('[VideoEngine] RunPod not configured — falling back to LatentSync');
    const url = await generateWithLatentSync(params);
    return { videoUrl: url, engine: 'latentsync', durationMs: Date.now() - t0 };
  }

  if (params.engine === 'latentsync') {
    const url = await generateWithLatentSync(params);
    return { videoUrl: url, engine: 'latentsync', durationMs: Date.now() - t0 };
  }

  // HeyGen (fallback / explicit)
  const url = await generateWithHeyGen(params);
  return { videoUrl: url, engine: 'heygen', durationMs: Date.now() - t0 };
}

// ─── MUSETALK (RunPod) ────────────────────────────────────────────────────────
// Pipeline: MuseTalk generation → CodeFormer face restore → Real-ESRGAN 4x
// Quality: ⭐⭐⭐⭐⭐ — head movement, eye blink, expressions, 4K output
// Cost: ~$0.15-0.25/video on RTX 4090
// MuseTalk is zero-shot — no training needed per person

async function generateWithMuseTalk(params: VideoEngineParams): Promise<Omit<VideoEngineResult, 'durationMs'>> {
  const { audioBuffer, avatarVideoUrl, userId, skipEnhance } = params;
  if (!avatarVideoUrl) throw new Error('MuseTalk requires avatarVideoUrl (seed video)');

  const audioUrl = await uploadTempBuffer(audioBuffer, `audio_${Date.now()}.mp3`, 'audio/mpeg', userId);

  const runpodUrl = `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/run`;
  console.log(`[MuseTalk] audioUrl=${audioUrl}`);
  console.log(`[MuseTalk] runpodUrl=${runpodUrl}`);
  console.log(`[MuseTalk] RUNPOD_ENDPOINT_ID=${process.env.RUNPOD_ENDPOINT_ID}`);
  console.log(`[MuseTalk] RUNPOD_API_KEY set=${!!process.env.RUNPOD_API_KEY}`);

  let runRes: any;
  try {
    runRes = await axios.post(
      runpodUrl,
      {
        input: {
          seed_video_url: avatarVideoUrl,
          audio_url:      audioUrl,
          user_id:        userId || 'anon',
          skip_enhance:   skipEnhance ?? false,
          fidelity:       0.5,
          upscale:        4,
          fps:            30,
          codeformer_weight: 0.5,
          video_quality:  5,
        },
      },
      {
        headers: {
          Authorization:  `Bearer ${process.env.RUNPOD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
  } catch (err: any) {
    const status = err?.response?.status;
    const body   = JSON.stringify(err?.response?.data ?? err?.message);
    console.error(`[MuseTalk] RunPod HTTP ${status} — body: ${body}`);
    console.error(`[MuseTalk] key prefix: ${(process.env.RUNPOD_API_KEY || '').slice(0, 12)}`);
    throw err;
  }

  const jobId = runRes.data?.id;
  if (!jobId) throw new Error('RunPod job failed to start');

  const result = await pollRunPodJob(jobId, 600_000); // 10 min max
  return {
    videoUrl: result.video_url,
    engine:   'museTalk',
    stages:   result.stages || ['museTalk'],
  };
}

// ─── LATENTSYNC (Replicate) ───────────────────────────────────────────────────
// ByteDance LatentSync — diffusion lip-sync, lips only
// Quality: ⭐⭐⭐⭐ — very good lip-sync, no head movement
// Cost: ~$0.088/video, ~90s

async function generateWithLatentSync(params: VideoEngineParams): Promise<string> {
  const { audioBuffer, avatarVideoUrl, userId } = params;
  if (!avatarVideoUrl) throw new Error('LatentSync requires avatarVideoUrl');
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN not set');

  const audioUrl = await uploadTempBuffer(audioBuffer, `audio_${Date.now()}.mp3`, 'audio/mpeg', userId);

  const replicateRes = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: 'a84b0568a4ef50a63d0e9e1d2e7b47daed1b17e35fed7e8fbe4b70bce3a2bea5',
      input: {
        video:     avatarVideoUrl,
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
    }
  );

  const predictionId = replicateRes.data?.id;
  if (!predictionId) throw new Error('Replicate prediction failed to start');

  return pollReplicatePrediction(predictionId, 180_000);
}

// ─── HEYGEN ───────────────────────────────────────────────────────────────────

async function generateWithHeyGen(params: VideoEngineParams): Promise<string> {
  const { audioBuffer, avatarId, backgroundUrl, aspectRatio = '9:16' } = params;
  if (!avatarId) throw new Error('HeyGen requires avatarId');
  if (!process.env.HEYGEN_API_KEY) throw new Error('HEYGEN_API_KEY not set');

  const HEYGEN_BASE = 'https://api.heygen.com';

  const formData = new FormData();
  formData.append('audio', audioBuffer, { filename: 'audio.mp3', contentType: 'audio/mpeg' });
  const uploadRes = await axios.post(`${HEYGEN_BASE}/v1/asset`, formData, {
    headers: { ...formData.getHeaders(), 'X-Api-Key': process.env.HEYGEN_API_KEY },
    timeout: 30000,
  });
  const audioAssetId = uploadRes.data?.data?.id;
  if (!audioAssetId) throw new Error('HeyGen audio upload failed');

  const character: any = { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' };
  if (backgroundUrl) { character.scale = 0.4; character.offset = { x: -0.4, y: -0.35 }; }

  const videoInput: any = { character, voice: { type: 'audio', audio_asset_id: audioAssetId } };
  if (backgroundUrl) videoInput.background = { type: 'image', url: backgroundUrl };

  const createRes = await axios.post(
    `${HEYGEN_BASE}/v2/video/generate`,
    {
      video_inputs: [{ ...videoInput }],
      dimension: aspectRatio === '16:9'
        ? { width: 1280, height: 720 }
        : aspectRatio === '1:1'
          ? { width: 720, height: 720 }
          : { width: 720, height: 1280 },
    },
    { headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY, 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  const videoId = createRes.data?.data?.video_id;
  if (!videoId) throw new Error('HeyGen video creation failed');

  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await axios.get(`${HEYGEN_BASE}/v1/video_status.get?video_id=${videoId}`, {
      headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY },
    });
    const status = statusRes.data?.data?.status;
    if (status === 'completed') return statusRes.data.data.video_url;
    if (status === 'failed') throw new Error('HeyGen video generation failed');
  }
  throw new Error('HeyGen timeout');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function uploadTempBuffer(buf: Buffer, filename: string, contentType: string, userId?: string): Promise<string> {
  const path = `temp/${userId || 'anon'}/${filename}`;
  const { error } = await supabase.storage
    .from('video-assets')
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from('video-assets').getPublicUrl(path);
  return data.publicUrl;
}

async function pollReplicatePrediction(id: string, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await axios.get(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });
    const { status, output, error } = res.data;
    if (status === 'succeeded' && output) return Array.isArray(output) ? output[0] : output;
    if (status === 'failed') throw new Error(`Replicate failed: ${error}`);
  }
  throw new Error('Replicate prediction timed out');
}

async function pollRunPodJob(id: string, timeoutMs: number): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  let pollInterval = 5000;
  let lastStatus = '';
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval));
    try {
      const res = await axios.get(
        `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/status/${id}`,
        { headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` }, timeout: 10000 }
      );
      const { status, output } = res.data;
      if (status !== lastStatus) { console.log(`[RunPod] Job ${id.slice(0,8)}: ${status}`); lastStatus = status; }
      if (status === 'COMPLETED') {
        if (output?.error) throw new Error(`RunPod worker error: ${output.error}`);
        if (output?.video_url) return output;
        throw new Error('RunPod completed but no video_url in output');
      }
      if (status === 'FAILED') throw new Error('RunPod job failed');
      if (status === 'IN_QUEUE') pollInterval = Math.min(pollInterval + 2000, 15000);
      else pollInterval = 8000;
    } catch (pollErr: any) {
      if (pollErr.message?.includes('worker error') || pollErr.message?.includes('failed')) throw pollErr;
      console.warn(`[RunPod] Poll error (retrying): ${pollErr.message?.slice(0, 60)}`);
    }
  }
  throw new Error('RunPod job timed out after ' + Math.round(timeoutMs / 1000) + 's');
}

// ─── TRAINING ─────────────────────────────────────────────────────────────────
// MuseTalk is zero-shot — no training needed.
// 'gaussian' engine kept for backward compat — maps to museTalk inference.

export async function trainReplicaModel(opts: {
  seedVideoUrl: string;
  replicaId:    string;
  userId:       string;
  engine:       'latentsync' | 'gaussian' | 'museTalk';
}): Promise<{ jobId: string; provider: string }> {
  const { seedVideoUrl, replicaId } = opts;

  // MuseTalk/Gaussian: zero-shot — seed video is the model, mark as ready immediately
  await supabase.from('user_replicas').update({
    gaussian_model_url: seedVideoUrl,
    status: 'ready',
  }).eq('id', replicaId);

  return { jobId: `direct_${Date.now()}`, provider: 'none' };
}
