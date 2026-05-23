export {};
const axios      = require('axios');
const FormData   = require('form-data');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface VideoEngineParams {
  engine:       'latentsync' | 'heygen' | 'gaussian';
  audioBuffer:  Buffer;
  avatarVideoUrl?: string;   // base video for LatentSync/Gaussian (replica seed or stock)
  avatarId?:    string;      // HeyGen avatar ID
  backgroundUrl?: string;
  aspectRatio?: string;      // '9:16' | '16:9' | '1:1'
  emotionProfile?: any;
  userId?:      string;
  voiceId?:     string;      // ElevenLabs voice ID for audio (already applied, buffer provided)
}

export interface VideoEngineResult {
  videoUrl:   string;
  engine:     string;
  durationMs: number;
}

// ─── MAIN DISPATCHER ──────────────────────────────────────────────────────────

export async function generateVideo(params: VideoEngineParams): Promise<VideoEngineResult> {
  const t0 = Date.now();

  if (params.engine === 'latentsync') {
    const url = await generateWithLatentSync(params);
    return { videoUrl: url, engine: 'latentsync', durationMs: Date.now() - t0 };
  }

  if (params.engine === 'gaussian') {
    const url = await generateWithGaussian(params);
    return { videoUrl: url, engine: 'gaussian', durationMs: Date.now() - t0 };
  }

  // Default: HeyGen
  const url = await generateWithHeyGen(params);
  return { videoUrl: url, engine: 'heygen', durationMs: Date.now() - t0 };
}

// ─── LATENTSYNC (Replicate) ───────────────────────────────────────────────────
// ByteDance LatentSync — diffusion lipsync on any base video
// Cost: ~$0.088 per run, ~90s generation
// Quality: photorealistic, production-grade

async function generateWithLatentSync(params: VideoEngineParams): Promise<string> {
  const { audioBuffer, avatarVideoUrl, userId } = params;

  if (!avatarVideoUrl) throw new Error('LatentSync requires avatarVideoUrl (replica seed)');
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN not set');

  // Upload audio to temp storage so Replicate can fetch it
  const audioUrl = await uploadTempBuffer(audioBuffer, `audio_${Date.now()}.mp3`, 'audio/mpeg', userId);

  // Call Replicate — LatentSync
  const replicateRes = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: 'a84b0568a4ef50a63d0e9e1d2e7b47daed1b17e35fed7e8fbe4b70bce3a2bea5', // latentsync
      input: {
        video:     avatarVideoUrl,
        audio:     audioUrl,
        sync_conf: 0.85,
        fps:       25,
      },
    },
    {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const predictionId = replicateRes.data?.id;
  if (!predictionId) throw new Error('Replicate prediction failed to start');

  // Poll for completion (max 3 min)
  const videoUrl = await pollReplicatePrediction(predictionId, 180_000);
  return videoUrl;
}

// ─── GAUSSIAN (RunPod self-hosted — future) ───────────────────────────────────

