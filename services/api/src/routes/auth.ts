export {};
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Field isimlerini frontend formatına çevir
function formatUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    company: u.company,
    sector: u.sector,
    planType: u.plan_type,
    creditsTotal: u.credits_total,
    creditsUsed: u.credits_used,
    onboardingDone: u.onboarding_done,
    countryCode: u.country_code || 'TR',
    languageCode: u.language_code || 'tr',
    currency: u.currency || 'TRY',
    timezone: u.timezone || 'Europe/Istanbul',
  }
}

// KAYIT OL
router.post('/register', async (req: any, res: any) => {
  try {
    const { email, password, name, company } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: 'Email, sifre ve isim zorunlu' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Sifre en az 6 karakter olmali' });

    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).single();
    if (existing)
      return res.status(400).json({ error: 'Bu email zaten kayitli' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        email, name, company: company || null,
        password_hash: hashedPassword,
        plan_type: 'starter',
        credits_total: 50,
        credits_used: 0,
        onboarding_done: false
      }])
      .select('id, email, name, company, plan_type, credits_total, credits_used, onboarding_done')
      .single();

    if (error) throw error;

    const jti = require('crypto').randomUUID();
    const token = jwt.sign(
      { userId: user.id, email: user.email, jti },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Kayit basarili!', token, user: formatUser(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GIRIS YAP
router.post('/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email ve sifre zorunlu' });

    const { data: user, error } = await supabase
      .from('users').select('*').eq('email', email).single();
    if (error || !user)
      return res.status(401).json({ error: 'Email veya sifre yanlis' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid)
      return res.status(401).json({ error: 'Email veya sifre yanlis' });

    const jti = require('crypto').randomUUID();
    const token = jwt.sign(
      { userId: user.id, email: user.email, jti },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Giris basarili!', token, user: formatUser(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// MEVCUT KULLANICI — /me
router.get('/me', async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token gerekli' });

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, company, plan_type, credits_total, credits_used, onboarding_done, sector, country_code, language_code, currency, timezone')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

    // ✅ { user: ... } wrapper ile dön — auth-context.tsx data.user bekliyor
    res.json({ user: formatUser(user) });
  } catch (error: any) {
    res.status(401).json({ error: 'Gecersiz token' });
  }
});

// LOGOUT — revoke current token by adding jti to blocklist
router.post('/logout', async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.json({ ok: true }); // already logged out
    const token = authHeader.split(' ')[1];
    let decoded: any;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.json({ ok: true }); }
    if (decoded?.jti) {
      const expiresAt = new Date(decoded.exp * 1000).toISOString();
      await supabase.from('token_blocklist').upsert({
        jti: decoded.jti,
        user_id: decoded.userId,
        reason: 'logout',
        expires_at: expiresAt,
      });
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true }); // always succeed logout from client's perspective
  }
});

