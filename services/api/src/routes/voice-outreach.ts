export {};
/**
 * LeadFlow Voice Engine
 *
 * Arama altyapısı: Twilio Media Streams + Deepgram Nova-3 (STT) + Claude (AI) + Cartesia Sonic-3 (TTS)
 * Ses klonlama: XTTS-v2 (RunPod) — klonlar Supabase Storage'da saklanır.
 */

const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios    = require('axios');
const multer   = require('multer');
const fs       = require('fs');
const FormData = require('form-data');
const Anthropic = require('@anthropic-ai/sdk');
const crypto   = require('crypto');
const { synthesizeXtts, warmUpXtts } = require('../services/xtts-engine');

const router    = express.Router();
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
const upload    = multer({ dest: '/tmp/voice/' });

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

// ─── TIMEZONE-AWARE CALLING (09:00–18:00 yerel saat) ────────────────────────
const PHONE_PREFIX_TZ: Record<string, string> = {
  '+90': 'Europe/Istanbul',
  '+1':  'America/New_York',
  '+44': 'Europe/London',
  '+49': 'Europe/Berlin',
  '+33': 'Europe/Paris',
  '+7':  'Europe/Moscow',
  '+971':'Asia/Dubai',
  '+966':'Asia/Riyadh',
  '+81': 'Asia/Tokyo',
  '+82': 'Asia/Seoul',
  '+86': 'Asia/Shanghai',
  '+91': 'Asia/Kolkata',
  '+55': 'America/Sao_Paulo',
  '+31': 'Europe/Amsterdam',
  '+48': 'Europe/Warsaw',
  '+39': 'Europe/Rome',
  '+34': 'Europe/Madrid',
  '+32': 'Europe/Brussels',
  '+41': 'Europe/Zurich',
  '+43': 'Europe/Vienna',
  '+46': 'Europe/Stockholm',
  '+47': 'Europe/Oslo',
  '+45': 'Europe/Copenhagen',
  '+358':'Europe/Helsinki',
  '+380':'Europe/Kiev',
  '+30': 'Europe/Athens',
  '+351':'Europe/Lisbon',
  '+36': 'Europe/Budapest',
  '+420':'Europe/Prague',
  '+40': 'Europe/Bucharest',
  '+972':'Asia/Jerusalem',
  '+60': 'Asia/Kuala_Lumpur',
  '+62': 'Asia/Jakarta',
  '+66': 'Asia/Bangkok',
  '+84': 'Asia/Ho_Chi_Minh',
  '+52': 'America/Mexico_City',
  '+54': 'America/Argentina/Buenos_Aires',
  '+56': 'America/Santiago',
  '+57': 'America/Bogota',
  '+51': 'America/Lima',
  '+20': 'Africa/Cairo',
  '+212':'Africa/Casablanca',
  '+213':'Africa/Algiers',
  '+27': 'Africa/Johannesburg',
  '+234':'Africa/Lagos',
};

function getTimezoneForPhone(phone: string): string {
  const normalized = phone.startsWith('+') ? phone : '+' + phone;
  const sorted = Object.keys(PHONE_PREFIX_TZ).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (normalized.startsWith(prefix)) return PHONE_PREFIX_TZ[prefix];
  }
  return 'UTC';
}

function isWithinCallingHours(phone: string): { allowed: boolean; localHour: number; timezone: string } {
  const tz = getTimezoneForPhone(phone);
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(new Date());
    const localHour = parseInt(hourStr, 10);
    return { allowed: localHour >= 9 && localHour < 18, localHour, timezone: tz };
  } catch {
    return { allowed: true, localHour: 12, timezone: 'UTC' };
  }
}

function minutesUntilNextCallingWindow(phone: string): number {
  const tz = getTimezoneForPhone(phone);
  try {
    const localHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(new Date()), 10);
    if (localHour < 9)   return (9 - localHour) * 60;
    if (localHour >= 18) return (24 - localHour + 9) * 60;
    return 0;
  } catch { return 0; }
}

// ─── XTTS-v2 SENTEZİ ──────────────────────────────────────────────────────────
// synthesizeXtts/warmUpXtts now live in ../services/xtts-engine (shared with video-outreach.ts)
setTimeout(() => {
  warmUpXtts();
  setInterval(warmUpXtts, 4 * 60 * 1000);
}, 5000);

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
      model: 'claude-sonnet-4-6',
      max_tokens: 180,
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

// ─── ARAMA HAFIZASI: Aynı lead'e önceki aramalar ─────────────────────────────

async function getCallMemory(userId: string, leadId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('call_intelligence')
      .select('outcome, next_action, transcript_summary, conversation_style, created_at')
      .eq('user_id', userId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!data?.length) return '';

    const memories = data.map((c: any) => {
      const date = new Date(c.created_at).toLocaleDateString('tr-TR');
      return `• ${date}: ${c.outcome === 'appointment' ? 'Randevu alındı ✓' : c.outcome === 'callback' ? 'Geri aranacak' : c.outcome === 'rejected' ? 'İlgilenmedi' : 'Tamamlandı'} — ${c.transcript_summary || ''}${c.next_action ? ` → Sonraki adım: ${c.next_action}` : ''}`;
    }).join('\n');

    return `\n═══ ÖNCEKİ ARAMALAR (bu lead'e) ═══\n${memories}\nBu bilgileri doğal şekilde referans al — "geçen sefer konuşmuştuk" gibi.\n`;
  } catch { return ''; }
}

