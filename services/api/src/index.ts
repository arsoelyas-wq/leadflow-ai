require('dotenv').config();
const ws = require('ws');
global.WebSocket = ws;
const express = require('express');
const { initMonitoring } = require('./lib/error-monitor');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { runDailyTenderScan } = require('./routes/tenders');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false, // Next.js handles CSP on frontend
  crossOriginEmbedderPolicy: false,
}));

// CORS — explicit allowlist only, NO wildcards
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://sovlo.io,https://www.sovlo.io,http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / server-to-server (no origin header)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // Allow only explicitly listed sovlo.io subdomains
    if (origin.endsWith('.sovlo.io')) return cb(null, true);
    return cb(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-lang'],
}));

const generalLimiter  = rateLimit({ windowMs: 15*60*1000, max: 1500, standardHeaders: true, legacyHeaders: false, message: { error: 'Çok fazla istek. Lütfen bekleyin.' } });
const authLimiter     = rateLimit({ windowMs: 15*60*1000, max: 10,  message: { error: 'Çok fazla giriş denemesi.' } });
const scrapeLimiter   = rateLimit({ windowMs: 60*60*1000, max: 40,  message: { error: 'Scrape limiti aşıldı. Bir saat sonra tekrar deneyin.' } });
const campaignLimiter = rateLimit({ windowMs: 60*60*1000, max: 40,  message: { error: 'Kampanya limiti aşıldı.' } });
const aiLimiter       = rateLimit({ windowMs: 60*1000,    max: 15,  message: { error: 'AI istek limiti aşıldı.' } });
const paymentLimiter  = rateLimit({ windowMs: 60*60*1000, max: 20,  message: { error: 'Ödeme işlemi limiti aşıldı.' } });
const creditLimiter   = rateLimit({ windowMs: 15*60*1000, max: 30,  message: { error: 'Kredi sorgu limiti aşıldı.' } });

app.use(generalLimiter);
// Webhooks that need raw body for signature verification — BEFORE global json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/voice/webhook/elevenlabs', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Ensure all JSON responses explicitly declare UTF-8
app.use((_req: any, res: any, next: any) => {
  const orig = res.json.bind(res);
  res.json = function(body: any) {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return orig(body);
  };
  next();
});

const { authMiddleware } = require('./middleware/auth');
const { anomalyDetection, registerHoneypots } = require('./middleware/security');

// ── Honeypots — register first so scanners are trapped before hitting real routes
registerHoneypots(app);

// ── Anomaly detection — applied globally
app.use(anomalyDetection);

// PUBLIC
app.use('/api/auth', authLimiter, require('./routes/auth'));
const linksRouter = require('./routes/links');
app.get('/t/:code', (req: any, res: any) => {
  linksRouter.handle(Object.assign(req, { url: `/redirect/${req.params.code}`, path: `/redirect/${req.params.code}` }), res, () => res.status(404).send('Not found'));
});

// Meta Webhook (public — token validated from env only)
app.get('/api/meta/webhook', (req: any, res: any) => {
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!VERIFY_TOKEN) return res.status(503).send('Not configured');
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Automations — public webhook (token-verified), rest requires auth
app.post('/api/automations/webhook/:userId', require('./routes/automations-webhook-public'));
app.use('/api/automations', authMiddleware, require('./routes/automations'));

// Public feature-flags endpoint — no auth, cached 60s by CDN/client
app.get('/api/feature-flags', async (req: any, res: any) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data } = await sb.from('feature_flags').select('flag_key,status,is_enabled').order('flag_key');
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ flags: data || [] });
  } catch { res.json({ flags: [] }); }
});

// Portal (public - token ile erisim)
app.use('/api/portal', require('./routes/portal'));

// Diagnostic endpoints — DEV only, completely disabled in production
const lfRouter = require('./routes/lead-finder');
const dmRouter = require('./routes/decision-maker');
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/scrape/test-key', (req: any, res: any, next: any) => { req.url = '/test-key'; require('./routes/scrape')(req, res, next); });
  app.get('/api/lead-finder/test-apify', (req: any, res: any, next: any) => { req.url = '/test-apify'; lfRouter(req, res, next); });
  app.get('/api/decision-maker/test-linkedin', (req: any, res: any, next: any) => { req.url = '/test-linkedin'; dmRouter(req, res, next); });
}

