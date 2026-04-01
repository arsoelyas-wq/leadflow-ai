export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── SMTP TRANSPORTER OLUŞTUR ──────────────────────────────
async function createTransporter(userId: string) {
  const { data: settings } = await supabase.from('smtp_settings')
    .select('*').eq('user_id', userId).single();

  if (!settings?.smtp_host) throw new Error('SMTP ayarları eksik — Ayarlar sayfasından SMTP bilgilerini girin');

  return {
    transporter: nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: settings.smtp_port === 465,
      auth: { user: settings.smtp_user, pass: settings.smtp_pass },
      tls: { rejectUnauthorized: false },
    }),
    settings,
  };
}

// ── AI EMAIL İÇERİĞİ ÜRET ────────────────────────────────
async function generateEmailContent(subject: string, goal: string, companyName: string): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Profesyonel HTML email yaz. SADECE JSON döndür:
Konu: ${subject}
Hedef: ${goal}
Şirket: ${companyName}

{
  "subject": "email konusu",
  "preheader": "önizleme metni max 90 karakter",
  "html": "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;'><h2 style='color:#1e40af;'>Başlık</h2><p>Gövde metni...</p><a href='#' style='background:#1e40af;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;'>CTA Butonu</a></div>",
  "text": "düz metin versiyonu"
}`
      }]
    });
    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

// ── SMTP AYARLARINI KAYDET ────────────────────────────────
router.post('/settings', async (req: any, res: any) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email } = req.body;
    if (!smtp_host || !smtp_user || !smtp_pass) return res.status(400).json({ error: 'smtp_host, smtp_user, smtp_pass zorunlu' });

    await supabase.from('smtp_settings').upsert([{
      user_id: req.userId,
      smtp_host, smtp_port: smtp_port || 587,
      smtp_user, smtp_pass,
      from_name: from_name || smtp_user,
      from_email: from_email || smtp_user,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });

    res.json({ message: 'SMTP ayarları kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── SMTP TEST ─────────────────────────────────────────────
router.post('/test', async (req: any, res: any) => {
  try {
    const { transporter, settings } = await createTransporter(req.userId);

    await transporter.sendMail({
      from: `${settings.from_name} <${settings.from_email}>`,
      to: settings.smtp_user,
      subject: 'LeadFlow AI — SMTP Test',
      html: '<h2>✅ SMTP bağlantısı başarılı!</h2><p>LeadFlow AI email sistemi çalışıyor.</p>',
      text: 'SMTP bağlantısı başarılı!',
    });

    res.json({ message: 'Test emaili gönderildi! Gelen kutunuzu kontrol edin.' });
  } catch (e: any) { res.status(500).json({ error: `SMTP hatası: ${e.message}` }); }
});

// ── SMTP AYARLARINI OKU ───────────────────────────────────
router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('smtp_settings').select('smtp_host,smtp_port,smtp_user,from_name,from_email,updated_at').eq('user_id', req.userId).single();
    res.json({ settings: data || null });
  } catch { res.json({ settings: null }); }
});

// ── EMAIL GÖNDER ──────────────────────────────────────────
router.post('/send', async (req: any, res: any) => {
  try {
    const { subject, html, text, leadIds, scheduleAt } = req.body;
    if (!subject || (!html && !text) || !leadIds?.length) return res.status(400).json({ error: 'subject, html/text ve leadIds zorunlu' });

    const { transporter, settings } = await createTransporter(req.userId);

    const { data: leads } = await supabase.from('leads')
      .select('id, email, company_name, contact_name')
      .eq('user_id', req.userId)
      .in('id', leadIds)
      .not('email', 'is', null);

    if (!leads?.length) return res.status(400).json({ error: 'Email adresi olan lead bulunamadı' });

    let sent = 0, failed = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        const personalHtml = (html || '').replace(/\{isim\}/g, lead.contact_name || lead.company_name || 'Sayın Yetkili').replace(/\{sirket\}/g, lead.company_name || '');
        const personalText = (text || '').replace(/\{isim\}/g, lead.contact_name || lead.company_name || '').replace(/\{sirket\}/g, lead.company_name || '');

        await transporter.sendMail({
          from: `${settings.from_name} <${settings.from_email}>`,
          to: lead.email,
          subject,
          html: personalHtml,
          text: personalText || undefined,
        });

        await supabase.from('messages').insert([{
          user_id: req.userId, lead_id: lead.id,
          direction: 'out', content: subject,
          channel: 'email', sent_at: new Date().toISOString(),
        }]);

        sent++;
        await new Promise(r => setTimeout(r, 150)); // Rate limit
      } catch (e: any) {
        failed++;
        errors.push(`${lead.email}: ${e.message}`);
      }
    }

    // Kampanya kaydet
    await supabase.from('email_campaigns').insert([{
      user_id: req.userId, subject, html, text,
      sent_count: sent, failed_count: failed,
      lead_count: leadIds.length,
      from_email: settings.from_email,
      sent_at: new Date().toISOString(),
    }]);

    res.json({ sent, failed, errors: errors.slice(0, 5), message: `${sent} email gönderildi, ${failed} başarısız` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── AI EMAIL ÜRET ─────────────────────────────────────────
router.post('/generate', async (req: any, res: any) => {
  try {
    const { subject, goal } = req.body;
    const { data: settings } = await supabase.from('smtp_settings').select('from_name').eq('user_id', req.userId).single();
    const content = await generateEmailContent(subject || 'Özel Teklif', goal || 'Lead dönüşümü', settings?.from_name || 'Şirketimiz');
    if (!content) return res.status(500).json({ error: 'İçerik üretilemedi' });
    res.json({ content });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── TEK EMAIL GÖNDER ──────────────────────────────────────
router.post('/send-single', async (req: any, res: any) => {
  try {
    const { to, subject, html, text, leadId } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'to ve subject zorunlu' });

    const { transporter, settings } = await createTransporter(req.userId);

    await transporter.sendMail({
      from: `${settings.from_name} <${settings.from_email}>`,
      to, subject,
      html: html || `<p>${text}</p>`,
      text: text || undefined,
    });

    if (leadId) {
      await supabase.from('messages').insert([{
        user_id: req.userId, lead_id: leadId,
        direction: 'out', content: subject,
        channel: 'email', sent_at: new Date().toISOString(),
      }]);
    }

    res.json({ message: 'Email gönderildi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── KAMPANYA LİSTESİ ──────────────────────────────────────
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('email_campaigns').select('*')
      .eq('user_id', req.userId).order('sent_at', { ascending: false }).limit(20);
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const [campaigns, smtpSettings] = await Promise.all([
      supabase.from('email_campaigns').select('sent_count, failed_count').eq('user_id', req.userId),
      supabase.from('smtp_settings').select('smtp_host, from_email').eq('user_id', req.userId).single(),
    ]);

    res.json({
      totalCampaigns: campaigns.data?.length || 0,
      totalSent: campaigns.data?.reduce((a: number, c: any) => a + (c.sent_count || 0), 0) || 0,
      configured: !!smtpSettings.data?.smtp_host,
      fromEmail: smtpSettings.data?.from_email || null,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;