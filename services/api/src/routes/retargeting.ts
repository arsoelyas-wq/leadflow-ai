export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── LEAD DAVRANIM ANALİZİ ─────────────────────────────────
async function analyzeLeadBehavior(lead: any, messages: any[]): Promise<any> {
  const outbound = messages.filter(m => m.direction === 'out');
  const inbound = messages.filter(m => m.direction === 'in');
  const lastOutbound = outbound[outbound.length - 1];
  const daysSinceLastContact = lastOutbound
    ? Math.floor((Date.now() - new Date(lastOutbound.sent_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Hangi kanallar denendi
  const usedChannels = [...new Set(outbound.map((m: any) => m.channel))];

  // Saat analizi — en çok hangi saatte mesaj atıldı
  const hours = outbound.map((m: any) => new Date(m.sent_at).getHours());
  const avgHour = hours.length ? Math.round(hours.reduce((a: number, b: number) => a + b, 0) / hours.length) : 10;

  return {
    totalAttempts: outbound.length,
    totalReplies: inbound.length,
    daysSinceLastContact,
    usedChannels,
    avgContactHour: avgHour,
    lastMessage: lastOutbound?.content?.slice(0, 100) || '',
    hasReplied: inbound.length > 0,
    lastReplyDaysAgo: inbound.length
      ? Math.floor((Date.now() - new Date(inbound[inbound.length - 1].sent_at).getTime()) / (1000 * 60 * 60 * 24))
      : null,
  };
}

// ── YENİ STRATEJİ ÜRETİMİ ────────────────────────────────
async function generateRetargetStrategy(lead: any, behavior: any): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `B2B lead retargeting stratejisi üret.

Lead: ${lead.company_name} / ${lead.contact_name || 'Yetkili'} / ${lead.city || ''} / ${lead.sector || ''}
Deneme sayısı: ${behavior.totalAttempts}
Son temas: ${behavior.daysSinceLastContact} gün önce
Kullanılan kanallar: ${behavior.usedChannels.join(', ')}
Cevap aldı mı: ${behavior.hasReplied ? 'Evet' : 'Hayır'}
Son mesaj: ${behavior.lastMessage}

JSON döndür:
{
  "strategy": "değer_odaklı | merak_uyandırıcı | sosyal_kanıt | doğrudan | yumuşak_takip",
  "channel": "whatsapp | email | linkedin",
  "bestTime": "09:00 | 11:00 | 14:00 | 16:00",
  "tone": "profesyonel | samimi | meraklı | acil",
  "message": "Türkçe mesaj taslağı (max 150 karakter, WhatsApp için)",
  "subject": "Email konu satırı (email kanalı seçildiyse)",
  "reasoning": "Neden bu strateji"
}`
      }]
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e: any) {
    console.error('Strategy gen error:', e.message);
    return {
      strategy: 'yumuşak_takip',
      channel: 'whatsapp',
      bestTime: '10:00',
      tone: 'samimi',
      message: `Merhaba, ${lead.company_name} için hazırladığımız teklifi görüşmek ister misiniz?`,
      reasoning: 'Varsayılan strateji',
    };
  }
}

