export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// ── YARDIMCI: Metin temizle ───────────────────────────────────────────────
function cleanText(text: string): string {
  return text?.replace(/\s+/g, ' ').trim() || '';
}

// ── EKAP.GOV.TR - Türkiye Kamu İhaleleri ────────────────────────────────
async function scrapeEKAP(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://ekap.kik.gov.tr/EKAP/common/ilanSorgula.jsp?ilanTipiList=1,2,3&ihaleTuru=&yakinTarihSay=30&ilanAdi=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);

    $('table.sonucTablosu tr, table tr').each((_: any, row: any) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const title = cleanText($(cells[0]).text());
      const institution = cleanText($(cells[1]).text());
      const deadline = cleanText($(cells[2]).text());
      const budget = cleanText($(cells[3])?.text() || '');

      if (title && title.length > 10 && !title.includes('İhale Adı')) {
        tenders.push({
          source: 'EKAP',
          source_url: 'https://ekap.kik.gov.tr',
          title: title.substring(0, 300),
          institution: institution.substring(0, 200),
          deadline: deadline || null,
          budget_text: budget || null,
          country: 'Türkiye',
          currency: 'TRY',
          sector: keyword,
          status: 'active',
        });
      }
    });
  } catch (e: any) {
    console.log('EKAP scrape error:', e.message);
  }
  return tenders.slice(0, 20);
}

// ── TED.EUROPA.EU - AB İhaleleri ─────────────────────────────────────────
async function scrapeTED(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://ted.europa.eu/en/search/result?scope=NOTICE&fullText=${encodeURIComponent(keyword)}&sortColumn=PUBLICATION_DATE&sortOrder=DESC&page=1&pageSize=20`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);

    $('article.search-result, .result-item, .notice-item').each((_: any, el: any) => {
      const title = cleanText($(el).find('h2, h3, .title, .notice-title').first().text());
      const institution = cleanText($(el).find('.authority, .contracting-authority, .buyer').first().text());
      const deadline = cleanText($(el).find('.deadline, .submission-date, time').first().text());
      const country = cleanText($(el).find('.country, .location').first().text());
      const link = $(el).find('a').first().attr('href') || '';

      if (title && title.length > 10) {
        tenders.push({
          source: 'TED Europa',
          source_url: link.startsWith('http') ? link : `https://ted.europa.eu${link}`,
          title: title.substring(0, 300),
          institution: institution.substring(0, 200),
          deadline: deadline || null,
          budget_text: null,
          country: country || 'Avrupa Birliği',
          currency: 'EUR',
          sector: keyword,
          status: 'active',
        });
      }
    });

    // Fallback: JSON-LD veya meta veri
    if (tenders.length === 0) {
      $('script[type="application/ld+json"]').each((_: any, el: any) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          if (json.name) {
            tenders.push({
              source: 'TED Europa',
              source_url: json.url || 'https://ted.europa.eu',
              title: String(json.name).substring(0, 300),
              institution: String(json.organizer?.name || '').substring(0, 200),
              deadline: json.endDate || null,
              budget_text: null,
              country: 'Avrupa Birliği',
              currency: 'EUR',
              sector: keyword,
              status: 'active',
            });
          }
        } catch {}
      });
    }
  } catch (e: any) {
    console.log('TED scrape error:', e.message);
  }
  return tenders.slice(0, 15);
}

// ── UNGM.ORG - BM İhaleleri ───────────────────────────────────────────────
async function scrapeUNGM(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://www.ungm.org/Public/Notice?title=${encodeURIComponent(keyword)}&deadline=true&sortOrder=0`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);

    $('tr.tableRow, .notice-row, table tbody tr').each((_: any, row: any) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const title = cleanText($(cells[0]).text() || $(cells[1]).text());
      const institution = cleanText($(cells[1])?.text() || '');
      const deadline = cleanText($(cells[cells.length - 1])?.text() || '');
      const link = $(row).find('a').first().attr('href') || '';

      if (title && title.length > 10 && !title.toLowerCase().includes('title')) {
        tenders.push({
          source: 'UNGM',
          source_url: link.startsWith('http') ? link : `https://www.ungm.org${link}`,
          title: title.substring(0, 300),
          institution: institution.substring(0, 200),
          deadline: deadline || null,
          budget_text: null,
          country: 'Uluslararası (BM)',
          currency: 'USD',
          sector: keyword,
          status: 'active',
        });
      }
    });
  } catch (e: any) {
    console.log('UNGM scrape error:', e.message);
  }
  return tenders.slice(0, 15);
}

