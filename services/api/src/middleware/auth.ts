export {};
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

// Lazy supabase client (initialized after env vars are loaded)
let _sb: any = null;
function getSb() {
  if (!_sb) _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return _sb;
}

const authMiddleware = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token gerekli' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Check token blocklist (jti-based revocation)
    if (decoded.jti) {
      const { data: blocked } = await getSb()
        .from('token_blocklist')
        .select('jti')
        .eq('jti', decoded.jti)
        .maybeSingle();
      if (blocked) return res.status(401).json({ error: 'Oturum sonlandırıldı' });
    }

    // Check per-user revoke-all timestamp
    if (decoded.iat) {
      const { data: usr } = await getSb()
        .from('users')
        .select('tokens_revoked_at')
        .eq('id', decoded.userId)
        .maybeSingle();
      if (usr?.tokens_revoked_at) {
        const revokedAt = new Date(usr.tokens_revoked_at).getTime() / 1000;
        if (decoded.iat < revokedAt) return res.status(401).json({ error: 'Oturum sonlandırıldı' });
      }
    }

    req.userId = decoded.userId;
    req.email  = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
};

module.exports = { authMiddleware, JWT_SECRET };