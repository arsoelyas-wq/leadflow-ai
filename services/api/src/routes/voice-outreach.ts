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

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ TWILIO CLIENT Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
function twilioClient() {
  const twilio = require('twilio');
  return twilio(TWILIO_SID, TWILIO_TOKEN);
}

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ NUMARA DOâ”€Ã—RULAMA Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

// POST /api/voice/verify/send Ã”Ã‡Ã¶ Doâ”€Æ’rulama kodu gâ”œÃ‚nder
router.post('/verify/send', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon numarasâ”€â–’ zorunlu' });

    // Tâ”œâ•rkiye numarasâ”€â–’nâ”€â–’ uluslararasâ”€â–’ formata â”œÂºevir
    let e164 = phone.replace(/\s/g, '');
    if (e164.startsWith('0')) e164 = '+90' + e164.slice(1);
    if (!e164.startsWith('+')) e164 = '+90' + e164;

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Kodu DB'ye kaydet
    await supabase.from('voice_verifications').upsert([{
      user_id: userId, phone: e164, code, expires_at: expires, verified: false
    }]);

    // Twilio ile SMS gâ”œÃ‚nder
    const client = twilioClient();
    await client.messages.create({
      body: `LeadFlow doâ”€Æ’rulama kodunuz: ${code}\nBu kod 10 dakika geâ”œÂºerlidir.`,
      from: TWILIO_NUMBER,
      to: e164,
    });

    res.json({ ok: true, message: `${e164} numarasâ”€â–’na doâ”€Æ’rulama kodu gâ”œÃ‚nderildi` });
  } catch (e: any) {
    console.error('Verify send error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/verify/confirm Ã”Ã‡Ã¶ Kodu onayla
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

    if (!verification) return res.status(400).json({ error: 'Geâ”œÂºersiz veya sâ”œâ•resi dolmuâ”¼Æ’ kod' });

    // Doâ”€Æ’rulandâ”€â–’ Ã”Ã‡Ã¶ numara kaydet
    await supabase.from('voice_verifications').update({ verified: true }).eq('id', verification.id);

    await supabase.from('voice_numbers').upsert([{
      user_id: userId,
      phone: e164,
      is_active: true,
      verified_at: new Date().toISOString(),
    }]);

    // Twilio'ya bu numarayâ”€â–’ kaydet (verified numbers iâ”œÂºin)
    try {
      const client = twilioClient();
      await client.outgoingCallerIds.create({ phoneNumber: e164, friendlyName: `LeadFlow-${userId.slice(0,8)}` });
    } catch (twilioErr: any) {
      // Trial hesapta zaten kayâ”€â–’tlâ”€â–’ysa hata verir, geâ”œÂº
      console.log('Twilio caller ID:', twilioErr.message);
    }

    res.json({ ok: true, phone: e164, message: 'Numara baâ”¼Æ’arâ”€â–’yla doâ”€Æ’rulandâ”€â–’!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/numbers Ã”Ã‡Ã¶ Baâ”€Æ’lâ”€â–’ numaralar
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

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ SES KLONLAMA Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

// POST /api/voice/clone Ã”Ã‡Ã¶ Ses klonla
router.post('/clone', upload.single('audio'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Ses dosyasâ”€â–’ zorunlu' });

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) return res.status(400).json({ error: 'ElevenLabs API key bulunamadâ”€â–’' });

    const form = new FormData();
    form.append('name', name || `LeadFlow-${userId.slice(0, 8)}`);
    form.append('description', 'LeadFlow AI satâ”€â–’â”¼Æ’ sesi');
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
      voice_name: name || 'Klonlanmâ”€â–’â”¼Æ’ Ses',
    }]);

    try { fs.unlinkSync(file.path); } catch {}
    res.json({ ok: true, voiceId, message: 'Ses baâ”¼Æ’arâ”€â–’yla klonlandâ”€â–’!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/preview Ã”Ã‡Ã¶ Ses â”œÃ‚nizleme
router.post('/preview', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { text, voiceId } = req.body;
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) return res.status(400).json({ error: 'ElevenLabs key yok' });

    const vid = voiceId || await getDefaultVoice(userId);
    const r = await axios.post(
      `${ELEVEN_BASE}/text-to-speech/${vid}`,
      { text: text || 'Merhaba, nasâ”€â–’lsâ”€â–’nâ”€â–’z?', model_id: 'eleven_turbo_v2_5',
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
  return data?.elevenlabs_voice_id || 'pNInz6obpgDQGcFmaJgB'; // Varsayâ”€â–’lan Tâ”œâ•rkâ”œÂºe ses
}

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ ARAMA Sâ”€â–‘STEMâ”€â–‘ Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

// POST /api/voice/call/single Ã”Ã‡Ã¶ Tek lead ara
router.post('/call/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, callerId, campaignId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    // Lead bilgisi
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadâ”€â–’' });
    if (!lead.phone) return res.status(400).json({ error: 'Lead telefon numarasâ”€â–’ yok' });

    // Kullanâ”€â–’câ”€â–’ ayarlarâ”€â–’
    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

    // Arama kaydâ”€â–’ oluâ”¼Æ’tur
    const { data: callRecord } = await supabase.from('voice_calls').insert([{
      user_id: userId,
      lead_id: leadId,
      campaign_id: campaignId || null,
      caller_number: callerId || TWILIO_NUMBER,
      callee_number: lead.phone,
      status: 'initiating',
      script: null,
    }]).select().single();

    res.json({ ok: true, callId: callRecord?.id, message: 'Arama baâ”¼Æ’latâ”€â–’lâ”€â–’yor...' });

    // Arka planda arama yap
    (async () => {
      try {
        const agentSettings = {
          company_name: userRow?.company || 'â”¼Æ’irketimiz',
          agent_name: settings?.agent_name || userRow?.name || 'Ahmet',
          product_description: settings?.product_description || '',
        };

        // Script oluâ”¼Æ’tur
        const script = await generateSalesScript(lead, agentSettings);
        await supabase.from('voice_calls').update({ script, status: 'calling' }).eq('id', callRecord?.id);

        // Twilio aramasâ”€â–’ baâ”¼Æ’lat
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

        // Pipeline gâ”œâ•ncelle
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

// POST /api/voice/call/campaign Ã”Ã‡Ã¶ Kampanya aramasâ”€â–’
router.post('/call/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, callerId, campaignName, delayMinutes = 5, maxCallsPerHour = 10 } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead listesi zorunlu' });

    // Kampanya kaydâ”€â–’
    const { data: campaign } = await supabase.from('voice_campaigns').insert([{
      user_id: userId,
      name: campaignName || `Kampanya ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length,
      status: 'running',
      caller_number: callerId || TWILIO_NUMBER,
      delay_minutes: delayMinutes,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} lead iâ”œÂºin arama baâ”¼Æ’latâ”€â–’lâ”€â–’yor` });

    // Arka planda sâ”€â–’ralâ”€â–’ arama
    (async () => {
      let called = 0;
      for (const leadId of leadIds) {
        try {
          // Saatlik limit kontrolâ”œâ•
          if (called > 0 && called % maxCallsPerHour === 0) {
            console.log('Saatlik limit Ã”Ã‡Ã¶ 1 saat bekleniyor');
            await sleep(60 * 60 * 1000);
          }

          // Lead bilgisi
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead?.phone) { called++; continue; }

          const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
          const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

          // Arama kaydâ”€â–’
          const { data: callRecord } = await supabase.from('voice_calls').insert([{
            user_id: userId, lead_id: leadId, campaign_id: campaign?.id,
            caller_number: callerId || TWILIO_NUMBER,
            callee_number: lead.phone, status: 'calling',
          }]).select().single();

          const agentSettings = {
            company_name: userRow?.company || 'â”¼Æ’irketimiz',
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

          // Aramalar arasâ”€â–’ bekleme (anti-spam)
          const delay = (delayMinutes + Math.random() * 2) * 60 * 1000;
          await sleep(delay);

        } catch (err: any) {
          console.error(`Lead ${leadId} arama hatasâ”€â–’:`, err.message);
          called++;
        }
      }

      await supabase.from('voice_campaigns').update({ status: 'completed' }).eq('id', campaign?.id);
      console.log(`Kampanya tamamlandâ”€â–’: ${called} arama`);
    })();

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ TWIML WEBHOOK'LAR Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

// GET /api/voice/twiml/start Ã”Ã‡Ã¶ Twilio aramasâ”€â–’ baâ”¼Æ’ladâ”€â–’â”€Æ’â”€â–’nda
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

    const openingText = script?.opening || `Merhaba, ${call?.leads?.contact_name || ''} Bey/Hanâ”€â–’m. Ben ${settings?.agent_name || 'Ahmet'}, ${settings?.company_name || 'â”¼Æ’irketimizden'} arâ”€â–’yorum. Uygun musunuz kâ”€â–’saca bir â”¼Æ’ey anlatmak istiyorum.`;

    if (elevenKey) {
      // ElevenLabs ses Ã”Ã¥Ã† Twilio'ya URL olarak ver
      const audioUrl = `${API_URL}/api/voice/twiml/audio?text=${encodeURIComponent(openingText)}&voiceId=${voiceId}&userId=${userId}`;
      twiml.play(audioUrl);
    } else {
      // Fallback: Twilio TTS
      const say = twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' });
      say.addText(openingText);
    }

    // Mâ”œâ•â”¼Æ’teri cevabâ”€â–’nâ”€â–’ dinle
    twiml.gather({
      input: ['speech'],
      action: `${API_URL}/api/voice/twiml/respond?callId=${callId}&userId=${userId}&turn=1`,
      method: 'POST',
      speechTimeout: 'auto',
      language: 'tr-TR',
      timeout: 10,
    });

    // Sessizlik Ã”Ã‡Ã¶ tekrar dene
    twiml.redirect(`${API_URL}/api/voice/twiml/start?callId=${callId}&userId=${userId}`);

    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());

    // Konuâ”¼Æ’ma geâ”œÂºmiâ”¼Æ’ini baâ”¼Æ’lat
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'assistant', content: openingText, turn: 0,
    }]);

  } catch (e: any) {
    twiml.say({ language: 'tr-TR' }, 'â”œÂ£zgâ”œâ•nâ”œâ•z, baâ”€Æ’lantâ”€â–’ hatasâ”€â–’.');
    twiml.hangup();
    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());
  }
});

// POST /api/voice/twiml/respond Ã”Ã‡Ã¶ Mâ”œâ•â”¼Æ’teri konuâ”¼Æ’tu, AI cevap ver
router.post('/twiml/respond', async (req: any, res: any) => {
  const { callId, userId, turn } = req.query;
  const { SpeechResult, Confidence } = req.body;
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  try {
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('id', callId).single();
    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();

    // Mâ”œâ•â”¼Æ’teri ne dedi
    const userText = SpeechResult || '';
    console.log(`[Call ${callId}] Mâ”œâ•â”¼Æ’teri (${turn}): ${userText}`);

    // Konuâ”¼Æ’ma geâ”œÂºmiâ”¼Æ’ini al
    const { data: history } = await supabase.from('voice_conversations')
      .select('*').eq('call_id', callId).order('turn', { ascending: true });

    const conversationHistory = (history || []).map((h: any) => ({ role: h.role, content: h.content }));

    // Kullanâ”€â–’câ”€â–’ mesajâ”€â–’nâ”€â–’ kaydet
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'user', content: userText, turn: Number(turn),
    }]);

    // AI cevap â”œâ•ret
    const agentSettings = {
      company_name: settings?.company_name || 'â”¼Æ’irketimiz',
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

    // AI cevabâ”€â–’nâ”€â–’ kaydet
    await supabase.from('voice_conversations').insert([{
      call_id: callId, role: 'assistant', content: aiResult.response, turn: Number(turn),
    }]);

    const voiceId = settings?.elevenlabs_voice_id || 'pNInz6obpgDQGcFmaJgB';
    const elevenKey = process.env.ELEVENLABS_API_KEY;

    if (aiResult.action === 'close_positive') {
      // Baâ”¼Æ’arâ”€â–’lâ”€â–’ kapanâ”€â–’â”¼Æ’
      if (elevenKey) {
        twiml.play(`${API_URL}/api/voice/twiml/audio?text=${encodeURIComponent(aiResult.response)}&voiceId=${voiceId}&userId=${userId}`);
      } else {
        twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, aiResult.response);
      }
      twiml.hangup();

      // Pipeline gâ”œâ•ncelle Ã”Ã‡Ã¶ Cevap Verdi
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
      // â”€â–‘nsan temsilciye transfer
      twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, 'Sizi ilgili mâ”œâ•dâ”œâ•râ”œâ•mâ”œâ•ze baâ”€Æ’lâ”€â–’yorum.');
      const dial = twiml.dial();
      dial.number(settings?.transfer_number || TWILIO_NUMBER);
      await supabase.from('voice_calls').update({ status: 'transferred' }).eq('id', callId);

    } else {
      // Konuâ”¼Æ’ma devam ediyor
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
    twiml.say({ language: 'tr-TR', voice: 'Polly.Filiz' }, 'Anlayamadâ”€â–’m, tekrar eder misiniz?');
    twiml.gather({
      input: ['speech'],
      action: `${API_URL}/api/voice/twiml/respond?callId=${callId}&userId=${userId}&turn=${Number(turn) + 1}`,
      method: 'POST', speechTimeout: 'auto', language: 'tr-TR', timeout: 8,
    });
    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml.toString());
  }
});

