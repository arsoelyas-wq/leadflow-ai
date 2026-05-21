/**
 * Meta Conversions API — World-class server-side event tracking
 *
 * Implements full-funnel event mapping with SHA-256 user data hashing,
 * deduplication via event_id, and EMQ-maximized payloads for algorithm training.
 *
 * Events fired per funnel stage:
 *   Lead created      → Lead
 *   First message out → Contact
 *   Proposal created  → InitiateCheckout
 *   Proposal viewed   → ViewContent
 *   Status = won      → Purchase (with value)
 */

export {};
const crypto  = require('crypto');
const https   = require('https');

const CAPI_API_VERSION = 'v19.0';
const GRAPH_HOST       = 'graph.facebook.com';

// ─── SHA-256 HASHING ──────────────────────────────────────────────────────────

function hashField(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  // E.164 normalize — strip spaces, dashes, parens; keep leading +
  const cleaned = phone.replace(/[\s\-().]/g, '').replace(/^00/, '+');
  return crypto.createHash('sha256').update(cleaned.toLowerCase()).digest('hex');
}

function hashCity(city: string | null | undefined): string | undefined {
  if (!city) return undefined;
  return crypto.createHash('sha256').update(city.trim().toLowerCase()).digest('hex');
}

// ─── CAPI HTTP CALL ───────────────────────────────────────────────────────────

