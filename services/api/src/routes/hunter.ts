export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const EXA_API_KEY = process.env.EXA_API_KEY;

// ── MULTI-SOURCE LEAD SEARCH ─────────────────────────────────────────────────

async function searchGoogleMaps(keyword: string, city: string, maxResults = 20): Promise<any[]> {
  if (!GOOGLE_API_KEY) return [];
  const leads: any[] = [];
  try {
    const queries = [`${keyword} ${city}`, `${keyword} firması ${city}`];
    for (const q of queries) {
      const resp = await axios.post('https://places.googleapis.com/v1/places:searchText', {
        textQuery: q, maxResultCount: Math.min(20, maxResults), languageCode: 'tr', regionCode: 'TR',
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.primaryTypeDisplayName',
        },
        timeout: 15000,
      });
      for (const p of (resp.data?.places || [])) {
        if (p.businessStatus === 'CLOSED_PERMANENTLY') continue;
        const name = p.displayName?.text;
        if (!name || name.length < 3) continue;
        leads.push({
          company_name: name,
          phone: normalizePhone(p.nationalPhoneNumber || p.internationalPhoneNumber || ''),
          address: p.formattedAddress || null,
          website: p.websiteUri || null,
          city, sector: keyword,
          source: 'google_maps',
          rating: p.rating || null,
          review_count: p.userRatingCount || 0,
          place_id: p.id || null,
          category: p.primaryTypeDisplayName?.text || null,
        });
      }
      if (leads.length >= maxResults) break;
      await sleep(500);
    }
  } catch (e: any) { console.log('[Hunter] Google Maps error:', e.message?.slice(0, 60)); }
  return leads.slice(0, maxResults);
}

async function searchInstagram(keyword: string, city: string): Promise<any[]> {
  if (!EXA_API_KEY) return [];
  const leads: any[] = [];
  try {
    const res = await axios.post('https://api.exa.ai/search', {
      query: `${keyword} ${city} instagram.com`,
      numResults: 10, useAutoprompt: true,
      includeDomains: ['instagram.com'],
      contents: { text: { maxCharacters: 200 } },
    }, { headers: { 'x-api-key': EXA_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 });

    for (const r of (res.data?.results || [])) {
      const url = r.url || '';
      if (!url.includes('instagram.com')) continue;
      const username = url.match(/instagram\.com\/([^/?]+)/)?.[1] || '';
      if (!username || username.length < 2 || ['p', 'reel', 'tv', 'explore', 'accounts'].includes(username)) continue;
      const name = (r.title || '').replace(/• Instagram.*/, '').replace(/@\w+/, '').trim() || `@${username}`;
      leads.push({
        company_name: name,
        instagram: `https://instagram.com/${username}`,
        website: `https://instagram.com/${username}`,
        city, sector: keyword,
        source: 'instagram',
        notes: `DM: instagram.com/${username}`,
      });
    }
  } catch (e: any) { console.log('[Hunter] Instagram error:', e.message?.slice(0, 60)); }
  return leads;
}

async function searchFacebook(keyword: string, city: string): Promise<any[]> {
  if (!EXA_API_KEY) return [];
  const leads: any[] = [];
  try {
    const res = await axios.post('https://api.exa.ai/search', {
      query: `${keyword} ${city} facebook.com`,
      numResults: 10, useAutoprompt: true,
      includeDomains: ['facebook.com'],
      contents: { text: { maxCharacters: 200 } },
    }, { headers: { 'x-api-key': EXA_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 });

    for (const r of (res.data?.results || [])) {
      const url = r.url || '';
      if (!url.includes('facebook.com') || url.includes('/posts/') || url.includes('/events/')) continue;
      const pageName = url.match(/facebook\.com\/([^/?]+)/)?.[1] || '';
      if (!pageName || ['watch', 'groups', 'pages', 'profile', 'share'].includes(pageName)) continue;
      const name = (r.title || '').replace(/\| Facebook.*/, '').replace(/- Facebook.*/, '').trim() || pageName;
      leads.push({
        company_name: name,
        facebook: url,
        website: `https://m.me/${pageName}`,
        city, sector: keyword,
        source: 'facebook',
        notes: `Messenger: m.me/${pageName}`,
      });
    }
  } catch (e: any) { console.log('[Hunter] Facebook error:', e.message?.slice(0, 60)); }
  return leads;
}

async function searchOpenStreetMap(keyword: string, city: string): Promise<any[]> {
  const leads: any[] = [];
  try {
    const query = `[out:json][timeout:20];area["name"="${city}"]->.a;(node["name"~"${keyword}",i]["amenity"](area.a);node["name"~"${keyword}",i]["shop"](area.a););out body 15;`;
    const res = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 25000,
    });
    for (const el of (res.data?.elements || [])) {
      const name = el.tags?.name;
      if (!name || name.length < 3) continue;
      leads.push({
        company_name: name,
        phone: normalizePhone(el.tags?.phone || el.tags?.['contact:phone'] || ''),
        website: el.tags?.website || el.tags?.['contact:website'] || null,
        address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean).join(' ') || null,
        city, sector: keyword,
        source: 'openstreetmap',
      });
    }
  } catch (e: any) { console.log('[Hunter] OSM error:', e.message?.slice(0, 60)); }
  return leads;
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[\s\-\(\)\.]/g, '');
  if (p.startsWith('+90')) p = '0' + p.slice(3);
  else if (p.startsWith('90') && p.length >= 12) p = '0' + p.slice(2);
  p = p.replace(/[^0-9]/g, '');
  if (p.length < 7) return null;
  if (!p.startsWith('0') && p.length === 10) p = '0' + p;
  return p || null;
}

