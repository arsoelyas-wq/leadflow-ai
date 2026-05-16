export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APIFY_TOKEN = process.env.APIFY_TOKEN;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Types ─────────────────────────────────────────────────────────────────────

interface IgProfile {
  username: string;
  display_name: string;
  bio: string;
  followers: number | null;
  following: number | null;
  post_count: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  is_business: boolean;
  category: string | null;
  instagram_url: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SKIP_USERNAMES = new Set([
  'explore','reels','stories','accounts','p','reel','tv','direct',
  'instagram','_n','_u','sharedfiles','hashtag','music',
]);

// Query templates ordered by yield quality
const buildQueries = (keyword: string, city: string) => [
  `site:instagram.com "${keyword}" "${city}"`,
  `instagram.com/p/ -site:instagram.com ${keyword} ${city} instagram iletişim`,
  `"instagram.com" ${keyword} ${city} -"/p/" -"/reel/"`,
  `${keyword} ${city} instagram.com profil`,
  `"@" ${keyword} ${city} instagram`,
];

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.7',
  'Cache-Control': 'no-cache',
};

const IG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.7',
  'Referer': 'https://www.instagram.com/',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCount(s: string): number | null {
  if (!s) return null;
  const clean = s.replace(/[.,\s]/g, '');
  const n = parseInt(clean, 10);
  return isNaN(n) ? null : n;
}

