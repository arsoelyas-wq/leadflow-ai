export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// TOTP oluştur (Google Authenticator uyumlu)
function generateTOTP(secret: string): string {
  const time = Math.floor(Date.now() / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(time));
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32').slice(0, 10));
  hmac.update(buffer);
  const hash = hmac.digest();
  const offset = hash[19] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24 | (hash[offset+1] & 0xff) << 16 | (hash[offset+2] & 0xff) << 8 | (hash[offset+3] & 0xff)) % 1000000;
  return code.toString().padStart(6, '0');
}

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  return Array.from(crypto.randomBytes(16)).map((b: any) => chars[b % 32]).join('');
}

// 2FA kurulumu başlat
router.post('/setup', async (req: any, res: any) => {
  try {
    const secret = generateSecret();
    const { data: user } = await supabase.from('users').select('email').eq('id', req.userId).single();

    // QR kod URL (Google Authenticator format)
    const qrUrl = `otpauth://totp/LeadFlow%20AI:${encodeURIComponent(user?.email || '')}?secret=${secret}&issuer=LeadFlow%20AI`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

    // Geçici kaydet (henüz aktif değil)
    await supabase.from('user_2fa').upsert([{
      user_id: req.userId,
      secret, enabled: false,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });

    res.json({ secret, qrImageUrl, message: 'QR kodu Google Authenticator ile okutun' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 2FA doğrula ve aktif et
router.post('/verify', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Kod zorunlu' });

    const { data: twofa } = await supabase.from('user_2fa').select('secret').eq('user_id', req.userId).single();
    if (!twofa) return res.status(404).json({ error: '2FA kurulmamış' });

    const expected = generateTOTP(twofa.secret);
    if (code !== expected) return res.status(400).json({ error: 'Geçersiz kod' });

    await supabase.from('user_2fa').update({ enabled: true }).eq('user_id', req.userId);
    await supabase.from('users').update({ two_fa_enabled: true }).eq('id', req.userId);

    res.json({ success: true, message: '2FA başarıyla aktif edildi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 2FA devre dışı bırak
router.post('/disable', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    const { data: twofa } = await supabase.from('user_2fa').select('secret').eq('user_id', req.userId).single();
    if (!twofa) return res.status(404).json({ error: '2FA kurulmamış' });

    const expected = generateTOTP(twofa.secret);
    if (code !== expected) return res.status(400).json({ error: 'Geçersiz kod' });

    await supabase.from('user_2fa').update({ enabled: false }).eq('user_id', req.userId);
    await supabase.from('users').update({ two_fa_enabled: false }).eq('id', req.userId);

    res.json({ message: '2FA devre dışı bırakıldı' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 2FA durumu
router.get('/status', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('user_2fa').select('enabled').eq('user_id', req.userId).single();
    res.json({ enabled: data?.enabled || false });
  } catch { res.json({ enabled: false }); }
});

module.exports = router;