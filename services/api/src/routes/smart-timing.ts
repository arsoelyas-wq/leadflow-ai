export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── SEKTÖR BAZLI VARSAYILAN SAATLER ──────────────────────
const SECTOR_DEFAULT_TIMES: Record<string, number[]> = {
  'restoran': [11, 15, 19],
  'cafe': [9, 14, 17],
  'inşaat': [8, 12, 16],
  'mobilya': [10, 14, 16],
  'tekstil': [9, 13, 16],
  'otomotiv': [10, 14, 17],
  'sağlık': [9, 13, 16],
  'eğitim': [9, 12, 16],
  'teknoloji': [10, 14, 17],
  'perakende': [11, 15, 18],
  'default': [10, 14, 16],
};

// ── EN İYİ SAAT ANALİZİ ───────────────────────────────────
async function analyzeOptimalTime(userId: string, leadId?: string): Promise<any> {
  // Tüm mesaj cevap verilerini çek
  const { data: messages } = await supabase
    .from('messages')
    .select('sent_at, direction, channel, lead_id')
    .eq('user_id', userId)
    .eq('direction', 'in')
    .order('sent_at', { ascending: false })
    .limit(500);

  const replies = messages || [];

  // Saat bazlı cevap dağılımı
  const hourCounts: Record<number, number> = {};
  const dayOfWeekCounts: Record<number, number> = {};

  replies.forEach((msg: any) => {
    const date = new Date(msg.sent_at);
    const hour = date.getHours();
    const day = date.getDay();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1;
  });

  // En iyi saatleri bul
  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // En iyi günleri bul
  const sortedDays = Object.entries(dayOfWeekCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day]) => parseInt(day));

  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  return {
    bestHours: sortedHours.length ? sortedHours : [10, 14, 16],
    bestDays: sortedDays.length ? sortedDays.map(d => dayNames[d]) : ['Salı', 'Çarşamba', 'Perşembe'],
    totalReplies: replies.length,
    hourDistribution: hourCounts,
  };
}

// ── AI ZAMAN TAVSİYESİ ────────────────────────────────────
async function getAITimingAdvice(lead: any, behavior: any, globalStats: any): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `WhatsApp mesaj gönderimi için en iyi zaman tavsiyesi ver.

Lead: ${lead.company_name} / ${lead.sector || 'bilinmiyor'} / ${lead.city || ''}
Genel en iyi saatler: ${globalStats.bestHours.join(', ')}
Genel en iyi günler: ${globalStats.bestDays.join(', ')}
Sektör: ${lead.sector || 'genel'}

JSON döndür:
{
  "bestHour": 10,
  "bestDay": "Salı",
  "reason": "Neden bu saat/gün",
  "avoidTimes": ["kaçınılacak saat 1"],
  "tip": "Ekstra ipucu"
}`
      }]
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    const sector = (lead.sector || '').toLowerCase();
    const defaultHours = SECTOR_DEFAULT_TIMES[sector] || SECTOR_DEFAULT_TIMES.default;
    return {
      bestHour: defaultHours[0],
      bestDay: 'Salı',
      reason: 'Sektör ortalamasına göre',
      avoidTimes: ['12:00-13:00 öğle', '18:00 sonrası'],
      tip: 'Sabah 9-11 arası genel olarak en yüksek açılma oranına sahip',
    };
  }
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/smart-timing/analyze — Genel analiz
router.get('/analyze', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const stats = await analyzeOptimalTime(userId);

    // Saat dağılımını 24 saatlik array'e çevir
    const hourlyChart = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      count: stats.hourDistribution[h] || 0,
    }));

    res.json({
      bestHours: stats.bestHours,
      bestDays: stats.bestDays,
      totalReplies: stats.totalReplies,
      hourlyChart,
      recommendation: stats.bestHours.length
        ? `En yüksek cevap oranı: ${stats.bestHours.map((h: number) => `${h}:00`).join(', ')}`
        : 'Henüz yeterli veri yok. Varsayılan: 10:00, 14:00, 16:00',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/smart-timing/lead/:leadId — Lead için öneri
router.get('/lead/:leadId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: lead } = await supabase
      .from('leads').select('*').eq('id', req.params.leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const globalStats = await analyzeOptimalTime(userId);
    const advice = await getAITimingAdvice(lead, {}, globalStats);

    res.json({ lead: lead.company_name, advice, globalStats });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/smart-timing/schedule — Mesajı zamanla
router.post('/schedule', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, message, scheduledAt, channel = 'whatsapp' } = req.body;
    if (!leadId || !message || !scheduledAt) {
      return res.status(400).json({ error: 'leadId, message, scheduledAt zorunlu' });
    }

    const { data: lead } = await supabase
      .from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const { data: scheduled } = await supabase
      .from('scheduled_messages').insert([{
        user_id: userId,
        lead_id: leadId,
        message,
        channel,
        scheduled_at: scheduledAt,
        status: 'pending',
      }]).select().single();

    res.json({ scheduledId: scheduled?.id, message: 'Mesaj zamanlandı!', scheduledAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/smart-timing/scheduled — Zamanlanmış mesajlar
router.get('/scheduled', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('scheduled_messages')
      .select('*, leads(company_name, contact_name, phone)')
      .eq('user_id', userId)
      .in('status', ['pending', 'sent'])
      .order('scheduled_at', { ascending: true })
      .limit(50);
    if (error) throw error;
    res.json({ scheduled: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/smart-timing/scheduled/:id — İptal et
router.delete('/scheduled/:id', async (req: any, res: any) => {
  try {
    await supabase.from('scheduled_messages')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .eq('user_id', req.userId);
    res.json({ message: 'Zamanlanmış mesaj iptal edildi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/smart-timing/best-time-campaign — Kampanya için en iyi zaman
router.post('/best-time-campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds } = req.body;

    const stats = await analyzeOptimalTime(userId);

    // Bugün için en iyi sonraki saati bul
    const now = new Date();
    const currentHour = now.getHours();
    const bestNextHour = stats.bestHours.find((h: number) => h > currentHour) || stats.bestHours[0];

    const scheduledDate = new Date();
    if (bestNextHour <= currentHour) scheduledDate.setDate(scheduledDate.getDate() + 1);
    scheduledDate.setHours(bestNextHour, 0, 0, 0);

    res.json({
      recommendedTime: scheduledDate.toISOString(),
      recommendedHour: bestNextHour,
      reason: `${stats.totalReplies} cevap verisine göre en yüksek etkileşim saati`,
      bestDays: stats.bestDays,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Zamanlanmış mesajları çalıştır (her dakika kontrol)
setInterval(async () => {
  try {
    const now = new Date().toISOString();
    const { data: pending } = await supabase
      .from('scheduled_messages')
      .select('*, leads(phone, company_name, contact_name)')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(10);

    if (!pending?.length) return;

    const { sendWhatsAppMessage } = require('./settings');

    for (const msg of pending) {
      try {
        if (msg.channel === 'whatsapp' && msg.leads?.phone) {
          await sendWhatsAppMessage(msg.user_id, msg.leads.phone, msg.message);
        }
        await supabase.from('scheduled_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', msg.id);
        console.log(`Scheduled message sent to ${msg.leads?.company_name}`);
      } catch (e: any) {
        console.error(`Scheduled send error:`, e.message);
        await supabase.from('scheduled_messages').update({ status: 'failed' }).eq('id', msg.id);
      }
    }
  } catch {}
}, 60 * 1000);

module.exports = router;