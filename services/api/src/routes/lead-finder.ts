export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const GOOGLE_KEY  = process.env.GOOGLE_PLACES_API_KEY;
const YELP_KEY    = process.env.YELP_API_KEY;
const FSQ_KEY     = process.env.FOURSQUARE_API_KEY;
const HERE_KEY    = process.env.HERE_API_KEY;
const CH_KEY      = process.env.UK_COMPANIES_HOUSE_KEY;
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const OC_KEY      = process.env.OPENCORPORATES_KEY; // free key: opencorporates.com/api_accounts/new

// OpenCorporates jurisdiction codes (ISO-2 → OC jurisdiction)
const OC_JURISDICTION: Record<string, string> = {
  TR: 'tr', DE: 'de', FR: 'fr', GB: 'gb', IT: 'it', ES: 'es', NL: 'nl',
  BE: 'be', PL: 'pl', PT: 'pt', CZ: 'cz', HU: 'hu', SE: 'se', AT: 'at',
  CH: 'ch', NO: 'no', DK: 'dk', FI: 'fi', GR: 'gr', RO: 'ro', SK: 'sk',
  HR: 'hr', SI: 'si', BG: 'bg', LT: 'lt', LV: 'lv', EE: 'ee', IE: 'ie',
  LU: 'lu', CY: 'cy', MT: 'mt', AU: 'au', NZ: 'nz', SG: 'sg', IN: 'in',
  JP: 'jp', KR: 'kr', HK: 'hk', ZA: 'za', BR: 'br', AR: 'ar', MX: 'mx',
  AE: 'ae', US: 'us_de', CA: 'ca_on',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawLead {
  company_name: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  review_count?: number | null;
  category?: string | null;
  source: string;
  sources?: string[];
  place_id?: string;
  external_id?: string;
  score?: number;
  searchCity?: string;
}

interface SourceStat {
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  count: number;
}

interface FinderJob {
  status: 'running' | 'done' | 'error';
  sources: Record<string, SourceStat>;
  found: number;
  saved: number;
  skipped: number;
  total: number;
  query: string;
  city: string;
  phase: string;
  error?: string;
  startedAt: number;
  leadIds?: string[];
  listName?: string;
  userId?: string;
}

// ── Job store ─────────────────────────────────────────────────────────────────

const jobs = new Map<string, FinderJob>();

setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.startedAt < cutoff) jobs.delete(id);
  }
}, 30 * 60 * 1000);

function createJob(query: string, cities: string[], total: number, userId: string, listName?: string): FinderJob {
  const city = cities.join(', ');
  return {
    status: 'running',
    sources: {
      google:     { status: GOOGLE_KEY  ? 'pending' : 'skipped', count: 0 },
      apify:      { status: APIFY_TOKEN ? 'pending' : 'skipped', count: 0 },
      osm:        { status: 'pending', count: 0 },
      yelp:       { status: YELP_KEY    ? 'pending' : 'skipped', count: 0 },
      foursquare: { status: FSQ_KEY     ? 'pending' : 'skipped', count: 0 },
      here:       { status: HERE_KEY    ? 'pending' : 'skipped', count: 0 },
      registry:   { status: 'pending', count: 0 },
    },
    found: 0, saved: 0, skipped: 0, total,
    query, city, phase: 'Başlatılıyor...', startedAt: Date.now(),
    leadIds: [], userId, listName,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function normalizePhone(p: string): string {
  return p.replace(/\D/g, '').slice(-10);
}

function normalizeName(s: string): string {
  return s.toLowerCase()
    .replace(/\s+(ltd|a\.ş|aş|anonim|şirketi|limited|tic|san|ve|co|inc|gmbh|bv|srl|sarl|llc)\b/gi, '')
    .replace(/[İ]/g, 'i').replace(/[ı]/g, 'i').replace(/[ğ]/g, 'g')
    .replace(/[ş]/g, 's').replace(/[ç]/g, 'c').replace(/[ö]/g, 'o').replace(/[ü]/g, 'u')
    .replace(/[^a-z0-9]/g, '').trim();
}

function normKey(s: string): string {
  return s.toLowerCase()
    .replace(/[İ]/g, 'i').replace(/[ı]/g, 'i')
    .replace(/[öó]/g, 'o').replace(/[üú]/g, 'u')
    .replace(/[ğ]/g, 'g').replace(/[ş]/g, 's').replace(/[ç]/g, 'c')
    .replace(/[áà]/g, 'a').replace(/[é]/g, 'e')
    .replace(/[^a-z0-9]/g, '');
}

// ── Source 1: Google Places Grid Search ───────────────────────────────────────
// Divides city into an N×N grid, runs Text Search at each cell for maximum coverage.
// The critical fix: nextPageToken must NOT appear in X-Goog-FieldMask.

const GOOGLE_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,' +
  'places.nationalPhoneNumber,places.internationalPhoneNumber,' +
  'places.websiteUri,places.rating,places.userRatingCount,' +
  'places.primaryTypeDisplayName,places.location';

async function googleGridSearch(params: {
  query: string;
  lat: number;
  lng: number;
  radiusKm: number;
  targetCount: number;
  langCode: string;
  onCount?: (n: number) => void;
}): Promise<RawLead[]> {
  if (!GOOGLE_KEY) return [];

  const leads: RawLead[] = [];
  const seenIds = new Set<string>();

  // Grid size scales with target count — larger grids give better coverage
  const gridSize = params.targetCount <= 30  ? 2
                 : params.targetCount <= 80  ? 3
                 : params.targetCount <= 200 ? 4
                 : params.targetCount <= 500 ? 5 : 6;

  const stepLatDeg = (params.radiusKm * 2 / gridSize) / 111;
  const cosLat     = Math.cos(params.lat * Math.PI / 180);
  const stepLngDeg = stepLatDeg / (cosLat || 1);
  const cellRadiusM = (params.radiusKm / gridSize) * 1000 * 1.5; // overlap cells slightly

  const gridPoints: { lat: number; lng: number }[] = [];
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      gridPoints.push({
        lat: params.lat - params.radiusKm / 111 + i * stepLatDeg + stepLatDeg / 2,
        lng: params.lng - (params.radiusKm / 111 / cosLat) + j * stepLngDeg + stepLngDeg / 2,
      });
    }
  }

  // Two query variations per grid cell: full keyword + first word (broader match)
  const words = params.query.trim().split(/\s+/);
  const queryVariants = [params.query, words[0]].filter((v, i, a) => a.indexOf(v) === i);

  // Gather up to targetCount * 4 raw leads to have buffer after CRM dedup
  const rawCap = params.targetCount * 4;

  outer:
  for (const point of gridPoints) {
    for (const queryText of queryVariants) {
      if (leads.length >= rawCap) break outer;

      let pageToken: string | null = null;
      let page = 0;

      do {
        if (leads.length >= rawCap) break;
        try {
          const body: any = { textQuery: queryText, languageCode: params.langCode, maxResultCount: 20 };
          if (pageToken) {
            body.pageToken = pageToken;
          } else {
            body.locationBias = {
              circle: { center: { latitude: point.lat, longitude: point.lng }, radius: cellRadiusM },
            };
          }

          const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_KEY!,
              'X-Goog-FieldMask': GOOGLE_FIELD_MASK,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(8000),
          });

          if (!resp.ok) {
            const err = await resp.text();
            console.error('[LeadFinder] Google error:', err.slice(0, 150));
            break;
          }

          const data: any = await resp.json();
          for (const p of data.places || []) {
            if (!p.id || seenIds.has(p.id)) continue;
            seenIds.add(p.id);
            const name = p.displayName?.text || '';
            if (!name) continue;
            leads.push({
              source: 'google',
              place_id: p.id,
              company_name: name,
              phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
              website: p.websiteUri || null,
              address: p.formattedAddress || null,
              lat: p.location?.latitude ?? null,
              lng: p.location?.longitude ?? null,
              rating: p.rating || null,
              review_count: p.userRatingCount || null,
              category: p.primaryTypeDisplayName?.text || null,
            });
          }

          pageToken = data.nextPageToken || null;
          page++;
          params.onCount?.(leads.length);
          if (pageToken) await sleep(2100);
        } catch (e: any) {
          console.error('[LeadFinder] Google fetch error:', e.message?.slice(0, 80));
          break;
        }
      } while (pageToken && page < 3);

      await sleep(80); // brief pause between grid cells
    }
  }

  return leads;
}

