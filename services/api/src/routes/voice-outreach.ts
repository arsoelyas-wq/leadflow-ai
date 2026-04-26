export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const upload = multer({ dest: '/tmp/voice/' });

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_6801kq0m6eh3e7r9ptx0kre2jvf0';
const PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID || 'phnum_5401kq493ba2e53sef4s776xn9b5';

function elevenHeaders() {
  return { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' };
}

const LANGUAGE_OPENINGS: Record<string, string> = {
  tr: 'Merhaba! Ben {{agent_name}}, {{company_name}} adina ariyorum. Kisa bir bilgi vermek istiyorum, uygun musunuz?',
  en: 'Hello! This is {{agent_name}} calling from {{company_name}}. I have some exciting information to share. Do you have a moment?',
  de: 'Guten Tag! Hier ist {{agent_name}} von {{company_name}}. Ich moechte Ihnen kurz etwas mitteilen. Haben Sie einen Moment?',
  fr: 'Bonjour! Je suis {{agent_name}} de {{company_name}}. J ai une information importante. Avez-vous un moment?',
  ar: 'Ù…Ø±Ø­Ø¨Ø§! Ø§Ù†Ø§ {{agent_name}} Ù…Ù† Ø´Ø±ÙƒØ© {{company_name}}. Ù‡Ù„ Ù„Ø¯ÙŠÙƒ Ø¯Ù‚ÙŠÙ‚Ø©ØŸ',
  ru: 'Zdravstvuyte! Eto {{agent_name}} iz kompanii {{company_name}}. Khotel by podelitsya informatsiyey. Est minuta?',
  az: 'Salam! Men {{agent_name}}, {{company_name}} sirketindenim. Bir deqiqeniz varmi?',
  it: 'Buongiorno! Sono {{agent_name}} di {{company_name}}. Ha un momento?',
  es: 'Hola! Soy {{agent_name}} de {{company_name}}. Tiene un momento?',
  nl: 'Goedendag! Ik ben {{agent_name}} van {{company_name}}. Heeft u even tijd?',
  zh: 'æ‚¨å¥½ï¼æˆ‘æ˜¯{{company_name}}çš„{{agent_name}}ã€‚è¯·é—®æ‚¨çŽ°åœ¨æ–¹ä¾¿å—ï¼Ÿ',
  ja: 'ã“ã‚“ã«ã¡ã¯ï¼{{company_name}}ã®{{agent_name}}ã¨ç”³ã—ã¾ã™ã€‚ã‚ˆã‚ã—ã„ã§ã—ã‚‡ã†ã‹ï¼Ÿ',
};

function buildOpeningLine(language: string, agentName: string, companyName: string): string {
  const template = LANGUAGE_OPENINGS[language] || LANGUAGE_OPENINGS['en'];
  return template.replace(/{{agent_name}}/g, agentName).replace(/{{company_name}}/g, companyName);
}

function getLanguageByCountry(countryCode: string): string {
  const map: Record<string, string> = {
    TR: 'tr', DE: 'de', AT: 'de', CH: 'de',
    GB: 'en', US: 'en', CA: 'en', AU: 'en', IN: 'en',
    FR: 'fr', BE: 'fr',
    AE: 'ar', SA: 'ar', QA: 'ar', KW: 'ar', EG: 'ar', MA: 'ar',
    RU: 'ru', KZ: 'ru',
    AZ: 'az', IT: 'it',
    ES: 'es', MX: 'es',
    NL: 'nl', CN: 'zh', JP: 'ja', PL: 'pl',
  };
  return map[countryCode?.toUpperCase()] || 'en';
}

async function makeElevenLabsCall(params: any) {
  const { toNumber, agentName, companyName, productDescription, leadName, leadCompany, language, avoidWords, openingLine } = params;
  const response = await axios.post(
    `${ELEVEN_BASE}/convai/twilio/outbound-call`,
    {
      agent_id: AGENT_ID,
      agent_phone_number_id: PHONE_NUMBER_ID,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: {
          agent_name: agentName,
          company_name: companyName,
          product_description: productDescription,
          lead_name: leadName,
          lead_company: leadCompany,
          language,
          avoid_words: avoidWords || '',
          opening_line: openingLine,
        },
      },
    },
    { headers: elevenHeaders(), timeout: 30000 }
  );
  return { conversationId: response.data.conversation_id, callSid: response.data.callSid };
}

