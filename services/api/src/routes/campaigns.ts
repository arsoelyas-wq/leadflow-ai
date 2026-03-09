export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── ANTI-BAN YARDIMCI FONKSİYONLAR ──────────────────────────

// Rastgele bekleme (min-max ms arası)
function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

// Güvenli gönderim saati kontrolü (09:00 - 20:00)
function isSafeHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 20;
}

// Günlük gönderim sayısını kontrol et (kullanıcı başına max 150/gün)
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

// Mesajı kişiselleştir
function personalizeMessage(template: string, lead: any): string {
  return template
    .replace(/\[FIRMA_ADI\]/g, lead.company_name || lead.contact_name || 'Sayın Yetkili')
    .replace(/\[SEHIR\]/g, lead.city || '')
    .replace(/\[SEKTOR\]/g, lead.sector || '')
    .replace(/\[AD\]/g, lead.contact_name || '')
    .replace(/\[TELEFON\]/g, lead.phone || '');
}

// ── ROUTES ───────────────────────────────────────────────────

// Tüm kampanyaları getir
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

// Yeni kampanya oluştur
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

// Kampanya detayı
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

// Kampanyayı başlat
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
      return res.status(400).json({ error: 'Email ayarları yapılmamış. Ayarlar sayfasından SMTP bağlayın.' });
    }

    if (campaign.channel === 'whatsapp' && userSettings?.whatsapp_status !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp bağlı değil. Ayarlar sayfasından bağlayın.' });
    }

    // WhatsApp için saat kontrolü
    if (campaign.channel === 'whatsapp' && !isSafeHour()) {
      return res.status(400).json({
        error: 'WhatsApp mesajları sadece 09:00-20:00 arası gönderilebilir. Lütfen daha sonra tekrar deneyin.'
      });
    }

    // Günlük limit kontrolü
    if (campaign.channel === 'whatsapp') {
      const dailyCount = await getDailyCount(userId, 'whatsapp');
      if (dailyCount >= 150) {
        return res.status(400).json({
          error: `Günlük WhatsApp limiti doldu (150/gün). Yarın tekrar deneyin. Bugün gönderilen: ${dailyCount}`
        });
      }
      const remaining = 150 - dailyCount;
      if (leads.length > remaining) {
        return res.status(400).json({
          error: `Bugün sadece ${remaining} mesaj daha gönderebilirsiniz. ${leads.length} lead seçtiniz.`
        });
      }
    }

    await supabase.from('campaigns').update({ status: 'active' }).eq('id', req.params.id);

    sendCampaignMessages(campaign, leads, userSettings, userId).catch(console.error);

    res.json({
      message: 'Kampanya başlatıldı! Mesajlar gönderiliyor...',
      total: leads.length,
      estimatedTime: `~${Math.ceil(leads.length * 1.5)} dakika`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Arka planda mesaj gönderme
async function sendCampaignMessages(campaign: any, leads: any[], userSettings: any, userId: string) {
  let sent = 0;
  let failed = 0;
  const nodemailer = require('nodemailer');

  // Kullanıcının güncel credits_used değerini al
  const { data: userData } = await supabase
    .from('users')
    .select('credits_used')
    .eq('id', userId)
    .single();
  let currentCreditsUsed = userData?.credits_used || 0;

  let transporter: any = null;
  if (campaign.channel === 'email' && userSettings?.email_user) {
    transporter = nodemailer.createTransport({
      host: userSettings.email_host || 'smtp.gmail.com',
      port: Number(userSettings.email_port) || 587,
      secure: false,
      auth: {
        user: userSettings.email_user,
        pass: userSettings.email_pass,
      },
    });
  }

  for (const lead of leads) {
    try {
      // WhatsApp için saat kontrolü (gönderim sırasında da kontrol et)
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
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
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

        // Mesajı kaydet (user_id ile birlikte)
        await supabase.from('messages').insert([{
          lead_id: lead.id,
          user_id: userId,
          channel: campaign.channel,
          direction: 'out',
          content: personalizedMsg,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }]);

        // Krediyi toplu güncelle (her 5 mesajda bir)
        if (sent % 5 === 0) {
          await supabase.from('users')
            .update({ credits_used: currentCreditsUsed })
            .eq('id', userId);
        }
      } else {
        failed++;
      }

      // ── ANTI-BAN: Rastgele bekleme ──
      if (campaign.channel === 'whatsapp') {
        // WhatsApp: 8-25 saniye arası rastgele bekleme
        await randomDelay(8000, 25000);
      } else {
        // Email: 2-5 saniye
        await randomDelay(2000, 5000);
      }

    } catch (e: any) {
      console.error('Send error:', e.message);
      failed++;
      // Hata durumunda daha uzun bekle
      await randomDelay(15000, 30000);
    }
  }

  // Final kredi güncellemesi
  await supabase.from('users')
    .update({ credits_used: currentCreditsUsed })
    .eq('id', userId);

  // Kampanya sonucunu güncelle
  await supabase.from('campaigns').update({
    total_sent: (campaign.total_sent || 0) + sent,
    status: failed === leads.length ? 'paused' : 'completed',
  }).eq('id', campaign.id);

  console.log(`Campaign ${campaign.id} done: ${sent} sent, ${failed} failed`);
}

// Kampanyayı duraklat
router.post('/:id/pause', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('campaigns')
      .update({ status: 'paused' })
      .eq('id', req.params.id)
      .eq('user_id', userId);

    res.json({ message: 'Kampanya duraklatıldı' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Kampanyayı sil
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

module.exports = router;