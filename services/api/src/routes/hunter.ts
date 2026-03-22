export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/hunter/config
router.get('/config', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('lead_hunter_configs')
      .select('*').eq('user_id', req.userId).single();
    res.json({ config: data || null });
  } catch (e: any) { res.json({ config: null }); }
});

// POST /api/hunter/config
router.post('/config', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keywords, cities, sources, active, run_interval_hours, max_leads_per_run, auto_start_workflow } = req.body;

    const { data: existing } = await supabase.from('lead_hunter_configs').select('id').eq('user_id', userId).single();

    if (existing) {
      await supabase.from('lead_hunter_configs').update({
        keywords, cities, sources, active,
        run_interval_hours, max_leads_per_run, auto_start_workflow,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
    } else {
      await supabase.from('lead_hunter_configs').insert([{
        user_id: userId, keywords, cities, sources, active,
        run_interval_hours, max_leads_per_run, auto_start_workflow,
      }]);
    }

    res.json({ message: 'Hunter config kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/hunter/logs
router.get('/logs', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('lead_hunter_logs')
      .select('*').eq('user_id', req.userId)
      .order('ran_at', { ascending: false }).limit(20);
    res.json({ logs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/hunter/run-now
router.post('/run-now', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: config } = await supabase.from('lead_hunter_configs')
      .select('*').eq('user_id', userId).single();

    if (!config) return res.status(400).json({ error: 'Önce hunter ayarlarını kaydedin' });

    res.json({ message: 'Hunter başlatıldı — arka planda çalışıyor' });

    // Arka planda çalıştır
    (async () => {
      const axios = require('axios');
      let totalAdded = 0;

      for (const keyword of (config.keywords || [])) {
        for (const city of (config.cities || ['Istanbul'])) {
          for (const source of (config.sources || ['google_maps'])) {
            try {
              if (source === 'google_maps') {
                const resp = await axios.post(
                  'https://places.googleapis.com/v1/places:searchText',
                  { textQuery: `${keyword} ${city}`, maxResultCount: 20, languageCode: 'tr', regionCode: 'TR' },
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
                      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.businessStatus',
                    },
                    timeout: 15000,
                  }
                );

                for (const place of resp.data?.places || []) {
                  if (place.businessStatus !== 'OPERATIONAL' && place.businessStatus) continue;
                  const name = place.displayName?.text;
                  if (!name) continue;

                  let phone = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
                  if (phone) {
                    phone = phone.replace(/\s/g, '').replace(/\+90/, '0').replace(/[^0-9]/g, '');
                    if (phone.startsWith('90') && phone.length === 12) phone = '0' + phone.slice(2);
                    if (!phone.startsWith('0')) phone = '0' + phone;
                  }

                  const { data: existing } = await supabase.from('leads').select('id')
                    .eq('user_id', userId).eq('company_name', name).maybeSingle();
                  if (existing) continue;

                  await supabase.from('leads').insert([{
                    user_id: userId, company_name: name, phone: phone || null,
                    address: place.formattedAddress || null, website: place.websiteUri || null,
                    city, sector: keyword, source: 'google_maps', status: 'new',
                    auto_hunted: true, hunted_at: new Date().toISOString(),
                  }]);
                  totalAdded++;

                  // Otomatik workflow başlat
                  if (config.auto_start_workflow && phone) {
                    await supabase.from('workflow_enrollments').insert([{
                      user_id: userId,
                      lead_id: (await supabase.from('leads').select('id').eq('user_id', userId).eq('company_name', name).single())?.data?.id,
                      workflow_type: 'cold_outreach',
                      current_step: 0,
                      status: 'active',
                      started_at: new Date().toISOString(),
                      next_step_at: new Date().toISOString(),
                    }]).catch(() => {});
                  }
                }
              }

              await new Promise(r => setTimeout(r, 1000));
            } catch (e: any) {
              console.error(`Hunter error ${source}/${keyword}/${city}:`, e.message);
            }
          }
        }
      }

      await supabase.from('lead_hunter_logs').insert([{
        user_id: userId, config_id: config.id,
        ran_at: new Date().toISOString(),
        leads_found: totalAdded,
      }]);

      console.log(`Hunter run-now done: ${totalAdded} leads for user ${userId}`);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;