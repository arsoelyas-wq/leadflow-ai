export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GRAPH = 'https://graph.facebook.com/v20.0';

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

    // Kazanılan leadleri deal_value ile çek — value-based lookalike için
    const { data: convertedLeads } = await supabase
      .from('leads')
      .select('email, phone, deal_value')
      .eq('user_id', userId)
      .eq('outcome', 'positive')
      .not('email', 'is', null)
      .limit(500);

    // Ayrıca status=won olanları da dahil et
    const { data: wonLeads } = await supabase
      .from('leads')
      .select('email, phone, deal_value')
      .eq('user_id', userId)
      .eq('status', 'won')
      .not('email', 'is', null)
      .limit(500);

    // Birleştir, email'e göre deduplicate
    const allLeads = [...(convertedLeads || []), ...(wonLeads || [])];
    const seen = new Set<string>();
    const uniqueLeads = allLeads.filter((l: any) => {
      if (!l.email || seen.has(l.email)) return false;
      seen.add(l.email); return true;
    });

    if (uniqueLeads.length < 20) {
      return { error: 'En az 20 donusen lead gerekli (su an: ' + uniqueLeads.length + ')' };
    }

    // Value-based schema — yüksek değerli müşterilere daha fazla ağırlık verir
    const schema = ['EMAIL', 'PHONE', 'VALUE'];
    const rows = uniqueLeads.map((l: any) => [
      hashData(l.email?.toLowerCase() || ''),
      hashData(l.phone?.replace(/\D/g, '') || ''),
      String(l.deal_value || 1000), // deal_value yoksa varsayılan 1000 TRY
    ]);

    const customAudienceRes = await metaPost(`/${adAccountId}/customaudiences`, token, {
      name: `LeadFlow Donusen Musteriler ${new Date().toLocaleDateString('tr-TR')}`,
      description: `LeadFlow CRM donusen musteriler — ${uniqueLeads.length} kisi, deger agirlikli`,
      subtype: 'CUSTOM',
      customer_file_source: 'PARTNER_PROVIDED_ONLY',
    });

    const audienceId = customAudienceRes.id;
    await metaPost(`/${audienceId}/users`, token, { schema, data: rows });

    // Value-based Lookalike — similarity değil value ile öğrenir
    const lookalikeRes = await metaPost(`/${adAccountId}/customaudiences`, token, {
      name: `LeadFlow Value Lookalike ${new Date().toLocaleDateString('tr-TR')}`,
      subtype: 'LOOKALIKE',
      origin_audience_id: audienceId,
      lookalike_spec: { type: 'value', ratio: 0.01, country: 'TR' },
    });

    await supabase.from('ad_audiences').insert([{
      user_id: userId,
      audience_id: lookalikeRes.id,
      source_audience_id: audienceId,
      name: lookalikeRes.name,
      type: 'value_lookalike',
      size_estimate: uniqueLeads.length,
      created_at: new Date().toISOString(),
    }]);

    console.log(`[Lookalike] Value-based güncellendi: ${uniqueLeads.length} müşteri → ${lookalikeRes.id}`);
    return { ok: true, audienceId: lookalikeRes.id, name: lookalikeRes.name, sourceSize: uniqueLeads.length };
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

// ── WA OTOMATİK MESAJ ───────────────────────────────────
const WA_GATEWAY = process.env.WA_GATEWAY || 'http://207.154.248.119:3003';
const WA_SECRET  = process.env.WA_SECRET  || 'leadflow-wa-secret-2026';

