export {};
const twilio    = require('twilio');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

import { CallSession, SessionParams } from './call-session';

// ─── LeadFlow Call Engine — Twilio tabanlı AI ses arama motoru ───────────────
// 1. makeCall()      → Twilio REST API ile outbound arama başlat
// 2. attachWss()     → HTTP upgrade'i WebSocket sunucusuna bağla
// 3. Twilio → wss   → CallSession (per-call orkestratör)

const API_BASE = process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app';

// Aktif session'ları sakla (streamSid → CallSession)
const activeSessions = new Map<string, CallSession>();
// Pending: callSid → params (session henüz WebSocket bağlantısı kurmamış)
const pendingCalls   = new Map<string, SessionParams>();

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

  // TwiML webhook URL'i — sessionId parametresiyle geliyor
  const twimlUrl = `${API_BASE}/api/engine/twiml/${p.params.sessionId}`;
  const statusCb = `${API_BASE}/api/engine/status/${p.params.sessionId}`;

  // Müşterinin doğrulanan numarası varsa callerId olarak kullan
  // (Aranan kişi müşterinin kendi numarasını görür, LeadFlow'un Twilio numarasını değil)
  const callOptions: any = {
    to:                    p.to,
    from:                  fromNumber,
    url:                   twimlUrl,
    statusCallback:        statusCb,
    statusCallbackEvent:   ['initiated', 'ringing', 'answered', 'completed'],
    statusCallbackMethod:  'POST',
    record:                true,
    recordingStatusCallback: `${API_BASE}/api/engine/recording/${p.params.sessionId}`,
    timeout:               30,
    machineDetection:      'Enable',
    machineDetectionTimeout: 5,
  };

  if (p.params.callerId) {
    callOptions.callerId = p.params.callerId;
    console.log(`[Engine] Using verified callerId=${p.params.callerId}`);
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

          session = new CallSession(ws, params);
          activeSessions.set(streamSid, session);

          _bindSessionEvents(session);
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
    await getSupabase()
      .from('voice_calls')
      .update({ status: 'failed', end_reason: status, ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  // Sesli mesaj algılandıysa kapat
  if (body.AnsweredBy === 'machine_start' || body.AnsweredBy === 'fax') {
    const session = [...activeSessions.values()].find(s => s.callSid === body.CallSid);
    session?.forceEnd('voicemail_detected');
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
