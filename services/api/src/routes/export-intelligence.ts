export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── ÜLKE VERİTABANI ──────────────────────────────────────────────────────────
const COUNTRIES = [
  { code:'DE', name:'Almanya',           flag:'🇩🇪', language:'de', currency:'EUR', region:'Avrupa',    comtradeCode:'276' },
  { code:'GB', name:'İngiltere',         flag:'🇬🇧', language:'en', currency:'GBP', region:'Avrupa',    comtradeCode:'826' },
  { code:'FR', name:'Fransa',            flag:'🇫🇷', language:'fr', currency:'EUR', region:'Avrupa',    comtradeCode:'251' },
  { code:'NL', name:'Hollanda',          flag:'🇳🇱', language:'nl', currency:'EUR', region:'Avrupa',    comtradeCode:'528' },
  { code:'BE', name:'Belçika',           flag:'🇧🇪', language:'fr', currency:'EUR', region:'Avrupa',    comtradeCode:'56'  },
  { code:'IT', name:'İtalya',            flag:'🇮🇹', language:'it', currency:'EUR', region:'Avrupa',    comtradeCode:'381' },
  { code:'ES', name:'İspanya',           flag:'🇪🇸', language:'es', currency:'EUR', region:'Avrupa',    comtradeCode:'724' },
  { code:'PL', name:'Polonya',           flag:'🇵🇱', language:'pl', currency:'PLN', region:'Avrupa',    comtradeCode:'616' },
  { code:'US', name:'ABD',               flag:'🇺🇸', language:'en', currency:'USD', region:'Amerika',   comtradeCode:'842' },
  { code:'CA', name:'Kanada',            flag:'🇨🇦', language:'en', currency:'CAD', region:'Amerika',   comtradeCode:'124' },
  { code:'AE', name:'BAE',               flag:'🇦🇪', language:'ar', currency:'AED', region:'Körfez',    comtradeCode:'784' },
  { code:'SA', name:'Suudi Arabistan',   flag:'🇸🇦', language:'ar', currency:'SAR', region:'Körfez',    comtradeCode:'682' },
  { code:'QA', name:'Katar',             flag:'🇶🇦', language:'ar', currency:'QAR', region:'Körfez',    comtradeCode:'634' },
  { code:'KW', name:'Kuveyt',            flag:'🇰🇼', language:'ar', currency:'KWD', region:'Körfez',    comtradeCode:'414' },
  { code:'EG', name:'Mısır',             flag:'🇪🇬', language:'ar', currency:'EGP', region:'Afrika',    comtradeCode:'818' },
  { code:'MA', name:'Fas',               flag:'🇲🇦', language:'fr', currency:'MAD', region:'Afrika',    comtradeCode:'504' },
  { code:'KZ', name:'Kazakistan',        flag:'🇰🇿', language:'ru', currency:'KZT', region:'Orta Asya', comtradeCode:'398' },
  { code:'AZ', name:'Azerbaycan',        flag:'🇦🇿', language:'az', currency:'AZN', region:'Orta Asya', comtradeCode:'31'  },
  { code:'UZ', name:'Özbekistan',        flag:'🇺🇿', language:'uz', currency:'UZS', region:'Orta Asya', comtradeCode:'860' },
  { code:'RU', name:'Rusya',             flag:'🇷🇺', language:'ru', currency:'RUB', region:'Orta Asya', comtradeCode:'643' },
  { code:'CN', name:'Çin',               flag:'🇨🇳', language:'zh', currency:'CNY', region:'Asya',      comtradeCode:'156' },
  { code:'JP', name:'Japonya',           flag:'🇯🇵', language:'ja', currency:'JPY', region:'Asya',      comtradeCode:'392' },
  { code:'IN', name:'Hindistan',         flag:'🇮🇳', language:'en', currency:'INR', region:'Asya',      comtradeCode:'356' },
];

