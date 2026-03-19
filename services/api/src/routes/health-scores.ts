export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function calculateHealthScore(lead: any, messages: any[], proposals: any[]): Promise<any> {
  const now = Date.now();
  const daysSinceCreated = Math.floor((now - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

  const outbound = messages.filter((m: any) => m.direction === 'out').length;
  const inbound = messages.filter((m: any) => m.direction === 'in').length;
  const replyRate = outbound > 0 ? (inbound / outbound) * 100 : 0;

  const lastMessage = messages.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
  const daysSinceLastContact = lastMessage
    ? Math.floor((now - new Date(lastMessage.sent_at).getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceCreated;

  const acceptedProposals = proposals.filter((p: any) => p.status === 'accepted').length;
  const sentProposals = proposals.filter((p: any) => ['sent', 'negotiating', 'accepted'].includes(p.status)).length;

  // Skor hesapla (0-100)
  let score = 0;

  // Cevap oranı (30 puan)
  score += Math.min(replyRate * 0.3, 30);

  // Son temas (20 puan)
  if (daysSinceLastContact <= 7) score += 20;
  else if (daysSinceLastContact <= 14) score += 15;
  else if (daysSinceLastContact <= 30) score += 10;
  else if (daysSinceLastContact <= 60) score += 5;

  // Teklif durumu (25 puan)
  if (acceptedProposals > 0) score += 25;
  else if (sentProposals > 0) score += 15;

  // Durum (15 puan)
  const statusScores: Record<string, number> = { won: 15, replied: 12, contacted: 8, new: 4 };
  score += statusScores[lead.status] || 0;

  // İletişim bilgisi (10 puan)
  if (lead.phone) score += 4;
  if (lead.email) score += 3;
  if (lead.contact_name) score += 3;

  score = Math.min(Math.round(score), 100);

  const churnRisk = score < 30 ? 'yuksek' : score < 50 ? 'orta' : 'dusuk';
  const stage = acceptedProposals > 0 ? 'musteri' :
    sentProposals > 0 ? 'teklif_asamasi' :
    inbound > 0 ? 'ilgili' :
    outbound > 0 ? 'iletisimde' : 'yeni';

  return {
    score,
    churnRisk,
    stage,
    metrics: { replyRate: Math.round(replyRate), daysSinceLastContact, outbound, inbound, sentProposals, acceptedProposals },
    recommendation: score >= 70 ? 'Sıcak lead — hızlı aksiyon al' :
      score >= 50 ? 'Potansiyel var — düzenli takip et' :
      score >= 30 ? 'Risk altında — farklı yaklaşım dene' :
      'Churn riski yüksek — retargeting uygula',
  };
}

router.get('/scores', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: leads } = await supabase.from('leads').select('*').eq('user_id', userId).limit(100);
    if (!leads?.length) return res.json({ leads: [], summary: {} });

    const results = await Promise.all(leads.map(async (lead: any) => {
      const [{ data: messages }, { data: proposals }] = await Promise.all([
        supabase.from('messages').select('direction, sent_at').eq('lead_id', lead.id),
        supabase.from('proposals').select('status').eq('lead_id', lead.id),
      ]);
      const health = await calculateHealthScore(lead, messages || [], proposals || []);
      return { ...lead, health };
    }));

    results.sort((a, b) => b.health.score - a.health.score);

    const summary = {
      avgScore: Math.round(results.reduce((s, l) => s + l.health.score, 0) / results.length),
      highRisk: results.filter(l => l.health.churnRisk === 'yuksek').length,
      customers: results.filter(l => l.health.stage === 'musteri').length,
      hotLeads: results.filter(l => l.health.score >= 70).length,
    };

    res.json({ leads: results.slice(0, 50), summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;