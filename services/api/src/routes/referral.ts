export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── AI REFERRAL MESAJI ÜRET ───────────────────────────────
async function generateReferralMessage(lead: any, reward: string): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Memnun müşteriye referans isteği mesajı yaz. SADECE mesaj metni.
Müşteri: ${lead.contact_name || lead.company_name}
Ödül: ${reward}
Kısa, samimi, max 120 karakter.`
      }]
    });
    return resp.content[0]?.text?.trim() || `Merhaba! Hizmetimizden memnun kaldıysanız 3 arkadaşınıza önerin, ${reward} kazanın!`;
  } catch {
    return `Merhaba! Bizi beğendiyseniz bir arkadaşınıza önerin, ${reward} kazanın!`;
  }
}

// ── REFERRAL KAMPANYASI ÇALIŞTIR ─────────────────────────
async function runReferralCampaign(userId: string) {
  try {
    const { data: settings } = await supabase.from('referral_settings')
      .select('*').eq('user_id', userId).single();
    if (!settings?.active) return;

    const daysAfter = settings.days_after_sale || 15;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysAfter);

    // Satış kapanan ama referral mesajı gönderilmemiş leadler
    const { data: leads } = await supabase.from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'won')
      .eq('referral_sent', false)
      .lte('won_at', cutoff.toISOString())
      .not('phone', 'is', null)
      .limit(20);

    if (!leads?.length) return;

    const { sendWhatsAppMessage } = require('./settings');

    for (const lead of leads) {
      try {
        // Memnuniyet sorusu gönder
        const satisfactionMsg = `Merhaba ${lead.contact_name || lead.company_name?.split(' ')[0]}, hizmetimizden memnun kaldınız mı? 😊`;
        await sendWhatsAppMessage(userId, lead.phone, satisfactionMsg);

        await sleep(2000);

        // Referral teklifi
        const referralMsg = await generateReferralMessage(lead, settings.reward_description || '%10 indirim');
        await sleep(3000);
        await sendWhatsAppMessage(userId, lead.phone, referralMsg);

        // İşaretle
        await supabase.from('leads').update({
          referral_sent: true,
          referral_sent_at: new Date().toISOString(),
        }).eq('id', lead.id);

        await sleep(10000);
      } catch (e: any) {
        console.error(`Referral error for ${lead.company_name}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('Referral campaign error:', e.message);
  }
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/referral/settings
router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('referral_settings')
      .select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || null });
  } catch { res.json({ settings: null }); }
});

// POST /api/referral/settings
router.post('/settings', async (req: any, res: any) => {
  try {
    const { active, days_after_sale, reward_description, auto_run } = req.body;
    const { data: existing } = await supabase.from('referral_settings')
      .select('id').eq('user_id', req.userId).single();

    if (existing) {
      await supabase.from('referral_settings').update({
        active, days_after_sale, reward_description, auto_run,
        updated_at: new Date().toISOString(),
      }).eq('user_id', req.userId);
    } else {
      await supabase.from('referral_settings').insert([{
        user_id: req.userId, active, days_after_sale, reward_description, auto_run,
      }]);
    }
    res.json({ message: 'Referral ayarları kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/referral/run-now
router.post('/run-now', async (req: any, res: any) => {
  try {
    res.json({ message: 'Referral kampanyası başlatıldı' });
    await runReferralCampaign(req.userId);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/referral/add-lead — Referans ile gelen lead ekle
router.post('/add-lead', async (req: any, res: any) => {
  try {
    const { referrerLeadId, companyName, contactName, phone, email, sector } = req.body;
    if (!companyName || !phone) return res.status(400).json({ error: 'companyName ve phone zorunlu' });

    let referrerName = 'Referans';
    if (referrerLeadId) {
      const { data: referrer } = await supabase.from('leads')
        .select('company_name, contact_name').eq('id', referrerLeadId).single();
      referrerName = referrer?.contact_name || referrer?.company_name || 'Referans';
    }

    const { data: existing } = await supabase.from('leads').select('id')
      .eq('user_id', req.userId).eq('phone', phone).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Bu telefon zaten kayıtlı' });

    const { data: newLead } = await supabase.from('leads').insert([{
      user_id: req.userId, company_name: companyName,
      contact_name: contactName || null, phone, email: email || null,
      sector: sector || null, source: 'referral',
      referrer: referrerName, status: 'new',
      notes: `${referrerName} tarafından önerildi`,
    }]).select().single();

    res.json({ lead: newLead, message: `Referans lead eklendi! (${referrerName})` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/referral/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: sent } = await supabase.from('leads')
      .select('id').eq('user_id', req.userId).eq('referral_sent', true);
    const { data: referrals } = await supabase.from('leads')
      .select('id').eq('user_id', req.userId).eq('source', 'referral');
    const { data: wonReferrals } = await supabase.from('leads')
      .select('id').eq('user_id', req.userId).eq('source', 'referral').eq('status', 'won');

    res.json({
      sent: sent?.length || 0,
      referralsReceived: referrals?.length || 0,
      referralsWon: wonReferrals?.length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Scheduler — her gün kontrol
setInterval(() => {
  supabase.from('referral_settings').select('user_id').eq('active', true).eq('auto_run', true)
    .then(({ data }: any) => {
      (data || []).forEach((r: any) => runReferralCampaign(r.user_id));
    });
}, 24 * 60 * 60 * 1000);

module.exports = router;