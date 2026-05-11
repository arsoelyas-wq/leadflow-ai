export {};
const jwt = require('jsonwebtoken');

const authMiddleware = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token gerekli' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'leadflow-super-secret-jwt-key-2026');
    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch (err: any) {
    console.error('[Auth] FAILED path:', req.path, '| reason:', err.message?.slice(0, 60));
    return res.status(401).json({ error: 'Gecersiz veya suresi dolmus token' });
  }
};

module.exports = { authMiddleware };