// PROTECTED
app.use('/api/leads',                authMiddleware, creditLimiter, require('./routes/leads'));
app.use('/api/scrape',               authMiddleware, scrapeLimiter, require('./routes/scrape'));
// Stripe webhook — public (Stripe signature verified inside route, no JWT)
const paymentsRouter = require('./routes/payments');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req: any, res: any, next: any) => { req.url = '/webhook'; paymentsRouter(req, res, next); });
app.use('/api/payments',             authMiddleware, paymentLimiter, paymentsRouter);
app.use('/api/analytics',            authMiddleware, require('./routes/analytics'));
app.use('/api/ai',                   authMiddleware, aiLimiter, require('./routes/ai'));
app.use('/api/campaigns',            authMiddleware, campaignLimiter, require('./routes/campaigns'));
app.use('/api/messages',             authMiddleware, require('./routes/messages'));
app.use('/api/links',                authMiddleware, linksRouter);
app.use('/api/quality',              authMiddleware, require('./routes/quality'));
app.use('/api/quality-v2',           authMiddleware, require('./routes/quality-v2'));
app.use('/api/competitor',           authMiddleware, require('./routes/competitor'));
app.use('/api/decision-maker',       authMiddleware, dmRouter);
app.use('/api/decision-maker-finder', authMiddleware, require('./routes/decision-maker-finder'));
app.use('/api/persons',              authMiddleware, require('./routes/persons'));
app.use('/api/sources',              authMiddleware, require('./routes/sources'));
app.use('/api/instagram',            authMiddleware, require('./routes/instagram'));
app.use('/api/facebook',             authMiddleware, require('./routes/facebook'));
app.use('/api/workflow',             authMiddleware, require('./routes/workflow'));
app.use('/api/team',                 authMiddleware, require('./routes/team'));
// Google Ads callback public (OAuth redirect)
const googleAdsRouter = require('./routes/google-ads');
app.get('/api/google-ads/callback', (req: any, res: any, next: any) => { req.url = '/callback'; googleAdsRouter(req, res, next); });
app.use('/api/google-ads',           authMiddleware, googleAdsRouter);
app.use('/api/email',                authMiddleware, require('./routes/email'));
app.use('/api/email-campaigns',      authMiddleware, require('./routes/email'));
app.use('/api/sms',                  authMiddleware, require('./routes/sms'));
app.use('/api/qr',                   authMiddleware, require('./routes/qr'));
app.use('/api/loyalty',              authMiddleware, require('./routes/loyalty'));
app.use('/api/reports',              authMiddleware, require('./routes/reports'));
app.use('/api/price-tracker',        authMiddleware, require('./routes/price-tracker'));
app.use('/api/ads-advanced',         authMiddleware, require('./routes/ads-advanced'));
app.use('/api/notifications',        authMiddleware, require('./routes/notifications'));
app.use('/api/invoices',             authMiddleware, require('./routes/invoices'));
app.use('/api/kvkk',                 authMiddleware, require('./routes/kvkk'));
app.use('/api/2fa',                  authMiddleware, require('./routes/twofa'));
app.use('/api/churn',                authMiddleware, require('./routes/churn'));
app.use('/api/affiliate',            authMiddleware, require('./routes/affiliate'));
app.use('/api/sheets',               authMiddleware, require('./routes/sheets'));
app.use('/api/credits',              authMiddleware, creditLimiter, require('./routes/credits'));
app.use('/api/ads',                  authMiddleware, require('./routes/ads'));
app.use('/api/ads-intelligence',     authMiddleware, require('./routes/ads-intelligence'));
app.use('/api/google-intelligence',  authMiddleware, require('./routes/google-ads-intelligence'));
app.use('/api/google-campaign',      authMiddleware, require('./routes/google-ads-campaign'));
app.use('/api/google-optimizer',     authMiddleware, require('./routes/google-ads-optimizer'));
app.use('/api/google-adv',           authMiddleware, require('./routes/google-ads-advanced2'));
app.use('/api/meta-opt',             authMiddleware, require('./routes/meta-optimizer'));
app.use('/api/coaching',             authMiddleware, require('./routes/coaching'));
app.use('/api/inbox',                authMiddleware, require('./routes/inbox'));
app.use('/api/quick-replies',        authMiddleware, require('./routes/quick-replies'));
app.use('/api/tracking',             require('./routes/tracking'));  // Public — auth yok (email pixel)
app.use('/api/pipeline',             authMiddleware, require('./routes/pipeline'));
app.use('/api/crisis',               authMiddleware, require('./routes/crisis'));
// Public microsite view (no auth — customer-facing catalog link)
app.use('/api/microsite/view',                      require('./routes/microsite').publicRouter);
app.use('/api/microsite',            authMiddleware, require('./routes/microsite'));
// Public: Excel template download (no sensitive data — just an empty template)
app.get('/api/products/excel-template', require('./routes/products').excelTemplateHandler);
app.use('/api/products',             authMiddleware, require('./routes/products'));
app.use('/api/referral',             authMiddleware, require('./routes/referral'));
app.use('/api/debt',                 authMiddleware, require('./routes/debt'));
app.use('/api/emotional',            authMiddleware, require('./routes/emotional'));
app.use('/api/data-collector',       authMiddleware, require('./routes/data-collector'));
app.use('/api/hunter',               authMiddleware, require('./routes/hunter'));
app.use('/api/trade-fair',           authMiddleware, require('./routes/trade-fair'));
app.use('/api/tenders',              authMiddleware, require('./routes/tenders'));
app.use('/api/linkedin',             authMiddleware, require('./routes/linkedin'));
app.use('/api/sequences',            authMiddleware, require('./routes/sequences'));
app.use('/api/calls', authMiddleware, require('./routes/calls'));
const tiRouter = require('./routes/team-intelligence');
// TwiML test — DEV only
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/twiml/test', function(_req: any, res: any) { res.setHeader('Content-Type', 'text/xml'); res.send('<Response><Say language="tr-TR" voice="Polly.Filiz">Test modu</Say></Response>'); });
}
app.post('/api/team-intelligence/process-call', (req: any, res: any, next: any) => { req.url = '/process-call'; tiRouter(req, res, next); });
app.use('/api/team-intelligence', authMiddleware, tiRouter);
// Green API public endpoints (no auth)
const greenApiRouter = require('./routes/green-api');
app.post('/api/green-api/webhook', (req: any, res: any, next: any) => { req.url = '/webhook'; greenApiRouter(req, res, next); });
app.post('/api/green-api/connected', (req: any, res: any, next: any) => { req.url = '/connected'; greenApiRouter(req, res, next); });
app.use('/api/green-api', authMiddleware, greenApiRouter);
app.use('/api/abtests',              authMiddleware, require('./routes/ab-testing'));
app.use('/api/wa-numbers',           authMiddleware, require('./routes/wa-numbers'));
app.use('/api/phone-numbers',        authMiddleware, require('./routes/phone-numbers'));
app.use('/api/shadow',               authMiddleware, require('./routes/shadow'));
app.use('/api/visual-trends',        authMiddleware, require('./routes/visual-trends'));
const videoOutreachRouter = require('./routes/video-outreach');
// video-outreach test-ai — DEV only
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/video-outreach/test-ai', (req: any, res: any, next: any) => { req.url = '/test-ai'; videoOutreachRouter(req, res, next); });
}
app.use('/api/video-outreach',       authMiddleware, videoOutreachRouter);
app.use('/v',                          require('./routes/video-tracking'));
// Video sequences — multi-touch outreach engine
const { router: videoSeqRouter, checkAndAdvanceSequences } = require('./routes/video-sequences');
app.use('/api/video-sequences',      authMiddleware, videoSeqRouter);
app.use('/api/avatar',               authMiddleware, require('./routes/avatar'));
app.use('/api/retargeting',          authMiddleware, require('./routes/retargeting'));
const { router: proposalsRouter, portalRouter: proposalPortalRouter } = require('./routes/proposals');
app.use('/api/proposals/portal',     proposalPortalRouter);           // public — token-based
app.use('/api/proposals',            authMiddleware, proposalsRouter);
app.use('/api/smart-timing',         authMiddleware, require('./routes/smart-timing'));
app.use('/api/vision',               authMiddleware, require('./routes/vision'));
app.use('/api/health-scores',        authMiddleware, require('./routes/health-scores'));
app.use('/api/developer',            authMiddleware, require('./routes/developer'));
app.use('/api/whitelabel',           authMiddleware, require('./routes/whitelabel'));
const voiceRouter = require('./routes/voice-outreach');
app.post('/api/voice/webhook/elevenlabs', (req: any, res: any, next: any) => { req.url = '/webhook/elevenlabs'; voiceRouter(req, res, next); });
// XTTS custom TTS endpoint (public, auth yok)
app.post('/api/voice/tts-xtts/:voiceId', (req: any, res: any, next: any) => { req.url = `/tts-xtts/${req.params.voiceId}`; voiceRouter(req, res, next); });
app.use('/api/voice/caller-ids',     authMiddleware, require('./routes/caller-ids'));
app.use('/api/voice',                authMiddleware, voiceRouter);

