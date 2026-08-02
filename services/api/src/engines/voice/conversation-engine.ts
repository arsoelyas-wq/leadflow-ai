export {};
const Anthropic = require('@anthropic-ai/sdk');

// ─── Claude Haiku 4.5 — Streaming konuşma motoru ─────────────────────────────
// Telefon araması için optimize: kısa yanıtlar, doğal konuşma dili
// Araç çağrıları: book_appointment, add_to_blacklist, transfer_call, end_call

export interface Message { role: 'user' | 'assistant'; content: string; }

export interface CallContext {
  agentName:       string;
  companyName:     string;
  productDesc:     string;
  leadName:        string;
  leadCompany:     string;
  language:        string;
  conversationStyle: string;
  transferNumber?: string;
  avoidWords?:     string;
  pain1?:          string;
  pain2?:          string;
  callMemory?:     string;
  businessContext?: string;  // Tam iş profili: SSS, itirazlar, avantajlar
}

export interface ToolCall {
  name:       string;
  args:       Record<string, string>;
}

export interface StreamResult {
  sentences:  string[];   // konuşmaya hazır, temiz cümleler
  toolCalls:  ToolCall[];
  fullText:   string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 0,
});

const TOOLS = [
  {
    name: 'book_appointment',
    description: 'Müşteri belirli bir gün/saat randevu verdiğinde bunu kaydet ve aramayı nazikçe sonlandır.',
    input_schema: {
      type: 'object',
      properties: {
        day:  { type: 'string', description: 'Randevu günü (örn: Çarşamba, Thursday)' },
        time: { type: 'string', description: 'Randevu saati (örn: 14:00)' },
        note: { type: 'string', description: 'Ek not (opsiyonel)' },
      },
      required: ['day'],
    },
  },
  {
    name: 'add_to_blacklist',
    description: 'Müşteri kesinlikle aranmak istemiyorsa kara listeye ekle.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reddetme nedeni' },
      },
      required: [],
    },
  },
  {
    name: 'transfer_call',
    description: 'Müşteri canlı temsilci istiyorsa veya konuşma çok ilerliyorsa aramayı transfer et.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'end_call',
    description: 'Konuşma tamamlandığında, müşteri vedalaştığında, veya başka bir uygun nokta bulunduğunda aramayı sonlandır.',
    input_schema: {
      type: 'object',
      properties: {
        outcome: {
          type: 'string',
          enum: ['positive', 'negative', 'callback', 'no_answer', 'unknown'],
          description: 'Arama sonucu',
        },
      },
      required: ['outcome'],
    },
  },
];

