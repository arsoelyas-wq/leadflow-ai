export {};
/**
 * Voice Library API
 * GET /api/voice-library/voices        — ElevenLabs shared + Azure + Cartesia
 * GET /api/voice-library/voices/:lang  — by language code
 * GET /api/voice-library/preview       — generate preview audio
 * GET /api/voice-library/languages     — supported language list
 */

const express = require('express');
const router  = express.Router();

const {
  getAzureVoiceCatalog,
  getCartesiaVoiceCatalog,
  getElevenLabsSharedVoices,
  generateAzurePreview,
  synthesizeCartesia,
  synthesizeElevenLabs,
} = require('../services/tts-engine');

// ─── LANGUAGE METADATA ────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'tr',  name: 'Türkçe',       flag: '🇹🇷', native: 'Türkçe'      },
  { code: 'en',  name: 'İngilizce',    flag: '🇬🇧', native: 'English'     },
  { code: 'de',  name: 'Almanca',      flag: '🇩🇪', native: 'Deutsch'     },
  { code: 'fr',  name: 'Fransızca',    flag: '🇫🇷', native: 'Français'    },
  { code: 'ar',  name: 'Arapça',       flag: '🇸🇦', native: 'العربية'     },
  { code: 'ru',  name: 'Rusça',        flag: '🇷🇺', native: 'Русский'     },
  { code: 'es',  name: 'İspanyolca',   flag: '🇪🇸', native: 'Español'     },
  { code: 'it',  name: 'İtalyanca',    flag: '🇮🇹', native: 'Italiano'    },
  { code: 'nl',  name: 'Hollandaca',   flag: '🇳🇱', native: 'Nederlands'  },
  { code: 'zh',  name: 'Çince',        flag: '🇨🇳', native: '中文'         },
  { code: 'ja',  name: 'Japonca',      flag: '🇯🇵', native: '日本語'        },
  { code: 'ko',  name: 'Korece',       flag: '🇰🇷', native: '한국어'        },
  { code: 'pl',  name: 'Lehçe',        flag: '🇵🇱', native: 'Polski'      },
  { code: 'pt',  name: 'Portekizce',   flag: '🇧🇷', native: 'Português'   },
  { code: 'hi',  name: 'Hintçe',       flag: '🇮🇳', native: 'हिन्दी'         },
  { code: 'az',  name: 'Azerbaycanca', flag: '🇦🇿', native: 'Azərbaycan'  },
  { code: 'sv',  name: 'İsveççe',      flag: '🇸🇪', native: 'Svenska'     },
  { code: 'uk',  name: 'Ukraynaca',    flag: '🇺🇦', native: 'Українська'  },
  { code: 'cs',  name: 'Çekçe',        flag: '🇨🇿', native: 'Čeština'     },
  { code: 'ro',  name: 'Rumence',      flag: '🇷🇴', native: 'Română'      },
  { code: 'fi',  name: 'Fince',        flag: '🇫🇮', native: 'Suomi'       },
  { code: 'el',  name: 'Yunanca',      flag: '🇬🇷', native: 'Ελληνικά'    },
  { code: 'id',  name: 'Endonezce',    flag: '🇮🇩', native: 'Bahasa'      },
  { code: 'da',  name: 'Danca',        flag: '🇩🇰', native: 'Dansk'       },
  { code: 'bg',  name: 'Bulgarca',     flag: '🇧🇬', native: 'Български'   },
  { code: 'fil', name: 'Filipince',    flag: '🇵🇭', native: 'Filipino'    },
];

// Preview metinleri dil bazında
const PREVIEW_TEXTS: Record<string, string> = {
  tr:  'Merhaba! Size kısa bir bilgi vermek istiyorum. Uygun musunuz?',
  en:  'Hello! I have something interesting to share with you today.',
  de:  'Guten Tag! Ich habe etwas Wichtiges mit Ihnen zu besprechen.',
  fr:  "Bonjour! J'ai quelque chose d'important à vous dire.",
  ar:  'مرحباً! لدي شيء مهم أريد مشاركته معك.',
  ru:  'Zdravstvuyte! U menya yest vazhnaya informatsiya dlya vas.',
  es:  '¡Hola! Tengo algo importante que compartir contigo hoy.',
  it:  'Ciao! Ho qualcosa di importante da condividere con te.',
  nl:  'Hallo! Ik heb iets belangrijks met u te bespreken vandaag.',
  zh:  '你好！我今天有一些重要的事情想和你分享。',
  ja:  'こんにちは！今日は大切なことをお伝えしたいと思います。',
  ko:  '안녕하세요! 오늘 중요한 정보를 공유하고 싶습니다.',
  pl:  'Dzień dobry! Mam coś ważnego do omówienia z Panem/Panią.',
  pt:  'Olá! Tenho algo importante para compartilhar com você hoje.',
  hi:  'नमस्ते! आज मैं आपके साथ कुछ महत्वपूर्ण साझा करना चाहता हूं।',
  sv:  'Hej! Jag har något viktigt att dela med dig idag.',
  uk:  'Привіт! Я маю важливу інформацію для вас.',
  cs:  'Dobrý den! Mám pro vás dnes něco důležitého.',
  ro:  'Bună ziua! Am ceva important de discutat cu dumneavoastră.',
};

// ─── GET /languages ───────────────────────────────────────────────────────────

router.get('/languages', (_req: any, res: any) => {
  res.json({ languages: LANGUAGES });
});

// ─── GET /voices ──────────────────────────────────────────────────────────────

