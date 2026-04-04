export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Müşteri portal linki oluştur
router.post('/create-link', async (req: any, res: any) => {
  try {
    const { leadId, expiresInDays } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const token = jwt.sign({ leadId, userId: req.userId }, process.env.JWT_SECRET, { expiresIn: `${expiresInDays || 30}d` });

    await supabase.from('portal_links').upsert([{
      user_id: req.userId, lead_id: leadId,
      token, expires_at: new Date(Date.now() + (expiresInDays || 30) * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    }], { onConflict: 'lead_id' });

    const url = `https://leadflow-ai-web-kappa.vercel.app/portal?token=${token}`;
    res.json({ url, token, message: 'Müşteri portal linki oluşturuldu' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Portal erişimi (token ile, auth gerekmez)
router.get('/access', async (req: any, res: any) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token zorunlu' });

    const decoded = jwt.verify(token as string, process.env.JWT_SECRET) as any;
    const { leadId, userId } = decoded;

    const { data: lead } = await supabase.from('leads').select('company_name, contact_name, phone, email, status, city, sector').eq('id', leadId).single();
    const { data: messages } = await supabase.from('messages').select('content, direction, channel, sent_at').eq('lead_id', leadId).order('sent_at', { ascending: false }).limit(10);
    const { data: invoices } = await supabase.from('invoices').select('invoice_number, total, status, due_date, created_at').eq('lead_id', leadId);
    const { data: proposals } = await supabase.from('proposals').select('title, amount, status, created_at').eq('lead_id', leadId);
    const { data: userSettings } = await supabase.from('user_settings').select('company_name, phone, website').eq('user_id', userId).single();

    res.json({
      lead, messages: messages || [],
      invoices: invoices || [],
      proposals: proposals || [],
      supplier: userSettings,
    });
  } catch (e: any) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Link süresi dolmuş' });
    res.status(500).json({ error: e.message });
  }
});

// Portaller listesi
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('portal_links').select('*, leads(company_name)').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ portals: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;