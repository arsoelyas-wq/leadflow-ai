export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Tüm kampanyaları getir
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const campaigns = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      totalSent: c.total_sent || 0,
      totalReplied: c.total_replied || 0,
      createdAt: c.created_at,
      messageTemplate: c.message_template,
      leadIds: c.lead_ids || [],
      sequence: c.sequence || [],
    }));

    res.json({ campaigns });
  } catch (error: any) {
    console.error('Campaigns GET Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Yeni kampanya oluştur
router.post('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, channel, messageTemplate, leadIds, sequence } = req.body;

    if (!name || !channel || !messageTemplate) {
      return res.status(400).json({ error: 'name, channel ve messageTemplate zorunlu' });
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        user_id: userId,
        name,
        channel,
        message_template: messageTemplate,
        lead_ids: leadIds || [],
        sequence: sequence || [],
        status: 'draft',
        total_sent: 0,
        total_replied: 0,
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ campaign: data, message: 'Kampanya oluşturuldu!' });
  } catch (error: any) {
    console.error('Campaign POST Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Kampanya detayı
router.get('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    res.json({
      campaign: {
        id: data.id,
        name: data.name,
        channel: data.channel,
        status: data.status,
        totalSent: data.total_sent || 0,
        totalReplied: data.total_replied || 0,
        createdAt: data.created_at,
        messageTemplate: data.message_template,
        leadIds: data.lead_ids || [],
        sequence: data.sequence || [],
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Kampanyayı başlat
router.post('/:id/start', async (req: any, res: any) => {
  try {
    const userId = req.userId;

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .in('id', campaign.lead_ids || []);

    let sent = 0;
    let failed = 0;

    for (const lead of leads || []) {
      try {
        const personalizedMsg = (campaign.message_template || '')
          .replace('[FIRMA_ADI]', lead.company_name || 'Firma')
          .replace('[SEHIR]', lead.city || '')
          .replace('[SEKTOR]', lead.sector || '');

        if (campaign.channel === 'whatsapp' && lead.phone) {
          const WATI_ENDPOINT = process.env.WATI_API_ENDPOINT;
          const WATI_TOKEN = process.env.WATI_ACCESS_TOKEN;
          const cleanPhone = lead.phone.replace(/\D/g, '');
          const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone
            : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;

          const resp = await fetch(
            `${WATI_ENDPOINT}/api/v1/sendSessionMessage/${formattedPhone}`,
            {
              method: 'POST',
              headers: { 'Authorization': WATI_TOKEN, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageText: personalizedMsg })
            }
          );
          if (resp.ok) {
            sent++;
            await supabase.from('messages').insert([{
              lead_id: lead.id, channel: 'whatsapp', direction: 'outbound',
              content: personalizedMsg, status: 'sent', sent_at: new Date().toISOString()
            }]);
          } else { failed++; }

        } else if (campaign.channel === 'email' && lead.email) {
          const resendPkg = require('resend');
          const resend = new resendPkg.Resend(process.env.RESEND_API_KEY);
          const { error: emailErr } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: [lead.email],
            subject: `${campaign.name}`,
            html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
              ${personalizedMsg.replace(/\n/g, '<br>')}
            </div>`
          });
          if (!emailErr) {
            sent++;
            await supabase.from('messages').insert([{
              lead_id: lead.id, channel: 'email', direction: 'outbound',
              content: personalizedMsg, status: 'sent', sent_at: new Date().toISOString()
            }]);
          } else { failed++; }
        }

        await new Promise(r => setTimeout(r, 500));
      } catch (e) { failed++; }
    }

    await supabase.from('campaigns').update({
      status: 'active',
      total_sent: (campaign.total_sent || 0) + sent,
    }).eq('id', req.params.id);

    res.json({ message: 'Kampanya başlatıldı!', sent, failed });
  } catch (error: any) {
    console.error('Campaign Start Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Kampanyayı duraklat
router.post('/:id/pause', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('campaigns')
      .update({ status: 'paused' })
      .eq('id', req.params.id)
      .eq('user_id', userId);

    res.json({ message: 'Kampanya duraklatıldı' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Kampanyayı sil
router.delete('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);

    res.json({ message: 'Kampanya silindi' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;