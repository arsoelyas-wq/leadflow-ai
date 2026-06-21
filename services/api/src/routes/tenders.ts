export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const ws = require('ws');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { realtime: { transport: ws } });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

function cleanText(text: string): string {
  return text?.replace(/\s+/g, ' ').trim() || '';
}

// ── ULKE KONFIGURASYONU ──────────────────────────────────────────────────────
const COUNTRY_CONFIG: Record<string, { currency: string; scrapers: string[] }> = {
  'worldwide':     { currency: 'USD', scrapers: ['ekap', 'ted', 'ungm', 'worldbank', 'google'] },
  'international': { currency: 'USD', scrapers: ['ungm', 'worldbank'] },
  'turkey':        { currency: 'TRY', scrapers: ['ekap', 'google_country'] },
  'eu':            { currency: 'EUR', scrapers: ['ted'] },
  'germany':       { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'france':        { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'italy':         { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'spain':         { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'netherlands':   { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'poland':        { currency: 'EUR', scrapers: ['ted', 'google_country'] },
  'uk':            { currency: 'GBP', scrapers: ['google_country'] },
  'usa':           { currency: 'USD', scrapers: ['sam_gov', 'google_country'] },
  'uae':           { currency: 'AED', scrapers: ['google_country'] },
  'saudi':         { currency: 'SAR', scrapers: ['google_country'] },
  'qatar':         { currency: 'QAR', scrapers: ['google_country'] },
  'kuwait':        { currency: 'KWD', scrapers: ['google_country'] },
  'middleeast':    { currency: 'USD', scrapers: ['google_country'] },
  'africa':        { currency: 'USD', scrapers: ['worldbank', 'google_country'] },
  'asia':          { currency: 'USD', scrapers: ['worldbank', 'google_country'] },
  'russia':        { currency: 'RUB', scrapers: ['google_country'] },
  'china':         { currency: 'CNY', scrapers: ['google_country'] },
  'india':         { currency: 'INR', scrapers: ['google_country'] },
  'brazil':        { currency: 'BRL', scrapers: ['google_country'] },
};

const COUNTRY_NAMES: Record<string, string> = {
  'worldwide': 'Dunya Geneli', 'international': 'Uluslararasi (BM/Dunya Bankasi)',
  'turkey': 'Turkiye', 'eu': 'Avrupa Birligi', 'germany': 'Almanya',
  'france': 'Fransa', 'italy': 'Italya', 'spain': 'Ispanya',
  'netherlands': 'Hollanda', 'poland': 'Polonya', 'uk': 'Ingiltere',
  'usa': 'ABD', 'uae': 'BAE (Dubai)', 'saudi': 'Suudi Arabistan',
  'qatar': 'Katar', 'kuwait': 'Kuveyt', 'middleeast': 'Orta Dogu Geneli',
  'africa': 'Afrika', 'asia': 'Asya', 'russia': 'Rusya',
  'china': 'Cin', 'india': 'Hindistan', 'brazil': 'Brezilya',
};

const COUNTRY_SEARCH_TERMS: Record<string, string> = {
  'germany': 'Germany Deutschland tender ausschreibung',
  'france': 'France appel offre tender',
  'italy': 'Italy Italia gara appalto tender',
  'spain': 'Spain licitacion tender',
  'netherlands': 'Netherlands Holland aanbesteding tender',
  'poland': 'Poland przetarg tender',
  'uk': 'United Kingdom England tender procurement',
  'usa': 'United States America federal contract bid',
  'uae': 'UAE Dubai Abu Dhabi tender procurement',
  'saudi': 'Saudi Arabia tender procurement',
  'qatar': 'Qatar Doha tender procurement',
  'kuwait': 'Kuwait tender procurement',
  'middleeast': 'Middle East Gulf tender procurement',
  'africa': 'Africa tender procurement contract',
  'asia': 'Asia tender procurement contract',
  'russia': 'Russia tender procurement',
  'china': 'China tender procurement',
  'india': 'India tender procurement e-procurement',
  'brazil': 'Brazil licitacao tender compras',
  'turkey': 'Turkiye ihale kamu alim',
};

// ── IHALE PIPELINE ADIMLARI ──────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { id: 'discovered',    label: 'Kesfedildi',       order: 0 },
  { id: 'reviewing',     label: 'Inceleniyor',      order: 1 },
  { id: 'docs_preparing',label: 'Belge Hazirlama',  order: 2 },
  { id: 'guarantee',     label: 'Teminat',           order: 3 },
  { id: 'submitted',     label: 'Teklif Verildi',   order: 4 },
  { id: 'evaluation',    label: 'Degerlendirme',    order: 5 },
  { id: 'won',           label: 'Kazanildi',        order: 6 },
  { id: 'lost',          label: 'Kaybedildi',       order: 6 },
];

// ── SCRAPERS ─────────────────────────────────────────────────────────────────

async function scrapeEKAP(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://ekap.kik.gov.tr/EKAP/Ortak/IhaleArama/index.html`;
    const searchUrl = `https://ekap.kik.gov.tr/EKAP/ws/ihale/aramaJson.npjx?ilanAdi=${encodeURIComponent(keyword)}&ilanTipiList=1,2,3,4&yakinTarihSay=30`;
    const response = await axios.get(searchUrl, {
      headers: { ...HEADERS, 'Referer': 'https://ekap.kik.gov.tr/EKAP/', 'Accept': 'application/json' },
      timeout: 20000,
    });

    const items = response.data?.rows || response.data?.data || [];
    if (Array.isArray(items)) {
      for (const item of items.slice(0, 25)) {
        const title = item.ilanAdi || item[1] || '';
        const institution = item.ihaleciAdi || item[2] || '';
        const deadlineStr = item.ihaleTarihi || item[3] || '';
        if (title && title.length > 10) {
          tenders.push({
            source: 'EKAP', source_url: url,
            title: cleanText(title).substring(0, 300),
            institution: cleanText(institution).substring(0, 200),
            deadline: deadlineStr ? new Date(deadlineStr).toISOString() : null,
            budget_text: item.tahminiMaliyet || null,
            country: 'Turkiye', currency: 'TRY', status: 'active',
          });
        }
      }
    }

    if (tenders.length === 0) {
      const htmlRes = await axios.get(
        `https://ekap.kik.gov.tr/EKAP/common/ilanSorgula.jsp?ilanTipiList=1,2,3,4&yakinTarihSay=30&ilanAdi=${encodeURIComponent(keyword)}`,
        { headers: { ...HEADERS, 'Referer': 'https://ekap.kik.gov.tr/EKAP/' }, timeout: 20000 }
      );
      const $ = cheerio.load(htmlRes.data);
      $('table tr').each((_: any, row: any) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;
        const title = cleanText($(cells[0]).text());
        const inst = cleanText($(cells[1]).text());
        if (title && title.length > 10 && !title.includes('Ihale Adi')) {
          tenders.push({
            source: 'EKAP', source_url: url,
            title: title.substring(0, 300), institution: inst.substring(0, 200),
            deadline: null, budget_text: null,
            country: 'Turkiye', currency: 'TRY', status: 'active',
          });
        }
      });
    }
  } catch (e: any) { console.log('EKAP scrape error:', e.message?.slice(0, 80)); }
  return tenders;
}

async function scrapeTED(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://ted.europa.eu/api/v3.0/notices/search?q=${encodeURIComponent(keyword)}&pageNum=1&pageSize=25&scope=3`;
    const response = await axios.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': HEADERS['User-Agent'] },
      timeout: 20000,
    });
    const notices = response.data?.results || response.data?.notices || response.data?.content || [];
    for (const n of (Array.isArray(notices) ? notices : [])) {
      const noticeId = n.ND || n.noticeId || n.id || '';
      const title = n.TI || n.title || (typeof n.titles === 'object' ? Object.values(n.titles)[0] : '') || '';
      tenders.push({
        source: 'TED Europa',
        source_url: noticeId ? `https://ted.europa.eu/en/notice/-/detail/${noticeId}` : 'https://ted.europa.eu',
        title: String(title).substring(0, 300),
        institution: String(n.AU || n.authorityName || n.buyerName || '').substring(0, 200),
        deadline: n.DT || n.deadline || null,
        budget_text: n.VT ? `${n.VT} EUR` : (n.estimatedValue ? `${n.estimatedValue} EUR` : null),
        country: n.CY || n.country || 'Avrupa Birligi', currency: 'EUR', status: 'active',
      });
    }
  } catch (e: any) { console.log('TED API error:', e.message?.slice(0, 80)); }
  return tenders;
}

