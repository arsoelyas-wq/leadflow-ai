export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

// ── SEKTÖR DİZİNİ: ALTIN REHBER ─────────────────────────
async function scrapeAltinRehber(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const queries = [
      `"${keyword}" "${city}" altinrehber telefon`,
      `"${keyword}" "${city}" firma iletisim numarasi`,
      `"${keyword}" "${city}" isletme telefon whatsapp`,
    ];

    for (const query of queries) {
      const resp = await axios.get(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=tr`,
        { headers: HEADERS, timeout: 12000 }
      );
      const $ = cheerio.load(resp.data);

      $("div.g, .tF2Cxc").each((_: any, el: any) => {
        const title = $(el).find("h3").text().trim();
        const snippet = $(el).find(".VwiC3b, .st").text();
        const link = $(el).find("a").first().attr("href") || "";
        const text = title + " " + snippet;

        const phoneMatch = text.match(/(0[35]\d{9}|0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/);
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        const companyName = title.split(/[-|–|\/]/)[0].trim();

        if (companyName && companyName.length > 3) {
          if (!results.find(r => r.company_name === companyName)) {
            results.push({
              company_name: companyName,
              phone: phoneMatch?.[0]?.replace(/\s/g, "") || null,
              email: emailMatch?.[0] || null,
              website: link.startsWith("http") ? link.split("?")[0] : null,
              city, sector: keyword, source: "altinrehber", status: "new",
            });
          }
        }
      });

      await sleep(600);
      if (results.length >= limit) break;
    }
  } catch (e: any) {
    console.error("AltinRehber error:", e.message);
  }
  return results.slice(0, limit);
}

// ── SAHİBİNDEN İŞLETME — Google üzerinden ───────────────
async function scrapeSahibinden(keyword: string, city: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    // Sahibinden 403 veriyor — Google üzerinden çek
    const queries = [
      `site:sahibinden.com "${keyword}" "${city}" iletisim telefon`,
      `sahibinden.com "${keyword}" "${city}" hizmet`,
      `"${keyword}" "${city}" ilan hizmet telefon iletisim`,
    ];

    for (const query of queries) {
      const resp = await axios.get(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=tr`,
        { headers: HEADERS, timeout: 12000 }
      );
      const $ = cheerio.load(resp.data);

      $("div.g, .tF2Cxc").each((_: any, el: any) => {
        const title = $(el).find("h3").text().trim();
        const snippet = $(el).find(".VwiC3b, .st").text();
        const link = $(el).find("a").first().attr("href") || "";
        const text = title + " " + snippet;

        const phoneMatch = text.match(/(0[35]\d{9}|0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/);
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        const companyName = title.split(/[-|–|\/]/)[0].trim();

        if (companyName && companyName.length > 3) {
          if (!results.find(r => r.company_name === companyName)) {
            results.push({
              company_name: companyName,
              phone: phoneMatch?.[0]?.replace(/\s/g, "") || null,
              email: emailMatch?.[0] || null,
              website: link.startsWith("http") ? link.split("?")[0] : null,
              city, sector: keyword, source: "sahibinden", status: "new",
            });
          }
        }
      });

      await sleep(600);
      if (results.length >= limit) break;
    }
  } catch (e: any) {
    console.error("Sahibinden error:", e.message);
  }
  return results.slice(0, limit);
}