// ── Source 2: Apify Google Maps Scraper (APIFY_TOKEN required) ───────────────
// Uses compass/crawler-google-places — bypasses Places API limits entirely.

async function apifySearch(params: {
  query: string;
  city: string;
  countryName: string;
  langCode: string;
  targetCount: number;
}): Promise<RawLead[]> {
  if (!APIFY_TOKEN) return [];
  const { ApifyClient } = require('apify-client');
  const client = new ApifyClient({ token: APIFY_TOKEN });
  const searchTerm = `${params.query} ${params.city}`;
  const maxPlaces  = Math.min(params.targetCount * 2, 400);

  const tryActor = async (actorId: string, input: any): Promise<any[]> => {
    try {
      console.log(`[LeadFinder] Apify starting actor ${actorId} — query: "${searchTerm}"`);
      const runPromise = client.actor(actorId).call(input);
      const timeout    = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('Apify 3min timeout')), 180_000));
      const run = await Promise.race([runPromise, timeout]);
      const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 600 });
      console.log(`[LeadFinder] Apify ${actorId} returned ${(items || []).length} items`);
      return items || [];
    } catch (e: any) {
      console.error(`[LeadFinder] Apify actor ${actorId} failed:`, e.message?.slice(0, 120));
      return [];
    }
  };

  // Primary: compass/crawler-google-places (most popular, 30M+ runs)
  let items = await tryActor('compass/crawler-google-places', {
    searchStringsArray:         [searchTerm],
    maxCrawledPlacesPerSearch:  maxPlaces,
    language:                   params.langCode,
    exportPlaceUrls:            false,
    additionalInfo:             false,
    maxReviews:                 0,
  });

  // Fallback: apify/google-maps-scraper if primary returned nothing
  if (items.length === 0) {
    items = await tryActor('apify/google-maps-scraper', {
      queries:    [searchTerm],
      maxResults: maxPlaces,
      language:   params.langCode,
    });
  }

  return items
    .filter((p: any) => p.title || p.name)
    .map((p: any) => ({
      source:       'apify',
      place_id:     p.placeId || undefined,
      external_id:  p.placeId ? `apify_${p.placeId}` : `apify_${p.url?.slice(-20) || Date.now()}`,
      company_name: p.title || p.name,
      phone:        p.phone || p.phoneUnformatted || p.phoneNumber || null,
      website:      p.website || null,
      address:      p.address || p.fullAddress || null,
      lat:          p.location?.lat ?? p.lat ?? null,
      lng:          p.location?.lng ?? p.lng ?? null,
      rating:       p.totalScore ?? p.rating ?? null,
      review_count: p.reviewsCount ?? p.reviewCount ?? null,
      category:     p.categoryName || p.category || null,
    } as RawLead));
}

// ── Source 3: OpenStreetMap / Overpass (free, unlimited) ──────────────────────

