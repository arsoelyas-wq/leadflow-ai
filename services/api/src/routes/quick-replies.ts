export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/quick-replies
router.get('/', async (req: any, res: any) => {
  try {
    const { category, channel } = req.query;
    let q = supabase.from('quick_reply_templates').select('*')
      .eq('user_id', req.userId)
      .order('pinned', { ascending: false })
      .order('usage_count', { ascending: false });
    if (category) q = q.eq('category', category);
    if (channel) q = q.or(`channel.is.null,channel.eq.${channel}`);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ templates: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/quick-replies
router.post('/', async (req: any, res: any) => {
  try {
    const { title, content, category = 'genel', icon, shortcut, channel } = req.body;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'title ve content zorunlu' });
    const { data, error } = await supabase.from('quick_reply_templates').insert([{
      user_id: req.userId, title: title.trim(), content: content.trim(),
      category, icon, shortcut, channel,
    }]).select().single();
    if (error) throw error;
    res.json({ template: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/quick-replies/:id
router.patch('/:id', async (req: any, res: any) => {
  try {
    const allowed = ['title','content','category','icon','shortcut','channel','pinned'];
    const upd: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) upd[k] = req.body[k];
    upd.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('quick_reply_templates')
      .update(upd).eq('id', req.params.id).eq('user_id', req.userId).select().single();
    if (error) throw error;
    res.json({ template: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/quick-replies/:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    await supabase.from('quick_reply_templates')
      .delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/quick-replies/:id/use — kullanım sayacı arttır
router.post('/:id/use', async (req: any, res: any) => {
  try {
    await supabase.rpc('increment_quick_reply_usage', { template_id: req.params.id })
      .catch(async () => {
        // RPC yoksa manuel artır
        const { data: t } = await supabase.from('quick_reply_templates')
          .select('usage_count').eq('id', req.params.id).single();
        await supabase.from('quick_reply_templates')
          .update({ usage_count: (t?.usage_count || 0) + 1 }).eq('id', req.params.id);
      });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
