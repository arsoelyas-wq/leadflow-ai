export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VAPI_BASE = 'https://api.vapi.ai';
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── DOĞAL TÜRKÇE SATIŞ SCRIPTI ───────────────────────────
async function generateNaturalSalesScript(lead: any, settings: any): Promise<any> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Sen deneyimli bir B2B satış temsilcisisin. ${lead.company_name} şirketini arayacaksın.
${lead.contact_name ? `Muhatabın adı: ${lead.contact_name}` : ''}
Sektör: ${lead.sector || 'genel'}
Şehir: ${lead.city || ''}
Arayan şirket: ${settings?.company_name || 'şirketimiz'}

ÖNEMLI KURALLAR:
- Çok doğal konuş, yapay zeka olduğun BELLİ OLMAMALI
- Gerçek bir insan gibi "şey", "yani", "aslında", "tabii ki" gibi bağlaçlar kullan
- Kısa cümleler, doğal duraklamalar
- Türkçe aksan ve kültüre uygun
- Müşterinin sorularına hazır cevaplar
- Asla robot gibi konuşma

JSON döndür:
{
  "greeting": "Açılış selamlama (5-7 saniye, çok doğal)",
  "introduction": "Kendini tanıtma (doğal, acele değil)",
  "hook": "İlgi çekici kanca (müşteriye değer anlat)",
  "objectionHandlers": {
    "mesgul": "Meşgulum derse yanıt",
    "ilgilenmiyorum": "İlgilenmiyorum derse yanıt",
    "pahali": "Pahalı derse yanıt",
    "zaten_var": "Zaten başka çözümüm var derse yanıt",
    "gonder_email": "Email gönder derse yanıt"
  },
  "closingAttempt": "Randevu/demo kapama girişimi",
  "fallback": "Hiç ilgi yoksa kibarca kapama",
  "systemPrompt": "Vapi için tam sistem prompt (Türkçe, insan gibi satışçı rolü)"
}`
    }]
  });

  const text = response.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// ── ELEVENLABs SES KLONLAma ──────────────────────────────
async function getOrCreateVoice(userId: string): Promise<string> {
  // Kullanıcının klonlanmış sesi varsa kullan
  const { data: settings } = await supabase
    .from('user_settings').select('elevenlabs_voice_id').eq('user_id', userId).single();

  if (settings?.elevenlabs_voice_id) return settings.elevenlabs_voice_id;

  // Yoksa en gerçekçi Türkçe sesi seç
  const BEST_TURKISH_VOICES = [
    'pNInz6obpgDQGcFmaJgB', // Adam - erkek, doğal
    'EXAVITQu4vr4xnSDxMaL', // Bella - kadın, sıcak
    'VR6AewLTigWG4xSOukaG', // Arnold - erkek, profesyonel
  ];

  return BEST_TURKISH_VOICES[0];
}

// ── VAPI ASSISTANT OLUŞTUR ────────────────────────────────
async function createVapiAssistant(script: any, voiceId: string, lead: any): Promise<string> {
  const systemPrompt = script?.systemPrompt || `Sen ${lead.company_name} şirketini arayan deneyimli bir satış temsilcisisin.

KARAKTER:
- İsmin Ahmet (veya Ayşe), 5 yıldır satış alanındasın
- Samimi, güven veren, aceleci değil
- Türkçe konuşuyorsun, doğal aksanla
- Hiçbir zaman robot/yapay zeka olduğunu söyleme
- Gerçek bir insan gibi davran

KONUŞMA TARZI:
- Kısa cümleler kullan
- "Şey", "aslında", "yani", "tabii ki", "kesinlikle" gibi doğal ifadeler
- Müşteri konuşunca sabırla dinle
- Duraklamalar normal, paniklemene gerek yok
- Gülerek konuş, ses tonun sıcak olsun