// ── LeadFlow Voice Engine routes (public callbacks — Twilio imzası ile doğrulanır) ──
app.use('/api/engine', require('./routes/voice-engine'));
app.use('/api/voice-library',        authMiddleware, require('./routes/voice-library'));
app.use('/api/push',                 authMiddleware, require('./routes/push'));
app.use('/api/cultural',             authMiddleware, require('./routes/cultural'));
app.use('/api/meta',                 authMiddleware, require('./routes/meta-intent'));
app.use('/api/meta-capi',            authMiddleware, require('./routes/meta-capi'));
app.use('/api/google-capi',          authMiddleware, require('./routes/google-capi'));
app.use('/api/export',               authMiddleware, require('./routes/export-intelligence'));
const { router: platformsRouter } = require('./routes/platforms');
app.use('/api/platforms',            authMiddleware, platformsRouter);
app.use('/api/ar',                   authMiddleware, require('./routes/ar-integration'));
app.use('/api/sales-intelligence',   authMiddleware, require('./routes/sales-intelligence'));
app.use('/api/ti-reports', authMiddleware, require('./routes/team-intelligence-reports'));
app.use('/api/ads-automation',           authMiddleware, require('./routes/ads-automation'));
app.use('/api/lead-finder',              authMiddleware, require('./routes/lead-finder'));
app.use('/api/replica',                  authMiddleware, require('./routes/replica'));
app.use('/api/avatar-library',           authMiddleware, require('./routes/avatar-library'));

