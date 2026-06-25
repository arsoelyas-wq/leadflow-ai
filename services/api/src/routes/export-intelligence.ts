export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function cleanText(text: string) { return text?.replace(/\s+/g, ' ').trim() || ''; }

// ── ÜLKE VERİTABANI ──────────────────────────────────────────────────────────
const COUNTRIES = [
  { code:'DE', name:'Almanya',           flag:'🇩🇪', language:'de', currency:'EUR', region:'Avrupa',    comtradeCode:'276', googleDomain:'google.de', lang:'de' },
  { code:'GB', name:'İngiltere',         flag:'🇬🇧', language:'en', currency:'GBP', region:'Avrupa',    comtradeCode:'826', googleDomain:'google.co.uk', lang:'en' },
  { code:'FR', name:'Fransa',            flag:'🇫🇷', language:'fr', currency:'EUR', region:'Avrupa',    comtradeCode:'251', googleDomain:'google.fr', lang:'fr' },
  { code:'NL', name:'Hollanda',          flag:'🇳🇱', language:'nl', currency:'EUR', region:'Avrupa',    comtradeCode:'528', googleDomain:'google.nl', lang:'nl' },
  { code:'BE', name:'Belçika',           flag:'🇧🇪', language:'fr', currency:'EUR', region:'Avrupa',    comtradeCode:'56',  googleDomain:'google.be', lang:'fr' },
  { code:'IT', name:'İtalya',            flag:'🇮🇹', language:'it', currency:'EUR', region:'Avrupa',    comtradeCode:'381', googleDomain:'google.it', lang:'it' },
  { code:'ES', name:'İspanya',           flag:'🇪🇸', language:'es', currency:'EUR', region:'Avrupa',    comtradeCode:'724', googleDomain:'google.es', lang:'es' },
  { code:'PL', name:'Polonya',           flag:'🇵🇱', language:'pl', currency:'PLN', region:'Avrupa',    comtradeCode:'616', googleDomain:'google.pl', lang:'pl' },
  { code:'US', name:'ABD',               flag:'🇺🇸', language:'en', currency:'USD', region:'Amerika',   comtradeCode:'842', googleDomain:'google.com', lang:'en' },
  { code:'CA', name:'Kanada',            flag:'🇨🇦', language:'en', currency:'CAD', region:'Amerika',   comtradeCode:'124', googleDomain:'google.ca', lang:'en' },
  { code:'AE', name:'BAE',               flag:'🇦🇪', language:'ar', currency:'AED', region:'Körfez',    comtradeCode:'784', googleDomain:'google.ae', lang:'ar' },
  { code:'SA', name:'Suudi Arabistan',   flag:'🇸🇦', language:'ar', currency:'SAR', region:'Körfez',    comtradeCode:'682', googleDomain:'google.com.sa', lang:'ar' },
  { code:'QA', name:'Katar',             flag:'🇶🇦', language:'ar', currency:'QAR', region:'Körfez',    comtradeCode:'634', googleDomain:'google.com.qa', lang:'ar' },
  { code:'KW', name:'Kuveyt',            flag:'🇰🇼', language:'ar', currency:'KWD', region:'Körfez',    comtradeCode:'414', googleDomain:'google.com.kw', lang:'ar' },
  { code:'EG', name:'Mısır',             flag:'🇪🇬', language:'ar', currency:'EGP', region:'Afrika',    comtradeCode:'818', googleDomain:'google.com.eg', lang:'ar' },
  { code:'MA', name:'Fas',               flag:'🇲🇦', language:'fr', currency:'MAD', region:'Afrika',    comtradeCode:'504', googleDomain:'google.co.ma', lang:'fr' },
  { code:'KZ', name:'Kazakistan',        flag:'🇰🇿', language:'ru', currency:'KZT', region:'Orta Asya', comtradeCode:'398', googleDomain:'google.kz', lang:'ru' },
  { code:'AZ', name:'Azerbaycan',        flag:'🇦🇿', language:'az', currency:'AZN', region:'Orta Asya', comtradeCode:'31',  googleDomain:'google.az', lang:'ru' },
  { code:'UZ', name:'Özbekistan',        flag:'🇺🇿', language:'uz', currency:'UZS', region:'Orta Asya', comtradeCode:'860', googleDomain:'google.com', lang:'ru' },
  { code:'RU', name:'Rusya',             flag:'🇷🇺', language:'ru', currency:'RUB', region:'Orta Asya', comtradeCode:'643', googleDomain:'google.ru', lang:'ru' },
  { code:'CN', name:'Çin',               flag:'🇨🇳', language:'zh', currency:'CNY', region:'Asya',      comtradeCode:'156', googleDomain:'google.com', lang:'zh' },
  { code:'JP', name:'Japonya',           flag:'🇯🇵', language:'ja', currency:'JPY', region:'Asya',      comtradeCode:'392', googleDomain:'google.co.jp', lang:'ja' },
  { code:'IN', name:'Hindistan',         flag:'🇮🇳', language:'en', currency:'INR', region:'Asya',      comtradeCode:'356', googleDomain:'google.co.in', lang:'en' },
  // Ek ulkeler
  { code:'AT', name:'Avusturya',         flag:'🇦🇹', language:'de', currency:'EUR', region:'Avrupa',    comtradeCode:'40',  googleDomain:'google.at', lang:'de' },
  { code:'SE', name:'İsveç',             flag:'🇸🇪', language:'en', currency:'SEK', region:'Avrupa',    comtradeCode:'752', googleDomain:'google.se', lang:'en' },
  { code:'DK', name:'Danimarka',         flag:'🇩🇰', language:'en', currency:'DKK', region:'Avrupa',    comtradeCode:'208', googleDomain:'google.dk', lang:'en' },
  { code:'NO', name:'Norveç',            flag:'🇳🇴', language:'en', currency:'NOK', region:'Avrupa',    comtradeCode:'578', googleDomain:'google.no', lang:'en' },
  { code:'CH', name:'İsviçre',           flag:'🇨🇭', language:'de', currency:'CHF', region:'Avrupa',    comtradeCode:'756', googleDomain:'google.ch', lang:'de' },
  { code:'CZ', name:'Çekya',             flag:'🇨🇿', language:'en', currency:'CZK', region:'Avrupa',    comtradeCode:'203', googleDomain:'google.cz', lang:'en' },
  { code:'RO', name:'Romanya',           flag:'🇷🇴', language:'en', currency:'RON', region:'Avrupa',    comtradeCode:'642', googleDomain:'google.ro', lang:'en' },
  { code:'GR', name:'Yunanistan',        flag:'🇬🇷', language:'en', currency:'EUR', region:'Avrupa',    comtradeCode:'300', googleDomain:'google.gr', lang:'en' },
  { code:'PT', name:'Portekiz',          flag:'🇵🇹', language:'pt', currency:'EUR', region:'Avrupa',    comtradeCode:'620', googleDomain:'google.pt', lang:'pt' },
  { code:'IE', name:'İrlanda',           flag:'🇮🇪', language:'en', currency:'EUR', region:'Avrupa',    comtradeCode:'372', googleDomain:'google.ie', lang:'en' },
  { code:'HU', name:'Macaristan',        flag:'🇭🇺', language:'en', currency:'HUF', region:'Avrupa',    comtradeCode:'348', googleDomain:'google.hu', lang:'en' },
  { code:'BG', name:'Bulgaristan',       flag:'🇧🇬', language:'en', currency:'BGN', region:'Avrupa',    comtradeCode:'100', googleDomain:'google.bg', lang:'en' },
  { code:'HR', name:'Hırvatistan',       flag:'🇭🇷', language:'en', currency:'EUR', region:'Avrupa',    comtradeCode:'191', googleDomain:'google.hr', lang:'en' },
  { code:'MX', name:'Meksika',           flag:'🇲🇽', language:'es', currency:'MXN', region:'Amerika',   comtradeCode:'484', googleDomain:'google.com.mx', lang:'es' },
  { code:'BR', name:'Brezilya',          flag:'🇧🇷', language:'pt', currency:'BRL', region:'Amerika',   comtradeCode:'76',  googleDomain:'google.com.br', lang:'pt' },
  { code:'CL', name:'Şili',              flag:'🇨🇱', language:'es', currency:'CLP', region:'Amerika',   comtradeCode:'152', googleDomain:'google.cl', lang:'es' },
  { code:'BH', name:'Bahreyn',           flag:'🇧🇭', language:'ar', currency:'BHD', region:'Körfez',    comtradeCode:'48',  googleDomain:'google.com.bh', lang:'ar' },
  { code:'OM', name:'Umman',             flag:'🇴🇲', language:'ar', currency:'OMR', region:'Körfez',    comtradeCode:'512', googleDomain:'google.com.om', lang:'ar' },
  { code:'JO', name:'Ürdün',             flag:'🇯🇴', language:'ar', currency:'JOD', region:'Körfez',    comtradeCode:'400', googleDomain:'google.jo', lang:'ar' },
  { code:'IQ', name:'Irak',              flag:'🇮🇶', language:'ar', currency:'IQD', region:'Körfez',    comtradeCode:'368', googleDomain:'google.iq', lang:'ar' },
  { code:'NG', name:'Nijerya',           flag:'🇳🇬', language:'en', currency:'NGN', region:'Afrika',    comtradeCode:'566', googleDomain:'google.com.ng', lang:'en' },
  { code:'ZA', name:'Güney Afrika',      flag:'🇿🇦', language:'en', currency:'ZAR', region:'Afrika',    comtradeCode:'710', googleDomain:'google.co.za', lang:'en' },
  { code:'KE', name:'Kenya',             flag:'🇰🇪', language:'en', currency:'KES', region:'Afrika',    comtradeCode:'404', googleDomain:'google.co.ke', lang:'en' },
  { code:'GE', name:'Gürcistan',         flag:'🇬🇪', language:'en', currency:'GEL', region:'Orta Asya', comtradeCode:'268', googleDomain:'google.ge', lang:'en' },
  { code:'TM', name:'Türkmenistan',      flag:'🇹🇲', language:'ru', currency:'TMT', region:'Orta Asya', comtradeCode:'795', googleDomain:'google.tm', lang:'ru' },
  { code:'KR', name:'Güney Kore',        flag:'🇰🇷', language:'en', currency:'KRW', region:'Asya',      comtradeCode:'410', googleDomain:'google.co.kr', lang:'en' },
  { code:'AU', name:'Avustralya',        flag:'🇦🇺', language:'en', currency:'AUD', region:'Asya',      comtradeCode:'36',  googleDomain:'google.com.au', lang:'en' },
  { code:'SG', name:'Singapur',          flag:'🇸🇬', language:'en', currency:'SGD', region:'Asya',      comtradeCode:'702', googleDomain:'google.com.sg', lang:'en' },
  { code:'MY', name:'Malezya',           flag:'🇲🇾', language:'en', currency:'MYR', region:'Asya',      comtradeCode:'458', googleDomain:'google.com.my', lang:'en' },
  { code:'TH', name:'Tayland',           flag:'🇹🇭', language:'en', currency:'THB', region:'Asya',      comtradeCode:'764', googleDomain:'google.co.th', lang:'en' },
  { code:'VN', name:'Vietnam',           flag:'🇻🇳', language:'en', currency:'VND', region:'Asya',      comtradeCode:'704', googleDomain:'google.com.vn', lang:'en' },
  { code:'ID', name:'Endonezya',         flag:'🇮🇩', language:'en', currency:'IDR', region:'Asya',      comtradeCode:'360', googleDomain:'google.co.id', lang:'en' },
  { code:'PK', name:'Pakistan',          flag:'🇵🇰', language:'en', currency:'PKR', region:'Asya',      comtradeCode:'586', googleDomain:'google.com.pk', lang:'en' },
];

