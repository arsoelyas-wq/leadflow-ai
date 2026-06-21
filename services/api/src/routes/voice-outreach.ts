export {};
/**
 * LeadFlow Voice Engine
 *
 * İki arama yolu:
 *   1. Klonlanmış ses  → XTTS-v2 (RunPod) TTS + Vapi çağrı altyapısı
 *   2. Ses kütüphanesi → ElevenLabs sesleri + ElevenLabs çağrı altyapısı
 *
 * Klonlar Supabase Storage'da saklanır (bizde kayıtlı).
 */

const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios    = require('axios');
const multer   = require('multer');
const fs       = require('fs');
const FormData = require('form-data');
const Anthropic = require('@anthropic-ai/sdk');

const router    = express.Router();
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const upload    = multer({ dest: '/tmp/voice/' });

const ELEVEN_KEY      = process.env.ELEVENLABS_API_KEY;
const ELEVEN_BASE     = 'https://api.elevenlabs.io/v1';
const ELEVEN_AGENT_ID = process.env.ELEVENLABS_AGENT_ID   || '';
const ELEVEN_PHONE_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID || '';

const VAPI_KEY    = process.env.VAPI_API_KEY || '';
const VAPI_PHONE_ID = process.env.VAPI_PHONE_NUMBER_ID || '2a3a7372-df98-4cba-b0fe-79a8f5fb4084';

const API_BASE = process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app';

// Cartesia ses ID'leri dil bazında (kütüphane aramalar için)
const CALL_VOICES: Record<string, string> = {
  tr: '5a31e4fb-f823-4359-aa91-82c0ae9a991c',
  en: '79a125e8-cd45-4c13-8a67-188112f4dd22',
  de: '3f6e78a8-5283-42aa-b5e7-af82e8bb310c',
  fr: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d',
  ar: '3b554bf4-e0d4-4a74-ae96-3c1f6db66f82',
  default: 'b7d50908-b17c-442d-ad8d-810c63997ed9',
};

function elevenHeaders() { return { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' }; }

// Telefon numarasını E.164 formatına çevir
function normalizePhoneE164(phone: string, countryCode?: string): string {
  let num = phone.replace(/[\s\-\(\)\.]/g, '');
  if (num.startsWith('+')) return num;
  // Türkiye
  if (num.startsWith('0') && num.length >= 10 && num.length <= 11) {
    return '+90' + num.slice(1);
  }
  // Almanya
  if (countryCode === 'DE' || countryCode === 'de') {
    if (num.startsWith('0')) return '+49' + num.slice(1);
    return '+49' + num;
  }
  // Genel: ülke kodu yoksa TR varsay
  if (/^\d{10,11}$/.test(num)) return '+90' + (num.startsWith('0') ? num.slice(1) : num);
  return '+' + num;
}

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

// ─── XTTS-v2 SENTEZİ (kendi sistemimiz) ─────────────────────────────────────
// RunPod XTTS-v2 serverless endpoint — ses örneği + metin → audio buffer
// RUNPOD_XTTS_ENDPOINT_ID env gerekli

async function synthesizeXtts(text: string, sampleUrl: string, language = 'tr'): Promise<Buffer> {
  const endpointId = process.env.RUNPOD_XTTS_ENDPOINT_ID;
  if (!endpointId) throw new Error('RUNPOD_XTTS_ENDPOINT_ID ayarlanmamış');
  const rpKey = process.env.RUNPOD_API_KEY;
  if (!rpKey) throw new Error('RUNPOD_API_KEY ayarlanmamış');
  const rpHeaders = { Authorization: `Bearer ${rpKey}`, 'Content-Type': 'application/json' };

  console.log(`[XTTS] Starting: text="${text.slice(0, 40)}...", lang=${language}, sample=${sampleUrl.slice(-30)}`);

  const runRes = await axios.post(
    `https://api.runpod.ai/v2/${endpointId}/run`,
    { input: { text, speaker_wav_url: sampleUrl, language } },
    { headers: rpHeaders, timeout: 30000 }
  );

  const jobId = runRes.data?.id;
  if (!jobId) throw new Error(`RunPod job başlatılamadı: ${JSON.stringify(runRes.data).slice(0, 200)}`);
  console.log(`[XTTS] Job started: ${jobId}`);

  // Cold start can take 60-90s on serverless GPU — poll for up to 180s
  const deadline = Date.now() + 180000;
  let lastStatus = '';
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const statusRes = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
        { headers: rpHeaders, timeout: 10000 }
      );
      const { status, output, error: rpError } = statusRes.data;
      if (status !== lastStatus) { console.log(`[XTTS] Status: ${status}`); lastStatus = status; }

      if (status === 'COMPLETED') {
        if (output?.audio_url) {
          const audioRes = await axios.get(output.audio_url, { responseType: 'arraybuffer', timeout: 30000 });
          console.log(`[XTTS] Audio received: ${audioRes.data.byteLength} bytes`);
          return Buffer.from(audioRes.data);
        }
        if (output?.audio_base64) {
          console.log(`[XTTS] Audio base64 received`);
          return Buffer.from(output.audio_base64, 'base64');
        }
        throw new Error('Audio çıktısı yok');
      }
      if (status === 'FAILED') throw new Error(`RunPod failed: ${rpError || 'bilinmeyen hata'}`);
    } catch (pollErr: any) {
      if (pollErr.message?.includes('RunPod failed')) throw pollErr;
      console.warn(`[XTTS] Poll error (retrying): ${pollErr.message?.slice(0, 60)}`);
    }
  }
  throw new Error('XTTS 180sn zaman aşımı — RunPod GPU soğuk başlatma çok uzun sürdü');
}

