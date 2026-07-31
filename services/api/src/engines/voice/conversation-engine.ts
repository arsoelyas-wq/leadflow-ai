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
  const styleGuide: Record<string, string> = {
    consultant: 'Danışman: sakin, güven verici, sorular soran, acele etmeyen',
    challenger: 'Challenger: cesur, statükoya meydan okuyan, içgörü paylaşan',
    rapport:    'İlişki kurucu: sıcak, samimi, empati gösteren, kişisel bağ kuran',
    direct:     'Direkt: net, hızlı, zamanı değerli, sonuca odaklı',
    corporate:  'Kurumsal: resmi, profesyonel, yapılandırılmış',
  };

  const lines = [
    `Sen ${ctx.agentName}, ${ctx.companyName} adına arıyorsun.`,
    `Ürün/hizmet: ${ctx.productDesc || 'Belirtilmemiş'}.`,
    ctx.leadName ? `Müşteri adı: ${ctx.leadName}${ctx.leadCompany ? `, ${ctx.leadCompany}` : ''}.` : '',
    `Konuşma tarzı: ${styleGuide[ctx.conversationStyle] || styleGuide.consultant}.`,
    ctx.pain1 ? `Müşteri sorunu 1: ${ctx.pain1}.` : '',
    ctx.pain2 ? `Müşteri sorunu 2: ${ctx.pain2}.` : '',
    ctx.callMemory ? `Önceki görüşme notu: ${ctx.callMemory}.` : '',
    ctx.avoidWords ? `Bu kelimeleri kullanma: ${ctx.avoidWords}.` : '',
    ctx.transferNumber ? `Sıcak lead için transfer numarası: ${ctx.transferNumber}.` : '',
    '',
    '── TELEFON KURALLARI ──',
    '• Yanıtların çok kısa ol — bir veya iki cümle. Telefon aramalarında uzun konuşmak yanlış.',
    '• Markdown, emoji, liste kullanma. Düz, doğal konuşma dili.',
    '• Her yanıtta mutlaka açık uçlu bir soru SOR — konuşmayı ilerlet.',
    '• Müşteri reddetse bile bir an duraksayıp nazikçe yönlendir, hemen pes etme.',
    '• Müşteri veda ederse hemen end_call çağır.',
    '• Randevu alırsan book_appointment çağır ve nazikçe bitir.',
    '• Müşteri canlı görüşme isterse transfer_call çağır.',
    '• Müşteri kesinlikle istemiyorsa add_to_blacklist çağır.',
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