function buildSystemPrompt(ctx: CallContext): string {
  // Dile göre tarz açıklamaları
  const styleByLang: Record<string, Record<string, string>> = {
    tr: {
      consultant: 'Danışman: sakin, güven verici, sorular soran, acele etmeyen',
      challenger: 'Challenger: cesur, statükoya meydan okuyan, içgörü paylaşan',
      rapport:    'İlişki kurucu: sıcak, samimi, empati gösteren, kişisel bağ kuran',
      direct:     'Direkt: net, hızlı, zamanı değerli, sonuca odaklı',
      corporate:  'Kurumsal: resmi, profesyonel, yapılandırılmış',
    },
    en: {
      consultant: 'Consultant: calm, trustworthy, asks questions, not pushy',
      challenger: 'Challenger: bold, challenges status quo, shares insights',
      rapport:    'Rapport-builder: warm, genuine, empathetic, builds personal connection',
      direct:     'Direct: clear, fast, respects time, result-focused',
      corporate:  'Corporate: formal, professional, structured',
    },
    de: {
      consultant: 'Berater: ruhig, vertrauenswürdig, fragt Fragen, nicht aufdringlich',
      challenger: 'Challenger: mutig, hinterfragt Status quo, teilt Erkenntnisse',
      rapport:    'Beziehungsaufbauer: warmherzig, aufrichtig, empathisch',
      direct:     'Direkt: klar, schnell, respektiert die Zeit, ergebnisorientiert',
      corporate:  'Korporativ: förmlich, professionell, strukturiert',
    },
    fr: {
      consultant: 'Consultant: calme, digne de confiance, pose des questions, pas pressé',
      challenger: 'Challenger: audacieux, remet en question le statu quo',
      rapport:    'Créateur de liens: chaleureux, sincère, empathique',
      direct:     'Direct: clair, rapide, respecte le temps, orienté résultats',
      corporate:  'Corporatif: formel, professionnel, structuré',
    },
  };

  const rulesMap: Record<string, string[]> = {
    tr: [
      '── TELEFON KURALLARI ──',
      '• Yanıtlar KESİNLİKLE 1-2 cümle. Daha uzun konuşma — kullanıcıyı kaybedersin.',
      '• Markdown, emoji, liste KULLANMA. Düz, sözlü dil.',
      '• Her yanıtta açık uçlu bir soru sor ("nasıl", "ne", "neden").',
      '• İkinci "hayır"dan sonra nazikçe kapat — ısrar etme.',
      '• Müşteri vedalaşınca: end_call çağır.',
      '• Randevu: book_appointment → vedalaş.',
      '• Canlı görüşme istiyorsa: transfer_call.',
      '• Asla "yapay zeka", "bot", "otomatik" deme — insan satış temsilcisisin.',
    ],
    en: [
      '── PHONE CALL RULES ──',
      '• Responses STRICTLY 1-2 sentences. Phone calls die with long responses.',
      '• No markdown, emojis, or lists. Natural spoken language only.',
      '• Always end with an open-ended question ("how", "what", "why").',
      '• After a second "no", close gracefully — don\'t push.',
      '• When the prospect says goodbye: call end_call.',
      '• Appointment confirmed: call book_appointment → say goodbye.',
      '• Prospect wants to talk live: call transfer_call.',
      '• Never say "AI", "bot", "automated" — you are a human sales rep.',
    ],
    de: [
      '── ANRUF-REGELN ──',
      '• Antworten MAXIMAL 1-2 Sätze. Lange Antworten verlieren den Gesprächspartner.',
      '• Kein Markdown, Emojis oder Listen. Natürliche gesprochene Sprache.',
      '• Jede Antwort mit einer offenen Frage abschließen.',
      '• Nach dem zweiten Nein: freundlich beenden — nicht drängen.',
      '• Wenn Gesprächspartner sich verabschiedet: end_call aufrufen.',
      '• Termin vereinbart: book_appointment → verabschieden.',
      '• Nie "KI", "Bot", "automatisch" sagen — Sie sind ein menschlicher Vertriebsmitarbeiter.',
    ],
    fr: [
      '── RÈGLES D\'APPEL ──',
      '• Réponses STRICTEMENT 1-2 phrases. Les appels meurent avec de longues réponses.',
      '• Pas de markdown, emojis ou listes. Langage oral naturel seulement.',
      '• Terminer chaque réponse par une question ouverte.',
      '• Après un second refus: conclure gracieusement.',
      '• Quand le prospect dit au revoir: appeler end_call.',
      '• Rendez-vous confirmé: appeler book_appointment → dire au revoir.',
      '• Ne jamais dire "IA", "bot", "automatisé" — vous êtes un vendeur humain.',
    ],
  };

  const lang = ctx.language in styleByLang ? ctx.language : 'en';
  const styles = styleByLang[lang] || styleByLang.en;
  const rules  = rulesMap[lang]   || rulesMap.en;
  const style  = styles[ctx.conversationStyle] || styles.consultant;

  // Ortak header — agent kimliği ve bağlam
  const header = lang === 'tr'
    ? `Sen ${ctx.agentName}, ${ctx.companyName} adına arıyorsun. Ürün/hizmet: ${ctx.productDesc || 'Belirtilmemiş'}.`
    : lang === 'de'
    ? `Sie sind ${ctx.agentName}, rufen im Namen von ${ctx.companyName} an. Produkt/Dienstleistung: ${ctx.productDesc || 'Nicht angegeben'}.`
    : lang === 'fr'
    ? `Vous êtes ${ctx.agentName}, vous appelez au nom de ${ctx.companyName}. Produit/service: ${ctx.productDesc || 'Non précisé'}.`
    : `You are ${ctx.agentName}, calling on behalf of ${ctx.companyName}. Product/service: ${ctx.productDesc || 'Not specified'}.`;

  const leadInfo = ctx.leadName
    ? (lang === 'tr'
        ? `Müşteri: ${ctx.leadName}${ctx.leadCompany ? `, ${ctx.leadCompany}` : ''}.`
        : lang === 'de'
        ? `Gesprächspartner: ${ctx.leadName}${ctx.leadCompany ? `, ${ctx.leadCompany}` : ''}.`
        : lang === 'fr'
        ? `Prospect: ${ctx.leadName}${ctx.leadCompany ? `, ${ctx.leadCompany}` : ''}.`
        : `Prospect: ${ctx.leadName}${ctx.leadCompany ? `, ${ctx.leadCompany}` : ''}.`)
    : '';

  const lines = [
    header,
    leadInfo,
    (lang === 'tr' ? `Konuşma tarzı: ` : lang === 'de' ? `Gesprächsstil: ` : `Conversation style: `) + style,
    ctx.pain1 ? (lang === 'tr' ? `Müşteri sorunu: ${ctx.pain1}` : `Prospect pain point: ${ctx.pain1}`) : '',
    ctx.pain2 ? (lang === 'tr' ? `2. sorun: ${ctx.pain2}` : `2nd pain: ${ctx.pain2}`) : '',
    ctx.callMemory ? (lang === 'tr' ? `Önceki görüşme: ${ctx.callMemory}` : `Previous call note: ${ctx.callMemory}`) : '',
    ctx.avoidWords ? (lang === 'tr' ? `Yasaklı kelimeler: ${ctx.avoidWords}` : `Avoid words: ${ctx.avoidWords}`) : '',
    ctx.transferNumber ? (lang === 'tr' ? `Transfer no: ${ctx.transferNumber}` : `Transfer number: ${ctx.transferNumber}`) : '',
    ctx.businessContext ? `\n── ÜRÜN/HİZMET BİLGİLERİ ──\n${ctx.businessContext}` : '',
    '',
    ...rules,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Kullanıcı girdisini Claude'a gönder, cümle cümle stream et.
 * `onSentence` her cümle hazır olduğunda çağrılır → TTS kuyruğuna ekle.
 */
export async function streamResponse(
  history: Message[],
  userText: string,
  ctx: CallContext,
  signal: AbortSignal,
  onSentence: (sentence: string) => void,
): Promise<StreamResult> {
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userText },
  ];

  let fullText   = '';
  let pending    = '';          // henüz cümle tamamlanmamış parçalar
  const toolCalls: ToolCall[] = [];
  const sentences: string[] = [];

  const stream = await anthropic.messages.stream({
    model:       'claude-haiku-4-5-20251001',
    max_tokens:  160,
    system:      buildSystemPrompt(ctx),
    messages,
    tools:       TOOLS,
    tool_choice: { type: 'auto' },
  });

  for await (const event of stream) {
    if (signal.aborted) break;

    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      const token  = event.delta.text;
      fullText    += token;
      pending     += token;

      // Cümle sınırı tespiti — nokta/ünlem/soru + boşluk veya sona ulaşıldı
      const extracted = extractCompleteSentences(pending);
      for (const sent of extracted.sentences) {
        if (sent.length > 0) {
          sentences.push(sent);
          onSentence(sent);
        }
      }
      pending = extracted.remaining;
    }

    if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
      // Tool call başladı — adını kaydet
    }

    if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
      // Tool input JSON fragmentleri — sonunda kullanılır
    }
  }

  // Stream bitti — kalan parçayı flush et
  if (pending.trim().length > 0 && !signal.aborted) {
    const sent = pending.trim();
    sentences.push(sent);
    onSentence(sent);
    fullText += pending;
    pending   = '';
  }

  // Araç çağrılarını al
  try {
    const finalMsg = await stream.finalMessage();
    for (const block of finalMsg.content) {
      if (block.type === 'tool_use') {
        toolCalls.push({ name: block.name, args: (block.input as Record<string, string>) || {} });
      }
    }
  } catch { /* stream iptal edildiyse hata normal */ }

  return { sentences, toolCalls, fullText };
}

// ── Cümle ayırıcı ────────────────────────────────────────────────────────────
// Kısaltma ve ondalık sayıları atlar, gerçek cümle sonlarını yakalar

const SENTENCE_END = /([^.!?]*[.!?]+)\s+/g;
const ABBREV       = /\b([A-ZÇĞİÖŞÜa-zçğışöü]{1,3})\.$/ ;  // kısaltma kontrolü
const DECIMAL      = /\d\.$/ ;                                // ondalık kontrol

function extractCompleteSentences(text: string): { sentences: string[]; remaining: string } {
  const sentences: string[] = [];
  let lastIdx = 0;

  for (const match of text.matchAll(SENTENCE_END)) {
    const before = text.slice(0, (match.index ?? 0) + match[1].length);
    if (ABBREV.test(before) || DECIMAL.test(before)) continue;

    const s = match[1].trim();
    if (s.length >= 4) sentences.push(s);
    lastIdx = (match.index ?? 0) + match[0].length;
  }

  return { sentences, remaining: text.slice(lastIdx) };
}