// ── WORLD BANK - Dünya Bankası ────────────────────────────────────────────
async function scrapeWorldBank(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const apiUrl = `https://search.worldbank.org/api/v2/procurement?qterm=${encodeURIComponent(keyword)}&format=json&rows=15&fl=id,title,contactOrganization,deadlineDate,totalContractAmount,curr,url`;
    const response = await axios.get(apiUrl, { headers: HEADERS, timeout: 15000 });
    const data = response.data;

    const docs = data?.procurement?.docs || data?.response?.docs || [];
    for (const doc of docs) {
      tenders.push({
        source: 'World Bank',
        source_url: doc.url || `https://projects.worldbank.org/en/projects-operations/procurement/debarred-firms`,
        title: String(doc.title || '').substring(0, 300),
        institution: String(doc.contactOrganization || 'World Bank').substring(0, 200),
        deadline: doc.deadlineDate ? new Date(doc.deadlineDate).toISOString() : null,
        budget_text: doc.totalContractAmount ? `${doc.totalContractAmount} ${doc.curr || 'USD'}` : null,
        country: 'Uluslararası (Dünya Bankası)',
        currency: doc.curr || 'USD',
        sector: keyword,
        status: 'active',
      });
    }
  } catch (e: any) {
    console.log('WorldBank scrape error:', e.message);
  }
  return tenders.slice(0, 15);
}

// ── ORTA DOĞU - Google News Scraping ─────────────────────────────────────
async function scrapeMiddleEast(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  const regions = [
    { q: `${keyword} tender UAE Dubai Abu Dhabi 2026`, country: 'BAE' },
    { q: `${keyword} tender Qatar Doha 2026`, country: 'Katar' },
    { q: `${keyword} tender Saudi Arabia 2026`, country: 'Suudi Arabistan' },
  ];

  for (const region of regions) {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(region.q)}&tbm=nws&num=5&hl=tr`;
      const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });
      const $ = cheerio.load(response.data);

      $('div.g, .SoaBEf, article').each((_: any, el: any) => {
        const title = cleanText($(el).find('h3, .mCBkyc').first().text());
        const snippet = cleanText($(el).find('.GI74Re, .VwiC3b, p').first().text());
        const link = $(el).find('a').first().attr('href') || '';

        if (title && title.length > 10 && (title.toLowerCase().includes('tender') || title.toLowerCase().includes('procurement') || title.toLowerCase().includes('contract') || snippet.toLowerCase().includes('tender'))) {
          tenders.push({
            source: `Orta Doğu - ${region.country}`,
            source_url: link.startsWith('/url?q=') ? decodeURIComponent(link.replace('/url?q=', '').split('&')[0]) : link,
            title: title.substring(0, 300),
            institution: snippet.substring(0, 200),
            deadline: null,
            budget_text: null,
            country: region.country,
            currency: region.country === 'Katar' ? 'QAR' : region.country === 'BAE' ? 'AED' : 'SAR',
            sector: keyword,
            status: 'active',
          });
        }
      });

      await sleep(500);
    } catch {}
  }
  return tenders.slice(0, 15);
}

// ── AI: İhale Uygunluk Skoru + Özet ──────────────────────────────────────
async function scoreAndSummarizeTender(tender: any, userProfile: string): Promise<{ score: number; summary: string; recommendation: string }> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `İhale değerlendirme yap. SADECE JSON döndür, başka hiçbir şey yazma.

İhale: ${tender.title}
Kurum: ${tender.institution}
Kaynak: ${tender.source}
Ülke: ${tender.country}
Sektör: ${tender.sector}
Bütçe: ${tender.budget_text || 'Belirtilmemiş'}
Kullanıcı Profili: ${userProfile}

JSON formatı:
{"score": 85, "summary": "Kısa özet max 100 karakter", "recommendation": "Neden başvurmalı veya başvurmamalı max 150 karakter"}`
      }]
    });

    const text = resp.content[0]?.text?.trim() || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      summary: String(parsed.summary || '').substring(0, 200),
      recommendation: String(parsed.recommendation || '').substring(0, 300),
    };
  } catch {
    return { score: 50, summary: tender.title.substring(0, 100), recommendation: 'Manuel inceleme yapınız.' };
  }
}

// ── AI: Teklif Taslağı Oluştur ────────────────────────────────────────────
async function generateProposalDraft(tender: any, companyInfo: string): Promise<string> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Profesyonel ihale teklif mektubu taslağı yaz. Türkçe olsun.

İhale Adı: ${tender.title}
İhale Kurumu: ${tender.institution}
Kaynak: ${tender.source}
Ülke: ${tender.country}
Son Başvuru: ${tender.deadline || 'Belirtilmemiş'}
Bütçe: ${tender.budget_text || 'Belirtilmemiş'}

Firma Bilgileri: ${companyInfo}

Profesyonel, ikna edici ve kuruma özgü bir teklif mektubu yaz. Şunları içersin:
1. Resmi başlık ve selamlama
2. Firmayı tanıtım (2-3 cümle)
3. Bu ihale için neden uygun olduğumuz (3-4 madde)
4. Teklifin özeti ve avantajlar
5. Kapanış ve iletişim daveti

Format: Düzgün paragraflar halinde, madde işaretleri kullan.`
      }]
    });
    return resp.content[0]?.text?.trim() || 'Teklif taslağı oluşturulamadı.';
  } catch (e: any) {
    return `Teklif taslağı oluşturulurken hata oluştu: ${e.message}`;
  }
}

