export {};
const express   = require('express');
const { createClient } = require('@supabase/supabase-js');
const cheerio   = require('cheerio');
const axios     = require('axios');
const { getCountryByCode } = require('../config/countries');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

// ── DATA COLLECTION ───────────────────────────────────────────────────────────
async function fetchCompetitorData(name: string, website: string, countryCode = 'TR'): Promise<any> {
  const country = getCountryByCode(countryCode);
  const { queries } = country;

  const data: any = {
    name,
    timestamp: new Date().toISOString(),
    pricing: [] as string[],
    products: [] as string[],
    reviews: { count: 0, avg: 0, recent: [] as string[] },
    social: { instagram: '', facebook: '', linkedin: '' },
    techStack: [] as string[],
    jobPostings: [] as string[],
    complaints: [] as string[],
  };

  // 1. Website scraping
  if (website) {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      const res = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 12000, maxRedirects: 3 });
      const $ = cheerio.load(res.data);

      const priceRx = /[\d.,]+\s*(₺|TL|USD|\$|EUR|€|£|SAR|AED|BRL|R\$|MXN)/g;
      const priceSelectors = '[class*="price"],[class*="fiyat"],[class*="preis"],[class*="prix"],[class*="precio"],[class*="preço"],[data-price]';
      $(priceSelectors).each((_: any, el: any) => {
        const text = $(el).text().trim().slice(0, 60);
        const m = text.match(priceRx);
        if (m) m.forEach((p: string) => { if (!data.pricing.includes(p)) data.pricing.push(p); });
      });
      data.pricing = data.pricing.slice(0, 10);

      const prodSelectors = '[class*="product"],[class*="urun"],[class*="hizmet"],[class*="service"],[class*="produkt"],[class*="article"],[class*="catalog"]';
      $(prodSelectors).find('h2,h3,h4').each((_: any, el: any) => {
        const text = $(el).text().trim();
        if (text.length > 3 && text.length < 100 && !data.products.includes(text)) data.products.push(text);
      });
      data.products = data.products.slice(0, 15);

      $('a[href]').each((_: any, el: any) => {
        const href = $(el).attr('href') || '';
        if (href.includes('instagram.com') && !data.social.instagram) data.social.instagram = href;
        if (href.includes('facebook.com') && !data.social.facebook) data.social.facebook = href;
        if (href.includes('linkedin.com') && !data.social.linkedin) data.social.linkedin = href;
      });

      const html = res.data as string;
      const techMap: Record<string, string> = {
        'wp-content': 'WordPress', 'shopify': 'Shopify', 'wix.com': 'Wix',
        'squarespace': 'Squarespace', 'gtag': 'Google Analytics', 'fbq(': 'Meta Pixel',
        'hotjar': 'Hotjar', 'hubspot': 'HubSpot', 'zendesk': 'Zendesk',
        'intercom': 'Intercom', 'next/': 'Next.js', '__nuxt': 'Nuxt.js',
        'cloudflare': 'Cloudflare', 'crisp': 'Crisp Chat', 'tawk': 'Tawk',
      };
      for (const [key, label] of Object.entries(techMap)) {
        if (html.toLowerCase().includes(key) && !data.techStack.includes(label)) data.techStack.push(label);
      }
    } catch { /* website scraping failed */ }
    await sleep(500);
  }

  // 2. Complaint site (Şikayetvar TR / Trustpilot global)
  try {
    if (countryCode === 'TR') {
      const svRes = await axios.get(
        `https://www.sikayetvar.com/search?q=${encodeURIComponent(name)}`,
        { headers: { 'User-Agent': UA }, timeout: 8000 }
      );
      const $sv = cheerio.load(svRes.data);
      $sv('.complaint-title, .sb-card__title, h3.title').each((_: any, el: any) => {
        const text = $sv(el).text().trim();
        if (text.length > 10 && !data.complaints.includes(text)) data.complaints.push(text);
      });
      data.complaints = data.complaints.slice(0, 8);
      const countMatch = $sv('.total-complaint').first().text().match(/[\d.]+/);
      if (countMatch) data.reviews.count = parseInt(countMatch[0].replace('.', ''));
    } else {
      const tpRes = await axios.get(
        `https://www.trustpilot.com/search?query=${encodeURIComponent(name)}`,
        { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, timeout: 8000 }
      );
      const $tp = cheerio.load(tpRes.data);
      const ratingLabel = $tp('[data-rating-typography]').first().attr('aria-label') || '';
      const rm = ratingLabel.match(/[\d.]+/);
      if (rm) data.reviews.avg = parseFloat(rm[0]);
      const reviewText = $tp('.reviews-count').first().text();
      const cm = reviewText.match(/[\d,]+/);
      if (cm) data.reviews.count = parseInt(cm[0].replace(/,/g, ''));
    }
  } catch { /* complaint failed */ }
  await sleep(500);

  // 3. Job postings (growth signal)
  try {
    const jobQ = `"${name}" ${queries.business} (iş ilanı OR kariyer OR "join us" OR "we're hiring" OR Stellenangebot OR emploi)`;
    const jobRes = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(jobQ)}&num=5&hl=en`,
      { headers: { 'User-Agent': UA }, timeout: 8000 }
    );
    const $j = cheerio.load(jobRes.data);
    $j('h3').each((_: any, el: any) => {
      const text = $j(el).text().trim();
      if (text.length < 100 && (text.toLowerCase().includes('join') || text.toLowerCase().includes('hiring') || text.includes('ilanı') || text.includes('kariyer'))) {
        data.jobPostings.push(text);
      }
    });
    data.jobPostings = data.jobPostings.slice(0, 5);
  } catch { /* job failed */ }

  return data;
}

// ── CHANGE DETECTION ──────────────────────────────────────────────────────────
function detectChanges(oldData: any, newData: any): Array<{ type: string; label: string; severity: string }> {
  if (!oldData) return [{ type: 'first_scan', label: 'İlk tarama tamamlandı', severity: 'info' }];
  const changes: Array<{ type: string; label: string; severity: string }> = [];

  const newPrices = newData.pricing.filter((p: string) => !(oldData.pricing || []).includes(p));
  const removedPrices = (oldData.pricing || []).filter((p: string) => !newData.pricing.includes(p));
  if (newPrices.length) changes.push({ type: 'price_new', label: `Yeni fiyat: ${newPrices.slice(0, 2).join(', ')}`, severity: 'warning' });
  if (removedPrices.length) changes.push({ type: 'price_removed', label: `Fiyat kaldırıldı: ${removedPrices.slice(0, 2).join(', ')}`, severity: 'info' });

  const newProds = newData.products.filter((p: string) => !(oldData.products || []).includes(p));
  if (newProds.length) changes.push({ type: 'product_new', label: `Yeni ürün/hizmet: ${newProds.slice(0, 2).join(', ')}`, severity: 'info' });

  if (oldData.reviews?.avg && newData.reviews.avg && Math.abs(newData.reviews.avg - oldData.reviews.avg) >= 0.2) {
    const dir = newData.reviews.avg > oldData.reviews.avg ? '⬆️ yükseldi' : '⬇️ düştü';
    changes.push({ type: 'rating', label: `Rating ${dir}: ${oldData.reviews.avg} → ${newData.reviews.avg}`, severity: newData.reviews.avg < oldData.reviews.avg ? 'danger' : 'info' });
  }

  if (oldData.reviews?.count && newData.reviews.count) {
    const diff = newData.reviews.count - oldData.reviews.count;
    const pct = oldData.reviews.count > 0 ? diff / oldData.reviews.count : 0;
    if (diff > 10 || pct > 0.5) changes.push({ type: 'reviews_spike', label: `Yorum patlaması: ${oldData.reviews.count} → ${newData.reviews.count} (+${diff})`, severity: 'warning' });
  }

  const newComplaints = newData.complaints.filter((c: string) => !(oldData.complaints || []).includes(c));
  if (newComplaints.length) changes.push({ type: 'complaints', label: `${newComplaints.length} yeni şikayet — fırsat!`, severity: 'danger' });

  if ((newData.jobPostings?.length || 0) > (oldData.jobPostings?.length || 0)) {
    changes.push({ type: 'hiring', label: 'Yeni iş ilanı — rakip büyüyor, hızlan!', severity: 'warning' });
  }

  const newTech = (newData.techStack || []).filter((t: string) => !(oldData.techStack || []).includes(t));
  if (newTech.length) changes.push({ type: 'tech', label: `Yeni teknoloji: ${newTech.join(', ')}`, severity: 'info' });

  return changes;
}

// ── THREAT SCORE (0-100) ─────────────────────────────────────────────────────
function calcThreatScore(data: any, changes: any[]): number {
  let score = 20;
  if ((data.pricing?.length || 0) > 3) score += 10;
  if ((data.products?.length || 0) > 5) score += 10;
  if (data.reviews?.avg >= 4.5) score += 20;
  else if (data.reviews?.avg >= 4.0) score += 10;
  if (data.reviews?.count > 100) score += 10;
  if ((data.techStack?.length || 0) > 3) score += 5;
  if ((data.jobPostings?.length || 0) > 0) score += 15;
  if (changes.some((c: any) => c.type === 'price_new')) score += 5;
  if (changes.some((c: any) => c.type === 'complaints')) score -= 15;
  if (changes.some((c: any) => c.type === 'hiring')) score += 10;
  return Math.max(0, Math.min(100, score));
}

// ── AI INSIGHT ────────────────────────────────────────────────────────────────
async function generateAIInsight(name: string, data: any, changes: any[]): Promise<any> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Rakip istihbarat analizi: "${name}"
Fiyatlar: ${(data.pricing || []).slice(0,4).join(', ') || 'Tespit edilemedi'}
Ürünler: ${(data.products || []).slice(0,4).join(', ') || 'Tespit edilemedi'}
Rating: ${data.reviews?.avg || '?'}/5 (${data.reviews?.count || 0} yorum)
Şikayetler: ${(data.complaints || []).slice(0,3).join(' | ') || 'Yok'}
Değişiklikler: ${changes.map((c: any) => c.label).join(' | ') || 'Yok'}
İş ilanları: ${(data.jobPostings || []).length > 0 ? 'Var — büyüme sinyali' : 'Yok'}
Tech: ${(data.techStack || []).join(', ') || 'Bilinmiyor'}

SADECE JSON döndür:
{"insight":"rakip hakkında 1 cümle gözlem","opportunity":"bizim için en büyük fırsat","threat":"en kritik tehdit","action":"hemen yapılması gereken 1 aksiyon"}`
      }],
    });
    const text = resp.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// ── WHATSAPP ALERT ────────────────────────────────────────────────────────────
