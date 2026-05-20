/**
 * Google Enhanced Conversions — Server-side conversion tracking
 *
 * Google's equivalent of Meta CAPI. Sends hashed user data + gclid to
 * Google Ads API so Smart Bidding (Target CPA/ROAS) learns which ads
 * produce paying customers.
 *
 * API: POST https://googleads.googleapis.com/v17/customers/{CUSTOMER_ID}:uploadClickConversions
 * Auth: Developer Token + OAuth2 access token (from google_ads_connections)
 *
 * Events fired:
 *   Lead created      → LeadFormSubmit
 *   Status = won      → Purchase (with deal value)
 */

export {};
const crypto = require('crypto');
const https  = require('https');

const GADS_API_VERSION = 'v17';
const GADS_HOST        = 'googleads.googleapis.com';

// ─── SHA-256 ──────────────────────────────────────────────────────────────────

function hashField(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  const e164 = phone.replace(/[\s\-().]/g, '').replace(/^00/, '+');
  const normalized = e164.startsWith('+') ? e164 : `+90${e164.replace(/^0/, '')}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// ─── OAUTH TOKEN REFRESH ──────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    });

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.access_token || null);
        } catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// ─── GOOGLE ADS API CALL ──────────────────────────────────────────────────────

async function uploadConversion(
  customerId: string,
  developerToken: string,
  accessToken: string,
  payload: any
): Promise<{ success: boolean; response?: any; error?: string }> {
  return new Promise((resolve) => {
    const body    = JSON.stringify(payload);
    const path    = `/${GADS_API_VERSION}/customers/${customerId.replace(/-/g, '')}:uploadClickConversions`;

    const options = {
      hostname: GADS_HOST,
      path,
      method:   'POST',
      headers:  {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(body),
        'Authorization':   `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    };

    const req = https.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) resolve({ success: false, error: parsed.error?.message || data });
          else resolve({ success: true, response: parsed });
        } catch { resolve({ success: false, error: data }); }
      });
    });

    req.on('error', (err: any) => resolve({ success: false, error: err.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ success: false, error: 'Google API timeout' }); });
    req.write(body);
    req.end();
  });
}

// ─── SETTINGS FETCH ───────────────────────────────────────────────────────────

async function getGoogleSettings(supabase: any, userId: string): Promise<{
  customerId:       string;
  conversionActionId: string;
  developerToken:   string;
  accessToken:      string;
  refreshToken:     string;
} | null> {
  try {
    // CAPI settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_customer_id, google_conversion_action_id, google_capi_enabled')
      .eq('user_id', userId)
      .single();

    if (!settings?.google_capi_enabled || !settings?.google_customer_id || !settings?.google_conversion_action_id) return null;

    // OAuth tokens from existing google_ads_connections table
    const { data: conn } = await supabase
      .from('google_ads_connections')
      .select('access_token, refresh_token, customer_id')
      .eq('user_id', userId)
      .single();

    if (!conn?.refresh_token) return null;

    const customerId    = settings.google_customer_id || conn.customer_id;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
    if (!developerToken || !customerId) return null;

    return {
      customerId,
      conversionActionId: settings.google_conversion_action_id,
      developerToken,
      accessToken:   conn.access_token,
      refreshToken:  conn.refresh_token,
    };
  } catch { return null; }
}

// ─── EVENT LOG ────────────────────────────────────────────────────────────────

async function logGoogleEvent(supabase: any, userId: string, leadId: string, eventName: string, success: boolean, response: any) {
  try {
    await supabase.from('google_capi_events').insert({
      user_id:    userId,
      lead_id:    leadId,
      event_name: eventName,
      success,
      response:   JSON.stringify(response),
      fired_at:   new Date().toISOString(),
    });
  } catch { /* non-critical */ }
}

// ─── FORMAT CONVERSION DATE ───────────────────────────────────────────────────

function conversionDateTime(): string {
  const now = new Date();
  const offset = '+03:00'; // Turkey timezone
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth()+1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours()+3)}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}${offset}`;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export async function fireGoogleConversion(
  supabase:  any,
  userId:    string,
  lead:      any,
  eventType: 'LeadFormSubmit' | 'Purchase',
  extra:     { value?: number } = {}
): Promise<void> {
  const settings = await getGoogleSettings(supabase, userId);
  if (!settings) return;

  // Refresh access token if needed
  let accessToken = settings.accessToken;
  if (!accessToken) {
    accessToken = await refreshAccessToken(settings.refreshToken) || '';
    if (!accessToken) return;
  }

  // Build hashed user identifiers
  const hashedUserIdentifiers: any[] = [];
  const hashedEmail = hashField(lead.email);
  const hashedPhone = hashPhone(lead.phone);
  if (hashedEmail) hashedUserIdentifiers.push({ hashedEmail });
  if (hashedPhone) hashedUserIdentifiers.push({ hashedPhoneNumber: hashedPhone });

  const nameParts  = (lead.contact_name || '').trim().split(/\s+/);
  const firstName  = hashField(nameParts[0]);
  const lastName   = hashField(nameParts.slice(1).join(' '));
  if (firstName || lastName) {
    hashedUserIdentifiers.push({
      addressInfo: {
        hashedFirstName: firstName,
        hashedLastName:  lastName,
        countryCode:     'TR',
      }
    });
  }

  const conversionActionResource = `customers/${settings.customerId.replace(/-/g, '')}/conversionActions/${settings.conversionActionId}`;

  const conversion: any = {
    conversionAction:   conversionActionResource,
    conversionDateTime: conversionDateTime(),
    orderId:            `lf-${lead.id}-${Date.now()}`,
  };

  if (lead.gclid) conversion.gclid = lead.gclid;
  if (extra.value && extra.value > 0) { conversion.conversionValue = extra.value; conversion.currencyCode = 'TRY'; }
  if (hashedUserIdentifiers.length > 0) conversion.hashedUserIdentifiers = hashedUserIdentifiers;

  const payload = {
    conversions:    [conversion],
    partialFailure: true,
  };

  const result = await uploadConversion(
    settings.customerId,
    settings.developerToken,
    accessToken,
    payload
  );

  await logGoogleEvent(supabase, userId, lead.id, eventType, result.success, result.response || result.error);

  if (!result.success) {
    // Try token refresh once
    const newToken = await refreshAccessToken(settings.refreshToken);
    if (newToken) {
      await supabase.from('google_ads_connections').update({ access_token: newToken }).eq('user_id', userId);
      const retry = await uploadConversion(settings.customerId, settings.developerToken, newToken, payload);
      await logGoogleEvent(supabase, userId, lead.id, eventType + '_retry', retry.success, retry.response || retry.error);
    }
  }
}

module.exports = { fireGoogleConversion };
