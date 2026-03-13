"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// ── STACK TRACE PARSER ────────────────────────────────────
function parseStackTrace(stack) {
    if (!stack)
        return [];
    const lines = stack.split('\n').slice(1); // İlk satır mesaj
    return lines
        .filter(line => line.trim().startsWith('at '))
        .map(line => {
        const trimmed = line.trim().replace('at ', '');
        // "functionName (file:line:col)" formatı
        const match1 = trimmed.match(/^(.+?)\s+\((.+):(\d+):(\d+)\)$/);
        if (match1) {
            return {
                function: match1[1],
                file: match1[2].replace(process.cwd(), '').replace('/app/', ''),
                line: parseInt(match1[3]),
                col: parseInt(match1[4]),
                internal: match1[2].includes('node_modules') || match1[2].includes('node:'),
            };
        }
        // "file:line:col" formatı (anonim)
        const match2 = trimmed.match(/^(.+):(\d+):(\d+)$/);
        if (match2) {
            return {
                function: '<anonymous>',
                file: match2[1].replace(process.cwd(), '').replace('/app/', ''),
                line: parseInt(match2[2]),
                col: parseInt(match2[3]),
                internal: match2[1].includes('node_modules') || match2[1].includes('node:'),
            };
        }
        return { function: trimmed, file: '', line: 0, col: 0, internal: true };
    })
        .filter(f => f.file || f.function);
}
// ── ERROR LOGGER ──────────────────────────────────────────
async function logError(message, error, context = {}, level = 'error') {
    try {
        const stackTrace = error?.stack ? parseStackTrace(error.stack) : [];
        await supabase.from('error_logs').insert([{
                level,
                message,
                stack_trace: stackTrace,
                context: {
                    ...context,
                    nodeVersion: process.version,
                    platform: process.platform,
                    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                },
                endpoint: context.endpoint || null,
                user_id: context.userId || null,
                resolved: false,
            }]);
        // Kritik hata — WhatsApp alert gönder
        if (level === 'error') {
            await sendAlert(`🚨 LeadFlow AI Hata!\n\n${message}\n\nEndpoint: ${context.endpoint || 'unknown'}\nZaman: ${new Date().toLocaleString('tr-TR')}`);
        }
    }
    catch (e) {
        console.error('Error logging failed:', e);
    }
}
// ── PERFORMANCE LOGGER ────────────────────────────────────
async function logPerformance(endpoint, method, statusCode, responseTimeMs) {
    try {
        const memoryMb = process.memoryUsage().heapUsed / 1024 / 1024;
        await supabase.from('performance_logs').insert([{
                endpoint,
                method,
                status_code: statusCode,
                response_time_ms: responseTimeMs,
                memory_mb: Math.round(memoryMb * 10) / 10,
            }]);
    }
    catch (e) {
        // Sessizce geç
    }
}
// ── WHATSAPP ALERT ────────────────────────────────────────
async function sendAlert(message) {
    try {
        const alertPhone = process.env.ALERT_PHONE; // Railway'e eklenecek
        if (!alertPhone)
            return;
        const { waState } = require('./settings');
        // Herhangi bir bağlı kullanıcı var mı?
        const connectedUser = Object.entries(waState).find(([, state]) => state.status === 'connected');
        if (connectedUser) {
            const [, state] = connectedUser;
            const phone = alertPhone.replace(/\D/g, '');
            const formatted = phone.startsWith('90') ? phone : `90${phone}`;
            await state.sock.sendMessage(`${formatted}@s.whatsapp.net`, { text: message });
        }
    }
    catch { }
}
// ── UPTIME CHECKER ────────────────────────────────────────
async function checkUptime() {
    const start = Date.now();
    let status = 'up';
    try {
        // Supabase bağlantı kontrolü
        await supabase.from('users').select('id').limit(1);
    }
    catch {
        status = 'down';
    }
    const responseTime = Date.now() - start;
    await supabase.from('uptime_logs').insert([{
            status,
            response_time_ms: responseTime,
            checked_at: new Date().toISOString(),
        }]);
    if (status === 'down') {
        await sendAlert('🔴 LeadFlow AI SERVİS ÇÖKTÜ! Supabase bağlantısı kesildi.');
    }
}
// Her 5 dakikada uptime check
setInterval(checkUptime, 5 * 60 * 1000);
// ── MIDDLEWARE: Performance tracking ─────────────────────
function performanceMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - start;
        const endpoint = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
        // Sadece yavaş istekleri veya hataları logla (>500ms veya 5xx)
        if (responseTime > 500 || res.statusCode >= 500) {
            logPerformance(endpoint, req.method, res.statusCode, responseTime);
        }
    });
    next();
}
// ── ROUTES ────────────────────────────────────────────────
// Sistem durumu
router.get('/status', async (req, res) => {
    try {
        const memUsage = process.memoryUsage();
        const uptime = process.uptime();
        // Son 24 saat uptime
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: uptimeLogs } = await supabase
            .from('uptime_logs')
            .select('status, response_time_ms, checked_at')
            .gte('checked_at', yesterday)
            .order('checked_at', { ascending: false });
        const totalChecks = uptimeLogs?.length || 0;
        const upChecks = uptimeLogs?.filter((l) => l.status === 'up').length || 0;
        const uptimePercent = totalChecks > 0 ? Math.round((upChecks / totalChecks) * 100 * 10) / 10 : 100;
        const avgResponseTime = totalChecks > 0
            ? Math.round(uptimeLogs.reduce((s, l) => s + l.response_time_ms, 0) / totalChecks)
            : 0;
        // Son 1 saatteki hatalar
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: errorCount } = await supabase
            .from('error_logs')
            .select('id', { count: 'exact', head: true })
            .eq('level', 'error')
            .gte('created_at', oneHourAgo);
        res.json({
            status: 'operational',
            uptime: {
                seconds: Math.round(uptime),
                formatted: `${Math.floor(uptime / 3600)}s ${Math.floor((uptime % 3600) / 60)}dk`,
                percent24h: uptimePercent,
                avgResponseMs: avgResponseTime,
            },
            memory: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024),
                percent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
            },
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                cpuCount: os.cpus().length,
                loadAvg: os.loadavg()[0].toFixed(2),
            },
            errors: {
                lastHour: errorCount || 0,
            },
            recentUptime: (uptimeLogs || []).slice(0, 10),
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Hata logları
router.get('/errors', async (req, res) => {
    try {
        const { limit = 50, level, resolved } = req.query;
        let query = supabase
            .from('error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(Number(limit));
        if (level)
            query = query.eq('level', level);
        if (resolved !== undefined)
            query = query.eq('resolved', resolved === 'true');
        const { data, error } = await query;
        if (error)
            throw error;
        res.json({ errors: data || [] });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Hatayı çözüldü işaretle
router.patch('/errors/:id/resolve', async (req, res) => {
    try {
        await supabase
            .from('error_logs')
            .update({ resolved: true })
            .eq('id', req.params.id);
        res.json({ message: 'Hata çözüldü olarak işaretlendi' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Performance istatistikleri
router.get('/performance', async (req, res) => {
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from('performance_logs')
            .select('endpoint, method, status_code, response_time_ms, memory_mb, created_at')
            .gte('created_at', yesterday)
            .order('response_time_ms', { ascending: false })
            .limit(100);
        const logs = data || [];
        // Endpoint bazlı özet
        const endpointStats = {};
        logs.forEach((log) => {
            const key = `${log.method} ${log.endpoint}`;
            if (!endpointStats[key]) {
                endpointStats[key] = { count: 0, totalTime: 0, maxTime: 0, errors: 0 };
            }
            endpointStats[key].count++;
            endpointStats[key].totalTime += log.response_time_ms;
            endpointStats[key].maxTime = Math.max(endpointStats[key].maxTime, log.response_time_ms);
            if (log.status_code >= 500)
                endpointStats[key].errors++;
        });
        const summary = Object.entries(endpointStats).map(([endpoint, stats]) => ({
            endpoint,
            avgMs: Math.round(stats.totalTime / stats.count),
            maxMs: stats.maxTime,
            count: stats.count,
            errors: stats.errors,
        })).sort((a, b) => b.avgMs - a.avgMs);
        res.json({ summary, logs: logs.slice(0, 20) });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Manuel uptime check tetikle
router.post('/check', async (req, res) => {
    await checkUptime();
    res.json({ message: 'Uptime check yapıldı' });
});
module.exports = { router, logError, logPerformance, performanceMiddleware, checkUptime };
