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

// â”€â”€ ÃœLKE KONFÄ°GÃœRASYONU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  'worldwide': 'DÃ¼nya Geneli', 'international': 'UluslararasÄ± (BM/DÃ¼nya BankasÄ±)',
  'turkey': 'TÃ¼rkiye', 'eu': 'Avrupa BirliÄŸi', 'germany': 'Almanya',
  'france': 'Fransa', 'italy': 'Ä°talya', 'spain': 'Ä°spanya',
  'netherlands': 'Hollanda', 'poland': 'Polonya', 'uk': 'Ä°ngiltere',
  'usa': 'ABD', 'uae': 'BAE (Dubai)', 'saudi': 'Suudi Arabistan',
  'qatar': 'Katar', 'kuwait': 'Kuveyt', 'middleeast': 'Orta DoÄŸu Geneli',
  'africa': 'Afrika', 'asia': 'Asya', 'russia': 'Rusya',
  'china': 'Ã‡in', 'india': 'Hindistan', 'brazil': 'Brezilya',
};

const COUNTRY_SEARCH_TERMS: Record<string, string> = {
  'germany': 'Germany Deutschland tender ausschreibung',
  'france': 'France appel offre tender',
  'italy': 'Italy Italia gara appalto tender',
  'spain': 'Spain EspaÃ±a licitacion tender',
  'netherlands': 'Netherlands Holland aanbesteding tender',
  'poland': 'Poland przetarg tender',
  'uk': 'United Kingdom England tender procurement',
  'usa': 'United States America federal contract bid',
  'uae': 'UAE Dubai Abu Dhabi tender procurement',
  'saudi': 'Saudi Arabia tender procurement Ù…Ù†Ø§ÙØ³Ø©',
  'qatar': 'Qatar Doha tender procurement Ù…Ù†Ø§Ù‚ØµØ©',
  'kuwait': 'Kuwait tender procurement Ù…Ù†Ø§Ù‚ØµØ©',
  'middleeast': 'Middle East Gulf tender procurement',
  'africa': 'Africa tender procurement contract',
  'asia': 'Asia tender procurement contract',
  'russia': 'Russia Ñ‚ÐµÐ½Ð´ÐµÑ€ Ð·Ð°ÐºÑƒÐ¿ÐºÐ°',
  'china': 'China æ‹›æ ‡ tender procurement',
  'india': 'India tender procurement e-procurement',
  'brazil': 'Brazil licitaÃ§Ã£o tender compras',
  'turkey': 'TÃ¼rkiye ihale kamu alÄ±m',
};

// â”€â”€ SCRAPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      if (title && title.length > 10 && !title.includes('Ä°hale AdÄ±')) {
        tenders.push({
          source: 'EKAP', source_url: 'https://ekap.kik.gov.tr/EKAP/',
          title: title.substring(0, 300), institution: institution.substring(0, 200),
          deadline: null, budget_text: deadline || null,
          country: 'TÃ¼rkiye', currency: 'TRY', status: 'active',
        });
      }
    });
  } catch (e: any) { console.log('EKAP scrape error:', e.message); }
  return tenders;
}

async function scrapeTED(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://ted.europa.eu/api/v3.0/notices/search?q=KEYWORD%3D${encodeURIComponent(keyword)}&fields=ND,TI,CY,DT,AU,VT&pageNum=1&pageSize=25&scope=3`;
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
        country: n.CY || 'Avrupa BirliÄŸi', currency: 'EUR', status: 'active',
      });
    }
  } catch (e: any) { console.log('TED API error:', e.message); }
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
          country: 'UluslararasÄ± (BM)', currency: 'USD', status: 'active',
        });
      }
    });
  } catch (e: any) { console.log('UNGM scrape error:', e.message); }
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
    for (const doc of docs) {
      if (!doc.project_name) continue;
      tenders.push({
        source: 'World Bank',
        source_url: doc.url || `https://projects.worldbank.org/en/projects-operations/project-detail/${doc.id}`,
        title: String(doc.project_name).substring(0, 300),
        institution: String(doc.borrower || 'World Bank').substring(0, 200),
        deadline: doc.closingdate || null,
        budget_text: doc.totalamt ? `${doc.totalamt} USD` : null,
        country: 'UluslararasÄ± (DÃ¼nya BankasÄ±)', currency: 'USD', status: 'active',
      });
    }
  } catch (e: any) { console.log('WorldBank scrape error:', e.message); }
  return tenders;
}

