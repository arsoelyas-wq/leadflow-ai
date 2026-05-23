export {};
const express   = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios     = require('axios');
const crypto    = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

const router    = express.Router();
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HEYGEN_KEY  = process.env.HEYGEN_API_KEY;
const ELEVEN_KEY  = process.env.ELEVENLABS_API_KEY;
const HEYGEN_BASE = 'https://api.heygen.com';
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';
const API_BASE    = process.env.API_URL || 'https://leadflow-ai-production.up.railway.app';

const MAX_CAMPAIGN_LEADS = 20;

function heygenHeaders() { return { 'X-Api-Key': HEYGEN_KEY, 'Content-Type': 'application/json' }; }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function makeTrackingCode() { return crypto.randomBytes(10).toString('hex'); }
function trackingUrl(code: string) { return `${API_BASE}/v/${code}`; }

// ─── BRAND NAME EXTRACTION ───────────────────────────────────────────────────

// ─── TEXT ENCODING FIX ───────────────────────────────────────────────────────
// Fixes double-encoded UTF-8 (Latin-1 read as UTF-8) and common Latin-1 → UTF-8 artifacts
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    // Fix double-encoded UTF-8 artifacts (Ã¼ → ü, etc.)
    .replace(/Ã¼/g, 'ü').replace(/Ã–/g, 'Ö').replace(/Ã¶/g, 'ö')
    .replace(/Ä±/g, 'ı').replace(/Ä°/g, 'İ').replace(/ÄŸ/g, 'ğ')
    .replace(/Ã§/g, 'ç').replace(/Ã‡/g, 'Ç').replace(/ÅŸ/g, 'ş')
    .replace(/Åž/g, 'Ş').replace(/Ãœ/g, 'Ü').replace(/Ã‚/g, '')
    // Fix Latin-1 single-byte representations (bytes stored as chars)
    .replace(/�/g, '') // remove replacement chars instead of showing ◆
    // Common Windows-1254 → Unicode misread patterns
    .replace(/ü/g, 'ü').replace(/ö/g, 'ö').replace(/ç/g, 'ç')
    .replace(/ş/g, 'ş').replace(/ğ/g, 'ğ').replace(/ı/g, 'ı')
    .replace(/Ü/g, 'Ü').replace(/Ö/g, 'Ö').replace(/Ç/g, 'Ç')
    .replace(/Ş/g, 'Ş').replace(/Ğ/g, 'Ğ').replace(/İ/g, 'İ')
    .trim();
}

function extractBrandName(legalName: string): string {
  if (!legalName) return '';
  return legalName
    .replace(/\b(A\.Ş\.|LTD\. ŞTİ\.|LTD\. STI\.|LTD\.|ŞTİ\.|STI\.|SAN\. VE TİC\. A\.Ş\.|SAN\. VE TİC\. LTD\. ŞTİ\.|SAN\. A\.Ş\.|TİC\. A\.Ş\.|VE TİC\. A\.Ş\.|VE TİC\. LTD\. ŞTİ\.|VE TİC\.|SAN\. TİC\.|SAN\.|TİC\.|İNŞ\.|İNŞAAT|TAAH\.|MÜH\.|PAZ\.|DIŞ TİC\.|A\.S\.|LTD\.)\b/gi, '')
    .replace(/\b(VE|ve|AND|&)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w: string) => w.length > 1)
    .slice(0, 3)
    .join(' ') || legalName.split(' ')[0];
}

// ─── LEAD RESEARCH ───────────────────────────────────────────────────────────

interface LeadResearch {
  brandName: string;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  pains: string[];
  positives: string[];
  opportunity: string;
  hookLine: string;
  reviewSummary: string;
  quality: 'web_search' | 'website' | 'sector';
  jobSignals?: string[];
  techStack?: string[];
  growthStage?: string;
}

// Agentic web search loop using claude-sonnet with web_search_20250305 tool
async function researchWithWebSearch(lead: any, profile: any): Promise<LeadResearch> {
  const companyName = lead.company_name;
  const country     = lead.country || 'Türkiye';
  const ourCompany  = profile?.company?.name || 'şirketimiz';
  const product     = profile?.product?.description || 'hizmetimiz';

  const prompt = `"${companyName}" şirketini (${country}) derinlemesine araştır.

Şunları bul:
1. Bu şirketin gerçek marka adı — kısa, kullandıkları marka ismi, hukuki tam isim değil
2. Resmi web sitesi ve sosyal medya hesapları (Instagram, Facebook, LinkedIn)
3. Google Yorumlar, şikayetvar.com, Trustpilot, ekşi sözlük veya benzer platformlardaki müşteri şikayetleri ve sorunları
4. Bu şirketin yaşadığı en kritik 2-3 spesifik sorun (genel sektör sorunu değil, bu şirkete özel)
5. "${ourCompany}" firmasının "${product}" ürününün bu şirketin ÖZEL sorunlarını nasıl çözebileceği

JSON formatında yanıt ver (başka hiçbir şey yazma, sadece JSON):
{
  "brandName": "kısa marka adı",
  "website": "site URL veya null",
  "instagram": "instagram URL veya null",
  "facebook": "facebook URL veya null",
  "linkedin": "linkedin URL veya null",
  "pains": ["şirkete özel sorun 1", "sorun 2", "sorun 3"],
  "positives": ["güçlü yön 1"],
  "opportunity": "ürünümüzün bu şirkete nasıl yardım ettiği — 1 cümle, spesifik",
  "hookLine": "videonun ilk 4 saniyesinde söylenecek, dikkat çekici, onların spesifik sorununa değinen 1 cümle",
  "reviewSummary": "bulunan yorumların kısa özeti",
  "jobSignals": ["varsa aktif iş ilanı sinyali"],
  "techStack": ["WordPress", "HubSpot"],
  "growthStage": "startup | growing | established | declining"
}`;

  const messages: any[] = [{ role: 'user', content: prompt }];
  let finalText = '';

  for (let turn = 0; turn < 12; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((c: any) => c.type === 'text');
      finalText = (textBlock as any)?.text || '';
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((c: any) => c.type === 'tool_use');
      // For web_search_20250305, results are server-managed — send acknowledgments to continue
      const toolResults = toolUses.map((tu: any) => ({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: '',
      }));
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      } else {
        break; // No tool_use blocks, unexpected state
      }
    } else {
      // max_tokens or other stop reason — extract any text
      const textBlock = response.content.find((c: any) => c.type === 'text');
      if (textBlock) finalText = (textBlock as any).text;
      break;
    }
  }

  if (!finalText) throw new Error('No text output from web search research');

  const jsonMatch = finalText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON in research output');

  const parsed = JSON.parse(jsonMatch[0]);
  return { ...parsed, quality: 'web_search' as const };
}

