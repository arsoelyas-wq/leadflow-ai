export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── ÜLKE KONFİGÜRASYONU ──────────────────────────────────────────────────────
const COUNTRY_CONFIG: Record<string, {
  name: string; flag: string; language: string; currency: string; currencySymbol: string;
  timezone: string; phoneCode: string; locale: string; region: string;
}> = {
  TR: { name:'Türkiye',         flag:'🇹🇷', language:'tr', currency:'TRY', currencySymbol:'₺', timezone:'Europe/Istanbul',  phoneCode:'+90', locale:'tr-TR', region:'Yakın Çevre' },
  DE: { name:'Almanya',         flag:'🇩🇪', language:'de', currency:'EUR', currencySymbol:'€', timezone:'Europe/Berlin',    phoneCode:'+49', locale:'de-DE', region:'Avrupa' },
  GB: { name:'İngiltere',       flag:'🇬🇧', language:'en', currency:'GBP', currencySymbol:'£', timezone:'Europe/London',    phoneCode:'+44', locale:'en-GB', region:'Avrupa' },
  FR: { name:'Fransa',          flag:'🇫🇷', language:'fr', currency:'EUR', currencySymbol:'€', timezone:'Europe/Paris',     phoneCode:'+33', locale:'fr-FR', region:'Avrupa' },
  NL: { name:'Hollanda',        flag:'🇳🇱', language:'nl', currency:'EUR', currencySymbol:'€', timezone:'Europe/Amsterdam', phoneCode:'+31', locale:'nl-NL', region:'Avrupa' },
  IT: { name:'İtalya',          flag:'🇮🇹', language:'it', currency:'EUR', currencySymbol:'€', timezone:'Europe/Rome',      phoneCode:'+39', locale:'it-IT', region:'Avrupa' },
  ES: { name:'İspanya',         flag:'🇪🇸', language:'es', currency:'EUR', currencySymbol:'€', timezone:'Europe/Madrid',    phoneCode:'+34', locale:'es-ES', region:'Avrupa' },
  PL: { name:'Polonya',         flag:'🇵🇱', language:'pl', currency:'PLN', currencySymbol:'zł',timezone:'Europe/Warsaw',    phoneCode:'+48', locale:'pl-PL', region:'Avrupa' },
  US: { name:'ABD',             flag:'🇺🇸', language:'en', currency:'USD', currencySymbol:'$', timezone:'America/New_York', phoneCode:'+1',  locale:'en-US', region:'Amerika' },
  CA: { name:'Kanada',          flag:'🇨🇦', language:'en', currency:'CAD', currencySymbol:'C$',timezone:'America/Toronto',  phoneCode:'+1',  locale:'en-CA', region:'Amerika' },
  AE: { name:'BAE',             flag:'🇦🇪', language:'ar', currency:'AED', currencySymbol:'د.إ',timezone:'Asia/Dubai',     phoneCode:'+971',locale:'ar-AE', region:'Körfez' },
  SA: { name:'Suudi Arabistan', flag:'🇸🇦', language:'ar', currency:'SAR', currencySymbol:'﷼', timezone:'Asia/Riyadh',    phoneCode:'+966',locale:'ar-SA', region:'Körfez' },
  QA: { name:'Katar',           flag:'🇶🇦', language:'ar', currency:'QAR', currencySymbol:'ر.ق',timezone:'Asia/Qatar',     phoneCode:'+974',locale:'ar-QA', region:'Körfez' },
  KW: { name:'Kuveyt',          flag:'🇰🇼', language:'ar', currency:'KWD', currencySymbol:'د.ك',timezone:'Asia/Kuwait',    phoneCode:'+965',locale:'ar-KW', region:'Körfez' },
  EG: { name:'Mısır',           flag:'🇪🇬', language:'ar', currency:'EGP', currencySymbol:'£', timezone:'Africa/Cairo',    phoneCode:'+20', locale:'ar-EG', region:'Afrika' },
  MA: { name:'Fas',             flag:'🇲🇦', language:'fr', currency:'MAD', currencySymbol:'د.م.',timezone:'Africa/Casablanca',phoneCode:'+212',locale:'fr-MA',region:'Afrika' },
  KZ: { name:'Kazakistan',      flag:'🇰🇿', language:'ru', currency:'KZT', currencySymbol:'₸', timezone:'Asia/Almaty',     phoneCode:'+7',  locale:'ru-KZ', region:'Orta Asya' },
  AZ: { name:'Azerbaycan',      flag:'🇦🇿', language:'az', currency:'AZN', currencySymbol:'₼', timezone:'Asia/Baku',       phoneCode:'+994',locale:'az-AZ', region:'Orta Asya' },
  UZ: { name:'Özbekistan',      flag:'🇺🇿', language:'uz', currency:'UZS', currencySymbol:'лв',timezone:'Asia/Tashkent',   phoneCode:'+998',locale:'uz-UZ', region:'Orta Asya' },
  RU: { name:'Rusya',           flag:'🇷🇺', language:'ru', currency:'RUB', currencySymbol:'₽', timezone:'Europe/Moscow',   phoneCode:'+7',  locale:'ru-RU', region:'Orta Asya' },
  CN: { name:'Çin',             flag:'🇨🇳', language:'zh', currency:'CNY', currencySymbol:'¥', timezone:'Asia/Shanghai',   phoneCode:'+86', locale:'zh-CN', region:'Asya' },
  JP: { name:'Japonya',         flag:'🇯🇵', language:'ja', currency:'JPY', currencySymbol:'¥', timezone:'Asia/Tokyo',      phoneCode:'+81', locale:'ja-JP', region:'Asya' },
  IN: { name:'Hindistan',       flag:'🇮🇳', language:'en', currency:'INR', currencySymbol:'₹', timezone:'Asia/Kolkata',    phoneCode:'+91', locale:'en-IN', region:'Asya' },
};

