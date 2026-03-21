export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Li_at cookie - Railway env'den
const LI_AT = process.env.LINKEDIN_LI_AT;

// Ã¢â€â‚¬Ã¢â€â‚¬ PUPPETEER Ã„Â°LE LÃ„Â°NKEDÃ„Â°N Ãƒâ€¡ALIÃ…Å¾AN Ãƒâ€¡EKME Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function scrapeLinkedInWithPuppeteer(companyName: string): Promise<any[]> {
  const puppeteer = require('puppeteer');
  let browser: any = null;

  try {
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
      headless: true,
    });

    const page = await browser.newPage();

    // User agent ayarla
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // LinkedIn cookie ekle
    if (LI_AT) {
      await page.setCookie({
        name: 'li_at',
        value: LI_AT,
        domain: '.linkedin.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
    }

    // LinkedIn arama sayfasÃ„Â±na git
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName)}&origin=GLOBAL_SEARCH_HEADER&titleFreeText=CEO%20OR%20Kurucu%20OR%20M%C3%BCd%C3%BCr%20OR%20Sahibi%20OR%20Founder%20OR%20Director`;

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Login gerekiyor mu kontrol et
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
      console.log('LinkedIn login required - li_at cookie expired');
      await browser.close();
      return [];
    }

    // SonuÃƒÂ§larÃ„Â± ÃƒÂ§ek
    const persons = await page.evaluate(() => {
      const results: any[] = [];
      const cards = document.querySelectorAll('.reusable-search__result-container, .search-results__list li');

      cards.forEach((card: any) => {
        const nameEl = card.querySelector('.entity-result__title-text a span[aria-hidden="true"], .actor-name');
        const titleEl = card.querySelector('.entity-result__primary-subtitle, .subline-level-1');
        const locationEl = card.querySelector('.entity-result__secondary-subtitle, .subline-level-2');
        const linkEl = card.querySelector('.entity-result__title-text a, a.app-aware-link');
        const photoEl = card.querySelector('img.presence-entity__image, .evi-image');

        const name = nameEl?.textContent?.trim();
        const title = titleEl?.textContent?.trim();
        const location = locationEl?.textContent?.trim();
        const profileUrl = linkEl?.href?.split('?')[0];
        const photo = photoEl?.src;

        if (name && name.length > 2 && !name.includes('LinkedIn Member')) {
          results.push({ name, title, location, profileUrl, photo });
        }
      });

      return results.slice(0, 15);
    });

    await browser.close();
    return persons;

  } catch (e: any) {
    console.error('Puppeteer error:', e.message);
    if (browser) await browser.close().catch(() => {});
    return [];
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ AI Ã„Â°LE Ãƒâ€¡ALIÃ…Å¾AN ANALÃ„Â°ZÃ„Â° Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function analyzeEmployees(employees: any[], companyName: string, sector: string): Promise<any[]> {
  if (!employees.length) return [];

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Ã…Å¾irket: ${companyName}, SektÃƒÂ¶r: ${sector}

Ãƒâ€¡alÃ„Â±Ã…Å¸anlar:
${employees.map((e, i) => `${i+1}. ${e.name} - ${e.title || ''}`).join('\n')}

Her ÃƒÂ§alÃ„Â±Ã…Å¸an iÃƒÂ§in karar verici analizi yap. JSON dÃƒÂ¶ndÃƒÂ¼r:
{
  "analyses": [
    {
      "index": 1,
      "isDecisionMaker": true,
      "decisionPower": "yÃƒÂ¼ksek/orta/dÃƒÂ¼Ã…Å¸ÃƒÂ¼k",
      "personalizedOpener": "max 100 karakter WA mesajÃ„Â±",
      "approachStrategy": "kÃ„Â±sa strateji"
    }
  ]
}`
      }]
    });

    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    if (!m) return employees;

    const aiData = JSON.parse(m[0]);
    return employees.map((emp, i) => {
      const analysis = aiData.analyses?.find((a: any) => a.index === i + 1);
      return { ...emp, aiAnalysis: analysis || null };
    });
  } catch {
    return employees;
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ AI Ã„Â°LE TAHMIN (LinkedIn yoksa) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function predictDecisionMakers(companyName: string, sector: string): Promise<any[]> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `${companyName} (${sector || 'genel'}) Ã…Å¸irketinin muhtemel yÃƒÂ¶neticilerini tahmin et.

JSON dÃƒÂ¶ndÃƒÂ¼r:
{
  "persons": [
    {
      "name": "Tahmin edilen isim veya 'Ã…Å¾irket Yetkilisi'",
      "title": "CEO/Kurucu/Genel MÃƒÂ¼dÃƒÂ¼r/Sahip",
      "isDecisionMaker": true,
      "personalizedOpener": "Merhaba, ${companyName} ile ilgili kÃ„Â±sa gÃƒÂ¶rÃƒÂ¼Ã…Å¸mek istiyordum",
      "approachStrategy": "2 cÃƒÂ¼mle yaklaÃ…Å¸Ã„Â±m stratejisi"
    }
  ]
}`
      }]
    });
    const m = resp.content[0]?.text?.match(/\{[\s\S]*\}/);
    if (!m) return [];
    const data = JSON.parse(m[0]);
    return (data.persons || []).map((p: any) => ({
      ...p,
      source: 'ai_prediction',
      aiAnalysis: { isDecisionMaker: p.isDecisionMaker, personalizedOpener: p.personalizedOpener, approachStrategy: p.approachStrategy, decisionPower: 'yÃƒÂ¼ksek' },
    }));
  } catch { return []; }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ ROUTES Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

