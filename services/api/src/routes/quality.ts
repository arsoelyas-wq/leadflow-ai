export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dns = require('dns').promises;

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'guerrillamail.com', 'mailinator.com', 'trashmail.com',
  'yopmail.com', 'throwaway.email', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'grr.la', 'guerrillamail.info', 'spam4.me',
  'temp-mail.org', 'dispostable.com', 'maildrop.cc', 'mailnull.com',
  'spamgourmet.com', '10minutemail.com', 'disposablemail.com', 'tmpmail.net',
]);

const FREE_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'aol.com', 'yandex.com', 'mail.com', 'protonmail.com',
  'yandex.ru', 'mail.ru', 'hotmail.co.uk', 'yahoo.co.uk', 'googlemail.com',
]);

const ROLE_BASED_PREFIXES = new Set([
  'info', 'contact', 'hello', 'support', 'help', 'admin', 'sales',
  'marketing', 'hr', 'jobs', 'careers', 'noreply', 'no-reply',
  'webmaster', 'postmaster', 'abuse', 'security', 'billing',
  'invoice', 'accounts', 'office', 'team', 'mail', 'email', 'bilgi',
  'iletisim', 'musteri', 'destek', 'satis', 'muhasebe',
]);

const PHONE_PATTERNS: Record<string, { pattern: RegExp }> = {
  'TR': { pattern: /^(\+90|0090|90|0)?[5][0-9]{9}$/ },
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

const TR_OPERATORS: Record<string, { name: string; type: 'mobile' | 'landline' }> = {
  '530': { name: 'Turkcell', type: 'mobile' }, '531': { name: 'Turkcell', type: 'mobile' },
  '532': { name: 'Turkcell', type: 'mobile' }, '533': { name: 'Turkcell', type: 'mobile' },
  '534': { name: 'Turkcell', type: 'mobile' }, '535': { name: 'Turkcell', type: 'mobile' },
  '536': { name: 'Turkcell', type: 'mobile' }, '537': { name: 'Turkcell', type: 'mobile' },
  '538': { name: 'Turkcell', type: 'mobile' }, '539': { name: 'Turkcell', type: 'mobile' },
  '540': { name: 'Vodafone', type: 'mobile' }, '541': { name: 'Vodafone', type: 'mobile' },
  '542': { name: 'Vodafone', type: 'mobile' }, '543': { name: 'Vodafone', type: 'mobile' },
  '544': { name: 'Vodafone', type: 'mobile' }, '545': { name: 'Vodafone', type: 'mobile' },
  '546': { name: 'Vodafone', type: 'mobile' }, '547': { name: 'Vodafone', type: 'mobile' },
  '548': { name: 'Vodafone', type: 'mobile' }, '549': { name: 'Vodafone', type: 'mobile' },
  '550': { name: 'Türk Telekom', type: 'mobile' }, '551': { name: 'Türk Telekom', type: 'mobile' },
  '552': { name: 'Türk Telekom', type: 'mobile' }, '553': { name: 'Türk Telekom', type: 'mobile' },
  '554': { name: 'Türk Telekom', type: 'mobile' }, '555': { name: 'Türk Telekom', type: 'mobile' },
  '556': { name: 'Türk Telekom', type: 'mobile' }, '557': { name: 'Türk Telekom', type: 'mobile' },
  '558': { name: 'Türk Telekom', type: 'mobile' }, '559': { name: 'Türk Telekom', type: 'mobile' },
  '505': { name: 'Türk Telekom', type: 'mobile' }, '506': { name: 'Türk Telekom', type: 'mobile' },
  '507': { name: 'Türk Telekom', type: 'mobile' },
  '212': { name: 'Türk Telekom', type: 'landline' }, '216': { name: 'Türk Telekom', type: 'landline' },
  '312': { name: 'Türk Telekom', type: 'landline' }, '232': { name: 'Türk Telekom', type: 'landline' },
  '224': { name: 'Türk Telekom', type: 'landline' },
};

function detectLineType(phone: string, country: string): 'mobile' | 'landline' | 'unknown' {
  const cleaned = phone.replace(/\D/g, '');
  if (country === 'TR') {
    const prefix = cleaned.replace(/^90|^0/, '').substring(0, 3);
    return TR_OPERATORS[prefix]?.type || 'unknown';
  }
  const mobilePatterns: Record<string, RegExp> = {
    'GB': /^44[7]/, 'DE': /^49[1][5-7]/, 'FR': /^33[6-7]/,
    'NL': /^31[6]/, 'AE': /^971[5]/, 'SA': /^966[5]/, 'RU': /^7[9]/,
  };
  const pattern = mobilePatterns[country];
  if (pattern && pattern.test(cleaned)) return 'mobile';
  return 'unknown';
}

function validatePhone(phone: string) {
  if (!phone) return { valid: false, formatted: '', country: '', lineType: 'unknown', score: 0, reason: 'Telefon yok' };
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.length < 7 || cleaned.length > 16) {
    return { valid: false, formatted: cleaned, country: '', lineType: 'unknown', score: 0, reason: 'Geçersiz uzunluk' };
  }

  let country = 'DEFAULT';
  let operator: string | undefined;

  if (/^(\+90|0090|90|05)/.test(cleaned)) {
    country = 'TR';
    const prefix = cleaned.replace(/^\+90|^0090|^90|^0/, '').substring(0, 3);
    operator = TR_OPERATORS[prefix]?.name;
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

  let formatted = cleaned;
  if (country === 'TR') {
    const digits = cleaned.replace(/^\+90|^0090|^90|^0/, '');
    formatted = `+90${digits}`;
  } else if (!cleaned.startsWith('+')) {
    formatted = `+${cleaned}`;
  }

  const lineType = detectLineType(cleaned, country);
  const score = valid ? (lineType === 'mobile' ? 30 : lineType === 'landline' ? 20 : 25) : 5;

  return { valid, formatted, country, operator, lineType, score, reason: valid ? undefined : 'Geçersiz format' };
}

async function validateEmail(email: string) {
  if (!email) return { valid: false, score: 0, reason: 'Email yok' };

  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return { valid: false, score: 0, reason: 'Geçersiz format' };

  const domain = email.split('@')[1].toLowerCase();
  const local = email.split('@')[0].toLowerCase();

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, score: 5, reason: 'Geçici email adresi', disposable: true };
  }

  let mxValid = false;
  try {
    const mxRecords = await dns.resolveMx(domain);
    mxValid = mxRecords && mxRecords.length > 0;
  } catch { mxValid = false; }

  if (!mxValid) return { valid: false, score: 5, reason: 'Email sunucusu bulunamadı', mxValid: false };

  const corporate = !FREE_PROVIDERS.has(domain);
  const isRoleBased = ROLE_BASED_PREFIXES.has(local);
  const isPersonal = /^[a-z]+(\.[a-z]+)?[0-9]{0,4}$/.test(local) && !isRoleBased;

  // Güven seviyesi ve skor
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let bonusScore = 0;
  let deliverabilityReason = '';

  if (isPersonal && corporate) {
    confidence = 'high';
    bonusScore = 15;
    deliverabilityReason = 'Kişisel kurumsal email — yüksek teslim güveni';
  } else if (isRoleBased && corporate) {
    confidence = 'medium';
    bonusScore = 8;
    deliverabilityReason = 'Departman emaili (info@, sales@ vb.)';
  } else if (corporate) {
    confidence = 'medium';
    bonusScore = 10;
    deliverabilityReason = 'Kurumsal email';
  } else {
    confidence = 'low';
    bonusScore = 0;
    deliverabilityReason = 'Kişisel email (geçerli)';
  }

  const score = 10 + bonusScore; // base 10 + bonus

  return {
    valid: true,
    score,
    mxValid: true,
    disposable: false,
    corporate,
    isRoleBased,
    confidence,
    reason: deliverabilityReason,
  };
}

