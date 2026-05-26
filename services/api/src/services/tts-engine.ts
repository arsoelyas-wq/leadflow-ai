export {};
/**
 * LeadFlow TTS Engine — Multi-provider text-to-speech
 *
 * Priority chain per use case:
 *   Video (pre-recorded) : Azure Neural TTS → Google Translate (free fallback)
 *   Live call            : Cartesia Sonic   → Azure Neural TTS
 *
 * Azure Neural TTS  : 400+ voices, 140 languages, ElevenLabs-level quality, $0.004/1K chars
 * Cartesia Sonic    : 90 ms latency, ideal for real-time calls, $0.003/min
 * Google Translate  : Free, 30+ languages, lower quality – last resort
 */

const axios = require('axios');

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface TTSOptions {
  text: string;
  language?: string;        // BCP-47 code: tr, en, de, ar, ru …
  voiceId?: string;         // azure: voice name  |  cartesia: voice uuid
  provider?: 'azure' | 'cartesia' | 'elevenlabs' | 'google';
  emotion?: 'neutral' | 'cheerful' | 'empathetic' | 'professional' | 'excited' | 'sad';
  rate?: number;            // –50 … 50 (percentage relative)
  pitch?: number;           // –50 … 50 (Hz relative)
}

export interface VoiceEntry {
  voice_id: string;         // provider-specific ID
  name: string;
  language: string;         // BCP-47
  language_name: string;
  gender: 'male' | 'female' | 'neutral';
  provider: 'azure' | 'cartesia';
  styles?: string[];        // azure emotion styles available
  preview_url?: string | null;
  category: 'professional' | 'warm' | 'energetic' | 'news' | 'general';
}

// ─── AZURE CONFIG ─────────────────────────────────────────────────────────────