// ── ÖDEME RİSK SKORLARI ───────────────────────────────────────────────────────
const PAYMENT_RISK: Record<string, { score: number; label: string; dso: number; notes: string }> = {
  'DE':{ score:95, label:'Çok Düşük',   dso:30,  notes:'Güçlü hukuki sistem, düzenli ödeme kültürü' },
  'GB':{ score:90, label:'Çok Düşük',   dso:35,  notes:'Köklü ticaret hukuku, güvenilir bankacılık' },
  'FR':{ score:85, label:'Düşük',       dso:45,  notes:'LC veya banka garantisi önerilebilir' },
  'NL':{ score:92, label:'Çok Düşük',   dso:30,  notes:'Finans merkezi, çok güvenilir' },
  'BE':{ score:88, label:'Düşük',       dso:35,  notes:'AB finans sistemi, güvenilir' },
  'IT':{ score:72, label:'Orta',        dso:60,  notes:'Geç ödeme yaygın, LC tavsiye edilir' },
  'ES':{ score:78, label:'Orta',        dso:50,  notes:'Ekonomik dalgalanma riski var' },
  'PL':{ score:80, label:'Düşük',       dso:40,  notes:'AB üyesi, gelişen ekonomi' },
  'US':{ score:91, label:'Çok Düşük',   dso:30,  notes:'Güçlü hukuki sistem, wire transfer yaygın' },
  'CA':{ score:90, label:'Çok Düşük',   dso:30,  notes:'Güvenilir bankacılık sistemi' },
  'AE':{ score:82, label:'Düşük',       dso:30,  notes:'LC yaygın, bankacılık güçlü' },
  'SA':{ score:75, label:'Orta',        dso:45,  notes:'LC veya avans önerilebilir' },
  'QA':{ score:80, label:'Düşük',       dso:35,  notes:'Petrol geliri yüksek, güvenilir' },
  'KW':{ score:78, label:'Orta',        dso:40,  notes:'LC ile çalışmak güvenli' },
  'EG':{ score:42, label:'Yüksek',      dso:90,  notes:'Döviz kısıtlaması var, akreditif şart' },
  'MA':{ score:55, label:'Orta-Yüksek', dso:60,  notes:'EUR transferi tercih edilmeli' },
  'KZ':{ score:50, label:'Orta-Yüksek', dso:60,  notes:'Banka garantisi alın' },
  'AZ':{ score:62, label:'Orta',        dso:45,  notes:'EUR veya USD ile çalışın' },
  'UZ':{ score:45, label:'Yüksek',      dso:75,  notes:'Avans veya LC zorunlu' },
  'RU':{ score:25, label:'Çok Yüksek',  dso:120, notes:'Yaptırım riski kritik, dikkatli değerlendirin' },
  'CN':{ score:65, label:'Orta',        dso:60,  notes:'Büyük alıcılar güvenilir, küçükler dikkat' },
  'JP':{ score:93, label:'Çok Düşük',   dso:30,  notes:'En güvenilir pazarlardan biri' },
  'IN':{ score:55, label:'Orta-Yüksek', dso:75,  notes:'LC ile çalışın, avans alın' },
};

