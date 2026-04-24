export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const upload = multer({ dest: '/tmp/voice/' });

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+19784325322';
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';
const GROQ_KEY = process.env.GROQ_API_KEY;
const API_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'https://leadflow-ai-production.up.railway.app';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ÔöÇÔöÇ TWILIO CLIENT ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function twilioClient() {
  const twilio = require('twilio');
  return twilio(TWILIO_SID, TWILIO_TOKEN);
}

// ÔöÇÔöÇ NUMARA DO─×RULAMA ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

// POST /api/voice/verify/send ÔÇö Do─ƒrulama kodu g├Ânder
router.post('/verify/send', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon numaras─▒ zorunlu' });

    // T├╝rkiye numaras─▒n─▒ uluslararas─▒ formata ├ºevir
    let e164 = phone.replace(/\s/g, '');
    if (e164.startsWith('0')) e164 = '+90' + e164.slice(1);
    if (!e164.startsWith('+')) e164 = '+90' + e164;

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Kodu DB'ye kaydet
    await supabase.from('voice_verifications').upsert([{
      user_id: userId, phone: e164, code, expires_at: expires, verified: false
    }]);

    // Twilio ile SMS g├Ânder
    const client = twilioClient();
    await client.messages.create({
      body: `LeadFlow do─ƒrulama kodunuz: ${code}\nBu kod 10 dakika ge├ºerlidir.`,
      from: TWILIO_NUMBER,
      to: e164,
    });

    res.json({ ok: true, message: `${e164} numaras─▒na do─ƒrulama kodu g├Ânderildi` });
  } catch (e: any) {
    console.error('Verify send error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/verify/confirm ÔÇö Kodu onayla
router.post('/verify/confirm', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { phone, code } = req.body;

    let e164 = phone.replace(/\s/g, '');
    if (e164.startsWith('0')) e164 = '+90' + e164.slice(1);
    if (!e164.startsWith('+')) e164 = '+90' + e164;

    const { data: verification } = await supabase
      .from('voice_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', e164)
      .eq('code', code)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!verification) return res.status(400).json({ error: 'Ge├ºersiz veya s├╝resi dolmu┼ƒ kod' });

    // Do─ƒruland─▒ ÔÇö numara kaydet
    await supabase.from('voice_verifications').update({ verified: true }).eq('id', verification.id);

    await supabase.from('voice_numbers').upsert([{
      user_id: userId,
      phone: e164,
      is_active: true,
      verified_at: new Date().toISOString(),
    }]);

    // Twilio'ya bu numaray─▒ kaydet (verified numbers i├ºin)
    try {
      const client = twilioClient();
      await client.outgoingCallerIds.create({ phoneNumber: e164, friendlyName: `LeadFlow-${userId.slice(0,8)}` });
    } catch (twilioErr: any) {
      // Trial hesapta zaten kay─▒tl─▒ysa hata verir, ge├º
      console.log('Twilio caller ID:', twilioErr.message);
    }

    res.json({ ok: true, phone: e164, message: 'Numara ba┼ƒar─▒yla do─ƒruland─▒!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/numbers ÔÇö Ba─ƒl─▒ numaralar
router.get('/numbers', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('voice_numbers')
      .select('*')
      .eq('user_id', req.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    res.json({ numbers: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/voice/numbers/:id
router.delete('/numbers/:id', async (req: any, res: any) => {
  try {
    await supabase.from('voice_numbers').update({ is_active: false })
      .eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ÔöÇÔöÇ SES KLONLAMA ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

// POST /api/voice/clone ÔÇö Ses klonla
router.post('/clone', upload.single('audio'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Ses dosyas─▒ zorunlu' });

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) return res.status(400).json({ error: 'ElevenLabs API key bulunamad─▒' });

    const form = new FormData();
    form.append('name', name || `LeadFlow-${userId.slice(0, 8)}`);
    form.append('description', 'LeadFlow AI sat─▒┼ƒ sesi');
    form.append('files', fs.createReadStream(file.path), { filename: 'voice.mp3', contentType: 'audio/mpeg' });
    form.append('labels', JSON.stringify({ language: 'tr', use_case: 'sales' }));

    const r = await axios.post(`${ELEVEN_BASE}/voices/add`, form, {
      headers: { ...form.getHeaders(), 'xi-api-key': elevenKey },
      timeout: 60000,
    });

    const voiceId = r.data.voice_id;
    await supabase.from('voice_settings').upsert([{
      user_id: userId,
      elevenlabs_voice_id: voiceId,
      voice_name: name || 'Klonlanm─▒┼ƒ Ses',
    }]);

    try { fs.unlinkSync(file.path); } catch {}
    res.json({ ok: true, voiceId, message: 'Ses ba┼ƒar─▒yla klonland─▒!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/preview ÔÇö Ses ├Ânizleme
router.post('/preview', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { text, voiceId } = req.body;
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) return res.status(400).json({ error: 'ElevenLabs key yok' });

    const vid = voiceId || await getDefaultVoice(userId);
    const r = await axios.post(
      `${ELEVEN_BASE}/text-to-speech/${vid}`,
      { text: text || 'Merhaba, nas─▒ls─▒n─▒z?', model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.75, similarity_boost: 0.85 } },
      { headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer', timeout: 15000 }
    );

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(r.data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function getDefaultVoice(userId: string): Promise<string> {
  const { data } = await supabase.from('voice_settings')
    .select('elevenlabs_voice_id').eq('user_id', userId).single();
  return data?.elevenlabs_voice_id || 'pNInz6obpgDQGcFmaJgB'; // Varsay─▒lan T├╝rk├ºe ses
}

// ÔöÇÔöÇ ARAMA S─░STEM─░ ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

// POST /api/voice/call/single ÔÇö Tek lead ara
router.post('/call/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, callerId, campaignId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    // Lead bilgisi
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamad─▒' });
    if (!lead.phone) return res.status(400).json({ error: 'Lead telefon numaras─▒ yok' });

    // Kullan─▒c─▒ ayarlar─▒
    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

    // Arama kayd─▒ olu┼ƒtur
    const { data: callRecord } = await supabase.from('voice_calls').insert([{
      user_id: userId,
      lead_id: leadId,
      campaign_id: campaignId || null,
      caller_number: callerId || TWILIO_NUMBER,
      callee_number: lead.phone,
      status: 'initiating',
      script: null,
    }]).select().single();

    res.json({ ok: true, callId: callRecord?.id, message: 'Arama ba┼ƒlat─▒l─▒yor...' });

    // Arka planda arama yap
    (async () => {
      try {
        const agentSettings = {
          company_name: userRow?.company || '┼ƒirketimiz',
          agent_name: settings?.agent_name || userRow?.name || 'Ahmet',
          product_description: settings?.product_description || '',
        };

        // Script olu┼ƒtur
        const script = await generateSalesScript(lead, agentSettings);
        await supabase.from('voice_calls').update({ script, status: 'calling' }).eq('id', callRecord?.id);

        // Twilio aramas─▒ ba┼ƒlat
        const client = twilioClient();
        const call = await client.calls.create({
          from: callerId || TWILIO_NUMBER,
          to: lead.phone,
          url: `${API_URL}/api/voice/twiml/start?callId=${callRecord?.id}&userId=${userId}`,
          statusCallback: `${API_URL}/api/voice/twiml/status?callId=${callRecord?.id}`,
          statusCallbackMethod: 'POST',
          timeout: 30,
          record: true,
          recordingStatusCallback: `${API_URL}/api/voice/twiml/recording?callId=${callRecord?.id}`,
        });

        await supabase.from('voice_calls').update({ twilio_call_sid: call.sid }).eq('id', callRecord?.id);

        // Pipeline g├╝ncelle
        await supabase.from('leads').update({ status: 'contacted', last_contacted_at: new Date().toISOString() }).eq('id', leadId);

      } catch (err: any) {
        console.error('Call error:', err.message);
        await supabase.from('voice_calls').update({ status: 'failed', notes: err.message }).eq('id', callRecord?.id);
      }
    })();

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/call/campaign ÔÇö Kampanya aramas─▒
router.post('/call/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, callerId, campaignName, delayMinutes = 5, maxCallsPerHour = 10 } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead listesi zorunlu' });

    // Kampanya kayd─▒
    const { data: campaign } = await supabase.from('voice_campaigns').insert([{
      user_id: userId,
      name: campaignName || `Kampanya ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length,
      status: 'running',
      caller_number: callerId || TWILIO_NUMBER,
      delay_minutes: delayMinutes,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} lead i├ºin arama ba┼ƒlat─▒l─▒yor` });

    // Arka planda s─▒ral─▒ arama
    (async () => {
      let called = 0;
      for (const leadId of leadIds) {
        try {
          // Saatlik limit kontrol├╝
          if (called > 0 && called % maxCallsPerHour === 0) {
            console.log('Saatlik limit ÔÇö 1 saat bekleniyor');
            await sleep(60 * 60 * 1000);
          }

          // Lead bilgisi
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead?.phone) { called++; continue; }

          const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
          const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

          // Arama kayd─▒
          const { data: callRecord } = await supabase.from('voice_calls').insert([{
            user_id: userId, lead_id: leadId, campaign_id: campaign?.id,
            caller_number: callerId || TWILIO_NUMBER,
            callee_number: lead.phone, status: 'calling',
          }]).select().single();

          const agentSettings = {
            company_name: userRow?.company || '┼ƒirketimiz',
            agent_name: settings?.agent_name || 'Ahmet',
            product_description: settings?.product_description || '',
          };

          const script = await generateSalesScript(lead, agentSettings);

          const client = twilioClient();
          const call = await client.calls.create({
            from: callerId || TWILIO_NUMBER,
            to: lead.phone,
            url: `${API_URL}/api/voice/twiml/start?callId=${callRecord?.id}&userId=${userId}`,
            statusCallback: `${API_URL}/api/voice/twiml/status?callId=${callRecord?.id}`,
            statusCallbackMethod: 'POST',
            timeout: 30,
            record: true,
          });

          await supabase.from('voice_calls').update({ twilio_call_sid: call.sid, script }).eq('id', callRecord?.id);
          await supabase.from('leads').update({ status: 'contacted', last_contacted_at: new Date().toISOString() }).eq('id', leadId);
          await supabase.from('voice_campaigns').update({ calls_made: called + 1 }).eq('id', campaign?.id);

          called++;
          console.log(`Arama ${called}/${leadIds.length}: ${lead.phone}`);

          // Aramalar aras─▒ bekleme (anti-spam)
          const delay = (delayMinutes + Math.random() * 2) * 60 * 1000;
          await sleep(delay);

        } catch (err: any) {
          console.error(`Lead ${leadId} arama hatas─▒:`, err.message);
          called++;
        }
      }

      await supabase.from('voice_campaigns').update({ status: 'completed' }).eq('id', campaign?.id);
      console.log(`Kampanya tamamland─▒: ${called} arama`);
    })();

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ÔöÇÔöÇ TWIML WEBHOOK'LAR ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

// GET /api/voice/twiml/start ÔÇö Twilio aramas─▒ ba┼ƒlad─▒─ƒ─▒nda
router.post('/twiml/start', async (req: any, res: any) => {
  const { callId, userId } = req.query;
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  try {
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('id', callId).single();
    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();

    const voiceId = settings?.elevenlabs_voice_id || 'pNInz6obpgDQGcFmaJgB';
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    const script = call?.script;

    const openingText = script?.opening || `Merhaba, ${call?.leads?.contact_name || ''} Bey/Han─▒m. Ben ${settings?.agent_name || 'Ahmet'}, ${settings?.company_name || '┼ƒirketimizden'} ar─▒yorum. Uygun musunuz k─▒saca bir ┼ƒey anlatmak istiyorum.`;

    if (elevenKey) {
      // ElevenLabs ses ÔåÆ Twilio'ya URL olarak ver
      const audioUrl = `${API_URL}/api/voice/twiml/audio?text=${encodeURIComponent(openingText)}&voiceId=${voiceId}&userId=${userId}`;
      twiml.play(audioUrl);
    } else {
      // Fallback: Twilio TTS
      const say = twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' });
      say.addText(openingText);
    }

    // M├╝┼ƒteri cevab─▒n─▒ dinle
    twiml.gather({
      input: ['speech'],
      action: `${API_URL}/api/voice/twiml/respond?callId=${callId}&userId=${userId}&turn=1`,
      method: 'POST',
      speechTimeout: 'auto',
      language: 'tr-TR',
      timeout: 10,
    });

    // Sessizlik ÔÇö tekrar dene
    twiml.redirect(`${API_URL}/api/voice/twiml/start?callId=${callId}&userId=${userId}`);

    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());

    // Konu┼ƒma ge├ºmi┼ƒini ba┼ƒlat
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'assistant', content: openingText, turn: 0,
    }]);

  } catch (e: any) {
    twiml.say({ language: 'tr-TR' }, '├£zg├╝n├╝z, ba─ƒlant─▒ hatas─▒.');
    twiml.hangup();
    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());
  }
});

// POST /api/voice/twiml/respond ÔÇö M├╝┼ƒteri konu┼ƒtu, AI cevap ver
router.post('/twiml/respond', async (req: any, res: any) => {
  const { callId, userId, turn } = req.query;
  const { SpeechResult, Confidence } = req.body;
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  try {
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('id', callId).single();
    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();

    // M├╝┼ƒteri ne dedi
    const userText = SpeechResult || '';
    console.log(`[Call ${callId}] M├╝┼ƒteri (${turn}): ${userText}`);

    // Konu┼ƒma ge├ºmi┼ƒini al
    const { data: history } = await supabase.from('voice_conversations')
      .select('*').eq('call_id', callId).order('turn', { ascending: true });

    const conversationHistory = (history || []).map((h: any) => ({ role: h.role, content: h.content }));

    // Kullan─▒c─▒ mesaj─▒n─▒ kaydet
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'user', content: userText, turn: Number(turn),
    }]);

    // AI cevap ├╝ret
    const agentSettings = {
      company_name: settings?.company_name || '┼ƒirketimiz',
      agent_name: settings?.agent_name || 'Ahmet',
      product_description: settings?.product_description || '',
    };

    const aiResult = await generateAIResponse({
      userText,
      conversationHistory,
      script: call?.script,
      lead: call?.leads || {},
      settings: agentSettings,
    });

    console.log(`[Call ${callId}] AI (${turn}): ${aiResult.response} [${aiResult.action}]`);

    // AI cevab─▒n─▒ kaydet
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'assistant', content: aiResult.response, turn: Number(turn),
    }]);

    const voiceId = settings?.elevenlabs_voice_id || 'pNInz6obpgDQGcFmaJgB';
    const elevenKey = process.env.ELEVENLABS_API_KEY;

    if (aiResult.action === 'close_positive') {
      // Ba┼ƒar─▒l─▒ kapan─▒┼ƒ
      if (elevenKey) {
        twiml.play(`${API_URL}/api/voice/twiml/audio?text=${encodeURIComponent(aiResult.response)}&voiceId=${voiceId}&userId=${userId}`);
      } else {
        twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, aiResult.response);
      }
      twiml.hangup();

      // Pipeline g├╝ncelle ÔÇö Cevap Verdi
      await supabase.from('leads').update({ status: 'responded' }).eq('id', call?.lead_id);
      await supabase.from('voice_calls').update({ status: 'completed', outcome: 'positive' }).eq('id', callId);

    } else if (aiResult.action === 'close_negative') {
      if (elevenKey) {
        twiml.play(`${API_URL}/api/voice/twiml/audio?text=${encodeURIComponent(aiResult.response)}&voiceId=${voiceId}&userId=${userId}`);
      } else {
        twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, aiResult.response);
      }
      twiml.hangup();
      await supabase.from('voice_calls').update({ status: 'completed', outcome: 'negative' }).eq('id', callId);

    } else if (aiResult.action === 'transfer') {
      // ─░nsan temsilciye transfer
      twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, 'Sizi ilgili m├╝d├╝r├╝m├╝ze ba─ƒl─▒yorum.');
      const dial = twiml.dial();
      dial.number(settings?.transfer_number || TWILIO_NUMBER);
      await supabase.from('voice_calls').update({ status: 'transferred' }).eq('id', callId);

    } else {
      // Konu┼ƒma devam ediyor
      if (elevenKey) {
        twiml.play(`${API_URL}/api/voice/twiml/audio?text=${encodeURIComponent(aiResult.response)}&voiceId=${voiceId}&userId=${userId}`);
      } else {
        twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, aiResult.response);
      }

      twiml.gather({
        input: ['speech'],
        action: `${API_URL}/api/voice/twiml/respond?callId=${callId}&userId=${userId}&turn=${Number(turn) + 1}`,
        method: 'POST',
        speechTimeout: 'auto',
        language: 'tr-TR',
        timeout: 10,
      });
    }

    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());

  } catch (e: any) {
    console.error('Respond error:', e.message);
    twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, 'Anlayamad─▒m, tekrar eder misiniz?');
    twiml.gather({
      input: ['speech'],
      action: `${API_URL}/api/voice/twiml/respond?callId=${callId}&userId=${userId}&turn=${Number(turn) + 1}`,
      method: 'POST', speechTimeout: 'auto', language: 'tr-TR', timeout: 8,
    });
    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());
  }
});

