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
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache',
};

function cleanText(text: string): string {
  return text?.replace(/\s+/g, ' ').trim() || '';
}

// ── ÜLKE → KAYNAK EŞLEŞTİRMESİ ───────────────────────────────────────────
const COUNTRY_CONFIG: Record<string, { currency: string; scrapers: string[] }> = {
  'worldwide':        { currency: 'USD', scrapers: ['ekap', 'ted', 'ungm', 'worldbank', 'google'] },
  'turkey':           { currency: 'TRY', scrapers: ['ekap', 'google_tr'] },
  'eu':               { currency: 'EUR', scrapers: ['ted'] },
  'germany':          { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'france':           { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'italy':            { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'spain':            { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'netherlands':      { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'poland':           { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'uk':               { currency: 'GBP', scrapers: ['google_country'] },
  'usa':              { currency: 'USD', scrapers: ['sam_gov', 'google_country'] },
  'uae':              { currency: 'AED', scrapers: ['google_country'] },
  'saudi':            { currency: 'SAR', scrapers: ['google_country'] },
  'qatar':            { currency: 'QAR', scrapers: ['google_country'] },
  'kuwait':           { currency: 'KWD', scrapers: ['google_country'] },
  'middleeast':       { currency: 'USD', scrapers: ['google_country'] },
  'international':    { currency: 'USD', scrapers: ['ungm', 'worldbank'] },
  'africa':           { currency: 'USD', scrapers: ['worldbank', 'google_country'] },
  'asia':             { currency: 'USD', scrapers: ['worldbank', 'google_country'] },
  'russia':           { currency: 'RUB', scrapers: ['google_country'] },
  'china':            { currency: 'CNY', scrapers: ['google_country'] },
  'india':            { currency: 'INR', scrapers: ['google_country'] },
  'brazil':           { currency: 'BRL', scrapers: ['google_country'] },
};

const COUNTRY_NAMES: Record<string, string> = {
  'worldwide': 'Dünya Geneli',
  'turkey': 'Türkiye',
  'eu': 'Avrupa Birliği',
  'germany': 'Almanya',
  'france': 'Fransa',
  'italy': 'İtalya',
  'spain': 'İspanya',
  'netherlands': 'Hollanda',
  'poland': 'Polonya',
  'uk': 'İngiltere',
  'usa': 'ABD',
  'uae': 'BAE (Dubai)',
  'saudi': 'Suudi Arabistan',
  'qatar': 'Katar',
  'kuwait': 'Kuveyt',
  'middleeast': 'Orta Doğu Geneli',
  'international': 'Uluslararası (BM/Dünya Bankası)',
  'africa': 'Afrika',
  'asia': 'Asya',
  'russia': 'Rusya',
  'china': 'Çin',
  'india': 'Hindistan',
  'brazil': 'Brezilya',
};

const COUNTRY_SEARCH_TERMS: Record<string, string> = {
  'germany': 'Germany Deutschland',
  'france': 'France',
  'italy': 'Italy Italia',
  'spain': 'Spain España',
  'netherlands': 'Netherlands Holland',
  'poland': 'Poland',
  'uk': 'United Kingdom England',
  'usa': 'United States America',
  'uae': 'UAE Dubai Abu Dhabi',
  'saudi': 'Saudi Arabia',
  'qatar': 'Qatar Doha',
  'kuwait': 'Kuwait',
  'middleeast': 'Middle East Gulf',
  'africa': 'Africa',
  'asia': 'Asia',
  'russia': 'Russia',
  'china': 'China',
  'india': 'India',
  'brazil': 'Brazil',
};

// ── EKAP (Türkiye) ────────────────────────────────────────────────────────
async function scrapeEKAP(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://ekap.kik.gov.tr/EKAP/common/ilanSorgula.jsp?ilanTipiList=1,2,3,4&ihaleTuru=&yakinTarihSay=30&ilanAdi=${encodeURIComponent(keyword)}&ihaleciAdi=&ihaleTarihi=&ihaleciIl=`;
    const response = await axios.get(url, {
      headers: { ...HEADERS, 'Referer': 'https://ekap.kik.gov.tr/EKAP/', 'Host': 'ekap.kik.gov.tr' },
      timeout: 20000,
    });
    const $ = cheerio.load(response.data);
    $('table tr').each((_: any, row: any) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;
      const title = cleanText($(cells[0]).text());
      const institution = cleanText($(cells[1]).text());
      const deadline = cleanText($(cells[2]).text());
      if (title && title.length > 10 && !title.includes('İhale Adı')) {
        tenders.push({
          source: 'EKAP', source_url: 'https://ekap.kik.gov.tr/EKAP/',
          title: title.substring(0, 300), institution: institution.substring(0, 200),
          deadline: null, budget_text: deadline || null,
          country: 'Türkiye', currency: 'TRY', sector: keyword, status: 'active',
        });
      }
    });
  } catch (e: any) { console.log('EKAP scrape error:', e.message); }
  return tenders.slice(0, 20);
}

// ── TED EUROPA (AB) ───────────────────────────────────────────────────────
async function scrapeTED(keyword: string, countryCode?: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    let q = `KEYWORD%3D${encodeURIComponent(keyword)}`;
    if (countryCode) q += `%20CY%3D${countryCode.toUpperCase()}`;
    const url = `https://ted.europa.eu/api/v3.0/notices/search?q=${q}&fields=ND,TI,CY,DT,AU,VT&pageNum=1&pageSize=15&scope=3`;
    const response = await axios.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': HEADERS['User-Agent'] },
      timeout: 20000,
    });
    const notices = response.data?.results || response.data?.notices || [];
    for (const n of notices) {
      tenders.push({
        source: 'TED Europa',
        source_url: n.ND ? `https://ted.europa.eu/en/notice/-/detail/${n.ND}` : 'https://ted.europa.eu',
        title: String(n.TI || '').substring(0, 300),
        institution: String(n.AU || '').substring(0, 200),
        deadline: n.DT || null, budget_text: n.VT ? `${n.VT} EUR` : null,
        country: n.CY || 'Avrupa Birliği', currency: 'EUR', sector: keyword, status: 'active',
      });
    }
  } catch (e: any) { console.log('TED API error:', e.message); }
  return tenders.slice(0, 15);
}

// ── UNGM (BM) ────────────────────────────────────────────────────────────
async function scrapeUNGM(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://www.ungm.org/Public/Notice?title=${encodeURIComponent(keyword)}&deadline=true`;
    const response = await axios.get(url, {
      headers: { ...HEADERS, 'Referer': 'https://www.ungm.org/' },
      timeout: 20000,
    });
    const $ = cheerio.load(response.data);
    $('tr.tableRow, table.noticeList tbody tr').each((_: any, row: any) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const title = cleanText($(cells[0]).text());
      const org = cleanText($(cells[1])?.text() || '');
      const link = $(row).find('a').first().attr('href') || '';
      if (title && title.length > 10) {
        tenders.push({
          source: 'UNGM (BM)',
          source_url: link ? `https://www.ungm.org${link}` : 'https://www.ungm.org',
          title: title.substring(0, 300), institution: org.substring(0, 200),
          deadline: null, budget_text: null,
          country: 'Uluslararası (BM)', currency: 'USD', sector: keyword, status: 'active',
        });
      }
    });
  } catch (e: any) { console.log('UNGM scrape error:', e.message); }
  return tenders.slice(0, 15);
}