// ── ÖDEME RİSK VERİTABANI (Coface/OECD bazlı) ────────────────────────────────
const PAYMENT_RISK: Record<string, { score: number; label: string; dso: number; notes: string }> = {
  'DE': { score:95, label:'Çok Düşük',    dso:30, notes:'Güçlü hukuki sistem, düzenli ödeme kültürü' },
  'GB': { score:90, label:'Çok Düşük',    dso:35, notes:'Köklü ticaret hukuku, güvenilir bankacılık' },
  'FR': { score:85, label:'Düşük',        dso:45, notes:'LC veya banka garantisi önerilebilir' },
  'NL': { score:92, label:'Çok Düşük',    dso:30, notes:'Hollanda finans merkezi, çok güvenilir' },
  'BE': { score:88, label:'Düşük',        dso:35, notes:'AB finans sistemi, güvenilir' },
  'IT': { score:72, label:'Orta',         dso:60, notes:'Geç ödeme yaygın, LC tavsiye edilir' },
  'ES': { score:78, label:'Orta',         dso:50, notes:'Ekonomik dalgalanma riski var' },
  'PL': { score:80, label:'Düşük',        dso:40, notes:'AB üyesi, gelişen ekonomi' },
  'US': { score:91, label:'Çok Düşük',    dso:30, notes:'Güçlü hukuki sistem, wire transfer yaygın' },
  'CA': { score:90, label:'Çok Düşük',    dso:30, notes:'ABD ile aynı düzey güvenilirlik' },
  'AE': { score:82, label:'Düşük',        dso:30, notes:'LC yaygın, bankacılık sistemi güçlü' },
  'SA': { score:75, label:'Orta',         dso:45, notes:'LC veya avans önerilebilir' },
  'QA': { score:80, label:'Düşük',        dso:35, notes:'Petrol geliri yüksek, güvenilir' },
  'KW': { score:78, label:'Orta',         dso:40, notes:'LC ile çalışmak güvenli' },
  'EG': { score:42, label:'Yüksek',       dso:90, notes:'Döviz kısıtlaması var, akreditif şart' },
  'MA': { score:55, label:'Orta-Yüksek',  dso:60, notes:'MAD transferi kısıtlı, EUR tercih edilmeli' },
  'KZ': { score:50, label:'Orta-Yüksek',  dso:60, notes:'Banka garantisi alın' },
  'AZ': { score:62, label:'Orta',         dso:45, notes:'EUR veya USD ile çalışın' },
  'UZ': { score:45, label:'Yüksek',       dso:75, notes:'Avans veya LC zorunlu' },
  'RU': { score:25, label:'Çok Yüksek',   dso:120, notes:'Yaptırım riski kritik, dikkatli değerlendirin' },
  'CN': { score:65, label:'Orta',         dso:60, notes:'Büyük alıcılar güvenilir, küçükler dikkat' },
  'JP': { score:93, label:'Çok Düşük',    dso:30, notes:'En güvenilir pazarlardan biri' },
  'IN': { score:55, label:'Orta-Yüksek',  dso:75, notes:'LC ile çalışın, avans alın' },
};

// ── KÜLTÜREL ZEKA VERİTABANI ──────────────────────────────────────────────────
const CULTURAL_INTEL: Record<string, { greeting: string; taboo: string; timing: string; tip: string }> = {
  'DE': { greeting:'Herr/Frau kullanın, Dr. varsa mutlaka yazın', taboo:'İlk emailde fiyat sormayın', timing:'09:00-17:00, Cuma 15:00\'de biter', tip:'Teknik detaylar ve sertifikalar çok önemli' },
  'GB': { greeting:'Mr/Ms kullanın, informal geçiş hızlı olur', taboo:'Fazla resmi olmayın', timing:'09:00-17:30, pazar tatil', tip:'Mizah kabul görür, güven yavaş kurulur' },
  'FR': { greeting:'Monsieur/Madame, Fransızca deneyin', taboo:'Fransız rakiplerini eleştirmeyin', timing:'12:00-14:00 öğle paydosu kutsal', tip:'Fransızca email iyi izlenim bırakır' },
  'AE': { greeting:'Sheikh/Sahibi gibi unvanlar önemli', taboo:'Ramazan\'da gündüz gıda/içecek görseli göndermeyin', timing:'Cuma ve Cumartesi hafta sonu', tip:'Kişisel ilişki kurulmadan iş yapılmaz' },
  'SA': { greeting:'Erkek-kadın karışık toplantıdan kaçının', taboo:'Alkol veya domuz eti ürünleri', timing:'Perşembe-Cuma hafta sonu', tip:'İlişki kurma süreci uzun, sabırlı olun' },
  'JP': { greeting:'San ekleyin: Tanaka-san, kartvizite saygıyla bakın', taboo:'Direkt "hayır" demeyin', timing:'09:00-18:00, mesai sonrası da müzakere', tip:'İlk toplantı karar toplantısı değildir' },
  'CN': { greeting:'Şirket unvanı önce, isim sonra', taboo:'Tayvan, Tibet, Tiananmen konuşmayın', timing:'08:00-17:30, öğle siesta var', tip:'WeChat üzerinden iletişim WhatsApp\'tan etkili' },
  'RU': { greeting:'Bayan/Bay + soyisim resmi', taboo:'Rusya\'nın politikasını eleştirmeyin', timing:'09:00-18:00, yaz aylarında yavaşlar', tip:'Güçlü görünün, uzun vadeli düşünün' },
  'IN': { greeting:'Sir/Madam yaygın', taboo:'Sığırla ilgili her şey', timing:'09:30-18:30, öğle uzun', tip:'Fiyat pazarlığı beklenir, ilk teklifin %20 üzerinde başlayın' },
};

