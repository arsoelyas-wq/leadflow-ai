export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GRAPH = 'https://graph.facebook.com/v18.0';

async function getMetaToken(userId: string): Promise<string> {
  const { data } = await supabase.from('meta_connections').select('access_token').eq('user_id', userId).single();
  return data?.access_token || process.env.META_GRAPH_TOKEN || '';
}

async function metaGet(path: string, token: string, params: any = {}) {
  const r = await axios.get(`${GRAPH}${path}`, { params: { ...params, access_token: token }, timeout: 15000 });
  return r.data;
}

async function metaPost(path: string, token: string, data: any = {}) {
  const r = await axios.post(`${GRAPH}${path}`, { ...data, access_token: token }, { timeout: 15000 });
  return r.data;
}

// ── 1. 5 DAKİKA KURALI ───────────────────────────────────
async function triggerFiveMinuteCall(userId: string, lead: any) {
  try {
    const { data: vsettings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    if (!lead.phone) return;

    const agentName = vsettings?.agent_name || 'Satis Temsilcisi';
    const companyName = profile?.company?.name || 'Sirketimiz';
    const productDesc = profile?.product?.description || '';

    const openingLine = `Merhaba ${lead.contact_name || lead.company_name || ''}! Ben ${agentName}, ${companyName}'den ariyorum. Az once reklamimizi gordunuz ve ilginizi cekti, size kisa bir bilgi vermek istedim, uygun musunuz?`;

    await axios.post(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: lead.phone,
        conversation_initiation_client_data: {
          dynamic_variables: {
            agent_name: agentName,
            company_name: companyName,
            product_description: productDesc,
            lead_name: lead.contact_name || lead.company_name || '',
            lead_company: lead.company_name || '',
            language: 'tr',
            avoid_words: '',
            opening_line: openingLine,
          },
        },
      },
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    await supabase.from('leads').update({
      status: 'contacted',
      last_contacted_at: new Date().toISOString(),
      notes: `5 dakika kurali - Meta reklamdan otomatik arama yapildi`,
    }).eq('id', lead.id);

    await supabase.from('ad_lead_events').insert([{
      user_id: userId,
      lead_id: lead.id,
      event_type: 'five_minute_call',
      status: 'triggered',
      created_at: new Date().toISOString(),
    }]);

    console.log(`[5DkKurali] Arama tetiklendi: ${lead.phone}`);
  } catch (e: any) {
    console.error('[5DkKurali] Hata:', e.message);
  }
}

// ── 2. CAPI - CONVERSIONS API ────────────────────────────
async function sendEventToCAPI(userId: string, eventData: {
  eventName: string;
  eventTime: number;
  email?: string;
  phone?: string;
  leadId?: string;
  value?: number;
  currency?: string;
}) {
  try {
    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_GRAPH_TOKEN;
    if (!pixelId || !accessToken) return;

    const userData: any = {};
    if (eventData.email) userData.em = [hashData(eventData.email.toLowerCase())];
    if (eventData.phone) userData.ph = [hashData(eventData.phone.replace(/\D/g, ''))];

    const payload = {
      data: [{
        event_name: eventData.eventName,
        event_time: eventData.eventTime,
        action_source: 'system_generated',
        user_data: userData,
        custom_data: {
          lead_id: eventData.leadId,
          value: eventData.value || 0,
          currency: eventData.currency || 'TRY',
        },
      }],
      access_token: accessToken,
    };

    await axios.post(`${GRAPH}/${pixelId}/events`, payload, { timeout: 10000 });
    console.log(`[CAPI] Event gonderildi: ${eventData.eventName}`);
  } catch (e: any) {
    console.error('[CAPI] Hata:', e.message);
  }
}

function hashData(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ── 3. LEAD KALİTE GERİ BESLEMESİ ───────────────────────
async function sendLeadQualityFeedback(userId: string, leadId: string, quality: 'converted' | 'qualified' | 'unqualified') {
  try {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return;

    const eventName = quality === 'converted' ? 'Purchase' : quality === 'qualified' ? 'Lead' : 'ViewContent';

    await sendEventToCAPI(userId, {
      eventName,
      eventTime: Math.floor(Date.now() / 1000),
      email: lead.email,
      phone: lead.phone,
      leadId: lead.meta_lead_id || leadId,
      value: quality === 'converted' ? 100 : 0,
    });

    await supabase.from('leads').update({ meta_quality_sent: quality, meta_quality_sent_at: new Date().toISOString() }).eq('id', leadId);
  } catch (e: any) {
    console.error('[LeadQuality] Hata:', e.message);
  }
}

// ── 4. LOOKALIKE AUDIENCE OTOMASYOİ ─────────────────────
async function createLookalikeAudience(userId: string, adAccountId: string) {
  try {
    const token = await getMetaToken(userId);
    const { data: convertedLeads } = await supabase
      .from('leads')
      .select('email, phone')
      .eq('user_id', userId)
      .eq('outcome', 'positive')
      .not('email', 'is', null)
      .limit(100);

    if (!convertedLeads?.length || convertedLeads.length < 20) {
      return { error: 'En az 20 donusen lead gerekli (su an: ' + (convertedLeads?.length || 0) + ')' };
    }

    const schema = ['EMAIL', 'PHONE'];
    const rows = convertedLeads.map((l: any) => [
      hashData(l.email?.toLowerCase() || ''),
      hashData(l.phone?.replace(/\D/g, '') || ''),
    ]);

    const customAudienceRes = await metaPost(`/${adAccountId}/customaudiences`, token, {
      name: `LeadFlow Donusen Musteriler ${new Date().toLocaleDateString('tr-TR')}`,
      description: 'LeadFlow CRM donusen musterilerden olusturuldu',
      subtype: 'CUSTOM',
      customer_file_source: 'PARTNER_PROVIDED_ONLY',
    });

    const audienceId = customAudienceRes.id;
    await metaPost(`/${audienceId}/users`, token, { schema, data: rows });

    const lookalikeRes = await metaPost(`/${adAccountId}/customaudiences`, token, {
      name: `LeadFlow Lookalike ${new Date().toLocaleDateString('tr-TR')}`,
      subtype: 'LOOKALIKE',
      origin_audience_id: audienceId,
      lookalike_spec: { type: 'similarity', ratio: 0.01, country: 'TR' },
    });

    await supabase.from('ad_audiences').insert([{
      user_id: userId,
      audience_id: lookalikeRes.id,
      source_audience_id: audienceId,
      name: lookalikeRes.name,
      type: 'lookalike',
      size_estimate: convertedLeads.length,
      created_at: new Date().toISOString(),
    }]);

    return { ok: true, audienceId: lookalikeRes.id, name: lookalikeRes.name, sourceSize: convertedLeads.length };
  } catch (e: any) {
    return { error: e.response?.data?.error?.message || e.message };
  }
}

// ── 5. LEAD EXTRACTION ───────────────────────────────────
async function extractLeadsFromAllCampaigns(userId: string, adAccountId: string, token: string) {
  const leads: any[] = [];
  try {
    // Lead Form
    try {
      const forms = await metaGet(`/${adAccountId}/leadgen_forms`, token, {
        fields: 'id,name,leads_count', limit: 50,
      });
      for (const form of forms.data || []) {
        if (!form.leads_count) continue;
        const formLeads = await metaGet(`/${form.id}/leads`, token, {
          fields: 'id,created_time,field_data,ad_id,ad_name,campaign_id', limit: 100,
        });
        for (const lead of formLeads.data || []) {
          const fields: any = {};
          for (const f of lead.field_data || []) { fields[f.name] = f.values?.[0]; }
          leads.push({
            source: 'meta_lead_form', form_name: form.name,
            meta_lead_id: lead.id,
            name: fields.full_name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim(),
            email: fields.email, phone: fields.phone_number || fields.phone,
            company: fields.company_name, ad_name: lead.ad_name,
            campaign_id: lead.campaign_id, created_at: lead.created_time,
          });
        }
      }
    } catch {}

    // Messenger
    try {
      const pageId = process.env.META_PAGE_ID;
      const pageToken = process.env.META_PAGE_TOKEN;
      if (pageId && pageToken) {
        const convs = await metaGet(`/${pageId}/conversations`, pageToken, {
          fields: 'id,participants,updated_time,messages{message,created_time,from}', limit: 50,
        });
        for (const conv of convs.data || []) {
          const participant = conv.participants?.data?.find((p: any) => p.id !== pageId);
          if (!participant) continue;
          const lastMsg = conv.messages?.data?.[0];
          if (!lastMsg) continue;
          const hoursSince = (Date.now() - new Date(conv.updated_time).getTime()) / (1000 * 60 * 60);
          if (hoursSince > 72) continue; // Son 72 saat
          leads.push({
            source: 'meta_messenger', meta_user_id: participant.id,
            name: participant.name, last_message: lastMsg.message,
            last_message_time: lastMsg.created_time, conversation_id: conv.id,
          });
        }
      }
    } catch {}
  } catch (e: any) { console.error('[LeadExtraction] Hata:', e.message); }
  return leads;
}

async function saveLeadToCRM(userId: string, lead: any): Promise<any> {
  try {
    if (lead.meta_lead_id) {
      const { data: existing } = await supabase.from('leads').select('id').eq('meta_lead_id', lead.meta_lead_id).eq('user_id', userId).single();
      if (existing) return null;
    }
    const { data: newLead } = await supabase.from('leads').insert([{
      user_id: userId,
      company_name: lead.company || lead.name || 'Meta Lead',
      contact_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      meta_lead_id: lead.meta_lead_id,
      status: 'new',
      notes: `Meta ${lead.source} - Reklam: ${lead.ad_name || lead.form_name || ''}`,
      created_at: lead.created_at || new Date().toISOString(),
    }]).select().single();

    // CAPI'ye Lead eventi gonder
    if (newLead) {
      await sendEventToCAPI(userId, {
        eventName: 'Lead',
        eventTime: Math.floor(Date.now() / 1000),
        email: lead.email,
        phone: lead.phone,
        leadId: lead.meta_lead_id,
      });
    }

    return newLead;
  } catch { return null; }
}

// ── 6. PERFORMANS ANALİZİ ───────────────────────────────
async function analyzePerformance(userId: string, adAccountId: string, token: string) {
  const alerts: any[] = [];
  try {
    const campaigns = await metaGet(`/${adAccountId}/campaigns`, token, {
      fields: 'id,name,status,objective,daily_budget',
      filtering: '[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]',
      limit: 50,
    });
    for (const campaign of campaigns.data || []) {
      try {
        const insights = await metaGet(`/${campaign.id}/insights`, token, {
          fields: 'impressions,clicks,spend,ctr,cpm,reach,frequency,actions,cost_per_action_type',
          date_preset: 'last_7d',
        });
        const d = insights.data?.[0];
        if (!d) continue;
        const ctr = parseFloat(d.ctr || '0');
        const cpm = parseFloat(d.cpm || '0');
        const spend = parseFloat(d.spend || '0');
        const impressions = parseInt(d.impressions || '0');
        const frequency = parseFloat(d.frequency || '0');
        if (ctr < 0.5 && impressions > 1000) {
          alerts.push({ type: 'low_ctr', severity: 'warning', campaign_id: campaign.id, campaign_name: campaign.name, message: `CTR cok dusuk: %${ctr.toFixed(2)}`, recommendation: 'Reklam gorselini veya metnini degistirin.', value: ctr });
        }
        if (cpm > 50 && spend > 10) {
          alerts.push({ type: 'high_cpm', severity: 'warning', campaign_id: campaign.id, campaign_name: campaign.name, message: `CPM yuksek: $${cpm.toFixed(2)}`, recommendation: 'Hedef kitleyi genisletin.', value: cpm });
        }
        if (frequency > 5) {
          alerts.push({ type: 'ad_fatigue', severity: 'critical', campaign_id: campaign.id, campaign_name: campaign.name, message: `Reklam yorgunlugu: ${frequency.toFixed(1)}x gosterim`, recommendation: 'Reklam gorselini hemen degistirin.', value: frequency });
        }
        if (spend > 20 && parseInt(d.clicks || '0') < 5) {
          alerts.push({ type: 'no_results', severity: 'critical', campaign_id: campaign.id, campaign_name: campaign.name, message: `$${spend} harcandi, sadece ${d.clicks} tiklama`, recommendation: 'Reklamı durdurun, hedef kitle ve gorsel degistirin.', value: spend });
        }
      } catch {}
    }
    for (const alert of alerts) {
      await supabase.from('ad_alerts').upsert([{
        user_id: userId, campaign_id: alert.campaign_id, alert_type: alert.type,
        severity: alert.severity, message: alert.message, recommendation: alert.recommendation,
        value: alert.value, is_read: false, created_at: new Date().toISOString(),
      }], { onConflict: 'user_id,campaign_id,alert_type' });
    }
  } catch {}
  return alerts;
}

// ── ROUTES ───────────────────────────────────────────────

// POST /api/ads-intelligence/five-minute-settings - 5 dk kural ayarlari
router.post('/five-minute-settings', async (req: any, res: any) => {
  try {
    const { enabled, delay_minutes } = req.body;
    await supabase.from('ad_settings').upsert([{
      user_id: req.userId,
      five_minute_rule: enabled,
      call_delay_minutes: delay_minutes || 5,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/extract-leads
router.get('/extract-leads', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const token = await getMetaToken(userId);
    if (!token) return res.status(400).json({ error: 'Meta hesabi bagli degil' });
    const adAccountId = process.env.META_AD_ACCOUNT_ID || '';
    const leads = await extractLeadsFromAllCampaigns(userId, adAccountId, token);

    const { data: settings } = await supabase.from('ad_settings').select('*').eq('user_id', userId).single();
    const fiveMinEnabled = settings?.five_minute_rule ?? true;

    let saved = 0;
    for (const lead of leads) {
      const result = await saveLeadToCRM(userId, lead);
      if (result) {
        saved++;
        await supabase.from('notifications').insert([{
          user_id: userId, type: 'new_meta_lead',
          title: 'Yeni Meta Reklam Leadi!',
          message: `${lead.name || lead.company || 'Yeni lead'} (${lead.source})`,
        }]);
        // 5 Dakika Kurali
        if (fiveMinEnabled && lead.phone) {
          const delayMs = (settings?.call_delay_minutes || 5) * 60 * 1000;
          setTimeout(() => triggerFiveMinuteCall(userId, result), delayMs);
          console.log(`[5DkKurali] ${delayMs/60000} dk sonra arama: ${lead.phone}`);
        }
      }
    }
    res.json({ ok: true, total_found: leads.length, new_leads: saved, leads });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/ads-intelligence/capi-event - Manuel CAPI eventi
router.post('/capi-event', async (req: any, res: any) => {
  try {
    const { eventName, email, phone, leadId, value } = req.body;
    await sendEventToCAPI(req.userId, {
      eventName, eventTime: Math.floor(Date.now() / 1000),
      email, phone, leadId, value,
    });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/ads-intelligence/lead-quality - Lead kalite geri besleme
router.post('/lead-quality', async (req: any, res: any) => {
  try {
    const { leadId, quality } = req.body;
    await sendLeadQualityFeedback(req.userId, leadId, quality);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/ads-intelligence/create-lookalike - Lookalike audience
router.post('/create-lookalike', async (req: any, res: any) => {
  try {
    const adAccountId = process.env.META_AD_ACCOUNT_ID || '';
    const result = await createLookalikeAudience(req.userId, adAccountId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ ok: true, ...result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/audiences - Audience listesi
router.get('/audiences', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_audiences').select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ audiences: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/performance
router.get('/performance', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const token = await getMetaToken(userId);
    if (!token) return res.status(400).json({ error: 'Meta hesabi bagli degil' });
    const adAccountId = process.env.META_AD_ACCOUNT_ID || '';
    const alerts = await analyzePerformance(userId, adAccountId, token);
    const campaigns = await metaGet(`/${adAccountId}/campaigns`, token, {
      fields: 'id,name,status,objective,daily_budget', limit: 50,
    });
    const insights: any[] = [];
    for (const c of (campaigns.data || []).slice(0, 10)) {
      try {
        const ins = await metaGet(`/${c.id}/insights`, token, {
          fields: 'impressions,clicks,spend,ctr,cpm,reach,actions', date_preset: 'last_7d',
        });
        if (ins.data?.[0]) insights.push({ ...c, ...ins.data[0] });
      } catch {}
    }
    res.json({ ok: true, alerts, campaigns: insights, total_alerts: alerts.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/alerts
router.get('/alerts', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_alerts').select('*').eq('user_id', req.userId).eq('is_read', false).order('created_at', { ascending: false });
    res.json({ alerts: data || [], count: data?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/ads-intelligence/alerts/:id/read
router.patch('/alerts/:id/read', async (req: any, res: any) => {
  try {
    await supabase.from('ad_alerts').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/dashboard
router.get('/dashboard', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const token = await getMetaToken(userId);
    if (!token) return res.status(400).json({ error: 'Meta bagli degil' });
    const adAccountId = process.env.META_AD_ACCOUNT_ID || '';
    const [accountInsights, alerts, recentLeads, settings, audiences] = await Promise.allSettled([
      metaGet(`/${adAccountId}/insights`, token, {
        fields: 'impressions,clicks,spend,ctr,cpm,reach,actions', date_preset: 'last_30d',
      }),
      supabase.from('ad_alerts').select('*').eq('user_id', userId).eq('is_read', false).limit(5),
      supabase.from('leads').select('*').eq('user_id', userId).like('source', 'meta%').order('created_at', { ascending: false }).limit(10),
      supabase.from('ad_settings').select('*').eq('user_id', userId).single(),
      supabase.from('ad_audiences').select('*').eq('user_id', userId).limit(5),
    ]);
    const summary = accountInsights.status === 'fulfilled' ? accountInsights.value.data?.[0] : null;
    res.json({
      summary: {
        spend: parseFloat(summary?.spend || '0'),
        impressions: parseInt(summary?.impressions || '0'),
        clicks: parseInt(summary?.clicks || '0'),
        ctr: parseFloat(summary?.ctr || '0'),
        cpm: parseFloat(summary?.cpm || '0'),
        reach: parseInt(summary?.reach || '0'),
      },
      alerts: alerts.status === 'fulfilled' ? alerts.value.data || [] : [],
      recent_leads: recentLeads.status === 'fulfilled' ? recentLeads.value.data || [] : [],
      settings: settings.status === 'fulfilled' ? settings.value.data || {} : {},
      audiences: audiences.status === 'fulfilled' ? audiences.value.data || [] : [],
      last_updated: new Date().toISOString(),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/ads-intelligence/ai-optimize - AI optimizasyon
router.post('/ai-optimize', async (req: any, res: any) => {
  try {
    const { campaignId, campaignName, metrics } = req.body;
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Meta reklam kampanyasi analiz et ve optimizasyon onerisi ver.
Sirket: ${profile?.company?.name || ''}
Urun: ${profile?.product?.description || ''}
Kampanya: ${campaignName}
Metrikler (son 7 gun):
- Harcama: $${metrics?.spend || 0}
- Gosterim: ${metrics?.impressions || 0}
- Tiklama: ${metrics?.clicks || 0}
- CTR: %${metrics?.ctr || 0}
- CPM: $${metrics?.cpm || 0}
- Erisim: ${metrics?.reach || 0}
- Frekans: ${metrics?.frequency || 0}

Sektore gore benchmark CTR %1-3, CPM $5-20 olmali.

JSON formatinda don:
{
  "overall_score": 1-10,
  "summary": "kisa ozet Turkce",
  "health": "good|warning|critical",
  "problems": ["sorun1"],
  "quick_wins": [{"action": "yapilacak is", "impact": "high|medium|low", "effort": "high|medium|low"}],
  "ad_copy_alternatives": ["alternatif metin 1", "alternatif metin 2", "alternatif metin 3"],
  "audience_suggestion": "hedef kitle onerisi",
  "budget_suggestion": "butce onerisi",
  "next_creative_idea": "yeni kreatif fikri"
}`
      }],
    });
    const text = r.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    const analysis = match ? JSON.parse(match[0]) : { summary: text };
    await supabase.from('ad_optimizations').insert([{
      user_id: req.userId, campaign_id: campaignId,
      analysis: JSON.stringify(analysis), created_at: new Date().toISOString(),
    }]);
    res.json({ ok: true, analysis });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/ad-settings
router.get('/ad-settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_settings').select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || { five_minute_rule: true, call_delay_minutes: 5 } });
  } catch { res.json({ settings: { five_minute_rule: true, call_delay_minutes: 5 } }); }
});

// ── OTOMATİK SİSTEM ─────────────────────────────────────
async function runAutoSystem() {
  console.log('[AdsAuto] Otomatik sistem calisiyor...');
  try {
    const { data: connections } = await supabase.from('meta_connections').select('user_id, access_token, ad_accounts').not('access_token', 'is', null);
    for (const conn of connections || []) {
      try {
        let adAccountId = '';
        try { const accs = JSON.parse(conn.ad_accounts || '[]'); adAccountId = accs[0]?.id || ''; } catch {}
        if (!adAccountId) { console.log(`[AdsAuto] User ${conn.user_id}: ad account yok, atlaniyor`); continue; }
        const leads = await extractLeadsFromAllCampaigns(conn.user_id, adAccountId, conn.access_token);
        const { data: settings } = await supabase.from('ad_settings').select('*').eq('user_id', conn.user_id).single();
        let saved = 0;
        for (const lead of leads) {
          const result = await saveLeadToCRM(conn.user_id, lead);
          if (result) {
            saved++;
            if (settings?.five_minute_rule !== false && lead.phone) {
              const delay = (settings?.call_delay_minutes || 5) * 60 * 1000;
              setTimeout(() => triggerFiveMinuteCall(conn.user_id, result), delay);
            }
          }
        }
        await analyzePerformance(conn.user_id, adAccountId, conn.access_token);
        if (saved > 0) console.log(`[AdsAuto] User ${conn.user_id}: ${saved} yeni lead`);
      } catch (e: any) { console.error(`[AdsAuto] User hatasi:`, e.message); }
    }
  } catch (e: any) { console.error('[AdsAuto] Ana hata:', e.message); }
}

setInterval(runAutoSystem, 10 * 60 * 1000);
setTimeout(runAutoSystem, 3 * 60 * 1000);

module.exports = router;