async function osmSearch(params: {
  query: string;
  lat: number;
  lng: number;
  radiusKm: number;
}): Promise<RawLead[]> {
  // Cap radius at 25km to avoid Overpass timeout on large cities
  const radiusM = Math.min(params.radiusKm * 1000, 25000);
  const kw = params.query.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Search by both name and category tags for broader coverage
  const q = `[out:json][timeout:25];
(
  node["name"~"${kw}",i](around:${radiusM},${params.lat},${params.lng});
  way["name"~"${kw}",i](around:${radiusM},${params.lat},${params.lng});
  relation["name"~"${kw}",i](around:${radiusM},${params.lat},${params.lng});
  node["amenity"~"${kw}",i](around:${radiusM},${params.lat},${params.lng});
  node["shop"~"${kw}",i](around:${radiusM},${params.lat},${params.lng});
  way["shop"~"${kw}",i](around:${radiusM},${params.lat},${params.lng});
);
out body center 600;`;

  try {
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(q)}`,
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) {
      console.error('[LeadFinder] OSM HTTP error:', resp.status);
      return [];
    }
    const data: any = await resp.json();

    return (data.elements || [])
      .filter((el: any) => el.tags?.name && el.tags.name.length > 1)
      .map((el: any) => ({
        source: 'osm',
        external_id: `osm_${el.id}`,
        company_name: el.tags.name,
        phone: el.tags.phone || el.tags['contact:phone'] || el.tags['phone:mobile'] || null,
        website: el.tags.website || el.tags['contact:website'] || null,
        email: el.tags.email || el.tags['contact:email'] || null,
        address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']]
          .filter(Boolean).join(' ') || null,
        lat: el.lat ?? el.center?.lat ?? null,
        lng: el.lon ?? el.center?.lon ?? null,
        category: el.tags.amenity || el.tags.shop || el.tags.office || el.tags.craft || null,
      } as RawLead));
  } catch (e: any) {
    console.error('[LeadFinder] OSM error:', e.message?.slice(0, 80));
    return [];
  }
}

// ── Source 3: Yelp Fusion (free 5K req/day, YELP_API_KEY required) ────────────

async function yelpSearch(params: {
  query: string;
  city: string;
  countryName: string;
  targetCount: number;
}): Promise<RawLead[]> {
  if (!YELP_KEY) return [];
  const leads: RawLead[] = [];
  const limit = 50;
  const maxOffset = Math.min(params.targetCount, 240);

  for (let offset = 0; offset < maxOffset; offset += limit) {
    try {
      const sp = new URLSearchParams({
        term: params.query,
        location: `${params.city}, ${params.countryName}`,
        limit: String(limit),
        offset: String(offset),
      });
      const resp = await fetch(`https://api.yelp.com/v3/businesses/search?${sp}`, {
        headers: { Authorization: `Bearer ${YELP_KEY}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) break;
      const data: any = await resp.json();
      const businesses: any[] = data.businesses || [];
      for (const b of businesses) {
        leads.push({
          source: 'yelp',
          external_id: `yelp_${b.id}`,
          company_name: b.name,
          phone: b.phone || b.display_phone || null,
          address: b.location?.display_address?.join(', ') || null,
          lat: b.coordinates?.latitude || null,
          lng: b.coordinates?.longitude || null,
          rating: b.rating || null,
          review_count: b.review_count || null,
          category: b.categories?.[0]?.title || null,
        });
      }
      if (businesses.length < limit) break;
      await sleep(250);
    } catch { break; }
  }
  return leads;
}

// ── Source 4: Foursquare Places (free 950 req/day, FSQ_KEY required) ──────────

async function foursquareSearch(params: {
  query: string;
  lat: number;
  lng: number;
  radiusKm: number;
  targetCount: number;
}): Promise<RawLead[]> {
  if (!FSQ_KEY) return [];
  const leads: RawLead[] = [];
  let cursor: string | null = null;
  let pages = 0;

  do {
    try {
      const sp = new URLSearchParams({
        query: params.query,
        ll: `${params.lat},${params.lng}`,
        radius: String(Math.min(params.radiusKm * 1000, 50000)),
        limit: '50',
      });
      if (cursor) sp.set('cursor', cursor);

      const resp = await fetch(`https://api.foursquare.com/v3/places/search?${sp}`, {
        headers: { Authorization: FSQ_KEY },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) break;
      const data: any = await resp.json();

      for (const p of data.results || []) {
        leads.push({
          source: 'foursquare',
          external_id: `fsq_${p.fsq_id}`,
          company_name: p.name,
          address: p.location?.formatted_address || null,
          lat: p.geocodes?.main?.latitude || null,
          lng: p.geocodes?.main?.longitude || null,
          category: p.categories?.[0]?.name || null,
          phone: p.tel || null,
          website: p.website || null,
        });
      }

      cursor = data.context?.next_cursor || null;
      pages++;
      await sleep(200);
    } catch { break; }
  } while (cursor && leads.length < params.targetCount && pages < 5);

  return leads;
}

// ── Source 5: HERE Discover (free 250K req/month, HERE_API_KEY required) ──────

async function hereSearch(params: {
  query: string;
  lat: number;
  lng: number;
  radiusKm: number;
}): Promise<RawLead[]> {
  if (!HERE_KEY) return [];
  try {
    const sp = new URLSearchParams({
      q: params.query,
      at: `${params.lat},${params.lng}`,
      limit: '100',
      apiKey: HERE_KEY,
    });
    const resp = await fetch(`https://discover.search.hereapi.com/v1/discover?${sp}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const data: any = await resp.json();

    return (data.items || []).map((item: any) => ({
      source: 'here',
      external_id: `here_${item.id}`,
      company_name: item.title,
      address: item.address?.label || null,
      lat: item.position?.lat || null,
      lng: item.position?.lng || null,
      phone: item.contacts?.[0]?.phone?.[0]?.value || null,
      website: item.contacts?.[0]?.www?.[0]?.value || null,
      category: item.categories?.[0]?.name || null,
    } as RawLead));
  } catch (e: any) {
    console.error('[LeadFinder] HERE error:', e.message?.slice(0, 80));
    return [];
  }
}

// ── Source 6: OpenCorporates — 130+ country universal registry ────────────────

async function openCorporatesSearch(query: string, country: string, limit: number): Promise<RawLead[]> {
  const jCode = OC_JURISDICTION[country.toUpperCase()];
  if (!jCode) {
    console.log(`[LeadFinder] OpenCorporates: no jurisdiction mapping for ${country}`);
    return [];
  }

  const leads: RawLead[] = [];
  const perPage  = OC_KEY ? 100 : 30;
  const maxPages = Math.min(Math.ceil((limit * 2) / perPage), 4);

  for (let page = 1; page <= maxPages && leads.length < limit; page++) {
    try {
      const sp = new URLSearchParams({
        q:                 query,
        jurisdiction_code: jCode,
        per_page:          String(perPage),
        page:              String(page),
        ...(OC_KEY ? { api_token: OC_KEY } : {}),
      });
      const resp = await fetch(`https://api.opencorporates.com/v0.4/companies/search?${sp}`, {
        headers: { 'User-Agent': 'LeadFlow-AI/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error(`[LeadFinder] OpenCorporates HTTP ${resp.status} for ${country}:`, body.slice(0, 120));
        break;
      }
      const data: any = await resp.json();
      const companies: any[] = data.results?.companies || [];
      for (const item of companies) {
        const co = item.company;
        if (!co?.name) continue;
        leads.push({
          source:       'registry',
          external_id:  `oc_${jCode}_${co.company_number}`,
          company_name: co.name,
          address:      co.registered_address?.in_full || null,
          category:     co.company_type || null,
        } as RawLead);
      }
      if (companies.length < perPage) break;
      if (page < maxPages) await sleep(300);
    } catch (e: any) {
      console.error('[LeadFinder] OpenCorporates error:', e.message?.slice(0, 80));
      break;
    }
  }
  console.log(`[LeadFinder] OpenCorporates (${country}/${jCode}): ${leads.length} results`);
  return leads;
}

// ── Source 7: Country-specific direct registry APIs ───────────────────────────

