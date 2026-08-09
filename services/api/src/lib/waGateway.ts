export {};
// WhatsApp Gateway — whatsapp-web.js (gerçek tarayıcı, Baileys'ın yerini aldı)
// Baileys ile sorun: WA zaman zaman gelen mesajları oturuma iletmeyi kesiyordu (zombie socket).
// whatsapp-web.js gerçek Chromium çalıştırır → WA onu normal tarayıcı olarak görür → stabil.

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const { normalizePhone, phonesMatch } = require('./phoneUtils');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

interface GatewayInstance {
  client: any;
  status: 'creating' | 'qr_ready' | 'connected' | 'disconnected';
  qr: string | null;
  phone: string | null;
  userId: string;
  backupTimer?: ReturnType<typeof setInterval>;
  lastIncomingAt?: number;
}

const instances: Map<string, GatewayInstance> = new Map();
const reconnectAttempts = new Map<string, number>();

const incomingStats = {
  lastEventAt: null as string | null,
  totalEvents: 0,
  totalMessages: 0,
  filtered: { fromMe: 0, notWhatsapp: 0, shortPhone: 0 },
  saved: 0,
  errors: 0,
};
export function getIncomingStats() { return { ...incomingStats }; }

const leadCreationInProgress = new Set<string>();

// ── Session persistence: Supabase Storage RemoteAuth store ──────────────────

let sessionBucketReady = false;
async function ensureSessionBucket(): Promise<void> {
  if (sessionBucketReady) return;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    const exists = (buckets || []).some((b: any) => b.name === 'wa-sessions');
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket('wa-sessions', {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024,
      });
      if (createErr && !createErr.message.includes('already exists')) throw createErr;
      console.log('[WA-GW] wa-sessions bucket created');
    }
    sessionBucketReady = true;
  } catch (e: any) {
    console.error('[WA-GW] ensureSessionBucket error:', e.message);
  }
}

// whatsapp-web.js RemoteAuth store interface:
// save({ session })       → wwjs zip'i .wwebjs_backup/{session}.zip'e yazar, biz Supabase'e yükleriz
// extract({ session, path }) → Supabase'den zip'i indirip path'e yazarız, wwjs oradan açar
// sessionExists({ session })  → session daha önce kaydedilmiş mi?
// delete({ session })     → Supabase'den sil
class SupabaseRemoteStore {
  async sessionExists({ session }: { session: string }): Promise<boolean> {
    try {
      await ensureSessionBucket();
      const { data } = await supabase.storage.from('wa-sessions').list('', { search: `${session}.zip` });
      return (data || []).some((f: any) => f.name === `${session}.zip`);
    } catch { return false; }
  }

  async save({ session }: { session: string }): Promise<void> {
    try {
      const zipPath = path.join(process.cwd(), '.wwebjs_backup', `${session}.zip`);
      if (!fs.existsSync(zipPath)) {
        console.warn(`[WA-GW] RemoteAuth save: zip yok → ${zipPath}`);
        return;
      }
      const data = fs.readFileSync(zipPath);
      const { error } = await supabase.storage.from('wa-sessions').upload(`${session}.zip`, data, {
        contentType: 'application/zip',
        upsert: true,
      });
      if (error) throw error;
      console.log(`[WA-GW] Session saved: ${session} (${data.length} bytes)`);
    } catch (e: any) {
      console.error(`[WA-GW] RemoteAuth save error: ${e.message}`);
    }
  }

  async extract({ session, path: destPath }: { session: string; path: string }): Promise<void> {
    try {
      await ensureSessionBucket();
      const { data, error } = await supabase.storage.from('wa-sessions').download(`${session}.zip`);
      if (error) {
        if (error.message?.includes('not found') || error.message?.includes('Object not found')) {
          console.log(`[WA-GW] Storage'da session yok: ${session} (ilk kez veya silindi)`);
        } else {
          console.error(`[WA-GW] RemoteAuth extract error: ${error.message}`);
        }
        return;
      }
      if (!data) return;
      const buf = Buffer.from(await data.arrayBuffer());
      const dir = path.dirname(destPath);
      if (dir) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(destPath, buf);
      console.log(`[WA-GW] Session extracted: ${session} → ${destPath}`);
    } catch (e: any) {
      console.error(`[WA-GW] RemoteAuth extract error: ${e.message}`);
    }
  }