async function sendWhatsAppToLead(userId: string, lead: any) {
  try {
    if (!lead?.phone) return;
    const { data: instance } = await supabase
      .from('wa_instances')
      .select('instance_id')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .limit(1)
      .single();
    if (!instance) return;
    const { data: settings } = await supabase
      .from('ad_settings')
      .select('wa_auto_message, wa_message_template, wa_message_delay_minutes')
      .eq('user_id', userId)
      .single();
    if (!settings?.wa_auto_message) return;
    let phone = String(lead.phone).replace(/\D/g, '');
    if (!phone.startsWith('90') && phone.length === 10) phone = '90' + phone;
    const text = (settings.wa_message_template || 'Merhaba {isim}! Reklamımızı gördüğünüz için teşekkürler. Size nasıl yardımcı olabiliriz?')
      .replace('{isim}', lead.name || lead.company_name || 'Değerli Müşteri');
    const delayMs = (settings.wa_message_delay_minutes || 1) * 60 * 1000;
    setTimeout(async () => {
      try {
        await axios.post(`${WA_GATEWAY}/send`, { secret: WA_SECRET, instanceId: instance.instance_id, phone, text });
        console.log(`[WAAuto] Mesaj gönderildi: ${phone}`);
      } catch (e: any) { console.error('[WAAuto] Gönderim hatası:', e.message); }
    }, delayMs);
  } catch (e: any) { console.error('[WAAuto] Hata:', e.message); }
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

// POST /api/ads-intelligence/wa-settings
router.post('/wa-settings', async (req: any, res: any) => {
  try {
    const { wa_auto_message, wa_message_template, wa_message_delay_minutes } = req.body;
    await supabase.from('ad_settings').upsert([{
      user_id: req.userId,
      wa_auto_message: !!wa_auto_message,
      wa_message_template: wa_message_template || 'Merhaba {isim}! Reklamımızı gördüğünüz için teşekkürler.',
      wa_message_delay_minutes: wa_message_delay_minutes || 1,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

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
    const { data: metaConn } = await supabase.from('meta_connections').select('ad_accounts').eq('user_id', userId).single();
    let adAccountId = '';
    try { const accs = JSON.parse(metaConn?.ad_accounts || '[]'); adAccountId = accs[0]?.id || ''; } catch {}
    if (!adAccountId) return res.status(400).json({ error: 'Meta reklam hesabi bulunamadi' });
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
        // WhatsApp otomatik mesaj
        sendWhatsAppToLead(userId, { ...lead, ...result });
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
      model: 'claude-haiku-4-5-20251001',
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
            sendWhatsAppToLead(conn.user_id, { ...lead, ...result });
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

// ── HELPERS ──────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

// POST /api/ads-intelligence/ai-create-campaign
router.post('/ai-create-campaign', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const { businessDescription, goal, dailyBudget, currency, avgDealValue } = req.body;

    let profileSummary = '';
    try {
      const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
      if (profile) {
        profileSummary = `Şirket: ${profile.company?.name || ''}, Ürün: ${profile.product?.description || ''}`;
      }
    } catch {}

    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `You are Meta's top advertising strategist with 10+ years managing campaigns for businesses in Turkey. Expert in Facebook/Instagram audience targeting, scroll-stopping ad copy, and budget optimization.

TURKISH MARKET (always apply):
- Price-sensitive buyers → include value anchoring
- WhatsApp CTA converts 3x better for lead generation
- Peak hours: 19:00-22:00 Istanbul time
- Use urgency: "Son 3 gün", "48 saat kaldı", "Sınırlı kişi"
- Trust signals: "10+ yıl tecrübe", "5000+ müşteri", "Ücretsiz danışmanlık"
- 1 USD ≈ 32 TRY → use realistic TRY CPM/CPC estimates
- 78% mobile users → mobile-first creative strategy
- Conversational Turkish tone converts better

Return ONLY valid JSON, no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `İşletme: ${businessDescription}\nProfil: ${profileSummary}\nHedef: ${goal}\nGünlük Bütçe: ${dailyBudget} ${currency || 'TRY'}\nOrtalama Müşteri Değeri: ${avgDealValue || 'belirtilmedi'} TRY`,
      }],
    });

    const text = r.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid AI response');
    const plan = JSON.parse(match[0]);

    let savedId: any = null;
    try {
      const { data: saved } = await supabase.from('ad_campaigns').insert([{
        user_id: userId,
        platform: 'meta',
        name: plan.campaign_name,
        status: 'draft',
        goal,
        daily_budget: dailyBudget,
        campaign_plan: plan,
        avg_deal_value: avgDealValue || 0,
        created_at: new Date().toISOString(),
      }]).select().single();
      savedId = saved?.id;
    } catch {}

    res.json({ ok: true, draft: { id: savedId, ...plan } });
  } catch (e: any) {
    console.error('[AI Campaign] Error:', e.message?.slice(0, 120));
    res.json({ ok: false, error: `Kampanya planı oluşturulamadı: ${e.message?.slice(0, 80)}` });
  }
});

// POST /api/ads-intelligence/launch-campaign
router.post('/launch-campaign', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;
    const { draftId, campaignPlan } = req.body;
    const plan = campaignPlan;

    const { data: metaConn } = await supabase.from('meta_connections').select('access_token, ad_accounts').eq('user_id', userId).single();
    const token = metaConn?.access_token;
    let adAccountId = '';
    try { adAccountId = JSON.parse(metaConn?.ad_accounts || '[]')[0]?.id || ''; } catch {}

    if (!token || !adAccountId) {
      return res.json({ ok: false, error: 'Meta hesabınızı bağlayın' });
    }

    const GRAPH_V20 = 'https://graph.facebook.com/v20.0';
    const dailyBudget = plan.budget?.daily_budget || 200;

    let campaignId: string;
    let adsetId: string;

    try {
      const campaignRes: any = await withRetry(() =>
        axios.post(`${GRAPH_V20}/${adAccountId}/campaigns`, {
          name: plan.campaign_name,
          objective: plan.objective || 'LEAD_GENERATION',
          status: 'ACTIVE',
          special_ad_categories: [],
          access_token: token,
        }, { timeout: 15000 }).then((r: any) => r.data)
      );
      campaignId = campaignRes.id;

      const adsetRes: any = await withRetry(() =>
        axios.post(`${GRAPH_V20}/${adAccountId}/adsets`, {
          name: plan.audiences?.[0]?.name || 'Ana Kitle',
          campaign_id: campaignId,
          daily_budget: dailyBudget * 100,
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LEAD_GENERATION',
          status: 'ACTIVE',
          targeting: {
            age_min: plan.audiences?.[0]?.age_min || 25,
            age_max: plan.audiences?.[0]?.age_max || 55,
            geo_locations: { countries: ['TR'] },
            interests: [],
          },
          access_token: token,
        }, { timeout: 15000 }).then((r: any) => r.data)
      );
      adsetId = adsetRes.id;
    } catch (e: any) {
      try {
        await supabase.from('ad_campaigns').update({ status: 'draft' }).eq('id', draftId);
      } catch {}
      return res.json({ ok: false, error: 'Meta kampanya oluşturulamadı. Reklam hesabı izinlerinizi kontrol edin.' });
    }

    try {
      await supabase.from('ad_campaigns').update({ platform_campaign_id: campaignId, status: 'active' }).eq('id', draftId);
    } catch {}

    try {
      await supabase.from('ad_activity').insert([{
        user_id: userId,
        platform: 'meta',
        type: 'campaign_launched',
        message: `${plan.campaign_name} kampanyası yayınlandı`,
        created_at: new Date().toISOString(),
      }]);
    } catch {}

    res.json({ ok: true, campaignId, message: 'Kampanya başlatıldı! Meta onayı 1-24 saat sürebilir.' });
  } catch (e: any) {
    res.json({ ok: false, error: 'Meta kampanya oluşturulamadı. Reklam hesabı izinlerinizi kontrol edin.' });
  }
});

// GET /api/ads-intelligence/activity
router.get('/activity', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId;

    const [activityRes, leadsRes, alertsRes, campaignsRes] = await Promise.allSettled([
      supabase.from('ad_activity').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).like('source', 'meta%').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supabase.from('ad_alerts').select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false }).limit(3),
      supabase.from('ad_campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(2),
    ]);

    const activities: any[] = [];

    const adActivityItems: any[] = activityRes.status === 'fulfilled' ? activityRes.value.data || [] : [];
    for (const item of adActivityItems) {
      activities.push({
        id: item.id,
        type: item.type,
        message: item.message,
        platform: item.platform,
        time_ago: timeAgo(item.created_at),
        severity: 'info',
      });
    }

    const leads24h: number = leadsRes.status === 'fulfilled' ? (leadsRes.value.count || 0) : 0;
    const hasLeadActivity = adActivityItems.some((a: any) => a.type === 'new_leads');
    if (leads24h > 0 && !hasLeadActivity) {
      activities.push({
        type: 'new_leads',
        message: `${leads24h} yeni Meta lead geldi`,
        platform: 'meta',
        time_ago: 'bugün',
        count: leads24h,
      });
    }

    const alertItems: any[] = alertsRes.status === 'fulfilled' ? alertsRes.value.data || [] : [];
    for (const alert of alertItems) {
      activities.push({
        type: 'alert',
        message: alert.message,
        platform: 'meta',
        time_ago: timeAgo(alert.created_at),
        severity: alert.severity,
      });
    }

    const unified = activities.slice(0, 10);

    res.json({ ok: true, activities: unified, leads_today: leads24h });
  } catch (e: any) {
    res.json({ ok: true, activities: [], leads_today: 0 });
  }
});

// ── AYLIK OTOMATİK VALUE LOOKALIKE GÜNCELLEME ────────────
// Her ayın 1'i saat 09:00'da, Meta hesabı olan tüm kullanıcılar için güncelle
require('node-cron').schedule('0 9 1 * *', async () => {
  console.log('[Lookalike] Aylık value-based güncelleme başlıyor...');
  try {
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('user_id, ad_account_id')
      .not('access_token', 'is', null)
      .not('ad_account_id', 'is', null);

    for (const conn of connections || []) {
      try {
        const result = await createLookalikeAudience(conn.user_id, conn.ad_account_id);
        if ((result as any).ok) {
          console.log(`[Lookalike] ${conn.user_id}: ${(result as any).sourceSize} müşteri → başarılı`);
        }
      } catch { /* tek kullanıcı hatası diğerlerini etkilemez */ }
      await new Promise(r => setTimeout(r, 2000)); // rate limit
    }
  } catch (e: any) {
    console.error('[Lookalike] Aylık güncelleme hatası:', e.message);
  }
});

// ── 1-CLICK QUALITY LEAD (Privyr-style) ──────────────────────────────────────
router.post('/quality-signal', async (req: any, res: any) => {
  try {
    const { leadId, quality } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadi' });

    const qualityType = quality || 'qualified';
    const eventMap: Record<string, { event: string; value: number }> = {
      'qualified': { event: 'Lead', value: 0 },
      'meeting_booked': { event: 'Schedule', value: 0 },
      'proposal_sent': { event: 'InitiateCheckout', value: 0 },
      'negotiating': { event: 'AddToCart', value: lead.deal_value || 0 },
      'won': { event: 'Purchase', value: lead.deal_value || lead.total_value || 0 },
      'unqualified': { event: 'ViewContent', value: 0 },
    };

    const mapped = eventMap[qualityType] || eventMap['qualified'];

    // Fire CAPI event
    try {
      const { fireCapiEvent } = require('../services/meta-capi');
      await fireCapiEvent(supabase, req.userId, lead, mapped.event, { value: mapped.value });
    } catch {}

    // Update lead status
    const statusMap: Record<string, string> = {
      'qualified': 'interested', 'meeting_booked': 'contacted',
      'proposal_sent': 'proposal', 'negotiating': 'negotiating',
      'won': 'won', 'unqualified': 'lost',
    };
    if (statusMap[qualityType]) {
      const updates: any = { status: statusMap[qualityType], updated_at: new Date().toISOString() };
      if (qualityType === 'won') updates.won_at = new Date().toISOString();
      await supabase.from('leads').update(updates).eq('id', leadId);
    }

    // Log
    await supabase.from('ad_lead_events').insert([{
      user_id: req.userId, lead_id: leadId,
      event_type: 'quality_signal', event_data: { quality: qualityType, capiEvent: mapped.event },
      created_at: new Date().toISOString(),
    }]);

    res.json({ ok: true, quality: qualityType, capiEvent: mapped.event, message: `Lead "${qualityType}" olarak isaretlendi ve Meta'ya sinyal gonderildi` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CONFIGURABLE FUNNEL STAGES ───────────────────────────────────────────────
router.get('/funnel-config', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('ad_settings').select('funnel_stages').eq('user_id', req.userId).maybeSingle();
    const defaultStages = [
      { id: 'new', label: 'Yeni Lead', capiEvent: 'Lead', isPositive: true },
      { id: 'contacted', label: 'Iletisim Kuruldu', capiEvent: 'Contact', isPositive: true },
      { id: 'interested', label: 'Ilgileniyor', capiEvent: 'Lead', isPositive: true },
      { id: 'meeting_booked', label: 'Toplanti Ayarlandi', capiEvent: 'Schedule', isPositive: true },
      { id: 'proposal', label: 'Teklif Gonderildi', capiEvent: 'InitiateCheckout', isPositive: true },
      { id: 'negotiating', label: 'Pazarlik', capiEvent: 'AddToCart', isPositive: true },
      { id: 'won', label: 'Kazanildi', capiEvent: 'Purchase', isPositive: true },
      { id: 'lost', label: 'Kaybedildi', capiEvent: 'ViewContent', isPositive: false },
    ];
    res.json({ stages: data?.funnel_stages || defaultStages });
  } catch { res.json({ stages: [] }); }
});

router.post('/funnel-config', async (req: any, res: any) => {
  try {
    const { stages } = req.body;
    if (!stages?.length) return res.status(400).json({ error: 'stages zorunlu' });
    const { data: existing } = await supabase.from('ad_settings').select('id').eq('user_id', req.userId).maybeSingle();
    if (existing) await supabase.from('ad_settings').update({ funnel_stages: stages, updated_at: new Date().toISOString() }).eq('user_id', req.userId);
    else await supabase.from('ad_settings').insert([{ user_id: req.userId, funnel_stages: stages }]);
    res.json({ ok: true, message: 'Funnel stage\'ler kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── WEEKLY META PERFORMANCE REPORT ───────────────────────────────────────────
router.get('/weekly-report', async (req: any, res: any) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const prevWeek = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [leadsRes, prevLeadsRes, eventsRes, wonRes] = await Promise.allSettled([
      supabase.from('leads').select('id, source, score, status').eq('user_id', req.userId).gte('created_at', weekAgo),
      supabase.from('leads').select('id').eq('user_id', req.userId).gte('created_at', prevWeek).lt('created_at', weekAgo),
      supabase.from('meta_capi_events').select('event_name, success').eq('user_id', req.userId).gte('fired_at', weekAgo),
      supabase.from('leads').select('id, deal_value, total_value').eq('user_id', req.userId).eq('status', 'won').gte('won_at', weekAgo),
    ]);

    const leads = leadsRes.status === 'fulfilled' ? leadsRes.value.data || [] : [];
    const prevLeads = prevLeadsRes.status === 'fulfilled' ? prevLeadsRes.value.data || [] : [];
    const events = eventsRes.status === 'fulfilled' ? eventsRes.value.data || [] : [];
    const wonLeads = wonRes.status === 'fulfilled' ? wonRes.value.data || [] : [];

    const metaLeads = leads.filter((l: any) => (l.source || '').toLowerCase().includes('meta') || (l.source || '').toLowerCase().includes('facebook'));
    const revenue = wonLeads.reduce((s: number, l: any) => s + (l.deal_value || l.total_value || 0), 0);
    const successEvents = events.filter((e: any) => e.success).length;
    const leadGrowth = prevLeads.length > 0 ? Math.round(((leads.length - prevLeads.length) / prevLeads.length) * 100) : 0;

    const report = {
      period: 'Haftalik',
      totalLeads: leads.length,
      metaLeads: metaLeads.length,
      prevWeekLeads: prevLeads.length,
      leadGrowth,
      wonCount: wonLeads.length,
      revenue,
      capiEvents: events.length,
      capiSuccess: successEvents,
      avgScore: leads.length > 0 ? Math.round(leads.reduce((s: number, l: any) => s + (l.score || 0), 0) / leads.length) : 0,
      summary: `Bu hafta ${leads.length} lead geldi (${leadGrowth > 0 ? '+' : ''}${leadGrowth}% onceki haftaya gore). ${wonLeads.length} satis kapandi${revenue > 0 ? `, toplam ${revenue.toLocaleString('tr-TR')} TL gelir` : ''}. Meta CAPI ${successEvents}/${events.length} event basariyla gonderildi.`,
    };

    res.json(report);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── SEND WEEKLY REPORT VIA WHATSAPP ──────────────────────────────────────────
router.post('/send-weekly-report', async (req: any, res: any) => {
  try {
    // Get report data
    const reportRes = await fetch(`${process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app'}/api/ads-intelligence/weekly-report`, {
      headers: { Authorization: req.headers.authorization },
    });
    const report = await reportRes.json();

    const msg = `📊 *Haftalik Meta Reklam Raporu*\n\n` +
      `📋 Lead: ${report.totalLeads} (${report.leadGrowth > 0 ? '+' : ''}${report.leadGrowth}%)\n` +
      `📘 Meta Lead: ${report.metaLeads}\n` +
      `🏆 Satis: ${report.wonCount}\n` +
      `💰 Gelir: ${report.revenue > 0 ? report.revenue.toLocaleString('tr-TR') + ' TL' : '—'}\n` +
      `📡 CAPI: ${report.capiSuccess}/${report.capiEvents} basarili\n` +
      `⭐ Ort. Skor: ${report.avgScore}/100\n\n` +
      `sovlo.io/ads`;

    try {
      const { data: us } = await supabase.from('user_settings').select('phone').eq('user_id', req.userId).single();
      if (us?.phone) {
        const { sendWhatsAppMessage } = require('./settings');
        await sendWhatsAppMessage(req.userId, us.phone, msg);
      }
    } catch {}

    res.json({ ok: true, report, message: 'Haftalik rapor gonderildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── INSTANT LEAD ALERT (on new Meta lead) ────────────────────────────────────
router.post('/instant-alert', async (req: any, res: any) => {
  try {
    const { leadId } = req.body;
    const { data: lead } = await supabase.from('leads').select('company_name, contact_name, phone, email, source, score')
      .eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadi' });

    const msg = `🚨 *Yeni Lead!*\n\n` +
      `🏢 ${lead.company_name || '—'}\n` +
      `👤 ${lead.contact_name || '—'}\n` +
      `📱 ${lead.phone || '—'}\n` +
      `📧 ${lead.email || '—'}\n` +
      `📊 Skor: ${lead.score || 0}/100\n` +
      `📌 Kaynak: ${lead.source || '—'}\n\n` +
      `⚡ Hemen iletisime gecin!`;

    try {
      const { data: us } = await supabase.from('user_settings').select('phone').eq('user_id', req.userId).single();
      if (us?.phone) {
        const { sendWhatsAppMessage } = require('./settings');
        await sendWhatsAppMessage(req.userId, us.phone, msg);
      }
    } catch {}

    res.json({ ok: true, message: 'Alert gonderildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── META ONBOARDING — auto-analyze on first connect ─────────────────────────
router.get('/onboarding-status', async (req: any, res: any) => {
  try {
    const { data: conn } = await supabase.from('meta_connections').select('connected_at, ad_accounts').eq('user_id', req.userId).maybeSingle();
    if (!conn) return res.json({ connected: false, onboarded: false });

    const { data: campaigns } = await supabase.from('ad_campaigns').select('id').eq('user_id', req.userId).limit(1);
    const { data: capiSettings } = await supabase.from('user_settings').select('meta_pixel_id, meta_capi_enabled').eq('user_id', req.userId).maybeSingle();
    const { data: leads } = await supabase.from('leads').select('id').eq('user_id', req.userId).ilike('source', '%meta%').limit(1);

    const capiActive = capiSettings?.meta_capi_enabled && capiSettings?.meta_pixel_id && capiSettings.meta_pixel_id.length > 5;

    const steps = [
      { id: 'connect', label: 'Meta Baglantisi', done: true },
      { id: 'extract', label: 'Lead Cekme', done: (leads?.length || 0) > 0 },
      { id: 'capi', label: 'CAPI Aktivasyonu', done: !!capiActive },
      { id: 'campaign', label: 'Ilk Kampanya', done: (campaigns?.length || 0) > 0 },
    ];
    const progress = Math.round((steps.filter(s => s.done).length / steps.length) * 100);

    res.json({ connected: true, onboarded: progress === 100, progress, steps });
  } catch { res.json({ connected: false, onboarded: false, progress: 0, steps: [] }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// KATMAN 1: ONBOARDING — Meta baglandiginda otomatik analiz
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/onboarding-run', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const results: any = { leadsExtracted: 0, campaignsAnalyzed: 0, insights: [], alerts: [] };

    // 1. Lead extraction
    try {
      const extRes = await fetch(`${process.env.VITE_API_URL || 'https://leadflow-ai-production.up.railway.app'}/api/ads-intelligence/extract-leads`, {
        headers: { Authorization: req.headers.authorization },
      });
      const extData = await extRes.json();
      results.leadsExtracted = extData.new_leads || extData.total_found || 0;
    } catch {}

    // 2. Campaign analysis
    const { data: conn } = await supabase.from('meta_connections').select('access_token, ad_accounts').eq('user_id', userId).maybeSingle();
    if (conn?.access_token) {
      try {
        const accs = typeof conn.ad_accounts === 'string' ? JSON.parse(conn.ad_accounts) : conn.ad_accounts || [];
        const adAccountId = accs[0]?.id;
        if (adAccountId) {
          const campRes = await axios.get(`${GRAPH}/${adAccountId}/campaigns`, {
            params: { access_token: conn.access_token, fields: 'id,name,status,daily_budget,insights{spend,impressions,clicks,ctr,cpm,actions}', limit: 10 },
            timeout: 15000,
          });
          const campaigns = campRes.data?.data || [];
          results.campaignsAnalyzed = campaigns.length;

          // Generate insights
          let totalSpend = 0, totalLeads = 0, wastedSpend = 0;
          for (const c of campaigns) {
            const insights = c.insights?.data?.[0] || {};
            const spend = parseFloat(insights.spend || '0');
            const leads = (insights.actions || []).find((a: any) => a.action_type === 'lead')?.value || 0;
            totalSpend += spend;
            totalLeads += parseInt(leads);
            if (spend > 50 && parseInt(leads) === 0) {
              wastedSpend += spend;
              results.alerts.push({ type: 'waste', campaign: c.name, spend, message: `${c.name}: ₺${spend.toFixed(0)} harcanmis ama 0 lead` });
            }
            if (parseFloat(insights.ctr || '0') < 0.5 && parseFloat(insights.spend || '0') > 20) {
              results.alerts.push({ type: 'low_ctr', campaign: c.name, ctr: insights.ctr, message: `${c.name}: CTR %${insights.ctr} — cok dusuk` });
            }
          }
          if (wastedSpend > 0) results.insights.push(`Kampanyalarinizda ₺${wastedSpend.toFixed(0)} israf tespit edildi — duzeltebiliriz!`);
          if (totalLeads > 0) results.insights.push(`Son donemde ${totalLeads} lead geldi — CAPI ile kaliteyi arttirabiliriz`);
          if (totalSpend > 0 && totalLeads > 0) results.insights.push(`Ortalama lead maliyeti: ₺${(totalSpend / totalLeads).toFixed(0)} — optimize edilebilir`);
        }
      } catch {}
    }

    // 3. Save onboarding result
    await supabase.from('ad_activity').insert([{
      user_id: userId, platform: 'meta', type: 'onboarding',
      message: `Onboarding: ${results.leadsExtracted} lead cekildi, ${results.campaignsAnalyzed} kampanya analiz edildi, ${results.alerts.length} uyari`,
      created_at: new Date().toISOString(),
    }]);

    res.json({ ok: true, ...results, message: `${results.leadsExtracted} lead cekildi, ${results.alerts.length} sorun tespit edildi` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// KATMAN 2: 7/24 MOTOR — saatlik/gunluk/haftalik cron isler
// ═══════════════════════════════════════════════════════════════════════════════

// Saatlik kampanya sagligi kontrolu
async function hourlyHealthCheck() {
  try {
    const { data: connections } = await supabase.from('meta_connections').select('user_id, access_token, ad_accounts');
    for (const conn of (connections || [])) {
      try {
        const accs = typeof conn.ad_accounts === 'string' ? JSON.parse(conn.ad_accounts) : conn.ad_accounts || [];
        const adAccountId = accs[0]?.id;
        if (!adAccountId || !conn.access_token) continue;

        const campRes = await axios.get(`${GRAPH}/${adAccountId}/campaigns`, {
          params: { access_token: conn.access_token, fields: 'id,name,status,insights{spend,impressions,clicks,actions}', limit: 10, effective_status: '["ACTIVE"]' },
          timeout: 15000,
        });

        for (const c of (campRes.data?.data || [])) {
          const ins = c.insights?.data?.[0] || {};
          const spend = parseFloat(ins.spend || '0');
          const leads = (ins.actions || []).find((a: any) => a.action_type === 'lead')?.value || 0;

          if (spend > 100 && parseInt(leads) === 0) {
            await supabase.from('ad_alerts').upsert([{
              user_id: conn.user_id, platform: 'meta', campaign_id: c.id,
              alert_type: 'no_results', severity: 'critical',
              message: `${c.name}: ₺${spend.toFixed(0)} harcanmis ama 0 lead — kampanya durdurulmali mi?`,
              created_at: new Date().toISOString(), is_read: false,
            }], { onConflict: 'user_id,campaign_id,alert_type' });
          }
        }
      } catch {}
    }
  } catch (e: any) { console.error('[Meta Hourly] Error:', e.message?.slice(0, 60)); }
}
setInterval(hourlyHealthCheck, 60 * 60 * 1000);

// Haftalik otomatik rapor (Pazartesi 09:00)
async function weeklyAutoReport() {
  try {
    const { data: connections } = await supabase.from('meta_connections').select('user_id');
    for (const conn of (connections || [])) {
      try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: leads } = await supabase.from('leads').select('id, source, status').eq('user_id', conn.user_id).gte('created_at', weekAgo);
        const { data: won } = await supabase.from('leads').select('deal_value, total_value').eq('user_id', conn.user_id).eq('status', 'won').gte('won_at', weekAgo);
        const { data: events } = await supabase.from('meta_capi_events').select('success').eq('user_id', conn.user_id).gte('fired_at', weekAgo);

        const totalLeads = leads?.length || 0;
        const wonCount = won?.length || 0;
        const revenue = (won || []).reduce((s: number, l: any) => s + (l.deal_value || l.total_value || 0), 0);
        const capiOk = (events || []).filter((e: any) => e.success).length;

        if (totalLeads === 0 && wonCount === 0) continue;

        const msg = `📊 *Haftalik Meta Rapor*\n\n📋 ${totalLeads} lead\n🏆 ${wonCount} satis\n💰 ${revenue > 0 ? revenue.toLocaleString('tr-TR') + ' TL' : '—'}\n📡 CAPI: ${capiOk} basarili event\n\nDetay: sovlo.io/ads`;

        try {
          const { data: us } = await supabase.from('user_settings').select('phone').eq('user_id', conn.user_id).single();
          if (us?.phone) {
            const { sendWhatsAppMessage } = require('./settings');
            sendWhatsAppMessage(conn.user_id, us.phone, msg).catch(() => {});
          }
        } catch {}
      } catch {}
    }
    console.log('[Meta Weekly] Reports sent');
  } catch {}
}

// Pazartesi 09:00'da haftalik rapor
const scheduleWeekly = () => {
  const now = new Date();
  const next = new Date();
  next.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  next.setHours(9, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 7);
  setTimeout(() => { weeklyAutoReport(); setInterval(weeklyAutoReport, 7 * 24 * 60 * 60 * 1000); }, next.getTime() - now.getTime());
  console.log(`[Meta] Haftalik rapor ${next.toLocaleString('tr-TR')}'de planlandir`);
};
scheduleWeekly();

// ═══════════════════════════════════════════════════════════════════════════════
// KATMAN 4: RETENTION — musteri basari metrikleri + tahmin
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/success-metrics', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [leadsRes, prevLeadsRes, wonRes, eventsRes, campaignsRes] = await Promise.allSettled([
      supabase.from('leads').select('id, score, source').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
      supabase.from('leads').select('id').eq('user_id', userId).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
      supabase.from('leads').select('deal_value, total_value, won_at').eq('user_id', userId).eq('status', 'won'),
      supabase.from('meta_capi_events').select('event_name, success').eq('user_id', userId),
      supabase.from('ad_campaigns').select('id, daily_budget').eq('user_id', userId),
    ]);

    const leads30 = leadsRes.status === 'fulfilled' ? leadsRes.value.data || [] : [];
    const prevLeads = prevLeadsRes.status === 'fulfilled' ? prevLeadsRes.value.data || [] : [];
    const wonAll = wonRes.status === 'fulfilled' ? wonRes.value.data || [] : [];
    const allEvents = eventsRes.status === 'fulfilled' ? eventsRes.value.data || [] : [];

    const totalRevenue = wonAll.reduce((s: number, l: any) => s + (l.deal_value || l.total_value || 0), 0);
    const avgScore = leads30.length > 0 ? Math.round(leads30.reduce((s: number, l: any) => s + (l.score || 0), 0) / leads30.length) : 0;
    const leadGrowth = prevLeads.length > 0 ? Math.round(((leads30.length - prevLeads.length) / prevLeads.length) * 100) : 0;
    const capiSuccess = allEvents.filter((e: any) => e.success).length;
    const convRate = leads30.length > 0 ? Math.round((wonAll.filter((w: any) => new Date(w.won_at || '') >= new Date(thirtyDaysAgo)).length / leads30.length) * 100) : 0;

    // Tahmin: sonraki ay
    const projectedLeads = Math.round(leads30.length * (1 + leadGrowth / 100));
    const projectedRevenue = projectedLeads > 0 && convRate > 0 ? Math.round(projectedLeads * (convRate / 100) * (totalRevenue / Math.max(1, wonAll.length))) : 0;

    // Sovlo ile kazanim
    const metaLeads = leads30.filter((l: any) => (l.source || '').toLowerCase().includes('meta') || (l.source || '').toLowerCase().includes('facebook'));

    res.json({
      period: '30 gun',
      leads: { current: leads30.length, previous: prevLeads.length, growth: leadGrowth },
      revenue: { total: totalRevenue, wonCount: wonAll.length, convRate },
      quality: { avgScore, capiEvents: allEvents.length, capiSuccess },
      metaLeads: metaLeads.length,
      prediction: { nextMonthLeads: projectedLeads, nextMonthRevenue: projectedRevenue },
      sovloValue: {
        leadsFound: leads30.length,
        metaLeadsFound: metaLeads.length,
        capiEventsFired: capiSuccess,
        message: `Sovlo ile ${leads30.length} lead buldunuz${totalRevenue > 0 ? `, ${totalRevenue.toLocaleString('tr-TR')} TL gelir elde ettiniz` : ''}. CAPI ile Meta algoritmaniz ${capiSuccess} sinyal ile egitildi.`,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;