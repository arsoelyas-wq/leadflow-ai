export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GRAPH = 'https://graph.facebook.com/v18.0';

// Kullanicinin Meta token'ini al
async function getMetaToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('meta_connections')
    .select('access_token')
    .eq('user_id', userId)
    .single();
  return data?.access_token || process.env.META_GRAPH_TOKEN || null;
}

// Meta API call
async function metaGet(path: string, token: string, params: any = {}) {
  const r = await axios.get(`${GRAPH}${path}`, {
    params: { ...params, access_token: token },
    timeout: 15000,
  });
  return r.data;
}

// ── LEAD EXTRACTION ──────────────────────────────────────

// Tum reklam turlerinden lead cek
async function extractLeadsFromAllCampaigns(userId: string, adAccountId: string, token: string) {
  const leads: any[] = [];

  try {
    // 1. Lead Form reklamlarindan
    try {
      const forms = await metaGet(`/${adAccountId}/leadgen_forms`, token, {
        fields: 'id,name,leads_count,created_time',
        limit: 50,
      });
      for (const form of forms.data || []) {
        const formLeads = await metaGet(`/${form.id}/leads`, token, {
          fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,campaign_id',
          limit: 100,
        });
        for (const lead of formLeads.data || []) {
          const fields: any = {};
          for (const f of lead.field_data || []) {
            fields[f.name] = f.values?.[0];
          }
          leads.push({
            source: 'lead_form',
            form_name: form.name,
            meta_lead_id: lead.id,
            name: fields.full_name || fields.first_name,
            email: fields.email,
            phone: fields.phone_number || fields.phone,
            company: fields.company_name,
            ad_name: lead.ad_name,
            campaign_id: lead.campaign_id,
            created_at: lead.created_time,
          });
        }
      }
    } catch {}

    // 2. Sayfa mesajlarindan (Messenger ads)
    try {
      const pageId = process.env.META_PAGE_ID;
      const pageToken = process.env.META_PAGE_TOKEN;
      if (pageId && pageToken) {
        const convs = await metaGet(`/${pageId}/conversations`, pageToken, {
          fields: 'id,participants,updated_time,messages{message,created_time,from}',
          limit: 50,
        });
        for (const conv of convs.data || []) {
          const participant = conv.participants?.data?.find((p: any) => p.id !== pageId);
          if (participant) {
            const lastMsg = conv.messages?.data?.[0];
            leads.push({
              source: 'messenger',
              meta_user_id: participant.id,
              name: participant.name,
              last_message: lastMsg?.message,
              last_message_time: lastMsg?.created_time,
              conversation_id: conv.id,
            });
          }
        }
      }
    } catch {}

    // 3. Reklam yorumlarindan potansiyel leadler
    try {
      const ads = await metaGet(`/${adAccountId}/ads`, token, {
        fields: 'id,name,status,campaign_id',
        filtering: '[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]',
        limit: 20,
      });
      for (const ad of ads.data || []) {
        try {
          const insights = await metaGet(`/${ad.id}/insights`, token, {
            fields: 'impressions,clicks,spend,ctr,cpm,reach,actions',
            date_preset: 'last_30d',
          });
          if (insights.data?.[0]) {
            const d = insights.data[0];
            const actions = d.actions || [];
            const messages = actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
            const leads_action = actions.find((a: any) => a.action_type === 'lead');
            if (messages || leads_action) {
              leads.push({
                source: 'ad_interaction',
                ad_id: ad.id,
                ad_name: ad.name,
                campaign_id: ad.campaign_id,
                message_starts: messages?.value || 0,
                leads_count: leads_action?.value || 0,
                spend: d.spend,
                impressions: d.impressions,
              });
            }
          }
        } catch {}
      }
    } catch {}

  } catch (e: any) {
    console.error('Lead extraction error:', e.message);
  }

  return leads;
}

// Lead'i CRM'e kaydet
async function saveLeadToCRM(userId: string, lead: any) {
  try {
    // Daha once eklenmis mi kontrol et
    if (lead.meta_lead_id) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('meta_lead_id', lead.meta_lead_id)
        .eq('user_id', userId)
        .single();
      if (existing) return null;
    }

    const { data: newLead } = await supabase.from('leads').insert([{
      user_id: userId,
      company_name: lead.company || lead.name || 'Meta Reklam Leadi',
      contact_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: `meta_${lead.source}`,
      meta_lead_id: lead.meta_lead_id,
      status: 'new',
      notes: `Meta ${lead.source} kaynagindan otomatik eklendi. Reklam: ${lead.ad_name || lead.form_name || ''}`,
      created_at: lead.created_at || new Date().toISOString(),
    }]).select().single();

    return newLead;
  } catch { return null; }
}

