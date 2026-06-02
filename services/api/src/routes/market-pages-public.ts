export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/market-pages/public/:slug — No auth required
// Called by Next.js ISR to render the public market page
router.get('/:slug', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('market_pages')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('is_published', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Market page not found' });
    }

    // Cache header — CDN caches 60s
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ page: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
