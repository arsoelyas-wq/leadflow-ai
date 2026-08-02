export {};
const { EventEmitter } = require('events');

import { DeepgramBridge }            from './deepgram-bridge';
import { synthesizeStreaming }        from './cartesia-bridge';
import { streamResponse, Message, CallContext, ToolCall } from './conversation-engine';
import { getLangConfig, getCartesiaVoiceId, LangConfig } from './voice-catalog';
import { makeTwilioMediaEvent, makeTwilioClearEvent }    from './audio-utils';

// ─── Call state machine ───────────────────────────────────────────────────────
type CallState = 'idle' | 'greeting' | 'listening' | 'processing' | 'speaking' | 'ending' | 'ended';

export interface SessionParams {
  // Call identifiers
  callSid:          string;
  sessionId:        string;      // our internal ID (=voice_calls.id)
  voiceCallDbId?:   string;

  // Agent config
  agentName:        string;
  companyName:      string;
  productDesc:      string;
  leadName:         string;
  leadCompany:      string;
  language:         string;
  conversationStyle: string;
  firstMessage:     string;
  voiceId?:         string;      // override Cartesia voice ID
  gender?:          'male' | 'female' | 'neutral';
  transferNumber?:  string;
  avoidWords?:      string;
  pain1?:           string;
  pain2?:           string;
  callMemory?:      string;
  maxDurationSec:   number;
  callerId?:        string;   // Müşterinin doğrulanan numarası (Twilio Verified Caller ID)
}

export interface SessionEvent {
  type: 'transcript' | 'tool_call' | 'state_change' | 'ended';
  data: Record<string, any>;
}

export class CallSession extends EventEmitter {
  readonly sessionId: string;
  readonly callSid:   string;

  private ws:          any;        // Twilio WebSocket connection
  private streamSid:   string = '';
  private state:       CallState = 'idle';
  private langCfg:     LangConfig;
  private params:      SessionParams;

  private deepgram:    DeepgramBridge | null = null;
  private history:     Message[] = [];
  private transcript:  string[] = [];

  // TTS control
  private isSpeaking:      boolean = false;
  private ttsAbort:        AbortController | null = null;
  private ttsQueue:        string[] = [];
  private ttsProcessing:   boolean = false;

  // Timers
  private silenceTimer:    NodeJS.Timeout | null = null;
  private maxDurTimer:     NodeJS.Timeout | null = null;
  private interimBuffer:   string = '';
  private lastFinalAt:     number = 0;

  // Metrics
  private startedAt:       number = Date.now();
  private totalTokens:     number = 0;
  private turnsCount:      number = 0;

