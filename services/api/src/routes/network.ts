export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CONNECTION_LABEL: Record<string, string> = {
  referral:    'Referans',
  knows:       'Tanıyor',
  same_network: 'Ortak Ağ',
  customer_ref: 'Müşteri Ref.',
};

// GET /api/network — Full graph (nodes + edges) for the current user
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    // All leads with at least one connection
    const { data: connections, error } = await supabase
      .from('lead_connections')
      .select('id, lead_id, connected_to, connection_type, notes, created_at')
      .eq('user_id', req.userId);
    if (error) throw error;

    if (!connections?.length) return res.json({ nodes: [], edges: [] });

    // Gather all unique lead IDs
    const leadIdSet = new Set<string>();
    for (const c of connections) { leadIdSet.add(c.lead_id); leadIdSet.add(c.connected_to); }
    const leadIds = [...leadIdSet];

    const { data: leads } = await supabase
      .from('leads')
      .select('id, company_name, city, sector, score, ai_grade, status, hot_score')
      .eq('user_id', req.userId)
      .in('id', leadIds);

    const nodes = (leads || []).map((l: any) => ({
      id:   l.id,
      label: l.company_name,
      city:  l.city,
      sector: l.sector,
      score:  l.score,
      grade:  l.ai_grade,
      status: l.status,
      hotScore: l.hot_score || 0,
    }));

    const edges = connections.map((c: any) => ({
      id:     c.id,
      source: c.lead_id,
      target: c.connected_to,
      type:   c.connection_type,
      label:  CONNECTION_LABEL[c.connection_type] || c.connection_type,
      notes:  c.notes,
    }));

    res.json({ nodes, edges });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/network/lead/:leadId — Connections for one lead
router.get('/lead/:leadId', authMiddleware, async (req: any, res: any) => {
  try {
    const { leadId } = req.params;

    const { data: conns } = await supabase
      .from('lead_connections')
      .select('*')
      .eq('user_id', req.userId)
      .or(`lead_id.eq.${leadId},connected_to.eq.${leadId}`);

    if (!conns?.length) return res.json({ connections: [] });

    const peerIds = conns.map((c: any) => c.lead_id === leadId ? c.connected_to : c.lead_id);
    const { data: peers } = await supabase
      .from('leads')
      .select('id, company_name, city, sector, score, ai_grade, status')
      .in('id', peerIds);

    const peerMap: Record<string, any> = {};
    for (const p of peers || []) peerMap[p.id] = p;

    const connections = conns.map((c: any) => {
      const peerId = c.lead_id === leadId ? c.connected_to : c.lead_id;
      return {
        id:     c.id,
        type:   c.connection_type,
        label:  CONNECTION_LABEL[c.connection_type] || c.connection_type,
        notes:  c.notes,
        direction: c.lead_id === leadId ? 'out' : 'in',
        peer:   peerMap[peerId] || { id: peerId, company_name: 'Bilinmiyor' },
      };
    });

    res.json({ connections });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/network/connect — Create a connection
router.post('/connect', authMiddleware, async (req: any, res: any) => {
  try {
    const { leadId, connectedTo, connectionType = 'referral', notes } = req.body;
    if (!leadId || !connectedTo) return res.status(400).json({ error: 'leadId ve connectedTo gerekli' });
    if (leadId === connectedTo) return res.status(400).json({ error: 'Bir lead kendisiyle bağlanamaz' });

    const { data, error } = await supabase
      .from('lead_connections')
      .upsert({
        user_id: req.userId,
        lead_id: leadId,
        connected_to: connectedTo,
        connection_type: connectionType,
        notes: notes || null,
      }, { onConflict: 'user_id,lead_id,connected_to' })
      .select()
      .single();

    if (error) throw error;
    res.json({ connection: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/network/:id — Remove a connection
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    await supabase.from('lead_connections').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/network/suggest/:leadId — Auto-suggest connections (same sector/city)
router.get('/suggest/:leadId', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, sector, city')
      .eq('id', req.params.leadId)
      .eq('user_id', req.userId)
      .single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Already connected
    const { data: existing } = await supabase
      .from('lead_connections')
      .select('connected_to')
      .eq('user_id', req.userId)
      .eq('lead_id', lead.id);
    const excludeIds = [(existing || []).map((c: any) => c.connected_to), lead.id].flat();

    // Find leads in same sector or city
    let query = supabase
      .from('leads')
      .select('id, company_name, city, sector, score, ai_grade')
      .eq('user_id', req.userId)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(10);

    if (lead.sector) query = query.ilike('sector', `%${lead.sector}%`);
    else if (lead.city) query = query.ilike('city', `%${lead.city}%`);

    const { data: suggestions } = await query;
    res.json({ suggestions: suggestions || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