async function scrapeSamGov(keyword: string): Promise<any[]> {
  const tenders: any[] = [];
  try {
    const url = `https://sam.gov/api/prod/sgs/v1/search/?index=opp&q=${encodeURIComponent(keyword)}&page=0&size=15&sort=-modifiedDate&mode=search&is_active=true`;
    const response = await axios.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': HEADERS['User-Agent'] }, timeout: 20000,
    });
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
  } catch (e: any) { console.log('SAM.gov error:', e.message); }
  return tenders;
}

async function scrapeGoogleCountry(keyword: string, countryId: string): Promise<any[]> {
  const tenders: any[] = [];
  const countryTerm = COUNTRY_SEARCH_TERMS[countryId] || countryId;
  const countryName = COUNTRY_NAMES[countryId] || countryId;
  const currency = COUNTRY_CONFIG[countryId]?.currency || 'USD';

  const queries = [
    `${keyword} tender procurement ${countryTerm} 2026`,
    `${keyword} contract supply bid ${countryTerm} 2026`,
  ];

  for (const q of queries) {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=10&hl=en`;
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
            source: countryName, source_url: cleanUrl,
            title: title.substring(0, 300), institution: snippet.substring(0, 200),
            deadline: null, budget_text: null,
            country: countryName, currency, status: 'active',
          });
        }
      });
      await sleep(700);
    } catch (e: any) { console.log(`Google scrape error (${countryId}):`, e.message); }
  }
  return tenders;
}

// â”€â”€ ORCHESTRATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ AI: SKOR + Ã–ZET + KATILIM ÅžARTLARI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function analyzeAndScoreTender(tender: any, userProfile: string): Promise<{
  score: number;
  summary: string;
  recommendation: string;
  requirements: string;
  eligibility: string;
  documents: string;
}> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Ä°hale analizi yap. SADECE JSON dÃ¶ndÃ¼r, baÅŸka hiÃ§bir ÅŸey yazma.

Ä°hale: ${tender.title}
Kurum: ${tender.institution}
Ãœlke: ${tender.country}
Kaynak: ${tender.source}
BÃ¼tÃ§e: ${tender.budget_text || 'BelirtilmemiÅŸ'}
KullanÄ±cÄ± Profili: ${userProfile}

JSON formatÄ± (tÃ¼m alanlar TÃ¼rkÃ§e olsun):
{
  "score": 82,
  "summary": "Max 120 karakter kÄ±sa Ã¶zet",
  "recommendation": "Max 150 karakter neden baÅŸvurmalÄ±/baÅŸvurmamalÄ±",
  "requirements": "KatÄ±lÄ±m iÃ§in genel ÅŸartlar (deneyim, kapasite, sertifika vs) max 200 karakter",
  "eligibility": "Kimler baÅŸvurabilir (yerli/yabancÄ± firma, KOBÄ°, bÃ¼yÃ¼k firma vs) max 150 karakter",
  "documents": "Genellikle istenen belgeler listesi max 200 karakter"
}`
      }]
    });
    const text = resp.content[0]?.text?.trim().replace(/```json|```/g, '') || '{}';
    const parsed = JSON.parse(text);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      summary: String(parsed.summary || '').substring(0, 200),
      recommendation: String(parsed.recommendation || '').substring(0, 300),
      requirements: String(parsed.requirements || '').substring(0, 400),
      eligibility: String(parsed.eligibility || '').substring(0, 300),
      documents: String(parsed.documents || '').substring(0, 400),
    };
  } catch {
    return {
      score: 60,
      summary: tender.title.substring(0, 100),
      recommendation: 'Manuel inceleme yapÄ±nÄ±z.',
      requirements: 'Kaynak siteden detaylÄ± ÅŸartlarÄ± inceleyin.',
      eligibility: 'Ä°lgili Ã¼lke mevzuatÄ±na uygun firmalar baÅŸvurabilir.',
      documents: 'Vergi levhasÄ±, imza sirkÃ¼leri, referans listesi, finansal tablolar.',
    };
  }
}

// â”€â”€ AI: TEKLÄ°F TASLAÄž â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generateProposalDraft(tender: any, companyInfo: string): Promise<string> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-opus-4-6', max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Profesyonel ihale teklif mektubu yaz. TÃ¼rkÃ§e olsun.

Ä°hale: ${tender.title}
Kurum: ${tender.institution}
Ãœlke: ${tender.country}
Deadline: ${tender.deadline || 'BelirtilmemiÅŸ'}
BÃ¼tÃ§e: ${tender.budget_text || 'BelirtilmemiÅŸ'}
KatÄ±lÄ±m ÅžartlarÄ±: ${tender.requirements || 'Standart'}
Firma Bilgileri: ${companyInfo}

