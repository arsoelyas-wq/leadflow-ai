export {};
const jwt = require('jsonwebtoken');

// Both secrets are REQUIRED — no hardcoded fallbacks
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
if (!ADMIN_SECRET) {
  console.error('[FATAL] ADMIN_JWT_SECRET (or JWT_SECRET) environment variable is not set. Refusing to start.');
  process.exit(1);
}

// Admin emails come from env only — never hardcoded in source
const ADMIN_EMAILS_RAW = process.env.ADMIN_EMAILS;
if (!ADMIN_EMAILS_RAW) {
  console.error('[FATAL] ADMIN_EMAILS environment variable is not set. Refusing to start.');
  process.exit(1);
}
const ADMIN_EMAILS = ADMIN_EMAILS_RAW.split(',').map((e: string) => e.trim().toLowerCase());

const adminAuthMiddleware = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin token gerekli' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, ADMIN_SECRET);
    if (!decoded.isAdmin || !ADMIN_EMAILS.includes(decoded.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }
    req.adminEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
};

module.exports = { adminAuthMiddleware, ADMIN_EMAILS, ADMIN_SECRET };
