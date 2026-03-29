export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── SOSYAL MEDYA TARA ─────────────────────────────────────
async function scanSocialMedia(name: string, company: string): Promise<any> {
  const context: any = { events: [], mood: 'neutral', specialDay: null };
  const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

  // Google News'ten haber tara
  try {
    const query = `"${name}" OR "${company}" ödül başarı yıldönümü açılış`;
    const resp = await axios.get(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`,
      { headers: HEADERS, timeout: 8000 }
    );
    const text = resp.data || '';

    if (text.includes('ödül') || text.includes('award')) {
      context.events.push('Ödül aldı');
      context.mood = 'happy';
    }
    if (text.includes('yıldönümü') || text.includes('anniversary')) {
      context.events.push('Yıldönümü');
      context.mood = 'celebratory';
    }
    if (text.includes('açılış') || text.includes('yeni şube')) {
      context.events.push('Yeni açılış');
      context.mood = 'excited';
    }
    if (text.includes('ihracat') || text.includes('uluslararası')) {
      context.events.push('Uluslararası başarı');
      context.mood = 'proud';
    }
  } catch {}

  return context;
}

// ── AI EMPATİ MESAJI ÜRET ─────────────────────────────────
async function generateEmpatheticOpener(lead: any, context: any, baseMessage: string): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const hasEvents = context.events.length > 0;
    const eventText = hasEvents ? `Son gelişmeler: ${context.events.join(', ')}` : '';

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Kişiselleştirilmiş WhatsApp mesajı yaz. SADECE mesaj metni yaz.
Kişi: ${lead.contact_name || lead.company_name}
Şirket: ${lead.company_name}
${eventText}
Ana mesaj: ${baseMessage}
${hasEvents ? 'Başta kısa tebrik/empati cümlesi ekle, sonra ana mesaja geç.' : ''}
Max 160 karakter.`
      }]
    });
    return resp.content[0]?.text?.trim() || baseMessage;
  } catch {
    return baseMessage;
  }
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/emotional/scan — Lead için sosyal tarama
router.post('/scan', async (req: any, res: any) => {
  try {
    const { leadId } = req.body;
    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const context = await scanSocialMedia(lead.contact_name || '', lead.company_name || '');

    await supabase.from('leads').update({
      emotional_context: JSON.stringify(context),
      last_social_scan: new Date().toISOString(),
    }).eq('id', leadId);

    res.json({ lead: lead.company_name, context, message: 'Sosyal tarama tamamlandı' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/emotional/scan-batch — Toplu tarama
router.post('/scan-batch', async (req: any, res: any) => {
  try {
    const { limit = 20 } = req.body;
    const { data: leads } = await supabase.from('leads').select('*')
      .eq('user_id', req.userId).not('status', 'eq', 'lost').limit(limit);

    res.json({ message: `${leads?.length || 0} lead taranıyor...` });

    (async () => {
      for (const lead of leads || []) {
        try {
          const context = await scanSocialMedia(lead.contact_name || '', lead.company_name || '');
          await supabase.from('leads').update({
            emotional_context: JSON.stringify(context),
            last_social_scan: new Date().toISOString(),
          }).eq('id', lead.id);
          await sleep(1000);
        } catch {}
      }
    })();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/emotional/generate-opener — Empati mesajı üret
router.post('/generate-opener', async (req: any, res: any) => {
  try {
    const { leadId, baseMessage } = req.body;
    if (!leadId || !baseMessage) return res.status(400).json({ error: 'leadId ve baseMessage zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Tarama yoksa önce tara
    let context = lead.emotional_context ? JSON.parse(lead.emotional_context) : null;
    if (!context) {
      context = await scanSocialMedia(lead.contact_name || '', lead.company_name || '');
      await supabase.from('leads').update({
        emotional_context: JSON.stringify(context),
        last_social_scan: new Date().toISOString(),
      }).eq('id', leadId);
    }

    const message = await generateEmpatheticOpener(lead, context, baseMessage);
    res.json({ original: baseMessage, enhanced: message, context, improved: message !== baseMessage });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/emotional/status
router.get('/status', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('leads').select('id')
      .eq('user_id', req.userId).not('emotional_context', 'is', null);
    res.json({ scanned: data?.length || 0, active: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;