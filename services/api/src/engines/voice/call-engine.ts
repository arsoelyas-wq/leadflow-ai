export {};
const twilio    = require('twilio');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

import { CallSession, SessionParams } from './call-session';
import { GeminiLiveSession }          from './gemini-live-session';
import { synthesizeStreaming }         from './cartesia-bridge';
import { getLangConfig, getCartesiaVoiceId } from './voice-catalog';

// ─── LeadFlow Call Engine — Twilio tabanlı AI ses arama motoru ───────────────
// 1. makeCall()      → Twilio REST API ile outbound arama başlat
// 2. attachWss()     → HTTP upgrade'i WebSocket sunucusuna bağla
// 3. Twilio → wss   → CallSession (per-call orkestratör)

const API_BASE = process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app';

// Aktif session'ları sakla (streamSid → CallSession)
const activeSessions = new Map<string, CallSession>();
// Pending: sessionId → params (session henüz WebSocket bağlantısı kurmamış)
const pendingCalls   = new Map<string, SessionParams>();
// Greeting promise'leri — WebSocket açılınca session'a geçilir; promise tamamlanmamışsa session await eder
const _greetingPromises = new Map<string, Promise<Buffer[]>>();
// Race condition guard: status callback voicemail tespitini WS bağlanmadan önce yakaladıysa callSid burada tutulur
const _voicemailPending = new Set<string>();

/** makeCall'dan hemen sonra greeting'i Cartesia'da sentezle.
 *  30s timeout ile cold start'ı absorbe eder; Promise döner — session await eder. */
async function _presynthGreeting(params: SessionParams): Promise<Buffer[]> {
  const chunks: Buffer[] = [];
  try {
    const langCfg = getLangConfig(params.language);
    const voiceId = params.voiceId || getCartesiaVoiceId(langCfg, params.gender as any);
    await synthesizeStreaming({
      voiceId,
      model:    langCfg.cartesiaModel,
      language: params.language,
      text:     params.firstMessage,
      signal:   new AbortController().signal,
      onChunk:  (ch) => chunks.push(ch),
      onDone:   () => {},
      onError:  (e) => console.warn(`[Engine] Greeting synth error: ${e.message}`),
    });
    if (chunks.length > 0) {
      console.log(`[Engine] Greeting pre-synthesized sessionId=${params.sessionId} chunks=${chunks.length}`);
    } else {
      console.warn(`[Engine] Greeting pre-synth returned 0 chunks for sessionId=${params.sessionId}`);
    }
  } catch (e: any) {
    console.warn(`[Engine] Greeting pre-synth failed: ${e.message}`);
  }
  return chunks;
}

// ─── Cartesia keep-alive — cold start kesinlikle önleme ──────────────────────
// Sunucu başladığında ve her 20s'de bir kısa bir TTS isteği at.
// Böylece Cartesia'nın ses modeli sürekli bellekte kalır; aramalarda 0ms cold start.
// keepAliveMsecs=30s olduğu için 20s aralık TCP soketini de sıcak tutar.
async function _cartesiaPing(): Promise<void> {
  try {
    const langCfg = getLangConfig('tr');
    const voiceId = getCartesiaVoiceId(langCfg, 'female');
    const chunks: Buffer[] = [];
    await synthesizeStreaming({
      voiceId,
      model:    langCfg.cartesiaModel,
      language: 'tr',
      text:     'Merhaba.',
      signal:   new AbortController().signal,
      onChunk:  (ch) => chunks.push(ch),
      onDone:   () => {},
      onError:  (e) => console.warn(`[Engine] Cartesia ping err: ${e.message}`),
    });
    if (chunks.length > 0) {
      console.log(`[Engine] Cartesia keep-alive OK (${chunks.length} chunks)`);
    } else {
      console.warn(`[Engine] Cartesia keep-alive returned 0 chunks`);
    }
  } catch (e: any) {
    console.warn(`[Engine] Cartesia keep-alive fail: ${e.message}`);
  }
}

// Keep-alive kaldırıldı — her 20s'de TTS çağrısı gereksiz yere kredi harcıyordu.
// TCP bağlantısı cartesia-bridge.ts'deki _httpsAgent (keepAlive: true, 30s) tarafından
// zaten sıcak tutulmaktadır. Cartesia cold start < 300ms olduğundan aramayı etkilemez.