// ŞİFREMİ UNUTTUM — email ile sıfırlama linki gönder
router.post('/forgot-password', async (req: any, res: any) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email zorunlu' });

    const { data: user } = await supabase
      .from('users').select('id, email, name, password_hash').eq('email', email.toLowerCase().trim()).single();

    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ ok: true, message: 'Eğer bu email kayıtlıysa, sıfırlama bağlantısı gönderildi.' });

    // Stateless token: signed with JWT_SECRET + current password_hash (invalidated on password change)
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'pw_reset' },
      (process.env.JWT_SECRET || '') + user.password_hash,
      { expiresIn: '1h' }
    );

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://sovlo.io';
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [user.email],
      subject: 'Sovlo AI — Şifre Sıfırlama',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#070c18;color:#e8edf5;border-radius:12px;padding:32px">
          <h2 style="color:#3b82f6;margin:0 0 16px">Şifre Sıfırlama</h2>
          <p style="color:#8fa3bc">Merhaba ${user.name || ''},</p>
          <p style="color:#8fa3bc">Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz. Bu link <strong style="color:#e8edf5">1 saat</strong> geçerlidir.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:20px 0">
            Şifremi Sıfırla
          </a>
          <p style="color:#4a6080;font-size:12px;margin-top:24px">Bu isteği siz yapmadıysanız bu emaili görmezden gelebilirsiniz. Şifreniz değişmeyecektir.</p>
          <p style="color:#4a6080;font-size:11px">Sovlo AI · sovlo.io</p>
        </div>
      `,
    });

    res.json({ ok: true, message: 'Şifre sıfırlama bağlantısı gönderildi.' });
  } catch (error: any) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ error: 'Email gönderilemedi: ' + error.message });
  }
});

// ŞİFRE SIFIRLA — token doğrula ve yeni şifreyi kaydet
router.post('/reset-password', async (req: any, res: any) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token ve yeni şifre zorunlu' });
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

    // Decode without verification to get userId
    const decoded: any = jwt.decode(token);
    if (!decoded?.userId || decoded?.purpose !== 'pw_reset') {
      return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş bağlantı' });
    }

    const { data: user } = await supabase
      .from('users').select('id, password_hash').eq('id', decoded.userId).single();

    if (!user) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });

    // Verify with the current password_hash as part of secret
    try {
      jwt.verify(token, (process.env.JWT_SECRET || '') + user.password_hash);
    } catch {
      return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş bağlantı' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await supabase.from('users').update({
      password_hash: hashedPassword,
      tokens_revoked_at: new Date().toISOString(),
    }).eq('id', user.id);

    res.json({ ok: true, message: 'Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.' });
  } catch (error: any) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── OTP YARDIMCI FONKSİYONLARI ──────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  // Remove spaces, dashes, parens
  let p = raw.replace(/[\s\-().]/g, '');
  // Turkish mobile: 05xxxxxxxxx → +905xxxxxxxxx
  if (/^0[0-9]{10}$/.test(p)) p = '+9' + p.slice(1);
  // 5xxxxxxxxx → +905xxxxxxxxx
  if (/^[5][0-9]{9}$/.test(p)) p = '+90' + p;
  // Already international but missing +
  if (/^90[0-9]{10}$/.test(p)) p = '+' + p;
  return p;
}

async function sendOTPEmail(toEmail: string, name: string, otp: string) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#070c18;border-radius:16px;padding:36px 32px">
  <div style="text-align:center;margin-bottom:28px">
    <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:12px;padding:10px 20px">
      <span style="color:#fff;font-weight:800;font-size:18px;letter-spacing:1px">SOVLO AI</span>
    </div>
  </div>
  <h2 style="color:#f1f5f9;margin:0 0 8px;font-size:22px">Giriş Doğrulama Kodu</h2>
  <p style="color:#64748b;margin:0 0 28px;font-size:14px">Merhaba${name ? ' ' + name : ''}, aşağıdaki kodu kullanarak giriş yapabilirsiniz.</p>
  <div style="background:#1e293b;border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
    <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#3b82f6;font-family:monospace">${otp}</div>
    <div style="color:#64748b;font-size:12px;margin-top:10px">Bu kod <strong style="color:#94a3b8">10 dakika</strong> geçerlidir</div>
  </div>
  <p style="color:#475569;font-size:12px;margin:0">Bu kodu siz istemediyseniz güvende olursunuz — kodu kimseyle paylaşmayın.</p>
  <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">
  <p style="color:#334155;font-size:11px;margin:0;text-align:center">Sovlo AI · sovlo.io</p>
</div>`;
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@sovlo.io',
    to: [toEmail],
    subject: `${otp} — Sovlo AI Giriş Kodu`,
    html,
  });
}

async function sendOTPSMS(phone: string, otp: string) {
  // Twilio integration (optional — works if env vars set)
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !auth || !from) {
    console.log(`[OTP SMS] ${phone} → ${otp} (Twilio not configured)`);
    return;
  }
  try {
    const twilio = require('twilio')(sid, auth);
    await twilio.messages.create({
      body: `Sovlo AI giriş kodunuz: ${otp} (10 dk geçerli)`,
      from,
      to: phone,
    });
  } catch (e: any) {
    console.error('[OTP SMS] Error:', e.message);
  }
}

