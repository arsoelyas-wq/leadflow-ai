export {};
const express = require('express');
const twilio  = require('twilio');

import {
  makeCall,
  onTwilioStatus,
  onRecordingComplete,
  getActiveSessionCount,
} from '../engines/voice/call-engine';

const router = express.Router();

// Twilio webhook imza doğrulama middleware'i
// Status ve recording callback'lerini sahte isteklerden korur
function twilioSigCheck(req: any, res: any, next: any): void {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return next(); // dev ortamında key yoksa geç
  const signature = (req.headers['x-twilio-signature'] as string) || '';
  const apiBase   = (process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app').replace(/\/$/, '');
  const url       = `${apiBase}${req.originalUrl}`;
  const valid     = twilio.validateRequest(authToken, signature, url, req.body || {});
  if (!valid) {
    console.warn(`[Engine] Twilio imzası geçersiz: url=${url} ip=${req.ip}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ─── TwiML webhook — Twilio araması bağlandığında buraya gelir ────────────────
// Media Streams başlat → WebSocket URL'ini ver
// GET /api/engine/twiml/:sessionId

router.get('/twiml/:sessionId', (req: any, res: any) => {
  const { sessionId } = req.params;
  const wsBase = (process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app')
    .replace(/^https?:\/\//, 'wss://');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsBase}/api/engine/ws/${sessionId}">
      <Parameter name="sessionId" value="${sessionId}"/>
    </Stream>
  </Connect>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  res.send(twiml);
});

// POST da destekle (Twilio bazen POST gönderir)
router.post('/twiml/:sessionId', (req: any, res: any) => {
  const { sessionId } = req.params;
  const wsBase = (process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app')
    .replace(/^https?:\/\//, 'wss://');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsBase}/api/engine/ws/${sessionId}">
      <Parameter name="sessionId" value="${sessionId}"/>
    </Stream>
  </Connect>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  res.send(twiml);
});

// ─── Twilio Call Status Callback ──────────────────────────────────────────────
// POST /api/engine/status/:sessionId

router.post('/status/:sessionId', twilioSigCheck, async (req: any, res: any) => {
  const { sessionId } = req.params;
  const callStatus    = req.body.CallStatus || '';
  console.log(`[Engine] Status callback sessionId=${sessionId} status=${callStatus} answeredBy=${req.body.AnsweredBy || '-'}`);

  try {
    await onTwilioStatus(sessionId, callStatus, req.body);
  } catch (e: any) {
    console.error('[Engine] Status callback error:', e.message);
  }

  res.sendStatus(200);
});

// ─── Twilio Recording Complete Callback ───────────────────────────────────────
// POST /api/engine/recording/:sessionId

router.post('/recording/:sessionId', twilioSigCheck, async (req: any, res: any) => {
  const { sessionId } = req.params;
  const url           = req.body.RecordingUrl || '';
  if (url) {
    console.log(`[Engine] Recording ready sessionId=${sessionId} url=${url}`);
    try { await onRecordingComplete(sessionId, url + '.mp3'); } catch { /* non-fatal */ }
  }
  res.sendStatus(200);
});

// ─── Test call — auth gerektiren, lead ID olmadan direkt numara ile test ───────
// POST /api/engine/test-call  (authenticated)
// Body: { phoneNumber, agentName?, language? }

const { authMiddleware } = require('../middleware/auth');
const { createClient: _createSupabaseClient } = require('@supabase/supabase-js');

router.post('/test-call', authMiddleware, async (req: any, res: any) => {
  try {
    const { phoneNumber, agentName = 'Test Agent', language = 'tr' } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber zorunlu' });

    const supabaseTest = _createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Geçici voice_calls kaydı oluştur
    const { data: callRecord, error: insertErr } = await supabaseTest.from('voice_calls').insert([{
      user_id:        req.userId,
      lead_id:        null,
      callee_number:  phoneNumber,
      caller_number:  '',
      status:         'initiating',
      language,
      notes:          'test_call:engine_test',
    }]).select().single();

    if (!callRecord) throw new Error(insertErr?.message || 'voice_calls insert başarısız');

    res.json({ ok: true, callId: callRecord.id, message: `${phoneNumber} numarası test için aranıyor...` });

    (async () => {
      try {
        const { makeCall: engineMakeCall } = require('../engines/voice/call-engine');
        await engineMakeCall({
          to:            phoneNumber,
          voiceCallDbId: callRecord.id,
          params: {
            callSid:           '',
            sessionId:         callRecord.id,
            language,
            conversationStyle: 'consultant',
            agentName,
            companyName:       'LeadFlow',
            productDesc:       'LeadFlow AI — satış otomasyonu ve yapay zeka destekli arama sistemi',
            leadName:          'Test Kullanıcı',
            leadCompany:       '',
            openingLine:       `Merhaba, ben ${agentName}. LeadFlow Voice Engine test aramasıdır — sistem düzgün çalışıyor mu kontrol ediyoruz.`,
            voiceId:           '5a31e4fb-f823-4359-aa91-82c0ae9a991c',
          },
        });
      } catch (e: any) {
        console.error('[Engine] test-call error:', e.message);
        await supabaseTest.from('voice_calls')
          .update({ status: 'failed', end_reason: e.message })
          .eq('id', callRecord.id);
      }
    })();
  } catch (e: any) {
    console.error('[Engine] /test-call route error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Health / diagnostics ─────────────────────────────────────────────────────
// GET /api/engine/health  (public — monitoring için)

router.get('/health', (_req: any, res: any) => {
  const env = {
    TWILIO_ACCOUNT_SID:  process.env.TWILIO_ACCOUNT_SID ? '✅' : '❌ EKSİK',
    TWILIO_AUTH_TOKEN:   process.env.TWILIO_AUTH_TOKEN  ? '✅' : '❌ EKSİK',
    TWILIO_PHONE_TR:     process.env.TWILIO_PHONE_TR    || '❌ EKSİK',
    TWILIO_PHONE_EN:     process.env.TWILIO_PHONE_EN    || '—',
    DEEPGRAM_API_KEY:    process.env.DEEPGRAM_API_KEY   ? '✅' : '❌ EKSİK',
    ANTHROPIC_API_KEY:   process.env.ANTHROPIC_API_KEY  ? '✅' : '❌ EKSİK',
    CARTESIA_API_KEY:    process.env.CARTESIA_API_KEY   ? '✅' : '❌ EKSİK',
    SUPABASE_URL:        process.env.SUPABASE_URL        ? '✅' : '❌ EKSİK',
  };
  const allOk = Object.values(env).every(v => !v.toString().startsWith('❌'));
  res.json({
    ok:              allOk,
    engine:          'LeadFlow Voice Engine v1.0',
    activeSessions:  getActiveSessionCount(),
    env,
  });
});

module.exports = router;
