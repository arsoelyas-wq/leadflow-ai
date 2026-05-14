export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ── In-memory job store ───────────────────────────────────────────────────────
interface Job {
  status: 'running' | 'enriching' | 'done' | 'error';
  total: number;
  found: number;
  saved: number;
  enriched: number;       // leads with email discovered
  withPhone: number;
  withEmail: number;
  withWebsite: number;
  keyword: string;
  city: string;
  country: string;
  phase: string;          // human-readable current step
  error?: string;
  startedAt: number;
}
const jobs = new Map<string, Job>();

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.startedAt < cutoff) jobs.delete(id);
  }
}, 30 * 60 * 1000);

// ── City coordinates for precision geotargeting ───────────────────────────────
const CITY_COORDS: Record<string, { lat: number; lng: number; radius: number }> = {
  // Turkey (81 provinces — major ones with coordinates)
  istanbul:       { lat: 41.0082, lng: 28.9784, radius: 25000 },
  ankara:         { lat: 39.9334, lng: 32.8597, radius: 20000 },
  izmir:          { lat: 38.4192, lng: 27.1287, radius: 18000 },
  bursa:          { lat: 40.1826, lng: 29.0665, radius: 15000 },
  antalya:        { lat: 36.8969, lng: 30.7133, radius: 15000 },
  adana:          { lat: 37.0000, lng: 35.3213, radius: 12000 },
  konya:          { lat: 37.8714, lng: 32.4844, radius: 12000 },
  gaziantep:      { lat: 37.0662, lng: 37.3833, radius: 12000 },
  kayseri:        { lat: 38.7312, lng: 35.4787, radius: 12000 },
  mersin:         { lat: 36.8000, lng: 34.6333, radius: 12000 },
  diyarbakir:     { lat: 37.9144, lng: 40.2306, radius: 12000 },
  samsun:         { lat: 41.2867, lng: 36.3300, radius: 12000 },
  eskisehir:      { lat: 39.7767, lng: 30.5206, radius: 12000 },
  trabzon:        { lat: 41.0027, lng: 39.7168, radius: 10000 },
  malatya:        { lat: 38.3552, lng: 38.3095, radius: 10000 },
  // France
  paris:          { lat: 48.8566, lng: 2.3522,  radius: 20000 },
  lyon:           { lat: 45.7640, lng: 4.8357,  radius: 15000 },
  marseille:      { lat: 43.2965, lng: 5.3698,  radius: 15000 },
  toulouse:       { lat: 43.6047, lng: 1.4442,  radius: 12000 },
  nice:           { lat: 43.7102, lng: 7.2620,  radius: 10000 },
  bordeaux:       { lat: 44.8378, lng: -0.5792, radius: 12000 },
  lille:          { lat: 50.6292, lng: 3.0573,  radius: 10000 },
  strasbourg:     { lat: 48.5734, lng: 7.7521,  radius: 10000 },
  // Germany
  berlin:         { lat: 52.5200, lng: 13.4050, radius: 22000 },
  hamburg:        { lat: 53.5753, lng: 10.0153, radius: 18000 },
  munchen:        { lat: 48.1351, lng: 11.5820, radius: 18000 },
  koln:           { lat: 50.9333, lng: 6.9500,  radius: 15000 },
  frankfurt:      { lat: 50.1109, lng: 8.6821,  radius: 15000 },
  stuttgart:      { lat: 48.7758, lng: 9.1829,  radius: 12000 },
  dusseldorf:     { lat: 51.2217, lng: 6.7762,  radius: 12000 },
  dortmund:       { lat: 51.5136, lng: 7.4653,  radius: 12000 },
  // UK
  london:         { lat: 51.5074, lng: -0.1278, radius: 25000 },
  birmingham:     { lat: 52.4862, lng: -1.8904, radius: 15000 },
  manchester:     { lat: 53.4808, lng: -2.2426, radius: 15000 },
  leeds:          { lat: 53.8008, lng: -1.5491, radius: 12000 },
  glasgow:        { lat: 55.8642, lng: -4.2518, radius: 12000 },
  liverpool:      { lat: 53.4084, lng: -2.9916, radius: 12000 },
  // Italy
  roma:           { lat: 41.9028, lng: 12.4964, radius: 20000 },
  milano:         { lat: 45.4654, lng: 9.1859,  radius: 18000 },
  napoli:         { lat: 40.8518, lng: 14.2681, radius: 15000 },
  torino:         { lat: 45.0703, lng: 7.6869,  radius: 15000 },
  // Spain
  madrid:         { lat: 40.4168, lng: -3.7038, radius: 20000 },
  barcelona:      { lat: 41.3851, lng: 2.1734,  radius: 18000 },
  valencia:       { lat: 39.4699, lng: -0.3763, radius: 12000 },
  sevilla:        { lat: 37.3891, lng: -5.9845, radius: 12000 },
  // Netherlands
  amsterdam:      { lat: 52.3676, lng: 4.9041,  radius: 12000 },
  rotterdam:      { lat: 51.9244, lng: 4.4777,  radius: 12000 },
  // Belgium
  bruxelles:      { lat: 50.8503, lng: 4.3517,  radius: 12000 },
  antwerpen:      { lat: 51.2194, lng: 4.4025,  radius: 10000 },
  // USA
  newyork:        { lat: 40.7128, lng: -74.0060, radius: 20000 },
  losangeles:     { lat: 34.0522, lng: -118.2437, radius: 22000 },
  chicago:        { lat: 41.8781, lng: -87.6298, radius: 20000 },
  houston:        { lat: 29.7604, lng: -95.3698, radius: 20000 },
  phoenix:        { lat: 33.4484, lng: -112.0740, radius: 18000 },
  philadelphia:   { lat: 39.9526, lng: -75.1652, radius: 15000 },
  sanantonio:     { lat: 29.4241, lng: -98.4936, radius: 15000 },
  sandiego:       { lat: 32.7157, lng: -117.1611, radius: 15000 },
  dallas:         { lat: 32.7767, lng: -96.7970, radius: 18000 },
  sanjose:        { lat: 37.3382, lng: -121.8863, radius: 15000 },
  austin:         { lat: 30.2672, lng: -97.7431, radius: 15000 },
  seattle:        { lat: 47.6062, lng: -122.3321, radius: 15000 },
  miami:          { lat: 25.7617, lng: -80.1918, radius: 15000 },
  boston:         { lat: 42.3601, lng: -71.0589, radius: 12000 },
  // Canada
  toronto:        { lat: 43.6532, lng: -79.3832, radius: 20000 },
  vancouver:      { lat: 49.2827, lng: -123.1207, radius: 15000 },
  montreal:       { lat: 45.5017, lng: -73.5673, radius: 18000 },
  calgary:        { lat: 51.0447, lng: -114.0719, radius: 15000 },
  // Brazil
  saopaulo:       { lat: -23.5505, lng: -46.6333, radius: 25000 },
  riodejaneiro:   { lat: -22.9068, lng: -43.1729, radius: 20000 },
  brasilia:       { lat: -15.7975, lng: -47.8919, radius: 15000 },
  // UAE
  dubai:          { lat: 25.2048, lng: 55.2708, radius: 20000 },
  abudhabi:       { lat: 24.4539, lng: 54.3773, radius: 18000 },
  // Saudi Arabia
  riyadh:         { lat: 24.7136, lng: 46.6753, radius: 20000 },
  jeddah:         { lat: 21.2854, lng: 39.2376, radius: 18000 },
  // Egypt
  cairo:          { lat: 30.0444, lng: 31.2357, radius: 20000 },
  alexandria:     { lat: 31.2001, lng: 29.9187, radius: 15000 },
  // Morocco
  casablanca:     { lat: 33.5731, lng: -7.5898, radius: 15000 },
  rabat:          { lat: 34.0209, lng: -6.8417, radius: 12000 },
  // India
  mumbai:         { lat: 19.0760, lng: 72.8777, radius: 22000 },
  delhi:          { lat: 28.6139, lng: 77.2090, radius: 25000 },
  bengaluru:      { lat: 12.9716, lng: 77.5946, radius: 20000 },
  hyderabad:      { lat: 17.3850, lng: 78.4867, radius: 18000 },
  chennai:        { lat: 13.0827, lng: 80.2707, radius: 18000 },
  kolkata:        { lat: 22.5726, lng: 88.3639, radius: 18000 },
  // China
  beijing:        { lat: 39.9042, lng: 116.4074, radius: 25000 },
  shanghai:       { lat: 31.2304, lng: 121.4737, radius: 25000 },
  guangzhou:      { lat: 23.1291, lng: 113.2644, radius: 20000 },
  shenzhen:       { lat: 22.5431, lng: 114.0579, radius: 18000 },
  // Japan
  tokyo:          { lat: 35.6762, lng: 139.6503, radius: 25000 },
  osaka:          { lat: 34.6937, lng: 135.5023, radius: 18000 },
  // South Korea
  seoul:          { lat: 37.5665, lng: 126.9780, radius: 20000 },
  busan:          { lat: 35.1796, lng: 129.0756, radius: 15000 },
  // Singapore
  singapore:      { lat: 1.3521,  lng: 103.8198, radius: 15000 },
  // Australia
  sydney:         { lat: -33.8688, lng: 151.2093, radius: 20000 },
  melbourne:      { lat: -37.8136, lng: 144.9631, radius: 20000 },
  brisbane:       { lat: -27.4698, lng: 153.0251, radius: 15000 },
  // South Africa
  johannesburg:   { lat: -26.2041, lng: 28.0473, radius: 20000 },
  capetown:       { lat: -33.9249, lng: 18.4241, radius: 15000 },
  // Russia
  moscow:         { lat: 55.7558, lng: 37.6173, radius: 25000 },
  saintpetersburg:{ lat: 59.9311, lng: 30.3609, radius: 20000 },
  // Poland
  warsaw:         { lat: 52.2297, lng: 21.0122, radius: 18000 },
  krakow:         { lat: 50.0647, lng: 19.9450, radius: 12000 },
  // Ukraine
  kyiv:           { lat: 50.4501, lng: 30.5234, radius: 18000 },
  // Argentina
  buenosaires:    { lat: -34.6037, lng: -58.3816, radius: 20000 },
  // Mexico
  mexicocity:     { lat: 19.4326, lng: -99.1332, radius: 22000 },
  guadalajara:    { lat: 20.6597, lng: -103.3496, radius: 15000 },
  // Indonesia
  jakarta:        { lat: -6.2088, lng: 106.8456, radius: 22000 },
  // Pakistan
  karachi:        { lat: 24.8607, lng: 67.0011, radius: 20000 },
  lahore:         { lat: 31.5204, lng: 74.3587, radius: 18000 },
  // Nigeria
  lagos:          { lat: 6.5244,  lng: 3.3792,  radius: 20000 },
  abuja:          { lat: 9.0579,  lng: 7.4951,  radius: 15000 },
  // Kenya
  nairobi:        { lat: -1.2921, lng: 36.8219, radius: 15000 },
};

