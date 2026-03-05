export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Tüm mesajları getir (leads join ile)
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    // Kullanıcıya ait lead'lerin mesajlarını çek
    const { data: userLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', userId);

    const leadIds = (userLeads || []).map((l: any) => l.id);

    if (leadIds.length === 0) {
      return res.json({ messages: [] });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*, leads(company_name, city)')
      .in('lead_id', leadIds)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({ messages: data || [] });
  } catch (error: any) {
    console.error('Messages GET Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Belirli lead'in mesajları
router.get('/lead/:leadId', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', req.params.leadId)
      .order('sent_at', { ascending: true });

    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;