// ── KÜLTÜREL ZEKA ─────────────────────────────────────────────────────────────
const CULTURAL_INTEL: Record<string, { greeting: string; taboo: string; timing: string; tip: string }> = {
  'DE':{ greeting:'Herr/Frau kullanın, Dr. varsa mutlaka ekleyin', taboo:'İlk emailde fiyat sormayın', timing:'09:00-17:00, Cuma 15\'te biter', tip:'Teknik detaylar ve sertifikalar çok önemli' },
  'GB':{ greeting:'Mr/Ms kullanın, informal geçiş hızlı', taboo:'Fazla resmi olmayın', timing:'09:00-17:30, pazar tatil', tip:'Mizah kabul görür, güven yavaş kurulur' },
  'FR':{ greeting:'Monsieur/Madame, Fransızca deneyin', taboo:'Fransız rakiplerini eleştirmeyin', timing:'12:00-14:00 öğle paydosu kutsal', tip:'Fransızca email çok iyi izlenim bırakır' },
  'AE':{ greeting:'Sheikh/Sahibi gibi unvanlar önemli', taboo:'Ramazan\'da gündüz gıda/içecek görseli göndermeyin', timing:'Cuma-Cumartesi hafta sonu', tip:'Kişisel ilişki kurulmadan iş yapılmaz' },
  'SA':{ greeting:'Bay/erkek-kadın karışık toplantıdan kaçının', taboo:'Alkol veya domuz eti ürünleri', timing:'Perşembe-Cuma hafta sonu', tip:'İlişki kurma süreci uzun, sabırlı olun' },
  'JP':{ greeting:'San ekleyin: Tanaka-san, kartvizite saygıyla bakın', taboo:'Direkt "hayır" demeyin', timing:'09:00-18:00, mesai sonrası da müzakere', tip:'İlk toplantı karar toplantısı değildir' },
  'CN':{ greeting:'Şirket unvanı önce, isim sonra', taboo:'Tayvan, Tibet konuşmayın', timing:'08:00-17:30, öğle siesta var', tip:'WeChat WhatsApp\'tan etkili' },
  'RU':{ greeting:'Bayan/Bay + soyisim resmi', taboo:'Rusya\'nın politikasını eleştirmeyin', timing:'09:00-18:00, yaz aylarında yavaşlar', tip:'Güçlü görünün, uzun vadeli düşünün' },
  'IN':{ greeting:'Sir/Madam yaygın', taboo:'Sığırla ilgili her şey', timing:'09:30-18:30, öğle uzun', tip:'Fiyat pazarlığı beklenir, %20 yukarıdan başlayın' },
  'US':{ greeting:'İlk isimle hitap normal', taboo:'Fazla resmi olmayın', timing:'09:00-17:00', tip:'ROI odaklı konuşun, somut rakamlar verin' },
};

// ── 1. HS KOD EŞLEŞTİRİCİ ────────────────────────────────────────────────────
async function mapSectorToHSCodes(sector: string): Promise<{ codes: string[]; names: string[]; searchTerms: Record<string, string>; searchTermsLocal: string }> {
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role:'user', content:`"${sector}" için HS kodlarını ve çok dilli arama terimlerini ver. JSON döndür:
{
  "codes": ["9401","9403"],
  "names": ["Oturma mobilyası","Diğer mobilya"],
  "searchTerms": {
    "en": "furniture importer distributor wholesale",
    "de": "Möbel Importeur Großhandel Händler",
    "fr": "importateur mobilier grossiste distributeur",
    "ar": "مستورد أثاث بالجملة",
    "ru": "импортер мебели оптовик дистрибьютор",
    "zh": "家具进口商批发商",
    "ja": "家具インポーター卸売",
    "it": "importatore mobili grossista",
    "es": "importador muebles mayorista",
    "nl": "meubel importeur groothandel",
    "pl": "importer mebli hurtownik",
    "pt": "importador moveis atacadista distribuidor",
    "az": "mebel idxalci topdan satici",
    "ko": "가구 수입업자 도매"
  },
  "googleMapsType": "furniture store"
}
Max 4 HS kodu. SADECE JSON.` }]
    });
    const text = resp.content[0]?.text?.trim().replace(/```json|```/g, '') || '{}';
    const parsed = JSON.parse(text);
    return {
      codes: parsed.codes || [],
      names: parsed.names || [],
      searchTerms: parsed.searchTerms || {},
      searchTermsLocal: parsed.googleMapsType || sector,
    };
  } catch {
    return { codes:[], names:[], searchTerms:{ en:`${sector} importer` }, searchTermsLocal:sector };
  }
}

// ── 2. PAZAR İSTATİSTİKLERİ (Ticaret Verisi) ─────────────────────────────────
async function getMarketIntelligence(hsCodes: string[], countryCode: string, country: any): Promise<{
  marketSizeUSD:number; turkeyExportsUSD:number; turkeySharePct:number;
  avgUnitPriceUSD:number; yoyGrowthPct:number; year:number;
}> {
  const empty = { marketSizeUSD:0, turkeyExportsUSD:0, turkeySharePct:0, avgUnitPriceUSD:0, yoyGrowthPct:0, year:2023 };
  if (!hsCodes.length || !country?.comtradeCode) return empty;
  try {
    const hs = hsCodes[0];
    const year = 2023;
    const TURKEY = '792';
    const targetCode = country.comtradeCode;
    const [trResp, mktResp, prevResp] = await Promise.allSettled([
      axios.get('https://comtrade.un.org/api/get', { params:{ r:TURKEY, p:targetCode, ps:year, px:'HS', cc:hs, type:'C', freq:'A', fmt:'json', max:1 }, timeout:12000 }),
      axios.get('https://comtrade.un.org/api/get', { params:{ r:targetCode, p:0, ps:year, px:'HS', cc:hs, type:'C', freq:'A', fmt:'json', max:1 }, timeout:12000 }),
      axios.get('https://comtrade.un.org/api/get', { params:{ r:TURKEY, p:targetCode, ps:year-1, px:'HS', cc:hs, type:'C', freq:'A', fmt:'json', max:1 }, timeout:10000 }),
    ]);
    const turkeyExportsUSD = trResp.status==='fulfilled' ? (trResp.value.data?.dataset?.[0]?.TradeValue||0) : 0;
    const mktData = mktResp.status==='fulfilled' ? mktResp.value.data?.dataset?.[0] : null;
    const marketSizeUSD = mktData?.TradeValue || 0;
    const netWeight = mktData?.NetWeight || 0;
    const avgUnitPriceUSD = netWeight>0 ? Math.round(marketSizeUSD/netWeight) : 0;
    const turkeySharePct = marketSizeUSD>0 ? parseFloat(((turkeyExportsUSD/marketSizeUSD)*100).toFixed(1)) : 0;
    const prevVal = prevResp.status==='fulfilled' ? (prevResp.value.data?.dataset?.[0]?.TradeValue||0) : 0;
    const yoyGrowthPct = prevVal>0 ? parseFloat((((turkeyExportsUSD-prevVal)/prevVal)*100).toFixed(1)) : 0;
    return { marketSizeUSD, turkeyExportsUSD, turkeySharePct, avgUnitPriceUSD, yoyGrowthPct, year };
  } catch(e:any) { console.log('[MarketData] error:', e.message); return empty; }
}

// ── 3. GOOGLE MAPS MÜŞTERİ ARAMA ─────────────────────────────────────────────
async function searchGoogleMaps(sector: string, sectorLocal: string, country: any, searchTerms?: Record<string, string>): Promise<any[]> {
  const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!GOOGLE_KEY) return [];
  const results: any[] = [];
  // Use language-appropriate search term for the target country
  const lang = country.language || 'en';
  const localizedSector = searchTerms?.[lang] || searchTerms?.['en'] || sectorLocal || sector;
  const enSector = searchTerms?.['en'] || sector;
  const queries = [
    `${localizedSector} importer ${country.name}`,
    `${enSector} wholesale distributor ${country.name}`,
    `${localizedSector} supplier ${country.name}`,
  ];
  for (const query of queries) {
    try {
      const r = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: { query, key: GOOGLE_KEY, language: country.language },
        timeout: 12000,
      });
      for (const p of (r.data.results || []).slice(0, 5)) {
        if (results.find(x => x.company_name === p.name)) continue;
        try {
          const det = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: { place_id: p.place_id, fields:'name,formatted_phone_number,website,formatted_address,rating,international_phone_number', key: GOOGLE_KEY },
            timeout: 8000,
          });
          const d = det.data.result;
          results.push({
            company_name: (d.name || p.name).substring(0, 100),
            phone: d.international_phone_number || d.formatted_phone_number || null,
            website: d.website || null,
            address: d.formatted_address || p.formatted_address || null,
            country: country.name, country_code: country.code, sector,
            source_type: 'maps', rating: d.rating || null,
            verified_importer: false,
          });
          if (results.length >= 12) break;
        } catch {}
        await sleep(200);
      }
      if (results.length >= 12) break;
    } catch(e:any) { console.log('[Maps] error:', e.message); }
  }
  return results;
}