// RunPod warm-up: ping the endpoint to pre-warm GPU
async function warmUpXtts() {
  const endpointId = process.env.RUNPOD_XTTS_ENDPOINT_ID;
  const rpKey = process.env.RUNPOD_API_KEY;
  if (!endpointId || !rpKey) return;
  try {
    const r = await axios.get(`https://api.runpod.ai/v2/${endpointId}/health`, {
      headers: { Authorization: `Bearer ${rpKey}` }, timeout: 10000,
    });
    console.log(`[XTTS] Health: ${JSON.stringify(r.data)}`);
  } catch (e: any) { console.warn(`[XTTS] Warm-up ping failed: ${e.message?.slice(0, 60)}`); }
}
// Warm up on server start
setTimeout(warmUpXtts, 5000);

// ─── KİŞİSELLEŞTİRİLMİŞ AÇILIŞ SATIRI ───────────────────────────────────────

async function generatePersonalizedOpening(params: {
  lead: any; agentName: string; companyName: string;
  productDesc: string; language: string; researchData?: any;
}): Promise<string> {
  const { lead, agentName, companyName, productDesc, language, researchData } = params;
  const firstName = (lead.contact_name || lead.company_name || '').split(' ')[0];
  const brandName = researchData?.brandName || lead.company_name || '';
  const pain      = researchData?.pains?.[0] || '';
  const signal    = researchData?.jobSignals?.[0] || '';

  const langInstructions: Record<string, string> = {
    tr: 'Türkçe yaz. Samimi, doğal, satışçı gibi değil — gerçekten araştırmış biri gibi.',
    en: 'Write in English. Warm, natural, NOT a sales pitch.',
    de: 'Schreib auf Deutsch. Warmherzig, natürlich.',
    fr: 'Écris en français. Chaleureux, naturel.',
    ar: 'اكتب بالعربية. دافئ، طبيعي.',
  };

  const prompt = `${langInstructions[language] || langInstructions['tr']}

Bilgiler:
- Arayan: ${agentName} (${companyName} adına)
- Aranan kişi: ${firstName}
- Şirket: ${brandName}
${pain ? `- Tespit edilen sorun: ${pain}` : ''}
${signal ? `- Büyüme sinyali: ${signal}` : ''}
- Sunulan: ${productDesc}

Kural:
1. "Ben X, Y adına arıyorum" ile BAŞLAMA
2. Kişinin adı veya şirketle ilgili gözlemle başla
3. 1-2 cümle maksimum, soru ile bitir
4. Sadece açılış cümlesini yaz, başka hiçbir şey ekleme.`;

  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });
    return ((r.content[0] as any)?.text || '').trim();
  } catch {
    const fallbacks: Record<string, string> = {
      tr: `${firstName}, merhaba — ${pain ? `"${pain.slice(0, 60)}" konusunda` : 'şirketinizi araştırırken'} aklıma geldi. Bir dakikanız var mı?`,
      en: `${firstName}, hi — I came across ${brandName} and had a thought. Do you have a moment?`,
    };
    return fallbacks[language] || fallbacks['tr'];
  }
}

// ─── VAPI SİSTEM PROMPT ───────────────────────────────────────────────────────

