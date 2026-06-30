export {};
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface EmotionProfile {
  // High-level emotional state
  primary:    'confident' | 'empathetic' | 'urgent' | 'warm' | 'professional' | 'excited';
  energy:     number;   // 0-1: 0=calm/slow, 1=energetic/fast
  urgency:    number;   // 0-1
  warmth:     number;   // 0-1
  confidence: number;   // 0-1

  // ElevenLabs voice settings
  voice: {
    stability:          number;  // 0-1 (higher = more stable/monotone)
    similarity_boost:   number;  // 0-1
    style:              number;  // 0-1 (expressiveness)
    speaking_rate:      number;  // 0.7-1.3 (1.0 = normal)
  };

  // Motion parameters for 3DGS / LatentSync
  motion: {
    headNodFrequency:      number;  // 0-1
    blinkRate:             number;  // 0-1
    expressionIntensity:   number;  // 0-1
    microExpressions:      boolean;
  };

  // Pause markers to inject into text-to-speech
  pauseMarkers: string[];
}

// ─── EMOTION MAP ──────────────────────────────────────────────────────────────

const EMOTION_PROFILES: Record<string, EmotionProfile> = {
  confident: {
    primary: 'confident', energy: 0.7, urgency: 0.5, warmth: 0.5, confidence: 0.9,
    voice: { stability: 0.75, similarity_boost: 0.85, style: 0.6, speaking_rate: 1.05 },
    motion: { headNodFrequency: 0.6, blinkRate: 0.4, expressionIntensity: 0.7, microExpressions: true },
    pauseMarkers: ['...', ', '],
  },
  empathetic: {
    primary: 'empathetic', energy: 0.45, urgency: 0.2, warmth: 0.9, confidence: 0.65,
    voice: { stability: 0.8, similarity_boost: 0.9, style: 0.5, speaking_rate: 0.92 },
    motion: { headNodFrequency: 0.8, blinkRate: 0.5, expressionIntensity: 0.6, microExpressions: true },
    pauseMarkers: ['...', '—'],
  },
  urgent: {
    primary: 'urgent', energy: 0.85, urgency: 0.9, warmth: 0.4, confidence: 0.8,
    voice: { stability: 0.55, similarity_boost: 0.8, style: 0.75, speaking_rate: 1.15 },
    motion: { headNodFrequency: 0.4, blinkRate: 0.35, expressionIntensity: 0.85, microExpressions: false },
    pauseMarkers: ['. '],
  },
  warm: {
    primary: 'warm', energy: 0.5, urgency: 0.25, warmth: 0.95, confidence: 0.6,
    voice: { stability: 0.82, similarity_boost: 0.88, style: 0.45, speaking_rate: 0.95 },
    motion: { headNodFrequency: 0.75, blinkRate: 0.55, expressionIntensity: 0.55, microExpressions: true },
    pauseMarkers: ['...', ', '],
  },
  professional: {
    primary: 'professional', energy: 0.6, urgency: 0.4, warmth: 0.55, confidence: 0.85,
    voice: { stability: 0.85, similarity_boost: 0.82, style: 0.4, speaking_rate: 1.0 },
    motion: { headNodFrequency: 0.5, blinkRate: 0.4, expressionIntensity: 0.5, microExpressions: false },
    pauseMarkers: ['. ', ', '],
  },
  excited: {
    primary: 'excited', energy: 0.92, urgency: 0.7, warmth: 0.75, confidence: 0.88,
    voice: { stability: 0.5, similarity_boost: 0.85, style: 0.85, speaking_rate: 1.12 },
    motion: { headNodFrequency: 0.7, blinkRate: 0.3, expressionIntensity: 0.95, microExpressions: true },
    pauseMarkers: ['! ', '... '],
  },
};

// ─── ANALYZE SCRIPT → EMOTION PROFILE ────────────────────────────────────────

export async function analyzeEmotion(
  script: string,
  research: { sector?: string; pain?: string; brandName?: string }
): Promise<EmotionProfile> {
  try {
    const prompt = `Aşağıdaki satış video scriptini analiz et ve duygusal tonunu belirle.

Script:
"${script.slice(0, 600)}"

Sektör: ${research.sector || 'genel'}
Bilinen sorun: ${research.pain || '-'}

Sadece şu 6 seçenekten birini yaz (başka bir şey yazma):
confident | empathetic | urgent | warm | professional | excited

Karar kriteri:
- Rakip baskı veya kayıp korkusu varsa → urgent
- Müşteriyi dinleme / anlayış odaklıysa → empathetic
- Güçlü ROI/başarı vurgusu varsa → confident
- Yenilik/fırsat coşkusu varsa → excited
- Samimi ilişki kurma odaklıysa → warm
- Kurumsal/teknik içerik varsa → professional`;

    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    }, { timeout: 8000 });

    const text = ((r.content[0] as any)?.text || '').trim().toLowerCase();
    const match = text.match(/confident|empathetic|urgent|warm|professional|excited/);
    if (match && EMOTION_PROFILES[match[0]]) {
      return EMOTION_PROFILES[match[0]];
    }
  } catch {}

  // Rule-based fallback — no AI needed
  const lower = script.toLowerCase();
  if (/rakip|kaybetm|son fırsat|acil|hemen/.test(lower))    return EMOTION_PROFILES.urgent;
  if (/anlıyoruz|zorlu|destek|yanınız/.test(lower))         return EMOTION_PROFILES.empathetic;
  if (/tebrikler|büyüme|başarı|%\d/.test(lower))            return EMOTION_PROFILES.excited;
  if (/merhaba|tanışmak|sizi/.test(lower))                  return EMOTION_PROFILES.warm;
  if (/çözüm|sistem|entegrasyon|teknik/.test(lower))        return EMOTION_PROFILES.professional;
  return EMOTION_PROFILES.confident;
}

// ─── APPLY EMOTION TO ELEVENLABS VOICE SETTINGS ───────────────────────────────

export function buildElevenLabsVoiceSettings(profile: EmotionProfile): {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
} {
  return {
    stability:         profile.voice.stability,
    similarity_boost:  profile.voice.similarity_boost,
    style:             profile.voice.style,
    use_speaker_boost: profile.energy > 0.6,
  };
}

// ─── INJECT PAUSE MARKERS INTO SCRIPT ────────────────────────────────────────

export function enrichScriptWithPauses(script: string, profile: EmotionProfile): string {
  if (profile.primary === 'empathetic' || profile.primary === 'warm') {
    // Add a brief pause after greetings
    return script.replace(/^(Merhaba[^!.]*[!.])/i, '$1 ');
  }
  if (profile.primary === 'urgent') {
    // Remove softening pauses
    return script.replace(/\.\.\./g, '.');
  }
  return script;
}

// ─── EXPORT PROFILE SUMMARY (for DB storage) ─────────────────────────────────

export function serializeProfile(profile: EmotionProfile): Record<string, any> {
  return {
    primary:    profile.primary,
    energy:     profile.energy,
    urgency:    profile.urgency,
    warmth:     profile.warmth,
    confidence: profile.confidence,
    voice:      profile.voice,
    motion:     profile.motion,
  };
}