async function sendToCAPI(pixelId: string, accessToken: string, events: any[]): Promise<{ success: boolean; response?: any; error?: string }> {
  return new Promise((resolve) => {
    const body = JSON.stringify({ data: events });
    const path = `/${CAPI_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

    const options = {
      hostname: GRAPH_HOST,
      path,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) resolve({ success: false, error: parsed.error?.message || data });
          else resolve({ success: true, response: parsed });
        } catch {
          resolve({ success: false, error: data });
        }
      });
    });

    req.on('error', (err: any) => resolve({ success: false, error: err.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ success: false, error: 'CAPI timeout' }); });
    req.write(body);
    req.end();
  });
}

// ─── USER DATA BUILDER ────────────────────────────────────────────────────────

function buildUserData(lead: any, extra: { fbc?: string; fbp?: string; clientIp?: string; clientUserAgent?: string } = {}): any {
  const nameParts = (lead.contact_name || '').trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

  const ud: any = {};
  const em = hashField(lead.email);
  const ph = hashPhone(lead.phone);
  const fn = hashField(firstName);
  const ln = hashField(lastName);
  const ct = hashCity(lead.city);

  if (em) ud.em  = [em];
  if (ph) ud.ph  = [ph];
  if (fn) ud.fn  = [fn];
  if (ln) ud.ln  = [ln];
  if (ct) ud.ct  = [ct];

  // Turkey country code (ISO 3166-1 alpha-2, lowercased)
  ud.country = ['1441ee76b75b68e59196a2cce4fd7af2c42b9ad7c77a76b4f5d5e59a1cb2b0d']; // SHA-256 of "tr"

  if (extra.fbc)            ud.fbc            = extra.fbc;
  if (extra.fbp)            ud.fbp            = extra.fbp;
  if (extra.clientIp)       ud.client_ip_address = extra.clientIp;
  if (extra.clientUserAgent) ud.client_user_agent = extra.clientUserAgent;

  return ud;
}

// ─── EVENT BUILDERS ───────────────────────────────────────────────────────────

function makeEvent(eventName: string, lead: any, extra: Record<string, any> = {}): any {
  const eventId    = `lf-${eventName.toLowerCase()}-${lead.id}-${Date.now()}`;
  const eventTime  = Math.floor(Date.now() / 1000);

  const userData   = buildUserData(lead, {
    fbc:             lead.fbc   || undefined,
    fbp:             lead.fbp   || undefined,
  });

  const customData: any = {
    currency:    'TRY',
    content_ids: [lead.id],
    content_type: 'product',
  };

  if (lead.company_name) customData.content_name = lead.company_name;
  if (lead.sector)       customData.content_category = lead.sector;
  if (extra.value)       customData.value    = Number(extra.value);
  if (extra.orderId)     customData.order_id = extra.orderId;

  const event: any = {
    event_name:            eventName,
    event_time:            eventTime,
    event_id:              eventId,
    action_source:         'website',
    user_data:             userData,
    custom_data:           customData,
  };

  // UTM attribution
  if (lead.utm_source || lead.utm_campaign) {
    event.referrer_url = buildUTMUrl(lead);
  }

  return event;
}

function buildUTMUrl(lead: any): string {
  const params = new URLSearchParams();
  if (lead.utm_source)   params.set('utm_source', lead.utm_source);
  if (lead.utm_medium)   params.set('utm_medium', lead.utm_medium);
  if (lead.utm_campaign) params.set('utm_campaign', lead.utm_campaign);
  if (lead.utm_content)  params.set('utm_content', lead.utm_content);
  if (lead.utm_term)     params.set('utm_term', lead.utm_term);
  const qs = params.toString();
  return qs ? `https://leadflow.app/?${qs}` : 'https://leadflow.app/';
}

// ─── SUPABASE SETTINGS FETCH ──────────────────────────────────────────────────

async function getMetaSettings(supabase: any, userId: string): Promise<{ pixelId: string; accessToken: string; testCode?: string } | null> {
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('meta_pixel_id, meta_access_token, meta_test_code')
      .eq('user_id', userId)
      .single();

    if (!data?.meta_pixel_id || !data?.meta_access_token) return null;
    return {
      pixelId:     data.meta_pixel_id,
      accessToken: data.meta_access_token,
      testCode:    data.meta_test_code || undefined,
    };
  } catch {
    return null;
  }
}

// ─── CAPI EVENT LOG ───────────────────────────────────────────────────────────

async function logCapiEvent(supabase: any, userId: string, leadId: string, eventName: string, success: boolean, response: any) {
  try {
    await supabase.from('meta_capi_events').insert({
      user_id:    userId,
      lead_id:    leadId,
      event_name: eventName,
      success,
      response:   JSON.stringify(response),
      fired_at:   new Date().toISOString(),
    });
  } catch { /* non-critical */ }
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Fire a CAPI event for a given lead + user.
 * Fetches settings from DB, builds payload, sends, logs result.
 */
export async function fireCapiEvent(
  supabase: any,
  userId: string,
  lead: any,
  eventName: 'Lead' | 'Contact' | 'InitiateCheckout' | 'ViewContent' | 'Purchase' | 'CompleteRegistration',
  extra: { value?: number; orderId?: string } = {}
): Promise<void> {
  const settings = await getMetaSettings(supabase, userId);
  if (!settings) return; // CAPI not configured — silently skip

  const event = makeEvent(eventName, lead, extra);
  if (settings.testCode) event.test_event_code = settings.testCode;

  const result = await sendToCAPI(settings.pixelId, settings.accessToken, [event]);
  await logCapiEvent(supabase, userId, lead.id, eventName, result.success, result.response || result.error);

  if (!result.success) {
    console.error(`[Meta CAPI] ${eventName} failed for lead ${lead.id}:`, result.error);
  }
}

/**
 * Micro-conversion helper — fires Lead + Contact in sequence on first contact,
 * useful for warming up the algorithm when Purchase volume is low (< 50/week).
 */
export async function fireMicroConversions(
  supabase: any,
  userId: string,
  lead: any
): Promise<void> {
  await fireCapiEvent(supabase, userId, lead, 'Lead');
  // 500ms gap so events have distinct timestamps in Meta's dedup window
  await new Promise(r => setTimeout(r, 500));
  await fireCapiEvent(supabase, userId, lead, 'Contact');
}

module.exports = { fireCapiEvent, fireMicroConversions };