async function generateWithGaussian(params: VideoEngineParams): Promise<string> {
  if (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_ENDPOINT_ID) {
    // Fallback to LatentSync if Gaussian not configured
    console.warn('[VideoEngine] Gaussian not configured, falling back to LatentSync');
    return generateWithLatentSync({ ...params, engine: 'latentsync' });
  }

  const { audioBuffer, avatarVideoUrl, userId } = params;
  if (!avatarVideoUrl) throw new Error('Gaussian requires avatarVideoUrl (trained model URL)');

  const audioUrl = await uploadTempBuffer(audioBuffer, `audio_${Date.now()}.mp3`, 'audio/mpeg', userId);

  const runRes = await axios.post(
    `https://api.runpod.io/v2/${process.env.RUNPOD_ENDPOINT_ID}/run`,
    {
      input: {
        model_url: avatarVideoUrl,
        audio_url: audioUrl,
        task: 'inference',
      },
    },
    { headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' } }
  );

  const jobId = runRes.data?.id;
  if (!jobId) throw new Error('RunPod job failed to start');

  const videoUrl = await pollRunPodJob(jobId, 300_000);
  return videoUrl;
}

// ─── HEYGEN (existing API, enhanced with emotion) ─────────────────────────────

async function generateWithHeyGen(params: VideoEngineParams): Promise<string> {
  const { audioBuffer, avatarId, backgroundUrl, aspectRatio = '9:16' } = params;
  if (!avatarId) throw new Error('HeyGen requires avatarId');
  if (!process.env.HEYGEN_API_KEY) throw new Error('HEYGEN_API_KEY not set');

  const HEYGEN_BASE = 'https://api.heygen.com';

  // Upload audio
  const formData = new FormData();
  formData.append('audio', audioBuffer, { filename: 'audio.mp3', contentType: 'audio/mpeg' });
  const uploadRes = await axios.post(`${HEYGEN_BASE}/v1/asset`, formData, {
    headers: { ...formData.getHeaders(), 'X-Api-Key': process.env.HEYGEN_API_KEY },
    timeout: 30000,
  });
  const audioAssetId = uploadRes.data?.data?.id;
  if (!audioAssetId) throw new Error('HeyGen audio upload failed');

  const character: any = {
    type:         'avatar',
    avatar_id:    avatarId,
    avatar_style: 'normal',
  };

  if (backgroundUrl) {
    character.scale  = 0.4;
    character.offset = { x: -0.4, y: -0.35 };
  }

  const videoInput: any = {
    character,
    voice: { type: 'audio', audio_asset_id: audioAssetId },
  };

  if (backgroundUrl) {
    videoInput.background = { type: 'image', url: backgroundUrl };
  }

  const createRes = await axios.post(
    `${HEYGEN_BASE}/v2/video/generate`,
    {
      video_inputs: [{ ...videoInput }],
      dimension: aspectRatio === '16:9'
        ? { width: 1280, height: 720 }
        : aspectRatio === '1:1'
          ? { width: 720,  height: 720 }
          : { width: 720,  height: 1280 },
    },
    { headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY, 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  const videoId = createRes.data?.data?.video_id;
  if (!videoId) throw new Error('HeyGen video creation failed');

  // Poll for HeyGen completion
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

async function pollRunPodJob(id: string, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 8000));
    const res = await axios.get(
      `https://api.runpod.io/v2/${process.env.RUNPOD_ENDPOINT_ID}/status/${id}`,
      { headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` } }
    );
    const { status, output } = res.data;
    if (status === 'COMPLETED' && output?.video_url) return output.video_url;
    if (status === 'FAILED') throw new Error('RunPod job failed');
  }
  throw new Error('RunPod job timed out');
}

// ─── TRAINING HELPERS ─────────────────────────────────────────────────────────

// Kick off a LatentSync-compatible "talking head" fine-tune on Replicate
// or a full GSTalker 3DGS training on RunPod for higher quality
export async function trainReplicaModel(opts: {
  seedVideoUrl: string;
  replicaId:    string;
  userId:       string;
  engine:       'latentsync' | 'gaussian';
}): Promise<{ jobId: string; provider: string }> {
  const { seedVideoUrl, replicaId, userId, engine } = opts;

  if (engine === 'gaussian' && process.env.RUNPOD_API_KEY && process.env.RUNPOD_ENDPOINT_ID) {
    const res = await axios.post(
      `https://api.runpod.io/v2/${process.env.RUNPOD_ENDPOINT_ID}/run`,
      { input: { seed_video_url: seedVideoUrl, replica_id: replicaId, task: 'train' } },
      { headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return { jobId: res.data.id, provider: 'runpod' };
  }

  // For LatentSync, no training needed — seed video IS the avatar
  // Just record the job as instant success
  await supabase.from('user_replicas').update({
    gaussian_model_url: seedVideoUrl,  // seed video used directly
    status: 'ready',
  }).eq('id', replicaId);

  return { jobId: `direct_${Date.now()}`, provider: 'none' };
}