async function sendChangeAlert(userId: string, name: string, changes: any[]): Promise<void> {
  const critical = changes.filter((c: any) => c.severity === 'danger' || c.severity === 'warning');
  if (!critical.length) return;
  try {
    const { data: us } = await supabase.from('user_settings').select('phone').eq('user_id', userId).single();
    if (!us?.phone) return;
    const { sendWhatsAppMessage } = require('./settings');
    const emoji = critical.some((c: any) => c.severity === 'danger') ? '🚨' : '⚠️';
    const msg = `${emoji} *Rakip Hareketi: ${name}*\n\n${critical.map((c: any) => `• ${c.label}`).join('\n')}\n\n💡 Hemen strateji güncelleyin!`;
    sendWhatsAppMessage(userId, us.phone, msg).catch(() => {});
  } catch { /* alert failed */ }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

router.get('/list', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('competitors')
      .select('id,name,website,city,sector,country,shadow_data,shadow_changes,shadow_price_history,last_scanned_at,threat_score')
      .eq('user_id', req.userId)
      .order('threat_score', { ascending: false });
    if (error) throw error;
    res.json({ competitors: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/scan/:id', async (req: any, res: any) => {
  try {
    const { data: comp, error } = await supabase.from('competitors')
      .select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (error || !comp) return res.status(404).json({ error: 'Rakip bulunamadı' });

    const oldData = comp.shadow_data || null;
    const newData = await fetchCompetitorData(comp.name, comp.website || '', comp.country || 'TR');
    const changes = detectChanges(oldData, newData);
    const threatScore = calcThreatScore(newData, changes);
    const aiInsight = await generateAIInsight(comp.name, newData, changes);

    const prevHistory: any[] = comp.shadow_price_history || [];
    const newHistory = [...prevHistory.slice(-29), {
      date: new Date().toISOString().split('T')[0],
      prices: newData.pricing.slice(0, 3),
      score: threatScore,
    }];

    await supabase.from('competitors').update({
      shadow_data: newData,
      shadow_changes: changes,
      shadow_price_history: newHistory,
      threat_score: threatScore,
      last_scanned_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    sendChangeAlert(req.userId, comp.name, changes).catch(() => {});
    res.json({ competitor: comp.name, data: newData, changes, aiInsight, threatScore, priceHistory: newHistory });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/scan-all', async (req: any, res: any) => {
  try {
    const { data: comps } = await supabase.from('competitors').select('*').eq('user_id', req.userId);
    if (!comps?.length) return res.json({ message: 'Taranacak rakip yok' });
    res.json({ message: `${comps.length} rakip arka planda taranıyor...` });
    (async () => {
      for (const comp of comps) {
        try {
          const oldData = comp.shadow_data || null;
          const newData = await fetchCompetitorData(comp.name, comp.website || '', comp.country || 'TR');
          const changes = detectChanges(oldData, newData);
          const threatScore = calcThreatScore(newData, changes);
          const prevHistory: any[] = comp.shadow_price_history || [];
          const newHistory = [...prevHistory.slice(-29), { date: new Date().toISOString().split('T')[0], prices: newData.pricing.slice(0, 3), score: threatScore }];
          await supabase.from('competitors').update({ shadow_data: newData, shadow_changes: changes, shadow_price_history: newHistory, threat_score: threatScore, last_scanned_at: new Date().toISOString() }).eq('id', comp.id);
          sendChangeAlert(req.userId, comp.name, changes).catch(() => {});
          await sleep(3000);
        } catch (e: any) { console.error(`[Shadow] ${comp.name}:`, e.message); }
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/add-website/:id', async (req: any, res: any) => {
  try {
    const { website } = req.body;
    if (!website) return res.status(400).json({ error: 'website zorunlu' });
    const url = website.startsWith('http') ? website : `https://${website}`;
    await supabase.from('competitors').update({ website: url }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Website eklendi', url });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── DAILY AUTO-SCAN 03:00 ─────────────────────────────────────────────────────
async function dailyShadowScan() {
  console.log('[Shadow] Günlük otomatik tarama başladı');
  try {
    const { data: allComps } = await supabase.from('competitors').select('*');
    for (const comp of (allComps || [])) {
      try {
        const newData = await fetchCompetitorData(comp.name, comp.website || '', comp.country || 'TR');
        const changes = detectChanges(comp.shadow_data, newData);
        const threatScore = calcThreatScore(newData, changes);
        const prevHistory: any[] = comp.shadow_price_history || [];
        const newHistory = [...prevHistory.slice(-29), { date: new Date().toISOString().split('T')[0], prices: newData.pricing.slice(0, 3), score: threatScore }];
        await supabase.from('competitors').update({ shadow_data: newData, shadow_changes: changes, shadow_price_history: newHistory, threat_score: threatScore, last_scanned_at: new Date().toISOString() }).eq('id', comp.id);
        if (changes.length) sendChangeAlert(comp.user_id, comp.name, changes).catch(() => {});
        await sleep(4000);
      } catch (e: any) { console.error(`[Shadow daily] ${comp.name}:`, e.message); }
    }
    console.log('[Shadow] Günlük tarama tamamlandı');
  } catch (e: any) { console.error('[Shadow daily] Hata:', e.message); }
}

const now = new Date(), nextRun = new Date();
nextRun.setHours(3, 0, 0, 0);
if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
setTimeout(() => { dailyShadowScan(); setInterval(dailyShadowScan, 86400000); }, nextRun.getTime() - now.getTime());
console.log(`[Shadow] Günlük tarama ${nextRun.toLocaleString('tr-TR')}'de planlandı`);

module.exports = router;