  constructor(ws: any, params: SessionParams) {
    super();
    this.ws       = ws;
    this.params   = params;
    this.sessionId = params.sessionId;
    this.callSid   = params.callSid;
    this.langCfg   = getLangConfig(params.language);

    ws.on('close', () => this._onWsClose());
    ws.on('error', (e: Error) => console.error(`[Session ${this.sessionId}] WS error:`, e.message));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Twilio'dan "start" eventi geldiğinde çağrılır */
  async onTwilioStart(streamSid: string): Promise<void> {
    this.streamSid = streamSid;
    console.log(`[Session ${this.sessionId}] Start streamSid=${streamSid}`);

    this._setState('greeting');
    this._startDeepgram();

    // Max duration timer — NaN/undefined koruması (minimum 60s)
    const maxMs = Math.max((this.params.maxDurationSec || 300) * 1000, 60_000);
    this.maxDurTimer = setTimeout(() => {
      console.log(`[Session ${this.sessionId}] Max duration reached`);
      this._endCall('timeout', 'unknown');
    }, maxMs);

    // İlk mesajı söyle
    await this._speak(this.params.firstMessage, true);
  }

  /** Twilio'dan gelen μ-law audio chunk */
  onAudioChunk(mulawBase64: string): void {
    if (this.state === 'ended' || this.state === 'idle') return;
    const buf = Buffer.from(mulawBase64, 'base64');
    this.deepgram?.sendAudio(buf);
  }

  /** Twilio "stop" eventi */
  onTwilioStop(): void {
    console.log(`[Session ${this.sessionId}] Twilio stream stopped`);
    this._endCall('call_ended', 'unknown');
  }

  // ── Deepgram ───────────────────────────────────────────────────────────────

  private _startDeepgram(): void {
    this.deepgram = new DeepgramBridge({
      language:      this.langCfg.deepgramLanguage,
      model:         this.langCfg.deepgramModel,
      endpointingMs: this.langCfg.deepgramEndpointingMs,
      onTranscript:  (r) => this._onTranscript(r.text, r.isFinal, r.confidence, r.isInterim),
      onError:       (e) => console.error(`[Session ${this.sessionId}] Deepgram error:`, e.message),
      onClose:       () => console.warn(`[Session ${this.sessionId}] Deepgram closed`),
    });
  }

  private _onTranscript(text: string, isFinal: boolean, confidence: number, isInterim: boolean): void {
    if (this.state === 'ended') return;

    const isFiller = this.langCfg.fillerWords.has(text.toLowerCase().trim());

    // ── Barge-in: AI konuşurken lead söz kesti ──
    if (isInterim && this.isSpeaking && !isFiller && confidence >= this.langCfg.silenceConfidenceThreshold) {
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount >= this.langCfg.minWordsToBarge) {
        console.log(`[Session ${this.sessionId}] Barge-in detected: "${text}"`);
        this._interrupt();
        this.interimBuffer = text;
      }
    }

    if (isFinal && text.trim().length > 0) {
      this.lastFinalAt   = Date.now();
      this.interimBuffer = '';
      this._clearSilenceTimer();

      const fullText = text.trim();
      this.transcript.push(`Lead: ${fullText}`);

      // Sona erme ifadesi kontrolü
      const normalized = fullText.toLowerCase();
      const isEndPhrase = this.langCfg.endCallPhrases.some(phrase => normalized.includes(phrase));
      if (isEndPhrase && this.state !== 'ending') {
        this._endCall('end_phrase', 'unknown');
        return;
      }

      this._processUserInput(fullText);
    }

    // Konuşma sonu sessizlik timer'ı
    if (isFinal || (isInterim && !this.isSpeaking)) {
      this._resetSilenceTimer();
    }
  }

  // ── LLM & TTS pipeline ────────────────────────────────────────────────────

  private async _processUserInput(text: string): Promise<void> {
    if (this.state === 'ended') return;
    this._setState('processing');
    this.turnsCount++;

    const ctx: CallContext = {
      agentName:          this.params.agentName,
      companyName:        this.params.companyName,
      productDesc:        this.params.productDesc,
      leadName:           this.params.leadName,
      leadCompany:        this.params.leadCompany,
      language:           this.params.language,
      conversationStyle:  this.params.conversationStyle,
      transferNumber:     this.params.transferNumber,
      avoidWords:         this.params.avoidWords,
      pain1:              this.params.pain1,
      pain2:              this.params.pain2,
      callMemory:         this.params.callMemory,
    };

    const claudeAbort = new AbortController();

    // Cümle callback → TTS kuyruğuna ekle
    const onSentence = (sent: string) => {
      if ((this.state as string) === 'ended') return;
      this._enqueueTts(sent);
    };

    try {
      const result = await streamResponse(
        this.history,
        text,
        ctx,
        claudeAbort.signal,
        onSentence,
      );

      if ((this.state as string) === 'ended') return;

      // Konuşma geçmişine ekle
      this.history.push({ role: 'user',      content: text });
      this.history.push({ role: 'assistant', content: result.fullText });
      this.transcript.push(`Agent: ${result.fullText}`);

      // Konuşma geçmişini 12 turda tut (bellek tasarrufu)
      if (this.history.length > 24) this.history = this.history.slice(-24);

      // Araç çağrılarını işle
      for (const tool of result.toolCalls) {
        await this._handleToolCall(tool);
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(`[Session ${this.sessionId}] Claude error:`, err.message);
      }
    }
  }

  // ── TTS Kuyruğu ──────────────────────────────────────────────────────────

  private _enqueueTts(sentence: string): void {
    if (!sentence.trim() || this.state === 'ended') return;
    this.ttsQueue.push(sentence.trim());
    if (!this.ttsProcessing) this._drainTtsQueue();
  }

