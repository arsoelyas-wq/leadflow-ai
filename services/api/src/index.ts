const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || '*',
  credentials: true
}));
app.use(express.json());

const { authMiddleware } = require('./middleware/auth');

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes
app.use('/api/leads',     authMiddleware, require('./routes/leads'));
app.use('/api/analytics', authMiddleware, require('./routes/analytics'));
app.use('/api/scrape',    authMiddleware, require('./routes/scrape'));
app.use('/api/whatsapp',  authMiddleware, require('./routes/whatsapp'));
app.use('/api/email',     authMiddleware, require('./routes/email'));
app.use('/api/payments',  authMiddleware, require('./routes/payments'));
app.use('/api/ai',        require('./routes/ai'));

app.get('/health', (_req: any, res: any) => res.json({ status: 'OK', ts: Date.now() }));

app.listen(PORT, () => console.log(`LeadFlow API:${PORT}`));