// ── 1. HS KOD EŞLEŞTİRİCİ (Claude AI) ───────────────────────────────────────
async function mapSectorToHSCodes(sector: string): Promise<{ codes: string[]; names: string[]; searchTerms: Record<string, string> }> {
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `"${sector}" sektörü için HS kodlarını belirle. JSON döndür:
{
  "codes": ["9401", "9403"],
  "names": ["Oturma mobilyası", "Diğer mobilya"],
  "searchTerms": {
    "en": "furniture importer distributor",
    "de": "Möbel Importeur Großhandel",
    "fr": "importateur mobilier grossiste",
    "ar": "مستورد أثاث",
    "ru": "импортер мебели",
    "zh": "家具进口商",
    "ja": "家具インポーター"
  }
}
Max 4 HS kodu, en ilgili olanlar. SADECE JSON.`
      }]
    });
    const text = resp.content[0]?.text?.trim().replace(/```json|```/g, '') || '{}';
    const parsed = JSON.parse(text);
    return {
      codes: parsed.codes || [],
      names: parsed.names || [],
      searchTerms: parsed.searchTerms || {},
    };
  } catch {
    return { codes: [], names: [], searchTerms: { en: `${sector} importer` } };
  }
}

// ── 2. UN COMTRADE PAZAR İSTATİSTİKLERİ ──────────────────────────────────────
async function getMarketIntelligence(hsCodes: string[], countryCode: string, country: any): Promise<{
  marketSizeUSD: number; turkeyExportsUSD: number; turkeySharePct: number;
  avgUnitPriceUSD: number; topSuppliers: string[]; yoyGrowthPct: number; year: number;
}> {
  const empty = { marketSizeUSD:0, turkeyExportsUSD:0, turkeySharePct:0, avgUnitPriceUSD:0, topSuppliers:[], yoyGrowthPct:0, year:2023 };
  if (!hsCodes.length || !country.comtradeCode) return empty;

  try {
    const hs = hsCodes[0]; // Primary HS code
    const year = 2023;
    const TURKEY = '792';
    const targetCode = country.comtradeCode;

    // Turkey's exports to target country (reporter=TR, partner=target)
    const trResp = await axios.get('https://comtrade.un.org/api/get', {
      params: { r: TURKEY, p: targetCode, ps: year, px: 'HS', cc: hs, type: 'C', freq: 'A', fmt: 'json', max: 1 },
      timeout: 12000,
    });
    const trData = trResp.data?.dataset?.[0];
    const turkeyExportsUSD = trData?.TradeValue || 0;

    // Target country's total imports (reporter=target, partner=ALL)
    const mktResp = await axios.get('https://comtrade.un.org/api/get', {
      params: { r: targetCode, p: 0, ps: year, px: 'HS', cc: hs, type: 'C', freq: 'A', fmt: 'json', max: 1 },
      timeout: 12000,
    });
    const mktData = mktResp.data?.dataset?.[0];
    const marketSizeUSD = mktData?.TradeValue || 0;
    const netWeight = mktData?.NetWeight || 0;
    const avgUnitPriceUSD = netWeight > 0 ? Math.round(marketSizeUSD / netWeight) : 0;

    const turkeySharePct = marketSizeUSD > 0 ? parseFloat(((turkeyExportsUSD / marketSizeUSD) * 100).toFixed(1)) : 0;

    // Previous year for YoY growth (rough estimate using Turkey data)
    const prevResp = await axios.get('https://comtrade.un.org/api/get', {
      params: { r: TURKEY, p: targetCode, ps: year - 1, px: 'HS', cc: hs, type: 'C', freq: 'A', fmt: 'json', max: 1 },
      timeout: 10000,
    });
    const prevVal = prevResp.data?.dataset?.[0]?.TradeValue || 0;
    const yoyGrowthPct = prevVal > 0 ? parseFloat((((turkeyExportsUSD - prevVal) / prevVal) * 100).toFixed(1)) : 0;

    return { marketSizeUSD, turkeyExportsUSD, turkeySharePct, avgUnitPriceUSD, topSuppliers:[], yoyGrowthPct, year };
  } catch (e: any) {
    console.log('[Comtrade] error:', e.message);
    return empty;
  }
}