  private async _drainTtsQueue(): Promise<void> {
    if (this.ttsProcessing || this.state === 'ended') return;
    if (this.ttsQueue.length === 0) {
      // Tüm cümleler bitti → dinlemeye dön
      if ((this.state as string) !== 'ended' && this.state !== 'ending') {
        this._setState('listening');
        this.isSpeaking = false;
        this._resetSilenceTimer();
      }
      return;
    }

    this.ttsProcessing = true;
    this._setState('speaking');
    this.isSpeaking    = true;

    const sentence = this.ttsQueue.shift()!;
    this.ttsAbort  = new AbortController();

    const voiceId = this.params.voiceId || getCartesiaVoiceId(this.langCfg, this.params.gender as any);

    await synthesizeStreaming({
      voiceId,
      model:    this.langCfg.cartesiaModel,
      language: this.params.language,
      text:     sentence,
      signal:   this.ttsAbort.signal,
      onChunk:  (mulaw) => this._sendAudio(mulaw),
      onDone:   () => {
        // Bir cümle bitti, sıradakine geç
      },
      onError: (err) => {
        console.error(`[Session ${this.sessionId}] TTS error:`, err.message);
      },
    });

    this.ttsProcessing = false;

    if (!this.ttsAbort?.signal.aborted && (this.state as string) !== 'ended') {
      await this._drainTtsQueue();
    }
  }

  // ── Interrupt ─────────────────────────────────────────────────────────────

  private _interrupt(): void {
    if (!this.isSpeaking) return;
    this.ttsAbort?.abort();
    this.ttsQueue     = [];
    this.ttsProcessing = false;
    this.isSpeaking   = false;
    this._clearAudio();
    if (this.state !== 'ended') this._setState('listening');
    console.log(`[Session ${this.sessionId}] Interrupted`);
  }

  // ── Speak (direkt, non-queued — greeting vb.) ─────────────────────────────

  private async _speak(text: string, isFirst = false): Promise<void> {
    if (this.state === 'ended') return;
    this._setState('speaking');
    this.isSpeaking = true;

    if (isFirst) {
      // İlk mesaj için kısa bir gecikme — hat bağlandıktan sonra konuş
      await new Promise(r => setTimeout(r, 800));
    }

    const voiceId  = this.params.voiceId || getCartesiaVoiceId(this.langCfg, this.params.gender as any);
    const abort    = new AbortController();
    this.ttsAbort  = abort;

    await synthesizeStreaming({
      voiceId,
      model:    this.langCfg.cartesiaModel,
      language: this.params.language,
      text,
      signal:   abort.signal,
      onChunk:  (m) => this._sendAudio(m),
      onDone:   () => {},
      onError:  (e) => console.error(`[Session ${this.sessionId}] Greeting TTS error:`, e.message),
    });

    this.isSpeaking = false;
    if ((this.state as string) !== 'ended') {
      this._setState('listening');
      this._resetSilenceTimer();
    }
  }

  // ── Tool Calls ────────────────────────────────────────────────────────────

  private async _handleToolCall(tool: ToolCall): Promise<void> {
    console.log(`[Session ${this.sessionId}] Tool: ${tool.name}`, tool.args);
    this.emit('tool_call', { sessionId: this.sessionId, callSid: this.callSid, ...tool });

    switch (tool.name) {
      case 'book_appointment':
        await this._endCall('appointment_booked', 'positive');
        break;
      case 'add_to_blacklist':
        await this._endCall('blacklisted', 'negative');
        break;
      case 'transfer_call':
        await this._handleTransfer();
        break;
      case 'end_call':
        await this._endCall('ai_decision', tool.args.outcome || 'unknown');
        break;
    }
  }

  private async _handleTransfer(): Promise<void> {
    if (!this.params.transferNumber) return;
    this._setState('ending');
    const transferMsg = this.params.language === 'tr'
      ? 'Sizi satış ekibimize bağlıyorum, bir an.'
      : 'Transferring you to our team, one moment.';
    await this._speak(transferMsg);
    this.emit('transfer', { sessionId: this.sessionId, callSid: this.callSid, transferNumber: this.params.transferNumber });
    // Gerçek transfer Twilio REST API üzerinden call-engine.ts tarafından yapılır
  }

  // ── End Call ──────────────────────────────────────────────────────────────

