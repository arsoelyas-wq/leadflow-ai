export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── ANTI-BAN YARDIMCI FONKSİYONLAR ──────────────────────

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

function isSafeHour(): boolean {
  // Turkey is UTC+3 year-round (no DST since 2016)
  const utcHour = new Date().getUTCHours();
  const turkeyHour = (utcHour + 3) % 24;
  return turkeyHour >= 9 && turkeyHour < 20;
}

async function getDailyCount(userId: string, channel: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel', channel)
    .eq('direction', 'out')
    .neq('status', 'failed') // Failed mesajlar limiti tüketmemeli
    .gte('sent_at', today.toISOString())
    .eq('user_id', userId);
  return count || 0;
}

function personalizeMessage(template: string, lead: any): string {
  const firma  = lead.company_name || lead.contact_name || 'Sayın Yetkili';
  const isim   = lead.contact_name || lead.company_name || 'Yetkili';
  const sehir  = lead.city    || '';
  const sektor = lead.sector  || '';
  const tel    = lead.phone   || '';
  return template
    // {{firma}} style (from AI generator)
    .replace(/\{\{firma\}\}/gi,  firma)
    .replace(/\{\{isim\}\}/gi,   isim)
    .replace(/\{\{sehir\}\}/gi,  sehir)
    .replace(/\{\{sektor\}\}/gi, sektor)
    .replace(/\{\{telefon\}\}/gi, tel)
    // [FIRMA_ADI] legacy style
    .replace(/\[FIRMA_ADI\]/g, firma)
    .replace(/\[SEHIR\]/g,     sehir)
    .replace(/\[SEKTOR\]/g,    sektor)
    .replace(/\[AD\]/g,        isim)
    .replace(/\[TELEFON\]/g,   tel);
}

// ── ROUTES ────────────────────────────────────────────────

