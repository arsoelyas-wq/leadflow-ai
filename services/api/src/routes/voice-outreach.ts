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

// Ã¢â€â‚¬Ã¢â€â‚¬ TWILIO CLIENT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function twilioClient() {
  const twilio = require('twilio');
  return twilio(TWILIO_SID, TWILIO_TOKEN);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ NUMARA DOÃ„Å¾RULAMA Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// POST /api/voice/verify/send Ã¢â‚¬â€ DoÃ„Å¸rulama kodu gÃƒÂ¶nder
router.post('/verify/send', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon numarasÃ„Â± zorunlu' });

    // TÃƒÂ¼rkiye numarasÃ„Â±nÃ„Â± uluslararasÃ„Â± formata ÃƒÂ§evir
    let e164 = phone.replace(/\s/g, '');
    if (e164.startsWith('0')) e164 = '+90' + e164.slice(1);
    if (!e164.startsWith('+')) e164 = '+90' + e164;

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Kodu DB'ye kaydet
    await supabase.from('voice_verifications').upsert([{
      user_id: userId, phone: e164, code, expires_at: expires, verified: false
    }]);

    // Twilio ile SMS gÃƒÂ¶nder
    const client = twilioClient();
    await client.messages.create({
      body: `LeadFlow doÃ„Å¸rulama kodunuz: ${code}\nBu kod 10 dakika geÃƒÂ§erlidir.`,
      from: TWILIO_NUMBER,
      to: e164,
    });

    res.json({ ok: true, message: `${e164} numarasÃ„Â±na doÃ„Å¸rulama kodu gÃƒÂ¶nderildi` });
  } catch (e: any) {
    console.error('Verify send error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/verify/confirm Ã¢â‚¬â€ Kodu onayla
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

    if (!verification) return res.status(400).json({ error: 'GeÃƒÂ§ersiz veya sÃƒÂ¼resi dolmuÃ…Å¸ kod' });

    // DoÃ„Å¸rulandÃ„Â± Ã¢â‚¬â€ numara kaydet
    await supabase.from('voice_verifications').update({ verified: true }).eq('id', verification.id);

    await supabase.from('voice_numbers').upsert([{
      user_id: userId,
      phone: e164,
      is_active: true,
      verified_at: new Date().toISOString(),
    }]);

    // Twilio'ya bu numarayÃ„Â± kaydet (verified numbers iÃƒÂ§in)
    try {
      const client = twilioClient();
      await client.outgoingCallerIds.create({ phoneNumber: e164, friendlyName: `LeadFlow-${userId.slice(0,8)}` });
    } catch (twilioErr: any) {
      // Trial hesapta zaten kayÃ„Â±tlÃ„Â±ysa hata verir, geÃƒÂ§
      console.log('Twilio caller ID:', twilioErr.message);
    }

    res.json({ ok: true, phone: e164, message: 'Numara baÃ…Å¸arÃ„Â±yla doÃ„Å¸rulandÃ„Â±!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/numbers Ã¢â‚¬â€ BaÃ„Å¸lÃ„Â± numaralar
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

// Ã¢â€â‚¬Ã¢â€â‚¬ SES KLONLAMA Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// POST /api/voice/clone Ã¢â‚¬â€ Ses klonla
router.post('/clone', upload.single('audio'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Ses dosyasÃ„Â± zorunlu' });

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) return res.status(400).json({ error: 'ElevenLabs API key bulunamadÃ„Â±' });

    const form = new FormData();
    form.append('name', name || `LeadFlow-${userId.slice(0, 8)}`);
    form.append('description', 'LeadFlow AI satÃ„Â±Ã…Å¸ sesi');
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
      voice_name: name || 'KlonlanmÃ„Â±Ã…Å¸ Ses',
    }]);

    try { fs.unlinkSync(file.path); } catch {}
    res.json({ ok: true, voiceId, message: 'Ses baÃ…Å¸arÃ„Â±yla klonlandÃ„Â±!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/preview Ã¢â‚¬â€ Ses ÃƒÂ¶nizleme
router.post('/preview', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { text, voiceId } = req.body;
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) return res.status(400).json({ error: 'ElevenLabs key yok' });

    const vid = voiceId || await getDefaultVoice(userId);
    const r = await axios.post(
      `${ELEVEN_BASE}/text-to-speech/${vid}`,
      { text: text || 'Merhaba, nasÃ„Â±lsÃ„Â±nÃ„Â±z?', model_id: 'eleven_turbo_v2_5',
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
  return data?.elevenlabs_voice_id || 'pNInz6obpgDQGcFmaJgB'; // VarsayÃ„Â±lan TÃƒÂ¼rkÃƒÂ§e ses
}

// Ã¢â€â‚¬Ã¢â€â‚¬ ARAMA SÃ„Â°STEMÃ„Â° Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// POST /api/voice/call/single Ã¢â‚¬â€ Tek lead ara
router.post('/call/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, callerId, campaignId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    // Lead bilgisi
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadÃ„Â±' });
    if (!lead.phone) return res.status(400).json({ error: 'Lead telefon numarasÃ„Â± yok' });

    // KullanÃ„Â±cÃ„Â± ayarlarÃ„Â±
    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

    // Arama kaydÃ„Â± oluÃ…Å¸tur
    const { data: callRecord } = await supabase.from('voice_calls').insert([{
      user_id: userId,
      lead_id: leadId,
      campaign_id: campaignId || null,
      caller_number: callerId || TWILIO_NUMBER,
      callee_number: lead.phone,
      status: 'initiating',
      script: null,
    }]).select().single();

    res.json({ ok: true, callId: callRecord?.id, message: 'Arama baÃ…Å¸latÃ„Â±lÃ„Â±yor...' });

    // Arka planda arama yap
    (async () => {
      try {
        const agentSettings = {
          company_name: userRow?.company || 'Ã…Å¸irketimiz',
          agent_name: settings?.agent_name || userRow?.name || 'Ahmet',
          product_description: settings?.product_description || '',
        };

        // Script oluÃ…Å¸tur
        const script = await generateSalesScript(lead, agentSettings);
        await supabase.from('voice_calls').update({ script, status: 'calling' }).eq('id', callRecord?.id);

        // Twilio aramasÃ„Â± baÃ…Å¸lat
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

        // Pipeline gÃƒÂ¼ncelle
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

// POST /api/voice/call/campaign Ã¢â‚¬â€ Kampanya aramasÃ„Â±
router.post('/call/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, callerId, campaignName, delayMinutes = 5, maxCallsPerHour = 10 } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead listesi zorunlu' });

    // Kampanya kaydÃ„Â±
    const { data: campaign } = await supabase.from('voice_campaigns').insert([{
      user_id: userId,
      name: campaignName || `Kampanya ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length,
      status: 'running',
      caller_number: callerId || TWILIO_NUMBER,
      delay_minutes: delayMinutes,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} lead iÃƒÂ§in arama baÃ…Å¸latÃ„Â±lÃ„Â±yor` });

    // Arka planda sÃ„Â±ralÃ„Â± arama
    (async () => {
      let called = 0;
      for (const leadId of leadIds) {
        try {
          // Saatlik limit kontrolÃƒÂ¼
          if (called > 0 && called % maxCallsPerHour === 0) {
            console.log('Saatlik limit Ã¢â‚¬â€ 1 saat bekleniyor');
            await sleep(60 * 60 * 1000);
          }

          // Lead bilgisi
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead?.phone) { called++; continue; }

          const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
          const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

          // Arama kaydÃ„Â±
          const { data: callRecord } = await supabase.from('voice_calls').insert([{
            user_id: userId, lead_id: leadId, campaign_id: campaign?.id,
            caller_number: callerId || TWILIO_NUMBER,
            callee_number: lead.phone, status: 'calling',
          }]).select().single();

          const agentSettings = {
            company_name: userRow?.company || 'Ã…Å¸irketimiz',
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

          // Aramalar arasÃ„Â± bekleme (anti-spam)
          const delay = (delayMinutes + Math.random() * 2) * 60 * 1000;
          await sleep(delay);

        } catch (err: any) {
          console.error(`Lead ${leadId} arama hatasÃ„Â±:`, err.message);
          called++;
        }
      }

      await supabase.from('voice_campaigns').update({ status: 'completed' }).eq('id', campaign?.id);
      console.log(`Kampanya tamamlandÃ„Â±: ${called} arama`);
    })();

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬ TWIML WEBHOOK'LAR Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// GET /api/voice/twiml/start Ã¢â‚¬â€ Twilio aramasÃ„Â± baÃ…Å¸ladÃ„Â±Ã„Å¸Ã„Â±nda
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

    const openingText = script?.opening || `Merhaba, ${call?.leads?.contact_name || ''} Bey/HanÃ„Â±m. Ben ${settings?.agent_name || 'Ahmet'}, ${settings?.company_name || 'Ã…Å¸irketimizden'} arÃ„Â±yorum. Uygun musunuz kÃ„Â±saca bir Ã…Å¸ey anlatmak istiyorum.`;

    if (elevenKey) {
      // ElevenLabs ses Ã¢â€ â€™ Twilio'ya URL olarak ver
      const audioUrl = `${API_URL}/api/voice/twiml/audio?text=${encodeURIComponent(openingText)}&voiceId=${voiceId}&userId=${userId}`;
      twiml.play(audioUrl);
    } else {
      // Fallback: Twilio TTS
      const say = twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' });
      say.addText(openingText);
    }

    // MÃƒÂ¼Ã…Å¸teri cevabÃ„Â±nÃ„Â± dinle
    twiml.gather({
      input: ['speech'],
      action: `${API_URL}/api/voice/twiml/respond?callId=${callId}&userId=${userId}&turn=1`,
      method: 'POST',
      speechTimeout: 'auto',
      language: 'tr-TR',
      timeout: 10,
    });

    // Sessizlik Ã¢â‚¬â€ tekrar dene
    twiml.redirect(`${API_URL}/api/voice/twiml/start?callId=${callId}&userId=${userId}`);

    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());

    // KonuÃ…Å¸ma geÃƒÂ§miÃ…Å¸ini baÃ…Å¸lat
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'assistant', content: openingText, turn: 0,
    }]);

  } catch (e: any) {
    twiml.say({ language: 'tr-TR' }, 'ÃƒÅ“zgÃƒÂ¼nÃƒÂ¼z, baÃ„Å¸lantÃ„Â± hatasÃ„Â±.');
    twiml.hangup();
    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());
  }
});

// POST /api/voice/twiml/respond Ã¢â‚¬â€ MÃƒÂ¼Ã…Å¸teri konuÃ…Å¸tu, AI cevap ver
router.post('/twiml/respond', async (req: any, res: any) => {
  const { callId, userId, turn } = req.query;
  const { SpeechResult, Confidence } = req.body;
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  try {
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('id', callId).single();
    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();

    // MÃƒÂ¼Ã…Å¸teri ne dedi
    const userText = SpeechResult || '';
    console.log(`[Call ${callId}] MÃƒÂ¼Ã…Å¸teri (${turn}): ${userText}`);

    // KonuÃ…Å¸ma geÃƒÂ§miÃ…Å¸ini al
    const { data: history } = await supabase.from('voice_conversations')
      .select('*').eq('call_id', callId).order('turn', { ascending: true });

    const conversationHistory = (history || []).map((h: any) => ({ role: h.role, content: h.content }));

    // KullanÃ„Â±cÃ„Â± mesajÃ„Â±nÃ„Â± kaydet
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'user', content: userText, turn: Number(turn),
    }]);

    // AI cevap ÃƒÂ¼ret
    const agentSettings = {
      company_name: settings?.company_name || 'Ã…Å¸irketimiz',
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

    // AI cevabÃ„Â±nÃ„Â± kaydet
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'assistant', content: aiResult.response, turn: Number(turn),
    }]);

    const voiceId = settings?.elevenlabs_voice_id || 'pNInz6obpgDQGcFmaJgB';
    const elevenKey = process.env.ELEVENLABS_API_KEY;

    if (aiResult.action === 'close_positive') {
      // BaÃ…Å¸arÃ„Â±lÃ„Â± kapanÃ„Â±Ã…Å¸
      if (elevenKey) {
        twiml.play(`${API_URL}/api/voice/twiml/audio?text=${encodeURIComponent(aiResult.response)}&voiceId=${voiceId}&userId=${userId}`);
      } else {
        twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, aiResult.response);
      }
      twiml.hangup();

      // Pipeline gÃƒÂ¼ncelle Ã¢â‚¬â€ Cevap Verdi
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
      // Ã„Â°nsan temsilciye transfer
      twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, 'Sizi ilgili mÃƒÂ¼dÃƒÂ¼rÃƒÂ¼mÃƒÂ¼ze baÃ„Å¸lÃ„Â±yorum.');
      const dial = twiml.dial();
      dial.number(settings?.transfer_number || TWILIO_NUMBER);
      await supabase.from('voice_calls').update({ status: 'transferred' }).eq('id', callId);

    } else {
      // KonuÃ…Å¸ma devam ediyor
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
    twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, 'AnlayamadÃ„Â±m, tekrar eder misiniz?');
    twiml.gather({
      input: ['speech'],
      action: `${API_URL}/api/voice/twiml/respond?callId=${callId}&userId=${userId}&turn=${Number(turn) + 1}`,
      method: 'POST', speechTimeout: 'auto', language: 'tr-TR', timeout: 8,
    });
    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());
  }
});

