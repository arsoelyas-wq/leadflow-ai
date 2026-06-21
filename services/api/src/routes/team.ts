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

// ── AKILLI LEAD DAGITIMI (AI-Powered) ────────────────────────────────────────
router.post('/auto-assign', async (req: any, res: any) => {
  try {
    const { leadIds, rule = 'smart', roleFilter, maxPerMember = 25 } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'leadIds zorunlu' });

    let query = supabase.from('team_members').select('id, name, role, leads_count, status, wa_phone, target_leads_monthly, badges').eq('owner_id', req.userId).eq('active', true);
    if (roleFilter) query = query.in('role', roleFilter);
    const { data: members } = await query;
    if (!members?.length) return res.status(400).json({ error: 'Aktif uye bulunamadi' });

    const memberLoads = await Promise.all(members.map(async (m: any) => {
      const [activeRes, wonRes, coachRes] = await Promise.allSettled([
        supabase.from('leads').select('id, sector, city, source').eq('user_id', req.userId).eq('assigned_member_id', m.id).not('status', 'in', '(won,lost,dismissed)'),
        supabase.from('leads').select('sector').eq('user_id', req.userId).eq('assigned_member_id', m.id).eq('status', 'won'),
        supabase.from('sales_coaching').select('analysis_score').eq('user_id', req.userId).eq('agent_name', m.name).order('created_at', { ascending: false }).limit(5),
      ]);
      const activeLeads = activeRes.status === 'fulfilled' ? activeRes.value.data || [] : [];
      const wonLeads = wonRes.status === 'fulfilled' ? wonRes.value.data || [] : [];
      const coaching = coachRes.status === 'fulfilled' ? coachRes.value.data || [] : [];
      const avgScore = coaching.length ? Math.round(coaching.reduce((s: number, c: any) => s + (c.analysis_score || 0), 0) / coaching.length) : 50;
      const wonSectors: Record<string, number> = {};
      wonLeads.forEach((l: any) => { if (l.sector) wonSectors[l.sector] = (wonSectors[l.sector] || 0) + 1; });

      return { ...m, currentLoad: activeLeads.length, avgScore, wonSectors, isOnline: m.status === 'online' };
    }));

    const leadsToAssign = await Promise.all(leadIds.map(async (id: string) => {
      const { data } = await supabase.from('leads').select('id, sector, city, source, score').eq('id', id).eq('user_id', req.userId).maybeSingle();
      return data;
    }));

    let assigned = 0;
    const assignments: Array<{ leadId: string; memberId: string; memberName: string; reason: string }> = [];

    for (const lead of leadsToAssign) {
      if (!lead) continue;

      let target: any = null;
      let reason = '';

      if (rule === 'smart') {
        const eligible = memberLoads.filter(m => m.currentLoad < maxPerMember);
        if (!eligible.length) { reason = 'Tum uyeler dolu'; continue; }

        let bestScore = -1;
        for (const m of eligible) {
          let fitScore = 0;
          // Sektor uyumu (0-40)
          if (lead.sector && m.wonSectors[lead.sector]) {
            fitScore += Math.min(40, m.wonSectors[lead.sector] * 10);
          }
          // Koçluk skoru (0-20)
          fitScore += Math.round((m.avgScore / 100) * 20);
          // Yuk dengesi (0-20) — az yuklu = yuksek puan
          fitScore += Math.max(0, 20 - m.currentLoad);
          // Online bonus (0-10)
          if (m.isOnline) fitScore += 10;
          // Hedef altindaysa bonus (0-10)
          const monthlyRate = m.currentLoad / Math.max(1, m.target_leads_monthly || 30);
          if (monthlyRate < 0.7) fitScore += 10;

          if (fitScore > bestScore) { bestScore = fitScore; target = m; reason = `Uyum: ${fitScore}/100`; }
        }
      } else if (rule === 'round_robin') {
        memberLoads.sort((a, b) => a.currentLoad - b.currentLoad);
        target = memberLoads.filter(m => m.currentLoad < maxPerMember)[0];
        reason = 'Round-robin';
      } else if (rule === 'random') {
        const eligible = memberLoads.filter(m => m.currentLoad < maxPerMember);
        target = eligible[Math.floor(Math.random() * eligible.length)];
        reason = 'Rastgele';
      }

      if (!target) continue;
      await supabase.from('leads').update({ assigned_to: target.name, assigned_member_id: target.id }).eq('id', lead.id).eq('user_id', req.userId);
      target.currentLoad++;
      assigned++;
      assignments.push({ leadId: lead.id, memberId: target.id, memberName: target.name, reason });
    }

    // WA bildirim — her uyeye kac lead atandigini bildir
    const byMember: Record<string, number> = {};
    assignments.forEach(a => { byMember[a.memberName] = (byMember[a.memberName] || 0) + 1; });
    for (const [name, count] of Object.entries(byMember)) {
      const m = memberLoads.find(ml => ml.name === name);
      if (m?.wa_phone) {
        sendWhatsAppToMember(req.userId, m.wa_phone, `📋 ${name}, sana ${count} yeni lead atandi! Sovlo.io'dan kontrol et.`).catch(() => {});
      }
    }

    res.json({ message: `${assigned} lead akilli dagitildi (${rule})`, assigned, assignments, rule });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
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

// ── KONUSMA DNA — Uye Satis Profili ──────────────────────────────────────────
router.get('/member-dna/:memberId', async (req: any, res: any) => {
  try {
    const member = await getTeamMember(req.userId, req.params.memberId);
    if (!member) return res.status(404).json({ error: 'Uye bulunamadi' });

    const { data: coaching } = await supabase.from('sales_coaching')
      .select('analysis_score, tone_score, persuasion_score, empathy_score, outcome, created_at')
      .eq('user_id', req.userId).eq('agent_name', member.name)
      .order('created_at', { ascending: false }).limit(30);

    const { data: tiAnalyses } = await supabase.from('member_analyses')
      .select('overall_score, professionalism_score, sales_technique_score, empathy_score, closing_score, communication_score, outcome, strengths, weaknesses, customer_needs, created_at')
      .eq('user_id', req.userId).eq('member_name', member.name)
      .order('created_at', { ascending: false }).limit(30);

    const analyses = tiAnalyses || [];
    const legacy = coaching || [];
    const totalAnalyses = analyses.length + legacy.length;

    if (totalAnalyses === 0) return res.json({ member: member.name, dna: null, message: 'Analiz verisi yok' });

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const professionalism = avg(analyses.map((a: any) => a.professionalism_score).filter(Boolean));
    const salesTechnique = avg(analyses.map((a: any) => a.sales_technique_score).filter(Boolean));
    const empathy = avg([...analyses.map((a: any) => a.empathy_score), ...legacy.map((c: any) => c.empathy_score)].filter(Boolean));
    const closing = avg(analyses.map((a: any) => a.closing_score).filter(Boolean));
    const communication = avg(analyses.map((a: any) => a.communication_score).filter(Boolean));
    const overall = avg([...analyses.map((a: any) => a.overall_score), ...legacy.map((c: any) => c.analysis_score)].filter(Boolean));

    const wonCount = [...analyses, ...legacy].filter((a: any) => a.outcome === 'sale' || a.outcome === 'positive').length;
    const lostCount = [...analyses, ...legacy].filter((a: any) => a.outcome === 'no_sale' || a.outcome === 'negative').length;
    const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

    const allStrengths: Record<string, number> = {};
    const allWeaknesses: Record<string, number> = {};
    analyses.forEach((a: any) => {
      (a.strengths || []).forEach((s: string) => { allStrengths[s] = (allStrengths[s] || 0) + 1; });
      (a.weaknesses || []).forEach((w: string) => { allWeaknesses[w] = (allWeaknesses[w] || 0) + 1; });
    });

    const topStrengths = Object.entries(allStrengths).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => ({ text: s, count: c }));
    const topWeaknesses = Object.entries(allWeaknesses).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, c]) => ({ text: w, count: c }));

    // Trend (son 7 vs onceki 7)
    const recent7 = [...analyses, ...legacy].slice(0, 7);
    const prev7 = [...analyses, ...legacy].slice(7, 14);
    const recentAvg = avg(recent7.map((a: any) => a.overall_score || a.analysis_score || 0));
    const prevAvg = avg(prev7.map((a: any) => a.overall_score || a.analysis_score || 0));
    const trend = prevAvg > 0 ? recentAvg - prevAvg : 0;

    res.json({
      member: member.name, role: ROLES[member.role]?.label || member.role,
      dna: {
        overall, professionalism, salesTechnique, empathy, closing, communication,
        winRate, totalAnalyses, wonCount, lostCount,
        topStrengths, topWeaknesses,
        trend, trendLabel: trend > 5 ? 'yukseliyor' : trend < -5 ? 'dususte' : 'sabit',
        bestAt: [{ metric: 'Profesyonellik', score: professionalism }, { metric: 'Satis Teknigi', score: salesTechnique }, { metric: 'Empati', score: empathy }, { metric: 'Kapanis', score: closing }, { metric: 'Iletisim', score: communication }]
          .sort((a, b) => b.score - a.score).slice(0, 2).map(m => m.metric),
        worstAt: [{ metric: 'Profesyonellik', score: professionalism }, { metric: 'Satis Teknigi', score: salesTechnique }, { metric: 'Empati', score: empathy }, { metric: 'Kapanis', score: closing }, { metric: 'Iletisim', score: communication }]
          .sort((a, b) => a.score - b.score).slice(0, 2).map(m => m.metric),
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── OTOMATIK KOCLUK MOTORU ───────────────────────────────────────────────────
router.post('/auto-coaching', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members')
      .select('id, name, role, wa_phone, badges')
      .eq('owner_id', req.userId).eq('active', true);
    if (!members?.length) return res.json({ message: 'Aktif uye yok', sent: 0 });

    let sent = 0;
    const results: Array<{ name: string; score: number; sent: boolean; reason: string }> = [];

    for (const member of members) {
      const { data: coaching } = await supabase.from('sales_coaching')
        .select('analysis_score')
        .eq('user_id', req.userId).eq('agent_name', member.name)
        .order('created_at', { ascending: false }).limit(5);

      if (!coaching?.length) {
        results.push({ name: member.name, score: 0, sent: false, reason: 'Analiz verisi yok' });
        continue;
      }

      const avgScore = Math.round(coaching.reduce((s: number, c: any) => s + (c.analysis_score || 0), 0) / coaching.length);

      if (avgScore >= 80) {
        results.push({ name: member.name, score: avgScore, sent: false, reason: 'Skor yeterli (80+)' });
        continue;
      }

      try {
        const resp = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001', max_tokens: 250,
          messages: [{ role: 'user', content: `Satis kocu olarak ${member.name}'e kisa WhatsApp mesaji yaz.
Skor: ${avgScore}/100. ${avgScore < 50 ? 'Acil iyilestirme gerekiyor.' : 'Gelisim potansiyeli var.'}
Rol: ${ROLES[member.role]?.label || member.role}
Max 150 kelime, WhatsApp formati, emoji, motive edici. Turkce yaz.` }]
        });
        const message = resp.content[0]?.text?.trim() || '';
        if (member.wa_phone && message) {
          await sendWhatsAppToMember(req.userId, member.wa_phone, message);
          sent++;
          results.push({ name: member.name, score: avgScore, sent: true, reason: 'Kocluk gonderildi' });
        } else {
          results.push({ name: member.name, score: avgScore, sent: false, reason: 'WA numarasi yok' });
        }
      } catch {
        results.push({ name: member.name, score: avgScore, sent: false, reason: 'AI hatasi' });
      }
    }

    res.json({ message: `${sent} uyeye otomatik kocluk gonderildi`, sent, total: members.length, results });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GUNLUK STANDUP MESAJI ────────────────────────────────────────────────────
router.post('/daily-standup', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members')
      .select('id, name, role, wa_phone, target_leads_monthly, target_conversion_rate')
      .eq('owner_id', req.userId).eq('active', true);
    if (!members?.length) return res.json({ message: 'Aktif uye yok', sent: 0 });

    const yesterday = new Date(Date.now() - 864e5).toISOString();
    let sent = 0;
    const standups: any[] = [];

    for (const m of members) {
      const [msgsRes, wonRes, activeRes, coachRes] = await Promise.allSettled([
        supabase.from('messages').select('id').eq('user_id', req.userId).eq('agent_id', m.id).gte('sent_at', yesterday),
        supabase.from('leads').select('id').eq('user_id', req.userId).eq('assigned_member_id', m.id).eq('status', 'won').gte('won_at', yesterday),
        supabase.from('leads').select('id').eq('user_id', req.userId).eq('assigned_member_id', m.id).not('status', 'in', '(won,lost,dismissed)'),
        supabase.from('sales_coaching').select('analysis_score').eq('user_id', req.userId).eq('agent_name', m.name).order('created_at', { ascending: false }).limit(1),
      ]);

      const yesterdayMsgs = msgsRes.status === 'fulfilled' ? msgsRes.value.data?.length || 0 : 0;
      const yesterdayWon = wonRes.status === 'fulfilled' ? wonRes.value.data?.length || 0 : 0;
      const activeLeads = activeRes.status === 'fulfilled' ? activeRes.value.data?.length || 0 : 0;
      const lastScore = coachRes.status === 'fulfilled' ? coachRes.value.data?.[0]?.analysis_score || null : null;

      const dailyTarget = Math.ceil((m.target_leads_monthly || 30) / 22);
      const msg = `☀️ Gunaydin ${m.name}!\n\n📊 *Dunku Ozet:*\n💬 ${yesterdayMsgs} mesaj | 🏆 ${yesterdayWon} kapanis${lastScore ? ` | ⭐ Skor: ${lastScore}` : ''}\n\n🎯 *Bugunun Hedefi:*\n📋 ${activeLeads} aktif lead bekliyor\n🔥 Gunluk hedef: ${dailyTarget} lead isle\n\n💪 Harika bir gun olsun!`;

      if (m.wa_phone) {
        await sendWhatsAppToMember(req.userId, m.wa_phone, msg);
        sent++;
      }
      standups.push({ name: m.name, yesterdayMsgs, yesterdayWon, activeLeads, lastScore, sent: !!m.wa_phone });
    }

    // Yoneticiye ozet
    const { data: owner } = await supabase.from('user_settings').select('phone').eq('user_id', req.userId).single();
    if (owner?.phone) {
      const totalActive = standups.reduce((s, st) => s + st.activeLeads, 0);
      const totalWon = standups.reduce((s, st) => s + st.yesterdayWon, 0);
      const managerMsg = `📊 *Ekip Gunluk Ozet*\n\n👥 ${members.length} uye aktif\n📋 ${totalActive} bekleyen lead\n🏆 Dun ${totalWon} kapanis\n\n${standups.map(s => `${s.name}: ${s.yesterdayMsgs}msg, ${s.yesterdayWon}won${s.lastScore ? ', ⭐'+s.lastScore : ''}`).join('\n')}`;
      await sendWhatsAppToMember(req.userId, owner.phone, managerMsg).catch(() => {});
    }

    res.json({ message: `${sent} uyeye standup gonderildi`, sent, standups });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── KOCLUK ETKINLIGI OLCUMU ──────────────────────────────────────────────────
router.get('/coaching-effectiveness', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members')
      .select('id, name').eq('owner_id', req.userId).eq('active', true);
    if (!members?.length) return res.json({ members: [] });

    const results = await Promise.all(members.map(async (m: any) => {
      const { data: analyses } = await supabase.from('sales_coaching')
        .select('analysis_score, created_at')
        .eq('user_id', req.userId).eq('agent_name', m.name)
        .order('created_at', { ascending: true });
      if (!analyses?.length || analyses.length < 4) return { name: m.name, data: null };

      const mid = Math.floor(analyses.length / 2);
      const firstHalf = analyses.slice(0, mid);
      const secondHalf = analyses.slice(mid);
      const avgFirst = Math.round(firstHalf.reduce((s: number, a: any) => s + (a.analysis_score || 0), 0) / firstHalf.length);
      const avgSecond = Math.round(secondHalf.reduce((s: number, a: any) => s + (a.analysis_score || 0), 0) / secondHalf.length);
      const improvement = avgSecond - avgFirst;

      return {
        name: m.name,
        data: {
          totalAnalyses: analyses.length,
          firstPeriodAvg: avgFirst,
          secondPeriodAvg: avgSecond,
          improvement,
          improving: improvement > 3,
          declining: improvement < -3,
        },
      };
    }));

    res.json({ members: results.filter(r => r.data) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