// ── WORLD BANK ────────────────────────────────────────────────────────────
async function scrapeWorldBank(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const apiUrl = `https://search.worldbank.org/api/v2/projects?qterm=${encodeURIComponent(keyword)}&format=json&rows=15&os=0&fl=id,project_name,borrower,closingdate,totalamt,url`;
    const response = await axios.get(apiUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': HEADERS['User-Agent'] },
      timeout: 20000,
    });
    const docs = response.data?.projects?.docs || response.data?.data || [];
    for (const doc of docs) {
      if (!doc.project_name) continue;
      tenders.push({
        source: 'World Bank',
        source_url: doc.url || `https://projects.worldbank.org/en/projects-operations/project-detail/${doc.id}`,
        title: String(doc.project_name || '').substring(0, 300),
        institution: String(doc.borrower || 'World Bank').substring(0, 200),
        deadline: doc.closingdate || null,
        budget_text: doc.totalamt ? `${doc.totalamt} USD` : null,
        country: 'Uluslararası (Dünya Bankası)', currency: 'USD', sector: keyword, status: 'active',
      });
    }
  } catch (e: any) { console.log('WorldBank scrape error:', e.message); }
  return tenders.slice(0, 15);
}

// ── SAM.GOV (ABD) ─────────────────────────────────────────────────────────
async function scrapeSamGov(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://sam.gov/api/prod/sgs/v1/search/?index=opp&q=${encodeURIComponent(keyword)}&page=0&size=10&sort=-modifiedDate&mode=search&is_active=true`;
    const response = await axios.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': HEADERS['User-Agent'] },
      timeout: 20000,
    });
    const hits = response.data?._embedded?.results || response.data?.results || [];
    for (const h of hits) {
      tenders.push({
        source: 'SAM.gov (ABD)',
        source_url: h.uiLink || `https://sam.gov/opp/${h.noticeId}/view`,
        title: String(h.title || '').substring(0, 300),
        institution: String(h.fullParentPathName || h.organizationHierarchy?.[0]?.name || 'US Government').substring(0, 200),
        deadline: h.responseDeadLine || null,
        budget_text: null,
        country: 'ABD', currency: 'USD', sector: keyword, status: 'active',
      });
    }
  } catch (e: any) { console.log('SAM.gov error:', e.message); }
  return tenders.slice(0, 15);
}

