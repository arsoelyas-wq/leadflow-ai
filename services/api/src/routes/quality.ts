export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dns = require('dns').promises;
const net = require('net');

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

// Türkiye operatör + hat tipi tespiti
const TR_OPERATORS: Record<string, { name: string; type: 'mobile' | 'landline' }> = {
  '530': { name: 'Turkcell', type: 'mobile' },
  '531': { name: 'Turkcell', type: 'mobile' },
  '532': { name: 'Turkcell', type: 'mobile' },
  '533': { name: 'Turkcell', type: 'mobile' },
  '534': { name: 'Turkcell', type: 'mobile' },
  '535': { name: 'Turkcell', type: 'mobile' },
  '536': { name: 'Turkcell', type: 'mobile' },
  '537': { name: 'Turkcell', type: 'mobile' },
  '538': { name: 'Turkcell', type: 'mobile' },
  '539': { name: 'Turkcell', type: 'mobile' },
  '540': { name: 'Vodafone', type: 'mobile' },
  '541': { name: 'Vodafone', type: 'mobile' },
  '542': { name: 'Vodafone', type: 'mobile' },
  '543': { name: 'Vodafone', type: 'mobile' },
  '544': { name: 'Vodafone', type: 'mobile' },
  '545': { name: 'Vodafone', type: 'mobile' },
  '546': { name: 'Vodafone', type: 'mobile' },
  '547': { name: 'Vodafone', type: 'mobile' },
  '548': { name: 'Vodafone', type: 'mobile' },
  '549': { name: 'Vodafone', type: 'mobile' },
  '550': { name: 'Türk Telekom', type: 'mobile' },
  '551': { name: 'Türk Telekom', type: 'mobile' },
  '552': { name: 'Türk Telekom', type: 'mobile' },
  '553': { name: 'Türk Telekom', type: 'mobile' },
  '554': { name: 'Türk Telekom', type: 'mobile' },
  '555': { name: 'Türk Telekom', type: 'mobile' },
  '556': { name: 'Türk Telekom', type: 'mobile' },
  '557': { name: 'Türk Telekom', type: 'mobile' },
  '558': { name: 'Türk Telekom', type: 'mobile' },
  '559': { name: 'Türk Telekom', type: 'mobile' },
  '505': { name: 'Türk Telekom', type: 'mobile' },
  '506': { name: 'Türk Telekom', type: 'mobile' },
  '507': { name: 'Türk Telekom', type: 'mobile' },
  // Sabit hatlar
  '212': { name: 'Türk Telekom', type: 'landline' },
  '216': { name: 'Türk Telekom', type: 'landline' },
  '312': { name: 'Türk Telekom', type: 'landline' },
  '232': { name: 'Türk Telekom', type: 'landline' },
  '224': { name: 'Türk Telekom', type: 'landline' },
};

// Global hat tipi tespiti (prefix bazlı)
function detectLineType(phone: string, country: string): 'mobile' | 'landline' | 'unknown' {
  const cleaned = phone.replace(/\D/g, '');

  if (country === 'TR') {
    const prefix = cleaned.replace(/^90|^0/, '').substring(0, 3);
    return TR_OPERATORS[prefix]?.type || 'unknown';
  }

  // Global mobile prefix tespiti
  const mobilePatterns: Record<string, RegExp> = {
    'GB': /^44[7]/,
    'DE': /^49[1][5-7]/,
    'FR': /^33[6-7]/,
    'NL': /^31[6]/,
    'US': /^1[2-9][0-9]{2}[2-9]/,
    'AE': /^971[5]/,
    'SA': /^966[5]/,
    'RU': /^7[9]/,
  };

  const pattern = mobilePatterns[country];
  if (pattern && pattern.test(cleaned)) return 'mobile';

  return 'unknown';
}

