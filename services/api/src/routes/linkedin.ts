export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'https://leadflow-ai-web-kappa.vercel.app/api/auth/linkedin/callback';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── OAUTH URL ─────────────────────────────────────────────
router.get('/auth-url', async (req: any, res: any) => {
  const scopes = ['openid', 'profile', 'email', 'w_member_social'].join(' ');
  const state = Buffer.from(JSON.stringify({ userId: req.userId, ts: Date.now() })).toString('base64');
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
  res.json({ url });
});

// ── TOKEN AL ──────────────────────────────────────────────
router.post('/callback', async (req: any, res: any) => {
  try {
    const { code, state } = req.body;
    if (!code) return res.status(400).json({ error: 'code zorunlu' });

    const tokenResp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, expires_in } = tokenResp.data;

    // Profil bilgisi al
    const profileResp = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileResp.data;
    const userId = req.userId;

    // Token kaydet
    await supabase.from('user_settings').upsert({
      user_id: userId,
      linkedin_access_token: access_token,
      linkedin_token_expires: new Date(Date.now() + expires_in * 1000).toISOString(),
      linkedin_profile_name: profile.name,
      linkedin_profile_email: profile.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({
      success: true,
      profile: { name: profile.name, email: profile.email },
      message: 'LinkedIn bağlandı!',
    });
  } catch (e: any) {
    console.error('LinkedIn callback error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.error_description || e.message });
  }
});

// ── TOKEN KONTROL ─────────────────────────────────────────
async function getAccessToken(userId: string): Promise<string | null> {
  const { data } = await supabase.from('user_settings')
    .select('linkedin_access_token, linkedin_token_expires')
    .eq('user_id', userId).single();

  if (!data?.linkedin_access_token) return null;
  if (data.linkedin_token_expires && new Date(data.linkedin_token_expires) < new Date()) return null;
  return data.linkedin_access_token;
}

// ── STATUS ────────────────────────────────────────────────
router.get('/status', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('user_settings')
      .select('linkedin_access_token, linkedin_token_expires, linkedin_profile_name, linkedin_profile_email')
      .eq('user_id', req.userId).single();

    const connected = !!data?.linkedin_access_token && new Date(data.linkedin_token_expires) > new Date();

    res.json({
      connected,
      email: connected ? data.linkedin_profile_email : null,
      name: connected ? data.linkedin_profile_name : null,
      status: connected ? 'connected' : 'disconnected',
      expiresAt: data?.linkedin_token_expires,
    });
  } catch (e: any) {
    res.json({ connected: false, status: 'disconnected' });
  }
});

