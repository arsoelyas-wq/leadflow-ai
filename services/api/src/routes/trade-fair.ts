export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' };

// ── FUAR KATILIMCI BULMAK ─────────────────────────────────
async function findFairExhibitors(fairName: string, sector: string, country: string): Promise<any[]> {
  const exhibitors: any[] = [];
  const queries = [
    `"${fairName}" katilimci exhibitor listesi telefon iletisim`,
    `"${fairName}" ${sector} firma listesi`,
    `site:linkedin.com "${fairName}" ${sector} ${country}`,
  ];

  for (const query of queries) {
    try {
      const response = await axios.get(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=tr`,
        { headers: HEADERS, timeout: 10000 }
      );
      const $ = cheerio.load(response.data);

      $('div.g, .tF2Cxc').each((_: any, el: any) => {
        const title = $(el).find('h3').text();
        const snippet = $(el).find('.VwiC3b').text();
        const link = $(el).find('a').first().attr('href') || '';
        const text = title + ' ' + snippet;

        const phoneMatch = text.match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        const companyName = title.split(/[-|–]/)[0].trim();

        if (companyName && companyName.length > 3 && !exhibitors.find(e => e.company_name === companyName)) {
          exhibitors.push({
            company_name: companyName,
            phone: phoneMatch?.[0]?.replace(/\s/g, '') || null,
            email: emailMatch?.[0] || null,
            linkedin_url: link.includes('linkedin.com') ? link.split('?')[0] : null,
            country: country,
            sector: sector,
            source: 'fair_exhibitor',
          });
        }
      });

      await sleep(600);
    } catch {}
  }

  return exhibitors.slice(0, 30);
}

// ── AI RANDEVU MESAJI ─────────────────────────────────────
async function generateFairMessage(lead: any, fair: any, type: 'pre' | 'post'): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: type === 'pre'
          ? `Fuar öncesi randevu mesajı yaz. SADECE mesaj metni. Şirket: ${lead.company_name || lead.contact_name}, Fuar: ${fair.name}, Stand: ${fair.stand_no || 'belirlenecek'}, Tarih: ${fair.start_date}. Randevu teklif et, max 150 karakter.`
          : `Fuar sonrası teşekkür mesajı yaz. SADECE mesaj metni. Şirket: ${lead.company_name}, Fuar: ${fair.name}. Tanışma için teşekkür et, devam toplantısı öner, max 150 karakter.`
      }]
    });
    return resp.content[0]?.text?.trim() || (type === 'pre' ? `${fair.name} fuarında görüşmek ister misiniz?` : `${fair.name} fuarında tanışmak güzeldi!`);
  } catch {
    return type === 'pre' ? `${fair.name} fuarında standımızda görüşelim mi?` : `${fair.name} fuarında tanışmak çok güzeldi, devam edelim!`;
  }
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/trade-fair/fairs
router.get('/fairs', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('trade_fairs').select('*').eq('user_id', req.userId).order('start_date', { ascending: true });
    res.json({ fairs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/trade-fair/fairs — Fuar ekle
router.post('/fairs', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, country, city, start_date, end_date, sector, website, venue, stand_no } = req.body;
    if (!name || !start_date) return res.status(400).json({ error: 'name ve start_date zorunlu' });

    const { data } = await supabase.from('trade_fairs').insert([{
      user_id: userId, name, country, city, start_date, end_date, sector, website, venue, stand_no, status: 'upcoming'
    }]).select().single();

    res.json({ fair: data, message: 'Fuar eklendi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/trade-fair/scrape-exhibitors — Katılımcıları bul
router.post('/scrape-exhibitors', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { fairId } = req.body;

    const { data: fair } = await supabase.from('trade_fairs').select('*').eq('id', fairId).eq('user_id', userId).single();
    if (!fair) return res.status(404).json({ error: 'Fuar bulunamadı' });

    res.json({ message: `${fair.name} fuarı katılımcıları aranıyor...` });

    (async () => {
      const exhibitors = await findFairExhibitors(fair.name, fair.sector || '', fair.country || '');

      let added = 0;
      for (const exhibitor of exhibitors) {
        const { data: existing } = await supabase.from('fair_exhibitors').select('id')
          .eq('fair_id', fairId).eq('company_name', exhibitor.company_name).maybeSingle();
        if (!existing) {
          await supabase.from('fair_exhibitors').insert([{ ...exhibitor, fair_id: fairId, user_id: userId }]);
          added++;
        }
      }
      console.log(`Fair exhibitors scraped: ${added} added for ${fair.name}`);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/trade-fair/send-pre-messages — Fuar öncesi mesajlar
router.post('/send-pre-messages', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { fairId } = req.body;

    const [{ data: fair }, { data: exhibitors }] = await Promise.all([
      supabase.from('trade_fairs').select('*').eq('id', fairId).eq('user_id', userId).single(),
      supabase.from('fair_exhibitors').select('*').eq('fair_id', fairId).eq('pre_message_sent', false).limit(50),
    ]);

    if (!fair || !exhibitors?.length) return res.status(400).json({ error: 'Fuar veya katılımcı bulunamadı' });

    res.json({ message: `${exhibitors.length} katılımcıya fuar öncesi mesaj gönderiliyor...` });

    (async () => {
      const { sendWhatsAppMessage } = require('./settings');
      let sent = 0;
      for (const exhibitor of exhibitors) {
        if (!exhibitor.phone) continue;
        try {
          const message = await generateFairMessage(exhibitor, fair, 'pre');
          await sendWhatsAppMessage(userId, exhibitor.phone, message);
          await supabase.from('fair_exhibitors').update({ pre_message_sent: true, pre_message_at: new Date().toISOString() }).eq('id', exhibitor.id);

          // Lead olarak ekle
          const { data: existingLead } = await supabase.from('leads').select('id').eq('user_id', userId).eq('phone', exhibitor.phone).maybeSingle();
          if (!existingLead) {
            await supabase.from('leads').insert([{
              user_id: userId, company_name: exhibitor.company_name,
              phone: exhibitor.phone, email: exhibitor.email,
              source: 'trade_fair', status: 'contacted',
              sector: fair.sector, country: exhibitor.country,
            }]);
          }
          sent++;
          await sleep(12000);
        } catch {}
      }
      console.log(`Pre-fair messages sent: ${sent}/${exhibitors.length}`);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/trade-fair/send-post-messages — Fuar sonrası teşekkür
router.post('/send-post-messages', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { fairId } = req.body;

    const [{ data: fair }, { data: exhibitors }] = await Promise.all([
      supabase.from('trade_fairs').select('*').eq('id', fairId).eq('user_id', userId).single(),
      supabase.from('fair_exhibitors').select('*').eq('fair_id', fairId).eq('meeting_scheduled', true).eq('post_message_sent', false).limit(50),
    ]);

    if (!fair || !exhibitors?.length) return res.status(400).json({ error: 'Fuar veya görüşme yapılan katılımcı bulunamadı' });

    res.json({ message: `${exhibitors.length} kişiye teşekkür mesajı gönderiliyor...` });

    (async () => {
      const { sendWhatsAppMessage } = require('./settings');
      let sent = 0;
      for (const exhibitor of exhibitors) {
        if (!exhibitor.phone) continue;
        try {
          const message = await generateFairMessage(exhibitor, fair, 'post');
          await sendWhatsAppMessage(userId, exhibitor.phone, message);
          await supabase.from('fair_exhibitors').update({ post_message_sent: true, post_message_at: new Date().toISOString() }).eq('id', exhibitor.id);
          sent++;
          await sleep(12000);
        } catch {}
      }
      console.log(`Post-fair messages sent: ${sent}/${exhibitors.length}`);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/trade-fair/exhibitors/:fairId
router.get('/exhibitors/:fairId', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('fair_exhibitors').select('*').eq('fair_id', req.params.fairId).order('created_at', { ascending: false });
    res.json({ exhibitors: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/trade-fair/exhibitors/:id/meeting — Görüşme işaretle
router.patch('/exhibitors/:id/meeting', async (req: any, res: any) => {
  try {
    await supabase.from('fair_exhibitors').update({ meeting_scheduled: true, meeting_notes: req.body.notes }).eq('id', req.params.id);
    res.json({ message: 'Görüşme işaretlendi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/trade-fair/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data: fairs } = await supabase.from('trade_fairs').select('id').eq('user_id', req.userId);
    const { data: exhibitors } = await supabase.from('fair_exhibitors').select('pre_message_sent, post_message_sent, meeting_scheduled').eq('user_id', req.userId);
    res.json({
      totalFairs: fairs?.length || 0,
      totalExhibitors: exhibitors?.length || 0,
      preSent: exhibitors?.filter((e: any) => e.pre_message_sent).length || 0,
      meetings: exhibitors?.filter((e: any) => e.meeting_scheduled).length || 0,
      postSent: exhibitors?.filter((e: any) => e.post_message_sent).length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;