function normCityKey(city: string): string {
  return city.toLowerCase()
    .replace(/[İ]/g, 'i').replace(/[ı]/g, 'i')
    .replace(/[áàâã]/g, 'a').replace(/[ä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõ]/g, 'o').replace(/[ö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c')
    .replace(/[ş]/g, 's').replace(/[ğ]/g, 'g')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z]/g, '');
}

function getCityCoords(city: string) {
  return CITY_COORDS[normCityKey(city)] || null;
}

// ── District expansion for large cities ──────────────────────────────────────
const DISTRICTS: Record<string, string[]> = {
  istanbul: ['Kadıköy','Beşiktaş','Şişli','Bakırköy','Üsküdar','Fatih','Ataşehir','Maltepe','Pendik','Kartal','Bağcılar','Bahçelievler','Beyoğlu','Esenyurt','Kağıthane','Sarıyer','Zeytinburnu','Beylikdüzü','Avcılar','Güngören'],
  ankara:   ['Çankaya','Keçiören','Mamak','Yenimahalle','Etimesgut','Sincan','Altındağ','Pursaklar','Gölbaşı','Polatlı'],
  izmir:    ['Konak','Bornova','Karşıyaka','Buca','Çiğli','Menemen','Bayraklı','Gaziemir','Balçova','Narlıdere'],
  paris:    ['Paris 1er','Paris 3e','Paris 8e','Paris 11e','Paris 13e','Paris 15e','Paris 17e','Saint-Denis','Boulogne-Billancourt','Levallois-Perret','Montreuil'],
  berlin:   ['Mitte','Prenzlauer Berg','Kreuzberg','Friedrichshain','Charlottenburg','Neukölln','Tempelhof','Spandau','Pankow','Steglitz'],
  london:   ['City of London','Shoreditch','Camden','Hackney','Islington','Southwark','Lambeth','Wandsworth','Greenwich','Canary Wharf'],
};

