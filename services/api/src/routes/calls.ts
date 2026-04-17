export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CALLS_SECRET = process.env.CALLS_SECRET || 'leadflow-calls-secret-2026';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const upload = multer({ dest: '/tmp/recordings/' });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Groq Whisper ile ses -> metin (OpenAI'dan 10x hizli, daha ucuz)
async function transcribeAudio(filePath: string): Promise<string> {
  if (!GROQ_API_KEY) {
    console.log('GROQ_API_KEY yok, transkripsiyon atlanıyor');
    return '';
  }
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: 'audio/wav',
    });
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'tr');
    form.append('response_format', 'text');
    form.append('temperature', '0');

    const response = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 120000,
        maxBodyLength: Infinity,
      }
    );
    const transcript = response.data || '';
    console.log(`Transkripsiyon tamamlandi: ${transcript.slice(0, 100)}...`);
    return transcript;
  } catch (e: any) {
    console.error('Groq Whisper error:', e.response?.data || e.message);
    return '';
  }
}

// Claude ile arama analizi
async function analyzeCallTranscript(
  transcript: string,
  callerid: string,
  agentName: string,
  duration: number
): Promise<any> {
  if (!transcript || transcript.length < 20) return null;
  try {
    const prompt = `Sen deneyimli bir satış koçusun. Aşağıdaki telefon görüşmesi transkriptini profesyonel olarak analiz et.

ARAYAN MÜŞTERİ: ${callerid}
SATIŞ TEMSİLCİSİ: ${agentName}
GÖRÜŞME SÜRESİ: ${Math.round(duration / 60)} dakika

GÖRÜŞME TRANSKRİPTİ:
${transcript.slice(0, 4000)}

Aşağıdaki JSON formatında çok detaylı analiz yap:
{
  "overall_score": 0-100 genel performans puani,
  "professionalism_score": 0-100 profesyonellik,
  "sales_technique_score": 0-100 satis teknigi,
  "empathy_score": 0-100 empati ve dinleme,
  "closing_score": 0-100 kapanis teknigi,
  "communication_score": 0-100 iletisim kalitesi,
  "summary": "3-4 cumle detayli ozet",
  "outcome": "sale|no_sale|callback|ongoing|unknown",
  "outcome_reason": "sonucun detayli aciklamasi",
  "strengths": ["guclu yon 1", "guclu yon 2", "guclu yon 3"],
  "weaknesses": ["zayif yon 1", "zayif yon 2", "zayif yon 3"],
  "lost_opportunities": [
    {"moment": "kacirilan an", "suggestion": "yapilmasi gereken"},
    {"moment": "kacirilan an 2", "suggestion": "yapilmasi gereken 2"}
  ],
  "key_moments": [
    {"time": "X. dakika", "type": "positive|negative|neutral", "description": "onemli an aciklamasi"},
    {"time": "Y. dakika", "type": "positive|negative|neutral", "description": "onemli an aciklamasi"}
  ],
  "recommendations": ["oneri 1", "oneri 2", "oneri 3"],
  "talk_ratio": {"agent": 60, "customer": 40},
  "sentiment": "positive|neutral|negative",
  "keywords": ["anahtar kelime 1", "anahtar kelime 2", "anahtar kelime 3"],
  "customer_needs": ["musteri ihtiyaci 1", "musteri ihtiyaci 2"],
  "objections_handled": ["itiraz 1 - nasil ele alindi", "itiraz 2 - nasil ele alindi"],
  "next_steps": "onerilecek sonraki adimlar"
}

Sadece JSON dondur, baska hicbir sey yazma.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e: any) {
    console.error('Analiz hatasi:', e.message);
    return null;
  }
}

// POST /api/calls/process — VPS'ten gelen ses dosyasi (secret ile korunur)
router.post('/process', upload.single('recording'), async (req: any, res: any) => {
  try {
    const { secret, uniqueid, callerid, duration, userId, agentName, agentId } = req.body;

    if (secret !== CALLS_SECRET) {
      console.warn('Yetkisiz calls/process istegi');
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    const file = req.file;
    console.log(`Arama isleniyor: ${callerid} sure:${duration}s temsilci:${agentName}`);
    res.json({ ok: true, message: 'Analiz baslatildi' });

    // Arkaplanda isle
    (async () => {
      try {
        let transcript = '';
        let audioUrl = '';

        if (file && fs.existsSync(file.path)) {
          // Groq ile transkripsiyon
          transcript = await transcribeAudio(file.path);

          // Ses dosyasini Supabase Storage'a yukle
          try {
            const audioBuffer = fs.readFileSync(file.path);
            const fileName = `calls/${userId || 'unknown'}/${uniqueid || Date.now()}.wav`;
            const { data: uploadData } = await supabase.storage
              .from('recordings')
              .upload(fileName, audioBuffer, { contentType: 'audio/wav', upsert: true });

            if (uploadData) {
              const { data: urlData } = supabase.storage.from('recordings').getPublicUrl(fileName);
              audioUrl = urlData?.publicUrl || '';
            }
          } catch (uploadErr: any) {
            console.error('Storage yukle hatasi:', uploadErr.message);
          }

          // Gecici dosyayi temizle
          try { fs.unlinkSync(file.path); } catch {}
        }

        // Claude analizi
        const analysis = transcript
          ? await analyzeCallTranscript(transcript, callerid, agentName || 'Temsilci', Number(duration) || 0)
          : null;

        // Supabase'e kaydet
        const insertData: any = {
          user_id: userId || null,
          agent_id: agentId || null,
          agent_name: agentName || 'Temsilci',
          phone: callerid,
          channel: 'phone',
          duration_seconds: Number(duration) || 0,
          transcript,
          audio_url: audioUrl,
          outcome: analysis?.outcome || 'unknown',
          strengths: analysis?.strengths || [],
          weaknesses: analysis?.weaknesses || [],
          lost_opportunities: analysis?.lost_opportunities || [],
          key_moments: analysis?.key_moments || [],
          recommendations: analysis?.recommendations || [],
          keywords: analysis?.keywords || [],
          uniqueid: uniqueid || null,
        };

        if (analysis) {
          insertData.overall_score = analysis.overall_score;
          insertData.professionalism_score = analysis.professionalism_score;
          insertData.sales_technique_score = analysis.sales_technique_score;
          insertData.empathy_score = analysis.empathy_score;
          insertData.closing_score = analysis.closing_score;
          insertData.communication_score = analysis.communication_score;
          insertData.summary = analysis.summary;
          insertData.outcome_reason = analysis.outcome_reason;
          insertData.talk_ratio = analysis.talk_ratio;
          insertData.sentiment = analysis.sentiment;
          insertData.customer_needs = analysis.customer_needs || [];
          insertData.objections_handled = analysis.objections_handled || [];
          insertData.next_steps = analysis.next_steps;
        }

        const { data: savedCall, error } = await supabase
          .from('call_analyses')
          .insert([insertData])
          .select()
          .single();

        if (error) console.error('DB kayit hatasi:', error);
        else console.log('Arama kaydedildi:', savedCall?.id);

      } catch (e: any) {
        console.error('Arkaplan islem hatasi:', e.message);
      }
    })();

  } catch (e: any) {
    console.error('Process hatasi:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/calls/log — Sadece metadata (ses kaydi yoksa)
router.post('/log', async (req: any, res: any) => {
  try {
    const { secret, uniqueid, callerid, duration, userId, agentName, agentId } = req.body;
    if (secret !== CALLS_SECRET) return res.status(403).json({ error: 'Yetkisiz' });

    await supabase.from('call_analyses').insert([{
      user_id: userId || null,
      agent_id: agentId || null,
      agent_name: agentName || 'Temsilci',
      phone: callerid,
      channel: 'phone',
      duration_seconds: Number(duration) || 0,
      outcome: 'unknown',
      uniqueid: uniqueid || null,
      strengths: [],
      weaknesses: [],
      lost_opportunities: [],
      key_moments: [],
      recommendations: [],
      keywords: [],
    }]);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calls/list — Arama listesi
router.get('/list', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0, agentId } = req.query;

    let query = supabase
      .from('call_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (agentId) query = query.eq('agent_id', agentId);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ calls: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calls/:id — Tek arama detayi
router.get('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('call_analyses')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    res.json({ call: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calls/stats/overview
router.get('/stats/overview', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('call_analyses')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since);

    const calls = data || [];
    const withScore = calls.filter((c: any) => c.overall_score);
    const avgScore = withScore.length
      ? Math.round(withScore.reduce((s: number, c: any) => s + c.overall_score, 0) / withScore.length)
      : 0;
    const totalDuration = calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0);

    res.json({
      total_calls: calls.length,
      analyzed_calls: withScore.length,
      avg_score: avgScore,
      total_duration_min: Math.round(totalDuration / 60),
      avg_duration_min: calls.length ? Math.round(totalDuration / 60 / calls.length) : 0,
      outcomes: {
        sale: calls.filter((c: any) => c.outcome === 'sale').length,
        no_sale: calls.filter((c: any) => c.outcome === 'no_sale').length,
        callback: calls.filter((c: any) => c.outcome === 'callback').length,
        unknown: calls.filter((c: any) => c.outcome === 'unknown').length,
      },
      score_distribution: {
        excellent: withScore.filter((c: any) => c.overall_score >= 80).length,
        good: withScore.filter((c: any) => c.overall_score >= 60 && c.overall_score < 80).length,
        average: withScore.filter((c: any) => c.overall_score >= 40 && c.overall_score < 60).length,
        poor: withScore.filter((c: any) => c.overall_score < 40).length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;