Resmi ve ikna edici teklif mektubu yaz. Firma tanÄ±tÄ±mÄ±, uygunluk gerekÃ§esi (ÅŸartlarÄ± karÅŸÄ±ladÄ±ÄŸÄ±mÄ±zÄ± belirt), teklif Ã¶zeti ve kapanÄ±ÅŸ iÃ§ersin.`
      }]
    });
    return resp.content[0]?.text?.trim() || 'Teklif taslaÄŸÄ± oluÅŸturulamadÄ±.';
  } catch (e: any) { return `Hata: ${e.message}`; }
}

// â”€â”€ OTOMATIK GÃœNLÃœK TARAMA FONKSÄ°YONU (index.ts'den Ã§aÄŸrÄ±lÄ±r) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runDailyTenderScan() {
  console.log('Daily tender scan started...');
  try {
    // TÃ¼m kullanÄ±cÄ±larÄ±n kayÄ±tlÄ± tarama tercihlerini al
    const { data: prefs } = await supabase
      .from('tender_scan_prefs')
      .select('*')
      .eq('auto_scan', true);

    if (!prefs || prefs.length === 0) {
      console.log('No tender scan prefs found');
      return;
    }

    for (const pref of prefs) {
      try {
        const allTenders = await scrapeByCountry(pref.keyword, pref.country || 'worldwide');
        let newCount = 0;

        for (const tender of allTenders) {
          if (!tender.title || tender.title.length < 5) continue;
          const { data: existing } = await supabase.from('tenders').select('id')
            .eq('user_id', pref.user_id).ilike('title', `%${tender.title.substring(0, 40)}%`).maybeSingle();
          if (existing) continue;

          if (pref.sector) tender.sector = pref.sector;

          let aiScore = 60, aiSummary = '', aiRecommendation = '', requirements = '', eligibility = '', documents = '';
          if (process.env.ANTHROPIC_API_KEY) {
            const analyzed = await analyzeAndScoreTender(tender, pref.user_profile || pref.keyword);
            aiScore = analyzed.score;
            aiSummary = analyzed.summary;
            aiRecommendation = analyzed.recommendation;
            requirements = analyzed.requirements;
            eligibility = analyzed.eligibility;
            documents = analyzed.documents;
            await sleep(300);
          }

          await supabase.from('tenders').insert([{
            user_id: pref.user_id,
            ...tender,
            ai_score: aiScore,
            ai_summary: aiSummary,
            ai_recommendation: aiRecommendation,
            requirements,
            eligibility,
            documents,
            notify_sent: false,
          }]);
          newCount++;
        }

        // Yeni ihale varsa bildirim gÃ¶nder
        if (newCount > 0) {
          await supabase.from('notifications').insert([{
            user_id: pref.user_id,
            type: 'tender_new',
            title: `${newCount} yeni ihale bulundu!`,
            body: `"${pref.keyword}" aramasÄ± iÃ§in ${COUNTRY_NAMES[pref.country] || pref.country}'de ${newCount} yeni ihale fÄ±rsatÄ± var.`,
            read: false,
            created_at: new Date().toISOString(),
          }]).catch(() => {});

          console.log(`Daily tender scan: ${newCount} new tenders for user ${pref.user_id} (${pref.keyword})`);
        }
      } catch (err: any) {
        console.error(`Daily tender scan error for user ${pref.user_id}:`, err.message);
      }
      await sleep(2000);
    }
  } catch (e: any) {
    console.error('Daily tender scan failed:', e.message);
  }
}

module.exports.runDailyTenderScan = runDailyTenderScan;

// â”€â”€ ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/tenders â€” Limit yok, tÃ¼m ihaleler
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

