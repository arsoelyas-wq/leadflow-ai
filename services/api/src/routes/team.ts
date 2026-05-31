export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── ROLLER ────────────────────────────────────────────────────────────────────
const ROLES: Record<string, any> = {
  admin:    { label:'Yönetici',          permissions:['*'],                                             color:'#ef4444' },
  manager:  { label:'Müdür',             permissions:['leads','messages','campaigns','pipeline','analytics','coaching'], color:'#8b5cf6' },
  sales:    { label:'Satış Temsilcisi',  permissions:['leads','messages','campaigns','pipeline'],       color:'#3b82f6' },
  support:  { label:'Destek',            permissions:['leads','messages'],                              color:'#10b981' },
  readonly: { label:'Görüntüleyici',     permissions:['leads','analytics'],                            color:'#64748b' },
};

// ── ROZET TANIMLARI ───────────────────────────────────────────────────────────
const BADGES = [
  { id:'top_seller',     label:'🏆 En İyi Satıcı',      desc:'Bu ay en yüksek dönüşüm' },
  { id:'speed_master',   label:'⚡ Hız Ustası',           desc:'Ort. yanıt süresi <5dk' },
  { id:'streak_7',       label:'🔥 7 Günlük Seri',        desc:'7 gün üst üste lead kapattı' },
  { id:'closer',         label:'🎯 Kapanış Ustası',        desc:'%40+ dönüşüm oranı' },
  { id:'coach_star',     label:'⭐ Koçluk Yıldızı',       desc:'Ortalama skor 85+' },
  { id:'consistent',     label:'💪 Tutarlı Performans',   desc:'3 ay üst üste hedef aştı' },
];

// ── HELPER ────────────────────────────────────────────────────────────────────
async function getTeamMember(userId: string, memberId: string) {
  const { data } = await supabase.from('team_members').select('*').eq('owner_id', userId).eq('id', memberId).single();
  return data;
}

async function sendWhatsAppToMember(userId: string, memberPhone: string, message: string) {
  try {
    const { sendWhatsAppMessage } = require('./settings');
    await sendWhatsAppMessage(userId, memberPhone, message);
  } catch {}
}

// ── CRUD ROUTES ───────────────────────────────────────────────────────────────

