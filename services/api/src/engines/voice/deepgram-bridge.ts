export {};
const WebSocket = require('ws');

// ─── Deepgram Nova-3 gerçek zamanlı STT köprüsü ──────────────────────────────
// Twilio'dan gelen μ-law audio → Deepgram WS → transcript olayları
// Deepgram μ-law 8kHz'i native destekler — dönüşüm gerekmez

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen';

export interface TranscriptResult {
  text:        string;
  confidence:  number;
  isFinal:     boolean;   // speech_final — kullanıcı konuşmayı bitirdi
  isInterim:   boolean;   // anlık tahmin
}

export type TranscriptHandler = (result: TranscriptResult) => void;

export interface DeepgramBridgeOptions {
  language:       string;
  model:          string;
  endpointingMs:  number;
  onTranscript:   TranscriptHandler;
  onError:        (err: Error) => void;
  onClose:        () => void;
}

export class DeepgramBridge {
  private ws:           any;
  private ready:        boolean = false;
  private audioQueue:   Buffer[] = [];
  private closed:       boolean = false;
  private keepAliveId:  NodeJS.Timeout | null = null;
  private reconnectId:  NodeJS.Timeout | null = null;
  private reconnects:   number = 0;
  private opts:         DeepgramBridgeOptions;

  constructor(opts: DeepgramBridgeOptions) {
    this.opts = opts;
    this._connect();
  }

  private _connect(): void {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error('[Deepgram] DEEPGRAM_API_KEY eksik');

    const params = new URLSearchParams({
      encoding:        'mulaw',
      sample_rate:     '8000',
      channels:        '1',
      model:           this.opts.model,
      language:        this.opts.language,
      interim_results: 'true',
      smart_format:    'true',
      punctuate:       'true',
      endpointing:     String(this.opts.endpointingMs),
      utterance_end_ms:'1000',
    });

    const url = `${DEEPGRAM_WS_URL}?${params.toString()}`;

    this.ws = new WebSocket(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });

    this.ws.on('open', () => {
      this.ready = true;
      // Flush queued audio accumulated before WS was ready
      for (const buf of this.audioQueue) this._sendRaw(buf);
      this.audioQueue = [];

      // KeepAlive every 8s (Deepgram closes idle streams after 10s)
      this.keepAliveId = setInterval(() => {
        if (!this.closed && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 8000);

      console.log(`[Deepgram] Connected lang=${this.opts.language}`);
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type !== 'Results') return;

        const alt        = msg.channel?.alternatives?.[0];
        const text       = alt?.transcript?.trim() ?? '';
        const confidence = alt?.confidence ?? 0;
        const isFinal    = msg.speech_final === true;
        const isInterim  = !isFinal;

        if (text.length === 0) return;

        this.opts.onTranscript({ text, confidence, isFinal, isInterim });
      } catch { /* ignore malformed frames */ }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[Deepgram] WS error:', err.message);
      this.opts.onError(err);
    });

    this.ws.on('close', (code: number) => {
      this._cleanup();
      if (!this.closed) {
        console.warn(`[Deepgram] Connection closed unexpectedly (code=${code}) reconnects=${this.reconnects}`);
        if (this.reconnects < 3) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, this.reconnects) * 1000;
          this.reconnects++;
          this.reconnectId = setTimeout(() => {
            if (!this.closed) {
              console.log(`[Deepgram] Reconnecting attempt ${this.reconnects}…`);
              this.ready = false;
              this._connect();
            }
          }, delay);
        } else {
          console.error('[Deepgram] Max reconnects reached, giving up');
          this.opts.onClose();
        }
      }
    });
  }

  /** μ-law audio chunk (raw Buffer — Twilio base64 decoded) → Deepgram */
  sendAudio(mulawBuffer: Buffer): void {
    if (this.closed) return;
    if (!this.ready) {
      this.audioQueue.push(mulawBuffer);
      return;
    }
    this._sendRaw(mulawBuffer);
  }

  private _sendRaw(buf: Buffer): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(buf, { binary: true });
    }
  }

  /** Deepgram'a konuşma sonu sinyali gönder ve kapat */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this._cleanup();
    if (this.ws?.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type: 'CloseStream' })); } catch {}
      setTimeout(() => { try { this.ws.terminate(); } catch {} }, 500);
    }
  }

  private _cleanup(): void {
    if (this.keepAliveId) { clearInterval(this.keepAliveId); this.keepAliveId = null; }
    if (this.reconnectId) { clearTimeout(this.reconnectId); this.reconnectId = null; }
    this.audioQueue = [];
  }
}