router.get('/voices', async (req: any, res: any) => {
  try {
    const { lang, gender, category, provider, search, limit = 200 } = req.query;

    // ElevenLabs shared voices + Azure + Cartesia — EL önce, daha iyi katalog
    const [elVoices, azureVoices, cartesiaVoices] = await Promise.all([
      getElevenLabsSharedVoices(
        lang && lang !== 'all' ? (lang as string).toLowerCase() : undefined,
        gender as string | undefined,
        Number(limit) || 200,
      ),
      getAzureVoiceCatalog(),
      Promise.resolve(getCartesiaVoiceCatalog()),
    ]);

    // EL seslere language_name ekle
    const elWithMeta = elVoices.map((v: any) => ({
      ...v,
      language_name: LANGUAGES.find((l: any) => l.code === v.language)?.name || v.language,
    }));

    let voices = [...elWithMeta, ...azureVoices, ...cartesiaVoices];

    // Filtreler — EL için gender zaten API tarafında uygulandı, diğerleri için burada
    if (lang && lang !== 'all') voices = voices.filter((v: any) => v.language === (lang as string).toLowerCase());
    if (gender)   voices = voices.filter((v: any) => v.gender === gender);
    if (category) voices = voices.filter((v: any) => v.category === category);
    if (provider) voices = voices.filter((v: any) => v.provider === provider);
    if (search) {
      const q = (search as string).toLowerCase();
      voices = voices.filter((v: any) =>
        v.name.toLowerCase().includes(q) ||
        (v.language_name || '').toLowerCase().includes(q) ||
        (v.accent || '').toLowerCase().includes(q)
      );
    }

    // Sıralama: Türkçe önce, sonra dile göre, sonra EL > Azure > Cartesia
    const providerOrder: Record<string, number> = { elevenlabs: 0, azure: 1, cartesia: 2 };
    voices.sort((a: any, b: any) => {
      if (a.language === 'tr' && b.language !== 'tr') return -1;
      if (b.language === 'tr' && a.language !== 'tr') return  1;
      if (a.language !== b.language) return a.language.localeCompare(b.language);
      return (providerOrder[a.provider] ?? 9) - (providerOrder[b.provider] ?? 9);
    });

    const limited = voices.slice(0, Number(limit));

    // Dile göre grupla (UI rendering için)
    const byLanguage: Record<string, any> = {};
    for (const v of limited) {
      if (!byLanguage[v.language]) {
        const langMeta = LANGUAGES.find((l: any) => l.code === v.language);
        byLanguage[v.language] = {
          meta:   langMeta || { code: v.language, name: v.language_name || v.language, flag: '🌐' },
          voices: [],
        };
      }
      byLanguage[v.language].voices.push(v);
    }

    res.json({
      total:     voices.length,
      voices:    limited,
      byLanguage,
      providers: {
        elevenlabs: elWithMeta.length,
        azure:      azureVoices.length,
        cartesia:   cartesiaVoices.length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /voices/:lang ────────────────────────────────────────────────────────

router.get('/voices/:lang', async (req: any, res: any) => {
  try {
    const { lang } = req.params;
    const [elVoices, azure, cartesia] = await Promise.all([
      getElevenLabsSharedVoices(lang, undefined, 100),
      getAzureVoiceCatalog(),
      Promise.resolve(getCartesiaVoiceCatalog()),
    ]);

    const elWithMeta = elVoices.map((v: any) => ({
      ...v,
      language_name: LANGUAGES.find((l: any) => l.code === lang)?.name || lang,
    }));

    const azFiltered = (azure as any[]).filter((v: any) => v.language === lang);
    const caFiltered = (cartesia as any[]).filter((v: any) => v.language === lang);
    const voices     = [...elWithMeta, ...azFiltered, ...caFiltered];
    const langMeta   = LANGUAGES.find(l => l.code === lang);

    res.json({ lang, meta: langMeta, voices, total: voices.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /preview ─────────────────────────────────────────────────────────────

router.get('/preview', async (req: any, res: any) => {
  try {
    const { voiceId, id, lang = 'tr', provider = 'elevenlabs', text } = req.query;
    const vid = (voiceId || id) as string;
    if (!vid) return res.status(400).json({ error: 'voiceId zorunlu' });

    const sampleText = (text as string) || PREVIEW_TEXTS[lang as string] || PREVIEW_TEXTS['en'];
    let audioBuffer: Buffer;

    if (provider === 'elevenlabs') {
      // ElevenLabs TTS ile preview üret
      audioBuffer = await synthesizeElevenLabs({ text: sampleText, language: lang as string, voiceId: vid });
    } else if (provider === 'azure') {
      audioBuffer = await generateAzurePreview(vid, lang as string);
    } else if (provider === 'cartesia') {
      audioBuffer = await synthesizeCartesia({ text: sampleText, language: lang as string, voiceId: vid });
    } else {
      return res.status(400).json({ error: 'Geçersiz provider (elevenlabs | azure | cartesia)' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(audioBuffer);
  } catch (e: any) {
    console.error('[Voice Preview]', e.message?.slice(0, 200));
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /synthesize (internal) ─────────────────────────────────────────────

router.post('/synthesize', async (req: any, res: any) => {
  try {
    const { text, language, voiceId, emotion, provider } = req.body;
    if (!text) return res.status(400).json({ error: 'text zorunlu' });

    const { synthesize } = require('../services/tts-engine');
    const audio = await synthesize({ text, language, voiceId, emotion, provider });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
