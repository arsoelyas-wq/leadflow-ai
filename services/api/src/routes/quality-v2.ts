export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── AI SKORLAMA ───────────────────────────────────────────
async function scoreLeadWithAI(lead: any, messages: any[]): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const outbound = messages.filter((m: any) => m.direction === 'out').length;
    const inbound = messages.filter((m: any) => m.direction === 'in').length;
    const replyRate = outbound > 0 ? Math.round((inbound / outbound) * 100) : 0;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `B2B lead kalite skoru hesapla (0-100).

Lead bilgileri:
- Şirket: ${lead.company_name}
- İletişim: ${lead.contact_name || 'Yok'}
- Telefon: ${lead.phone ? 'Var' : 'Yok'}
- Email: ${lead.email ? 'Var' : 'Yok'}
- Website: ${lead.website ? 'Var' : 'Yok'}
- Şehir: ${lead.city || 'Bilinmiyor'}
- Sektör: ${lead.sector || 'Bilinmiyor'}
- Durum: ${lead.status}
- Mesaj sayısı: ${outbound} gönderildi, ${inbound} cevap
- Cevap oranı: %${replyRate}
- Google rating: ${lead.rating || 'Yok'}
- Review sayısı: ${lead.reviews_count || 0}

JSON döndür:
{
  "score": 75,
  "grade": "A",
  "breakdown": {
    "contactInfo": 20,
    "engagement": 25,
    "companyProfile": 15,
    "location": 10,
    "potential": 15
  },
  "strengths": ["güçlü yön 1", "güçlü yön 2"],
  "weaknesses": ["zayıf yön 1"],
  "recommendation": "Bu lead için önerilen aksiyon",
  "priority": "yuksek | orta | dusuk",
  "estimatedValue": "dusuk | orta | yuksek | cok_yuksek"
}`
      }]
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e: any) {
    console.error('AI scoring error:', e.message);
    // Basit kural tabanlı skor
    let score = 20;
    if (lead.phone) score += 15;
    if (lead.email) score += 10;
    if (lead.website) score += 10;
    if (lead.contact_name) score += 15;
    if (lead.rating >= 4) score += 10;
    if (lead.reviews_count > 10) score += 10;
    if (lead.status === 'replied') score += 10;
    return {
      score: Math.min(score, 100),
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      priority: score >= 70 ? 'yuksek' : score >= 40 ? 'orta' : 'dusuk',
      recommendation: 'Temel bilgiler tamamlanarak skor artırılabilir',
      estimatedValue: score >= 70 ? 'yuksek' : 'orta',
    };
  }
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/quality-v2/score/:leadId — Tek lead skoru
router.post('/score/:leadId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: lead } = await supabase
      .from('leads').select('*').eq('id', req.params.leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const { data: messages } = await supabase
      .from('messages').select('direction').eq('lead_id', lead.id);

    const scoring = await scoreLeadWithAI(lead, messages || []);

    // DB'ye kaydet
    await supabase.from('leads').update({
      score: scoring?.score || 0,
      ai_grade: scoring?.grade,
      ai_priority: scoring?.priority,
      ai_scoring_data: JSON.stringify(scoring),
      last_scored_at: new Date().toISOString(),
    }).eq('id', lead.id);

    res.json({ leadId: lead.id, company: lead.company_name, scoring });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-v2/score-all — Tüm leadleri skorla
router.post('/score-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { limit = 50 } = req.body;

    const { data: leads } = await supabase
      .from('leads').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(limit);

    if (!leads?.length) return res.json({ message: 'Lead yok', scored: 0 });

    res.json({ message: `${leads.length} lead skorlanıyor...`, total: leads.length });

    (async () => {
      let scored = 0;
      for (const lead of leads) {
        try {
          const { data: messages } = await supabase
            .from('messages').select('direction').eq('lead_id', lead.id);
          const scoring = await scoreLeadWithAI(lead, messages || []);
          await supabase.from('leads').update({
            score: scoring?.score || 0,
            ai_grade: scoring?.grade,
            ai_priority: scoring?.priority,
            ai_scoring_data: JSON.stringify(scoring),
            last_scored_at: new Date().toISOString(),
          }).eq('id', lead.id);
          scored++;
          await sleep(500);
        } catch (e: any) {
          console.error(`Score error ${lead.company_name}:`, e.message);
        }
      }
      console.log(`Scoring complete: ${scored}/${leads.length}`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality-v2/top — En yüksek skorlu leadler
router.get('/top', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const grade = req.query.grade as string;

    let query = supabase.from('leads')
      .select('id, company_name, contact_name, phone, city, sector, status, score, ai_grade, ai_priority, ai_scoring_data, last_scored_at')
      .eq('user_id', userId)
      .not('score', 'is', null)
      .order('score', { ascending: false })
      .limit(limit);

    if (grade) query = query.eq('ai_grade', grade);

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      leads: (data || []).map((l: any) => ({
        ...l,
        scoringData: l.ai_scoring_data ? (() => { try { return JSON.parse(l.ai_scoring_data); } catch { return null; } })() : null,
      }))
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality-v2/distribution — Skor dağılımı
router.get('/distribution', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase
      .from('leads').select('score, ai_grade, ai_priority, status')
      .eq('user_id', userId);

    const all = data || [];
    const distribution = {
      A: all.filter((l: any) => l.ai_grade === 'A').length,
      B: all.filter((l: any) => l.ai_grade === 'B').length,
      C: all.filter((l: any) => l.ai_grade === 'C').length,
      D: all.filter((l: any) => l.ai_grade === 'D').length,
      unscored: all.filter((l: any) => !l.ai_grade).length,
    };

    const avgScore = all.filter((l: any) => l.score).length
      ? Math.round(all.filter((l: any) => l.score).reduce((s: number, l: any) => s + l.score, 0) / all.filter((l: any) => l.score).length)
      : 0;

    const priorities = {
      yuksek: all.filter((l: any) => l.ai_priority === 'yuksek').length,
      orta: all.filter((l: any) => l.ai_priority === 'orta').length,
      dusuk: all.filter((l: any) => l.ai_priority === 'dusuk').length,
    };

    res.json({ distribution, avgScore, priorities, total: all.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;