async function scrapeUNGM(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://www.ungm.org/Public/Notice?title=${encodeURIComponent(keyword)}&deadline=true`;
    const response = await axios.get(url, {
      headers: { ...HEADERS, 'Referer': 'https://www.ungm.org/' }, timeout: 20000,
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
          country: 'Uluslararasi (BM)', currency: 'USD', status: 'active',
        });
      }
    });
  } catch (e: any) { console.log('UNGM scrape error:', e.message?.slice(0, 80)); }
  return tenders;
}

async function scrapeWorldBank(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const apiUrl = `https://search.worldbank.org/api/v2/projects?qterm=${encodeURIComponent(keyword)}&format=json&rows=20&os=0&fl=id,project_name,borrower,closingdate,totalamt,url`;
    const response = await axios.get(apiUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': HEADERS['User-Agent'] }, timeout: 20000,
    });
    const docs = response.data?.projects?.docs || response.data?.data || [];
    for (const doc of (Array.isArray(docs) ? docs : Object.values(docs))) {
      if (!doc?.project_name) continue;
      tenders.push({
        source: 'World Bank',
        source_url: doc.url || `https://projects.worldbank.org/en/projects-operations/project-detail/${doc.id}`,
        title: String(doc.project_name).substring(0, 300),
        institution: String(doc.borrower || 'World Bank').substring(0, 200),
        deadline: doc.closingdate || null,
        budget_text: doc.totalamt ? `${doc.totalamt} USD` : null,
        country: 'Uluslararasi (Dunya Bankasi)', currency: 'USD', status: 'active',
      });
    }
  } catch (e: any) { console.log('WorldBank scrape error:', e.message?.slice(0, 80)); }
  return tenders;
}