  async delete({ session }: { session: string }): Promise<void> {
    try {
      await supabase.storage.from('wa-sessions').remove([`${session}.zip`]);
    } catch {}
  }
}

// ── Duplicate lead birleştirme (değişmedi) ───────────────────────────────────

export async function deduplicatePhoneLeads(userId: string, sb?: any): Promise<{ merged: number; deleted: number }> {
  const client = sb || supabase;
  const { data: leads } = await client.from('leads')
    .select('id, phone, company_name, contact_name, created_at')
    .eq('user_id', userId)
    .not('phone', 'is', null)
    .order('created_at', { ascending: true });

  if (!leads?.length) return { merged: 0, deleted: 0 };

  const phoneGroups = new Map<string, any[]>();
  for (const lead of leads) {
    const digits = (lead.phone || '').replace(/\D/g, '');
    if (digits.length < 7) continue;
    const key = digits.slice(-10);
    if (!phoneGroups.has(key)) phoneGroups.set(key, []);
    phoneGroups.get(key)!.push(lead);
  }

  let merged = 0, deleted = 0;
  for (const [, groupLeads] of phoneGroups) {
    if (groupLeads.length < 2) continue;

    const leadIds = groupLeads.map((l: any) => l.id);
    const { data: outMsgs } = await client.from('messages')
      .select('lead_id').eq('user_id', userId).eq('direction', 'out')
      .in('lead_id', leadIds).limit(1);
    const hasOutbound = outMsgs?.length ? outMsgs[0].lead_id : null;

    let target = hasOutbound
      ? groupLeads.find((l: any) => l.id === hasOutbound) || groupLeads[0]
      : groupLeads.find((l: any) => {
          const n = l.company_name || l.contact_name || '';
          return /[a-zA-ZğüşıöçĞÜŞİÖÇâîûÂÎÛ]/i.test(n);
        }) || groupLeads[0];

    const sources = groupLeads.filter((l: any) => l.id !== target.id);
    for (const src of sources) {
      await client.from('messages').update({ lead_id: target.id }).eq('lead_id', src.id).eq('user_id', userId);
      await client.from('leads').delete().eq('id', src.id).eq('user_id', userId);
      deleted++;
    }
    merged++;
    console.log(`[WA-GW] Dedup: ${sources.length} duplicate → lead ${target.id} (${target.company_name || target.contact_name})`);
  }
  return { merged, deleted };
}

// ── Ana instance oluşturucu ───────────────────────────────────────────────────