// Performans analizi ve uyari
async function analyzePerformance(userId: string, adAccountId: string, token: string) {
  const alerts: any[] = [];

  try {
    const campaigns = await metaGet(`/${adAccountId}/campaigns`, token, {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget',
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

        // Dusuk CTR uyarisi
        if (ctr < 0.5 && impressions > 1000) {
          alerts.push({
            type: 'low_ctr',
            severity: 'warning',
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            message: `CTR cok dusuk: %${ctr.toFixed(2)} (ortalama %1-3 olmali)`,
            recommendation: 'Reklam gorseli veya metnini degistirin. A/B test baslatin.',
            value: ctr,
          });
        }

        // Yuksek CPM uyarisi
        if (cpm > 50 && spend > 10) {
          alerts.push({
            type: 'high_cpm',
            severity: 'warning',
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            message: `CPM cok yuksek: $${cpm.toFixed(2)} (hedef kitle cok dar olabilir)`,
            recommendation: 'Hedef kitleyi genisletin veya Lookalike audience deneyin.',
            value: cpm,
          });
        }

        // Yuksek frequency uyarisi (reklam yorgunlugu)
        if (frequency > 5) {
          alerts.push({
            type: 'ad_fatigue',
            severity: 'critical',
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            message: `Reklam yorgunlugu: Frekans ${frequency.toFixed(1)} (ayni kisi ${frequency.toFixed(0)}x gordu)`,
            recommendation: 'Reklam gorseli veya metnini hemen degistirin. Yeni hedef kitle ekleyin.',
            value: frequency,
          });
        }

        // Harcama var ama hic lead/click yok
        if (spend > 20 && parseInt(d.clicks || '0') < 5) {
          alerts.push({
            type: 'no_results',
            severity: 'critical',
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            message: `$${spend} harcandi ama sadece ${d.clicks} tiklama. Reklam cok kotu performans gosteriyor.`,
            recommendation: 'Reklamı durdurun, hedef kitle ve gorsel komple degistirin.',
            value: spend,
          });
        }

        // Uyarilari DB'ye kaydet
        for (const alert of alerts) {
          await supabase.from('ad_alerts').upsert([{
            user_id: userId,
            campaign_id: alert.campaign_id,
            alert_type: alert.type,
            severity: alert.severity,
            message: alert.message,
            recommendation: alert.recommendation,
            value: alert.value,
            is_read: false,
            created_at: new Date().toISOString(),
          }], { onConflict: 'user_id,campaign_id,alert_type' });
        }
      } catch {}
    }
  } catch (e: any) {
    console.error('Performance analysis error:', e.message);
  }

  return alerts;
}

// ── ROUTES ───────────────────────────────────────────────