  private async _endCall(reason: string, outcome: string): Promise<void> {
    if (this.state === 'ended') return;
    this._setState('ending');

    this._interrupt();   // TTS kuyruğunu temizle (çift veda önleme)
    this._clearTimers();

    // Veda mesajını sadece silence_timeout/blacklisted/ws_close dışında söyle
    // AI tool call ile bitirdiyse zaten konuşmasında veda var (onSentence ile TTS'e gitti)
    // Ama _interrupt() kuyruğu temizledi, o yüzden kısa veda yeterli
    const needsGoodbye = !['ws_close', 'call_ended', 'voicemail_detected'].includes(reason);
    if (needsGoodbye) {
      try {
        await this._speak(this.langCfg.callEndMessage);
      } catch { /* hata olsa da aramanın bitmesine devam et */ }
    }

    this._setState('ended');
    this.deepgram?.close();

    const durationSec = Math.round((Date.now() - this.startedAt) / 1000);
    const fullTranscript = this.transcript.join('\n');

    this.emit('ended', {
      sessionId:    this.sessionId,
      callSid:      this.callSid,
      reason,
      outcome,
      durationSec,
      transcript:   fullTranscript,
      turnsCount:   this.turnsCount,
    });

    console.log(`[Session ${this.sessionId}] Ended reason=${reason} outcome=${outcome} dur=${durationSec}s turns=${this.turnsCount}`);
  }

  // ── Twilio audio helpers ──────────────────────────────────────────────────

  private _audioChunksSent = 0;
  private _sendAudio(mulawBuffer: Buffer): void {
    if (!this.streamSid) {
      console.warn(`[Session ${this.sessionId}] _sendAudio: no streamSid, dropping ${mulawBuffer.length}B`);
      return;
    }
    if (this.ws.readyState !== 1) {
      console.warn(`[Session ${this.sessionId}] _sendAudio: ws.readyState=${this.ws.readyState} (not OPEN), dropping ${mulawBuffer.length}B`);
      return;
    }
    const payload = mulawBuffer.toString('base64');
    try {
      this.ws.send(makeTwilioMediaEvent(this.streamSid, payload));
      this._audioChunksSent++;
      if (this._audioChunksSent === 1 || this._audioChunksSent % 50 === 0) {
        console.log(`[Session ${this.sessionId}] Audio sent: chunk#${this._audioChunksSent} bytes=${mulawBuffer.length} streamSid=${this.streamSid.slice(0,12)}`);
      }
    } catch (e: any) {
      console.error(`[Session ${this.sessionId}] _sendAudio ws.send error:`, e.message);
    }
  }

  private _clearAudio(): void {
    if (!this.streamSid || this.ws.readyState !== 1) return;
    try {
      this.ws.send(makeTwilioClearEvent(this.streamSid));
    } catch { /* ignore */ }
  }

  // ── State & timers ────────────────────────────────────────────────────────

  private _setState(s: CallState): void {
    if (this.state === s) return;
    this.state = s;
    this.emit('state_change', { sessionId: this.sessionId, state: s });
  }

  private _resetSilenceTimer(): void {
    this._clearSilenceTimer();
    if (this.state === 'ended' || this.state === 'speaking') return;

    this.silenceTimer = setTimeout(() => {
      if (this.state !== 'listening') return;
      console.log(`[Session ${this.sessionId}] 5s silence — prompting`);
      // Sessizlik hatırlatması — kuyruğa ekle
      this._enqueueTts(this.langCfg.silencePrompt);

      // İkinci sessizlikte kapat
      this.silenceTimer = setTimeout(() => {
        if (this.state !== 'listening') return;
        console.log(`[Session ${this.sessionId}] 15s total silence — ending`);
        this._endCall('silence_timeout', 'no_answer');
      }, 10000);
    }, 5000);
  }

  private _clearSilenceTimer(): void {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
  }

  private _clearTimers(): void {
    this._clearSilenceTimer();
    if (this.maxDurTimer) { clearTimeout(this.maxDurTimer); this.maxDurTimer = null; }
  }

  private _onWsClose(): void {
    if (this.state !== 'ended') {
      console.log(`[Session ${this.sessionId}] WS closed`);
      this._endCall('ws_close', 'unknown');
    }
  }

  /** Public: erken dış iptal (Twilio webhook: call-ended) */
  forceEnd(reason: string): void {
    if (this.state !== 'ended') this._endCall(reason, 'unknown');
  }
}
