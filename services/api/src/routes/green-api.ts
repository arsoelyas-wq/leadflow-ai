export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { normalizePhone, phonesMatch } = require('../lib/phoneUtils');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const RAILWAY_API_URL = process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app';

// ── YENİ: green-api.com resmi servisi webhook ──────────────────────────────────
// Webhook URL: https://leadflow-ai-production.up.railway.app/api/green-api/inbound
router.post('/inbound', async (req: any, res: any) => {
  res.json({ ok: true }); // green-api.com başarısızsa retry yapar — hemen 200 dön

  try {
    const body = req.body;
    const typeWebhook = body?.typeWebhook;

    // Sadece gelen mesajları işle
    if (typeWebhook !== 'incomingMessageReceived') return;

    const greenApiInstanceId = String(body?.instanceData?.idInstance || '');
    const chatId: string = body?.senderData?.chatId || body?.senderData?.sender || '';
    const senderName: string = body?.senderData?.senderName || body?.senderData?.chatName || '';
    const messageData = body?.messageData || {};
    const content: string =
      messageData?.textMessageData?.textMessage ||
      messageData?.extendedTextMessageData?.text ||
      messageData?.buttonsResponseMessage?.selectedDisplayText ||
      '[Medya]';
    const waMessageId: string | null = body?.idMessage || null;
    const timestamp = body?.timestamp;
    const sentAt = timestamp
      ? new Date(Number(timestamp) * 1000).toISOString()
      : new Date().toISOString();

    // Grup mesajlarını atla
    if (!chatId || chatId.includes('@g.us')) return;

    const senderPhone = chatId.replace('@c.us', '').replace('@s.whatsapp.net', '');
    const senderDigits = senderPhone.replace(/\D/g, '');
    if (!senderDigits || senderDigits.length < 7) return;

    // ── Kullanıcıyı bul: DB → env fallback ────────────────────────────────────
    let userId: string | null = null;

    // 1. DB'den instance kaydına bak (connect-official endpoint ile kaydedilmiş)
    const { data: instRow } = await supabase
      .from('wa_instances')
      .select('user_id')
      .eq('instance_id', `green-${greenApiInstanceId}`)
      .maybeSingle();
    userId = instRow?.user_id || null;

    // 2. Env var fallback (manuel Railway variable)
    if (!userId) {
      const envId = process.env.GREEN_API_INSTANCE_ID;
      const envUser = process.env.GREEN_API_USER_ID;
      if (envId && envUser && greenApiInstanceId === envId) {
        userId = envUser;
      }
    }

    if (!userId) {
      console.warn(`[Green-API] Bilinmeyen instance: ${greenApiInstanceId}. /api/green-api/connect-official ile kaydedin.`);
      return;
    }

    console.log(`[Green-API] Gelen mesaj: ${senderPhone} (${senderName}) → user=${userId}`);

    // ── Dedup ──────────────────────────────────────────────────────────────────
    if (waMessageId) {
      const { count: dupCount } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .filter('metadata->>wa_message_id', 'eq', waMessageId);
      if ((dupCount || 0) > 0) {
        console.log(`[Green-API] Dup skip: ${waMessageId}`);
        return;
      }
    }

    // ── Lead eşleştir veya oluştur ─────────────────────────────────────────────
    const { data: allLeads } = await supabase
      .from('leads')
      .select('id, phone, company_name, contact_name, status, auto_reply_enabled')
      .eq('user_id', userId)
      .not('phone', 'is', null);

    const normalizedSender = normalizePhone(senderDigits);
    let lead: any = (allLeads || []).find((l: any) => phonesMatch(l.phone, senderDigits));
    let isNewLead = false;

    if (!lead) {
      const { data: newLead } = await supabase.from('leads').insert([{
        user_id: userId,
        phone: normalizedSender,
        company_name: senderName || `+${normalizedSender}`,
        source: 'WhatsApp Gelen',
        status: 'new',
        score: 50,
      }]).select().single();
      lead = newLead;
      isNewLead = true;
      console.log(`[Green-API] Yeni lead oluşturuldu: +${normalizedSender}`);
    }

    if (!lead) return;

    // ── Mesajı kaydet ──────────────────────────────────────────────────────────
    const { error: msgErr } = await supabase.from('messages').insert([{
      lead_id: lead.id,
      user_id: userId,
      channel: 'whatsapp',
      direction: 'in',
      content: content || '[Medya]',
      status: 'received',
      sent_at: sentAt,
      read: false,
      metadata: waMessageId ? { wa_message_id: waMessageId } : null,
    }]);

    if (msgErr) {
      console.error(`[Green-API] Mesaj kayıt hatası: ${msgErr.message} (lead=${lead.id})`);
      return;
    }

    console.log(`[Green-API] ✓ Mesaj kaydedildi: ${senderPhone} → lead ${lead.id}`);

    // ── SSE push — inbox anlık güncelleme ──────────────────────────────────────
    try {
      const { ssePush } = require('../lib/sseHub');
      ssePush(userId, 'new_message', {
        leadId: lead.id,
        content: content || '[Medya]',
        sentAt,
        direction: 'in',
        channel: 'whatsapp',
        senderPhone: normalizedSender,
      });
    } catch {}

    // ── Lead durum güncelleme ──────────────────────────────────────────────────
    if (!['won', 'lost'].includes(lead.status || '')) {
      let newStatus = lead.status;
      if (/^stop$/i.test(content.trim())) {
        newStatus = 'lost';
        await supabase.from('leads').update({
          status: 'lost',
          last_contacted_at: sentAt,
          notes: 'STOP komutu — iletişim listesinden çıkarıldı',
        }).eq('id', lead.id);
      } else {
        if (/fiyat|ücret|kaç para|maliyet|teklif/i.test(content)) {
          newStatus = 'contacted';
        } else if (/evet|tamam|ilgileniyorum|sipariş/i.test(content)) {
          newStatus = 'qualified';
        } else if (/hayır|istemiyorum|iptal/i.test(content)) {
          newStatus = 'lost';
        } else {
          newStatus = lead.status === 'new' ? 'replied' : lead.status;
        }
        await supabase.from('leads').update({
          status: newStatus,
          last_contacted_at: sentAt,
        }).eq('id', lead.id);
      }

      try {
        const { ssePush } = require('../lib/sseHub');
        ssePush(userId, 'lead_update', { leadId: lead.id, status: newStatus });
      } catch {}
    }

    // ── Kampanya istatistik güncelle ───────────────────────────────────────────
    if (isNewLead) return;
    try {
      const { count: prevInCount } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', lead.id).eq('user_id', userId).eq('direction', 'in');
      if ((prevInCount || 0) <= 1) {
        const { data: campaigns } = await supabase.from('campaigns')
          .select('id, total_replied').eq('user_id', userId).contains('lead_ids', [lead.id]);
        for (const camp of (campaigns || [])) {
          await supabase.from('campaigns')
            .update({ total_replied: (camp.total_replied || 0) + 1 }).eq('id', camp.id);
        }
      }
    } catch {}

  } catch (e: any) {
    console.error('[Green-API Inbound] Hata:', e.message);
  }
});

