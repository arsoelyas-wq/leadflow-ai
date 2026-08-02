export {};
const axios = require('axios');
import { pcmToMulaw } from './audio-utils';

// ─── Cartesia Sonic-2 Streaming TTS köprüsü ──────────────────────────────────
// POST /tts/bytes → streaming PCM s16le 8kHz → dönüştür μ-law → Twilio
// AbortController ile anında iptal (barge-in)

const CARTESIA_URL     = 'https://api.cartesia.ai/tts/bytes';
const CARTESIA_VERSION = '2024-06-10';
const SAMPLE_RATE      = 8000;
const CHUNK_ALIGN      = 2;   // PCM s16le = 2 bayt/örnek — hizalama tamponu

export interface CartesiaSynthOptions {
  voiceId:   string;
  model:     string;
  language?: string;   // 'tr', 'en', 'de' ...
  text:      string;
  signal:    AbortSignal;
  onChunk:   (mulawBuffer: Buffer) => void;
  onDone:    () => void;
  onError:   (err: Error) => void;
}

/**
 * Bir cümleyi sentezle ve ses chunk'larını anında callbacks ile aktar.
 * AbortSignal iptal edilirse sessizce durur.
 */
export async function synthesizeStreaming(opts: CartesiaSynthOptions): Promise<void> {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) throw new Error('[Cartesia] CARTESIA_API_KEY eksik');

  const body = {
    model_id:      opts.model,
    voice:         { mode: 'id', id: opts.voiceId },
    transcript:    opts.text,
    output_format: {
      container:   'raw',
      encoding:    'pcm_s16le',
      sample_rate: SAMPLE_RATE,
    },
    ...(opts.language ? { language: opts.language } : {}),
  };

  console.log(`[Cartesia] TTS start: voice=${opts.voiceId} model=${opts.model} lang=${opts.language} text="${opts.text?.slice(0, 60)}"`);

  let response: any;
  try {
    response = await axios.post(CARTESIA_URL, body, {
      headers: {
        'X-API-Key':         apiKey,
        'Cartesia-Version':  CARTESIA_VERSION,
        'Content-Type':      'application/json',
        'Accept':            'audio/pcm',
      },
      responseType: 'stream',
      timeout:      12000,
      signal:       opts.signal,
    });
    console.log(`[Cartesia] TTS stream opened: status=${response.status}`);
  } catch (err: any) {
    if (err.name === 'CanceledError' || err.name === 'AbortError' || opts.signal.aborted) return;
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`[Cartesia] TTS HTTP error ${err.response?.status}: ${detail}`);
    opts.onError(new Error(`[Cartesia] HTTP ${err.response?.status}: ${detail}`));
    return;
  }

  // Partial-chunk hizalama tamponu (PCM s16le = 2 bayt/örnek)
  let leftover = Buffer.alloc(0);

  let chunkCount = 0;
  response.data.on('data', (chunk: Buffer) => {
    if (opts.signal.aborted) { response.data.destroy(); return; }
    chunkCount++;

    // Kalan parça ile birleştir
    const combined  = Buffer.concat([leftover, chunk]);
    const aligned   = combined.length - (combined.length % CHUNK_ALIGN);
    const pcmSlice  = combined.slice(0, aligned);
    leftover        = combined.slice(aligned);

    if (pcmSlice.length === 0) return;

    const mulaw = pcmToMulaw(pcmSlice);
    opts.onChunk(mulaw);
  });

  await new Promise<void>((resolve) => {
    response.data.on('end',   () => {
      console.log(`[Cartesia] TTS done: chunks=${chunkCount} bytes=${chunkCount * 160}`);
      if (!opts.signal.aborted) opts.onDone();
      resolve();
    });
    response.data.on('error', (err: Error) => {
      if (opts.signal.aborted) { resolve(); return; }
      console.error(`[Cartesia] Stream error: ${err.message}`);
      opts.onError(new Error(`[Cartesia] Stream error: ${err.message}`));
      resolve();
    });
    response.data.on('close', resolve);
  });
}

/**
 * Bir cümle için ses uzunluğunu tahmin et (ms).
 * Gerçek süre Cartesia'dan gelir ama önce kuyruk önceliklerini belirlemek için kullanılır.
 */
export function estimateDurationMs(text: string, wordsPerMinute = 140): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil((words / wordsPerMinute) * 60 * 1000);
}