// ── TRENDYOL MAĞAZA SAHİPLERİ ────────────────────────────
async function scrapeTrendyol(keyword: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    // Trendyol mağaza sahiplerini Google üzerinden bul
    const queries = [
      `site:trendyol.com/magaza "${keyword}" iletisim`,
      `trendyol "${keyword}" magaza sahibi whatsapp telefon`,
      `trendyol satici "${keyword}" iletisim`,
    ];

    for (const query of queries) {
      const resp = await axios.get(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`,
        { headers: HEADERS, timeout: 10000 }
      );
      const $ = cheerio.load(resp.data);

      $("div.g, .tF2Cxc").each((_: any, el: any) => {
        const link = $(el).find("a").first().attr("href") || "";
        const title = $(el).find("h3").text().trim();
        const snippet = $(el).find(".VwiC3b").text();

        if (link.includes("trendyol.com")) {
          const phoneMatch = (snippet + title).match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
          const emailMatch = (snippet + title).match(/[\w.-]+@[\w.-]+\.\w+/);
          const storeMatch = link.match(/trendyol\.com\/([^/?]+)/);

          if (title && !results.find(r => r.company_name === title)) {
            results.push({
              company_name: title.split(/[-|–]/)[0].trim(),
              phone: phoneMatch?.[0]?.replace(/\s/g,"") || null,
              email: emailMatch?.[0] || null,
              website: link.includes("trendyol") ? link.split("?")[0] : null,
              sector: keyword,
              source: "trendyol",
              status: "new",
            });
          }
        }
      });
      await sleep(600);
      if (results.length >= limit) break;
    }
  } catch (e: any) {
    console.error("Trendyol error:", e.message);
  }
  return results.slice(0, limit);
}

// ── GENEL WEB ARAMA ───────────────────────────────────────
async function scrapeGeneral(keyword: string, city: string, source: string, limit: number): Promise<any[]> {
  const results: any[] = [];
  try {
    const queries = [
      `"${keyword}" "${city}" telefon iletisim`,
      `"${keyword}" "${city}" firma whatsapp`,
    ];

    for (const query of queries) {
      const resp = await axios.get(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=tr`,
        { headers: HEADERS, timeout: 10000 }
      );
      const $ = cheerio.load(resp.data);

      $("div.g, .tF2Cxc").each((_: any, el: any) => {
        const title = $(el).find("h3").text().trim();
        const snippet = $(el).find(".VwiC3b").text();
        const link = $(el).find("a").first().attr("href") || "";
        const phoneMatch = (snippet + title).match(/(0?5\d{2}[\s]?\d{3}[\s]?\d{2}[\s]?\d{2})/);
        const emailMatch = (snippet + title).match(/[\w.-]+@[\w.-]+\.\w+/);

        if (title && title.length > 3 && phoneMatch) {
          if (!results.find(r => r.company_name === title.split(/[-|–]/)[0].trim())) {
            results.push({
              company_name: title.split(/[-|–]/)[0].trim(),
              phone: phoneMatch[0].replace(/\s/g,""),
              email: emailMatch?.[0] || null,
              website: link.startsWith("http") ? link.split("?")[0] : null,
              city, sector: keyword, source, status: "new",
            });
          }
        }
      });
      await sleep(700);
      if (results.length >= limit) break;
    }
  } catch (e: any) {
    console.error("General scrape error:", e.message);
  }
  return results.slice(0, limit);
}