YASAK:
- Robot gibi liste okuma
- Çok uzun paragraflar
- "Yapay zeka", "AI", "asistan" kelimeleri
- Aşırı resmi dil`;

  const response = await axios.post(`${VAPI_BASE}/assistant`, {
    name: `Sales_${lead.company_name}_${Date.now()}`,
    model: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      temperature: 0.8,
      systemPrompt,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: script?.greeting || `Merhaba! ${lead.contact_name ? lead.contact_name + ' Bey/Hanım,' : ''} nasılsınız?` }
      ]
    },
    voice: {
      provider: 'elevenlabs',
      voiceId,
      stability: 0.45,        // Daha doğal, az stabil = daha insan gibi
      similarityBoost: 0.85,
      style: 0.3,
      useSpeakerBoost: true,
      optimizeStreamingLatency: 3,
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'tr',
      smartFormat: true,
    },
    firstMessage: script?.greeting,
    endCallMessage: script?.fallback || 'Anlıyorum, teşekkür ederim. İyi günler dilerim.',
    endCallPhrases: ['görüşürüz', 'iyi günler', 'hoşçakalın', 'teşekkürler'],
    hipaaEnabled: false,
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 300, // Max 5 dakika
    backgroundSound: 'office', // Ofis arka plan sesi - daha gerçekçi!
    backchannelingEnabled: true, // "Evet", "Hmm" gibi doğal onaylar
    backgroundDenoisingEnabled: true,
    modelOutputInMessagesEnabled: true,
  }, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' }
  });

  return response.data?.id;
}

// ── ARAMA BAŞLAT ──────────────────────────────────────────
async function initiateCall(assistantId: string, phoneNumber: string, lead: any): Promise<any> {
  // Telefon formatını düzenle
  let phone = phoneNumber.replace(/\s/g, '').replace(/-/g, '');
  if (phone.startsWith('0')) phone = '+90' + phone.slice(1);
  if (!phone.startsWith('+')) phone = '+90' + phone;

  const response = await axios.post(`${VAPI_BASE}/call/phone`, {
    assistantId,
    customer: {
      number: phone,
      name: lead.contact_name || lead.company_name,
    },
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID, // Vapi'den alınan telefon numarası
  }, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' }
  });

  return response.data;
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/voice/voices — ElevenLabs ses listesi
router.get('/voices', async (req: any, res: any) => {
  try {
    const response = await axios.get(`${ELEVEN_BASE}/voices`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });
    const voices = (response.data?.voices || []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      preview_url: v.preview_url,
      labels: v.labels,
    }));
    res.json({ voices });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.detail || e.message });
  }
});

// POST /api/voice/clone — Ses klonla
router.post('/clone', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });

    // FormData ile ses dosyası alınacak
    const { voiceName } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Ses dosyası zorunlu' });

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('name', voiceName || 'Kişisel Satış Sesi');
    formData.append('files', req.file.buffer, { filename: 'voice.mp3', contentType: 'audio/mp3' });
    formData.append('description', 'LeadFlow AI satış sesi');
    formData.append('labels', JSON.stringify({ use_case: 'sales', language: 'turkish' }));

    const response = await axios.post(`${ELEVEN_BASE}/voices/add`, formData, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, ...formData.getHeaders() }
    });

    const voiceId = response.data?.voice_id;
    if (!voiceId) throw new Error('Voice ID alınamadı');

    await supabase.from('user_settings').upsert({
      user_id: userId,
      elevenlabs_voice_id: voiceId,
      elevenlabs_voice_name: voiceName || 'Kişisel Ses',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({ voiceId, message: 'Ses klonlandı! 🎙️' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.detail || e.message });
  }
});

// POST /api/voice/preview — Ses önizleme
router.post('/preview', async (req: any, res: any) => {
  try {
    const { text, voiceId } = req.body;
    if (!text || !voiceId) return res.status(400).json({ error: 'text ve voiceId zorunlu' });

    const response = await axios.post(
      `${ELEVEN_BASE}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_turbo_v2_5', // En hızlı ve doğal model
        voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true }
      },
      {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        responseType: 'arraybuffer'
      }
    );

    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/call — Arama başlat