// ── CEVAPSIZ LEADLERİ TESPİT ET ──────────────────────────
async function findUnresponsiveLeads(userId: string): Promise<any[]> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // contacted veya replied statüsündeki leadler
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['contacted', 'new'])
    .gte('created_at', thirtyDaysAgo)
    .limit(50);

  if (!leads?.length) return [];

  const result = [];
  for (const lead of leads) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', lead.id)
      .order('sent_at', { ascending: true });

    const behavior = await analyzeLeadBehavior(lead, messages || []);

    // Kriter: 3+ gün cevap yok, 10'dan az deneme
    if (behavior.daysSinceLastContact >= 3 && behavior.totalAttempts < 10 && !behavior.hasReplied) {
      result.push({ lead, behavior });
    }
  }

  return result;
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/retargeting/unresponsive — Cevapsız leadler
router.get('/unresponsive', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const unresponsive = await findUnresponsiveLeads(userId);

    // Her lead için strateji üret
    const withStrategies = await Promise.all(
      unresponsive.slice(0, 20).map(async ({ lead, behavior }) => {
        const strategy = await generateRetargetStrategy(lead, behavior);
        return { lead, behavior, strategy };
      })
    );

    res.json({
      total: withStrategies.length,
      leads: withStrategies,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/retargeting/send/:leadId — Tek lead retarget
router.post('/send/:leadId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { strategy, message, channel } = req.body;

    const { data: lead } = await supabase
      .from('leads').select('*').eq('id', req.params.leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const finalMessage = message || strategy?.message;
    if (!finalMessage) return res.status(400).json({ error: 'Mesaj zorunlu' });

    const finalChannel = channel || strategy?.channel || 'whatsapp';

    if (finalChannel === 'whatsapp' && lead.phone) {
      const { sendWhatsAppMessage } = require('./settings');
      await sendWhatsAppMessage(userId, lead.phone, finalMessage);

      // Mesaj kaydet
      await supabase.from('messages').insert([{
        user_id: userId,
        lead_id: lead.id,
        direction: 'out',
        content: finalMessage,
        channel: 'whatsapp',
        sent_at: new Date().toISOString(),
        metadata: JSON.stringify({ type: 'retargeting', strategy: strategy?.strategy }),
      }]);

      // Lead status güncelle
      await supabase.from('leads').update({
        status: 'contacted',
        last_contacted_at: new Date().toISOString(),
      }).eq('id', lead.id);
    }

    // Retargeting log kaydet
    await supabase.from('retargeting_logs').insert([{
      user_id: userId,
      lead_id: lead.id,
      channel: finalChannel,
      message: finalMessage,
      strategy: strategy?.strategy || 'manual',
      sent_at: new Date().toISOString(),
    }]).catch(() => {});

    res.json({ message: 'Retargeting mesajı gönderildi!', channel: finalChannel });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/retargeting/run-all — Tüm cevapsızlara otomatik gönder
router.post('/run-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { dryRun = false } = req.body;

    const unresponsive = await findUnresponsiveLeads(userId);
    if (!unresponsive.length) return res.json({ message: 'Retarget edilecek lead yok', sent: 0 });

    res.json({
      message: `${unresponsive.length} lead için retargeting başladı`,
      total: unresponsive.length,
      dryRun,
    });

    if (dryRun) return;

    // Asenkron gönder
    (async () => {
      let sent = 0;
      const { sendWhatsAppMessage } = require('./settings');

      for (const { lead, behavior } of unresponsive) {
        try {
          const strategy = await generateRetargetStrategy(lead, behavior);
          if (!strategy) continue;

          if (strategy.channel === 'whatsapp' && lead.phone) {
            await sendWhatsAppMessage(userId, lead.phone, strategy.message);

            await supabase.from('messages').insert([{
              user_id: userId,
              lead_id: lead.id,
              direction: 'out',
              content: strategy.message,
              channel: 'whatsapp',
              sent_at: new Date().toISOString(),
              metadata: JSON.stringify({ type: 'retargeting', strategy: strategy.strategy }),
            }]);

            await supabase.from('leads').update({
              status: 'contacted',
              last_contacted_at: new Date().toISOString(),
            }).eq('id', lead.id);

            await supabase.from('retargeting_logs').insert([{
              user_id: userId,
              lead_id: lead.id,
              channel: strategy.channel,
              message: strategy.message,
              strategy: strategy.strategy,
              sent_at: new Date().toISOString(),
            }]).catch(() => {});

            sent++;
            await sleep(15000); // Anti-ban
          }
        } catch (e: any) {
          console.error(`Retarget error ${lead.company_name}:`, e.message);
        }
      }
      console.log(`Retargeting done: ${sent}/${unresponsive.length}`);
    })();

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/retargeting/stats — İstatistikler
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await supabase
      .from('retargeting_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('sent_at', sevenDaysAgo);

    const total = logs?.length || 0;
    const byStrategy = (logs || []).reduce((acc: any, log: any) => {
      acc[log.strategy] = (acc[log.strategy] || 0) + 1;
      return acc;
    }, {});

    res.json({ total, byStrategy, logs: (logs || []).slice(0, 10) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Günlük otomatik retargeting — her sabah 09:00
const scheduleDaily = () => {
  const now = new Date();
  const next9am = new Date();
  next9am.setHours(9, 0, 0, 0);
  if (next9am <= now) next9am.setDate(next9am.getDate() + 1);
  const msUntil9am = next9am.getTime() - now.getTime();

  setTimeout(async () => {
    console.log('Daily retargeting started');
    try {
      const { data: users } = await supabase.from('users').select('id');
      for (const user of users || []) {
        const unresponsive = await findUnresponsiveLeads(user.id);
        console.log(`User ${user.id}: ${unresponsive.length} unresponsive leads`);
        await sleep(1000);
      }
    } catch (e: any) {
      console.error('Daily retargeting error:', e.message);
    }
    scheduleDaily(); // Tekrar planla
  }, msUntil9am);

  console.log(`Retargeting scheduled for ${next9am.toLocaleString('tr-TR')}`);
};

scheduleDaily();

module.exports = router;