function calcScore(lead: any): number {
  let s = 20;
  if (lead.phone) s += 25;
  if (lead.website && !lead.website.includes('instagram.com') && !lead.website.includes('facebook.com')) s += 12;
  if (lead.instagram) s += 8;
  if (lead.facebook) s += 5;
  if (lead.rating && lead.rating >= 4.5) s += 10;
  else if (lead.rating && lead.rating >= 4.0) s += 7;
  if (lead.review_count && lead.review_count >= 50) s += 8;
  else if (lead.review_count && lead.review_count >= 10) s += 4;
  if (lead.address) s += 3;
  if (lead.email) s += 15;
  return Math.min(100, s);
}

// ── ORCHESTRATOR ─────────────────────────────────────────────────────────────

async function runHunt(userId: string, config: any): Promise<{ added: number; skipped: number; sources: Record<string, number>; errors: string[] }> {
  const keywords = config.keywords || [];
  const cities = config.cities || ['Istanbul'];
  const enabledSources = config.sources || ['google_maps'];
  const maxLeads = config.max_leads_per_run || 50;
  const errors: string[] = [];
  const sourceStats: Record<string, number> = {};
  const allRaw: any[] = [];

  for (const keyword of keywords) {
    for (const city of cities) {
      const tasks: Promise<any[]>[] = [];
      if (enabledSources.includes('google_maps')) tasks.push(searchGoogleMaps(keyword, city, Math.ceil(maxLeads / keywords.length / cities.length)));
      if (enabledSources.includes('instagram')) tasks.push(searchInstagram(keyword, city));
      if (enabledSources.includes('facebook')) tasks.push(searchFacebook(keyword, city));
      tasks.push(searchOpenStreetMap(keyword, city));

      const results = await Promise.allSettled(tasks);
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          allRaw.push(...r.value);
          r.value.forEach(l => { sourceStats[l.source] = (sourceStats[l.source] || 0) + 1; });
        } else {
          errors.push(`${keyword}/${city}: ${(r as any).reason?.message?.slice(0, 60)}`);
        }
      });
      await sleep(300);
    }
  }

  // Dedup by company name
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const lead of allRaw) {
    const key = (lead.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (!key || key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    unique.push(lead);
  }

  // Check DB duplicates
  const existingNames = new Set<string>();
  for (const lead of unique) {
    const { data } = await supabase.from('leads').select('id')
      .eq('user_id', userId).ilike('company_name', lead.company_name.slice(0, 40) + '%').maybeSingle();
    if (data) existingNames.add(lead.company_name);
  }

  const toInsert = unique.filter(l => !existingNames.has(l.company_name)).slice(0, maxLeads);
  let added = 0;

  for (const lead of toInsert) {
    const score = calcScore(lead);
    const { data: inserted, error } = await supabase.from('leads').insert([{
      user_id: userId,
      company_name: lead.company_name,
      phone: lead.phone || null,
      email: lead.email || null,
      website: lead.website || null,
      instagram: lead.instagram || null,
      facebook: lead.facebook || null,
      address: lead.address || null,
      city: lead.city || null,
      sector: lead.sector || null,
      source: lead.source || 'hunter',
      status: 'new',
      score,
      notes: lead.notes || null,
      auto_hunted: true,
      hunted_at: new Date().toISOString(),
    }]).select('id').single();

    if (!error && inserted) {
      added++;
      if (config.auto_start_workflow && lead.phone) {
        await supabase.from('workflow_enrollments').insert([{
          user_id: userId, lead_id: inserted.id,
          workflow_type: 'cold_outreach', current_step: 0,
          status: 'active', started_at: new Date().toISOString(),
          next_step_at: new Date().toISOString(),
        }]).catch(() => {});
      }
    }
  }

  return { added, skipped: unique.length - toInsert.length + (allRaw.length - unique.length), sources: sourceStats, errors };
}

// ── 7/24 OTOMATIK TARAMA MOTORU ──────────────────────────────────────────────

async function runScheduledHunts() {
  try {
    const { data: configs } = await supabase.from('lead_hunter_configs')
      .select('*, users!inner(credits_total, credits_used)')
      .eq('active', true);

    if (!configs?.length) return;

    for (const config of configs) {
      try {
        const intervalMs = (config.run_interval_hours || 6) * 60 * 60 * 1000;

        const { data: lastLog } = await supabase.from('lead_hunter_logs')
          .select('ran_at').eq('user_id', config.user_id)
          .order('ran_at', { ascending: false }).limit(1).maybeSingle();

        const lastRun = lastLog?.ran_at ? new Date(lastLog.ran_at).getTime() : 0;
        if (Date.now() - lastRun < intervalMs) continue;

        const available = (config.users?.credits_total || 0) - (config.users?.credits_used || 0);
        if (available < 5) {
          console.log(`[Hunter] Skip ${config.user_id.slice(0, 8)}: insufficient credits (${available})`);
          continue;
        }

        console.log(`[Hunter] Running for ${config.user_id.slice(0, 8)} — keywords: ${config.keywords?.join(', ')}`);
        const result = await runHunt(config.user_id, config);

        // Kredi dus
        if (result.added > 0) {
          const { data: fresh } = await supabase.from('users').select('credits_used').eq('id', config.user_id).single();
          await supabase.from('users').update({
            credits_used: (fresh?.credits_used || 0) + result.added,
          }).eq('id', config.user_id);
        }

        // Log
        await supabase.from('lead_hunter_logs').insert([{
          user_id: config.user_id, config_id: config.id,
          ran_at: new Date().toISOString(),
          leads_found: result.added,
          skipped: result.skipped,
          sources: result.sources,
          errors: result.errors.slice(0, 5),
        }]).catch(() => {});

        // Bildirim
        if (result.added > 0) {
          await supabase.from('notifications').insert([{
            user_id: config.user_id,
            title: `${result.added} yeni lead bulundu!`,
            body: `7/24 Lead Avcisi: ${Object.entries(result.sources).map(([s, c]) => `${s}: ${c}`).join(', ')}`,
            read: false,
          }]).catch(() => {});

          // WhatsApp bildirim
          try {
            const { data: us } = await supabase.from('user_settings').select('phone').eq('user_id', config.user_id).single();
            if (us?.phone) {
              const { sendWhatsAppMessage } = require('./settings');
              sendWhatsAppMessage(config.user_id, us.phone,
                `🎯 *${result.added} Yeni Lead!*\n\nOtomatik avcı ${config.keywords?.join(', ')} icin ${result.added} yeni lead buldu.\nKaynaklar: ${Object.entries(result.sources).map(([s, c]) => `${s}(${c})`).join(', ')}\n\nSovlo.io'dan inceleyin!`
              ).catch(() => {});
            }
          } catch {}

          // Akilli ekip dagitimi
          try {
            const { data: members } = await supabase.from('team_members')
              .select('id, name').eq('owner_id', config.user_id).eq('active', true).limit(5);
            if (members?.length) {
              const { data: newLeads } = await supabase.from('leads')
                .select('id').eq('user_id', config.user_id).eq('auto_hunted', true)
                .is('assigned_member_id', null).order('created_at', { ascending: false }).limit(result.added);
              if (newLeads?.length) {
                let idx = 0;
                for (const lead of newLeads) {
                  const member = members[idx % members.length];
                  await supabase.from('leads').update({
                    assigned_to: member.name, assigned_member_id: member.id,
                  }).eq('id', lead.id);
                  idx++;
                }
                console.log(`[Hunter] Auto-assigned ${newLeads.length} leads to ${members.length} members`);
              }
            }
          } catch {}
        }

        console.log(`[Hunter] Done: ${result.added} added, ${result.skipped} skipped for ${config.user_id.slice(0, 8)}`);
        await sleep(3000);
      } catch (e: any) {
        console.error(`[Hunter] Error for ${config.user_id?.slice(0, 8)}:`, e.message?.slice(0, 80));
      }
    }
  } catch (e: any) {
    console.error('[Hunter] Scheduled run failed:', e.message);
  }
}

// Her 10 dakikada kontrol et
setInterval(runScheduledHunts, 10 * 60 * 1000);
setTimeout(runScheduledHunts, 30000);
console.log('[Hunter] 7/24 otonom motor aktif — her 10 dakikada kontrol');

// Export for external use
module.exports.runScheduledHunts = runScheduledHunts;

// ── ROUTES ───────────────────────────────────────────────────────────────────

// GET /api/hunter/config
router.get('/config', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('lead_hunter_configs')
      .select('*').eq('user_id', req.userId).maybeSingle();
    res.json({ config: data || null });
  } catch { res.json({ config: null }); }
});