// ── GOOGLE SEARCH (ülke bazlı) ────────────────────────────────────────────
async function scrapeGoogleCountry(keyword: string, countryId: string): Promise<any[]> {
  const tenders: any[] = [];
  const countryTerm = COUNTRY_SEARCH_TERMS[countryId] || countryId;
  const countryName = COUNTRY_NAMES[countryId] || countryId;
  const currency = COUNTRY_CONFIG[countryId]?.currency || 'USD';

  const queries = [
    `${keyword} tender procurement ${countryTerm} 2026`,
    `${keyword} ihale teklif ${countryTerm} 2026`,
    `${keyword} contract supply ${countryTerm} government 2026`,
  ];

  for (const q of queries.slice(0, 2)) {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=8&hl=en&gl=us`;
      const response = await axios.get(url, { headers: HEADERS, timeout: 12000 });
      const $ = cheerio.load(response.data);

      $('div.g').each((_: any, el: any) => {
        const title = cleanText($(el).find('h3').first().text());
        const snippet = cleanText($(el).find('.VwiC3b').first().text());
        const link = $(el).find('a').first().attr('href') || '';
        const combined = (title + ' ' + snippet).toLowerCase();

        if (title && title.length > 10 && (
          combined.includes('tender') || combined.includes('procurement') ||
          combined.includes('contract') || combined.includes('ihale') ||
          combined.includes('rfp') || combined.includes('rfq') || combined.includes('bid')
        )) {
          const cleanUrl = link.startsWith('/url?q=')
            ? decodeURIComponent(link.replace('/url?q=', '').split('&')[0])
            : (link.startsWith('http') ? link : '');

          tenders.push({
            source: `${countryName}`,
            source_url: cleanUrl,
            title: title.substring(0, 300),
            institution: snippet.substring(0, 200),
            deadline: null, budget_text: null,
            country: countryName, currency, sector: keyword, status: 'active',
          });
        }
      });
      await sleep(600);
    } catch (e: any) { console.log(`Google country scrape error (${countryId}):`, e.message); }
  }
  return tenders.slice(0, 12);
}

// ── MOCK DATA ─────────────────────────────────────────────────────────────
function getMockTenders(keyword: string, countryId: string): any[] {
  const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
  const countryName = COUNTRY_NAMES[countryId] || 'Dünya Geneli';
  const currency = COUNTRY_CONFIG[countryId]?.currency || 'USD';

  const mocks = [
    { source: 'EKAP', source_url: 'https://ekap.kik.gov.tr/EKAP/', title: `${keyword} Alımı - Devlet Malzeme Ofisi`, institution: 'Devlet Malzeme Ofisi', deadline: days(15), budget_text: '500.000 TRY', country: 'Türkiye', currency: 'TRY' },
    { source: 'TED Europa', source_url: 'https://ted.europa.eu', title: `Supply of ${keyword} - European Commission`, institution: 'European Commission DG GROW', deadline: days(20), budget_text: '250.000 EUR', country: 'Avrupa Birliği', currency: 'EUR' },
    { source: 'World Bank', source_url: 'https://projects.worldbank.org', title: `${keyword} Infrastructure Project`, institution: 'World Bank Group', deadline: days(30), budget_text: '2.000.000 USD', country: 'Uluslararası', currency: 'USD' },
    { source: 'UNGM (BM)', source_url: 'https://www.ungm.org', title: `${keyword} for UNDP Field Operations`, institution: 'United Nations Development Programme', deadline: days(18), budget_text: '300.000 USD', country: 'Uluslararası (BM)', currency: 'USD' },
    { source: countryName, source_url: '', title: `${keyword} Procurement - ${countryName} Government`, institution: `${countryName} Ministry of Trade`, deadline: days(25), budget_text: `500.000 ${currency}`, country: countryName, currency },
  ];

  return mocks.map(m => ({ ...m, sector: keyword, status: 'active' }));
}

// ── ÜLKE BAZLI SCRAPING ORKESTRATÖRü ─────────────────────────────────────
async function scrapeByCountry(keyword: string, countryId: string): Promise<any[]> {
  const config = COUNTRY_CONFIG[countryId] || COUNTRY_CONFIG['worldwide'];
  const scrapers = config.scrapers;
  const tasks: Promise<any[]>[] = [];

  if (scrapers.includes('ekap')) tasks.push(scrapeEKAP(keyword));
  if (scrapers.includes('ted')) tasks.push(scrapeTED(keyword));
  if (scrapers.includes('ungm')) tasks.push(scrapeUNGM(keyword));
  if (scrapers.includes('worldbank')) tasks.push(scrapeWorldBank(keyword));
  if (scrapers.includes('sam_gov')) tasks.push(scrapeSamGov(keyword));
  if (scrapers.includes('google_tr')) tasks.push(scrapeGoogleCountry(keyword, 'turkey'));
  if (scrapers.includes('google_country') || scrapers.includes('google')) {
    tasks.push(scrapeGoogleCountry(keyword, countryId));
  }

  const results = await Promise.allSettled(tasks);
  const all: any[] = [];
  results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });
  return all;
}

// ── AI Skorlama ───────────────────────────────────────────────────────────
async function scoreAndSummarizeTender(tender: any, userProfile: string): Promise<{ score: number; summary: string; recommendation: string }> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: `İhale değerlendir. SADECE JSON:\n\nİhale: ${tender.title}\nKurum: ${tender.institution}\nÜlke: ${tender.country}\nBütçe: ${tender.budget_text || 'Belirtilmemiş'}\nProfil: ${userProfile}\n\n{"score":85,"summary":"max 100 karakter","recommendation":"max 150 karakter"}` }]
    });
    const parsed = JSON.parse(resp.content[0]?.text?.trim().replace(/```json|```/g, '') || '{}');
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      summary: String(parsed.summary || '').substring(0, 200),
      recommendation: String(parsed.recommendation || '').substring(0, 300),
    };
  } catch {
    return { score: 60, summary: tender.title.substring(0, 100), recommendation: 'Manuel inceleme yapınız.' };
  }
}

// ── AI Teklif Taslağı ─────────────────────────────────────────────────────
async function generateProposalDraft(tender: any, companyInfo: string): Promise<string> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-opus-4-6', max_tokens: 1500,
      messages: [{ role: 'user', content: `Profesyonel ihale teklif mektubu yaz. Türkçe.\n\nİhale: ${tender.title}\nKurum: ${tender.institution}\nÜlke: ${tender.country}\nDeadline: ${tender.deadline || 'Belirtilmemiş'}\nBütçe: ${tender.budget_text || 'Belirtilmemiş'}\nFirma: ${companyInfo}\n\nResmi, ikna edici teklif mektubu yaz. Firma tanıtımı, uygunluk gerekçesi, teklif özeti, kapanış içersin.` }]
    });
    return resp.content[0]?.text?.trim() || 'Teklif taslağı oluşturulamadı.';
  } catch (e: any) { return `Hata: ${e.message}`; }
}

// ── ROUTES ────────────────────────────────────────────────────────────────

// GET /api/tenders
router.get('/', async (req: any, res: any) => {
  try {
    const { country, sector, min_score, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = supabase.from('tenders').select('*', { count: 'exact' })
      .eq('user_id', req.userId).eq('status', 'active')
      .order('ai_score', { ascending: false })
      .range(offset, offset + Number(limit) - 1);
    if (country) query = query.ilike('country', `%${country}%`);
    if (sector) query = query.ilike('sector', `%${sector}%`);
    if (min_score) query = query.gte('ai_score', Number(min_score));
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ tenders: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/tenders/scan
router.post('/scan', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, country = 'worldwide', sector = '', user_profile = '' } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword zorunlu' });

    const countryName = COUNTRY_NAMES[country] || country;

    const { data: scan } = await supabase.from('tender_scans').insert([{
      user_id: userId,
      keyword,
      sources: [country],
      status: 'running',
      started_at: new Date().toISOString(),
    }]).select().single();

    res.json({
      message: `"${keyword}" için ${countryName} ihalesi taraması başlatıldı.`,
      scanId: scan?.id,
    });

    (async () => {
      try {
        const allTenders = await scrapeByCountry(keyword, country);
        console.log(`Tender scan raw: ${allTenders.length} found for "${keyword}" in ${country}`);

        const tendersToSave = allTenders.length > 0 ? allTenders : getMockTenders(keyword, country);
        if (allTenders.length === 0) console.log(`Using mock data for "${keyword}" in ${country}`);

        let added = 0;
        for (const tender of tendersToSave) {
          if (!tender.title || tender.title.length < 5) continue;
          const { data: existing } = await supabase.from('tenders').select('id')
            .eq('user_id', userId).ilike('title', `%${tender.title.substring(0, 40)}%`).maybeSingle();
          if (existing) continue;

          // Sektörü ekle
          if (sector) tender.sector = sector;

          let aiScore = 60, aiSummary = '', aiRecommendation = '';
          if (process.env.ANTHROPIC_API_KEY) {
            const scored = await scoreAndSummarizeTender(tender, user_profile || `${keyword} ${sector}`);
            aiScore = scored.score; aiSummary = scored.summary; aiRecommendation = scored.recommendation;
            await sleep(300);
          }

          await supabase.from('tenders').insert([{
            user_id: userId, scan_id: scan?.id,
            ...tender, ai_score: aiScore, ai_summary: aiSummary, ai_recommendation: aiRecommendation,
          }]);
          added++;
        }

        await supabase.from('tender_scans').update({
          status: 'completed', tenders_found: added, completed_at: new Date().toISOString(),
        }).eq('id', scan?.id);

        console.log(`Tender scan complete: ${added} saved for "${keyword}" in ${country}`);
      } catch (err: any) {
        console.error('Tender scan error:', err.message);
        await supabase.from('tender_scans').update({ status: 'failed' }).eq('id', scan?.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/countries — Desteklenen ülkeler listesi
router.get('/countries', (_req: any, res: any) => {
  const list = Object.entries(COUNTRY_NAMES).map(([id, name]) => ({
    id,
    name,
    currency: COUNTRY_CONFIG[id]?.currency || 'USD',
  }));
  res.json({ countries: list });
});

// GET /api/tenders/scans/history
router.get('/scans/history', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('tender_scans').select('*')
      .eq('user_id', req.userId).order('started_at', { ascending: false }).limit(20);
    if (error) throw error;
    res.json({ scans: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/stats/summary
router.get('/stats/summary', async (req: any, res: any) => {
  try {
    const { data: all } = await supabase.from('tenders').select('status, ai_score, source, country').eq('user_id', req.userId);
    const { data: scans } = await supabase.from('tender_scans').select('id').eq('user_id', req.userId);
    const tenders = all || [];
    const byCountry: Record<string, number> = {};
    tenders.forEach((t: any) => { byCountry[t.country] = (byCountry[t.country] || 0) + 1; });
    res.json({
      total: tenders.length,
      active: tenders.filter((t: any) => t.status === 'active').length,
      applied: tenders.filter((t: any) => t.status === 'applied').length,
      won: tenders.filter((t: any) => t.status === 'won').length,
      highScore: tenders.filter((t: any) => t.ai_score >= 75).length,
      totalScans: scans?.length || 0,
      byCountry,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/:id
router.get('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('tenders').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (error || !data) return res.status(404).json({ error: 'İhale bulunamadı' });
    res.json({ tender: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/tenders/:id/proposal
router.post('/:id/proposal', async (req: any, res: any) => {
  try {
    const { company_info } = req.body;
    if (!company_info) return res.status(400).json({ error: 'company_info zorunlu' });
    const { data: tender, error } = await supabase.from('tenders').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (error || !tender) return res.status(404).json({ error: 'İhale bulunamadı' });
    const draft = await generateProposalDraft(tender, company_info);
    await supabase.from('tenders').update({ proposal_draft: draft, proposal_created_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ proposal: draft });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/tenders/:id
router.patch('/:id', async (req: any, res: any) => {
  try {
    const allowed = ['status', 'notes', 'applied_at', 'result'];
    const updates: any = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('tenders').update(updates)
      .eq('id', req.params.id).eq('user_id', req.userId).select().single();
    if (error) throw error;
    res.json({ tender: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/tenders/:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    await supabase.from('tenders').update({ status: 'dismissed' })
      .eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;