export {};

// ─── Voice Catalog — 12 dil × Deepgram × Cartesia ────────────────────────────
// Her dil için: Cartesia ses ID, Deepgram model/dil, sessizlik eşiği, barge-in
// Cartesia Sonic-2: gerçek çok dilli model — aynı API, dile göre ses ID değişir
// Deepgram Nova-3: Türkçe dahil tüm dillerde gerçek zamanlı STT

export interface LangConfig {
  // Cartesia
  cartesiaVoiceId: string;         // dil/cinsiyet için en doğal ses
  cartesiaVoiceIdFemale?: string;  // kadın sesi (varsa)
  cartesiaModel: string;

  // Deepgram
  deepgramModel: string;
  deepgramLanguage: string;
  deepgramEndpointingMs: number;   // konuşma sonu tespiti (ms)

  // Conversation tuning
  silenceConfidenceThreshold: number;  // barge-in için minimum güven skoru
  minWordsToBarge: number;             // interrupt için minimum kelime sayısı
  fillerWords: Set<string>;            // barge-in tetiklemeyen dolgu kelimeleri
  fillerResponses: string[];           // LLM düşünürken çalınan kısa ses cümleleri

  // Call endings
  endCallPhrases: string[];            // bu cümleler arama bitişini tetikler
  callEndMessage: string;              // AI'ın söyleyeceği veda cümlesi
  silencePrompt: string;               // sessizlik sonrası hatırlatma
}

// Cartesia Sonic-2 resmi ses ID'leri (production-verified)
const VOICES = {
  // Türkçe
  TR_MALE:   '5a31e4fb-f823-4359-aa91-82c0ae9a991c',
  TR_FEMALE: 'fa7bfcdc-603c-4bf1-a600-a371400d2f8c',  // Leyla - Story Companion (samimi, akıcı)

  // İngilizce
  EN_MALE:   '79a125e8-cd45-4c13-8a67-188112f4dd22',  // Chris — professional
  EN_FEMALE: 'a0e99841-438c-4a64-b679-ae501e7d6091',  // Barbara

  // Almanca
  DE_MALE:   '3f6e78a8-5283-42aa-b5e7-af82e8bb310c',

  // Fransızca
  FR_MALE:   'a8a1eb38-5f15-4c1d-8722-7ac0f329727d',

  // Arapça
  AR_MALE:   '3b554bf4-e0d4-4a74-ae96-3c1f6db66f82',

  // Çok dilli nötr (ES, IT, PT, RU, NL, PL, JA fallback)
  MULTILINGUAL: 'b7d50908-b17c-442d-ad8d-810c63997ed9',
};

