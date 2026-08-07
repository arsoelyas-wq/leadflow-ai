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

function authDir(instanceId: string): string {
  const base = process.env.WA_AUTH_DIR || '/tmp';
  const dir = path.join(base, 'gw_auth', instanceId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Supabase Storage'a oturum yedekle
async function backupSession(instanceId: string): Promise<void> {
  try {
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

    await supabase.storage
      .from('wa-sessions')
      .upload(`${instanceId}.json`, buf, {
        contentType: 'application/json',
        upsert: true,
      });
  } catch (e: any) {
    console.log(`[WA-GW] Backup failed for ${instanceId}:`, e.message);
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
      await backupSession(instanceId);
    });

    // ── Gelen mesajları kaydet ──────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages: incomingMsgs, type }: any) => {
      if (type !== 'notify') return; // Geçmiş mesajları atla

      for (const msg of incomingMsgs) {
        if (msg.key?.fromMe === true) continue; // Kendi gönderdiğimizi atla

        const remoteJid = msg.key?.remoteJid || '';
        if (!remoteJid.endsWith('@s.whatsapp.net')) continue; // Grup/broadcast atla

        const senderPhone = remoteJid.replace('@s.whatsapp.net', '');
        const senderDigits = senderPhone.replace(/\D/g, '');
        if (!senderDigits || senderDigits.length < 7) continue;

        const senderLast10 = senderDigits.slice(-10);

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

        try {
          // Tüm leadleri al — uygulama katmanında eşleştir (tüm formatları kapsar:
          // "05524901688", "0552 490 16 88", "905524901688", "+905524901688")
          const { data: allLeads } = await supabase
            .from('leads')
            .select('id, phone, status')
            .eq('user_id', userId)
            .not('phone', 'is', null);

          let lead: any = (allLeads || []).find((l: any) => {
            const digits = (l.phone || '').replace(/\D/g, '');
            return digits.length >= 7 && digits.slice(-10) === senderLast10;
          });

          if (!lead) {
            // Tanınmayan kişi → yeni lead oluştur
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

          const { error: msgErr } = await supabase.from('messages').insert([{
            lead_id: lead.id,
            user_id: userId,
            channel: 'whatsapp',
            direction: 'in',
            content: content || '[Medya]',
            status: 'received',
            sent_at: sentAt,
            read: false,
          }]);
          if (msgErr) console.error(`[WA-GW] Message insert error:`, msgErr.message);

          // Lead durumunu güncelle
          if (!['won', 'lost'].includes(lead.status || '')) {
            await supabase.from('leads').update({
              status: lead.status === 'new' ? 'replied' : lead.status,
              last_contacted_at: new Date().toISOString(),
            }).eq('id', lead.id);
          }

          console.log(`[WA-GW] ✓ Saved incoming: ${senderPhone} → ${lead.id} "${content.slice(0, 40)}"`);
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

        // Sync wa_numbers
        const { data: waNum } = await supabase.from('wa_numbers')
          .select('id').eq('user_id', userId).eq('status', 'connecting')
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (waNum) {
          await supabase.from('wa_numbers').update({
            status: 'connected', phone_number: phone,
          }).eq('id', waNum.id);
        } else {
          // Update already connected number if phone changed
          await supabase.from('wa_numbers').update({
            phone_number: phone,
          }).eq('user_id', userId).eq('status', 'connected');
        }

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
    const { data: connected } = await supabase.from('wa_instances')
      .select('instance_id, user_id, phone, connected_at')
      .eq('status', 'connected')
      .order('connected_at', { ascending: false }); // En son bağlananı önce al
    if (!connected?.length) return;

    // Aynı telefona birden fazla instance varsa sadece en son bağlananı restore et
    const seen = new Set<string>();
    const toRestore: any[] = [];
    for (const inst of connected) {
      const key = inst.phone || inst.instance_id;
      if (!seen.has(key)) {
        seen.add(key);
        toRestore.push(inst);
      } else {
        // Duplicate — DB'de disconnected yap
        console.log(`[WA-GW] Duplicate instance for phone ${inst.phone} — skipping ${inst.instance_id}`);
        await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', inst.instance_id);
      }
    }

    console.log(`[WA-GW] Restoring ${toRestore.length} unique instance(s) (${connected.length} total in DB)...`);
    for (const inst of toRestore) {
      const restored = await restoreSession(inst.instance_id);
      if (restored) {
        await createBaileysInstance(inst.instance_id, inst.user_id);
      } else {
        console.log(`[WA-GW] No session backup for ${inst.instance_id} — marking disconnected`);
        await supabase.from('wa_instances').update({ status: 'disconnected' }).eq('instance_id', inst.instance_id);
        await supabase.from('wa_numbers').update({ status: 'disconnected' }).eq('user_id', inst.user_id).eq('status', 'connected');
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
