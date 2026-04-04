export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Affiliate link oluştur
router.post('/create-link', async (req: any, res: any) => {
  try {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    const { data } = await supabase.from('affiliate_links').insert([{
      user_id: req.userId,
      code, clicks: 0, conversions: 0, earnings: 0,
      created_at: new Date().toISOString(),
    }]).select().single();

    const url = `https://leadflow-ai-web-kappa.vercel.app/register?ref=${code}`;
    res.json({ link: data, url, message: 'Affiliate linki oluşturuldu!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Tıklama kaydet
router.get('/click/:code', async (req: any, res: any) => {
  try {
    await supabase.from('affiliate_links').update({ clicks: supabase.rpc('increment', { x: 1 }) }).eq('code', req.params.code);
    res.redirect(`https://leadflow-ai-web-kappa.vercel.app/register?ref=${req.params.code}`);
  } catch { res.redirect('https://leadflow-ai-web-kappa.vercel.app/register'); }
});

// Linkler listesi
router.get('/links', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('affiliate_links').select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ links: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('affiliate_links').select('clicks, conversions, earnings').eq('user_id', req.userId);
    res.json({
      totalClicks: data?.reduce((s: number, l: any) => s + (l.clicks || 0), 0) || 0,
      totalConversions: data?.reduce((s: number, l: any) => s + (l.conversions || 0), 0) || 0,
      totalEarnings: data?.reduce((s: number, l: any) => s + (l.earnings || 0), 0) || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;