// ── 4. WEB ARAMA — Çoklu Kaynak, Yüksek Hacim ───────────────────────────────
async function searchWebImporters(searchTerms: Record<string, string>, country: any, sector: string): Promise<any[]> {
  const EXA_KEY = process.env.EXA_API_KEY;
  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  const results: any[] = [];
  const seen = new Set<string>();

  const lang = country.language;
  const localTerm = searchTerms[lang] || searchTerms['en'] || `${sector} importer`;
  const enTerm = searchTerms['en'] || `${sector} importer`;

  function addResult(r: any, verifiedImporter: boolean) {
    if (!r.company_name || r.company_name.length < 3) return;
    const key = r.company_name.toLowerCase().substring(0, 30);
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ ...r, verified_importer: verifiedImporter });
  }

  // Exa.ai — 5 farklı sorgu, her birinde 20 sonuç → 100 potansiyel lead
  if (EXA_KEY) {
    const tradeDomains: Record<string, string[]> = {
      'DE':['wer-liefert-was.de','europages.de','kompass.com','gelbeseiten.de'],
      'GB':['europages.co.uk','kompass.com','yell.com','b2bindex.co.uk'],
      'FR':['europages.fr','kompass.fr','societe.com','pagesjaunes.fr'],
      'NL':['europages.nl','kompass.nl','kvk.nl'],
      'IT':['europages.it','kompass.it','paginegialle.it'],
      'ES':['europages.es','kompass.es'],
      'US':['thomasnet.com','manta.com','kompass.com','dnb.com'],
      'AE':['yellowpages.ae','kompass.com'],
      'SA':['kompass.com','tradekey.com'],
      'IN':['indiamart.com','kompass.com','tradeindia.com'],
      'CN':['kompass.com'],
      'JP':['kompass.com','jpbiz.net'],
    };

    // Geniş arama sorguları — importer türleri
    const queries = [
      `${localTerm} ${country.name} wholesale importer contact`,
      `${enTerm} buyer purchasing ${country.name} company`,
      `${enTerm} distributor trading company ${country.name}`,
      `${localTerm} ${country.name} import business supplier`,
      `buy ${enTerm} ${country.name} B2B procurement`,
    ];

    for (const q of queries) {
      if (results.length >= 80) break;
      try {
        const res = await axios.post('https://api.exa.ai/search', {
          query: q, numResults: 20, useAutoprompt: false,
          includeDomains: ['europages.com','kompass.com','thomasnet.com','manta.com','tradekey.com','globalsources.com','alibaba.com','made-in-china.com', ...(tradeDomains[country.code]||[])],
          startPublishedDate: '2021-01-01',
          contents: { text: { maxCharacters: 400 } },
        }, { headers:{ 'x-api-key':EXA_KEY, 'Content-Type':'application/json' }, timeout:18000 });

        for (const r of (res.data?.results || [])) {
          if (!r.title || r.title.length < 4) continue;
          const rawName = r.title.split('|')[0].split(' - ')[0].split(' – ')[0].trim().substring(0, 100);
          if (rawName.length < 3) continue;
          const content = r.text || '';
          // Extract phone and email directly from Exa content
          const phoneMatch = content.match(/(?:\+|00)\d[\d\s\-().]{8,16}\d/);
          const emailMatch = content.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
          addResult({
            company_name: rawName, website: r.url||null,
            description: content.substring(0, 300),
            phone: phoneMatch?.[0]?.trim()||null,
            email: emailMatch?.[0]||null,
            country: country.name, country_code: country.code, sector, source_type: 'web_directory',
          }, true);
        }
        await sleep(250);
      } catch(e:any) { console.log('[WebSearch] Exa error:', e.message); }
    }

    // Genel web araması — domain kısıtlaması olmadan
    const openQueries = [
      `"${enTerm}" importer "${country.name}" email OR contact`,
      `site:linkedin.com "${enTerm}" "import" "${country.name}"`,
      `"${enTerm}" wholesale "${country.name}" +importer`,
    ];
    for (const q of openQueries) {
      if (results.length >= 100) break;
      try {
        const res = await axios.post('https://api.exa.ai/search', {
          query: q, numResults: 15, useAutoprompt: false,
          contents: { text: { maxCharacters: 300 } },
        }, { headers:{ 'x-api-key':EXA_KEY, 'Content-Type':'application/json' }, timeout:15000 });
        for (const r of (res.data?.results || [])) {
          if (!r.title || r.title.length < 4) continue;
          const rawName = r.title.split('|')[0].split(' - ')[0].trim().substring(0, 100);
          if (rawName.length < 3) continue;
          const combined = (rawName+' '+(r.text||'')).toLowerCase();
          if (!combined.match(/import|distribut|wholesale|buyer|purchas|trading|supply/i)) continue;
          addResult({
            company_name: rawName, website: r.url||null,
            description: (r.text||'').substring(0, 200),
            country: country.name, country_code: country.code, sector, source_type: 'web_search',
          }, false);
        }
        await sleep(200);
      } catch {}
    }
  }

  // Tavily — paralel arama, her zaman çalış
  if (TAVILY_KEY && results.length < 50) {
    const tavilyQueries = [
      `${enTerm} importer wholesale company ${country.name} contact phone`,
      `${enTerm} buyer distributor ${country.name} B2B supplier`,
    ];
    for (const tq of tavilyQueries) {
      if (results.length >= 80) break;
      try {
        const res = await axios.post('https://api.tavily.com/search', {
          api_key: TAVILY_KEY,
          query: tq, search_depth: 'advanced', max_results: 10,
        }, { timeout: 12000 });
        for (const r of (res.data?.results||[])) {
          if (!r.title || r.title.length < 4) continue;
          const rawName = r.title.split('|')[0].split(' - ')[0].trim().substring(0,100);
          if (rawName.length < 3) continue;
          addResult({
            company_name: rawName, website: r.url||null,
            description: (r.content||'').substring(0, 200),
            country: country.name, country_code: country.code, sector, source_type: 'web_search',
          }, false);
        }
      } catch(e:any) { console.log('[WebSearch] Tavily error:', e.message); }
    }
  }

  console.log(`[WebSearch] ${results.length} unique results for "${sector}" in ${country.name}`);
  return results;
}


