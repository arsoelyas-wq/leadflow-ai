export {};
const axios = require('axios');

const PARTNER_API = 'https://api.green-api.com';
const WEBHOOK_URL = () =>
  `${process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app'}/api/green-api/inbound`;

function partnerToken(): string {
  const t = process.env.GREEN_API_PARTNER_TOKEN || '';
  if (!t) throw new Error('GREEN_API_PARTNER_TOKEN Railway ortam değişkeni ayarlanmamış. green-api.com → Hesap → Partner Token');
  return t;
}

// ── Instance oluştur ───────────────────────────────────────────────────────────
// green-api.com partner hesabı gerektirir
export async function createInstance(): Promise<{
  idInstance: number;
  apiTokenInstance: string;
  apiUrl: string;
}> {
  const r = await axios.post(`${PARTNER_API}/partner/createInstance/${partnerToken()}`);
  const id = r.data.idInstance;
  const prefix = String(id).slice(0, 4); // örn: 7107 → 7107.api.greenapi.com
  return {
    idInstance: id,
    apiTokenInstance: r.data.apiTokenInstance,
    apiUrl: r.data.apiUrl || `https://${prefix}.api.greenapi.com`,
  };
}

// ── QR kodu getir ──────────────────────────────────────────────────────────────
// Dönüş: "data:image/png;base64,..." | "authorized" | null
export async function getQR(apiUrl: string, idInstance: number, apiToken: string): Promise<string | null> {
  try {
    const r = await axios.get(`${apiUrl}/waInstance${idInstance}/qr/${apiToken}`, { timeout: 10000 });
    if (r.data.type === 'qrCode') return r.data.message;      // base64 data URL
    if (r.data.type === 'alreadyLogged') return 'authorized'; // zaten bağlı
    return null;
  } catch {
    return null;
  }
}

// ── Bağlantı durumu ────────────────────────────────────────────────────────────
// Dönüş: "authorized" | "notAuthorized" | "yellowCard" | "blocked" | "starting" | "error"
export async function getStatus(apiUrl: string, idInstance: number, apiToken: string): Promise<string> {
  try {
    const r = await axios.get(`${apiUrl}/waInstance${idInstance}/getStateInstance/${apiToken}`, { timeout: 8000 });
    return r.data.stateInstance || 'unknown';
  } catch {
    return 'error';
  }
}

// ── WhatsApp numarası al (bağlı olduğunda) ────────────────────────────────────
export async function getPhone(apiUrl: string, idInstance: number, apiToken: string): Promise<string | null> {
  try {
    const r = await axios.get(`${apiUrl}/waInstance${idInstance}/getWaSettings/${apiToken}`, { timeout: 8000 });
    const wid: string = r.data.wid || '';
    return wid.replace('@c.us', '').replace(/\D/g, '') || null;
  } catch {
    return null;
  }
}

// ── Webhook + ayarları yapılandır ──────────────────────────────────────────────
export async function configureWebhook(apiUrl: string, idInstance: number, apiToken: string): Promise<void> {
  await axios.post(`${apiUrl}/waInstance${idInstance}/setSettings/${apiToken}`, {
    webhookUrl: WEBHOOK_URL(),
    incomingWebhook: 'yes',
    outgoingWebhook: 'no',
    deviceStatusWebhook: 'no',
    stateWebhook: 'yes',
    markIncomingMessagesReaded: 'no',
  }, { timeout: 10000 });
}

// ── Instance sil ───────────────────────────────────────────────────────────────
export async function deleteInstance(idInstance: number): Promise<void> {
  try {
    await axios.post(`${PARTNER_API}/partner/deleteInstance/${partnerToken()}`, { idInstance }, { timeout: 10000 });
  } catch (e: any) {
    console.warn(`[Green-API] Instance silinirken hata: ${e.message}`);
  }
}

// ── Çıkış yap (QR sıfırla) ────────────────────────────────────────────────────
export async function logoutInstance(apiUrl: string, idInstance: number, apiToken: string): Promise<void> {
  try {
    await axios.get(`${apiUrl}/waInstance${idInstance}/logout/${apiToken}`, { timeout: 10000 });
  } catch {}
}

// ── Mesaj gönder ───────────────────────────────────────────────────────────────
export async function sendMessage(apiUrl: string, idInstance: number, apiToken: string, phone: string, text: string): Promise<void> {
  const chatId = phone.endsWith('@c.us') ? phone : `${phone}@c.us`;
  await axios.post(`${apiUrl}/waInstance${idInstance}/sendMessage/${apiToken}`, {
    chatId,
    message: text,
  }, { timeout: 15000 });
}
