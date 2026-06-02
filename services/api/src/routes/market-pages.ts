export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── GET /api/market-pages ─────────────────────────────────────────────────────
// Dashboard: list all market pages for this user (summary only)
router.get('/', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('market_pages')
      .select('id, slug, locale, is_published, hero_headline, updated_at')
      .eq('user_id', req.userId)
      .order('slug');

    if (error) return res.status(500).json({ error: error.message });
    res.json({ pages: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/market-pages/:slug ───────────────────────────────────────────────
// Dashboard editor: get full page data for editing
router.get('/:slug', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('market_pages')
      .select('*')
      .eq('user_id', req.userId)
      .eq('slug', req.params.slug)
      .single();

    res.json({ page: data || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/market-pages ────────────────────────────────────────────────────
// Create new market page (empty draft)
router.post('/', async (req: any, res: any) => {
  try {
    const { slug, locale } = req.body;
    if (!slug || !locale) {
      return res.status(400).json({ error: 'slug and locale are required' });
    }

    const { data, error } = await supabase
      .from('market_pages')
      .insert([{
        user_id: req.userId,
        slug,
        locale,
        is_published: false,
        stats: [],
        features: [],
        testimonials: [],
        logos: [],
        price_features: [],
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ page: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/market-pages/:slug ─────────────────────────────────────────────
// Update market page content + optionally publish/unpublish
router.patch('/:slug', async (req: any, res: any) => {
  try {
    const updates: any = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    // Auto-set published_at when first publishing
    if (updates.is_published === true && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('market_pages')
      .update(updates)
      .eq('user_id', req.userId)
      .eq('slug', req.params.slug);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/market-pages/:slug ────────────────────────────────────────────
router.delete('/:slug', async (req: any, res: any) => {
  try {
    const { error } = await supabase
      .from('market_pages')
      .delete()
      .eq('user_id', req.userId)
      .eq('slug', req.params.slug);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
