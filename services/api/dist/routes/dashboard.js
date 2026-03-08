"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        // Toplam lead sayısı
        const { count: totalLeads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        // Bu hafta eklenen lead
        const { count: weekLeads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', weekAgo);
        // Aktif kampanya sayısı
        const { count: activeCampaigns } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'active');
        // Toplam kampanya
        const { count: totalCampaigns } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        // Gönderilen mesaj sayısı
        const { data: campaigns } = await supabase
            .from('campaigns')
            .select('total_sent, total_replied')
            .eq('user_id', userId);
        const totalSent = campaigns?.reduce((sum, c) => sum + (c.total_sent || 0), 0) || 0;
        const totalReplied = campaigns?.reduce((sum, c) => sum + (c.total_replied || 0), 0) || 0;
        const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;
        // Kullanıcı kredisi
        const { data: userCredits } = await supabase
            .from('users')
            .select('credits_total, credits_used, plan_type')
            .eq('id', userId)
            .single();
        // Son leadler
        const { data: recentLeads } = await supabase
            .from('leads')
            .select('id, company_name, contact_name, city, source, score, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);
        // Son kampanyalar
        const { data: recentCampaigns } = await supabase
            .from('campaigns')
            .select('id, name, channel, status, total_sent, total_replied, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(3);
        // Son 7 günün mesaj istatistikleri (grafik için)
        const dailyStats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
            const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();
            const { count: daySent } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('direction', 'out')
                .gte('sent_at', dayStart)
                .lte('sent_at', dayEnd);
            dailyStats.push({
                date: new Date(dayStart).toLocaleDateString('tr-TR', { weekday: 'short' }),
                sent: daySent || 0,
            });
        }
        res.json({
            stats: {
                totalLeads: totalLeads || 0,
                weekLeads: weekLeads || 0,
                activeCampaigns: activeCampaigns || 0,
                totalCampaigns: totalCampaigns || 0,
                totalSent,
                totalReplied,
                replyRate,
                credits: (userCredits?.credits_total || 0) - (userCredits?.credits_used || 0),
                planType: userCredits?.plan_type || 'starter',
            },
            recentLeads: recentLeads || [],
            recentCampaigns: recentCampaigns || [],
            dailyStats,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = { router };