// ── PLATFORM SEED VERİSİ ──────────────────────────────────────────────────────
const PLATFORMS_SEED = [
  // ── GLOBAL PLATFORMLAR ──────────────────────────────────────────
  { id:'google_search',  name:'Google Arama',     type:'search',       countries:['*'], is_global:true,  can_disable:false, icon_color:'#4285f4', scraper_id:'google_search',  data_types:['companies','leads','news'] },
  { id:'google_maps',    name:'Google Haritalar', type:'directory',    countries:['*'], is_global:true,  can_disable:false, icon_color:'#34a853', scraper_id:'google_places',  data_types:['businesses','phone','address'] },
  { id:'linkedin',       name:'LinkedIn',          type:'professional', countries:['*'], is_global:true,  can_disable:false, icon_color:'#0a66c2', scraper_id:'linkedin',       data_types:['contacts','companies','jobs'] },
  { id:'facebook',       name:'Facebook',          type:'social',       countries:['*'], is_global:true,  can_disable:true,  icon_color:'#1877f2', scraper_id:'facebook',       data_types:['pages','reviews','ads'] },
  { id:'instagram',      name:'Instagram',         type:'social',       countries:['*'], is_global:true,  can_disable:true,  icon_color:'#e1306c', scraper_id:'instagram',      data_types:['profiles','hashtags'] },
  { id:'youtube',        name:'YouTube',           type:'video',        countries:['*'], is_global:true,  can_disable:true,  icon_color:'#ff0000', scraper_id:'youtube',        data_types:['channels','videos'] },
  { id:'twitter',        name:'Twitter / X',       type:'social',       countries:['*'], is_global:true,  can_disable:true,  icon_color:'#1da1f2', scraper_id:'twitter',        data_types:['profiles','trends'] },
  { id:'europages',      name:'Europages',         type:'b2b',          countries:['*'], is_global:true,  can_disable:true,  icon_color:'#003399', scraper_id:'europages',      data_types:['companies','contacts'] },
  { id:'kompass',        name:'Kompass',            type:'b2b',          countries:['*'], is_global:true,  can_disable:true,  icon_color:'#e63329', scraper_id:'kompass',        data_types:['companies','contacts'] },
  { id:'trustpilot',    name:'Trustpilot',         type:'review',       countries:['*'], is_global:true,  can_disable:true,  icon_color:'#00b67a', scraper_id:'trustpilot',     data_types:['reviews','companies'] },
  { id:'tiktok',        name:'TikTok',             type:'social',       countries:['*'], is_global:true,  can_disable:true,  icon_color:'#010101', scraper_id:'tiktok',         data_types:['profiles','trends'] },
  { id:'world_bank',    name:'Dünya Bankası',      type:'government',   countries:['*'], is_global:true,  can_disable:true,  icon_color:'#003f87', scraper_id:'worldbank',      data_types:['tenders','projects'] },

  // ── TÜRKİYE ─────────────────────────────────────────────────────
  { id:'sikayetvar',    name:'Şikayetvar',         type:'complaint',    countries:['TR'], is_global:false, can_disable:true,  icon_color:'#e53935', scraper_id:'sikayetvar',     data_types:['complaints','companies','reviews'] },
  { id:'sahibinden',    name:'Sahibinden',          type:'marketplace',  countries:['TR'], is_global:false, can_disable:true,  icon_color:'#f57c00', scraper_id:'sahibinden',     data_types:['listings','companies'] },
  { id:'ekap',          name:'EKAP',                type:'government',   countries:['TR'], is_global:false, can_disable:true,  icon_color:'#1565c0', scraper_id:'ekap',           data_types:['tenders'] },
  { id:'kap',           name:'KAP',                 type:'financial',    countries:['TR'], is_global:false, can_disable:true,  icon_color:'#2e7d32', scraper_id:'kap',            data_types:['announcements','companies'] },
  { id:'hepsiburada',  name:'Hepsiburada',          type:'marketplace',  countries:['TR'], is_global:false, can_disable:true,  icon_color:'#ff6000', scraper_id:'hepsiburada',    data_types:['products','sellers','prices'] },
  { id:'trendyol',     name:'Trendyol',             type:'marketplace',  countries:['TR'], is_global:false, can_disable:true,  icon_color:'#f27a1a', scraper_id:'trendyol',       data_types:['products','sellers','prices'] },
  { id:'n11',          name:'N11',                  type:'marketplace',  countries:['TR'], is_global:false, can_disable:true,  icon_color:'#7b1fa2', scraper_id:'n11',            data_types:['products','sellers'] },
  { id:'hurriyet',     name:'Hürriyet',             type:'news',         countries:['TR'], is_global:false, can_disable:true,  icon_color:'#c62828', scraper_id:'hurriyet',       data_types:['news','companies'] },
  { id:'mersis',       name:'MERSİS',               type:'government',   countries:['TR'], is_global:false, can_disable:true,  icon_color:'#283593', scraper_id:'mersis',         data_types:['companies','registry'] },

  // ── ALMANYA ──────────────────────────────────────────────────────
  { id:'wlw_de',        name:'Wer Liefert Was',    type:'b2b',          countries:['DE'], is_global:false, can_disable:true,  icon_color:'#003366', scraper_id:'wlw',            data_types:['companies','contacts'] },
  { id:'xing',          name:'XING',               type:'professional', countries:['DE','AT','CH'], is_global:false, can_disable:true, icon_color:'#006567', scraper_id:'xing', data_types:['contacts','companies'] },
  { id:'kununu',        name:'Kununu',             type:'review',       countries:['DE','AT'], is_global:false, can_disable:true, icon_color:'#00c389', scraper_id:'kununu', data_types:['reviews','companies'] },
  { id:'bundesanzeiger',name:'Bundesanzeiger',     type:'government',   countries:['DE'], is_global:false, can_disable:true,  icon_color:'#1a237e', scraper_id:'bundesanzeiger', data_types:['announcements','companies'] },
  { id:'handelsblatt',  name:'Handelsblatt',       type:'news',         countries:['DE'], is_global:false, can_disable:true,  icon_color:'#d50000', scraper_id:'handelsblatt',   data_types:['news','companies'] },
  { id:'ted_europa',    name:'TED Europa',         type:'government',   countries:['DE','FR','NL','IT','ES','PL','GB'], is_global:false, can_disable:true, icon_color:'#003399', scraper_id:'ted', data_types:['tenders'] },

  // ── ABD ──────────────────────────────────────────────────────────
  { id:'yelp',          name:'Yelp',               type:'review',       countries:['US','CA','GB'], is_global:false, can_disable:true, icon_color:'#d32323', scraper_id:'yelp', data_types:['reviews','businesses'] },
  { id:'bbb',           name:'Better Business Bureau', type:'complaint', countries:['US','CA'], is_global:false, can_disable:true, icon_color:'#003f87', scraper_id:'bbb', data_types:['complaints','companies'] },
  { id:'thomasnet',     name:'Thomas Net',         type:'b2b',          countries:['US'], is_global:false, can_disable:true,  icon_color:'#e65100', scraper_id:'thomasnet',      data_types:['manufacturers','suppliers'] },
  { id:'manta',         name:'Manta',              type:'directory',    countries:['US'], is_global:false, can_disable:true,  icon_color:'#00897b', scraper_id:'manta',          data_types:['companies'] },
  { id:'sam_gov',       name:'SAM.gov',            type:'government',   countries:['US'], is_global:false, can_disable:true,  icon_color:'#1a237e', scraper_id:'sam_gov',        data_types:['tenders','contracts'] },
  { id:'crunchbase',    name:'Crunchbase',         type:'financial',    countries:['US'], is_global:false, can_disable:true,  icon_color:'#0288d1', scraper_id:'crunchbase',     data_types:['startups','funding'] },

  // ── İNGİLTERE ─────────────────────────────────────────────────────
  { id:'gumtree',       name:'Gumtree',            type:'marketplace',  countries:['GB'], is_global:false, can_disable:true,  icon_color:'#72b540', scraper_id:'gumtree',        data_types:['listings'] },
  { id:'companies_house',name:'Companies House',   type:'government',   countries:['GB'], is_global:false, can_disable:true,  icon_color:'#00703c', scraper_id:'companies_house',data_types:['companies','directors'] },
  { id:'contracts_finder',name:'Contracts Finder', type:'government',   countries:['GB'], is_global:false, can_disable:true,  icon_color:'#1d70b8', scraper_id:'contracts_finder',data_types:['tenders'] },

  // ── KÖRFEZ ───────────────────────────────────────────────────────
  { id:'dubizzle',      name:'Dubizzle',           type:'marketplace',  countries:['AE','SA','QA','KW'], is_global:false, can_disable:true, icon_color:'#ff6b35', scraper_id:'dubizzle', data_types:['listings'] },
  { id:'yellowpages_ae',name:'Yellow Pages UAE',   type:'directory',    countries:['AE'], is_global:false, can_disable:true,  icon_color:'#fdd835', scraper_id:'yellowpages_ae', data_types:['businesses','contacts'] },

  // ── HİNDİSTAN ───────────────────────────────────────────────────
  { id:'indiamart',     name:'IndiaMart',          type:'b2b',          countries:['IN'], is_global:false, can_disable:true,  icon_color:'#ff7722', scraper_id:'indiamart',      data_types:['suppliers','products'] },
  { id:'justdial',      name:'JustDial',           type:'directory',    countries:['IN'], is_global:false, can_disable:true,  icon_color:'#e53935', scraper_id:'justdial',       data_types:['businesses','contacts'] },
  { id:'gem_india',     name:'GeM India',          type:'government',   countries:['IN'], is_global:false, can_disable:true,  icon_color:'#1565c0', scraper_id:'gem_india',      data_types:['tenders','products'] },

  // ── RUSYA / BDT ──────────────────────────────────────────────────
  { id:'vkontakte',     name:'VKontakte (VK)',     type:'social',       countries:['RU','KZ','AZ','UZ'], is_global:false, can_disable:true, icon_color:'#4a76a8', scraper_id:'vk', data_types:['profiles','companies'] },
  { id:'avito',         name:'Avito',              type:'marketplace',  countries:['RU'], is_global:false, can_disable:true,  icon_color:'#97cf26', scraper_id:'avito',          data_types:['listings'] },
  { id:'hh_ru',         name:'HeadHunter',         type:'professional', countries:['RU','KZ'], is_global:false, can_disable:true, icon_color:'#d6001c', scraper_id:'hh',          data_types:['contacts','companies'] },

  // ── FRANSA ───────────────────────────────────────────────────────
  { id:'leboncoin',     name:'Le Bon Coin',        type:'marketplace',  countries:['FR'], is_global:false, can_disable:true,  icon_color:'#f56b2a', scraper_id:'leboncoin',      data_types:['listings'] },
  { id:'societe_fr',    name:'Societe.com',        type:'directory',    countries:['FR'], is_global:false, can_disable:true,  icon_color:'#1565c0', scraper_id:'societe_fr',     data_types:['companies','directors'] },
];

