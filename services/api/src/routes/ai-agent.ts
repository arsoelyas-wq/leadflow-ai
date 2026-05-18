export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const cron = require('node-cron');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WA_GATEWAY = process.env.WA_GATEWAY || 'http://207.154.248.119:3003';
const WA_SECRET  = process.env.WA_SECRET  || 'leadflow-wa-secret-2026';
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWebsiteText(url: string): Promise<string> {
  if (!url) return '';
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const r = await axios.get(fullUrl, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadFlowBot/1.0; +https://leadflow.ai)' },
      maxContentLength: 400_000,
    });
    return stripHtml(String(r.data)).slice(0, 4000);
  } catch {
    return '';
  }
}

async function fetchMapsData(businessName: string, city: string): Promise<{ rating: number; reviewCount: number; reviews: string }> {
  if (!GOOGLE_API_KEY || !businessName) return { rating: 0, reviewCount: 0, reviews: '' };
  try {
    const q = encodeURIComponent(`${businessName} ${city || ''}`.trim());
    const searchRes = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&language=tr&key=${GOOGLE_API_KEY}`,
      { timeout: 6000 }
    );
    const place = searchRes.data.results?.[0];
    if (!place) return { rating: 0, reviewCount: 0, reviews: '' };

    const detailRes = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=rating,user_ratings_total,reviews&language=tr&key=${GOOGLE_API_KEY}`,
      { timeout: 6000 }
    );
    const d = detailRes.data.result || {};
    const reviews = (d.reviews || [])
      .slice(0, 5)
      .map((r: any) => `[${r.rating}★] ${(r.text || '').slice(0, 200)}`)
      .join('\n');

    return { rating: d.rating || 0, reviewCount: d.user_ratings_total || 0, reviews };
  } catch {
    return { rating: 0, reviewCount: 0, reviews: '' };
  }
}

async function logRun(userId: string, leadId: string | null, eventType: string, extras: Record<string, any> = {}) {
  try {
    await supabase.from('ai_agent_runs').insert([{
      user_id: userId,
      lead_id: leadId,
      event_type: eventType,
      channel: extras.channel || null,
      content: extras.content ? String(extras.content).slice(0, 500) : null,
      intent: extras.intent || null,
      metadata: extras.metadata || {},
    }]);
  } catch {}
}

// ─── RESEARCH ENGINE ─────────────────────────────────────────────────────────

