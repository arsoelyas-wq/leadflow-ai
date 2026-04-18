export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const upload = multer({ dest: '/tmp/recordings/' });

// ── HELPERS ──────────────────────────────────────────────

async function transcribeAudio(filePath: string): Promise<string> {
  if (!GROQ_API_KEY) return '';
  try {
    const wavPath = filePath + '.wav';
    try { fs.renameSync(filePath, wavPath); } catch {}
    const form = new FormData();
    form.append('file', fs.createReadStream(fs.existsSync(wavPath) ? wavPath : filePath), {
      filename: 'recording.wav', contentType: 'audio/wav',
    });
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'tr');
    form.append('response_format', 'text');
    form.append('temperature', '0');
    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${GROQ_API_KEY}` },
      timeout: 120000, maxBodyLength: Infinity,
    });
    try { fs.unlinkSync(wavPath); } catch {}
    return response.data || '';
  } catch (e: any) {
    console.error('Groq error:', e.response?.data || e.message);
    return '';
  }
}

async function analyzeConversation(params: {
  transcript?: string;
  messages?: any[];
  memberName: string;
  phone: string;
  channel: string;
  duration?: number;
}): Promise<any> {
  const { transcript, messages, memberName, phone, channel, duration } = params;

  let conversationText = transcript || '';
  if (messages && messages.length > 0) {
    conversationText = messages.slice(-40).map((m: any) => {
      const dir = m.direction === 'out' ? `[${memberName}]` : '[Müşteri]';
      return `${dir}: ${m.content}`;
    }).join('\n');
  }

  if (!conversationText || conversationText.length < 20) return null;

  try {
    const prompt = `Sen deneyimli bir satış koçusun. Aşağıdaki ${channel === 'phone' ? 'telefon görüşmesi' : 'WhatsApp konuşması'} transkriptini analiz et.

TEMSİLCİ: ${memberName}
MÜŞTERİ NUMARASI: ${phone}
${duration ? `SÜRE: ${Math.round(duration / 60)} dakika` : ''}
KANAL: ${channel === 'phone' ? 'Telefon' : 'WhatsApp'}

KONUŞMA:
${conversationText.slice(0, 4000)}

JSON formatında detaylı analiz ver:
{
  "overall_score": 0-100,
  "professionalism_score": 0-100,
  "sales_technique_score": 0-100,
  "empathy_score": 0-100,
  "closing_score": 0-100,
  "communication_score": 0-100,
  "summary": "3-4 cumle ozet",
  "outcome": "sale|no_sale|callback|ongoing|unknown",
  "outcome_reason": "aciklama",
  "strengths": ["guclu yon 1", "guclu yon 2", "guclu yon 3"],
  "weaknesses": ["zayif yon 1", "zayif yon 2", "zayif yon 3"],
  "lost_opportunities": [{"moment": "an", "suggestion": "oneri"}],
  "key_moments": [{"time": "an", "type": "positive|negative|neutral", "description": "aciklama"}],
  "recommendations": ["oneri 1", "oneri 2", "oneri 3"],
  "sentiment": "positive|neutral|negative",
  "keywords": ["kelime1", "kelime2"],
  "customer_needs": ["ihtiyac1", "ihtiyac2"],
  "next_steps": "sonraki adimlar"
}
Sadece JSON dondur.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0]?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e: any) {
    console.error('Analiz hatasi:', e.message);
    return null;
  }
}

// ── EKIP YÖNETIMI ─────────────────────────────────────────

