export {};

// ─── G.711 μ-law (ITU-T G.711) — zero-dependency codec ───────────────────────
// Twilio Media Streams: μ-law 8kHz base64
// Deepgram live: accepts raw μ-law bytes directly (encoding=mulaw&sample_rate=8000)
// Cartesia TTS: returns PCM s16le at 8000Hz → we encode to μ-law for Twilio

const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

/** PCM Int16 sample → 8-bit μ-law byte */
function linearToMulaw(sample: number): number {
  if (sample > 32767) sample = 32767;
  if (sample < -32768) sample = -32768;
  const sign = sample < 0 ? 0x80 : 0;
  if (sign) sample = -sample;
  if (sample > MULAW_CLIP) sample = MULAW_CLIP;
  sample += MULAW_BIAS;
  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; exponent--, mask >>= 1) {}
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

/** 8-bit μ-law byte → PCM Int16 sample */
function mulawToLinear(mulaw: number): number {
  mulaw = ~mulaw & 0xff;
  const sign      = mulaw & 0x80;
  const exponent  = (mulaw >> 4) & 0x07;
  const mantissa  = mulaw & 0x0f;
  let sample      = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample         -= MULAW_BIAS;
  return sign ? -sample : sample;
}

/** PCM Int16LE Buffer → μ-law Buffer (2:1 ratio) */
export function pcmToMulaw(pcm: Buffer): Buffer {
  const samples = pcm.length >> 1;
  const out     = Buffer.allocUnsafe(samples);
  for (let i = 0; i < samples; i++) {
    out[i] = linearToMulaw(pcm.readInt16LE(i * 2));
  }
  return out;
}

/** μ-law Buffer → PCM Int16LE Buffer (1:2 ratio) */
export function mulawToPcm(mulaw: Buffer): Buffer {
  const out = Buffer.allocUnsafe(mulaw.length * 2);
  for (let i = 0; i < mulaw.length; i++) {
    out.writeInt16LE(mulawToLinear(mulaw[i]), i * 2);
  }
  return out;
}

// ─── Sentence splitter for TTS streaming ─────────────────────────────────────
// Splits accumulated LLM tokens into speakable sentence chunks.
// Rules:
//   ✓ Split on  ". ", "! ", "? "  (sentence-ending punctuation + space)
//   ✗ Don't split after single uppercase letters followed by period (abbrev.)
//   ✗ Don't split on decimal numbers "3.5", "10.000"
//   ✓ Always flush remaining text on explicit call

const SENTENCE_RE = /([^.!?]*[.!?]+)(?=\s|$)/g;
const ABBREV_RE   = /(?:\b[A-ZÇĞİÖŞÜ]|\b\d+)\.$/ ; // single capital or digit before "."

/**
 * Extracts complete sentences from `text`.
 * Returns `{ sentences, remaining }` where `remaining` is the leftover fragment.
 */
export function extractSentences(text: string): { sentences: string[]; remaining: string } {
  const sentences: string[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SENTENCE_RE)) {
    const sentence = match[1].trim();
    const endIdx   = (match.index ?? 0) + match[0].length;

    // Skip if this looks like an abbreviation or decimal
    const before = text.slice(0, (match.index ?? 0) + match[1].length);
    if (ABBREV_RE.test(before)) continue;
    if (sentence.length < 3) continue;

    sentences.push(sentence);
    lastIndex = endIdx;
  }

  return { sentences, remaining: text.slice(lastIndex).trim() };
}

/** Format a Twilio Media Streams "media" event payload */
export function makeTwilioMediaEvent(streamSid: string, mulawBase64: string): string {
  return JSON.stringify({ event: 'media', streamSid, media: { payload: mulawBase64 } });
}

/** Format a Twilio Media Streams "clear" event (stops playback) */
export function makeTwilioClearEvent(streamSid: string): string {
  return JSON.stringify({ event: 'clear', streamSid });
}
