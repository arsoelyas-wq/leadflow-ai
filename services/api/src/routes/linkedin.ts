export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const LI_AT = process.env.LINKEDIN_LI_AT;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Cookie': `li_at=${LI_AT}`,
  'csrf-token': 'ajax:0',
};

// ── LİNKEDIN'DE KİŞİ ARA ─────────────────────────────────
async function searchLinkedInPerson(companyName: string, titles: string[]): Promise<any[]> {
  const results: any[] = [];

  for (const title of titles.slice(0, 3)) {
    try {
      const query = encodeURIComponent(`${companyName} ${title}`);
      const response = await axios.get(
        `https://www.linkedin.com/voyager/api/search/blended?keywords=${query}&origin=GLOBAL_SEARCH_HEADER&q=all&start=0&count=5`,
        {
          headers: {
            ...HEADERS,
            'x-restli-protocol-version': '2.0.0',
            'x-li-lang': 'tr_TR',
          },
          timeout: 10000,
        }
      );

      const elements = response.data?.data?.elements || [];
      for (const element of elements) {
        const items = element?.elements || [];
        for (const item of items) {
          if (item?.type === 'PROFILE') {
            const profile = item?.profile || item;
            const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
            const headline = profile?.headline || '';
            const profileUrl = profile?.publicIdentifier
              ? `https://www.linkedin.com/in/${profile.publicIdentifier}`
              : '';

            if (name && !results.find(r => r.name === name)) {
              results.push({
                name,
                headline,
                profileUrl,
                publicId: profile?.publicIdentifier,
                company: companyName,
                title: headline,
              });
            }
          }
        }
      }
      await sleep(1000);
    } catch (e: any) {
      console.error(`LinkedIn search error for ${title}:`, e.message);
    }
  }
  return results;
}

// ── LİNKEDIN PROFİL DETAY ────────────────────────────────
async function getLinkedInProfile(publicId: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://www.linkedin.com/voyager/api/identity/profiles/${publicId}/profileView`,
      {
        headers: { ...HEADERS, 'x-restli-protocol-version': '2.0.0' },
        timeout: 10000,
      }
    );
    const data = response.data;
    const profile = data?.profile || {};
    const contact = data?.contactInfo || {};

    return {
      name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      headline: profile.headline,
      summary: profile.summary,
      location: profile.locationName,
      email: contact.emailAddress,
      phone: contact.phoneNumbers?.[0]?.number,
      twitter: contact.twitterHandles?.[0]?.name,
      websites: (contact.websites || []).map((w: any) => w.url),
    };
  } catch (e: any) {
    console.error('LinkedIn profile error:', e.message);
    return null;
  }
}