async function createWWebInstance(
  instanceId: string,
  userId: string,
  onQR?: (qr: string) => void,
  onConnected?: (phone: string) => void,
  onDisconnected?: () => void,
): Promise<void> {
  try {
    const { Client, RemoteAuth } = require('whatsapp-web.js');
    const qrcode = require('qrcode');

    await ensureSessionBucket();

    const client = new Client({
      authStrategy: new RemoteAuth({
        clientId: instanceId,
        dataPath: process.env.WA_AUTH_DIR || '/tmp/wweb_data',
        store: new SupabaseRemoteStore(),
        backupSyncIntervalMs: 10 * 60 * 1000,
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-default-apps',
          '--mute-audio',
        ],
      },
    });

    const entry: GatewayInstance = { client, status: 'creating', qr: null, phone: null, userId };
    instances.set(instanceId, entry);

    // ── QR kodu ──
    client.on('qr', async (qr: string) => {
      try {
        const qrDataUrl = await qrcode.toDataURL(qr);
        entry.status = 'qr_ready';
        entry.qr = qrDataUrl;
        console.log(`[WA-GW] QR ready: ${instanceId}`);

        // Session geçersiz/yok — DB'yi güncelle ki yeşil dot yanlış yanmasın
        await supabase.from('wa_instances')
          .update({ status: 'qr_pending' })
          .eq('instance_id', instanceId);
        await supabase.from('wa_numbers')
          .update({ status: 'disconnected' })
          .eq('user_id', userId)
          .neq('status', 'disconnected');

        if (onQR) onQR(qrDataUrl);
      } catch (e: any) {
        console.error(`[WA-GW] QR error: ${e.message}`);
      }
    });

    // ── Bağlantı hazır ──
    client.on('ready', async () => {
      const phone = client.info?.wid?.user || '';
      entry.status = 'connected';
      entry.phone = phone;
      entry.qr = null;
      reconnectAttempts.delete(instanceId);
      console.log(`[WA-GW] Connected: ${instanceId} → ${phone}`);

      const backupTimer = setInterval(() => {
        console.log(`[WA-GW] Session backup tick: ${instanceId}`);
      }, 10 * 60 * 1000);
      entry.backupTimer = backupTimer;

      // Duplicate instance'ları DB'de kapat
      await supabase.from('wa_instances')
        .update({ status: 'disconnected' })
        .eq('phone', phone)
        .neq('instance_id', instanceId);
      await supabase.from('wa_instances').update({
        status: 'connected',
        phone,
        connected_at: new Date().toISOString(),
      }).eq('instance_id', instanceId);

      // wa_numbers senkronize et
      const { data: numByPhone } = await supabase.from('wa_numbers')
        .select('id').eq('user_id', userId).eq('phone_number', phone).maybeSingle();
      if (numByPhone) {
        await supabase.from('wa_numbers').update({ status: 'connected' }).eq('id', numByPhone.id);
      } else {
        const { data: anyNum } = await supabase.from('wa_numbers')
          .select('id').eq('user_id', userId)
          .in('status', ['connecting', 'disconnected'])
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (anyNum) {
          await supabase.from('wa_numbers').update({
            status: 'connected', phone_number: phone,
          }).eq('id', anyNum.id);
        }
      }
      console.log(`[WA-GW] wa_numbers synced for ${phone}`);

      setTimeout(() => deduplicatePhoneLeads(userId, supabase), 8000);
      if (onConnected) onConnected(phone);
    });

    // ── RemoteAuth session kaydedildi ──
    client.on('remote_session_saved', () => {
      console.log(`[WA-GW] Remote session saved: ${instanceId}`);
    });

    // ── Bağlantı kesildi ──
    client.on('disconnected', async (reason: string) => {
      entry.status = 'disconnected';
      if (entry.backupTimer) { clearInterval(entry.backupTimer); entry.backupTimer = undefined; }
      console.log(`[WA-GW] Disconnected: ${instanceId}, reason=${reason}`);

      try { await client.destroy(); } catch {}

      if (reason !== 'LOGOUT') {
        const attempts = (reconnectAttempts.get(instanceId) || 0) + 1;
        reconnectAttempts.set(instanceId, attempts);
        const base = Math.min(2000 * Math.pow(2, attempts - 1), 30_000);
        const jitter = Math.floor(Math.random() * 1000);
        const delay = base + jitter;
        console.log(`[WA-GW] Reconnect ${attempts} in ${Math.round(delay / 1000)}s: ${instanceId}`);
        setTimeout(() => createWWebInstance(instanceId, userId, onQR, onConnected, onDisconnected), delay);
      } else {
        // Logout → QR yeniden taranacak
        reconnectAttempts.delete(instanceId);
        instances.delete(instanceId);
        await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', instanceId);
        await supabase.from('wa_numbers').update({ status: 'disconnected' })
          .eq('user_id', userId).eq('status', 'connected');
        console.log(`[WA-GW] Logged out: ${instanceId} — QR yeniden taranmalı`);
        if (onDisconnected) onDisconnected();
      }
    });

    // ── Gelen mesaj işleyici ─────────────────────────────────────────────────
    client.on('message', async (msg: any) => {
      incomingStats.totalEvents++;
      incomingStats.lastEventAt = new Date().toISOString();
      const inst = instances.get(instanceId);
      if (inst) inst.lastIncomingAt = Date.now();

      if (msg.fromMe) { incomingStats.filtered.fromMe++; return; }

      const from = msg.from || '';
      // Sadece bireysel WA mesajları (@c.us) — gruplar, broadcast kanallar değil
      if (!from.endsWith('@c.us')) {
        incomingStats.filtered.notWhatsapp++;
        console.log(`[WA-GW] Filtered non-individual: ${from}`);
        return;
      }

      const senderPhone = from.replace('@c.us', '');
      const senderDigits = senderPhone.replace(/\D/g, '');
      if (!senderDigits || senderDigits.length < 7) { incomingStats.filtered.shortPhone++; return; }

      incomingStats.totalMessages++;
      const waMessageId = msg.id?.id || null;

      // Erken deduplikasyon
      if (waMessageId) {
        const { count: dupCount } = await supabase.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .filter('metadata->>wa_message_id', 'eq', waMessageId);
        if ((dupCount || 0) > 0) { console.log(`[WA-GW] Dup skip: ${waMessageId}`); return; }
      }

      const content = msg.body || '';
      const sentAt = msg.timestamp
        ? new Date(Number(msg.timestamp) * 1000).toISOString()
        : new Date().toISOString();

      console.log(`[WA-GW] Incoming from ${senderPhone} msgId=${waMessageId}`);

      let savedLead: any = null;
      let finalStatus = '';

      try {
        const normalizedSender = normalizePhone(senderDigits);

        const { data: allLeads, error: allLeadsErr } = await supabase
          .from('leads')
          .select('id, phone, company_name, contact_name, status, notes, auto_reply_enabled')
          .eq('user_id', userId)
          .not('phone', 'is', null);

        if (allLeadsErr) console.error(`[WA-GW] allLeads query error: ${allLeadsErr.message}`);

        const matchedLeads = (allLeads || []).filter((l: any) => phonesMatch(l.phone, senderDigits));
        let lead: any = null;

        if (matchedLeads.length === 1) {
          lead = matchedLeads[0];
        } else if (matchedLeads.length > 1) {
          const namedLead = matchedLeads.find((l: any) => {
            const n = (l.company_name || l.contact_name || '').trim();
            return /[a-zA-ZğüşıöçĞÜŞİÖÇâîûÂÎÛ]/i.test(n);
          });
          if (namedLead) {
            lead = namedLead;
          } else {
            const { data: outboundMsg } = await supabase.from('messages')
              .select('lead_id').eq('user_id', userId).eq('direction', 'out')
              .in('lead_id', matchedLeads.map((l: any) => l.id))
              .order('sent_at', { ascending: false }).limit(1);
            const outLeadId = outboundMsg?.[0]?.lead_id;
            lead = (outLeadId ? matchedLeads.find((l: any) => l.id === outLeadId) : null) || matchedLeads[0];
          }
          console.log(`[WA-GW] Multi-match: ${matchedLeads.length} lead, picked: ${lead.id} (${lead.company_name || lead.contact_name || 'no-name'})`);
        }

        console.log(`[WA-GW] Lead match: userId=${userId} sender=${normalizedSender} allLeads=${allLeads?.length ?? 'null'} matched=${lead?.id ?? 'none'}`);

        let isNewLead = false;
        if (!lead) {
          const lockKey = `${userId}:${normalizedSender}`;
          if (leadCreationInProgress.has(lockKey)) {
            await new Promise(r => setTimeout(r, 400));
            const { data: fresh } = await supabase.from('leads')
              .select('id, phone, status, notes, auto_reply_enabled')
              .eq('user_id', userId).not('phone', 'is', null);
            lead = (fresh || []).find((l: any) => phonesMatch(l.phone, senderDigits));
          } else {
            leadCreationInProgress.add(lockKey);
            try {
              const displayPhone = `+${normalizedSender}`;
              const { data: newLead } = await supabase.from('leads').insert([{
                user_id: userId,
                phone: normalizedSender,
                company_name: displayPhone,
                source: 'WhatsApp Gelen',
                status: 'new',
                score: 50,
              }]).select().single();
              lead = newLead;
              isNewLead = true;
              console.log(`[WA-GW] New lead from unknown WA sender: ${displayPhone}`);
            } finally {
              leadCreationInProgress.delete(lockKey);
            }
          }
        }

        if (!lead) return;
        savedLead = lead;

        if (isNewLead) {
          setTimeout(() => deduplicatePhoneLeads(userId, supabase).catch(() => {}), 300);
        }

        // Mesajı kaydet
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
          incomingStats.errors++;
          console.error(`[WA-GW] Message insert error: ${msgErr.message} (lead=${lead.id})`);
        } else {
          incomingStats.saved++;
          console.log(`[WA-GW] ✓ Mesaj kaydedildi: ${senderPhone} → lead ${lead.id}`);

          try {
            const { ssePush } = require('./sseHub');
            ssePush(userId, 'new_message', {
              leadId: lead.id,
              content: content || '[Medya]',
              sentAt,
              direction: 'in',
              channel: 'whatsapp',
              senderPhone: normalizedSender,
            });
          } catch { }

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
          } catch (campErr: any) {
            console.error('[WA-GW] Campaign reply count error:', campErr.message);
          }
        }

        // ── Keyword detection + durum güncellemesi ────────────────────────────
        let newStatus = lead.status;
        if (/^stop$/i.test(content.trim())) {
          newStatus = 'lost';
          await supabase.from('leads').update({
            status: 'lost',
            last_contacted_at: new Date().toISOString(),
            notes: 'STOP komutu — iletişim listesinden çıkarıldı',
          }).eq('id', lead.id);
          console.log(`[WA-GW] STOP received from ${senderPhone}`);
        } else if (!['won', 'lost'].includes(lead.status || '')) {
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
            last_contacted_at: new Date().toISOString(),
          }).eq('id', lead.id);
        }

        finalStatus = newStatus;

        try {
          const { ssePush } = require('./sseHub');
          ssePush(userId, 'lead_update', { leadId: lead.id, status: newStatus });
        } catch { }

        if (['won', 'lost'].includes(newStatus)) return;

        // ── Auto-reply ────────────────────────────────────────────────────────
        try {
          const { data: userSettings } = await supabase.from('user_settings')
            .select('auto_reply_enabled, company_name')
            .eq('user_id', userId).maybeSingle();

          if (!userSettings?.auto_reply_enabled) return;

          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { data: recentOut } = await supabase.from('messages')
            .select('id').eq('lead_id', lead.id).eq('direction', 'out')
            .gte('sent_at', fiveMinAgo).limit(1);
          if (recentOut?.length) return;

          const { data: history } = await supabase.from('messages')
            .select('direction, content, sent_at')
            .eq('lead_id', lead.id).eq('channel', 'whatsapp')
            .order('sent_at', { ascending: false }).limit(20);

          const conversationMessages = (history || []).reverse().map((m: any) => ({
            role: m.direction === 'out' ? 'assistant' : 'user',
            content: m.content,
          }));

          if (!conversationMessages.length ||
              conversationMessages[conversationMessages.length - 1].role !== 'user') {
            conversationMessages.push({ role: 'user', content: content || '[Medya]' });
          }

          const Anthropic = require('@anthropic-ai/sdk');
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

          const aiResponse = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            system: `Sen ${userSettings.company_name || 'şirketin'} müşteri temsilcisisin.
WhatsApp'tan gelen müşteri mesajlarına doğal, samimi, kısa Türkçe yanıt ver.
- Kendini AI olarak tanıtma; normal bir temsilci gibi davran
- Maksimum 3-4 cümle, doğal konuş
- Fiyat sorarsa: "size özel fiyat için sizi arayacağız" de
- Sipariş için: "detaylar için en kısa sürede sizinle iletişime geçeceğiz" de
- ASLA uydurma fiyat veya ürün bilgisi verme
- Konuşma geçmişini dikkate al, aynı şeyi tekrar sorma`,
            messages: conversationMessages,
          });

          const replyText = (aiResponse.content[0] as any)?.text || '';
          if (!replyText) return;

          const liveEntry = instances.get(instanceId);
          if (!liveEntry || liveEntry.status !== 'connected') return;

          // whatsapp-web.js ile gönderim
          await liveEntry.client.sendMessage(from, replyText);

          await supabase.from('messages').insert([{
            lead_id: lead.id,
            user_id: userId,
            channel: 'whatsapp',
            direction: 'out',
            content: replyText,
            status: 'sent',
            sent_at: new Date().toISOString(),
            read: true,
          }]);

          console.log(`[WA-GW] Auto-reply → ${senderPhone}: "${replyText.slice(0, 60)}"`);
        } catch (autoErr: any) {
          console.error(`[WA-GW] Auto-reply error:`, autoErr.message);
        }

      } catch (e: any) {
        console.error(`[WA-GW] Incoming handler error:`, e.message);
      }
    });

    await client.initialize();

  } catch (e: any) {
    console.error(`[WA-GW] createWWebInstance error (${instanceId}):`, e.message);
    const entry = instances.get(instanceId);
    if (entry) entry.status = 'disconnected';
    const attempts = (reconnectAttempts.get(instanceId) || 0) + 1;
    reconnectAttempts.set(instanceId, attempts);
    if (attempts <= 5) {
      const delay = Math.min(5000 * attempts, 30_000);
      console.log(`[WA-GW] createWWebInstance crash — retry ${attempts} in ${delay / 1000}s`);
      setTimeout(() => createWWebInstance(instanceId, userId, onQR, onConnected, onDisconnected), delay);
    } else {
      console.error(`[WA-GW] Max retries (5) reached for ${instanceId}`);
      reconnectAttempts.delete(instanceId);
      instances.delete(instanceId);
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function restoreConnectedInstances(): Promise<void> {
  try {
    await ensureSessionBucket();

    const { data: connected } = await supabase.from('wa_instances')
      .select('instance_id, user_id, phone, connected_at')
      .eq('status', 'connected')
      .order('connected_at', { ascending: false });
    if (!connected?.length) return;

    const seen = new Set<string>();
    const toRestore: any[] = [];
    for (const inst of connected) {
      if (!inst.phone) {
        await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', inst.instance_id);
        continue;
      }
      if (!seen.has(inst.phone)) {
        seen.add(inst.phone);
        toRestore.push(inst);
      } else {
        await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', inst.instance_id);
      }
    }

    console.log(`[WA-GW] Restoring ${toRestore.length} instance(s)...`);
    for (const inst of toRestore) {
      // RemoteAuth session restore otomatik yapar (store.extract çağırır)
      // Session yoksa QR gösterir — biz sadece instance'ı başlatırız
      console.log(`[WA-GW] Starting instance: ${inst.instance_id}`);
      await createWWebInstance(inst.instance_id, inst.user_id);
    }
  } catch (e: any) {
    console.error('[WA-GW] restoreConnectedInstances error:', e.message);
  }
}

// Yeni instance başlat + QR döndür (veya session varsa null döner, onConnected tetikler)
export async function startNewInstance(instanceId: string, userId: string): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (qr: string | null) => {
      if (!resolved) { resolved = true; resolve(qr); }
    };

    // Chromium başlaması Baileys'tan daha uzun sürer
    const timeout = setTimeout(() => finish(null), 60_000);

    createWWebInstance(
      instanceId,
      userId,
      (qr) => { clearTimeout(timeout); finish(qr); },
      () => { clearTimeout(timeout); finish(null); }, // session restore → direkt bağlandı
      () => { clearTimeout(timeout); finish(null); },
    );
  });
}