export const VOICE_CATALOG: Record<string, LangConfig> = {
  tr: {
    cartesiaVoiceId:        VOICES.TR_MALE,
    cartesiaVoiceIdFemale:  VOICES.TR_FEMALE,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-2',
    deepgramLanguage: 'tr',
    deepgramEndpointingMs: 300,        // 400ms gecikme kısaltıldı — barge-in daha hızlı
    silenceConfidenceThreshold: 0.55,
    minWordsToBarge: 2,
    fillerWords: new Set(['mm', 'mmm', 'aa', 'ha', 'hmm', 'ee', 'evet', 'tamam', 'he', 'ya', 'vay', 'ooo', 'yani', 'şey', 'tabi']),
    fillerResponses: [
      'Anlıyorum.',
      'Tabii efendim.',
      'Evet, haklısınız.',
      'Şöyle...',
      'Bir saniye.',
    ],
    endCallPhrases:  ['görüşürüz', 'hoşça kalın', 'iyi günler', 'güle güle', 'görüşmek üzere', 'kapatıyorum', 'bay bay', 'eyvallah'],
    callEndMessage:  'Teşekkürler, görüşmek üzere, iyi günler!',
    silencePrompt:   'Merhaba, sizi duyamadım, orada mısınız?',
  },

  en: {
    cartesiaVoiceId:       VOICES.EN_MALE,
    cartesiaVoiceIdFemale: VOICES.EN_FEMALE,
    cartesiaModel:         'sonic-3',
    deepgramModel:         'nova-3',
    deepgramLanguage:      'en-US',
    deepgramEndpointingMs: 200,
    silenceConfidenceThreshold: 0.70,
    minWordsToBarge: 2,
    fillerWords: new Set(['um', 'uh', 'hmm', 'ah', 'oh', 'yeah', 'ok', 'right', 'sure']),
    fillerResponses: ['Sure...', 'Let me see...', 'Right...', 'Of course...', 'Absolutely...'],
    endCallPhrases:  ['goodbye', 'bye', 'have a good day', 'talk later', 'take care', 'thanks bye'],
    callEndMessage:  'Thank you, have a great day!',
    silencePrompt:   'Hello, are you still there?',
  },

  de: {
    cartesiaVoiceId:  VOICES.DE_MALE,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'de',
    deepgramEndpointingMs: 220,
    silenceConfidenceThreshold: 0.65,
    minWordsToBarge: 2,
    fillerWords: new Set(['äh', 'öhm', 'hmm', 'ja', 'ok', 'genau', 'ach so']),
    fillerResponses: ['Natürlich...', 'Verstehe...', 'Einen Moment...', 'Gut...'],
    endCallPhrases:  ['tschüss', 'auf wiedersehen', 'bis bald', 'vielen dank', 'tschau'],
    callEndMessage:  'Vielen Dank, auf Wiedersehen!',
    silencePrompt:   'Hallo, sind Sie noch da?',
  },

  fr: {
    cartesiaVoiceId:  VOICES.FR_MALE,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'fr',
    deepgramEndpointingMs: 200,
    silenceConfidenceThreshold: 0.65,
    minWordsToBarge: 2,
    fillerWords: new Set(['euh', 'hmm', 'ah', 'ouais', 'ok', 'voilà', 'ben']),
    fillerResponses: ['Bien sûr...', 'Je vois...', 'Un instant...', 'Tout à fait...'],
    endCallPhrases:  ['au revoir', 'bonne journée', 'à bientôt', 'merci au revoir'],
    callEndMessage:  'Merci beaucoup, au revoir!',
    silencePrompt:   'Allô, vous êtes toujours là?',
  },

  ar: {
    cartesiaVoiceId:  VOICES.AR_MALE,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'ar',
    deepgramEndpointingMs: 220,
    silenceConfidenceThreshold: 0.60,
    minWordsToBarge: 2,
    fillerWords: new Set(['آه', 'اممم', 'حسناً', 'نعم', 'ماشي']),
    fillerResponses: ['بالطبع...', 'أفهم...', 'لحظة...', 'نعم...'],
    endCallPhrases:  ['مع السلامة', 'وداعاً', 'شكراً جزيلاً', 'إلى اللقاء'],
    callEndMessage:  'شكراً جزيلاً، مع السلامة!',
    silencePrompt:   'مرحباً، هل لا تزال موجوداً؟',
  },

  es: {
    cartesiaVoiceId:  VOICES.MULTILINGUAL,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'es',
    deepgramEndpointingMs: 180,
    silenceConfidenceThreshold: 0.65,
    minWordsToBarge: 2,
    fillerWords: new Set(['eh', 'mm', 'hmm', 'sí', 'ok', 'bueno', 'pues']),
    fillerResponses: ['Claro...', 'Entiendo...', 'Un momento...', 'Por supuesto...'],
    endCallPhrases:  ['adiós', 'hasta luego', 'buen día', 'muchas gracias adiós'],
    callEndMessage:  'Muchas gracias, ¡hasta luego!',
    silencePrompt:   'Hola, ¿sigue ahí?',
  },

  it: {
    cartesiaVoiceId:  VOICES.MULTILINGUAL,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'it',
    deepgramEndpointingMs: 180,
    silenceConfidenceThreshold: 0.65,
    minWordsToBarge: 2,
    fillerWords: new Set(['eh', 'mm', 'hmm', 'sì', 'ok', 'bene', 'allora']),
    fillerResponses: ['Certo...', 'Capisco...', 'Un attimo...', 'Naturalmente...'],
    endCallPhrases:  ['arrivederci', 'buona giornata', 'grazie arrivederci', 'ciao'],
    callEndMessage:  'Grazie mille, arrivederci!',
    silencePrompt:   'Pronto, mi sente ancora?',
  },

  pt: {
    cartesiaVoiceId:  VOICES.MULTILINGUAL,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'pt-BR',
    deepgramEndpointingMs: 180,
    silenceConfidenceThreshold: 0.65,
    minWordsToBarge: 2,
    fillerWords: new Set(['é', 'mm', 'hmm', 'sim', 'ok', 'então', 'né']),
    fillerResponses: ['Claro...', 'Entendo...', 'Um momento...', 'Com certeza...'],
    endCallPhrases:  ['tchau', 'até logo', 'obrigado tchau', 'boa tarde'],
    callEndMessage:  'Muito obrigado, até logo!',
    silencePrompt:   'Alô, ainda está na linha?',
  },

  ru: {
    cartesiaVoiceId:  VOICES.MULTILINGUAL,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'ru',
    deepgramEndpointingMs: 220,
    silenceConfidenceThreshold: 0.65,
    minWordsToBarge: 2,
    fillerWords: new Set(['э', 'мм', 'хм', 'да', 'ну', 'вот', 'значит']),
    fillerResponses: ['Конечно...', 'Понятно...', 'Одну секунду...', 'Да, слушаю...'],
    endCallPhrases:  ['до свидания', 'пока', 'всего доброго', 'спасибо до свидания'],
    callEndMessage:  'Спасибо большое, до свидания!',
    silencePrompt:   'Алло, вы ещё на линии?',
  },

  nl: {
    cartesiaVoiceId:  VOICES.MULTILINGUAL,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'nl',
    deepgramEndpointingMs: 200,
    silenceConfidenceThreshold: 0.65,
    minWordsToBarge: 2,
    fillerWords: new Set(['eh', 'mm', 'hmm', 'ja', 'ok', 'goed', 'nou']),
    fillerResponses: ['Natuurlijk...', 'Ik begrijp het...', 'Een moment...', 'Zeker...'],
    endCallPhrases:  ['dag', 'tot ziens', 'bedankt dag', 'doei'],
    callEndMessage:  'Dank u wel, tot ziens!',
    silencePrompt:   'Hallo, bent u er nog?',
  },

  pl: {
    cartesiaVoiceId:  VOICES.MULTILINGUAL,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'pl',
    deepgramEndpointingMs: 220,
    silenceConfidenceThreshold: 0.65,
    minWordsToBarge: 2,
    fillerWords: new Set(['ee', 'mm', 'hmm', 'tak', 'ok', 'no', 'właśnie']),
    fillerResponses: ['Oczywiście...', 'Rozumiem...', 'Chwileczkę...', 'Jasne...'],
    endCallPhrases:  ['do widzenia', 'pa', 'dziękuję do widzenia', 'na razie'],
    callEndMessage:  'Dziękuję bardzo, do widzenia!',
    silencePrompt:   'Halo, czy jest Pan/Pani jeszcze na linii?',
  },

  ja: {
    cartesiaVoiceId:  VOICES.MULTILINGUAL,
    cartesiaModel:    'sonic-3',
    deepgramModel:    'nova-3',
    deepgramLanguage: 'ja',
    deepgramEndpointingMs: 150,
    silenceConfidenceThreshold: 0.60,
    minWordsToBarge: 1,
    fillerWords: new Set(['えー', 'あの', 'その', 'まあ', 'ちょっと', 'はい']),
    fillerResponses: ['はい...', 'なるほど...', '少々お待ちを...', 'もちろん...'],
    endCallPhrases:  ['さようなら', 'ありがとうございました', 'またご連絡します', 'お疲れ様でした'],
    callEndMessage:  'ありがとうございました、失礼いたします。',
    silencePrompt:   'もしもし、聞こえますか？',
  },
};

