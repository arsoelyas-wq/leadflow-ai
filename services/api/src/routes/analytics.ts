export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── MEVCUT OVERVIEW ───────────────────────────────────────
router.get('/overview', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: leads },
      { data: user },
      { data: campaigns },
      { data: messages },
    ] = await Promise.all([
      supabase.from('leads').select('status, source, created_at').eq('user_id', userId),
      supabase.from('users').select('credits_total, credits_used').eq('id', userId).single(),
      supabase.from('campaigns').select('name, channel, status, total_sent, total_replied').eq('user_id', userId),
      supabase.from('messages').select('channel, direction').eq('user_id', userId),
    ]);

    const allLeads = leads || [];
    const allCampaigns = campaigns || [];
    const allMessages = messages || [];

    const totalLeads = allLeads.length;
    const newLeads = allLeads.filter((l: any) => l.created_at >= weekAgo).length;

    const sourceBreakdown: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      const src = l.source || 'manual';
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
    });

    const statusBreakdown: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      statusBreakdown[l.status] = (statusBreakdown[l.status] || 0) + 1;
    });

    const activeCampaigns = allCampaigns.filter((c: any) => c.status === 'active').length;
    const totalSent = allCampaigns.reduce((s: number, c: any) => s + (c.total_sent || 0), 0);
    const totalReplied = allCampaigns.reduce((s: number, c: any) => s + (c.total_replied || 0), 0);
    const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

    const topCampaigns = allCampaigns
      .filter((c: any) => (c.total_sent || 0) > 0)
      .sort((a: any, b: any) => (b.total_sent || 0) - (a.total_sent || 0))
      .slice(0, 5);

    const channelStats = {
      whatsapp: allMessages.filter((m: any) => m.channel === 'whatsapp' && m.direction === 'out').length,
      email: allMessages.filter((m: any) => m.channel === 'email' && m.direction === 'out').length,
    };

    const credits = (user?.credits_total || 0) - (user?.credits_used || 0);

    res.json({
      totalLeads, newLeads, replyRate, activeCampaigns, credits,
      totalSent, totalReplied, sourceBreakdown, statusBreakdown,
      channelStats, topCampaigns,
    });
  } catch (error: any) {
    console.error('Analytics error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── PREDICTIVE REVENUE DASHBOARD ──────────────────────────
router.get('/revenue', async (req: any, res: any) => {
  try {
    const userId = req.userId;

    // Son 90 günlük veri çek
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: allLeads },
      { data: recentMessages },
      { data: campaigns },
      { data: user },
    ] = await Promise.all([
      supabase.from('leads').select('*').eq('user_id', userId).gte('created_at', ninetyDaysAgo),
      supabase.from('messages').select('direction, channel, sent_at').eq('user_id', userId).gte('sent_at', ninetyDaysAgo),
      supabase.from('campaigns').select('*').eq('user_id', userId),
      supabase.from('users').select('plan_type, credits_total, credits_used, created_at').eq('id', userId).single(),
    ]);

    const leads = allLeads || [];
    const messages = recentMessages || [];
    const allCampaigns = campaigns || [];

    // ── HAFTALIK BÜYÜME ───────────────────────────────────
    const weeklyData: Record<string, { leads: number; messages: number; replies: number }> = {};
    
    for (let i = 12; i >= 0; i--) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const key = weekStart.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      
      weeklyData[key] = {
        leads: leads.filter((l: any) => new Date(l.created_at) >= weekStart && new Date(l.created_at) < weekEnd).length,
        messages: messages.filter((m: any) => m.direction === 'out' && new Date(m.sent_at) >= weekStart && new Date(m.sent_at) < weekEnd).length,
        replies: messages.filter((m: any) => m.direction === 'in' && new Date(m.sent_at) >= weekStart && new Date(m.sent_at) < weekEnd).length,
      };
    }

    // ── FUNNEL DÖNÜŞÜM ORANLARI ───────────────────────────
    const totalLeads = leads.length;
    const contacted = leads.filter((l: any) => ['contacted', 'qualified', 'won', 'lost'].includes(l.status)).length;
    const qualified = leads.filter((l: any) => ['qualified', 'won'].includes(l.status)).length;
    const won = leads.filter((l: any) => l.status === 'won').length;

    const contactRate = totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0;
    const qualifyRate = contacted > 0 ? Math.round((qualified / contacted) * 100) : 0;
    const winRate = qualified > 0 ? Math.round((won / qualified) * 100) : 0;

    // ── GELİR TAHMİNİ ─────────────────────────────────────
    // Son 30 gün metrikleri
    const last30Leads = leads.filter((l: any) => l.created_at >= thirtyDaysAgo).length;
    const last30Messages = messages.filter((m: any) => m.direction === 'out' && m.sent_at >= thirtyDaysAgo).length;
    const last30Replies = messages.filter((m: any) => m.direction === 'in' && m.sent_at >= thirtyDaysAgo).length;

    // Önceki 30 gün
    const prev30Leads = leads.filter((l: any) => l.created_at >= sixtyDaysAgo && l.created_at < thirtyDaysAgo).length;
    const prev30Messages = messages.filter((m: any) => m.direction === 'out' && m.sent_at >= sixtyDaysAgo && m.sent_at < thirtyDaysAgo).length;

    // Büyüme oranları
    const leadGrowth = prev30Leads > 0 ? ((last30Leads - prev30Leads) / prev30Leads) * 100 : 0;
    const messageGrowth = prev30Messages > 0 ? ((last30Messages - prev30Messages) / prev30Messages) * 100 : 0;

    // Reply rate
    const replyRate30 = last30Messages > 0 ? Math.round((last30Replies / last30Messages) * 100) : 0;

    // Gelir tahmini (kullanıcı plan tipine göre ortalama müşteri değeri)
    const planMultiplier: Record<string, number> = {
      starter: 500,
      professional: 1500,
      enterprise: 5000,
    };
    const avgDealValue = planMultiplier[user?.plan_type || 'starter'] || 500;

    // Aylık potansiyel gelir = lead * win_rate * avg_deal_value
    const monthlyPotential = Math.round(last30Leads * (winRate / 100) * avgDealValue);
    const nextMonthForecast = Math.round(monthlyPotential * (1 + leadGrowth / 100));

    // 3 aylık projeksiyon
    const projections = [1, 2, 3].map(month => ({
      month: `${month}. Ay`,
      leads: Math.round(last30Leads * Math.pow(1 + leadGrowth / 100, month)),
      revenue: Math.round(monthlyPotential * Math.pow(1 + leadGrowth / 100, month)),
      messages: Math.round(last30Messages * Math.pow(1 + messageGrowth / 100, month)),
    }));

    // ── KANAL PERFORMANSI ─────────────────────────────────
    const waMessages = messages.filter((m: any) => m.channel === 'whatsapp' && m.direction === 'out').length;
    const waReplies = messages.filter((m: any) => m.channel === 'whatsapp' && m.direction === 'in').length;
    const emailMessages = messages.filter((m: any) => m.channel === 'email' && m.direction === 'out').length;
    const emailReplies = messages.filter((m: any) => m.channel === 'email' && m.direction === 'in').length;

    const channelPerformance = [
      {
        channel: 'WhatsApp',
        sent: waMessages,
        replies: waReplies,
        replyRate: waMessages > 0 ? Math.round((waReplies / waMessages) * 100) : 0,
        color: '#25D366',
      },
      {
        channel: 'Email',
        sent: emailMessages,
        replies: emailReplies,
        replyRate: emailMessages > 0 ? Math.round((emailReplies / emailMessages) * 100) : 0,
        color: '#3B82F6',
      },
    ];

    // ── EN İYİ PERFORMANS GÖSTERGELERİ ───────────────────
    const bestCampaign = allCampaigns
      .filter((c: any) => c.total_sent > 0)
      .sort((a: any, b: any) => {
        const rateA = (a.total_replied || 0) / (a.total_sent || 1);
        const rateB = (b.total_replied || 0) / (b.total_sent || 1);
        return rateB - rateA;
      })[0];

    // ── AI TAVSİYELERİ ────────────────────────────────────
    const recommendations: string[] = [];

    if (replyRate30 < 5) recommendations.push('Mesaj şablonlarınızı kişiselleştirin — cevap oranınız düşük (%' + replyRate30 + ')');
    if (leadGrowth < 0) recommendations.push('Lead büyümeniz yavaşlıyor — rakip hijacking veya yeni scraping deneyin');
    if (winRate < 10) recommendations.push('Satış kapama oranınız düşük — nitelikli lead\'lere öncelik verin');
    if (waMessages === 0) recommendations.push('WhatsApp kampanyası başlatmadınız — en yüksek dönüşüm kanalı!');
    if (last30Leads > 50 && contactRate < 30) recommendations.push('Çok lead var ama iletişime geçilmiyor — kampanya başlatın');
    if (recommendations.length === 0) recommendations.push('Harika gidiyorsunuz! Büyümeyi sürdürmek için aylık lead hedefini artırın');

    res.json({
      // Özet
      summary: {
        last30Leads,
        last30Messages,
        last30Replies,
        replyRate: replyRate30,
        leadGrowth: Math.round(leadGrowth),
        messageGrowth: Math.round(messageGrowth),
      },
      // Funnel
      funnel: {
        total: totalLeads,
        contacted,
        qualified,
        won,
        contactRate,
        qualifyRate,
        winRate,
      },
      // Gelir tahmini
      revenue: {
        avgDealValue,
        monthlyPotential,
        nextMonthForecast,
        projections,
      },
      // Haftalık trend
      weeklyTrend: Object.entries(weeklyData).map(([week, data]) => ({ week, ...data })),
      // Kanal performansı
      channelPerformance,
      // En iyi kampanya
      bestCampaign: bestCampaign ? {
        name: bestCampaign.name,
        sent: bestCampaign.total_sent,
        replied: bestCampaign.total_replied,
        rate: Math.round(((bestCampaign.total_replied || 0) / (bestCampaign.total_sent || 1)) * 100),
      } : null,
      // Tavsiyeler
      recommendations,
    });

  } catch (error: any) {
    console.error('Revenue analytics error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;