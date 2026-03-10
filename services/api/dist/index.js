const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
// Stripe webhook — raw body gerekli, json'dan önce tanımla
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
const { authMiddleware } = require('./middleware/auth');
// ── PUBLIC ROUTES ─────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
// Link redirect — auth gerektirmez
const linksRouter = require('./routes/links');
app.get('/t/:code', (req, res) => {
    req.params.code = req.params.code;
    linksRouter.handle(Object.assign(req, { url: `/redirect/${req.params.code}`, path: `/redirect/${req.params.code}` }), res, () => res.status(404).send('Not found'));
});
// ── PROTECTED ROUTES ──────────────────────────────────────
app.use('/api/leads', authMiddleware, require('./routes/leads'));
app.use('/api/scrape', authMiddleware, require('./routes/scrape'));
app.use('/api/payments', authMiddleware, require('./routes/payments'));
app.use('/api/analytics', authMiddleware, require('./routes/analytics'));
app.use('/api/ai', authMiddleware, require('./routes/ai'));
app.use('/api/campaigns', authMiddleware, require('./routes/campaigns'));
app.use('/api/messages', authMiddleware, require('./routes/messages'));
app.use('/api/links', authMiddleware, linksRouter);
const { router: settingsRouter } = require('./routes/settings');
app.use('/api/settings', authMiddleware, settingsRouter);
const { router: dashboardRouter } = require('./routes/dashboard');
app.use('/api/dashboard', authMiddleware, dashboardRouter);
// ── HEALTH CHECK ──────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', ts: Date.now(), env: process.env.NODE_ENV });
});
app.listen(PORT, () => console.log(`LeadFlow API:${PORT}`));
