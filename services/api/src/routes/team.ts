export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── ROLLER ────────────────────────────────────────────────
const ROLES: Record<string, any> = {
  admin: { label: 'Yönetici', permissions: ['*'] },
  sales: { label: 'Satış Temsilcisi', permissions: ['leads', 'messages', 'campaigns', 'pipeline'] },
  manager: { label: 'Müdür', permissions: ['leads', 'messages', 'campaigns', 'pipeline', 'analytics', 'coaching'] },
  support: { label: 'Destek', permissions: ['leads', 'messages'] },
  readonly: { label: 'Sadece Görüntüle', permissions: ['leads', 'analytics'] },
};

// ── TEAM MIDDLEWARE ───────────────────────────────────────
async function getTeamMember(userId: string, memberId: string) {
  const { data } = await supabase.from('team_members')
    .select('*').eq('owner_id', userId).eq('id', memberId).single();
  return data;
}

// GET /api/team/members
router.get('/members', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('team_members')
      .select('id, name, email, role, active, last_login, created_at, leads_count')
      .eq('owner_id', req.userId)
      .order('created_at', { ascending: false });
    res.json({ members: data || [], roles: ROLES });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/team/members — Üye ekle
router.post('/members', async (req: any, res: any) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: 'name, email, role zorunlu' });
    if (!ROLES[role]) return res.status(400).json({ error: 'Geçersiz rol' });

    const { data: existing } = await supabase.from('team_members')
      .select('id').eq('owner_id', req.userId).eq('email', email).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Bu email zaten kayıtlı' });

    const hashedPassword = await bcrypt.hash(password || 'LeadFlow2024!', 10);

    const { data } = await supabase.from('team_members').insert([{
      owner_id: req.userId,
      name, email, role,
      password_hash: hashedPassword,
      active: true,
      leads_count: 0,
    }]).select().single();

    res.json({ member: { ...data, password_hash: undefined }, message: `${name} ekibe eklendi!` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/team/members/:id — Üye güncelle
router.patch('/members/:id', async (req: any, res: any) => {
  try {
    const { name, role, active } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (role && ROLES[role]) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    await supabase.from('team_members').update(updateData)
      .eq('id', req.params.id).eq('owner_id', req.userId);
    res.json({ message: 'Üye güncellendi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/team/members/:id — Üye sil
router.delete('/members/:id', async (req: any, res: any) => {
  try {
    await supabase.from('team_members').delete()
      .eq('id', req.params.id).eq('owner_id', req.userId);
    res.json({ message: 'Üye silindi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/team/login — Ekip üyesi giriş
router.post('/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email ve password zorunlu' });

    const { data: member } = await supabase.from('team_members')
      .select('*').eq('email', email).eq('active', true).single();
    if (!member) return res.status(401).json({ error: 'Geçersiz email veya şifre' });

    const valid = await bcrypt.compare(password, member.password_hash);
    if (!valid) return res.status(401).json({ error: 'Geçersiz email veya şifre' });

    // JWT token oluştur
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: member.owner_id, memberId: member.id, role: member.role, name: member.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Son giriş güncelle
    await supabase.from('team_members').update({ last_login: new Date().toISOString() }).eq('id', member.id);

    res.json({ token, member: { id: member.id, name: member.name, email: member.email, role: member.role, permissions: ROLES[member.role]?.permissions || [] } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/team/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members')
      .select('id, role, active').eq('owner_id', req.userId);

    const stats = {
      total: members?.length || 0,
      active: members?.filter((m: any) => m.active).length || 0,
      byRole: {} as Record<string, number>,
    };
    (members || []).forEach((m: any) => {
      stats.byRole[m.role] = (stats.byRole[m.role] || 0) + 1;
    });

    res.json(stats);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/team/activity — Ekip aktivitesi
router.get('/activity', async (req: any, res: any) => {
  try {
    const { data: members } = await supabase.from('team_members')
      .select('id, name, role').eq('owner_id', req.userId);

    const activity = await Promise.all((members || []).map(async (member: any) => {
      const { data: messages } = await supabase.from('messages')
        .select('id').eq('user_id', req.userId)
        .eq('agent_id', member.id)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data: coaching } = await supabase.from('sales_coaching')
        .select('analysis_score').eq('user_id', req.userId).eq('agent_name', member.name);

      const avgScore = coaching?.length
        ? Math.round(coaching.reduce((a: number, c: any) => a + (c.analysis_score || 0), 0) / coaching.length)
        : null;

      return {
        member,
        weeklyMessages: messages?.length || 0,
        avgCoachingScore: avgScore,
      };
    }));

    res.json({ activity });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/team/assign-leads — Lead ata
router.post('/assign-leads', async (req: any, res: any) => {
  try {
    const { memberId, leadIds } = req.body;
    if (!memberId || !leadIds?.length) return res.status(400).json({ error: 'memberId ve leadIds zorunlu' });

    const member = await getTeamMember(req.userId, memberId);
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı' });

    await supabase.from('leads').update({ assigned_to: member.name, assigned_member_id: memberId })
      .in('id', leadIds).eq('user_id', req.userId);

    await supabase.from('team_members').update({ leads_count: (member.leads_count || 0) + leadIds.length })
      .eq('id', memberId);

    res.json({ message: `${leadIds.length} lead ${member.name}'e atandı` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;