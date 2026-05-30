export {};
const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios    = require('axios');
const crypto   = require('crypto');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── ENV (correct token names) ─────────────────────────────────────────────────
// META_CAPI_TOKEN = System User Token from Meta Business Manager
// META_PIXEL_ID   = Your Facebook Pixel / Dataset ID
// Use whichever Meta token is available (all checked in Railway)
// META_GRAPH_TOKEN = long-lived user token (already set — works for CAPI)
// META_PAGE_TOKEN  = page token (also works)
// META_CAPI_TOKEN  = dedicated system user token (best practice, set if available)
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN
  || process.env.META_GRAPH_TOKEN   // ✅ Already set in Railway — CAPI works!
  || process.env.META_PAGE_TOKEN    // Fallback: page token
  || process.env.META_WA_TOKEN;    // Last resort
const META_PIXEL_ID   = process.env.META_PIXEL_ID;
const META_AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID; // act_XXXXX

const META_API_BASE   = 'https://graph.facebook.com/v19.0'; // latest stable
const isConfigured    = !!(META_CAPI_TOKEN && META_PIXEL_ID);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── PROPER DATA NORMALIZATION (Meta CAPI spec) ────────────────────────────────
function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  // Strip everything except digits and leading +
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  const digits   = cleaned.replace(/[^\d]/g, '');
  if (digits.length < 7) return null;
  // Convert to E.164 — assume Turkish (+90) if no country code
  if (cleaned.startsWith('+')) return cleaned.replace(/[^\d]/g, '');
  if (digits.startsWith('0') && digits.length === 11) return '90' + digits.slice(1);
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.length === 10) return '90' + digits; // bare 10-digit TR number
  return digits;
}

function normalizeEmail(email: string): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return e.includes('@') ? e : null;
}

function hashData(raw: string | null): string | null {
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ── UNIQUE EVENT ID (deduplication) ──────────────────────────────────────────
function makeEventId(eventName: string, leadId: string): string {
  return `lf-${eventName}-${leadId}-${Date.now()}`;
}

// ── BUILD CAPI EVENT PAYLOAD ──────────────────────────────────────────────────
function buildEventPayload(lead: any, eventName: string, testCode?: string): any {
  const phoneNorm = normalizePhone(lead.phone || '');
  const emailNorm = normalizeEmail(lead.email || '');

  const payload: any = {
    event_name:  eventName,
    event_time:  Math.floor(Date.now() / 1000),
    event_id:    makeEventId(eventName, lead.id),
    action_source: 'system_generated',
    user_data: {},
    custom_data: {
      lead_id:      lead.id,
      company_name: lead.company_name,
      city:         lead.city    || '',
      sector:       lead.sector  || '',
      status:       lead.status  || '',
    },
  };

  if (phoneNorm) payload.user_data.ph = [hashData(phoneNorm)];
  if (emailNorm) payload.user_data.em = [hashData(emailNorm)];
  if (lead.company_name) payload.user_data.fn = [hashData(lead.company_name.toLowerCase().split(' ')[0])];

  if (testCode) payload.test_event_code = testCode;

  return payload;
}

// ── SEND BATCH TO META CAPI ───────────────────────────────────────────────────
async function sendCAPIBatch(events: any[], testCode?: string): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0, failed = 0;
  const errors: string[] = [];

  if (!isConfigured) {
    return { success: 0, failed: events.length, errors: ['META_CAPI_TOKEN veya META_PIXEL_ID yapılandırılmamış'] };
  }

  // Meta allows max 1000 events per request
  for (let i = 0; i < events.length; i += 100) {
    const batch = events.slice(i, i + 100);
    try {
      const body: any = { data: batch, access_token: META_CAPI_TOKEN };
      if (testCode) body.test_event_code = testCode;

      const res = await axios.post(`${META_API_BASE}/${META_PIXEL_ID}/events`, body, { timeout: 15000 });
      const accepted = res.data?.events_received || batch.length;
      success += accepted;
    } catch (e: any) {
      const errMsg = e.response?.data?.error?.message || e.message || 'Unknown error';
      console.error('[Meta CAPI] Batch error:', errMsg);
      errors.push(errMsg);
      failed += batch.length;
    }

    if (i + 100 < events.length) await sleep(500); // rate limit
  }

  return { success, failed, errors };
}