// GET /api/voice/twiml/audio Ã”Ã‡Ã¶ ElevenLabs ses â”œâ•ret ve serve et
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

// POST /api/voice/twiml/status Ã”Ã‡Ã¶ Arama durumu gâ”œâ•ncelle
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

    // Pipeline gâ”œâ•ncelle
    const { data: call } = await supabase.from('voice_calls').select('lead_id, outcome').eq('id', callId).single();
    if (call?.lead_id) {
      const pipelineStatus = call?.outcome === 'positive' ? 'responded'
        : CallStatus === 'no-answer' ? 'new' : 'contacted';
      await supabase.from('leads').update({ status: pipelineStatus }).eq('id', call.lead_id);
    }

    // Analiz baâ”¼Æ’lat (arka planda)
    if (CallStatus === 'completed' && Number(CallDuration) > 15) {
      analyzeCall(callId).catch(console.error);
    }

    res.sendStatus(200);
  } catch (e: any) {
    console.error('Status error:', e.message);
    res.sendStatus(200);
  }
});

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ ARAMA ANALâ”€â–‘Zâ”€â–‘ Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
async function analyzeCall(callId: string) {
  try {
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('id', callId).single();
    const { data: convHistory } = await supabase.from('voice_conversations').select('*').eq('call_id', callId).order('turn');

    if (!convHistory?.length) return;

    const transcript = convHistory.map((h: any) =>
      `${h.role === 'assistant' ? '[Temsilci]' : '[Mâ”œâ•â”¼Æ’teri]'}: ${h.content}`
    ).join('\n');

    const analysis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Bu telefon gâ”œÃ‚râ”œâ•â”¼Æ’mesini analiz et:

${transcript}

JSON dâ”œÃ‚ndâ”œâ•r:
{
  "overall_score": 0-100,
  "outcome": "sale|callback|no_interest|no_answer",
  "summary": "3 câ”œâ•mle â”œÃ‚zet",
  "strengths": ["gâ”œâ•â”œÂºlâ”œâ• yâ”œÃ‚n 1", "gâ”œâ•â”œÂºlâ”œâ• yâ”œÃ‚n 2"],
  "improvements": ["geliâ”¼Æ’im alanâ”€â–’ 1", "geliâ”¼Æ’im alanâ”€â–’ 2"],
  "next_action": "yapâ”€â–’lacak sonraki adâ”€â–’m",
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

    console.log(`Analiz tamamlandâ”€â–’: ${callId} Ã”Ã‡Ã¶ Skor: ${result.overall_score}`);
  } catch (e: any) {
    console.error('Analiz hatasâ”€â–’:', e.message);
  }
}

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ SALES SCRIPT Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
async function generateSalesScript(lead: any, settings: any): Promise<any> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `${lead.company_name} â”¼Æ’irketine satâ”€â–’â”¼Æ’ aramasâ”€â–’ scripti oluâ”¼Æ’tur.
Muhatap: ${lead.contact_name || 'yetkili'}
Sektâ”œÃ‚r: ${lead.sector || 'genel'}
â”¼Ã—ehir: ${lead.city || ''}
Arayan: ${settings.company_name} - ${settings.agent_name}
â”œÂ£râ”œâ•n: ${settings.product_description || ''}

JSON:
{
  "opening": "Doâ”€Æ’al aâ”œÂºâ”€â–’lâ”€â–’â”¼Æ’ (10-15 saniye)",
  "pitch": "Deâ”€Æ’er â”œÃ‚nerisi (20-30 saniye)",
  "close": "Kapanâ”€â–’â”¼Æ’ giriâ”¼Æ’imi"
}`
      }]
    });
    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ AI RESPONSE Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡
