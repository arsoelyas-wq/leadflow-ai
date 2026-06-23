export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' };

// ── FUAR KATILIMCI BULMAK ────────────────────────────────────────────────────
async function findFairExhibitors(fairName: string, sector: string, country: string): Promise<any[]> {
  const exhibitors: any[] = [];
  const seen = new Set<string>();

  // Exa.ai ile arama (daha guvenilir)
  const EXA_KEY = process.env.EXA_API_KEY;
  if (EXA_KEY) {
    try {
      const queries = [
        `"${fairName}" exhibitor participant company list`,
        `"${fairName}" ${sector} firma katilimci`,
      ];
      for (const q of queries) {
        const res = await axios.post('https://api.exa.ai/search', {
          query: q, numResults: 10, useAutoprompt: true,
          contents: { text: { maxCharacters: 500 } },
        }, { headers: { 'x-api-key': EXA_KEY, 'Content-Type': 'application/json' }, timeout: 15000 });

        for (const r of (res.data?.results || [])) {
          const text = (r.title || '') + ' ' + (r.text || '');
          const phoneMatch = text.match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
          const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
          const companyName = (r.title || '').split(/[-|–]/)[0].trim();
          const key = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (companyName && companyName.length > 3 && !seen.has(key)) {
            seen.add(key);
            exhibitors.push({
              company_name: companyName, phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
              email: emailMatch?.[0] || null, country, sector, source: 'fair_exhibitor',
            });
          }
        }
        await sleep(300);
      }
    } catch (e: any) { console.log('[TradeFair] Exa error:', e.message?.slice(0, 60)); }
  }

  // Google fallback
  if (exhibitors.length < 5) {
    const queries = [
      `"${fairName}" katilimci exhibitor listesi telefon iletisim`,
      `"${fairName}" ${sector} firma listesi`,
    ];
    for (const query of queries) {
      try {
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=tr`, { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(response.data);
        $('div.g, .tF2Cxc').each((_: any, el: any) => {
          const title = $(el).find('h3').text();
          const snippet = $(el).find('.VwiC3b').text();
          const text = title + ' ' + snippet;
          const phoneMatch = text.match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
          const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
          const companyName = title.split(/[-|–]/)[0].trim();
          const key = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (companyName && companyName.length > 3 && !seen.has(key)) {
            seen.add(key);
            exhibitors.push({
              company_name: companyName, phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
              email: emailMatch?.[0] || null, country, sector, source: 'fair_exhibitor',
            });
          }
        });
        await sleep(600);
      } catch (e: any) { console.log('[TradeFair] Google error:', e.message?.slice(0, 60)); }
    }
  }

  return exhibitors.slice(0, 30);
}

// ── AI MESAJ URETIMI ─────────────────────────────────────────────────────────
async function generateFairMessage(lead: any, fair: any, type: 'pre' | 'post'): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 200,
      messages: [{
        role: 'user',
        content: type === 'pre'
          ? `Fuar oncesi randevu mesaji yaz. SADECE mesaj metni. Sirket: ${lead.company_name || lead.contact_name}, Fuar: ${fair.name}, Stand: ${fair.stand_no || 'belirlenecek'}, Tarih: ${fair.start_date}. Randevu teklif et, max 150 karakter.`
          : `Fuar sonrasi tesekkur mesaji yaz. SADECE mesaj metni. Sirket: ${lead.company_name}, Fuar: ${fair.name}. Tanisma icin tesekkur et, devam toplantisi oner, max 150 karakter.`
      }]
    });
    return resp.content[0]?.text?.trim() || (type === 'pre' ? `${fair.name} fuarinda gorusmek ister misiniz?` : `${fair.name} fuarinda tanismak guzeldi!`);
  } catch {
    return type === 'pre' ? `${fair.name} fuarinda standimizda goruselim mi?` : `${fair.name} fuarinda tanismak cok guzeldi, devam edelim!`;
  }
}

// ── ROUTES ───────────────────────────────────────────────────────────────────

router.get('/fairs', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('trade_fairs').select('*').eq('user_id', req.userId).order('start_date', { ascending: true });
    res.json({ fairs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/fairs', async (req: any, res: any) => {
  try {
    const { name, country, city, start_date, end_date, sector, website, venue, stand_no } = req.body;
    if (!name || !start_date) return res.status(400).json({ error: 'name ve start_date zorunlu' });
    const { data } = await supabase.from('trade_fairs').insert([{
      user_id: req.userId, name, country, city, start_date, end_date, sector, website, venue, stand_no, status: 'upcoming'
    }]).select().single();
    res.json({ fair: data, message: 'Fuar eklendi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/scrape-exhibitors', async (req: any, res: any) => {
  try {
    const { fairId } = req.body;
    const { data: fair } = await supabase.from('trade_fairs').select('*').eq('id', fairId).eq('user_id', req.userId).single();
    if (!fair) return res.status(404).json({ error: 'Fuar bulunamadi' });
    res.json({ message: `${fair.name} katilimcilari araniyor...` });
    (async () => {
      try {
        const exhibitors = await findFairExhibitors(fair.name, fair.sector || '', fair.country || '');
        let added = 0;
        for (const exhibitor of exhibitors) {
          const { data: existing } = await supabase.from('fair_exhibitors').select('id')
            .eq('fair_id', fairId).eq('user_id', req.userId).ilike('company_name', exhibitor.company_name.slice(0, 30) + '%').maybeSingle();
          if (!existing) {
            await supabase.from('fair_exhibitors').insert([{ ...exhibitor, fair_id: fairId, user_id: req.userId }]);
            added++;
          }
        }
        console.log(`[TradeFair] Scraped: ${added} for ${fair.name}`);
      } catch (e: any) { console.error('[TradeFair] Scrape error:', e.message); }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/send-pre-messages', async (req: any, res: any) => {
  try {
    const { fairId } = req.body;
    const [{ data: fair }, { data: exhibitors }] = await Promise.all([
      supabase.from('trade_fairs').select('*').eq('id', fairId).eq('user_id', req.userId).single(),
      supabase.from('fair_exhibitors').select('*').eq('fair_id', fairId).eq('user_id', req.userId).eq('pre_message_sent', false).limit(50),
    ]);
    if (!fair || !exhibitors?.length) return res.status(400).json({ error: 'Fuar veya katilimci bulunamadi' });
    res.json({ message: `${exhibitors.length} katilimciya mesaj gonderiliyor...`, total: exhibitors.length });
    (async () => {
      const { sendWhatsAppMessage } = require('./settings');
      let sent = 0;
      for (const ex of exhibitors) {
        if (!ex.phone) continue;
        try {
          const message = await generateFairMessage(ex, fair, 'pre');
          await sendWhatsAppMessage(req.userId, ex.phone, message);
          await supabase.from('fair_exhibitors').update({ pre_message_sent: true, pre_message_at: new Date().toISOString() }).eq('id', ex.id);
          const { data: existingLead } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('phone', ex.phone).maybeSingle();
          if (!existingLead) {
            await supabase.from('leads').insert([{
              user_id: req.userId, company_name: ex.company_name, phone: ex.phone, email: ex.email,
              source: 'trade_fair', status: 'contacted', sector: fair.sector, country: ex.country,
            }]);
          }
          sent++;
          await sleep(12000);
        } catch (e: any) { console.error(`[TradeFair] Pre-msg error ${ex.company_name}:`, e.message?.slice(0, 60)); }
      }
      console.log(`[TradeFair] Pre-messages: ${sent}/${exhibitors.length}`);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/send-post-messages', async (req: any, res: any) => {
  try {
    const { fairId } = req.body;
    const [{ data: fair }, { data: exhibitors }] = await Promise.all([
      supabase.from('trade_fairs').select('*').eq('id', fairId).eq('user_id', req.userId).single(),
      supabase.from('fair_exhibitors').select('*').eq('fair_id', fairId).eq('user_id', req.userId).eq('meeting_scheduled', true).eq('post_message_sent', false).limit(50),
    ]);
    if (!fair || !exhibitors?.length) return res.status(400).json({ error: 'Gorusme yapilan katilimci bulunamadi' });
    res.json({ message: `${exhibitors.length} kisiye tesekkur mesaji gonderiliyor...`, total: exhibitors.length });
    (async () => {
      const { sendWhatsAppMessage } = require('./settings');
      let sent = 0;
      for (const ex of exhibitors) {
        if (!ex.phone) continue;
        try {
          const message = await generateFairMessage(ex, fair, 'post');
          await sendWhatsAppMessage(req.userId, ex.phone, message);
          await supabase.from('fair_exhibitors').update({ post_message_sent: true, post_message_at: new Date().toISOString() }).eq('id', ex.id);
          sent++;
          await sleep(12000);
        } catch (e: any) { console.error(`[TradeFair] Post-msg error ${ex.company_name}:`, e.message?.slice(0, 60)); }
      }
      console.log(`[TradeFair] Post-messages: ${sent}/${exhibitors.length}`);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// FIX: user_id kontrolu eklendi (guvenlik acigi kapatildi)
router.get('/exhibitors/:fairId', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('fair_exhibitors').select('*')
      .eq('fair_id', req.params.fairId).eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    res.json({ exhibitors: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/exhibitors/:id/meeting', async (req: any, res: any) => {
  try {
    await supabase.from('fair_exhibitors').update({
      meeting_scheduled: true, meeting_notes: req.body.notes || null,
    }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Gorusme isaretlendi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/trade-fair/stats + conversion analytics
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: fairs } = await supabase.from('trade_fairs').select('id').eq('user_id', req.userId);
    const { data: exhibitors } = await supabase.from('fair_exhibitors').select('pre_message_sent, post_message_sent, meeting_scheduled, phone').eq('user_id', req.userId);
    const { data: fairLeads } = await supabase.from('leads').select('status').eq('user_id', req.userId).eq('source', 'trade_fair');

    const totalEx = exhibitors?.length || 0;
    const meetings = exhibitors?.filter((e: any) => e.meeting_scheduled).length || 0;
    const preSent = exhibitors?.filter((e: any) => e.pre_message_sent).length || 0;
    const wonLeads = fairLeads?.filter((l: any) => l.status === 'won').length || 0;

    res.json({
      totalFairs: fairs?.length || 0,
      totalExhibitors: totalEx,
      preSent,
      meetings,
      postSent: exhibitors?.filter((e: any) => e.post_message_sent).length || 0,
      withPhone: exhibitors?.filter((e: any) => e.phone).length || 0,
      meetingRate: totalEx > 0 ? Math.round((meetings / totalEx) * 100) : 0,
      conversionRate: meetings > 0 ? Math.round((wonLeads / meetings) * 100) : 0,
      wonFromFairs: wonLeads,
      totalFairLeads: fairLeads?.length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