// ── AUTO-MIGRATE ──────────────────────────────────────────────────────────────
async function autoSeedPlatforms() {
  try {
    const { error: testErr } = await supabase.from('platform_registry').select('id').limit(1);
    if (testErr) { console.log('[Platforms] Table not ready yet'); return; }

    const { count } = await supabase.from('platform_registry').select('*', { count:'exact', head:true });
    if ((count || 0) > 0) return; // Already seeded

    const { error } = await supabase.from('platform_registry').insert(PLATFORMS_SEED);
    if (error) console.error('[Platforms] Seed error:', error.message);
    else console.log(`[Platforms] ✅ Seeded ${PLATFORMS_SEED.length} platforms`);
  } catch(e:any) { console.log('[Platforms] autoSeed skipped:', e.message); }
}
autoSeedPlatforms();
setTimeout(autoSeedPlatforms, 5000);

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/platforms/countries — Tüm ülke konfigürasyonu
router.get('/countries', (_req: any, res: any) => {
  const list = Object.entries(COUNTRY_CONFIG).map(([code, cfg]) => ({ code, ...cfg }));
  res.json({ countries: list });
});

// GET /api/platforms/my-country — Kullanıcının ülke ayarı
router.get('/my-country', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('users')
      .select('country_code, language_code, currency, timezone')
      .eq('id', req.userId).single();
    const code = data?.country_code || 'TR';
    const cfg  = COUNTRY_CONFIG[code] || COUNTRY_CONFIG['TR'];
    res.json({ ...data, ...cfg, code });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/platforms/my-country — Ülke güncelle
router.patch('/my-country', async (req: any, res: any) => {
  try {
    const { country_code } = req.body;
    if (!country_code || !COUNTRY_CONFIG[country_code]) {
      return res.status(400).json({ error: 'Geçersiz ülke kodu' });
    }
    const cfg = COUNTRY_CONFIG[country_code];
    await supabase.from('users').update({
      country_code,
      language_code: cfg.language,
      currency:      cfg.currency,
      timezone:      cfg.timezone,
    }).eq('id', req.userId);
    res.json({ ok: true, country: { code: country_code, ...cfg } });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// GET /api/platforms/available?country=TR — Ülkeye göre platform listesi
router.get('/available', async (req: any, res: any) => {
  try {
    const countryCode = (req.query.country as string) || req.userId_country || 'TR';

    // Tüm platformları çek
    const { data: allPlatforms } = await supabase.from('platform_registry')
      .select('*').eq('active', true).order('type');

    // Bu ülkeye uygun olanları filtrele
    const filtered = (allPlatforms || []).filter((p: any) =>
      p.countries?.includes('*') || p.countries?.includes(countryCode)
    );

    // Kullanıcının kişisel tercihlerini al
    const { data: userPrefs } = await supabase.from('user_platform_settings')
      .select('platform_id, enabled, api_key, config').eq('user_id', req.userId);

    const prefMap: Record<string,any> = {};
    (userPrefs || []).forEach((p: any) => { prefMap[p.platform_id] = p; });

    // Merge: platform + kullanıcı tercihi
    const platforms = filtered.map((p: any) => ({
      ...p,
      enabled: prefMap[p.id]?.enabled ?? true,
      has_api_key: !!prefMap[p.id]?.api_key,
      user_config: prefMap[p.id]?.config || {},
    }));

    // Tipe göre grupla
    const grouped: Record<string, any[]> = {};
    platforms.forEach((p: any) => {
      if (!grouped[p.type]) grouped[p.type] = [];
      grouped[p.type].push(p);
    });

    res.json({ platforms, grouped, country: countryCode, total: platforms.length });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/platforms/settings — Platform aç/kapat
router.patch('/settings', async (req: any, res: any) => {
  try {
    const { platform_id, enabled, api_key, config } = req.body;
    if (!platform_id) return res.status(400).json({ error: 'platform_id zorunlu' });

    // Global + can_disable=false olanlar kapatılamaz
    const { data: platform } = await supabase.from('platform_registry')
      .select('can_disable, is_global').eq('id', platform_id).single();
    if (platform && !platform.can_disable && enabled === false) {
      return res.status(400).json({ error: 'Bu platform kapatılamaz' });
    }

    await supabase.from('user_platform_settings').upsert([{
      user_id:     req.userId,
      platform_id,
      enabled:     enabled ?? true,
      api_key:     api_key || null,
      config:      config  || {},
      updated_at:  new Date().toISOString(),
    }], { onConflict: 'user_id,platform_id' });

    res.json({ ok: true });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// GET /api/platforms/active-for-feature?feature=lead_search — Belirli özellik için aktif platformlar
router.get('/active-for-feature', async (req: any, res: any) => {
  try {
    const feature  = req.query.feature as string || 'lead_search';
    const { data: userRow } = await supabase.from('users').select('country_code').eq('id', req.userId).single();
    const countryCode = userRow?.country_code || 'TR';

    const featureTypes: Record<string, string[]> = {
      lead_search:   ['search','directory','b2b','marketplace'],
      competitor:    ['search','review','complaint','marketplace','b2b'],
      shadow:        ['review','complaint','marketplace','social'],
      tenders:       ['government'],
      news:          ['news'],
      social:        ['social','professional'],
      contact_find:  ['professional','b2b','directory'],
    };
    const types = featureTypes[feature] || ['search','directory'];

    const { data: allPlatforms } = await supabase.from('platform_registry')
      .select('id, name, type, scraper_id, data_types')
      .eq('active', true)
      .in('type', types);

    const eligible = (allPlatforms || []).filter((p: any) =>
      p.countries?.includes('*') || p.countries?.includes(countryCode)
    );

    // Kullanıcı tercihleri
    const { data: userPrefs } = await supabase.from('user_platform_settings')
      .select('platform_id, enabled, api_key').eq('user_id', req.userId);
    const disabledSet = new Set((userPrefs||[]).filter((p:any) => !p.enabled).map((p:any) => p.platform_id));

    const active = eligible.filter((p: any) => !disabledSet.has(p.id));

    res.json({ platforms: active, country: countryCode, feature });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
});

// GET /api/platforms/country-config/:code — Tek ülke detayı
router.get('/country-config/:code', (req: any, res: any) => {
  const cfg = COUNTRY_CONFIG[req.params.code.toUpperCase()];
  if (!cfg) return res.status(404).json({ error: 'Ülke bulunamadı' });
  res.json({ code: req.params.code.toUpperCase(), ...cfg });
});

module.exports = { router, COUNTRY_CONFIG };
