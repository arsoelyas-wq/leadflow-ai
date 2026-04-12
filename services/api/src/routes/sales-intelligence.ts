export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── KONUŞMA ANALİZİ ──────────────────────────────────────
async function analyzeConversation(
  messages: any[],
  agentName: string,
  phone: string,
  companyName: string
): Promise<any> {
  if (!messages || messages.length === 0) return null;

  const outbound = messages.filter((m: any) => m.direction === 'out');
  const inbound  = messages.filter((m: any) => m.direction === 'in');

  // Yanıt süresi hesapla
  let totalResponseTime = 0;
  let responseCount = 0;
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].direction === 'out' && messages[i-1].direction === 'in') {
      const diff = new Date(messages[i].sent_at).getTime() - new Date(messages[i-1].sent_at).getTime();
      totalResponseTime += diff / 60000;
      responseCount++;
    }
  }
  const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;

  // Konuşma metni oluştur
  const conversationText = messages.slice(-30).map((m: any) => {
    const time = new Date(m.sent_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const dir = m.direction === 'out' ? `[${agentName || 'Temsilci'}]` : '[Müşteri]';
    return `${time} ${dir}: ${m.content}`;
  }).join('\n');

  const prompt = `Sen bir satış performansı uzmanısın. Aşağıdaki WhatsApp konuşmasını analiz et.

MÜŞTERİ: ${companyName} (${phone})
TEMSİLCİ: ${agentName || 'Bilinmiyor'}
MESAJ SAYISI: ${messages.length} (Giden: ${outbound.length}, Gelen: ${inbound.length})
ORT. YANIT SÜRESİ: ${avgResponseTime} dakika

KONUŞMA:
${conversationText}

Aşağıdaki JSON formatında detaylı analiz ver:
{
  "overall_score": 0-100 arası genel puan,
  "professionalism_score": 0-100 profesyonellik puanı,
  "responsiveness_score": 0-100 yanıt hızı ve kalitesi puanı,
  "sales_technique_score": 0-100 satış tekniği puanı,
  "empathy_score": 0-100 empati ve müşteri anlayışı puanı,
  "closing_score": 0-100 kapanış tekniği puanı,
  "summary": "2-3 cümle genel özet",
  "strengths": ["güçlü yön 1", "güçlü yön 2", "güçlü yön 3"],
  "weaknesses": ["zayıf yön 1", "zayıf yön 2", "zayıf yön 3"],
  "lost_opportunities": [
    {"moment": "kaçırılan an", "suggestion": "yapılması gereken"},
    {"moment": "kaçırılan an 2", "suggestion": "yapılması gereken 2"}
  ],
  "key_moments": [
    {"time": "saat", "type": "positive|negative|neutral", "description": "önemli an"},
    {"time": "saat", "type": "positive|negative|neutral", "description": "önemli an 2"}
  ],
  "recommendations": ["öneri 1", "öneri 2", "öneri 3"],
  "outcome": "sale|no_sale|ongoing|unknown",
  "outcome_reason": "sonucun nedeni"
}

Sadece JSON döndür, başka hiçbir şey yazma.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/sales-intelligence/team — Ekip listesi
router.get('/team', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ team: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sales-intelligence/team — Üye ekle
router.post('/team', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, email, phone, role } = req.body;
    if (!name) return res.status(400).json({ error: 'name zorunlu' });
    const { data, error } = await supabase
      .from('team_members')
      .insert([{ user_id: userId, name, email, phone, role: role || 'Satış Temsilcisi' }])
      .select().single();
    if (error) throw error;
    res.json({ member: data, message: 'Üye eklendi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/sales-intelligence/team/:id — Üye sil
router.delete('/team/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('team_members').update({ is_active: false })
      .eq('id', req.params.id).eq('user_id', userId);
    res.json({ message: 'Üye silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sales-intelligence/analyze — Tek konuşma analizi
router.post('/analyze', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, agentName, agentId, days = 30 } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Mesajları çek
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*, leads(phone, company_name)')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .eq('channel', 'whatsapp')
      .gte('sent_at', since)
      .order('sent_at', { ascending: true });

    if (msgError) throw msgError;
    if (!messages?.length) return res.status(400).json({ error: 'Bu lead için mesaj bulunamadı' });

    const lead = messages[0]?.leads;
    const analysis = await analyzeConversation(
      messages,
      agentName || 'Temsilci',
      lead?.phone || '',
      lead?.company_name || 'Bilinmiyor'
    );

    if (!analysis) return res.status(400).json({ error: 'Analiz yapılamadı' });

    // Veritabanına kaydet
    const { data: saved, error: saveError } = await supabase
      .from('conversation_analyses')
      .insert([{
        user_id: userId,
        agent_id: agentId || null,
        agent_name: agentName || 'Temsilci',
        lead_id: leadId,
        phone: lead?.phone,
        company_name: lead?.company_name,
        channel: 'whatsapp',
        period_start: messages[0]?.sent_at,
        period_end: messages[messages.length - 1]?.sent_at,
        message_count: messages.length,
        outbound_count: messages.filter((m: any) => m.direction === 'out').length,
        inbound_count: messages.filter((m: any) => m.direction === 'in').length,
        overall_score: analysis.overall_score,
        professionalism_score: analysis.professionalism_score,
        responsiveness_score: analysis.responsiveness_score,
        sales_technique_score: analysis.sales_technique_score,
        empathy_score: analysis.empathy_score,
        closing_score: analysis.closing_score,
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        lost_opportunities: analysis.lost_opportunities || [],
        key_moments: analysis.key_moments || [],
        recommendations: analysis.recommendations || [],
        summary: analysis.summary,
        conversation_snippet: messages.slice(-10).map((m: any) => ({
          direction: m.direction,
          content: m.content,
          sent_at: m.sent_at,
        })),
      }])
      .select().single();

    if (saveError) throw saveError;
    res.json({ analysis: { ...saved, ...analysis }, message: 'Analiz tamamlandı' });
  } catch (e: any) {
    console.error('Analyze error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sales-intelligence/analyze-all — Tüm konuşmaları analiz et
router.post('/analyze-all', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { agentId, agentName, days = 30 } = req.body;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Tüm unique lead_id'leri bul
    const { data: leadIds } = await supabase
      .from('messages')
      .select('lead_id, leads(phone, company_name)')
      .eq('user_id', userId)
      .eq('channel', 'whatsapp')
      .eq('direction', 'out')
      .gte('sent_at', since)
      .not('lead_id', 'is', null);

    const uniqueLeads = [...new Map((leadIds || []).map((m: any) => [m.lead_id, m])).values()];
    console.log(`Analiz edilecek: ${uniqueLeads.length} konuşma`);

    let analyzed = 0;
    const results = [];

    for (const item of uniqueLeads.slice(0, 20)) {
      try {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('lead_id', item.lead_id)
          .eq('user_id', userId)
          .gte('sent_at', since)
          .order('sent_at', { ascending: true });

        if (!messages || messages.length < 3) continue;

        const lead = item.leads;
        const analysis = await analyzeConversation(
          messages,
          agentName || 'Temsilci',
          lead?.phone || '',
          lead?.company_name || 'Bilinmiyor'
        );

        if (!analysis) continue;

        await supabase.from('conversation_analyses').insert([{
          user_id: userId,
          agent_id: agentId || null,
          agent_name: agentName || 'Temsilci',
          lead_id: item.lead_id,
          phone: lead?.phone,
          company_name: lead?.company_name,
          channel: 'whatsapp',
          period_start: messages[0]?.sent_at,
          period_end: messages[messages.length - 1]?.sent_at,
          message_count: messages.length,
          outbound_count: messages.filter((m: any) => m.direction === 'out').length,
          inbound_count: messages.filter((m: any) => m.direction === 'in').length,
          overall_score: analysis.overall_score,
          professionalism_score: analysis.professionalism_score,
          responsiveness_score: analysis.responsiveness_score,
          sales_technique_score: analysis.sales_technique_score,
          empathy_score: analysis.empathy_score,
          closing_score: analysis.closing_score,
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          lost_opportunities: analysis.lost_opportunities || [],
          key_moments: analysis.key_moments || [],
          recommendations: analysis.recommendations || [],
          summary: analysis.summary,
          conversation_snippet: messages.slice(-5).map((m: any) => ({
            direction: m.direction, content: m.content, sent_at: m.sent_at,
          })),
        }]);

        results.push({ leadId: item.lead_id, company: lead?.company_name, score: analysis.overall_score });
        analyzed++;
        await sleep(1000);
      } catch (e: any) {
        console.error(`Error analyzing lead ${item.lead_id}:`, e.message);
      }
    }

    res.json({ message: `${analyzed} konuşma analiz edildi`, analyzed, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sales-intelligence/analyses — Analiz listesi
router.get('/analyses', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { agentId, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('conversation_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (agentId) query = query.eq('agent_id', agentId);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ analyses: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sales-intelligence/analyses/:id — Tek analiz
router.get('/analyses/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('conversation_analyses')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    res.json({ analysis: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sales-intelligence/dashboard — Özet dashboard
router.get('/dashboard', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();

    const { data: analyses } = await supabase
      .from('conversation_analyses')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since);

    const data = analyses || [];

    // Genel istatistikler
    const avgScore = data.length > 0
      ? Math.round(data.reduce((s: number, a: any) => s + (a.overall_score || 0), 0) / data.length)
      : 0;

    // Agent bazlı özet
    const agentMap: Record<string, any> = {};
    for (const a of data) {
      const key = a.agent_name || 'Bilinmiyor';
      if (!agentMap[key]) {
        agentMap[key] = { name: key, agent_id: a.agent_id, count: 0, totalScore: 0, scores: [] };
      }
      agentMap[key].count++;
      agentMap[key].totalScore += a.overall_score || 0;
      agentMap[key].scores.push(a.overall_score || 0);
    }

    const agentSummary = Object.values(agentMap).map((a: any) => ({
      name: a.name,
      agent_id: a.agent_id,
      conversation_count: a.count,
      avg_score: Math.round(a.totalScore / a.count),
      min_score: Math.min(...a.scores),
      max_score: Math.max(...a.scores),
    })).sort((a: any, b: any) => b.avg_score - a.avg_score);

    // En iyi ve en kötü konuşmalar
    const sorted = [...data].sort((a: any, b: any) => (b.overall_score || 0) - (a.overall_score || 0));
    const topConversations = sorted.slice(0, 5).map((a: any) => ({
      id: a.id, company: a.company_name, agent: a.agent_name, score: a.overall_score, summary: a.summary,
    }));
    const worstConversations = sorted.slice(-5).reverse().map((a: any) => ({
      id: a.id, company: a.company_name, agent: a.agent_name, score: a.overall_score, summary: a.summary,
    }));

    // Ortak zayıf yönler
    const allWeaknesses: string[] = [];
    data.forEach((a: any) => { if (a.weaknesses) allWeaknesses.push(...a.weaknesses); });
    const weaknessCount: Record<string, number> = {};
    allWeaknesses.forEach(w => { weaknessCount[w] = (weaknessCount[w] || 0) + 1; });
    const topWeaknesses = Object.entries(weaknessCount)
      .sort(([,a], [,b]) => b - a).slice(0, 5)
      .map(([text, count]) => ({ text, count }));

    res.json({
      period_days: days,
      total_analyses: data.length,
      avg_score: avgScore,
      agent_summary: agentSummary,
      top_conversations: topConversations,
      worst_conversations: worstConversations,
      top_weaknesses: topWeaknesses,
      score_distribution: {
        excellent: data.filter((a: any) => a.overall_score >= 80).length,
        good: data.filter((a: any) => a.overall_score >= 60 && a.overall_score < 80).length,
        average: data.filter((a: any) => a.overall_score >= 40 && a.overall_score < 60).length,
        poor: data.filter((a: any) => a.overall_score < 40).length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sales-intelligence/report/:agentName — Temsilci raporu
router.get('/report/:agentName', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();
    const agentName = decodeURIComponent(req.params.agentName);

    const { data: analyses } = await supabase
      .from('conversation_analyses')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_name', agentName)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    const data = analyses || [];
    if (!data.length) return res.json({ message: 'Bu temsilci için analiz bulunamadı', analyses: [] });

    const avgScore = Math.round(data.reduce((s: number, a: any) => s + (a.overall_score || 0), 0) / data.length);
    const avgProfessionalism = Math.round(data.reduce((s: number, a: any) => s + (a.professionalism_score || 0), 0) / data.length);
    const avgSalesTechnique = Math.round(data.reduce((s: number, a: any) => s + (a.sales_technique_score || 0), 0) / data.length);
    const avgEmpathy = Math.round(data.reduce((s: number, a: any) => s + (a.empathy_score || 0), 0) / data.length);
    const avgClosing = Math.round(data.reduce((s: number, a: any) => s + (a.closing_score || 0), 0) / data.length);
    const avgResponseTime = Math.round(data.reduce((s: number, a: any) => s + (a.response_time_avg_min || 0), 0) / data.length);

    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];
    const allRecommendations: string[] = [];
    data.forEach((a: any) => {
      if (a.strengths) allStrengths.push(...a.strengths);
      if (a.weaknesses) allWeaknesses.push(...a.weaknesses);
      if (a.recommendations) allRecommendations.push(...a.recommendations);
    });

    const countItems = (items: string[]) => {
      const map: Record<string, number> = {};
      items.forEach(i => { map[i] = (map[i] || 0) + 1; });
      return Object.entries(map).sort(([,a],[,b]) => b-a).slice(0,5).map(([text,count]) => ({text,count}));
    };

    res.json({
      agent_name: agentName,
      period_days: days,
      total_conversations: data.length,
      total_messages: data.reduce((s: number, a: any) => s + (a.message_count || 0), 0),
      avg_response_time_min: avgResponseTime,
      scores: {
        overall: avgScore,
        professionalism: avgProfessionalism,
        sales_technique: avgSalesTechnique,
        empathy: avgEmpathy,
        closing: avgClosing,
      },
      top_strengths: countItems(allStrengths),
      top_weaknesses: countItems(allWeaknesses),
      top_recommendations: countItems(allRecommendations),
      conversations: data.map((a: any) => ({
        id: a.id,
        company: a.company_name,
        phone: a.phone,
        score: a.overall_score,
        message_count: a.message_count,
        summary: a.summary,
        created_at: a.created_at,
        key_moments: a.key_moments,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;