export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── KONUŞMA ANALİZİ ───────────────────────────────────────
async function analyzeConversation(messages: any[], agentName: string, leadName: string): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const conversation = messages.map((m: any) =>
      `${m.direction === 'out' ? agentName : leadName}: ${m.content}`
    ).join('\n');

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Bu satış konuşmasını analiz et ve JSON döndür:

Konuşma:
${conversation.slice(0, 2000)}

JSON format:
{
  "overall_score": 7,
  "tone_score": 8,
  "persuasion_score": 6,
  "empathy_score": 7,
  "missed_opportunity": "Müşteri fiyat sorduğunda alternatif sunamadı",
  "best_moment": "Ürün özelliklerini iyi anlattı",
  "suggestion": "Şöyle demeliydi: ...",
  "outcome": "positive/negative/neutral",
  "next_action": "Teklif gönder"
}`
      }]
    });

    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

// GET /api/coaching/reports
router.get('/reports', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('sales_coaching')
      .select('*, leads(company_name)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    res.json({ reports: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/coaching/leaderboard
router.get('/leaderboard', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('sales_coaching')
      .select('agent_name, analysis_score')
      .eq('user_id', req.userId);

    const board: Record<string, { total: number; count: number }> = {};
    (data || []).forEach((r: any) => {
      if (!board[r.agent_name]) board[r.agent_name] = { total: 0, count: 0 };
      board[r.agent_name].total += r.analysis_score || 0;
      board[r.agent_name].count++;
    });

    const leaderboard = Object.entries(board).map(([name, stats]) => ({
      name,
      avgScore: Math.round(stats.total / stats.count),
      totalAnalyzed: stats.count,
    })).sort((a, b) => b.avgScore - a.avgScore);

    res.json({ leaderboard });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/coaching/analyze — Konuşma analiz et
router.post('/analyze', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, agentName } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Tüm mesajları çek — WhatsApp + manuel
    const { data: messages } = await supabase.from('messages')
      .select('*').eq('lead_id', leadId)
      .order('sent_at', { ascending: true }).limit(50);

    if (!messages?.length) return res.status(400).json({ error: 'Analiz edilecek mesaj yok' });

    const analysis = await analyzeConversation(messages, agentName || 'Satış Temsilcisi', lead.company_name);
    if (!analysis) return res.status(500).json({ error: 'Analiz yapılamadı' });

    const { data: saved } = await supabase.from('sales_coaching').insert([{
      user_id: userId,
      lead_id: leadId,
      agent_name: agentName || 'Satış Temsilcisi',
      analysis_score: analysis.overall_score,
      tone_score: analysis.tone_score,
      persuasion_score: analysis.persuasion_score,
      empathy_score: analysis.empathy_score,
      missed_opportunity: analysis.missed_opportunity,
      best_moment: analysis.best_moment,
      suggestion: analysis.suggestion,
      outcome: analysis.outcome,
      next_action: analysis.next_action,
      message_count: messages.length,
    }]).select().single();

    res.json({ analysis, report: saved, message: 'Analiz tamamlandı!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/coaching/analyze-batch — Toplu analiz
router.post('/analyze-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { agentName, limit = 10 } = req.body;

    // Son konuşmaları olan leadleri al
    const { data: leads } = await supabase.from('leads').select('id, company_name')
      .eq('user_id', userId).in('status', ['contacted', 'replied', 'won', 'lost']).limit(limit);

    res.json({ message: `${leads?.length || 0} konuşma analiz ediliyor...` });

    (async () => {
      for (const lead of leads || []) {
        try {
          const { data: messages } = await supabase.from('messages')
            .select('*').eq('lead_id', lead.id).order('sent_at', { ascending: true }).limit(30);
          if (!messages?.length) continue;

          const analysis = await analyzeConversation(messages, agentName || 'Satış Temsilcisi', lead.company_name);
          if (!analysis) continue;

          await supabase.from('sales_coaching').insert([{
            user_id: userId, lead_id: lead.id,
            agent_name: agentName || 'Satış Temsilcisi',
            analysis_score: analysis.overall_score,
            tone_score: analysis.tone_score,
            missed_opportunity: analysis.missed_opportunity,
            suggestion: analysis.suggestion,
            outcome: analysis.outcome,
            message_count: messages.length,
          }]);
          await new Promise(r => setTimeout(r, 1000));
        } catch {}
      }
      console.log('Batch coaching analysis done');
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/coaching/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('sales_coaching').select('*').eq('user_id', req.userId);
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    res.json({
      total: data?.length || 0,
      avgScore: avg(data?.map((d: any) => d.analysis_score || 0) || []),
      positive: data?.filter((d: any) => d.outcome === 'positive').length || 0,
      negative: data?.filter((d: any) => d.outcome === 'negative').length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/coaching/weekly-report
router.get('/weekly-report', async (req: any, res: any) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await supabase.from('sales_coaching').select('*')
      .eq('user_id', req.userId).gte('created_at', weekAgo.toISOString());

    if (!data?.length) return res.json({ message: 'Bu hafta analiz yok', data: [] });

    const avgScore = Math.round(data.reduce((a: number, d: any) => a + (d.analysis_score || 0), 0) / data.length);
    const missedOps = data.filter((d: any) => d.missed_opportunity).map((d: any) => d.missed_opportunity);
    const bestMoments = data.filter((d: any) => d.best_moment).map((d: any) => d.best_moment);

    res.json({
      period: '7 gün',
      totalAnalyzed: data.length,
      avgScore,
      positive: data.filter((d: any) => d.outcome === 'positive').length,
      topMissedOpportunity: missedOps[0] || null,
      topBestMoment: bestMoments[0] || null,
      agents: [...new Set(data.map((d: any) => d.agent_name))],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;