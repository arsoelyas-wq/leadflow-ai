"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');
const { fireCapiEvent } = require('../services/meta-capi');
const { fireGoogleConversion } = require('../services/google-enhanced-conversions');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// GET /api/leads — Liste (filtre + sayfalama)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, source, city, search, sector, grade, ids, list, page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc' } = req.query;
        const offset = (page - 1) * limit;
        const ALLOWED_SORT = ['created_at', 'score', 'company_name', 'status', 'city', 'sector', 'updated_at'];
        const col = ALLOWED_SORT.includes(String(sortBy)) ? String(sortBy) : 'created_at';
        const asc = sortDir === 'asc';
        let query = supabase
            .from('leads')
            .select('*', { count: 'exact' })
            .eq('user_id', req.userId)
            .order(col, { ascending: asc })
            .range(offset, offset + limit - 1);
        if (status)
            query = query.eq('status', status);
        if (source)
            query = query.eq('source', source);
        if (city)
            query = query.ilike('city', `%${city}%`);
        if (sector)
            query = query.ilike('sector', `%${sector}%`);
        if (grade)
            query = query.eq('ai_grade', grade);
        if (search)
            query = query.ilike('company_name', `%${search}%`);
        if (ids) {
            const idList = String(ids).split(',').filter(Boolean);
            if (idList.length > 0)
                query = query.in('id', idList);
        }
        if (list)
            query = query.ilike('notes', `[📁 ${list}]%`);
        const { data, error, count } = await query;
        if (error)
            throw error;
        res.json({ leads: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/leads/with-phone — All leads that have a phone number (no limit, for voice outreach)
router.get('/with-phone', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('id, company_name, phone, country')
            .eq('user_id', req.userId)
            .not('phone', 'is', null)
            .neq('phone', '')
            .not('phone', 'ilike', '%@%')
            .order('company_name', { ascending: true })
            .limit(20000);
        if (error)
            throw error;
        res.json({ leads: data || [], total: (data || []).length });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/leads/sectors — Distinct sector list for filter dropdown
router.get('/sectors', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('sector')
            .eq('user_id', req.userId)
            .not('sector', 'is', null);
        if (error)
            throw error;
        const sectors = [...new Set((data || []).map((r) => r.sector).filter(Boolean))].sort();
        res.json({ sectors });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/leads/export — Excel/CSV download
router.get('/export', authMiddleware, async (req, res) => {
    try {
        const { status, sector, search, grade, ids, list } = req.query;
        let query = supabase
            .from('leads')
            .select('company_name,contact_name,phone,email,website,instagram,facebook,linkedin_url,youtube,twitter,city,sector,source,score,status,notes,created_at,rating,review_count,address,maps_url')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false })
            .limit(5000);
        if (ids) {
            const idList = String(ids).split(',').filter(Boolean);
            if (idList.length > 0)
                query = query.in('id', idList);
        }
        else {
            if (status)
                query = query.eq('status', status);
            if (sector)
                query = query.ilike('sector', `%${sector}%`);
            if (grade)
                query = query.eq('ai_grade', grade);
            if (search)
                query = query.ilike('company_name', `%${search}%`);
            if (list)
                query = query.ilike('notes', `[📁 ${list}]%`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        const xlsx = require('xlsx');
        const colMap = {
            company_name: 'Firma Adı', contact_name: 'Karar Verici', phone: 'Telefon',
            email: 'E-posta', website: 'Web Sitesi', address: 'Adres',
            instagram: 'Instagram', facebook: 'Facebook',
            linkedin_url: 'LinkedIn', youtube: 'YouTube', twitter: 'Twitter',
            city: 'Şehir', sector: 'Sektör', source: 'Kaynak', score: 'Puan',
            rating: 'Google Rating', review_count: 'Yorum Sayısı',
            status: 'Durum', maps_url: 'Google Maps', notes: 'Notlar', created_at: 'Tarih',
        };
        const statusTR = {
            new: 'Yeni', contacted: 'İletişime Geçildi', qualified: 'Nitelikli',
            replied: 'Cevap Verdi', offered: 'Teklif Verildi', won: 'Kazanıldı', lost: 'Kaybedildi',
        };
        const rows = (data || []).map((l) => {
            const row = {};
            for (const [k, label] of Object.entries(colMap)) {
                let val = l[k];
                if (k === 'status')
                    val = statusTR[val] || val;
                if (k === 'created_at')
                    val = val ? new Date(val).toLocaleDateString('tr-TR') : '';
                row[label] = val ?? '';
            }
            return row;
        });
        const ws = xlsx.utils.json_to_sheet(rows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Leadler');
        // Auto column widths
        const colWidths = Object.values(colMap).map((h) => ({ wch: Math.max(h.length + 2, 14) }));
        ws['!cols'] = colWidths;
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `sovlo-leads-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buf);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/leads/lists — Distinct named list names parsed from notes field
router.get('/lists', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('notes')
            .eq('user_id', req.userId)
            .ilike('notes', '[📁%')
            .limit(2000);
        if (error)
            throw error;
        const listSet = new Set();
        const re = /^\[📁 (.+?)\]/;
        for (const row of data || []) {
            const m = (row.notes || '').match(re);
            if (m)
                listSet.add(m[1]);
        }
        res.json({ lists: [...listSet].sort() });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/leads/:id — Tek lead detayı
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { data: lead, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .single();
        if (error || !lead)
            return res.status(404).json({ error: 'Lead bulunamadi' });
        res.json({ lead });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// PATCH /api/leads/:id — Güncelle
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const allowed = ['status', 'notes', 'score', 'contact_name', 'phone', 'email', 'deal_value'];
        const updates = {};
        allowed.forEach(f => { if (req.body[f] !== undefined)
            updates[f] = req.body[f]; });
        updates.updated_at = new Date().toISOString();
        if (updates.status === 'won')
            updates.won_at = new Date().toISOString();
        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .select()
            .single();
        if (error)
            throw error;
        // Meta CAPI — fire on status transitions
        if (data && updates.status) {
            try {
                if (updates.status === 'won') {
                    await fireCapiEvent(supabase, req.userId, data, 'Purchase', { value: data.deal_value || 0, orderId: `won-${data.id}` });
                    await fireGoogleConversion(supabase, req.userId, data, 'Purchase', { value: data.deal_value || 0 });
                }
                else if (updates.status === 'contacted' || updates.status === 'replied') {
                    await fireCapiEvent(supabase, req.userId, data, 'Contact');
                    await fireGoogleConversion(supabase, req.userId, data, 'LeadFormSubmit');
                }
                else if (updates.status === 'proposal') {
                    await fireCapiEvent(supabase, req.userId, data, 'InitiateCheckout');
                }
            }
            catch { }
        }
        res.json({ lead: data });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// POST /api/leads — Manuel lead oluştur (UTM + fbc/fbp capture ile)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { company_name, contact_name, phone, email, website, city, sector, source, notes, score, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbc, fbp, } = req.body;
        if (!company_name)
            return res.status(400).json({ error: 'company_name zorunlu' });
        const { data, error } = await supabase
            .from('leads')
            .insert([{
                user_id: req.userId,
                company_name, contact_name, phone, email, website,
                city, sector, source: source || 'Manuel',
                status: 'new', score: score || 50, notes,
                utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                fbc, fbp,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }])
            .select()
            .single();
        if (error)
            throw error;
        // Fire Lead CAPI event
        try {
            await fireCapiEvent(supabase, req.userId, data, 'Lead');
        }
        catch { }
        res.json({ lead: data });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// DELETE /api/leads/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.userId);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// POST /api/leads/bulk-status — Toplu durum güncelle
router.post('/bulk-status', authMiddleware, async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!ids?.length || !status)
            return res.status(400).json({ error: 'ids ve status gerekli' });
        const { error } = await supabase
            .from('leads')
            .update({ status, updated_at: new Date().toISOString() })
            .in('id', ids)
            .eq('user_id', req.userId);
        if (error)
            throw error;
        res.json({ success: true, updated: ids.length });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