/** Dil kodu → LangConfig (bilinmeyen → İngilizce) */
export function getLangConfig(language: string): LangConfig {
  return VOICE_CATALOG[language] || VOICE_CATALOG['en'];
}

/** Ülke kodu → Dil kodu */
export function countryToLang(countryCode: string): string {
  const map: Record<string, string> = {
    TR: 'tr', DE: 'de', AT: 'de', CH: 'de',
    GB: 'en', US: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', IN: 'en',
    FR: 'fr', BE: 'fr', LU: 'fr',
    AE: 'ar', SA: 'ar', QA: 'ar', KW: 'ar', EG: 'ar', MA: 'ar', DZ: 'ar', JO: 'ar',
    RU: 'ru', KZ: 'ru', UA: 'ru', BY: 'ru',
    IT: 'it',
    ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', CL: 'es',
    NL: 'nl',
    PL: 'pl',
    PT: 'pt', BR: 'pt',
    JP: 'ja',
  };
  return map[countryCode?.toUpperCase()] || 'en';
}

/** Cartesia voice ID — cinsiyet tercihi varsa kadın sesini kullan */
export function getCartesiaVoiceId(config: LangConfig, gender?: 'male' | 'female' | 'neutral'): string {
  if (gender === 'female' && config.cartesiaVoiceIdFemale) return config.cartesiaVoiceIdFemale;
  return config.cartesiaVoiceId;
}