// ── DB'YE KAYDET ──────────────────────────────────────────
async function saveLeads(userId: string, leads: any[]): Promise<{added:number, duplicate:number}> {
  let added = 0, duplicate = 0;
  for (const lead of leads) {
    try {
      let query = supabase.from("leads").select("id").eq("user_id", userId);
      if (lead.phone) query = query.eq("phone", lead.phone);
      else query = query.eq("company_name", lead.company_name);

      const { data: existing } = await query.maybeSingle();
      if (existing) { duplicate++; continue; }

      await supabase.from("leads").insert([{ user_id: userId, ...lead }]);
      added++;
    } catch {}
  }
  return { added, duplicate };
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/sources/scrape
router.post("/scrape", async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { source, keyword, city, limit = 20 } = req.body;
    if (!keyword || !source) return res.status(400).json({ error: "source ve keyword zorunlu" });

    let leads: any[] = [];

    switch (source) {
      case "altinrehber": leads = await scrapeAltinRehber(keyword, city || "Istanbul", limit); break;
      case "sahibinden": leads = await scrapeSahibinden(keyword, city || "Istanbul", limit); break;
      case "trendyol": leads = await scrapeTrendyol(keyword, limit); break;
      case "web": leads = await scrapeGeneral(keyword, city || "Istanbul", "web", limit); break;
      default: return res.status(400).json({ error: "Geçersiz kaynak" });
    }

    const { added, duplicate } = await saveLeads(userId, leads);
    res.json({ found: leads.length, added, duplicate, message: `${added} yeni lead eklendi (${source})` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sources/scrape-batch
router.post("/scrape-batch", async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { sources, keywords, cities, limitPerCombination = 10 } = req.body;

    res.json({ message: "Toplu tarama başlıyor...", total: (sources?.length||1) * keywords.length * (cities?.length||1) });

    (async () => {
      let totalAdded = 0;
      for (const keyword of keywords) {
        for (const source of (sources || ["web"])) {
          const cityList = ["trendyol"].includes(source) ? [""] : (cities || ["Istanbul"]);
          for (const city of cityList) {
            try {
              let leads: any[] = [];
              switch (source) {
                case "altinrehber": leads = await scrapeAltinRehber(keyword, city, limitPerCombination); break;
                case "sahibinden": leads = await scrapeSahibinden(keyword, city, limitPerCombination); break;
                case "trendyol": leads = await scrapeTrendyol(keyword, limitPerCombination); break;
                case "instagram":
                  leads = (await axios.post(`http://localhost:3001/api/instagram/scrape`, { keyword, city, limit: limitPerCombination }, { headers: { Authorization: req.headers.authorization } }).catch(()=>({data:{}})))?.data?.leads || [];
                  break;
                case "facebook":
                  leads = (await axios.post(`http://localhost:3001/api/facebook/scrape`, { keyword, city, limit: limitPerCombination }, { headers: { Authorization: req.headers.authorization } }).catch(()=>({data:{}})))?.data?.leads || [];
                  break;
                default: leads = await scrapeGeneral(keyword, city, source, limitPerCombination);
              }
              const { added } = await saveLeads(userId, leads);
              totalAdded += added;
              await sleep(2000);
            } catch (e: any) {
              console.error(`Batch error ${source}/${keyword}/${city}:`, e.message);
            }
          }
        }
      }
      console.log(`Batch scrape done: ${totalAdded} total leads added`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sources/stats
router.get("/stats", async (req: any, res: any) => {
  try {
    const { data } = await supabase.from("leads").select("source").eq("user_id", req.userId);
    const stats: Record<string, number> = {};
    (data || []).forEach((d: any) => {
      stats[d.source || "manual"] = (stats[d.source || "manual"] || 0) + 1;
    });
    res.json({ stats, total: data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sources/referral — Referans ile lead ekle
router.post("/referral", async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { referrerLeadId, companyName, contactName, phone, email, sector } = req.body;
    if (!companyName || !phone) return res.status(400).json({ error: "companyName ve phone zorunlu" });

    // Referans veren müşteriyi bul
    let referrerName = "Referans";
    if (referrerLeadId) {
      const { data: referrer } = await supabase.from("leads").select("company_name, contact_name").eq("id", referrerLeadId).single();
      referrerName = referrer?.contact_name || referrer?.company_name || "Referans";
    }

    const { data: existing } = await supabase.from("leads").select("id").eq("user_id", userId).eq("phone", phone).maybeSingle();
    if (existing) return res.status(400).json({ error: "Bu telefon numarası zaten kayıtlı" });

    const { data: newLead } = await supabase.from("leads").insert([{
      user_id: userId,
      company_name: companyName,
      contact_name: contactName || null,
      phone,
      email: email || null,
      sector: sector || null,
      source: "referral",
      referrer: referrerName,
      status: "new",
      notes: `${referrerName} tarafından önerildi`,
    }]).select().single();

    res.json({ lead: newLead, message: `Referans lead eklendi! (${referrerName} tarafından)` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;