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

// Public
app.use('/api/auth', require('./routes/auth'));

// Protected
app.use('/api/leads',    authMiddleware, require('./routes/leads'));
app.use('/api/scrape',   authMiddleware, require('./routes/scrape'));
app.use('/api/payments', authMiddleware, require('./routes/payments'));
app.use('/api/analytics',authMiddleware, require('./routes/analytics'));
app.use('/api/whatsapp', authMiddleware, require('./routes/whatsapp'));
app.use('/api/email',    authMiddleware, require('./routes/email'));
app.use('/api/ai',       authMiddleware, require('./routes/ai'));
app.use('/api/campaigns', authMiddleware, require('./routes/campaigns'));
app.use('/api/messages',  authMiddleware, require('./routes/messages'));
const { router: settingsRouter } = require('./routes/settings');
app.use('/api/settings', authMiddleware, settingsRouter);
const { router: dashboardRouter } = require('./routes/dashboard');
app.use('/api/dashboard', authMiddleware, dashboardRouter);

// Health check
app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'OK', ts: Date.now(), env: process.env.NODE_ENV });
});

app.listen(PORT, () => console.log(`LeadFlow API:${PORT}`));