async function scrapeSamGov(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://sam.gov/api/prod/sgs/v1/search/?index=opp&q=${encodeURIComponent(keyword)}&page=0&size=15&sort=-modifiedDate&mode=search&is_active=true`;
    const response = await axios.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': HEADERS['User-Agent'], 'Content-Type': 'application/json' }, timeout: 20000,
    }).catch(() => ({ data: {} }));
    const hits = response.data?._embedded?.results || [];
    for (const h of hits) {
      tenders.push({
        source: 'SAM.gov (ABD)',
        source_url: h.uiLink || `https://sam.gov/opp/${h.noticeId}/view`,
        title: String(h.title || '').substring(0, 300),
        institution: String(h.fullParentPathName || 'US Government').substring(0, 200),
        deadline: h.responseDeadLine || null, budget_text: null,
        country: 'ABD', currency: 'USD', status: 'active',
      });
    }
  } catch (e: any) { console.log('SAM.gov error:', e.message?.slice(0, 80)); }
  return tenders;
}

// ── EXA.AI TENDER SEARCH ─────────────────────────────────────────────────────
async function searchTendersExa(keyword: string, countryId: string): Promise<any[]> {
  const EXA_API_KEY = process.env.EXA_API_KEY;
  if (!EXA_API_KEY) return [];
  const countryTerm = COUNTRY_SEARCH_TERMS[countryId] || '';
  const countryName = COUNTRY_NAMES[countryId] || countryId;
  const currency = COUNTRY_CONFIG[countryId]?.currency || 'USD';
  const tenders: any[] = [];

  const queries = [
    `${keyword} tender procurement RFP ${countryTerm} 2026`,
    `${keyword} government contract bid supply ${countryTerm}`,
  ];

  for (const q of queries) {
    try {
      const res = await axios.post('https://api.exa.ai/search', {
        query: q, numResults: 8, useAutoprompt: true,
        includeDomains: ['gov.tr','kik.gov.tr','ekap.kik.gov.tr','ted.europa.eu','ungm.org','worldbank.org','sam.gov','devex.com','dgmarket.com','reliefweb.int','procurementgateway.com'],
        startPublishedDate: new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0],
        contents: { text: { maxCharacters: 300 } },
      }, { headers: { 'x-api-key': EXA_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 });

      const results = res.data?.results || [];
      for (const r of results) {
        const title = r.title || r.url || '';
        const body = r.text || r.snippet || '';
        const combined = (title + ' ' + body).toLowerCase();
        if (!title || title.length < 10) continue;
        if (!combined.match(/tender|procurement|bid|contract|rfp|rfq|supply|ihale|appel|licitacion|ausschreibung/i)) continue;
        const budgetMatch = body.match(/[\$€£₺][\s]?[\d,]+[KMB]?|[\d,.]+\s*(EUR|USD|GBP|TRY|AED|SAR)/i);
        const deadlineMatch = body.match(/deadline[:\s]+(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4})|closing[:\s]+(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4})/i);
        tenders.push({
          source: countryName, source_url: r.url || '',
          title: title.substring(0, 300),
          institution: (r.author || r.url?.split('/')[2] || body.substring(0, 100)).substring(0, 200),
          deadline: deadlineMatch ? (deadlineMatch[1] || deadlineMatch[2] || null) : null,
          budget_text: budgetMatch ? budgetMatch[0] : null,
          country: countryName, currency, status: 'active',
        });
      }
      await sleep(400);
    } catch (e: any) { console.log(`[Exa] error (${countryId}):`, e.message?.slice(0, 60)); }
  }
  return tenders;
}

// ── TAVILY TENDER SEARCH (fallback) ──────────────────────────────────────────
async function searchTendersTavily(keyword: string, countryId: string): Promise<any[]> {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_API_KEY) return [];
  const countryTerm = COUNTRY_SEARCH_TERMS[countryId] || '';
  const countryName = COUNTRY_NAMES[countryId] || countryId;
  const currency = COUNTRY_CONFIG[countryId]?.currency || 'USD';
  const tenders: any[] = [];

  try {
    const res = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_API_KEY,
      query: `${keyword} government tender procurement bid ${countryTerm} 2026`,
      search_depth: 'advanced', max_results: 8,
      include_raw_content: false,
    }, { timeout: 15000 });

    for (const r of (res.data?.results || [])) {
      const combined = ((r.title || '') + ' ' + (r.content || '')).toLowerCase();
      if (!r.title || r.title.length < 10) continue;
      if (!combined.match(/tender|procurement|bid|contract|rfp|supply|ihale/i)) continue;
      const budgetMatch = r.content?.match(/[\$€£₺][\s]?[\d,]+[KMB]?|[\d,.]+\s*(EUR|USD|GBP|TRY)/i);
      const deadlineMatch = r.content?.match(/deadline[:\s]+(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4})/i);
      tenders.push({
        source: countryName, source_url: r.url || '',
        title: r.title.substring(0, 300),
        institution: (r.url?.split('/')[2] || '').substring(0, 200),
        deadline: deadlineMatch ? deadlineMatch[1] : null,
        budget_text: budgetMatch ? budgetMatch[0] : null,
        country: countryName, currency, status: 'active',
      });
    }
  } catch (e: any) { console.log(`[Tavily] error (${countryId}):`, e.message?.slice(0, 60)); }
  return tenders;
}

