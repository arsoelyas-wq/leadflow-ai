require('dotenv').config();
const ws = require('ws');
global.WebSocket = ws;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { runDailyTenderScan } = require('./routes/tenders');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet());
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://leadflow-ai-web-kappa.vercel.app,http://localhost:3000').split(',');
app.use(cors({ origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin) || (!!origin && origin.endsWith('.vercel.app'))), credentials: true, methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));

const generalLimiter  = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter     = rateLimit({ windowMs: 15*60*1000, max: 10 });
const scrapeLimiter   = rateLimit({ windowMs: 60*60*1000, max: 50, message: { error: 'Çok fazla istek. Lütfen bir saat sonra tekrar deneyin.' } });
const campaignLimiter = rateLimit({ windowMs: 60*60*1000, max: 50 });
const aiLimiter       = rateLimit({ windowMs: 60*1000,    max: 20 });

app.use(generalLimiter);
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
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

// PUBLIC
app.use('/api/auth', authLimiter, require('./routes/auth'));
const linksRouter = require('./routes/links');
app.get('/t/:code', (req: any, res: any) => {
  linksRouter.handle(Object.assign(req, { url: `/redirect/${req.params.code}`, path: `/redirect/${req.params.code}` }), res, () => res.status(404).send('Not found'));
});