// OTP GÖNDER — POST /api/auth/send-otp
router.post('/send-otp', async (req: any, res: any) => {
  try {
    const { identifier } = req.body;
    if (!identifier || identifier.trim().length < 5)
      return res.status(400).json({ error: 'Email veya telefon numarası giriniz' });

    const raw = identifier.trim();
    const isEmail = raw.includes('@');

    let user: any = null;
    if (isEmail) {
      const { data } = await supabase
        .from('users').select('id, email, name, phone, otp_locked_until, otp_attempts')
        .eq('email', raw.toLowerCase()).single();
      user = data;
    } else {
      const phone = normalizePhone(raw);
      const { data } = await supabase
        .from('users').select('id, email, name, phone, otp_locked_until, otp_attempts')
        .eq('phone', phone).single();
      user = data;
    }

    // Always return 200 (prevent enumeration)
    if (!user) return res.json({ ok: true, masked_email: null });

    // Rate limiting: max 5 OTP requests per hour
    if (user.otp_locked_until && new Date(user.otp_locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.otp_locked_until).getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: `Çok fazla istek. ${remaining} dakika bekleyin.` });
    }

    // Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const attempts = (user.otp_attempts || 0) + 1;
    const lockUntil = attempts >= 5
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString() // lock 1h after 5 requests
      : null;

    await supabase.from('users').update({
      otp_code: otp,
      otp_expires: expires,
      otp_attempts: lockUntil ? 0 : attempts,
      otp_locked_until: lockUntil,
    }).eq('id', user.id);

    // Send email
    await sendOTPEmail(user.email, user.name || '', otp);

    // Send SMS if phone available
    const targetPhone = user.phone || (isEmail ? null : normalizePhone(raw));
    if (targetPhone) {
      await sendOTPSMS(targetPhone, otp);
    }

    // Mask email for response (don't reveal full address)
    const [local, domain] = user.email.split('@');
    const masked = local.slice(0, 2) + '***@' + domain;
    const maskedPhone = targetPhone
      ? targetPhone.slice(0, -4).replace(/./g, '*') + targetPhone.slice(-4)
      : null;

    res.json({ ok: true, masked_email: masked, masked_phone: maskedPhone });
  } catch (e: any) {
    console.error('[send-otp]', e.message);
    res.status(500).json({ error: 'Kod gönderilemedi: ' + e.message });
  }
});

// OTP DOĞRULA — POST /api/auth/verify-otp
router.post('/verify-otp', async (req: any, res: any) => {
  try {
    const { identifier, code } = req.body;
    if (!identifier || !code)
      return res.status(400).json({ error: 'Identifier ve kod zorunlu' });

    const raw = identifier.trim();
    const isEmail = raw.includes('@');

    let user: any = null;
    if (isEmail) {
      const { data } = await supabase.from('users').select('*').eq('email', raw.toLowerCase()).single();
      user = data;
    } else {
      const phone = normalizePhone(raw);
      const { data } = await supabase.from('users').select('*').eq('phone', phone).single();
      user = data;
    }

    if (!user) return res.status(401).json({ error: 'Hesap bulunamadı' });
    if (!user.otp_code) return res.status(401).json({ error: 'Önce kod isteyin' });
    if (user.otp_code !== code.trim())
      return res.status(401).json({ error: 'Kod hatalı. Tekrar kontrol edin.' });
    if (!user.otp_expires || new Date(user.otp_expires) < new Date())
      return res.status(401).json({ error: 'Kodun süresi doldu. Yeni kod isteyin.' });

    // Clear OTP after successful use
    await supabase.from('users').update({
      otp_code: null,
      otp_expires: null,
      otp_attempts: 0,
    }).eq('id', user.id);

    const jti = require('crypto').randomUUID();
    const token = jwt.sign(
      { userId: user.id, email: user.email, jti },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: formatUser(user) });
  } catch (e: any) {
    console.error('[verify-otp]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// REVOKE ALL TOKENS — e.g. password change or account compromise
router.post('/revoke-all', async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token gerekli' });
    const token = authHeader.split(' ')[1];
    let decoded: any;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: 'Geçersiz token' }); }
    // Mark revoke timestamp on user — all tokens before this time are invalid
    await supabase.from('users').update({ tokens_revoked_at: new Date().toISOString() }).eq('id', decoded.userId);
    res.json({ ok: true, message: 'Tüm oturumlar sonlandırıldı' });
  } catch (e: any) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

module.exports = router;