// GET /api/team-intelligence/members
router.get('/members', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('ti_members')
      .select('*, ti_phone_lines(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Her üye için analiz özeti ekle
    const members = await Promise.all((data || []).map(async (m: any) => {
      const { data: analyses } = await supabase
        .from('member_analyses')
        .select('overall_score, created_at')
        .eq('member_id', m.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const scores = (analyses || []).filter((a: any) => a.overall_score);
      const avgScore = scores.length
        ? Math.round(scores.reduce((s: number, a: any) => s + a.overall_score, 0) / scores.length)
        : null;

      return { ...m, avg_score: avgScore, total_analyses: analyses?.length || 0 };
    }));

    res.json({ members });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/team-intelligence/members
router.post('/members', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, email, role, wa_phone, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name zorunlu' });

    const { data, error } = await supabase
      .from('ti_members')
      .insert([{ user_id: userId, name, email, role: role || 'Satış Temsilcisi', wa_phone, notes }])
      .select().single();
    if (error) throw error;

    res.json({ member: data, message: 'Üye eklendi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/team-intelligence/members/:id
router.patch('/members/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, email, role, wa_phone, notes } = req.body;
    const { data, error } = await supabase
      .from('ti_members')
      .update({ name, email, role, wa_phone, notes })
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select().single();
    if (error) throw error;
    res.json({ member: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/team-intelligence/members/:id
router.delete('/members/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('ti_members')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('user_id', userId);
    res.json({ message: 'Üye silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── HAT YÖNETİMİ ──────────────────────────────────────────

// POST /api/team-intelligence/members/:id/lines — Hat ekle
router.post('/members/:id/lines', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { number, type } = req.body; // type: 'whatsapp' | 'phone'
    if (!number || !type) return res.status(400).json({ error: 'number ve type zorunlu' });

    // Üye bu kullanıcıya ait mi?
    const { data: member } = await supabase
      .from('ti_members').select('id').eq('id', req.params.id).eq('user_id', userId).single();
    if (!member) return res.status(403).json({ error: 'Yetkisiz' });

    const { data, error } = await supabase
      .from('ti_phone_lines')
      .insert([{ user_id: userId, member_id: req.params.id, number, type }])
      .select().single();
    if (error) throw error;

    res.json({ line: data, message: 'Hat eklendi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/team-intelligence/members/:id/lines/:lineId
router.delete('/members/:id/lines/:lineId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('ti_phone_lines')
      .update({ is_active: false })
      .eq('id', req.params.lineId)
      .eq('user_id', userId);
    res.json({ message: 'Hat silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── WHATSAPP ANALİZİ ───────────────────────────────────────

// POST /api/team-intelligence/analyze-whatsapp
// WhatsApp numarasına göre üyeyi bulur, mesajları analiz eder
router.post('/analyze-whatsapp', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { memberId, phone, days = 30 } = req.body;
    if (!memberId) return res.status(400).json({ error: 'memberId zorunlu' });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Üye bilgisi
    const { data: member } = await supabase
      .from('ti_members').select('*').eq('id', memberId).eq('user_id', userId).single();
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı' });

    // WhatsApp mesajları — bu üyenin wa_phone'u ile giden mesajlar
    let query = supabase
      .from('messages')
      .select('*, leads(phone, company_name)')
      .eq('user_id', userId)
      .eq('channel', 'whatsapp')
      .gte('sent_at', since)
      .order('sent_at', { ascending: true });

    if (phone) query = query.eq('leads.phone', phone);

    const { data: messages, error: msgError } = await query;
    if (msgError) throw msgError;
    if (!messages?.length) return res.status(400).json({ error: 'Mesaj bulunamadı' });

    // Müşteri bazlı grupla
    const byPhone: Record<string, any[]> = {};
    messages.forEach((m: any) => {
      const p = m.leads?.phone || 'unknown';
      if (!byPhone[p]) byPhone[p] = [];
      byPhone[p].push(m);
    });

    const results = [];
    for (const [customerPhone, msgs] of Object.entries(byPhone)) {
      if (msgs.length < 2) continue;
      const analysis = await analyzeConversation({
        messages: msgs,
        memberName: member.name,
        phone: customerPhone,
        channel: 'whatsapp',
      });
      if (!analysis) continue;

      const { data: saved } = await supabase.from('member_analyses').insert([{
        user_id: userId,
        member_id: memberId,
        member_name: member.name,
        customer_phone: customerPhone,
        customer_name: msgs[0]?.leads?.company_name || customerPhone,
        channel: 'whatsapp',
        message_count: msgs.length,
        period_start: msgs[0]?.sent_at,
        period_end: msgs[msgs.length - 1]?.sent_at,
        overall_score: analysis.overall_score,
        professionalism_score: analysis.professionalism_score,
        sales_technique_score: analysis.sales_technique_score,
        empathy_score: analysis.empathy_score,
        closing_score: analysis.closing_score,
        communication_score: analysis.communication_score,
        summary: analysis.summary,
        outcome: analysis.outcome,
        outcome_reason: analysis.outcome_reason,
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        lost_opportunities: analysis.lost_opportunities || [],
        key_moments: analysis.key_moments || [],
        recommendations: analysis.recommendations || [],
        sentiment: analysis.sentiment,
        keywords: analysis.keywords || [],
        customer_needs: analysis.customer_needs || [],
        next_steps: analysis.next_steps,
        conversation_snippet: msgs.slice(-5).map((m: any) => ({
          direction: m.direction, content: m.content, sent_at: m.sent_at,
        })),
      }]).select().single();

      results.push({ phone: customerPhone, score: analysis.overall_score, id: saved?.id });
    }

    res.json({ analyzed: results.length, results, message: `${results.length} konuşma analiz edildi` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── TELEFON ANALİZİ ────────────────────────────────────────

// POST /api/team-intelligence/process-call — VPS'ten ses dosyası
router.post('/process-call', upload.single('recording'), async (req: any, res: any) => {
  try {
    const { secret, memberId, userId, callerid, duration, uniqueid } = req.body;
    if (secret !== (process.env.CALLS_SECRET || 'leadflow-calls-secret-2026')) {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const file = req.file;
    console.log(`Arama: ${callerid} sure:${duration}s üye:${memberId}`);
    res.json({ ok: true, message: 'İşleniyor' });

    (async () => {
      try {
        // Üye bilgisi
        const { data: member } = await supabase
          .from('ti_members').select('*').eq('id', memberId).single();

        let transcript = '';
        let audioUrl = '';

        if (file && fs.existsSync(file.path)) {
          transcript = await transcribeAudio(file.path);
          console.log(`Transkript: ${transcript.slice(0, 80)}`);

          // Supabase Storage'a yükle
          try {
            const wavPath = file.path + '.wav';
            const buf = fs.existsSync(wavPath) ? fs.readFileSync(wavPath) : fs.readFileSync(file.path);
            const fileName = `calls/${userId}/${memberId}/${uniqueid || Date.now()}.wav`;
            const { data: up } = await supabase.storage
              .from('recordings').upload(fileName, buf, { contentType: 'audio/wav', upsert: true });
            if (up) {
              const { data: u } = supabase.storage.from('recordings').getPublicUrl(fileName);
              audioUrl = u?.publicUrl || '';
            }
          } catch (e: any) { console.error('Storage:', e.message); }
        }

        const analysis = transcript
          ? await analyzeConversation({
              transcript,
              memberName: member?.name || 'Temsilci',
              phone: callerid,
              channel: 'phone',
              duration: Number(duration),
            })
          : null;

        await supabase.from('member_analyses').insert([{
          user_id: userId,
          member_id: memberId,
          member_name: member?.name || 'Temsilci',
          customer_phone: callerid,
          channel: 'phone',
          duration_seconds: Number(duration) || 0,
          transcript,
          audio_url: audioUrl,
          outcome: analysis?.outcome || 'unknown',
          overall_score: analysis?.overall_score || null,
          professionalism_score: analysis?.professionalism_score || null,
          sales_technique_score: analysis?.sales_technique_score || null,
          empathy_score: analysis?.empathy_score || null,
          closing_score: analysis?.closing_score || null,
          communication_score: analysis?.communication_score || null,
          summary: analysis?.summary || null,
          outcome_reason: analysis?.outcome_reason || null,
          strengths: analysis?.strengths || [],
          weaknesses: analysis?.weaknesses || [],
          lost_opportunities: analysis?.lost_opportunities || [],
          key_moments: analysis?.key_moments || [],
          recommendations: analysis?.recommendations || [],
          sentiment: analysis?.sentiment || null,
          keywords: analysis?.keywords || [],
          customer_needs: analysis?.customer_needs || [],
          next_steps: analysis?.next_steps || null,
          uniqueid: uniqueid || null,
        }]);

        console.log('Arama kaydedildi:', memberId);
      } catch (e: any) {
        console.error('Arkaplan hatası:', e.message);
      }
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── ANALİZ & RAPORLAR ──────────────────────────────────────

// GET /api/team-intelligence/analyses
router.get('/analyses', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { memberId, channel, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('member_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (memberId) query = query.eq('member_id', memberId);
    if (channel) query = query.eq('channel', channel);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ analyses: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/team-intelligence/member-report/:memberId
router.get('/member-report/:memberId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();

    const { data: member } = await supabase
      .from('ti_members').select('*, ti_phone_lines(*)').eq('id', req.params.memberId).eq('user_id', userId).single();
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı' });

    const { data: analyses } = await supabase
      .from('member_analyses')
      .select('*')
      .eq('member_id', req.params.memberId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    const data = analyses || [];
    const withScore = data.filter((a: any) => a.overall_score);
    const avgScore = withScore.length
      ? Math.round(withScore.reduce((s: number, a: any) => s + a.overall_score, 0) / withScore.length) : 0;

    const waAnalyses = data.filter((a: any) => a.channel === 'whatsapp');
    const phoneAnalyses = data.filter((a: any) => a.channel === 'phone');

    // En sık geçen güçlü/zayıf yönler
    const countItems = (items: string[]) => {
      const map: Record<string, number> = {};
      items.forEach(i => { map[i] = (map[i] || 0) + 1; });
      return Object.entries(map).sort(([,a],[,b]) => b-a).slice(0,5).map(([text,count]) => ({text,count}));
    };

    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];
    const allRecs: string[] = [];
    data.forEach((a: any) => {
      if (a.strengths) allStrengths.push(...a.strengths);
      if (a.weaknesses) allWeaknesses.push(...a.weaknesses);
      if (a.recommendations) allRecs.push(...a.recommendations);
    });

    res.json({
      member,
      period_days: days,
      total_analyses: data.length,
      whatsapp_count: waAnalyses.length,
      phone_count: phoneAnalyses.length,
      avg_score: avgScore,
      scores: {
        overall: avgScore,
        professionalism: withScore.length ? Math.round(withScore.reduce((s: number, a: any) => s + (a.professionalism_score || 0), 0) / withScore.length) : 0,
        sales_technique: withScore.length ? Math.round(withScore.reduce((s: number, a: any) => s + (a.sales_technique_score || 0), 0) / withScore.length) : 0,
        empathy: withScore.length ? Math.round(withScore.reduce((s: number, a: any) => s + (a.empathy_score || 0), 0) / withScore.length) : 0,
        closing: withScore.length ? Math.round(withScore.reduce((s: number, a: any) => s + (a.closing_score || 0), 0) / withScore.length) : 0,
      },
      top_strengths: countItems(allStrengths),
      top_weaknesses: countItems(allWeaknesses),
      top_recommendations: countItems(allRecs),
      outcomes: {
        sale: data.filter((a: any) => a.outcome === 'sale').length,
        no_sale: data.filter((a: any) => a.outcome === 'no_sale').length,
        callback: data.filter((a: any) => a.outcome === 'callback').length,
        unknown: data.filter((a: any) => a.outcome === 'unknown').length,
      },
      recent_analyses: data.slice(0, 20).map((a: any) => ({
        id: a.id, channel: a.channel, customer_phone: a.customer_phone,
        customer_name: a.customer_name, score: a.overall_score, summary: a.summary,
        outcome: a.outcome, created_at: a.created_at, duration_seconds: a.duration_seconds,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/team-intelligence/dashboard
router.get('/dashboard', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();

    const { data: members } = await supabase
      .from('ti_members').select('id, name, role, wa_phone').eq('user_id', userId).eq('is_active', true);

    const { data: analyses } = await supabase
      .from('member_analyses').select('*').eq('user_id', userId).gte('created_at', since);

    const data = analyses || [];
    const withScore = data.filter((a: any) => a.overall_score);
    const avgScore = withScore.length
      ? Math.round(withScore.reduce((s: number, a: any) => s + a.overall_score, 0) / withScore.length) : 0;

    // Üye bazlı özet
    const memberSummary = (members || []).map((m: any) => {
      const mAnalyses = data.filter((a: any) => a.member_id === m.id);
      const mScored = mAnalyses.filter((a: any) => a.overall_score);
      return {
        id: m.id, name: m.name, role: m.role,
        total: mAnalyses.length,
        whatsapp: mAnalyses.filter((a: any) => a.channel === 'whatsapp').length,
        phone: mAnalyses.filter((a: any) => a.channel === 'phone').length,
        avg_score: mScored.length ? Math.round(mScored.reduce((s: number, a: any) => s + a.overall_score, 0) / mScored.length) : null,
      };
    }).sort((a: any, b: any) => (b.avg_score || 0) - (a.avg_score || 0));

    const allWeaknesses: string[] = [];
    data.forEach((a: any) => { if (a.weaknesses) allWeaknesses.push(...a.weaknesses); });
    const weaknessCount: Record<string, number> = {};
    allWeaknesses.forEach(w => { weaknessCount[w] = (weaknessCount[w] || 0) + 1; });
    const topWeaknesses = Object.entries(weaknessCount)
      .sort(([,a],[,b]) => b-a).slice(0,5).map(([text,count]) => ({text,count}));

    res.json({
      period_days: days,
      total_members: members?.length || 0,
      total_analyses: data.length,
      whatsapp_analyses: data.filter((a: any) => a.channel === 'whatsapp').length,
      phone_analyses: data.filter((a: any) => a.channel === 'phone').length,
      avg_score: avgScore,
      score_distribution: {
        excellent: withScore.filter((a: any) => a.overall_score >= 80).length,
        good: withScore.filter((a: any) => a.overall_score >= 60 && a.overall_score < 80).length,
        average: withScore.filter((a: any) => a.overall_score >= 40 && a.overall_score < 60).length,
        poor: withScore.filter((a: any) => a.overall_score < 40).length,
      },
      member_summary: memberSummary,
      top_weaknesses: topWeaknesses,
      best: data.sort((a: any, b: any) => (b.overall_score || 0) - (a.overall_score || 0)).slice(0,5).map((a: any) => ({
        id: a.id, member_name: a.member_name, customer_phone: a.customer_phone,
        score: a.overall_score, channel: a.channel, summary: a.summary,
      })),
      worst: data.sort((a: any, b: any) => (a.overall_score || 100) - (b.overall_score || 100)).slice(0,5).map((a: any) => ({
        id: a.id, member_name: a.member_name, customer_phone: a.customer_phone,
        score: a.overall_score, channel: a.channel, summary: a.summary,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;