async function generateAIResponse(params: any) {
  const { userText, conversationHistory, script, lead, settings } = params;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: `Sen ${settings.agent_name} adâ”€â–’nda satâ”€â–’â”¼Æ’ temsilcisisin. ${settings.company_name} adâ”€â–’na ${lead.company_name} firmasâ”€â–’nâ”€â–’ arâ”€â–’yorsun.
â”œÂ£râ”œâ•n: ${settings.product_description || ''}
KURAL: Yapay zeka olduâ”€Æ’unu asla belli etme. Kâ”€â–’sa doâ”€Æ’al Tâ”œâ•rkâ”œÂºe câ”œâ•mleler. Max 2-3 câ”œâ•mle.
JSON dâ”œÃ‚ndâ”œâ•r: {"response": "sâ”œÃ‚yleyeceâ”€Æ’in metin", "action": "continue|close_positive|close_negative|transfer"}`,
      messages: [
        ...conversationHistory.slice(-8),
        { role: 'user', content: userText || '[sessiz]' }
      ],
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { response: 'Anlayamadâ”€â–’m, tekrar eder misiniz?', action: 'continue' };
  } catch {
    return { response: 'Bir saniye, tekrar eder misiniz?', action: 'continue' };
  }
}

// Ã”Ã¶Ã‡Ã”Ã¶Ã‡ Dâ”€â–‘â”€Ã—ER ROUTES Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡

// GET /api/voice/calls Ã”Ã‡Ã¶ Arama listesi
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

// GET /api/voice/campaigns Ã”Ã‡Ã¶ Kampanya listesi
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_campaigns')
      .select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/stats Ã”Ã‡Ã¶ â”€â–‘statistikler
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

// GET /api/voice/settings Ã”Ã‡Ã¶ Ses ayarlarâ”€â–’
router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_settings').select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || {} });
  } catch { res.json({ settings: {} }); }
});

// PATCH /api/voice/settings Ã”Ã‡Ã¶ Ses ayarlarâ”€â–’nâ”€â–’ gâ”œâ•ncelle
router.patch('/settings', async (req: any, res: any) => {
  try {
    const { agent_name, company_name, product_description, transfer_number } = req.body;
    await supabase.from('voice_settings').upsert([{
      user_id: req.userId, agent_name, company_name, product_description, transfer_number,
    }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/twiml-test', function(req, res) { res.setHeader('Content-Type', 'text/xml'); res.send('<Response><Say language="tr-TR" voice="Polly.Filiz">Merhaba! Ben Ahmet, Dekor Panel den ariyorum. Akustik panellerimiz var. Uygun musunuz?</Say></Response>'); });
module.exports = router;