// Fallback: fetch website HTML + Claude sector knowledge
async function researchFromWebsite(lead: any, profile: any): Promise<LeadResearch> {
  const fallbackBrand = extractBrandName(lead.company_name);
  let websiteContext = '';
  let websiteUrl: string | null = null;
  let instagram: string | null = null;
  let facebook: string | null = null;
  let linkedin: string | null = null;

  // Try to fetch the website
  const urlsToTry = [
    lead.website,
    lead.website ? null : `https://${lead.company_name.toLowerCase().replace(/\s+/g, '').slice(0, 20)}.com`,
    lead.website ? null : `https://www.${fallbackBrand.toLowerCase().replace(/\s+/g, '')}.com`,
  ].filter(Boolean);

  for (const url of urlsToTry) {
    try {
      const r = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        maxRedirects: 3,
      });
      const html = String(r.data);
      websiteUrl = url;

      // Extract title / og:title
      const titleMatch = html.match(/property="og:title"[^>]*content="([^"]+)"/i) ||
                         html.match(/<title[^>]*>([^<|–-]+)/i);
      if (titleMatch?.[1]) websiteContext += `Site başlığı: ${titleMatch[1].trim()}\n`;

      // Extract description
      const descMatch = html.match(/property="og:description"[^>]*content="([^"]+)"/i) ||
                        html.match(/name="description"[^>]*content="([^"]+)"/i);
      if (descMatch?.[1]) websiteContext += `Açıklama: ${descMatch[1].trim()}\n`;

      // Extract social links
      const igMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[^"'\/\s?&#]+/i);
      if (igMatch) instagram = igMatch[0];
      const fbMatch = html.match(/https?:\/\/(?:www\.)?facebook\.com\/[^"'\/\s?&#]+/i);
      if (fbMatch) facebook = fbMatch[0];
      const liMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[^"'\/\s?&#]+/i);
      if (liMatch) linkedin = liMatch[0];

      const detectedStack = detectTechStack(html);
      if (detectedStack.length) {
        websiteContext += `Tespit edilen teknolojiler: ${detectedStack.join(', ')}\n`;
      }

      break;
    } catch {}
  }

  // Claude sector-based analysis
  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Şirket: "${lead.company_name}"
Ülke: ${lead.country || 'Türkiye'}
Sektör: ${lead.sector || 'bilinmiyor'}
${websiteContext ? `Web içeriği:\n${websiteContext}` : ''}
Bizim ürün/hizmet: ${profile?.product?.description || ''}
Bizim şirket: ${profile?.company?.name || ''}

Bu sektördeki şirketlerin yaşadığı en yaygın 2-3 spesifik sorunu ve bu şirkete özel fırsatı JSON olarak ver:
{
  "brandName": "${fallbackBrand}",
  "pains": ["sektöre özel sorun 1", "sorun 2"],
  "positives": [],
  "opportunity": "ürünün bu şirkete faydası",
  "hookLine": "dikkat çekici opener"
}`,
      }],
    });
    const text = ((r.content[0] as any)?.text || '');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        brandName: parsed.brandName || fallbackBrand,
        website: websiteUrl,
        instagram, facebook, linkedin,
        pains: parsed.pains || [],
        positives: parsed.positives || [],
        opportunity: parsed.opportunity || '',
        hookLine: parsed.hookLine || '',
        reviewSummary: '',
        quality: (websiteContext ? 'website' : 'sector') as 'website' | 'sector',
        techStack: parsed.techStack || [],
      };
    }
  } catch {}

  return {
    brandName: fallbackBrand,
    website: websiteUrl,
    instagram, facebook, linkedin,
    pains: [],
    positives: [],
    opportunity: '',
    hookLine: '',
    reviewSummary: '',
    quality: 'sector',
    techStack: [],
  };
}

// ─── TECH STACK DETECTION ─────────────────────────────────────────────────────

function detectTechStack(html: string): string[] {
  const checks: [RegExp, string][] = [
    [/wordpress/i, 'WordPress'],
    [/shopify/i, 'Shopify'],
    [/woocommerce/i, 'WooCommerce'],
    [/hubspot/i, 'HubSpot'],
    [/salesforce/i, 'Salesforce'],
    [/intercom/i, 'Intercom'],
    [/zendesk/i, 'Zendesk'],
    [/gtag\.js|google-analytics|analytics\.js/i, 'Google Analytics'],
    [/fbevents\.js|facebook\.net\/en_US\/fbevents/i, 'Meta Pixel'],
    [/crisp\.chat|window\.\$crisp/i, 'Crisp'],
    [/tawk\.to/i, 'Tawk.to'],
    [/drift\.com/i, 'Drift'],
    [/mailchimp/i, 'Mailchimp'],
    [/klaviyo/i, 'Klaviyo'],
    [/ikas\.com/i, 'İkas'],
    [/ticimax/i, 'Ticimax'],
    [/ideasoft/i, 'IdeaSoft'],
    [/webflow\.com/i, 'Webflow'],
    [/squarespace/i, 'Squarespace'],
    [/wix\.com/i, 'Wix'],
    [/n11\.com|hepsiburada\.com|trendyol\.com/i, 'Marketplace'],
  ];
  return [...new Set(checks.filter(([rx]) => rx.test(html)).map(([, name]) => name))];
}

// ─── OPTIMAL SEND TIME ────────────────────────────────────────────────────────

function getOptimalSendTime(lead: any, research?: LeadResearch | null): { time: string; reason: string } {
  const sector = (lead.sector || '').toLowerCase();
  const windows: [string[], { time: string; reason: string }][] = [
    [['restoran', 'restaurant', 'yiyecek', 'food', 'cafe', 'kafe'],
     { time: '10:30', reason: 'Sabah hazırlığı sonrası, öğlen öncesi' }],
    [['otel', 'hotel', 'turizm', 'tourism', 'tatil'],
     { time: '09:30', reason: 'Rezervasyon peak saatinden önce' }],
    [['e-ticaret', 'ecommerce', 'mağaza', 'retail', 'shop'],
     { time: '11:00', reason: 'Sabah trafiği açıldıktan sonra' }],
    [['sağlık', 'health', 'klinik', 'doktor', 'eczane'],
     { time: '12:30', reason: 'Öğle arası hasta yoğunluğu düştüğünde' }],
    [['eğitim', 'okul', 'kurs', 'education', 'training'],
     { time: '14:00', reason: 'Öğleden sonra, ders arası' }],
    [['inşaat', 'construction', 'emlak', 'real estate', 'yapı'],
     { time: '09:00', reason: 'Saha aktivitesi başlamadan önce' }],
    [['yazılım', 'software', 'teknoloji', 'tech', 'bilişim'],
     { time: '10:00', reason: 'Daily standup sonrası focus bloğu' }],
  ];
  for (const [keywords, window] of windows) {
    if (keywords.some(k => sector.includes(k))) return window;
  }
  return { time: '10:00', reason: 'B2B iletişim için optimal sabah penceresi' };
}

// ─── A/B HOOK GENERATION ─────────────────────────────────────────────────────

async function generateHooks(lead: any, profile: any, research?: LeadResearch | null): Promise<{ hookA: string; hookB: string }> {
  const brandName = research?.brandName || extractBrandName(lead.company_name);
  const pain      = research?.pains?.[0] || '';
  const hookBase  = research?.hookLine || '';

  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Video satış scriptinin ilk 4 saniyesi için 2 hook yaz.
Marka: ${brandName}
${pain ? `Sorun: ${pain}` : ''}
${hookBase ? `Referans: ${hookBase}` : ''}
Hook A: Şaşırtıcı istatistik veya sorunu vurgulayan yaklaşım
Hook B: Fırsat ve kazancı öne çıkaran yaklaşım
JSON: {"hookA":"...","hookB":"..."}`,
      }],
    });
    const match = ((r.content[0] as any)?.text || '').match(/\{[\s\S]*\}/);
    if (match) {
      const p = JSON.parse(match[0]);
      return { hookA: p.hookA || hookBase || '', hookB: p.hookB || '' };
    }
  } catch {}
  return { hookA: hookBase || '', hookB: '' };
}