function extractFromBio(text: string): { email: string | null; phone: string | null; website: string | null } {
  const email  = text.match(/\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/)?.[0] || null;
  const phone  = text.match(/(?:\+?90[\s.-]?|0)5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/)?.[0]
                  ?.replace(/[\s.-]/g, '') || null;
  const website = text.match(/https?:\/\/(?:www\.)?[-\w@:%._+~#=]{2,256}\.[a-z]{2,6}\b[-\w@:%_+.~#?&/=]*/i)?.[0]
                  ?.replace(/\.$/, '') || null;
  return { email, phone, website };
}

function isValidUsername(u: string): boolean {
  return (
    u.length >= 2 && u.length <= 30 &&
    /^[\w.]+$/.test(u) &&
    !SKIP_USERNAMES.has(u) &&
    !u.startsWith('_') &&
    !/^\d+$/.test(u)
  );
}

// ── Step 1: Discover Instagram usernames via Google search ────────────────────

async function discoverUsernames(keyword: string, city: string, need: number): Promise<string[]> {
  const found = new Set<string>();
  const queries = buildQueries(keyword, city);

  for (const q of queries) {
    if (found.size >= need * 3) break;
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=tr&gl=tr`;
      const resp = await fetch(url, {
        headers: SCRAPE_HEADERS,
        signal: AbortSignal.timeout(12000),
      });
      if (!resp.ok) { await sleep(1500); continue; }
      const html = await resp.text();

      // Extract instagram.com/{username} links from search results
      const patterns = [
        /instagram\.com\/([\w.]{2,30})(?:\/|\?|&|"|'|<|\s)/g,
        /href="https:\/\/www\.instagram\.com\/([\w.]{2,30})\//g,
      ];
      for (const re of patterns) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null) {
          const u = m[1];
          if (isValidUsername(u)) found.add(u);
        }
      }

      console.log(`[Instagram] Query "${q.slice(0, 60)}" → ${found.size} usernames so far`);
      await sleep(900 + Math.random() * 500);
    } catch (e: any) {
      console.warn('[Instagram] Discovery error:', e.message?.slice(0, 60));
    }
  }

  return Array.from(found);
}

// ── Step 2: Enrich a single Instagram profile ─────────────────────────────────

async function enrichProfile(username: string): Promise<IgProfile | null> {
  try {
    const resp = await fetch(`https://www.instagram.com/${username}/`, {
      headers: IG_HEADERS,
      signal: AbortSignal.timeout(9000),
    });
    if (resp.status === 404) return null;
    if (!resp.ok) return null;

    const html = await resp.text();

    // ── Parse og: meta tags (always server-rendered) ──────────────────────────
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
                 || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1] || '';
    const ogDesc  = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1]
                 || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)?.[1] || '';

    // og:title → "Display Name (@username) • Instagram photos and videos"
    const displayName = ogTitle.split(/[•(]/)[0].trim() || username;

    // og:description → "1,234 Followers, 567 Following, 89 Posts - Bio text"
    const followersM = ogDesc.match(/([\d,\.]+)\s*(?:Followers?|Takipçi)/i);
    const followingM = ogDesc.match(/([\d,\.]+)\s*(?:Following|Takip\s)/i);
    const postsM     = ogDesc.match(/([\d,\.]+)\s*(?:Posts?|Gönderi)/i);

    const followers = followersM ? parseCount(followersM[1]) : null;
    const following = followingM ? parseCount(followingM[1]) : null;
    const postCount = postsM     ? parseCount(postsM[1])     : null;

    // Bio is the text after the stats prefix "X Followers, Y Following, Z Posts - "
    const dashIdx = ogDesc.indexOf(' - ');
    const bio = dashIdx > 0 ? ogDesc.slice(dashIdx + 3).trim() : ogDesc;

    // ── Try to extract richer data from embedded JSON ─────────────────────────
    let businessEmail: string | null = null;
    let businessPhone: string | null = null;
    let businessCategory: string | null = null;
    let externalUrl: string | null = null;
    let isBusiness = false;
    let jsonFollowers: number | null = null;

    // Match patterns seen in Instagram's script blocks
    const jsonPatterns: Array<[RegExp, (m: RegExpMatchArray) => void]> = [
      [/"business_email":"([^"]+)"/,            m => { businessEmail    = m[1]; }],
      [/"business_phone_number":"([^"]+)"/,     m => { businessPhone    = m[1]; }],
      [/"business_category_name":"([^"]+)"/,    m => { businessCategory = m[1]; }],
      [/"external_url":"([^"]+)"/,              m => { externalUrl      = m[1].replace(/\\/g, ''); }],
      [/"is_business_account":true/,            () => { isBusiness      = true; }],
      [/"is_professional_account":true/,        () => { isBusiness      = true; }],
      [/"edge_followed_by":\{"count":(\d+)\}/,  m => { jsonFollowers    = parseInt(m[1], 10); }],
      [/"follower_count":(\d+)/,                m => { jsonFollowers    = parseInt(m[1], 10); }],
    ];

    for (const [re, handler] of jsonPatterns) {
      const m = html.match(re);
      if (m) handler(m);
    }

    // Bio contact extraction
    const bioContacts = extractFromBio(bio);

    // Merge: JSON data takes priority over bio regex
    const email   = businessEmail   || bioContacts.email   || null;
    const phone   = businessPhone   || bioContacts.phone   || null;
    const website = externalUrl     || bioContacts.website || null;

    return {
      username,
      display_name: displayName,
      bio: bio.slice(0, 300),
      followers: jsonFollowers ?? followers,
      following,
      post_count: postCount,
      email,
      phone,
      website,
      is_business: isBusiness,
      category: businessCategory,
      instagram_url: `https://instagram.com/${username}`,
    };
  } catch (e: any) {
    console.warn(`[Instagram] Enrich ${username} failed:`, e.message?.slice(0, 60));
    return null;
  }
}

// ── Step 3: Enrich profiles concurrently (max 5 at a time) ───────────────────

async function enrichBatch(usernames: string[]): Promise<IgProfile[]> {
  const results: IgProfile[] = [];
  const CONCURRENCY = 5;

  for (let i = 0; i < usernames.length; i += CONCURRENCY) {
    const chunk = usernames.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map(u => enrichProfile(u)));
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
    // Polite rate limit between batches (~60 req/hour limit)
    if (i + CONCURRENCY < usernames.length) await sleep(1500);
  }

  return results;
}

// ── Quality score for Instagram leads ─────────────────────────────────────────

function scoreIgLead(p: IgProfile): number {
  let s = 0;
  if (p.phone)       s += 35;
  if (p.email)       s += 30;
  if (p.website)     s += 15;
  if (p.is_business) s += 10;
  const f = p.followers || 0;
  if      (f >= 10000) s += 10;
  else if (f >= 1000)  s += 7;
  else if (f >= 100)   s += 3;
  return Math.min(s, 100);
}

// ── Apify-based Instagram search (primary — uses residential proxies) ────────
// Two phases: 1) hashtag scraping for username discovery, 2) profile enrichment.
// Apify bypasses Instagram's cloud-IP blocks that break the direct-fetch method.

