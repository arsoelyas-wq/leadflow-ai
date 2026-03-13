export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dns = require('dns').promises;

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── DISPOSABLE EMAIL DOMAINLERI ───────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'guerrillamail.com', 'mailinator.com', 'trashmail.com',
  'yopmail.com', 'throwaway.email', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'grr.la', 'guerrillamail.info', 'spam4.me',
  'temp-mail.org', 'dispostable.com', 'maildrop.cc', 'mailnull.com',
  'spamgourmet.com', '10minutemail.com', 'disposablemail.com', 'tmpmail.net',
]);

// ── GLOBAL TELEFON FORMATI ────────────────────────────────
// Ülke kodu → regex pattern
const PHONE_PATTERNS: Record<string, { pattern: RegExp; operators?: string[] }> = {
  'TR': { pattern: /^(\+90|0090|90|0)?[5][0-9]{9}$/, operators: ['Turkcell', 'Vodafone', 'Türk Telekom'] },
  'US': { pattern: /^(\+1)?[2-9][0-9]{9}$/ },
  'DE': { pattern: /^(\+49)?[1-9][0-9]{6,11}$/ },
  'GB': { pattern: /^(\+44)?[7][0-9]{9}$/ },
  'FR': { pattern: /^(\+33)?[6-7][0-9]{8}$/ },
  'NL': { pattern: /^(\+31)?[6][0-9]{8}$/ },
  'AE': { pattern: /^(\+971)?[5][0-9]{8}$/ },
  'SA': { pattern: /^(\+966)?[5][0-9]{8}$/ },
  'RU': { pattern: /^(\+7)?[9][0-9]{9}$/ },
  'DEFAULT': { pattern: /^[\+]?[1-9][0-9]{6,14}$/ },
};

// Türkiye operatör tespiti
const TR_OPERATORS: Record<string, string> = {
  '530': 'Turkcell', '531': 'Turkcell', '532': 'Turkcell', '533': 'Turkcell',
  '534': 'Turkcell', '535': 'Turkcell', '536': 'Turkcell', '537': 'Turkcell',
  '538': 'Turkcell', '539': 'Turkcell',
  '540': 'Vodafone', '541': 'Vodafone', '542': 'Vodafone', '543': 'Vodafone',
  '544': 'Vodafone', '545': 'Vodafone', '546': 'Vodafone', '547': 'Vodafone',
  '548': 'Vodafone', '549': 'Vodafone',
  '550': 'Türk Telekom', '551': 'Türk Telekom', '552': 'Türk Telekom',
  '553': 'Türk Telekom', '554': 'Türk Telekom', '555': 'Türk Telekom',
  '556': 'Türk Telekom', '557': 'Türk Telekom', '558': 'Türk Telekom',
  '559': 'Türk Telekom', '505': 'Türk Telekom', '506': 'Türk Telekom',
  '507': 'Türk Telekom',
};

// ── TELEFON DOĞRULAMA ─────────────────────────────────────
function validatePhone(phone: string): {
  valid: boolean;
  formatted: string;
  country: string;
  operator?: string;
  score: number;
  reason?: string;
} {
  if (!phone) return { valid: false, formatted: '', country: '', score: 0, reason: 'Telefon yok' };

  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Çok kısa veya uzun
  if (cleaned.length < 7 || cleaned.length > 16) {
    return { valid: false, formatted: cleaned, country: '', score: 0, reason: 'Geçersiz uzunluk' };
  }

  // Ülke tespiti
  let country = 'DEFAULT';
  let operator: string | undefined;

  if (/^(\+90|0090|90|05)/.test(cleaned)) {
    country = 'TR';
    const prefix = cleaned.replace(/^\+90|^0090|^90|^0/, '').substring(0, 3);
    operator = TR_OPERATORS[prefix];
  } else if (/^(\+1|001)/.test(cleaned)) country = 'US';
  else if (/^(\+49|0049)/.test(cleaned)) country = 'DE';
  else if (/^(\+44|0044)/.test(cleaned)) country = 'GB';
  else if (/^(\+33|0033)/.test(cleaned)) country = 'FR';
  else if (/^(\+31|0031)/.test(cleaned)) country = 'NL';
  else if (/^(\+971|00971)/.test(cleaned)) country = 'AE';
  else if (/^(\+966|00966)/.test(cleaned)) country = 'SA';
  else if (/^(\+7|007)/.test(cleaned)) country = 'RU';

  const { pattern } = PHONE_PATTERNS[country] || PHONE_PATTERNS['DEFAULT'];
  const valid = pattern.test(cleaned);

  // Formatlı numara
  let formatted = cleaned;
  if (country === 'TR') {
    const digits = cleaned.replace(/^\+90|^0090|^90|^0/, '');
    formatted = `+90${digits}`;
  } else if (!cleaned.startsWith('+')) {
    formatted = `+${cleaned}`;
  }

  return {
    valid,
    formatted,
    country,
    operator,
    score: valid ? (operator ? 30 : 25) : 5,
    reason: valid ? undefined : 'Geçersiz format',
  };
}

