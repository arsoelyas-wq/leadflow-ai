export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_6801kq0m6eh3e7r9ptx0kre2jvf0';
const PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID || 'phnum_5401kq493ba2e53sef4s776xn9b5';

function elevenHeaders() {
  return { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' };
}

// ── DİL → AÇILŞ CÜMLESİ ──────────────────────────────────
const LANGUAGE_OPENINGS: Record<string, string> = {
  tr: 'Merhaba! Ben {{agent_name}}, {{company_name}} adına arıyorum. Kısa bir bilgi vermek istiyorum, uygun musunuz?',
  en: 'Hello! This is {{agent_name}} calling from {{company_name}}. I have some exciting information to share. Do you have a moment?',
  de: 'Guten Tag! Hier ist {{agent_name}} von {{company_name}}. Ich würde Ihnen gerne kurz etwas mitteilen. Haben Sie einen Moment?',
  fr: 'Bonjour! Je suis {{agent_name}} de {{company_name}}. J\'ai une information importante à vous partager. Avez-vous un moment?',
  ar: 'مرحباً! أنا {{agent_name}} من شركة {{company_name}}. أود مشاركتك بعض المعلومات المهمة. هل لديك دقيقة؟',
  ru: 'Здравствуйте! Это {{agent_name}} из компании {{company_name}}. Хотел бы поделиться с вами важной информацией. Есть ли у вас минута?',
  az: 'Salam! Mən {{agent_name}}, {{company_name}} şirkətindənəm. Sizinlə qısa bir məlumat paylaşmaq istəyirəm. Bir dəqiqəniz varmı?',
  it: 'Buongiorno! Sono {{agent_name}} di {{company_name}}. Vorrei condividere alcune informazioni importanti. Ha un momento?',
  es: '¡Hola! Soy {{agent_name}} de {{company_name}}. Me gustaría compartir información importante. ¿Tiene un momento?',
  nl: 'Goedendag! Ik ben {{agent_name}} van {{company_name}}. Ik wil graag wat informatie delen. Heeft u even tijd?',
  zh: '您好！我是{{company_name}}的{{agent_name}}。我想分享一些重要信息。请问您现在方便吗？',
  ja: 'こんにちは！{{company_name}}の{{agent_name}}と申します。重要なご案内がございます。少しよろしいでしょうか？',
};

function buildOpeningLine(language: string, agentName: string, companyName: string): string {
  const template = LANGUAGE_OPENINGS[language] || LANGUAGE_OPENINGS['en'];
  return template
    .replace(/{{agent_name}}/g, agentName)
    .replace(/{{company_name}}/g, companyName);
}

// ── ElevenLabs OUTBOUND CALL ──────────────────────────────
async function makeElevenLabsCall(params: {
  toNumber: string;
  agentName: string;
  companyName: string;
  productDescription: string;
  leadName: string;
  leadCompany: string;
  language: string;
  avoidWords: string;
  openingLine: string;
  agentId?: string;
  phoneNumberId?: string;
}): Promise<{ conversationId: string; callSid: string }> {
  const {
    toNumber, agentName, companyName, productDescription,
    leadName, leadCompany, language, avoidWords, openingLine,
    agentId = AGENT_ID, phoneNumberId = PHONE_NUMBER_ID,
  } = params;

  const response = await axios.post(
    `${ELEVEN_BASE}/convai/twilio/outbound-call`,
    {
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
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

  return {
    conversationId: response.data.conversation_id,
    callSid: response.data.callSid,
  };
}

// ── SALES SCRIPT (Claude) ─────────────────────────────────
async function generateSalesScript(lead: any, settings: any, language: string): Promise<any> {
  try {
    const langNames: Record<string, string> = {
      tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca',
      ar: 'Arapça', ru: 'Rusça', az: 'Azerbaycanca', it: 'İtalyanca',
      es: 'İspanyolca', nl: 'Hollandaca', zh: 'Çince', ja: 'Japonca',
    };

    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `${settings.company_name} şirketi adına ${lead.company_name} firmasına ${langNames[language] || 'İngilizce'} dilinde satış araması yapılacak.
Ürün: ${settings.product_description}
Muhatap: ${lead.contact_name || 'yetkili'}
Ülke: ${lead.country || 'Türkiye'}
Sektör: ${lead.sector || ''}

JSON döndür:
{
  "opening": "Doğal açılış (${langNames[language] || 'İngilizce'})",
  "pitch": "30 saniyelik değer önerisi",
  "close": "Kapanış girişimi"
}`
      }],
    });
    const text = r.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// ── ROUTES ───────────────────────────────────────────────

// GET /api/voice/eleven-voices — ElevenLabs ses listesi
router.get('/eleven-voices', async (req: any, res: any) => {
  try {
    // Kullanıcının klonlanmış sesleri
    const { data: settings } = await supabase
      .from('voice_settings').select('*').eq('user_id', req.userId).single();

    // ElevenLabs'tan tüm sesleri çek
    const r = await axios.get(`${ELEVEN_BASE}/voices`, { headers: elevenHeaders() });
    const voices = r.data.voices || [];

    // Türkçeye uygun sesler + tüm sesler
    const categorized = {
      cloned: voices.filter((v: any) => v.category === 'cloned'),
      turkish: voices.filter((v: any) =>
        v.labels?.language === 'tr' ||
        v.name?.toLowerCase().includes('turkish') ||
        ['pNInz6obpgDQGcFmaJgB', 'EXAVITQu4vr4xnSDxMaL', 'VR6AewLTigWG4xSOukaG', 'MF3mGyEYCl7XYWbV9V6O'].includes(v.voice_id)
      ),
      professional: voices.filter((v: any) =>
        v.labels?.use_case === 'customer_service' ||
        v.labels?.use_case === 'professional' ||
        v.labels?.use_case === 'sales'
      ),
      all: voices.slice(0, 50),
    };

    res.json({
      voices: categorized,
      userVoiceId: settings?.elevenlabs_voice_id || null,
      total: voices.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/preview-voice — Ses önizleme
router.post('/preview-voice', async (req: any, res: any) => {
  try {
    const { voiceId, text, language } = req.body;
    const vid = voiceId || 'pNInz6obpgDQGcFmaJgB';

    const defaultTexts: Record<string, string> = {
      tr: 'Merhaba, nasılsınız? Size kısa bir bilgi vermek istiyorum.',
      en: 'Hello, how are you? I would like to share some information with you.',
      de: 'Guten Tag! Ich möchte Ihnen kurz etwas mitteilen.',
      ar: 'مرحباً، كيف حالك؟ أود مشاركتك ببعض المعلومات.',
      fr: 'Bonjour! Je voudrais partager quelques informations avec vous.',
    };

    const r = await axios.post(
      `${ELEVEN_BASE}/text-to-speech/${vid}`,
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

// POST /api/voice/set-voice — Kullanıcı sesi kaydet
router.post('/set-voice', async (req: any, res: any) => {
  try {
    const { voiceId, voiceName } = req.body;
    await supabase.from('voice_settings').upsert([{
      user_id: req.userId,
      elevenlabs_voice_id: voiceId,
      voice_name: voiceName,
    }]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/call/single — Tek lead ara
router.post('/call/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, language } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

    const agentName = settings?.agent_name || userRow?.name || 'Satış Temsilcisi';
    const companyName = profile?.company?.name || userRow?.company || 'şirketimiz';
    const productDesc = profile?.product?.description || settings?.product_description || '';
    const avoidWords = profile?.sales_style?.avoid_words || '';
    const callLanguage = language || (lead.country_code ? getLanguageByCountry(lead.country_code) : 'tr');
    const openingLine = buildOpeningLine(callLanguage, agentName, companyName);

    // Arama kaydı oluştur
    const { data: callRecord } = await supabase.from('voice_calls').insert([{
      user_id: userId,
      lead_id: leadId,
      callee_number: lead.phone,
      caller_number: '+19784325322',
      status: 'initiating',
      language: callLanguage,
    }]).select().single();

    res.json({ ok: true, callId: callRecord?.id, message: 'Arama başlatılıyor...' });

    // Arka planda ElevenLabs araması
    (async () => {
      try {
        const result = await makeElevenLabsCall({
          toNumber: lead.phone,
          agentName,
          companyName,
          productDescription: productDesc,
          leadName: lead.contact_name || lead.company_name,
          leadCompany: lead.company_name,
          language: callLanguage,
          avoidWords,
          openingLine,
        });

        await supabase.from('voice_calls').update({
          eleven_conversation_id: result.conversationId,
          twilio_call_sid: result.callSid,
          status: 'calling',
        }).eq('id', callRecord?.id);

        await supabase.from('leads').update({
          status: 'contacted',
          last_contacted_at: new Date().toISOString(),
        }).eq('id', leadId);

        console.log(`✅ Arama başlatıldı: ${lead.phone} - Conv: ${result.conversationId}`);
      } catch (err: any) {
        console.error('ElevenLabs call error:', err.message);
        await supabase.from('voice_calls').update({ status: 'failed', notes: err.message }).eq('id', callRecord?.id);
      }
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/call/campaign — Kampanya araması (Türkiye + İhracat)
router.post('/call/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, campaignName, delayMinutes = 5, language } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead listesi zorunlu' });

    const { data: settings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const { data: userRow } = await supabase.from('users').select('name, company').eq('id', userId).single();

    const agentName = settings?.agent_name || userRow?.name || 'Satış Temsilcisi';
    const companyName = profile?.company?.name || userRow?.company || 'şirketimiz';
    const productDesc = profile?.product?.description || settings?.product_description || '';
    const avoidWords = profile?.sales_style?.avoid_words || '';

    // Kampanya kaydı
    const { data: campaign } = await supabase.from('voice_campaigns').insert([{
      user_id: userId,
      name: campaignName || `Kampanya ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length,
      status: 'running',
      caller_number: '+19784325322',
      delay_minutes: delayMinutes,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} lead için arama başlatılıyor` });

    // Arka planda sıralı arama
    (async () => {
      let called = 0;
      for (const leadId of leadIds) {
        try {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead?.phone) { called++; continue; }

          // Dil belirleme — lead ülkesine göre otomatik
          const callLanguage = language || getLanguageByCountry(lead.country_code || '') || 'tr';
          const openingLine = buildOpeningLine(callLanguage, agentName, companyName);

          const { data: callRecord } = await supabase.from('voice_calls').insert([{
            user_id: userId,
            lead_id: leadId,
            campaign_id: campaign?.id,
            callee_number: lead.phone,
            caller_number: '+19784325322',
            status: 'calling',
            language: callLanguage,
          }]).select().single();

          const result = await makeElevenLabsCall({
            toNumber: lead.phone,
            agentName, companyName, productDescription: productDesc,
            leadName: lead.contact_name || lead.company_name,
            leadCompany: lead.company_name,
            language: callLanguage,
            avoidWords, openingLine,
          });

          await supabase.from('voice_calls').update({
            eleven_conversation_id: result.conversationId,
            twilio_call_sid: result.callSid,
            status: 'calling',
          }).eq('id', callRecord?.id);

          await supabase.from('leads').update({
            status: 'contacted',
            last_contacted_at: new Date().toISOString(),
          }).eq('id', leadId);

          await supabase.from('voice_campaigns').update({ calls_made: called + 1 }).eq('id', campaign?.id);
          called++;
          console.log(`✅ ${called}/${leadIds.length}: ${lead.phone} (${callLanguage})`);

          // Aramalar arası bekleme
          const delay = (delayMinutes + Math.random() * 2) * 60 * 1000;
          await new Promise(r => setTimeout(r, delay));
        } catch (err: any) {
          console.error(`Lead ${leadId} hatası:`, err.message);
          called++;
        }
      }
      await supabase.from('voice_campaigns').update({ status: 'completed' }).eq('id', campaign?.id);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/webhook/elevenlabs — Post-call webhook
router.post('/webhook/elevenlabs', async (req: any, res: any) => {
  try {
    const { conversation_id, status, transcript, analysis, metadata } = req.body;
    res.sendStatus(200);

    if (!conversation_id) return;

    // Konuşma kaydını bul
    const { data: call } = await supabase.from('voice_calls')
      .select('*, leads(*)').eq('eleven_conversation_id', conversation_id).single();
    if (!call) return;

    // Güncelle
    const updates: any = { status: 'completed', ended_at: new Date().toISOString() };
    if (transcript) updates.transcript = JSON.stringify(transcript);
    if (analysis) {
      updates.analysis = analysis;
      if (analysis.success_evaluation) updates.outcome = analysis.success_evaluation === 'success' ? 'positive' : 'negative';
    }
    if (metadata?.callSid) updates.twilio_call_sid = metadata.callSid;

    await supabase.from('voice_calls').update(updates).eq('eleven_conversation_id', conversation_id);

    // Pipeline güncelle
    if (call.lead_id) {
      const pipelineStatus = updates.outcome === 'positive' ? 'responded' : 'contacted';
      await supabase.from('leads').update({ status: pipelineStatus }).eq('id', call.lead_id);
    }

    // Team Intelligence'a kaydet
    if (transcript && call.user_id) {
      const transcriptText = Array.isArray(transcript)
        ? transcript.map((t: any) => `[${t.role}]: ${t.message}`).join('\n')
        : JSON.stringify(transcript);

      await supabase.from('member_analyses').insert([{
        user_id: call.user_id,
        customer_phone: call.callee_number,
        customer_name: call.leads?.company_name,
        channel: 'phone',
        transcript: transcriptText,
        overall_score: analysis?.data_collection?.overall_score || null,
        summary: analysis?.transcript_summary || '',
        outcome: updates.outcome || 'neutral',
        sentiment: analysis?.data_collection?.sentiment || 'neutral',
      }]);
    }

    console.log(`✅ Webhook işlendi: ${conversation_id} - ${updates.outcome}`);
  } catch (e: any) {
    console.error('Webhook error:', e.message);
  }
});

// GET /api/voice/conversations — ElevenLabs konuşma geçmişi
router.get('/conversations', async (req: any, res: any) => {
  try {
    const r = await axios.get(`${ELEVEN_BASE}/convai/conversations`, {
      headers: elevenHeaders(),
      params: { agent_id: AGENT_ID, page_size: 30 },
    });
    res.json({ conversations: r.data.conversations || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/conversation/:id — Konuşma detayı
router.get('/conversation/:id', async (req: any, res: any) => {
  try {
    const r = await axios.get(`${ELEVEN_BASE}/convai/conversations/${req.params.id}`, {
      headers: elevenHeaders(),
    });
    res.json(r.data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/calls
router.get('/calls', async (req: any, res: any) => {
  try {
    const { limit = 50, campaignId } = req.query;
    let query = supabase.from('voice_calls')
      .select('*, leads(company_name, phone, contact_name, country)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));
    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data } = await query;
    res.json({ calls: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/campaigns
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_campaigns')
      .select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_calls')
      .select('status, duration_seconds, outcome, language').eq('user_id', req.userId);
    const calls = data || [];
    const byLanguage = calls.reduce((acc: any, c: any) => {
      acc[c.language || 'tr'] = (acc[c.language || 'tr'] || 0) + 1; return acc;
    }, {});
    res.json({
      total: calls.length,
      completed: calls.filter((c: any) => c.status === 'completed').length,
      positive: calls.filter((c: any) => c.outcome === 'positive').length,
      no_answer: calls.filter((c: any) => c.status === 'no-answer').length,
      totalMinutes: Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / 60),
      byLanguage,
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
    await supabase.from('voice_settings').upsert([{
      user_id: req.userId, agent_name, company_name, product_description, transfer_number,
    }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/numbers
router.get('/numbers', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_numbers').select('*')
      .eq('user_id', req.userId).eq('is_active', true);
    res.json({ numbers: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Yardımcı: Ülke kodundan dil
function getLanguageByCountry(countryCode: string): string {
  const map: Record<string, string> = {
    'TR': 'tr', 'DE': 'de', 'AT': 'de', 'CH': 'de',
    'GB': 'en', 'US': 'en', 'CA': 'en', 'AU': 'en', 'IN': 'en',
    'FR': 'fr', 'BE': 'fr',
    'AE': 'ar', 'SA': 'ar', 'QA': 'ar', 'KW': 'ar', 'EG': 'ar', 'MA': 'ar',
    'RU': 'ru', 'KZ': 'ru',
    'AZ': 'az',
    'IT': 'it',
    'ES': 'es', 'MX': 'es',
    'NL': 'nl',
    'CN': 'zh',
    'JP': 'ja',
    'PL': 'pl',
    'UZ': 'uz',
  };
  return map[countryCode?.toUpperCase()] || 'en';
}

module.exports = router;