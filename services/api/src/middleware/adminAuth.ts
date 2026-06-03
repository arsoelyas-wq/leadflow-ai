export {};
const jwt = require('jsonwebtoken');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ecofriendlyhomegoods@gmail.com,admin@leadflow.ai')
  .split(',').map((e: string) => e.trim().toLowerCase());

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'leadflow-admin-secret-2026';

const adminAuthMiddleware = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin token gerekli' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, ADMIN_SECRET);
    if (!decoded.isAdmin || !ADMIN_EMAILS.includes(decoded.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin yetkisi yok' });
    }
    req.adminEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz admin token' });
  }
};

module.exports = { adminAuthMiddleware, ADMIN_EMAILS, ADMIN_SECRET };