// Activity tracking (pixel is public, rest protected)
const { router: activityRouter } = require('./routes/activity');
app.get('/api/activity/pixel/:token', (req: any, res: any, next: any) => { req.url = `/pixel/${req.params.token}`; activityRouter(req, res, next); });
app.use('/api/activity',             authMiddleware, activityRouter);

// Lead enrichment pipeline
const { router: enrichmentRouter } = require('./routes/enrichment');
app.use('/api/enrichment',           authMiddleware, enrichmentRouter);

// Referral graph / network
app.use('/api/network',              authMiddleware, require('./routes/network'));

// AI Battle Card + Right Moment + Community stats
app.use('/api/battlecard',           authMiddleware, aiLimiter, require('./routes/battlecard'));

// Workflow V2 — visual node engine
const { router: wfV2Router, triggerWorkflowEvent } = require('./routes/workflow-v2');
app.use('/api/workflow-v2',          authMiddleware, wfV2Router);
(global as any).triggerWorkflowEvent = triggerWorkflowEvent;

// AI Sales Agent — autonomous research + outreach + conversation engine
const { router: aiAgentRouter, processIncomingMessage: _piMsg } = require('./routes/ai-agent');
app.use('/api/ai-agent',             authMiddleware, aiLimiter, aiAgentRouter);
(global as any).processIncomingWhatsApp = _piMsg;

