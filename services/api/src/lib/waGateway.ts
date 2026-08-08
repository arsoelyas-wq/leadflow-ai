export {};
// Embedded WhatsApp Gateway — Baileys + Supabase session persistence
// Replaces external gateway at 207.154.248.119:3003

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

interface GatewayInstance {
  sock: any;
  status: 'creating' | 'qr_ready' | 'connected' | 'disconnected';
  qr: string | null;
  phone: string | null;
  userId: string;
}

const instances: Map<string, GatewayInstance> = new Map();

// wa-sessions bucket'ının varlığını garantile (Railway deploy'larında sıfırdan yaratılır)
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
        fileSizeLimit: 5 * 1024 * 1024, // 5MB — session dosyaları küçük
      });
      if (createErr && !createErr.message.includes('already exists')) throw createErr;
      console.log('[WA-GW] wa-sessions storage bucket oluşturuldu');
    }
    sessionBucketReady = true;
  } catch (e: any) {
    console.error('[WA-GW] ensureSessionBucket error:', e.message);
  }
}

function authDir(instanceId: string): string {
  const base = process.env.WA_AUTH_DIR || '/tmp';
  const dir = path.join(base, 'gw_auth', instanceId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Supabase Storage'a oturum yedekle
async function backupSession(instanceId: string): Promise<void> {
  try {
    await ensureSessionBucket();
    const dir = authDir(instanceId);
    const files = fs.readdirSync(dir);
    const sessionData: Record<string, any> = {};
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(dir, f), 'utf8');
        sessionData[f] = JSON.parse(content);
      } catch {}
    }
    if (Object.keys(sessionData).length === 0) return;

    const jsonStr = JSON.stringify(sessionData);
    const buf = Buffer.from(jsonStr, 'utf8');

    const { error } = await supabase.storage
      .from('wa-sessions')
      .upload(`${instanceId}.json`, buf, {
        contentType: 'application/json',
        upsert: true,
      });
    if (error) throw error;
    console.log(`[WA-GW] Session backed up: ${instanceId}`);
  } catch (e: any) {
    console.error(`[WA-GW] Backup failed for ${instanceId}:`, e.message);
  }
}

// Supabase Storage'dan oturum geri yükle
async function restoreSession(instanceId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('wa-sessions')
      .download(`${instanceId}.json`);
    if (error || !data) return false;

    const text = await data.text();
    const sessionData = JSON.parse(text);
    const dir = authDir(instanceId);

    for (const [filename, content] of Object.entries(sessionData)) {
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(content));
    }
    console.log(`[WA-GW] Session restored for ${instanceId}`);
    return true;
  } catch {
    return false;
  }
}