// ─── TARZ ÖNERİ MOTORU: Geçmiş performanstan öğren ──────────────────────────

async function getStyleRecommendation(userId: string, sector: string): Promise<{ style: string; reason: string; confidence: number }> {
  try {
    const { data } = await supabase
      .from('call_intelligence')
      .select('conversation_style, outcome, interest_score, duration_sec, sector')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!data?.length) return { style: 'consultant', reason: 'Varsayılan başlangıç tarzı', confidence: 0 };

    // Sektör bazlı filtrele, yoksa genel
    const relevant = data.filter((c: any) => c.sector === sector);
    const pool = relevant.length >= 5 ? relevant : data;

    // Her tarz için başarı skoru hesapla
    const scores: Record<string, number[]> = {};
    pool.forEach((c: any) => {
      if (!c.conversation_style) return;
      if (!scores[c.conversation_style]) scores[c.conversation_style] = [];
      const s = c.outcome === 'appointment' ? 10 : c.outcome === 'callback' ? 6 :
                c.outcome === 'rejected' ? 1 : 3;
      scores[c.conversation_style].push(s + (c.interest_score || 5));
    });

    let bestStyle = 'consultant', bestAvg = 0;
    for (const [style, arr] of Object.entries(scores)) {
      if (!arr.length) continue;
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      if (avg > bestAvg) { bestAvg = avg; bestStyle = style; }
    }

    const styleNames: Record<string, string> = {
      consultant: 'Danışman', challenger: 'Meydan Okuyucu',
      rapport: 'İlişki Kurucu', direct: 'Direkt', corporate: 'Kurumsal',
    };

    const confidence = pool.length >= 20 ? 90 : pool.length >= 10 ? 70 : pool.length >= 5 ? 50 : 0;
    const sectorLabel = relevant.length >= 5 ? `"${sector}" sektöründe` : 'genel verilerinizde';
    return {
      style: bestStyle,
      reason: `${sectorLabel} en iyi sonuç veren tarz (${pool.length} arama analizi)`,
      confidence,
    };
  } catch { return { style: 'consultant', reason: 'Varsayılan tarz', confidence: 0 }; }
}

// ─── İŞ PROFİLİ CONTEXT — SSS, itirazlar, avantajlar ────────────────────────
// business_profiles tablosundan gelen zengin veriyi AI promptuna hazırla

function buildBusinessContext(profile: any): string {
  if (!profile) return '';
  const { product, target, faq, objections } = profile;
  const parts: string[] = [];

  if (product?.advantages?.filter(Boolean).length) {
    parts.push(`ÜRÜN AVANTAJLARI: ${product.advantages.filter(Boolean).join(' | ')}`);
  }
  if (product?.target_result) {
    parts.push(`MÜŞTERİ KAZANCI: ${product.target_result}`);
  }
  if (product?.price_range) {
    parts.push(`FİYAT: ${product.price_range}`);
  }
  if (target?.pain_points?.filter(Boolean).length) {
    parts.push(`MÜŞTERİ SORUNLARI: ${target.pain_points.filter(Boolean).join(' | ')}`);
  }
  if (target?.decision_maker) {
    parts.push(`KARAR VERİCİ: ${target.decision_maker}`);
  }
  if ((faq || []).filter((f: any) => f.q && f.a).length) {
    const faqLines = (faq as any[]).filter((f: any) => f.q && f.a)
      .slice(0, 5)  // İlk 5 SSS — token limiti için
      .map((f: any) => `S: ${f.q}\nC: ${f.a}`)
      .join('\n');
    parts.push(`SSS:\n${faqLines}`);
  }
  if ((objections || []).filter((o: any) => o.a).length) {
    const objLines = (objections as any[]).filter((o: any) => o.a)
      .slice(0, 5)  // İlk 5 itiraz
      .map((o: any) => `"${o.q || 'İtiraz'}" derse: ${o.a}`)
      .join('\n');
    parts.push(`İTİRAZ KARŞILAMA:\n${objLines}`);
  }

  return parts.join('\n\n');
}




// ─── ROTALAR ─────────────────────────────────────────────────────────────────

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

