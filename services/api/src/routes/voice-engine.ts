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

router.post('/status/:sessionId', async (req: any, res: any) => {
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

router.post('/recording/:sessionId', async (req: any, res: any) => {
  const { sessionId } = req.params;
  const url           = req.body.RecordingUrl || '';
  if (url) {
    console.log(`[Engine] Recording ready sessionId=${sessionId} url=${url}`);
    try { await onRecordingComplete(sessionId, url + '.mp3'); } catch { /* non-fatal */ }
  }
  res.sendStatus(200);
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