function buildHashtags(keyword: string, city: string): string[] {
  const clean = (s: string) =>
    s.toLowerCase()
      .replace(/[ğ]/g, 'g').replace(/[ş]/g, 's').replace(/[ç]/g, 'c')
      .replace(/[ö]/g, 'o').replace(/[ü]/g, 'u').replace(/[ı]/g, 'i').replace(/[İ]/g, 'i')
      .replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  const kw = clean(keyword);
  const ct = clean(city);
  const extras = keyword.trim().split(/\s+/).map(w => clean(w)).filter(w => w.length >= 3 && w !== kw);
  return [kw, `${kw}${ct}`, `${ct}${kw}`, ...extras]
    .filter((h, i, a) => h.length >= 3 && a.indexOf(h) === i)
    .slice(0, 4);
}

async function apifyInstagramSearch(keyword: string, city: string, limit: number): Promise<IgProfile[]> {
  if (!APIFY_TOKEN) return [];
  const { ApifyClient } = require('apify-client');
  const client = new ApifyClient({ token: APIFY_TOKEN });

  const hashtags = buildHashtags(keyword, city);
  const hashtagUrls = hashtags.map(h => `https://www.instagram.com/explore/tags/${encodeURIComponent(h)}/`);
  console.log(`[Instagram/Apify] Hashtags: ${hashtags.join(', ')}`);

  // ── Phase 1: Discover usernames via hashtag posts ─────────────────────────
  let usernames: string[] = [];
  try {
    const run1 = await Promise.race([
      client.actor('apify/instagram-scraper').call({
        directUrls:   hashtagUrls,
        resultsType:  'posts',
        resultsLimit: limit * 5,
        addParentData: false,
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Apify hashtag timeout')), 100_000)),
    ]);
    const { items: posts } = await client.dataset(run1.defaultDatasetId).listItems({ limit: 600 });
    usernames = [
      ...new Set(posts.map((p: any) => p.ownerUsername || p.username).filter(Boolean)),
    ].slice(0, limit * 3) as string[];
    console.log(`[Instagram/Apify] Phase 1: ${posts.length} posts → ${usernames.length} unique usernames`);
  } catch (e: any) {
    console.error('[Instagram/Apify] Hashtag discovery failed:', e.message?.slice(0, 80));
    return [];
  }

  if (!usernames.length) return [];

  // ── Phase 2: Enrich profiles (get bio, email, phone, website) ────────────
  const profileUrls = usernames.slice(0, limit * 2).map(u => `https://www.instagram.com/${u}/`);
  try {
    const run2 = await Promise.race([
      client.actor('apify/instagram-scraper').call({
        directUrls:   profileUrls,
        resultsType:  'posts',
        resultsLimit: 3,      // 3 posts per profile is enough to capture owner data
        addParentData: true,
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Apify profile timeout')), 120_000)),
    ]);
    const { items: enriched } = await client.dataset(run2.defaultDatasetId).listItems({ limit: 2000 });

    const profileMap = new Map<string, IgProfile>();
    for (const item of enriched) {
      const u: string = item.ownerUsername || item.username;
      if (!u || profileMap.has(u)) continue;

      // Bio contact extraction as fallback
      const rawBio = item.ownerBiography || item.biography || item.caption || '';
      const bioContacts = extractFromBio(rawBio);

      profileMap.set(u, {
        username:     u,
        display_name: item.ownerFullName || item.fullName || u,
        bio:          rawBio.slice(0, 300),
        followers:    item.ownerFollowersCount ?? item.followersCount ?? null,
        following:    item.followsCount ?? null,
        post_count:   item.ownerPostsCount ?? item.postsCount ?? null,
        email:        item.ownerBusinessEmail   || item.businessEmail   || bioContacts.email   || null,
        phone:        item.ownerBusinessPhoneNumber || item.businessPhoneNumber || bioContacts.phone || null,
        website:      item.ownerExternalUrl     || item.externalUrl     || bioContacts.website || null,
        is_business:  item.ownerIsBusinessAccount ?? item.isBusinessAccount ?? false,
        category:     item.ownerBusinessCategoryName || item.businessCategoryName || null,
        instagram_url: `https://instagram.com/${u}`,
      });
    }
    console.log(`[Instagram/Apify] Phase 2: enriched ${profileMap.size} profiles`);
    return Array.from(profileMap.values());
  } catch (e: any) {
    console.error('[Instagram/Apify] Profile enrichment failed:', e.message?.slice(0, 80));
    return [];
  }
}

// ── Main search function (used by lead-finder.ts) ─────────────────────────────

async function instagramSearch(params: {
  query: string;
  city: string;
  limit: number;
}): Promise<Array<{
  company_name: string; phone: string | null; email: string | null;
  website: string | null; source: string; instagram_url: string;
  followers: number | null; category: string | null; score: number;
  is_business: boolean; bio: string;
}>> {
  const { query, city, limit } = params;
  console.log(`[Instagram] Searching "${query}" in "${city}", limit: ${limit}`);

  let profiles: IgProfile[] = [];

  // Primary: Apify (reliable from cloud servers — uses residential proxies)
  if (APIFY_TOKEN) {
    profiles = await apifyInstagramSearch(query, city, limit);
  }

  // Fallback: direct Google search + Instagram fetch (unreliable from cloud IPs)
  if (!profiles.length && !APIFY_TOKEN) {
    console.log('[Instagram] No Apify token — trying direct method (may fail from cloud)');
    const usernames = await discoverUsernames(query, city, limit);
    console.log(`[Instagram] Discovered ${usernames.length} unique usernames`);
    if (usernames.length > 0) {
      profiles = await enrichBatch(usernames.slice(0, limit * 2));
    }
  }

  console.log(`[Instagram] Final: ${profiles.length} profiles`);

  return profiles
    .map(p => ({
      company_name:   p.display_name || p.username,
      phone:          p.phone,
      email:          p.email,
      website:        p.website,
      source:         'instagram',
      instagram_url:  p.instagram_url,
      followers:      p.followers,
      category:       p.category,
      score:          scoreIgLead(p),
      is_business:    p.is_business,
      bio:            p.bio,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/instagram/find — main endpoint
router.post('/find', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { keyword, city, limit = 30 } = req.body;
    if (!keyword || !city) return res.status(400).json({ error: 'keyword ve city zorunlu' });

    if (!APIFY_TOKEN) {
      return res.status(503).json({
        error: 'Instagram arama için APIFY_TOKEN gerekli. Railway → Variables → APIFY_TOKEN ekleyin.',
        apify_required: true,
      });
    }
    const cap = Math.max(5, Math.min(Number(limit), 200));
    const leads = await instagramSearch({ query: keyword, city, limit: cap });

    let added = 0, duplicate = 0;
    for (const lead of leads) {
      const { data: ex } = await supabase.from('leads').select('id').eq('user_id', userId)
        .or(`instagram_url.eq.${lead.instagram_url}${lead.phone ? `,phone.eq.${lead.phone}` : ''}`)
        .maybeSingle();
      if (ex) { duplicate++; continue; }

      await supabase.from('leads').insert([{
        user_id: userId,
        company_name: lead.company_name,
        phone:   lead.phone,
        email:   lead.email,
        website: lead.website,
        city,
        sector:  keyword,
        source:  'instagram',
        status:  'new',
        score:   lead.score,
        notes:   [
          lead.instagram_url,
          lead.followers ? `${lead.followers.toLocaleString()} takipçi` : null,
          lead.category,
          lead.bio?.slice(0, 100),
        ].filter(Boolean).join(' | ') || null,
      }]);
      added++;
    }

    res.json({
      ok: true, found: leads.length, added, duplicate,
      message: `${added} Instagram lead eklendi`,
      sample: leads.slice(0, 5).map(l => ({
        name: l.company_name, followers: l.followers,
        phone: l.phone, email: l.email, is_business: l.is_business,
      })),
    });
  } catch (e: any) {
    console.error('[Instagram] find error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/instagram/scrape — backward compat
router.post('/scrape', async (req: any, res: any) => {
  req.body.keyword = req.body.keyword || req.body.query;
  req.body.limit   = req.body.limit   || req.body.limitPerCombination || 20;
  return router.handle(Object.assign(req, { url: '/find', path: '/find' }), res, () => {});
});

// GET /api/instagram/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads').select('id').eq('user_id', req.userId).eq('source', 'instagram');
    res.json({ total: data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.instagramSearch = instagramSearch;