// ── 3. EXA.AI İTHALATÇI ARAMA ────────────────────────────────────────────────
async function findImportersExa(searchTerms: Record<string, string>, country: any, sector: string): Promise<any[]> {
  const EXA_API_KEY = process.env.EXA_API_KEY;
  if (!EXA_API_KEY) return [];

  const lang = country.language;
  const localTerm = searchTerms[lang] || searchTerms['en'] || `${sector} importer`;
  const results: any[] = [];

  const importerDomains: Record<string, string[]> = {
    'DE': ['wer-liefert-was.de','europages.de','kompass.com','gelbeseiten.de'],
    'GB': ['europages.co.uk','kompass.com','companieshouse.gov.uk'],
    'FR': ['europages.fr','kompass.fr','societe.com'],
    'NL': ['europages.nl','kompass.nl','kvk.nl'],
    'US': ['thomasnet.com','manta.com','kompass.com'],
    'AE': ['yellowpages.ae','kompass.com','europages.com'],
    'SA': ['kompass.com','tradekey.com'],
    'QA': ['kompass.com','tradekey.com'],
    'JP': ['kompass.com','jpbiz.net'],
    'CN': ['kompass.com','1688.com'],
    'IN': ['indiamart.com','kompass.com','tradeindia.com'],
  };

  const queries = [
    `${localTerm} ${country.name} wholesale importer distributor`,
    `${searchTerms['en'] || sector} import ${country.name} B2B contact`,
  ];

  for (const q of queries) {
    try {
      const res = await axios.post('https://api.exa.ai/search', {
        query: q,
        numResults: 8,
        useAutoprompt: true,
        includeDomains: ['europages.com', 'kompass.com', 'thomasnet.com', ...(importerDomains[country.code] || [])],
        startPublishedDate: '2022-01-01',
        contents: { text: { maxCharacters: 500 } },
      }, { headers: { 'x-api-key': EXA_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 });

      for (const r of (res.data?.results || [])) {
        if (!r.title || r.title.length < 5) continue;
        const combined = (r.title + ' ' + (r.text || '')).toLowerCase();
        const isImporter = combined.match(/import|distribut|wholesale|supplier|buy|purchas|trading|handel|grossist|importeur|importateur|importador/i);
        const isManufacturer = combined.match(/manufactur|produc|fabrik|herstell|fabricant|fabricante/i);
        if (!isImporter || isManufacturer) continue; // Skip manufacturers

        results.push({
          company_name: r.title.split('|')[0].split('-')[0].trim().substring(0, 100),
          website: r.url || '',
          description: (r.text || '').substring(0, 300),
          country: country.name, country_code: country.code,
          sector,
          source: 'exa_importer',
          verified_importer: true, // Found via importer-specific search
        });
        if (results.length >= 12) break;
      }
      await sleep(300);
    } catch (e: any) { console.log(`[Exa] error:`, e.message); }
    if (results.length >= 12) break;
  }
  return results;
}

// ── 4. TAVILY ŞİRKET ARAŞTIRMASI ─────────────────────────────────────────────
async function researchCompanyTavily(companyName: string, country: string): Promise<{ phone?: string; email?: string; size?: string; verified: boolean }> {
  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_KEY) return { verified: false };
  try {
    const res = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_KEY,
      query: `${companyName} ${country} importer contact phone email`,
      search_depth: 'basic', max_results: 3,
    }, { timeout: 10000 });
    const content = (res.data?.results || []).map((r: any) => r.content || '').join(' ');
    const phone = content.match(/\+?[\d\s\-()]{8,18}/)?.[0]?.trim();
    const email = content.match(/[\w.-]+@[\w.-]+\.\w{2,}/i)?.[0];
    return { phone, email, verified: !!(phone || email) };
  } catch { return { verified: false }; }
}