// POST /api/hunter/config
router.post('/config', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keywords, cities, sources, active, run_interval_hours, max_leads_per_run, auto_start_workflow } = req.body;
    if (!keywords?.length) return res.status(400).json({ error: 'En az 1 anahtar kelime zorunlu' });

    const { data: existing } = await supabase.from('lead_hunter_configs')
      .select('id').eq('user_id', userId).maybeSingle();

    const configData = {
      keywords, cities: cities || ['Istanbul'],
      sources: sources || ['google_maps'],
      active: active !== false,
      run_interval_hours: Math.max(1, Math.min(24, run_interval_hours || 6)),
      max_leads_per_run: Math.max(5, Math.min(200, max_leads_per_run || 50)),
      auto_start_workflow: auto_start_workflow !== false,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from('lead_hunter_configs').update(configData).eq('user_id', userId);
    } else {
      await supabase.from('lead_hunter_configs').insert([{ user_id: userId, ...configData }]);
    }

    res.json({ message: 'Hunter ayarlari kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/hunter/logs
router.get('/logs', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('lead_hunter_logs')
      .select('*').eq('user_id', req.userId)
      .order('ran_at', { ascending: false }).limit(30);
    res.json({ logs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/hunter/run-now — Manuel tetikleme
router.post('/run-now', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: config } = await supabase.from('lead_hunter_configs')
      .select('*').eq('user_id', userId).maybeSingle();
    if (!config) return res.status(400).json({ error: 'Once hunter ayarlarini kaydedin' });

    const { data: ud } = await supabase.from('users').select('credits_total, credits_used').eq('id', userId).single();
    const available = (ud?.credits_total || 0) - (ud?.credits_used || 0);
    if (available < 5) return res.status(400).json({ error: `Yetersiz kredi. Mevcut: ${available}` });

    res.json({ message: 'Hunter baslatildi — arka planda calisiyor' });

    (async () => {
      try {
        const result = await runHunt(userId, config);

        if (result.added > 0) {
          const { data: fresh } = await supabase.from('users').select('credits_used').eq('id', userId).single();
          await supabase.from('users').update({ credits_used: (fresh?.credits_used || 0) + result.added }).eq('id', userId);
        }

        await supabase.from('lead_hunter_logs').insert([{
          user_id: userId, config_id: config.id,
          ran_at: new Date().toISOString(),
          leads_found: result.added,
          skipped: result.skipped,
          sources: result.sources,
          errors: result.errors.slice(0, 5),
        }]).catch(() => {});

        console.log(`[Hunter] Manual run done: ${result.added} added for ${userId.slice(0, 8)}`);
      } catch (e: any) {
        console.error('[Hunter] Manual run failed:', e.message);
        await supabase.from('lead_hunter_logs').insert([{
          user_id: userId, config_id: config.id,
          ran_at: new Date().toISOString(), leads_found: 0,
          errors: [e.message?.slice(0, 100)],
        }]).catch(() => {});
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/hunter/stats — Toplam istatistik
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: logs } = await supabase.from('lead_hunter_logs')
      .select('leads_found, ran_at, sources').eq('user_id', req.userId);

    const totalLeads = (logs || []).reduce((s: number, l: any) => s + (l.leads_found || 0), 0);
    const totalRuns = logs?.length || 0;
    const sourceBreakdown: Record<string, number> = {};
    (logs || []).forEach((l: any) => {
      if (l.sources && typeof l.sources === 'object') {
        Object.entries(l.sources).forEach(([k, v]) => { sourceBreakdown[k] = (sourceBreakdown[k] || 0) + (v as number); });
      }
    });

    res.json({ totalLeads, totalRuns, sourceBreakdown, lastRun: logs?.[0]?.ran_at || null });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.runScheduledHunts = runScheduledHunts;