const AZURE_KEY    = process.env.AZURE_SPEECH_KEY    || '';
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';
const AZURE_TTS_URL    = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
const AZURE_VOICES_URL = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`;

// ─── CARTESIA CONFIG ──────────────────────────────────────────────────────────

const CARTESIA_KEY = process.env.CARTESIA_API_KEY || '';
const CARTESIA_VERSION = '2024-06-10';

// Curated Cartesia voice IDs for major languages (multilingual model handles all)
const CARTESIA_VOICES: Record<string, string> = {
  tr: 'b7d50908-b17c-442d-ad8d-810c63997ed9', // multilingual neutral
  en: '79a125e8-cd45-4c13-8a67-188112f4dd22', // professional male
  de: '3f6e78a8-5283-42aa-b5e7-af82e8bb310c',
  fr: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d',
  ar: '3b554bf4-e0d4-4a74-ae96-3c1f6db66f82',
  es: '5c42302c-194b-4d0c-ba1a-8cb485c84ab9',
  ru: '0c2e4ade-2bd7-4f66-a1ff-bb61b14d55ea',
  default: 'b7d50908-b17c-442d-ad8d-810c63997ed9',
};

// ─── LANGUAGE MAPS ────────────────────────────────────────────────────────────

// Maps our simple language code → Azure locale + best default voice
const AZURE_DEFAULTS: Record<string, { locale: string; male: string; female: string }> = {
  tr: { locale: 'tr-TR', male: 'tr-TR-AhmetNeural',      female: 'tr-TR-EmelNeural' },
  en: { locale: 'en-US', male: 'en-US-AndrewMultilingualNeural', female: 'en-US-AvaMultilingualNeural' },
  de: { locale: 'de-DE', male: 'de-DE-KillianNeural',    female: 'de-DE-SeraphinaMultilingualNeural' },
  fr: { locale: 'fr-FR', male: 'fr-FR-HenriNeural',      female: 'fr-FR-DeniseNeural' },
  ar: { locale: 'ar-SA', male: 'ar-SA-HamedNeural',      female: 'ar-SA-ZariyahNeural' },
  ru: { locale: 'ru-RU', male: 'ru-RU-DmitryNeural',     female: 'ru-RU-SvetlanaNeural' },
  es: { locale: 'es-ES', male: 'es-ES-AlvaroNeural',     female: 'es-ES-ElviraNeural' },
  it: { locale: 'it-IT', male: 'it-IT-DiegoNeural',      female: 'it-IT-ElsaNeural' },
  nl: { locale: 'nl-NL', male: 'nl-NL-MaartenNeural',    female: 'nl-NL-FennaNeural' },
  zh: { locale: 'zh-CN', male: 'zh-CN-YunxiNeural',      female: 'zh-CN-XiaoxiaoMultilingualNeural' },
  ja: { locale: 'ja-JP', male: 'ja-JP-KeitaNeural',      female: 'ja-JP-NanamiNeural' },
  ko: { locale: 'ko-KR', male: 'ko-KR-InJoonNeural',     female: 'ko-KR-SunHiNeural' },
  pl: { locale: 'pl-PL', male: 'pl-PL-MarekNeural',      female: 'pl-PL-AgnieszkaNeural' },
  pt: { locale: 'pt-BR', male: 'pt-BR-AntonioNeural',    female: 'pt-BR-FranciscaNeural' },
  hi: { locale: 'hi-IN', male: 'hi-IN-MadhurNeural',     female: 'hi-IN-SwaraNeural' },
  az: { locale: 'az-AZ', male: 'az-AZ-BabekNeural',      female: 'az-AZ-BanuNeural' },
};

const GOOGLE_LANG_MAP: Record<string, string> = {
  tr: 'tr', en: 'en', de: 'de', fr: 'fr', ar: 'ar',
  ru: 'ru', es: 'es', it: 'it', nl: 'nl', zh: 'zh-CN',
  ja: 'ja', ko: 'ko', pl: 'pl', pt: 'pt', hi: 'hi', az: 'az',
};

// ─── AZURE VOICE CATALOG (in-memory cache, 6h TTL) ───────────────────────────

let _voiceCache: VoiceEntry[] | null = null;
let _voiceCacheAt = 0;
const VOICE_CACHE_TTL = 6 * 60 * 60 * 1000;

const CATEGORY_RULES: Array<[RegExp, VoiceEntry['category']]> = [
  [/news|anchor|broadcast/i,                    'news'],
  [/andrew|jenny|aria|ava|seraphin|multi/i,     'professional'],
  [/cheerful|friendly|warm|emel|sara/i,         'warm'],
  [/energetic|excited|sport/i,                  'energetic'],
];

function categorizeVoice(name: string): VoiceEntry['category'] {
  for (const [rx, cat] of CATEGORY_RULES) if (rx.test(name)) return cat;
  return 'general';
}

export async function getAzureVoiceCatalog(): Promise<VoiceEntry[]> {
  if (_voiceCache && Date.now() - _voiceCacheAt < VOICE_CACHE_TTL) return _voiceCache;
  if (!AZURE_KEY) return [];

  try {
    const r = await axios.get(AZURE_VOICES_URL, {
      headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY },
      timeout: 15000,
    });

    const langNameMap: Record<string, string> = {
      'tr-TR': 'Türkçe', 'en-US': 'İngilizce', 'en-GB': 'İngilizce (UK)',
      'de-DE': 'Almanca', 'fr-FR': 'Fransızca', 'ar-SA': 'Arapça',
      'ru-RU': 'Rusça', 'es-ES': 'İspanyolca', 'it-IT': 'İtalyanca',
      'nl-NL': 'Hollandaca', 'zh-CN': 'Çince', 'ja-JP': 'Japonca',
      'ko-KR': 'Korece', 'pl-PL': 'Lehçe', 'pt-BR': 'Portekizce',
      'hi-IN': 'Hintçe', 'az-AZ': 'Azerbaycanca',
    };

    // Keep Neural voices only, filter out low-quality
    const voices: VoiceEntry[] = (r.data as any[])
      .filter((v: any) => v.VoiceType === 'Neural' && !v.ShortName.includes('Old'))
      .map((v: any) => ({
        voice_id:      v.ShortName,
        name:          v.LocalName || v.DisplayName,
        language:      v.Locale.split('-')[0],
        language_name: langNameMap[v.Locale] || v.LocaleName || v.Locale,
        gender:        v.Gender === 'Female' ? 'female' : 'male',
        provider:      'azure' as const,
        styles:        v.StyleList || [],
        preview_url:   null,
        category:      categorizeVoice(v.ShortName),
      }));

    _voiceCache  = voices;
    _voiceCacheAt = Date.now();
    console.log(`[TTS] Azure voice catalog loaded: ${voices.length} voices`);
    return voices;
  } catch (e: any) {
    console.error('[TTS] Azure voice catalog error:', e.message?.slice(0, 80));
    return _voiceCache || [];
  }
}

// ─── AZURE SSML BUILDER ───────────────────────────────────────────────────────

const EMOTION_STYLE_MAP: Record<string, string> = {
  cheerful:     'cheerful',
  empathetic:   'empathetic',
  professional: 'customerservice',
  excited:      'excited',
  sad:          'sad',
  neutral:      '',
};

function buildSSML(text: string, voiceName: string, locale: string, opts: TTSOptions): string {
  const style = opts.emotion ? (EMOTION_STYLE_MAP[opts.emotion] || '') : '';
  const rate  = opts.rate  ? `${opts.rate > 0 ? '+' : ''}${opts.rate}%` : '0%';
  const pitch = opts.pitch ? `${opts.pitch > 0 ? '+' : ''}${opts.pitch}Hz` : '0Hz';

  // Sanitize text for XML
  const safeText = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const inner = style
    ? `<mstts:express-as style="${style}"><prosody rate="${rate}" pitch="${pitch}">${safeText}</prosody></mstts:express-as>`
    : `<prosody rate="${rate}" pitch="${pitch}">${safeText}</prosody>`;

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${locale}"><voice name="${voiceName}">${inner}</voice></speak>`;
}