async function researchLead(leadId: string, userId: string): Promise<any> {
  const { data: lead } = await supabase
    .from('leads')
    .select('id, company_name, website, phone, email, city, sector, notes')
    .eq('id', leadId)
    .eq('user_id', userId)
    .single();
  if (!lead) throw new Error('Lead bulunamadı');

  const { data: profile } = await supabase
    .from('ai_agent_profiles')
    .select('product_description, target_customer, pain_solved, price_range_min, price_range_max, price_currency, value_props')
    .eq('user_id', userId)
    .single();
  if (!profile) throw new Error('Ajan profili bulunamadı');

  await logRun(userId, leadId, 'research_started');

  const [websiteText, mapsData] = await Promise.all([
    fetchWebsiteText(lead.website || ''),
    fetchMapsData(lead.company_name, lead.city || ''),
  ]);

  const prompt = `Sen dünya klasında bir B2B satış zekası analistisin. Aşağıdaki verileri analiz et ve bu potansiyel müşteriye nasıl satış yapılacağını belirle.

## Müşteri
Şirket: ${lead.company_name}
Sektör: ${lead.sector || 'Bilinmiyor'}
Şehir: ${lead.city || 'Bilinmiyor'}
Website: ${lead.website || 'Yok'}

## Website İçeriği
${websiteText ? websiteText.slice(0, 2500) : 'Website içeriği alınamadı'}

## Google Maps
Puan: ${mapsData.rating}/5 (${mapsData.reviewCount} değerlendirme)
${mapsData.reviews ? `Yorumlar:\n${mapsData.reviews}` : 'Yorum bulunamadı'}

## Satıcının Teklifi
Ürün/Hizmet: ${profile.product_description}
Hedef Müşteri: ${profile.target_customer}
Çözdüğü Problem: ${profile.pain_solved}
Fiyat: ${profile.price_range_min}–${profile.price_range_max} ${profile.price_currency}
Değer Önerileri: ${(profile.value_props || []).join(', ')}

SADECE JSON döndür (başka hiçbir şey yazma):
{
  "pain_points": ["acı nokta 1", "acı nokta 2", "acı nokta 3"],
  "opportunities": ["fırsat 1", "fırsat 2"],
  "personalized_opener": "Bu şirkete özel kişiselleştirilmiş ilk WhatsApp mesajı — şirket adını kullan, neden onlara ulaştığını açıkla, max 180 karakter, samimi ve doğal",
  "talking_points": ["konuşma noktası 1", "konuşma noktası 2", "konuşma noktası 3"],
  "red_flags": ["dikkat edilmesi gereken durum"],
  "best_channel": "whatsapp",
  "best_time": "Sabah",
  "confidence_score": 75,
  "summary": "Bu şirket hakkında 2-3 cümlelik satış özeti"
}`;

  const claudeRes = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = claudeRes.content[0]?.text || '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  let analysis: any = {};
  try { analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {}; } catch {}

  const researchRow = {
    lead_id: leadId,
    user_id: userId,
    website_content: websiteText.slice(0, 5000),
    maps_rating: mapsData.rating,
    maps_review_count: mapsData.reviewCount,
    maps_reviews: mapsData.reviews,
    pain_points: analysis.pain_points || [],
    opportunities: analysis.opportunities || [],
    personalized_opener: analysis.personalized_opener || `Merhaba, ${lead.company_name} ile ilgili önemli bir bilgiyi paylaşmak istedim.`,
    talking_points: analysis.talking_points || [],
    red_flags: analysis.red_flags || [],
    best_channel: analysis.best_channel || 'whatsapp',
    best_time: analysis.best_time || 'Sabah',
    confidence_score: typeof analysis.confidence_score === 'number' ? analysis.confidence_score : 50,
    summary: analysis.summary || '',
    researched_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from('ai_agent_research')
    .upsert([researchRow], { onConflict: 'lead_id' });
  if (upsertErr) console.error('Research upsert error:', upsertErr.message);

  await logRun(userId, leadId, 'research_complete', {
    metadata: { confidence_score: researchRow.confidence_score, best_channel: researchRow.best_channel },
  });

  return researchRow;
}

// ─── INTENT DETECTION ────────────────────────────────────────────────────────

const INTENT_KEYWORDS: Record<string, string[]> = {
  price_inquiry:   ['fiyat', 'ne kadar', 'ücret', 'maliyet', 'tutar', 'kaça', 'fiyatı nedir'],
  meeting_request: ['görüşelim', 'toplantı', 'arayın', 'arar mısınız', 'randevu', 'zoom'],
  ready_to_buy:    ['alalım', 'alıyorum', 'tamam', 'anlaşalım', 'sipariş', 'sözleşme'],
  not_interested:  ['istemiyorum', 'hayır teşekkür', 'gerek yok', 'ilgilenmiyorum', 'bırakın'],
  objection:       ['pahalı', 'düşüneceğim', 'şu an değil', 'bütçemiz yok', 'rakip'],
  greeting:        ['merhaba', 'selam', 'iyi günler', 'nasılsınız'],
};

async function detectIntent(message: string, historySnippet: string): Promise<string> {
  const lower = message.toLowerCase();

  // Fast keyword check first
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return intent;
  }

  // Fallback to Claude Haiku for ambiguous messages
  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `Classify the intent. Reply with ONLY one word from: greeting, question, price_inquiry, objection, meeting_request, ready_to_buy, not_interested\n\nHistory: ${historySnippet.slice(0, 200)}\nMessage: "${message.slice(0, 200)}"\n\nIntent:`,
      }],
    });
    const raw = (r.content[0]?.text || '').trim().toLowerCase();
    const valid = ['greeting', 'question', 'price_inquiry', 'objection', 'meeting_request', 'ready_to_buy', 'not_interested'];
    return valid.find(v => raw.includes(v)) || 'question';
  } catch {
    return 'question';
  }
}

// ─── AI REPLY GENERATOR ──────────────────────────────────────────────────────