let wssInstance: any = null;
let supabase: any    = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
  }
  return supabase;
}

function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('[Engine] TWILIO_ACCOUNT_SID veya TWILIO_AUTH_TOKEN eksik');
  return twilio(sid, token);
}

// ─── Dil bazlı Twilio numara seçimi ──────────────────────────────────────────
function getTwilioFromNumber(language: string): string {
  const langToEnvKey: Record<string, string> = {
    tr: 'TWILIO_PHONE_TR',
    de: 'TWILIO_PHONE_DE',
    en: 'TWILIO_PHONE_EN',
    fr: 'TWILIO_PHONE_FR',
    ar: 'TWILIO_PHONE_AR',
    es: 'TWILIO_PHONE_ES',
    it: 'TWILIO_PHONE_IT',
    pt: 'TWILIO_PHONE_PT',
    ru: 'TWILIO_PHONE_RU',
    nl: 'TWILIO_PHONE_NL',
    pl: 'TWILIO_PHONE_PL',
    ja: 'TWILIO_PHONE_JA',
  };
  const envKey  = langToEnvKey[language] || 'TWILIO_PHONE_EN';
  const specific = process.env[envKey];
  if (specific) return specific;

  // Fallback: ilk tanımlı numarayı kullan
  for (const key of Object.values(langToEnvKey)) {
    const val = process.env[key];
    if (val) return val;
  }
  // Son çare: genel TWILIO_PHONE veya eski ElevenLabs numarası
  const generic = process.env.TWILIO_PHONE || process.env.ELEVENLABS_CALLER_NUMBER;
  if (generic) return generic;
  throw new Error('[Engine] Hiçbir TWILIO_PHONE_* env değişkeni tanımlı değil');
}

// ─── makeCall ─────────────────────────────────────────────────────────────────

export interface MakeCallParams {
  to:               string;         // E.164 hedef numara
  voiceCallDbId:    string;         // Supabase voice_calls.id
  params:           SessionParams;
}

export async function makeCall(p: MakeCallParams): Promise<{ callSid: string }> {
  const client     = getTwilioClient();
  const fromNumber = getTwilioFromNumber(p.params.language);

  // sessionId'yi pendingCalls'a ekle — WebSocket bağlandığında eşleştirilecek
  pendingCalls.set(p.params.sessionId, { ...p.params, voiceCallDbId: p.voiceCallDbId });

  // Greeting'i arka planda sentezle. Promise'i kaydet — WebSocket açılınca session await eder.
  // 30s timeout sayesinde cold start (18-20s) artık timeout'a takılmaz.
  _greetingPromises.set(p.params.sessionId, _presynthGreeting(p.params));

  // TwiML webhook URL'i — sessionId parametresiyle geliyor
  const twimlUrl = `${API_BASE}/api/engine/twiml/${p.params.sessionId}`;
  const statusCb = `${API_BASE}/api/engine/status/${p.params.sessionId}`;

  // Doğrulanan numara varsa from olarak kullan (Twilio verified caller ID olmalı)
  // Aksi halde dil bazlı Twilio numarasını kullan
  const effectiveFrom = p.params.callerId || fromNumber;

  const callOptions: any = {
    to:                    p.to,
    from:                  effectiveFrom,
    url:                   twimlUrl,
    statusCallback:        statusCb,
    statusCallbackEvent:   ['initiated', 'ringing', 'answered', 'completed'],
    statusCallbackMethod:  'POST',
    record:                true,
    recordingStatusCallback: `${API_BASE}/api/engine/recording/${p.params.sessionId}`,
    timeout:               30,
  };

  if (p.params.callerId) {
    console.log(`[Engine] Using verified callerId=${p.params.callerId} as from`);
  }

  const call = await client.calls.create(callOptions);

  console.log(`[Engine] Call created: SID=${call.sid} to=${p.to} from=${fromNumber}`);

  // callSid'yi params'a ekle
  const updated = pendingCalls.get(p.params.sessionId);
  if (updated) {
    updated.callSid = call.sid;
    pendingCalls.set(p.params.sessionId, updated);
  }

  // Supabase'de twilio_call_sid güncelle
  try {
    await getSupabase()
      .from('voice_calls')
      .update({ twilio_call_sid: call.sid, status: 'ringing', caller_number: fromNumber })
      .eq('id', p.voiceCallDbId);
  } catch (e: any) { console.warn('[Engine] Supabase update warn:', e.message); }

  return { callSid: call.sid };
}

