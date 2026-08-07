export {};

// Redis yoksa queue'yu tamamen devre dışı bırak → campaigns.ts fallback'e düşer
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error('REDIS_URL not configured — queue disabled, using direct send');

const Bull = require('bull');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── QUEUE TANIMLARI ───────────────────────────────────────
const campaignQueue = new Bull('campaigns', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

const messageQueue = new Bull('messages', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 500,
    removeOnFail: 500,
  },
});

// ── CAMPAIGN QUEUE PROCESSOR ──────────────────────────────
campaignQueue.process(async (job: any) => {
  const { campaignId, userId } = job.data;

  // Kampanyayı getir
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) throw new Error('Kampanya bulunamadı');
  if (campaign.status === 'paused') {
    console.log(`Campaign ${campaignId} paused, skipping`);
    return;
  }

  // Leadleri getir
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .in('id', campaign.lead_ids || []);

  if (!leads || leads.length === 0) {
    await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);
    return;
  }

  // Kampanyayı active yap
  await supabase.from('campaigns').update({ status: 'active' }).eq('id', campaignId);

  // Her lead için mesaj job'u ekle
  const delay = campaign.channel === 'whatsapp' ? 15000 : 3000; // WA: 15sn, Email: 3sn

  for (let i = 0; i < leads.length; i++) {
    await messageQueue.add(
      {
        campaignId,
        userId,
        leadId: leads[i].id,
        channel: campaign.channel,
        message: campaign.message_template,
        lead: leads[i],
      },
      {
        delay: i * delay, // Sıralı gönderim
        jobId: `msg-${campaignId}-${leads[i].id}`,
      }
    );
  }

  console.log(`Campaign ${campaignId}: ${leads.length} mesaj queue'ya eklendi`);
});

// ── MESSAGE QUEUE PROCESSOR ───────────────────────────────
messageQueue.process(async (job: any) => {
  const { campaignId, userId, leadId, channel, message, lead } = job.data;

  // Kampanya hala active mi?
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('status')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.status === 'paused' || campaign.status === 'completed') {
    console.log(`Campaign ${campaignId} ${campaign?.status}, skipping message`);
    return;
  }

  // Günlük limit kontrolü — kullanıcı ayarından oku (varsayılan 150)
  if (channel === 'whatsapp') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('channel', 'whatsapp')
      .eq('direction', 'out')
      .gte('sent_at', todayStart.toISOString());

    const { data: vs } = await supabase.from('voice_settings')
      .select('daily_wa_limit').eq('user_id', userId).maybeSingle();
    const dailyLimit = vs?.daily_wa_limit ?? 150;

    if ((count || 0) >= dailyLimit) {
      throw new Error(`Günlük WhatsApp limiti (${dailyLimit}) aşıldı. Ayarlar > WhatsApp bölümünden limiti artırabilirsiniz.`);
    }

    // Mesaj saati kontrolü 09:00-20:00 Turkey (UTC+3)
    const turkeyHour = (new Date().getUTCHours() + 3) % 24;
    if (turkeyHour < 9 || turkeyHour >= 20) {
      throw new Error('Güvenli gönderim saati dışında (09:00-20:00)');
    }
  }

  // Mesajı kişiselleştir — hem {{firma}} hem [FIRMA_ADI] formatlarını destekle
  const firma  = lead.company_name || lead.contact_name || 'Sayın Yetkili';
  const isim   = lead.contact_name || lead.company_name || 'Yetkili';
  const sehir  = lead.city    || '';
  const sektor = lead.sector  || '';
  const tel    = lead.phone   || '';
  const personalizedMsg = message
    .replace(/\{\{firma\}\}/gi,   firma)
    .replace(/\{\{isim\}\}/gi,    isim)
    .replace(/\{\{sehir\}\}/gi,   sehir)
    .replace(/\{\{sektor\}\}/gi,  sektor)
    .replace(/\{\{telefon\}\}/gi, tel)
    .replace(/\[FIRMA_ADI\]/g, firma)
    .replace(/\[SEHIR\]/g,     sehir)
    .replace(/\[SEKTOR\]/g,    sektor)
    .replace(/\[AD\]/g,        isim)
    .replace(/\[TELEFON\]/g,   tel);

  try {
    if (channel === 'whatsapp') {
      if (!lead.phone) throw new Error('WhatsApp için telefon numarası yok');
      const { sendWhatsAppMessage } = require('./routes/settings');
      await sendWhatsAppMessage(userId, lead.phone, personalizedMsg);
    } else if (channel === 'email') {
      if (!lead.email) throw new Error('Email adresi yok');
      const { sendEmail } = require('./routes/settings');
      await sendEmail(userId, lead.email, 'LeadFlow AI', `<p>${personalizedMsg.replace(/\n/g, '<br>')}</p>`);
    } else if (channel === 'sms') {
      if (!lead.phone) throw new Error('SMS için telefon numarası yok');
      // SMS gateway entegrasyonu — şimdilik hata fırlat
      throw new Error('SMS gateway henüz yapılandırılmamış. Ayarlar bölümünden SMS API key ekleyin.');
    } else {
      throw new Error(`Desteklenmeyen kanal: ${channel}. Desteklenen: whatsapp, email`);
    }

    // Mesajı kaydet — hata varsa throw et (Bull retry mekanizması devreye girsin)
    const { error: insertErr } = await supabase.from('messages').insert([{
      lead_id: leadId,
      user_id: userId,
      channel,
      direction: 'out',
      content: personalizedMsg,
      status: 'sent',
      sent_at: new Date().toISOString(),
      read: true,
      campaign_id: campaignId,
    }]);
    if (insertErr) throw new Error(`DB insert hatası: ${insertErr.message}`);

    // Lead durumunu güncelle
    await supabase.from('leads').update({ status: 'contacted' }).eq('id', leadId).eq('status', 'new');

    // Kampanya sayacını güncelle (RPC varsa kullan, yoksa doğrudan güncelle)
    const { error: rpcErr } = await supabase.rpc('increment_campaign_sent', { campaign_id: campaignId });
    if (rpcErr) {
      const { data: c } = await supabase.from('campaigns').select('total_sent').eq('id', campaignId).single();
      await supabase.from('campaigns').update({ total_sent: (c?.total_sent || 0) + 1 }).eq('id', campaignId);
    }

    console.log(`✓ Mesaj gönderildi: ${lead.company_name} (${channel})`);

  } catch (err: any) {
    console.error(`✗ Mesaj hatası: ${lead.company_name}: ${err.message}`);

    // İLK denemede inbox'a kaydet — kullanıcı hemen görsün, retry'da duplicate yaratma
    if (job.attemptsMade === 0) {
      await supabase.from('messages').insert([{
        lead_id: leadId,
        user_id: userId,
        channel,
        direction: 'out',
        content: personalizedMsg,
        status: 'failed',
        sent_at: new Date().toISOString(),
        read: true,
        campaign_id: campaignId,
        metadata: { error: err.message },
      }]).catch((e: any) => console.error('Failed msg insert error:', e.message));
    }

    throw err; // Bull retry için
  }
});

