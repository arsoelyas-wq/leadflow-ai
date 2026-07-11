export {};
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Public webhook handler — called by Zapier/Make/n8n without user JWT.
// Requires a per-user webhook_token either as ?token= query param or x-webhook-token header.
module.exports = async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const token = (req.query.token as string) || (req.headers['x-webhook-token'] as string);

    if (!token) {
      return res.status(401).json({ error: 'Webhook token gerekli (?token=... veya x-webhook-token header)' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, webhook_token')
      .eq('id', userId)
      .maybeSingle();

    if (!user || !user.webhook_token || user.webhook_token !== token) {
      return res.status(401).json({ error: 'Geçersiz webhook token' });
    }

    const data = req.body;

    await supabase.from('automation_logs').insert([{
      user_id: userId,
      type: 'incoming',
      payload: JSON.stringify(data),
      source: req.headers['x-source'] || 'webhook',
      received_at: new Date().toISOString(),
    }]);

    if (data.name || data.company || data.phone || data.email) {
      const { data: existing } = await supabase.from('leads').select('id')
        .eq('user_id', userId)
        .eq('phone', data.phone || '').maybeSingle();

      if (!existing && (data.phone || data.email)) {
        await supabase.from('leads').insert([{
          user_id: userId,
          company_name: data.company || data.name || 'Webhook Lead',
          contact_name: data.name || null,
          phone: data.phone || null,
          email: data.email || null,
          source: data.source || 'zapier',
          status: 'new',
          notes: data.notes || null,
        }]);
      }
    }

    res.json({ success: true, message: 'Webhook işlendi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