// Meta Webhook (public)
app.get('/api/meta/webhook', (req: any, res: any) => {
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'leadflow2024';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

// Automations webhook (public)
app.use('/api/automations', require('./routes/automations'));

// Portal (public - token ile erisim)
app.use('/api/portal', require('./routes/portal'));

// Public diagnostic: test Google Places API key (no sensitive data exposed)
app.get('/api/scrape/test-key', (req: any, res: any, next: any) => {
  req.url = '/test-key';
  require('./routes/scrape')(req, res, next);
});

// Public diagnostic: test Apify token (no user data exposed)
const lfRouter = require('./routes/lead-finder');
app.get('/api/lead-finder/test-apify', (req: any, res: any, next: any) => {
  req.url = '/test-apify';
  lfRouter(req, res, next);
});

// Public diagnostic: test LinkedIn Voyager session (no user data exposed)
const dmRouter = require('./routes/decision-maker');
app.get('/api/decision-maker/test-linkedin', (req: any, res: any, next: any) => {
  req.url = '/test-linkedin';
  dmRouter(req, res, next);
});

// PROTECTED
app.use('/api/leads',                authMiddleware, require('./routes/leads'));
app.use('/api/scrape',               authMiddleware, scrapeLimiter, require('./routes/scrape'));
app.use('/api/payments',             authMiddleware, require('./routes/payments'));
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
app.use('/api/credits',              authMiddleware, require('./routes/credits'));
app.use('/api/ads',                  authMiddleware, require('./routes/ads'));
app.use('/api/ads-intelligence',     authMiddleware, require('./routes/ads-intelligence'));
app.use('/api/google-intelligence',  authMiddleware, require('./routes/google-ads-intelligence'));
app.use('/api/google-campaign',      authMiddleware, require('./routes/google-ads-campaign'));
app.use('/api/google-optimizer',     authMiddleware, require('./routes/google-ads-optimizer'));
app.use('/api/google-adv',           authMiddleware, require('./routes/google-ads-advanced2'));
app.use('/api/meta-opt',             authMiddleware, require('./routes/meta-optimizer'));
app.use('/api/coaching',             authMiddleware, require('./routes/coaching'));
app.use('/api/inbox',                authMiddleware, require('./routes/inbox'));
app.use('/api/pipeline',             authMiddleware, require('./routes/pipeline'));
app.use('/api/crisis',               authMiddleware, require('./routes/crisis'));
// Public microsite view (no auth — customer-facing catalog link)
app.use('/api/microsite/view',                      require('./routes/microsite').publicRouter);
app.use('/api/microsite',            authMiddleware, require('./routes/microsite'));
app.use('/api/referral',             authMiddleware, require('./routes/referral'));
app.use('/api/debt',                 authMiddleware, require('./routes/debt'));
app.use('/api/emotional',            authMiddleware, require('./routes/emotional'));
app.use('/api/data-collector',       authMiddleware, require('./routes/data-collector'));
app.use('/api/hunter',               authMiddleware, require('./routes/hunter'));
app.use('/api/trade-fair',           authMiddleware, require('./routes/trade-fair'));
app.use('/api/tenders',              authMiddleware, require('./routes/tenders'));
app.use('/api/linkedin',             authMiddleware, require('./routes/linkedin'));
app.use('/api/sequences',            authMiddleware, require('./routes/sequences'));
app.use('/api/calls', require('./routes/calls'));
const tiRouter = require('./routes/team-intelligence');
app.get('/api/twiml/test', function(req, res) { res.setHeader('Content-Type', 'text/xml'); res.send('<Response><Say language="tr-TR" voice="Polly.Filiz">Merhaba! Ben Ahmet, Dekor Panel den ariyorum. Akustik panellerimiz var. Uygun musunuz?</Say></Response>'); });
app.post('/api/team-intelligence/process-call', (req: any, res: any, next: any) => { req.url = '/process-call'; tiRouter(req, res, next); });
app.use('/api/team-intelligence', authMiddleware, tiRouter);
// Green API public endpoints (no auth)
const greenApiRouter = require('./routes/green-api');
app.post('/api/green-api/webhook', (req: any, res: any, next: any) => { req.url = '/webhook'; greenApiRouter(req, res, next); });
app.post('/api/green-api/connected', (req: any, res: any, next: any) => { req.url = '/connected'; greenApiRouter(req, res, next); });
app.use('/api/green-api', authMiddleware, greenApiRouter);
app.use('/api/abtests',              authMiddleware, require('./routes/ab-testing'));
app.use('/api/wa-numbers',           authMiddleware, require('./routes/wa-numbers'));
app.use('/api/shadow',               authMiddleware, require('./routes/shadow'));
app.use('/api/visual-trends',        authMiddleware, require('./routes/visual-trends'));
// HeyGen webhook public (no auth, called by HeyGen servers)
const videoOutreachRouter = require('./routes/video-outreach');
app.post('/api/video-outreach/heygen-webhook', (req: any, res: any, next: any) => { req.url = '/heygen-webhook'; videoOutreachRouter(req, res, next); });
app.get('/api/video-outreach/test-ai', (req: any, res: any, next: any) => { req.url = '/test-ai'; videoOutreachRouter(req, res, next); });
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
app.post('/api/voice/webhook/vapi', (req: any, res: any, next: any) => { req.url = '/webhook/vapi'; voiceRouter(req, res, next); });
// XTTS custom TTS endpoint — Vapi canlı arama sırasında bu URL'i çağırır (public, auth yok)
app.post('/api/voice/tts-xtts/:voiceId', (req: any, res: any, next: any) => { req.url = `/tts-xtts/${req.params.voiceId}`; voiceRouter(req, res, next); });
app.use('/api/voice',                authMiddleware, voiceRouter);
app.use('/api/voice-library',        authMiddleware, require('./routes/voice-library'));
app.use('/api/push',                 authMiddleware, require('./routes/push'));
app.use('/api/cultural',             authMiddleware, require('./routes/cultural'));
app.use('/api/meta',                 authMiddleware, require('./routes/meta-intent'));
app.use('/api/meta-capi',            authMiddleware, require('./routes/meta-capi'));
app.use('/api/google-capi',          authMiddleware, require('./routes/google-capi'));
app.use('/api/export',               authMiddleware, require('./routes/export-intelligence'));
app.use('/api/ar',                   authMiddleware, require('./routes/ar-integration'));
app.use('/api/sales-intelligence',   authMiddleware, require('./routes/sales-intelligence'));
app.use('/api/ti-reports', authMiddleware, require('./routes/team-intelligence-reports'));
app.use('/api/ads-automation',           authMiddleware, require('./routes/ads-automation'));
app.use('/api/lead-finder',              authMiddleware, scrapeLimiter, require('./routes/lead-finder'));
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
const { router: dashboardRouter } = require('./routes/dashboard');
app.use('/api/dashboard',  authMiddleware, dashboardRouter);
const { router: monitoringRouter } = require('./routes/monitoring');
app.use('/api/monitoring', authMiddleware, monitoringRouter);
const { router: webhooksRouter } = require('./routes/webhooks');
app.use('/api/webhooks',   authMiddleware, webhooksRouter);

// Health check
app.get('/health', (_req: any, res: any) => res.json({ status: 'OK', ts: Date.now() }));

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

app.listen(PORT, () => console.log(`LeadFlow API:${PORT}`));