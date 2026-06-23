export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── AI REFERRAL MESAJI ───────────────────────────────────────────────────────
async function generateReferralMessage(lead: any, reward: string): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 150,
      messages: [{ role: 'user', content: `Memnun musteriye referans istegi mesaji yaz. SADECE mesaj metni.
Musteri: ${lead.contact_name || lead.company_name}
Odul: ${reward}
Kisa, samimi, max 120 karakter.` }]
    });
    return resp.content[0]?.text?.trim() || `Merhaba! Hizmetimizden memnun kaldiyseniz bir arkadasiniza onerin, ${reward} kazanin!`;
  } catch {
    return `Merhaba! Bizi begendiyseniz bir arkadasiniza onerin, ${reward} kazanin!`;
  }
}

// ── KAMPANYA CALISTIR ────────────────────────────────────────────────────────
async function runReferralCampaign(userId: string): Promise<{ sent: number; total: number }> {
  let sent = 0;
  let total = 0;
  try {
    const { data: settings } = await supabase.from('referral_settings')
      .select('*').eq('user_id', userId).single();
    if (!settings?.active) return { sent: 0, total: 0 };

    const daysAfter = settings.days_after_sale || 15;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysAfter);

    const { data: leads } = await supabase.from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'won')
      .eq('referral_sent', false)
      .lte('won_at', cutoff.toISOString())
      .not('phone', 'is', null)
      .limit(20);

    if (!leads?.length) return { sent: 0, total: 0 };
    total = leads.length;

    const { sendWhatsAppMessage } = require('./settings');

    for (const lead of leads) {
      try {
        const firstName = lead.contact_name?.split(' ')[0] || lead.company_name?.split(' ')[0] || '';
        await sendWhatsAppMessage(userId, lead.phone, `Merhaba ${firstName}, hizmetimizden memnun kaldiniz mi? 😊`);
        await sleep(2000);

        const referralMsg = await generateReferralMessage(lead, settings.reward_description || '%10 indirim');
        await sleep(3000);
        await sendWhatsAppMessage(userId, lead.phone, referralMsg);

        await supabase.from('leads').update({
          referral_sent: true, referral_sent_at: new Date().toISOString(),
        }).eq('id', lead.id);

        sent++;
        await sleep(10000);
      } catch (e: any) {
        console.error(`[Referral] Error for ${lead.company_name}:`, e.message?.slice(0, 60));
      }
    }
  } catch (e: any) {
    console.error('[Referral] Campaign error:', e.message);
  }
  return { sent, total };
}

// ── ROUTES ───────────────────────────────────────────────────────────────────

router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('referral_settings').select('*').eq('user_id', req.userId).maybeSingle();
    res.json({ settings: data || null });
  } catch { res.json({ settings: null }); }
});