// GET /api/voice/library-voices — ElevenLabs shared voice catalog (3000+ ses, 29 dil)
router.get('/library-voices', async (req: any, res: any) => {
  try {
    const { language, gender, limit = '100', search } = req.query;
    const { getElevenLabsSharedVoices } = require('../services/tts-engine');
    const lim = Number(limit) || 100;

    const langFilter = language && language !== 'all'
      ? (language as string).toLowerCase()
      : undefined;

    let voices: any[] = await getElevenLabsSharedVoices(
      langFilter,
      gender as string | undefined,
      lim,
    );

    // EL belirli diller için az ses döndürebilir (TR, AZ vb.)
    // Bu durumda language filtresi olmadan top sesleri getir — EL sesleri zaten multilingual
    if (voices.length === 0 && langFilter) {
      voices = await getElevenLabsSharedVoices(undefined, gender as string | undefined, lim);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      voices = voices.filter((v: any) =>
        v.name.toLowerCase().includes(q) ||
        (v.accent || '').toLowerCase().includes(q) ||
        (v.description || '').toLowerCase().includes(q)
      );
    }

    voices = voices.slice(0, lim);
    res.json({ voices, total: voices.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/eleven-voices — geriye dönük uyumluluk (kendi klonlarını döndürür)
router.get('/eleven-voices', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('cloned_voices')
      .select('id, name, sample_url, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    const voices = (data || []).map((v: any) => ({ voice_id: v.id, name: v.name, category: 'klonlanmış', preview_url: v.sample_url }));
    res.json({ categories: { my: voices, language: [], all: voices }, total: voices.length });
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
    const { voiceId, voiceName, voiceType = 'library', gender } = req.body;
    // voiceType: 'cloned' | 'library' | 'cartesia'
    const row: any = {
      user_id:             req.userId,
      elevenlabs_voice_id: voiceId,   // Cartesia ID de bu kolona saklanır
      voice_name:          voiceName,
      voice_provider:      voiceType,
    };
    if (gender) row.voice_gender = gender;

    const { error } = await supabase.from('voice_settings').upsert([row]);
    if (error && error.message?.includes('voice_gender')) {
      delete row.voice_gender;
      await supabase.from('voice_settings').upsert([row]);
    }
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
    const { leadId, language, conversationStyle = 'consultant' } = req.body;
    console.log(`[CallSingle] START userId=${userId} leadId=${leadId} lang=${language} style=${conversationStyle}`);
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const [{ data: lead, error: leadErr }, { data: settings }, { data: profile }, { data: userRow }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single(),
      supabase.from('voice_settings').select('*').eq('user_id', userId).single(),
      supabase.from('business_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('users').select('name, company').eq('id', userId).single(),
    ]);
    console.log(`[CallSingle] Lead fetched: ${lead?.company_name || lead?.contact_name || 'null'} | err=${leadErr?.message}`);

    if (!lead)       { console.error(`[CallSingle] Lead not found: leadId=${leadId} userId=${userId}`); return res.status(404).json({ error: 'Lead bulunamadı' }); }
    if (!lead.phone) { console.error(`[CallSingle] No phone for lead: ${leadId}`); return res.status(400).json({ error: 'Telefon numarası yok' }); }

    const agentName   = settings?.agent_name    || userRow?.name    || 'Ahmet';
    const companyName = settings?.company_name  || profile?.company?.name  || userRow?.company || 'Şirketimiz';
    const productDesc = settings?.product_description || profile?.product?.description || 'Ürün ve hizmetlerimiz hakkında bilgi vermek istiyorum';
    const avoidWords  = profile?.sales_style?.avoid_words || '';
    const callLang    = language || getLanguageByCountry(lead.country_code || '') || 'tr';

    const voiceType       = (settings?.voice_provider === 'cloned' ? 'cloned' : 'library') as 'cloned' | 'library';
    const clonedVoiceId   = voiceType === 'cloned' ? settings?.elevenlabs_voice_id : undefined;
    const libraryVoiceId  = voiceType === 'library' ? settings?.elevenlabs_voice_id : undefined;
    // Cartesia kütüphanesinden seçilen ses ID'si — engine'e doğrudan geçirilir
    const cartesiaVoiceOverride = settings?.voice_provider === 'cartesia' ? (settings?.elevenlabs_voice_id || undefined) : undefined;

    // Kara liste kontrolü — "bir daha aramayın" demiş mi?
    const normalizedPhone = normalizePhoneE164(lead.phone, lead.country_code);
    const { data: blacklisted } = await supabase.from('call_blacklist')
      .select('id, reason').eq('user_id', userId).eq('phone', normalizedPhone).maybeSingle();
    if (blacklisted) return res.status(409).json({ error: `Bu numara kara listede: ${blacklisted.reason || 'İstek üzerine'}` });

    // Duplicate önleme — son 60 saniyede aynı numaraya arama yapıldı mı?
    const since60s = new Date(Date.now() - 60000).toISOString();
    const { data: recentCall } = await supabase.from('voice_calls')
      .select('id,created_at').eq('user_id', userId).eq('callee_number', normalizedPhone)
      .gte('created_at', since60s).maybeSingle();
    if (recentCall) return res.status(429).json({ error: 'Bu numaraya son 60 saniyede arama yapıldı. Lütfen bekleyin.' });

    // Timezone kontrolü — 09:00–18:00 yerel saat dışında arama yapma
    // bypassTimezone=true: test ortamında çalışma saati kısıtlamasını devre dışı bırakır
    const bypassTimezone = req.body?.bypassTimezone === true || req.query?.bypassTimezone === 'true';
    const tzCheck = isWithinCallingHours(normalizedPhone);
    if (!tzCheck.allowed && !bypassTimezone) {
      return res.status(400).json({
        error: `Bu numara için uygun arama saati 09:00–18:00 yerel saattir (şu an ${tzCheck.localHour}:00 — ${tzCheck.timezone}). Lütfen uygun saatte tekrar deneyin.`,
        localHour: tzCheck.localHour,
        timezone:  tzCheck.timezone,
        hint:      'Test için bypassTimezone:true gönderin.',
      });
    }

    // A/B Test: Yeterli veri yoksa otomatik A/B round-robin (her 2 aramada bir stil dene)
    let finalStyle = conversationStyle;
    const { count: userCallCount } = await supabase
      .from('voice_calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    const totalCalls = userCallCount ?? 0;
    if (totalCalls < 40 && conversationStyle === 'consultant') {
      // İlk 40 aramada otomatik A/B — per-user round-robin (3 tarz)
      const styleIndex = (userCallCount || 0) % 3
      const styles = ['consultant', 'direct', 'challenger']
      finalStyle = styles[styleIndex]
      console.log(`[A/B Test] userCallCount=${userCallCount ?? 0} → style=${finalStyle}`);
    }

    const [{ data: latestVideo }, callMemory, { data: callerIdRow }] = await Promise.all([
      supabase.from('video_outreach')
        .select('research_data')
        .eq('lead_id', leadId)
        .not('research_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      getCallMemory(userId, leadId),  // PolyAI tarzı: önceki aramaları AI'ya ver
      supabase.from('user_phone_numbers')
        .select('phone_number')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('capabilities_voice', true)
        .order('is_default', { ascending: false })
        .order('purchased_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    const userCallerId: string | undefined = callerIdRow?.phone_number || undefined;

    // Research data fallback — video_outreach yoksa sektör bazlı varsayılan
    const researchData = latestVideo?.research_data || {
      pains: [],
      jobSignals: [],
      brandName: lead.company_name,
      quality: 'minimal',
    };

    console.log(`[CallSingle] Inserting voice_call: phone=${normalizedPhone} lang=${callLang} style=${finalStyle}`);
    const { data: callRecord, error: insertErr } = await supabase.from('voice_calls').insert([{
      user_id: userId, lead_id: leadId,
      callee_number: normalizedPhone,
      caller_number: '',    // engine araması başlayınca Twilio numarası yazılır
      status: 'initiating', language: callLang,
      conversation_style: finalStyle,
      notes: `style:${finalStyle}`,
    }]).select().single();

    if (!callRecord) {
      console.error(`[CallSingle] Insert failed: ${insertErr?.message} | code=${insertErr?.code}`);
      throw new Error(insertErr?.message || 'voice_calls insert başarısız');
    }
    console.log(`[CallSingle] Call record created: id=${callRecord.id}`);

    // A/B test kaydı
    if (totalCalls < 40) {
      try {
        await supabase.from('ab_test_assignments').insert([{
          user_id: userId, test_name: 'auto_ab_first40',
          variant: finalStyle, call_id: callRecord.id,
        }]);
      } catch {}
    }

    res.json({ ok: true, callId: callRecord?.id, message: 'Arama başlatılıyor...', style: finalStyle });

    (async () => {
      try {
        // İlk mesajı üret — lead'e özel kişiselleştirilmiş açılış
        const openingLine = await generatePersonalizedOpening({
          lead, agentName, companyName, productDesc, language: callLang, researchData,
        });

        // LeadFlow Voice Engine — Twilio tabanlı (Vapi yok)
        const { makeCall: engineMakeCall } = require('../engines/voice/call-engine');
        const { callSid } = await engineMakeCall({
          to:            normalizedPhone,
          voiceCallDbId: callRecord.id,
          params: {
            callSid:           '',           // Twilio tarafından atanır
            sessionId:         callRecord.id,
            voiceCallDbId:     callRecord.id,
            agentName,
            companyName,
            productDesc,
            leadName:          lead.contact_name || lead.company_name || '',
            leadCompany:       lead.company_name || '',
            language:          callLang,
            conversationStyle: finalStyle,
            firstMessage:      openingLine,
            voiceId:           cartesiaVoiceOverride,   // Kütüphaneden seçilmişse kullan
            gender:            settings?.voice_gender || undefined,
            transferNumber:    settings?.transfer_number || '',
            avoidWords:        avoidWords || '',
            pain1:             researchData?.pains?.[0] || '',
            pain2:             researchData?.pains?.[1] || '',
            callMemory:        callMemory || '',
            businessContext:   buildBusinessContext(profile),
            maxDurationSec:    finalStyle === 'direct' ? 180 : finalStyle === 'challenger' ? 300 : 420,
            callerId:          userCallerId,   // Müşterinin doğrulanan numarası (aranan kişi bunu görür)
          },
        });

        await supabase.from('voice_calls').update({
          twilio_call_sid: callSid,
          status: 'calling',
          notes: `Engine: twilio | Style: ${finalStyle}`,
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
  } catch (e: any) {
    console.error(`[CallSingle] FATAL 500: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/call/campaign
router.post('/call/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, campaignName, delayMinutes = 5, language, conversationStyle = 'consultant' } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead listesi zorunlu' });

    const [{ data: settings }, { data: profile }, { data: userRow }] = await Promise.all([
      supabase.from('voice_settings').select('*').eq('user_id', userId).single(),
      supabase.from('business_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('users').select('name, company').eq('id', userId).single(),
    ]);

    const agentName   = settings?.agent_name    || userRow?.name    || 'Ahmet';
    const companyName = settings?.company_name  || profile?.company?.name  || userRow?.company || 'Şirketimiz';
    const productDesc = settings?.product_description || profile?.product?.description || 'Ürün ve hizmetlerimiz hakkında bilgi vermek istiyorum';
    const avoidWords  = profile?.sales_style?.avoid_words || '';

    const voiceType      = (settings?.voice_provider === 'cloned' ? 'cloned' : 'library') as 'cloned' | 'library';
    const clonedVoiceId  = voiceType === 'cloned' ? settings?.elevenlabs_voice_id : undefined;
    const libraryVoiceId = voiceType === 'library' ? settings?.elevenlabs_voice_id : undefined;

    // Rate limiting — tek seferde max 200 lead
    if (leadIds.length > 200) return res.status(400).json({ error: 'Tek kampanyada maksimum 200 lead seçilebilir.' });

    const { data: campaign, error: campErr } = await supabase.from('voice_campaigns').insert([{
      user_id: userId,
      name: campaignName || `Kampanya ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length, status: 'running',
      caller_number: process.env.TWILIO_PHONE_TR || process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE || '',
      delay_minutes: delayMinutes,
      conversation_style: conversationStyle || 'consultant',
      language: language || 'tr',
    }]).select().single();

    if (campErr || !campaign) throw new Error('voice_campaigns tablosu oluşturulmamış olabilir — 20260702_voice_calls_tables.sql migration çalıştırın');

    // DB tabanlı kuyruk — process restart'a dayanıklı
    const now = new Date();
    const queueItems = leadIds.map((leadId: string, idx: number) => {
      const jitter = Math.round((Math.random() - 0.5) * 30);  // ±30s jitter
      const scheduledAt = new Date(now.getTime() + idx * delayMinutes * 60000 + jitter * 1000);
      return { campaign_id: campaign.id, user_id: userId, lead_id: leadId, status: 'pending', scheduled_at: scheduledAt };
    });

    await supabase.from('campaign_queue').insert(queueItems);

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} lead kuyruğa eklendi — aramalar ${delayMinutes} dakika arayla başlayacak` });

    // Arka planda ilk 5 aramanın işlenmesi (scheduler ayrıca /process-queue ile sürekli tetiklenir)
    void processCampaignQueue(userId, campaign.id, { agentName, companyName, productDesc, avoidWords, voiceType, clonedVoiceId, libraryVoiceId, settings, maxConcurrent: 3, businessContext: buildBusinessContext(profile) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── KAMPANYA KUYRUK İŞLEYİCİ ─────────────────────────────────────────────────
// Hem kampanya başlangıcında hem /process-queue endpoint ile tekrar tetiklenir
async function processCampaignQueue(userId: string, campaignId: string, opts: any) {
  const { agentName, companyName, productDesc, avoidWords, voiceType, clonedVoiceId, libraryVoiceId, settings, maxConcurrent = 3, businessContext = '' } = opts;
  const batchSize = maxConcurrent;
  let processed = 0;

  while (true) {
    // Kuyruktan işlenecek kayıtları al (scheduled_at geçmiş, pending olanlar)
    const { data: jobs } = await supabase.from('campaign_queue')
      .select('*, leads(*)')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(batchSize);

    if (!jobs?.length) break;

    // Paralel işleme (max concurrent)
    await Promise.allSettled(jobs.map(async (job: any) => {
      await supabase.from('campaign_queue').update({ status: 'processing', started_at: new Date() }).eq('id', job.id);
      const lead = job.leads;
      if (!lead?.phone) {
        await supabase.from('campaign_queue').update({ status: 'skipped' }).eq('id', job.id);
        return;
      }

      // Kara liste kontrolü
      const normPhone = normalizePhoneE164(lead.phone, lead.country_code);
      const { data: bl } = await supabase.from('call_blacklist').select('id').eq('user_id', userId).eq('phone', normPhone).maybeSingle();
      if (bl) {
        await supabase.from('campaign_queue').update({ status: 'skipped', last_error: 'Blacklisted' }).eq('id', job.id);
        return;
      }

      // Timezone kontrolü — yerel saat 09:00–18:00 dışındaysa yeniden zamanla
      const tzCk = isWithinCallingHours(normPhone);
      if (!tzCk.allowed) {
        const waitMinutes = minutesUntilNextCallingWindow(normPhone);
        console.log(`[Campaign] Skipping ${normPhone} — outside calling hours (${tzCk.timezone}, hour=${tzCk.localHour}). Rescheduling in ${waitMinutes}min`);
        await supabase.from('campaign_queue').update({
          scheduled_at: new Date(Date.now() + waitMinutes * 60 * 1000).toISOString(),
          status: 'pending',
        }).eq('id', job.id);
        return;
      }

      try {
        const callLang = lead.country_code ? getLanguageByCountry(lead.country_code) : 'tr';
        const { data: resVid } = await supabase.from('video_outreach').select('research_data').eq('lead_id', lead.id).not('research_data', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const researchData = resVid?.research_data || { pains: [], jobSignals: [], brandName: lead.company_name, quality: 'minimal' };
        const callMemory = await getCallMemory(userId, lead.id);
        const conversationStyle = job.conversation_style || settings?.campaign_style || 'consultant';

        const { data: callRecord } = await supabase.from('voice_calls').insert([{
          user_id: userId, lead_id: lead.id, campaign_id: campaignId,
          callee_number: normPhone, status: 'initiating', language: callLang,
          conversation_style: conversationStyle,
          notes: `style:${conversationStyle}`,
        }]).select().single();

        // Kullanıcının satın aldığı varsayılan Twilio numarasını al
        const { data: callerIdRow } = await supabase
          .from('user_phone_numbers')
          .select('phone_number')
          .eq('user_id', userId)
          .eq('status', 'active')
          .eq('capabilities_voice', true)
          .order('is_default', { ascending: false })
          .order('purchased_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        const openingLine = await generatePersonalizedOpening({
          lead, agentName, companyName, productDesc, language: callLang, researchData,
        });

        const { makeCall: engineMakeCall } = require('../engines/voice/call-engine');
        const { callSid } = await engineMakeCall({
          to:            normPhone,
          voiceCallDbId: callRecord?.id,
          params: {
            callSid: '', sessionId: callRecord?.id, voiceCallDbId: callRecord?.id,
            agentName, companyName, productDesc,
            leadName:          lead.contact_name || lead.company_name || '',
            leadCompany:       lead.company_name || '',
            language:          callLang,
            conversationStyle,
            firstMessage:      openingLine,
            voiceId:           settings?.voice_provider === 'cartesia' ? (settings?.elevenlabs_voice_id || undefined) : undefined,
            gender:            settings?.voice_gender || undefined,
            transferNumber:    settings?.transfer_number || '',
            avoidWords:        avoidWords || '',
            pain1:             researchData?.pains?.[0] || '',
            pain2:             researchData?.pains?.[1] || '',
            callMemory:        callMemory || '',
            businessContext:   businessContext || '',
            maxDurationSec:    conversationStyle === 'direct' ? 180 : conversationStyle === 'challenger' ? 300 : 420,
            callerId:          callerIdRow?.phone_number || undefined,
          },
        });

        await supabase.from('voice_calls').update({ twilio_call_sid: callSid, status: 'calling', notes: `Engine: twilio | Style: ${conversationStyle}` }).eq('id', callRecord?.id);
        await supabase.from('leads').update({ status: 'contacted', last_contacted_at: new Date() }).eq('id', lead.id);
        await supabase.from('campaign_queue').update({ status: 'done', finished_at: new Date(), call_id: callRecord?.id }).eq('id', job.id);
        // Fix the counter with a dedicated RPC call (not nested in update)
        await supabase.rpc('increment_campaign_calls_made', { p_campaign_id: campaignId }).catch(console.error)
        processed++;
      } catch (err: any) {
        const attempts = (job.attempt_count || 0) + 1;
        await supabase.from('campaign_queue').update({
          status: attempts >= 3 ? 'failed' : 'pending',
          attempt_count: attempts,
          last_error: err.message?.slice(0, 200),
          scheduled_at: new Date(Date.now() + 300000),  // 5dk sonra tekrar dene
        }).eq('id', job.id);
      }
    }));

    // Sonraki batch için bekle
    const { data: remaining } = await supabase.from('campaign_queue').select('id', { count: 'exact' }).eq('campaign_id', campaignId).eq('status', 'pending').lte('scheduled_at', new Date(Date.now() + 5000));
    if (!remaining?.length) break;
    await new Promise(r => setTimeout(r, 5000));
  }

  // Kampanya tamamlandı mı?
  const { data: pending } = await supabase.from('campaign_queue').select('id').eq('campaign_id', campaignId).in('status', ['pending', 'processing']);
  if (!pending?.length) await supabase.from('voice_campaigns').update({ status: 'completed', completed_at: new Date() }).eq('id', campaignId);
}

// ─── KAMPANYA YENIDEN BAŞLATMA ────────────────────────────────────────────────
// Sunucu yeniden başladığında pending kalan kampanyaları devam ettir
const _activeCampaignIds = new Set<string>();

async function resumePendingCampaigns() {
  try {
    // Pending ve süresi geçmiş kuyruk kayıtlarını bul, campaign_id + user_id bazında grupla
    const { data: pendingJobs, error } = await supabase
      .from('campaign_queue')
      .select('campaign_id, user_id')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString());

    if (error) { console.error('[resumePendingCampaigns] Query error:', error.message); return; }
    if (!pendingJobs?.length) return;

    // Benzersiz (campaign_id, user_id) çiftlerini bul
    const unique = new Map<string, { campaignId: string; userId: string }>();
    for (const job of pendingJobs) {
      const key = `${job.campaign_id}::${job.user_id}`;
      if (!unique.has(key)) unique.set(key, { campaignId: job.campaign_id, userId: job.user_id });
    }

    for (const { campaignId, userId } of unique.values()) {
      if (_activeCampaignIds.has(campaignId)) continue; // Zaten işleniyor
      _activeCampaignIds.add(campaignId);

      try {
        const [{ data: settings }, { data: profile }, { data: userRow }] = await Promise.all([
          supabase.from('voice_settings').select('*').eq('user_id', userId).single(),
          supabase.from('business_profiles').select('*').eq('user_id', userId).single(),
          supabase.from('users').select('name, company').eq('id', userId).single(),
        ]);

        const agentName   = settings?.agent_name         || userRow?.name    || 'Ahmet';
        const companyName = settings?.company_name       || profile?.company?.name || userRow?.company || 'Şirketimiz';
        const productDesc = settings?.product_description || profile?.product?.description || 'Ürün ve hizmetlerimiz hakkında bilgi vermek istiyorum';
        const avoidWords  = profile?.sales_style?.avoid_words || '';
        const voiceType      = (settings?.voice_provider === 'cloned' ? 'cloned' : 'library') as 'cloned' | 'library';
        const clonedVoiceId  = voiceType === 'cloned'   ? settings?.elevenlabs_voice_id : undefined;
        const libraryVoiceId = voiceType === 'library'  ? settings?.elevenlabs_voice_id : undefined;

        console.log(`[resumePendingCampaigns] Resuming campaign ${campaignId} for user ${userId}`);
        processCampaignQueue(userId, campaignId, { agentName, companyName, productDesc, avoidWords, voiceType, clonedVoiceId, libraryVoiceId, settings, maxConcurrent: 3 })
          .catch(err => console.error(`[resumePendingCampaigns] Campaign ${campaignId} error:`, err.message))
          .finally(() => _activeCampaignIds.delete(campaignId));
      } catch (err: any) {
        console.error(`[resumePendingCampaigns] Failed to resume campaign ${campaignId}:`, err.message);
        _activeCampaignIds.delete(campaignId);
      }
    }
  } catch (err: any) {
    console.error('[resumePendingCampaigns] Unexpected error:', err.message);
  }
}


// GET /api/voice/calls
router.get('/calls', async (req: any, res: any) => {
  try {
    const { limit = 50, campaignId, id } = req.query;
    let q = supabase.from('voice_calls')
      .select('*, leads(company_name, phone, contact_name, country)')
      .eq('user_id', req.userId).order('created_at', { ascending: false }).limit(Number(limit));
    if (id) q = q.eq('id', id);
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

// GET /api/voice/style-recommendation — geçmiş performanstan en iyi tarzı öner
router.get('/style-recommendation', async (req: any, res: any) => {
  try {
    const sector = (req.query.sector as string) || '';
    const rec = await getStyleRecommendation(req.userId, sector);
    res.json(rec);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/call-intelligence — öğrenme verileri özeti
router.get('/call-intelligence', async (req: any, res: any) => {
  try {
    const { data: rows } = await supabase
      .from('call_intelligence')
      .select('conversation_style, outcome, interest_score, duration_sec, sector, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(500);

    const items = rows || [];
    const byStyle: Record<string, { total: number; appointments: number; avgInterest: number; avgDuration: number }> = {};
    for (const r of items) {
      const s = r.conversation_style || 'consultant';
      if (!byStyle[s]) byStyle[s] = { total: 0, appointments: 0, avgInterest: 0, avgDuration: 0 };
      byStyle[s].total++;
      if (r.outcome === 'appointment') byStyle[s].appointments++;
      byStyle[s].avgInterest += (r.interest_score || 5);
      byStyle[s].avgDuration += (r.duration_sec || 0);
    }
    for (const s of Object.keys(byStyle)) {
      const v = byStyle[s];
      v.avgInterest = Math.round((v.avgInterest / v.total) * 10) / 10;
      v.avgDuration = Math.round(v.avgDuration / v.total);
    }

    res.json({ total: items.length, byStyle, recent: items.slice(0, 10) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/settings
router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('voice_settings').select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || {} });
  } catch { res.json({ settings: {} }); }
});

// PATCH /api/voice/settings — upsert (race condition fix)
router.patch('/settings', async (req: any, res: any) => {
  try {
    const { agent_name, company_name, product_description, transfer_number, voice_speed, voice_pitch, voice_bass, voice_treble, voice_warmth, voice_presence, voice_volume, voice_compress } = req.body;
    const updateData: any = { user_id: req.userId };
    if (agent_name !== undefined) updateData.agent_name = agent_name;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (product_description !== undefined) updateData.product_description = product_description;
    if (transfer_number !== undefined) updateData.transfer_number = transfer_number;
    if (voice_speed !== undefined) updateData.voice_speed = voice_speed;
    if (voice_pitch !== undefined) updateData.voice_pitch = voice_pitch;
    if (voice_bass !== undefined) updateData.voice_bass = voice_bass;
    if (voice_treble !== undefined) updateData.voice_treble = voice_treble;
    if (voice_warmth !== undefined) updateData.voice_warmth = voice_warmth;
    if (voice_presence !== undefined) updateData.voice_presence = voice_presence;
    if (voice_volume !== undefined) updateData.voice_volume = voice_volume;
    if (voice_compress !== undefined) updateData.voice_compress = voice_compress;

    // Race condition'a karşı upsert (iki sekme eş zamanlı save'e karşı)
    await supabase.from('voice_settings').upsert([updateData], { onConflict: 'user_id' });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/blacklist
router.get('/blacklist', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('call_blacklist').select('*, leads(company_name)').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ blacklist: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/voice/blacklist — manuel kara liste ekle
router.post('/blacklist', async (req: any, res: any) => {
  try {
    const { phone, reason, leadId } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone zorunlu' });
    const normalized = normalizePhoneE164(phone, '');
    await supabase.from('call_blacklist').upsert([{ user_id: req.userId, phone: normalized, reason: reason || 'Manuel', lead_id: leadId }], { onConflict: 'user_id,phone' });
    res.json({ ok: true, phone: normalized });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/voice/blacklist/:phone — kara listeden çıkar
router.delete('/blacklist/:phone', async (req: any, res: any) => {
  try {
    await supabase.from('call_blacklist').delete().eq('user_id', req.userId).eq('phone', decodeURIComponent(req.params.phone));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/campaign/:id/progress — kampanya ilerleme durumu
router.get('/campaign/:id/progress', async (req: any, res: any) => {
  try {
    const [{ data: campaign }, { data: queue }] = await Promise.all([
      supabase.from('voice_campaigns').select('*').eq('id', req.params.id).eq('user_id', req.userId).single(),
      supabase.from('campaign_queue').select('status').eq('campaign_id', req.params.id),
    ]);
    if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });
    const q = queue || [];
    res.json({
      campaign,
      progress: {
        total: q.length,
        pending: q.filter((r: any) => r.status === 'pending').length,
        processing: q.filter((r: any) => r.status === 'processing').length,
        done: q.filter((r: any) => r.status === 'done').length,
        failed: q.filter((r: any) => r.status === 'failed').length,
        skipped: q.filter((r: any) => r.status === 'skipped').length,
        percent: q.length ? Math.round(q.filter((r: any) => ['done','failed','skipped'].includes(r.status)).length / q.length * 100) : 0,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/voice/ab-results — A/B test sonuçları
router.get('/ab-results', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ab_test_assignments').select('variant, outcome').eq('user_id', req.userId).not('outcome', 'is', null);
    const items = data || [];
    const byVariant: Record<string, { total: number; wins: number; rate: number }> = {};
    for (const r of items) {
      const v = r.variant || 'unknown';
      if (!byVariant[v]) byVariant[v] = { total: 0, wins: 0, rate: 0 };
      byVariant[v].total++;
      if (r.outcome === 'appointment' || r.outcome === 'callback') byVariant[v].wins++;
    }
    for (const v of Object.keys(byVariant)) {
      byVariant[v].rate = Math.round(byVariant[v].wins / byVariant[v].total * 100);
    }
    const winner = Object.entries(byVariant).sort((a, b) => b[1].rate - a[1].rate)[0];
    res.json({ byVariant, winner: winner ? { style: winner[0], rate: winner[1].rate } : null, totalTests: items.length });
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
    libraryConfigured:    true,
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

// Resume any campaigns that were pending when the server restarted
setTimeout(async () => {
  await resumePendingCampaigns();
  setInterval(resumePendingCampaigns, 5 * 60 * 1000); // check every 5 min
}, 10000);

// Zombie call cleanup — webhook gelmeden takılı kalan aramaları kapat
async function cleanupZombieCalls(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 dakikadan eski
    const { data: zombies } = await supabase.from('voice_calls')
      .select('id')
      .in('status', ['initiating', 'calling'])
      .lt('created_at', cutoff);
    if (!zombies?.length) return;
    const ids = zombies.map((z: any) => z.id);
    await supabase.from('voice_calls')
      .update({ status: 'failed', notes: 'Auto-closed: webhook alınmadı (>30dk)' })
      .in('id', ids);
    console.log(`[ZombieCleanup] ${ids.length} takılı arama kapatıldı`);
  } catch {}
}
setTimeout(cleanupZombieCalls, 15000); // ilk çalışma: boot + 15s
setInterval(cleanupZombieCalls, 15 * 60 * 1000); // her 15 dakikada bir

// GET /api/voice/diag — Supabase + Twilio bağlantı testi
router.get('/diag', async (req: any, res: any) => {
  const results: Record<string, any> = {};

  // 1. Ortam değişkenleri
  results.env = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.slice(0, 8)}...` : 'EKSİK ❌',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || 'EKSİK ❌',
    DEEPGRAM_API_KEY:   process.env.DEEPGRAM_API_KEY ? 'OK ✅' : 'EKSİK ❌',
    CARTESIA_API_KEY:   process.env.CARTESIA_API_KEY ? 'OK ✅' : 'EKSİK ❌',
    ANTHROPIC_API_KEY:  process.env.ANTHROPIC_API_KEY ? 'OK ✅' : 'EKSİK ❌',
  };

  // 2. Supabase voice_calls tablosu
  try {
    const { data, error } = await supabase.from('voice_calls').select('id, conversation_style').limit(1);
    results.voice_calls_table = error ? `HATA: ${error.message}` : `OK (conversation_style sütunu ${data?.length ? 'var ✅' : 'kontrol edildi ✅'})`;
  } catch (e: any) { results.voice_calls_table = `THROW: ${e.message}`; }

  // 3. Twilio doğrulanmış numaralar
  try {
    const { data: callerIds } = await supabase.from('user_caller_ids').select('phone_number, status').eq('user_id', req.userId);
    results.verified_numbers = callerIds || [];
  } catch (e: any) { results.verified_numbers = `HATA: ${e.message}`; }

  // 4. User info
  try {
    const { data: userRow } = await supabase.from('users').select('id, name').eq('id', req.userId).single();
    results.user = userRow ? `${userRow.name} (${userRow.id?.slice(0, 8)})` : 'bulunamadı';
    const { data: settings } = await supabase.from('voice_settings').select('agent_name').eq('user_id', req.userId).single();
    results.voice_settings = settings || 'yok';
  } catch (e: any) { results.user = `HATA: ${e.message}`; }

  res.json(results);
});

module.exports = router;
