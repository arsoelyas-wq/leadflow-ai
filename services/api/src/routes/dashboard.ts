export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const weekAgo  = new Date(now.getTime() -  7 * 864e5).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 864e5).toISOString();
    const prevWeekStart = new Date(now.getTime() - 14 * 864e5).toISOString();

    const [
      { count: totalLeads },
      { count: weekLeads },
      { count: prevWeekLeads },
      { count: activeCampaigns },
      { count: totalCampaigns },
      { data: campaigns },
      { data: userCredits },
      { data: recentLeads },
      { data: recentCampaigns },
      { data: leadsByStatus },
      { data: wonLeads },
      { data: recentActivity },
    ] = await Promise.all([
      supabase.from('leads').select('*', { count:'exact', head:true }).eq('user_id', userId),
      supabase.from('leads').select('*', { count:'exact', head:true }).eq('user_id', userId).gte('created_at', weekAgo),
      supabase.from('leads').select('*', { count:'exact', head:true }).eq('user_id', userId).gte('created_at', prevWeekStart).lt('created_at', weekAgo),
      supabase.from('campaigns').select('*', { count:'exact', head:true }).eq('user_id', userId).eq('status', 'active'),
      supabase.from('campaigns').select('*', { count:'exact', head:true }).eq('user_id', userId),
      supabase.from('campaigns').select('total_sent, total_replied').eq('user_id', userId),
      supabase.from('users').select('credits_total, credits_used, plan_type, avg_deal_value').eq('id', userId).single(),
      supabase.from('leads').select('id, company_name, contact_name, city, source, score, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
      supabase.from('campaigns').select('id, name, channel, status, total_sent, total_replied, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(4),
      supabase.from('leads').select('status').eq('user_id', userId),
      supabase.from('leads').select('total_value').eq('user_id', userId).eq('status', 'won'),
      supabase.from('messages').select('id, content, direction, sent_at, channel').eq('user_id', userId).eq('direction', 'in').order('sent_at', { ascending: false }).limit(5),
    ]);

    const totalSent    = campaigns?.reduce((s: number, c: any) => s + (c.total_sent    || 0), 0) || 0;
    const totalReplied = campaigns?.reduce((s: number, c: any) => s + (c.total_replied || 0), 0) || 0;
    const replyRate    = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;
    const credits      = (userCredits?.credits_total || 0) - (userCredits?.credits_used || 0);
    const weekGrowth   = (prevWeekLeads || 0) > 0 ? Math.round(((weekLeads || 0) - (prevWeekLeads || 0)) / (prevWeekLeads || 1) * 100) : 0;

    // Lead funnel by status
    const statusCounts: Record<string,number> = {};
    (leadsByStatus || []).forEach((l: any) => { statusCounts[l.status] = (statusCounts[l.status]||0) + 1 });
    const funnel = [
      { label:'Yeni',       key:'new',       count: statusCounts['new']       || 0 },
      { label:'İletişim',   key:'contacted', count: statusCounts['contacted'] || 0 },
      { label:'Nitelikli',  key:'qualified', count: statusCounts['qualified'] || 0 },
      { label:'Teklif',     key:'proposal',  count: statusCounts['proposal']  || 0 },
      { label:'Kazanıldı',  key:'won',       count: statusCounts['won']       || 0 },
    ];

    // Pipeline value
    const avgDeal   = userCredits?.avg_deal_value || 5000;
    const pipelineValue = (wonLeads || []).reduce((s: number, l: any) => s + (l.total_value || avgDeal), 0) || (statusCounts['won'] || 0) * avgDeal;

    // Daily stats (last 7 days)
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dayStart = new Date(d.setHours(0,0,0,0)).toISOString();
      const dayEnd   = new Date(d.setHours(23,59,59,999)).toISOString();
      const { count: daySent } = await supabase.from('messages').select('*', { count:'exact', head:true }).eq('user_id', userId).eq('direction','out').gte('sent_at', dayStart).lte('sent_at', dayEnd);
      dailyStats.push({ date: new Date(dayStart).toLocaleDateString('tr-TR', { weekday:'short' }), sent: daySent || 0 });
    }

    // AI insights — simple rule-based
    const insights: { type: string; text: string; action: string; href: string }[] = [];
    if ((totalLeads || 0) > 0 && replyRate === 0 && totalSent === 0) {
      insights.push({ type:'action', text:`${totalLeads} leadiniz var ama henüz mesaj gönderilmedi.`, action:'İlk Kampanyayı Başlat', href:'/campaigns/new' });
    }
    if ((statusCounts['new'] || 0) > 10) {
      insights.push({ type:'warning', text:`${statusCounts['new']} yeni lead iletişim bekliyor.`, action:'Görüntüle', href:'/leads?status=new' });
    }
    if (credits < 100) {
      insights.push({ type:'credit', text:`Krediniz azalıyor: ${credits} kredi kaldı.`, action:'Kredi Al', href:'/billing' });
    }
    if ((statusCounts['won'] || 0) > 0) {
      insights.push({ type:'success', text:`Bu ay ${statusCounts['won']} deal kazanıldı!`, action:'Pipeline\'ı Gör', href:'/pipeline' });
    }

    res.json({
      stats: {
        totalLeads: totalLeads || 0, weekLeads: weekLeads || 0, weekGrowth,
        activeCampaigns: activeCampaigns || 0, totalCampaigns: totalCampaigns || 0,
        totalSent, totalReplied, replyRate,
        credits, planType: userCredits?.plan_type || 'starter',
        pipelineValue,
      },
      funnel,
      recentLeads:     recentLeads     || [],
      recentCampaigns: recentCampaigns || [],
      recentMessages:  recentActivity  || [],
      dailyStats,
      insights,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router };