async function registrySearch(params: {
  query: string;
  country: string;
  city: string;
  limit: number;
}): Promise<RawLead[]> {
  const cc  = params.country.toUpperCase();
  const all: RawLead[] = [];

  // ── 1. OpenCorporates: covers TR, DE, FR, IT, ES, NL, BE, PL, SE, AU, JP, KR, AE + 100 more ──
  const ocLeads = await openCorporatesSearch(params.query, cc, params.limit);
  all.push(...ocLeads);
  if (all.length >= params.limit) return all.slice(0, params.limit);

  const need = params.limit - all.length;

  // ── 2. Country-specific high-quality supplementary APIs ──
  try {
    let extra: RawLead[] = [];

    if (cc === 'NO') {
      // Norway — Brønnøysund Register Centre (free, no auth)
      const sp = new URLSearchParams({ navn: params.query, size: String(Math.min(need, 100)) });
      const r = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?${sp}`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const d: any = await r.json();
        extra = (d._embedded?.enheter || []).map((co: any) => ({
          source: 'registry', external_id: `no_${co.organisasjonsnummer}`,
          company_name: co.navn, address: co.forretningsadresse?.adresse?.join(', ') || null,
          phone: co.telefon || null, website: co.hjemmeside || null,
          category: co.naeringskode1?.beskrivelse || null,
        } as RawLead));
      }

    } else if (cc === 'DK') {
      // Denmark — CVR API (free)
      const r = await fetch(`https://cvrapi.dk/api?search=${encodeURIComponent(params.query)}&country=dk`, {
        headers: { 'User-Agent': 'LeadFlow-AI' }, signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const arr: any[] = Array.isArray(d) ? d : (d.name ? [d] : []);
        extra = arr.filter((co: any) => co.name).map((co: any) => ({
          source: 'registry', external_id: `dk_${co.vat}`,
          company_name: co.name, address: co.address || null,
          phone: co.phone || null, category: co.industryDesc || null,
        } as RawLead));
      }

    } else if (cc === 'CZ') {
      // Czech Republic — ARES (free, no auth)
      const sp = new URLSearchParams({ obchodniJmeno: params.query, pocet: String(Math.min(need, 100)), razeni: 'RELEVANCE' });
      const r = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty?${sp}`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const d: any = await r.json();
        extra = (d.ekonomickeSubjekty || []).map((co: any) => ({
          source: 'registry', external_id: `cz_${co.ico}`,
          company_name: co.obchodniJmeno,
          address: [co.sidlo?.ulice, co.sidlo?.cisloDomu, co.sidlo?.obec].filter(Boolean).join(', ') || null,
        } as RawLead));
      }

    } else if (cc === 'FI') {
      // Finland — PRH (free, no auth)
      const sp = new URLSearchParams({ name: params.query, maxResults: String(Math.min(need, 100)) });
      const r = await fetch(`https://avoindata.prh.fi/bis/v1?${sp}`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const d: any = await r.json();
        extra = (d.results || []).map((co: any) => ({
          source: 'registry', external_id: `fi_${co.businessId}`,
          company_name: co.name,
          phone:   co.contactDetails?.find((c: any) => c.type === 'PhoneNumber')?.value || null,
          website: co.contactDetails?.find((c: any) => c.type === 'Website')?.value || null,
        } as RawLead));
      }

    } else if (cc === 'GB' && CH_KEY) {
      // UK — Companies House (free with key)
      const sp = new URLSearchParams({ q: params.query, items_per_page: String(Math.min(need, 100)) });
      const r = await fetch(`https://api.company-information.service.gov.uk/search/companies?${sp}`, {
        headers: { Authorization: `Basic ${Buffer.from(CH_KEY + ':').toString('base64')}` },
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const d: any = await r.json();
        extra = (d.items || []).map((co: any) => ({
          source: 'registry', external_id: `gb_${co.company_number}`,
          company_name: co.title, address: co.address_snippet || null, category: co.company_type || null,
        } as RawLead));
      }

    } else if (cc === 'AU') {
      // Australia — ABN Lookup (free, no auth)
      const r = await fetch(`https://www.abn.business.gov.au/json/AbnSearch.aspx?SearchString=${encodeURIComponent(params.query)}&MaxResults=${Math.min(need, 100)}`, {
        headers: { 'User-Agent': 'LeadFlow-AI/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) {
        const d: any = await r.json();
        extra = (d.Names || d.SearchResults || [])
          .filter((co: any) => co.Name || co.EntityName)
          .map((co: any) => ({
            source: 'registry', external_id: `au_${co.Abn}`,
            company_name: co.Name || co.EntityName,
            category: co.EntityTypeName || null,
          } as RawLead));
      }

    } else if (cc === 'EE') {
      // Estonia — e-Business Register (free)
      const r = await fetch(`https://ariregister.rik.ee/api/company/search?q=${encodeURIComponent(params.query)}&language=en`, {
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const d: any = await r.json();
        extra = (Array.isArray(d) ? d : d.results || []).slice(0, need)
          .filter((co: any) => co.name || co.company_name)
          .map((co: any) => ({
            source: 'registry', external_id: `ee_${co.registry_code || co.reg_code}`,
            company_name: co.name || co.company_name, address: co.address || null,
          } as RawLead));
      }

    } else if (cc === 'JP') {
      // Japan — National Tax Agency Corporation API (free, no auth)
      const r = await fetch(`https://api.houjin-bangou.nta.go.jp/4/name.json?name=${encodeURIComponent(params.query)}&kind=01&close=1&divide=1&type=12&unitType=1`, {
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const d: any = await r.json();
        extra = (d.corporations || d || []).slice(0, need)
          .filter((co: any) => co.name)
          .map((co: any) => ({
            source: 'registry', external_id: `jp_${co.corporateNumber}`,
            company_name: co.name, address: [co.prefectureName, co.cityName, co.streetNumber].filter(Boolean).join(' ') || null,
          } as RawLead));
      }
    }

    all.push(...extra);
    if (extra.length > 0) console.log(`[LeadFinder] Registry ${cc} supplement: ${extra.length} results`);

  } catch (e: any) {
    console.error('[LeadFinder] Registry supplement error:', e.message?.slice(0, 80));
  }

  return all.slice(0, params.limit);
}

// ── Geocoding ─────────────────────────────────────────────────────────────────

const STATIC_COORDS: Record<string, { lat: number; lng: number }> = {
  istanbul: { lat: 41.0082, lng: 28.9784 }, ankara:   { lat: 39.9334, lng: 32.8597 },
  izmir:    { lat: 38.4192, lng: 27.1287 }, bursa:    { lat: 40.1826, lng: 29.0665 },
  antalya:  { lat: 36.8969, lng: 30.7133 }, london:   { lat: 51.5074, lng: -0.1278 },
  paris:    { lat: 48.8566, lng: 2.3522  }, berlin:   { lat: 52.5200, lng: 13.4050 },
  madrid:   { lat: 40.4168, lng: -3.7038 }, rome:     { lat: 41.9028, lng: 12.4964 },
  amsterdam:{ lat: 52.3676, lng: 4.9041  }, dubai:    { lat: 25.2048, lng: 55.2708 },
  riyadh:   { lat: 24.7136, lng: 46.6753 }, cairo:    { lat: 30.0444, lng: 31.2357 },
  newyork:  { lat: 40.7128, lng: -74.0060}, losangeles:{ lat: 34.0522, lng: -118.2437 },
  chicago:  { lat: 41.8781, lng: -87.6298}, toronto:  { lat: 43.6532, lng: -79.3832 },
  sydney:   { lat: -33.8688, lng: 151.2093}, melbourne:{ lat: -37.8136, lng: 144.9631 },
  tokyo:    { lat: 35.6762, lng: 139.6503}, seoul:    { lat: 37.5665, lng: 126.9780 },
  singapore:{ lat: 1.3521, lng: 103.8198 }, mumbai:   { lat: 19.0760, lng: 72.8777 },
  delhi:    { lat: 28.6139, lng: 77.2090 }, beijing:  { lat: 39.9042, lng: 116.4074 },
  shanghai: { lat: 31.2304, lng: 121.4737}, moscow:   { lat: 55.7558, lng: 37.6173 },
  saopaulo: { lat: -23.5505, lng: -46.6333}, buenosaires:{ lat: -34.6037, lng: -58.3816 },
  mexico:   { lat: 19.4326, lng: -99.1332}, johannesburg:{ lat: -26.2041, lng: 28.0473 },
  lagos:    { lat: 6.5244, lng: 3.3792   }, nairobi:  { lat: -1.2921, lng: 36.8219 },
};

async function geocodeCity(city: string, countryName: string): Promise<{ lat: number; lng: number }> {
  const key = normKey(city);
  if (STATIC_COORDS[key]) return STATIC_COORDS[key];

  // Try Nominatim (free, no key)
  try {
    const sp = new URLSearchParams({ q: `${city}, ${countryName}`, format: 'json', limit: '1' });
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${sp}`, {
      headers: { 'User-Agent': 'LeadFlow-AI/1.0 (commercial use)' },
      signal: AbortSignal.timeout(6000),
    });
    if (resp.ok) {
      const data: any = await resp.json();
      if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}

  // Fallback: Google Geocoding API (if key available)
  if (GOOGLE_KEY) {
    try {
      const sp = new URLSearchParams({ address: `${city}, ${countryName}`, key: GOOGLE_KEY });
      const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${sp}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        const loc = data.results?.[0]?.geometry?.location;
        if (loc) return { lat: loc.lat, lng: loc.lng };
      }
    } catch {}
  }

  // Last resort: country center approximation
  console.warn(`[LeadFinder] Could not geocode ${city}, ${countryName} — using country center`);
  return { lat: 39.9, lng: 32.8 }; // default: Turkey center
}

// ── Deduplication Engine ──────────────────────────────────────────────────────

function deduplicateLeads(leads: RawLead[]): RawLead[] {
  const unique: RawLead[] = [];
  const byPlaceId = new Map<string, number>();
  const byPhone   = new Map<string, number>();
  const byCoords  = new Map<string, number>();
  const byName    = new Map<string, number>();

  for (const lead of leads) {
    const placeKey  = lead.place_id || null;
    const extKey    = lead.external_id || null;
    const phoneKey  = lead.phone ? normalizePhone(lead.phone) : null;
    const coordKey  = (lead.lat != null && lead.lng != null)
      ? `${lead.lat.toFixed(3)},${lead.lng.toFixed(3)}` : null;
    const nameKey   = lead.company_name ? normalizeName(lead.company_name) : null;

    let dupIdx: number | undefined;

    if (placeKey && byPlaceId.has(placeKey))       dupIdx = byPlaceId.get(placeKey);
    else if (extKey && byPlaceId.has(extKey))       dupIdx = byPlaceId.get(extKey);
    else if (phoneKey && phoneKey.length >= 8 && byPhone.has(phoneKey)) dupIdx = byPhone.get(phoneKey);
    else if (coordKey && byCoords.has(coordKey))    dupIdx = byCoords.get(coordKey);
    else if (nameKey && nameKey.length > 3 && byName.has(nameKey)) dupIdx = byName.get(nameKey);

    if (dupIdx !== undefined) {
      // Merge — keep richest data
      const ex = unique[dupIdx];
      ex.phone    = ex.phone    || lead.phone;
      ex.email    = ex.email    || lead.email;
      ex.website  = ex.website  || lead.website;
      ex.address  = ex.address  || lead.address;
      ex.lat      = ex.lat      ?? lead.lat;
      ex.lng      = ex.lng      ?? lead.lng;
      ex.rating   = ex.rating   || lead.rating;
      ex.review_count = ex.review_count || lead.review_count;
      if (!ex.sources) ex.sources = [ex.source];
      if (!ex.sources.includes(lead.source)) ex.sources.push(lead.source);
    } else {
      const idx = unique.length;
      unique.push({ ...lead, sources: [lead.source] });
      if (placeKey) byPlaceId.set(placeKey, idx);
      if (extKey)   byPlaceId.set(extKey,   idx);
      if (phoneKey && phoneKey.length >= 8) byPhone.set(phoneKey, idx);
      if (coordKey) byCoords.set(coordKey, idx);
      if (nameKey && nameKey.length > 3) byName.set(nameKey, idx);
    }
  }

  return unique;
}

// ── Quality Scoring ───────────────────────────────────────────────────────────

function scoreLead(lead: RawLead): number {
  let s = 0;
  if (lead.phone)        s += 30;
  if (lead.email)        s += 25;
  if (lead.website)      s += 15;
  const r = lead.rating || 0;
  if      (r >= 4.5)     s += 10;
  else if (r >= 4.0)     s += 7;
  else if (r >= 3.5)     s += 4;
  const rc = lead.review_count || 0;
  if      (rc >= 100)    s += 8;
  else if (rc >= 50)     s += 5;
  else if (rc >= 10)     s += 2;
  if (lead.address)      s += 3;
  const srcCount = lead.sources?.length || 1;
  if      (srcCount >= 3) s += 9;
  else if (srcCount >= 2) s += 5;
  return Math.min(s, 100);
}

// ── Email Discovery ───────────────────────────────────────────────────────────

const EMAIL_RE  = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;
const EMAIL_BAD = new Set(['example.com','test.com','wordpress.com','cloudflare.com','google.com','sentry.io']);

async function discoverEmail(website: string): Promise<string | null> {
  const base = website.startsWith('http') ? website : `https://${website}`;
  for (const path of ['', '/contact', '/iletisim', '/about', '/hakkimizda']) {
    try {
      const resp = await fetch(`${base}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)', Accept: 'text/html' },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const decoded = html.replace(/&#64;/g, '@').replace(/\[at\]/gi, '@').replace(/\(at\)/gi, '@');
      const found = (decoded.match(EMAIL_RE) || []).filter((e: string) => {
        const domain = e.split('@')[1] || '';
        return !EMAIL_BAD.has(domain) && !domain.includes('.jpg') && e.length <= 80;
      });
      if (found.length) return found[0];
    } catch { continue; }
  }
  return null;
}

// ── Smart Query Expansion (Claude Haiku — fast, cheap) ────────────────────────
// Generates related search terms so Google grid covers more business sub-types.
// For "mobilya mağazası" → ["mobilya", "dekorasyon", "koltuk", "ofis mobilyası", ...]

async function expandSearchTerms(query: string, langCode: string, targetCount: number): Promise<string[]> {
  if (targetCount < 150) return [query];
  const termCount = targetCount <= 300 ? 6 : 12;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `Generate ${termCount} alternative Google Maps search terms for "${query}". Include synonyms, subcategories, and closely related business types. Language code: ${langCode}. Return ONLY a compact JSON array, no explanation: ["term1","term2",...]`,
      }],
    });
    const text = (r.content[0] as any)?.text || '';
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [query];
    const terms: string[] = JSON.parse(match[0]);
    const all = [query, ...terms.filter((t: string) => t && t.toLowerCase() !== query.toLowerCase())];
    console.log(`[LeadFinder] Query expanded: "${query}" → ${all.length} terms`);
    return all.slice(0, termCount + 1);
  } catch (e: any) {
    console.warn('[LeadFinder] Query expansion skipped:', e.message?.slice(0, 60));
    return [query];
  }
}

// ── Geographic Sub-Area Expansion ─────────────────────────────────────────────
// For 300+ lead requests in large cities, also search popular districts.

const CITY_SUBAREAS: Record<string, string[]> = {
  istanbul:    ['Kadıköy', 'Beşiktaş', 'Şişli', 'Fatih', 'Üsküdar', 'Maltepe', 'Ümraniye', 'Bağcılar', 'Esenyurt', 'Bakırköy'],
  ankara:      ['Çankaya', 'Keçiören', 'Yenimahalle', 'Etimesgut', 'Sincan', 'Gölbaşı'],
  izmir:       ['Bornova', 'Karşıyaka', 'Buca', 'Konak', 'Çiğli', 'Bayraklı'],
  london:      ['Camden', 'Islington', 'Hackney', 'Tower Hamlets', 'Southwark', 'Lambeth', 'Croydon'],
  paris:       ['Montmartre', 'Le Marais', 'Batignolles', 'Belleville', 'Vincennes'],
  berlin:      ['Mitte', 'Prenzlauer Berg', 'Friedrichshain', 'Kreuzberg', 'Charlottenburg'],
  madrid:      ['Salamanca', 'Chamberí', 'Arganzuela', 'Carabanchel', 'Vallecas'],
  dubai:       ['Deira', 'Bur Dubai', 'Jumeirah', 'Business Bay', 'Al Barsha', 'Silicon Oasis'],
  newyork:     ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
  losangeles:  ['Hollywood', 'Downtown LA', 'Santa Monica', 'Long Beach', 'Pasadena'],
  seoul:       ['Gangnam', 'Mapo', 'Jongno', 'Yongsan', 'Seocho', 'Songpa'],
  tokyo:       ['Shinjuku', 'Shibuya', 'Minato', 'Chuo', 'Sumida', 'Koto'],
  sydney:      ['CBD', 'Parramatta', 'Bondi', 'Chatswood', 'Manly'],
  toronto:     ['Downtown', 'North York', 'Scarborough', 'Etobicoke', 'Mississauga'],
  moscow:      ['Arbat', 'Zamoskvorechye', 'Presnensky', 'Khamovniki', 'Basmanny'],
  cairo:       ['Heliopolis', 'Maadi', 'Dokki', 'Zamalek', 'Nasr City'],
  riyadh:      ['Al Malaz', 'Al Olaya', 'Al Nakheel', 'Al Murabba', 'Al Safa'],
};

function getSearchAreas(city: string, targetCount: number): Array<{ city: string; radiusKm: number }> {
  if (targetCount < 300) return [{ city, radiusKm: 20 }];
  const key = normKey(city);
  const subs = CITY_SUBAREAS[key] || CITY_SUBAREAS[city.toLowerCase().replace(/\s+/g, '')];
  if (!subs) return [{ city, radiusKm: 25 }];
  const extraCount = Math.min(Math.ceil((targetCount - 200) / 80), subs.length);
  return [
    { city, radiusKm: 20 },
    ...subs.slice(0, extraCount).map(s => ({ city: `${s}, ${city}`, radiusKm: 8 })),
  ];
}

// ── Language & country name maps ──────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  TR: 'tr', DE: 'de', FR: 'fr', GB: 'en', IT: 'it', ES: 'es', NL: 'nl', BE: 'fr',
  PL: 'pl', PT: 'pt', CZ: 'cs', HU: 'hu', SE: 'sv', AT: 'de', CH: 'de', NO: 'no',
  DK: 'da', FI: 'fi', GR: 'el', RO: 'ro', US: 'en', CA: 'en', MX: 'es', BR: 'pt',
  AR: 'es', AU: 'en', NZ: 'en', SG: 'en', IN: 'hi', CN: 'zh', JP: 'ja', KR: 'ko',
  AE: 'ar', SA: 'ar', EG: 'ar', MA: 'ar', ZA: 'en', NG: 'en', KE: 'sw',
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  TR: 'Turkey', DE: 'Germany', FR: 'France', GB: 'United Kingdom', IT: 'Italy',
  ES: 'Spain', NL: 'Netherlands', BE: 'Belgium', PL: 'Poland', PT: 'Portugal',
  CZ: 'Czech Republic', HU: 'Hungary', SE: 'Sweden', AT: 'Austria', CH: 'Switzerland',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', GR: 'Greece', RO: 'Romania',
  US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina',
  AU: 'Australia', NZ: 'New Zealand', SG: 'Singapore', IN: 'India', CN: 'China',
  JP: 'Japan', KR: 'South Korea', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
  EG: 'Egypt', MA: 'Morocco', ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya',
};

// ── Main orchestrator ─────────────────────────────────────────────────────────

interface FinderParams {
  query: string;
  cities: string[];
  country: string;
  sector?: string;
  listName?: string;
  targetCount: number;
  radiusKm: number;
  requirePhone: boolean;
  requireWebsite: boolean;
  enrichEmail: boolean;
  userId: string;
  jobId?: string;
}

async function runFinder(params: FinderParams): Promise<{
  saved: number;
  skipped: number;
  sourceBreakdown: Record<string, number>;
  savedLeadIds: string[];
}> {
  const { query, cities, country, targetCount, radiusKm, requirePhone, requireWebsite, enrichEmail, userId, jobId, listName } = params;

  const updateJob = (patch: Partial<FinderJob>) => {
    if (!jobId) return;
    const j = jobs.get(jobId);
    if (j) Object.assign(j, patch);
  };

  const updateSource = (src: string, status: SourceStat['status'], count: number) => {
    if (!jobId) return;
    const j = jobs.get(jobId);
    if (j && j.sources[src]) { j.sources[src].status = status; j.sources[src].count = count; }
  };

  const countryName = COUNTRY_NAME_MAP[country] || country;
  const langCode    = LANG_MAP[country] || 'en';

  const sourceBreakdown: Record<string, number> = { google: 0, apify: 0, osm: 0, yelp: 0, foursquare: 0, here: 0, registry: 0 };
  const allLeads: RawLead[] = [];

  // ── Google grid search — one pass per city ───────────────────────────────────
  updateSource('google', 'running', 0);
  const perCityTarget = Math.max(10, Math.ceil(targetCount / cities.length));

  for (let i = 0; i < cities.length; i++) {
    const cityName = cities[i];
    updateJob({ phase: cities.length > 1 ? `${cityName} taranıyor... (${i + 1}/${cities.length})` : 'Google Maps taranıyor...' });

    const coords = await geocodeCity(cityName, countryName);
    const cityLeads = await googleGridSearch({
      query, lat: coords.lat, lng: coords.lng, radiusKm,
      targetCount: perCityTarget,
      langCode,
      onCount: (n) => updateSource('google', 'running', allLeads.length + n),
    });

    cityLeads.forEach(l => { l.searchCity = cityName; });
    allLeads.push(...cityLeads);
    sourceBreakdown.google += cityLeads.length;
    updateJob({ found: deduplicateLeads(allLeads).length });
    console.log(`[LeadFinder] Google ${cityName}: ${cityLeads.length} raw results`);
  }

  updateSource('google', 'done', sourceBreakdown.google);
  updateSource('apify', 'skipped', 0);

  for (const name of ['osm', 'yelp', 'foursquare', 'here', 'registry']) {
    updateSource(name, 'skipped', 0);
  }

  updateJob({ phase: 'Sonuçlar hazırlanıyor...' });

  let deduped = deduplicateLeads(allLeads);
  updateJob({ found: deduped.length });

  updateJob({ phase: 'Tekrarlar temizleniyor...' });

  let unique = deduped;

  // Apply quality filters
  if (requirePhone)   unique = unique.filter(l => l.phone);
  if (requireWebsite) unique = unique.filter(l => l.website);

  // CRM deduplication — don't re-add existing leads
  const { data: existing } = await supabase
    .from('leads').select('company_name, phone')
    .eq('user_id', userId).limit(5000);

  const crmNames  = new Set((existing || []).map((l: any) => normalizeName(l.company_name || '')));
  const crmPhones = new Set((existing || []).map((l: any) => l.phone ? normalizePhone(l.phone) : null).filter(Boolean));

  let skipped = 0;
  unique = unique.filter(l => {
    const nk = normalizeName(l.company_name);
    const pk = l.phone ? normalizePhone(l.phone) : null;
    if (crmNames.has(nk)) { skipped++; return false; }
    if (pk && crmPhones.has(pk)) { skipped++; return false; }
    return true;
  });

  updateJob({ skipped, phase: enrichEmail ? 'Email keşfediliyor...' : 'Kaydediliyor...' });

  // Email enrichment (bounded concurrency)
  if (enrichEmail) {
    const toEnrich = unique.filter(l => l.website && !l.email).slice(0, 120);
    const CONCURRENCY = 6;
    for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
      await Promise.allSettled(
        toEnrich.slice(i, i + CONCURRENCY).map(async (lead) => {
          try { const e = await discoverEmail(lead.website!); if (e) lead.email = e; } catch {}
        })
      );
    }
  }

  // Score, sort, truncate
  unique = unique
    .map(l => ({ ...l, score: scoreLead(l) }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, targetCount);

  // Batch insert to Supabase
  updateJob({ phase: 'Veritabanına kaydediliyor...' });
  let saved = 0;
  const insertedIds: string[] = [];
  const toInsert = unique.map(l => {
    const notesBase = [l.address, l.category].filter(Boolean).join(' | ') || null;
    const notes = listName
      ? `[📁 ${listName}]${notesBase ? ` | ${notesBase}` : ''}`
      : notesBase;
    return {
      user_id: userId,
      company_name: l.company_name,
      phone:   l.phone   || null,
      email:   l.email   || null,
      website: l.website || null,
      city:    l.searchCity || cities[0],
      sector:  params.sector || query,
      source:  l.sources && l.sources.length > 1 ? l.sources.join('+') : (l.source || 'lead_finder'),
      status:  'new',
      score:   l.score || 0,
      notes,
    };
  });

  for (let i = 0; i < toInsert.length; i += 50) {
    const { data, error } = await supabase.from('leads').insert(toInsert.slice(i, i + 50)).select('id');
    if (error) console.error('[LeadFinder] Insert error:', error.message);
    if (data) {
      saved += data.length;
      insertedIds.push(...data.map((r: any) => r.id));
    }
    updateJob({ saved, leadIds: insertedIds });
  }

  return { saved, skipped, sourceBreakdown, savedLeadIds: insertedIds };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/lead-finder/search
router.post('/search', async (req: any, res: any) => {
  try {
    const {
      query, city, cities: citiesRaw, country = 'TR', sector, listName,
      targetCount = 50, radiusKm = 20,
      requirePhone = false, requireWebsite = false, enrichEmail = false,
    } = req.body;
    const userId = req.userId;

    // Normalise: accept cities[] array or fall back to single city string
    const cities: string[] = Array.isArray(citiesRaw) && citiesRaw.length > 0
      ? citiesRaw
      : city ? [city] : [];

    if (!query || cities.length === 0) return res.status(400).json({ error: 'query ve en az bir city zorunlu' });

    const limit = Math.max(10, Math.min(Number(targetCount), 1000));

    // Credit check
    const { data: userData } = await supabase
      .from('users').select('credits_total, credits_used').eq('id', userId).single();
    const available = (userData?.credits_total || 0) - (userData?.credits_used || 0);
    if (available < limit) {
      return res.status(400).json({
        error: `Yetersiz kredi. Gerekli: ${limit}, Mevcut: ${available}`,
        needCredits: limit - available,
      });
    }

    const isAsync = limit > 50 || enrichEmail || cities.length > 1;

    if (isAsync) {
      const jobId = `lf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const job   = createJob(query, cities, limit, userId, listName);
      jobs.set(jobId, job);

      // Reserve credits
      await supabase.from('users')
        .update({ credits_used: (userData.credits_used || 0) + limit })
        .eq('id', userId);

      // Fire and forget
      runFinder({ query, cities, country, sector, listName, targetCount: limit, radiusKm, requirePhone, requireWebsite, enrichEmail, userId, jobId })
        .then(({ saved, skipped, sourceBreakdown, savedLeadIds }) => {
          const j = jobs.get(jobId);
          if (j) {
            j.status  = 'done';
            j.saved   = saved;
            j.skipped = skipped;
            j.leadIds = savedLeadIds;
            j.phase   = `${saved} lead kaydedildi${skipped > 0 ? `, ${skipped} tekrar atlandı` : ''}`;
          }
          const diff = limit - saved;
          if (diff > 0) {
            supabase.from('users').update({ credits_used: (userData.credits_used || 0) + saved }).eq('id', userId);
          }
        })
        .catch(e => {
          const j = jobs.get(jobId);
          if (j) { j.status = 'error'; j.error = e.message; }
          supabase.from('users').update({ credits_used: userData.credits_used || 0 }).eq('id', userId);
        });

      return res.json({
        ok: true, jobId, async: true, total: limit,
        availableSources: {
          google: !!GOOGLE_KEY, yelp: !!YELP_KEY,
          foursquare: !!FSQ_KEY, here: !!HERE_KEY, osm: true, registry: true,
        },
        message: 'Arka planda çalışıyor...',
      });
    }

    // Synchronous path (≤50 leads, no email enrichment)
    const { saved, skipped, sourceBreakdown, savedLeadIds } = await runFinder({
      query, cities, country, sector, listName, targetCount: limit, radiusKm,
      requirePhone, requireWebsite, enrichEmail: false, userId,
    });

    await supabase.from('users')
      .update({ credits_used: (userData.credits_used || 0) + saved })
      .eq('id', userId);

    res.json({
      ok: true, saved, skipped, sourceBreakdown, savedLeadIds,
      message: `${saved} lead başarıyla eklendi!`,
    });
  } catch (e: any) {
    console.error('[LeadFinder] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/lead-finder/job/:jobId — poll job status
router.get('/job/:jobId', (req: any, res: any) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job bulunamadı' });
  res.json(job);
});

// GET /api/lead-finder/job/:jobId/leads — fetch preview of saved leads for a completed job
router.get('/job/:jobId/leads', async (req: any, res: any) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job bulunamadı' });
  if (!job.leadIds?.length) return res.json({ leads: [] });

  const { data, error } = await supabase
    .from('leads')
    .select('id, company_name, phone, email, website, city, score, sector, status')
    .in('id', job.leadIds.slice(0, 50))
    .order('score', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ leads: data || [] });
});

// GET /api/lead-finder/test-apify — sanity-check Apify with a small query
router.get('/test-apify', async (req: any, res: any) => {
  if (!APIFY_TOKEN) return res.status(400).json({ ok: false, error: 'APIFY_TOKEN env var is not set' });
  const query  = String(req.query.q    || 'restoran');
  const city   = String(req.query.city || 'Istanbul');
  const t0 = Date.now();

  // Step 1: verify token validity
  let userInfo: any = null;
  let tokenError: string | null = null;
  try {
    const axios = require('axios');
    const userRes = await axios.get(`https://api.apify.com/v2/users/me`, {
      headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
      timeout: 10000,
    });
    userInfo = { username: userRes.data?.data?.username, plan: userRes.data?.data?.plan?.id };
  } catch (e: any) {
    tokenError = e.response?.data?.error?.message || e.message;
  }

  if (tokenError) {
    return res.status(200).json({ ok: false, stage: 'token_validation', error: tokenError, durationMs: Date.now() - t0 });
  }

  // Step 2: run a tiny actor call and capture error details
  let actorError: string | null = null;
  let leads: any[] = [];
  try {
    const { ApifyClient } = require('apify-client');
    const client = new ApifyClient({ token: APIFY_TOKEN });
    const runPromise = client.actor('compass/crawler-google-places').call({
      searchStringsArray: [`${query} ${city}`],
      maxCrawledPlacesPerSearch: 5,
      language: 'tr',
      exportPlaceUrls: false,
      additionalInfo: false,
      maxReviews: 0,
    });
    const timeout = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('Apify 3min timeout')), 180_000));
    const run: any = await Promise.race([runPromise, timeout]);
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 10 });
    leads = (items || []).map((p: any) => ({ name: p.title || p.name, phone: p.phone, address: p.address }));
  } catch (e: any) {
    actorError = e.message?.slice(0, 300);
  }

  res.json({
    ok: !actorError,
    tokenPresent: true,
    userInfo,
    actorError,
    durationMs: Date.now() - t0,
    count: leads.length,
    sample: leads.slice(0, 3),
  });
});

// GET /api/lead-finder/sources — which sources are active
router.get('/sources', (_req: any, res: any) => {
  res.json({
    google:     { active: !!GOOGLE_KEY,  label: 'Google Maps',   icon: 'G', free: false },
    apify:      { active: !!APIFY_TOKEN, label: 'Apify Scraper', icon: 'A', free: false },
    osm:        { active: true,           label: 'OpenStreetMap', icon: 'O', free: true  },
    yelp:       { active: !!YELP_KEY,    label: 'Yelp',          icon: 'Y', free: true  },
    foursquare: { active: !!FSQ_KEY,     label: 'Foursquare',    icon: '4', free: true  },
    here:       { active: !!HERE_KEY,    label: 'HERE Maps',     icon: 'H', free: true  },
    registry:   { active: true,           label: 'Resmi Sicil',   icon: 'R', free: true  },
  });
});

module.exports = router;
