export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');
const { fireCapiEvent } = require('../services/meta-capi');

const router     = express.Router();
const portalRouter = express.Router();
const supabase   = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://leadflow-ai-web-kappa.vercel.app';

// ─── PUPPETEER SINGLETON ─────────────────────────────────────────────────────

let _browser: any = null;

async function getBrowser() {
  if (_browser) {
    try { await _browser.pages(); return _browser; } catch { _browser = null; }
  }
  const puppeteer = require('puppeteer');
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
  });
  return _browser;
}

// ─── CALCULATIONS ─────────────────────────────────────────────────────────────

function calcTotals(items: any[], discountPct: number, taxRate: number) {
  const subtotal  = items.reduce((s: number, it: any) => s + (it.qty || 1) * (it.price || 0), 0);
  const discount  = subtotal * (discountPct / 100);
  const taxBase   = subtotal - discount;
  const tax       = taxBase * (taxRate / 100);
  const total     = taxBase + tax;
  return { subtotal, discount, tax, total };
}

function fmtMoney(n: number, currency = 'TRY') {
  // Use text symbols — avoids glyph-missing issue on headless Linux Chrome
  const sym = currency === 'TRY' ? 'TL' : currency === 'USD' ? 'USD' : 'EUR';
  return `${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}

// For display in WA messages / API responses (not PDF), keep the ₺ symbol
function fmtMoneyDisplay(n: number, currency = 'TRY') {
  const sym = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  return `${sym}${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── HTML TEMPLATE ────────────────────────────────────────────────────────────

function buildProposalHTML(p: any): string {
  const items: any[]     = JSON.parse(p.items || '[]');
  const { subtotal, discount, tax, total } = calcTotals(items, p.discount_percent || 0, p.tax_rate ?? 18);
  const currency         = p.currency || 'TRY';
  const proposalNo       = `TKL-${String(p.id || '').slice(-6).toUpperCase() || Date.now().toString().slice(-6)}`;
  const today            = new Date().toLocaleDateString('tr-TR');
  const portalLink       = `${WEB_APP_URL}/portal/proposal/${p.view_token}`;
  const hasDiscount      = (p.discount_percent || 0) > 0;
  const hasTax           = (p.tax_rate ?? 18) > 0;

  const itemRows = items.map((it: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'}">
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${it.name || ''}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.unit || 'adet'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.qty || 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmtMoney(it.price || 0, currency)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${fmtMoney((it.qty || 1) * (it.price || 0), currency)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size:13px; color:#1e293b; background:#fff; }
  .page { width:210mm; min-height:297mm; padding:0; }

  /* HEADER */
  .header { background:#0f172a; color:#fff; padding:28px 36px; display:flex; justify-content:space-between; align-items:flex-start; }
  .header-left { display:flex; align-items:center; gap:16px; }
  .company-logo { width:52px; height:52px; border-radius:10px; background:#1e40af; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700; color:#fff; overflow:hidden; }
  .company-logo img { width:100%; height:100%; object-fit:cover; border-radius:10px; }
  .company-name { font-size:20px; font-weight:700; color:#fff; }
  .company-meta { font-size:11px; color:#94a3b8; margin-top:3px; }
  .header-right { text-align:right; }
  .proposal-label { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px; }
  .proposal-no { font-size:22px; font-weight:700; color:#38bdf8; margin:4px 0; }
  .proposal-dates { font-size:11px; color:#94a3b8; line-height:1.8; }

  /* CLIENT BOX */
  .client-box { background:#f1f5f9; padding:20px 36px; border-bottom:2px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; }
  .client-to { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; }
  .client-name { font-size:18px; font-weight:700; color:#0f172a; margin:4px 0 2px; }
  .client-company { font-size:13px; color:#475569; }
  .validity-badge { background:#0f172a; color:#fff; padding:8px 16px; border-radius:20px; font-size:11px; font-weight:600; }

  /* CONTENT */
  .content { padding:28px 36px; }

  /* ITEMS TABLE */
  .items-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  .items-table thead tr { background:#0f172a; color:#fff; }
  .items-table thead th { padding:11px 12px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
  .items-table thead th:last-child, .items-table thead th:nth-child(3), .items-table thead th:nth-child(4) { text-align:right; }
  .items-table thead th:nth-child(2) { text-align:center; }

  /* TOTALS */
  .totals-section { display:flex; justify-content:flex-end; margin-bottom:24px; }
  .totals-box { width:280px; }
  .totals-row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:13px; color:#475569; }
  .totals-row.discount { color:#ef4444; }
  .totals-row.tax { color:#64748b; }
  .totals-row.grand { background:#0f172a; color:#fff; font-size:16px; font-weight:700; padding:12px 14px; border-radius:8px; margin-top:8px; border:none; }

  /* PAYMENT INFO */
  .payment-section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px 20px; margin-bottom:20px; display:flex; gap:40px; flex-wrap:wrap; }
  .payment-item { font-size:11px; color:#64748b; }
  .payment-item strong { display:block; font-size:13px; color:#1e293b; margin-top:2px; }

  /* NOTES */
  .notes-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px 16px; margin-bottom:24px; font-size:12px; color:#92400e; line-height:1.6; }
  .notes-label { font-weight:700; color:#78350f; margin-bottom:4px; }

  /* SIGNATURE */
  .signature-section { display:flex; gap:24px; margin-bottom:24px; }
  .sig-box { flex:1; border:1.5px dashed #cbd5e1; border-radius:10px; padding:16px 20px; min-height:80px; }
  .sig-label { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  .sig-line { border-bottom:1px solid #cbd5e1; margin-bottom:8px; height:40px; }
  .sig-name-label { font-size:10px; color:#94a3b8; }

  /* PORTAL LINK */
  .portal-section { background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:14px 20px; margin-bottom:24px; display:flex; align-items:center; gap:16px; }
  .portal-icon { font-size:22px; }
  .portal-text { font-size:11px; color:#1d4ed8; flex:1; }
  .portal-url { font-size:10px; color:#3b82f6; word-break:break-all; }

  /* FOOTER */
  .footer { background:#0f172a; color:#64748b; padding:14px 36px; font-size:10px; display:flex; justify-content:space-between; margin-top:auto; }

  @media print { .page { margin:0; } }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="company-logo">
        ${p.company_logo_url
          ? `<img src="${p.company_logo_url}" alt="logo">`
          : (p.sender_company || 'LF').substring(0, 2).toUpperCase()}
      </div>
      <div>
        <div class="company-name">${p.sender_company || 'LeadFlow AI'}</div>
        <div class="company-meta">
          ${p.company_address ? p.company_address + '<br>' : ''}
          ${p.company_phone ? 'Tel: ' + p.company_phone : ''}
          ${p.company_email ? ' &nbsp;|&nbsp; ' + p.company_email : ''}
        </div>
      </div>
    </div>
    <div class="header-right">
      <div class="proposal-label">Profesyonel Teklif</div>
      <div class="proposal-no">${proposalNo}</div>
      <div class="proposal-dates">
        Tarih: ${today}<br>
        Gecerlilik: ${p.valid_until || '30 gun'}
      </div>
    </div>
  </div>

  <!-- CLIENT BOX -->
  <div class="client-box">
    <div>
      <div class="client-to">Sayin</div>
      <div class="client-name">${p.contact_name || p.company_name || ''}</div>
      <div class="client-company">${p.company_name || ''}</div>
    </div>
    <div class="validity-badge">Gecerlilk: ${p.valid_until || '30 gun'}</div>
  </div>

  <!-- CONTENT -->
  <div class="content">

    <!-- ITEMS TABLE -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40%">Urun / Hizmet</th>
          <th style="width:10%">Birim</th>
          <th style="width:10%">Miktar</th>
          <th style="width:20%">Birim Fiyat</th>
          <th style="width:20%">Toplam</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- TOTALS -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row">
          <span>Ara Toplam</span>
          <span>${fmtMoney(subtotal, currency)}</span>
        </div>
        ${hasDiscount ? `<div class="totals-row discount">
          <span>Iskonto (%${p.discount_percent})</span>
          <span>-${fmtMoney(discount, currency)}</span>
        </div>` : ''}
        ${hasTax ? `<div class="totals-row tax">
          <span>KDV (%${p.tax_rate})</span>
          <span>${fmtMoney(tax, currency)}</span>
        </div>` : ''}
        <div class="totals-row grand">
          <span>GENEL TOPLAM</span>
          <span>${fmtMoney(total, currency)}</span>
        </div>
      </div>
    </div>

    <!-- PAYMENT INFO -->
    ${(p.payment_terms || p.iban || p.bank_name) ? `
    <div class="payment-section">
      ${p.payment_terms ? `<div class="payment-item">Odeme Kosullari<strong>${p.payment_terms}</strong></div>` : ''}
      ${p.bank_name    ? `<div class="payment-item">Banka<strong>${p.bank_name}</strong></div>` : ''}
      ${p.iban         ? `<div class="payment-item">IBAN<strong>${p.iban}</strong></div>` : ''}
    </div>` : ''}

    <!-- NOTES -->
    ${p.notes ? `<div class="notes-box"><div class="notes-label">Notlar</div>${p.notes}</div>` : ''}

    <!-- SIGNATURE -->
    <div class="signature-section">
      <div class="sig-box">
        <div class="sig-label">Satici Imzasi</div>
        <div class="sig-line"></div>
        <div class="sig-name-label">Ad Soyad / Unvan / Tarih</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">Alici Imzasi</div>
        <div class="sig-line">
          ${p.signature_data ? `<img src="${p.signature_data}" style="height:38px;max-width:180px;object-fit:contain">` : ''}
        </div>
        <div class="sig-name-label">
          ${p.accepted_by ? p.accepted_by + (p.accepted_title ? ' / ' + p.accepted_title : '') : 'Ad Soyad / Unvan / Tarih'}
        </div>
      </div>
    </div>

    <!-- PORTAL LINK -->
    <div class="portal-section">
      <div class="portal-icon">🔗</div>
      <div>
        <div class="portal-text">Bu teklifi online goruntulemek, kabul etmek veya reddetmek icin:</div>
        <div class="portal-url">${portalLink}</div>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Bu teklif ${p.sender_company || 'sirketimiz'} tarafindan hazirlanmistir. Teklif No: ${proposalNo}</span>
    <span>Powered by LeadFlow AI</span>
  </div>

</div>
</body>
</html>`;
}

async function htmlToPDF(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

// ─── AI HELPERS ──────────────────────────────────────────────────────────────

async function analyzeLeadMessage(message: string, lead: any, history: any[]) {
  const r = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Lead mesajını analiz et.
Şirket: ${lead.company_name}
Mesaj: "${message}"
Geçmiş (son 3): ${history.slice(-3).map((m: any) => `${m.direction}: ${m.content?.slice(0, 50)}`).join(' | ')}

SADECE JSON döndür:
{"intent":"fiyat_soruyor|teklif_istiyor|itiraz_ediyor|ilgili|olumsuz|toplanti_istiyor|pazarlik_yapiyor","urgency":"yuksek|orta|dusuk","sentiment":"pozitif|notr|negatif","keyPoints":[],"suggestedAction":"teklif_gonder|pazarlik_yap|toplanti_ayarla|bilgi_ver|bekle","response":"Türkçe cevap taslağı max 100 karakter"}`,
    }],
  });
  const match = (r.content[0]?.text || '').match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

async function generateNegotiationResponse(lead: any, message: string, analysis: any, proposal: any) {
  const r = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `B2B pazarlık yanıtı üret.
Şirket: ${lead.company_name}
Lead mesajı: "${message}"
Analiz: ${analysis?.intent} / ${analysis?.sentiment}
Mevcut teklif: ${fmtMoney(proposal?.total_price || 0)}
Min kabul: ${fmtMoney((proposal?.total_price || 0) * 0.85)}

SADECE JSON döndür:
{"tactic":"deger_vurgula|indirim_ver|paket_oner|odeme_vadesi|ucretsiz_ek|son_fiyat","discountPercent":0,"counterMessage":"max 150 karakter","newPrice":0,"sendProposal":true}`,
    }],
  });
  const match = (r.content[0]?.text || '').match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// ─── PORTAL ROUTER (public — no auth) ────────────────────────────────────────

// GET /api/proposals/portal/:token — view proposal data
portalRouter.get('/:token', async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('id,view_token,status,items,total_price,min_price,valid_until,notes,discount_percent,tax_rate,payment_terms,iban,bank_name,company_address,company_phone,company_email,company_logo_url,sender_company,currency,accepted_at,accepted_by,rejected_at,rejection_reason,created_at,lead_id')
      .eq('view_token', token)
      .single();

    if (error || !proposal) return res.status(404).json({ error: 'Teklif bulunamadı' });

    // Track view
    const now = new Date().toISOString();
    const updates: any = {
      view_count: (proposal.view_count || 0) + 1,
      viewed_at: now,
    };
    if (!proposal.first_viewed_at) updates.first_viewed_at = now;
    await supabase.from('proposals').update(updates).eq('view_token', token);

    // Load lead info
    const { data: lead } = await supabase
      .from('leads')
      .select('company_name, contact_name, city')
      .eq('id', proposal.lead_id)
      .single();

    const items = JSON.parse(proposal.items || '[]');
    const totals = calcTotals(items, proposal.discount_percent || 0, proposal.tax_rate ?? 18);

    // Meta CAPI — ViewContent on proposal portal view (non-blocking)
    if (lead && proposal.user_id) {
      try {
        await fireCapiEvent(supabase, proposal.user_id, {
          ...lead,
          id:         proposal.lead_id,
          deal_value: proposal.total_price,
        }, 'ViewContent', { value: proposal.total_price || 0 });
      } catch {}
    }

    res.json({ proposal: { ...proposal, ...totals }, lead, items });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proposals/portal/:token/accept
portalRouter.post('/:token/accept', async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const { name, title, signatureData } = req.body;
    if (!name) return res.status(400).json({ error: 'İsim zorunlu' });

    const { data: proposal } = await supabase
      .from('proposals').select('id, status, user_id, lead_id, total_price, leads(company_name)')
      .eq('view_token', token).single();

    if (!proposal) return res.status(404).json({ error: 'Teklif bulunamadı' });
    if (!['sent', 'negotiating', 'draft'].includes(proposal.status)) {
      return res.status(400).json({ error: 'Bu teklif zaten işleme alınmış' });
    }

    await supabase.from('proposals').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: name,
      accepted_title: title || '',
      signature_data: signatureData || null,
    }).eq('view_token', token);

    // Notify salesperson
    await supabase.from('ai_agent_runs').insert([{
      user_id: proposal.user_id,
      lead_id: proposal.lead_id,
      event_type: 'proposal_accepted',
      content: `${(proposal as any).leads?.company_name || 'Müşteri'} teklifi kabul etti — ₺${Number(proposal.total_price).toLocaleString('tr-TR')}`,
      metadata: { proposal_id: proposal.id, accepted_by: name },
    }]).catch(() => {});

    res.json({ ok: true, message: 'Teklif kabul edildi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proposals/portal/:token/reject
portalRouter.post('/:token/reject', async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const { data: proposal } = await supabase
      .from('proposals').select('id, user_id, lead_id')
      .eq('view_token', token).single();
    if (!proposal) return res.status(404).json({ error: 'Teklif bulunamadı' });

    await supabase.from('proposals').update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || '',
    }).eq('view_token', token);

    res.json({ ok: true, message: 'Geri bildiriminiz alındı.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proposals/portal/:token/pdf
portalRouter.get('/:token/pdf', async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const { data: proposal } = await supabase
      .from('proposals')
      .select('*, leads(company_name, contact_name)')
      .eq('view_token', token).single();
    if (!proposal) return res.status(404).json({ error: 'Teklif bulunamadı' });

    const lead = (proposal as any).leads || {};
    const pdfData = {
      ...proposal,
      company_name: lead.company_name,
      contact_name: lead.contact_name,
    };

    const html = buildProposalHTML(pdfData);
    const pdfBuffer = await htmlToPDF(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="teklif-${token.slice(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PROTECTED ROUTES ────────────────────────────────────────────────────────

// POST /api/proposals/create
router.post('/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const {
      leadId, items, notes, validUntil, senderCompany,
      taxRate = 18, discountPercent = 0, paymentTerms,
      iban, bankName, companyAddress, companyPhone, companyEmail, companyLogoUrl,
      currency = 'TRY',
    } = req.body;

    if (!leadId || !items?.length) return res.status(400).json({ error: 'leadId ve items zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const { subtotal, discount, tax, total } = calcTotals(items, discountPercent, taxRate);
    const viewToken = crypto.randomBytes(16).toString('hex');

    const { data: proposal, error } = await supabase.from('proposals').insert([{
      user_id: userId,
      lead_id: leadId,
      items: JSON.stringify(items),
      total_price: total,
      min_price: total * 0.85,
      status: 'draft',
      valid_until: validUntil || '30 gün',
      notes: notes || null,
      sender_company: senderCompany || null,
      tax_rate: taxRate,
      discount_percent: discountPercent,
      payment_terms: paymentTerms || '30 gün net',
      iban: iban || null,
      bank_name: bankName || null,
      company_address: companyAddress || null,
      company_phone: companyPhone || null,
      company_email: companyEmail || null,
      company_logo_url: companyLogoUrl || null,
      currency,
      view_token: viewToken,
    }]).select().single();

    if (error) throw error;

    const pdfData = { ...proposal, company_name: lead.company_name, contact_name: lead.contact_name };
    const html = buildProposalHTML(pdfData);
    const pdfBuffer = await htmlToPDF(html);

    res.json({
      proposalId: proposal.id,
      totalPrice: total,
      subtotal,
      discount,
      tax,
      portalLink: `${WEB_APP_URL}/portal/proposal/${viewToken}`,
      pdfBase64: pdfBuffer.toString('base64'),
      message: 'Teklif oluşturuldu!',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proposals/list
router.get('/list', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('proposals')
      .select('id,status,total_price,discount_percent,tax_rate,currency,valid_until,view_token,view_count,viewed_at,first_viewed_at,accepted_at,accepted_by,rejected_at,created_at,leads(company_name,contact_name,phone)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const proposals = (data || []).map((p: any) => ({
      ...p,
      portal_link: p.view_token ? `${WEB_APP_URL}/portal/proposal/${p.view_token}` : null,
    }));
    res.json({ proposals });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proposals/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('proposals').select('status,total_price,view_count').eq('user_id', req.userId);
    res.json({
      total: data?.length || 0,
      sent: data?.filter((p: any) => p.status === 'sent').length || 0,
      accepted: data?.filter((p: any) => p.status === 'accepted').length || 0,
      rejected: data?.filter((p: any) => p.status === 'rejected').length || 0,
      totalValue: data?.filter((p: any) => p.status === 'accepted').reduce((s: number, p: any) => s + (p.total_price || 0), 0) || 0,
      totalPipeline: data?.reduce((s: number, p: any) => s + (p.total_price || 0), 0) || 0,
      totalViews: data?.reduce((s: number, p: any) => s + (p.view_count || 0), 0) || 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proposals/:id/pdf — regenerate PDF
router.get('/:id/pdf', async (req: any, res: any) => {
  try {
    const { data: proposal } = await supabase.from('proposals')
      .select('*, leads(company_name, contact_name)')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!proposal) return res.status(404).json({ error: 'Bulunamadı' });

    const lead = (proposal as any).leads || {};
    const html = buildProposalHTML({ ...proposal, company_name: lead.company_name, contact_name: lead.contact_name });
    const pdfBuffer = await htmlToPDF(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="teklif-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proposals/send/:proposalId
router.post('/send/:proposalId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { message } = req.body;

    const { data: proposal } = await supabase.from('proposals')
      .select('*, leads(*)').eq('id', req.params.proposalId).eq('user_id', userId).single();
    if (!proposal) return res.status(404).json({ error: 'Teklif bulunamadı' });

    const phone = (proposal as any).leads?.phone;
    if (!phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const portalLink = `${WEB_APP_URL}/portal/proposal/${proposal.view_token}`;
    const firstName = ((proposal as any).leads?.contact_name || (proposal as any).leads?.company_name || '').split(' ')[0];
    const finalMsg = message || `Merhaba ${firstName}! 👋\n\nSizin için hazırladığımız teklifi görüntülemek ve onaylamak için:\n🔗 ${portalLink}\n\nToplam: ${fmtMoney(proposal.total_price)}\nGeçerlilik: ${proposal.valid_until || '30 gün'}\n\nHerhangi bir sorunuz olursa burada yazabilirsiniz. 🤝`;

    // Send via WA gateway
    const { data: instance } = await supabase.from('wa_instances')
      .select('instance_id').eq('user_id', userId).eq('status', 'connected')
      .order('created_at', { ascending: false }).limit(1).single();

    if (instance) {
      const axios = require('axios');
      const WA_GATEWAY = process.env.WA_GATEWAY || 'http://207.154.248.119:3003';
      const WA_SECRET  = process.env.WA_SECRET  || 'leadflow-wa-secret-2026';
      await axios.post(`${WA_GATEWAY}/send`, {
        secret: WA_SECRET, instanceId: instance.instance_id,
        phone: phone.replace(/\D/g, ''), text: finalMsg,
      }, { timeout: 10000 }).catch(() => {});
    }

    await supabase.from('proposals').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', req.params.proposalId);
    await supabase.from('messages').insert([{
      user_id: userId, lead_id: proposal.lead_id,
      direction: 'out', content: finalMsg, channel: 'whatsapp',
      sent_at: new Date().toISOString(),
    }]);

    res.json({ ok: true, message: 'Teklif WhatsApp\'tan gönderildi! ✅', portalLink });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proposals/analyze
router.post('/analyze', async (req: any, res: any) => {
  try {
    const { leadId, message } = req.body;
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    const { data: history } = await supabase.from('messages').select('*').eq('lead_id', leadId).order('sent_at', { ascending: false }).limit(10);
    const analysis = await analyzeLeadMessage(message, lead, history || []);
    res.json({ analysis, lead });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proposals/negotiate
router.post('/negotiate', async (req: any, res: any) => {
  try {
    const { leadId, message, proposalId } = req.body;
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    const { data: proposal } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
    const { data: history } = await supabase.from('messages').select('*').eq('lead_id', leadId).order('sent_at', { ascending: false }).limit(10);
    const analysis = await analyzeLeadMessage(message, lead, history || []);
    const negotiation = await generateNegotiationResponse(lead, message, analysis, proposal);
    if (negotiation?.newPrice && proposal) {
      await supabase.from('proposals').update({
        total_price: negotiation.newPrice,
        status: 'negotiating',
        discount_percent: negotiation.discountPercent || proposal.discount_percent,
      }).eq('id', proposalId);
    }
    res.json({ analysis, negotiation });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/proposals/:id/status
router.patch('/:id/status', async (req: any, res: any) => {
  try {
    await supabase.from('proposals').update({ status: req.body.status }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/proposals/:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    await supabase.from('proposals').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, portalRouter };
