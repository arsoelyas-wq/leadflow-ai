export {};
/**
 * Voice Library API
 * GET /api/voice-library/voices        — full catalog (Azure + Cartesia)
 * GET /api/voice-library/voices/:lang  — by language code
 * GET /api/voice-library/preview       — generate preview audio
 * GET /api/voice-library/languages     — supported language list
 */

const express = require('express');
const router  = express.Router();

const {
  getAzureVoiceCatalog,
  getCartesiaVoiceCatalog,
  generateAzurePreview,
  synthesizeCartesia,
} = require('../services/tts-engine');

// ─── LANGUAGE METADATA ────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'tr', name: 'Türkçe',     flag: '🇹🇷', native: 'Türkçe' },
  { code: 'en', name: 'İngilizce',  flag: '🇬🇧', native: 'English' },
  { code: 'de', name: 'Almanca',    flag: '🇩🇪', native: 'Deutsch' },
  { code: 'fr', name: 'Fransızca',  flag: '🇫🇷', native: 'Français' },
  { code: 'ar', name: 'Arapça',     flag: '🇸🇦', native: 'العربية' },
  { code: 'ru', name: 'Rusça',      flag: '🇷🇺', native: 'Русский' },
  { code: 'es', name: 'İspanyolca', flag: '🇪🇸', native: 'Español' },
  { code: 'it', name: 'İtalyanca',  flag: '🇮🇹', native: 'Italiano' },
  { code: 'nl', name: 'Hollandaca', flag: '🇳🇱', native: 'Nederlands' },
  { code: 'zh', name: 'Çince',      flag: '🇨🇳', native: '中文' },
  { code: 'ja', name: 'Japonca',    flag: '🇯🇵', native: '日本語' },
  { code: 'ko', name: 'Korece',     flag: '🇰🇷', native: '한국어' },
  { code: 'pl', name: 'Lehçe',      flag: '🇵🇱', native: 'Polski' },
  { code: 'pt', name: 'Portekizce', flag: '🇧🇷', native: 'Português' },
  { code: 'hi', name: 'Hintçe',     flag: '🇮🇳', native: 'हिन्दी' },
  { code: 'az', name: 'Azerbaycanca',flag: '🇦🇿', native: 'Azərbaycan' },
];

// ─── GET /languages ───────────────────────────────────────────────────────────

router.get('/languages', (_req: any, res: any) => {
  res.json({ languages: LANGUAGES });
});

// ─── GET /voices ──────────────────────────────────────────────────────────────

router.get('/voices', async (req: any, res: any) => {
  try {
    const { lang, gender, category, provider, search, limit = 200 } = req.query;

    const [azureVoices, cartesiaVoices] = await Promise.all([
      getAzureVoiceCatalog(),
      Promise.resolve(getCartesiaVoiceCatalog()),
    ]);

    let voices = [...azureVoices, ...cartesiaVoices];

    if (lang)     voices = voices.filter((v: any) => v.language === lang);
    if (gender)   voices = voices.filter((v: any) => v.gender === gender);
    if (category) voices = voices.filter((v: any) => v.category === category);
    if (provider) voices = voices.filter((v: any) => v.provider === provider);
    if (search)   voices = voices.filter((v: any) =>
      v.name.toLowerCase().includes((search as string).toLowerCase()) ||
      v.language_name.toLowerCase().includes((search as string).toLowerCase())
    );

    // Sort: Turkish first, then by language, then by category
    voices.sort((a: any, b: any) => {
      if (a.language === 'tr' && b.language !== 'tr') return -1;
      if (b.language === 'tr' && a.language !== 'tr') return  1;
      if (a.language !== b.language) return a.language.localeCompare(b.language);
      const catOrder = { professional: 0, warm: 1, energetic: 2, news: 3, general: 4 };
      return (catOrder[a.category as keyof typeof catOrder] || 4) - (catOrder[b.category as keyof typeof catOrder] || 4);
    });

    // Group by language for convenient UI rendering
    const byLanguage: Record<string, any> = {};
    for (const v of voices.slice(0, Number(limit))) {
      if (!byLanguage[v.language]) {
        const langMeta = LANGUAGES.find((l: any) => l.code === v.language);
        byLanguage[v.language] = { meta: langMeta || { code: v.language, name: v.language_name, flag: '🌐' }, voices: [] };
      }
      byLanguage[v.language].voices.push(v);
    }

    res.json({
      total:      voices.length,
      voices:     voices.slice(0, Number(limit)),
      byLanguage,
      providers:  { azure: azureVoices.length, cartesia: cartesiaVoices.length },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /voices/:lang ────────────────────────────────────────────────────────

router.get('/voices/:lang', async (req: any, res: any) => {
  try {
    const { lang } = req.params;
    const [azure, cartesia] = await Promise.all([
      getAzureVoiceCatalog(),
      Promise.resolve(getCartesiaVoiceCatalog()),
    ]);

    const voices = [...azure, ...cartesia].filter((v: any) => v.language === lang);
    const langMeta = LANGUAGES.find(l => l.code === lang);

    res.json({ lang, meta: langMeta, voices, total: voices.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /preview ─────────────────────────────────────────────────────────────

router.get('/preview', async (req: any, res: any) => {
  try {
    const { voiceId, lang = 'tr', provider = 'azure', text } = req.query;
    if (!voiceId) return res.status(400).json({ error: 'voiceId zorunlu' });

    let audioBuffer: Buffer;

    const previewTexts: Record<string, string> = {
      tr: 'Merhaba! Size bugün ilginç bir şey anlatmak istiyorum. Bir dakikanız var mı?',
      en: 'Hello! I have something interesting to share with you today. Do you have a moment?',
      de: 'Guten Tag! Ich habe heute etwas Interessantes für Sie. Haben Sie einen Moment?',
      fr: 'Bonjour! J\'ai quelque chose d\'intéressant à vous dire. Avez-vous un moment?',
      ar: 'مرحباً! لدي شيء مثير للاهتمام أريد مشاركته معك. هل لديك لحظة؟',
      ru: "Zdravstvuyte! U menya est' koe-chto interesnoe. Est' minuta?",
      es: '¡Hola! Tengo algo interesante que compartir. ¿Tiene un momento?',
    };

    const sampleText = (text as string) || previewTexts[lang as string] || previewTexts['en'];

    if (provider === 'azure') {
      audioBuffer = await generateAzurePreview(voiceId as string, lang as string);
    } else if (provider === 'cartesia') {
      const { synthesizeCartesia: sc } = require('../services/tts-engine');
      audioBuffer = await sc({ text: sampleText, language: lang, voiceId });
    } else {
      return res.status(400).json({ error: 'Geçersiz provider' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(audioBuffer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /synthesize (internal use) ─────────────────────────────────────────

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
