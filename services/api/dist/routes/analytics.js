"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
router.get('/overview', async (req, res) => {
    try {
        const userId = req.userId;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [{ data: leads }, { data: user }, { data: campaigns }, { data: messages },] = await Promise.all([
            supabase.from('leads').select('status, source, created_at').eq('user_id', userId),
            supabase.from('users').select('credits_total, credits_used').eq('id', userId).single(),
            supabase.from('campaigns').select('name, channel, status, total_sent, total_replied').eq('user_id', userId),
            supabase.from('messages').select('channel, direction').eq('user_id', userId),
        ]);
        const allLeads = leads || [];
        const allCampaigns = campaigns || [];
        const allMessages = messages || [];
        // Lead stats
        const totalLeads = allLeads.length;
        const newLeads = allLeads.filter((l) => l.created_at >= weekAgo).length;
        // Source breakdown
        const sourceBreakdown = {};
        allLeads.forEach((l) => {
            const src = l.source || 'manual';
            sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
        });
        // Status breakdown
        const statusBreakdown = {};
        allLeads.forEach((l) => {
            statusBreakdown[l.status] = (statusBreakdown[l.status] || 0) + 1;
        });
        // Campaign stats
        const activeCampaigns = allCampaigns.filter((c) => c.status === 'active').length;
        const totalSent = allCampaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
        const totalReplied = allCampaigns.reduce((s, c) => s + (c.total_replied || 0), 0);
        const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;
        // Top kampanyalar
        const topCampaigns = allCampaigns
            .filter((c) => (c.total_sent || 0) > 0)
            .sort((a, b) => (b.total_sent || 0) - (a.total_sent || 0))
            .slice(0, 5);
        // Kanal stats
        const channelStats = {
            whatsapp: allMessages.filter((m) => m.channel === 'whatsapp' && m.direction === 'out').length,
            email: allMessages.filter((m) => m.channel === 'email' && m.direction === 'out').length,
        };
        // Kredi
        const credits = (user?.credits_total || 0) - (user?.credits_used || 0);
        res.json({
            totalLeads,
            newLeads,
            replyRate,
            activeCampaigns,
            credits,
            totalSent,
            totalReplied,
            sourceBreakdown,
            statusBreakdown,
            channelStats,
            topCampaigns,
        });
    }
    catch (error) {
        console.error('Analytics error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