function getDistricts(city: string, maxResults: number): string[] {
  if (maxResults <= 100) return [city];
  return DISTRICTS[normCityKey(city)] || [city];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
}

function validatePhone(phone: string, country: string): string | null {
  if (!phone) return null;
  const p = cleanPhone(phone);
  if (p.length < 7) return null;
  if (country === 'TR') {
    if (p.startsWith('+90') && p.length === 13) return p;
    if (p.startsWith('90') && p.length === 12) return '+' + p;
    if (p.startsWith('0') && p.length === 11) return '+90' + p.slice(1);
    if (p.length === 10) return '+90' + p;
    return p;
  }
  if (country === 'FR') {
    if (p.startsWith('+33')) return p;
    if (p.startsWith('0') && p.length === 10) return '+33' + p.slice(1);
  }
  if (country === 'DE') {
    if (p.startsWith('+49')) return p;
  }
  if (country === 'GB') {
    if (p.startsWith('+44')) return p;
    if (p.startsWith('0') && p.length >= 10) return '+44' + p.slice(1);
  }
  return p.length >= 7 ? p : null;
}

// ── Email Discovery ───────────────────────────────────────────────────────────
const EMAIL_BLACKLIST = new Set([
  'example.com','test.com','domain.com','email.com','noreply',
  'no-reply','sentry.io','wixpress.com','squarespace.com',
  'wordpress.com','cloudflare.com','google.com','schema.org',
]);