// ─── SCRIPT QUALITY SCORING ───────────────────────────────────────────────────

async function scoreScript(script: string, research?: LeadResearch | null): Promise<number> {
  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `Video satış scriptini 1-10 puan ver. Kriterler: spesifik sorun adlandırma (3p), hook gücü (2p), CTA netliği (2p), doğallık (2p), uzunluk 85-100 kelime (1p).
Script: "${script.slice(0, 350)}"
${research?.pains?.[0] ? `Beklenen spesifik sorun: ${research.pains[0]}` : ''}
Sadece sayı (1-10):`,
      }],
    });
    const num = parseInt(((r.content[0] as any)?.text || '').match(/\d+/)?.[0] || '0', 10);
    return Math.min(10, Math.max(1, num));
  } catch { return 0; }
}

async function researchLead(lead: any, profile: any): Promise<LeadResearch> {
  try {
    return await researchWithWebSearch(lead, profile);
  } catch (e: any) {
    console.log(`[Research] Web search failed for "${lead.company_name}", using fallback:`, e.message?.slice(0, 100));
    return await researchFromWebsite(lead, profile);
  }
}

// ─── AI HELPERS ──────────────────────────────────────────────────────────────

async function generateScript(lead: any, profile: any, language: string, research?: LeadResearch | null): Promise<string> {
  const langNames: Record<string, string> = {
    tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', ar: 'Arapça', fr: 'Fransızca',
    ru: 'Rusça', es: 'İspanyolca', it: 'İtalyanca', nl: 'Hollandaca',
  };

  const brandName   = normalizeText(research?.brandName || extractBrandName(lead.company_name));
  const pains       = (research?.pains || []).map(normalizeText);
  const hookLine    = normalizeText(research?.hookLine || '');
  const opportunity = normalizeText(research?.opportunity || '');
  const reviewNote  = research?.reviewSummary ? `Müşteri yorumlarından tespit: ${normalizeText(research.reviewSummary)}` : '';
  const ourCompany  = normalizeText(profile?.company?.name || 'Biz');
  const product     = normalizeText(profile?.product?.description || 'çözümümüz');
  const lang        = langNames[language] || 'Türkçe';

  // Build specific pain context — this is the core of personalization
  let painContext = '';
  if (pains.length >= 2) {
    painContext = `Araştırmamızda ${brandName} için tespit ettiğimiz GERÇEK SORUNLAR:
1. ${pains[0]}
2. ${pains[1]}
${pains[2] ? `3. ${pains[2]}` : ''}
Bu sorunları scriptte açıkça ve doğrudan adlandır. "Sektörünüzdeki sorun" gibi genel ifadeler YASAK.`;
  } else if (pains.length === 1) {
    painContext = `Tespit edilen kritik sorun: "${pains[0]}"
Bu sorunu scriptte açıkça söyle, genel ifade kullanma.`;
  } else {
    painContext = `Sektör: ${lead.sector || 'bilinmiyor'}
Sektörde yaygın 2 spesifik sorunu bul ve söyle — genel "sektörünüzdeki sorun" yasak.`;
  }

  try {
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: `Sen dünya klasmanında bir satış videosu script yazarısın. Araştırma verileriyle desteklenmiş, her lead için tamamen özel, 35-40 saniyelik (85-100 kelime) scriptler yazıyorsun. Genel ve jenerik ifadeler asla kullanmıyorsun — her cümle o şirkete özel olmalı.`,
      messages: [{
        role: 'user',
        content: `${lang} dilinde, 35-40 saniyelik (85-100 kelime) kişiselleştirilmiş video satış scripti yaz.

═══ HEDEF ŞİRKET ═══
Marka adı: ${brandName}
Sektör: ${lead.sector || 'bilinmiyor'}
Ülke: ${lead.country || 'Türkiye'}

═══ BİZİM KİMLİĞİMİZ ═══
Şirket: ${ourCompany}
Ürün/Hizmet: ${product}
${opportunity ? `Bu şirkete faydamız: ${opportunity}` : ''}

═══ ARAŞTIRMA VERİLERİ ═══
${painContext}
${hookLine ? `Dikkat çekici opener önerisi: "${hookLine}"` : ''}
${reviewNote}

═══ SCRIPT YAPISI (kesin sıra ve saniye) ═══
[0-5 sn] HOOK: ${hookLine ? `"${hookLine}" kullan veya geliştir.` : `"${brandName}" ile başla, onların spesifik sorununu veya bu sektördeki şaşırtıcı bir gerçeği direk söyle.`} Jenerik "merhaba" açılışı yasak.
[5-12 sn] SORUN: Tespit ettiğimiz 1-2 spesifik sorunu ismiyle söyle. Soyut değil, somut. Örn: "Müşterilerinizin %X'i şunu şikayet ediyor" veya "Şu süreç size her ay şunu kaybettiriyor" gibi.
[12-20 sn] ÇÖZÜM: ${product} bu sorunu tam olarak nasıl çözüyor — 1-2 somut mekanizma söyle.
[20-28 sn] KANIT/SONUÇ: Benzer bir müşteride ya da sektörde elde edilen somut fayda ima et (rakam veya etki).
[28-38 sn] CTA: Detaylı konuşmak için 15 dakikalık görüşme talep et. Nazik, baskısız, net.

═══ DEMİR KURALLAR ═══
- "${brandName}" kullan, ASLA hukuki tam isim veya "Sayın Yetkili" yazma
- Araştırma verilerini kullan — "sektörünüzdeki sorunlar" gibi genel ifade TAMAMEN YASAK
- Doğal konuşma dili — kurumsal, robotik, yapay dil YASAK
- "yapay zeka", "AI", "sistem" kelimeleri YASAK
- Kelime sayısı 85-100 arası olmalı
- Sadece konuşma metnini yaz, başka HİÇBİR şey ekleme
- Dil: ${lang}`,
      }],
    });
    return ((r.content[0] as any)?.text || '').trim();
  } catch (primaryErr: any) {
    console.error('[Script] Primary generation failed, trying fallback:', primaryErr.message?.slice(0, 80));
    // Fallback: Claude Haiku with minimal prompt — never use raw ${product} template to avoid DB encoding issues
    try {
      const fb = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        messages: [{
          role: 'user',
          content: `${lang} dilinde 85-100 kelimelik video satış scripti yaz.
Marka: ${brandName}
Şirketimiz: ${ourCompany}
${pains[0] ? `Sorun: ${pains[0]}` : `Sektör: ${lead.sector || 'ticaret'}`}
Yapı: hook (spesifik sorun) → kısa çözüm → 15 dakikalık görüşme CTA
Doğal konuşma dili. Sadece metni yaz.`,
        }],
      });
      return ((fb.content[0] as any)?.text || '').trim();
    } catch {
      return `${brandName}, sizin için özel bir çözüm hazırladık. İşinizi inceledik ve size özel sunmak istediğimiz önerilerimiz var. 15 dakikalık bir görüşme yapalım mı?`;
    }
  }
}