// ── COMBINED COUNTRY SEARCH: Exa -> Tavily ───────────────────────────────────
async function scrapeGoogleCountry(keyword: string, countryId: string): Promise<any[]> {
  const exaResults = await searchTendersExa(keyword, countryId);
  if (exaResults.length > 0) return exaResults;
  return searchTendersTavily(keyword, countryId);
}

// ── ORCHESTRATOR ─────────────────────────────────────────────────────────────
async function scrapeByCountry(keyword: string, countryId: string): Promise<any[]> {
  const config = COUNTRY_CONFIG[countryId] || COUNTRY_CONFIG['worldwide'];
  const scrapers = config.scrapers;
  const tasks: Promise<any[]>[] = [];

  if (scrapers.includes('ekap'))          tasks.push(scrapeEKAP(keyword));
  if (scrapers.includes('ted'))           tasks.push(scrapeTED(keyword));
  if (scrapers.includes('ungm'))          tasks.push(scrapeUNGM(keyword));
  if (scrapers.includes('worldbank'))     tasks.push(scrapeWorldBank(keyword));
  if (scrapers.includes('sam_gov'))       tasks.push(scrapeSamGov(keyword));
  if (scrapers.includes('google_country')) tasks.push(scrapeGoogleCountry(keyword, countryId));
  if (scrapers.includes('google'))        tasks.push(scrapeGoogleCountry(keyword, 'worldwide'));

  const results = await Promise.allSettled(tasks);
  const all: any[] = [];
  results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });
  return all;
}

// ── AI: IHALE ANALIZ + SKORLAMA + KOC ────────────────────────────────────────
async function analyzeAndScoreTender(tender: any, userProfile: string): Promise<{
  score: number; summary: string; recommendation: string;
  requirements: string; eligibility: string; documents: string;
  match_reason: string; risk_level: string;
  win_probability: number; action_steps: string[];
  missing_docs: string[]; competitor_insight: string;
}> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: `Ihale uygunluk analizi yap. SADECE JSON dondur.

Ihale: ${tender.title}
Kurum: ${tender.institution}
Ulke: ${tender.country}
Kaynak: ${tender.source}
Butce: ${tender.budget_text || 'Belirtilmemis'}
Firma Profili: ${userProfile || 'Genel B2B ihale firmasi'}

Skor hesaplama:
- Sektor/urun uyumu (0-40 puan)
- Butce buyuklugu uyumu (0-20 puan)
- Cografi/erisim kolayligi (0-20 puan)
- Rekabet seviyesi (dusuk=yuksek puan, 0-20 puan)

Her ihale icin farkli, gercekci skor ver.

JSON (Turkce):
{
  "score": 75,
  "summary": "Kisa ihale ozeti max 120 karakter",
  "recommendation": "Basvurulmali/Gecilmeli gerekcesi max 150 karakter",
  "requirements": "Katilim sartlari max 200 karakter",
  "eligibility": "Kimler basvurabilir max 120 karakter",
  "documents": "Gerekli belgeler listesi max 200 karakter",
  "match_reason": "Firma profiliyle neden uyusuyor/uyusmuyor max 100 karakter",
  "risk_level": "Dusuk|Orta|Yuksek",
  "win_probability": 65,
  "action_steps": ["1. adim", "2. adim", "3. adim", "4. adim", "5. adim"],
  "missing_docs": ["eksik belge 1", "eksik belge 2"],
  "competitor_insight": "Bu ihalede beklenen rekabet durumu, 1 cumle"
}`
      }]
    });
    const text = resp.content[0]?.text?.trim().replace(/```json|```/g, '') || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return {
      score: Math.min(100, Math.max(30, Number(parsed.score) || 60)),
      summary: String(parsed.summary || tender.title.substring(0, 100)).substring(0, 200),
      recommendation: String(parsed.recommendation || 'Manuel inceleme yapiniz.').substring(0, 300),
      requirements: String(parsed.requirements || 'Kaynak siteden detayli sartlari inceleyin.').substring(0, 400),
      eligibility: String(parsed.eligibility || 'Ilgili ulke mevzuatina uygun firmalar.').substring(0, 300),
      documents: String(parsed.documents || 'Vergi levhasi, imza sirkuleri, referans listesi.').substring(0, 400),
      match_reason: String(parsed.match_reason || '').substring(0, 200),
      risk_level: String(parsed.risk_level || 'Orta').substring(0, 20),
      win_probability: Math.min(100, Math.max(5, Number(parsed.win_probability) || 50)),
      action_steps: Array.isArray(parsed.action_steps) ? parsed.action_steps.slice(0, 5) : [],
      missing_docs: Array.isArray(parsed.missing_docs) ? parsed.missing_docs.slice(0, 5) : [],
      competitor_insight: String(parsed.competitor_insight || '').substring(0, 200),
    };
  } catch {
    const sourceScores: Record<string, number> = { 'TED Europa': 72, 'EKAP': 68, 'World Bank': 76, 'UNGM (BM)': 65, 'SAM.gov (ABD)': 70 };
    const baseScore = sourceScores[tender.source] || 62;
    return {
      score: baseScore + Math.floor(Math.random() * 15),
      summary: tender.title.substring(0, 100),
      recommendation: 'Manuel inceleme yapiniz.',
      requirements: 'Kaynak siteden detayli sartlari inceleyin.',
      eligibility: 'Ilgili ulke mevzuatina uygun firmalar basvurabilir.',
      documents: 'Vergi levhasi, imza sirkuleri, referans listesi, finansal tablolar.',
      match_reason: '', risk_level: 'Orta',
      win_probability: 40 + Math.floor(Math.random() * 20),
      action_steps: ['Sartname detaylarini inceleyin', 'Gerekli belgeleri hazirlayin', 'Maliyet hesabi yapin', 'Teklif mektubunu hazirlayin', 'Son tarihi takip edin'],
      missing_docs: [], competitor_insight: '',
    };
  }
}