// ── 5. LİNKEDİN KARAR VERİCİ ARAMA ──────────────────────────────────────────
async function searchLinkedInDecisionMakers(sector: string, companyName: string, country: any): Promise<{ name?: string; title?: string; linkedin?: string } | null> {
  const EXA_KEY = process.env.EXA_API_KEY;
  if (!EXA_KEY) return null;
  try {
    const query = `${sector} importer ${companyName} ${country.name} procurement manager director LinkedIn`;
    const res = await axios.post('https://api.exa.ai/search', {
      query, numResults: 3, useAutoprompt: false,
      includeDomains: ['linkedin.com'],
      contents: { text: { maxCharacters: 200 } },
    }, { headers:{ 'x-api-key':EXA_KEY, 'Content-Type':'application/json' }, timeout:10000 });

    const result = (res.data?.results||[])[0];
    if (!result) return null;
    // Extract name from LinkedIn URL pattern: linkedin.com/in/firstname-lastname
    const nameMatch = result.url?.match(/linkedin\.com\/in\/([\w-]+)/);
    let name = nameMatch ? nameMatch[1].replace(/-/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null;
    // Remove trailing hash/ID suffixes (e.g., "John Smith 5a1b2c3")
    if (name) name = name.replace(/\s+[a-f0-9]{6,}$/i, '').trim() || null;
    const titleMatch = (result.text||'').match(/(director|manager|buyer|head|chief|president|owner|CEO|CFO|procurement)[^\n]*/i);
    return { name: name||undefined, title: titleMatch?.[0]?.substring(0,80)||undefined, linkedin: result.url||undefined };
  } catch { return null; }
}

// ── 6. CONTACT ZENGİNLEŞTİRME — Website Scraping + Hunter.io ─────────────────
function extractFromText(text: string): { email?: string; phone?: string } {
  const emailMatch = text.match(/[\w.+-]+@(?!example|test|domain|mail\.com)[\w.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{3,6}/);
  const phone = phoneMatch?.[0]?.trim().replace(/\s+/g, ' ');
  // Validate phone length (exclude too short or too long)
  const validPhone = phone && phone.replace(/\D/g, '').length >= 7 ? phone : undefined;
  return { email: emailMatch?.[0], phone: validPhone };
}

async function scrapeWebsiteContact(url: string): Promise<{ email?: string; phone?: string }> {
  if (!url) return {};
  const base = url.replace(/\/$/, '');
  const pages = [base, `${base}/contact`, `${base}/contact-us`, `${base}/about`];
  for (const page of pages) {
    try {
      const res = await axios.get(page, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)', Accept: 'text/html' },
        timeout: 5000, maxRedirects: 3,
      });
      const html = res.data as string;
      // Strip tags for cleaner text
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                       .replace(/<style[\s\S]*?<\/style>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ');
      const result = extractFromText(text);
      if (result.email || result.phone) return result;
    } catch {}
  }
  return {};
}

async function hunterDomainSearch(domain: string): Promise<{ email?: string; name?: string; position?: string }> {
  const HUNTER_KEY = process.env.HUNTER_API_KEY;
  if (!HUNTER_KEY) return {};
  try {
    const res = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: { domain, api_key: HUNTER_KEY, limit: 5, type: 'generic' },
      timeout: 8000,
    });
    const emails: any[] = res.data?.data?.emails || [];
    // Prefer generic/info emails, then any email
    const best = emails.find(e => e.type === 'generic') ||
                 emails.find(e => ['info','sales','export','trade','import','contact'].some(k => e.value?.includes(k))) ||
                 emails[0];
    if (!best) return {};
    return {
      email: best.value,
      name: best.first_name ? `${best.first_name} ${best.last_name||''}`.trim() : undefined,
      position: best.position || undefined,
    };
  } catch { return {}; }
}

// Main contact enrichment — website scraping → Hunter.io
async function enrichCompanyContact(company: any): Promise<any> {
  // Already has both contacts
  if (company.email && company.phone) return company;

  let email = company.email || null;
  let phone = company.phone || null;
  let contactName = company.decision_maker_name || null;
  let contactTitle = company.decision_maker_title || null;

  // Step 1: Scrape website contact page
  if (company.website && !(email && phone)) {
    const scraped = await scrapeWebsiteContact(company.website);
    if (!email && scraped.email) email = scraped.email;
    if (!phone && scraped.phone) phone = scraped.phone;
  }

  // Step 2: Hunter.io domain search (if still missing email)
  if (!email && company.website) {
    try {
      const domain = company.website.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
      if (domain && domain.includes('.')) {
        const hunterResult = await hunterDomainSearch(domain);
        if (hunterResult.email) {
          email = hunterResult.email;
          if (!contactName && hunterResult.name) contactName = hunterResult.name;
          if (!contactTitle && hunterResult.position) contactTitle = hunterResult.position;
        }
      }
    } catch {}
  }

  return { ...company, email, phone, decision_maker_name: contactName, decision_maker_title: contactTitle };
}

// ── OUTREACH MESAJI ÜRET ──────────────────────────────────────────────────────
async function generateOutreachMessage(params: {
  companyName: string; country: string; language: string; sector: string;
  senderCompany: string; senderProduct: string; channel: string; hsCodes?: string[];
}): Promise<{ subject?: string; body: string }> {
  const { companyName, country, language, sector, senderCompany, senderProduct, channel, hsCodes } = params;
  const langNames: Record<string, string> = {
    de:'Almanca', en:'İngilizce', fr:'Fransızca', ar:'Arapça',
    ru:'Rusça', az:'Azerbaycanca', zh:'Çince', ja:'Japonca',
    it:'İtalyanca', es:'İspanyolca', nl:'Hollandaca', pl:'Lehçe',
  };
  const cultural = CULTURAL_INTEL[params.country] || null;
  try {
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 600,
      messages: [{ role:'user', content:`${langNames[language]||'İngilizce'} dilinde ${channel} outreach mesajı yaz.

Gönderen: ${senderCompany} (Türk üretici/ihracatçı)
Ürün: ${senderProduct}${hsCodes?.length?` (HS: ${hsCodes.join(', ')})`:''}
Alıcı: ${companyName} — ${country}
Sektör: ${sector}
Kanal: ${channel}
Kültürel ipucu: ${cultural?.tip||'Profesyonel ve doğal ol'}

KURALLAR:
- ${langNames[language]||'İngilizce'} dil, çok doğal ve profesyonel
- ${channel==='whatsapp'?'3-4 kısa cümle':'120-180 kelime'}
- Türk ihracatçı olduğunu doğal belirt
- Somut değer öner (kalite/fiyat/teslimat)
- ${channel==='email'?'"subject" alanını da doldur':'"subject" boş bırak'}
- ${companyName} şirketine özel hissettir, genel değil

JSON: {"subject":"...","body":"..."}` }]
    });
    const text = r.content[0]?.text?.trim();
    const match = text?.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { body: text||'' };
  } catch {
    return { body:`Dear ${companyName} team, we are ${senderCompany} from Turkey. We would like to discuss a potential business partnership in ${sector}.` };
  }
}