// Claude Haiku — hızlı WhatsApp intro (marka adıyla, araştırmaya göre)
async function generateWhatsAppIntro(lead: any, profile: any, research?: LeadResearch | null): Promise<string> {
  const brandName  = normalizeText(research?.brandName || extractBrandName(lead.company_name));
  const opportunity = normalizeText(research?.opportunity || '');
  const pain       = normalizeText(research?.pains?.[0] || '');

  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Kısa WhatsApp mesajı yaz.
Alıcı marka adı: ${brandName}
Bizim şirket: ${profile?.company?.name || ''}
${pain ? `Onların tespit edilen sorunu: ${pain}` : `Ürün: ${profile?.product?.description || ''}`}
${opportunity ? `Bağlam: ${opportunity}` : ''}
Amaç: kişiye özel hazırladığımız videoyu izlemesini istemek.
Samimi, doğal, 1-2 cümle. Emoji yok, link yok. Sadece mesaj metni. "${brandName}" olarak hitap et.`,
      }],
    });
    return ((r.content[0] as any)?.text || '').trim();
  } catch {
    return `Merhaba ${brandName.split(' ')[0]}! Sizin için özel bir video hazırladık, izlemenizi isteriz.`;
  }
}

// ─── HEYGEN / ELEVENLABS PIPELINE ────────────────────────────────────────────

async function generateAudio(text: string, voiceId: string): Promise<Buffer> {
  const r = await axios.post(
    `${ELEVEN_BASE}/text-to-speech/${voiceId}`,
    { text, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: 0.75, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true } },
    { headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer', timeout: 30000 }
  );
  return Buffer.from(r.data);
}

async function uploadAudioToHeygen(audioBuffer: Buffer): Promise<string> {
  const r = await axios.post(
    'https://upload.heygen.com/v1/asset',
    audioBuffer,
    { headers: { 'X-Api-Key': HEYGEN_KEY, 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length }, timeout: 30000, maxBodyLength: Infinity }
  );
  const assetId = r.data?.data?.id;
  if (!assetId) throw new Error('HeyGen asset ID alınamadı: ' + JSON.stringify(r.data));
  return assetId;
}

async function generateHeygenVideo(params: { avatarId: string; audioBuffer: Buffer; aspectRatio: string }): Promise<string> {
  const { avatarId, audioBuffer, aspectRatio } = params;
  const audioAssetId = await uploadAudioToHeygen(audioBuffer);
  const dimensions: Record<string, { width: number; height: number }> = {
    '9:16': { width: 720, height: 1280 },
    '16:9': { width: 1280, height: 720 },
    '1:1':  { width: 720, height: 720 },
  };
  const dim = dimensions[aspectRatio] || dimensions['9:16'];
  const r = await axios.post(
    `${HEYGEN_BASE}/v2/video/generate`,
    { video_inputs: [{ character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' }, voice: { type: 'audio', audio_asset_id: audioAssetId } }], dimension: dim },
    { headers: heygenHeaders(), timeout: 30000 }
  );
  const videoId = r.data?.data?.video_id;
  if (!videoId) throw new Error('HeyGen video ID alınamadı: ' + JSON.stringify(r.data));
  return videoId;
}

async function checkVideoStatus(heygenVideoId: string): Promise<{ status: string; url?: string; thumbnail?: string }> {
  const r = await axios.get(
    `${HEYGEN_BASE}/v1/video_status.get?video_id=${heygenVideoId}`,
    { headers: heygenHeaders(), timeout: 10000 }
  );
  const d = r.data?.data;
  return { status: d?.status || 'processing', url: d?.video_url, thumbnail: d?.thumbnail_url };
}

async function sendWhatsApp(userId: string, phone: string, message: string) {
  const { sendWhatsAppMessage } = require('./settings');
  await sendWhatsAppMessage(userId, phone, message);
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// GET /api/video-outreach/avatars
router.get('/avatars', async (req: any, res: any) => {
  try {
    const { search = '', gender = '', page = 1 } = req.query;
    const r = await axios.get(`${HEYGEN_BASE}/v2/avatars`, { headers: heygenHeaders(), timeout: 15000 });
    let avatars = r.data?.data?.avatars || [];
    if (search) avatars = avatars.filter((a: any) => a.avatar_name?.toLowerCase().includes((search as string).toLowerCase()));
    if (gender) avatars = avatars.filter((a: any) => a.gender?.toLowerCase() === gender);
    const pageSize = 30;
    const pageNum  = Number(page);
    const total    = avatars.length;
    res.json({
      avatars: avatars.slice((pageNum - 1) * pageSize, pageNum * pageSize).map((a: any) => ({
        avatar_id: a.avatar_id, name: a.avatar_name, gender: a.gender,
        preview_image: a.preview_image_url || a.preview_video_url,
        preview_video: a.preview_video_url, tags: a.tags || [],
      })),
      total, page: pageNum, pages: Math.ceil(total / pageSize),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/eleven-voices
router.get('/eleven-voices', async (req: any, res: any) => {
  try {
    const { language = 'tr' } = req.query;
    const norm = (v: any) => ({ voice_id: v.voice_id, name: v.name, preview_url: v.preview_url || null, gender: v.labels?.gender || v.gender || null, accent: v.labels?.accent || v.accent || null });
    const [r1, r2] = await Promise.allSettled([
      axios.get(`${ELEVEN_BASE}/voices`, { headers: { 'xi-api-key': ELEVEN_KEY } }),
      axios.get(`${ELEVEN_BASE}/shared-voices?page_size=100&language=${language}`, { headers: { 'xi-api-key': ELEVEN_KEY } }),
    ]);
    const myV   = r1.status === 'fulfilled' ? r1.value.data.voices.map(norm) : [];
    const langV = r2.status === 'fulfilled' ? r2.value.data.voices.map(norm) : [];
    res.json({ my: myV, language: langV, total: langV.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/check-duplicates?leadIds=id1,id2
router.get('/check-duplicates', async (req: any, res: any) => {
  try {
    const leadIds = (req.query.leadIds as string || '').split(',').filter(Boolean);
    if (!leadIds.length) return res.json({ existing: [] });
    const { data } = await supabase
      .from('video_outreach')
      .select('lead_id, status, created_at')
      .eq('user_id', req.userId)
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false });
    const seen = new Set<string>();
    const existing = (data || []).filter((v: any) => { if (seen.has(v.lead_id)) return false; seen.add(v.lead_id); return true; });
    res.json({ existing });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/status/:id — single video with live HeyGen check
router.get('/status/:id', async (req: any, res: any) => {
  try {
    const { data: video } = await supabase
      .from('video_outreach')
      .select('id, status, video_url, thumbnail_url, heygen_video_id, view_count, first_viewed_at, error_message, research_data, leads(company_name)')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });

    if (video.status === 'processing' && video.heygen_video_id) {
      try {
        const result = await checkVideoStatus(video.heygen_video_id);
        if (result.status === 'completed' && result.url) {
          await supabase.from('video_outreach').update({ status: 'completed', video_url: result.url, thumbnail_url: result.thumbnail }).eq('id', video.id);
          return res.json({ ...video, status: 'completed', video_url: result.url, thumbnail_url: result.thumbnail });
        } else if (result.status === 'failed') {
          await supabase.from('video_outreach').update({ status: 'failed' }).eq('id', video.id);
          return res.json({ ...video, status: 'failed' });
        }
      } catch {}
    }
    res.json(video);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/campaign/:id — campaign progress
router.get('/campaign/:id', async (req: any, res: any) => {
  try {
    const { data: campaign } = await supabase
      .from('video_campaigns').select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    const { data: videos } = await supabase
      .from('video_outreach')
      .select('id, status, video_url, thumbnail_url, leads(company_name), view_count, research_data')
      .eq('campaign_id', req.params.id)
      .eq('user_id', req.userId);

    const vids = videos || [];
    res.json({
      campaign,
      videos: vids,
      progress: {
        total:      campaign.total_leads,
        created:    vids.length,
        completed:  vids.filter((v: any) => v.status === 'completed').length,
        processing: vids.filter((v: any) => ['processing','generating','researching'].includes(v.status)).length,
        failed:     vids.filter((v: any) => v.status === 'failed').length,
        percent:    campaign.total_leads > 0 ? Math.round((vids.filter((v: any) => v.status === 'completed').length / campaign.total_leads) * 100) : 0,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/generate/single
router.post('/generate/single', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, avatarId, voiceId, aspectRatio = '9:16', language = 'tr', autoSend = false, customScript = null } = req.body;
    if (!leadId || !avatarId || !voiceId) return res.status(400).json({ error: 'leadId, avatarId, voiceId zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const code = makeTrackingCode();

    const { data: videoRecord } = await supabase.from('video_outreach').insert([{
      user_id: userId, lead_id: leadId,
      avatar_id: avatarId, voice_id: voiceId,
      aspect_ratio: aspectRatio, language,
      auto_send: autoSend, status: 'researching',
      tracking_code: code,
    }]).select().single();

    res.json({ ok: true, videoId: videoRecord?.id, message: 'Araştırma başladı, video oluşturuluyor...' });

    (async () => {
      try {
        // Phase 1: Deep research
        console.log(`[Video] Araştırılıyor: ${lead.company_name}`);
        const research = await researchLead(lead, profile);
        await supabase.from('video_outreach').update({
          research_data: research,
          research_quality: research.quality,
          status: 'generating',
        }).eq('id', videoRecord?.id);
        console.log(`[Video] Araştırma tamamlandı: ${research.brandName} (${research.quality}) — sorunlar: ${research.pains.slice(0,2).join(', ')}`);

        // Phase 2: Script + hooks + scoring in parallel
        const script = customScript || await generateScript(lead, profile, language, research);
        const [hooksResult, scoreResult] = await Promise.allSettled([
          generateHooks(lead, profile, research),
          scoreScript(script, research),
        ]);
        const hooks = hooksResult.status === 'fulfilled' ? hooksResult.value : { hookA: '', hookB: '' };
        const score = scoreResult.status === 'fulfilled' ? scoreResult.value : 0;
        const timing = getOptimalSendTime(lead, research);

        const now = new Date();
        const [th, tm] = timing.time.split(':').map(Number);
        const optimalAt = new Date(now);
        optimalAt.setHours(th, tm, 0, 0);
        if (optimalAt <= now) optimalAt.setDate(optimalAt.getDate() + 1);

        await supabase.from('video_outreach').update({
          script,
          hook_a: hooks.hookA,
          hook_b: hooks.hookB,
          active_hook: 'a',
          script_score: score,
          optimal_send_at: optimalAt.toISOString(),
          send_time_reason: timing.reason,
          tech_stack: research.techStack || null,
          job_signals: research.jobSignals || null,
          growth_stage: research.growthStage || null,
        }).eq('id', videoRecord?.id);

        // Phase 3: Audio + Video
        const audioBuffer   = await generateAudio(script, voiceId);
        const heygenVideoId = await generateHeygenVideo({ avatarId, audioBuffer, aspectRatio });
        await supabase.from('video_outreach').update({ heygen_video_id: heygenVideoId, status: 'processing' }).eq('id', videoRecord?.id);
        console.log(`[Video] HeyGen ID: ${heygenVideoId} (${research.brandName}) score:${score}`);
      } catch (err: any) {
        console.error('[Video] Hata:', err.message);
        await supabase.from('video_outreach').update({ status: 'failed', error_message: err.message }).eq('id', videoRecord?.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/generate/campaign
router.post('/generate/campaign', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    let { leadIds, avatarId, voiceId, aspectRatio = '9:16', language, autoSend = false, campaignName } = req.body;
    if (!leadIds?.length || !avatarId || !voiceId) return res.status(400).json({ error: 'Parametreler eksik' });

    if (leadIds.length > MAX_CAMPAIGN_LEADS) leadIds = leadIds.slice(0, MAX_CAMPAIGN_LEADS);

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', userId).single();
    const { data: campaign } = await supabase.from('video_campaigns').insert([{
      user_id: userId,
      name: campaignName || `Video Kampanyası ${new Date().toLocaleDateString('tr-TR')}`,
      total_leads: leadIds.length, status: 'running',
      avatar_id: avatarId, voice_id: voiceId,
    }]).select().single();

    res.json({ ok: true, campaignId: campaign?.id, total: leadIds.length, message: `${leadIds.length} lead araştırılıp video oluşturuluyor` });

    (async () => {
      // Phase 1: Parallel research for all leads (batches of 4)
      const leadDataMap: Record<string, any> = {};
      const researchMap: Record<string, LeadResearch> = {};

      console.log(`[Campaign] ${leadIds.length} lead için araştırma başlıyor...`);
      for (let i = 0; i < leadIds.length; i += 4) {
        const batch = leadIds.slice(i, i + 4);
        await Promise.allSettled(batch.map(async (leadId: string) => {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
          if (!lead) return;
          leadDataMap[leadId] = lead;
          researchMap[leadId] = await researchLead(lead, profile);
          console.log(`[Campaign] Araştırıldı: ${researchMap[leadId].brandName} — ${researchMap[leadId].pains.slice(0,2).join(', ')}`);
        }));
        await sleep(1500); // Rate limit buffer between batches
      }

      // Phase 2: Generate videos sequentially
      let created = 0;
      for (const leadId of leadIds) {
        try {
          const lead     = leadDataMap[leadId];
          const research = researchMap[leadId];
          if (!lead) { created++; continue; }

          const callLang = language || getLanguageByCountry(lead.country_code || '') || 'tr';
          const script   = await generateScript(lead, profile, callLang, research);
          const [hooksR, scoreR] = await Promise.allSettled([
            generateHooks(lead, profile, research),
            scoreScript(script, research),
          ]);
          const hooks   = hooksR.status === 'fulfilled' ? hooksR.value : { hookA: '', hookB: '' };
          const score   = scoreR.status === 'fulfilled' ? scoreR.value : 0;
          const timing  = getOptimalSendTime(lead, research);
          const nowC    = new Date();
          const [ch, cm] = timing.time.split(':').map(Number);
          const optAt   = new Date(nowC);
          optAt.setHours(ch, cm, 0, 0);
          if (optAt <= nowC) optAt.setDate(optAt.getDate() + 1);

          const audio    = await generateAudio(script, voiceId);
          const heygenId = await generateHeygenVideo({ avatarId, audioBuffer: audio, aspectRatio });
          const code     = makeTrackingCode();

          await supabase.from('video_outreach').insert([{
            user_id: userId, lead_id: leadId, campaign_id: campaign?.id,
            avatar_id: avatarId, voice_id: voiceId,
            heygen_video_id: heygenId, script,
            aspect_ratio: aspectRatio, language: callLang,
            auto_send: autoSend, status: 'processing',
            tracking_code: code,
            research_data: research || null,
            research_quality: research?.quality || null,
            hook_a: hooks.hookA, hook_b: hooks.hookB, active_hook: 'a',
            script_score: score,
            optimal_send_at: optAt.toISOString(),
            send_time_reason: timing.reason,
            tech_stack: research?.techStack || null,
            job_signals: research?.jobSignals || null,
            growth_stage: research?.growthStage || null,
          }]);

          created++;
          await supabase.from('video_campaigns').update({ videos_created: created }).eq('id', campaign?.id);
          await sleep(2000);
        } catch (err: any) {
          console.error(`[Campaign] Lead ${leadId}:`, err.message);
          created++;
        }
      }
      await supabase.from('video_campaigns').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', campaign?.id);
      console.log(`[Campaign] Tamamlandı: ${campaign?.id}, ${created} video`);
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/retry/:id
router.post('/retry/:id', async (req: any, res: any) => {
  try {
    const { data: video } = await supabase.from('video_outreach').select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    if (video.status !== 'failed') return res.status(400).json({ error: 'Sadece başarısız videolar yeniden denenebilir' });

    const { data: lead }    = await supabase.from('leads').select('*').eq('id', video.lead_id).single();
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();

    await supabase.from('video_outreach').update({ status: 'researching', error_message: null }).eq('id', video.id);
    res.json({ ok: true, message: 'Araştırılıp yeniden oluşturuluyor' });

    (async () => {
      try {
        // Reuse cached research if available
        const research: LeadResearch = video.research_data || await researchLead(lead, profile);
        if (!video.research_data) {
          await supabase.from('video_outreach').update({ research_data: research, research_quality: research.quality }).eq('id', video.id);
        }

        await supabase.from('video_outreach').update({ status: 'generating' }).eq('id', video.id);
        const script = video.script || await generateScript(lead, profile, video.language || 'tr', research);
        if (!video.script) await supabase.from('video_outreach').update({ script }).eq('id', video.id);

        const audio    = await generateAudio(script, video.voice_id);
        const heygenId = await generateHeygenVideo({ avatarId: video.avatar_id, audioBuffer: audio, aspectRatio: video.aspect_ratio });
        await supabase.from('video_outreach').update({ heygen_video_id: heygenId, status: 'processing' }).eq('id', video.id);
      } catch (err: any) {
        await supabase.from('video_outreach').update({ status: 'failed', error_message: err.message }).eq('id', video.id);
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/send — tracking URL + AI-personalized WhatsApp intro
router.post('/send', async (req: any, res: any) => {
  try {
    const { videoId } = req.body;
    const { data: video } = await supabase.from('video_outreach')
      .select('*, leads(phone, contact_name, company_name)').eq('id', videoId).eq('user_id', req.userId).single();
    if (!video) return res.status(404).json({ error: 'Video bulunamadı' });
    if (video.status !== 'completed' || !video.video_url) return res.status(400).json({ error: 'Video henüz hazır değil' });

    const lead = video.leads;
    if (!lead?.phone) return res.status(400).json({ error: 'Lead telefon numarası yok' });

    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();
    const intro   = await generateWhatsAppIntro(lead, profile, video.research_data);
    const tUrl    = video.tracking_code ? trackingUrl(video.tracking_code) : video.video_url;
    const message = `${intro}\n\n${tUrl}`;

    await sendWhatsApp(req.userId, lead.phone, message);
    await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', videoId);

    const { createSequenceForSentVideo } = require('./video-sequences');
    createSequenceForSentVideo(videoId, req.userId, video.lead_id, video.research_data, profile).catch(() => {});

    res.json({ ok: true, message: 'Video gönderildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/videos
router.get('/videos', async (req: any, res: any) => {
  try {
    const { limit = 20, campaignId } = req.query;
    let query = supabase.from('video_outreach')
      .select('*, leads(company_name, contact_name, phone, country)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));
    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data } = await query;
    res.json({ videos: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-outreach/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('video_outreach').select('status, sent_at, view_count, language, research_quality').eq('user_id', req.userId);
    const videos = data || [];
    res.json({
      total:        videos.length,
      completed:    videos.filter((v: any) => v.status === 'completed').length,
      processing:   videos.filter((v: any) => ['processing','generating','researching'].includes(v.status)).length,
      sent:         videos.filter((v: any) => v.sent_at).length,
      failed:       videos.filter((v: any) => v.status === 'failed').length,
      viewed:       videos.filter((v: any) => (v.view_count || 0) > 0).length,
      total_views:  videos.reduce((s: number, v: any) => s + (v.view_count || 0), 0),
      web_researched: videos.filter((v: any) => v.research_quality === 'web_search').length,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/preview-script
router.post('/preview-script', async (req: any, res: any) => {
  try {
    const { leadId, language } = req.body;
    const { data: lead }    = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', req.userId).single();

    // Lightweight research for preview (fallback only — don't use full web search for previews)
    const research = await researchFromWebsite(lead, profile);
    const script   = await generateScript(lead, profile, language || 'tr', research);
    res.json({ ok: true, script, leadId, leadName: lead.company_name, brandName: research.brandName, pains: research.pains });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-outreach/heygen-webhook — HeyGen video ready notification
router.post('/heygen-webhook', async (req: any, res: any) => {
  try {
    res.sendStatus(200);
    const { event, event_data } = req.body;
    if (!event_data?.video_id) return;

    const heygenVideoId = event_data.video_id;
    const { data: video } = await supabase.from('video_outreach')
      .select('id, user_id, lead_id, auto_send, tracking_code, research_data')
      .eq('heygen_video_id', heygenVideoId)
      .single();
    if (!video) return;

    if (event === 'video_status.success') {
      await supabase.from('video_outreach').update({
        status: 'completed',
        video_url: event_data.video_url,
        thumbnail_url: event_data.thumbnail_url,
      }).eq('id', video.id);

      if (video.auto_send) {
        const { data: lead }    = await supabase.from('leads').select('phone, contact_name, company_name').eq('id', video.lead_id).single();
        const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', video.user_id).single();
        if (lead?.phone) {
          const intro   = await generateWhatsAppIntro(lead, profile, video.research_data);
          const tUrl    = video.tracking_code ? trackingUrl(video.tracking_code) : event_data.video_url;
          await sendWhatsApp(video.user_id, lead.phone, `${intro}\n\n${tUrl}`).catch(() => {});
          await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', video.id);
          const { createSequenceForSentVideo } = require('./video-sequences');
          createSequenceForSentVideo(video.id, video.user_id, video.lead_id, video.research_data, profile).catch(() => {});
        }
      }
    } else if (event === 'video_status.fail') {
      await supabase.from('video_outreach').update({ status: 'failed', error_message: event_data.error || 'HeyGen hatası' }).eq('id', video.id);
    }
  } catch (e: any) { console.error('[HeyGen Webhook]', e.message); }
});

// GET /api/video-outreach/analytics — performance matrix by sector + hook type
router.get('/analytics', async (req: any, res: any) => {
  try {
    const { data: logs } = await supabase
      .from('video_performance_log')
      .select('sector, hook_type, watch_percent, sequence_step_reached, converted')
      .eq('user_id', req.userId);

    const byHook: Record<string, { count: number; avgWatch: number }> = {};
    const bySector: Record<string, { count: number; avgWatch: number; conversions: number }> = {};

    for (const log of logs || []) {
      if (log.hook_type) {
        if (!byHook[log.hook_type]) byHook[log.hook_type] = { count: 0, avgWatch: 0 };
        const h = byHook[log.hook_type];
        h.avgWatch = Math.round((h.avgWatch * h.count + (log.watch_percent || 0)) / (h.count + 1));
        h.count++;
      }
      if (log.sector) {
        if (!bySector[log.sector]) bySector[log.sector] = { count: 0, avgWatch: 0, conversions: 0 };
        const s = bySector[log.sector];
        s.avgWatch = Math.round((s.avgWatch * s.count + (log.watch_percent || 0)) / (s.count + 1));
        s.count++;
        if (log.converted) s.conversions++;
      }
    }

    const { data: videos } = await supabase
      .from('video_outreach')
      .select('hook_a, hook_b, active_hook, avg_watch_percent, max_watch_percent, script_score, growth_stage')
      .eq('user_id', req.userId)
      .not('script_score', 'is', null);

    const avgScore = videos?.length
      ? Math.round((videos as any[]).reduce((s, v) => s + (v.script_score || 0), 0) / videos.length)
      : 0;

    res.json({
      by_hook: byHook,
      by_sector: Object.entries(bySector)
        .sort((a, b) => b[1].avgWatch - a[1].avgWatch)
        .slice(0, 10)
        .map(([sector, stats]) => ({ sector, ...stats })),
      avg_script_score: avgScore,
      total_analyzed: videos?.length || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── YARDIMCI ────────────────────────────────────────────────────────────────

function getLanguageByCountry(countryCode: string): string {
  const map: Record<string, string> = {
    TR: 'tr', DE: 'de', GB: 'en', US: 'en', FR: 'fr',
    AE: 'ar', SA: 'ar', RU: 'ru', IT: 'it', ES: 'es', NL: 'nl',
  };
  return map[countryCode?.toUpperCase()] || 'en';
}

// ─── 5 DAKİKA POLLING — HeyGen webhook yedek ─────────────────────────────────
setInterval(async () => {
  try {
    const { data: processing } = await supabase.from('video_outreach')
      .select('id, heygen_video_id, auto_send, lead_id, user_id, tracking_code, research_data')
      .eq('status', 'processing').limit(10);

    for (const v of processing || []) {
      try {
        const result = await checkVideoStatus(v.heygen_video_id);
        if (result.status === 'completed' && result.url) {
          await supabase.from('video_outreach').update({
            status: 'completed', video_url: result.url, thumbnail_url: result.thumbnail,
          }).eq('id', v.id);

          if (v.auto_send) {
            const { data: lead }    = await supabase.from('leads').select('phone, contact_name, company_name').eq('id', v.lead_id).single();
            const { data: profile } = await supabase.from('business_profiles').select('*').eq('user_id', v.user_id).single();
            if (lead?.phone) {
              const intro   = await generateWhatsAppIntro(lead, profile, v.research_data);
              const tUrl    = v.tracking_code ? trackingUrl(v.tracking_code) : result.url;
              await sendWhatsApp(v.user_id, lead.phone, `${intro}\n\n${tUrl}`).catch(() => {});
              await supabase.from('video_outreach').update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' }).eq('id', v.id);
              const { createSequenceForSentVideo } = require('./video-sequences');
              createSequenceForSentVideo(v.id, v.user_id, v.lead_id, v.research_data, profile).catch(() => {});
            }
          }
        } else if (result.status === 'failed') {
          await supabase.from('video_outreach').update({ status: 'failed' }).eq('id', v.id);
        }
        await sleep(500);
      } catch {}
    }
  } catch {}
}, 5 * 60 * 1000);

module.exports = router;