// ── EVENT HANDLERS ────────────────────────────────────────
campaignQueue.on('completed', async (job: any) => {
  const { campaignId } = job.data;
  console.log(`Campaign ${campaignId}: message jobs queued, processing...`);
});

campaignQueue.on('failed', (job: any, err: any) => {
  console.error(`Campaign job failed: ${job.id}`, err.message);
});

// Her mesaj tamamlandığında kampanyanın bitip bitmediğini kontrol et (per-campaign)
messageQueue.on('completed', async (job: any) => {
  const { campaignId } = job.data;
  if (!campaignId) return;
  try {
    const { data: campaign } = await supabase.from('campaigns')
      .select('lead_ids, status').eq('id', campaignId).single();
    if (!campaign || campaign.status !== 'active') return;

    const totalLeads = (campaign.lead_ids || []).length;
    if (totalLeads === 0) return;

    const { count } = await supabase.from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);

    if ((count || 0) >= totalLeads) {
      await supabase.from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaignId)
        .eq('status', 'active');
      console.log(`Campaign ${campaignId} completed (${count}/${totalLeads} messages processed)`);
    }
  } catch (e: any) {
    console.error('Campaign completion check error:', e.message);
  }
});

messageQueue.on('failed', (job: any, err: any) => {
  console.error(`Message job failed: ${job.id}`, err.message);
});

// Kampanya başlat
async function startCampaign(campaignId: string, userId: string) {
  const job = await campaignQueue.add(
    { campaignId, userId },
    { jobId: `campaign-${campaignId}` }
  );
  console.log(`Campaign ${campaignId} queued (job: ${job.id})`);
  return job;
}

// Kampanya duraklat
async function pauseCampaign(campaignId: string) {
  await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaignId);
  console.log(`Campaign ${campaignId} paused`);
}

// Queue istatistikleri
async function getQueueStats() {
  const [campaignCounts, messageCounts] = await Promise.all([
    campaignQueue.getJobCounts(),
    messageQueue.getJobCounts(),
  ]);
  return { campaigns: campaignCounts, messages: messageCounts };
}

module.exports = { campaignQueue, messageQueue, startCampaign, pauseCampaign, getQueueStats };