// ── AI: TEKLIF TASLAGI ──────────────────────────────────────────────────────
async function generateProposalDraft(tender: any, companyInfo: string): Promise<string> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Profesyonel ihale teklif mektubu yaz. Turkce olsun.

Ihale: ${tender.title}
Kurum: ${tender.institution}
Ulke: ${tender.country}
Deadline: ${tender.deadline || 'Belirtilmemis'}
Butce: ${tender.budget_text || 'Belirtilmemis'}
Katilim Sartlari: ${tender.requirements || 'Standart'}
Firma Bilgileri: ${companyInfo}

Resmi ve ikna edici teklif mektubu yaz. Su bolumler olsun:
1. Baslangic — resmi hitap ve ihaleye atif
2. Firma tanitimi — deneyim ve yetkinlikler
3. Uygunluk gerekcesi — sartlari karsiladigimizi belirt
4. Teknik yaklasim — kisa teknik cozum aciklamasi
5. Teklif ozeti — fiyat/sure/kapsam
6. Kapanis — iletisim bilgileri ve nazik bitir

Not: Belge numaralari ve tarihler icin [DOLDUR] yer tutucusu kullan.`
      }]
    });
    return resp.content[0]?.text?.trim() || 'Teklif taslagi olusturulamadi.';
  } catch (e: any) { return `Hata: ${e.message}`; }
}

// ── AI: IHALE KOCU — Akilli Tavsiye Motoru ───────────────────────────────────
async function generateTenderCoaching(tender: any, userHistory: any[]): Promise<{
  strategy: string; pricing_hint: string; timeline: string[];
  strengths_to_highlight: string[]; risks_to_mitigate: string[];
}> {
  try {
    const wonCount = userHistory.filter(t => t.status === 'won').length;
    const lostCount = userHistory.filter(t => t.status === 'lost').length;
    const avgWonScore = wonCount > 0 ? Math.round(userHistory.filter(t => t.status === 'won').reduce((s, t) => s + (t.ai_score || 0), 0) / wonCount) : 0;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Ihale kocu olarak tavsiye ver. SADECE JSON dondur.

Ihale: ${tender.title}
Kurum: ${tender.institution}
Butce: ${tender.budget_text || '?'}
Ulke: ${tender.country}
Risk: ${tender.risk_level || 'Orta'}

Kullanicinin gecmisi: ${wonCount} kazanildi, ${lostCount} kaybedildi, ort kazanma skoru: ${avgWonScore}

JSON:
{
  "strategy": "Bu ihaleyi kazanmak icin en etkili strateji, 2-3 cumle",
  "pricing_hint": "Fiyat stratejisi onerisi, 1 cumle",
  "timeline": ["Hafta 1: ...", "Hafta 2: ...", "Hafta 3: ..."],
  "strengths_to_highlight": ["vu1", "vu2", "vu3"],
  "risks_to_mitigate": ["risk1", "risk2"]
}`
      }]
    });
    const text = resp.content[0]?.text?.trim().replace(/```json|```/g, '') || '{}';
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : {};
    return {
      strategy: String(parsed.strategy || '').substring(0, 400),
      pricing_hint: String(parsed.pricing_hint || '').substring(0, 200),
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline.slice(0, 5) : [],
      strengths_to_highlight: Array.isArray(parsed.strengths_to_highlight) ? parsed.strengths_to_highlight.slice(0, 5) : [],
      risks_to_mitigate: Array.isArray(parsed.risks_to_mitigate) ? parsed.risks_to_mitigate.slice(0, 5) : [],
    };
  } catch { return { strategy: '', pricing_hint: '', timeline: [], strengths_to_highlight: [], risks_to_mitigate: [] }; }
}