// ── YENİ: green-api.com instance kayıt ────────────────────────────────────────
// Kullanıcı app'ten bağlanınca bu endpoint çağrılır
// Body: { instanceId: "1234567890", apiToken: "abc123" }
router.post('/connect-official', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { instanceId, apiToken } = req.body;
    if (!instanceId) return res.status(400).json({ error: 'instanceId zorunlu' });

    const dbKey = `green-${instanceId}`;
    const webhookUrl = `${RAILWAY_API_URL}/api/green-api/inbound`;

    // wa_instances tablosuna kaydet
    const { error } = await supabase.from('wa_instances').upsert({
      instance_id: dbKey,
      user_id: userId,
      status: 'connecting',
    }, { onConflict: 'instance_id' });
    if (error) throw error;

    // green-api.com REST API ile webhook URL'i otomatik ayarla
    if (apiToken) {
      try {
        await axios.post(
          `https://api.green-api.com/waInstance${instanceId}/SetSettings/${apiToken}`,
          { webhookUrl, incomingWebhook: 'yes', outgoingWebhook: 'no' }
        );
        console.log(`[Green-API] Webhook ayarlandı: ${webhookUrl}`);
      } catch (wErr: any) {
        console.warn('[Green-API] Webhook otomatik ayar başarısız:', wErr.message);
      }
    }

    res.json({
      ok: true,
      webhookUrl,
      message: 'Green API instance kaydedildi. Şimdi green-api.com dashboard\'ından QR kodu tarayın.',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── YENİ: green-api.com bağlantı durumu ───────────────────────────────────────
router.get('/official-status', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: instRows } = await supabase
      .from('wa_instances')
      .select('instance_id, status, phone, connected_at')
      .eq('user_id', userId)
      .like('instance_id', 'green-%');
    res.json({ instances: instRows || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Eski: özel gateway webhook (geriye dönük uyumluluk) ───────────────────────
const WA_GATEWAY = process.env.WA_GATEWAY || 'http://207.154.248.119:3003';
const WA_SECRET = process.env.WA_SECRET || 'leadflow-wa-secret-2026';

router.post('/webhook', async (req: any, res: any) => {
  try {
    const { secret, instanceId, userId, phone, text, timestamp, messageId } = req.body;
    if (secret !== WA_SECRET) return res.status(403).json({ error: 'Yetkisiz' });

    res.json({ ok: true });

    const { data: instance } = await supabase
      .from('wa_instances')
      .select('*, ti_members(*)')
      .eq('instance_id', instanceId)
      .single();

    if (!instance) {
      console.log('Instance bulunamadi:', instanceId);
      return;
    }

    const realUserId = instance.user_id;
    const memberId = instance.member_id;
    const memberName = instance.ti_members?.name || 'Temsilci';

    let { data: lead } = await supabase
      .from('leads')
      .select('id, company_name')
      .eq('user_id', realUserId)
      .eq('phone', phone)
      .single();

    if (!lead) {
      const { data: newLead } = await supabase
        .from('leads')
        .insert([{ user_id: realUserId, phone, company_name: phone, status: 'new' }])
        .select().single();
      lead = newLead;
    }

    await supabase.from('messages').insert([{
      user_id: realUserId,
      lead_id: lead?.id,
      channel: 'whatsapp',
      direction: 'in',
      content: text,
      status: 'received',
      sent_at: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : new Date().toISOString(),
      agent_id: memberId,
      agent_name: memberName,
    }]);

    console.log(`Mesaj kaydedildi: ${memberName} -> ${phone}: ${text.slice(0, 50)}`);
  } catch (e: any) {
    console.error('Webhook error:', e.message);
  }
});

router.post('/connected', async (req: any, res: any) => {
  try {
    const { secret, instanceId, userId, phone } = req.body;
    if (secret !== WA_SECRET) return res.status(403).json({ error: 'Yetkisiz' });

    await supabase.from('wa_instances')
      .update({ status: 'connected', phone, connected_at: new Date().toISOString() })
      .eq('instance_id', instanceId);

    const { data: instance } = await supabase
      .from('wa_instances').select('member_id, user_id').eq('instance_id', instanceId).single();

    if (instance?.member_id) {
      await supabase.from('ti_members').update({ wa_phone: phone }).eq('id', instance.member_id);
    }

    if (instance?.user_id && phone) {
      const { data: waNum } = await supabase.from('wa_numbers')
        .select('id').eq('user_id', instance.user_id).eq('status', 'connecting')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (waNum) {
        await supabase.from('wa_numbers').update({ status: 'connected', phone_number: phone }).eq('id', waNum.id);
      }
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/instance/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: 'memberId zorunlu' });

    const instanceId = `${userId.slice(0,8)}-${memberId.slice(0,8)}-${Date.now()}`;
    const { data, error } = await supabase.from('wa_instances').insert([{
      user_id: userId, member_id: memberId, instance_id: instanceId, status: 'creating',
    }]).select().single();
    if (error) throw error;

    await axios.post(`${WA_GATEWAY}/instance/create`, { secret: WA_SECRET, instanceId, userId });
    res.json({ ok: true, instanceId, message: 'Instance olusturuldu, QR bekleniyor' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/instance/:instanceId/qr', async (req: any, res: any) => {
  try {
    const r = await axios.get(`${WA_GATEWAY}/instance/${req.params.instanceId}/qr`);
    res.json(r.data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/instance/:instanceId/status', async (req: any, res: any) => {
  try {
    const [gw, db] = await Promise.allSettled([
      axios.get(`${WA_GATEWAY}/instance/${req.params.instanceId}/status`),
      supabase.from('wa_instances').select('*').eq('instance_id', req.params.instanceId).single(),
    ]);
    res.json({
      instanceId: req.params.instanceId,
      gateway: gw.status === 'fulfilled' ? gw.value.data : null,
      db: db.status === 'fulfilled' ? (db.value as any).data : null,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/instance/:instanceId', async (req: any, res: any) => {
  try {
    await axios.delete(`${WA_GATEWAY}/instance/${req.params.instanceId}`, { data: { secret: WA_SECRET } });
    await supabase.from('wa_instances').update({ status: 'deleted' })
      .eq('instance_id', req.params.instanceId).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/instances', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('wa_instances')
      .select('*, ti_members(name, role)').eq('user_id', req.userId).neq('status', 'deleted');
    res.json({ instances: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/send', async (req: any, res: any) => {
  try {
    const { instanceId, phone, text } = req.body;
    const r = await axios.post(`${WA_GATEWAY}/send`, { secret: WA_SECRET, instanceId, phone, text });
    const { data: instance } = await supabase
      .from('wa_instances').select('member_id, ti_members(name)').eq('instance_id', instanceId).single();
    await supabase.from('messages').insert([{
      user_id: req.userId, channel: 'whatsapp', direction: 'out', content: text,
      status: 'sent', sent_at: new Date().toISOString(),
      agent_id: instance?.member_id, agent_name: (instance as any)?.ti_members?.name,
    }]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