router.post('/call', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, voiceId: customVoiceId } = req.body;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.phone) return res.status(400).json({ error: 'Lead\'in telefon numarası yok' });

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();

    // Script üret
    const script = await generateNaturalSalesScript(lead, settings);
    if (!script) throw new Error('Script üretilemedi');

    // Ses seç
    const voiceId = customVoiceId || await getOrCreateVoice(userId);

    // Vapi assistant oluştur
    const assistantId = await createVapiAssistant(script, voiceId, lead);

    // Arama başlat
    const callData = await initiateCall(assistantId, lead.phone, lead);

    // DB'ye kaydet
    const { data: record } = await supabase.from('voice_calls').insert([{
      user_id: userId,
      lead_id: leadId,
      vapi_call_id: callData?.id,
      vapi_assistant_id: assistantId,
      phone: lead.phone,
      status: 'initiated',
      script: JSON.stringify(script),
    }]).select().single();

    res.json({
      callId: record?.id,
      vapiCallId: callData?.id,
      status: 'initiated',
      message: `${lead.company_name} aranıyor...`,
    });
  } catch (e: any) {
    console.error('Voice call error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// POST /api/voice/call-batch — Toplu arama
router.post('/call-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, voiceId: customVoiceId, delayMinutes = 5 } = req.body;

    let query = supabase.from('leads').select('*').eq('user_id', userId).not('phone', 'is', null);
    if (leadIds?.length) query = query.in('id', leadIds);
    else query = query.limit(20);

    const { data: leads } = await query;
    if (!leads?.length) return res.json({ message: 'Aranacak lead yok', called: 0 });

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    const voiceId = customVoiceId || await getOrCreateVoice(userId);

    res.json({ message: `${leads.length} lead için arama başlıyor...`, total: leads.length });

    (async () => {
      let called = 0;
      for (const lead of leads) {
        try {
          const script = await generateNaturalSalesScript(lead, settings);
          if (!script) continue;
          const assistantId = await createVapiAssistant(script, voiceId, lead);
          const callData = await initiateCall(assistantId, lead.phone, lead);
          await supabase.from('voice_calls').insert([{
            user_id: userId, lead_id: lead.id,
            vapi_call_id: callData?.id, vapi_assistant_id: assistantId,
            phone: lead.phone, status: 'initiated',
            script: JSON.stringify(script),
          }]);
          called++;
          await sleep(delayMinutes * 60 * 1000); // Aramalar arası bekleme
        } catch (e: any) {
          console.error(`Call error ${lead.company_name}:`, e.message);
        }
      }
      console.log(`Batch calls done: ${called}/${leads.length}`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/calls — Arama listesi
router.get('/calls', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase.from('voice_calls')
      .select('*, leads(company_name, contact_name, phone, city)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ calls: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/calls/:id/recording — Kayıt dinle
router.get('/calls/:callId/recording', async (req: any, res: any) => {
  try {
    const { data: call } = await supabase.from('voice_calls')
      .select('vapi_call_id').eq('id', req.params.callId).eq('user_id', req.userId).single();
    if (!call?.vapi_call_id) return res.status(404).json({ error: 'Kayıt bulunamadı' });

    const response = await axios.get(`${VAPI_BASE}/call/${call.vapi_call_id}`, {
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` }
    });

    res.json({
      recordingUrl: response.data?.recordingUrl,
      transcript: response.data?.transcript,
      duration: response.data?.duration,
      summary: response.data?.summary,
      status: response.data?.status,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/webhook — Vapi webhook (arama durumu güncelle)
router.post('/webhook', async (req: any, res: any) => {
  try {
    const { type, call } = req.body;
    if (!call?.id) return res.json({ ok: true });

    const { data: voiceCall } = await supabase.from('voice_calls')
      .select('id, user_id, lead_id').eq('vapi_call_id', call.id).single();

    if (!voiceCall) return res.json({ ok: true });

    if (type === 'call-ended' || type === 'end-of-call-report') {
      await supabase.from('voice_calls').update({
        status: call.endedReason === 'customer-hangup' ? 'completed' : call.endedReason || 'completed',
        duration_seconds: call.duration,
        recording_url: call.recordingUrl,
        transcript: call.transcript,
        summary: call.summary,
        ended_at: new Date().toISOString(),
      }).eq('vapi_call_id', call.id);

      // Lead'i güncelle
      if (call.transcript?.length > 50) {
        await supabase.from('leads').update({ status: 'contacted', last_contacted_at: new Date().toISOString() }).eq('id', voiceCall.lead_id);
      }

      // Mesaj olarak kaydet
      await supabase.from('messages').insert([{
        user_id: voiceCall.user_id, lead_id: voiceCall.lead_id,
        direction: 'out', content: `📞 Sesli arama (${Math.round((call.duration || 0) / 60)} dk)`,
        channel: 'voice', sent_at: new Date().toISOString(),
        metadata: JSON.stringify({ vapiCallId: call.id, summary: call.summary }),
      }]);
    }

    res.json({ ok: true });
  } catch (e: any) {
    console.error('Vapi webhook error:', e.message);
    res.json({ ok: true });
  }
});

// GET /api/voice/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase.from('voice_calls').select('status, duration_seconds').eq('user_id', userId);
    const calls = data || [];
    res.json({
      total: calls.length,
      completed: calls.filter((c: any) => c.status === 'completed').length,
      initiated: calls.filter((c: any) => c.status === 'initiated').length,
      totalMinutes: Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / 60),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;