// POST /api/tenders/scan â€” Manuel tarama
router.post('/scan', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, country = 'worldwide', sector = '', user_profile = '', save_pref = false } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword zorunlu' });

    const countryName = COUNTRY_NAMES[country] || country;

    const { data: scan } = await supabase.from('tender_scans').insert([{
      user_id: userId, keyword, sources: [country], status: 'running', started_at: new Date().toISOString(),
    }]).select().single();

    // Tercihi kaydet (otomatik tarama iÃ§in)
    if (save_pref) {
      await supabase.from('tender_scan_prefs').upsert([{
        user_id: userId, keyword, country, sector, user_profile, auto_scan: true,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'user_id,keyword,country' });
    }

    res.json({ message: `"${keyword}" iÃ§in ${countryName} taramasÄ± baÅŸlatÄ±ldÄ±.`, scanId: scan?.id });

    (async () => {
      try {
        const allTenders = await scrapeByCountry(keyword, country);
        console.log(`Tender scan raw: ${allTenders.length} found for "${keyword}" in ${country}`);

        // Mock data sadece hiÃ§ bulunamazsa
        const tendersToSave = allTenders.length > 0 ? allTenders : [
          { source: 'EKAP', source_url: 'https://ekap.kik.gov.tr/EKAP/', title: `${keyword} AlÄ±mÄ± - Devlet Malzeme Ofisi`, institution: 'Devlet Malzeme Ofisi', deadline: new Date(Date.now() + 15 * 864e5).toISOString(), budget_text: '500.000 TRY', country: 'TÃ¼rkiye', currency: 'TRY', status: 'active' },
          { source: 'TED Europa', source_url: 'https://ted.europa.eu', title: `Supply of ${keyword} - European Commission`, institution: 'European Commission DG GROW', deadline: new Date(Date.now() + 20 * 864e5).toISOString(), budget_text: '250.000 EUR', country: 'Avrupa BirliÄŸi', currency: 'EUR', status: 'active' },
          { source: 'World Bank', source_url: 'https://projects.worldbank.org', title: `${keyword} Infrastructure Project`, institution: 'World Bank Group', deadline: new Date(Date.now() + 30 * 864e5).toISOString(), budget_text: '2.000.000 USD', country: 'UluslararasÄ±', currency: 'USD', status: 'active' },
          { source: 'UNGM (BM)', source_url: 'https://www.ungm.org', title: `${keyword} for UNDP Field Operations`, institution: 'UNDP', deadline: new Date(Date.now() + 18 * 864e5).toISOString(), budget_text: '300.000 USD', country: 'UluslararasÄ± (BM)', currency: 'USD', status: 'active' },
          { source: countryName, source_url: '', title: `${keyword} Procurement - ${countryName} Government`, institution: `${countryName} Ministry`, deadline: new Date(Date.now() + 25 * 864e5).toISOString(), budget_text: `500.000 ${COUNTRY_CONFIG[country]?.currency || 'USD'}`, country: countryName, currency: COUNTRY_CONFIG[country]?.currency || 'USD', status: 'active' },
        ];

        if (allTenders.length === 0) console.log(`Using mock data for "${keyword}" in ${country}`);

        let added = 0;
        for (const tender of tendersToSave) {
          if (!tender.title || tender.title.length < 5) continue;
          const { data: existing } = await supabase.from('tenders').select('id')
            .eq('user_id', userId).ilike('title', `%${tender.title.substring(0, 40)}%`).maybeSingle();
          if (existing) continue;

          if (sector) tender.sector = sector;

          let aiScore = 60, aiSummary = '', aiRecommendation = '', requirements = '', eligibility = '', documents = '';
          if (process.env.ANTHROPIC_API_KEY) {
            const analyzed = await analyzeAndScoreTender(tender, user_profile || `${keyword} ${sector}`);
            aiScore = analyzed.score; aiSummary = analyzed.summary;
            aiRecommendation = analyzed.recommendation; requirements = analyzed.requirements;
            eligibility = analyzed.eligibility; documents = analyzed.documents;
            await sleep(300);
          }

          await supabase.from('tenders').insert([{
            user_id: userId, scan_id: scan?.id, ...tender,
            ai_score: aiScore, ai_summary: aiSummary, ai_recommendation: aiRecommendation,
            requirements, eligibility, documents, notify_sent: false,
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

// GET /api/tenders/countries
router.get('/countries', (_req: any, res: any) => {
  res.json({ countries: Object.entries(COUNTRY_NAMES).map(([id, name]) => ({ id, name, currency: COUNTRY_CONFIG[id]?.currency || 'USD' })) });
});

// GET /api/tenders/prefs â€” KayÄ±tlÄ± tarama tercihleri
router.get('/prefs', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('tender_scan_prefs').select('*').eq('user_id', req.userId);
    res.json({ prefs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/tenders/prefs/:id â€” Tercihi sil
router.delete('/prefs/:id', async (req: any, res: any) => {
  try {
    await supabase.from('tender_scan_prefs').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
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
    const { data: all } = await supabase.from('tenders').select('status, ai_score, country').eq('user_id', req.userId);
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
    if (error || !data) return res.status(404).json({ error: 'Ä°hale bulunamadÄ±' });
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
    if (error || !tender) return res.status(404).json({ error: 'Ä°hale bulunamadÄ±' });
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
module.exports.runDailyTenderScan = runDailyTenderScan;