async function validateWebsite(website: string) {
  if (!website) return { valid: false, score: 0 };
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const domain = new URL(url).hostname;
    await dns.resolve4(domain);
    return { valid: true, score: 15, reachable: true };
  } catch {
    return { valid: false, score: 5, reachable: false };
  }
}

async function calculateLeadScore(lead: any) {
  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  const phoneResult = validatePhone(lead.phone || '');
  breakdown.phone = phoneResult.score;
  totalScore += phoneResult.score;

  const emailResult = await validateEmail(lead.email || '');
  breakdown.email = emailResult.score;
  totalScore += emailResult.score;

  const websiteResult = await validateWebsite(lead.website || '');
  breakdown.website = websiteResult.score;
  totalScore += websiteResult.score;

  if (lead.city?.length > 1) { breakdown.city = 10; totalScore += 10; }
  if (lead.company_name?.length > 3 && !/^\d+$/.test(lead.company_name)) { breakdown.company = 10; totalScore += 10; }
  if (lead.rating >= 4.0) { breakdown.rating = 10; totalScore += 10; }
  if (lead.review_count >= 10) { breakdown.reviews = 5; totalScore += 5; }
  if (lead.sector?.length > 2) { breakdown.sector = 5; totalScore += 5; }

  const finalScore = Math.min(totalScore, 100);
  let grade = 'F';
  if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 65) grade = 'B';
  else if (finalScore >= 50) grade = 'C';
  else if (finalScore >= 35) grade = 'D';

  return { score: finalScore, breakdown, phone: phoneResult, email: emailResult, website: websiteResult, grade };
}

router.post('/validate', async (req: any, res: any) => {
  try {
    const result = await calculateLeadScore(req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

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
        await supabase.from('leads').update({ score: result.score }).eq('id', lead.id);
        results.push({ id: lead.id, company_name: lead.company_name, oldScore: lead.score, newScore: result.score, grade: result.grade });
        updated++;
        await new Promise(r => setTimeout(r, 100));
      } catch (err: any) {
        console.error(`Lead ${lead.id} error:`, err.message);
      }
    }

    res.json({ message: `${updated} lead güncellendi`, updated, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/phone', async (req: any, res: any) => {
  res.json(validatePhone(req.body.phone || ''));
});

router.post('/email', async (req: any, res: any) => {
  res.json(await validateEmail(req.body.email || ''));
});

module.exports = router;