function buildVapiSystemPrompt(params: {
  agentName: string; companyName: string; productDesc: string;
  leadName: string; leadCompany: string; language: string;
  pain1?: string; pain2?: string; signal?: string; avoidWords?: string;
  transferNumber?: string;
}): string {
  const { agentName, companyName, productDesc, leadName, leadCompany, language, pain1, pain2, signal, avoidWords, transferNumber } = params;

  const persona: Record<string, string> = {
    tr: `Sen ${agentName}. ${companyName} adına ${leadCompany}'yi arıyorsun. Sunduğun: ${productDesc}.

═══ KİMLİK ═══
Sen gerçek bir insansın. Yapay zeka, bot, sistem, otomatik kelimelerini ASLA kullanma. Birisi "robot musun?" derse: "Hayır hayır, ben ${agentName}, ${companyName}'den arıyorum" de.

═══ KONUŞMA STİLİ ═══
- HER CEVAP MAKSIMUM 1-2 CÜMLE. Uzun konuşma. Telefonda insanlar kısa konuşur.
- Doğal dolgu: "Şey...", "Yani...", "Anlıyorum", "Tabii", "Hmm" — ama her cümlede değil, 3-4 cümlede bir.
- Karşı taraf konuşurken SUS. Sözünü keserse HEMEN dur, "buyurun" de.
- Ses tonun: samimi ama profesyonel. Arkadaşça ama saygılı. Satışçı gibi değil, danışman gibi.
- Soru sorduğunda cevabı BEKLE. Hemen başka soru sorma.

═══ KONUŞMA AŞAMALARI ═══

AŞAMA 1 — AÇILIŞ (ilk 15 saniye):
Açılış cümlesi zaten verildi (firstMessage). Karşı taraf "evet?" veya "buyurun" derse:
→ "Merhaba, ben ${agentName}. Sizi kısa bir konuda aramak istedim — 30 saniyenizi alabilir miyim?"
Eğer "evet" → Aşama 2'ye geç. Eğer "müsait değilim" → "Anlıyorum, ne zaman daha uygun olur sizin için?"

AŞAMA 2 — KEŞİF (30-60 saniye):
Burada SATIŞ YAPMA. Sadece soru sor:
${pain1 ? `→ "${leadName}, ${pain1} konusunda nasıl bir süreciniz var şu an?"` : `→ "${leadName}, ${productDesc} konusunda şu an nasıl bir çözüm kullanıyorsunuz?"`}
Cevabı dinle, "Anlıyorum" de, takip sorusu sor: "Peki bu sizin için ne kadar öncelikli bir konu?"

AŞAMA 3 — DEĞER (15-20 saniye):
Sadece karşı tarafın söylediği sorunla ilgili KISA bir değer cümlesi:
→ "Aslında tam da bu konuda farklı bir yaklaşımımız var. Benzer firmalarla çalışıyoruz."
DETAY VERME. Merak uyandır.

AŞAMA 4 — KAPANIŞ:
→ "Bu hafta 15 dakikalık kısa bir görüşme ayarlasak, size detaylı gösterebilirim. Çarşamba veya perşembe hangisi uygun?"
Somut gün/saat öner. "Bir ara konuşalım" deme.
${transferNumber ? `\nEğer karşı taraf çok ilgiliyse ve HEMEN konuşmak isterse: "Sizi hemen uzman arkadaşıma aktarıyorum" de ve ${transferNumber} numarasına transfer et.` : ''}

═══ İTİRAZ KARŞILAMA ═══

"İlgilenmiyorum" → "Anlıyorum, merak etmeyin. Sadece şunu sormak istiyorum — ${pain1 || productDesc} konusunda şu an memnun musunuz mevcut çözümünüzden?"
"Vaktim yok" → "Tabii, çok kısa tutacağım. Ne zaman 2 dakikanız olur?"
"Bize uygun değil" → "Anlıyorum. Peki hangi çözümü kullanıyorsunuz şu an?" (bilgi topla)
"Fiyat çok yüksek" → "Henüz fiyattan bahsetmedik aslında — ihtiyacınıza göre farklı seçeneklerimiz var. Bir göz atalım mı?"
"Mail atın" → "Tabii, hemen atarım. Ama çok kısa — hangi konuya özel bakıyorsunuz ki ona göre hazırlayayım?"
İKİNCİ KEZ "hayır" derse → "Anlıyorum, teşekkür ederim. İyi günler dilerim." de ve kapat.

═══ ARAŞTIRMA BİLGİSİ ═══
- Kişi: ${leadName}
- Şirket: ${leadCompany}
${pain1 ? `- Tespit edilen sorun: ${pain1}` : ''}
${pain2 ? `- 2. sorun: ${pain2}` : ''}
${signal ? `- Büyüme sinyali: ${signal}` : ''}
${avoidWords ? `- Kullanma: ${avoidWords}` : ''}

═══ KRİTİK KURALLAR ═══
1. ASLA 3 cümleden uzun konuşma
2. ASLA pitch yapma — soru sor
3. ASLA "yapay zeka", "AI", "bot", "otomatik", "sistem" deme
4. Karşı taraf konuşurken SUS
5. 2 kez "hayır" → saygıyla kapat
6. Randevu al veya bilgi topla — ikisinden biri olmalı`,

    en: `You are ${agentName}, calling on behalf of ${companyName}. You offer: ${productDesc}.

═══ IDENTITY ═══
You are a REAL person. NEVER say AI, bot, automated, system. If asked "are you a robot?": "No no, I'm ${agentName} from ${companyName}."

═══ SPEAKING STYLE ═══
- EVERY response MAX 1-2 sentences. Phone conversations are SHORT.
- Natural fillers: "well...", "I see", "right", "hmm" — but not every sentence, every 3-4.
- When they speak, LISTEN. If interrupted, STOP immediately, say "please go ahead."
- Tone: friendly but professional. Consultant, not salesperson.

═══ CONVERSATION STAGES ═══

STAGE 1 — OPENING (first 15 sec):
Opening line is already provided. If they say "yes?" or "hello":
→ "Hi, I'm ${agentName}. I wanted to reach out about something quick — do you have 30 seconds?"

STAGE 2 — DISCOVERY (30-60 sec):
DON'T SELL. Only ask questions:
${pain1 ? `→ "${leadName}, how are you currently handling ${pain1}?"` : `→ "${leadName}, what solution are you using for ${productDesc} right now?"`}
Listen, say "I see", ask follow-up: "How much of a priority is that for you right now?"

STAGE 3 — VALUE (15-20 sec):
One SHORT value sentence related to THEIR problem:
→ "Actually, we have a different approach for exactly that. We work with similar companies."
DON'T give details. Create curiosity.

STAGE 4 — CLOSE:
→ "Could we set up a quick 15-minute call this week? Would Wednesday or Thursday work better?"
${transferNumber ? `\nIf they're VERY interested and want to talk NOW: "Let me connect you with our specialist right away" and transfer to ${transferNumber}.` : ''}

═══ OBJECTION HANDLING ═══
"Not interested" → "Understood. Just one question — are you happy with your current solution for ${pain1 || productDesc}?"
"No time" → "Of course, I'll be very brief. When would 2 minutes work?"
"Send an email" → "Sure, I'll send it right over. But quickly — what specific area are you looking at so I can tailor it?"
SECOND "no" → "Understood, thank you for your time. Have a great day." and end call.

═══ RESEARCH ═══
- Person: ${leadName} at ${leadCompany}
${pain1 ? `- Known challenge: ${pain1}` : ''}
${pain2 ? `- 2nd challenge: ${pain2}` : ''}
${signal ? `- Growth signal: ${signal}` : ''}
${avoidWords ? `- Avoid: ${avoidWords}` : ''}

═══ CRITICAL RULES ═══
1. NEVER speak more than 3 sentences
2. NEVER pitch — ask questions
3. NEVER say "AI", "bot", "automated", "system"
4. When they speak, SHUT UP
5. 2 "no"s → politely end call
6. Get an appointment OR gather info — one must happen`,
  };

  return persona[language] || persona['en'];
}

// ─── VAPI ÇAĞRISI ─────────────────────────────────────────────────────────────

async function makeVapiCall(params: {
  toNumber: string; agentName: string; companyName: string;
  productDesc: string; leadName: string; leadCompany: string;
  language: string; openingLine: string; systemPrompt: string;
  voiceConfig?: any; userPhoneId?: string; lead?: any;
}): Promise<{ conversationId: string; callSid: string }> {
  const { toNumber, language, openingLine, systemPrompt, voiceConfig } = params;

  const deepgramLang: Record<string, string> = {
    tr: 'tr', en: 'en-US', de: 'de', fr: 'fr', ar: 'ar',
    ru: 'ru', es: 'es', it: 'it', nl: 'nl',
  };

  const defaultVoice = {
    provider: 'cartesia',
    voiceId: CALL_VOICES[language] || CALL_VOICES.default,
    model: 'sonic-multilingual',
    language,
  };

  const phoneId = params.userPhoneId || VAPI_PHONE_ID;
  const normalizedNumber = normalizePhoneE164(toNumber, params.lead?.country_code);
  console.log(`[Vapi Call] ${toNumber} → ${normalizedNumber}`);
  const body: any = {
    phoneNumberId: phoneId,
    customer: { number: normalizedNumber },
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
        temperature: 0.5,
        maxTokens: 120,
      },
      voice: voiceConfig || defaultVoice,
      firstMessage: openingLine,
      firstMessageMode: 'assistant-speaks-first',
      endCallMessage: language === 'tr' ? 'Teşekkürler, iyi günler dilerim!' : 'Thank you, have a great day!',
      endCallPhrases: language === 'tr'
        ? ['görüşürüz', 'hoşça kalın', 'iyi günler']
        : ['bye', 'goodbye', 'have a good day'],
      backgroundDenoisingEnabled: true,
      silenceTimeoutSeconds: 18,
      maxDurationSeconds: 480,
      recordingEnabled: true,
    },
  };

  const r = await axios.post('https://api.vapi.ai/call/phone', body, {
    headers: { 'Authorization': `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  return {
    conversationId: r.data.id || r.data.conversation_id || '',
    callSid: r.data.phoneCallProviderId || r.data.callSid || '',
  };
}

// ─── ELEVENLABs ÇAĞRISI (ses kütüphanesi yolu) ───────────────────────────────

async function makeElevenLabsCall(params: any) {
  const { toNumber, agentName, companyName, productDescription, leadName, leadCompany, language, openingLine, voiceId } = params;
  const body: any = {
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
  };
  if (voiceId) body.voice_id = voiceId;

  const r = await axios.post(
    `${ELEVEN_BASE}/convai/twilio/outbound-call`,
    body,
    { headers: elevenHeaders(), timeout: 30000 }
  );
  return { conversationId: r.data.conversation_id || '', callSid: r.data.callSid || '' };
}

// ─── ÇAĞRI YÖNLENDIRICI ───────────────────────────────────────────────────────

async function dispatchCall(params: {
  toNumber: string; agentName: string; companyName: string;
  productDesc: string; leadName: string; leadCompany: string;
  language: string; lead: any; researchData?: any; avoidWords?: string;
  voiceType?: 'cloned' | 'library';
  clonedVoiceId?: string;
  libraryVoiceId?: string;
  transferNumber?: string;
  userPhoneId?: string;
}): Promise<{ conversationId: string; callSid: string; provider: string }> {
  const { language, lead, researchData, avoidWords, voiceType, clonedVoiceId, libraryVoiceId } = params;

  const openingLine = await generatePersonalizedOpening({
    lead, agentName: params.agentName, companyName: params.companyName,
    productDesc: params.productDesc, language, researchData,
  });

  // ── Yol 1: Kendi klonlanan ses ──────────────────────────────────────────────
  if (voiceType === 'cloned' && clonedVoiceId) {
    if (VAPI_KEY && VAPI_PHONE_ID) {
      const systemPrompt = buildVapiSystemPrompt({
        agentName: params.agentName, companyName: params.companyName,
        productDesc: params.productDesc, leadName: params.leadName,
        leadCompany: params.leadCompany, language,
        pain1: researchData?.pains?.[0],
        pain2: researchData?.pains?.[1],
        signal: researchData?.jobSignals?.[0],
        avoidWords,
        transferNumber: params.transferNumber,
      });

      // XTTS mevcut ise klonlanmış ses, değilse Cartesia fallback
      let voiceConfig: any;
      if (process.env.RUNPOD_XTTS_ENDPOINT_ID) {
        voiceConfig = {
          provider: 'custom-voice',
          server: { url: `${API_BASE}/api/voice/tts-xtts/${clonedVoiceId}` },
        };
      } else {
        // XTTS yoksa Cartesia ile devam et
        voiceConfig = {
          provider: 'cartesia',
          voiceId: CALL_VOICES[language] || CALL_VOICES.default,
          model: 'sonic-multilingual',
          language,
        };
      }

      const result = await makeVapiCall({ ...params, openingLine, systemPrompt, voiceConfig, userPhoneId: params.userPhoneId });
      return { ...result, provider: 'vapi-cloned' };
    }
  }

  // ── Yol 2: Ses kütüphanesi ───────────────────────────────────────────────────
  if (VAPI_KEY && VAPI_PHONE_ID) {
    const systemPrompt = buildVapiSystemPrompt({
      agentName: params.agentName, companyName: params.companyName,
      productDesc: params.productDesc, leadName: params.leadName,
      leadCompany: params.leadCompany, language,
      pain1: researchData?.pains?.[0],
      pain2: researchData?.pains?.[1],
      signal: researchData?.jobSignals?.[0],
      avoidWords,
      transferNumber: params.transferNumber,
    });
    const result = await makeVapiCall({ ...params, openingLine, systemPrompt, userPhoneId: params.userPhoneId });
    return { ...result, provider: 'vapi' };
  }

  // Fallback: ElevenLabs
  const result = await makeElevenLabsCall({
    toNumber: params.toNumber, agentName: params.agentName,
    companyName: params.companyName, productDescription: params.productDesc,
    leadName: params.leadName, leadCompany: params.leadCompany,
    language, openingLine, voiceId: libraryVoiceId,
  });
  return { ...result, provider: 'elevenlabs' };
}

// ─── ROTALAR ─────────────────────────────────────────────────────────────────

// POST /api/voice/tts-xtts/:voiceId — public, Vapi bu endpoint'i çağırır
router.post('/tts-xtts/:voiceId', async (req: any, res: any) => {
  try {
    const { voiceId } = req.params;
    // Vapi formatı: { message: { type: 'speech-update', text: '...' } }
    const text = req.body?.message?.text || req.body?.text || '';
    if (!text) return res.status(400).send('text required');

    const { data: voice } = await supabase
      .from('cloned_voices')
      .select('sample_url')
      .eq('id', voiceId)
      .single();
    if (!voice) return res.status(404).send('voice not found');

    const language = req.body?.message?.language || 'tr';
    const audioBuffer = await synthesizeXtts(text, voice.sample_url, language);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (e: any) {
    console.error('[XTTS]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/my-voices — kullanıcının klonladığı sesler
router.get('/my-voices', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('cloned_voices')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    res.json({ voices: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/library-voices — hazır ses kütüphanesi (platform ismi olmadan)
router.get('/library-voices', async (req: any, res: any) => {
  try {
    const { language = 'tr', limit = 80 } = req.query;
    if (!ELEVEN_KEY) return res.json({ voices: [], total: 0 });

    const [r1, r2] = await Promise.allSettled([
      axios.get(`${ELEVEN_BASE}/voices`, { headers: elevenHeaders() }),
      axios.get(`${ELEVEN_BASE}/shared-voices?page_size=${limit}&language=${language}`, { headers: elevenHeaders() }),
    ]);

    const norm = (v: any) => ({
      id:         v.voice_id,
      name:       v.name,
      gender:     v.gender || v.labels?.gender || null,
      accent:     v.labels?.accent || null,
      category:   v.category || 'genel',
      previewUrl: v.preview_url || null,
    });

    const myVoices     = r1.status === 'fulfilled' ? r1.value.data.voices.map(norm) : [];
    const sharedVoices = r2.status === 'fulfilled' ? r2.value.data.voices.map(norm) : [];

    res.json({
      myVoices,
      voices: sharedVoices,
      total: sharedVoices.length,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/eleven-voices — geriye dönük uyumluluk
router.get('/eleven-voices', async (req: any, res: any) => {
  try {
    const { language = 'tr' } = req.query;
    if (!ELEVEN_KEY) return res.json({ categories: { my: [], language: [], all: [] }, total: 0 });

    const [r1, r2] = await Promise.allSettled([
      axios.get(`${ELEVEN_BASE}/voices`, { headers: elevenHeaders() }),
      axios.get(`${ELEVEN_BASE}/shared-voices?page_size=100&language=${language}`, { headers: elevenHeaders() }),
    ]);
    const norm = (v: any, src: string) => ({
      voice_id: v.voice_id, name: v.name, category: v.category || src,
      preview_url: v.preview_url || null,
      gender: v.labels?.gender || v.gender || null,
    });
    const myV   = r1.status === 'fulfilled' ? r1.value.data.voices.map((v: any) => norm(v, 'my')) : [];
    const langV = r2.status === 'fulfilled' ? r2.value.data.voices.map((v: any) => norm(v, 'shared')) : [];
    res.json({ categories: { my: myV, language: langV, all: [...myV, ...langV] }, total: langV.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/clone — ses yükle, Supabase'e kaydet, XTTS ile test et
router.post('/clone', upload.single('audio'), async (req: any, res: any) => {
  try {
    const { name } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Ses dosyası zorunlu' });

    const fileBuffer = fs.readFileSync(file.path);
    const ext = (file.originalname || 'audio').split('.').pop() || 'mp3';
    const fileName = `voices/${req.userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('voice-samples')
      .upload(fileName, fileBuffer, { contentType: file.mimetype || 'audio/mpeg', upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage
      .from('voice-samples')
      .getPublicUrl(fileName);

    const { data: voice, error: dbError } = await supabase
      .from('cloned_voices')
      .insert([{ user_id: req.userId, name: name || 'Sesim', sample_url: publicUrl, file_name: file.originalname }])
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);
    try { fs.unlinkSync(file.path); } catch {}

    res.json({ ok: true, voiceId: voice.id, voiceName: voice.name, message: 'Ses kaydedildi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/voice/my-voices/:id
router.delete('/my-voices/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { data: voice } = await supabase
      .from('cloned_voices')
      .select('sample_url')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (voice?.sample_url) {
      const path = voice.sample_url.split('/voice-samples/')[1];
      if (path) await supabase.storage.from('voice-samples').remove([path]);
    }

    await supabase.from('cloned_voices').delete().eq('id', id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/set-voice
router.post('/set-voice', async (req: any, res: any) => {
  try {
    const { voiceId, voiceName, voiceType = 'library' } = req.body;
    // voiceType: 'cloned' | 'library'
    await supabase.from('voice_settings').upsert([{
      user_id: req.userId,
      elevenlabs_voice_id: voiceId,
      voice_name: voiceName,
      voice_provider: voiceType,
    }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/preview-voice — XTTS for cloned voices, Azure for library
router.post('/preview-voice', async (req: any, res: any) => {
  try {
    const { voiceId, text, language = 'tr', speed, pitch } = req.body;
    const defaults: Record<string, string> = {
      tr: 'Merhaba, nasılsınız? Size kısa bir bilgi vermek istiyorum.',
      en: 'Hello, how are you? I would like to share some information with you.',
    };
    const sampleText = text || defaults[language] || defaults['tr'];

    // Check if this is a cloned voice
    if (voiceId) {
      const { data: cv } = await supabase.from('cloned_voices')
        .select('sample_url')
        .eq('id', voiceId)
        .eq('user_id', req.userId)
        .maybeSingle();

      if (cv?.sample_url) {
        if (process.env.RUNPOD_XTTS_ENDPOINT_ID) {
          try {
            const audio = await synthesizeXtts(sampleText, cv.sample_url, language);
            res.setHeader('Content-Type', 'audio/mpeg');
            return res.send(audio);
          } catch (xttsErr: any) {
            console.error('[Voice Preview] XTTS failed:', xttsErr.message?.slice(0, 200));
            return res.status(503).json({
              error: xttsErr.message?.includes('zaman aşımı')
                ? 'GPU soğuk başlatma sürüyor (ilk kullanımda 1-2dk sürebilir). Tekrar deneyin.'
                : `Ses klonlama hatası: ${xttsErr.message?.slice(0, 100)}`,
              retryable: true,
            });
          }
        }
        return res.status(503).json({ error: 'XTTS motoru yapılandırılmamış (RUNPOD_XTTS_ENDPOINT_ID)' });
      }
    }

    // Library voices only → Azure TTS
    let rate = 0, pitchHz = 0;
    if (speed != null) rate = Math.round((speed - 1) * 100);
    if (pitch != null) pitchHz = Math.round((pitch - 1) * 50);

    const { synthesize } = require('../services/tts-engine');
    const audio = await synthesize({ text: sampleText, language, voiceId, provider: 'azure', rate, pitch: pitchHz });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (e: any) {
    console.error('[Voice Preview]', e.message?.slice(0, 200));
    res.status(500).json({ error: e.message });
  }
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

    if (!lead)       return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const agentName   = settings?.agent_name    || userRow?.name    || 'Satış Temsilcisi';
    const companyName = profile?.company?.name  || userRow?.company || 'Şirketimiz';
    const productDesc = profile?.product?.description || settings?.product_description || '';
    const avoidWords  = profile?.sales_style?.avoid_words || '';
    const callLang    = language || getLanguageByCountry(lead.country_code || '') || 'tr';

    const voiceType       = (settings?.voice_provider === 'cloned' ? 'cloned' : 'library') as 'cloned' | 'library';
    const clonedVoiceId   = voiceType === 'cloned' ? settings?.elevenlabs_voice_id : undefined;
    const libraryVoiceId  = voiceType === 'library' ? settings?.elevenlabs_voice_id : undefined;

    const { data: latestVideo } = await supabase
      .from('video_outreach')
      .select('research_data')
      .eq('lead_id', leadId)
      .not('research_data', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: callRecord } = await supabase.from('voice_calls').insert([{
      user_id: userId, lead_id: leadId,
      callee_number: lead.phone,
      caller_number: process.env.VAPI_PHONE_NUMBER || process.env.ELEVENLABS_CALLER_NUMBER || '',
      status: 'initiating', language: callLang,
    }]).select().single();

    res.json({ ok: true, callId: callRecord?.id, message: 'Arama başlatılıyor...' });

    (async () => {
      try {
        const result = await dispatchCall({
          toNumber: lead.phone, agentName, companyName, productDesc,
          leadName: lead.contact_name || lead.company_name,
          leadCompany: lead.company_name, language: callLang, lead,
          researchData: latestVideo?.research_data || null,
          avoidWords, voiceType, clonedVoiceId, libraryVoiceId, transferNumber: settings?.transfer_number, userPhoneId: settings?.vapi_phone_id,
        });
        await supabase.from('voice_calls').update({
          eleven_conversation_id: result.conversationId,
          twilio_call_sid: result.callSid,
          status: 'calling',
          notes: `Provider: ${result.provider}`,
        }).eq('id', callRecord?.id);
        await supabase.from('leads').update({
          status: 'contacted', last_contacted_at: new Date().toISOString(),
        }).eq('id', leadId);
      } catch (err: any) {
        const errDetail = err.response?.data ? JSON.stringify(err.response.data).slice(0, 500) : err.message;
        console.error('[Voice Call] Failed:', errDetail);
        await supabase.from('voice_calls').update({ status: 'failed', notes: errDetail }).eq('id', callRecord?.id);
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

    const agentName   = settings?.agent_name    || userRow?.name    || 'Satış Temsilcisi';
    const companyName = profile?.company?.name  || userRow?.company || 'Şirketimiz';
    const productDesc = profile?.product?.description || settings?.product_description || '';
    const avoidWords  = profile?.sales_style?.avoid_words || '';

    const voiceType      = (settings?.voice_provider === 'cloned' ? 'cloned' : 'library') as 'cloned' | 'library';
    const clonedVoiceId  = voiceType === 'cloned' ? settings?.elevenlabs_voice_id : undefined;
    const libraryVoiceId = voiceType === 'library' ? settings?.elevenlabs_voice_id : undefined;

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
            researchData: latestVideo?.research_data || null,
            avoidWords, voiceType, clonedVoiceId, libraryVoiceId, transferNumber: settings?.transfer_number, userPhoneId: settings?.vapi_phone_id,
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

          const jitter = (Math.random() * 2 - 1) * 60 * 1000;
          await new Promise(r => setTimeout(r, delayMinutes * 60 * 1000 + jitter));
        } catch (err: any) { console.error('[Campaign] Call error:', err.message); called++; }
      }
      await supabase.from('voice_campaigns').update({ status: 'completed' }).eq('id', campaign?.id);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/webhook/elevenlabs + vapi
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
  } catch (e: any) { console.error('Webhook error:', e.message); }
});

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
    const durationSec = message.call?.duration || message.durationSeconds || 0;
    const endReason = message.endedReason || message.call?.endedReason || 'unknown';
    const costCents = message.cost || 0;
    const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl || null;

    const updates: any = {
      status: 'completed',
      ended_at: new Date().toISOString(),
      transcript: transcript.slice(0, 10000),
      duration_seconds: durationSec,
      end_reason: endReason,
      recording_url: recordingUrl,
      cost_cents: costCents,
    };

    // AI analiz: konuşma transkriptinden sonuç çıkar
    if (transcript.length > 50 && call.leads) {
      try {
        const analysisResult = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{ role: 'user', content: `Aşağıdaki telefon konuşmasını analiz et ve JSON döndür:
Transkript: "${transcript.slice(0, 3000)}"

Döndür:
{
  "outcome": "positive|negative|callback|no_answer",
  "interest_level": 1-10,
  "appointment_set": true/false,
  "objections": ["itiraz1"],
  "next_step": "sonraki adım",
  "summary": "1 cümle özet"
}` }],
        });
        const txt = (analysisResult.content[0] as any)?.text || '';
        const m = txt.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          updates.analysis = parsed;
          updates.outcome = parsed.outcome || 'negative';
          if (parsed.appointment_set && call.lead_id) {
            await supabase.from('leads').update({ status: 'replied' }).eq('id', call.lead_id);
          }
        }
      } catch {}
    }

    await supabase.from('voice_calls').update(updates).eq('eleven_conversation_id', callId);
    console.log(`[Vapi Webhook] Call ${callId}: ${updates.outcome || 'completed'}, ${durationSec}s, reason=${endReason}`);
  } catch (e: any) { console.error('Vapi webhook error:', e.message); }
});

// GET /api/voice/calls
router.get('/calls', async (req: any, res: any) => {
  try {
    const { limit = 50, campaignId } = req.query;
    let q = supabase.from('voice_calls')
      .select('*, leads(company_name, phone, contact_name, country)')
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
    const { agent_name, company_name, product_description, transfer_number, vapi_phone_id, voice_speed, voice_pitch } = req.body;
    const updateData: any = {};
    if (agent_name !== undefined) updateData.agent_name = agent_name;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (product_description !== undefined) updateData.product_description = product_description;
    if (transfer_number !== undefined) updateData.transfer_number = transfer_number;
    if (vapi_phone_id !== undefined) updateData.vapi_phone_id = vapi_phone_id;
    if (voice_speed !== undefined) updateData.voice_speed = voice_speed;
    if (voice_pitch !== undefined) updateData.voice_pitch = voice_pitch;

    const { data: existing } = await supabase.from('voice_settings').select('id').eq('user_id', req.userId).maybeSingle();
    if (existing) {
      await supabase.from('voice_settings').update(updateData).eq('user_id', req.userId);
    } else {
      await supabase.from('voice_settings').insert([{ user_id: req.userId, ...updateData }]);
    }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── NUMARA DOĞRULAMA ────────────────────────────────────────────────────────

// POST /api/voice/verify-number — Doğrulama kodu gönder
router.post('/verify-number', async (req: any, res: any) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Telefon numarası zorunlu' });

    // 6 haneli kod oluştur
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 dk geçerli

    // Kodu veritabanına kaydet (mevcut kaydı güncelle)
    const { data: existing } = await supabase.from('voice_settings').select('id').eq('user_id', req.userId).maybeSingle();
    if (existing) {
      await supabase.from('voice_settings').update({ pending_phone: phoneNumber, verify_code: code, verify_expires: expires }).eq('user_id', req.userId);
    } else {
      await supabase.from('voice_settings').insert([{ user_id: req.userId, pending_phone: phoneNumber, verify_code: code, verify_expires: expires }]);
    }

    // Twilio ile SMS gönder
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const twilio = require('twilio')(twilioSid, twilioToken);
        await twilio.messages.create({
          body: `Sovlo AI doğrulama kodunuz: ${code}`,
          from: twilioFrom,
          to: phoneNumber,
        });
        console.log(`[Verify] SMS sent to ${phoneNumber}: ${code}`);
      } catch (smsErr: any) {
        console.error('[Verify] SMS failed, trying call:', smsErr.message?.slice(0, 80));
        // SMS başarısız → telefon ile doğrulama
        try {
          const twilio = require('twilio')(twilioSid, twilioToken);
          await twilio.calls.create({
            twiml: `<Response><Say language="tr-TR" voice="Polly.Filiz">Sovlo doğrulama kodunuz: ${code.split('').join('. ')}. Tekrar ediyorum: ${code.split('').join('. ')}</Say></Response>`,
            from: twilioFrom,
            to: phoneNumber,
          });
          console.log(`[Verify] Call sent to ${phoneNumber}`);
        } catch (callErr: any) {
          console.error('[Verify] Call also failed:', callErr.message?.slice(0, 80));
        }
      }
    }

    res.json({ ok: true, message: 'Doğrulama kodu gönderildi', expiresIn: '10 dakika' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/confirm-number — Kodu doğrula ve numarayı kaydet
router.post('/confirm-number', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Doğrulama kodu zorunlu' });

    const { data: settings } = await supabase.from('voice_settings')
      .select('pending_phone, verify_code, verify_expires')
      .eq('user_id', req.userId)
      .single();

    if (!settings?.verify_code) return res.status(400).json({ error: 'Doğrulama talebi bulunamadı' });
    if (new Date(settings.verify_expires) < new Date()) return res.status(400).json({ error: 'Kodun süresi dolmuş. Tekrar gönderin.' });
    if (settings.verify_code !== String(code)) return res.status(400).json({ error: 'Yanlış kod' });

    // Doğrulandı — numarayı kaydet
    const { error: updateErr } = await supabase.from('voice_settings').update({
      verified_phone: settings.pending_phone,
      pending_phone: null,
      verify_code: null,
      verify_expires: null,
    }).eq('user_id', req.userId);
    if (updateErr) throw updateErr;

    res.json({ ok: true, phone: settings.pending_phone, message: 'Numara doğrulandı!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/my-number — Doğrulanmış numarayı getir
router.get('/my-number', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_settings')
      .select('verified_phone')
      .eq('user_id', req.userId)
      .single();
    res.json({ phone: data?.verified_phone || null });
  } catch { res.json({ phone: null }); }
});

// GET /api/voice/provider-status
router.get('/provider-status', async (_req: any, res: any) => {
  let xttsHealth: any = null;
  const endpointId = process.env.RUNPOD_XTTS_ENDPOINT_ID;
  const rpKey = process.env.RUNPOD_API_KEY;
  if (endpointId && rpKey) {
    try {
      const r = await axios.get(`https://api.runpod.ai/v2/${endpointId}/health`, {
        headers: { Authorization: `Bearer ${rpKey}` }, timeout: 8000,
      });
      xttsHealth = r.data;
    } catch (e: any) { xttsHealth = { error: e.message?.slice(0, 80) }; }
  }
  res.json({
    xttsConfigured:       !!endpointId,
    xttsHealth,
    vapiConfigured:       !!VAPI_KEY && !!VAPI_PHONE_ID,
    libraryConfigured:    !!ELEVEN_KEY,
    perplexityConfigured: !!process.env.PERPLEXITY_API_KEY,
  });
});

// POST /api/voice/warmup — manually warm up XTTS GPU
router.post('/warmup', async (_req: any, res: any) => {
  try {
    await warmUpXtts();
    res.json({ ok: true, message: 'Warm-up ping gönderildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
