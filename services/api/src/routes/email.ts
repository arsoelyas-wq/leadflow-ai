export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function getResend(apiKey?: string) {
  return new Resend(apiKey || process.env.RESEND_API_KEY);
}

// POST /api/email/send
router.post('/send', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { to, subject, html, text, leadId } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'to ve subject zorunlu' });

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    const resend = getResend(settings?.resend_api_key);
    const fromEmail = settings?.resend_from_email || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || `<p>${text || ''}</p>`,
      text,
    });

    if (error) throw new Error(error.message);

    // Log kaydet
    if (leadId) {
      await supabase.from('messages').insert([{
        user_id: userId, lead_id: leadId,
        direction: 'out', content: subject,
        channel: 'email', sent_at: new Date().toISOString(),
        metadata: JSON.stringify({ emailId: data?.id, to, subject }),
      }]);
    }

    res.json({ success: true, emailId: data?.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/email/send-campaign — Toplu email
router.post('/send-campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, subject, template } = req.body;
    if (!leadIds?.length || !subject) return res.status(400).json({ error: 'leadIds ve subject zorunlu' });

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    const { data: leads } = await supabase.from('leads').select('*').in('id', leadIds).eq('user_id', userId);

    if (!leads?.length) return res.status(400).json({ error: 'Lead bulunamadı' });

    res.json({ message: `${leads.length} email gönderiliyor...`, total: leads.length });

    (async () => {
      const resend = getResend(settings?.resend_api_key);
      const fromEmail = settings?.resend_from_email || 'onboarding@resend.dev';
      let sent = 0;

      for (const lead of leads) {
        if (!lead.email) continue;
        try {
          const Anthropic = require('@anthropic-ai/sdk');
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const scriptRes = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{ role: 'user', content: `${template || 'B2B email yaz'}\nŞirket: ${lead.company_name}\nKişi: ${lead.contact_name || 'Yetkili'}\nSadece HTML email içeriği yaz.` }]
          });
          const emailHtml = scriptRes.content[0]?.text || `<p>Merhaba ${lead.contact_name || lead.company_name},<br>${template}</p>`;

          await resend.emails.send({
            from: fromEmail,
            to: [lead.email],
            subject: subject.replace('[FIRMA]', lead.company_name),
            html: emailHtml,
          });

          await supabase.from('messages').insert([{
            user_id: userId, lead_id: lead.id,
            direction: 'out', content: subject,
            channel: 'email', sent_at: new Date().toISOString(),
          }]);
          sent++;
          await new Promise(r => setTimeout(r, 1000));
        } catch (e: any) {
          console.error(`Email error ${lead.company_name}:`, e.message);
        }
      }
      console.log(`Email campaign done: ${sent}/${leads.length}`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/email/test
router.post('/test', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    const { data: user } = await supabase.from('users').select('email').eq('id', userId).single();
    const resend = getResend(settings?.resend_api_key);

    const { error } = await resend.emails.send({
      from: settings?.resend_from_email || 'onboarding@resend.dev',
      to: [user?.email || 'test@test.com'],
      subject: 'LeadFlow AI - Email Test ✅',
      html: '<h1>Email sistemi çalışıyor!</h1><p>LeadFlow AI email entegrasyonu başarılı.</p>',
    });

    if (error) throw new Error(error.message);
    res.json({ success: true, message: 'Test emaili gönderildi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/email/settings
router.patch('/settings', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { resend_api_key, resend_from_email } = req.body;
    await supabase.from('user_settings').upsert({
      user_id: userId, resend_api_key, resend_from_email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    res.json({ message: 'Email ayarları kaydedildi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;