// ── ANA ARAMA MOTORU (5 Kaynak Paralel) ──────────────────────────────────────
async function runExportSearch(sessionId: string, userId: string, countryCode: string, sector: string, hsCodes: string[], hsCodeNames: string[], searchTerms: Record<string, string>, searchTermsLocal: string, country: any, senderCompany: string, senderProduct: string): Promise<void> {
  const isTempSession = sessionId.startsWith('temp-');
  async function updateSession(data: any) {
    if (isTempSession) return; // No DB record for temp sessions
    await supabase.from('export_search_sessions').update(data).eq('id', sessionId);
  }
  try {
    await updateSession({ status:'running', step:'market_data', progress:15 });

    // Parallel: market data + Google Maps + Web search
    const [marketIntel, mapsResults, webResults] = await Promise.allSettled([
      getMarketIntelligence(hsCodes, countryCode, country),
      searchGoogleMaps(sector, searchTermsLocal, country, searchTerms),
      searchWebImporters(searchTerms, country, sector),
    ]);

    await updateSession({ step:'merging_results', progress:55 });

    const maps = mapsResults.status==='fulfilled' ? mapsResults.value : [];
    const web  = webResults.status==='fulfilled'  ? webResults.value  : [];

    // Merge + deduplicate
    const seen = new Set<string>();
    const allImporters: any[] = [];
    for (const imp of [...maps, ...web]) {
      const key = imp.company_name.toLowerCase().substring(0,20);
      if (seen.has(key)) continue;
      seen.add(key);
      allImporters.push(imp);
    }

    await updateSession({ step:'enriching_contacts', progress:60 });

    // Step 1: Enrich ALL companies with contact info (parallel batches of 5)
    // Priority: companies with website (can be scraped/Hunter'd)
    const withWebsite = allImporters.filter(i => i.website);
    const withoutWebsite = allImporters.filter(i => !i.website);

    // Process in batches of 5 in parallel for speed
    const batchSize = 5;
    const enrichedAll: any[] = [];

    for (let i = 0; i < withWebsite.length; i += batchSize) {
      if (enrichedAll.filter(e => e.email || e.phone).length >= 50) break; // enough
      const batch = withWebsite.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(imp => enrichCompanyContact(imp)));
      for (const r of batchResults) {
        if (r.status === 'fulfilled') enrichedAll.push(r.value);
      }
      await updateSession({ step:'enriching_contacts', progress: Math.min(85, 60 + Math.round((i/withWebsite.length)*25)) });
    }
    // Add companies without website (already have any contact from content extraction)
    for (const imp of withoutWebsite) enrichedAll.push(imp);

    // Step 2: LinkedIn decision makers for top 10 WITH contacts
    const contactedLeads = enrichedAll.filter(e => e.email || e.phone).slice(0, 10);
    for (const lead of contactedLeads) {
      const li = await searchLinkedInDecisionMakers(sector, lead.company_name, country).catch(() => null);
      if (li) {
        lead.decision_maker_name = li.name || lead.decision_maker_name || null;
        lead.decision_maker_title = li.title || lead.decision_maker_title || null;
        lead.decision_maker_linkedin = li.linkedin || null;
      }
    }

    // Step 3: Sort by contact completeness
    const enriched = enrichedAll.sort((a, b) => {
      const scoreA = (a.email?2:0) + (a.phone?2:0) + (a.decision_maker_name?1:0);
      const scoreB = (b.email?2:0) + (b.phone?2:0) + (b.decision_maker_name?1:0);
      return scoreB - scoreA;
    });

    const withContact = enriched.filter(e => e.email || e.phone);
    const noContact = enriched.filter(e => !e.email && !e.phone);
    console.log(`[ExportSearch] Contact enrichment: ${withContact.length} with contact, ${noContact.length} without (${allImporters.length} found total)`);

    await updateSession({ step:'saving_results', progress:88 });

    // Company scoring (0-100) — email/phone are primary
    function calcCompanyScore(e: any): number {
      let score = 0;
      if (e.email) score += 35;         // Most valuable: email for outreach
      if (e.phone) score += 30;         // Very valuable: phone for WhatsApp/call
      if (e.decision_maker_name) score += 20; // Decision maker known
      if (e.website) score += 10;       // Has online presence
      if (e.verified_importer) score += 5;
      return score;
    }

    // Save to leads — with cross-search deduplication + error logging
    let savedCount = 0;
    if (enriched.length > 0) {
      // Build base lead object — only columns guaranteed to exist in schema
      const baseColumns = (e: any) => ({
        user_id: userId,
        company_name: e.company_name,
        phone: e.phone||null, email: e.email||null, website: e.website||null,
        city: (e.address?.split(',')?.[0]||country.name).substring(0,100),
        country: country.name,
        sector, status: 'new', source: 'export_search',
        notes: `${country.name} ihracat hedefi${e.verified_importer?' | ✅ Doğrulanmış':''}${e.decision_maker_name?` | 👤 ${e.decision_maker_name}${e.decision_maker_title?` (${e.decision_maker_title})`:''}`:''}`,
      });

      // Extended columns — added by autoMigrate (may not exist on first run)
      const extendedColumns = (e: any, score: number) => ({
        country_code: countryCode,
        hs_codes: hsCodes.length ? JSON.stringify(hsCodes) : null,
        verified_importer: e.verified_importer||false,
        decision_maker_name: e.decision_maker_name||null,
        decision_maker_title: e.decision_maker_title||null,
        decision_maker_linkedin: e.decision_maker_linkedin||null,
        company_score: score,
      });

      for (const e of enriched) {
        try {
          // Dedup check — use only base columns
          const { data: existing } = await supabase.from('leads')
            .select('id')
            .eq('user_id', userId)
            .eq('country', country.name)
            .ilike('company_name', `%${e.company_name.substring(0,25)}%`)
            .maybeSingle();
          if (existing) continue;

          const score = calcCompanyScore(e);

          // Try insert with all columns
          const { error: insertErr } = await supabase.from('leads').insert([{
            ...baseColumns(e), ...extendedColumns(e, score),
          }]);

          if (insertErr) {
            // Fallback: insert only guaranteed base columns
            console.log('[ExportSearch] Extended insert failed, using base columns:', insertErr.message);
            const { error: baseErr } = await supabase.from('leads').insert([baseColumns(e)]);
            if (baseErr) {
              console.error('[ExportSearch] Base insert also failed:', baseErr.message);
              continue;
            }
          }
          savedCount++;
        } catch (insertEx: any) {
          console.error('[ExportSearch] Lead save error:', insertEx.message);
        }
      }
    }

    const intel = marketIntel.status==='fulfilled' ? marketIntel.value : null;
    const risk = PAYMENT_RISK[countryCode] || { score:60, label:'Orta', dso:60, notes:'' };
    const cultural = CULTURAL_INTEL[countryCode] || null;

    await updateSession({
      status:'completed', progress:100, step:'done',
      result: JSON.stringify({
        importersFound: savedCount,
        sources: { maps: maps.length, web: web.length },
        marketIntel: intel ? { ...intel, hsCodes, hsCodeNames } : null,
        paymentRisk: risk,
        culturalIntel: cultural,
      }),
      completed_at: new Date().toISOString(),
    });

    const withContactSaved = enriched.filter(e => e.email || e.phone).length;
    console.log(`[ExportSearch] ✅ ${savedCount} saved | ${withContactSaved} with contact | ${maps.length} Maps + ${web.length} Web (${sector} / ${country.name})`);
  } catch(e:any) {
    console.error('[ExportSearch] error:', e.message);
    await updateSession({ status:'failed', step:e.message });
  }
}

// ── AUTO-MIGRATE ──────────────────────────────────────────────────────────────
async function runSQL(sql: string): Promise<void> {
  await axios.post(`${process.env.SUPABASE_URL}/rest/v1/sql`, sql, {
    headers:{ 'Content-Type':'text/plain','apikey':process.env.SUPABASE_SERVICE_KEY,'Authorization':`Bearer ${process.env.SUPABASE_SERVICE_KEY}`,'Prefer':'return=minimal' },
    timeout:20000,
  });
}

