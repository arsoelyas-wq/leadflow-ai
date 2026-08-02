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
  businessContext?: string;
  maxDurationSec:   number;
  callerId?:        string;   // Müşterinin doğrulanan numarası (Twilio Verified Caller ID)
  engine?:          'claude' | 'gemini';  // AI motoru seçimi (varsayılan: claude)
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

    // İlk mesajı söyle — önce greeting, SONRA filler warm-up
    // (greeting Cartesia bağlantısını kurar; ardından filler'lar warm bağlantıyla hızlı sentezlenir)
    await this._speak(this.params.firstMessage, true);

    // Greeting bitti → artık Cartesia bağlantısı warm → filler'ları arka planda sentezle
    this._warmFillers().catch(() => {});
  }

  /** Filler seslerini Cartesia'da önceden sentezle ve cache'e yaz */
  private async _warmFillers(): Promise<void> {
    const voiceId = this.params.voiceId || getCartesiaVoiceId(this.langCfg, this.params.gender as any);
    for (const filler of this.langCfg.fillerResponses) {
      if (this.state === 'ended') break;
      const chunks: Buffer[] = [];
      await synthesizeStreaming({
        voiceId,
        model:    this.langCfg.cartesiaModel,
        language: this.params.language,
        text:     filler,
        signal:   new AbortController().signal,
        onChunk:  (ch) => chunks.push(ch),
        onDone:   () => {},
        onError:  () => {},
      });
      if (chunks.length > 0) {
        this._fillerCache.set(filler, chunks);
        console.log(`[Session ${this.sessionId}] Filler cached: "${filler}" (${chunks.length} chunks)`);
      }
    }
  }

  // Echo-cancellation: AI konuşurken ve bitiminden sonra kısa süre audio'yu durdur
  private _echoGuard = false;
  private _echoTimer: NodeJS.Timeout | null = null;

  /** Twilio'dan gelen μ-law audio chunk */
  onAudioChunk(mulawBase64: string): void {
    if (this.state === 'ended' || this.state === 'idle') return;
    // Audio her zaman Deepgram'a gider — isSpeaking'e bakılmaz.
    // Barge-in ve echo filtresi transcript seviyesinde yapılır.
    const buf = Buffer.from(mulawBase64, 'base64');
    this.deepgram?.sendAudio(buf);
  }

  /** AI konuşmayı bitirince echo settling süresi başlat (transcript seviyesinde) */
  private _startEchoGuard(ms = 600): void {
    this._echoGuard = true;
    // Guard başlayınca echo filtresi süresini güncelle — yavaş Cartesia synthesis'te
    // _lastAiTextExpiry erken dolabilir; guard + 2s tampon ekle
    if (this._lastAiText) {
      this._lastAiTextExpiry = Math.max(this._lastAiTextExpiry, Date.now() + ms + 2000);
    }
    if (this._echoTimer) clearTimeout(this._echoTimer);
    this._echoTimer = setTimeout(() => {
      this._echoGuard = false;
      this._echoTimer = null;
      console.log(`[Session ${this.sessionId}] Echo guard cleared — listening for user input`);
      // NOT: _resetSilenceTimer() burada çağrılmaz.
      // Silence prompt'un callback'i 12s final-chance timer'ı bu callback ile ezilmesin.
      // Silence timer'ı _speak() ve _drainTtsQueue() zaten doğru noktada başlatıyor.
      this._onTtsDone();
    }, ms);
  }

  /** Transcript'in AI'nın son söylediği metnin echo'su olup olmadığını tahmin et */
  private _isEchoLikely(transcript: string): boolean {
    if (!this._lastAiText || Date.now() > this._lastAiTextExpiry) return false;
    const norm = (s: string) => s.toLowerCase().replace(/[.,!?'"]/g, '').trim();
    const tWords = norm(transcript).split(/\s+/).filter(w => w.length > 1);
    const aWords = new Set(norm(this._lastAiText).split(/\s+/).filter(w => w.length > 1));
    if (tWords.length === 0) return false;
    const matchCount = tWords.filter(w => aWords.has(w)).length;
    // 2+ kelime eşleşmesi VE transcript'in %50'si AI metninde ise echo sayılır
    return matchCount >= 2 && matchCount / tWords.length >= 0.5;
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

  private _buildKeyterms(): string[] {
    const terms: string[] = [];
    if (this.params.agentName)   terms.push(this.params.agentName);
    if (this.params.companyName) terms.push(this.params.companyName);
    if (this.params.leadName)    terms.push(this.params.leadName);
    if (this.params.leadCompany) terms.push(this.params.leadCompany);
    // 2-3 kelimelik şirket isimlerini de ayrı ayrı ekle
    return terms.filter(t => t.trim().length > 2).slice(0, 10);
  }

  private _pendingUserText       = '';  // barge-in sırasında biriken metin
  private _processingLock        = false; // aynı anda birden fazla Claude çağrısını önle
  private _claudeAbort:          AbortController | null = null; // aktif LLM isteği abort controller
  private _expectedPlaybackEndMs = 0;   // son gönderilen audio byte'ın Twilio'da biteceği tahmini zaman
  private _lastAiText            = '';  // echo filtresi: AI'nın son söylediği metin
  private _lastAiTextExpiry      = 0;  // _lastAiText geçerlilik süresi (unix ms)
  private _fillerCache           = new Map<string, Buffer[]>(); // önceden sentezlenmiş filler ses dosyaları

  private _onTranscript(text: string, isFinal: boolean, confidence: number, isInterim: boolean): void {
    if (this.state === 'ended') return;

    const isFiller = this.langCfg.fillerWords.has(text.toLowerCase().trim());

    // ── Barge-in: AI konuşurken kullanıcı söz kesti ──
    if (this.isSpeaking && !isFiller) {
      const wordCount  = text.trim().split(/\s+/).length;
      const confOk     = confidence >= this.langCfg.silenceConfidenceThreshold;
      const wordsOk    = wordCount  >= this.langCfg.minWordsToBarge;
      if (confOk && wordsOk) {
        if (this._isEchoLikely(text)) {
          // AI'nın kendi sesinin echo'su — barge-in tetikleme, yoksay
          console.log(`[Session ${this.sessionId}] Barge-in echo filtered: "${text}" conf=${confidence.toFixed(2)}`);
        } else {
          console.log(`[Session ${this.sessionId}] Barge-in: "${text}" conf=${confidence.toFixed(2)}`);
          this._interrupt();
          this._pendingUserText = text;
        }
      }
    }

    if (isFinal && text.trim().length > 0) {
      this.lastFinalAt   = Date.now();
      this.interimBuffer = '';

      const fullText   = text.trim();
      const normalized = fullText.toLowerCase();

      console.log(`[Session ${this.sessionId}] Final transcript: "${fullText}" state=${this.state} echo=${this._echoGuard}`);

      // AI'nın kendi sesinin echo'su — yoksay
      if (this._isEchoLikely(fullText)) {
        console.log(`[Session ${this.sessionId}] Echo filtered: "${fullText}"`);
        return;
      }

      // Sona erme ifadesi — sadece echo guard dışında ve listening'de işle
      if (!this._echoGuard && this.state === 'listening') {
        const isEndPhrase = this.langCfg.endCallPhrases.some(p => normalized.includes(p));
        if (isEndPhrase) {
          this._endCall('end_phrase', 'unknown');
          return;
        }
      }

      // ── GUARD: sadece 'listening' state'inde ve echo penceresi dışında işle ──
      if (this.state === 'listening' && !this._processingLock && !this._echoGuard) {
        this._clearSilenceTimer();
        this._pendingUserText = '';
        this.transcript.push(`Lead: ${fullText}`);
        this._processUserInput(fullText);
      } else {
        console.log(`[Session ${this.sessionId}] Transcript dropped (state=${this.state} echoGuard=${this._echoGuard} conf=${confidence.toFixed(2)}): "${fullText}"`);
      }
    }

    // Konuşma sonu sessizlik timer'ı — sadece listening modunda
    if (this.state === 'listening' && (isFinal || isInterim)) {
      this._resetSilenceTimer();
    }
  }

  // ── LLM & TTS pipeline ────────────────────────────────────────────────────

  // Filler: LLM düşünürken kısa doğal ses — gecikmeyi gizler
  private _getRandomFiller(): string | null {
    const fillers = this.langCfg.fillerResponses;
    if (!fillers || fillers.length === 0) return null;
    // Aynı filleri arka arkaya tekrarlamamak için basit rotasyon
    const idx = this.turnsCount % fillers.length;
    return fillers[idx];
  }

  private async _processUserInput(text: string): Promise<void> {
    if (this.state === 'ended') return;
    if (this._processingLock) return;
    this._processingLock = true;
    this._setState('processing');
    this._clearSilenceTimer();  // AI yanıt üretirken timer çalışmasın; _drainTtsQueue TTS bitince reset eder
    this.turnsCount++;

    // Bu AI yanıt turu için tracking'leri sıfırla
    this._expectedPlaybackEndMs = 0;

    // Filler: LLM yanıt üretirken boşluğu doldur — sadece ≥2 kelimelik yanıtlarda doğal
    const wordCount = text.trim().split(/\s+/).length;
    const filler = wordCount >= 2 ? this._getRandomFiller() : null;
    if (filler && !this.isSpeaking) {
      const cached = this._fillerCache.get(filler);
      if (cached && cached.length > 0) {
        // Cache'ten anında çal — Cartesia gecikmesi yok
        this._lastAiText = (this._lastAiText + ' ' + filler).trim().slice(-200);
        this._lastAiTextExpiry = Date.now() + 3000;
        for (const chunk of cached) this._sendAudio(chunk);
        console.log(`[Session ${this.sessionId}] Filler instant: "${filler}"`);
      } else {
        this._enqueueTts(filler);
      }
    }

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
      businessContext:    this.params.businessContext,
    };

    this._claudeAbort = new AbortController();

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
        this._claudeAbort.signal,
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
    } finally {
      this._processingLock = false;
      this._claudeAbort = null;
      // Barge-in sırasında yakalanan metin varsa ve şimdi işlenebiliyorsa işle
      const pending = this._pendingUserText.trim();
      if (pending && this.state === 'listening' && !this._echoGuard) {
        this._pendingUserText = '';
        this.transcript.push(`Lead: ${pending}`);
        this._processUserInput(pending);
      }
    }
  }

  // ── TTS Kuyruğu ──────────────────────────────────────────────────────────

  private _enqueueTts(sentence: string): void {
    if (!sentence.trim() || this.state === 'ended') return;
    // LLM barge-in ile iptal edildiyse yeni cümleleri kuyruğa ekleme
    if (this._claudeAbort?.signal.aborted) return;
    // Echo filtresi için AI metnini takip et (son ~200 karakter yeterli)
    this._lastAiText = (this._lastAiText + ' ' + sentence.trim()).trim().slice(-200);
    this._lastAiTextExpiry = Date.now() + 3000;
    this.ttsQueue.push(sentence.trim());
    if (!this.ttsProcessing) this._drainTtsQueue();
  }

  private async _drainTtsQueue(): Promise<void> {
    if (this.ttsProcessing || this.state === 'ended') return;
    if (this.ttsQueue.length === 0) {
      // LLM hâlâ yanıt üretiyorsa bekle — önce filler çalındı, asıl yanıt geliyor
      if (this._processingLock) {
        this.isSpeaking = false;
        this._setState('processing');  // LLM bekleniyor, listening'e geçme
        return;
      }
      // Tüm cümleler bitti → dinlemeye dön
      if ((this.state as string) !== 'ended' && this.state !== 'ending') {
        this.isSpeaking = false;
        // Dinamik echo guard: tüm AI audio Twilio'da bitene kadar bekle
        const guardMs = this._calcEchoGuardMs();
        console.log(`[Session ${this.sessionId}] TTS done — echo guard: ${guardMs}ms`);
        this._startEchoGuard(guardMs);
        this._setState('listening');
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

    try {
      await synthesizeStreaming({
        voiceId,
        model:    this.langCfg.cartesiaModel,
        language: this.params.language,
        text:     sentence,
        signal:   this.ttsAbort.signal,
        onChunk:  (mulaw) => this._sendAudio(mulaw),
        onDone:   () => {},
        onError:  (err) => {
          console.error(`[Session ${this.sessionId}] TTS error:`, err.message);
        },
      });
    } finally {
      this.ttsProcessing = false;
    }

    if (!this.ttsAbort?.signal.aborted && (this.state as string) !== 'ended') {
      await this._drainTtsQueue();
    }
  }

  // TTS bittikten sonra çağrılır — listening'e geçince barge-in metnini işle
  private _onTtsDone(): void {
    if (this.state === 'ended' || this.state === 'ending') return;
    // Lock varsa bekle — _processUserInput'un finally bloğu işleyecek
    if (this._processingLock) return;

    // Barge-in sırasında yakalanan metin varsa işle
    const pending = this._pendingUserText.trim();
    this._pendingUserText = '';
    if (pending.length > 0) {
      console.log(`[Session ${this.sessionId}] Processing barge-in text: "${pending}"`);
      this.transcript.push(`Lead: ${pending}`);
      this._processUserInput(pending);
    }
  }

  // ── Interrupt ─────────────────────────────────────────────────────────────

  private _interrupt(): void {
    if (!this.isSpeaking) return;
    this.ttsAbort?.abort();
    this._claudeAbort?.abort();   // LLM'i de durdur — yeni cümle üretimini kes
    this.ttsQueue     = [];
    this.ttsProcessing = false;
    this.isSpeaking   = false;
    this._clearAudio();
    if (this.state !== 'ended') this._setState('listening');
    this._clearSilenceTimer();    // eski timer'ı temizle
    this._startEchoGuard(400);   // kısa echo guard → _onTtsDone → pending işle
    this._resetSilenceTimer();    // taze 10s timer
    console.log(`[Session ${this.sessionId}] Interrupted`);
  }

  // ── Speak (direkt, non-queued — greeting vb.) ─────────────────────────────

  // resetTimer=false: silence prompt gibi durumlarda timer'ı yeniden başlatma
  private async _speak(text: string, isFirst = false, resetTimer = true): Promise<void> {
    if (this.state === 'ended') return;
    this._setState('speaking');
    this.isSpeaking = true;
    this._expectedPlaybackEndMs = 0;  // bu konuşma için byte takibini sıfırla
    // Echo filtresi için AI metnini takip et
    this._lastAiText = text;
    this._lastAiTextExpiry = Date.now() + 3000;

    if (isFirst) {
      await new Promise(r => setTimeout(r, 50));  // Twilio stream hazırlanması için minimal bekleme
    }

    const voiceId  = this.params.voiceId || getCartesiaVoiceId(this.langCfg, this.params.gender as any);
    const abort    = new AbortController();
    this.ttsAbort  = abort;

    let chunksSent = 0;
    const doSynth = () => synthesizeStreaming({
      voiceId,
      model:    this.langCfg.cartesiaModel,
      language: this.params.language,
      text,
      signal:   abort.signal,
      onChunk:  (m) => { chunksSent++; this._sendAudio(m); },
      onDone:   () => {},
      onError:  (e) => console.error(`[Session ${this.sessionId}] TTS error:`, e.message),
    });

    try {
      await doSynth();
      // Cartesia 0 chunk döndürdüyse (geçici hata) bir kez daha dene
      if (chunksSent === 0 && !abort.signal.aborted && (this.state as string) !== 'ended') {
        console.warn(`[Session ${this.sessionId}] TTS 0 chunks — retrying "${text.slice(0, 40)}"`);
        await new Promise(r => setTimeout(r, 500));
        chunksSent = 0;
        await doSynth();
      }
    } finally {
      this.isSpeaking = false;
    }

    if ((this.state as string) !== 'ended') {
      // Dinamik echo guard: Twilio'nun audio buffer'ı ne zaman bitecek?
      // Barge-in ile kesildi → kısa guard (kullanıcı zaten konuşuyor)
      const guardMs = abort.signal.aborted ? 150 : this._calcEchoGuardMs();
      console.log(`[Session ${this.sessionId}] Echo guard: ${guardMs}ms (playbackEnd=${this._expectedPlaybackEndMs} now=${Date.now()})`);
      this._startEchoGuard(guardMs);
      this._setState('listening');
      if (resetTimer) this._resetSilenceTimer();
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
      // Twilio'nun audio buffer'ını takip et — echo guard süresini doğru hesaplamak için
      // μ-law 8kHz = 8000 byte/sn → her chunk için tahmini oynatma bitiş zamanı güncellenir
      const durationMs = mulawBuffer.length / 8;
      const now = Date.now();
      this._expectedPlaybackEndMs = Math.max(this._expectedPlaybackEndMs, now) + durationMs;
    } catch (e: any) {
      console.error(`[Session ${this.sessionId}] _sendAudio ws.send error:`, e.message);
    }
  }

  // Gönderilen audio byte'larından Twilio'nun ne zaman biteceğini hesapla
  private _calcEchoGuardMs(): number {
    const remaining = Math.max(0, this._expectedPlaybackEndMs - Date.now());
    // Twilio AEC (Acoustic Echo Cancellation) AI sesini büyük ölçüde iptal eder.
    // Uzun guard kullanıcıyı 5-6s sağır bırakıyor — 1000ms tavan yeterli.
    return Math.max(400, Math.min(remaining + 400, 1000));
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

    // 18s sessizlik → bir kez soru sor, sonra 12s daha bekliyorsa kapat
    // 18s: AI yanıt üretme + TTS süresi (8-10s) + kullanıcı düşünme süresi
    this.silenceTimer = setTimeout(async () => {
      if (this.state !== 'listening') return;
      console.log(`[Session ${this.sessionId}] 18s silence — prompting once`);

      await this._speak(this.langCfg.silencePrompt, false, false);

      // Son şans: 12s daha bekliyorsa aramayı kapat
      if ((this.state as string) !== 'ended' && (this.state as string) !== 'ending') {
        this.silenceTimer = setTimeout(() => {
          if (this.state !== 'listening') return;
          console.log(`[Session ${this.sessionId}] 30s total silence — ending`);
          this._endCall('silence_timeout', 'no_answer');
        }, 12000);
      }
    }, 10000);
  }

  private _clearSilenceTimer(): void {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
  }

  private _clearTimers(): void {
    this._clearSilenceTimer();
    if (this.maxDurTimer) { clearTimeout(this.maxDurTimer); this.maxDurTimer = null; }
    if (this._echoTimer)  { clearTimeout(this._echoTimer);  this._echoTimer = null; }
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