router.get('/members', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('team_members')
      .select('id, name, email, role, active, last_login, created_at, leads_count, wa_phone, status, target_leads_monthly, target_conversion_rate, badges')
      .eq('owner_id', req.userId)
      .order('created_at', { ascending: false });
    res.json({ members: data || [], roles: ROLES });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

router.post('/members', async (req: any, res: any) => {
  try {
    const { name, email, role, password, wa_phone, target_leads_monthly, target_conversion_rate } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: 'name, email, role zorunlu' });
    if (!ROLES[role]) return res.status(400).json({ error: 'Geçersiz rol' });
    const { data: existing } = await supabase.from('team_members').select('id').eq('owner_id', req.userId).eq('email', email).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    const hashedPassword = await bcrypt.hash(password || 'LeadFlow2024!', 10);
    const { data } = await supabase.from('team_members').insert([{
      owner_id: req.userId, name, email, role, password_hash: hashedPassword,
      active: true, leads_count: 0, status: 'offline', badges: [],
      wa_phone: wa_phone || null,
      target_leads_monthly: target_leads_monthly || 30,
      target_conversion_rate: target_conversion_rate || 25,
    }]).select().single();
    res.json({ member: { ...data, password_hash: undefined }, message: `${name} ekibe eklendi!` });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

router.patch('/members/:id', async (req: any, res: any) => {
  try {
    const { name, role, active, wa_phone, target_leads_monthly, target_conversion_rate, status } = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (role && ROLES[role]) updateData.role = role;
    if (active !== undefined) updateData.active = active;
    if (wa_phone !== undefined) updateData.wa_phone = wa_phone;
    if (target_leads_monthly !== undefined) updateData.target_leads_monthly = target_leads_monthly;
    if (target_conversion_rate !== undefined) updateData.target_conversion_rate = target_conversion_rate;
    if (status !== undefined) updateData.status = status;
    await supabase.from('team_members').update(updateData).eq('id', req.params.id).eq('owner_id', req.userId);
    res.json({ message: 'Üye güncellendi' });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

router.delete('/members/:id', async (req: any, res: any) => {
  try {
    await supabase.from('team_members').delete().eq('id', req.params.id).eq('owner_id', req.userId);
    res.json({ message: 'Üye silindi' });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email ve password zorunlu' });
    const { data: member } = await supabase.from('team_members').select('*').eq('email', email).eq('active', true).single();
    if (!member) return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    const valid = await bcrypt.compare(password, member.password_hash);
    if (!valid) return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: member.owner_id, memberId: member.id, role: member.role, name: member.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await supabase.from('team_members').update({ last_login: new Date().toISOString(), status: 'online' }).eq('id', member.id);
    res.json({ token, member: { id: member.id, name: member.name, email: member.email, role: member.role, permissions: ROLES[member.role]?.permissions || [] } });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members').select('id, role, active, status').eq('owner_id', req.userId);
    const stats = {
      total: members?.length || 0,
      active: members?.filter((m:any) => m.active).length || 0,
      online: members?.filter((m:any) => m.status === 'online').length || 0,
      byRole: {} as Record<string,number>,
    };
    (members||[]).forEach((m:any) => { stats.byRole[m.role] = (stats.byRole[m.role]||0)+1; });
    res.json(stats);
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── AKTIVITE ──────────────────────────────────────────────────────────────────
router.get('/activity', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members').select('id, name, role, status, wa_phone').eq('owner_id', req.userId);
    const weekAgo = new Date(Date.now() - 7*864e5).toISOString();
    const monthAgo = new Date(Date.now() - 30*864e5).toISOString();

    const activity = await Promise.all((members||[]).map(async (member:any) => {
      const [msgs, leads, wonLeads, coaching] = await Promise.allSettled([
        supabase.from('messages').select('id, sent_at').eq('user_id', req.userId).eq('agent_id', member.id).gte('sent_at', weekAgo)
          .catch(() => ({ data: [] })),
        supabase.from('leads').select('id, status').eq('user_id', req.userId).eq('assigned_member_id', member.id),
        supabase.from('leads').select('id').eq('user_id', req.userId).eq('assigned_member_id', member.id).eq('status', 'won').gte('won_at', monthAgo),
        supabase.from('sales_coaching').select('analysis_score').eq('user_id', req.userId).eq('agent_name', member.name),
      ]);

      const weeklyMessages = msgs.status==='fulfilled' ? msgs.value.data?.length||0 : 0;
      const assignedLeads  = leads.status==='fulfilled' ? leads.value.data||[] : [];
      const wonThisMonth   = wonLeads.status==='fulfilled' ? wonLeads.value.data?.length||0 : 0;
      const allCoaching    = coaching.status==='fulfilled' ? coaching.value.data||[] : [];
      const avgScore       = allCoaching.length ? Math.round(allCoaching.reduce((a:number,c:any)=>a+(c.analysis_score||0),0)/allCoaching.length) : null;
      const convRate       = assignedLeads.length > 0 ? Math.round((wonThisMonth/assignedLeads.length)*100) : 0;

      return { member, weeklyMessages, totalLeads: assignedLeads.length, activeLeads: assignedLeads.filter((l:any)=>!['won','lost','dismissed'].includes(l.status)).length, wonThisMonth, convRate, avgCoachingScore: avgScore };
    }));
    res.json({ activity });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── LİDERLİK TABLOSU ─────────────────────────────────────────────────────────
router.get('/leaderboard', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members').select('id, name, role, badges, target_leads_monthly, target_conversion_rate').eq('owner_id', req.userId).eq('active', true);
    const monthAgo = new Date(Date.now() - 30*864e5).toISOString();

    const leaderboard = await Promise.all((members||[]).map(async (m:any) => {
      const [wonRes, totalRes, coachRes] = await Promise.allSettled([
        supabase.from('leads').select('id, total_value').eq('user_id', req.userId).eq('assigned_member_id', m.id).eq('status', 'won').gte('won_at', monthAgo),
        supabase.from('leads').select('id').eq('user_id', req.userId).eq('assigned_member_id', m.id),
        supabase.from('sales_coaching').select('analysis_score').eq('user_id', req.userId).eq('agent_name', m.name).order('created_at', { ascending: false }).limit(10),
      ]);
      const won   = wonRes.status==='fulfilled'   ? wonRes.value.data||[]   : [];
      const total = totalRes.status==='fulfilled'  ? totalRes.value.data||[] : [];
      const coach = coachRes.status==='fulfilled'  ? coachRes.value.data||[] : [];
      const revenue    = won.reduce((s:number,l:any) => s+(l.total_value||0), 0);
      const convRate   = total.length > 0 ? Math.round((won.length/total.length)*100) : 0;
      const avgScore   = coach.length ? Math.round(coach.reduce((s:number,c:any)=>s+(c.analysis_score||0),0)/coach.length) : 0;
      const totalScore = (won.length*3) + (convRate) + (avgScore*0.5) + (revenue>0 ? Math.min(50, Math.round(revenue/10000)) : 0);

      return { ...m, wonCount: won.length, totalLeads: total.length, revenue, convRate, avgScore, totalScore: Math.round(totalScore) };
    }));

    leaderboard.sort((a,b) => b.totalScore - a.totalScore);

    // Rozet güncelleme
    for (let i=0; i<leaderboard.length; i++) {
      const m = leaderboard[i];
      const newBadges: string[] = [...(m.badges||[])];
      if (i===0 && !newBadges.includes('top_seller')) newBadges.push('top_seller');
      if (m.convRate >= 40 && !newBadges.includes('closer')) newBadges.push('closer');
      if (m.avgScore >= 85 && !newBadges.includes('coach_star')) newBadges.push('coach_star');
      if (JSON.stringify(newBadges) !== JSON.stringify(m.badges)) {
        await supabase.from('team_members').update({ badges: newBadges }).eq('id', m.id);
        m.badges = newBadges;
      }
    }

    res.json({ leaderboard, badges: BADGES });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── YÜK DENGESİ ──────────────────────────────────────────────────────────────
router.get('/load-balance', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members').select('id, name, role, active').eq('owner_id', req.userId).eq('active', true);
    const loads = await Promise.all((members||[]).map(async (m:any) => {
      const { data: activeLeads } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('assigned_member_id', m.id).not('status', 'in', '(won,lost,dismissed)');
      return { ...m, activeLeads: activeLeads?.length||0 };
    }));
    loads.sort((a,b) => a.activeLeads - b.activeLeads);
    const avg = loads.length ? Math.round(loads.reduce((s,m)=>s+m.activeLeads,0)/loads.length) : 0;
    const warnings = loads.filter(m => m.activeLeads > avg*1.5 + 10).map(m => ({ member: m, warning: `${m.name}'in ${m.activeLeads} aktif leadi var — yük fazla!` }));
    res.json({ loads, avg, warnings });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── OTOMATIK LEAD DAĞITIMI (Round-Robin) ─────────────────────────────────────
router.post('/auto-assign', async (req: any, res: any) => {
  try {
    const { leadIds, rule = 'round_robin', roleFilter } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'leadIds zorunlu' });

    let query = supabase.from('team_members').select('id, name, leads_count').eq('owner_id', req.userId).eq('active', true);
    if (roleFilter) query = query.in('role', roleFilter);
    const { data: members } = await query;
    if (!members?.length) return res.status(400).json({ error: 'Aktif üye bulunamadı' });

    // Gerçek aktif lead sayısını al
    const memberLoads = await Promise.all(members.map(async (m:any) => {
      const { data } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('assigned_member_id', m.id).not('status', 'in', '(won,lost,dismissed)');
      return { ...m, currentLoad: data?.length||0 };
    }));

    let assigned = 0;
    for (const leadId of leadIds) {
      let target: any;
      if (rule === 'round_robin') {
        // En az yüklü üye
        memberLoads.sort((a,b) => a.currentLoad - b.currentLoad);
        target = memberLoads[0];
      } else if (rule === 'random') {
        target = memberLoads[Math.floor(Math.random()*memberLoads.length)];
      }
      if (!target) continue;

      await supabase.from('leads').update({ assigned_to: target.name, assigned_member_id: target.id }).eq('id', leadId).eq('user_id', req.userId);
      target.currentLoad++;
      assigned++;
    }

    res.json({ message: `${assigned} lead otomatik dağıtıldı (${rule})`, assigned });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── TOPLU TRANSFER ────────────────────────────────────────────────────────────
router.post('/bulk-transfer', async (req: any, res: any) => {
  try {
    const { fromMemberId, toMemberId } = req.body;
    if (!fromMemberId || !toMemberId) return res.status(400).json({ error: 'fromMemberId ve toMemberId zorunlu' });
    const [from, to] = await Promise.all([getTeamMember(req.userId, fromMemberId), getTeamMember(req.userId, toMemberId)]);
    if (!from || !to) return res.status(404).json({ error: 'Üye bulunamadı' });
    const { data: leads } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('assigned_member_id', fromMemberId).not('status','in','(won,lost,dismissed)');
    if (!leads?.length) return res.json({ message: 'Transfer edilecek aktif lead yok', transferred: 0 });
    const leadIds = leads.map((l:any) => l.id);
    await supabase.from('leads').update({ assigned_to: to.name, assigned_member_id: toMemberId }).in('id', leadIds).eq('user_id', req.userId);
    res.json({ message: `${leadIds.length} lead ${from.name}'den ${to.name}'e transfer edildi`, transferred: leadIds.length });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── AI KOÇLUK MESAJI ──────────────────────────────────────────────────────────
router.post('/send-coaching', async (req: any, res: any) => {
  try {
    const { memberId } = req.body;
    const member = await getTeamMember(req.userId, memberId);
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı' });

    // Son analizleri al
    const { data: coaching } = await supabase.from('sales_coaching').select('*').eq('user_id', req.userId).eq('agent_name', member.name).order('created_at', { ascending: false }).limit(5);
    if (!coaching?.length) return res.status(400).json({ error: 'Analiz verisi yok — önce WhatsApp konuşmalarını analiz edin' });

    const avgScore = Math.round(coaching.reduce((s:number,c:any)=>s+(c.analysis_score||0),0)/coaching.length);
    const scores = coaching[0]?.scores || {};

    // AI ile kişiselleştirilmiş koçluk mesajı
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 300,
      messages: [{ role:'user', content:`Satış koçu olarak ekip üyesine WhatsApp mesajı yaz. Türkçe, samimi, motive edici.

Üye: ${member.name} (${ROLES[member.role]?.label||member.role})
Son 5 analiz ortalama skoru: ${avgScore}/100
Profesyonellik: ${scores.professionalism||'?'}/100
Satış tekniği: ${scores.sales_technique||'?'}/100
Empati: ${scores.empathy||'?'}/100
Kapanış: ${scores.closing||'?'}/100

Kısa (max 200 kelime), WhatsApp formatında, emoji kullan. Güçlü yönleri say, 1-2 gelişim alanı öner. Sonunda motive edici kapanış.` }]
    });

    const message = resp.content[0]?.text?.trim() || '';
    if (member.wa_phone) {
      await sendWhatsAppToMember(req.userId, member.wa_phone, message);
    }
    res.json({ message, sent: !!member.wa_phone, avgScore });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── HAFTALIK RAPOR ────────────────────────────────────────────────────────────
router.post('/weekly-report', async (req: any, res: any) => {
  try {
    const weekAgo = new Date(Date.now() - 7*864e5).toISOString();
    const { data: members } = await supabase.from('team_members').select('*').eq('owner_id', req.userId).eq('active', true);

    const reports = await Promise.all((members||[]).map(async (m:any) => {
      const [msgs, won, coaching] = await Promise.allSettled([
        supabase.from('messages').select('id').eq('user_id', req.userId).eq('agent_id', m.id).gte('sent_at', weekAgo)
          .catch(() => ({ data: [] })),
        supabase.from('leads').select('id').eq('user_id', req.userId).eq('assigned_member_id', m.id).eq('status', 'won').gte('won_at', weekAgo),
        supabase.from('sales_coaching').select('analysis_score').eq('user_id', req.userId).eq('agent_name', m.name).gte('created_at', weekAgo),
      ]);
      return {
        name: m.name, role: ROLES[m.role]?.label||m.role,
        weeklyMessages: msgs.status==='fulfilled' ? msgs.value.data?.length||0 : 0,
        wonCount: won.status==='fulfilled' ? won.value.data?.length||0 : 0,
        avgScore: coaching.status==='fulfilled' && coaching.value.data?.length ? Math.round(coaching.value.data.reduce((s:number,c:any)=>s+(c.analysis_score||0),0)/coaching.value.data.length) : null,
      };
    }));

    const topPerformer = reports.sort((a,b)=>(b.wonCount-a.wonCount))[0];
    const totalWon = reports.reduce((s,r)=>s+r.wonCount,0);

    const reportText = `📊 *Haftalık Ekip Raporu*\n${new Date().toLocaleDateString('tr-TR')}\n\n${reports.map(r=>`👤 *${r.name}* (${r.role})\n   💬 Mesaj: ${r.weeklyMessages} | 🏆 Kapandı: ${r.wonCount} | ⭐ Skor: ${r.avgScore||'—'}`).join('\n\n')}\n\n📈 *Toplam: ${totalWon} deal kapandı*\n🥇 En iyi: ${topPerformer?.name||'—'}`;

    res.json({ report: reportText, reports, totalWon, topPerformer });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// ── LEAD ATAMA ────────────────────────────────────────────────────────────────
router.post('/assign-leads', async (req: any, res: any) => {
  try {
    const { memberId, leadIds } = req.body;
    if (!memberId || !leadIds?.length) return res.status(400).json({ error: 'memberId ve leadIds zorunlu' });
    const member = await getTeamMember(req.userId, memberId);
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı' });
    await supabase.from('leads').update({ assigned_to: member.name, assigned_member_id: memberId }).in('id', leadIds).eq('user_id', req.userId);
    // WA bildirimi
    if (member.wa_phone) {
      await sendWhatsAppToMember(req.userId, member.wa_phone, `📋 Merhaba ${member.name}! Sana ${leadIds.length} yeni lead atandı. Leadflow sistemine giriş yaparak kontrol edebilirsin.`);
    }
    res.json({ message: `${leadIds.length} lead ${member.name}'e atandı`, notified: !!member.wa_phone });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