const { router: settingsRouter } = require('./routes/settings');
app.use('/api/settings',   authMiddleware, settingsRouter);
app.use('/api/settings/business-profile', authMiddleware, require('./routes/business-profile'));
// Market pages — public GET no auth, CRUD requires auth
app.use('/api/market-pages/public', require('./routes/market-pages-public'));
app.use('/api/market-pages',        authMiddleware, require('./routes/market-pages'));
// Leads config — protected: only authenticated users of this system may read their own CRM config
app.get('/api/leads-config', authMiddleware, async (_req: any, res: any) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data } = await sb.from('site_settings').select('value').eq('key', 'leads_config').single();
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json({ config: data?.value && Object.keys(data.value).length > 0 ? data.value : null });
  } catch { res.json({ config: null }); }
});
// ── ADMIN OS ─────────────────────────────────────────────────────────────────
const { adminAuthMiddleware } = require('./middleware/adminAuth');
const adminRouter = require('./routes/admin/index');
app.use('/api/admin', (req: any, res: any, next: any) => {
  // Public routes — no admin auth needed
  if (req.path.startsWith('/auth/') || req.path.startsWith('/content/banners/active') || req.path.startsWith('/content/banners/') && (req.path.endsWith('/click') || req.path.endsWith('/view'))) return next();
  // Promo redemption uses regular user auth (handled inside the route)
  if (req.path === '/promo/redeem') {
    // Extract user from JWT if present (but don't block if no admin token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        req.userId = decoded.userId;
      } catch {}
    }
    return next();
  }
  adminAuthMiddleware(req, res, next);
}, adminRouter);
const { router: dashboardRouter } = require('./routes/dashboard');
app.use('/api/dashboard',  authMiddleware, dashboardRouter);
const { router: monitoringRouter } = require('./routes/monitoring');
app.use('/api/monitoring', authMiddleware, monitoringRouter);
const { router: webhooksRouter } = require('./routes/webhooks');
app.use('/api/webhooks',   authMiddleware, webhooksRouter);

// Support chat — /public/chat is stateless (no auth), all other paths require auth
const supportRouter = require('./routes/support');
app.use('/api/support/public', supportRouter);
app.use('/api/support', authMiddleware, supportRouter);

// Health check — minimal info, no internal details
app.get('/health', (_req: any, res: any) => res.json({ ok: true }));

