export {};
const { EventEmitter } = require('events');
const WebSocket = require('ws');

import { SessionParams } from './call-session';

// ─── Gemini Live — LeadFlow ses motoru (test modu) ────────────────────────────
// Mimari: Twilio (μ-law 8kHz) ↔ WebSocket Bridge ↔ Gemini Live (PCM 16kHz/24kHz)
//
// Ses dönüşüm zinciri:
//   Giriş : Twilio μ-law 8kHz → decode → PCM 16-bit 8kHz → upsample 2x → PCM 16kHz → Gemini
//   Çıkış : Gemini PCM 24kHz → downsample 3x → PCM 8kHz → encode → μ-law 8kHz → Twilio

// ─── μ-law decode tablosu (ITU-T G.711) ──────────────────────────────────────
const MULAW_DECODE: Int16Array = (() => {
  const table = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    let mu = ~i & 0xFF;
    const sign = (mu & 0x80) ? -1 : 1;
    const exp  = (mu >> 4) & 0x07;
    const mant = mu & 0x0F;
    let sample = ((mant << 1) + 33) << exp;
    sample -= 33;
    table[i] = sign * sample;
  }
  return table;
})();

// μ-law encode (16-bit PCM → G.711 μ-law byte)
function encodeMulaw(sample: number): number {
  const BIAS = 33;
  const MAX  = 0x7FFF;
  let sign = 0;
  if (sample < 0) { sign = 0x80; sample = -sample; }
  if (sample > MAX) sample = MAX;
  sample += BIAS;
  let exp = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exp > 0; exp--, mask >>= 1) {}
  const mant = (sample >> (exp + 3)) & 0x0F;
  return (~(sign | (exp << 4) | mant)) & 0xFF;
}

// μ-law Buffer @8kHz → PCM Int16 Buffer @16kHz (2x upsample, linear interpolation)
function mulawToLinear16k(mulaw: Buffer): Buffer {
  const n   = mulaw.length;
  const out = new Int16Array(n * 2);
  for (let i = 0; i < n - 1; i++) {
    const a = MULAW_DECODE[mulaw[i]];
    const b = MULAW_DECODE[mulaw[i + 1]];
    out[i * 2]     = a;
    out[i * 2 + 1] = Math.round((a + b) / 2);
  }
  const last = MULAW_DECODE[mulaw[n - 1]];
  out[(n - 1) * 2]     = last;
  out[(n - 1) * 2 + 1] = last;
  return Buffer.from(out.buffer);
}

// PCM Int16 Buffer @24kHz → μ-law Buffer @8kHz (3x downsample, average)
function linear24kToMulaw(pcm: Buffer): Buffer {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 2);
  const outLen  = Math.floor(samples.length / 3);
  const out     = Buffer.alloc(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * 3;
    const avg = Math.round((samples[idx] + samples[idx + 1] + samples[idx + 2]) / 3);
    out[i] = encodeMulaw(avg);
  }
  return out;
}

// ─── Gemini Live sistem prompt ────────────────────────────────────────────────

function buildGeminiPrompt(p: SessionParams): string {
  const isFirst = p.firstMessage || '';

  const profile = p.businessContext ? `\n\nÜRÜN/HİZMET BİLGİLERİ:\n${p.businessContext}` : '';

  const pains = [p.pain1, p.pain2].filter(Boolean).join(', ');

  return `Sen ${p.agentName}, ${p.companyName} şirketinden arayan satış temsilcisisin.
Sunduğun: ${p.productDesc || 'ürün ve hizmetler'}${profile}
Müşteri: ${p.leadName || 'müşteri'}${p.leadCompany ? ` (${p.leadCompany})` : ''}
${pains ? `Müşteri sorunları: ${pains}` : ''}
${p.callMemory ? `Önceki görüşme: ${p.callMemory}` : ''}
${p.avoidWords ? `Yasaklı kelimeler: ${p.avoidWords}` : ''}

KONUŞMA TARZI: Türkçe, doğal, samimi — kısa cümleler (1-2 cümle), açık uçlu sorularla devam.
KURALI: Yapay zeka, bot, sistem kelimelerini kullanma — gerçek bir insan satış temsilcisisin.

ÖNEMLİ: Telefon araması BAŞLADI. İLK söylemen gereken şey AYNEN şu (kelimesi kelimesine):
"${isFirst}"

Bunu söyledikten sonra müşteriyi dinle ve doğal sohbete devam et.`.trim();
}

// ─── GeminiLiveSession ────────────────────────────────────────────────────────

export class GeminiLiveSession extends EventEmitter {
  readonly sessionId: string;
  callSid:            string;

  private twilioWs:   any;
  private geminiWs:   any = null;
  private streamSid:  string = '';
  private params:     SessionParams;
  private isEnded:    boolean = false;
  private setupDone:  boolean = false;

  // 24kHz PCM artık buffer'ı (tam gruplar için)
  private pcmRemainder: Buffer = Buffer.alloc(0);

