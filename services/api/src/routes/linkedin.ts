export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

router.get('/status', async (req, res) => {
  res.json({ connected: true, email: 'Web Scraping Modu', status: 'connected' });
});

router.post('/find-decision-makers', async (req, res) => {
  try {
    const userId = req.userId;
    const { leadId } = req.body;
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const persons = [];

    // Google'dan ara
    try {
      const query = encodeURIComponent(`"${lead.company_name}" kurucu CEO "genel müdür" sahibi`);
      const response = await axios.get(`https://www.google.com/search?q=${query}&num=8&hl=tr`, { headers: BROWSER_HEADERS, timeout: 10000 });
      const $ = cheerio.load(response.data);
      $('div.g, .tF2Cxc').each((_, el) => {
        const snippet = $(el).find('.VwiC3b, .lEBKkf').first().text();
        const title = $(el).find('h3').first().text();
        const href = $(el).find('a').first().attr('href') || '';
        if (href.includes('linkedin.com/in/')) {
          const nameMatch = title.match(/^([A-ZÇĞİÖŞÜa-zçğışöüş\s]{5,40})\s*[-|–]/);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            if (!persons.find(p => p.name === name)) {
              persons.push({ name, title: title.replace(name, '').replace(/[-|–]/g, '').trim().slice(0,80), linkedinUrl: href.replace('/url?q=', '').split('&')[0], source: 'google' });
            }
          }
        }
        const patterns = [
          /([A-ZÇĞİÖŞÜ][a-zçğışöüş]+ [A-ZÇĞİÖŞÜ][a-zçğışöüş]+)\s*[,-]\s*(CEO|Kurucu|Genel Müdür|Sahip|Yönetici)/,
          /(CEO|Kurucu|Genel Müdür|Sahip)[:\s]+([A-ZÇĞİÖŞÜ][a-zçğışöüş]+ [A-ZÇĞİÖŞÜ][a-zçğışöüş]+)/,
        ];
        for (const pat of patterns) {
          const m = (snippet + ' ' + title).match(pat);
          if (m) {
            const name = m[1].length > 10 ? m[1] : m[2];
            const jobTitle = m[1].length > 10 ? m[2] : m[1];
            if (name && !persons.find(p => p.name === name)) persons.push({ name, title: jobTitle, source: 'google_snippet' });
          }
        }
      });
    } catch(e) { console.error('Google error:', e.message); }

    // Website'den ara
    if (lead.website) {
      const url = lead.website.startsWith('http') ? lead.website : `https://${lead.website}`;
      for (const page of [url, `${url}/hakkimizda`, `${url}/iletisim`]) {
        try {
          const r = await axios.get(page, { headers: BROWSER_HEADERS, timeout: 7000 });
          const $ = cheerio.load(r.data);
          const text = $('body').text();
          const phoneMatch = text.match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
          const phone = phoneMatch ? phoneMatch[0].replace(/\s/g,'') : null;
          const nameMatch = text.match(/(?:Kurucu|CEO|Genel Müdür)[:\s]+([A-ZÇĞİÖŞÜ][a-zçğışöüş]+ [A-ZÇĞİÖŞÜ][a-zçğışöüş]+)/);
          if (nameMatch && !persons.find(p => p.name === nameMatch[1])) {
            persons.push({ name: nameMatch[1], title: 'Yetkili', phone, source: 'website' });
          } else if (phone && persons.length === 0) {
            persons.push({ name: `${lead.company_name} Yetkilisi`, title: 'Yetkili', phone, source: 'website' });
          }
          if (persons.length > 0) break;
          await sleep(300);
        } catch {}
      }
    }

    // Zenginleştir
    const enriched = [];
    for (const person of persons.slice(0,5)) {
      // Telefon ara
      if (!person.phone) {
        try {
          const q = encodeURIComponent(`"${person.name}" "${lead.company_name}" telefon`);
          const r = await axios.get(`https://www.google.com/search?q=${q}&num=5`, { headers: BROWSER_HEADERS, timeout: 8000 });
          const text = cheerio.load(r.data)('body').text();
          const m = text.match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
          if (m) person.phone = m[0].replace(/\s/g,'');
          await sleep(400);
        } catch {}
      }
      // Sosyal medya
      const social = { instagram: null, linkedin: null };
      try {
        const q = encodeURIComponent(`"${person.name}" "${lead.company_name}" instagram linkedin`);
        const r = await axios.get(`https://www.google.com/search?q=${q}&num=5`, { headers: BROWSER_HEADERS, timeout: 8000 });
        const $ = cheerio.load(r.data);
        $('a[href]').each((_, el) => {
          const href = decodeURIComponent($(el).attr('href') || '');
          if (href.includes('instagram.com/') && !social.instagram && !href.includes('/p/')) {
            const m = href.match(/instagram\.com\/([\w.]+)/);
            if (m?.[1] && !['explore','reel','p'].includes(m[1])) social.instagram = `https://instagram.com/${m[1]}`;
          }
          if (href.includes('linkedin.com/in/') && !social.linkedin) {
            const m = href.match(/linkedin\.com\/in\/([\w-]+)/);
            if (m?.[1]) social.linkedin = `https://linkedin.com/in/${m[1]}`;
          }
        });
        await sleep(400);
      } catch {}

      // AI analiz
      let aiAnalysis = null;
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const resp = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001', max_tokens: 200,
          messages: [{ role: 'user', content: `Kişi: ${person.name}, Pozisyon: ${person.title}, Şirket: ${lead.company_name}\nJSON: {"isDecisionMaker":true,"decisionPower":"yüksek","approachStrategy":"2 cümle","personalizedOpener":"max 100 karakter WA mesajı"}` }]
        });
        const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
        if (m) aiAnalysis = JSON.parse(m[0]);
      } catch {}

      // DB kaydet
      await supabase.from('person_database').upsert([{
        user_id: userId, lead_id: leadId,
        name: person.name, title: person.title, company: lead.company_name,
        phone: person.phone, linkedin_url: social.linkedin || person.linkedinUrl,
        instagram_url: social.instagram, source: person.source || 'web',
        ai_analysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
      }], { onConflict: 'user_id,name,company' });

      enriched.push({ ...person, social, aiAnalysis });
    }

    res.json({ lead: lead.company_name, found: enriched.length, persons: enriched });
  } catch(e) {
    console.error('Find DM error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/find-batch', async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.body;
    const { data: leads } = await supabase.from('leads').select('*').eq('user_id', userId).limit(limit);
    if (!leads?.length) return res.json({ message: 'Lead yok', processed: 0 });
    res.json({ message: `${leads.length} şirket taranıyor...`, total: leads.length });
    (async () => {
      for (const lead of leads) {
        try {
          const q = encodeURIComponent(`"${lead.company_name}" kurucu CEO sahibi`);
          const r = await axios.get(`https://www.google.com/search?q=${q}&num=5&hl=tr`, { headers: BROWSER_HEADERS, timeout: 10000 });
          const $ = cheerio.load(r.data);
          const text = $('body').text();
          const m = text.match(/([A-ZÇĞİÖŞÜ][a-zçğışöüş]+ [A-ZÇĞİÖŞÜ][a-zçğışöüş]+)\s*[,-]\s*(CEO|Kurucu|Genel Müdür)/);
          if (m) {
            const phone_m = text.match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
            await supabase.from('person_database').upsert([{
              user_id: userId, lead_id: lead.id, name: m[1], title: m[2],
              company: lead.company_name, phone: phone_m ? phone_m[0].replace(/\s/g,'') : null, source: 'batch',
            }], { onConflict: 'user_id,name,company' });
          }
          await sleep(2000);
        } catch {}
      }
    })();
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/persons', async (req, res) => {
  try {
    const { leadId } = req.query;
    let query = supabase.from('person_database').select('*, leads(company_name,city,sector)').eq('user_id', req.userId).order('created_at', { ascending: false }).limit(100);
    if (leadId) query = query.eq('lead_id', leadId);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ persons: (data||[]).map(p => ({ ...p, aiAnalysis: p.ai_analysis ? (() => { try { return JSON.parse(p.ai_analysis); } catch { return null; } })() : null })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/add-to-campaign', async (req, res) => {
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
        const { data: nl } = await supabase.from('leads').insert([{ user_id: req.userId, company_name: person.company, contact_name: person.name, phone: person.phone, status: 'new', source: 'Web/LinkedIn' }]).select().single();
        leadId = nl?.id; addedLeads++;
      }
      if (leadId) await supabase.from('campaign_leads').upsert([{ campaign_id: campaignId, lead_id: leadId }], { onConflict: 'campaign_id,lead_id' }).catch(()=>{});
    }
    res.json({ message: `${addedLeads} yeni lead, ${persons?.length||0} kampanyaya eklendi`, addedLeads });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/send-whatsapp', async (req, res) => {
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
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/connect', async (req, res) => { res.json({ message: 'Web scraping modu aktif', connected: true }); });
router.post('/disconnect', async (req, res) => { res.json({ message: 'Bağlantı kesildi' }); });

module.exports = router;