async function generateAIReply(params: {
  lead: any; profile: any; research: any; history: any[];
  intent: string; incomingMessage: string; conversationSummary: string; turnCount: number;
}): Promise<string> {
  const { lead, profile, research, history, intent, incomingMessage, conversationSummary, turnCount } = params;

  const historyText = history
    .slice(-8)
    .map((m: any) => `${m.direction === 'out' ? 'Satış AI' : lead.company_name}: ${m.content}`)
    .join('\n');

  const system = `Sen bir B2B satış uzmanısın. Şirketin sattığı ürün: ${profile.product_description}.
Hedef müşteri: ${profile.target_customer}. Çözdüğün sorun: ${profile.pain_solved}.
Fiyat aralığı: ${profile.price_range_min}–${profile.price_range_max} ${profile.price_currency}.
${(profile.value_props || []).length ? `Değer önerileri: ${profile.value_props.join(', ')}.` : ''}

KURALLAR:
- Türkçe, samimi, profesyonel yaz
- Maksimum 160 karakter (kısa WhatsApp mesajı gibi)
- Fiyat sorusunda: "Projenize özel fiyat çıkaralım" de, net fiyat verme
- İtirazda: somut fayda veya referans sun
- Güven kur, agresif satış yapma
- Emoji kullan ama aşırıya kaçma`;

  const userMsg = `Müşteri: ${lead.company_name} (${lead.city || ''})
${research ? `Araştırma özeti: ${research.summary || ''}\nAcı noktaları: ${(research.pain_points || []).join(', ')}` : ''}
Konuşma turu: ${turnCount} | Niyet: ${intent}
${conversationSummary ? `Konuşma özeti: ${conversationSummary}` : ''}

Son mesajlar:
${historyText}

Müşterinin mesajı: "${incomingMessage}"

Cevap yaz:`;

  const r = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 250,
    system,
    messages: [{ role: 'user', content: userMsg }],
  });

  return (r.content[0]?.text || '').trim() || 'Mesajınız için teşekkürler! Size en kısa sürede dönüş yapacağım. 🙏';
}

// ─── CHANNEL SENDERS ────────────────────────────────────────────────────────

async function sendWhatsApp(userId: string, phone: string, text: string, leadId?: string): Promise<boolean> {
  try {
    const { data: instance } = await supabase
      .from('wa_instances')
      .select('instance_id')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!instance) return false;

    const cleanPhone = phone.replace(/\D/g, '');
    await axios.post(`${WA_GATEWAY}/send`, {
      secret: WA_SECRET, instanceId: instance.instance_id, phone: cleanPhone, text,
    }, { timeout: 12000 });

    await supabase.from('messages').insert([{
      user_id: userId, lead_id: leadId || null,
      channel: 'whatsapp', direction: 'out',
      content: text, status: 'sent',
      sent_at: new Date().toISOString(),
      agent_name: 'AI Ajan',
    }]);

    return true;
  } catch (e: any) {
    console.error('AI Agent WA send error:', e.message);
    return false;
  }
}

async function sendEmailMsg(userId: string, email: string, subject: string, body: string, leadId?: string): Promise<boolean> {
  try {
    const nodemailer = require('nodemailer');
    const { data: settings } = await supabase
      .from('user_settings')
      .select('smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from')
      .eq('user_id', userId)
      .single();
    if (!settings?.smtp_host) return false;

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host, port: settings.smtp_port || 587,
      auth: { user: settings.smtp_user, pass: settings.smtp_pass },
    });
    await transporter.sendMail({
      from: settings.smtp_from || settings.smtp_user, to: email, subject, text: body,
    });

    await supabase.from('messages').insert([{
      user_id: userId, lead_id: leadId || null,
      channel: 'email', direction: 'out',
      content: body, status: 'sent',
      sent_at: new Date().toISOString(),
      agent_name: 'AI Ajan',
    }]);
    return true;
  } catch {
    return false;
  }
}

// ─── ESCALATION ──────────────────────────────────────────────────────────────

async function escalateToHuman(convId: string, leadId: string, userId: string, reason: string) {
  await supabase.from('ai_agent_conversations').update({
    ai_mode: 'human_takeover',
    escalated: true,
    escalated_at: new Date().toISOString(),
    escalation_reason: reason,
    updated_at: new Date().toISOString(),
  }).eq('id', convId);

  // Increment deals_escalated
  const { data: prof } = await supabase.from('ai_agent_profiles')
    .select('deals_escalated').eq('user_id', userId).single();
  if (prof) {
    await supabase.from('ai_agent_profiles')
      .update({ deals_escalated: (prof.deals_escalated || 0) + 1 })
      .eq('user_id', userId);
  }

  await logRun(userId, leadId, 'escalated', { content: reason, metadata: { conversationId: convId } });
  console.log(`AI Agent: Escalated conv ${convId} for lead ${leadId}: ${reason}`);
}