// ── SMART DUPLICATE DETECTION ────────────────────────────────────────────────
async function isDuplicate(userId: string, title: string, sourceUrl: string): Promise<boolean> {
  if (sourceUrl) {
    const { data: urlMatch } = await supabase.from('tenders').select('id')
      .eq('user_id', userId).eq('source_url', sourceUrl).maybeSingle();
    if (urlMatch) return true;
  }
  const normalized = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').substring(0, 60);
  if (normalized.length < 15) return false;
  const { data: titleMatch } = await supabase.from('tenders').select('id')
    .eq('user_id', userId).ilike('title', `%${normalized.substring(0, 40)}%`).maybeSingle();
  return !!titleMatch;
}

// ── OTOMATIK GUNLUK TARAMA (index.ts'den cagrilir) ──────────────────────────
async function runDailyTenderScan() {
  console.log('[Tenders] Daily scan started...');
  try {
    const { data: prefs } = await supabase
      .from('tender_scan_prefs')
      .select('*')
      .eq('auto_scan', true);

    if (!prefs || prefs.length === 0) {
      console.log('[Tenders] No auto-scan prefs found');
      return;
    }

    for (const pref of prefs) {
      try {
        const allTenders = await scrapeByCountry(pref.keyword, pref.country || 'worldwide');
        let newCount = 0;

        for (const tender of allTenders) {
          if (!tender.title || tender.title.length < 5) continue;
          if (await isDuplicate(pref.user_id, tender.title, tender.source_url)) continue;

          if (pref.sector) tender.sector = pref.sector;

          let analysis: any = { score: 60, summary: '', recommendation: '', requirements: '', eligibility: '', documents: '', match_reason: '', risk_level: 'Orta', win_probability: 50, action_steps: [], missing_docs: [], competitor_insight: '' };
          if (process.env.ANTHROPIC_API_KEY) {
            analysis = await analyzeAndScoreTender(tender, pref.user_profile || pref.keyword);
            await sleep(300);
          }

          await supabase.from('tenders').insert([{
            user_id: pref.user_id, ...tender,
            ai_score: analysis.score, ai_summary: analysis.summary,
            ai_recommendation: analysis.recommendation,
            requirements: analysis.requirements, eligibility: analysis.eligibility,
            documents: analysis.documents, match_reason: analysis.match_reason,
            risk_level: analysis.risk_level, win_probability: analysis.win_probability,
            action_steps: analysis.action_steps, missing_docs: analysis.missing_docs,
            competitor_insight: analysis.competitor_insight,
            pipeline_step: 'discovered', notify_sent: false,
          }]).catch(() => {});
          newCount++;
        }

        if (newCount > 0) {
          await supabase.from('notifications').insert([{
            user_id: pref.user_id,
            title: `${newCount} yeni ihale bulundu!`,
            body: `"${pref.keyword}" aramasi icin ${COUNTRY_NAMES[pref.country] || pref.country}'de ${newCount} yeni ihale firsati var.`,
            read: false,
          }]).catch(() => {});

          // WhatsApp alert
          try {
            const { data: us } = await supabase.from('user_settings').select('phone').eq('user_id', pref.user_id).single();
            if (us?.phone) {
              const { sendWhatsAppMessage } = require('./settings');
              sendWhatsAppMessage(pref.user_id, us.phone,
                `📢 *${newCount} Yeni Ihale!*\n\n"${pref.keyword}" icin ${COUNTRY_NAMES[pref.country] || pref.country}'de yeni firsatlar var.\n\nSovlo.io'dan detaylari inceleyin.`
              ).catch(() => {});
            }
          } catch {}

          console.log(`[Tenders] Daily: ${newCount} new for user ${pref.user_id.slice(0,8)} (${pref.keyword})`);
        }
      } catch (err: any) {
        console.error(`[Tenders] Daily scan error for ${pref.user_id.slice(0,8)}:`, err.message?.slice(0, 80));
      }
      await sleep(2000);
    }
  } catch (e: any) {
    console.error('[Tenders] Daily scan failed:', e.message);
  }
}

module.exports.runDailyTenderScan = runDailyTenderScan;

// ── ROUTES ───────────────────────────────────────────────────────────────────