// ─── AZURE TTS ────────────────────────────────────────────────────────────────

export async function synthesizeAzure(opts: TTSOptions): Promise<Buffer> {
  const lang    = opts.language || 'tr';
  const defaults = AZURE_DEFAULTS[lang] || AZURE_DEFAULTS['en'];
  const voice   = opts.voiceId || defaults.female;
  const locale  = defaults.locale;
  const ssml    = buildSSML(opts.text, voice, locale, opts);

  const r = await axios.post(AZURE_TTS_URL, ssml, {
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
      'Content-Type':              'application/ssml+xml',
      'X-Microsoft-OutputFormat':  'audio-48khz-192kbitrate-mono-mp3',
    },
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  return Buffer.from(r.data);
}

// ─── CARTESIA TTS (real-time calls) ──────────────────────────────────────────

export async function synthesizeCartesia(opts: TTSOptions): Promise<Buffer> {
  const lang    = opts.language || 'tr';
  const voiceId = opts.voiceId || CARTESIA_VOICES[lang] || CARTESIA_VOICES.default;

  const r = await axios.post(
    'https://api.cartesia.ai/tts/bytes',
    {
      model_id:  'sonic-multilingual',
      transcript: opts.text,
      voice:     { mode: 'id', id: voiceId },
      language:  lang,
      output_format: {
        container:   'mp3',
        encoding:    'mp3',
        sample_rate: 44100,
      },
    },
    {
      headers: {
        'X-API-Key':        CARTESIA_KEY,
        'Cartesia-Version': CARTESIA_VERSION,
        'Content-Type':     'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 20000,
    }
  );

  return Buffer.from(r.data);
}

// ─── GOOGLE TRANSLATE TTS (free fallback) ────────────────────────────────────

function splitChunks(text: string, maxLen = 190): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const s of sentences) {
    if ((current + (current ? ' ' : '') + s).length > maxLen) {
      if (current) { chunks.push(current.trim()); current = ''; }
      if (s.length > maxLen) {
        const words = s.split(' ');
        for (const w of words) {
          if ((current + (current ? ' ' : '') + w).length > maxLen) {
            if (current) chunks.push(current.trim());
            current = w;
          } else current += (current ? ' ' : '') + w;
        }
      } else current = s;
    } else current += (current ? ' ' : '') + s;
  }
  if (current) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

export async function synthesizeGoogle(opts: TTSOptions): Promise<Buffer> {
  const lang   = GOOGLE_LANG_MAP[opts.language || 'tr'] || 'tr';
  const chunks = splitChunks(opts.text);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const r = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });
    buffers.push(Buffer.from(r.data));
    if (chunks.length > 1) await new Promise(res => setTimeout(res, 250));
  }

  return Buffer.concat(buffers);
}

