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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
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
      .select('id, email, name, company, plan_type, credits_total, credits_used, onboarding_done, sector')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

    // ✅ { user: ... } wrapper ile dön — auth-context.tsx data.user bekliyor
    res.json({ user: formatUser(user) });
  } catch (error: any) {
    res.status(401).json({ error: 'Gecersiz token' });
  }
});

module.exports = router;