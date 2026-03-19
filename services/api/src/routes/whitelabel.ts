export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── ROUTES ────────────────────────────────────────────────

// GET /api/whitelabel/brands — Tüm bayiler
router.get('/brands', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('whitelabel_brands')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ brands: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/whitelabel/brands — Yeni bayi oluştur
router.post('/brands', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, domain, logo_url, primary_color, secondary_color, plan_type = 'basic', revenue_share = 20 } = req.body;
    if (!name) return res.status(400).json({ error: 'name zorunlu' });

    // Bayi için admin hesabı oluştur
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const email = `admin@${domain || name.toLowerCase().replace(/\s/g, '')}.leadflow.ai`;

    const { data: brand, error } = await supabase
      .from('whitelabel_brands')
      .insert([{
        owner_id: userId,
        name,
        domain: domain || null,
        logo_url: logo_url || null,
        primary_color: primary_color || '#3b82f6',
        secondary_color: secondary_color || '#1e293b',
        plan_type,
        revenue_share,
        status: 'active',
        admin_email: email,
        api_key: `wl_${crypto.randomBytes(24).toString('hex')}`,
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      brand,
      adminEmail: email,
      tempPassword,
      message: 'Bayi oluşturuldu!',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/whitelabel/brands/:id — Bayi güncelle
router.patch('/brands/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, logo_url, primary_color, secondary_color, plan_type, revenue_share, status } = req.body;

    await supabase.from('whitelabel_brands')
      .update({ name, logo_url, primary_color, secondary_color, plan_type, revenue_share, status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('owner_id', userId);

    res.json({ message: 'Bayi güncellendi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/whitelabel/brands/:id/stats — Bayi istatistikleri
router.get('/brands/:id/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: brand } = await supabase
      .from('whitelabel_brands').select('*').eq('id', req.params.id).eq('owner_id', userId).single();
    if (!brand) return res.status(404).json({ error: 'Bayi bulunamadı' });

    // Bayiye ait kullanıcı ve işlem istatistikleri
    const { data: users } = await supabase.from('users').select('id, created_at').eq('brand_id', req.params.id);
    const userIds = (users || []).map((u: any) => u.id);

    let leadCount = 0, messageCount = 0, videoCount = 0;
    if (userIds.length) {
      const [l, m, v] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).in('user_id', userIds),
        supabase.from('messages').select('id', { count: 'exact', head: true }).in('user_id', userIds),
        supabase.from('video_outreach').select('id', { count: 'exact', head: true }).in('user_id', userIds),
      ]);
      leadCount = l.count || 0;
      messageCount = m.count || 0;
      videoCount = v.count || 0;
    }

    res.json({
      brand,
      stats: {
        totalUsers: users?.length || 0,
        totalLeads: leadCount,
        totalMessages: messageCount,
        totalVideos: videoCount,
        monthlyRevenue: (users?.length || 0) * 29 * (brand.revenue_share / 100),
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/whitelabel/config — Mevcut brand config (domain'e göre)
router.get('/config', async (req: any, res: any) => {
  try {
    const domain = req.query.domain || req.headers.host;
    const { data: brand } = await supabase
      .from('whitelabel_brands')
      .select('name, logo_url, primary_color, secondary_color, domain')
      .eq('domain', domain)
      .eq('status', 'active')
      .single();

    if (!brand) {
      return res.json({
        name: 'LeadFlow AI',
        primary_color: '#3b82f6',
        secondary_color: '#1e293b',
        logo_url: null,
        isWhitelabel: false,
      });
    }

    res.json({ ...brand, isWhitelabel: true });
  } catch (e: any) {
    res.json({ name: 'LeadFlow AI', primary_color: '#3b82f6', secondary_color: '#1e293b', isWhitelabel: false });
  }
});

// GET /api/whitelabel/summary — Tüm bayi özeti
router.get('/summary', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: brands } = await supabase
      .from('whitelabel_brands').select('*').eq('owner_id', userId);

    const active = (brands || []).filter((b: any) => b.status === 'active').length;
    const totalRevShare = (brands || []).reduce((sum: number, b: any) => {
      return sum + ((b.user_count || 0) * 29 * (b.revenue_share / 100));
    }, 0);

    res.json({
      totalBrands: brands?.length || 0,
      activeBrands: active,
      estimatedMonthlyRevenue: totalRevShare,
      brands: brands || [],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;