// ── SMTP PING (Email deliverability) ─────────────────────
async function smtpPing(email: string, mxHost: string): Promise<{
  deliverable: boolean;
  reason: string;
}> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ deliverable: false, reason: 'SMTP timeout' });
    }, 8000);

    try {
      const socket = net.createConnection(25, mxHost);
      let buffer = '';
      let step = 0;

      socket.setTimeout(7000);

      socket.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');

        for (const line of lines) {
          if (!line) continue;

          if (step === 0 && line.startsWith('220')) {
            // Banner aldık — EHLO gönder
            socket.write(`EHLO leadflow-checker.com\r\n`);
            step = 1;
          } else if (step === 1 && (line.startsWith('250') && !line.startsWith('250-'))) {
            // EHLO tamam — MAIL FROM gönder
            socket.write(`MAIL FROM:<check@leadflow-checker.com>\r\n`);
            step = 2;
          } else if (step === 2 && line.startsWith('250')) {
            // MAIL FROM tamam — RCPT TO gönder
            socket.write(`RCPT TO:<${email}>\r\n`);
            step = 3;
          } else if (step === 3) {
            clearTimeout(timeout);
            socket.write(`QUIT\r\n`);
            socket.destroy();

            if (line.startsWith('250') || line.startsWith('251')) {
              resolve({ deliverable: true, reason: 'Email teslim edilebilir' });
            } else if (line.startsWith('550') || line.startsWith('551') || line.startsWith('553')) {
              resolve({ deliverable: false, reason: 'Email adresi mevcut değil' });
            } else if (line.startsWith('421') || line.startsWith('450') || line.startsWith('452')) {
              resolve({ deliverable: true, reason: 'Geçici hata (muhtemelen geçerli)' });
            } else {
              resolve({ deliverable: false, reason: `SMTP yanıt: ${line.substring(0, 50)}` });
            }
          }
        }
        buffer = lines[lines.length - 1] || '';
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve({ deliverable: false, reason: 'SMTP bağlantı hatası' });
      });

      socket.on('timeout', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ deliverable: false, reason: 'SMTP timeout' });
      });

    } catch {
      clearTimeout(timeout);
      resolve({ deliverable: false, reason: 'SMTP bağlantı kurulamadı' });
    }
  });
}

// ── TELEFON DOĞRULAMA ─────────────────────────────────────
function validatePhone(phone: string): {
  valid: boolean;
  formatted: string;
  country: string;
  operator?: string;
  lineType: 'mobile' | 'landline' | 'unknown';
  score: number;
  reason?: string;
} {
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

  // Mobile numara daha değerli (WhatsApp için)
  let score = 0;
  if (valid) {
    score = lineType === 'mobile' ? 30 : lineType === 'landline' ? 20 : 25;
  } else {
    score = 5;
  }

  return { valid, formatted, country, operator, lineType, score, reason: valid ? undefined : 'Geçersiz format' };
}