// ─── WebSocket handler — Twilio Media Streams ─────────────────────────────────

export function attachWss(server: any): void {
  wssInstance = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req: any, socket: any, head: any) => {
    const url = req.url || '';
    if (!url.startsWith('/api/engine/ws')) {
      socket.destroy();
      return;
    }
    wssInstance.handleUpgrade(req, socket, head, (ws: any) => {
      wssInstance.emit('connection', ws, req);
    });
  });

  wssInstance.on('connection', (ws: any, req: any) => {
    // sessionId URL'den al: /api/engine/ws/:sessionId
    const parts    = (req.url || '').split('/');
    const sessionId = parts[parts.length - 1];
    console.log(`[Engine] WS connected sessionId=${sessionId} pendingKeys=[${[...pendingCalls.keys()].join(',')}]`);

    let session: CallSession | null = null;
    let streamSid = '';

    ws.on('message', async (raw: Buffer | string) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      switch (msg.event) {
        case 'connected':
          // İlk frame — henüz stream başlamadı
          break;

        case 'start': {
          streamSid        = msg.start.streamSid;
          const callSid    = msg.start.callSid;
          console.log(`[Engine] WS start event: sessionId=${sessionId} callSid=${callSid} streamSid=${streamSid}`);
          // Params'ı bul — sessionId veya callSid üzerinden
          const params     = pendingCalls.get(sessionId) || _findBySid(callSid);
          if (!params) {
            console.error(`[Engine] No params for sessionId=${sessionId} callSid=${callSid} — pendingCalls=[${[...pendingCalls.keys()].join(',')}]`);
            ws.close();
            return;
          }
          console.log(`[Engine] Params found for session=${sessionId}, starting CallSession`);
          params.callSid   = callSid;
          pendingCalls.delete(sessionId);

          // Engine seçimi: Gemini Live veya varsayılan Claude+Cartesia pipeline
          const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
          if (params.engine === 'gemini' && hasGeminiKey) {
            session = new GeminiLiveSession(ws, params) as any;
            console.log(`[Engine] GeminiLiveSession başlatılıyor: sessionId=${sessionId}`);
          } else {
            if (params.engine === 'gemini') console.warn(`[Engine] Gemini key eksik, Claude'a düşüldü`);
            session = new CallSession(ws, params);
            // Greeting promise'ini session'a geç — tamamlandıysa anında oynar, devam ediyorsa session await eder.
            // Bu sayede WebSocket açıldığında duplicate Cartesia request yapılmaz.
            const greetingP = _greetingPromises.get(sessionId);
            if (greetingP) {
              session.loadGreetingPromise(greetingP);
              _greetingPromises.delete(sessionId);
            }
          }
          activeSessions.set(streamSid, session);
          _bindSessionEvents(session);

          // Race condition: status callback voicemail'i WS bağlanmadan önce tespit ettiyse
          if (params.callSid && _voicemailPending.has(params.callSid)) {
            _voicemailPending.delete(params.callSid);
            console.log(`[Engine] Voicemail pending callSid=${params.callSid} — skipping greeting, dropping message`);
            await session.onVoicemailDetected(streamSid);
            break;
          }

          await session.onTwilioStart(streamSid);
          break;
        }

        case 'media': {
          // Yalnızca inbound (caller) sesi Deepgram'a gönder — outbound'u atla
          const track = msg.media?.track;
          if (!track || track === 'inbound') {
            session?.onAudioChunk(msg.media.payload);
          }
          break;
        }

        case 'stop':
          session?.onTwilioStop();
          break;
      }
    });

    ws.on('close', () => {
      if (streamSid) activeSessions.delete(streamSid);
    });
  });
}

function _findBySid(callSid: string): SessionParams | undefined {
  for (const [, params] of pendingCalls.entries()) {
    if (params.callSid === callSid) return params;
  }
}

// ─── Session event binding → Supabase ────────────────────────────────────────