const EMAIL_REGEX = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;

function isValidEmail(email: string): boolean {
  if (email.length > 80) return false;
  const domain = email.split('@')[1] || '';
  if (EMAIL_BLACKLIST.has(domain)) return false;
  if (domain.includes('.jpg') || domain.includes('.png')) return false;
  if (/\d{4,}/.test(domain)) return false; // numeric-heavy domains are usually artifacts
  return true;
}

function rankEmail(email: string): number {
  const local = email.split('@')[0].toLowerCase();
  if (['info','iletisim','contact','hello','mail','sales','hola'].includes(local)) return 10;
  if (['bilgi','destek','support','office'].includes(local)) return 8;
  if (local.length < 15) return 5; // shorter locals are usually real
  return 2;
}

async function discoverEmail(website: string): Promise<string | null> {
  if (!website) return null;
  const base = website.startsWith('http') ? website : `https://${website}`;

  const contactPaths = ['', '/contact', '/iletisim', '/about', '/hakkimizda',
    '/contact-us', '/bize-ulasin', '/contacto', '/kontakt', '/impressum'];

  for (const path of contactPaths) {
    try {
      const resp = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(6000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          'Accept': 'text/html',
        },
      });
      if (!resp.ok) continue;
      const html = await resp.text();

      // Decode HTML entities first
      const decoded = html
        .replace(/&amp;/g, '&')
        .replace(/&#64;/g, '@')
        .replace(/\[at\]/gi, '@')
        .replace(/\(at\)/gi, '@')
        .replace(/&#x40;/gi, '@');

      const found = (decoded.match(EMAIL_REGEX) || []).filter(isValidEmail);
      if (found.length === 0) continue;

      // Sort by preference
      found.sort((a, b) => rankEmail(b) - rankEmail(a));
      return found[0];
    } catch { continue; }
  }
  return null;
}

// Run email discovery with bounded concurrency
async function enrichWithEmails(
  leads: any[],
  onProgress?: (enriched: number) => void
): Promise<any[]> {
  const CONCURRENCY = 6;
  let enriched = 0;

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (lead) => {
        if (!lead.website) return;
        try {
          const email = await discoverEmail(lead.website);
          if (email) lead.email = email;
        } catch {}
        enriched++;
        onProgress?.(enriched);
      })
    );
  }

  return leads;
}

// ── 10-Signal Lead Quality Score ─────────────────────────────────────────────
function calcScore(place: any, emailFound?: boolean): number {
  let score = 0;

  // Phone validity (+20)
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
  if (phone && cleanPhone(phone).length >= 7) score += 20;

  // Email discovered (+25 — biggest signal)
  if (emailFound) score += 25;

  // Has website (+10)
  if (place.websiteUri) score += 10;

  // Review quality (+15 max)
  const rating = place.rating || 0;
  const reviews = place.userRatingCount || 0;
  if (rating >= 4.5) score += 15;
  else if (rating >= 4.0) score += 10;
  else if (rating >= 3.0) score += 5;

  // Review volume (+10 max)
  if (reviews >= 50) score += 10;
  else if (reviews >= 20) score += 7;
  else if (reviews >= 5) score += 4;

  // Business is open / has hours (+5)
  if (place.regularOpeningHours?.periods?.length > 0) score += 5;

  // Has primary type / category (+5)
  if (place.primaryTypeDisplayName || place.types?.length > 0) score += 5;

  // Has photos (+5)
  if (place.photos?.length > 0) score += 5;

  return Math.min(score, 100);
}

// ── Google Places API fetch ───────────────────────────────────────────────────
async function fetchPlacesPage(opts: {
  query: string;
  lang: string;
  coords?: { lat: number; lng: number; radius: number };
  pageToken?: string;
}): Promise<{ places: any[]; nextPageToken: string | null }> {
  const body: any = {
    textQuery: opts.query,
    languageCode: opts.lang,
    maxResultCount: 20,
  };
  if (opts.pageToken) body.pageToken = opts.pageToken;
  if (opts.coords && !opts.pageToken) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.coords.lat, longitude: opts.coords.lng },
        radius: opts.coords.radius,
      },
    };
  }

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY!,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours,places.primaryTypeDisplayName,places.photos',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`Places API error: ${await resp.text()}`);
  const data: any = await resp.json();
  return { places: data.places || [], nextPageToken: data.nextPageToken || null };
}

