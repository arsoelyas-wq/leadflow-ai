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
    const slug = req.params.slug;

    // Landing page home config — stored in site_settings table
    if (slug === 'home') {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'landing_home')
        .single();

      const cfg = data?.value && Object.keys(data.value).length > 0 ? data.value : null;
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ page: cfg });
    }

    // Other market pages — user-owned records in market_pages table
    const { data, error } = await supabase
      .from('market_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Market page not found' });
    }

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ page: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
