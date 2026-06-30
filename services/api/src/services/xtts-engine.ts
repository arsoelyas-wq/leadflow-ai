export {};
const axios = require('axios');

// ─── XTTS-v2 SENTEZİ (kendi sistemimiz) ─────────────────────────────────────
// RunPod XTTS-v2 serverless endpoint — ses örneği + metin → audio buffer
// RUNPOD_XTTS_ENDPOINT_ID env gerekli.
// Shared by voice-outreach.ts (Sesli Ajan calls) and video-outreach.ts (video narration)
// so a voice cloned once works across both products.

async function synthesizeXtts(text: string, sampleUrl: string, language = 'tr'): Promise<Buffer> {
  const endpointId = process.env.RUNPOD_XTTS_ENDPOINT_ID;
  if (!endpointId) throw new Error('RUNPOD_XTTS_ENDPOINT_ID ayarlanmamış');
  const rpKey = process.env.RUNPOD_API_KEY;
  if (!rpKey) throw new Error('RUNPOD_API_KEY ayarlanmamış');
  const rpHeaders = { Authorization: `Bearer ${rpKey}`, 'Content-Type': 'application/json' };

  console.log(`[XTTS] Starting: text="${text.slice(0, 40)}...", lang=${language}, sample=${sampleUrl.slice(-30)}`);

  const runRes = await axios.post(
    `https://api.runpod.ai/v2/${endpointId}/run`,
    { input: { text, speaker_wav_url: sampleUrl, language } },
    { headers: rpHeaders, timeout: 30000 }
  );

  const jobId = runRes.data?.id;
  if (!jobId) throw new Error(`RunPod job başlatılamadı: ${JSON.stringify(runRes.data).slice(0, 200)}`);
  console.log(`[XTTS] Job started: ${jobId}`);

  // Cold start can take 60-90s on serverless GPU — poll for up to 180s
  const deadline = Date.now() + 180000;
  let lastStatus = '';
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const statusRes = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
        { headers: rpHeaders, timeout: 10000 }
      );
      const { status, output, error: rpError } = statusRes.data;
      if (status !== lastStatus) { console.log(`[XTTS] Status: ${status}`); lastStatus = status; }

      if (status === 'COMPLETED') {
        if (output?.audio_url) {
          const audioRes = await axios.get(output.audio_url, { responseType: 'arraybuffer', timeout: 30000 });
          console.log(`[XTTS] Audio received: ${audioRes.data.byteLength} bytes`);
          return Buffer.from(audioRes.data);
        }
        if (output?.audio_base64) {
          console.log(`[XTTS] Audio base64 received`);
          return Buffer.from(output.audio_base64, 'base64');
        }
        throw new Error('Audio çıktısı yok');
      }
      if (status === 'FAILED') throw new Error(`RunPod failed: ${rpError || 'bilinmeyen hata'}`);
    } catch (pollErr: any) {
      if (pollErr.message?.includes('RunPod failed')) throw pollErr;
      console.warn(`[XTTS] Poll error (retrying): ${pollErr.message?.slice(0, 60)}`);
    }
  }
  throw new Error('XTTS 180sn zaman aşımı — RunPod GPU soğuk başlatma çok uzun sürdü');
}

// RunPod warm-up: ping the endpoint to pre-warm GPU
async function warmUpXtts() {
  const endpointId = process.env.RUNPOD_XTTS_ENDPOINT_ID;
  const rpKey = process.env.RUNPOD_API_KEY;
  if (!endpointId || !rpKey) return;
  try {
    await axios.get(`https://api.runpod.ai/v2/${endpointId}/health`, {
      headers: { Authorization: `Bearer ${rpKey}` }, timeout: 10000,
    });
  } catch { /* best-effort warm-up, ignore failures */ }
}

module.exports = { synthesizeXtts, warmUpXtts };
