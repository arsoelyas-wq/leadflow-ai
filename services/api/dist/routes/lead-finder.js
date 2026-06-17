"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const YELP_KEY = process.env.YELP_API_KEY;
const FSQ_KEY = process.env.FOURSQUARE_API_KEY;
const HERE_KEY = process.env.HERE_API_KEY;
const CH_KEY = process.env.UK_COMPANIES_HOUSE_KEY;
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const OC_KEY = process.env.OPENCORPORATES_KEY; // free key: opencorporates.com/api_accounts/new
// Google Places API (New) — direct key, higher quota than Apify
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY
    || process.env.GOOGLE_MAPS_API_KEY
    || process.env.GOOGLE_CUSTOM_SEARCH_KEY;
// OpenCorporates jurisdiction codes (ISO-2 → OC jurisdiction)
const OC_JURISDICTION = {
    TR: 'tr', DE: 'de', FR: 'fr', GB: 'gb', IT: 'it', ES: 'es', NL: 'nl',
    BE: 'be', PL: 'pl', PT: 'pt', CZ: 'cz', HU: 'hu', SE: 'se', AT: 'at',
    CH: 'ch', NO: 'no', DK: 'dk', FI: 'fi', GR: 'gr', RO: 'ro', SK: 'sk',
    HR: 'hr', SI: 'si', BG: 'bg', LT: 'lt', LV: 'lv', EE: 'ee', IE: 'ie',
    LU: 'lu', CY: 'cy', MT: 'mt', AU: 'au', NZ: 'nz', SG: 'sg', IN: 'in',
    JP: 'jp', KR: 'kr', HK: 'hk', ZA: 'za', BR: 'br', AR: 'ar', MX: 'mx',
    AE: 'ae', US: 'us_de', CA: 'ca_on',
};
// ── Job store ─────────────────────────────────────────────────────────────────
const jobs = new Map();
setInterval(() => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    for (const [id, job] of jobs) {
        if (job.startedAt < cutoff)
            jobs.delete(id);
    }
}, 30 * 60 * 1000);
function createJob(query, cities, total, userId, listName) {
    const city = cities.join(', ');
    return {
        status: 'running',
        sources: {
            google_places: { status: GOOGLE_PLACES_KEY ? 'pending' : 'skipped', count: 0 },
            apify: { status: APIFY_TOKEN ? 'pending' : 'skipped', count: 0 },
            osm: { status: 'pending', count: 0 },
            yelp: { status: YELP_KEY ? 'pending' : 'skipped', count: 0 },
            foursquare: { status: FSQ_KEY ? 'pending' : 'skipped', count: 0 },
            here: { status: HERE_KEY ? 'pending' : 'skipped', count: 0 },
            registry: { status: 'pending', count: 0 },
        },
        found: 0, saved: 0, skipped: 0, total,
        query, city, phase: 'Başlatılıyor...', startedAt: Date.now(),
        leadIds: [], userId, listName,
    };
}
// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function normalizePhone(p) {
    return p.replace(/\D/g, '').slice(-10);
}
function normalizeName(s) {
    return s.toLowerCase()
        .replace(/\s+(ltd|a\.ş|aş|anonim|şirketi|limited|tic|san|ve|co|inc|gmbh|bv|srl|sarl|llc)\b/gi, '')
        .replace(/[İ]/g, 'i').replace(/[ı]/g, 'i').replace(/[ğ]/g, 'g')
        .replace(/[ş]/g, 's').replace(/[ç]/g, 'c').replace(/[ö]/g, 'o').replace(/[ü]/g, 'u')
        .replace(/[^a-z0-9]/g, '').trim();
}
function normKey(s) {
    return s.toLowerCase()
        .replace(/[İ]/g, 'i').replace(/[ı]/g, 'i')
        .replace(/[öó]/g, 'o').replace(/[üú]/g, 'u')
        .replace(/[ğ]/g, 'g').replace(/[ş]/g, 's').replace(/[ç]/g, 'c')
        .replace(/[áà]/g, 'a').replace(/[é]/g, 'e')
        .replace(/[^a-z0-9]/g, '');
}
// ── Social media link extractor ────────────────────────────────────────────────
// Scrapes company website for FB/IG/YT/LI/TW profile links.
async function extractSocialLinks(website) {
    if (!website)
        return {};
    const base = website.startsWith('http') ? website : `https://${website}`;
    try {
        const resp = await fetch(base, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
            signal: AbortSignal.timeout(5000),
        });
        if (!resp.ok)
            return {};
        const html = await resp.text();
        const links = {};
        const fbM = html.match(/(?:href|content)=["'](?:https?:\/\/)?(?:www\.)?facebook\.com\/((?!sharer|share|plugins|photo|video|events|groups)[^"'\s?#/]{2,60})/i);
        if (fbM)
            links.facebook = `https://facebook.com/${fbM[1]}`;
        const igM = html.match(/(?:href|content)=["'](?:https?:\/\/)?(?:www\.)?instagram\.com\/([^"'\s?#/]{2,40})\/?["']/i);
        if (igM && !['p', 'reel', 'stories', 'explore', 'accounts'].includes(igM[1]))
            links.instagram = `https://instagram.com/${igM[1]}`;
        const liM = html.match(/(?:href|content)=["'](?:https?:\/\/)?(?:www\.)?linkedin\.com\/(company|in)\/([^"'\s?#/]{2,60})/i);
        if (liM)
            links.linkedin_url = `https://linkedin.com/${liM[1]}/${liM[2]}`;
        const ytM = html.match(/(?:href|content)=["'](?:https?:\/\/)?(?:www\.)?youtube\.com\/(channel|c|user|@)\/([^"'\s?#/]{2,80})/i);
        if (ytM)
            links.youtube = `https://youtube.com/${ytM[1]}/${ytM[2]}`;
        const twM = html.match(/(?:href|content)=["'](?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([^"'\s?#/]{2,30})\/?["']/i);
        if (twM && !['twitter', 'home', 'login', 'i', 'intent', 'share', 'hashtag', 'search'].includes(twM[1].toLowerCase())) {
            links.twitter = `https://twitter.com/${twM[1]}`;
        }
        return links;
    }
    catch {
        return {};
    }
}
// ── Source 0: Google Places API (New) — grid search, no intermediary ─────────
// Uses Places API v1 Text Search with NxN city grid for maximum keyword coverage.
// CRITICAL: nextPageToken must NOT appear in X-Goog-FieldMask — it's returned
// automatically in the response body; including it in the mask causes API errors.
// Requires GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY / GOOGLE_CUSTOM_SEARCH_KEY).
const GP_FIELD_MASK = [
    'places.id', 'places.displayName', 'places.formattedAddress',
    'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
    'places.websiteUri', 'places.rating', 'places.userRatingCount',
    'places.primaryTypeDisplayName', 'places.location',
    'places.regularOpeningHours', 'places.googleMapsUri', 'places.businessStatus',
].join(',');
async function googlePlacesSearch(params) {
    if (!GOOGLE_PLACES_KEY)
        return [];
    const leads = [];
    const seenIds = new Set();
    // Grid size scales with target count — larger grids give better city coverage
    const gridSize = params.targetCount <= 30 ? 2
        : params.targetCount <= 80 ? 3
            : params.targetCount <= 200 ? 4
                : params.targetCount <= 500 ? 5 : 6;
    const stepLatDeg = (params.radiusKm * 2 / gridSize) / 111;
    const cosLat = Math.cos(params.lat * Math.PI / 180);
    const stepLngDeg = stepLatDeg / (cosLat || 1);
    const cellRadiusM = (params.radiusKm / gridSize) * 1000 * 1.5; // overlap cells slightly
    const gridPoints = [];
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            gridPoints.push({
                lat: params.lat - params.radiusKm / 111 + i * stepLatDeg + stepLatDeg / 2,
                lng: params.lng - (params.radiusKm / 111 / cosLat) + j * stepLngDeg + stepLngDeg / 2,
            });
        }
    }
    // Two query variants per grid cell: full keyword + first word (broader match)
    const words = params.query.trim().split(/\s+/);
    const queryVariants = [...new Set([params.query, words[0]])];
    const rawCap = params.targetCount * 4; // buffer for dedup
    outer: for (const point of gridPoints) {
        for (const queryText of queryVariants) {
            if (leads.length >= rawCap)
                break outer;
            let pageToken = null;
            let page = 0;
            do {
                if (leads.length >= rawCap)
                    break;
                try {
                    const body = {
                        textQuery: `${queryText} ${params.city}`,
                        languageCode: params.langCode,
                        maxResultCount: 20,
                    };
                    // When using pageToken, DO NOT include locationBias (API requirement)
                    if (pageToken) {
                        body.pageToken = pageToken;
                    }
                    else {
                        body.locationBias = {
                            circle: {
                                center: { latitude: point.lat, longitude: point.lng },
                                radius: Math.min(cellRadiusM, 50000),
                            },
                        };
                    }
                    const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
                            'X-Goog-FieldMask': GP_FIELD_MASK,
                        },
                        body: JSON.stringify(body),
                        signal: AbortSignal.timeout(10000),
                    });
                    if (!resp.ok) {
                        const errText = await resp.text().catch(() => '');
                        console.error(`[LeadFinder] Google Places HTTP ${resp.status}:`, errText.slice(0, 200));
                        break;
                    }
                    const data = await resp.json();
                    for (const p of (data.places || [])) {
                        if (!p.id || seenIds.has(p.id))
                            continue;
                        if (p.businessStatus === 'CLOSED_PERMANENTLY' || p.businessStatus === 'CLOSED_TEMPORARILY')
                            continue;
                        seenIds.add(p.id);
                        const name = p.displayName?.text || '';
                        if (!name)
                            continue;
                        leads.push({
                            source: 'google_places',
                            place_id: p.id,
                            external_id: `gp_${p.id}`,
                            company_name: name,
                            phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
                            website: p.websiteUri || null,
                            address: p.formattedAddress || null,
                            lat: p.location?.latitude ?? null,
                            lng: p.location?.longitude ?? null,
                            rating: p.rating ?? null,
                            review_count: p.userRatingCount ?? null,
                            category: p.primaryTypeDisplayName?.text ?? null,
                            maps_url: p.googleMapsUri || null,
                            opening_hours: p.regularOpeningHours?.weekdayDescriptions
                                ? JSON.stringify(p.regularOpeningHours.weekdayDescriptions)
                                : null,
                        });
                    }
                    pageToken = data.nextPageToken || null;
                    page++;
                    if (pageToken)
                        await sleep(2100); // Google requires >2s between paginated requests
                }
                catch (e) {
                    console.error('[LeadFinder] Google Places error:', e.message?.slice(0, 100));
                    break;
                }
            } while (pageToken && page < 3);
            await sleep(80); // brief pause between grid cells
        }
    }
    console.log(`[LeadFinder] Google Places grid "${params.query}" in ${params.city}: ${leads.length} results (${gridSize}x${gridSize} grid)`);
    return leads;
}
// ── Source 1: Apify Google Maps Scraper (APIFY_TOKEN required) ───────────────
// Uses compass/crawler-google-places — bypasses Places API limits entirely.
async function apifySearch(params) {
    if (!APIFY_TOKEN)
        return [];
    const { ApifyClient } = require('apify-client');
    const client = new ApifyClient({ token: APIFY_TOKEN });
    const searchTerm = `${params.query} ${params.city}`;
    const maxPlaces = Math.min(params.targetCount * 2, 400);
    const tryActor = async (actorId, input) => {
        try {
            console.log(`[LeadFinder] Apify starting actor ${actorId} — query: "${searchTerm}"`);
            const runPromise = client.actor(actorId).call(input);
            const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Apify 3min timeout')), 180000));
            const run = await Promise.race([runPromise, timeout]);
            const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 600 });
            console.log(`[LeadFinder] Apify ${actorId} returned ${(items || []).length} items`);
            return items || [];
        }
        catch (e) {
            console.error(`[LeadFinder] Apify actor ${actorId} failed:`, e.message?.slice(0, 120));
            return [];
        }
    };
    // Primary: compass/crawler-google-places (most popular, 30M+ runs)
    let items = await tryActor('compass/crawler-google-places', {
        searchStringsArray: [searchTerm],
        maxCrawledPlacesPerSearch: maxPlaces,
        language: params.langCode,
        exportPlaceUrls: false,
        additionalInfo: false,
        maxReviews: 0,
    });
    // Fallback: apify/google-maps-scraper if primary returned nothing
    if (items.length === 0) {
        items = await tryActor('apify/google-maps-scraper', {
            queries: [searchTerm],
            maxResults: maxPlaces,
            language: params.langCode,
        });
    }
    return items
        .filter((p) => p.title || p.name)
        // Filter permanently/temporarily closed businesses
        .filter((p) => !p.permanentlyClosed && !p.temporarilyClosed && p.businessStatus !== 'CLOSED_PERMANENTLY' && p.businessStatus !== 'CLOSED_TEMPORARILY')
        .map((p) => ({
        source: 'apify',
        place_id: p.placeId || undefined,
        external_id: p.placeId ? `apify_${p.placeId}` : `apify_${p.url?.slice(-20) || Date.now()}`,
        company_name: p.title || p.name,
        phone: p.phone || p.phoneUnformatted || p.phoneNumber || null,
        website: p.website || null,
        address: p.address || p.fullAddress || null,
        lat: p.location?.lat ?? p.lat ?? null,
        lng: p.location?.lng ?? p.lng ?? null,
        rating: p.totalScore ?? p.rating ?? null,
        review_count: p.reviewsCount ?? p.reviewCount ?? null,
        category: p.categoryName || p.category || null,
        maps_url: p.url || p.googleMapsUrl || p.googleMapsUri || null,
        opening_hours: p.openingHours ? JSON.stringify(p.openingHours) : null,
        // Social links from Google Maps / Apify
        facebook: p.facebookUrl || null,
        instagram: p.instagramUrl || null,
        linkedin_url: p.linkedInUrl || null,
        youtube: p.youtubeUrl || null,
        twitter: p.twitterUrl || null,
    }));
}
// ── Source 3: OpenStreetMap / Overpass (free, unlimited) ──────────────────────
async function osmSearch(params) {
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
        const data = await resp.json();
        return (data.elements || [])
            .filter((el) => el.tags?.name && el.tags.name.length > 1)
            .map((el) => ({
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
        }));
    }
    catch (e) {
        console.error('[LeadFinder] OSM error:', e.message?.slice(0, 80));
        return [];
    }
}
// ── Source 3: Yelp Fusion (free 5K req/day, YELP_API_KEY required) ────────────
async function yelpSearch(params) {
    if (!YELP_KEY)
        return [];
    const leads = [];
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
            if (!resp.ok)
                break;
            const data = await resp.json();
            const businesses = data.businesses || [];
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
            if (businesses.length < limit)
                break;
            await sleep(250);
        }
        catch {
            break;
        }
    }
    return leads;
}
// ── Source 4: Foursquare Places (free 950 req/day, FSQ_KEY required) ──────────
async function foursquareSearch(params) {
    if (!FSQ_KEY)
        return [];
    const leads = [];
    let cursor = null;
    let pages = 0;
    do {
        try {
            const sp = new URLSearchParams({
                query: params.query,
                ll: `${params.lat},${params.lng}`,
                radius: String(Math.min(params.radiusKm * 1000, 50000)),
                limit: '50',
            });
            if (cursor)
                sp.set('cursor', cursor);
            const resp = await fetch(`https://api.foursquare.com/v3/places/search?${sp}`, {
                headers: { Authorization: FSQ_KEY },
                signal: AbortSignal.timeout(10000),
            });
            if (!resp.ok)
                break;
            const data = await resp.json();
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
        }
        catch {
            break;
        }
    } while (cursor && leads.length < params.targetCount && pages < 5);
    return leads;
}
// ── Source 5: HERE Discover (free 250K req/month, HERE_API_KEY required) ──────
async function hereSearch(params) {
    if (!HERE_KEY)
        return [];
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
        if (!resp.ok)
            return [];
        const data = await resp.json();
        return (data.items || []).map((item) => ({
            source: 'here',
            external_id: `here_${item.id}`,
            company_name: item.title,
            address: item.address?.label || null,
            lat: item.position?.lat || null,
            lng: item.position?.lng || null,
            phone: item.contacts?.[0]?.phone?.[0]?.value || null,
            website: item.contacts?.[0]?.www?.[0]?.value || null,
            category: item.categories?.[0]?.name || null,
        }));
    }
    catch (e) {
        console.error('[LeadFinder] HERE error:', e.message?.slice(0, 80));
        return [];
    }
}
// ── Source 6: OpenCorporates — 130+ country universal registry ────────────────
async function openCorporatesSearch(query, country, limit) {
    const jCode = OC_JURISDICTION[country.toUpperCase()];
    if (!jCode) {
        console.log(`[LeadFinder] OpenCorporates: no jurisdiction mapping for ${country}`);
        return [];
    }
    const leads = [];
    const perPage = OC_KEY ? 100 : 30;
    const maxPages = Math.min(Math.ceil((limit * 2) / perPage), 4);
    for (let page = 1; page <= maxPages && leads.length < limit; page++) {
        try {
            const sp = new URLSearchParams({
                q: query,
                jurisdiction_code: jCode,
                per_page: String(perPage),
                page: String(page),
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
            const data = await resp.json();
            const companies = data.results?.companies || [];
            for (const item of companies) {
                const co = item.company;
                if (!co?.name)
                    continue;
                leads.push({
                    source: 'registry',
                    external_id: `oc_${jCode}_${co.company_number}`,
                    company_name: co.name,
                    address: co.registered_address?.in_full || null,
                    category: co.company_type || null,
                });
            }
            if (companies.length < perPage)
                break;
            if (page < maxPages)
                await sleep(300);
        }
        catch (e) {
            console.error('[LeadFinder] OpenCorporates error:', e.message?.slice(0, 80));
            break;
        }
    }
    console.log(`[LeadFinder] OpenCorporates (${country}/${jCode}): ${leads.length} results`);
    return leads;
}
// ── Source 7: Country-specific direct registry APIs ───────────────────────────
async function registrySearch(params) {
    const cc = params.country.toUpperCase();
    const all = [];
    // ── 1. OpenCorporates: covers TR, DE, FR, IT, ES, NL, BE, PL, SE, AU, JP, KR, AE + 100 more ──
    const ocLeads = await openCorporatesSearch(params.query, cc, params.limit);
    all.push(...ocLeads);
    if (all.length >= params.limit)
        return all.slice(0, params.limit);
    const need = params.limit - all.length;
    // ── 2. Country-specific high-quality supplementary APIs ──
    try {
        let extra = [];
        if (cc === 'NO') {
            // Norway — Brønnøysund Register Centre (free, no auth)
            const sp = new URLSearchParams({ navn: params.query, size: String(Math.min(need, 100)) });
            const r = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?${sp}`, { signal: AbortSignal.timeout(10000) });
            if (r.ok) {
                const d = await r.json();
                extra = (d._embedded?.enheter || []).map((co) => ({
                    source: 'registry', external_id: `no_${co.organisasjonsnummer}`,
                    company_name: co.navn, address: co.forretningsadresse?.adresse?.join(', ') || null,
                    phone: co.telefon || null, website: co.hjemmeside || null,
                    category: co.naeringskode1?.beskrivelse || null,
                }));
            }
        }
        else if (cc === 'DK') {
            // Denmark — CVR API (free)
            const r = await fetch(`https://cvrapi.dk/api?search=${encodeURIComponent(params.query)}&country=dk`, {
                headers: { 'User-Agent': 'LeadFlow-AI' }, signal: AbortSignal.timeout(10000),
            });
            if (r.ok) {
                const d = await r.json();
                const arr = Array.isArray(d) ? d : (d.name ? [d] : []);
                extra = arr.filter((co) => co.name).map((co) => ({
                    source: 'registry', external_id: `dk_${co.vat}`,
                    company_name: co.name, address: co.address || null,
                    phone: co.phone || null, category: co.industryDesc || null,
                }));
            }
        }
        else if (cc === 'CZ') {
            // Czech Republic — ARES (free, no auth)
            const sp = new URLSearchParams({ obchodniJmeno: params.query, pocet: String(Math.min(need, 100)), razeni: 'RELEVANCE' });
            const r = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty?${sp}`, { signal: AbortSignal.timeout(10000) });
            if (r.ok) {
                const d = await r.json();
                extra = (d.ekonomickeSubjekty || []).map((co) => ({
                    source: 'registry', external_id: `cz_${co.ico}`,
                    company_name: co.obchodniJmeno,
                    address: [co.sidlo?.ulice, co.sidlo?.cisloDomu, co.sidlo?.obec].filter(Boolean).join(', ') || null,
                }));
            }
        }
        else if (cc === 'FI') {
            // Finland — PRH (free, no auth)
            const sp = new URLSearchParams({ name: params.query, maxResults: String(Math.min(need, 100)) });
            const r = await fetch(`https://avoindata.prh.fi/bis/v1?${sp}`, { signal: AbortSignal.timeout(10000) });
            if (r.ok) {
                const d = await r.json();
                extra = (d.results || []).map((co) => ({
                    source: 'registry', external_id: `fi_${co.businessId}`,
                    company_name: co.name,
                    phone: co.contactDetails?.find((c) => c.type === 'PhoneNumber')?.value || null,
                    website: co.contactDetails?.find((c) => c.type === 'Website')?.value || null,
                }));
            }
        }
        else if (cc === 'GB' && CH_KEY) {
            // UK — Companies House (free with key)
            const sp = new URLSearchParams({ q: params.query, items_per_page: String(Math.min(need, 100)) });
            const r = await fetch(`https://api.company-information.service.gov.uk/search/companies?${sp}`, {
                headers: { Authorization: `Basic ${Buffer.from(CH_KEY + ':').toString('base64')}` },
                signal: AbortSignal.timeout(10000),
            });
            if (r.ok) {
                const d = await r.json();
                extra = (d.items || []).map((co) => ({
                    source: 'registry', external_id: `gb_${co.company_number}`,
                    company_name: co.title, address: co.address_snippet || null, category: co.company_type || null,
                }));
            }
        }
        else if (cc === 'AU') {
            // Australia — ABN Lookup (free, no auth)
            const r = await fetch(`https://www.abn.business.gov.au/json/AbnSearch.aspx?SearchString=${encodeURIComponent(params.query)}&MaxResults=${Math.min(need, 100)}`, {
                headers: { 'User-Agent': 'LeadFlow-AI/1.0', Accept: 'application/json' },
                signal: AbortSignal.timeout(12000),
            });
            if (r.ok) {
                const d = await r.json();
                extra = (d.Names || d.SearchResults || [])
                    .filter((co) => co.Name || co.EntityName)
                    .map((co) => ({
                    source: 'registry', external_id: `au_${co.Abn}`,
                    company_name: co.Name || co.EntityName,
                    category: co.EntityTypeName || null,
                }));
            }
        }
        else if (cc === 'EE') {
            // Estonia — e-Business Register (free)
            const r = await fetch(`https://ariregister.rik.ee/api/company/search?q=${encodeURIComponent(params.query)}&language=en`, {
                signal: AbortSignal.timeout(10000),
            });
            if (r.ok) {
                const d = await r.json();
                extra = (Array.isArray(d) ? d : d.results || []).slice(0, need)
                    .filter((co) => co.name || co.company_name)
                    .map((co) => ({
                    source: 'registry', external_id: `ee_${co.registry_code || co.reg_code}`,
                    company_name: co.name || co.company_name, address: co.address || null,
                }));
            }
        }
        else if (cc === 'JP') {
            // Japan — National Tax Agency Corporation API (free, no auth)
            const r = await fetch(`https://api.houjin-bangou.nta.go.jp/4/name.json?name=${encodeURIComponent(params.query)}&kind=01&close=1&divide=1&type=12&unitType=1`, {
                signal: AbortSignal.timeout(10000),
            });
            if (r.ok) {
                const d = await r.json();
                extra = (d.corporations || d || []).slice(0, need)
                    .filter((co) => co.name)
                    .map((co) => ({
                    source: 'registry', external_id: `jp_${co.corporateNumber}`,
                    company_name: co.name, address: [co.prefectureName, co.cityName, co.streetNumber].filter(Boolean).join(' ') || null,
                }));
            }
        }
        all.push(...extra);
        if (extra.length > 0)
            console.log(`[LeadFinder] Registry ${cc} supplement: ${extra.length} results`);
    }
    catch (e) {
        console.error('[LeadFinder] Registry supplement error:', e.message?.slice(0, 80));
    }
    return all.slice(0, params.limit);
}
// ── Geocoding ─────────────────────────────────────────────────────────────────
const STATIC_COORDS = {
    istanbul: { lat: 41.0082, lng: 28.9784 }, ankara: { lat: 39.9334, lng: 32.8597 },
    izmir: { lat: 38.4192, lng: 27.1287 }, bursa: { lat: 40.1826, lng: 29.0665 },
    antalya: { lat: 36.8969, lng: 30.7133 }, london: { lat: 51.5074, lng: -0.1278 },
    paris: { lat: 48.8566, lng: 2.3522 }, berlin: { lat: 52.5200, lng: 13.4050 },
    madrid: { lat: 40.4168, lng: -3.7038 }, rome: { lat: 41.9028, lng: 12.4964 },
    amsterdam: { lat: 52.3676, lng: 4.9041 }, dubai: { lat: 25.2048, lng: 55.2708 },
    riyadh: { lat: 24.7136, lng: 46.6753 }, cairo: { lat: 30.0444, lng: 31.2357 },
    newyork: { lat: 40.7128, lng: -74.0060 }, losangeles: { lat: 34.0522, lng: -118.2437 },
    chicago: { lat: 41.8781, lng: -87.6298 }, toronto: { lat: 43.6532, lng: -79.3832 },
    sydney: { lat: -33.8688, lng: 151.2093 }, melbourne: { lat: -37.8136, lng: 144.9631 },
    tokyo: { lat: 35.6762, lng: 139.6503 }, seoul: { lat: 37.5665, lng: 126.9780 },
    singapore: { lat: 1.3521, lng: 103.8198 }, mumbai: { lat: 19.0760, lng: 72.8777 },
    delhi: { lat: 28.6139, lng: 77.2090 }, beijing: { lat: 39.9042, lng: 116.4074 },
    shanghai: { lat: 31.2304, lng: 121.4737 }, moscow: { lat: 55.7558, lng: 37.6173 },
    saopaulo: { lat: -23.5505, lng: -46.6333 }, buenosaires: { lat: -34.6037, lng: -58.3816 },
    mexico: { lat: 19.4326, lng: -99.1332 }, johannesburg: { lat: -26.2041, lng: 28.0473 },
    lagos: { lat: 6.5244, lng: 3.3792 }, nairobi: { lat: -1.2921, lng: 36.8219 },
};
async function geocodeCity(city, countryName) {
    const key = normKey(city);
    if (STATIC_COORDS[key])
        return STATIC_COORDS[key];
    // Try Nominatim (free, no key)
    try {
        const sp = new URLSearchParams({ q: `${city}, ${countryName}`, format: 'json', limit: '1' });
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?${sp}`, {
            headers: { 'User-Agent': 'LeadFlow-AI/1.0 (commercial use)' },
            signal: AbortSignal.timeout(6000),
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data[0])
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    }
    catch { }
    // Geocoding fallback via Nominatim already handled above
    // Last resort: country center approximation
    console.warn(`[LeadFinder] Could not geocode ${city}, ${countryName} — using country center`);
    return { lat: 39.9, lng: 32.8 }; // default: Turkey center
}
// ── Deduplication Engine ──────────────────────────────────────────────────────
function deduplicateLeads(leads) {
    const unique = [];
    const byPlaceId = new Map();
    const byPhone = new Map();
    const byCoords = new Map();
    const byName = new Map();
    for (const lead of leads) {
        const placeKey = lead.place_id || null;
        const extKey = lead.external_id || null;
        const phoneKey = lead.phone ? normalizePhone(lead.phone) : null;
        const coordKey = (lead.lat != null && lead.lng != null)
            ? `${lead.lat.toFixed(3)},${lead.lng.toFixed(3)}` : null;
        const nameKey = lead.company_name ? normalizeName(lead.company_name) : null;
        let dupIdx;
        if (placeKey && byPlaceId.has(placeKey))
            dupIdx = byPlaceId.get(placeKey);
        else if (extKey && byPlaceId.has(extKey))
            dupIdx = byPlaceId.get(extKey);
        else if (phoneKey && phoneKey.length >= 8 && byPhone.has(phoneKey))
            dupIdx = byPhone.get(phoneKey);
        else if (coordKey && byCoords.has(coordKey))
            dupIdx = byCoords.get(coordKey);
        else if (nameKey && nameKey.length > 3 && byName.has(nameKey))
            dupIdx = byName.get(nameKey);
        if (dupIdx !== undefined) {
            // Merge — keep richest data
            const ex = unique[dupIdx];
            ex.phone = ex.phone || lead.phone;
            ex.email = ex.email || lead.email;
            ex.website = ex.website || lead.website;
            ex.address = ex.address || lead.address;
            ex.lat = ex.lat ?? lead.lat;
            ex.lng = ex.lng ?? lead.lng;
            ex.rating = ex.rating || lead.rating;
            ex.review_count = ex.review_count || lead.review_count;
            if (!ex.sources)
                ex.sources = [ex.source];
            if (!ex.sources.includes(lead.source))
                ex.sources.push(lead.source);
        }
        else {
            const idx = unique.length;
            unique.push({ ...lead, sources: [lead.source] });
            if (placeKey)
                byPlaceId.set(placeKey, idx);
            if (extKey)
                byPlaceId.set(extKey, idx);
            if (phoneKey && phoneKey.length >= 8)
                byPhone.set(phoneKey, idx);
            if (coordKey)
                byCoords.set(coordKey, idx);
            if (nameKey && nameKey.length > 3)
                byName.set(nameKey, idx);
        }
    }
    return unique;
}
// ── Quality Scoring ───────────────────────────────────────────────────────────
function scoreLead(lead) {
    let s = 0;
    if (lead.phone)
        s += 30;
    if (lead.email)
        s += 25;
    if (lead.website)
        s += 15;
    const r = lead.rating || 0;
    if (r >= 4.5)
        s += 10;
    else if (r >= 4.0)
        s += 7;
    else if (r >= 3.5)
        s += 4;
    const rc = lead.review_count || 0;
    if (rc >= 100)
        s += 8;
    else if (rc >= 50)
        s += 5;
    else if (rc >= 10)
        s += 2;
    if (lead.address)
        s += 3;
    const srcCount = lead.sources?.length || 1;
    if (srcCount >= 3)
        s += 9;
    else if (srcCount >= 2)
        s += 5;
    return Math.min(s, 100);
}
// ── Email Discovery ───────────────────────────────────────────────────────────
const EMAIL_RE = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;
const EMAIL_BAD = new Set(['example.com', 'test.com', 'wordpress.com', 'cloudflare.com', 'google.com', 'sentry.io']);
async function discoverEmail(website) {
    const base = website.startsWith('http') ? website : `https://${website}`;
    for (const path of ['', '/contact', '/iletisim', '/about', '/hakkimizda']) {
        try {
            const resp = await fetch(`${base}${path}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)', Accept: 'text/html' },
                signal: AbortSignal.timeout(5000),
            });
            if (!resp.ok)
                continue;
            const html = await resp.text();
            const decoded = html.replace(/&#64;/g, '@').replace(/\[at\]/gi, '@').replace(/\(at\)/gi, '@');
            const found = (decoded.match(EMAIL_RE) || []).filter((e) => {
                const domain = e.split('@')[1] || '';
                return !EMAIL_BAD.has(domain) && !domain.includes('.jpg') && e.length <= 80;
            });
            if (found.length)
                return found[0];
        }
        catch {
            continue;
        }
    }
    return null;
}
// ── Smart Query Expansion (Claude Haiku — fast, cheap) ────────────────────────
// Generates related search terms so Google grid covers more business sub-types.
// For "mobilya mağazası" → ["mobilya", "dekorasyon", "koltuk", "ofis mobilyası", ...]
async function expandSearchTerms(query, langCode, targetCount) {
    if (targetCount < 150)
        return [query];
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
        const text = r.content[0]?.text || '';
        const match = text.match(/\[[\s\S]*?\]/);
        if (!match)
            return [query];
        const terms = JSON.parse(match[0]);
        const all = [query, ...terms.filter((t) => t && t.toLowerCase() !== query.toLowerCase())];
        console.log(`[LeadFinder] Query expanded: "${query}" → ${all.length} terms`);
        return all.slice(0, termCount + 1);
    }
    catch (e) {
        console.warn('[LeadFinder] Query expansion skipped:', e.message?.slice(0, 60));
        return [query];
    }
}
// ── Geographic Sub-Area Expansion ─────────────────────────────────────────────
// For 300+ lead requests in large cities, also search popular districts.
const CITY_SUBAREAS = {
    istanbul: ['Kadıköy', 'Beşiktaş', 'Şişli', 'Fatih', 'Üsküdar', 'Maltepe', 'Ümraniye', 'Bağcılar', 'Esenyurt', 'Bakırköy'],
    ankara: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Etimesgut', 'Sincan', 'Gölbaşı'],
    izmir: ['Bornova', 'Karşıyaka', 'Buca', 'Konak', 'Çiğli', 'Bayraklı'],
    london: ['Camden', 'Islington', 'Hackney', 'Tower Hamlets', 'Southwark', 'Lambeth', 'Croydon'],
    paris: ['Montmartre', 'Le Marais', 'Batignolles', 'Belleville', 'Vincennes'],
    berlin: ['Mitte', 'Prenzlauer Berg', 'Friedrichshain', 'Kreuzberg', 'Charlottenburg'],
    madrid: ['Salamanca', 'Chamberí', 'Arganzuela', 'Carabanchel', 'Vallecas'],
    dubai: ['Deira', 'Bur Dubai', 'Jumeirah', 'Business Bay', 'Al Barsha', 'Silicon Oasis'],
    newyork: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
    losangeles: ['Hollywood', 'Downtown LA', 'Santa Monica', 'Long Beach', 'Pasadena'],
    seoul: ['Gangnam', 'Mapo', 'Jongno', 'Yongsan', 'Seocho', 'Songpa'],
    tokyo: ['Shinjuku', 'Shibuya', 'Minato', 'Chuo', 'Sumida', 'Koto'],
    sydney: ['CBD', 'Parramatta', 'Bondi', 'Chatswood', 'Manly'],
    toronto: ['Downtown', 'North York', 'Scarborough', 'Etobicoke', 'Mississauga'],
    moscow: ['Arbat', 'Zamoskvorechye', 'Presnensky', 'Khamovniki', 'Basmanny'],
    cairo: ['Heliopolis', 'Maadi', 'Dokki', 'Zamalek', 'Nasr City'],
    riyadh: ['Al Malaz', 'Al Olaya', 'Al Nakheel', 'Al Murabba', 'Al Safa'],
};
function getSearchAreas(city, targetCount) {
    if (targetCount < 300)
        return [{ city, radiusKm: 20 }];
    const key = normKey(city);
    const subs = CITY_SUBAREAS[key] || CITY_SUBAREAS[city.toLowerCase().replace(/\s+/g, '')];
    if (!subs)
        return [{ city, radiusKm: 25 }];
    const extraCount = Math.min(Math.ceil((targetCount - 200) / 80), subs.length);
    return [
        { city, radiusKm: 20 },
        ...subs.slice(0, extraCount).map(s => ({ city: `${s}, ${city}`, radiusKm: 8 })),
    ];
}
// ── Language & country name maps ──────────────────────────────────────────────
const LANG_MAP = {
    TR: 'tr', DE: 'de', FR: 'fr', GB: 'en', IT: 'it', ES: 'es', NL: 'nl', BE: 'fr',
    PL: 'pl', PT: 'pt', CZ: 'cs', HU: 'hu', SE: 'sv', AT: 'de', CH: 'de', NO: 'no',
    DK: 'da', FI: 'fi', GR: 'el', RO: 'ro', US: 'en', CA: 'en', MX: 'es', BR: 'pt',
    AR: 'es', AU: 'en', NZ: 'en', SG: 'en', IN: 'hi', CN: 'zh', JP: 'ja', KR: 'ko',
    AE: 'ar', SA: 'ar', EG: 'ar', MA: 'ar', ZA: 'en', NG: 'en', KE: 'sw',
};
const COUNTRY_NAME_MAP = {
    TR: 'Turkey', DE: 'Germany', FR: 'France', GB: 'United Kingdom', IT: 'Italy',
    ES: 'Spain', NL: 'Netherlands', BE: 'Belgium', PL: 'Poland', PT: 'Portugal',
    CZ: 'Czech Republic', HU: 'Hungary', SE: 'Sweden', AT: 'Austria', CH: 'Switzerland',
    NO: 'Norway', DK: 'Denmark', FI: 'Finland', GR: 'Greece', RO: 'Romania',
    US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina',
    AU: 'Australia', NZ: 'New Zealand', SG: 'Singapore', IN: 'India', CN: 'China',
    JP: 'Japan', KR: 'South Korea', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
    EG: 'Egypt', MA: 'Morocco', ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya',
};
// ── Sector classifier ─────────────────────────────────────────────────────────
// Maps raw keyword / Google category → clean Turkish sector label.
const SECTOR_KW = [
    ['restoran', 'Yiyecek & İçecek'], ['restaurant', 'Yiyecek & İçecek'], ['kafe', 'Yiyecek & İçecek'],
    ['cafe', 'Yiyecek & İçecek'], ['lokanta', 'Yiyecek & İçecek'], ['pastane', 'Yiyecek & İçecek'],
    ['dişçi', 'Sağlık & Tıp'], ['diş', 'Sağlık & Tıp'], ['doktor', 'Sağlık & Tıp'],
    ['klinik', 'Sağlık & Tıp'], ['eczane', 'Sağlık & Tıp'], ['hastane', 'Sağlık & Tıp'],
    ['optik', 'Sağlık & Tıp'], ['fizyoterapi', 'Sağlık & Tıp'],
    ['avukat', 'Hukuk & Danışmanlık'], ['hukuk', 'Hukuk & Danışmanlık'],
    ['muhasebe', 'Hukuk & Danışmanlık'], ['danışman', 'Hukuk & Danışmanlık'],
    ['mobilya', 'Mobilya & Dekorasyon'], ['dekorasyon', 'Mobilya & Dekorasyon'],
    ['koltuk', 'Mobilya & Dekorasyon'], ['ev tekstil', 'Mobilya & Dekorasyon'],
    ['inşaat', 'İnşaat & Yapı'], ['yapı', 'İnşaat & Yapı'], ['tadilat', 'İnşaat & Yapı'],
    ['boya', 'İnşaat & Yapı'], ['zemin', 'İnşaat & Yapı'], ['panel', 'İnşaat & Yapı'],
    ['güzellik', 'Güzellik & Bakım'], ['kuaför', 'Güzellik & Bakım'], ['berber', 'Güzellik & Bakım'],
    ['estetik', 'Güzellik & Bakım'], ['spa', 'Güzellik & Bakım'], ['nail', 'Güzellik & Bakım'],
    ['oto', 'Otomotiv'], ['araba', 'Otomotiv'], ['araç', 'Otomotiv'], ['galerisi', 'Otomotiv'],
    ['lastik', 'Otomotiv'], ['servis', 'Otomotiv'], ['yedek parça', 'Otomotiv'],
    ['yazılım', 'Teknoloji & Yazılım'], ['teknoloji', 'Teknoloji & Yazılım'],
    ['bilgisayar', 'Teknoloji & Yazılım'], ['web', 'Teknoloji & Yazılım'],
    ['tekstil', 'Tekstil & Giyim'], ['giyim', 'Tekstil & Giyim'], ['kumaş', 'Tekstil & Giyim'],
    ['konfeksiyon', 'Tekstil & Giyim'], ['moda', 'Tekstil & Giyim'],
    ['lojistik', 'Lojistik & Nakliye'], ['nakliye', 'Lojistik & Nakliye'], ['kargo', 'Lojistik & Nakliye'],
    ['taşımacılık', 'Lojistik & Nakliye'], ['depo', 'Lojistik & Nakliye'],
    ['otel', 'Turizm & Konaklama'], ['pansiyon', 'Turizm & Konaklama'], ['apart', 'Turizm & Konaklama'],
    ['turizm', 'Turizm & Konaklama'], ['tatil', 'Turizm & Konaklama'],
    ['okul', 'Eğitim'], ['dershane', 'Eğitim'], ['kurs', 'Eğitim'], ['eğitim', 'Eğitim'],
    ['akademi', 'Eğitim'], ['üniversite', 'Eğitim'],
    ['mühendis', 'Mühendislik & Teknik'], ['makine', 'Mühendislik & Teknik'],
    ['elektrik', 'Mühendislik & Teknik'], ['elektronik', 'Mühendislik & Teknik'],
    ['metal', 'Mühendislik & Teknik'], ['çelik', 'Mühendislik & Teknik'],
    ['gıda', 'Gıda & Tarım'], ['tarım', 'Gıda & Tarım'], ['market', 'Gıda & Tarım'],
    ['manav', 'Gıda & Tarım'], ['kasap', 'Gıda & Tarım'],
    ['hukuk', 'Hukuk & Danışmanlık'], ['sigorta', 'Finans & Sigorta'],
    ['finans', 'Finans & Sigorta'], ['banka', 'Finans & Sigorta'],
    ['temizlik', 'Temizlik & Hizmet'], ['çevre', 'Temizlik & Hizmet'],
    ['güvenlik', 'Güvenlik & Koruma'], ['kamera', 'Güvenlik & Koruma'],
    ['reklam', 'Reklam & Pazarlama'], ['matbaa', 'Reklam & Pazarlama'],
    ['medya', 'Reklam & Pazarlama'], ['ajans', 'Reklam & Pazarlama'],
];
function classifySector(keyword, category) {
    const kw = keyword.toLowerCase();
    const cat = (category || '').toLowerCase();
    for (const [pattern, label] of SECTOR_KW) {
        if (kw.includes(pattern) || cat.includes(pattern))
            return label;
    }
    // If no match, title-case the first keyword word
    return keyword.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
async function runFinder(params) {
    const { query, cities, country, targetCount, radiusKm, requirePhone, requireWebsite, enrichEmail, userId, jobId, listName } = params;
    const updateJob = (patch) => {
        if (!jobId)
            return;
        const j = jobs.get(jobId);
        if (j)
            Object.assign(j, patch);
    };
    const updateSource = (src, status, count) => {
        if (!jobId)
            return;
        const j = jobs.get(jobId);
        if (j && j.sources[src]) {
            j.sources[src].status = status;
            j.sources[src].count = count;
        }
    };
    const countryName = COUNTRY_NAME_MAP[country] || country;
    const langCode = LANG_MAP[country] || 'en';
    const sourceBreakdown = { google_places: 0, apify: 0, osm: 0, yelp: 0, foursquare: 0, here: 0, registry: 0 };
    const allLeads = [];
    const perCityTarget = Math.max(10, Math.ceil(targetCount / cities.length));
    // ── Primary: Direct Google Places API (if key available) ─────────────────────
    if (GOOGLE_PLACES_KEY) {
        updateSource('google_places', 'running', 0);
        for (let i = 0; i < cities.length; i++) {
            const cityName = cities[i];
            updateJob({ phase: cities.length > 1 ? `${cityName} Google Maps taranıyor... (${i + 1}/${cities.length})` : 'Google Places taranıyor...' });
            const coords = await geocodeCity(cityName, countryName);
            const gpLeads = await googlePlacesSearch({ query, city: cityName, lat: coords.lat, lng: coords.lng, radiusKm, langCode, targetCount: perCityTarget });
            gpLeads.forEach(l => { l.searchCity = cityName; });
            allLeads.push(...gpLeads);
            sourceBreakdown.google_places += gpLeads.length;
            updateSource('google_places', 'running', sourceBreakdown.google_places);
            updateJob({ found: deduplicateLeads(allLeads).length });
            console.log(`[LeadFinder] Google Places ${cityName}: ${gpLeads.length} raw results`);
        }
        updateSource('google_places', 'done', sourceBreakdown.google_places);
    }
    else {
        updateSource('google_places', 'skipped', 0);
    }
    // ── Secondary: Apify Google Maps Scraper (runs when GP key unavailable) ──────
    if (APIFY_TOKEN && !GOOGLE_PLACES_KEY) {
        updateSource('apify', 'running', 0);
        for (let i = 0; i < cities.length; i++) {
            const cityName = cities[i];
            updateJob({ phase: cities.length > 1 ? `${cityName} taranıyor... (${i + 1}/${cities.length})` : 'Google Maps taranıyor...' });
            const apifyLeads = await apifySearch({ query, city: cityName, countryName, langCode, targetCount: perCityTarget });
            apifyLeads.forEach(l => { l.searchCity = cityName; });
            allLeads.push(...apifyLeads);
            sourceBreakdown.apify += apifyLeads.length;
            updateSource('apify', 'running', sourceBreakdown.apify);
            updateJob({ found: deduplicateLeads(allLeads).length });
            console.log(`[LeadFinder] Apify ${cityName}: ${apifyLeads.length} raw results`);
        }
        updateSource('apify', 'done', sourceBreakdown.apify);
    }
    else {
        updateSource('apify', 'skipped', 0);
    }
    // ── Supplementary: OSM (always free), Yelp, Foursquare, HERE ────────────────
    // Run when primary sources unavailable, or when total leads still below target
    const hasPrimary = GOOGLE_PLACES_KEY || APIFY_TOKEN;
    const needSupplement = !hasPrimary || allLeads.length < targetCount * 1.2;
    if (needSupplement) {
        for (let i = 0; i < cities.length; i++) {
            const cityName = cities[i];
            updateJob({ phase: `${cityName} haritalar taranıyor...` });
            const coords = await geocodeCity(cityName, countryName);
            // OSM — always try (free, no key needed)
            updateSource('osm', 'running', 0);
            const osmLeads = await osmSearch({ query, lat: coords.lat, lng: coords.lng, radiusKm });
            osmLeads.forEach(l => { l.searchCity = cityName; });
            allLeads.push(...osmLeads);
            sourceBreakdown.osm += osmLeads.length;
            updateSource('osm', 'done', sourceBreakdown.osm);
            console.log(`[LeadFinder] OSM ${cityName}: ${osmLeads.length} raw results`);
            if (YELP_KEY) {
                updateSource('yelp', 'running', 0);
                const yelpLeads = await yelpSearch({ query, city: cityName, countryName, targetCount: perCityTarget });
                yelpLeads.forEach(l => { l.searchCity = cityName; });
                allLeads.push(...yelpLeads);
                sourceBreakdown.yelp += yelpLeads.length;
                updateSource('yelp', 'done', sourceBreakdown.yelp);
            }
            else {
                updateSource('yelp', 'skipped', 0);
            }
            if (FSQ_KEY) {
                updateSource('foursquare', 'running', 0);
                const fsqLeads = await foursquareSearch({ query, lat: coords.lat, lng: coords.lng, radiusKm, targetCount: perCityTarget });
                fsqLeads.forEach(l => { l.searchCity = cityName; });
                allLeads.push(...fsqLeads);
                sourceBreakdown.foursquare += fsqLeads.length;
                updateSource('foursquare', 'done', sourceBreakdown.foursquare);
            }
            else {
                updateSource('foursquare', 'skipped', 0);
            }
            if (HERE_KEY) {
                updateSource('here', 'running', 0);
                const hereLeads = await hereSearch({ query, lat: coords.lat, lng: coords.lng, radiusKm });
                hereLeads.forEach(l => { l.searchCity = cityName; });
                allLeads.push(...hereLeads);
                sourceBreakdown.here += hereLeads.length;
                updateSource('here', 'done', sourceBreakdown.here);
            }
            else {
                updateSource('here', 'skipped', 0);
            }
            updateJob({ found: deduplicateLeads(allLeads).length });
        }
    }
    else {
        for (const src of ['osm', 'yelp', 'foursquare', 'here'])
            updateSource(src, 'skipped', 0);
    }
    // ── Registry search ───────────────────────────────────────────────────────────
    updateSource('registry', 'running', 0);
    const regLeads = await registrySearch({ query, country, city: cities[0], limit: Math.ceil(targetCount * 0.3) });
    regLeads.forEach(l => { l.searchCity = cities[0]; });
    allLeads.push(...regLeads);
    sourceBreakdown.registry += regLeads.length;
    updateSource('registry', 'done', sourceBreakdown.registry);
    updateJob({ phase: 'Sonuçlar hazırlanıyor...' });
    let deduped = deduplicateLeads(allLeads);
    updateJob({ found: deduped.length });
    updateJob({ phase: 'Tekrarlar temizleniyor...' });
    let unique = deduped;
    // Apply quality filters
    if (requirePhone)
        unique = unique.filter(l => l.phone);
    if (requireWebsite)
        unique = unique.filter(l => l.website);
    // CRM deduplication — don't re-add existing leads
    const { data: existing } = await supabase
        .from('leads').select('company_name, phone')
        .eq('user_id', userId).limit(5000);
    const crmNames = new Set((existing || []).map((l) => normalizeName(l.company_name || '')));
    const crmPhones = new Set((existing || []).map((l) => l.phone ? normalizePhone(l.phone) : null).filter(Boolean));
    let skipped = 0;
    unique = unique.filter(l => {
        const nk = normalizeName(l.company_name);
        const pk = l.phone ? normalizePhone(l.phone) : null;
        if (crmNames.has(nk)) {
            skipped++;
            return false;
        }
        if (pk && crmPhones.has(pk)) {
            skipped++;
            return false;
        }
        return true;
    });
    updateJob({ skipped, phase: enrichEmail ? 'Email keşfediliyor...' : 'Sosyal medya taranıyor...' });
    // Email enrichment (bounded concurrency)
    if (enrichEmail) {
        const toEnrich = unique.filter(l => l.website && !l.email).slice(0, 120);
        const CONCURRENCY = 6;
        for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
            await Promise.allSettled(toEnrich.slice(i, i + CONCURRENCY).map(async (lead) => {
                try {
                    const e = await discoverEmail(lead.website);
                    if (e)
                        lead.email = e;
                }
                catch { }
            }));
        }
    }
    // Social media extraction — scrape website for FB/IG/YT/LI/TW links
    updateJob({ phase: 'Sosyal medya linkleri aranıyor...' });
    const toSocial = unique.filter(l => l.website && !l.instagram && !l.facebook).slice(0, 80);
    const SOC_CONCURRENCY = 8;
    for (let i = 0; i < toSocial.length; i += SOC_CONCURRENCY) {
        await Promise.allSettled(toSocial.slice(i, i + SOC_CONCURRENCY).map(async (lead) => {
            try {
                const soc = await extractSocialLinks(lead.website);
                if (soc.facebook)
                    lead.facebook = lead.facebook || soc.facebook;
                if (soc.instagram)
                    lead.instagram = lead.instagram || soc.instagram;
                if (soc.linkedin_url)
                    lead.linkedin_url = lead.linkedin_url || soc.linkedin_url;
                if (soc.youtube)
                    lead.youtube = lead.youtube || soc.youtube;
                if (soc.twitter)
                    lead.twitter = lead.twitter || soc.twitter;
            }
            catch { }
        }));
    }
    // Score, sort, apply minScore filter, truncate
    unique = unique
        .map(l => ({ ...l, score: scoreLead(l) }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));
    const { minScore = 0 } = params;
    if (minScore > 0) {
        unique = unique.filter(l => (l.score || 0) >= minScore);
    }
    unique = unique.slice(0, targetCount);
    // Batch insert to Supabase
    updateJob({ phase: 'Veritabanına kaydediliyor...' });
    let saved = 0;
    const insertedIds = [];
    const toInsert = unique.map(l => {
        const notesBase = [l.address, l.category].filter(Boolean).join(' | ') || null;
        const notes = listName
            ? `[📁 ${listName}]${notesBase ? ` | ${notesBase}` : ''}`
            : notesBase;
        return {
            user_id: userId,
            company_name: l.company_name,
            phone: l.phone || null,
            email: l.email || null,
            website: l.website || null,
            instagram: l.instagram || null,
            facebook: l.facebook || null,
            linkedin_url: l.linkedin_url || null,
            youtube: l.youtube || null,
            twitter: l.twitter || null,
            city: l.searchCity || cities[0],
            sector: params.sector || classifySector(query, l.category),
            source: l.sources && l.sources.length > 1 ? l.sources.join('+') : (l.source || 'lead_finder'),
            maps_url: l.maps_url || null,
            opening_hours: l.opening_hours || null,
            status: 'new',
            score: l.score || 0,
            notes,
        };
    });
    for (let i = 0; i < toInsert.length; i += 50) {
        let { data, error } = await supabase.from('leads').insert(toInsert.slice(i, i + 50)).select('id');
        if (error?.message?.includes('column')) {
            // Step 1: drop only new columns (maps_url, opening_hours) — social cols may already exist
            console.warn('[LeadFinder] Unknown column, retrying without maps/hours:', error.message.slice(0, 80));
            const f1 = toInsert.slice(i, i + 50).map(({ maps_url, opening_hours, ...r }) => r);
            let { data: d1, error: e1 } = await supabase.from('leads').insert(f1).select('id');
            if (e1?.message?.includes('column')) {
                // Step 2: social cols also missing — drop them too
                console.warn('[LeadFinder] Social cols also missing, dropping all extended fields');
                const f2 = f1.map(({ facebook, linkedin_url, youtube, twitter, instagram, ...r }) => r);
                ({ data, error } = await supabase.from('leads').insert(f2).select('id'));
            }
            else {
                data = d1;
                error = e1;
            }
        }
        if (error)
            console.error('[LeadFinder] Insert error:', error.message);
        if (data) {
            saved += data.length;
            insertedIds.push(...data.map((r) => r.id));
        }
        updateJob({ saved, leadIds: insertedIds });
    }
    // Auto-enrich new leads in background (fire-and-forget)
    try {
        const { addEnrichmentJob } = require('../lib/queue');
        for (let i = 0; i < insertedIds.length; i++) {
            const src = unique[i];
            if (src) {
                addEnrichmentJob({
                    leadId: insertedIds[i],
                    userId: toInsert[0]?.user_id || '',
                    website: src.website || undefined,
                    companyName: src.company_name,
                    city: src.searchCity || undefined,
                    sector: src.category || undefined,
                }).catch(() => { });
            }
        }
    }
    catch { }
    return { saved, skipped, sourceBreakdown, savedLeadIds: insertedIds };
}
// ── Routes ────────────────────────────────────────────────────────────────────
// POST /api/lead-finder/search
router.post('/search', async (req, res) => {
    try {
        const { query, city, cities: citiesRaw, country = 'TR', sector, listName, targetCount = 50, radiusKm = 20, requirePhone = false, requireWebsite = false, enrichEmail = false, minScore = 0, } = req.body;
        const userId = req.userId;
        // Normalise: accept cities[] array or fall back to single city string
        const cities = Array.isArray(citiesRaw) && citiesRaw.length > 0
            ? citiesRaw
            : city ? [city] : [];
        if (!query || cities.length === 0)
            return res.status(400).json({ error: 'query ve en az bir city zorunlu' });
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
            const job = createJob(query, cities, limit, userId, listName);
            jobs.set(jobId, job);
            // Reserve credits
            await supabase.from('users')
                .update({ credits_used: (userData.credits_used || 0) + limit })
                .eq('id', userId);
            // Fire and forget
            runFinder({ query, cities, country, sector, listName, targetCount: limit, radiusKm, requirePhone, requireWebsite, enrichEmail, minScore: Number(minScore) || 0, userId, jobId })
                .then(({ saved, skipped, sourceBreakdown, savedLeadIds }) => {
                const j = jobs.get(jobId);
                if (j) {
                    j.status = 'done';
                    j.saved = saved;
                    j.skipped = skipped;
                    j.leadIds = savedLeadIds;
                    j.phase = `${saved} lead kaydedildi${skipped > 0 ? `, ${skipped} tekrar atlandı` : ''}`;
                }
                const diff = limit - saved;
                if (diff > 0) {
                    supabase.from('users').update({ credits_used: (userData.credits_used || 0) + saved }).eq('id', userId);
                }
            })
                .catch(e => {
                const j = jobs.get(jobId);
                if (j) {
                    j.status = 'error';
                    j.error = e.message;
                }
                supabase.from('users').update({ credits_used: userData.credits_used || 0 }).eq('id', userId);
            });
            return res.json({
                ok: true, jobId, async: true, total: limit,
                availableSources: {
                    apify: !!APIFY_TOKEN, yelp: !!YELP_KEY,
                    foursquare: !!FSQ_KEY, here: !!HERE_KEY, osm: true, registry: true,
                },
                message: 'Arka planda çalışıyor...',
            });
        }
        // Synchronous path (≤50 leads, no email enrichment)
        const { saved, skipped, sourceBreakdown, savedLeadIds } = await runFinder({
            query, cities, country, sector, listName, targetCount: limit, radiusKm,
            requirePhone, requireWebsite, enrichEmail: false, minScore: Number(minScore) || 0, userId,
        });
        await supabase.from('users')
            .update({ credits_used: (userData.credits_used || 0) + saved })
            .eq('id', userId);
        res.json({
            ok: true, saved, skipped, sourceBreakdown, savedLeadIds,
            message: `${saved} lead başarıyla eklendi!`,
        });
    }
    catch (e) {
        console.error('[LeadFinder] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
// GET /api/lead-finder/job/:jobId — poll job status
router.get('/job/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job)
        return res.status(404).json({ error: 'Job bulunamadı' });
    res.json(job);
});
// GET /api/lead-finder/job/:jobId/leads — fetch preview of saved leads for a completed job
router.get('/job/:jobId/leads', async (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job)
        return res.status(404).json({ error: 'Job bulunamadı' });
    if (!job.leadIds?.length)
        return res.json({ leads: [] });
    const { data, error } = await supabase
        .from('leads')
        .select('id, company_name, phone, email, website, city, score, sector, status')
        .in('id', job.leadIds.slice(0, 50))
        .order('score', { ascending: false });
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ leads: data || [] });
});
// GET /api/lead-finder/test-apify — sanity-check Apify with a small query
router.get('/test-apify', async (req, res) => {
    if (!APIFY_TOKEN)
        return res.status(400).json({ ok: false, error: 'APIFY_TOKEN env var is not set' });
    const query = String(req.query.q || 'restoran');
    const city = String(req.query.city || 'Istanbul');
    const t0 = Date.now();
    // Step 1: verify token validity
    let userInfo = null;
    let tokenError = null;
    try {
        const axios = require('axios');
        const userRes = await axios.get(`https://api.apify.com/v2/users/me`, {
            headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
            timeout: 10000,
        });
        userInfo = { username: userRes.data?.data?.username, plan: userRes.data?.data?.plan?.id };
    }
    catch (e) {
        tokenError = e.response?.data?.error?.message || e.message;
    }
    if (tokenError) {
        return res.status(200).json({ ok: false, stage: 'token_validation', error: tokenError, durationMs: Date.now() - t0 });
    }
    // Step 2: run a tiny actor call and capture error details
    let actorError = null;
    let leads = [];
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
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Apify 3min timeout')), 180000));
        const run = await Promise.race([runPromise, timeout]);
        const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 10 });
        leads = (items || []).map((p) => ({ name: p.title || p.name, phone: p.phone, address: p.address }));
    }
    catch (e) {
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
router.get('/sources', (_req, res) => {
    res.json({
        apify: { active: !!APIFY_TOKEN, label: 'Google Maps (Apify)', icon: 'G', free: false },
        osm: { active: true, label: 'OpenStreetMap', icon: 'O', free: true },
        yelp: { active: !!YELP_KEY, label: 'Yelp', icon: 'Y', free: true },
        foursquare: { active: !!FSQ_KEY, label: 'Foursquare', icon: '4', free: true },
        here: { active: !!HERE_KEY, label: 'HERE Maps', icon: 'H', free: true },
        registry: { active: true, label: 'Resmi Sicil', icon: 'R', free: true },
    });
});
module.exports = router;
