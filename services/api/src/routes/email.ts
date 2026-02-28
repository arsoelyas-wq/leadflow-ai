export {};
const express = require('express');
const resendPkg = require('resend');
const Resend = resendPkg.Resend; 
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Tek email gonder
router.post('/send', async (req: any, res: any) => {
  try {
    const { to, subject, body, leadId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject ve body zorunlu' });
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 2px solid #B8892A; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: #1a1a2e; margin: 0; font-size: 18px;">LeadFlow AI</h2>
          </div>
          <div style="color: #333; line-height: 1.7; font-size: 14px;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
            Bu email LeadFlow AI tarafindan otomatik gonderilmistir.
          </div>
        </div>
      `
    });

    if (error) throw new Error(error.message);

    // Mesaji veritabanina kaydet
    if (leadId) {
      await supabase.from('messages').insert([{
        lead_id: leadId,
        channel: 'email',
        direction: 'outbound',
        content: `Konu: ${subject}\n\n${body}`,
        status: 'sent',
        sent_at: new Date().toISOString()
      }]);

      await supabase.from('leads')
        .update({ status: 'contacted' })
        .eq('id', leadId);
    }

    res.json({ message: 'Email basariyla gonderildi!', data });

  } catch (error: any) {
    console.error('Email Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// AI ile email olustur ve gonder
router.post('/ai-send', async (req: any, res: any) => {
  try {
    const { leadId, senderProfile } = req.body;

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return res.status(404).json({ error: 'Lead bulunamadi' });
    }

    if (!lead.email) {
      return res.status(400).json({ error: 'Bu leadin email adresi yok' });
    }

    // AI ile email olustur
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Profesyonel B2B satis emaili yaz (Turkce):
Gonderen: ${JSON.stringify(senderProfile || {})}
Alici firma: ${lead.company_name}, ${lead.city}
Sektor: ${lead.sector}

SADECE JSON don:
{
  "subject": "Email konusu",
  "body": "Email icerigi (duz metin, 3-4 paragraf)"
}`
      }]
    });

    const rawText = aiResponse.content[0].text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI yanit formati hatali');

    const { subject, body } = JSON.parse(jsonMatch[0]);

    // Email gonder
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [lead.email],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 2px solid #B8892A; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: #1a1a2e; margin: 0;">LeadFlow AI</h2>
          </div>
          <div style="color: #333; line-height: 1.7; font-size: 14px;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
            Bu email LeadFlow AI tarafindan otomatik gonderilmistir.
          </div>
        </div>
      `
    });

    if (emailError) throw new Error(emailError.message);

    await supabase.from('messages').insert([{
      lead_id: lead.id,
      channel: 'email',
      direction: 'outbound',
      content: `Konu: ${subject}\n\n${body}`,
      status: 'sent',
      sent_at: new Date().toISOString()
    }]);

    res.json({
      message: 'AI email olusturuldu ve gonderildi!',
      subject,
      body,
      emailData
    });

  } catch (error: any) {
    console.error('AI Email Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Hosgeldin emaili gonder (kayit sonrasi)
router.post('/welcome', async (req: any, res: any) => {
  try {
    const { email, name } = req.body;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [email],
      subject: 'LeadFlow AI\'a Hosgeldiniz! 50 Ucretsiz Lediniz Hazir',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0f; color: #f5f0e8;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-size: 32px; font-weight: 300; color: #f5f0e8; margin: 0;">
              Lead<span style="color: #B8892A;">Flow</span> AI
            </h1>
          </div>
          <div style="background: #15151f; border: 1px solid rgba(255,255,255,0.07); padding: 40px;">
            <h2 style="color: #B8892A; font-weight: 400; margin-top: 0;">Hosgeldiniz, ${name}!</h2>
            <p style="color: rgba(245,240,232,0.7); line-height: 1.8;">
              LeadFlow AI hesabiniz olusturuldu. Size <strong style="color: #B8892A;">50 ucretsiz lead</strong> hediye ettik.
            </p>
            <p style="color: rgba(245,240,232,0.7); line-height: 1.8;">
              Simdi yapabilecekleriniz:
            </p>
            <ul style="color: rgba(245,240,232,0.6); line-height: 2;">
              <li>Google Maps'ten hedef sektorde lead cekin</li>
              <li>AI ile kisisellestirilmis mesajlar olusturun</li>
              <li>WhatsApp ve email ile otomatik goндerin</li>
            </ul>
            <div style="text-align: center; margin-top: 32px;">
              <a href="http://192.168.1.37:3000/dashboard" 
                style="background: #B8892A; color: #0a0a0f; padding: 14px 32px; text-decoration: none; font-weight: 600; display: inline-block;">
                Dashboard'a Git →
              </a>
            </div>
          </div>
          <p style="text-align: center; color: rgba(245,240,232,0.2); font-size: 12px; margin-top: 24px;">
            LeadFlow AI — Akilli Satis Otomasyonu
          </p>
        </div>
      `
    });

    if (error) throw new Error(error.message);

    res.json({ message: 'Hosgeldin emaili gonderildi!', data });

  } catch (error: any) {
    console.error('Welcome Email Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;