async function sendAutoProposal(convId: string, leadId: string, userId: string, lead: any, profile: any) {
  if (!profile.proposal_template) return;
  const text = profile.proposal_template
    .replace(/{company}/g, lead.company_name || '')
    .replace(/{price_min}/g, String(profile.price_range_min || ''))
    .replace(/{price_max}/g, String(profile.price_range_max || ''))
    .replace(/{currency}/g, profile.price_currency || '₺');

  if (lead.phone) await sendWhatsApp(userId, lead.phone, text, leadId);

  await supabase.from('ai_agent_conversations').update({
    proposal_sent: true, proposal_sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', convId);

  const { data: prof } = await supabase.from('ai_agent_profiles')
    .select('proposals_sent').eq('user_id', userId).single();
  if (prof) {
    await supabase.from('ai_agent_profiles')
      .update({ proposals_sent: (prof.proposals_sent || 0) + 1 }).eq('user_id', userId);
  }

  await logRun(userId, leadId, 'proposal_sent', { channel: 'whatsapp' });
}

// ─── CORE MESSAGE PROCESSOR ──────────────────────────────────────────────────

export async function processIncomingMessage(
  leadId: string, userId: string, message: string, channel: string, messageId?: string
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('ai_agent_profiles').select('*').eq('user_id', userId).single();
    if (!profile || !profile.is_active || !profile.auto_reply_enabled) return;

    // Load or create conversation
    let { data: conv } = await supabase
      .from('ai_agent_conversations').select('*')
      .eq('lead_id', leadId).eq('user_id', userId).eq('channel', channel).single();

    if (!conv) {
      const { data: newConv } = await supabase.from('ai_agent_conversations')
        .insert([{ lead_id: leadId, user_id: userId, channel, ai_mode: 'active' }])
        .select().single();
      conv = newConv;
    }

    if (!conv || conv.ai_mode !== 'active') return;
    if (messageId && conv.last_processed_msg === messageId) return;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (!lead) return;

    // Message history
    const { data: historyRows } = await supabase.from('messages')
      .select('direction, content, sent_at').eq('lead_id', leadId).eq('user_id', userId)
      .order('sent_at', { ascending: false }).limit(20);
    const history = (historyRows || []).reverse();
    const historySnippet = history.slice(-5).map((m: any) => `${m.direction}: ${m.content?.slice(0, 60)}`).join(' | ');

    const { data: research } = await supabase.from('ai_agent_research').select('*').eq('lead_id', leadId).single();

    await logRun(userId, leadId, 'reply_received', { content: message.slice(0, 200), channel, metadata: { messageId } });

    const intent = await detectIntent(message, historySnippet);

    await logRun(userId, leadId, 'intent_detected', { intent, content: message.slice(0, 200), channel });

    // Escalation check
    const lower = message.toLowerCase();
    const kwEscalation = (profile.escalation_triggers || []).some((t: string) => lower.includes(t.toLowerCase()));
    const intentEscalation = ['ready_to_buy', 'meeting_request'].includes(intent);

    if (kwEscalation || intentEscalation) {
      const trigger = kwEscalation
        ? (profile.escalation_triggers as string[]).find((t: string) => lower.includes(t.toLowerCase())) || ''
        : '';
      const reason = intentEscalation
        ? intent === 'ready_to_buy' ? 'Müşteri satın almaya hazır 🔥' : 'Müşteri toplantı istiyor 📅'
        : `Tetikleyici kelime: "${trigger}"`;

      await escalateToHuman(conv.id, leadId, userId, reason);

      const handoffMsg = intent === 'ready_to_buy'
        ? '🤝 Harika! Satış uzmanımız size en kısa sürede ulaşacak!'
        : '📅 Tabii! Uzmanımız sizi arayarak toplantı ayarlayacak.';
      if (lead.phone) await sendWhatsApp(userId, lead.phone, handoffMsg, leadId);

      await supabase.from('ai_agent_conversations').update({
        last_processed_msg: messageId || null, last_human_message: message.slice(0, 500),
        last_intent: intent, updated_at: new Date().toISOString(),
      }).eq('id', conv.id);
      return;
    }

    // Not interested
    if (intent === 'not_interested') {
      await supabase.from('ai_agent_conversations').update({
        ai_mode: 'completed', last_intent: intent,
        last_processed_msg: messageId || null, last_human_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq('id', conv.id);
      await logRun(userId, leadId, 'completed', { intent, channel });
      return;
    }

    // Generate and send AI reply
    const aiReply = await generateAIReply({
      lead, profile, research, history, intent,
      incomingMessage: message,
      conversationSummary: conv.conversation_summary || '',
      turnCount: conv.turn_count,
    });

    let sent = false;
    if (channel === 'whatsapp' && lead.phone) {
      sent = await sendWhatsApp(userId, lead.phone, aiReply, leadId);
    } else if (channel === 'email' && lead.email) {
      sent = await sendEmailMsg(userId, lead.email, 'Mesajınıza Yanıt', aiReply, leadId);
    }

    await supabase.from('ai_agent_conversations').update({
      turn_count: (conv.turn_count || 0) + 1,
      last_intent: intent,
      last_ai_message: aiReply.slice(0, 500),
      last_human_message: message.slice(0, 500),
      last_processed_msg: messageId || null,
      updated_at: new Date().toISOString(),
    }).eq('id', conv.id);

    // Update profile stats atomically
    const { data: profNow } = await supabase.from('ai_agent_profiles')
      .select('replies_received, messages_sent').eq('user_id', userId).single();
    if (profNow) {
      await supabase.from('ai_agent_profiles').update({
        replies_received: (profNow.replies_received || 0) + 1,
        messages_sent: (profNow.messages_sent || 0) + (sent ? 1 : 0),
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
    }

    if (sent) await logRun(userId, leadId, 'ai_reply_sent', { content: aiReply.slice(0, 300), intent, channel });

    // Auto proposal on price inquiry
    if (profile.auto_proposal_enabled && intent === 'price_inquiry' && !conv.proposal_sent) {
      await sendAutoProposal(conv.id, leadId, userId, lead, profile);
    }
  } catch (e: any) {
    console.error('AI Agent processIncomingMessage error:', e.message);
    await logRun(userId, leadId, 'error', { content: e.message });
  }
}

// ─── OUTREACH CRON (hourly) ──────────────────────────────────────────────────

async function runOutreachCycle() {
  try {
    const { data: profiles } = await supabase
      .from('ai_agent_profiles')
      .select('user_id, leads_processed, messages_sent')
      .eq('is_active', true);
    if (!profiles?.length) return;

    for (const prof of profiles) {
      try { await runOutreachForUser(prof.user_id, prof); } catch (e: any) {
        console.error(`Outreach error user ${prof.user_id}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('Outreach cycle error:', e.message);
  }
}

async function runOutreachForUser(userId: string, prof: any) {
  // Find already-contacted lead IDs
  const { data: existingConvs } = await supabase
    .from('ai_agent_conversations').select('lead_id').eq('user_id', userId);
  const contactedIds: string[] = (existingConvs || []).map((c: any) => c.lead_id);

  let query = supabase
    .from('leads')
    .select('id, company_name, phone, email, website, city, sector, score')
    .eq('user_id', userId)
    .not('phone', 'is', null)
    .neq('phone', '')
    .order('score', { ascending: false })
    .limit(5);

  if (contactedIds.length > 0) {
    query = query.not('id', 'in', `(${contactedIds.join(',')})`);
  }

  const { data: leads } = await query;
  if (!leads?.length) return;

  for (const lead of leads) {
    try {
      // Use cached research or run fresh
      let research: any;
      const { data: cached } = await supabase.from('ai_agent_research')
        .select('*').eq('lead_id', lead.id).single();

      research = cached || await researchLead(lead.id, userId);

      if (research.confidence_score < 30) {
        await logRun(userId, lead.id, 'skipped_low_confidence', { metadata: { score: research.confidence_score } });
        continue;
      }

      const opener = research.personalized_opener || `Merhaba ${lead.company_name}, sizinle paylaşmak istediğim önemli bir konu var.`;
      const sent = await sendWhatsApp(userId, lead.phone, opener, lead.id);

      if (sent) {
        await supabase.from('ai_agent_conversations').insert([{
          lead_id: lead.id, user_id: userId,
          channel: 'whatsapp', ai_mode: 'active',
          turn_count: 1, last_ai_message: opener,
        }]);

        const { data: profNow } = await supabase.from('ai_agent_profiles')
          .select('leads_processed, messages_sent').eq('user_id', userId).single();
        if (profNow) {
          await supabase.from('ai_agent_profiles').update({
            leads_processed: (profNow.leads_processed || 0) + 1,
            messages_sent: (profNow.messages_sent || 0) + 1,
          }).eq('user_id', userId);
        }

        await logRun(userId, lead.id, 'outreach_sent', {
          content: opener, channel: 'whatsapp',
          metadata: { confidence_score: research.confidence_score },
        });
      }

      // Small delay between sends to avoid spam triggers
      await new Promise(r => setTimeout(r, 2500));
    } catch (e: any) {
      console.error(`Outreach lead ${lead.id}:`, e.message);
    }
  }
}

// ─── RESPONSE PROCESSING CRON (every 5 min) ──────────────────────────────────

async function runResponseProcessingCycle() {
  try {
    const { data: activeConvs } = await supabase
      .from('ai_agent_conversations')
      .select('id, lead_id, user_id, channel, last_processed_msg')
      .eq('ai_mode', 'active')
      .limit(50);
    if (!activeConvs?.length) return;

    for (const conv of activeConvs) {
      try {
        const { data: msgs } = await supabase.from('messages')
          .select('id, content, sent_at, channel')
          .eq('lead_id', conv.lead_id)
          .eq('user_id', conv.user_id)
          .eq('direction', 'in')
          .order('sent_at', { ascending: false })
          .limit(1);

        const latest = msgs?.[0];
        if (!latest) continue;
        if (latest.id === conv.last_processed_msg) continue;

        // Check message is not too old (< 24 hours)
        const msgAge = Date.now() - new Date(latest.sent_at).getTime();
        if (msgAge > 24 * 60 * 60 * 1000) continue;

        await processIncomingMessage(conv.lead_id, conv.user_id, latest.content, latest.channel || conv.channel, latest.id);
        await new Promise(r => setTimeout(r, 300));
      } catch (e: any) {
        console.error(`Response processing conv ${conv.id}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('Response processing cycle error:', e.message);
  }
}

// ─── START CRONS ─────────────────────────────────────────────────────────────

function startAgentCrons() {
  // Hourly outreach for active agent profiles
  cron.schedule('5 * * * *', () => {
    console.log('[AI Agent] Outreach cycle starting...');
    runOutreachCycle();
  });

  // Every 5 minutes: process incoming replies
  cron.schedule('*/5 * * * *', () => {
    runResponseProcessingCycle();
  });

  console.log('[AI Agent] Crons started: outreach (hourly @:05), responses (every 5min)');
}

startAgentCrons();

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// POST /setup
router.post('/setup', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const {
      product_description, target_customer, pain_solved,
      price_range_min, price_range_max, price_currency,
      value_props, proposal_template, escalation_triggers,
      auto_reply_enabled, auto_proposal_enabled, voice_call_enabled, video_msg_enabled,
    } = req.body;

    if (!product_description || !target_customer || !pain_solved) {
      return res.status(400).json({ error: 'product_description, target_customer ve pain_solved zorunlu' });
    }

    const { data, error } = await supabase.from('ai_agent_profiles').upsert([{
      user_id: userId,
      product_description,
      target_customer,
      pain_solved,
      price_range_min: price_range_min ?? 0,
      price_range_max: price_range_max ?? 0,
      price_currency: price_currency || '₺',
      value_props: value_props || [],
      proposal_template: proposal_template || null,
      escalation_triggers: escalation_triggers || ['görüşelim', 'fiyat ver', 'tamam', 'alalım', 'anlaşalım', 'ne zaman', 'toplantı'],
      auto_reply_enabled: auto_reply_enabled !== false,
      auto_proposal_enabled: !!auto_proposal_enabled,
      voice_call_enabled: !!voice_call_enabled,
      video_msg_enabled: !!video_msg_enabled,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' }).select().single();

    if (error) throw error;
    res.json({ ok: true, profile: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /profile
router.get('/profile', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ai_agent_profiles').select('*').eq('user_id', req.userId).single();
    res.json({ profile: data || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /profile
router.patch('/profile', async (req: any, res: any) => {
  try {
    const allowed = [
      'product_description', 'target_customer', 'pain_solved',
      'price_range_min', 'price_range_max', 'price_currency',
      'value_props', 'proposal_template', 'escalation_triggers',
      'auto_reply_enabled', 'auto_proposal_enabled', 'voice_call_enabled', 'video_msg_enabled',
    ];
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }

    const { data, error } = await supabase.from('ai_agent_profiles')
      .update(updates).eq('user_id', req.userId).select().single();
    if (error) throw error;
    res.json({ ok: true, profile: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /toggle
router.post('/toggle', async (req: any, res: any) => {
  try {
    const { active } = req.body;
    const { data, error } = await supabase.from('ai_agent_profiles')
      .update({ is_active: !!active, updated_at: new Date().toISOString() })
      .eq('user_id', req.userId).select().single();
    if (error) throw error;
    await logRun(req.userId, null, active ? 'agent_activated' : 'agent_deactivated');
    res.json({ ok: true, is_active: data.is_active });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /status
router.get('/status', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const [profRes, convsRes, runsRes] = await Promise.all([
      supabase.from('ai_agent_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('ai_agent_conversations').select('ai_mode').eq('user_id', userId),
      supabase.from('ai_agent_runs').select('event_type, created_at, lead_id, content')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);

    const convs = convsRes.data || [];
    res.json({
      profile: profRes.data || null,
      convStats: {
        total: convs.length,
        active: convs.filter((c: any) => c.ai_mode === 'active').length,
        human_takeover: convs.filter((c: any) => c.ai_mode === 'human_takeover').length,
        completed: convs.filter((c: any) => c.ai_mode === 'completed').length,
      },
      recentActivity: runsRes.data || [],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /conversations
router.get('/conversations', async (req: any, res: any) => {
  try {
    const mode = req.query.mode as string | undefined;
    let q = supabase.from('ai_agent_conversations')
      .select('*, leads(company_name, phone, email, city, score, status), ai_agent_research(confidence_score, summary, personalized_opener)')
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (mode) q = q.eq('ai_mode', mode);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ conversations: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /conversations/:id
router.get('/conversations/:id', async (req: any, res: any) => {
  try {
    const { data: conv } = await supabase.from('ai_agent_conversations')
      .select('*, leads(company_name, phone, email, city, sector, score, status, website), ai_agent_research(*)')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!conv) return res.status(404).json({ error: 'Bulunamadı' });

    const { data: messages } = await supabase.from('messages')
      .select('direction, content, sent_at, channel, agent_name')
      .eq('lead_id', (conv as any).lead_id).eq('user_id', req.userId)
      .order('sent_at', { ascending: true }).limit(60);

    res.json({ conversation: conv, messages: messages || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /runs
router.get('/runs', async (req: any, res: any) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const { data } = await supabase.from('ai_agent_runs')
      .select('*, leads(company_name)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    res.json({ runs: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /takeover/:leadId
router.post('/takeover/:leadId', async (req: any, res: any) => {
  try {
    const { data: conv } = await supabase.from('ai_agent_conversations')
      .select('id').eq('lead_id', req.params.leadId).eq('user_id', req.userId).single();
    if (!conv) return res.status(404).json({ error: 'Konuşma bulunamadı' });
    await escalateToHuman(conv.id, req.params.leadId, req.userId, req.body.reason || 'Manuel devralma');
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /resume/:leadId
router.post('/resume/:leadId', async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('ai_agent_conversations').update({
      ai_mode: 'active', escalated: false, escalation_reason: null,
      updated_at: new Date().toISOString(),
    }).eq('lead_id', req.params.leadId).eq('user_id', req.userId);
    if (error) throw error;
    await logRun(req.userId, req.params.leadId, 'ai_resumed');
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /research/:leadId — manual trigger
router.post('/research/:leadId', async (req: any, res: any) => {
  try {
    const research = await researchLead(req.params.leadId, req.userId);
    res.json({ ok: true, research });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /research/:leadId
router.get('/research/:leadId', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ai_agent_research')
      .select('*').eq('lead_id', req.params.leadId).eq('user_id', req.userId).single();
    res.json({ research: data || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, processIncomingMessage };
