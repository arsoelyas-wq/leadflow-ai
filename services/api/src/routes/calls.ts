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

async function transcribeAudio(filePath: string): Promise<string> {
  if (!GROQ_API_KEY) return '';
  try {
    const wavPath = filePath + '.wav';
    fs.renameSync(filePath, wavPath);

    const form = new FormData();
    form.append('file', fs.createReadStream(wavPath), {
      filename: 'recording.wav',
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

    try { fs.unlinkSync(wavPath); } catch {}
    return response.data || '';
  } catch (e: any) {
    console.error('Groq error:', e.response?.data || e.message);
    return '';
  }
}

async function analyzeCallTranscript(
  transcript: string,
  callerid: string,
  agentName: string,
  duration: number
): Promise<any> {
  if (!transcript || transcript.length < 20) return null;
  try {
    const prompt = `Sen deneyimli bir satis koçusun. Asagidaki telefon gorusmesi transkriptini profesyonel olarak analiz et.

ARAYAN MUSTERI: ${callerid}
SATIS TEMSILCISI: ${agentName}
GORUSME SURESI: ${Math.round(duration / 60)} dakika

GORUSME TRANSKRIPTI:
${transcript.slice(0, 4000)}

Asagidaki JSON formatinda cok detayli analiz yap:
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
    {"moment": "kacirilan an", "suggestion": "yapilmasi gereken"}
  ],
  "key_moments": [
    {"time": "X. dakika", "type": "positive|negative|neutral", "description": "aciklama"}
  ],
  "recommendations": ["oneri 1", "oneri 2", "oneri 3"],
  "talk_ratio": {"agent": 60, "customer": 40},
  "sentiment": "positive|neutral|negative",
  "keywords": ["kelime1", "kelime2", "kelime3"],
  "customer_needs": ["ihtiyac 1", "ihtiyac 2"],
  "objections_handled": ["itiraz 1", "itiraz 2"],
  "next_steps": "onerilecek sonraki adimlar"
}

Sadece JSON dondur.`;

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

// POST /api/calls/process
router.post('/process', upload.single('recording'), async (req: any, res: any) => {
  try {
    const { secret, uniqueid, callerid, duration, userId, agentName, agentId } = req.body;
    if (secret !== CALLS_SECRET) return res.status(403).json({ error: 'Yetkisiz' });

    const file = req.file;
    console.log(`Arama isleniyor: ${callerid} sure:${duration}s temsilci:${agentName}`);
    res.json({ ok: true, message: 'Analiz baslatildi' });

    (async () => {
      try {
        let transcript = '';
        let audioUrl = '';

        if (file && fs.existsSync(file.path)) {
          transcript = await transcribeAudio(file.path);
          console.log(`Transkript: ${transcript.slice(0, 80)}`);

          try {
            const wavPath = file.path + '.wav';
            const audioBuffer = fs.existsSync(wavPath) ? fs.readFileSync(wavPath) : null;
            if (audioBuffer) {
              const fileName = `calls/${userId || 'unknown'}/${uniqueid || Date.now()}.wav`;
              const { data: uploadData } = await supabase.storage
                .from('recordings')
                .upload(fileName, audioBuffer, { contentType: 'audio/wav', upsert: true });
              if (uploadData) {
                const { data: urlData } = supabase.storage.from('recordings').getPublicUrl(fileName);
                audioUrl = urlData?.publicUrl || '';
              }
            }
          } catch (uploadErr: any) {
            console.error('Storage hatasi:', uploadErr.message);
          }
        }

        const analysis = transcript
          ? await analyzeCallTranscript(transcript, callerid, agentName || 'Temsilci', Number(duration) || 0)
          : null;

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

        if (error) console.error('DB hatasi:', error);
        else console.log('Arama kaydedildi:', savedCall?.id);
      } catch (e: any) {
        console.error('Arkaplan hatasi:', e.message);
      }
    })();
  } catch (e: any) {
    console.error('Process hatasi:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/calls/log
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

// GET /api/calls/stats/overview
router.get('/stats/overview', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('call_analyses')
      .select('*')
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

// GET /api/calls/list
router.get('/list', async (req: any, res: any) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { data, error } = await supabase
      .from('call_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    if (error) throw error;
    res.json({ calls: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calls/:id
router.get('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('call_analyses')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ call: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;