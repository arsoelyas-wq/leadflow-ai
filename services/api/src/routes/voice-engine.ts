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

// ─── Test call — JWT_SECRET ile basit doğrulama, DB gerektirmez ───────────────
// POST /api/engine/test-call
// Header: x-test-key: <JWT_SECRET değeri>
// Body: { phoneNumber, agentName?, language? }

router.post('/test-call', async (req: any, res: any) => {
  try {
    const key        = (req.headers['x-test-key'] as string) || (req.body.testKey as string) || '';
    const validKeys  = [
      'LF_ENGINE_TEST_2026',              // sabit test anahtarı
      process.env.JWT_SECRET || '',        // Railway JWT_SECRET
      process.env.TWILIO_AUTH_TOKEN || '', // Railway Twilio token
    ].filter(Boolean);
    if (!validKeys.some(k => k === key)) {
      return res.status(403).json({ error: 'Forbidden — geçersiz x-test-key' });
    }

    const { phoneNumber, language = 'tr', engine = 'claude' } = req.body;
    const gender: 'male' | 'female' = req.body.gender === 'female' ? 'female' : 'male';
    const defaultName = gender === 'female' ? 'Zeynep' : 'Ahmet';
    const agentName: string = req.body.agentName || defaultName;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber zorunlu' });

    // Cinsiyet ile eşleşen ses ID'sini seç
    const { getLangConfig, getCartesiaVoiceId } = require('../engines/voice/voice-catalog');
    const langCfg = getLangConfig(language);
    const resolvedVoiceId: string = req.body.voiceId || getCartesiaVoiceId(langCfg, gender);

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (engine === 'gemini' && !geminiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY veya GOOGLE_AI_API_KEY env değişkeni tanımlı değil' });
    }

    const crypto = require('crypto');
    const testId = crypto.randomUUID();

    res.json({ ok: true, callId: testId, engine, voiceId: resolvedVoiceId, agentName, gender, message: `${phoneNumber} aranıyor (${engine} test ${gender})...` });

    // Arka planda Twilio araması başlat (DB kaydı olmadan)
    (async () => {
      try {
        const { makeCall: engineMakeCall } = require('../engines/voice/call-engine');
        await engineMakeCall({
          to:            phoneNumber,
          voiceCallDbId: testId,
          params: {
            callSid:           '',
            sessionId:         testId,
            language,
            conversationStyle: 'consultant',
            agentName,
            companyName:       'LeadFlow',
            productDesc:       'LeadFlow AI — satış otomasyonu ve yapay zeka destekli arama sistemi',
            leadName:          'Test Kullanıcı',
            leadCompany:       '',
            firstMessage:      `Merhaba! Nasılsınız? Ben ${agentName}.`,
            voiceId:           resolvedVoiceId,
            maxDurationSec:    300,   // 5 dakika test süresi
            gender:            gender,
            engine:            engine as 'claude' | 'gemini',
          },
        });
        console.log(`[Engine] Test call dispatched: ${phoneNumber} testId=${testId}`);
      } catch (e: any) {
        console.error('[Engine] test-call fire error:', e.message);
      }
    })();
  } catch (e: any) {
    console.error('[Engine] /test-call route error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Model discovery — hangi Cartesia modelleri çalışıyor ──────────────────────
// GET /api/engine/test-models
router.get('/test-models', async (_req: any, res: any) => {
  const axios = require('axios');
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'CARTESIA_API_KEY yok' });

  // Önce mevcut modelleri listele
  let listedModels: string[] = [];
  try {
    const modelsResp = await axios.get('https://api.cartesia.ai/models', {
      headers: { 'X-API-Key': apiKey, 'Cartesia-Version': '2024-06-10' },
      timeout: 8000,
    });
    if (Array.isArray(modelsResp.data)) listedModels = modelsResp.data.map((m: any) => m.id || m.name || JSON.stringify(m));
    else if (modelsResp.data?.models) listedModels = modelsResp.data.models.map((m: any) => m.id || m.name || JSON.stringify(m));
    else listedModels = [JSON.stringify(modelsResp.data).slice(0, 500)];
  } catch (e: any) { listedModels = [`err: ${e.response?.status} ${Buffer.from(e.response?.data||'').toString().slice(0,100)}`]; }

  const candidates = [
    ...listedModels.filter(m => !m.startsWith('err') && !m.startsWith('{')),
    'sonic-2024-12-12', 'sonic-2025-01-09', 'sonic-preview-2024-11-13',
    'sonic-multilingual', 'sonic-english', 'sonic', 'sonic-2',
    'sonic-3', 'sonic-turbo', 'sonic-2025-03-07', 'atlas', 'ariel',
  ];

  const results: any[] = [];
  for (const model of candidates) {
    try {
      const r = await axios.post('https://api.cartesia.ai/tts/bytes', {
        model_id: model,
        voice: { mode: 'id', id: '5a31e4fb-f823-4359-aa91-82c0ae9a991c' },
        transcript: 'test',
        output_format: { container: 'raw', encoding: 'pcm_s16le', sample_rate: 8000 },
        language: 'tr',
      }, {
        headers: { 'X-API-Key': apiKey, 'Cartesia-Version': '2024-06-10', 'Content-Type': 'application/json', 'Accept': 'audio/pcm' },
        responseType: 'arraybuffer',
        timeout: 8000,
      });
      results.push({ model, ok: true, bytes: r.data.byteLength, status: r.status });
    } catch (e: any) {
      const msg = e.response ? Buffer.from(e.response.data || '').toString().slice(0, 120) : e.message;
      results.push({ model, ok: false, status: e.response?.status, error: msg });
    }
  }

  res.json({ listedModels, results, working: results.filter(r => r.ok).map(r => r.model) });
});

// ─── Direct TTS test — model/voice/language doğrulama (telefon aramadan) ──────
// GET /api/engine/test-tts
router.get('/test-tts', async (_req: any, res: any) => {
  const axios = require('axios');
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'CARTESIA_API_KEY yok' });

  const testText   = 'Merhaba, LeadFlow ses motoru test ediliyor.';
  const voiceId    = '5a31e4fb-f823-4359-aa91-82c0ae9a991c';
  const model      = 'sonic-3';
  const language   = 'tr';
  const sampleRate = 8000;

  const body = {
    model_id:      model,
    voice:         { mode: 'id', id: voiceId },
    transcript:    testText,
    output_format: { container: 'raw', encoding: 'pcm_s16le', sample_rate: sampleRate },
    language,
  };

  try {
    const response = await axios.post('https://api.cartesia.ai/tts/bytes', body, {
      headers: {
        'X-API-Key':        apiKey,
        'Cartesia-Version': '2024-06-10',
        'Content-Type':     'application/json',
        'Accept':           'audio/pcm',
      },
      responseType: 'arraybuffer',
      timeout:      15000,
    });

    const bytes  = response.data.byteLength;
    const durationMs = Math.round(bytes / 2 / sampleRate * 1000);  // PCM s16le = 2 bytes/sample

    res.json({
      ok:           true,
      cartesiaStatus: response.status,
      model,
      voiceId,
      language,
      sampleRate,
      bytesReceived: bytes,
      estimatedDurationMs: durationMs,
      firstBytesHex: Buffer.from(response.data).slice(0, 16).toString('hex'),
    });
  } catch (err: any) {
    let detail = err.message;
    if (err.response) {
      const buf = Buffer.from(err.response.data || '');
      detail = buf.toString('utf-8').slice(0, 500) || `HTTP ${err.response.status}`;
    }
    res.status(502).json({
      ok:     false,
      status: err.response?.status,
      error:  detail,
      model,
      voiceId,
      language,
    });
  }
});

