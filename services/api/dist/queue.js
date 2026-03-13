"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bull = require('bull');
const { createClient } = require('@supabase/supabase-js');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
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
campaignQueue.process(async (job) => {
    const { campaignId, userId } = job.data;
    // Kampanyayı getir
    const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
    if (!campaign)
        throw new Error('Kampanya bulunamadı');
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
        await messageQueue.add({
            campaignId,
            userId,
            leadId: leads[i].id,
            channel: campaign.channel,
            message: campaign.message_template,
            lead: leads[i],
        }, {
            delay: i * delay, // Sıralı gönderim
            jobId: `msg-${campaignId}-${leads[i].id}`,
        });
    }
    console.log(`Campaign ${campaignId}: ${leads.length} mesaj queue'ya eklendi`);
});
// ── MESSAGE QUEUE PROCESSOR ───────────────────────────────
messageQueue.process(async (job) => {
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
    // Günlük limit kontrolü — 150 WA mesajı/gün
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
        if ((count || 0) >= 150) {
            throw new Error('Günlük WhatsApp limiti (150) aşıldı');
        }
        // Mesaj saati kontrolü 09:00-20:00
        const hour = new Date().getHours();
        if (hour < 9 || hour >= 20) {
            throw new Error('Güvenli gönderim saati dışında (09:00-20:00)');
        }
    }
    // Mesajı kişiselleştir
    const personalizedMsg = message
        .replace(/\[FIRMA_ADI\]/g, lead.company_name || '')
        .replace(/\[SEHIR\]/g, lead.city || '')
        .replace(/\[AD\]/g, lead.contact_name || lead.company_name || '');
    try {
        if (channel === 'whatsapp') {
            const { sendWhatsAppMessage } = require('./settings');
            await sendWhatsAppMessage(userId, lead.phone, personalizedMsg);
        }
        else if (channel === 'email') {
            const { sendEmail } = require('./settings');
            await sendEmail(userId, lead.email, 'LeadFlow AI', `<p>${personalizedMsg}</p>`);
        }
        // Mesajı kaydet
        await supabase.from('messages').insert([{
                lead_id: leadId,
                user_id: userId,
                channel,
                direction: 'out',
                content: personalizedMsg,
                status: 'sent',
                sent_at: new Date().toISOString(),
            }]);
        // Lead durumunu güncelle
        await supabase.from('leads').update({ status: 'contacted' }).eq('id', leadId).eq('status', 'new');
        // Kampanya sayacını güncelle
        await supabase.rpc('increment_campaign_sent', { campaign_id: campaignId });
        console.log(`✓ Mesaj gönderildi: ${lead.company_name} (${channel})`);
    }
    catch (err) {
        console.error(`✗ Mesaj hatası: ${lead.company_name}: ${err.message}`);
        // Mesajı failed olarak kaydet
        await supabase.from('messages').insert([{
                lead_id: leadId,
                user_id: userId,
                channel,
                direction: 'out',
                content: personalizedMsg,
                status: 'failed',
                sent_at: new Date().toISOString(),
            }]);
        throw err; // Bull retry için
    }
});
// ── EVENT HANDLERS ────────────────────────────────────────
campaignQueue.on('completed', async (job) => {
    const { campaignId } = job.data;
    // Tüm mesajlar bitti mi kontrol et
    const waiting = await messageQueue.getJobCounts();
    if (waiting.waiting === 0 && waiting.active === 0) {
        await supabase.from('campaigns')
            .update({ status: 'completed' })
            .eq('id', campaignId)
            .eq('status', 'active');
        console.log(`Campaign ${campaignId} completed`);
    }
});
campaignQueue.on('failed', (job, err) => {
    console.error(`Campaign job failed: ${job.id}`, err.message);
});
messageQueue.on('failed', (job, err) => {
    console.error(`Message job failed: ${job.id}`, err.message);
});
// Kampanya başlat
async function startCampaign(campaignId, userId) {
    const job = await campaignQueue.add({ campaignId, userId }, { jobId: `campaign-${campaignId}` });
    console.log(`Campaign ${campaignId} queued (job: ${job.id})`);
    return job;
}
// Kampanya duraklat
async function pauseCampaign(campaignId) {
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