router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const campaigns = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      totalSent: c.total_sent || 0,
      totalReplied: c.total_replied || 0,
      createdAt: c.created_at,
      messageTemplate: c.message_template,
      leadIds: c.lead_ids || [],
      sequence: c.sequence || [],
    }));

    res.json({ campaigns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, channel, messageTemplate, leadIds, sequence } = req.body;

    if (!name || !channel || !messageTemplate) {
      return res.status(400).json({ error: 'name, channel ve messageTemplate zorunlu' });
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        user_id: userId,
        name,
        channel,
        message_template: messageTemplate,
        lead_ids: leadIds || [],
        sequence: sequence || [],
        status: 'draft',
        total_sent: 0,
        total_replied: 0,
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ campaign: data, message: 'Kampanya oluşturuldu!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── LITERAL ROUTES (must be before /:id) ─────────────────────────────────────

router.get('/templates', async (_req: any, res: any) => {
  const templates = [
    { id: 'intro_general', category: 'Tanitim', channel: 'whatsapp', title: 'Genel Tanitim', message: 'Merhaba {{firma}}, {{sektor}} alaninda size ozel cozumlerimiz var. Kisa bir gorusme icin musait misiniz?', successRate: 24 },
    { id: 'intro_discount', category: 'Tanitim', channel: 'whatsapp', title: 'Indirim Teklifi', message: 'Merhaba {{firma}}! Bu hafta {{sektor}} sektorune ozel %20 indirim kampanyamiz var. Detaylar icin yazabilirsiniz.', successRate: 31 },
    { id: 'followup_1', category: 'Takip', channel: 'whatsapp', title: '1. Takip', message: '{{isim}}, onceki mesajimi gordunuz mu? Firmaniz icin hazirldigimiz teklifi paylasabilir miyim?', successRate: 18 },
    { id: 'followup_2', category: 'Takip', channel: 'whatsapp', title: '2. Takip (Nazik)', message: 'Son kez rahatsiz ediyorum {{isim}}. {{sektor}} sektorunde basarili calismalarimiz var, 2 dakikanizi alabilir miyim?', successRate: 12 },
    { id: 'reactivate', category: 'Yeniden Aktivasyon', channel: 'whatsapp', title: 'Eski Musteri', message: '{{firma}}, sizinle gecen calismamizdan bu yana yeni hizmetler ekledik. Tekrar gorusmek ister misiniz?', successRate: 22 },
    { id: 'referral_ask', category: 'Tavsiye', channel: 'whatsapp', title: 'Tavsiye Isteme', message: '{{isim}}, hizmetimizden memnun kaldiysaniz cevrenizdeki isletmelere bizi tavsiye edebilir misiniz? Tesekkurler!', successRate: 15 },
    { id: 'email_intro', category: 'Tanitim', channel: 'email', title: 'Email Tanitim', message: 'Sayin {{isim}},\n\n{{sektor}} sektorunde faaliyet gosteren {{firma}} icin hazirldigimiz cozumleri paylasmak istiyoruz.\n\nDetaylar icin gorusme talep edebilirsiniz.\n\nSaygilarimizla', successRate: 19 },
    { id: 'email_proposal', category: 'Teklif', channel: 'email', title: 'Email Teklif', message: 'Sayin {{isim}},\n\nFirmaniz {{firma}} icin ozel hazirldigimiz teklifi ilginize sunuyoruz.\n\nGorusmek icin uygun bir zaman belirleyebilir miyiz?\n\nSaygilarimizla', successRate: 26 },
    { id: 'seasonal_summer', category: 'Sezonluk', channel: 'whatsapp', title: 'Yaz Kampanyasi', message: '{{firma}}, yaz sezonuna ozel {{sektor}} kampanyamiz basladi! Erken kayit avantaji icin hemen iletisime gecin.', successRate: 28 },
    { id: 'competitor_switch', category: 'Rakip Donus', channel: 'whatsapp', title: 'Rakipten Donus', message: '{{isim}}, mevcut hizmet saglayicinizdan memnun musunuz? Sizin icin daha uygun fiyat ve kalite sunabiliriz. Karsilastiralim mi?', successRate: 33 },
  ];
  res.json({ templates });
});

router.post('/ai-optimize', async (req: any, res: any) => {
  try {
    const { message, channel, sector } = req.body;
    if (!message) return res.status(400).json({ error: 'message zorunlu' });
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 600,
      messages: [{ role: 'user', content: `Bu satis mesajini optimize et. ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} formati.
${sector ? `Sektor: ${sector}` : ''}
Mevcut mesaj: "${message}"

2 alternatif versiyon uret. Her biri icin tahmini cevap oranini belirt.
SADECE JSON dondur:
{"versions":[{"message":"optimize edilmis mesaj 1","estimatedReplyRate":25,"reason":"neden daha iyi"},{"message":"optimize edilmis mesaj 2","estimatedReplyRate":20,"reason":"neden daha iyi"}],"tips":["ipucu 1","ipucu 2"]}` }]
    });
    const text = (resp.content[0] as any)?.text || '{}';
    const match = text.match(/\{[\s\S]*\}/);
    res.json(match ? JSON.parse(match[0]) : { versions: [], tips: [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/generate-message', async (req: any, res: any) => {
  try {
    const { goal, channel, leads = [] } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal zorunlu' });
    const isWA = channel === 'whatsapp';
    const exampleLead = leads[0] || {};
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 400,
      messages: [{ role: 'user', content: `Türkiye'de B2B satış yapan bir firma adına ${isWA ? 'WhatsApp' : 'email'} mesajı yaz.

Amaç: ${goal}
${exampleLead.sector ? `Örnek müşteri sektörü: ${exampleLead.sector}` : ''}
${exampleLead.city ? `Örnek şehir: ${exampleLead.city}` : ''}

Değişkenler (HEP bu formatta kullan):
- {{firma}} → şirket/işletme adı
- {{sektor}} → sektör
- {{sehir}} → şehir

KURALLAR:
- Mesaja "Merhaba!" veya "İyi günler!" gibi doğal bir selamlama ile başla — {{firma}} ile başlama
- {{firma}} değişkenini mesajın ORTASINDA doğal bir cümle içinde kullan (ör: "{{firma}} için özel bir teklifimiz var" veya "{{firma}} gibi işletmelere...")
- {{isim}} KULLANMA — kişi adı ve cinsiyeti bilinmiyor
- "hanım/bey", "sayın" gibi resmi selamlar KULLANMA

${isWA
  ? 'WhatsApp: kısa (2-3 cümle), samimi, 1-2 emoji, direkt konuya gir'
  : 'Email: profesyonel, 4-5 cümle, paragraflar halinde'}
- Türkçe, ikna edici, doğal bir dil kullan
- SADECE mesaj metnini döndür` }]
    });
    const message = ((resp.content[0] as any)?.text || '').trim();
    res.json({ message });
  } catch (e: any) {
    // Fallback template if Claude API unavailable
    const isWA = req.body.channel === 'whatsapp';
    const goal = req.body.goal || '';
    const fallback = isWA
      ? `Merhaba! 👋\n\n{{firma}} gibi {{sektor}} işletmeleri için ${goal} sunuyoruz. Kısa bir görüşme için uygun olduğunuzda yazabilirsiniz 🙏`
      : `İyi günler,\n\n{{firma}} için ${goal} konusunda özel hazırladığımız çözümü paylaşmak istedik.\n\nGörüşme için uygun bir zaman belirleyebilir miyiz?\n\nSaygılarımızla`;
    res.json({ message: fallback });
  }
});

router.get('/segments', async (req: any, res: any) => {
  try {
    const { min_score, max_score, city, sector, source, status, has_phone, has_email, limit: lmt = 200 } = req.query;
    let query = supabase.from('leads').select('id, company_name, phone, email, city, sector, source, score, status, contact_name', { count: 'exact' }).eq('user_id', req.userId);
    if (min_score) query = query.gte('score', Number(min_score));
    if (max_score) query = query.lte('score', Number(max_score));
    if (city) query = query.ilike('city', `%${city}%`);
    if (sector) query = query.ilike('sector', `%${sector}%`);
    if (source) query = query.ilike('source', `%${source}%`);
    if (status) query = query.eq('status', status);
    if (has_phone === 'true') query = query.not('phone', 'is', null);
    if (has_email === 'true') query = query.not('email', 'is', null);
    const { data, count, error } = await query.order('score', { ascending: false }).limit(Number(lmt));
    if (error) throw error;
    res.json({ leads: data || [], total: count || 0, filters: { cities: [...new Set((data || []).map((l: any) => l.city).filter(Boolean))], sectors: [...new Set((data || []).map((l: any) => l.sector).filter(Boolean))], sources: [...new Set((data || []).map((l: any) => l.source).filter(Boolean))] } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/analytics', async (req: any, res: any) => {
  try {
    const { data: camps } = await supabase.from('campaigns').select('id, name, channel, status, total_sent, total_replied, created_at').eq('user_id', req.userId).order('created_at', { ascending: false });
    const { data: msgs } = await supabase.from('messages').select('channel, direction, sent_at').eq('user_id', req.userId).order('sent_at', { ascending: false });
    const out = (msgs || []).filter((m: any) => m.direction === 'out');
    const inc = (msgs || []).filter((m: any) => m.direction === 'in');
    const hourlyDist: Record<number, number> = {}; const hourlyReply: Record<number, number> = {};
    out.forEach((m: any) => { const h = new Date(m.sent_at).getHours(); hourlyDist[h] = (hourlyDist[h] || 0) + 1; });
    inc.forEach((m: any) => { const h = new Date(m.sent_at).getHours(); hourlyReply[h] = (hourlyReply[h] || 0) + 1; });
    let bestHour = 9, bestRate = 0;
    for (let h = 8; h <= 20; h++) { const s = hourlyDist[h] || 0; const r = hourlyReply[h] || 0; if (s > 0) { const rate = Math.round((r / s) * 100); if (rate > bestRate) { bestRate = rate; bestHour = h; } } }
    const byChannel: Record<string, { sent: number; replied: number }> = {};
    out.forEach((m: any) => { if (!byChannel[m.channel]) byChannel[m.channel] = { sent: 0, replied: 0 }; byChannel[m.channel].sent++; });
    inc.forEach((m: any) => { if (byChannel[m.channel]) byChannel[m.channel].replied++; });
    res.json({ totalCampaigns: camps?.length || 0, totalSent: out.length, totalReplied: inc.length, replyRate: out.length > 0 ? Math.round((inc.length / out.length) * 100) : 0, bestHour: `${String(bestHour).padStart(2, '0')}:00`, byChannel: Object.entries(byChannel).map(([ch, v]) => ({ channel: ch, ...v, replyRate: v.sent > 0 ? Math.round((v.replied / v.sent) * 100) : 0 })), campaigns: (camps || []).map((c: any) => ({ ...c, replyRate: c.total_sent > 0 ? Math.round(((c.total_replied || 0) / c.total_sent) * 100) : 0 })) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/smart-timing', async (req: any, res: any) => {
  try {
    const { data: msgs } = await supabase.from('messages').select('direction, sent_at').eq('user_id', req.userId);
    const out = (msgs || []).filter((m: any) => m.direction === 'out');
    const inc = (msgs || []).filter((m: any) => m.direction === 'in');
    const hs: Record<number, { sent: number; replied: number }> = {};
    for (let h = 7; h <= 21; h++) hs[h] = { sent: 0, replied: 0 };
    out.forEach((m: any) => { const h = new Date(m.sent_at).getHours(); if (hs[h]) hs[h].sent++; });
    inc.forEach((m: any) => { const h = new Date(m.sent_at).getHours(); if (hs[h]) hs[h].replied++; });
    const recs = Object.entries(hs).map(([h, v]) => ({ hour: Number(h), ...v, replyRate: v.sent > 0 ? Math.round((v.replied / v.sent) * 100) : 0 })).sort((a, b) => b.replyRate - a.replyRate);
    res.json({ recommendations: recs, bestHour: `${String(recs[0]?.hour || 10).padStart(2, '0')}:00`, worstHour: `${String(recs[recs.length - 1]?.hour || 20).padStart(2, '0')}:00` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PARAMETRIC ROUTES ────────────────────────────────────────────────────────

router.get('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    res.json({
      campaign: {
        id: data.id,
        name: data.name,
        channel: data.channel,
        status: data.status,
        totalSent: data.total_sent || 0,
        totalReplied: data.total_replied || 0,
        createdAt: data.created_at,
        messageTemplate: data.message_template,
        leadIds: data.lead_ids || [],
        sequence: data.sequence || [],
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Kampanyayı başlat — Bull Queue ile
router.post('/:id/start', async (req: any, res: any) => {
  try {
    const userId = req.userId;

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: userData } = await supabase
      .from('users')
      .select('credits_total, credits_used')
      .eq('id', userId)
      .single();

    const availableCredits = (userData?.credits_total || 0) - (userData?.credits_used || 0);

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .in('id', campaign.lead_ids || []);

    if (!leads || leads.length === 0) {
      return res.status(400).json({ error: 'Kampanyada lead bulunamadı' });
    }

    if (availableCredits < leads.length) {
      return res.status(400).json({
        error: `Yetersiz kredi. Gerekli: ${leads.length}, Mevcut: ${availableCredits}`
      });
    }

    if (campaign.channel === 'email' && !userSettings?.email_user) {
      return res.status(400).json({ error: 'Email ayarları yapılmamış.' });
    }

    if (campaign.channel === 'whatsapp') {
      // wa_numbers bağlı mı?
      const { count: waNumConnected } = await supabase
        .from('wa_numbers').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'connected');

      // wa_instances (embedded gateway) bağlı mı?
      const { count: waInstConnected } = await supabase
        .from('wa_instances').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'connected');

      // Eski Baileys socket bağlı mı? (process içi kontrol)
      let baileysConnected = false;
      try {
        const { waState } = require('./settings');
        baileysConnected = !!(waState[userId]?.status === 'connected');
      } catch {}

      if (!waNumConnected && !waInstConnected && !baileysConnected) {
        return res.status(400).json({
          error: 'WhatsApp bağlı değil. Ayarlar > WhatsApp Hatlarım sayfasından QR kodu tarayarak yeniden bağlanın.',
          code: 'WA_DISCONNECTED',
        });
      }
    }

    if (campaign.channel === 'whatsapp' && !isSafeHour()) {
      return res.status(400).json({
        error: 'WhatsApp mesajları sadece 09:00-20:00 arası gönderilebilir.'
      });
    }

    if (campaign.channel === 'whatsapp') {
      const dailyCount = await getDailyCount(userId, 'whatsapp');
      // Kullanıcı planından günlük limiti al, yoksa varsayılan 150 (HARDCODED LİMİT KALDIRILDI)
      const { data: voiceSettings } = await supabase
        .from('voice_settings').select('daily_wa_limit').eq('user_id', userId).maybeSingle();
      const dailyLimit = voiceSettings?.daily_wa_limit ?? 150;

      if (dailyCount >= dailyLimit) {
        return res.status(400).json({ error: `Günlük WhatsApp limiti doldu (${dailyLimit}/gün). Limit Ayarlar'dan artırılabilir.` });
      }
      const remaining = dailyLimit - dailyCount;
      if (leads.length > remaining) {
        return res.status(400).json({
          error: `Bugün sadece ${remaining} mesaj daha gönderebilirsiniz (${dailyLimit}/gün limiti).`
        });
      }
    }

    // Bull Queue varsa queue ile, yoksa direkt gönder
    try {
      const { startCampaign } = require('../queue');
      await startCampaign(req.params.id, userId);
      res.json({
        message: 'Kampanya kuyruğa alındı! Mesajlar sırayla gönderilecek.',
        total: leads.length,
        estimatedTime: `~${Math.ceil(leads.length * 1.5)} dakika`,
        mode: 'queue',
      });
    } catch (queueErr: any) {
      // Queue yoksa eski yönteme düş (fallback)
      console.log('Queue unavailable, falling back to direct send:', queueErr.message);
      await supabase.from('campaigns').update({ status: 'active' }).eq('id', req.params.id);
      sendCampaignMessages(campaign, leads, userSettings, userId).catch(console.error);
      res.json({
        message: 'Kampanya başlatıldı! Mesajlar gönderiliyor...',
        total: leads.length,
        estimatedTime: `~${Math.ceil(leads.length * 1.5)} dakika`,
        mode: 'direct',
      });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Queue istatistikleri
router.get('/queue/stats', async (req: any, res: any) => {
  try {
    const { getQueueStats } = require('../queue');
    const stats = await getQueueStats();
    res.json(stats);
  } catch (e: any) {
    res.json({ error: 'Queue bağlantısı yok', stats: null });
  }
});

// Kampanyayı duraklat
router.post('/:id/pause', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('campaigns')
      .update({ status: 'paused' })
      .eq('id', req.params.id)
      .eq('user_id', userId);

    // Queue'dan da duraklat
    try {
      const { pauseCampaign } = require('../queue');
      await pauseCampaign(req.params.id);
    } catch {}

    res.json({ message: 'Kampanya duraklatıldı' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);
    res.json({ message: 'Kampanya silindi' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback: Direkt gönderim (queue yoksa)
async function sendCampaignMessages(campaign: any, leads: any[], userSettings: any, userId: string) {
  let sent = 0;
  let failed = 0;
  const nodemailer = require('nodemailer');

  const { data: userData } = await supabase
    .from('users').select('credits_used').eq('id', userId).single();
  let currentCreditsUsed = userData?.credits_used || 0;

  let transporter: any = null;
  if (campaign.channel === 'email' && userSettings?.email_user) {
    transporter = nodemailer.createTransport({
      host: userSettings.email_host || 'smtp.gmail.com',
      port: Number(userSettings.email_port) || 587,
      secure: false,
      auth: { user: userSettings.email_user, pass: userSettings.email_pass },
    });
  }

  for (const lead of leads) {
    try {
      if (campaign.channel === 'whatsapp' && !isSafeHour()) {
        console.log(`Campaign ${campaign.id}: Güvenli saat dışı, gönderim durduruldu.`);
        break;
      }

      const personalizedMsg = personalizeMessage(campaign.message_template || '', lead);
      let success = false;

      if (campaign.channel === 'whatsapp' && lead.phone) {
        const { sendWhatsAppMessage } = require('./settings');
        await sendWhatsAppMessage(userId, lead.phone, personalizedMsg);
        success = true;
      } else if (campaign.channel === 'email' && lead.email && transporter) {
        await transporter.sendMail({
          from: userSettings.email_from || userSettings.email_user,
          to: lead.email,
          subject: campaign.name,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${personalizedMsg.replace(/\n/g, '<br>')}
            <hr style="margin-top:30px; border:none; border-top:1px solid #eee;">
            <p style="font-size:11px; color:#999;">Bu mesajı almak istemiyorsanız STOP yazarak yanıtlayın.</p>
          </div>`,
        });
        success = true;
      }

      if (success) {
        sent++;
        currentCreditsUsed++;
        await supabase.from('messages').insert([{
          lead_id: lead.id,
          user_id: userId,
          channel: campaign.channel,
          direction: 'out',
          content: personalizedMsg,
          status: 'sent',
          sent_at: new Date().toISOString(),
          read: true,
        }]);
        if (sent % 5 === 0) {
          await supabase.from('users').update({ credits_used: currentCreditsUsed }).eq('id', userId);
        }
      } else {
        failed++;
      }

      if (campaign.channel === 'whatsapp') {
        await randomDelay(8000, 25000);
      } else {
        await randomDelay(2000, 5000);
      }

    } catch (e: any) {
      console.error('Send error:', e.message);
      failed++;
      // Başarısız mesajı DB'ye kaydet — kullanıcı inbox'tan görebilsin
      await supabase.from('messages').insert([{
        lead_id: lead.id,
        user_id: userId,
        channel: campaign.channel,
        direction: 'out',
        content: personalizeMessage(campaign.message_template || '', lead),
        status: 'failed',
        sent_at: new Date().toISOString(),
        read: true,
        metadata: { error: e.message },
      }]).catch(() => {});
      await randomDelay(5000, 10000); // Başarısızlıkta daha kısa bekleme
    }
  }

  await supabase.from('users').update({ credits_used: currentCreditsUsed }).eq('id', userId);
  await supabase.from('campaigns').update({
    total_sent: (campaign.total_sent || 0) + sent,
    status: failed === leads.length ? 'paused' : 'completed',
  }).eq('id', campaign.id);

  console.log(`Campaign ${campaign.id} done: ${sent} sent, ${failed} failed`);
}

// GET /api/campaigns/:id/leads-status — Lead bazlı durum + mesajlar
router.get('/:id/leads-status', async (req: any, res: any) => {
  try {
    const { data: campaign } = await supabase.from('campaigns').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    const leadIds: string[] = campaign.lead_ids || [];

    // Lead bilgileri
    const { data: leads } = leadIds.length
      ? await supabase.from('leads')
          .select('id, company_name, contact_name, phone, city, sector')
          .in('id', leadIds)
      : { data: [] };

    // Kampanyaya ait mesajlar (campaign_id veya lead_ids + created_at fallback)
    const { data: msgsByCampaign } = await supabase.from('messages')
      .select('id, lead_id, direction, content, status, sent_at, channel')
      .eq('user_id', req.userId)
      .eq('campaign_id', req.params.id)
      .order('sent_at', { ascending: false });

    // campaign_id boşsa lead_ids + created_at ile fallback
    const { data: msgsByLeads } = (!msgsByCampaign?.length && leadIds.length)
      ? await supabase.from('messages')
          .select('id, lead_id, direction, content, status, sent_at, channel')
          .eq('user_id', req.userId)
          .in('lead_id', leadIds)
          .gte('sent_at', campaign.created_at)
          .order('sent_at', { ascending: false })
          .limit(200)
      : { data: [] };

    const messages = msgsByCampaign?.length ? msgsByCampaign : (msgsByLeads || []);

    // Lead başına durum hesapla
    const leadStatus = (leads || []).map((lead: any) => {
      const lMsgs = messages.filter((m: any) => m.lead_id === lead.id);
      const outMsgs = lMsgs.filter((m: any) => m.direction === 'out');
      const inMsgs  = lMsgs.filter((m: any) => m.direction === 'in');
      const failMsgs = lMsgs.filter((m: any) => m.status === 'failed');
      const status = failMsgs.length > 0 ? 'failed'
                   : inMsgs.length  > 0 ? 'replied'
                   : outMsgs.length > 0 ? 'sent'
                   : 'pending';
      return {
        id: lead.id,
        company_name: lead.company_name || lead.contact_name || 'İsimsiz',
        phone: lead.phone,
        city: lead.city,
        sector: lead.sector,
        sent: outMsgs.length,
        replied: inMsgs.length,
        failed: failMsgs.length,
        status,
        lastMessage: lMsgs[0] || null,
      };
    });

    res.json({ leadStatus, messages: messages.slice(0, 30) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/campaigns/:id/funnel — Kampanya funnel analizi
router.get('/:id/funnel', async (req: any, res: any) => {
  try {
    const { data: campaign } = await supabase.from('campaigns').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    const { data: messages } = await supabase.from('messages')
      .select('lead_id, direction, sent_at, status')
      .eq('campaign_id', req.params.id)
      .order('sent_at');

    const { data: events } = await supabase.from('message_events')
      .select('lead_id, event_type, occurred_at')
      .in('lead_id', campaign.lead_ids || [])
      .gte('occurred_at', campaign.created_at);

    const funnel = { sent: 0, delivered: 0, opened: 0, replied: 0 };
    const sentLeads = new Set<string>();
    const openedLeads = new Set<string>();
    const repliedLeads = new Set<string>();

    for (const m of (messages || [])) {
      if (m.direction === 'out') {
        sentLeads.add(m.lead_id); funnel.sent++;
        if (m.status === 'delivered' || m.status === 'read') funnel.delivered++;
      } else { repliedLeads.add(m.lead_id); funnel.replied++; }
    }
    for (const e of (events || [])) {
      if (e.event_type === 'email_opened') openedLeads.add(e.lead_id);
    }
    funnel.opened = openedLeads.size;

    const byHour: Record<number, number> = {};
    for (const m of (messages || [])) {
      if (m.direction === 'out') {
        const h = new Date(m.sent_at).getHours();
        byHour[h] = (byHour[h] || 0) + 1;
      }
    }
    const bestHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0]?.[0];

    res.json({
      funnel,
      replyRate: funnel.sent ? +(funnel.replied / funnel.sent * 100).toFixed(1) : 0,
      openRate:  funnel.sent ? +(funnel.opened  / funnel.sent * 100).toFixed(1) : 0,
      bestHour: bestHour ? `${bestHour}:00` : null,
      uniqueSent: sentLeads.size,
      uniqueReplied: repliedLeads.size,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;