function _bindSessionEvents(session: CallSession): void {
  session.on('state_change', ({ state }: any) => {
    _updateCallStatus(session.sessionId, state === 'ended' ? 'completed' : state);
  });

  session.on('tool_call', async ({ name, args }: any) => {
    if (name === 'book_appointment') {
      await _updateCallStatus(session.sessionId, 'completed', { outcome: 'positive', notes: `Randevu: ${args.day} ${args.time || ''}`.trim() });
    }
    if (name === 'add_to_blacklist') {
      await _updateCallStatus(session.sessionId, 'completed', { outcome: 'negative', notes: args.reason || 'Kara listeye eklendi' });
    }
  });

  session.on('transfer', async ({ transferNumber }: any) => {
    await _transferCallViaTwilio(session.callSid, transferNumber);
  });

  session.on('ended', async ({ reason, outcome, durationSec, transcript }: any) => {
    const endedAt = new Date().toISOString();
    try {
      await getSupabase()
        .from('voice_calls')
        .update({
          status:           'completed',
          outcome,
          end_reason:       reason,
          duration_seconds: durationSec,
          transcript,
          ended_at:         endedAt,
        })
        .eq('id', session.sessionId);
    } catch (e: any) { console.warn('[Engine] ended update warn:', e.message); }

    // Post-call analysis — fire and forget, never blocks
    try {
      const { data: callRow } = await getSupabase()
        .from('voice_calls')
        .select('user_id, lead_id')
        .eq('id', session.sessionId)
        .single();
      if (callRow?.user_id) {
        const { runPostCallAnalysis } = require('../../services/post-call-analysis');
        runPostCallAnalysis({
          callId:            session.sessionId,
          userId:            callRow.user_id,
          leadId:            callRow.lead_id || null,
          transcript,
          durationSec,
          language:          session.language,
          conversationStyle: session.conversationStyle,
        }).catch((e: any) => console.error('[PostCall]', e.message?.slice(0, 100)));
      }
    } catch { /* non-fatal */ }
  });
}

async function _updateCallStatus(sessionId: string, status: string, extra: Record<string, any> = {}): Promise<void> {
  try {
    await getSupabase()
      .from('voice_calls')
      .update({ status, ...extra })
      .eq('id', sessionId);
  } catch { /* non-fatal */ }
}

async function _transferCallViaTwilio(callSid: string, transferTo: string): Promise<void> {
  try {
    const client = getTwilioClient();
    const twiml  = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>${transferTo}</Dial></Response>`;
    await client.calls(callSid).update({ twiml });
    console.log(`[Engine] Transfer ${callSid} → ${transferTo}`);
  } catch (e: any) { console.error('[Engine] Transfer error:', e.message); }
}

// ─── Webhook helpers (çağrı kaydı tamamlandığında) ───────────────────────────

export async function onTwilioStatus(sessionId: string, status: string, body: Record<string, any>): Promise<void> {
  const statusMap: Record<string, string> = {
    initiated:  'initiating',
    ringing:    'ringing',
    answered:   'answered',
    'no-answer': 'failed',
    busy:       'failed',
    failed:     'failed',
    completed:  'completed',
  };
  const mapped = statusMap[status] || status;

  if (status === 'answered') {
    await _updateCallStatus(sessionId, 'in_progress');
  } else if (['no-answer', 'busy', 'failed'].includes(status)) {
    _voicemailPending.delete(body.CallSid || '');  // WS hiç bağlanmadıysa temizle
    await getSupabase()
      .from('voice_calls')
      .update({ status: 'failed', end_reason: status, ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  // Sesli mesaj kutusuna düştü — mesaj bırak ve kapat
  if (body.AnsweredBy === 'machine_start' || body.AnsweredBy === 'fax') {
    const session = [...activeSessions.values()].find(s => s.callSid === body.CallSid);
    if (session) {
      // Session zaten çalışıyor — voicemail mesajını çal ve kapat
      session.dropVoicemail().catch((e: any) => console.error('[Engine] dropVoicemail err:', e.message));
    } else {
      // WS henüz bağlanmadı — WS bağlandığında flag'i görecek
      _voicemailPending.add(body.CallSid || '');
      console.log(`[Engine] Voicemail flagged (WS not yet connected): callSid=${body.CallSid}`);
    }
  }
}

export async function onRecordingComplete(sessionId: string, recordingUrl: string): Promise<void> {
  try {
    await getSupabase()
      .from('voice_calls')
      .update({ recording_url: recordingUrl })
      .eq('id', sessionId);
  } catch { /* non-fatal */ }
}

export function getActiveSessionCount(): number {
  return activeSessions.size;
}