// Mesaj gönder
export async function sendMessage(instanceId: string, phone: string, message: string): Promise<void> {
  const entry = instances.get(instanceId);
  if (!entry || entry.status !== 'connected') {
    throw new Error(`WA-GW instance not ready: ${instanceId}`);
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
    : cleanPhone.startsWith('0') ? '9' + cleanPhone
    : '90' + cleanPhone;
  // whatsapp-web.js @c.us kullanır (Baileys @s.whatsapp.net kullanıyordu)
  const chatId = `${formattedPhone}@c.us`;
  await entry.client.sendMessage(chatId, message);
}

export function getQR(instanceId: string): string | null {
  return instances.get(instanceId)?.qr || null;
}

export function getStatus(instanceId: string): string {
  return instances.get(instanceId)?.status || 'not_found';
}

export function listInstances(): Array<{ instanceId: string; status: string; phone: string | null }> {
  return Array.from(instances.entries()).map(([id, e]) => ({
    instanceId: id, status: e.status, phone: e.phone,
  }));
}

// Heartbeat: DB'de 'connected' ama bellekte olmayan/kopuk instance'ları kurtarır
export async function heartbeatReconnect(): Promise<void> {
  try {
    const { data: dbInstances } = await supabase.from('wa_instances')
      .select('instance_id, user_id, phone').eq('status', 'connected');
    if (!dbInstances?.length) return;

    for (const inst of dbInstances) {
      const inMem = instances.get(inst.instance_id);

      if (!inMem || inMem.status === 'disconnected') {
        const attempts = reconnectAttempts.get(inst.instance_id) || 0;
        if (attempts > 0) continue;
        console.log(`[WA-GW] Heartbeat: ${inst.instance_id} bellekte yok — yeniden bağlanılıyor`);
        await createWWebInstance(inst.instance_id, inst.user_id);
        continue;
      }

      if (inMem.status === 'connected') {
        let forceReconnect = false;
        let reconnectReason = '';

        // whatsapp-web.js client state kontrolü
        try {
          const state = await inMem.client.getState();
          if (state !== 'CONNECTED') {
            forceReconnect = true;
            reconnectReason = `client state: ${state}`;
          }
        } catch (pingErr: any) {
          forceReconnect = true;
          reconnectReason = `getState failed: ${pingErr.message}`;
        }

        // Zombie socket: 20+ dakikadır hiç mesaj alınmadıysa
        if (!forceReconnect && inMem.lastIncomingAt) {
          const silentMs = Date.now() - inMem.lastIncomingAt;
          if (silentMs > 20 * 60 * 1000) {
            forceReconnect = true;
            reconnectReason = `no incoming for ${Math.round(silentMs / 60000)}min`;
          }
        }

        if (forceReconnect) {
          console.warn(`[WA-GW] Heartbeat force reconnect ${inst.instance_id}: ${reconnectReason}`);
          inMem.status = 'disconnected';
          if (inMem.backupTimer) { clearInterval(inMem.backupTimer); inMem.backupTimer = undefined; }
          try { await inMem.client.destroy(); } catch {}
          const attempts = (reconnectAttempts.get(inst.instance_id) || 0) + 1;
          reconnectAttempts.set(inst.instance_id, attempts);
          const delay = Math.min(2000 * Math.pow(2, attempts - 1), 15_000);
          setTimeout(() => createWWebInstance(inst.instance_id, inst.user_id), delay);
        }
      }
    }
  } catch (e: any) {
    console.error('[WA-GW] Heartbeat error:', e.message);
  }
}

// Kullanıcının tüm instance'larını zorla yeniden başlat
export async function forceReconnectUser(userId: string): Promise<number> {
  let restarted = 0;
  for (const [instanceId, inst] of instances.entries()) {
    if (inst.userId !== userId) continue;
    console.log(`[WA-GW] Force reconnect: ${instanceId}`);
    inst.status = 'disconnected';
    inst.lastIncomingAt = undefined;
    if (inst.backupTimer) { clearInterval(inst.backupTimer); inst.backupTimer = undefined; }
    try { await inst.client?.destroy?.(); } catch {}
    instances.delete(instanceId);
    reconnectAttempts.delete(instanceId);
    setTimeout(() => createWWebInstance(instanceId, userId), 500 * restarted);
    restarted++;
  }
  return restarted;
}