// â”€â”€ ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/voice/eleven-voices â€” TÃ¼m sesler (normal + shared + kategorili)
router.get('/eleven-voices', async (req, res) => {
  try {
    const { language = 'tr' } = req.query;
    const { data: settings } = await supabase.from('voice_settings').select('elevenlabs_voice_id, voice_name').eq('user_id', req.userId).single();
    const norm = (v, src) => ({ voice_id: v.voice_id, name: v.name, category: v.category || src, preview_url: v.preview_url || null, gender: v.labels && v.labels.gender || v.gender || null, accent: v.labels && v.labels.accent || v.accent || null, use_case: v.labels && v.labels.use_case || v.use_case || null, source: src });
    const [r1, r2] = await Promise.allSettled([
      axios.get(ELEVEN_BASE + '/voices', { headers: elevenHeaders() }),
      axios.get(ELEVEN_BASE + '/shared-voices?page_size=100&language=' + language, { headers: elevenHeaders() }),
    ]);
    const myV = r1.status === 'fulfilled' ? r1.value.data.voices.map(v => norm(v, 'my')) : [];
    const langV = r2.status === 'fulfilled' ? r2.value.data.voices.map(v => norm(v, 'shared')) : [];
    res.json({ categories: { my: myV, cloned: myV.filter(v => v.category === 'cloned'), professional: myV.filter(v => ['professional','customer_service','sales'].includes(v.use_case)), language: langV, all: [...myV, ...langV] }, userVoiceId: settings && settings.elevenlabs_voice_id || null, userVoiceName: settings && settings.voice_name || null, total: langV.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const upload = multer({ dest: '/tmp/voice/' });

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_6801kq0m6eh3e7r9ptx0kre2jvf0';
const PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID || 'phnum_5401kq493ba2e53sef4s776xn9b5';

function elevenHeaders() {
  return { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' };
}

const LANGUAGE_OPENINGS: Record<string, string> = {
  tr: 'Merhaba! Ben {{agent_name}}, {{company_name}} adina ariyorum. Kisa bir bilgi vermek istiyorum, uygun musunuz?',
  en: 'Hello! This is {{agent_name}} calling from {{company_name}}. I have some exciting information to share. Do you have a moment?',
  de: 'Guten Tag! Hier ist {{agent_name}} von {{company_name}}. Ich moechte Ihnen kurz etwas mitteilen. Haben Sie einen Moment?',
  fr: 'Bonjour! Je suis {{agent_name}} de {{company_name}}. J ai une information importante. Avez-vous un moment?',
  ar: 'Ù…Ø±Ø­Ø¨Ø§! Ø§Ù†Ø§ {{agent_name}} Ù…Ù† Ø´Ø±ÙƒØ© {{company_name}}. Ù‡Ù„ Ù„Ø¯ÙŠÙƒ Ø¯Ù‚ÙŠÙ‚Ø©ØŸ',
  ru: 'Zdravstvuyte! Eto {{agent_name}} iz kompanii {{company_name}}. Khotel by podelitsya informatsiyey. Est minuta?',
  az: 'Salam! Men {{agent_name}}, {{company_name}} sirketindenim. Bir deqiqeniz varmi?',
  it: 'Buongiorno! Sono {{agent_name}} di {{company_name}}. Ha un momento?',
  es: 'Hola! Soy {{agent_name}} de {{company_name}}. Tiene un momento?',
  nl: 'Goedendag! Ik ben {{agent_name}} van {{company_name}}. Heeft u even tijd?',
  zh: 'æ‚¨å¥½ï¼æˆ‘æ˜¯{{company_name}}çš„{{agent_name}}ã€‚è¯·é—®æ‚¨çŽ°åœ¨æ–¹ä¾¿å—ï¼Ÿ',
  ja: 'ã“ã‚“ã«ã¡ã¯ï¼{{company_name}}ã®{{agent_name}}ã¨ç”³ã—ã¾ã™ã€‚ã‚ˆã‚ã—ã„ã§ã—ã‚‡ã†ã‹ï¼Ÿ',
};

function buildOpeningLine(language: string, agentName: string, companyName: string): string {
  const template = LANGUAGE_OPENINGS[language] || LANGUAGE_OPENINGS['en'];
  return template.replace(/{{agent_name}}/g, agentName).replace(/{{company_name}}/g, companyName);
}

function getLanguageByCountry(countryCode: string): string {
  const map: Record<string, string> = {
    TR: 'tr', DE: 'de', AT: 'de', CH: 'de',
    GB: 'en', US: 'en', CA: 'en', AU: 'en', IN: 'en',
    FR: 'fr', BE: 'fr',
    AE: 'ar', SA: 'ar', QA: 'ar', KW: 'ar', EG: 'ar', MA: 'ar',
    RU: 'ru', KZ: 'ru',
    AZ: 'az', IT: 'it',
    ES: 'es', MX: 'es',
    NL: 'nl', CN: 'zh', JP: 'ja', PL: 'pl',
  };
  return map[countryCode?.toUpperCase()] || 'en';
}

async function makeElevenLabsCall(params: any) {
  const { toNumber, agentName, companyName, productDescription, leadName, leadCompany, language, avoidWords, openingLine } = params;
  const response = await axios.post(
    `${ELEVEN_BASE}/convai/twilio/outbound-call`,
    {
      agent_id: AGENT_ID,
      agent_phone_number_id: PHONE_NUMBER_ID,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: {
          agent_name: agentName,
          company_name: companyName,
          product_description: productDescription,
          lead_name: leadName,
          lead_company: leadCompany,
          language,
          avoid_words: avoidWords || '',
          opening_line: openingLine,
        },
      },
    },
    { headers: elevenHeaders(), timeout: 30000 }
  );
  return { conversationId: response.data.conversation_id, callSid: response.data.callSid };
}

// â”€â”€ ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/voice/eleven-voices â€” TÃ¼m sesler (normal + shared + kategorili)
// POST /api/voice/preview-voice â€” Ses Ã¶nizleme (preview_url veya TTS)
router.post('/preview-voice', async (req: any, res: any) => {
  try {
    const { voiceId, text, language } = req.body;

    const defaultTexts: Record<string, string> = {
      tr: 'Merhaba, nasÄ±lsÄ±nÄ±z? Size kÄ±sa bir bilgi vermek istiyorum.',
      en: 'Hello, how are you? I would like to share some information.',
      de: 'Guten Tag! Ich mÃ¶chte Ihnen kurz etwas mitteilen.',
      ar: 'Ù…Ø±Ø­Ø¨Ø§Ù‹ØŒ ÙƒÙŠÙ Ø­Ø§Ù„ÙƒØŸ Ø£ÙˆØ¯ Ù…Ø´Ø§Ø±ÙƒØªÙƒ Ø¨Ø¨Ø¹Ø¶ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª.',
      fr: 'Bonjour! Je voudrais partager quelques informations avec vous.',
      ru: 'Ð—Ð´Ñ€Ð°Ð²ÑÑ‚Ð²ÑƒÐ¹Ñ‚Ðµ! Ð¥Ð¾Ñ‚ÐµÐ» Ð¿Ð¾Ð´ÐµÐ»Ð¸Ñ‚ÑŒÑÑ Ð²Ð°Ð¶Ð½Ð¾Ð¹ Ð¸Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ð¸ÐµÐ¹.',
      es: 'Hola! Me gustarÃ­a compartir informaciÃ³n importante.',
      it: 'Buongiorno! Vorrei condividere alcune informazioni.',
    };

    const r = await axios.post(
      `${ELEVEN_BASE}/text-to-speech/${voiceId}`,
      {
        text: text || defaultTexts[language || 'tr'] || defaultTexts['tr'],
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.75, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
      },
      {
        headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: 15000,
      }
    );

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(r.data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/set-voice
router.post('/set-voice', async (req: any, res: any) => {
  try {
    const { voiceId, voiceName } = req.body;
    await supabase.from('voice_settings').upsert([{ user_id: req.userId, elevenlabs_voice_id: voiceId, voice_name: voiceName }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/clone â€” Ses klonla
router.post('/clone', upload.single('audio'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Ses dosyasÄ± zorunlu' });

    const form = new FormData();
    form.append('name', name || `LeadFlow-${userId.slice(0, 8)}`);
    form.append('description', 'LeadFlow AI satÄ±ÅŸ sesi');
    form.append('files', fs.createReadStream(file.path), { filename: 'voice.mp3', contentType: 'audio/mpeg' });

    const r = await axios.post(`${ELEVEN_BASE}/voices/add`, form, {
      headers: { ...form.getHeaders(), 'xi-api-key': ELEVEN_KEY },
      timeout: 60000,
    });

    const voiceId = r.data.voice_id;
    await supabase.from('voice_settings').upsert([{
      user_id: userId, elevenlabs_voice_id: voiceId, voice_name: name || 'KlonlanmÄ±ÅŸ Sesim',
    }]);

    try { fs.unlinkSync(file.path); } catch {}
    res.json({ ok: true, voiceId, message: 'Ses klonlandÄ±!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/call/single
router.post('/call/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, language } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadÄ±' });
    if (!lead.phone) return res.status(400).json({ error: 'Telefon numarasÄ± yok' });

    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

    const agentName = settings?.agent_name || userRow?.name || 'SatÄ±ÅŸ Temsilcisi';
    const companyName = profile?.company?.name || userRow?.company || 'sirketimiz';
    const productDesc = profile?.product?.description || settings?.product_description || '';
    const avoidWords = profile?.sales_style?.avoid_words || '';
    const callLanguage = language || getLanguageByCountry(lead.country_code || '') || 'tr';
    const openingLine = buildOpeningLine(callLanguage, agentName, companyName);

    const { data: callRecord } = await supabase.from('voice_calls').insert([{
      user_id: userId, lead_id: leadId,
      callee_number: lead.phone, caller_number: '+19784325322',
      status: 'initiating', language: callLanguage,
    }]).select().single();

    res.json({ ok: true, callId: callRecord?.id, message: 'Arama ElevenLabs Ã¼zerinden baÅŸlatÄ±lÄ±yor...' });

    (async () => {
      try {
        const result = await makeElevenLabsCall({
          toNumber: lead.phone, agentName, companyName, productDescription: productDesc,
          leadName: lead.contact_name || lead.company_name, leadCompany: lead.company_name,
          language: callLanguage, avoidWords, openingLine,
        });
        await supabase.from('voice_calls').update({
          eleven_conversation_id: result.conversationId, twilio_call_sid: result.callSid, status: 'calling',
        }).eq('id', callRecord?.id);
        await supabase.from('leads').update({ status: 'contacted', last_contacted_at: new Date().toISOString() }).eq('id', leadId);
        console.log(`Arama: ${lead.phone} (${callLanguage})`);
      } catch (err: any) {
        await supabase.from('voice_calls').update({ status: 'failed', notes: err.message }).eq('id', callRecord?.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/call/campaign
router.post('/call/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, campaignName, delayMinutes = 5, language } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead listesi zorunlu' });

    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

    const agentName = settings?.agent_name || userRow?.name || 'SatÄ±ÅŸ Temsilcisi';
    const companyName = profile?.company?.name || userRow?.company || 'sirketimiz';
    const productDesc = profile?.product?.description || settings?.product_description || '';
    const avoidWords = profile?.sales_style?.avoid_words || '';

    const { data: campaign } = await supabase.from('voice_campaigns').insert([{
      user_id: userId, name: campaignName || `Kampanya ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length, status: 'running', caller_number: '+19784325322', delay_minutes: delayMinutes,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} lead iÃ§in arama baÅŸlatÄ±lÄ±yor` });

    (async () => {
      let called = 0;
      for (const leadId of leadIds) {
        try {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead?.phone) { called++; continue; }
          const callLanguage = language || getLanguageByCountry(lead.country_code || '') || 'tr';
          const openingLine = buildOpeningLine(callLanguage, agentName, companyName);
          const { data: callRecord } = await supabase.from('voice_calls').insert([{
            user_id: userId, lead_id: leadId, campaign_id: campaign?.id,
            callee_number: lead.phone, caller_number: '+19784325322', status: 'calling', language: callLanguage,
          }]).select().single();
          const result = await makeElevenLabsCall({
            toNumber: lead.phone, agentName, companyName, productDescription: productDesc,
            leadName: lead.contact_name || lead.company_name, leadCompany: lead.company_name,
            language: callLanguage, avoidWords, openingLine,
          });
          await supabase.from('voice_calls').update({
            eleven_conversation_id: result.conversationId, twilio_call_sid: result.callSid, status: 'calling',
          }).eq('id', callRecord?.id);
          await supabase.from('leads').update({ status: 'contacted', last_contacted_at: new Date().toISOString() }).eq('id', leadId);
          await supabase.from('voice_campaigns').update({ calls_made: called + 1 }).eq('id', campaign?.id);
          called++;
          console.log(`${called}/${leadIds.length}: ${lead.phone} (${callLanguage})`);
          await new Promise(r => setTimeout(r, (delayMinutes + Math.random() * 2) * 60 * 1000));
        } catch (err: any) { console.error(err.message); called++; }
      }
      await supabase.from('voice_campaigns').update({ status: 'completed' }).eq('id', campaign?.id);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/webhook/elevenlabs
router.post('/webhook/elevenlabs', async (req: any, res: any) => {
  try {
    const { conversation_id, status, transcript, analysis, metadata } = req.body;
    res.sendStatus(200);
    if (!conversation_id) return;
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('eleven_conversation_id', conversation_id).single();
    if (!call) return;
    const updates: any = { status: 'completed', ended_at: new Date().toISOString() };
    if (transcript) updates.transcript = JSON.stringify(transcript);
    if (analysis) { updates.analysis = analysis; updates.outcome = analysis.success_evaluation === 'success' ? 'positive' : 'negative'; }
    await supabase.from('voice_calls').update(updates).eq('eleven_conversation_id', conversation_id);
    if (call.lead_id) await supabase.from('leads').update({ status: updates.outcome === 'positive' ? 'responded' : 'contacted' }).eq('id', call.lead_id);
    console.log(`Webhook: ${conversation_id} - ${updates.outcome}`);
  } catch (e: any) { console.error('Webhook error:', e.message); }
});

// GET /api/voice/calls
router.get('/calls', async (req: any, res: any) => {
  try {
    const { limit = 50, campaignId } = req.query;
    let query = supabase.from('voice_calls').select('*, leads(company_name, phone, contact_name, country)').eq('user_id', req.userId).order('created_at', { ascending: false }).limit(Number(limit));
    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data } = await query;
    res.json({ calls: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/campaigns
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_campaigns').select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_calls').select('status, duration_seconds, outcome, language').eq('user_id', req.userId);
    const calls = data || [];
    const byLanguage = calls.reduce((acc: any, c: any) => { acc[c.language || 'tr'] = (acc[c.language || 'tr'] || 0) + 1; return acc; }, {});
    res.json({ total: calls.length, completed: calls.filter((c: any) => c.status === 'completed').length, positive: calls.filter((c: any) => c.outcome === 'positive').length, no_answer: calls.filter((c: any) => c.status === 'no-answer').length, totalMinutes: Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / 60), byLanguage });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/settings
router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_settings').select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || {} });
  } catch { res.json({ settings: {} }); }
});

// PATCH /api/voice/settings
router.patch('/settings', async (req: any, res: any) => {
  try {
    const { agent_name, company_name, product_description, transfer_number } = req.body;
    await supabase.from('voice_settings').upsert([{ user_id: req.userId, agent_name, company_name, product_description, transfer_number }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/numbers
router.get('/numbers', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_numbers').select('*').eq('user_id', req.userId).eq('is_active', true);
    res.json({ numbers: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;