// GET /api/voice/twiml/audio ÔÇö ElevenLabs ses ├╝ret ve serve et
router.get('/twiml/audio', async (req: any, res: any) => {
  try {
    const { text, voiceId, userId } = req.query;
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey || !text) return res.status(400).send('Key veya text yok');

    const r = await axios.post(
      `${ELEVEN_BASE}/text-to-speech/${voiceId || 'pNInz6obpgDQGcFmaJgB'}`,
      {
        text: decodeURIComponent(text as string),
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.75, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
      },
      {
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: 10000,
      }
    );

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(Buffer.from(r.data));
  } catch (e: any) {
    res.status(500).send('Audio error');
  }
});

// POST /api/voice/twiml/status ÔÇö Arama durumu g├╝ncelle
router.post('/twiml/status', async (req: any, res: any) => {
  const { callId } = req.query;
  const { CallStatus, CallDuration, RecordingUrl } = req.body;

  try {
    const statusMap: Record<string, string> = {
      'completed': 'completed', 'busy': 'busy', 'no-answer': 'no-answer',
      'failed': 'failed', 'canceled': 'canceled',
    };

    await supabase.from('voice_calls').update({
      status: statusMap[CallStatus] || CallStatus,
      duration_seconds: Number(CallDuration) || 0,
      recording_url: RecordingUrl || null,
      ended_at: new Date().toISOString(),
    }).eq('id', callId);

    // Pipeline g├╝ncelle
    const { data: call } = await supabase.from('voice_calls').select('lead_id, outcome').eq('id', callId).single();
    if (call?.lead_id) {
      const pipelineStatus = call?.outcome === 'positive' ? 'responded'
        : CallStatus === 'no-answer' ? 'new' : 'contacted';
      await supabase.from('leads').update({ status: pipelineStatus }).eq('id', call.lead_id);
    }

    // Analiz ba┼ƒlat (arka planda)
    if (CallStatus === 'completed' && Number(CallDuration) > 15) {
      analyzeCall(callId).catch(console.error);
    }

    res.sendStatus(200);
  } catch (e: any) {
    console.error('Status error:', e.message);
    res.sendStatus(200);
  }
});