// ── KENDİ PROFİLİ ─────────────────────────────────────────
router.get('/me', async (req: any, res: any) => {
  try {
    const token = await getAccessToken(req.userId);
    if (!token) return res.status(401).json({ error: 'LinkedIn bağlı değil' });

    const resp = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json(resp.data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── KARAR VERİCİ BUL (AI + Web) ──────────────────────────
router.post('/find-decision-makers', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId } = req.body;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const token = await getAccessToken(userId);
    const persons: any[] = [];

    // LinkedIn People Search (token varsa)
    if (token) {
      try {
        const searchResp = await axios.get(
          `https://api.linkedin.com/v2/search?q=people&keywords=${encodeURIComponent(lead.company_name)}&count=5`,
          { headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' } }
        );
        const elements = searchResp.data?.elements || [];
        for (const el of elements) {
          if (el.firstName && el.lastName) {
            persons.push({
              name: `${el.firstName.localized?.tr_TR || el.firstName.localized?.en_US || ''} ${el.lastName.localized?.tr_TR || el.lastName.localized?.en_US || ''}`.trim(),
              title: el.headline?.localized?.tr_TR || el.headline?.localized?.en_US || '',
              linkedinUrl: el.publicProfileUrl || '',
              source: 'linkedin_api',
            });
          }
        }
      } catch (e: any) {
        console.log('LinkedIn search limited:', e.response?.status);
      }
    }

    // AI ile Claude'dan karar verici tahmin et
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const resp = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `${lead.company_name} şirketinin karar vericilerini tahmin et.
Sektör: ${lead.sector || 'bilinmiyor'}, Şehir: ${lead.city || ''}, Website: ${lead.website || 'yok'}

JSON döndür:
{
  "decisionMakers": [
    {"name": "tahmini isim (varsa)", "title": "CEO/Kurucu/Genel Müdür", "approachStrategy": "nasıl yaklaşılmalı", "personalizedOpener": "WA mesajı max 100 karakter"}
  ],
  "companyInsights": "şirket hakkında bilgi",
  "bestApproach": "genel yaklaşım stratejisi"
}`
        }]
      });
      const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
      if (m) {
        const aiData = JSON.parse(m[0]);
        for (const dm of aiData.decisionMakers || []) {
          if (!persons.find(p => p.title === dm.title)) {
            persons.push({ ...dm, source: 'ai_analysis', aiAnalysis: dm });
          }
        }
      }
    } catch {}

    // Website'den telefon çek
    if (lead.website) {
      try {
        const url = lead.website.startsWith('http') ? lead.website : `https://${lead.website}`;
        const resp = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const phoneMatch = resp.data?.match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
        if (phoneMatch && persons.length > 0) {
          persons[0].phone = phoneMatch[0].replace(/\s/g, '');
        }
      } catch {}
    }

    // DB'ye kaydet
    const enriched = [];
    for (const person of persons.slice(0, 5)) {
      const { data: saved } = await supabase.from('person_database').upsert([{
        user_id: userId, lead_id: leadId,
        name: person.name || `${lead.company_name} Yetkilisi`,
        title: person.title,
        company: lead.company_name,
        phone: person.phone || null,
        linkedin_url: person.linkedinUrl || null,
        source: person.source || 'linkedin',
        ai_analysis: person.aiAnalysis ? JSON.stringify(person.aiAnalysis) : null,
      }], { onConflict: 'user_id,name,company' }).select().single();
      enriched.push({ ...person, id: saved?.id });
    }

    res.json({ lead: lead.company_name, found: enriched.length, persons: enriched });
  } catch (e: any) {
    console.error('Find DM error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── TOPLU ARA ─────────────────────────────────────────────
router.post('/find-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.body;
    const { data: leads } = await supabase.from('leads').select('*').eq('user_id', userId).limit(limit);
    if (!leads?.length) return res.json({ message: 'Lead yok', processed: 0 });
    res.json({ message: `${leads.length} şirket taranıyor...`, total: leads.length });
    (async () => {
      for (const lead of leads) {
        try {
          const Anthropic = require('@anthropic-ai/sdk');
          const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
          const resp = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001', max_tokens: 200,
            messages: [{ role: 'user', content: `${lead.company_name} şirketinin muhtemel CEO/kurucu ismini ve unvanını tahmin et. JSON: {"name":"isim","title":"unvan","personalizedOpener":"WA mesajı"}` }]
          });
          const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
          if (m) {
            const data = JSON.parse(m[0]);
            await supabase.from('person_database').upsert([{
              user_id: userId, lead_id: lead.id,
              name: data.name || `${lead.company_name} Yetkilisi`,
              title: data.title || 'Yetkili',
              company: lead.company_name,
              source: 'ai_batch',
              ai_analysis: JSON.stringify(data),
            }], { onConflict: 'user_id,name,company' });
          }
          await sleep(500);
        } catch {}
      }
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── KİŞİLER ──────────────────────────────────────────────
router.get('/persons', async (req: any, res: any) => {
  try {
    const { leadId } = req.query;
    let query = supabase.from('person_database')
      .select('*, leads(company_name,city,sector)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false }).limit(100);
    if (leadId) query = query.eq('lead_id', leadId as string);
    const { data, error } = await query;
    if (error) throw error;
    res.json({
      persons: (data || []).map((p: any) => ({
        ...p,
        aiAnalysis: p.ai_analysis ? (() => { try { return JSON.parse(p.ai_analysis); } catch { return null; } })() : null,
      }))
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── KAMPANYAYA EKLE ───────────────────────────────────────
router.post('/add-to-campaign', async (req: any, res: any) => {
  try {
    const { personIds, campaignId } = req.body;
    if (!personIds?.length || !campaignId) return res.status(400).json({ error: 'personIds ve campaignId zorunlu' });
    const { data: persons } = await supabase.from('person_database').select('*').in('id', personIds).eq('user_id', req.userId);
    let addedLeads = 0;
    for (const person of persons || []) {
      if (!person.phone) continue;
      const { data: ex } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('phone', person.phone).single();
      let leadId = ex?.id;
      if (!leadId) {
        const { data: nl } = await supabase.from('leads').insert([{
          user_id: req.userId, company_name: person.company,
          contact_name: person.name, phone: person.phone,
          status: 'new', source: 'LinkedIn API',
        }]).select().single();
        leadId = nl?.id; addedLeads++;
      }
      if (leadId) await supabase.from('campaign_leads').upsert([{ campaign_id: campaignId, lead_id: leadId }], { onConflict: 'campaign_id,lead_id' }).catch(() => {});
    }
    res.json({ message: `${addedLeads} yeni lead, ${persons?.length || 0} kampanyaya eklendi`, addedLeads });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── WHATSAPP GÖNDER ───────────────────────────────────────
router.post('/send-whatsapp', async (req: any, res: any) => {
  try {
    const { personId, message } = req.body;
    const { data: person } = await supabase.from('person_database').select('*').eq('id', personId).eq('user_id', req.userId).single();
    if (!person?.phone) return res.status(400).json({ error: 'Telefon yok' });
    const analysis = person.ai_analysis ? (() => { try { return JSON.parse(person.ai_analysis); } catch { return null; } })() : null;
    const firstName = person.name.split(' ')[0];
    const finalMsg = message || analysis?.personalizedOpener || `Merhaba ${firstName} Bey/Hanım, ${person.company} ile görüşebilir miyiz?`;
    const { sendWhatsAppMessage } = require('./settings');
    await sendWhatsAppMessage(req.userId, person.phone, finalMsg);
    await supabase.from('messages').insert([{ user_id: req.userId, lead_id: person.lead_id, direction: 'out', content: finalMsg, channel: 'whatsapp', sent_at: new Date().toISOString() }]);
    res.json({ message: 'WhatsApp gönderildi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── DISCONNECT ────────────────────────────────────────────
router.post('/disconnect', async (req: any, res: any) => {
  try {
    await supabase.from('user_settings').update({
      linkedin_access_token: null,
      linkedin_token_expires: null,
    }).eq('user_id', req.userId);
    res.json({ message: 'LinkedIn bağlantısı kesildi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── CONNECT (legacy) ──────────────────────────────────────
router.post('/connect', async (req: any, res: any) => {
  const token = await getAccessToken(req.userId);
  if (token) return res.json({ connected: true, message: 'Zaten bağlı' });
  const authUrlResp = await axios.get(`${req.protocol}://${req.get('host')}/api/linkedin/auth-url`, { headers: { Authorization: req.headers.authorization } }).catch(() => null);
  res.json({ connected: false, authUrl: authUrlResp?.data?.url, message: 'OAuth ile bağlanın' });
});

module.exports = router;