// ── 5. OUTREACH MESAJI ÜRET ───────────────────────────────────────────────────
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
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `${langNames[language] || 'İngilizce'} dilinde ${channel} outreach mesajı yaz.

Gönderen: ${senderCompany} (Türk üretici/ihracatçı)
Ürün: ${senderProduct}${hsCodes?.length ? ` (HS: ${hsCodes.join(', ')})` : ''}
Alıcı: ${companyName} — ${country}
Sektör: ${sector}
Kanal: ${channel}
Kültürel not: ${cultural?.tip || 'Profesyonel ol'}

KURALLAR:
- ${langNames[language] || 'İngilizce'} dil, çok doğal ve profesyonel
- ${channel === 'whatsapp' ? '3-4 kısa cümle maksimum' : '120-180 kelime'}
- Türk ihracatçı olduğunu doğal belirt
- Somut değer öneri (kalite/fiyat/teslimat)
- ${channel === 'email' ? '"subject" alanını da doldur' : '"subject" boş bırak'}
- Sahte veya genel değil, ${companyName} şirketine özel hissettir

JSON döndür: {"subject": "...", "body": "..."}`
      }]
    });
    const text = r.content[0]?.text?.trim();
    const match = text?.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { body: text || '' };
  } catch {
    return { body: `Dear ${companyName} team, we are ${senderCompany} from Turkey. We would like to discuss a potential business partnership in ${sector}.` };
  }
}

// ── 6. ARAMA OTURUMU (Polling tabanlı) ───────────────────────────────────────
async function runExportSearch(sessionId: string, userId: string, countryCode: string, sector: string, hsCodes: string[], hsCCodeNames: string[], searchTerms: Record<string, string>, country: any, senderCompany: string, senderProduct: string): Promise<void> {
  try {
    await supabase.from('export_search_sessions').update({ status: 'running', step: 'hs_codes', progress: 10 }).eq('id', sessionId);

    // Step 2: Market Intelligence (UN Comtrade)
    await supabase.from('export_search_sessions').update({ step: 'market_data', progress: 25 }).eq('id', sessionId);
    const marketIntel = await getMarketIntelligence(hsCodes, countryCode, country);

    const risk = PAYMENT_RISK[countryCode] || { score: 60, label: 'Orta', dso: 60, notes: '' };
    const cultural = CULTURAL_INTEL[countryCode] || null;

    // Step 3: Find Importers (Exa.ai)
    await supabase.from('export_search_sessions').update({ step: 'finding_importers', progress: 45 }).eq('id', sessionId);
    const importers = await findImportersExa(searchTerms, country, sector);

    // Step 4: Research companies (Tavily) — top 5
    await supabase.from('export_search_sessions').update({ step: 'researching_companies', progress: 65 }).eq('id', sessionId);
    const enriched: any[] = [];
    for (const imp of importers.slice(0, 8)) {
      const details = await researchCompanyTavily(imp.company_name, country.name);
      enriched.push({ ...imp, phone: details.phone || null, email: details.email || null, research_verified: details.verified });
      await sleep(200);
    }

    // Step 5: Save to leads + session result
    await supabase.from('export_search_sessions').update({ step: 'saving_results', progress: 85 }).eq('id', sessionId);

    if (enriched.length > 0) {
      const toInsert = enriched.map(e => ({
        user_id: userId,
        company_name: e.company_name,
        phone: e.phone || null,
        email: e.email || null,
        website: e.website || null,
        city: country.name,
        country: country.name,
        country_code: countryCode,
        sector,
        status: 'new',
        source: 'export_search',
        notes: `${country.flag} ${country.name} ihracat hedefi | HS: ${hsCodes.join(', ')} | ${e.verified_importer ? '✅ Doğrulanmış İthalatçı' : ''}`,
        hs_codes: JSON.stringify(hsCodes),
        verified_importer: e.verified_importer || false,
      }));
      await supabase.from('leads').insert(toInsert).select();
    }

    // Save market intel to session
    await supabase.from('export_search_sessions').update({
      status: 'completed', progress: 100, step: 'done',
      result: JSON.stringify({
        importersFound: enriched.length,
        marketIntel: { ...marketIntel, hsCodes, hsCodeNames: hsCCodeNames },
        paymentRisk: risk,
        culturalIntel: cultural,
      }),
      completed_at: new Date().toISOString(),
    }).eq('id', sessionId);

    console.log(`[ExportSearch] Session ${sessionId} done: ${enriched.length} importers found for ${sector} in ${country.name}`);
  } catch (e: any) {
    console.error('[ExportSearch] error:', e.message);
    await supabase.from('export_search_sessions').update({ status: 'failed', step: e.message }).eq('id', sessionId);
  }
}

