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

    // Detect user language from cookie or header
    const lang = (req.cookies?.lf_lang || req.headers['x-lang'] || 'tr').toLowerCase()

    // Multilingual insight texts
    const I: Record<string, Record<string, string>> = {
      tr: { no_msg:`${statusCounts['new'] || totalLeads} lead sizi bekliyor — henüz ilk mesajınızı göndermediniz. İlk kampanyanı başlat ve görüşmeleri başlat.`, start_campaign:'İlk Kampanyayı Başlat', new_leads:`${statusCounts['new']} yeni lead iletişim bekliyor.`, view:'Görüntüle', low_credit:`Krediniz azalıyor: ${credits} kredi kaldı.`, buy_credit:'Kredi Al', won:`Bu ay ${statusCounts['won']} deal kazanıldı!`, see_pipeline:'Pipeline\'ı Gör' },
      de: { no_msg:`${statusCounts['new'] || totalLeads} Leads warten auf Sie — Sie haben noch keine erste Nachricht gesendet. Starten Sie Ihre erste Kampagne und beginnen Sie die Gespräche.`, start_campaign:'Erste Kampagne starten', new_leads:`${statusCounts['new']} neue Leads warten auf Kontakt.`, view:'Anzeigen', low_credit:`Ihr Guthaben wird knapp: ${credits} Credits übrig.`, buy_credit:'Credits kaufen', won:`Diesen Monat ${statusCounts['won']} Deals gewonnen!`, see_pipeline:'Pipeline anzeigen' },
      ru: { no_msg:`${statusCounts['new'] || totalLeads} лидов ждут вас — вы ещё не отправили первое сообщение. Запустите первую кампанию и начните общение.`, start_campaign:'Запустить первую кампанию', new_leads:`${statusCounts['new']} новых лидов ждут контакта.`, view:'Посмотреть', low_credit:`Баланс заканчивается: осталось ${credits} кредитов.`, buy_credit:'Купить кредиты', won:`В этом месяце выиграно ${statusCounts['won']} сделок!`, see_pipeline:'Просмотреть воронку' },
      en: { no_msg:`${statusCounts['new'] || totalLeads} leads are waiting on you — you haven't sent your first message yet. Start your first campaign and open the conversation.`, start_campaign:'Start First Campaign', new_leads:`${statusCounts['new']} new leads are waiting for contact.`, view:'View', low_credit:`Your credits are running low: ${credits} left.`, buy_credit:'Buy Credits', won:`${statusCounts['won']} deals won this month!`, see_pipeline:'View Pipeline' },
      fr: { no_msg:`${statusCounts['new'] || totalLeads} leads vous attendent — vous n'avez pas encore envoyé votre premier message. Lancez votre première campagne et démarrez la conversation.`, start_campaign:'Lancer première campagne', new_leads:`${statusCounts['new']} nouveaux leads attendent un contact.`, view:'Voir', low_credit:`Vos crédits diminuent: ${credits} restants.`, buy_credit:'Acheter des crédits', won:`${statusCounts['won']} deals gagnés ce mois!`, see_pipeline:'Voir le pipeline' },
      ar: { no_msg:`${statusCounts['new'] || totalLeads} عميل محتمل بانتظارك، ولم ترسل أول رسالة بعد. ابدأ حملتك الأولى وافتح المحادثة.`, start_campaign:'بدء أول حملة', new_leads:`${statusCounts['new']} عميل جديد ينتظر التواصل.`, view:'عرض', low_credit:`رصيدك ينخفض: ${credits} متبقٍ.`, buy_credit:'شراء رصيد', won:`${statusCounts['won']} صفقة فائزة هذا الشهر!`, see_pipeline:'عرض قمع المبيعات' },
    }
    const T = I[lang] || I['tr']

    // AI insights — multilingual rule-based, en öncelikli TEK senaryo seçilir (çelişen alarmları önler)
    const insights: { type: string; text: string; action: string; href: string }[] = [];
    const hasUncontactedLeads = (totalLeads || 0) > 0 && replyRate === 0 && totalSent === 0
    if (hasUncontactedLeads) {
      // "lead bekliyor" + "henüz mesaj yok" aynı durumun iki yüzü — tek, bağlamlandırılmış anlatıda birleştirilir
      insights.push({ type:'action', text: T.no_msg, action: T.start_campaign, href:'/campaigns/new' });
    } else if ((statusCounts['new'] || 0) > 10) {
      insights.push({ type:'warning', text: T.new_leads, action: T.view, href:'/leads?status=new' });
    }
    if (credits < 100) {
      insights.push({ type:'credit', text: T.low_credit, action: T.buy_credit, href:'/billing' });
    }
    if ((statusCounts['won'] || 0) > 0) {
      insights.push({ type:'success', text: T.won, action: T.see_pipeline, href:'/pipeline' });
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