// ── GOOGLE'DAN TELEFON BUL ────────────────────────────────
async function findPhoneFromWeb(name: string, company: string): Promise<string | null> {
  try {
    const queries = [
      `"${name}" "${company}" telefon site:linkedin.com OR site:instagram.com`,
      `"${name}" "${company}" whatsapp telefon iletişim`,
      `"${company}" iletişim telefon`,
    ];

    for (const query of queries) {
      const response = await axios.get(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5&hl=tr`,
        { headers: { 'User-Agent': HEADERS['User-Agent'] }, timeout: 8000 }
      );
      const $ = cheerio.load(response.data);
      const text = $('body').text();

      // Türk telefon formatları
      const phonePatterns = [
        /(\+90\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2})/g,
        /(0\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2})/g,
        /(05\d{2}\s?\d{3}\s?\d{4})/g,
      ];

      for (const pattern of phonePatterns) {
        const match = text.match(pattern);
        if (match?.[0]) {
          const phone = match[0].replace(/\s/g, '');
          if (phone.length >= 10) return phone;
        }
      }
      await sleep(500);
    }
    return null;
  } catch {
    return null;
  }
}

// ── SOSYAL MEDYA HESAPLARI BUL ────────────────────────────
async function findSocialMedia(name: string, company: string): Promise<any> {
  const social: any = { instagram: null, facebook: null, twitter: null, linkedin: null };

  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(`"${name}" "${company}" site:instagram.com OR site:facebook.com OR site:twitter.com`)}&num=5`,
      { headers: { 'User-Agent': HEADERS['User-Agent'] }, timeout: 8000 }
    );
    const $ = cheerio.load(response.data);

    $('a[href]').each((_: any, el: any) => {
      const href = $(el).attr('href') || '';
      if (href.includes('instagram.com/') && !social.instagram) {
        const match = href.match(/instagram\.com\/([^/?&"]+)/);
        if (match?.[1] && !['p', 'explore', 'reel'].includes(match[1])) {
          social.instagram = `https://instagram.com/${match[1]}`;
        }
      }
      if (href.includes('facebook.com/') && !social.facebook) {
        const match = href.match(/facebook\.com\/([^/?&"]+)/);
        if (match?.[1] && !['photo', 'video', 'groups'].includes(match[1])) {
          social.facebook = `https://facebook.com/${match[1]}`;
        }
      }
      if (href.includes('twitter.com/') && !social.twitter) {
        const match = href.match(/twitter\.com\/([^/?&"]+)/);
        if (match?.[1]) social.twitter = `https://twitter.com/${match[1]}`;
      }
    });
  } catch {}

  return social;
}

// ── AI İLE KİŞİ ANALİZİ ──────────────────────────────────
async function analyzePersonWithAI(person: any, lead: any): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `B2B satış için kişi analizi:

Kişi: ${person.name}
Pozisyon: ${person.headline || person.title}
Şirket: ${lead.company_name}
Lead sektörü: ${lead.sector || 'bilinmiyor'}

JSON döndür:
{
  "isDecisionMaker": true/false,
  "decisionPower": "yüksek/orta/düşük",
  "approachStrategy": "Nasıl yaklaşılmalı (2 cümle)",
  "personalizedOpener": "Kişiye özel WhatsApp açılış mesajı (max 100 karakter)",
  "bestContactTime": "En iyi iletişim zamanı"
}`
      }]
    });

    const text = response.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/linkedin/status
router.get('/status', async (req: any, res: any) => {
  try {
    const connected = !!LI_AT;
    res.json({ connected, email: connected ? 'Sistem (li_at)' : null, status: connected ? 'connected' : 'disconnected' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/linkedin/find-decision-makers — Şirketten karar verici bul
router.post('/find-decision-makers', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, titles } = req.body;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const searchTitles = titles || ['Genel Müdür', 'CEO', 'Kurucu', 'Müdür', 'Sahip', 'Owner', 'Director', 'Manager'];

    console.log(`LinkedIn search: ${lead.company_name}`);

    // LinkedIn'de ara
    const persons = await searchLinkedInPerson(lead.company_name, searchTitles);

    // Her kişi için detay çek
    const enriched = [];
    for (const person of persons.slice(0, 5)) {
      let phone = null;
      let social: any = {};
      let aiAnalysis = null;

      // Profil detayı
      if (person.publicId) {
        const profileDetail = await getLinkedInProfile(person.publicId);
        if (profileDetail) {
          phone = profileDetail.phone;
          Object.assign(person, profileDetail);
        }
        await sleep(1000);
      }

      // Telefon web'den ara
      if (!phone) {
        phone = await findPhoneFromWeb(person.name, lead.company_name);
        await sleep(500);
      }

      // Sosyal medya bul
      social = await findSocialMedia(person.name, lead.company_name);
      await sleep(500);

      // AI analizi
      aiAnalysis = await analyzePersonWithAI(person, lead);

      enriched.push({ ...person, phone, social, aiAnalysis });
    }

    // DB'ye kaydet
    for (const person of enriched) {
      await supabase.from('person_database').upsert([{
        user_id: userId,
        lead_id: leadId,
        name: person.name,
        title: person.headline || person.title,
        company: lead.company_name,
        phone: person.phone,
        linkedin_url: person.profileUrl,
        instagram_url: person.social?.instagram,
        facebook_url: person.social?.facebook,
        twitter_url: person.social?.twitter,
        ai_analysis: person.aiAnalysis ? JSON.stringify(person.aiAnalysis) : null,
        source: 'linkedin',
      }], { onConflict: 'user_id,name,company' });
    }

    res.json({
      lead: lead.company_name,
      found: enriched.length,
      persons: enriched,
    });
  } catch (e: any) {
    console.error('LinkedIn find error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/linkedin/find-batch — Tüm leadler için karar verici bul
router.post('/find-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.body;

    const { data: leads } = await supabase.from('leads').select('*')
      .eq('user_id', userId).limit(limit);

    if (!leads?.length) return res.json({ message: 'Lead yok', processed: 0 });

    res.json({ message: `${leads.length} şirket için karar verici aranıyor...`, total: leads.length });

    (async () => {
      let processed = 0;
      for (const lead of leads) {
        try {
          const persons = await searchLinkedInPerson(lead.company_name, ['CEO', 'Genel Müdür', 'Kurucu', 'Sahip']);
          for (const person of persons.slice(0, 2)) {
            const phone = await findPhoneFromWeb(person.name, lead.company_name);
            const social = await findSocialMedia(person.name, lead.company_name);
            await supabase.from('person_database').upsert([{
              user_id: userId, lead_id: lead.id,
              name: person.name, title: person.headline,
              company: lead.company_name, phone,
              linkedin_url: person.profileUrl,
              instagram_url: social?.instagram,
              source: 'linkedin_batch',
            }], { onConflict: 'user_id,name,company' });
          }
          processed++;
          await sleep(3000);
        } catch (e: any) {
          console.error(`Batch error ${lead.company_name}:`, e.message);
        }
      }
      console.log(`LinkedIn batch done: ${processed}/${leads.length}`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/linkedin/persons — Bulunan kişiler
router.get('/persons', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId } = req.query;

    let query = supabase.from('person_database')
      .select('*, leads(company_name, city, sector)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (leadId) query = query.eq('lead_id', leadId);

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

// POST /api/linkedin/add-to-campaign — Kampanyaya ekle
router.post('/add-to-campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { personIds, campaignId } = req.body;

    if (!personIds?.length || !campaignId) {
      return res.status(400).json({ error: 'personIds ve campaignId zorunlu' });
    }

    const { data: persons } = await supabase.from('person_database')
      .select('*').in('id', personIds).eq('user_id', userId);

    if (!persons?.length) return res.status(400).json({ error: 'Kişi bulunamadı' });

    // Kişileri lead olarak ekle (telefon varsa)
    let addedLeads = 0;
    for (const person of persons) {
      if (!person.phone) continue;
      const { data: existingLead } = await supabase.from('leads')
        .select('id').eq('user_id', userId).eq('phone', person.phone).single();

      let leadId = existingLead?.id;
      if (!leadId) {
        const { data: newLead } = await supabase.from('leads').insert([{
          user_id: userId,
          company_name: person.company,
          contact_name: person.name,
          phone: person.phone,
          status: 'new',
          source: 'LinkedIn',
          linkedin_url: person.linkedin_url,
        }]).select().single();
        leadId = newLead?.id;
        addedLeads++;
      }

      // Kampanyaya ekle
      if (leadId && campaignId) {
        await supabase.from('campaign_leads').upsert([{
          campaign_id: campaignId,
          lead_id: leadId,
        }], { onConflict: 'campaign_id,lead_id' }).catch(() => {});
      }
    }

    res.json({
      message: `${addedLeads} yeni lead eklendi, ${persons.length} kişi kampanyaya eklendi`,
      addedLeads,
      total: persons.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/linkedin/send-whatsapp — Direkt WhatsApp gönder
router.post('/send-whatsapp', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { personId, message } = req.body;

    const { data: person } = await supabase.from('person_database')
      .select('*').eq('id', personId).eq('user_id', userId).single();
    if (!person) return res.status(404).json({ error: 'Kişi bulunamadı' });
    if (!person.phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const analysis = person.ai_analysis ? JSON.parse(person.ai_analysis) : null;
    const firstName = person.name.split(' ')[0];
    const finalMessage = message || analysis?.personalizedOpener ||
      `Merhaba ${firstName} Bey/Hanım, ${person.company} ile ilgili kısa bir görüşme yapabilir miyiz?`;

    const { sendWhatsAppMessage } = require('./settings');
    await sendWhatsAppMessage(userId, person.phone, finalMessage);

    await supabase.from('messages').insert([{
      user_id: userId,
      lead_id: person.lead_id,
      direction: 'out',
      content: finalMessage,
      channel: 'whatsapp',
      sent_at: new Date().toISOString(),
      metadata: JSON.stringify({ personId: person.id, source: 'linkedin' }),
    }]);

    res.json({ message: 'WhatsApp mesajı gönderildi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;