// ── AUTO-MIGRATE export_search_sessions ──────────────────────────────────────
async function autoMigrateExport() {
  try {
    const { error } = await supabase.from('export_search_sessions').select('id').limit(1);
    if (!error) return;
    const sql = `
      CREATE TABLE IF NOT EXISTS export_search_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        country_code TEXT, sector TEXT, status TEXT DEFAULT 'pending',
        step TEXT, progress INTEGER DEFAULT 0,
        result JSONB, completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE export_search_sessions ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "user_own_export" ON export_search_sessions;
      CREATE POLICY "user_own_export" ON export_search_sessions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS hs_codes TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_importer BOOLEAN DEFAULT false;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS country_code TEXT;
    `;
    await axios.post(`${process.env.SUPABASE_URL}/rest/v1/sql`, sql, {
      headers: { 'Content-Type':'text/plain', 'apikey':process.env.SUPABASE_SERVICE_KEY, 'Authorization':`Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Prefer':'return=minimal' },
      timeout: 20000,
    });
    console.log('[ExportMigrate] Tables created');
  } catch (e: any) { console.log('[ExportMigrate] skipped:', e.message); }
}
autoMigrateExport();
setTimeout(autoMigrateExport, 5000);

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/export/countries
router.get('/countries', (_req: any, res: any) => {
  const enriched = COUNTRIES.map(c => ({
    ...c,
    paymentRisk: PAYMENT_RISK[c.code] || { score:60, label:'Orta', dso:60, notes:'' },
    hasCulturalIntel: !!CULTURAL_INTEL[c.code],
  }));
  res.json({ countries: enriched });
});

// POST /api/export/start-search — Yeni arama başlat (anında döner, arka planda çalışır)
router.post('/start-search', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { countryCode, sector } = req.body;
    if (!countryCode || !sector) return res.status(400).json({ error: 'countryCode ve sector zorunlu' });

    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return res.status(400).json({ error: 'Geçersiz ülke kodu' });

    // Kullanıcı profili
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).maybeSingle();
    const { data: userRow } = await supabase.from('users').select('company, name').eq('id', userId).single();
    const senderCompany = (typeof profile?.company === 'string' ? profile.company : profile?.company?.name) || userRow?.company || 'Türk İhracatçı';
    const senderProduct = (typeof profile?.product === 'string' ? profile.product : profile?.product?.description) || sector;

    // 1. HS kod eşleştir (hızlı)
    const { codes: hsCodes, names: hsCodeNames, searchTerms } = await mapSectorToHSCodes(sector);

    // 2. Session oluştur
    const { data: session } = await supabase.from('export_search_sessions').insert([{
      user_id: userId, country_code: countryCode, sector,
      status: 'running', step: 'starting', progress: 5,
    }]).select().single();

    res.json({
      ok: true,
      sessionId: session?.id,
      hsCodes, hsCodeNames,
      message: `${country.flag} ${country.name}'de "${sector}" aranıyor... HS kodları: ${hsCodes.join(', ')}`,
    });

    // Arka planda çalıştır
    runExportSearch(session?.id, userId, countryCode, sector, hsCodes, hsCodeNames, searchTerms, country, senderCompany, senderProduct);

  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/search-session/:id/status — Polling
router.get('/search-session/:id/status', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('export_search_sessions').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!data) return res.status(404).json({ error: 'Oturum bulunamadı' });
    const result = data.result ? (typeof data.result === 'string' ? JSON.parse(data.result) : data.result) : null;
    res.json({
      status: data.status, step: data.step, progress: data.progress,
      importersFound: result?.importersFound || 0,
      marketIntel: result?.marketIntel || null,
      paymentRisk: result?.paymentRisk || null,
      culturalIntel: result?.culturalIntel || null,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/market-intel/:countryCode — Anlık pazar zekası (HS kodu olmadan)
router.get('/market-intel/:countryCode', async (req: any, res: any) => {
  const country = COUNTRIES.find(c => c.code === req.params.countryCode);
  if (!country) return res.status(404).json({ error: 'Ülke bulunamadı' });
  const risk = PAYMENT_RISK[req.params.countryCode] || { score:60, label:'Orta', dso:60, notes:'' };
  const cultural = CULTURAL_INTEL[req.params.countryCode] || null;

  // Turkey's total exports to this country (all products, 2023)
  let totalExportsUSD = 0;
  try {
    const r = await axios.get('https://comtrade.un.org/api/get', {
      params: { r:'792', p:country.comtradeCode, ps:2023, px:'HS', cc:'TOTAL', type:'C', freq:'A', fmt:'json', max:1 },
      timeout: 10000,
    });
    totalExportsUSD = r.data?.dataset?.[0]?.TradeValue || 0;
  } catch {}

  res.json({ country: { ...country, paymentRisk: risk, culturalIntel: cultural, totalExportsUSD } });
});

// POST /api/export/generate-message
router.post('/generate-message', async (req: any, res: any) => {
  try {
    const { leadId, channel = 'whatsapp' } = req.body;
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const country = COUNTRIES.find(c => c.code === (lead.country_code || 'DE')) || COUNTRIES[0];
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).maybeSingle();
    const { data: userRow } = await supabase.from('users').select('company').eq('id', req.userId).single();
    const senderCompany = (typeof profile?.company === 'string' ? profile.company : profile?.company?.name) || userRow?.company || 'Şirketimiz';
    const senderProduct = (typeof profile?.product === 'string' ? profile.product : profile?.product?.description) || lead.sector || '';

    const hsCodes = lead.hs_codes ? JSON.parse(lead.hs_codes) : [];
    const message = await generateOutreachMessage({
      companyName: lead.company_name, country: country.name, language: country.language,
      sector: lead.sector || '', senderCompany, senderProduct, channel, hsCodes,
    });

    // Mesajı kaydet (DB'ye)
    await supabase.from('export_messages').upsert([{
      user_id: req.userId, lead_id: leadId,
      country_code: country.code, channel,
      subject: message.subject || null, body: message.body,
      language: country.language, status: 'draft',
    }], { onConflict: 'user_id,lead_id,channel' });

    res.json({ ok: true, message, lead: lead.company_name, country: country.name, language: country.language });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/messages — Tüm üretilmiş mesajları getir
router.get('/messages', async (req: any, res: any) => {
  try {
    const { countryCode, channel } = req.query;
    let query = supabase.from('export_messages').select('*, leads(company_name, country, sector, phone, website)')
      .eq('user_id', req.userId).order('created_at', { ascending: false }).limit(100);
    if (countryCode) query = query.eq('country_code', countryCode);
    if (channel) query = query.eq('channel', channel);
    const { data } = await query;
    res.json({ messages: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/export/bulk-messages
router.post('/bulk-messages', async (req: any, res: any) => {
  try {
    const { countryCode, leadIds, channel = 'whatsapp' } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'leadIds zorunlu' });
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return res.status(400).json({ error: 'Geçersiz ülke' });
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).maybeSingle();
    const { data: userRow } = await supabase.from('users').select('company').eq('id', req.userId).single();
    const senderCompany = (typeof profile?.company === 'string' ? profile.company : profile?.company?.name) || userRow?.company || 'Şirketimiz';
    const senderProduct = (typeof profile?.product === 'string' ? profile.product : profile?.product?.description) || '';

    res.json({ ok: true, message: `${leadIds.length} lead için ${country.name} mesajları oluşturuluyor...` });

    (async () => {
      for (const leadId of leadIds) {
        try {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
          if (!lead) continue;
          const hsCodes = lead.hs_codes ? JSON.parse(lead.hs_codes) : [];
          const msg = await generateOutreachMessage({
            companyName: lead.company_name, country: country.name, language: country.language,
            sector: lead.sector || '', senderCompany, senderProduct, channel, hsCodes,
          });
          await supabase.from('export_messages').upsert([{
            user_id: req.userId, lead_id: leadId,
            country_code: countryCode, channel,
            subject: msg.subject || null, body: msg.body,
            language: country.language, status: 'draft',
          }], { onConflict: 'user_id,lead_id,channel' });
          await sleep(400);
        } catch (e: any) { console.error('bulk msg error:', e.message); }
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/export/create-campaign
router.post('/create-campaign', async (req: any, res: any) => {
  try {
    const { name, countryCode, leadIds, channel, campaignType } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: 'Lead seçin' });
    const country = COUNTRIES.find(c => c.code === countryCode);
    const { data: campaign, error } = await supabase.from('export_campaigns').insert([{
      user_id: req.userId,
      name: name || `${country?.flag} ${country?.name} ${channel?.toUpperCase()} Kampanyası`,
      country_code: countryCode, country_name: country?.name,
      channel, campaign_type: campaignType || 'outreach',
      lead_count: leadIds.length, lead_ids: leadIds,
      status: 'draft', language: country?.language,
    }]).select().single();
    if (error) throw error;
    res.json({ ok: true, campaign, message: `${leadIds.length} lead için ${country?.name} kampanyası oluşturuldu` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/export/campaigns/:id/send — Kampanya gönder (WhatsApp entegrasyonu)
router.post('/campaigns/:id/send', async (req: any, res: any) => {
  try {
    const { data: camp } = await supabase.from('export_campaigns').select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!camp) return res.status(404).json({ error: 'Kampanya bulunamadı' });
    if (camp.status === 'running') return res.status(400).json({ error: 'Kampanya zaten çalışıyor' });

    await supabase.from('export_campaigns').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ ok: true, message: `${camp.lead_count} lead için kampanya başlatıldı` });

    (async () => {
      try {
        const { sendWhatsAppMessage } = require('./settings');
        const leadIds: string[] = camp.lead_ids || [];
        let sent = 0;

        for (const leadId of leadIds) {
          try {
            const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
            if (!lead?.phone) continue;

            // Get or generate message
            const { data: existingMsg } = await supabase.from('export_messages')
              .select('body').eq('lead_id', leadId).eq('channel', camp.channel).eq('user_id', req.userId).maybeSingle();

            const msgBody = existingMsg?.body;
            if (!msgBody) continue;

            if (camp.channel === 'whatsapp') {
              await sendWhatsAppMessage(req.userId, lead.phone, msgBody);
              await supabase.from('messages').insert([{
                user_id: req.userId, lead_id: leadId,
                direction: 'out', content: msgBody,
                channel: 'whatsapp', sent_at: new Date().toISOString(),
                metadata: JSON.stringify({ type: 'export_campaign', campaign_id: camp.id }),
              }]);
            }

            await supabase.from('export_messages').update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('lead_id', leadId).eq('campaign_id', camp.id);
            sent++;
            await sleep(8000); // Anti-ban delay
          } catch (e: any) { console.error('send error:', e.message); }
        }

        await supabase.from('export_campaigns').update({
          status: 'completed', sent_count: sent, completed_at: new Date().toISOString(),
        }).eq('id', req.params.id);
      } catch (e: any) {
        await supabase.from('export_campaigns').update({ status: 'failed' }).eq('id', req.params.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/campaigns
router.get('/campaigns', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('export_campaigns').select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ campaigns: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/export-leads
router.get('/export-leads', async (req: any, res: any) => {
  try {
    const { countryCode, limit = 100 } = req.query;
    let query = supabase.from('leads').select('*').eq('user_id', req.userId).eq('source', 'export_search')
      .order('created_at', { ascending: false }).limit(Number(limit));
    if (countryCode) query = query.eq('country_code', countryCode);
    const { data } = await query;
    res.json({ leads: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/analytics
router.get('/analytics', async (req: any, res: any) => {
  try {
    const { data: leads } = await supabase.from('leads').select('country, country_code, status, sector').eq('user_id', req.userId).eq('source', 'export_search');
    const { data: campaigns } = await supabase.from('export_campaigns').select('country_code, country_name, status, lead_count, sent_count').eq('user_id', req.userId);
    const { data: msgs } = await supabase.from('export_messages').select('country_code, status, channel').eq('user_id', req.userId);

    const byCountry: Record<string, any> = {};
    (leads || []).forEach((l: any) => {
      if (!byCountry[l.country]) byCountry[l.country] = { leads: 0, converted: 0, country_code: l.country_code };
      byCountry[l.country].leads++;
      if (l.status === 'won') byCountry[l.country].converted++;
    });

    res.json({
      totalLeads: leads?.length || 0,
      totalCampaigns: campaigns?.length || 0,
      totalMessages: msgs?.length || 0,
      sentMessages: msgs?.filter((m: any) => m.status === 'sent').length || 0,
      byCountry: Object.entries(byCountry).map(([c, v]: any) => ({
        country: c, country_code: v.country_code, leads: v.leads, converted: v.converted,
        convRate: v.leads > 0 ? Math.round((v.converted / v.leads) * 100) : 0,
      })).sort((a, b) => b.leads - a.leads).slice(0, 8),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Geriye uyumluluk
router.get('/markets', (_req: any, res: any) => res.json({ countries: COUNTRIES }));
router.post('/find-leads', async (req: any, res: any) => res.redirect(307, '/api/export/start-search'));

module.exports = router;