// GET /api/voice/twiml/audio Ã¢â‚¬â€ ElevenLabs ses ÃƒÂ¼ret ve serve et
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

// POST /api/voice/twiml/status Ã¢â‚¬â€ Arama durumu gÃƒÂ¼ncelle
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

    // Pipeline gÃƒÂ¼ncelle
    const { data: call } = await supabase.from('voice_calls').select('lead_id, outcome').eq('id', callId).single();
    if (call?.lead_id) {
      const pipelineStatus = call?.outcome === 'positive' ? 'responded'
        : CallStatus === 'no-answer' ? 'new' : 'contacted';
      await supabase.from('leads').update({ status: pipelineStatus }).eq('id', call.lead_id);
    }

    // Analiz baÃ…Å¸lat (arka planda)
    if (CallStatus === 'completed' && Number(CallDuration) > 15) {
      analyzeCall(callId).catch(console.error);
    }

    res.sendStatus(200);
  } catch (e: any) {
    console.error('Status error:', e.message);
    res.sendStatus(200);
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬ ARAMA ANALÃ„Â°ZÃ„Â° Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function analyzeCall(callId: string) {
  try {
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('id', callId).single();
    const { data: convHistory } = await supabase.from('voice_conversations').select('*').eq('call_id', callId).order('turn');

    if (!convHistory?.length) return;

    const transcript = convHistory.map((h: any) =>
      `${h.role === 'assistant' ? '[Temsilci]' : '[MÃƒÂ¼Ã…Å¸teri]'}: ${h.content}`
    ).join('\n');

    const analysis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Bu telefon gÃƒÂ¶rÃƒÂ¼Ã…Å¸mesini analiz et:

${transcript}

JSON dÃƒÂ¶ndÃƒÂ¼r:
{
  "overall_score": 0-100,
  "outcome": "sale|callback|no_interest|no_answer",
  "summary": "3 cÃƒÂ¼mle ÃƒÂ¶zet",
  "strengths": ["gÃƒÂ¼ÃƒÂ§lÃƒÂ¼ yÃƒÂ¶n 1", "gÃƒÂ¼ÃƒÂ§lÃƒÂ¼ yÃƒÂ¶n 2"],
  "improvements": ["geliÃ…Å¸im alanÃ„Â± 1", "geliÃ…Å¸im alanÃ„Â± 2"],
  "next_action": "yapÃ„Â±lacak sonraki adÃ„Â±m",
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

    console.log(`Analiz tamamlandÃ„Â±: ${callId} Ã¢â‚¬â€ Skor: ${result.overall_score}`);
  } catch (e: any) {
    console.error('Analiz hatasÃ„Â±:', e.message);
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ SALES SCRIPT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function generateSalesScript(lead: any, settings: any): Promise<any> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `${lead.company_name} Ã…Å¸irketine satÃ„Â±Ã…Å¸ aramasÃ„Â± scripti oluÃ…Å¸tur.
Muhatap: ${lead.contact_name || 'yetkili'}
SektÃƒÂ¶r: ${lead.sector || 'genel'}
Ã…Å¾ehir: ${lead.city || ''}
Arayan: ${settings.company_name} - ${settings.agent_name}
ÃƒÅ“rÃƒÂ¼n: ${settings.product_description || ''}

JSON:
{
  "opening": "DoÃ„Å¸al aÃƒÂ§Ã„Â±lÃ„Â±Ã…Å¸ (10-15 saniye)",
  "pitch": "DeÃ„Å¸er ÃƒÂ¶nerisi (20-30 saniye)",
  "close": "KapanÃ„Â±Ã…Å¸ giriÃ…Å¸imi"
}`
      }]
    });
    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ AI RESPONSE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function generateAIResponse(params: any) {
  const { userText, conversationHistory, script, lead, settings } = params;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: `Sen ${settings.agent_name} adÃ„Â±nda satÃ„Â±Ã…Å¸ temsilcisisin. ${settings.company_name} adÃ„Â±na ${lead.company_name} firmasÃ„Â±nÃ„Â± arÃ„Â±yorsun.
ÃƒÅ“rÃƒÂ¼n: ${settings.product_description || ''}
KURAL: Yapay zeka olduÃ„Å¸unu asla belli etme. KÃ„Â±sa doÃ„Å¸al TÃƒÂ¼rkÃƒÂ§e cÃƒÂ¼mleler. Max 2-3 cÃƒÂ¼mle.
JSON dÃƒÂ¶ndÃƒÂ¼r: {"response": "sÃƒÂ¶yleyeceÃ„Å¸in metin", "action": "continue|close_positive|close_negative|transfer"}`,
      messages: [
        ...conversationHistory.slice(-8),
        { role: 'user', content: userText || '[sessiz]' }
      ],
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { response: 'AnlayamadÃ„Â±m, tekrar eder misiniz?', action: 'continue' };
  } catch {
    return { response: 'Bir saniye, tekrar eder misiniz?', action: 'continue' };
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ DÃ„Â°Ã„Å¾ER ROUTES Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// GET /api/voice/calls Ã¢â‚¬â€ Arama listesi
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

// GET /api/voice/campaigns Ã¢â‚¬â€ Kampanya listesi
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_campaigns')
      .select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/stats Ã¢â‚¬â€ Ã„Â°statistikler
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

// GET /api/voice/settings Ã¢â‚¬â€ Ses ayarlarÃ„Â±
router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_settings').select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || {} });
  } catch { res.json({ settings: {} }); }
});

