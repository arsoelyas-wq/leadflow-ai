export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function personalizeMessage(template: string, lead: any): string {
  return template
    .replace(/\[FIRMA_ADI\]/g, lead.company_name || 'Sayın Yetkili')
    .replace(/\[AD\]/g, lead.contact_name || lead.company_name || 'Sayın Yetkili')
    .replace(/\[SEHIR\]/g, lead.city || '')
    .replace(/\[SEKTOR\]/g, lead.sector || '');
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/abtests
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ tests: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/abtests — Yeni test oluştur
router.post('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, channel, variant_a, variant_b } = req.body;

    if (!name || !variant_a || !variant_b) {
      return res.status(400).json({ error: 'name, variant_a, variant_b zorunlu' });
    }

    const { data, error } = await supabase
      .from('ab_tests')
      .insert([{ user_id: userId, name, channel: channel || 'whatsapp', variant_a, variant_b }])
      .select().single();

    if (error) throw error;
    res.json({ test: data, message: 'A/B test oluşturuldu!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/abtests/:id/run — Test başlat
router.post('/:id/run', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds } = req.body;

    if (!leadIds?.length) return res.status(400).json({ error: 'leadIds zorunlu' });

    const { data: test } = await supabase
      .from('ab_tests').select('*').eq('id', req.params.id).eq('user_id', userId).single();
    if (!test) return res.status(404).json({ error: 'Test bulunamadı' });

    const { data: leads } = await supabase
      .from('leads').select('*').in('id', leadIds);
    if (!leads?.length) return res.status(400).json({ error: 'Lead bulunamadı' });

    const { data: userData } = await supabase
      .from('users').select('credits_total, credits_used').eq('id', userId).single();
    const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
    if (available < leads.length) {
      return res.status(400).json({ error: 'Yetersiz kredi' });
    }

    // Leadleri ikiye böl
    const half = Math.ceil(leads.length / 2);
    const groupA = leads.slice(0, half);
    const groupB = leads.slice(half);

    let sentA = 0, sentB = 0;

    // Arka planda gönder
    (async () => {
      const { sendWhatsAppMessage, sendEmail } = require('./settings');

      for (const lead of groupA) {
        try {
          const msg = personalizeMessage(test.variant_a, lead);
          if (test.channel === 'whatsapp' && lead.phone) {
            await sendWhatsAppMessage(userId, lead.phone, msg);
          } else if (test.channel === 'email' && lead.email) {
            await sendEmail(userId, lead.email, `A/B Test: ${test.name}`, `<p>${msg}</p>`);
          }
          await supabase.from('messages').insert([{
            lead_id: lead.id, user_id: userId, channel: test.channel,
            direction: 'out', content: msg, status: 'sent',
            sent_at: new Date().toISOString(),
          }]);
          // Lead'e hangi variant gönderildiğini kaydet
          await supabase.from('leads').update({ notes: `AB_TEST:${req.params.id}:A` }).eq('id', lead.id);
          sentA++;
          await sleep(test.channel === 'whatsapp' ? 10000 : 2000);
        } catch (e: any) { console.error('AB Test A error:', e.message); }
      }

      for (const lead of groupB) {
        try {
          const msg = personalizeMessage(test.variant_b, lead);
          if (test.channel === 'whatsapp' && lead.phone) {
            await sendWhatsAppMessage(userId, lead.phone, msg);
          } else if (test.channel === 'email' && lead.email) {
            await sendEmail(userId, lead.email, `A/B Test: ${test.name}`, `<p>${msg}</p>`);
          }
          await supabase.from('messages').insert([{
            lead_id: lead.id, user_id: userId, channel: test.channel,
            direction: 'out', content: msg, status: 'sent',
            sent_at: new Date().toISOString(),
          }]);
          await supabase.from('leads').update({ notes: `AB_TEST:${req.params.id}:B` }).eq('id', lead.id);
          sentB++;
          await sleep(test.channel === 'whatsapp' ? 10000 : 2000);
        } catch (e: any) { console.error('AB Test B error:', e.message); }
      }

      // Gönderim sayısını güncelle
      await supabase.from('ab_tests').update({ sent_a: sentA, sent_b: sentB, status: 'running' }).eq('id', req.params.id);
      await supabase.from('users').update({ credits_used: (userData?.credits_used || 0) + sentA + sentB }).eq('id', userId);
      console.log(`AB Test ${req.params.id}: A=${sentA}, B=${sentB}`);
    })();

    res.json({
      message: `A/B test başlatıldı! A grubu: ${groupA.length}, B grubu: ${groupB.length}`,
      groupA: groupA.length,
      groupB: groupB.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/abtests/:id/sync — Cevap sayılarını güncelle
router.post('/:id/sync', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: test } = await supabase
      .from('ab_tests').select('*').eq('id', req.params.id).eq('user_id', userId).single();
    if (!test) return res.status(404).json({ error: 'Test bulunamadı' });

    // A ve B gruplarındaki lead'leri bul
    const { data: leadsA } = await supabase.from('leads').select('id').eq('user_id', userId).ilike('notes', `AB_TEST:${req.params.id}:A`);
    const { data: leadsB } = await supabase.from('leads').select('id').eq('user_id', userId).ilike('notes', `AB_TEST:${req.params.id}:B`);

    const idsA = (leadsA || []).map((l: any) => l.id);
    const idsB = (leadsB || []).map((l: any) => l.id);

    // Cevap sayıları
    let repliedA = 0, repliedB = 0;

    if (idsA.length > 0) {
      const { count } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .in('lead_id', idsA).eq('direction', 'in');
      repliedA = count || 0;
    }

    if (idsB.length > 0) {
      const { count } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .in('lead_id', idsB).eq('direction', 'in');
      repliedB = count || 0;
    }

    // Kazananı belirle
    const rateA = test.sent_a > 0 ? repliedA / test.sent_a : 0;
    const rateB = test.sent_b > 0 ? repliedB / test.sent_b : 0;
    const winner = rateA > rateB ? 'A' : rateB > rateA ? 'B' : null;

    await supabase.from('ab_tests').update({
      replied_a: repliedA, replied_b: repliedB,
      winner: winner || null,
      status: winner ? 'completed' : 'running',
    }).eq('id', req.params.id);

    res.json({
      repliedA, repliedB,
      rateA: Math.round(rateA * 100),
      rateB: Math.round(rateB * 100),
      winner,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/abtests/:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('ab_tests').delete().eq('id', req.params.id).eq('user_id', userId);
    res.json({ message: 'Test silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;