// ── LOG EVENTS TO SUPABASE ────────────────────────────────────────────────────
async function logEvents(userId: string, events: any[], result: any) {
  try {
    const rows = events.slice(0, 50).map(e => ({
      user_id:    userId,
      lead_id:    e.custom_data?.lead_id || null,
      event_name: e.event_name,
      event_id:   e.event_id,
      sent_at:    new Date().toISOString(),
      success:    result.failed === 0,
      result:     JSON.stringify({ success: result.success, failed: result.failed }),
    }));
    await supabase.from('meta_events').insert(rows);
  } catch { /* table may not exist yet, silently skip */ }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// GET /stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: events } = await supabase.from('meta_events')
      .select('event_name, success, sent_at')
      .eq('user_id', req.userId)
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false })
      .limit(500);

    const byEvent: Record<string, number> = {};
    let totalSuccess = 0, totalFailed = 0;
    for (const e of (events || [])) {
      byEvent[e.event_name] = (byEvent[e.event_name] || 0) + 1;
      if (e.success) totalSuccess++; else totalFailed++;
    }

    res.json({
      total:        (events || []).length,
      totalSuccess, totalFailed,
      byEvent,
      configured:   isConfigured,
      pixelId:      META_PIXEL_ID ? `${META_PIXEL_ID.slice(0, 6)}...` : null,
      adAccount:    META_AD_ACCOUNT || null,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /pixel-code
router.get('/pixel-code', async (_req: any, res: any) => {
  const pixelId = META_PIXEL_ID || 'YOUR_PIXEL_ID_BURAYA';
  const code = `<!-- Meta Pixel Code (LeadFlow AI) -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');

// LeadFlow AI: Custom B2B events
function leadflowTrack(event, data) {
  fbq('trackCustom', event, data);
}
</script>
<noscript>
<img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->`;

  res.json({ code, pixelId, configured: !!META_PIXEL_ID });
});

// POST /track-batch — Send CAPI events for selected leads
router.post('/track-batch', async (req: any, res: any) => {
  try {
    const { eventName = 'Lead', status, sector, limit = 500, testCode, leadIds } = req.body;

    // Build lead query
    let query = supabase.from('leads').select('*').eq('user_id', req.userId);
    if (status)   query = query.eq('status', status);
    if (sector)   query = query.eq('sector', sector);
    if (leadIds?.length) query = query.in('id', leadIds);
    query = query.limit(Math.min(limit, 2000));

    const { data: leads, error } = await query;
    if (error) throw error;
    if (!leads?.length) return res.json({ message: 'Lead yok', sent: 0, success: 0, failed: 0 });

    // Build event payloads
    const events = leads.map(l => buildEventPayload(l, eventName, testCode));

    // Send to Meta CAPI
    const result = await sendCAPIBatch(events, testCode);

    // Log to Supabase
    await logEvents(req.userId, events, result);

    const message = isConfigured
      ? `${result.success} event gönderildi${result.failed > 0 ? `, ${result.failed} başarısız` : ''}`
      : `${events.length} event hazırlandı (yapılandırılmamış — sadece test modu)`;

    res.json({
      message,
      total: leads.length,
      sent:  events.length,
      success: result.success,
      failed:  result.failed,
      errors:  result.errors.slice(0, 3),
      configured: isConfigured,
      testMode: !!testCode,
    });
  } catch (e: any) {
    console.error('[Meta track-batch]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /custom-audience — Create Custom Audience in Meta (if token has permission)
router.post('/custom-audience', async (req: any, res: any) => {
  try {
    const { name, status, sector, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Kitle adı zorunlu' });

    let query = supabase.from('leads').select('phone,email,company_name').eq('user_id', req.userId);
    if (status) query = query.eq('status', status);
    if (sector) query = query.eq('sector', sector);
    const { data: leads } = await query.limit(500);

    // Hash data (Meta spec)
    const phones = (leads || []).map((l: any) => hashData(normalizePhone(l.phone || ''))).filter(Boolean);
    const emails = (leads || []).map((l: any) => hashData(normalizeEmail(l.email || ''))).filter(Boolean);

    const audienceName = `LeadFlow_${name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '')}`;

    // Try to actually create audience via Meta API if configured
    let metaAudienceId: string | null = null;
    let metaError: string | null = null;

    if (isConfigured && META_AD_ACCOUNT) {
      try {
        // Step 1: Create Custom Audience
        const createRes = await axios.post(
          `${META_API_BASE}/${META_AD_ACCOUNT}/customaudiences`,
          {
            name: audienceName,
            description: description || `LeadFlow AI - ${name}`,
            subtype: 'CUSTOM',
            customer_file_source: 'PARTNER_PROVIDED_ONLY',
            access_token: META_CAPI_TOKEN,
          },
          { timeout: 10000 }
        );
        metaAudienceId = createRes.data?.id;

        // Step 2: Upload hashed data to audience
        if (metaAudienceId && (phones.length > 0 || emails.length > 0)) {
          const schema: string[] = [];
          const data: string[][] = [];

          if (phones.length > 0) schema.push('PHONE');
          if (emails.length > 0) schema.push('EMAIL');

          const maxLen = Math.max(phones.length, emails.length);
          for (let i = 0; i < maxLen; i++) {
            const row: string[] = [];
            if (phones.length > 0) row.push(phones[i] || '');
            if (emails.length > 0) row.push(emails[i] || '');
            data.push(row);
          }

          await axios.post(
            `${META_API_BASE}/${metaAudienceId}/users`,
            {
              payload: { schema, data: data.slice(0, 10000) },
              access_token: META_CAPI_TOKEN,
            },
            { timeout: 30000 }
          );
        }
      } catch (e: any) {
        metaError = e.response?.data?.error?.message || e.message;
        console.error('[Meta audience]', metaError);
      }
    }

    res.json({
      audienceName,
      totalContacts: (leads || []).length,
      phones: phones.length,
      emails: emails.length,
      metaAudienceId,
      metaError,
      configured: isConfigured,
      message: metaAudienceId
        ? `✅ Meta'da "${audienceName}" kitlesi oluşturuldu! ID: ${metaAudienceId}`
        : metaError
          ? `⚠️ Meta API hatası: ${metaError} — veriler hazır, manuel yükleme yapın`
          : `${(leads || []).length} kişilik kitle hazırlandı — yapılandırma eksik`,
    });
  } catch (e: any) {
    console.error('[Meta audience]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /leads — Load leads for UI (with filters)
router.get('/leads', async (req: any, res: any) => {
  try {
    const { status, sector, limit = 100 } = req.query;
    let q = supabase.from('leads').select('id,company_name,city,sector,status,phone,email').eq('user_id', req.userId);
    if (status) q = q.eq('status', status);
    if (sector) q = q.eq('sector', sector);
    const { data } = await q.order('created_at', { ascending: false }).limit(Number(limit));
    res.json({ leads: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /event-history — Recent events from meta_events table
router.get('/event-history', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('meta_events')
      .select('event_name,sent_at,success,result,lead_id')
      .eq('user_id', req.userId)
      .order('sent_at', { ascending: false })
      .limit(20);
    res.json({ events: data || [] });
  } catch { res.json({ events: [] }); }
});

module.exports = router;