// ── EMAIL DOĞRULAMA ───────────────────────────────────────
async function validateEmail(email: string, withSmtp = false): Promise<{
  valid: boolean;
  score: number;
  reason?: string;
  mxValid?: boolean;
  disposable?: boolean;
  deliverable?: boolean;
  smtpReason?: string;
  corporate?: boolean;
}> {
  if (!email) return { valid: false, score: 0, reason: 'Email yok' };

  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, score: 0, reason: 'Geçersiz format' };
  }

  const domain = email.split('@')[1].toLowerCase();

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, score: 5, reason: 'Geçici email adresi', disposable: true };
  }

  // MX record kontrolü
  let mxValid = false;
  let mxHost = '';
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      mxValid = true;
      // En yüksek öncelikli MX host
      mxHost = mxRecords.sort((a: any, b: any) => a.priority - b.priority)[0].exchange;
    }
  } catch {
    mxValid = false;
  }

  if (!mxValid) {
    return { valid: false, score: 5, reason: 'Email sunucusu bulunamadı', mxValid: false };
  }

  const freeProviders = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'icloud.com', 'aol.com', 'yandex.com', 'mail.com', 'protonmail.com',
    'yandex.ru', 'mail.ru', 'hotmail.co.uk', 'yahoo.co.uk', 'googlemail.com',
  ]);

  const corporate = !freeProviders.has(domain);

  // SMTP ping (opsiyonel — sadece istendiğinde)
  let deliverable: boolean | undefined;
  let smtpReason: string | undefined;

  if (withSmtp && mxHost) {
    try {
      const smtpResult = await smtpPing(email, mxHost);
      deliverable = smtpResult.deliverable;
      smtpReason = smtpResult.reason;
    } catch {
      deliverable = undefined;
    }
  }

  // Skor hesapla
  let score = 10; // base
  if (mxValid) score += 5;
  if (corporate) score += 10;
  if (deliverable === true) score += 10;

  return {
    valid: true,
    score,
    mxValid: true,
    disposable: false,
    corporate,
    deliverable,
    smtpReason,
    reason: corporate ? 'Kurumsal email' : 'Kişisel email (geçerli)',
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
    await dns.resolve4(domain);
    return { valid: true, score: 15, reachable: true };
  } catch {
    return { valid: false, score: 5, reachable: false };
  }
}

// ── ANA SKOR HESAPLAMA ────────────────────────────────────
async function calculateLeadScore(lead: any, withSmtp = false): Promise<{
  score: number;
  breakdown: Record<string, number>;
  phone: any;
  email: any;
  website: any;
  grade: string;
}> {
  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  const phoneResult = validatePhone(lead.phone || '');
  breakdown.phone = phoneResult.score;
  totalScore += phoneResult.score;

  const emailResult = await validateEmail(lead.email || '', withSmtp);
  breakdown.email = emailResult.score;
  totalScore += emailResult.score;

  const websiteResult = await validateWebsite(lead.website || '');
  breakdown.website = websiteResult.score;
  totalScore += websiteResult.score;

  if (lead.city && lead.city.length > 1) { breakdown.city = 10; totalScore += 10; }
  if (lead.company_name && lead.company_name.length > 3 && !/^\d+$/.test(lead.company_name)) {
    breakdown.company = 10; totalScore += 10;
  }
  if (lead.rating && lead.rating >= 4.0) { breakdown.rating = 10; totalScore += 10; }
  if (lead.review_count && lead.review_count >= 10) { breakdown.reviews = 5; totalScore += 5; }
  if (lead.sector && lead.sector.length > 2) { breakdown.sector = 5; totalScore += 5; }

  const finalScore = Math.min(totalScore, 100);

  let grade = 'F';
  if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 65) grade = 'B';
  else if (finalScore >= 50) grade = 'C';
  else if (finalScore >= 35) grade = 'D';

  return { score: finalScore, breakdown, phone: phoneResult, email: emailResult, website: websiteResult, grade };
}

// ── ROUTES ────────────────────────────────────────────────

router.post('/validate', async (req: any, res: any) => {
  try {
    const { phone, email, website, company_name, city, sector, rating, review_count, smtp } = req.body;
    const result = await calculateLeadScore(
      { phone, email, website, company_name, city, sector, rating, review_count },
      smtp === true
    );
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
        const result = await calculateLeadScore(lead, false); // batch'te smtp kapalı
        await supabase.from('leads').update({ score: result.score }).eq('id', lead.id);
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
        await new Promise(r => setTimeout(r, 100));
      } catch (err: any) {
        console.error(`Lead ${lead.id} validation error:`, err.message);
      }
    }

    res.json({ message: `${updated} lead güncellendi`, updated, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/phone', async (req: any, res: any) => {
  const { phone } = req.body;
  res.json(validatePhone(phone || ''));
});

router.post('/email', async (req: any, res: any) => {
  const { email, smtp } = req.body;
  res.json(await validateEmail(email || '', smtp === true));
});

module.exports = router;