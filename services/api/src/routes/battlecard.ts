export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

// ── Right Moment Engine ────────────────────────────────────────────────────────
const SECTOR_BEST_HOURS: Record<string, number[]> = {
  default:      [10, 14, 16],
  'İnşaat':     [9,  11, 15],
  'Perakende':  [10, 13, 17],
  'Restoran':   [11, 14, 18],
  'Tekstil':    [9,  11, 14],
  'Teknoloji':  [10, 14, 15],
  'Sağlık':     [9,  12, 15],
  'Eğitim':     [10, 13, 16],
  'Otomotiv':   [10, 14, 16],
};

const DAY_LABELS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function getBestContactTime(sector: string | null, activityHours: number[]) {
  const sectorHours = SECTOR_BEST_HOURS[sector || ''] || SECTOR_BEST_HOURS.default;

  // If we have activity history, weight by observed reply hours
  let bestHour: number;
  if (activityHours.length >= 3) {
    const freq: Record<number, number> = {};
    for (const h of activityHours) freq[h] = (freq[h] || 0) + 1;
    bestHour = parseInt(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
  } else {
    bestHour = sectorHours[0];
  }

  // Best days: Tue-Thu are universally best for B2B in Turkey
  const now = new Date();
  const todayDow = now.getDay();
  const preferredDows = [2, 3, 4]; // Tue, Wed, Thu

  // Find next preferred day
  let daysAhead = 0;
  for (let i = 1; i <= 7; i++) {
    const dow = (todayDow + i) % 7;
    if (preferredDows.includes(dow)) { daysAhead = i; break; }
  }

  const best = new Date(now);
  best.setDate(best.getDate() + daysAhead);
  best.setHours(bestHour, 0, 0, 0);

  return {
    dayLabel:   DAY_LABELS[best.getDay()],
    hour:       bestHour,
    timeLabel:  `${String(bestHour).padStart(2,'0')}:00`,
    isoDate:    best.toISOString().slice(0, 10),
    confidence: activityHours.length >= 3 ? 'high' : 'medium',
    reasoning:  activityHours.length >= 3
      ? `Bu lead geçmişte saat ${bestHour}:00 civarı aktif olmuş`
      : `${sector || 'B2B'} sektörü için Türkiye pazarı verisi`,
  };
}

// ── Community Benchmarks ───────────────────────────────────────────────────────
async function getCommunityStats(sector: string | null) {
  try {
    let query = supabase
      .from('leads')
      .select('status, score, ai_grade');

    if (sector) query = query.ilike('sector', `%${sector}%`);
    ;

    const { data } = await query;
    if (!data?.length) return null;

    const total = data.length;
    const won   = data.filter((l: any) => l.status === 'won').length;
    const replied = data.filter((l: any) => ['replied', 'offered', 'won'].includes(l.status)).length;
    const avgScore = Math.round(data.reduce((s: number, l: any) => s + (l.score || 0), 0) / total);

    const gradeCounts: Record<string, number> = {};
    for (const l of data) if (l.ai_grade) gradeCounts[l.ai_grade] = (gradeCounts[l.ai_grade] || 0) + 1;

    return {
      totalLeads:    total,
      winRate:       Math.round((won / total) * 100),
      replyRate:     Math.round((replied / total) * 100),
      avgScore,
      topGrade:      Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    };
  } catch { return null; }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/battlecard/generate
router.post('/generate', authMiddleware, async (req: any, res: any) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId gerekli' });

    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', req.userId)
      .single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const { data: activities } = await supabase
      .from('lead_activities')
      .select('event_type, metadata, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(20);

    const activitySummary = (activities || [])
      .slice(0, 5)
      .map((a: any) => `- ${a.event_type} (${new Date(a.created_at).toLocaleDateString('tr-TR')})`)
      .join('\n') || 'Henüz aktivite yok';

    if (!CLAUDE_KEY) return res.status(503).json({ error: 'Claude API key eksik' });

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const claude = new Anthropic({ apiKey: CLAUDE_KEY });

    const prompt = `Sen dünya standartlarında bir B2B satış koçusun. Aşağıdaki lead için kısa ve pratik bir "Savaş Kartı" hazırla.

Lead Bilgileri:
- Firma: ${lead.company_name}
- Karar Verici: ${lead.contact_name || 'Bilinmiyor'}
- Sektör: ${lead.sector || 'Bilinmiyor'}
- Şehir: ${lead.city || 'Bilinmiyor'}
- Web: ${lead.website || 'Yok'}
- AI Notu: ${lead.ai_summary || 'Yok'}
- Durum: ${lead.status}
- Skor: ${lead.score}/100
- Son Aktiviteler:\n${activitySummary}

Şu alanları JSON formatında yanıtla (Türkçe):
{
  "openingLine": "Telefon/WA açılış cümlesi (30 kelime max, doğrudan)",
  "painPoints": ["Bu firmanın 2-3 olası acı noktası"],
  "valueProps": ["Bu firmaya özel 2-3 güçlü argüman"],
  "objections": [{"objection": "Olası itiraz", "response": "Kısa karşı cevap"}],
  "closingAsk": "Kapanış sorusu veya CTA",
  "redFlags": ["Dikkat edilmesi gereken 1-2 uyarı işareti"],
  "confidence": "Yüzde olarak bu lead'in kapanma ihtimali (0-100)"
}

Sadece JSON döndür, açıklama ekleme.`;

    const msg = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = ((msg.content[0] as any)?.text || '{}').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const card = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    res.json({ battlecard: card, lead: { company_name: lead.company_name, sector: lead.sector } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/battlecard/timing/:leadId — Best contact time
router.get('/timing/:leadId', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, sector, best_contact_hour')
      .eq('id', req.params.leadId)
      .eq('user_id', req.userId)
      .single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Get hours when this lead was active (replied, opened email, etc.)
    const { data: acts } = await supabase
      .from('lead_activities')
      .select('created_at')
      .eq('lead_id', lead.id)
      .in('event_type', ['whatsapp_reply', 'email_open', 'email_click', 'site_visit']);

    const activityHours = (acts || []).map((a: any) => new Date(a.created_at).getHours());
    const timing = getBestContactTime(lead.sector, activityHours);

    // Persist best hour for future reference
    if (timing.confidence === 'high' && timing.hour !== lead.best_contact_hour) {
      await supabase.from('leads').update({ best_contact_hour: timing.hour }).eq('id', lead.id);
    }

    res.json({ timing });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/battlecard/community/:sector — Community benchmarks
router.get('/community/:sector', authMiddleware, async (req: any, res: any) => {
  try {
    const sector = req.params.sector === '_all' ? null : decodeURIComponent(req.params.sector);
    const stats = await getCommunityStats(sector);
    res.json({ stats });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