// WA Diagnostic — in-memory WA instance durumunu gösterir (prod'da sadece status, no secrets)
app.get('/api/wa-status', async (_req: any, res: any) => {
  try {
    const { listInstances } = require('./lib/waGateway');
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const memInstances = listInstances();
    const { data: dbInstances } = await sb.from('wa_instances')
      .select('instance_id, user_id, phone, status, connected_at').order('connected_at', { ascending: false }).limit(20);
    res.json({
      memory: memInstances,
      database: dbInstances || [],
      time: new Date().toISOString(),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// WA Debug — gelen mesaj event istatistikleri + son DB incoming mesajlar
app.get('/api/wa-debug', async (_req: any, res: any) => {
  try {
    const { getIncomingStats } = require('./lib/waGateway');
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const stats = getIncomingStats();
    const { data: recentIn } = await sb.from('messages')
      .select('id, lead_id, content, sent_at, metadata')
      .eq('direction', 'in').eq('channel', 'whatsapp')
      .order('sent_at', { ascending: false }).limit(10);
    const { data: recentOut } = await sb.from('messages')
      .select('id, lead_id, content, sent_at')
      .eq('direction', 'out').eq('channel', 'whatsapp')
      .order('sent_at', { ascending: false }).limit(5);
    res.json({
      time: new Date().toISOString(),
      eventStats: stats,
      lastIncomingMessages: recentIn || [],
      lastOutgoingMessages: recentOut || [],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// WA Dedup — aynı telefon numarasına sahip duplicate leadleri birleştirir (authenticated)
app.post('/api/wa-dedup', async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });
    const { deduplicatePhoneLeads } = require('./lib/waGateway');
    const result = await deduplicatePhoneLeads(user.id, sb);
    res.json({ success: true, ...result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUBLIC voice diagnostic — no auth, shows Vapi/Supabase config status
app.get('/api/voice-diag', async (_req: any, res: any) => {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const axios = require('axios');
  const VAPI_KEY = process.env.VAPI_API_KEY || process.env.VAPI_KEY || '';
  const VAPI_PHONE_ID = process.env.VAPI_PHONE_NUMBER_ID || 'c5103fbb-47da-411e-b690-2329c2fe4f06';
  const result: Record<string, any> = {
    env: {
      VAPI_KEY: VAPI_KEY ? `✅ set (${VAPI_KEY.slice(0,8)}...)` : '❌ MISSING',
      VAPI_PHONE_ID: VAPI_PHONE_ID,
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ set' : '❌ MISSING',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ set' : '❌ MISSING',
      NODE_ENV: process.env.NODE_ENV,
    }
  };
  // Test voice_calls table
  try {
    const { data, error } = await sb.from('voice_calls').select('id, conversation_style, status').limit(2);
    result.voice_calls_table = error ? `❌ ${error.message}` : `✅ OK (${data?.length} rows, conversation_style sütunu var)`;
    result.sample_calls = data?.map((r: any) => ({ id: r.id?.slice(0,8), status: r.status }));
  } catch (e: any) { result.voice_calls_table = `❌ THROW: ${e.message}`; }
  // Test Vapi phone numbers
  try {
    if (!VAPI_KEY) { result.vapi = '❌ No VAPI_KEY'; }
    else {
      const r = await axios.get('https://api.vapi.ai/phone-number', {
        headers: { Authorization: `Bearer ${VAPI_KEY}` }, timeout: 8000,
      });
      const phones = (r.data || []).map((p: any) => ({ id: p.id, number: p.number?.number || p.number, status: p.status }));
      result.vapi_phones = phones;
      result.phone_id_match = phones.some((p: any) => p.id === VAPI_PHONE_ID)
        ? `✅ MATCH — ${VAPI_PHONE_ID}`
        : `❌ NO MATCH — configured=${VAPI_PHONE_ID}, available=${phones.map((p: any) => p.id).join(', ') || 'none'}`;
    }
  } catch (e: any) { result.vapi = `❌ ${e.response?.data?.message || e.message}`; }
  res.json(result);
});

// Global error handler — never expose stack traces to client
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[Error]', err.message);
  res.status(status).json({ error: status >= 500 ? 'Sunucu hatası' : (err.message || 'Hata') });
});

// Daily tender scan
function scheduleDailyTenderScan() {
  const now = new Date();
  const next = new Date();
  next.setHours(7, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  console.log(`Daily tender scan scheduled for ${next.toLocaleString('tr-TR')}`);
  setTimeout(() => {
    runDailyTenderScan();
    setInterval(runDailyTenderScan, 24 * 60 * 60 * 1000);
  }, next.getTime() - now.getTime());
}
scheduleDailyTenderScan();
const { runNightlyCollection } = require('./routes/data-collector');
require('node-cron').schedule('0 2 * * *', () => { runNightlyCollection(); });
require('node-cron').schedule('*/10 * * * *', () => { checkAndAdvanceSequences(); });
// Security: clean expired JWT blocklist entries daily at 03:00
require('node-cron').schedule('0 3 * * *', () => { require('./lib/security').cleanBlocklist(); });

initMonitoring(app).catch(console.error);

// WA Gateway — bağlı instance'ları startup'ta geri yükle
setTimeout(async () => {
  try {
    const { restoreConnectedInstances, heartbeatReconnect } = require('./lib/waGateway');
    await restoreConnectedInstances();
    // Her 90 saniyede heartbeat: DB'de connected ama bellekte olmayan socket'ları kurtarır
    setInterval(heartbeatReconnect, 90_000);
  } catch (e: any) {
    console.error('[WA-GW] Startup restore error:', e.message);
  }
}, 5000);

// ── LeadFlow Voice Engine — HTTP server + WebSocket upgrade ───────────────────
// Express app'i HTTP server'a sar, Media Streams WebSocket'i aynı porta bağla
const http = require('http');
const { attachWss, setShutdownMode, drainActiveSessions } = require('./engines/voice/call-engine');
const server = http.createServer(app);
attachWss(server);   // WebSocket upgrade handler'ı ekle
server.listen(PORT, () => console.log(`LeadFlow API:${PORT} (Voice Engine etkin)`));

// Railway / Docker SIGTERM — aktif aramaları 30s drain ederek graceful kapat
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM alındı — graceful shutdown başlıyor');
  setShutdownMode(true);
  server.close(() => console.log('[Server] HTTP server kapatıldı'));
  await drainActiveSessions(30_000);
  console.log('[Server] Graceful shutdown tamamlandı');
  process.exit(0);
});