// ── Keyword expansion ─────────────────────────────────────────────────────────
function expandKeywords(base: string): string[] {
  const b = base.trim();
  return [
    b,
    `${b} firması`,
    `${b} mağazası`,
    `${b} şirketi`,
    `${b} toptancısı`,
    `${b} imalatçı`,
    `${b} satış`,
    `${b} toptan`,
  ].filter((v, i, a) => a.indexOf(v) === i);
}

// ── Core scraping engine ──────────────────────────────────────────────────────
async function scrapeLeads(opts: {
  keyword: string;
  city: string;
  country: string;
  maxResults: number;
  userId: string;
  minScore?: number;
  requirePhone?: boolean;
  requireWebsite?: boolean;
  discoverEmails?: boolean;
  onProgress?: (phase: string, found: number, saved: number, enriched: number) => void;
}): Promise<{ saved: number; skipped: number; stats: { withPhone: number; withEmail: number; withWebsite: number }; apiError?: string }> {
  const {
    keyword, city, country, maxResults, userId,
    minScore = 0, requirePhone = false, requireWebsite = false,
    discoverEmails = false, onProgress,
  } = opts;
  let firstApiError: string | null = null;

  const lang: Record<string, string> = {
    // Europe
    TR: 'tr', DE: 'de', FR: 'fr', GB: 'en', IT: 'it', ES: 'es', NL: 'nl', BE: 'fr',
    PL: 'pl', PT: 'pt', RO: 'ro', CZ: 'cs', HU: 'hu', SE: 'sv', AT: 'de', CH: 'de',
    NO: 'no', DK: 'da', FI: 'fi', GR: 'el', SK: 'sk', BG: 'bg', HR: 'hr', RS: 'sr',
    UA: 'uk', IE: 'en', AL: 'sq', BY: 'be', BA: 'bs', CY: 'el', EE: 'et', IS: 'is',
    LV: 'lv', LT: 'lt', LU: 'fr', MT: 'mt', MD: 'ro', ME: 'sr', MK: 'mk', RU: 'ru',
    SI: 'sl', XK: 'sq', LI: 'de', MC: 'fr',
    // Middle East & Gulf
    AE: 'ar', SA: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', OM: 'ar', IL: 'he',
    JO: 'ar', LB: 'ar', IQ: 'ar', IR: 'fa', SY: 'ar', YE: 'ar', PS: 'ar',
    // North Africa
    EG: 'ar', MA: 'ar', TN: 'ar', DZ: 'ar', LY: 'ar', SD: 'ar',
    // North America
    US: 'en', CA: 'en', MX: 'es',
    // South America
    BR: 'pt', AR: 'es', CL: 'es', CO: 'es', PE: 'es', VE: 'es', EC: 'es',
    BO: 'es', PY: 'es', UY: 'es', GY: 'en', SR: 'nl',
    // Central America & Caribbean
    GT: 'es', BZ: 'en', HN: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es',
    CU: 'es', DO: 'es', HT: 'fr', JM: 'en', TT: 'en',
    // Asia
    CN: 'zh', JP: 'ja', KR: 'ko', TW: 'zh', HK: 'zh', SG: 'en', MY: 'ms',
    TH: 'th', VN: 'vi', ID: 'id', PH: 'tl', KZ: 'kk', UZ: 'uz', AZ: 'az',
    GE: 'ka', AM: 'hy', TM: 'tk', KG: 'ky', TJ: 'tg', MN: 'mn', MM: 'my',
    KH: 'km', LA: 'lo',
    // South & Southeast Asia
    IN: 'hi', PK: 'ur', BD: 'bn', LK: 'si', NP: 'ne', AF: 'fa',
    // Africa
    ZA: 'en', NG: 'en', KE: 'sw', ET: 'am', GH: 'en', TZ: 'sw', UG: 'en',
    SN: 'fr', CI: 'fr', CM: 'fr', AO: 'pt', MZ: 'pt', MG: 'fr', ZM: 'en',
    ZW: 'en', RW: 'rw',
    // Oceania
    AU: 'en', NZ: 'en', FJ: 'en', PG: 'en',
  };
  const countryName: Record<string, string> = {
    // Europe
    TR: 'Turkey', DE: 'Germany', FR: 'France', GB: 'United Kingdom', IT: 'Italy',
    ES: 'Spain', NL: 'Netherlands', BE: 'Belgium', PL: 'Poland', PT: 'Portugal',
    RO: 'Romania', CZ: 'Czech Republic', HU: 'Hungary', SE: 'Sweden', AT: 'Austria',
    CH: 'Switzerland', NO: 'Norway', DK: 'Denmark', FI: 'Finland', GR: 'Greece',
    SK: 'Slovakia', BG: 'Bulgaria', HR: 'Croatia', RS: 'Serbia', UA: 'Ukraine',
    IE: 'Ireland', AL: 'Albania', BY: 'Belarus', BA: 'Bosnia and Herzegovina',
    CY: 'Cyprus', EE: 'Estonia', IS: 'Iceland', XK: 'Kosovo', LV: 'Latvia',
    LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MT: 'Malta',
    MD: 'Moldova', MC: 'Monaco', ME: 'Montenegro', MK: 'North Macedonia',
    RU: 'Russia', SI: 'Slovenia',
    // Middle East & Gulf
    AE: 'United Arab Emirates', SA: 'Saudi Arabia', QA: 'Qatar', KW: 'Kuwait',
    BH: 'Bahrain', OM: 'Oman', IL: 'Israel', JO: 'Jordan', LB: 'Lebanon',
    IQ: 'Iraq', IR: 'Iran', SY: 'Syria', YE: 'Yemen', PS: 'Palestine',
    // North Africa
    EG: 'Egypt', MA: 'Morocco', TN: 'Tunisia', DZ: 'Algeria', LY: 'Libya', SD: 'Sudan',
    // North America
    US: 'United States', CA: 'Canada', MX: 'Mexico',
    // South America
    BR: 'Brazil', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru',
    VE: 'Venezuela', EC: 'Ecuador', BO: 'Bolivia', PY: 'Paraguay', UY: 'Uruguay',
    GY: 'Guyana', SR: 'Suriname',
    // Central America & Caribbean
    GT: 'Guatemala', BZ: 'Belize', HN: 'Honduras', SV: 'El Salvador',
    NI: 'Nicaragua', CR: 'Costa Rica', PA: 'Panama', CU: 'Cuba',
    DO: 'Dominican Republic', HT: 'Haiti', JM: 'Jamaica', TT: 'Trinidad and Tobago',
    // Asia
    CN: 'China', JP: 'Japan', KR: 'South Korea', TW: 'Taiwan', HK: 'Hong Kong',
    SG: 'Singapore', MY: 'Malaysia', TH: 'Thailand', VN: 'Vietnam', ID: 'Indonesia',
    PH: 'Philippines', KZ: 'Kazakhstan', UZ: 'Uzbekistan', AZ: 'Azerbaijan',
    GE: 'Georgia', AM: 'Armenia', TM: 'Turkmenistan', KG: 'Kyrgyzstan',
    TJ: 'Tajikistan', MN: 'Mongolia', MM: 'Myanmar', KH: 'Cambodia', LA: 'Laos',
    // South & Southeast Asia
    IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal', AF: 'Afghanistan',
    // Africa
    ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', ET: 'Ethiopia', GH: 'Ghana',
    TZ: 'Tanzania', UG: 'Uganda', SN: 'Senegal', CI: "Cote d'Ivoire", CM: 'Cameroon',
    AO: 'Angola', MZ: 'Mozambique', MG: 'Madagascar', ZM: 'Zambia', ZW: 'Zimbabwe',
    RW: 'Rwanda',
    // Oceania
    AU: 'Australia', NZ: 'New Zealand', FJ: 'Fiji', PG: 'Papua New Guinea',
  };

  // Load existing leads for deduplication
  const { data: existing } = await supabase
    .from('leads')
    .select('company_name, phone')
    .eq('user_id', userId)
    .limit(3000);

  const existingNames = new Set((existing || []).map((l: any) => (l.company_name || '').toLowerCase().trim()));
  const existingPhones = new Set((existing || []).map((l: any) => l.phone).filter(Boolean));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const collected: any[] = [];
  let skippedDuplicates = 0;

  const keywords = expandKeywords(keyword);
  const districts = getDistricts(city, maxResults);
  const coords = getCityCoords(city);
  const cName = countryName[country] || country;
  const langCode = lang[country] || 'en';

  let queryIdx = 0;

  onProgress?.('Tarama başlatılıyor...', 0, 0, 0);

  outer:
  for (const district of districts) {
    const location = district.toLowerCase() === city.toLowerCase()
      ? `${city} ${cName}`
      : `${district} ${city} ${cName}`;

    for (const kw of keywords) {
      if (collected.length >= maxResults) break outer;

      const query = `${kw} ${location}`;
      let pageToken: string | null = null;
      let pages = 0;

      do {
        if (collected.length >= maxResults) break;
        try {
          const { places, nextPageToken } = await fetchPlacesPage({
            query,
            lang: langCode,
            coords: coords && !pageToken ? coords : undefined,
            pageToken: pageToken || undefined,
          });

          for (const p of places) {
            if (collected.length >= maxResults) break;
            if (p.businessStatus === 'CLOSED_PERMANENTLY') continue;
            if (seenIds.has(p.id)) continue;

            const name = (p.displayName?.text || '').trim();
            if (!name) continue;
            const nameLower = name.toLowerCase();
            const phone = validatePhone(
              p.nationalPhoneNumber || p.internationalPhoneNumber || '',
              country
            );

            // Dedup against CRM and within batch
            if (existingNames.has(nameLower) || seenNames.has(nameLower)) { skippedDuplicates++; continue; }
            if (phone && existingPhones.has(phone)) { skippedDuplicates++; continue; }

            // Quality filter: require phone
            if (requirePhone && !phone) continue;
            // Quality filter: require website
            if (requireWebsite && !p.websiteUri) continue;

            seenIds.add(p.id);
            seenNames.add(nameLower);

            const score = calcScore(p);
            if (score < minScore) continue;

            collected.push({
              _placeId: p.id,
              name,
              phone: phone || null,
              website: p.websiteUri || null,
              address: p.formattedAddress || null,
              rating: p.rating || null,
              reviewCount: p.userRatingCount || 0,
              score,
              district: district.toLowerCase() !== city.toLowerCase() ? district : null,
              email: null as string | null,
            });
          }

          pageToken = nextPageToken;
          pages++;
          onProgress?.(`"${kw}" taranıyor...`, collected.length, 0, 0);
          if (pageToken) await sleep(2200);
        } catch (e: any) {
          console.error(`[Scrape] query "${query}" failed:`, e.message);
          if (!firstApiError) firstApiError = e.message;
          break;
        }
      } while (pageToken && pages < 3);

      queryIdx++;
      if (queryIdx % 4 === 0 && collected.length < maxResults) await sleep(300);
    }
  }

  // ── Email discovery phase ──────────────────────────────────────────────────
  if (discoverEmails && collected.length > 0) {
    onProgress?.(`${collected.length} lead için email aranıyor...`, collected.length, 0, 0);
    await enrichWithEmails(collected, (enrichedN: number) => {
      onProgress?.(`Email keşfi: ${enrichedN}/${collected.length}`, collected.length, 0, enrichedN);
    });
    // Recalculate scores now that we know which leads have emails
    for (const lead of collected) {
      lead.score = Math.min(100, lead.score + (lead.email ? 25 : 0));
    }
  }

  // ── Filter leads that now meet minScore (after email enrichment) ───────────
  const finalLeads = collected.filter(l => l.score >= minScore);

  if (!finalLeads.length) {
    return { saved: 0, skipped: skippedDuplicates, stats: { withPhone: 0, withEmail: 0, withWebsite: 0 }, apiError: firstApiError || undefined };
  }

  // ── Batch insert ──────────────────────────────────────────────────────────
  const leadsToInsert = finalLeads.map(l => ({
    user_id: userId,
    company_name: l.name,
    phone: l.phone,
    email: l.email,
    website: l.website,
    city: l.district ? `${l.district}, ${city}` : city,
    sector: keyword,
    source: 'Google Maps',
    status: 'new',
    score: l.score,
    notes: l.address || null,
  }));

  let totalSaved = 0;
  let insertError: string | null = null;
  for (let i = 0; i < leadsToInsert.length; i += 50) {
    const batch = leadsToInsert.slice(i, i + 50);
    const { data, error } = await supabase.from('leads').insert(batch).select('id');
    if (error) {
      console.error('[Scrape] Supabase insert error:', error.message, error.details);
      if (!insertError) insertError = `Veritabanı hatası: ${error.message}`;
    }
    if (data) totalSaved += data.length;
    onProgress?.('Kaydediliyor...', finalLeads.length, totalSaved, 0);
  }

  const stats = {
    withPhone: finalLeads.filter(l => l.phone).length,
    withEmail: finalLeads.filter(l => l.email).length,
    withWebsite: finalLeads.filter(l => l.website).length,
  };

  return { saved: totalSaved, skipped: skippedDuplicates, stats, apiError: firstApiError || insertError || undefined };
}