// GET /api/tenders
router.get('/', async (req: any, res: any) => {
  try {
    const { country, sector, min_score, status: statusFilter, page = 1, limit = 200 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase.from('tenders').select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('ai_score', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (statusFilter) query = query.eq('status', statusFilter);
    else query = query.neq('status', 'dismissed');
    if (country)   query = query.ilike('country', `%${country}%`);
    if (sector)    query = query.ilike('sector', `%${sector}%`);
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
    const { keyword, country = 'worldwide', sector = '', user_profile = '', save_pref = false } = req.body;
    if (!keyword || typeof keyword !== 'string') return res.status(400).json({ error: 'keyword zorunlu' });

    const countryName = COUNTRY_NAMES[country] || country;

    const { data: scan } = await supabase.from('tender_scans').insert([{
      user_id: userId, keyword, sources: [country], status: 'running', started_at: new Date().toISOString(),
    }]).select().single();

    if (save_pref) {
      await supabase.from('tender_scan_prefs').upsert([{
        user_id: userId, keyword, country, sector, user_profile, auto_scan: true,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'user_id,keyword,country' }).catch(() => {
        supabase.from('tender_scan_prefs').insert([{
          user_id: userId, keyword, country, sector, user_profile, auto_scan: true,
        }]).catch(() => {});
      });
    }

    res.json({ message: `"${keyword}" icin ${countryName} taramasi baslatildi.`, scanId: scan?.id });

    (async () => {
      try {
        const allTenders = await scrapeByCountry(keyword, country);
        console.log(`[Tenders] Scan raw: ${allTenders.length} found for "${keyword}" in ${country}`);

        if (allTenders.length === 0) {
          console.log(`[Tenders] No results for "${keyword}" in ${country} — no mock data injected`);
          await supabase.from('tender_scans').update({
            status: 'completed', tenders_found: 0, completed_at: new Date().toISOString(),
          }).eq('id', scan?.id);
          return;
        }

        let added = 0;
        for (const tender of allTenders) {
          if (!tender.title || tender.title.length < 5) continue;
          if (await isDuplicate(userId, tender.title, tender.source_url)) continue;

          if (sector) tender.sector = sector;

          let analysis: any = { score: 60, summary: '', recommendation: '', requirements: '', eligibility: '', documents: '', match_reason: '', risk_level: 'Orta', win_probability: 50, action_steps: [], missing_docs: [], competitor_insight: '' };
          if (process.env.ANTHROPIC_API_KEY) {
            analysis = await analyzeAndScoreTender(tender, user_profile || `${keyword} ${sector}`);
            await sleep(300);
          }

          await supabase.from('tenders').insert([{
            user_id: userId, scan_id: scan?.id, ...tender,
            ai_score: analysis.score, ai_summary: analysis.summary,
            ai_recommendation: analysis.recommendation,
            requirements: analysis.requirements, eligibility: analysis.eligibility,
            documents: analysis.documents, match_reason: analysis.match_reason,
            risk_level: analysis.risk_level, win_probability: analysis.win_probability,
            action_steps: analysis.action_steps, missing_docs: analysis.missing_docs,
            competitor_insight: analysis.competitor_insight,
            pipeline_step: 'discovered', notify_sent: false,
          }]).catch((err: any) => {
            // Fallback: new columns might not exist yet
            supabase.from('tenders').insert([{
              user_id: userId, scan_id: scan?.id, ...tender,
              ai_score: analysis.score, ai_summary: analysis.summary,
              ai_recommendation: analysis.recommendation,
              requirements: analysis.requirements, eligibility: analysis.eligibility,
              documents: analysis.documents, notify_sent: false,
            }]).catch(() => {});
          });
          added++;
        }

        await supabase.from('tender_scans').update({
          status: 'completed', tenders_found: added, completed_at: new Date().toISOString(),
        }).eq('id', scan?.id);

        console.log(`[Tenders] Scan complete: ${added} saved for "${keyword}" in ${country}`);
      } catch (err: any) {
        console.error('[Tenders] Scan error:', err.message);
        await supabase.from('tender_scans').update({ status: 'failed' }).eq('id', scan?.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/countries
router.get('/countries', (_req: any, res: any) => {
  res.json({ countries: Object.entries(COUNTRY_NAMES).map(([id, name]) => ({ id, name, currency: COUNTRY_CONFIG[id]?.currency || 'USD' })) });
});

// GET /api/tenders/prefs
router.get('/prefs', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('tender_scan_prefs').select('*').eq('user_id', req.userId);
    res.json({ prefs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/tenders/prefs/:id
router.delete('/prefs/:id', async (req: any, res: any) => {
  try {
    await supabase.from('tender_scan_prefs').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/scans/:scanId/status
router.get('/scans/:scanId/status', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('tender_scans').select('id,status,tenders_found,started_at,completed_at,keyword')
      .eq('id', req.params.scanId).eq('user_id', req.userId).single();
    if (error || !data) return res.status(404).json({ error: 'Tarama bulunamadi' });
    const elapsed = Date.now() - new Date(data.started_at).getTime();
    const expectedMs = 60000;
    const progress = data.status === 'completed' ? 100 : data.status === 'failed' ? 100 : Math.min(95, Math.round((elapsed / expectedMs) * 100));
    res.json({ status: data.status, tenders_found: data.tenders_found || 0, progress, keyword: data.keyword, completed_at: data.completed_at });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/deadline-alerts
router.get('/deadline-alerts', async (req: any, res: any) => {
  try {
    const in7Days = new Date(Date.now() + 7 * 864e5).toISOString();
    const now = new Date().toISOString();
    const { data } = await supabase.from('tenders')
      .select('id, title, deadline, country, ai_score, status, institution, pipeline_step, win_probability')
      .eq('user_id', req.userId)
      .not('status', 'in', '(won,lost,dismissed)')
      .not('deadline', 'is', null)
      .lte('deadline', in7Days)
      .gte('deadline', now)
      .order('deadline', { ascending: true })
      .limit(15);
    res.json({ alerts: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/win-analytics
router.get('/win-analytics', async (req: any, res: any) => {
  try {
    const { data: all } = await supabase.from('tenders').select('status, country, source, ai_score, win_probability').eq('user_id', req.userId);
    if (!all?.length) return res.json({ totalApplied: 0, wonCount: 0, winRate: 0, byCountry: [], bySource: [] });
    const applied = all.filter((t: any) => ['applied','won','lost','submitted','evaluation'].includes(t.status));
    const won = all.filter((t: any) => t.status === 'won');
    const byCountry: Record<string, { applied: number; won: number }> = {};
    const bySource: Record<string, { applied: number; won: number }> = {};
    applied.forEach((t: any) => {
      if (!byCountry[t.country]) byCountry[t.country] = { applied: 0, won: 0 };
      byCountry[t.country].applied++;
      if (t.status === 'won') byCountry[t.country].won++;
      if (!bySource[t.source]) bySource[t.source] = { applied: 0, won: 0 };
      bySource[t.source].applied++;
      if (t.status === 'won') bySource[t.source].won++;
    });
    res.json({
      totalApplied: applied.length, wonCount: won.length,
      winRate: applied.length > 0 ? Math.round((won.length / applied.length) * 100) : 0,
      avgScore: all.length > 0 ? Math.round(all.reduce((s: number, t: any) => s + (t.ai_score || 0), 0) / all.length) : 0,
      avgWinProbability: all.length > 0 ? Math.round(all.reduce((s: number, t: any) => s + (t.win_probability || 0), 0) / all.length) : 0,
      byCountry: Object.entries(byCountry).map(([c, v]) => ({ country: c, ...v, rate: v.applied > 0 ? Math.round((v.won / v.applied) * 100) : 0 })).sort((a, b) => b.rate - a.rate).slice(0, 6),
      bySource: Object.entries(bySource).map(([s, v]) => ({ source: s, ...v, rate: v.applied > 0 ? Math.round((v.won / v.applied) * 100) : 0 })).sort((a, b) => b.rate - a.rate).slice(0, 5),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/scans/history
router.get('/scans/history', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('tender_scans').select('*')
      .eq('user_id', req.userId).order('started_at', { ascending: false }).limit(30);
    if (error) throw error;
    res.json({ scans: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/stats/summary
router.get('/stats/summary', async (req: any, res: any) => {
  try {
    const { data: all } = await supabase.from('tenders').select('status, ai_score, country, win_probability, pipeline_step').eq('user_id', req.userId);
    const { data: scans } = await supabase.from('tender_scans').select('id').eq('user_id', req.userId);
    const tenders = all || [];
    const byCountry: Record<string, number> = {};
    const byPipeline: Record<string, number> = {};
    tenders.forEach((t: any) => {
      byCountry[t.country] = (byCountry[t.country] || 0) + 1;
      const step = t.pipeline_step || t.status || 'discovered';
      byPipeline[step] = (byPipeline[step] || 0) + 1;
    });
    res.json({
      total: tenders.length,
      active: tenders.filter((t: any) => t.status === 'active').length,
      applied: tenders.filter((t: any) => ['applied','submitted','evaluation'].includes(t.status)).length,
      won: tenders.filter((t: any) => t.status === 'won').length,
      highScore: tenders.filter((t: any) => t.ai_score >= 75).length,
      totalScans: scans?.length || 0,
      avgWinProbability: tenders.length > 0 ? Math.round(tenders.reduce((s: number, t: any) => s + (t.win_probability || 0), 0) / tenders.length) : 0,
      byCountry,
      byPipeline,
      pipelineSteps: PIPELINE_STEPS,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/tenders/pipeline-steps
router.get('/pipeline-steps', (_req: any, res: any) => {
  res.json({ steps: PIPELINE_STEPS });
});

// GET /api/tenders/:id
router.get('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('tenders').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (error || !data) return res.status(404).json({ error: 'Ihale bulunamadi' });
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
    if (error || !tender) return res.status(404).json({ error: 'Ihale bulunamadi' });
    const draft = await generateProposalDraft(tender, company_info);
    await supabase.from('tenders').update({ proposal_draft: draft, proposal_created_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ proposal: draft });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/tenders/:id/coaching — AI Ihale Kocu
router.post('/:id/coaching', async (req: any, res: any) => {
  try {
    const { data: tender, error } = await supabase.from('tenders').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (error || !tender) return res.status(404).json({ error: 'Ihale bulunamadi' });

    const { data: history } = await supabase.from('tenders').select('status, ai_score, country')
      .eq('user_id', req.userId).in('status', ['applied','won','lost','submitted']).limit(50);

    const coaching = await generateTenderCoaching(tender, history || []);
    res.json({ coaching });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/tenders/:id
router.patch('/:id', async (req: any, res: any) => {
  try {
    const allowed = ['status', 'notes', 'applied_at', 'result', 'pipeline_step'];
    const updates: any = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();

    if (updates.pipeline_step === 'submitted' && !updates.status) {
      updates.status = 'applied';
      updates.applied_at = new Date().toISOString();
    }
    if (updates.status === 'won' || updates.status === 'lost') {
      updates.pipeline_step = updates.status;
    }

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
module.exports.runDailyTenderScan = runDailyTenderScan;
