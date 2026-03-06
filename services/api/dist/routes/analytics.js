"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// GET /api/analytics/overview — Dashboard için
router.get('/overview', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        // Tüm leadler
        const { data: leads } = await supabase
            .from('leads').select('id, status, created_at, score, company_name, city, source')
            .eq('user_id', userId);
        // Bu hafta eklenen
        const newLeads = (leads || []).filter((l) => l.created_at >= weekAgo).length;
        // Cevap oranı
        const total = leads?.length || 0;
        const replied = (leads || []).filter((l) => ['replied', 'won'].includes(l.status)).length;
        const replyRate = total > 0 ? Math.round((replied / total) * 100) : 0;
        // Aktif kampanyalar
        const { count: activeCampaigns } = await supabase
            .from('campaigns').select('*', { count: 'exact', head: true })
            .eq('user_id', userId).eq('status', 'active');
        // Kullanıcı kredisi
        const { data: user } = await supabase
            .from('users').select('credits_total, credits_used')
            .eq('id', userId).single();
        // Son 5 lead — field adlarını frontend formatına çevir
        const recentLeads = (leads || [])
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 5)
            .map((l) => ({
            id: l.id,
            companyName: l.company_name,
            company_name: l.company_name,
            city: l.city,
            source: l.source,
            score: l.score,
            status: l.status,
            createdAt: l.created_at,
        }));
        // Kaynak dağılımı
        const sourceBreakdown = {};
        (leads || []).forEach((l) => {
            sourceBreakdown[l.source] = (sourceBreakdown[l.source] || 0) + 1;
        });
        // Status dağılımı
        const statusBreakdown = {};
        (leads || []).forEach((l) => {
            statusBreakdown[l.status] = (statusBreakdown[l.status] || 0) + 1;
        });
        res.json({
            totalLeads: total,
            newLeads,
            replyRate,
            activeCampaigns: activeCampaigns || 0,
            credits: (user?.credits_total || 50) - (user?.credits_used || 0),
            recentLeads,
            sourceBreakdown,
            statusBreakdown,
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