// ── ROUTES ────────────────────────────────────────────────────────────────

// GET /api/tenders — İhaleleri listele
router.get('/', async (req: any, res: any) => {
  try {
    const { source, country, sector, min_score, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('tenders')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .order('ai_score', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (source) query = query.eq('source', source);
    if (country) query = query.ilike('country', `%${country}%`);
    if (sector) query = query.ilike('sector', `%${sector}%`);
    if (min_score) query = query.gte('ai_score', Number(min_score));

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ tenders: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tenders/scan — İhale tara
router.post('/scan', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, sources = ['ekap', 'ted', 'ungm', 'worldbank', 'middleeast'], user_profile = '' } = req.body;

    if (!keyword) return res.status(400).json({ error: 'keyword zorunlu' });

    // Tarama kaydı oluştur
    const { data: scan } = await supabase.from('tender_scans').insert([{
      user_id: userId,
      keyword,
      sources,
      status: 'running',
      started_at: new Date().toISOString(),
    }]).select().single();

    res.json({
      message: `"${keyword}" için ihale taraması başlatıldı. Sonuçlar hazır olunca bildirim alacaksınız.`,
      scanId: scan?.id,
    });

    // Arka planda tara
    (async () => {
      try {
        const allTenders: any[] = [];

        const tasks: Promise<any[]>[] = [];
        if (sources.includes('ekap')) tasks.push(scrapeEKAP(keyword));
        if (sources.includes('ted')) tasks.push(scrapeTED(keyword));
        if (sources.includes('ungm')) tasks.push(scrapeUNGM(keyword));
        if (sources.includes('worldbank')) tasks.push(scrapeWorldBank(keyword));
        if (sources.includes('middleeast')) tasks.push(scrapeMiddleEast(keyword));

        const results = await Promise.allSettled(tasks);
        results.forEach(r => { if (r.status === 'fulfilled') allTenders.push(...r.value); });

        console.log(`Tender scan: ${allTenders.length} raw tenders found for "${keyword}"`);

        let added = 0;
        for (const tender of allTenders) {
          // Duplicate kontrolü
          const { data: existing } = await supabase.from('tenders')
            .select('id').eq('user_id', userId)
            .ilike('title', `%${tender.title.substring(0, 50)}%`)
            .maybeSingle();

          if (existing) continue;

          // AI skorlama
          let aiScore = 50;
          let aiSummary = '';
          let aiRecommendation = '';

          if (process.env.ANTHROPIC_API_KEY) {
            const scored = await scoreAndSummarizeTender(tender, user_profile || keyword);
            aiScore = scored.score;
            aiSummary = scored.summary;
            aiRecommendation = scored.recommendation;
            await sleep(500);
          }

          await supabase.from('tenders').insert([{
            user_id: userId,
            scan_id: scan?.id,
            ...tender,
            ai_score: aiScore,
            ai_summary: aiSummary,
            ai_recommendation: aiRecommendation,
          }]);
          added++;
        }

        // Scan güncelle
        await supabase.from('tender_scans').update({
          status: 'completed',
          tenders_found: added,
          completed_at: new Date().toISOString(),
        }).eq('id', scan?.id);

        // Yüksek skorlu ihaleleri bildirim için işaretle
        const { data: hotTenders } = await supabase.from('tenders')
          .select('id').eq('user_id', userId).eq('scan_id', scan?.id)
          .gte('ai_score', 75);

        if (hotTenders?.length) {
          await supabase.from('tenders').update({ notify_sent: false }).in('id', hotTenders.map((t: any) => t.id));
        }

        console.log(`Tender scan complete: ${added} saved for "${keyword}"`);
      } catch (err: any) {
        console.error('Tender scan background error:', err.message);
        await supabase.from('tender_scans').update({ status: 'failed' }).eq('id', scan?.id);
      }
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tenders/:id — Tek ihale detayı
router.get('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('tenders')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'İhale bulunamadı' });
    res.json({ tender: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tenders/:id/proposal — AI teklif taslağı oluştur
router.post('/:id/proposal', async (req: any, res: any) => {
  try {
    const { company_info } = req.body;
    if (!company_info) return res.status(400).json({ error: 'company_info zorunlu' });

    const { data: tender, error } = await supabase
      .from('tenders').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();

    if (error || !tender) return res.status(404).json({ error: 'İhale bulunamadı' });

    const draft = await generateProposalDraft(tender, company_info);

    // Kaydet
    await supabase.from('tenders').update({
      proposal_draft: draft,
      proposal_created_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    res.json({ proposal: draft });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/tenders/:id — Durum güncelle (dismissed, applied, won, lost)
router.patch('/:id', async (req: any, res: any) => {
  try {
    const allowed = ['status', 'notes', 'applied_at', 'result'];
    const updates: any = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tenders').update(updates)
      .eq('id', req.params.id).eq('user_id', req.userId)
      .select().single();

    if (error) throw error;
    res.json({ tender: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/tenders/:id — İhaleyi sil / kapat
router.delete('/:id', async (req: any, res: any) => {
  try {
    await supabase.from('tenders').update({ status: 'dismissed' })
      .eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tenders/scans/history — Tarama geçmişi
router.get('/scans/history', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('tender_scans')
      .select('*')
      .eq('user_id', req.userId)
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ scans: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tenders/stats/summary — İstatistikler
router.get('/stats/summary', async (req: any, res: any) => {
  try {
    const { data: all } = await supabase.from('tenders').select('status, ai_score, source').eq('user_id', req.userId);
    const { data: scans } = await supabase.from('tender_scans').select('id').eq('user_id', req.userId);

    const tenders = all || [];
    const bySource: Record<string, number> = {};
    tenders.forEach((t: any) => { bySource[t.source] = (bySource[t.source] || 0) + 1; });

    res.json({
      total: tenders.length,
      active: tenders.filter((t: any) => t.status === 'active').length,
      applied: tenders.filter((t: any) => t.status === 'applied').length,
      won: tenders.filter((t: any) => t.status === 'won').length,
      highScore: tenders.filter((t: any) => t.ai_score >= 75).length,
      totalScans: scans?.length || 0,
      bySource,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;