router.get('/status', async (req: any, res: any) => {
  res.json({
    connected: true,
    email: LI_AT ? 'Puppeteer + AI Modu Ã¢Å“â€¦' : 'Sadece AI Modu',
    status: 'connected',
  });
});

router.post('/find-decision-makers', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId } = req.body;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadÃ„Â±' });

    console.log(`Searching employees: ${lead.company_name}`);

    // 1. Puppeteer ile LinkedIn'den ÃƒÂ§alÃ„Â±Ã…Å¸an ÃƒÂ§ek
    let employees: any[] = [];
    try { employees = await scrapeLinkedInWithPuppeteer(lead.company_name); } catch(puppErr: any) { console.log('Puppeteer failed, using AI:', puppErr.message); }

    // 2. SonuÃƒÂ§ yoksa AI ile tahmin et
    if (!employees.length) {
      console.log(`No LinkedIn results, using AI prediction for ${lead.company_name}`);
      employees = await predictDecisionMakers(lead.company_name, lead.sector || '');
    } else {
      // LinkedIn sonuÃƒÂ§larÃ„Â±nÃ„Â± AI ile analiz et
      employees = await analyzeEmployees(employees, lead.company_name, lead.sector || '');
    }

    // DB'ye kaydet
    const enriched = [];
    for (const emp of employees.slice(0, 10)) {
      const { data: saved } = await supabase.from('person_database').upsert([{
        user_id: userId,
        lead_id: leadId,
        name: emp.name,
        title: emp.title || '',
        company: lead.company_name,
        linkedin_url: emp.profileUrl || '',
        photo_url: emp.photo || '',
        source: emp.source || 'linkedin_puppeteer',
        ai_analysis: emp.aiAnalysis ? JSON.stringify(emp.aiAnalysis) : null,
        is_decision_maker: emp.aiAnalysis?.isDecisionMaker || false,
      }], { onConflict: 'user_id,name,company' }).catch(async () => { return supabase.from('person_database').insert }).select().single();

      enriched.push({ ...emp, id: saved?.id });
    }

    res.json({ lead: lead.company_name, found: enriched.length, persons: enriched });
  } catch (e: any) {
    console.error('Find DM error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/find-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { limit = 5 } = req.body;
    const { data: leads } = await supabase.from('leads').select('*').eq('user_id', userId).limit(limit);
    if (!leads?.length) return res.json({ message: 'Lead yok', processed: 0 });

    res.json({ message: `${leads.length} Ã…Å¸irket taranÃ„Â±yor...`, total: leads.length });

    (async () => {
      let processed = 0;
      for (const lead of leads) {
        try {
          let employees: any[] = [];
    try { employees = await scrapeLinkedInWithPuppeteer(lead.company_name); } catch(puppErr: any) { console.log('Puppeteer failed, using AI:', puppErr.message); }
          if (!employees.length) employees = await predictDecisionMakers(lead.company_name, lead.sector || '');

          for (const emp of employees.slice(0, 3)) {
            await supabase.from('person_database').upsert([{
              user_id: userId, lead_id: lead.id,
              name: emp.name, title: emp.title || '',
              company: lead.company_name,
              linkedin_url: emp.profileUrl || '',
              source: emp.source || 'linkedin_puppeteer',
              is_decision_maker: emp.aiAnalysis?.isDecisionMaker || true,
              ai_analysis: emp.aiAnalysis ? JSON.stringify(emp.aiAnalysis) : null,
            }], { onConflict: 'user_id,name,company' }).catch(async () => { return supabase.from('person_database').insert });
          }
          processed++;
          await sleep(5000); // LinkedIn rate limit
        } catch (e: any) {
          console.error(`Batch error ${lead.company_name}:`, e.message);
        }
      }
      console.log(`Batch done: ${processed}/${leads.length}`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

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
          status: 'new', source: 'LinkedIn',
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

router.post('/send-whatsapp', async (req: any, res: any) => {
  try {
    const { personId, message } = req.body;
    const { data: person } = await supabase.from('person_database').select('*').eq('id', personId).eq('user_id', req.userId).single();
    if (!person?.phone) return res.status(400).json({ error: 'Telefon yok' });
    const analysis = person.ai_analysis ? (() => { try { return JSON.parse(person.ai_analysis); } catch { return null; } })() : null;
    const firstName = person.name.split(' ')[0];
    const finalMsg = message || analysis?.personalizedOpener || `Merhaba ${firstName} Bey/HanÃ„Â±m, ${person.company} ile gÃƒÂ¶rÃƒÂ¼Ã…Å¸ebilir miyiz?`;
    const { sendWhatsAppMessage } = require('./settings');
    await sendWhatsAppMessage(req.userId, person.phone, finalMsg);
    await supabase.from('messages').insert([{ user_id: req.userId, lead_id: person.lead_id, direction: 'out', content: finalMsg, channel: 'whatsapp', sent_at: new Date().toISOString() }]);
    res.json({ message: 'WhatsApp gÃƒÂ¶nderildi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/auth-url', async (req: any, res: any) => {
  const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
  const REDIRECT_URI = 'https://leadflow-ai-web-kappa.vercel.app/api/auth/linkedin/callback';
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  const state = Buffer.from(JSON.stringify({ userId: req.userId, token, ts: Date.now() })).toString('base64');
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email%20w_member_social&state=${state}`;
  res.json({ url });
});

router.post('/callback', async (req: any, res: any) => {
  try {
    const { code } = req.body;
    const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
    const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
    const REDIRECT_URI = 'https://leadflow-ai-web-kappa.vercel.app/api/auth/linkedin/callback';
    const tokenResp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: CLIENT_ID, client_secret: CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const { access_token, expires_in } = tokenResp.data;
    const profileResp = await axios.get('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${access_token}` } });
    const profile = profileResp.data;
    await supabase.from('user_settings').upsert({
      user_id: req.userId,
      linkedin_access_token: access_token,
      linkedin_token_expires: new Date(Date.now() + expires_in * 1000).toISOString(),
      linkedin_profile_name: profile.name,
      linkedin_profile_email: profile.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    res.json({ success: true, profile: { name: profile.name, email: profile.email }, message: 'LinkedIn baÃ„Å¸landÃ„Â±!' });
  } catch (e: any) {
    res.status(500).json({ error: e.response?.data?.error_description || e.message });
  }
});

router.post('/connect', async (req: any, res: any) => { res.json({ connected: true }); });
router.post('/disconnect', async (req: any, res: any) => { res.json({ message: 'BaÃ„Å¸lantÃ„Â± kesildi' }); });

module.exports = router;