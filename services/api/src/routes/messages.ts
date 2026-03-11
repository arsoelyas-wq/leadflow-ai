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
    const userId = req.userId;

    const { data, error } = await supabase
      .from('messages')
      .select('*, leads(company_name, phone, email, city)')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(200);

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