// ── EMAIL DOĞRULAMA ───────────────────────────────────────
async function validateEmail(email: string): Promise<{
  valid: boolean;
  score: number;
  reason?: string;
  mxValid?: boolean;
  disposable?: boolean;
}> {
  if (!email) return { valid: false, score: 0, reason: 'Email yok' };

  // Format kontrolü
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, score: 0, reason: 'Geçersiz format' };
  }

  const domain = email.split('@')[1].toLowerCase();

  // Disposable email kontrolü
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, score: 5, reason: 'Geçici email adresi', disposable: true };
  }

  // MX record kontrolü (DNS)
  let mxValid = false;
  try {
    const mxRecords = await dns.resolveMx(domain);
    mxValid = mxRecords && mxRecords.length > 0;
  } catch {
    mxValid = false;
  }

  if (!mxValid) {
    return { valid: false, score: 5, reason: 'Email sunucusu bulunamadı', mxValid: false };
  }

  // Kurumsal email mi? (gmail, hotmail vb. değil)
  const freeProviders = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'icloud.com', 'aol.com', 'yandex.com', 'mail.com', 'protonmail.com',
    'yandex.ru', 'mail.ru', 'hotmail.co.uk', 'yahoo.co.uk',
  ]);

  const isCorporate = !freeProviders.has(domain);
  const score = mxValid ? (isCorporate ? 25 : 15) : 5;

  return {
    valid: true,
    score,
    mxValid: true,
    disposable: false,
    reason: isCorporate ? 'Kurumsal email' : 'Kişisel email (geçerli)',
  };
}

// ── WEBSITE DOĞRULAMA ─────────────────────────────────────
async function validateWebsite(website: string): Promise<{
  valid: boolean;
  score: number;
  reachable?: boolean;
}> {
  if (!website) return { valid: false, score: 0 };

  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const domain = new URL(url).hostname;

    // DNS A kaydı var mı?
    await dns.resolve4(domain);
    return { valid: true, score: 15, reachable: true };
  } catch {
    return { valid: false, score: 5, reachable: false };
  }
}

// ── ANA SKOR HESAPLAMA ────────────────────────────────────
async function calculateLeadScore(lead: any): Promise<{
  score: number;
  breakdown: Record<string, number>;
  phone: any;
  email: any;
  website: any;
  grade: string;
}> {
  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  // Telefon kontrolü
  const phoneResult = validatePhone(lead.phone || '');
  breakdown.phone = phoneResult.score;
  totalScore += phoneResult.score;

  // Email kontrolü
  const emailResult = await validateEmail(lead.email || '');
  breakdown.email = emailResult.score;
  totalScore += emailResult.score;

  // Website kontrolü
  const websiteResult = await validateWebsite(lead.website || '');
  breakdown.website = websiteResult.score;
  totalScore += websiteResult.score;

  // Şehir bilgisi
  if (lead.city && lead.city.length > 1) {
    breakdown.city = 10;
    totalScore += 10;
  }

  // Şirket adı kalitesi
  if (lead.company_name && lead.company_name.length > 3 && !/^\d+$/.test(lead.company_name)) {
    breakdown.company = 10;
    totalScore += 10;
  }

  // Google rating
  if (lead.rating && lead.rating >= 4.0) {
    breakdown.rating = 10;
    totalScore += 10;
  }

  // Review sayısı
  if (lead.review_count && lead.review_count >= 10) {
    breakdown.reviews = 5;
    totalScore += 5;
  }

  // Sektör bilgisi
  if (lead.sector && lead.sector.length > 2) {
    breakdown.sector = 5;
    totalScore += 5;
  }

  const finalScore = Math.min(totalScore, 100);

  // Not sistemi
  let grade = 'F';
  if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 65) grade = 'B';
  else if (finalScore >= 50) grade = 'C';
  else if (finalScore >= 35) grade = 'D';

  return {
    score: finalScore,
    breakdown,
    phone: phoneResult,
    email: emailResult,
    website: websiteResult,
    grade,
  };
}

// ── ROUTES ────────────────────────────────────────────────

// Tek lead doğrula
router.post('/validate', async (req: any, res: any) => {
  try {
    const { phone, email, website, company_name, city, sector, rating, review_count } = req.body;
    const result = await calculateLeadScore({ phone, email, website, company_name, city, sector, rating, review_count });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Tüm leadleri toplu doğrula ve güncelle
router.post('/batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds } = req.body;

    const query = supabase.from('leads').select('*').eq('user_id', userId);
    if (leadIds?.length) query.in('id', leadIds);

    const { data: leads, error } = await query.limit(50);
    if (error) throw error;
    if (!leads?.length) return res.json({ message: 'Lead bulunamadı', updated: 0 });

    let updated = 0;
    const results = [];

    for (const lead of leads) {
      try {
        const result = await calculateLeadScore(lead);

        await supabase.from('leads')
          .update({ score: result.score })
          .eq('id', lead.id);

        results.push({
          id: lead.id,
          company_name: lead.company_name,
          oldScore: lead.score,
          newScore: result.score,
          grade: result.grade,
          phone: result.phone,
          email: result.email,
        });

        updated++;

        // DNS rate limit için kısa bekleme
        await new Promise(r => setTimeout(r, 100));
      } catch (err: any) {
        console.error(`Lead ${lead.id} validation error:`, err.message);
      }
    }

    res.json({
      message: `${updated} lead güncellendi`,
      updated,
      results,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Telefon doğrula
router.post('/phone', async (req: any, res: any) => {
  const { phone } = req.body;
  res.json(validatePhone(phone || ''));
});

// Email doğrula
router.post('/email', async (req: any, res: any) => {
  const { email } = req.body;
  res.json(await validateEmail(email || ''));
});

module.exports = router;