  private startedAt:  number = Date.now();

  constructor(ws: any, params: SessionParams) {
    super();
    this.twilioWs  = ws;
    this.params    = params;
    this.sessionId = params.sessionId;
    this.callSid   = params.callSid;
  }

  async onTwilioStart(streamSid: string): Promise<void> {
    this.streamSid = streamSid;
    console.log(`[Gemini ${this.sessionId}] Twilio stream başladı, Gemini Live'a bağlanıyor...`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(`[Gemini ${this.sessionId}] GEMINI_API_KEY eksik!`);
      this._endCall('config_error');
      return;
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const gWs   = new WebSocket(wsUrl);
    this.geminiWs = gWs;

    gWs.on('open', () => {
      console.log(`[Gemini ${this.sessionId}] Gemini WS açıldı, setup gönderiliyor...`);
      gWs.send(JSON.stringify({
        setup: {
          model: 'models/gemini-2.5-flash-preview-native-audio-dialog',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' }  // Erkek ses
              }
            }
          },
          systemInstruction: {
            parts: [{ text: buildGeminiPrompt(this.params) }]
          }
        }
      }));
    });

    gWs.on('message', (raw: Buffer) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      // Setup tamamlandı → açılış mesajını tetikle
      if (msg.setupComplete !== undefined && !this.setupDone) {
        this.setupDone = true;
        console.log(`[Gemini ${this.sessionId}] Setup tamamlandı — açılış tetikleniyor`);
        gWs.send(JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: 'Merhaba, aramanız bağlandı.' }] }],
            turnComplete: true
          }
        }));
      }

      // Ses yanıtı (PCM 24kHz)
      const parts = msg.serverContent?.modelTurn?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData?.data) {
            this._handleGeminiAudio(part.inlineData.data);
          }
        }
      }

      // Kesinti sinyali (kullanıcı sözü kesti)
      if (msg.serverContent?.interrupted) {
        console.log(`[Gemini ${this.sessionId}] Kullanıcı AI'yı kesti`);
      }
    });

    gWs.on('close', (code: number) => {
      console.log(`[Gemini ${this.sessionId}] Gemini WS kapandı: code=${code}`);
      if (!this.isEnded) this._endCall('remote_hangup');
    });

    gWs.on('error', (err: any) => {
      console.error(`[Gemini ${this.sessionId}] Gemini WS hata: ${err.message}`);
      if (!this.isEnded) this._endCall('error');
    });

    // Max süre timeout
    setTimeout(() => {
      if (!this.isEnded) this._endCall('max_duration');
    }, (this.params.maxDurationSec || 300) * 1000);
  }

  onAudioChunk(mulawBase64: string): void {
    if (this.isEnded || !this.setupDone) return;
    if (!this.geminiWs || this.geminiWs.readyState !== 1) return;

    const mulaw  = Buffer.from(mulawBase64, 'base64');
    const pcm16k = mulawToLinear16k(mulaw);

    this.geminiWs.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data:     pcm16k.toString('base64')
        }]
      }
    }));
  }

  onTwilioStop(): void {
    if (!this.isEnded) this._endCall('caller_hangup');
  }

  forceEnd(reason: string): void {
    this._endCall(reason);
  }

  private _handleGeminiAudio(base64Data: string): void {
    try {
      // Yeni PCM verisini önceki artıkla birleştir (3'ün katı için)
      const incoming = Buffer.from(base64Data, 'base64');
      const combined = Buffer.concat([this.pcmRemainder, incoming]);

      // Her 16-bit sample = 2 byte → 3 sample grubu = 6 byte
      const bytesPerGroup  = 6;
      const usableBytes    = Math.floor(combined.byteLength / bytesPerGroup) * bytesPerGroup;
      this.pcmRemainder    = combined.subarray(usableBytes);

      if (usableBytes === 0) return;

      const mulaw = linear24kToMulaw(combined.subarray(0, usableBytes));

      // Twilio'ya gönder
      this.twilioWs.send(JSON.stringify({
        event:     'media',
        streamSid: this.streamSid,
        media:     { payload: mulaw.toString('base64') }
      }));
    } catch (err: any) {
      console.error(`[Gemini ${this.sessionId}] Audio dönüşüm hatası: ${err.message}`);
    }
  }

  private _endCall(reason: string): void {
    if (this.isEnded) return;
    this.isEnded = true;

    const durationSec = Math.round((Date.now() - this.startedAt) / 1000);
    console.log(`[Gemini ${this.sessionId}] Arama bitti: reason=${reason} duration=${durationSec}s`);

    if (this.geminiWs?.readyState === 1) {
      try { this.geminiWs.close(); } catch {}
    }

    // Twilio'ya clear + stop sinyali
    try {
      this.twilioWs.send(JSON.stringify({ event: 'clear', streamSid: this.streamSid }));
    } catch {}

    this.emit('ended', { reason, outcome: 'unknown', durationSec, transcript: '' });
  }
}
