const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── RATE LIMITERS ─────────────────────────────────────────

// Genel limit — tüm API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin.' },
});

// Auth limit — brute force koruması
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
});

// Scrape limit — pahalı işlem
const scrapeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 20,
  message: { error: 'Saatlik scrape limitine ulaştınız (20 istek/saat).' },
});

// Kampanya limit
const campaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Saatlik kampanya limitine ulaştınız.' },
});

// AI limit
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 20,
  message: { error: 'AI servisine çok fazla istek. 1 dakika bekleyin.' },
});

app.use(generalLimiter);

// Stripe webhook — raw body gerekli, json'dan önce tanımla
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const { authMiddleware } = require('./middleware/auth');

// ── PUBLIC ROUTES ─────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));

// Link redirect — auth gerektirmez
const linksRouter = require('./routes/links');
app.get('/t/:code', (req: any, res: any) => {
  linksRouter.handle(
    Object.assign(req, { url: `/redirect/${req.params.code}`, path: `/redirect/${req.params.code}` }),
    res,
    () => res.status(404).send('Not found')
  );
});

// ── PROTECTED ROUTES ──────────────────────────────────────
app.use('/api/leads',     authMiddleware, require('./routes/leads'));
app.use('/api/scrape',    authMiddleware, scrapeLimiter, require('./routes/scrape'));
app.use('/api/payments',  authMiddleware, require('./routes/payments'));
app.use('/api/analytics', authMiddleware, require('./routes/analytics'));
app.use('/api/ai',        authMiddleware, aiLimiter, require('./routes/ai'));
app.use('/api/campaigns', authMiddleware, campaignLimiter, require('./routes/campaigns'));
app.use('/api/messages',  authMiddleware, require('./routes/messages'));
app.use('/api/links',     authMiddleware, linksRouter);

const { router: settingsRouter } = require('./routes/settings');
app.use('/api/settings',  authMiddleware, settingsRouter);

const { router: dashboardRouter } = require('./routes/dashboard');
app.use('/api/dashboard', authMiddleware, dashboardRouter);

// ── HEALTH CHECK ──────────────────────────────────────────
app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'OK', ts: Date.now(), env: process.env.NODE_ENV });
});

app.listen(PORT, () => console.log(`LeadFlow API:${PORT}`));