// PATCH /api/voice/settings Ã¢â‚¬â€ Ses ayarlarÃ„Â±nÃ„Â± gÃƒÂ¼ncelle
router.patch('/settings', async (req: any, res: any) => {
  try {
    const { agent_name, company_name, product_description, transfer_number } = req.body;
    await supabase.from('voice_settings').upsert([{
      user_id: req.userId, agent_name, company_name, product_description, transfer_number,
    }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/twiml/test â€” Test aramasÄ±
router.get('/twiml/test', (req: any, res: any) => {
  const xml = <?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say language="tr-TR" voice="Polly.Filiz">Merhaba! Ben Ahmet, Dekor Panel'den ariyorum. Akustik duvar paneli ve PVC mermer panel konusunda harika kampanyalarimiz var. Su an uygun musunuz?</Say>
  <Pause length="2"/>
  <Say language="tr-TR" voice="Polly.Filiz">Urunlerimiz yuzde kirk daha iyi ses yalitimi sagliyor ve fiyatlarimiz cok uygun. Size ozel teklif hazirlayabiliriz.</Say>
  <Pause length="3"/>
</Response>;
  res.setHeader('Content-Type', 'text/xml');
  res.send(xml);
});

router.get('/twiml/test', function(req, res) {
  res.setHeader('Content-Type', 'text/xml');
  res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="1"/><Say language="tr-TR" voice="Polly.Filiz">Merhaba! Ben Ahmet, Dekor Panel den ariyorum. Akustik duvar paneli ve PVC mermer panel konusunda kampanyalarimiz var. Uygun musunuz?</Say><Pause length="2"/><Say language="tr-TR" voice="Polly.Filiz">Urunlerimiz yuzde kirk daha iyi ses yalitimi sagliyor. Size ozel teklif hazirlayabiliriz.</Say><Pause length="3"/></Response>');
});

module.exports = router;