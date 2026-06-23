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
  const hour = new Date().getHours();
  return hour >= 9 && hour < 20;
}

async function getDailyCount(userId: string, channel: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('channel', channel)
    .eq('direction', 'out')
    .gte('sent_at', today.toISOString())
    .eq('user_id', userId);
  return count || 0;
}

function personalizeMessage(template: string, lead: any): string {
  return template
    .replace(/\[FIRMA_ADI\]/g, lead.company_name || lead.contact_name || 'Sayın Yetkili')
    .replace(/\[SEHIR\]/g, lead.city || '')
    .replace(/\[SEKTOR\]/g, lead.sector || '')
    .replace(/\[AD\]/g, lead.contact_name || '')
    .replace(/\[TELEFON\]/g, lead.phone || '');
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

    if (campaign.channel === 'whatsapp' && userSettings?.whatsapp_status !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp bağlı değil.' });
    }

    if (campaign.channel === 'whatsapp' && !isSafeHour()) {
      return res.status(400).json({
        error: 'WhatsApp mesajları sadece 09:00-20:00 arası gönderilebilir.'
      });
    }

    if (campaign.channel === 'whatsapp') {
      const dailyCount = await getDailyCount(userId, 'whatsapp');
      if (dailyCount >= 150) {
        return res.status(400).json({ error: `Günlük WhatsApp limiti doldu (150/gün).` });
      }
      const remaining = 150 - dailyCount;
      if (leads.length > remaining) {
        return res.status(400).json({
          error: `Bugün sadece ${remaining} mesaj daha gönderebilirsiniz.`
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
      await randomDelay(15000, 30000);
    }
  }

  await supabase.from('users').update({ credits_used: currentCreditsUsed }).eq('id', userId);
  await supabase.from('campaigns').update({
    total_sent: (campaign.total_sent || 0) + sent,
    status: failed === leads.length ? 'paused' : 'completed',
  }).eq('id', campaign.id);

  console.log(`Campaign ${campaign.id} done: ${sent} sent, ${failed} failed`);
}

// ── MESAJ SABLON KUTUPHANESI ──────────────────────────────────────────────────
router.get('/templates', async (_req: any, res: any) => {
  const templates = [
    { id: 'intro_general', category: 'Tanitim', channel: 'whatsapp', title: 'Genel Tanitim', message: 'Merhaba {{firma}}, {{sektor}} alaninda size ozel cozumlerimiz var. Kisa bir gorusme icin musait misiniz?', successRate: 24 },
    { id: 'intro_discount', category: 'Tanitim', channel: 'whatsapp', title: 'Indirim Teklifi', message: 'Merhaba {{firma}}! Bu hafta {{sektor}} sektorune ozel %20 indirim kampanyamiz var. Detaylar icin yazabilirsiniz.', successRate: 31 },
    { id: 'followup_1', category: 'Takip', channel: 'whatsapp', title: '1. Takip', message: '{{isim}}, onceki mesajimi gordunuz mu? Firmaniz icin hazirldigimiz teklifi paylasabilir miyim?', successRate: 18 },
    { id: 'followup_2', category: 'Takip', channel: 'whatsapp', title: '2. Takip (Nazik)', message: 'Son kez rahatsiz ediyorum {{isim}}. {{sektor}} sektorunde basarili calismalrimiz var, 2 dakikanizi alabilir miyim?', successRate: 12 },
    { id: 'reactivate', category: 'Yeniden Aktivasyon', channel: 'whatsapp', title: 'Eski Musteri', message: '{{firma}}, sizinle gecen calismamizdan bu yana yeni hizmetler ekledik. Tekrar gorusmek ister misiniz?', successRate: 22 },
    { id: 'referral_ask', category: 'Tavsiye', channel: 'whatsapp', title: 'Tavsiye Isteme', message: '{{isim}}, hizmetimizden memnun kaldiysaniz cevrenizdeki isletmelere bizi tavsiye edebilir misiniz? Tesekkurler!', successRate: 15 },
    { id: 'email_intro', category: 'Tanitim', channel: 'email', title: 'Email Tanitim', message: 'Sayin {{isim}},\n\n{{sektor}} sektorunde faaliyet gosteren {{firma}} icin hazirldigimiz cozumleri paylasmak istiyoruz.\n\nDetaylar icin gorusme talep edebilirsiniz.\n\nSaygilarimizla', successRate: 19 },
    { id: 'email_proposal', category: 'Teklif', channel: 'email', title: 'Email Teklif', message: 'Sayin {{isim}},\n\nFirmaniz {{firma}} icin ozel hazirldigimiz teklifi ilginize sunuyoruz.\n\nGorusmek icin uygun bir zaman belirleyebilir miyiz?\n\nSaygilarimizla', successRate: 26 },
    { id: 'seasonal_summer', category: 'Sezonluk', channel: 'whatsapp', title: 'Yaz Kampanyasi', message: '{{firma}}, yaz sezonuna ozel {{sektor}} kampanyamiz basladi! Erken kayit avantaji icin hemen iletisime gecin.', successRate: 28 },
    { id: 'competitor_switch', category: 'Rakip Donus', channel: 'whatsapp', title: 'Rakipten Donus', message: '{{isim}}, mevcut hizmet saginizinizdan memnun musunuz? Sizin icin daha uygun fiyat ve kalite sunabiliriz. Karsilastiralim mi?', successRate: 33 },
  ];
  res.json({ templates });
});

// ── AI MESAJ OPTIMIZASYONU ───────────────────────────────────────────────────
router.post('/ai-optimize', async (req: any, res: any) => {
  try {
    const { message, channel, sector } = req.body;
    if (!message) return res.status(400).json({ error: 'message zorunlu' });

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 400,
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

// ── LEAD SEGMENTASYON ────────────────────────────────────────────────────────
router.get('/segments', async (req: any, res: any) => {
  try {
    const { min_score, max_score, city, sector, source, status, has_phone, has_email, limit: lmt = 200 } = req.query;
    let query = supabase.from('leads').select('id, company_name, phone, email, city, sector, source, score, status, contact_name', { count: 'exact' })
      .eq('user_id', req.userId);

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

    const cities = [...new Set((data || []).map((l: any) => l.city).filter(Boolean))];
    const sectors = [...new Set((data || []).map((l: any) => l.sector).filter(Boolean))];
    const sources = [...new Set((data || []).map((l: any) => l.source).filter(Boolean))];

    res.json({ leads: data || [], total: count || 0, filters: { cities, sectors, sources } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── KAMPANYA ANALITIK ────────────────────────────────────────────────────────
router.get('/analytics', async (req: any, res: any) => {
  try {
    const { data: campaigns } = await supabase.from('campaigns')
      .select('id, name, channel, status, total_sent, total_replied, created_at, message_template')
      .eq('user_id', req.userId).order('created_at', { ascending: false });

    const { data: messages } = await supabase.from('messages')
      .select('channel, direction, sent_at, lead_id')
      .eq('user_id', req.userId).order('sent_at', { ascending: false }).limit(500);

    const outbound = (messages || []).filter((m: any) => m.direction === 'out');
    const inbound = (messages || []).filter((m: any) => m.direction === 'in');
    const replyRate = outbound.length > 0 ? Math.round((inbound.length / outbound.length) * 100) : 0;

    // Saatlik gonderim dagilimi
    const hourlyDist: Record<number, number> = {};
    outbound.forEach((m: any) => {
      const hour = new Date(m.sent_at).getHours();
      hourlyDist[hour] = (hourlyDist[hour] || 0) + 1;
    });

    // Saatlik cevap dagilimi
    const hourlyReply: Record<number, number> = {};
    inbound.forEach((m: any) => {
      const hour = new Date(m.sent_at).getHours();
      hourlyReply[hour] = (hourlyReply[hour] || 0) + 1;
    });

    // En iyi saat
    let bestHour = 9;
    let bestReplyRate = 0;
    for (let h = 8; h <= 20; h++) {
      const sent = hourlyDist[h] || 0;
      const replied = hourlyReply[h] || 0;
      if (sent > 0) {
        const rate = Math.round((replied / sent) * 100);
        if (rate > bestReplyRate) { bestReplyRate = rate; bestHour = h; }
      }
    }

    // Kanal bazli
    const byChannel: Record<string, { sent: number; replied: number }> = {};
    outbound.forEach((m: any) => {
      if (!byChannel[m.channel]) byChannel[m.channel] = { sent: 0, replied: 0 };
      byChannel[m.channel].sent++;
    });
    inbound.forEach((m: any) => {
      if (byChannel[m.channel]) byChannel[m.channel].replied++;
    });

    res.json({
      totalCampaigns: campaigns?.length || 0,
      totalSent: outbound.length,
      totalReplied: inbound.length,
      replyRate,
      bestHour: `${String(bestHour).padStart(2, '0')}:00`,
      bestHourReplyRate: bestReplyRate,
      hourlyDistribution: hourlyDist,
      hourlyReplyDistribution: hourlyReply,
      byChannel: Object.entries(byChannel).map(([ch, v]) => ({
        channel: ch, ...v, replyRate: v.sent > 0 ? Math.round((v.replied / v.sent) * 100) : 0,
      })),
      campaigns: (campaigns || []).map((c: any) => ({
        ...c,
        replyRate: c.total_sent > 0 ? Math.round(((c.total_replied || 0) / c.total_sent) * 100) : 0,
      })),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── AKILLI ZAMANLAMA ─────────────────────────────────────────────────────────
router.get('/smart-timing', async (req: any, res: any) => {
  try {
    const { data: messages } = await supabase.from('messages')
      .select('direction, sent_at, channel')
      .eq('user_id', req.userId).limit(1000);

    const outbound = (messages || []).filter((m: any) => m.direction === 'out');
    const inbound = (messages || []).filter((m: any) => m.direction === 'in');

    const hourStats: Record<number, { sent: number; replied: number }> = {};
    for (let h = 7; h <= 21; h++) hourStats[h] = { sent: 0, replied: 0 };

    outbound.forEach((m: any) => {
      const h = new Date(m.sent_at).getHours();
      if (hourStats[h]) hourStats[h].sent++;
    });
    inbound.forEach((m: any) => {
      const h = new Date(m.sent_at).getHours();
      if (hourStats[h]) hourStats[h].replied++;
    });

    const recommendations = Object.entries(hourStats)
      .map(([h, v]) => ({ hour: Number(h), ...v, replyRate: v.sent > 0 ? Math.round((v.replied / v.sent) * 100) : 0 }))
      .sort((a, b) => b.replyRate - a.replyRate);

    const bestHour = recommendations[0]?.hour || 10;
    const worstHour = recommendations[recommendations.length - 1]?.hour || 20;

    res.json({
      recommendations,
      bestHour: `${String(bestHour).padStart(2, '0')}:00`,
      worstHour: `${String(worstHour).padStart(2, '0')}:00`,
      tip: `En iyi gonderim saati ${String(bestHour).padStart(2, '0')}:00 — bu saatte %${recommendations[0]?.replyRate || 0} cevap orani`,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;