// ─── MAIN SYNTHESIZE (auto-routes by provider) ───────────────────────────────

export async function synthesize(opts: TTSOptions): Promise<Buffer> {
  const provider = opts.provider || 'auto';

  if (provider === 'cartesia' || (provider === 'auto' && CARTESIA_KEY)) {
    try { return await synthesizeCartesia(opts); } catch (e: any) {
      console.warn('[TTS] Cartesia failed, trying Azure:', e.message?.slice(0, 60));
    }
  }

  if (provider === 'azure' || (provider === 'auto' && AZURE_KEY)) {
    try { return await synthesizeAzure(opts); } catch (e: any) {
      console.warn('[TTS] Azure failed, falling back to Google:', e.message?.slice(0, 60));
    }
  }

  // Free fallback — always works
  return synthesizeGoogle(opts);
}

// ─── AZURE VOICE PREVIEW URL ─────────────────────────────────────────────────

export async function generateAzurePreview(voiceId: string, language: string): Promise<Buffer> {
  const previewTexts: Record<string, string> = {
    tr: 'Merhaba! Size kısa bir bilgi vermek istiyorum. Uygun musunuz?',
    en: 'Hello! I have something interesting to share with you today.',
    de: 'Guten Tag! Ich habe etwas Wichtiges mit Ihnen zu besprechen.',
    fr: 'Bonjour! J\'ai quelque chose d\'important à vous dire.',
    ar: 'مرحباً! لدي شيء مهم أريد مشاركته معك.',
    ru: "Zdravstvuyte! U menya est' vazhnaya informatsiya dlya vas.",
    es: '¡Hola! Tengo algo importante que compartir contigo hoy.',
  };
  const text = previewTexts[language] || previewTexts['en'];
  return synthesizeAzure({ text, language, voiceId });
}

// ─── CARTESIA VOICES CATALOG ─────────────────────────────────────────────────

export function getCartesiaVoiceCatalog(): VoiceEntry[] {
  return [
    { voice_id: CARTESIA_VOICES.tr,  name: 'Türkçe — Profesyonel',    language: 'tr', language_name: 'Türkçe',    gender: 'neutral', provider: 'cartesia', category: 'professional' },
    { voice_id: CARTESIA_VOICES.en,  name: 'English — Professional',  language: 'en', language_name: 'İngilizce', gender: 'male',    provider: 'cartesia', category: 'professional' },
    { voice_id: CARTESIA_VOICES.de,  name: 'Deutsch — Professionell', language: 'de', language_name: 'Almanca',   gender: 'neutral', provider: 'cartesia', category: 'professional' },
    { voice_id: CARTESIA_VOICES.fr,  name: 'Français — Professionnel',language: 'fr', language_name: 'Fransızca', gender: 'neutral', provider: 'cartesia', category: 'professional' },
    { voice_id: CARTESIA_VOICES.ar,  name: 'عربي — احترافي',          language: 'ar', language_name: 'Arapça',    gender: 'neutral', provider: 'cartesia', category: 'professional' },
    { voice_id: CARTESIA_VOICES.es,  name: 'Español — Profesional',   language: 'es', language_name: 'İspanyolca',gender: 'neutral', provider: 'cartesia', category: 'professional' },
    { voice_id: CARTESIA_VOICES.ru,  name: 'Русский — Профессионал',  language: 'ru', language_name: 'Rusça',     gender: 'neutral', provider: 'cartesia', category: 'professional' },
  ];
}
