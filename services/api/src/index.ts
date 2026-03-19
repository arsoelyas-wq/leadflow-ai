const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: '*', credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter    = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const scrapeLimiter  = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });
const campaignLimiter= rateLimit({ windowMs: 60 * 60 * 1000, max: 50 });
const aiLimiter      = rateLimit({ windowMs: 60 * 1000, max: 20 });

app.use(generalLimiter);
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const { authMiddleware } = require('./middleware/auth');

// PUBLIC
app.use('/api/auth', authLimiter, require('./routes/auth'));
const linksRouter = require('./routes/links');
app.get('/t/:code', (req: any, res: any) => {
  linksRouter.handle(Object.assign(req, { url: `/redirect/${req.params.code}`, path: `/redirect/${req.params.code}` }), res, () => res.status(404).send('Not found'));
});

// PROTECTED
app.use('/api/leads',          authMiddleware, require('./routes/leads'));
app.use('/api/scrape',         authMiddleware, scrapeLimiter, require('./routes/scrape'));
app.use('/api/payments',       authMiddleware, require('./routes/payments'));
app.use('/api/analytics',      authMiddleware, require('./routes/analytics'));
app.use('/api/ai',             authMiddleware, aiLimiter, require('./routes/ai'));
app.use('/api/campaigns',      authMiddleware, campaignLimiter, require('./routes/campaigns'));
app.use('/api/messages',       authMiddleware, require('./routes/messages'));
app.use('/api/links',          authMiddleware, linksRouter);
app.use('/api/quality',        authMiddleware, require('./routes/quality'));
app.use('/api/quality-v2',     authMiddleware, require('./routes/quality-v2'));
app.use('/api/competitor',     authMiddleware, require('./routes/competitor'));
app.use('/api/decision-maker', authMiddleware, require('./routes/decision-maker'));
app.use('/api/persons',        authMiddleware, require('./routes/persons'));
app.use('/api/linkedin',       authMiddleware, require('./routes/linkedin'));
app.use('/api/sequences',      authMiddleware, require('./routes/sequences'));
app.use('/api/abtests',        authMiddleware, require('./routes/ab-testing'));
app.use('/api/wa-numbers',     authMiddleware, require('./routes/wa-numbers'));
app.use('/api/shadow',         authMiddleware, require('./routes/shadow'));
app.use('/api/visual-trends',  authMiddleware, require('./routes/visual-trends'));
app.use('/api/video-outreach', authMiddleware, require('./routes/video-outreach'));
app.use('/api/avatar',         authMiddleware, require('./routes/avatar'));
app.use('/api/retargeting',    authMiddleware, require('./routes/retargeting'));
app.use('/api/proposals',      authMiddleware, require('./routes/proposals'));
app.use('/api/smart-timing',   authMiddleware, require('./routes/smart-timing'));
app.use('/api/vision',         authMiddleware, require('./routes/vision'));
app.use('/api/health-scores',  authMiddleware, require('./routes/health-scores'));
app.use('/api/email',          authMiddleware, require('./routes/email'));
app.use('/api/developer',      authMiddleware, require('./routes/developer'));

const { router: settingsRouter } = require('./routes/settings');
app.use('/api/settings',   authMiddleware, settingsRouter);
const { router: dashboardRouter } = require('./routes/dashboard');
app.use('/api/dashboard',  authMiddleware, dashboardRouter);
const { router: monitoringRouter } = require('./routes/monitoring');
app.use('/api/monitoring', authMiddleware, monitoringRouter);
const { router: webhooksRouter } = require('./routes/webhooks');
app.use('/api/webhooks',   authMiddleware, webhooksRouter);

app.get('/health', (_req: any, res: any) => res.json({ status: 'OK', ts: Date.now() }));
app.listen(PORT, () => console.log(`LeadFlow API:${PORT}`));