// FIX: frontend field names ile uyum saglandi (delayDays -> days_after_sale)
router.post('/settings', async (req: any, res: any) => {
  try {
    const { active, days_after_sale, delayDays, reward_description, rewardOffer, auto_run, autoRun } = req.body;
    const settingsData = {
      active: active !== false,
      days_after_sale: days_after_sale || delayDays || 15,
      reward_description: reward_description || rewardOffer || '%10 indirim',
      auto_run: auto_run || autoRun || false,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase.from('referral_settings').select('id').eq('user_id', req.userId).maybeSingle();
    if (existing) {
      await supabase.from('referral_settings').update(settingsData).eq('user_id', req.userId);
    } else {
      await supabase.from('referral_settings').insert([{ user_id: req.userId, ...settingsData }]);
    }
    res.json({ message: 'Referral ayarlari kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// FIX: stats objesi dondur (frontend bekliyordu), kampanya sonucunu da ekle
router.post('/run-now', async (req: any, res: any) => {
  try {
    const result = await runReferralCampaign(req.userId);

    const { data: sentData } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('referral_sent', true);
    const { data: referrals } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('source', 'referral');
    const { data: wonRef } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('source', 'referral').eq('status', 'won');

    res.json({
      message: result.sent > 0 ? `${result.sent}/${result.total} musteriye referans mesaji gonderildi!` : 'Gonderilecek musteri bulunamadi',
      campaignSent: result.sent,
      campaignTotal: result.total,
      sent: sentData?.length || 0,
      referralsReceived: referrals?.length || 0,
      referralsWon: wonRef?.length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// FIX: user_id dogrulama eklendi
router.post('/add-lead', async (req: any, res: any) => {
  try {
    const { referrerLeadId, companyName, contactName, phone, email, sector } = req.body;
    if (!companyName || !phone) return res.status(400).json({ error: 'companyName ve phone zorunlu' });

    let referrerName = 'Referans';
    if (referrerLeadId) {
      const { data: referrer } = await supabase.from('leads')
        .select('company_name, contact_name')
        .eq('id', referrerLeadId).eq('user_id', req.userId).single();
      referrerName = referrer?.contact_name || referrer?.company_name || 'Referans';
    }

    const { data: existing } = await supabase.from('leads').select('id')
      .eq('user_id', req.userId).eq('phone', phone).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Bu telefon zaten kayitli' });

    const { data: newLead } = await supabase.from('leads').insert([{
      user_id: req.userId, company_name: companyName,
      contact_name: contactName || null, phone, email: email || null,
      sector: sector || null, source: 'referral',
      referrer: referrerName, status: 'new',
      notes: `${referrerName} tarafindan onerildi`,
    }]).select().single();

    res.json({ lead: newLead, message: `Referans lead eklendi! (${referrerName})` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: sent } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('referral_sent', true);
    const { data: referrals } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('source', 'referral');
    const { data: wonRef } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('source', 'referral').eq('status', 'won');
    res.json({
      sent: sent?.length || 0,
      referralsReceived: referrals?.length || 0,
      referralsWon: wonRef?.length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── LEADERBOARD — En cok referans yapanlar ───────────────────────────────────
router.get('/leaderboard', async (req: any, res: any) => {
  try {
    const { data: referralLeads } = await supabase.from('leads')
      .select('referrer, status')
      .eq('user_id', req.userId).eq('source', 'referral')
      .not('referrer', 'is', null);

    if (!referralLeads?.length) return res.json({ leaderboard: [] });

    const byReferrer: Record<string, { total: number; won: number }> = {};
    referralLeads.forEach((l: any) => {
      if (!byReferrer[l.referrer]) byReferrer[l.referrer] = { total: 0, won: 0 };
      byReferrer[l.referrer].total++;
      if (l.status === 'won') byReferrer[l.referrer].won++;
    });

    const leaderboard = Object.entries(byReferrer)
      .map(([name, data]) => ({ name, referrals: data.total, won: data.won, score: data.won * 3 + data.total }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ leaderboard });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── REWARD TRACKING ──────────────────────────────────────────────────────────
router.get('/rewards', async (req: any, res: any) => {
  try {
    const { data: settings } = await supabase.from('referral_settings').select('reward_description').eq('user_id', req.userId).maybeSingle();
    const { data: wonReferrals } = await supabase.from('leads')
      .select('id, referrer, company_name, won_at')
      .eq('user_id', req.userId).eq('source', 'referral').eq('status', 'won')
      .order('won_at', { ascending: false }).limit(20);

    const pendingRewards = (wonReferrals || []).map((l: any) => ({
      referrer: l.referrer, leadCompany: l.company_name, wonAt: l.won_at,
      reward: settings?.reward_description || '%10 indirim', status: 'pending',
    }));

    res.json({ rewards: pendingRewards, rewardDescription: settings?.reward_description || '%10 indirim' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Scheduler — FIX: active kontrolu eklendi
setInterval(async () => {
  try {
    const { data } = await supabase.from('referral_settings').select('user_id').eq('active', true).eq('auto_run', true);
    for (const r of (data || [])) {
      await runReferralCampaign(r.user_id);
      await sleep(5000);
    }
  } catch {}
}, 24 * 60 * 60 * 1000);

module.exports = router;
