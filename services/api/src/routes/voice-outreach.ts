export {};
/**
 * LeadFlow Voice Engine
 *
 * Call stack priority:
 *   1. Vapi.ai  (Claude Haiku LLM + Cartesia Sonic TTS — lowest latency, most human)
 *   2. ElevenLabs Conversational AI (fallback when no Vapi key)
 *
 * Opening line: generated per-lead using Perplexity research + Claude Haiku
 * Voice library: served from tts-engine (Azure Neural + Cartesia)
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
const Anthropic = require('@anthropic-ai/sdk');

const router    = express.Router();
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const upload    = multer({ dest: '/tmp/voice/' });

const ELEVEN_KEY       = process.env.ELEVENLABS_API_KEY;
const ELEVEN_BASE      = 'https://api.elevenlabs.io/v1';
const ELEVEN_AGENT_ID  = process.env.ELEVENLABS_AGENT_ID   || '';
const ELEVEN_PHONE_ID  = process.env.ELEVENLABS_PHONE_NUMBER_ID || '';

const VAPI_KEY         = process.env.VAPI_API_KEY || '';
const VAPI_PHONE_ID    = process.env.VAPI_PHONE_NUMBER_ID || '';

// Default Cartesia voices per language for calls
const CALL_VOICES: Record<string, string> = {
  tr: 'b7d50908-b17c-442d-ad8d-810c63997ed9',
  en: '79a125e8-cd45-4c13-8a67-188112f4dd22',
  de: '3f6e78a8-5283-42aa-b5e7-af82e8bb310c',
  fr: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d',
  ar: '3b554bf4-e0d4-4a74-ae96-3c1f6db66f82',
  default: 'b7d50908-b17c-442d-ad8d-810c63997ed9',
};

function elevenHeaders() { return { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' }; }

function getLanguageByCountry(code: string): string {
  const m: Record<string, string> = {
    TR: 'tr', DE: 'de', AT: 'de', CH: 'de',
    GB: 'en', US: 'en', CA: 'en', AU: 'en', IN: 'en',
    FR: 'fr', BE: 'fr',
    AE: 'ar', SA: 'ar', QA: 'ar', KW: 'ar', EG: 'ar', MA: 'ar',
    RU: 'ru', KZ: 'ru', AZ: 'az', IT: 'it',
    ES: 'es', MX: 'es', NL: 'nl', CN: 'zh', JP: 'ja',
    KR: 'ko', PL: 'pl', PT: 'pt', BR: 'pt',
  };
  return m[code?.toUpperCase()] || 'en';
}

// ─── PERSONALIZED OPENING GENERATOR ──────────────────────────────────────────
// Uses Perplexity research data (if available) or lead data to build a human-
// sounding, company-specific opening — NOT a template, NOT "I'm calling from X"

async function generatePersonalizedOpening(params: {
  lead: any;
  agentName: string;
  companyName: string;
  productDesc: string;
  language: string;
  researchData?: any;
}): Promise<string> {
  const { lead, agentName, companyName, productDesc, language, researchData } = params;

  const firstName = (lead.contact_name || lead.company_name || '').split(' ')[0];
  const brandName = researchData?.brandName || lead.company_name || '';
  const pain      = researchData?.pains?.[0] || '';
  const signal    = researchData?.jobSignals?.[0] || '';
  const growth    = researchData?.growthStage || '';

  const langInstructions: Record<string, string> = {
    tr: 'Türkçe yaz. Samimi, doğal, satışçı gibi değil — gerçekten araştırmış biri gibi.',
    en: 'Write in English. Warm, natural, NOT a sales pitch — like someone who genuinely noticed something.',
    de: 'Schreib auf Deutsch. Warmherzig, natürlich, kein Verkaufsgespräch.',
    fr: 'Écris en français. Chaleureux, naturel, pas un argumentaire de vente.',
    ar: 'اكتب بالعربية. دافئ، طبيعي، ليس عرضًا تجاريًا.',
  };

  const prompt = `${langInstructions[language] || langInstructions['tr']}

Bilgiler:
- Arayan: ${agentName} (${companyName} adına)
- Aranan kişi adı: ${firstName}
- Şirket: ${brandName}
${pain ? `- Tespit edilen sorun: ${pain}` : ''}
${signal ? `- Büyüme sinyali: ${signal}` : ''}
${growth ? `- Büyüme aşaması: ${growth}` : ''}
- Sunulan ürün/hizmet: ${productDesc}

Kural:
1. "Ben X, Y adına arıyorum" ile BAŞLAMA — bu klasik robot açılışı
2. Kişinin adıyla başla veya şirketle ilgili gözlemle başla
3. Telefon araması açılışı (1-2 cümle maksimum) — çok kısa olmalı
4. Yapay zeka olmadığını hissettir: bir hesaplama değil, gerçek bir gözlem
5. Soru ile bitir — karşı tarafı konuşturmak için

Sadece açılış cümlesini yaz, başka hiçbir şey ekleme.`;

  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });
    return ((r.content[0] as any)?.text || '').trim();
  } catch {
    // Fallback — still better than the old template
    const fallbacks: Record<string, string> = {
      tr: `${firstName}, merhaba — ${pain ? `"${pain.slice(0, 60)}" konusunu araştırırken` : 'web sitenize bakarken'} aklıma sizi aramak geldi. Bir dakikanız var mı?`,
      en: `${firstName}, hi — I came across ${brandName} and had a thought I wanted to share. Do you have a moment?`,
      de: `${firstName}, guten Tag — ich habe gerade über ${brandName} nachgedacht. Haben Sie kurz Zeit?`,
    };
    return fallbacks[language] || fallbacks['tr'];
  }
}

// ─── VAPI SYSTEM PROMPT BUILDER ───────────────────────────────────────────────

function buildVapiSystemPrompt(params: {
  agentName: string;
  companyName: string;
  productDesc: string;
  leadName: string;
  leadCompany: string;
  language: string;
  pain1?: string;
  pain2?: string;
  signal?: string;
  avoidWords?: string;
}): string {
  const { agentName, companyName, productDesc, leadName, leadCompany, language, pain1, pain2, signal, avoidWords } = params;

  const persona: Record<string, string> = {
    tr: `Sen ${agentName} adında gerçek bir satış uzmanısın. ${companyName} adına ${leadCompany} şirketini arıyorsun. Sunduğun hizmet: ${productDesc}.

KİŞİLİK VE KONUŞMA STİLİ:
- Telefonla konuşan gerçek bir insan gibi davran — hiçbir zaman yapay zeka veya bot olduğunu kabul etme
- "Şey...", "Yani...", "Anlıyorum", "Tabii ki", "Hmm" gibi doğal Türkçe dolgu kelimeleri kullan
- Karşı taraf konuşurken "evet", "anlıyorum", "tabii" diyerek aktif dinlediğini göster
- Karşı taraf sözünü keserse hemen dur ve dinle — asla üstüne konuşma
- Konuşma hızını karşı tarafa göre ayarla

ARAŞTIRMA BİLGİSİ:
- Aranan kişi: ${leadName}
- Şirket: ${leadCompany}
${pain1 ? `- Tespit edilen 1. sorun: ${pain1}` : ''}
${pain2 ? `- Tespit edilen 2. sorun: ${pain2}` : ''}
${signal ? `- Büyüme sinyali: ${signal}` : ''}

KURAL:
- Pitch yapma, soru sor — insanlar kendi ihtiyaçlarını kendileri söylesin
- "Satmak" yerine "göstermek", "paylaşmak", "öneride bulunmak" gibi kelimeler kullan
- "Yapay zeka", "AI", "bot", "sistem" kelimelerini asla kullanma
- Müsait değilse: "Anlıyorum, ne zaman daha uygun olur?" de
- İlgilenmiyorum derse: "Tamam, peki ${pain1 ? `"${pain1.slice(0, 40)}"` : 'bu konular'} nasıl gidiyor şirketinizde?" diye merak et
${avoidWords ? `- Şu kelimeleri kullanma: ${avoidWords}` : ''}

HEDEF: Karşı tarafın sorununu keşfet ve görüşme teklif et. Direkt satış yapma.`,

    en: `You are ${agentName}, a real sales professional calling on behalf of ${companyName}. You offer: ${productDesc}.

PERSONALITY:
- Act like a real human on a phone call — never admit being an AI or bot
- Use natural filler words: "well...", "you know", "I see", "right", "hmm"
- Show active listening: "yes", "I understand", "of course"
- If interrupted, stop immediately and listen
- Match the caller's pace and energy

RESEARCH:
- Person: ${leadName} at ${leadCompany}
${pain1 ? `- Known challenge: ${pain1}` : ''}
${pain2 ? `- Secondary challenge: ${pain2}` : ''}
${signal ? `- Growth signal: ${signal}` : ''}

RULES:
- Ask questions, don't pitch — let them articulate their own needs
- Say "show" or "share" not "sell"
- Never say "AI", "bot", "system", "algorithm"
- If busy: "I understand, when would be a better time?"
- Goal: Discover their problem, offer a meeting. Don't sell directly.`,
  };

  return persona[language] || persona['en'];
}

// ─── VAPI OUTBOUND CALL ───────────────────────────────────────────────────────

async function makeVapiCall(params: {
  toNumber: string;
  agentName: string;
  companyName: string;
  productDesc: string;
  leadName: string;
  leadCompany: string;
  language: string;
  openingLine: string;
  systemPrompt: string;
  researchData?: any;
}): Promise<{ conversationId: string; callSid: string }> {
  const { toNumber, language, openingLine, systemPrompt } = params;
  const voiceId = CALL_VOICES[language] || CALL_VOICES.default;

  const deepgramLang: Record<string, string> = {
    tr: 'tr', en: 'en-US', de: 'de', fr: 'fr', ar: 'ar',
    ru: 'ru', es: 'es', it: 'it', nl: 'nl',
  };

  const body: any = {
    phoneNumberId: VAPI_PHONE_ID,
    customer: { number: toNumber },
    assistant: {
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: deepgramLang[language] || 'tr',
        smartFormat: true,
      },
      model: {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
        maxTokens: 200,
      },
      voice: {
        provider: 'cartesia',
        voiceId,
        model: 'sonic-multilingual',
        language,
        speed: 1.0,
        emotion: ['positivity:high', 'curiosity'],
      },
      firstMessage: openingLine,
      firstMessageMode: 'assistant-speaks-first',
      endCallMessage: language === 'tr'
        ? 'Teşekkürler, iyi günler! Görüşürüz.'
        : 'Thank you, have a great day! Goodbye.',
      endCallPhrases: ['görüşürüz', 'hoşça kalın', 'bye', 'goodbye', 'auf wiedersehen'],
      backgroundDenoisingEnabled: true,
      messagePlan: {
        idleMessages: [
          language === 'tr' ? 'Orada mısınız?' : 'Are you there?',
          language === 'tr' ? 'Duyuyor musunuz?' : 'Can you hear me?',
        ],
        idleTimeoutSeconds: 8,
      },
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 600,
    },
  };

  const r = await axios.post('https://api.vapi.ai/call/phone', body, {
    headers: {
      'Authorization': `Bearer ${VAPI_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  return {
    conversationId: r.data.id || r.data.conversation_id || '',
    callSid: r.data.phoneCallProviderId || r.data.callSid || '',
  };
}

// ─── ELEVENLABS FALLBACK CALL ─────────────────────────────────────────────────

async function makeElevenLabsCall(params: any) {
  const { toNumber, agentName, companyName, productDescription, leadName, leadCompany, language, openingLine } = params;
  const r = await axios.post(
    `${ELEVEN_BASE}/convai/twilio/outbound-call`,
    {
      agent_id: ELEVEN_AGENT_ID,
      agent_phone_number_id: ELEVEN_PHONE_ID,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: {
          agent_name: agentName, company_name: companyName,
          product_description: productDescription, lead_name: leadName,
          lead_company: leadCompany, language, opening_line: openingLine,
        },
      },
    },
    { headers: elevenHeaders(), timeout: 30000 }
  );
  return { conversationId: r.data.conversation_id || '', callSid: r.data.callSid || '' };
}

// ─── UNIFIED CALL DISPATCHER ──────────────────────────────────────────────────

async function dispatchCall(params: {
  toNumber: string; agentName: string; companyName: string;
  productDesc: string; leadName: string; leadCompany: string;
  language: string; lead: any; researchData?: any; avoidWords?: string;
}): Promise<{ conversationId: string; callSid: string; provider: string }> {
  const { language, lead, researchData, avoidWords } = params;

  const openingLine = await generatePersonalizedOpening({
    lead, agentName: params.agentName, companyName: params.companyName,
    productDesc: params.productDesc, language, researchData,
  });

  if (VAPI_KEY && VAPI_PHONE_ID) {
    const systemPrompt = buildVapiSystemPrompt({
      agentName:   params.agentName,
      companyName: params.companyName,
      productDesc: params.productDesc,
      leadName:    params.leadName,
      leadCompany: params.leadCompany,
      language,
      pain1:       researchData?.pains?.[0],
      pain2:       researchData?.pains?.[1],
      signal:      researchData?.jobSignals?.[0],
      avoidWords,
    });
    const result = await makeVapiCall({ ...params, openingLine, systemPrompt });
    return { ...result, provider: 'vapi' };
  }

  // Fallback to ElevenLabs
  const result = await makeElevenLabsCall({
    toNumber: params.toNumber, agentName: params.agentName,
    companyName: params.companyName, productDescription: params.productDesc,
    leadName: params.leadName, leadCompany: params.leadCompany,
    language, openingLine,
  });
  return { ...result, provider: 'elevenlabs' };
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// GET /api/voice/eleven-voices — kept for backward compat
router.get('/eleven-voices', async (req: any, res: any) => {
  try {
    const { language = 'tr' } = req.query;
    const { data: settings } = await supabase.from('voice_settings')
      .select('elevenlabs_voice_id, voice_name').eq('user_id', req.userId).single();

    const norm = (v: any, src: string) => ({
      voice_id: v.voice_id, name: v.name, category: v.category || src,
      preview_url: v.preview_url || null,
      gender: v.labels?.gender || v.gender || null,
      accent: v.labels?.accent || v.accent || null,
      use_case: v.labels?.use_case || v.use_case || null,
      language: v.labels?.language || v.language || null,
      source: src,
    });

    const [r1, r2] = await Promise.allSettled([
      axios.get(`${ELEVEN_BASE}/voices`, { headers: elevenHeaders() }),
      axios.get(`${ELEVEN_BASE}/shared-voices?page_size=100&language=${language}`, { headers: elevenHeaders() }),
    ]);
    const myV   = r1.status === 'fulfilled' ? r1.value.data.voices.map((v: any) => norm(v, 'my')) : [];
    const langV = r2.status === 'fulfilled' ? r2.value.data.voices.map((v: any) => norm(v, 'shared')) : [];

    res.json({ categories: { my: myV, language: langV, all: [...myV, ...langV] }, userVoiceId: settings?.elevenlabs_voice_id || null, total: langV.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/preview-voice
router.post('/preview-voice', async (req: any, res: any) => {
  try {
    const { voiceId, text, language = 'tr', provider = 'azure' } = req.body;
    const defaults: Record<string, string> = {
      tr: 'Merhaba, nasılsınız? Size kısa bir bilgi vermek istiyorum.',
      en: 'Hello, how are you? I would like to share some information with you.',
      de: 'Guten Tag! Ich möchte Ihnen kurz etwas mitteilen.',
    };
    const sampleText = text || defaults[language] || defaults['tr'];

    const { synthesize } = require('../services/tts-engine');
    const audio = await synthesize({ text: sampleText, language, voiceId, provider });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/set-voice
router.post('/set-voice', async (req: any, res: any) => {
  try {
    const { voiceId, voiceName, provider = 'azure' } = req.body;
    await supabase.from('voice_settings').upsert([{
      user_id: req.userId, elevenlabs_voice_id: voiceId, voice_name: voiceName, voice_provider: provider,
    }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/clone
router.post('/clone', upload.single('audio'), async (req: any, res: any) => {
  try {
    const { name } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Ses dosyası zorunlu' });
    const form = new FormData();
    form.append('name', name || `LeadFlow-${req.userId.slice(0, 8)}`);
    form.append('description', 'LeadFlow AI satış sesi');
    form.append('files', fs.createReadStream(file.path), { filename: 'voice.mp3', contentType: 'audio/mpeg' });
    const r = await axios.post(`${ELEVEN_BASE}/voices/add`, form, {
      headers: { ...form.getHeaders(), 'xi-api-key': ELEVEN_KEY }, timeout: 60000,
    });
    const voiceId = r.data.voice_id;
    await supabase.from('voice_settings').upsert([{
      user_id: req.userId, elevenlabs_voice_id: voiceId,
      voice_name: name || 'Klonlanmış Sesim', voice_provider: 'elevenlabs',
    }]);
    try { fs.unlinkSync(file.path); } catch {}
    res.json({ ok: true, voiceId, message: 'Ses klonlandı!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/call/single
router.post('/call/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, language } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const [{ data: lead }, { data: settings }, { data: profile }, { data: userRow }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single(),
      supabase.from('voice_settings').select('*').eq('user_id', userId).single(),
      supabase.from('business_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('users').select('name, company').eq('id', userId).single(),
    ]);

    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const agentName   = settings?.agent_name || userRow?.name || 'Satış Temsilcisi';
    const companyName = profile?.company?.name || userRow?.company || 'Şirketimiz';
    const productDesc = profile?.product?.description || settings?.product_description || '';
    const avoidWords  = profile?.sales_style?.avoid_words || '';
    const callLang    = language || getLanguageByCountry(lead.country_code || '') || 'tr';

    // Fetch cached research if available
    const { data: latestVideo } = await supabase
      .from('video_outreach')
      .select('research_data')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .not('research_data', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: callRecord } = await supabase.from('voice_calls').insert([{
      user_id: userId, lead_id: leadId,
      callee_number: lead.phone, caller_number: process.env.VAPI_PHONE_NUMBER || process.env.ELEVENLABS_CALLER_NUMBER || '',
      status: 'initiating', language: callLang,
    }]).select().single();

    res.json({ ok: true, callId: callRecord?.id, message: 'Arama başlatılıyor...' });

    (async () => {
      try {
        const result = await dispatchCall({
          toNumber:    lead.phone,
          agentName,
          companyName,
          productDesc,
          leadName:    lead.contact_name || lead.company_name,
          leadCompany: lead.company_name,
          language:    callLang,
          lead,
          researchData: latestVideo?.research_data || null,
          avoidWords,
        });
        await supabase.from('voice_calls').update({
          eleven_conversation_id: result.conversationId,
          twilio_call_sid: result.callSid,
          status: 'calling',
          notes: `Provider: ${result.provider}`,
        }).eq('id', callRecord?.id);
        await supabase.from('leads').update({ status: 'contacted', last_contacted_at: new Date().toISOString() }).eq('id', leadId);
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

    const [{ data: settings }, { data: profile }, { data: userRow }] = await Promise.all([
      supabase.from('voice_settings').select('*').eq('user_id', userId).single(),
      supabase.from('business_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('users').select('name, company').eq('id', userId).single(),
    ]);

    const agentName   = settings?.agent_name || userRow?.name || 'Satış Temsilcisi';
    const companyName = profile?.company?.name || userRow?.company || 'Şirketimiz';
    const productDesc = profile?.product?.description || settings?.product_description || '';
    const avoidWords  = profile?.sales_style?.avoid_words || '';

    const { data: campaign } = await supabase.from('voice_campaigns').insert([{
      user_id: userId,
      name: campaignName || `Kampanya ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length, status: 'running',
      caller_number: process.env.VAPI_PHONE_NUMBER || process.env.ELEVENLABS_CALLER_NUMBER || '',
      delay_minutes: delayMinutes,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} lead için arama başlatılıyor` });

    (async () => {
      let called = 0;
      for (const leadId of leadIds) {
        try {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead?.phone) { called++; continue; }

          const callLang = language || getLanguageByCountry(lead.country_code || '') || 'tr';

          // Use cached research if available
          const { data: latestVideo } = await supabase
            .from('video_outreach')
            .select('research_data')
            .eq('lead_id', leadId)
            .eq('user_id', userId)
            .not('research_data', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: callRecord } = await supabase.from('voice_calls').insert([{
            user_id: userId, lead_id: leadId, campaign_id: campaign?.id,
            callee_number: lead.phone,
            caller_number: process.env.VAPI_PHONE_NUMBER || process.env.ELEVENLABS_CALLER_NUMBER || '',
            status: 'calling', language: callLang,
          }]).select().single();

          const result = await dispatchCall({
            toNumber: lead.phone, agentName, companyName, productDesc,
            leadName: lead.contact_name || lead.company_name,
            leadCompany: lead.company_name, language: callLang, lead,
            researchData: latestVideo?.research_data || null, avoidWords,
          });

          await supabase.from('voice_calls').update({
            eleven_conversation_id: result.conversationId,
            twilio_call_sid: result.callSid,
            status: 'calling',
            notes: `Provider: ${result.provider}`,
          }).eq('id', callRecord?.id);
          await supabase.from('leads').update({ status: 'contacted', last_contacted_at: new Date().toISOString() }).eq('id', leadId);
          await supabase.from('voice_campaigns').update({ calls_made: called + 1 }).eq('id', campaign?.id);
          called++;

          const jitter = (Math.random() * 2 - 1) * 60 * 1000; // ±1 min
          await new Promise(r => setTimeout(r, delayMinutes * 60 * 1000 + jitter));
        } catch (err: any) { console.error('[Campaign] Call error:', err.message); called++; }
      }
      await supabase.from('voice_campaigns').update({ status: 'completed' }).eq('id', campaign?.id);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/webhook/elevenlabs + Vapi
router.post('/webhook/elevenlabs', async (req: any, res: any) => {
  try {
    const { conversation_id, transcript, analysis, call_id } = req.body;
    res.sendStatus(200);

    const convId = conversation_id || call_id;
    if (!convId) return;

    const { data: call } = await supabase.from('voice_calls')
      .select('*, leads(*)').eq('eleven_conversation_id', convId).single();
    if (!call) return;

    const updates: any = { status: 'completed', ended_at: new Date().toISOString() };
    if (transcript) updates.transcript = typeof transcript === 'string' ? transcript : JSON.stringify(transcript);

    // Post-call AI analysis
    if (transcript) {
      try {
        const transcriptText = typeof transcript === 'string'
          ? transcript
          : (transcript.transcript || JSON.stringify(transcript)).slice(0, 3000);

        const analysisResult = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Bu telefon görüşmesi transkriptini analiz et ve JSON döndür:

Transkript:
${transcriptText}

JSON:
{
  "interest_score": 1-10,
  "sentiment": "positive|neutral|negative",
  "objections": ["itiraz 1"],
  "key_phrases": ["önemli ifade"],
  "next_action": "callback|email|whatsapp|no_action",
  "outcome": "positive|neutral|negative",
  "crm_note": "CRM'e girilecek kısa not"
}`,
          }],
        });

        const analysisText = (analysisResult.content[0] as any)?.text || '';
        const match = analysisText.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          updates.analysis = parsed;
          updates.outcome = parsed.outcome === 'positive' ? 'positive' : 'negative';
          // Store CRM note
          if (parsed.crm_note && call.lead_id) {
            await supabase.from('leads').update({
              notes: parsed.crm_note,
              status: parsed.outcome === 'positive' ? 'responded' : 'contacted',
            }).eq('id', call.lead_id);
          }
        }
      } catch {}
    }

    if (analysis && !updates.analysis) {
      updates.analysis = analysis;
      updates.outcome = analysis.success_evaluation === 'success' ? 'positive' : 'negative';
    }

    await supabase.from('voice_calls').update(updates).eq('eleven_conversation_id', convId);

    if (call.lead_id && call.user_id && updates.outcome === 'positive') {
      try {
        const { fireCapiEvent } = require('../services/meta-capi');
        const { data: lead } = await supabase.from('leads').select('*').eq('id', call.lead_id).single();
        if (lead) await fireCapiEvent(supabase, call.user_id, lead, 'CompleteRegistration', { value: 25 });
      } catch {}
    }
  } catch (e: any) { console.error('Webhook error:', e.message); }
});

// Vapi webhook (same endpoint, different payload shape)
router.post('/webhook/vapi', async (req: any, res: any) => {
  try {
    const { message } = req.body;
    res.sendStatus(200);
    if (!message || message.type !== 'end-of-call-report') return;

    const callId = message.call?.id;
    if (!callId) return;
    const { data: call } = await supabase.from('voice_calls').select('*, leads(*)').eq('eleven_conversation_id', callId).single();
    if (!call) return;

    const transcript = message.transcript || message.artifact?.transcript || '';
    await supabase.from('voice_calls').update({
      status: 'completed', ended_at: new Date().toISOString(),
      transcript: transcript.slice(0, 10000),
    }).eq('eleven_conversation_id', callId);
  } catch (e: any) { console.error('Vapi webhook error:', e.message); }
});

// GET /api/voice/calls
router.get('/calls', async (req: any, res: any) => {
  try {
    const { limit = 50, campaignId } = req.query;
    let q = supabase.from('voice_calls').select('*, leads(company_name, phone, contact_name, country)')
      .eq('user_id', req.userId).order('created_at', { ascending: false }).limit(Number(limit));
    if (campaignId) q = q.eq('campaign_id', campaignId);
    const { data } = await q;
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
    const byLang = calls.reduce((a: any, c: any) => { a[c.language || 'tr'] = (a[c.language || 'tr'] || 0) + 1; return a; }, {});
    res.json({
      total: calls.length,
      completed: calls.filter((c: any) => c.status === 'completed').length,
      positive: calls.filter((c: any) => c.outcome === 'positive').length,
      no_answer: calls.filter((c: any) => c.status === 'no-answer').length,
      totalMinutes: Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / 60),
      byLanguage: byLang,
    });
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

// GET /api/voice/provider-status
router.get('/provider-status', (_req: any, res: any) => {
  res.json({
    callProvider:    VAPI_KEY ? 'vapi' : 'elevenlabs',
    ttsProvider:     process.env.AZURE_SPEECH_KEY ? 'azure' : process.env.CARTESIA_API_KEY ? 'cartesia' : 'google',
    vapiConfigured:  !!VAPI_KEY && !!VAPI_PHONE_ID,
    azureConfigured: !!process.env.AZURE_SPEECH_KEY,
    cartesiaConfigured: !!process.env.CARTESIA_API_KEY,
    perplexityConfigured: !!process.env.PERPLEXITY_API_KEY,
  });
});

module.exports = router;