// GET /api/ads-intelligence/extract-leads - Manuel lead cekme
router.get('/extract-leads', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const token = await getMetaToken(userId);
    if (!token) return res.status(400).json({ error: 'Meta hesabi bagli degil' });

    const adAccountId = process.env.META_AD_ACCOUNT_ID || 'act_377102039604293';
    const leads = await extractLeadsFromAllCampaigns(userId, adAccountId, token);

    let saved = 0;
    for (const lead of leads) {
      const result = await saveLeadToCRM(userId, lead);
      if (result) saved++;
    }

    res.json({
      ok: true,
      total_found: leads.length,
      new_leads: saved,
      leads,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/performance - Performans analizi
router.get('/performance', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const token = await getMetaToken(userId);
    if (!token) return res.status(400).json({ error: 'Meta hesabi bagli degil' });

    const adAccountId = process.env.META_AD_ACCOUNT_ID || 'act_377102039604293';
    const alerts = await analyzePerformance(userId, adAccountId, token);

    // Tum kampanyalarin ozeti
    const campaigns = await metaGet(`/${adAccountId}/campaigns`, token, {
      fields: 'id,name,status,objective,daily_budget',
      limit: 50,
    });

    const insights: any[] = [];
    for (const c of (campaigns.data || []).slice(0, 10)) {
      try {
        const ins = await metaGet(`/${c.id}/insights`, token, {
          fields: 'impressions,clicks,spend,ctr,cpm,reach,actions',
          date_preset: 'last_7d',
        });
        if (ins.data?.[0]) {
          insights.push({ ...c, ...ins.data[0] });
        }
      } catch {}
    }

    res.json({ ok: true, alerts, campaigns: insights, total_alerts: alerts.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/alerts - Aktif uyarilar
router.get('/alerts', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('ad_alerts')
      .select('*')
      .eq('user_id', req.userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    res.json({ alerts: data || [], count: data?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/ads-intelligence/alerts/:id/read - Uyariyi okundu isaretle
router.patch('/alerts/:id/read', async (req: any, res: any) => {
  try {
    await supabase.from('ad_alerts').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/ads-intelligence/dashboard - Tam dashboard verisi
router.get('/dashboard', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const token = await getMetaToken(userId);
    if (!token) return res.status(400).json({ error: 'Meta hesabi bagli degil' });

    const adAccountId = process.env.META_AD_ACCOUNT_ID || 'act_377102039604293';

    // Paralel veri cek
    const [accountInsights, alerts, recentLeads] = await Promise.allSettled([
      metaGet(`/${adAccountId}/insights`, token, {
        fields: 'impressions,clicks,spend,ctr,cpm,reach,actions',
        date_preset: 'last_30d',
      }),
      supabase.from('ad_alerts').select('*').eq('user_id', userId).eq('is_read', false).limit(5),
      supabase.from('leads').select('*').eq('user_id', userId).eq('source', 'meta_lead_form').order('created_at', { ascending: false }).limit(10),
    ]);

    const summary = accountInsights.status === 'fulfilled' ? accountInsights.value.data?.[0] : null;
    const alertList = alerts.status === 'fulfilled' ? alerts.value.data || [] : [];
    const leadList = recentLeads.status === 'fulfilled' ? recentLeads.value.data || [] : [];

    res.json({
      summary: {
        spend: parseFloat(summary?.spend || '0'),
        impressions: parseInt(summary?.impressions || '0'),
        clicks: parseInt(summary?.clicks || '0'),
        ctr: parseFloat(summary?.ctr || '0'),
        cpm: parseFloat(summary?.cpm || '0'),
        reach: parseInt(summary?.reach || '0'),
      },
      alerts: alertList,
      recent_leads: leadList,
      last_updated: new Date().toISOString(),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/ads-intelligence/ai-optimize - AI optimizasyon onerisi
router.post('/ai-optimize', async (req: any, res: any) => {
  try {
    const { campaignId, campaignName, metrics } = req.body;
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();

    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Meta reklam kampanyasi analizi yap ve optimizasyon onerisi ver.

Sirket: ${profile?.company?.name || 'Bilinmiyor'}
Urun: ${profile?.product?.description || ''}
Kampanya: ${campaignName}

Metrikler (son 7 gun):
- Harcama: $${metrics?.spend || 0}
- Gosterim: ${metrics?.impressions || 0}
- Tiklama: ${metrics?.clicks || 0}
- CTR: %${metrics?.ctr || 0}
- CPM: $${metrics?.cpm || 0}
- Erisim: ${metrics?.reach || 0}

JSON formatinda don:
{
  "overall_score": 1-10,
  "summary": "kisa ozet",
  "problems": ["sorun1", "sorun2"],
  "recommendations": [
    {"priority": "high/medium/low", "action": "yapilacak is", "expected_result": "beklenen sonuc"}
  ],
  "new_copy_suggestion": "yeni reklam metni onerisi",
  "target_audience_suggestion": "hedef kitle onerisi"
}`
      }],
    });

    const text = r.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    const analysis = match ? JSON.parse(match[0]) : { summary: text };

    res.json({ ok: true, analysis, campaignId });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── 7/24 OTOMATİK SİSTEM ────────────────────────────────
async function runAutoLeadExtraction() {
  console.log('[AdsIntelligence] Otomatik lead cekme basliyor...');
  try {
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('user_id, access_token')
      .not('access_token', 'is', null);

    for (const conn of connections || []) {
      try {
        const adAccountId = process.env.META_AD_ACCOUNT_ID || 'act_377102039604293';
        const leads = await extractLeadsFromAllCampaigns(conn.user_id, adAccountId, conn.access_token);

        let saved = 0;
        for (const lead of leads) {
          const result = await saveLeadToCRM(conn.user_id, lead);
          if (result) {
            saved++;
            // Yeni lead bildirimi
            await supabase.from('notifications').insert([{
              user_id: conn.user_id,
              type: 'new_meta_lead',
              title: 'Yeni Meta Reklam Leadi!',
              message: `${lead.name || lead.company || 'Yeni lead'} reklamdan eklendi (${lead.source})`,
              data: JSON.stringify(lead),
            }]);
          }
        }

        // Performans analizi
        await analyzePerformance(conn.user_id, adAccountId, conn.access_token);

        if (saved > 0) {
          console.log(`[AdsIntelligence] User ${conn.user_id}: ${saved} yeni lead eklendi`);
        }
      } catch (e: any) {
        console.error(`[AdsIntelligence] User ${conn.user_id} hatasi:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('[AdsIntelligence] Ana hata:', e.message);
  }
}

// Her 30 dakikada bir calis
setInterval(runAutoLeadExtraction, 30 * 60 * 1000);

// Ilk basladiginda 1 dakika sonra calis
setTimeout(runAutoLeadExtraction, 60 * 1000);

module.exports = router;