async function autoMigrateExport() {
  // Drop FK constraints via multiple methods
  const dropConstraintSQL = `
    ALTER TABLE IF EXISTS export_search_sessions DROP CONSTRAINT IF EXISTS "export_search_sessions_u_ser_id_fkey";
    ALTER TABLE IF EXISTS export_search_sessions DROP CONSTRAINT IF EXISTS "export_search_sessions_user_id_fkey";
    ALTER TABLE IF EXISTS export_search_sessions DROP CONSTRAINT IF EXISTS export_search_sessions_user_id_fkey;
    ALTER TABLE IF EXISTS export_messages DROP CONSTRAINT IF EXISTS "export_messages_user_id_fkey";
    ALTER TABLE IF EXISTS export_campaigns DROP CONSTRAINT IF EXISTS "export_campaigns_user_id_fkey";
  `;
  // Try REST API SQL endpoint
  try { await runSQL(dropConstraintSQL); } catch {}
  // Try Supabase Management API
  try {
    const projectRef = process.env.SUPABASE_URL?.match(/https?:\/\/([^.]+)\./)?.[1];
    if (projectRef) {
      await axios.post(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        query: dropConstraintSQL,
      }, {
        headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
    }
  } catch {}

  const migrations = [
    {
      table: 'export_search_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS export_search_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL,
          country_code TEXT, sector TEXT, status TEXT DEFAULT 'pending',
          step TEXT, progress INTEGER DEFAULT 0,
          result JSONB, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE export_search_sessions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "user_own_export_s" ON export_search_sessions;
        CREATE POLICY "user_own_export_s" ON export_search_sessions USING (true);
      `,
    },
    {
      table: 'export_messages',
      sql: `
        CREATE TABLE IF NOT EXISTS export_messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL,
          lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
          country_code TEXT, channel TEXT DEFAULT 'whatsapp',
          subject TEXT, body TEXT NOT NULL, language TEXT,
          status TEXT DEFAULT 'draft', sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE export_messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "user_own_export_m" ON export_messages;
        CREATE POLICY "user_own_export_m" ON export_messages USING (true);
        CREATE UNIQUE INDEX IF NOT EXISTS export_messages_unique_idx ON export_messages(user_id, lead_id, channel);
      `,
    },
    {
      table: 'export_campaigns',
      sql: `
        CREATE TABLE IF NOT EXISTS export_campaigns (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL, country_code TEXT, country_name TEXT,
          channel TEXT DEFAULT 'whatsapp', campaign_type TEXT DEFAULT 'outreach',
          lead_count INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0,
          lead_ids JSONB DEFAULT '[]', status TEXT DEFAULT 'draft',
          language TEXT, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE export_campaigns ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "user_own_export_c" ON export_campaigns;
        CREATE POLICY "user_own_export_c" ON export_campaigns USING (true);
      `,
    },
  ];

  // Always run leads column migrations (safe with IF NOT EXISTS)
  try {
    await runSQL(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS hs_codes TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_importer BOOLEAN DEFAULT false;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS country_code TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_maker_name TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_maker_title TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_maker_linkedin TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_score INTEGER DEFAULT 0;
    `);
  } catch {}

  for (const m of migrations) {
    try {
      const { error } = await supabase.from(m.table).select('id').limit(1);
      if (!error) continue; // Table exists
      await runSQL(m.sql);
      console.log(`[ExportMigrate] ✅ ${m.table} created`);
    } catch(e:any) { console.log(`[ExportMigrate] ${m.table} skipped:`, e.message); }
  }
}
autoMigrateExport();
setTimeout(autoMigrateExport, 3000);
setTimeout(autoMigrateExport, 15000); // Extra retry

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

router.get('/countries', (_req: any, res: any) => {
  res.json({ countries: COUNTRIES.map(c => ({ ...c, paymentRisk: PAYMENT_RISK[c.code]||{ score:60,label:'Orta',dso:60,notes:'' }, hasCulturalIntel: !!CULTURAL_INTEL[c.code] })) });
});

router.post('/start-search', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { countryCode, sector, preferredLang } = req.body;
    if (!countryCode||!sector) return res.status(400).json({ error:'countryCode ve sector zorunlu' });
    const country = COUNTRIES.find(c=>c.code===countryCode);
    if (!country) return res.status(400).json({ error:'Gecersiz ulke kodu' });

    // Override country language if user selected a specific search language
    if (preferredLang && preferredLang !== country.language) {
      (country as any).language = preferredLang;
      (country as any).lang = preferredLang;
    }

    const { data:profile } = await supabase.from('business_profiles').select('*').eq('user_id',userId).maybeSingle();
    const { data:userRow } = await supabase.from('users').select('company').eq('id',userId).single();
    const senderCompany = (typeof profile?.company==='string'?profile.company:profile?.company?.name) || userRow?.company || 'Türk İhracatçı';
    const senderProduct = (typeof profile?.product==='string'?profile.product:profile?.product?.description) || sector;

    const { codes:hsCodes, names:hsCodeNames, searchTerms, searchTermsLocal } = await mapSectorToHSCodes(sector);

    // Create session — multiple fallback strategies
    let sessionId = `temp-${Date.now()}`;
    try {
      // Try with user_id FK
      const { data: session, error: sessErr } = await supabase.from('export_search_sessions').insert([{
        user_id: userId, country_code: countryCode, sector, status: 'running', step: 'starting', progress: 5,
      }]).select().single();
      if (!sessErr && session?.id) {
        sessionId = session.id;
      } else if (sessErr?.message?.includes('constraint') || sessErr?.message?.includes('foreign')) {
        // FK constraint fail — try without user_id FK (use text field)
        const { data: s2, error: e2 } = await supabase.from('export_search_sessions').insert([{
          country_code: countryCode, sector, status: 'running', step: 'starting', progress: 5,
        }]).select().single();
        if (!e2 && s2?.id) sessionId = s2.id;
        else console.log('[ExportSearch] Session insert failed:', (e2 || sessErr)?.message?.slice(0, 80));
      }
    } catch (sessEx: any) { console.log('[ExportSearch] Session exception:', sessEx.message?.slice(0, 60)); }

    res.json({
      ok:true, sessionId, hsCodes, hsCodeNames,
      message:`${country.flag} ${country.name}'de "${sector}" aranıyor...`,
    });

    runExportSearch(sessionId, userId, countryCode, sector, hsCodes, hsCodeNames, searchTerms, searchTermsLocal, country, senderCompany, senderProduct);
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.get('/search-session/:id/status', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('export_search_sessions').select('*').eq('id',req.params.id).eq('user_id',req.userId).single();
    if (!data) return res.status(404).json({ error:'Oturum bulunamadı' });
    const result = data.result ? (typeof data.result==='string'?JSON.parse(data.result):data.result) : null;
    res.json({ status:data.status, step:data.step, progress:data.progress, importersFound:result?.importersFound||0, sources:result?.sources||null, marketIntel:result?.marketIntel||null, paymentRisk:result?.paymentRisk||null, culturalIntel:result?.culturalIntel||null });
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.get('/market-intel/:countryCode', async (req: any, res: any) => {
  const country = COUNTRIES.find(c=>c.code===req.params.countryCode);
  if (!country) return res.status(404).json({ error:'Ülke bulunamadı' });
  let totalExportsUSD = 0;
  try {
    const r = await axios.get('https://comtrade.un.org/api/get', { params:{ r:'792', p:country.comtradeCode, ps:2023, px:'HS', cc:'TOTAL', type:'C', freq:'A', fmt:'json', max:1 }, timeout:10000 });
    totalExportsUSD = r.data?.dataset?.[0]?.TradeValue||0;
  } catch {}
  res.json({ country:{ ...country, paymentRisk:PAYMENT_RISK[req.params.countryCode]||null, culturalIntel:CULTURAL_INTEL[req.params.countryCode]||null, totalExportsUSD } });
});

router.post('/generate-message', async (req: any, res: any) => {
  try {
    const { leadId, channel='whatsapp' } = req.body;
    const { data:lead } = await supabase.from('leads').select('*').eq('id',leadId).eq('user_id',req.userId).single();
    if (!lead) return res.status(404).json({ error:'Lead bulunamadı' });
    const country = COUNTRIES.find(c=>c.code===(lead.country_code||'DE'))||COUNTRIES[0];
    const { data:profile } = await supabase.from('business_profiles').select('*').eq('user_id',req.userId).maybeSingle();
    const { data:userRow } = await supabase.from('users').select('company').eq('id',req.userId).single();
    const senderCompany = (typeof profile?.company==='string'?profile.company:profile?.company?.name)||userRow?.company||'Şirketimiz';
    const senderProduct = (typeof profile?.product==='string'?profile.product:profile?.product?.description)||lead.sector||'';
    const hsCodes = (() => { try { return lead.hs_codes ? (typeof lead.hs_codes === 'string' ? JSON.parse(lead.hs_codes) : lead.hs_codes) : [] } catch { return [] } })();
    const message = await generateOutreachMessage({ companyName:lead.company_name, country:country.name, language:country.language, sector:lead.sector||'', senderCompany, senderProduct, channel, hsCodes });
    const msgData = { user_id:req.userId, lead_id:leadId, country_code:country.code, channel, subject:message.subject||null, body:message.body, language:country.language, status:'draft' };
    // Try upsert first, fall back to insert if unique constraint missing
    const { error: upsertErr } = await supabase.from('export_messages').upsert([msgData], { onConflict:'user_id,lead_id,channel' });
    if (upsertErr) await supabase.from('export_messages').insert([msgData]).select();
    res.json({ ok:true, message, lead:lead.company_name, country:country.name, language:country.language });
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.get('/messages', async (req: any, res: any) => {
  try {
    const { countryCode, channel } = req.query;
    let query = supabase.from('export_messages').select('*, leads(company_name,country,sector,phone,website)').eq('user_id',req.userId).order('created_at',{ ascending:false }).limit(100);
    if (countryCode) query = query.eq('country_code', countryCode);
    if (channel) query = query.eq('channel', channel);
    const { data } = await query;
    res.json({ messages:data||[] });
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.post('/bulk-messages', async (req: any, res: any) => {
  try {
    const { countryCode, leadIds, channel='whatsapp' } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error:'leadIds zorunlu' });
    const country = COUNTRIES.find(c=>c.code===countryCode);
    if (!country) return res.status(400).json({ error:'Geçersiz ülke' });
    const { data:profile } = await supabase.from('business_profiles').select('*').eq('user_id',req.userId).maybeSingle();
    const { data:userRow } = await supabase.from('users').select('company').eq('id',req.userId).single();
    const senderCompany = (typeof profile?.company==='string'?profile.company:profile?.company?.name)||userRow?.company||'Şirketimiz';
    const senderProduct = (typeof profile?.product==='string'?profile.product:profile?.product?.description)||'';
    res.json({ ok:true, message:`${leadIds.length} lead için mesajlar oluşturuluyor...` });
    (async () => {
      for (const leadId of leadIds) {
        try {
          const { data:lead } = await supabase.from('leads').select('*').eq('id',leadId).eq('user_id',req.userId).single();
          if (!lead) continue;
          const hsCodes = (() => { try { return lead.hs_codes ? (typeof lead.hs_codes === 'string' ? JSON.parse(lead.hs_codes) : lead.hs_codes) : [] } catch { return [] } })();
          const msg = await generateOutreachMessage({ companyName:lead.company_name, country:country.name, language:country.language, sector:lead.sector||'', senderCompany, senderProduct, channel, hsCodes });
          const bmData = { user_id:req.userId, lead_id:leadId, country_code:countryCode, channel, subject:msg.subject||null, body:msg.body, language:country.language, status:'draft' };
          const { error: bmErr } = await supabase.from('export_messages').upsert([bmData], { onConflict:'user_id,lead_id,channel' });
          if (bmErr) await supabase.from('export_messages').insert([bmData]).select();
          await sleep(400);
        } catch(e:any) { console.error('bulk msg error:', e.message); }
      }
    })();
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.post('/create-campaign', async (req: any, res: any) => {
  try {
    const { name, countryCode, leadIds, channel, campaignType } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error:'Lead seçin' });
    const country = COUNTRIES.find(c=>c.code===countryCode);
    const { data:campaign, error } = await supabase.from('export_campaigns').insert([{ user_id:req.userId, name:name||`${country?.flag} ${country?.name} ${channel?.toUpperCase()} Kampanyası`, country_code:countryCode, country_name:country?.name, channel, campaign_type:campaignType||'outreach', lead_count:leadIds.length, lead_ids:leadIds, status:'draft', language:country?.language }]).select().single();
    if (error) throw error;
    res.json({ ok:true, campaign, message:`${leadIds.length} lead için ${country?.name} kampanyası oluşturuldu` });
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.post('/campaigns/:id/send', async (req: any, res: any) => {
  try {
    const { data:camp } = await supabase.from('export_campaigns').select('*').eq('id',req.params.id).eq('user_id',req.userId).single();
    if (!camp) return res.status(404).json({ error:'Kampanya bulunamadı' });
    if (camp.status==='running') return res.status(400).json({ error:'Kampanya zaten çalışıyor' });
    await supabase.from('export_campaigns').update({ status:'running', started_at:new Date().toISOString() }).eq('id',req.params.id);
    res.json({ ok:true, message:`${camp.lead_count} lead için kampanya başlatıldı` });
    (async () => {
      try {
        const { sendWhatsAppMessage } = require('./settings');
        const leadIds: string[] = camp.lead_ids||[];
        let sent = 0, failed = 0;
        for (const leadId of leadIds) {
          try {
            const { data:lead } = await supabase.from('leads').select('*').eq('id',leadId).single();
            if (!lead?.phone) continue;
            const { data:existingMsg } = await supabase.from('export_messages').select('body').eq('lead_id',leadId).eq('channel',camp.channel).eq('user_id',req.userId).maybeSingle();
            if (!existingMsg?.body) continue;
            if (camp.channel==='whatsapp') {
              let sendOk = false;
              for (let retry = 0; retry < 2; retry++) {
                try {
                  await sendWhatsAppMessage(req.userId, lead.phone, existingMsg.body);
                  sendOk = true; break;
                } catch (retryErr: any) {
                  if (retry === 0) { await sleep(3000); continue; }
                  console.error('[ExportCampaign] Send failed after retry:', retryErr.message?.slice(0, 60));
                }
              }
              if (sendOk) {
                await supabase.from('messages').insert([{ user_id:req.userId, lead_id:leadId, direction:'out', content:existingMsg.body, channel:'whatsapp', sent_at:new Date().toISOString(), metadata:JSON.stringify({ type:'export_campaign', campaign_id:camp.id }) }]);
                await supabase.from('export_messages').update({ status:'sent', sent_at:new Date().toISOString() }).eq('lead_id',leadId).eq('user_id',req.userId);
                sent++;
              } else {
                failed++;
              }
            }
            // Update progress mid-campaign
            await supabase.from('export_campaigns').update({ sent_count: sent }).eq('id', req.params.id);
            await sleep(8000 + Math.random() * 4000);
          } catch(e:any) { failed++; console.error('[ExportCampaign] Send error:', e.message?.slice(0, 60)); }
        }
        const finalStatus = sent > 0 ? (failed > sent ? 'failed' : 'completed') : 'failed';
        await supabase.from('export_campaigns').update({ status: finalStatus, sent_count: sent, completed_at: new Date().toISOString() }).eq('id', req.params.id);
      } catch(e:any) {
        await supabase.from('export_campaigns').update({ status:'failed' }).eq('id',req.params.id);
      }
    })();
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('export_campaigns').select('*').eq('user_id',req.userId).order('created_at',{ ascending:false });
    res.json({ campaigns:data||[] });
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.get('/export-leads', async (req: any, res: any) => {
  try {
    const { countryCode, limit=100 } = req.query;
    let query = supabase.from('leads').select('*').eq('user_id',req.userId).eq('source','export_search').order('created_at',{ ascending:false }).limit(Number(limit));
    if (countryCode) query = query.eq('country_code', countryCode);
    const { data } = await query;
    res.json({ leads:data||[] });
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.get('/analytics', async (req: any, res: any) => {
  try {
    const { data:leads } = await supabase.from('leads').select('country,country_code,status,sector').eq('user_id',req.userId).eq('source','export_search');
    const { data:campaigns } = await supabase.from('export_campaigns').select('country_code,status,lead_count,sent_count').eq('user_id',req.userId);
    const { data:msgs } = await supabase.from('export_messages').select('country_code,status,channel').eq('user_id',req.userId);
    const byCountry: Record<string,any> = {};
    (leads||[]).forEach((l:any) => {
      if (!byCountry[l.country]) byCountry[l.country] = { leads:0, converted:0, country_code:l.country_code };
      byCountry[l.country].leads++;
      if (l.status==='won') byCountry[l.country].converted++;
    });
    res.json({ totalLeads:leads?.length||0, totalCampaigns:campaigns?.length||0, totalMessages:msgs?.length||0, sentMessages:msgs?.filter((m:any)=>m.status==='sent').length||0, byCountry:Object.entries(byCountry).map(([c,v]:any)=>({ country:c, country_code:v.country_code, leads:v.leads, converted:v.converted, convRate:v.leads>0?Math.round((v.converted/v.leads)*100):0 })).sort((a,b)=>b.leads-a.leads).slice(0,8) });
  } catch(e:any) { res.status(500).json({ error:e.message }); }
});

router.get('/markets', (_req:any,res:any) => res.json({ countries:COUNTRIES }));

module.exports = router;