async function createBaileysInstance(
  instanceId: string,
  userId: string,
  onQR?: (qr: string) => void,
  onConnected?: (phone: string) => void,
  onDisconnected?: () => void,
): Promise<void> {
  try {
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default;
    const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = baileys;
    const pino = require('pino');

    const dir = authDir(instanceId);
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['LeadFlow AI', 'Chrome', '1.0.0'],
    });

    const entry: GatewayInstance = { sock, status: 'creating', qr: null, phone: null, userId };
    instances.set(instanceId, entry);

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      await backupSession(instanceId); // Creds değişince hemen yedekle
    });

    // ── Gelen mesajları kaydet + keyword detection + auto-reply ────────────────
    sock.ev.on('messages.upsert', async ({ messages: incomingMsgs, type }: any) => {
      // 'notify' = gerçek zamanlı, 'append' = offline dönemde gelen (Railway restart sonrası)
      // Her iki tip için de işle — ama 'append'de sadece son 24 saatteki mesajları al
      if (type !== 'notify' && type !== 'append') return;

      for (const msg of incomingMsgs) {
        if (msg.key?.fromMe === true) continue;

        // 'append' tipinde 24 saatten eski mesajları atla
        if (type === 'append' && msg.messageTimestamp) {
          const ageMs = Date.now() - Number(msg.messageTimestamp) * 1000;
          if (ageMs > 24 * 60 * 60 * 1000) continue;
        }

        const remoteJid = msg.key?.remoteJid || '';
        if (!remoteJid.endsWith('@s.whatsapp.net')) continue;

        const senderPhone = remoteJid.replace('@s.whatsapp.net', '');
        const senderDigits = senderPhone.replace(/\D/g, '');
        if (!senderDigits || senderDigits.length < 7) continue;

        const senderLast10 = senderDigits.slice(-10);
        const waJid = `${senderDigits.startsWith('90') ? senderDigits : '90' + senderDigits.slice(-10)}@s.whatsapp.net`;

        // Tüm mesaj tiplerinden içerik çıkar
        const msgBody = msg.message;
        const content = msgBody?.conversation
          || msgBody?.extendedTextMessage?.text
          || msgBody?.imageMessage?.caption
          || msgBody?.videoMessage?.caption
          || msgBody?.documentMessage?.caption
          || msgBody?.buttonsResponseMessage?.selectedDisplayText
          || msgBody?.listResponseMessage?.title
          || msgBody?.templateMessage?.hydratedTemplate?.hydratedContentText
          || '';

        const sentAt = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString();

        console.log(`[WA-GW] Incoming from ${senderPhone}`);

        let savedLead: any = null;
        let finalStatus = '';

        try {
          // Tüm leadleri al — uygulama katmanında eşleştir
          // (boşluklu/+90/05xx formatları dahil her türlü saklama biçimini kapsar)
          const { data: allLeads } = await supabase
            .from('leads')
            .select('id, phone, status, notes')
            .eq('user_id', userId)
            .not('phone', 'is', null);

          let lead: any = (allLeads || []).find((l: any) => {
            const digits = (l.phone || '').replace(/\D/g, '');
            return digits.length >= 7 && digits.slice(-10) === senderLast10;
          });

          if (!lead) {
            const displayPhone = `+${senderDigits.startsWith('90') ? senderDigits : '90' + senderDigits.slice(-10)}`;
            const { data: newLead } = await supabase.from('leads').insert([{
              user_id: userId,
              phone: senderDigits,
              company_name: displayPhone,
              source: 'WhatsApp Gelen',
              status: 'new',
              score: 50,
            }]).select().single();
            lead = newLead;
            console.log(`[WA-GW] New lead from unknown WA sender: ${displayPhone}`);
          }

          if (!lead) continue;
          savedLead = lead;

          const waMessageId = msg.key?.id || null;

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
            console.error(`[WA-GW] Message insert error: ${msgErr.message} (lead=${lead.id}, from=${senderPhone})`);
          } else {
            console.log(`[WA-GW] ✓ Mesaj DB'ye kaydedildi: ${senderPhone} → lead ${lead.id}`);
          }

          // ── Keyword detection + durum güncellemesi ────────────────────────
          let newStatus = lead.status;
          if (/^stop$/i.test(content.trim())) {
            // STOP komutu → blacklist
            newStatus = 'lost';
            await supabase.from('leads').update({
              status: 'lost',
              last_contacted_at: new Date().toISOString(),
              notes: 'STOP komutu — iletişim listesinden çıkarıldı',
            }).eq('id', lead.id);
            console.log(`[WA-GW] STOP received from ${senderPhone} — lead marked lost`);
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
          console.log(`[WA-GW] ✓ Saved incoming: ${senderPhone} → lead ${lead.id} status=${newStatus} "${content.slice(0, 40)}"`);

          // ── Auto-reply — won/lost/STOP durumunda gönderme ────────────────
          if (['won', 'lost'].includes(newStatus)) continue;

          try {
            const { data: userSettings } = await supabase
              .from('user_settings')
              .select('auto_reply_enabled, company_name')
              .eq('user_id', userId)
              .maybeSingle();

            if (!userSettings?.auto_reply_enabled) continue; // kullanıcı devre dışı bırakmış

            // Spam önleme — son 5 dk içinde bu lead'e yanıt verdik mi?
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data: recentOut } = await supabase
              .from('messages')
              .select('id')
              .eq('lead_id', lead.id)
              .eq('direction', 'out')
              .gte('sent_at', fiveMinAgo)
              .limit(1);

            if (recentOut?.length) continue; // çok yakın zamanda zaten cevap verdik

            // Son 20 mesajı çek — konuşma bağlamı için
            const { data: history } = await supabase
              .from('messages')
              .select('direction, content, sent_at')
              .eq('lead_id', lead.id)
              .eq('channel', 'whatsapp')
              .order('sent_at', { ascending: false })
              .limit(20);

            const conversationMessages = (history || []).reverse().map((m: any) => ({
              role: m.direction === 'out' ? 'assistant' : 'user',
              content: m.content,
            }));

            // Konuşma user mesajıyla bitmeli
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
            if (!replyText) continue;

            // Gönderim için her zaman güncel (live) instance soketini kullan
            const liveEntry = instances.get(instanceId);
            if (!liveEntry || liveEntry.status !== 'connected') continue;

            await liveEntry.sock.sendMessage(waJid, { text: replyText });

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
      }
    });

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrcode = require('qrcode');
          const qrDataUrl = await qrcode.toDataURL(qr);
          entry.status = 'qr_ready';
          entry.qr = qrDataUrl;
          if (onQR) onQR(qrDataUrl);
        } catch {}
      }

      if (connection === 'open') {
        const phone = sock.user?.id?.split(':')[0]?.split('@')[0] || '';
        entry.status = 'connected';
        entry.phone = phone;
        entry.qr = null;
        console.log(`[WA-GW] Connected: ${instanceId} → ${phone}`);
        // Bağlantı açılınca session'ı hemen yedekle (creds.update'e ek güvence)
        setTimeout(() => backupSession(instanceId), 2000);

        // Update DB — önce eski duplicate instance'ları temizle
        await supabase.from('wa_instances')
          .update({ status: 'disconnected' })
          .eq('phone', phone)
          .neq('instance_id', instanceId);
        await supabase.from('wa_instances').update({
          status: 'connected',
          phone,
          connected_at: new Date().toISOString(),
        }).eq('instance_id', instanceId);

        // Sync wa_numbers — önce telefon numarasına göre eşleştir (session restore sonrası
        // 'disconnected' olabilir), bulunamazsa 'connecting' veya 'disconnected' any'i seç
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

        if (onConnected) onConnected(phone);
      }

      if (connection === 'close') {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        entry.status = 'disconnected';
        console.log(`[WA-GW] Disconnected: ${instanceId}, code=${code}, reconnect=${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(() => createBaileysInstance(instanceId, userId, onQR, onConnected, onDisconnected), 5000);
        } else {
          instances.delete(instanceId);
          await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', instanceId);
          await supabase.from('wa_numbers').update({ status: 'disconnected' }).eq('user_id', userId).eq('status', 'connected');
          if (onDisconnected) onDisconnected();
        }
      }
    });
  } catch (e: any) {
    console.error(`[WA-GW] createBaileysInstance error (${instanceId}):`, e.message);
  }
}

// API başlarken bağlı instance'ları yeniden başlat
export async function restoreConnectedInstances(): Promise<void> {
  try {
    await ensureSessionBucket(); // Storage bucket'ını garantile

    const { data: connected } = await supabase.from('wa_instances')
      .select('instance_id, user_id, phone, connected_at')
      .eq('status', 'connected')
      .order('connected_at', { ascending: false }); // En son bağlananı önce al
    if (!connected?.length) return;

    // Aynı telefona birden fazla instance varsa sadece en son bağlananı restore et
    const seen = new Set<string>();
    const toRestore: any[] = [];
    for (const inst of connected) {
      if (!inst.phone) {
        // Telefon numarası bilinmeyen instance — dedup yapılamaz, disconnected yap
        console.log(`[WA-GW] Instance ${inst.instance_id} has no phone — marking disconnected`);
        await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', inst.instance_id);
        continue;
      }
      if (!seen.has(inst.phone)) {
        seen.add(inst.phone);
        toRestore.push(inst);
      } else {
        // Aynı telefona bağlı duplicate instance — DB'de disconnected yap
        console.log(`[WA-GW] Duplicate instance for phone ${inst.phone} — skipping ${inst.instance_id}`);
        await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', inst.instance_id);
      }
    }

    console.log(`[WA-GW] Restoring ${toRestore.length} unique instance(s) (${connected.length} total in DB)...`);
    for (const inst of toRestore) {
      const restored = await restoreSession(inst.instance_id);
      if (restored) {
        console.log(`[WA-GW] Session dosyası bulundu — Baileys başlatılıyor: ${inst.instance_id}`);
        await createBaileysInstance(inst.instance_id, inst.user_id);
      } else {
        // Session Storage'da yok — ama auth dizini mevcut olabilir (aynı container restart)
        // Her durumda instance'ı başlat: ya local dosyadan login olur ya QR çıkar
        const dir = authDir(inst.instance_id);
        const hasLocalFiles = fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
        if (hasLocalFiles) {
          console.log(`[WA-GW] Storage yok ama local auth dosyası var — yeniden başlatılıyor: ${inst.instance_id}`);
          await createBaileysInstance(inst.instance_id, inst.user_id);
        } else {
          // Tamamen kayıp — bağlantı kesildi, kullanıcı yeniden QR tarayacak
          console.log(`[WA-GW] Session bulunamadı: ${inst.instance_id} — disconnected`);
          await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', inst.instance_id);
          await supabase.from('wa_numbers').update({ status: 'disconnected' }).eq('user_id', inst.user_id).eq('status', 'connected');
        }
      }
    }
  } catch (e: any) {
    console.error('[WA-GW] restoreConnectedInstances error:', e.message);
  }
}

// Yeni instance oluştur + QR al (wa-numbers /connect için)
export async function startNewInstance(instanceId: string, userId: string): Promise<string | null> {
  return new Promise((resolve) => {
    let qrResolved = false;
    const timeout = setTimeout(() => {
      if (!qrResolved) resolve(null);
    }, 30000);

    createBaileysInstance(
      instanceId,
      userId,
      (qr) => {
        if (!qrResolved) {
          qrResolved = true;
          clearTimeout(timeout);
          resolve(qr);
        }
      },
      () => { clearTimeout(timeout); },
      () => { clearTimeout(timeout); },
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
    : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;
  await entry.sock.sendMessage(`${formattedPhone}@s.whatsapp.net`, { text: message });
}

// QR al
export function getQR(instanceId: string): string | null {
  return instances.get(instanceId)?.qr || null;
}

// Durum al
export function getStatus(instanceId: string): string {
  return instances.get(instanceId)?.status || 'not_found';
}

// Aktif instance listesi (diagnose için)
export function listInstances(): Array<{ instanceId: string; status: string; phone: string | null }> {
  return Array.from(instances.entries()).map(([id, e]) => ({
    instanceId: id, status: e.status, phone: e.phone,
  }));
}

// ── Heartbeat: DB'de 'connected' ama bellekte olmayan instance'ları kurtarır ──
// Her 90 saniyede bir çalışır (index.ts'den çağrılır)
export async function heartbeatReconnect(): Promise<void> {
  try {
    const { data: dbInstances } = await supabase
      .from('wa_instances')
      .select('instance_id, user_id, phone')
      .eq('status', 'connected');

    if (!dbInstances?.length) return;

    for (const inst of dbInstances) {
      const inMem = instances.get(inst.instance_id);
      if (!inMem || inMem.status === 'disconnected') {
        console.log(`[WA-GW] Heartbeat: ${inst.instance_id} bellekte yok — yeniden bağlanılıyor`);
        const restored = await restoreSession(inst.instance_id);
        if (restored || (fs.existsSync(authDir(inst.instance_id)) && fs.readdirSync(authDir(inst.instance_id)).length > 0)) {
          await createBaileysInstance(inst.instance_id, inst.user_id);
        }
      }
    }
  } catch (e: any) {
    console.error('[WA-GW] Heartbeat error:', e.message);
  }
}