// ─── Health / diagnostics ─────────────────────────────────────────────────────
// GET /api/engine/health  (public — monitoring için)

router.get('/health', async (_req: any, res: any) => {
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

  const axios = require('axios');

  // Cartesia API gerçek doğrulama (key geçerliliği)
  let cartesiaLive = '—';
  if (process.env.CARTESIA_API_KEY) {
    try {
      const r = await axios.get('https://api.cartesia.ai/voices', {
        headers: { 'X-API-Key': process.env.CARTESIA_API_KEY, 'Cartesia-Version': '2024-06-10' },
        timeout: 5000,
      });
      cartesiaLive = r.status === 200 ? '✅ API geçerli' : `⚠️ HTTP ${r.status}`;
    } catch (e: any) {
      cartesiaLive = `❌ ${e.response?.status || e.message}`;
    }
  }

  // Deepgram API gerçek doğrulama — STT pre-recorded endpoint'i kullan
  let deepgramLive = '—';
  if (process.env.DEEPGRAM_API_KEY) {
    try {
      // 80 byte μ-law silence (valid audio, should return empty transcript)
      const silence = Buffer.alloc(80, 0x7f);
      const r = await axios.post(
        'https://api.deepgram.com/v1/listen?model=nova-2&language=tr&encoding=mulaw&sample_rate=8000',
        silence,
        {
          headers: {
            Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
            'Content-Type': 'audio/mulaw',
          },
          timeout: 8000,
        }
      );
      deepgramLive = r.status === 200 ? '✅ API geçerli (nova-2/tr)' : `⚠️ HTTP ${r.status}`;
    } catch (e: any) {
      deepgramLive = `❌ ${e.response?.status || e.message}`;
    }
  }

  res.json({
    ok:              allOk,
    engine:          'LeadFlow Voice Engine v1.0',
    activeSessions:  getActiveSessionCount(),
    cartesiaApiTest: cartesiaLive,
    deepgramApiTest: deepgramLive,
    env,
  });
});

// ─── Cartesia voices listesi — dil/cinsiyet filtreli ─────────────────────────
// GET /api/engine/cartesia-voices?lang=tr
router.get('/cartesia-voices', async (req: any, res: any) => {
  const axios = require('axios');
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'CARTESIA_API_KEY yok' });

  const langFilter = ((req.query.lang as string) || '').toLowerCase();

  try {
    const r = await axios.get('https://api.cartesia.ai/voices', {
      headers: { 'X-API-Key': apiKey, 'Cartesia-Version': '2024-06-10' },
      timeout: 8000,
    });
    const all = Array.isArray(r.data) ? r.data : (r.data?.voices || []);
    const filtered = langFilter
      ? all.filter((v: any) => {
          const lang = (v.language || '').toLowerCase();
          if (lang === langFilter) return true;
          const supported: string[] = Array.isArray(v.supported_languages) ? v.supported_languages : [];
          return supported.some((l: string) => l.toLowerCase() === langFilter);
        })
      : all;
    res.json({ total: all.length, filtered: filtered.length, voices: filtered });
  } catch (e: any) {
    const detail = e.response?.data ? JSON.stringify(e.response.data).slice(0, 300) : e.message;
    res.status(500).json({ error: detail });
  }
});

module.exports = router;