// ÔöÇÔöÇ ARAMA ANAL─░Z─░ ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function analyzeCall(callId: string) {
  try {
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('id', callId).single();
    const { data: convHistory } = await supabase.from('voice_conversations').select('*').eq('call_id', callId).order('turn');

    if (!convHistory?.length) return;

    const transcript = convHistory.map((h: any) =>
      `${h.role === 'assistant' ? '[Temsilci]' : '[M├╝┼ƒteri]'}: ${h.content}`
    ).join('\n');

    const analysis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Bu telefon g├Âr├╝┼ƒmesini analiz et:

${transcript}

JSON d├Ând├╝r:
{
  "overall_score": 0-100,
  "outcome": "sale|callback|no_interest|no_answer",
  "summary": "3 c├╝mle ├Âzet",
  "strengths": ["g├╝├ºl├╝ y├Ân 1", "g├╝├ºl├╝ y├Ân 2"],
  "improvements": ["geli┼ƒim alan─▒ 1", "geli┼ƒim alan─▒ 2"],
  "next_action": "yap─▒lacak sonraki ad─▒m",
  "sentiment": "positive|neutral|negative",
  "talk_ratio": { "agent": 60, "customer": 40 }
}`
      }]
    });

    const text = analysis.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return;
    const result = JSON.parse(match[0]);

    await supabase.from('voice_calls').update({
      analysis: result,
      outcome: result.outcome,
    }).eq('id', callId);

    // Team Intelligence'a kaydet
    if (call?.leads) {
      await supabase.from('member_analyses').insert([{
        user_id: call.user_id,
        customer_phone: call.callee_number,
        customer_name: call.leads.company_name,
        channel: 'phone',
        duration_seconds: call.duration_seconds,
        transcript,
        overall_score: result.overall_score,
        summary: result.summary,
        outcome: result.outcome,
        strengths: result.strengths || [],
        weaknesses: result.improvements || [],
        next_steps: result.next_action,
        sentiment: result.sentiment,
      }]);
    }

    console.log(`Analiz tamamland─▒: ${callId} ÔÇö Skor: ${result.overall_score}`);
  } catch (e: any) {
    console.error('Analiz hatas─▒:', e.message);
  }
}

// ÔöÇÔöÇ SALES SCRIPT ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function generateSalesScript(lead: any, settings: any): Promise<any> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `${lead.company_name} ┼ƒirketine sat─▒┼ƒ aramas─▒ scripti olu┼ƒtur.
Muhatap: ${lead.contact_name || 'yetkili'}
Sekt├Âr: ${lead.sector || 'genel'}
┼×ehir: ${lead.city || ''}
Arayan: ${settings.company_name} - ${settings.agent_name}
├£r├╝n: ${settings.product_description || ''}

JSON:
{
  "opening": "Do─ƒal a├º─▒l─▒┼ƒ (10-15 saniye)",
  "pitch": "De─ƒer ├Ânerisi (20-30 saniye)",
  "close": "Kapan─▒┼ƒ giri┼ƒimi"
}`
      }]
    });
    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// ÔöÇÔöÇ AI RESPONSE ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function generateAIResponse(params: any) {
  const { userText, conversationHistory, script, lead, settings } = params;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: `Sen ${settings.agent_name} ad─▒nda sat─▒┼ƒ temsilcisisin. ${settings.company_name} ad─▒na ${lead.company_name} firmas─▒n─▒ ar─▒yorsun.
├£r├╝n: ${settings.product_description || ''}
KURAL: Yapay zeka oldu─ƒunu asla belli etme. K─▒sa do─ƒal T├╝rk├ºe c├╝mleler. Max 2-3 c├╝mle.
JSON d├Ând├╝r: {"response": "s├Âyleyece─ƒin metin", "action": "continue|close_positive|close_negative|transfer"}`,
      messages: [
        ...conversationHistory.slice(-8),
        { role: 'user', content: userText || '[sessiz]' }
      ],
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { response: 'Anlayamad─▒m, tekrar eder misiniz?', action: 'continue' };
  } catch {
    return { response: 'Bir saniye, tekrar eder misiniz?', action: 'continue' };
  }
}

// ÔöÇÔöÇ D─░─×ER ROUTES ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

// GET /api/voice/calls ÔÇö Arama listesi
router.get('/calls', async (req: any, res: any) => {
  try {
    const { limit = 50, campaignId } = req.query;
    let query = supabase.from('voice_calls')
      .select('*, leads(company_name, phone, contact_name)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));
    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data } = await query;
    res.json({ calls: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/campaigns ÔÇö Kampanya listesi
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_campaigns')
      .select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/stats ÔÇö ─░statistikler
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_calls')
      .select('status, duration_seconds, outcome').eq('user_id', req.userId);
    const calls = data || [];
    res.json({
      total: calls.length,
      completed: calls.filter((c: any) => c.status === 'completed').length,
      positive: calls.filter((c: any) => c.outcome === 'positive' || c.outcome === 'sale').length,
      no_answer: calls.filter((c: any) => c.status === 'no-answer').length,
      totalMinutes: Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / 60),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/settings ÔÇö Ses ayarlar─▒
router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_settings').select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || {} });
  } catch { res.json({ settings: {} }); }
});

// PATCH /api/voice/settings ÔÇö Ses ayarlar─▒n─▒ g├╝ncelle
router.patch('/settings', async (req: any, res: any) => {
  try {
    const { agent_name, company_name, product_description, transfer_number } = req.body;
    await supabase.from('voice_settings').upsert([{
      user_id: req.userId, agent_name, company_name, product_description, transfer_number,
    }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/twiml/test', function(req, res) { res.setHeader('Content-Type', 'text/xml'); res.send('<Response><Say language="tr-TR" voice="Polly.Filiz">Merhaba! Ben Ahmet, Dekor Panel den ariyorum. Akustik panellerimiz var. Uygun musunuz?</Say></Response>'); });
module.exports = router;