// ── POST /api/scrape/google-maps ──────────────────────────────────────────────
router.post('/google-maps', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const {
      keyword, city, country = 'TR', maxResults = 20,
      minScore = 0, requirePhone = false, requireWebsite = false,
      discoverEmails = false,
    } = req.body;

    if (!keyword || !city) {
      return res.status(400).json({ error: 'keyword ve city zorunlu' });
    }

    const limit = Math.max(10, Math.min(Number(maxResults), 1000));

    // Credit check
    const { data: userData } = await supabase
      .from('users')
      .select('credits_total, credits_used')
      .eq('id', userId)
      .single();

    const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
    if (available < limit) {
      return res.status(400).json({
        error: `Yetersiz kredi. Gerekli: ${limit}, Mevcut: ${available}`,
        needCredits: limit - available,
      });
    }

    // No API key → mock
    if (!GOOGLE_API_KEY) {
      const count = Math.min(8, limit);
      const mock = Array.from({ length: count }, (_, i) => ({
        user_id: userId,
        company_name: `${keyword} Firması ${i + 1}`,
        phone: `+9053${Math.floor(Math.random() * 10000000 + 10000000)}`,
        email: i % 3 === 0 ? `info@firma${i}.com` : null,
        website: i % 2 === 0 ? `https://firma${i}.com` : null,
        city, sector: keyword, source: 'Google Maps',
        status: 'new', score: Math.floor(Math.random() * 40 + 50),
        notes: `${city} (Test verisi)`,
      }));
      const { data: saved, error } = await supabase.from('leads').insert(mock).select();
      if (error) throw error;
      return res.json({
        message: `${saved.length} test lead eklendi`, count: saved.length,
        stats: { withPhone: saved.length, withEmail: Math.floor(saved.length / 3), withWebsite: Math.floor(saved.length / 2) },
      });
    }

    // Large requests → background job
    if (limit > 100 || discoverEmails) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      jobs.set(jobId, {
        status: 'running', total: limit, found: 0, saved: 0, enriched: 0,
        withPhone: 0, withEmail: 0, withWebsite: 0,
        keyword, city, country, phase: 'Başlatılıyor...', startedAt: Date.now(),
      });

      // Reserve credits
      await supabase.from('users').update({ credits_used: (userData.credits_used || 0) + limit }).eq('id', userId);

      scrapeLeads({
        keyword, city, country, maxResults: limit,
        userId, minScore, requirePhone, requireWebsite, discoverEmails,
        onProgress: (phase, found, saved, enriched) => {
          const j = jobs.get(jobId);
          if (j) {
            j.phase = phase; j.found = found; j.saved = saved; j.enriched = enriched;
            if (found > j.total) j.total = found; // dynamic update if more found
          }
        },
      }).then(({ saved: count, skipped, stats, apiError }) => {
        const j = jobs.get(jobId);
        if (j) {
          j.status = count === 0 && apiError ? 'error' : 'done';
          j.saved = count;
          j.withPhone = stats.withPhone; j.withEmail = stats.withEmail; j.withWebsite = stats.withWebsite;
          if (skipped > 0) j.phase = `${count} kaydedildi, ${skipped} tekrar atlandı`;
          if (count === 0 && apiError) j.error = `Google Places API hatası: ${apiError}`;
        }
        // Refund unused credits
        const diff = limit - count;
        if (diff > 0) {
          supabase.from('users').update({ credits_used: Math.max(0, (userData.credits_used || 0) + count) }).eq('id', userId);
        }
      }).catch(e => {
        const j = jobs.get(jobId);
        if (j) { j.status = 'error'; j.error = e.message; }
        supabase.from('users').update({ credits_used: userData.credits_used || 0 }).eq('id', userId);
      });

      return res.json({ jobId, async: true, total: limit, message: 'Arka planda çalışıyor...' });
    }

    // Small synchronous request
    const { saved, skipped, stats, apiError } = await scrapeLeads({
      keyword, city, country, maxResults: limit,
      userId, minScore, requirePhone, requireWebsite, discoverEmails: false,
    });

    await supabase.from('users').update({
      credits_used: (userData.credits_used || 0) + saved,
    }).eq('id', userId);

    if (saved === 0 && apiError) {
      return res.status(502).json({
        error: `Google Places API hatası: ${apiError}. Lütfen API anahtarını ve kota limitini kontrol edin.`,
        apiError,
      });
    }

    res.json({ message: `${saved} lead başarıyla eklendi!`, count: saved, skipped, stats });

  } catch (e: any) {
    console.error('[Scrape] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/scrape/test-key — diagnose Google Places API connectivity ──────────
router.get('/test-key', async (req: any, res: any) => {
  if (!GOOGLE_API_KEY) {
    return res.json({ ok: false, error: 'GOOGLE_PLACES_API_KEY ortam değişkeni tanımlı değil.' });
  }
  const q = (req.query.q as string) || 'coffee Istanbul Turkey';
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.nationalPhoneNumber',
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 5, languageCode: 'tr' }),
    });
    const data: any = await r.json();
    if (!r.ok) {
      return res.json({ ok: false, httpStatus: r.status, error: data.error?.message || JSON.stringify(data), query: q });
    }
    return res.json({
      ok: true,
      query: q,
      found: data.places?.length || 0,
      samples: (data.places || []).slice(0, 3).map((p: any) => p.displayName?.text),
    });
  } catch (e: any) {
    return res.json({ ok: false, error: e.message, query: q });
  }
});

// ── GET /api/scrape/job/:jobId ─────────────────────────────────────────────────
router.get('/job/:jobId', (req: any, res: any) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job bulunamadı' });
  res.json(job);
});

module.exports = router;
