export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// â”€â”€ EMAIL TRANSPORTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'resend',
      pass: process.env.RESEND_API_KEY,
    },
  });
}

// â”€â”€ BENCHMARK SKORLARI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BENCHMARKS = {
  overall: 68,
  professionalism: 72,
  sales_technique: 65,
  empathy: 70,
  closing: 60,
  communication: 74,
};

// â”€â”€ RAPOR OLUÅžTURMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generateWeeklyReport(userId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // KullanÄ±cÄ± bilgisi
  const { data: userRow } = await supabase.from('users').select('email').eq('id', userId).single();
  const userEmail = userRow?.email;
  if (!userEmail) return null;

  // Ekip Ã¼yeleri
  const { data: members } = await supabase
    .from('ti_members').select('*').eq('user_id', userId).eq('is_active', true);
  if (!members?.length) return null;

  // Bu haftaki analizler
  const { data: analyses } = await supabase
    .from('member_analyses')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since);

  const data = analyses || [];
  const withScore = data.filter((a: any) => a.overall_score);
  const avgScore = withScore.length
    ? Math.round(withScore.reduce((s: number, a: any) => s + a.overall_score, 0) / withScore.length) : 0;

  // GeÃ§en hafta karÅŸÄ±laÅŸtÄ±rma
  const prevSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: prevAnalyses } = await supabase
    .from('member_analyses')
    .select('overall_score')
    .eq('user_id', userId)
    .gte('created_at', prevSince)
    .lt('created_at', since);

  const prevScored = (prevAnalyses || []).filter((a: any) => a.overall_score);
  const prevAvg = prevScored.length
    ? Math.round(prevScored.reduce((s: number, a: any) => s + a.overall_score, 0) / prevScored.length) : 0;

  const trend = avgScore - prevAvg;

  // Ãœye bazlÄ± Ã¶zet
  const memberSummary = members.map((m: any) => {
    const mData = data.filter((a: any) => a.member_id === m.id);
    const mScored = mData.filter((a: any) => a.overall_score);
    const mAvg = mScored.length
      ? Math.round(mScored.reduce((s: number, a: any) => s + a.overall_score, 0) / mScored.length) : null;
    return { name: m.name, total: mData.length, avg_score: mAvg,
      wa: mData.filter((a: any) => a.channel === 'whatsapp').length,
      phone: mData.filter((a: any) => a.channel === 'phone').length,
    };
  }).sort((a: any, b: any) => (b.avg_score || 0) - (a.avg_score || 0));

  // En iyi / kÃ¶tÃ¼
  const best = data.sort((a: any, b: any) => (b.overall_score || 0) - (a.overall_score || 0))[0];
  const worst = data.filter((a: any) => a.overall_score).sort((a: any, b: any) => a.overall_score - b.overall_score)[0];

  return { userEmail, members: members.length, total: data.length, avgScore, prevAvg, trend,
    memberSummary, best, worst, since, benchmarks: BENCHMARKS };
}

// â”€â”€ EMAIL HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildEmailHtml(report: any) {
  const trendIcon = report.trend > 0 ? 'ðŸ“ˆ' : report.trend < 0 ? 'ðŸ“‰' : 'âž¡ï¸';
  const trendColor = report.trend > 0 ? '#10b981' : report.trend < 0 ? '#ef4444' : '#6b7280';
  const trendText = report.trend > 0 ? `+${report.trend}` : `${report.trend}`;
  const vsbenchmark = report.avgScore - report.benchmarks.overall;
  const benchmarkText = vsbenchmark >= 0 ? `SektÃ¶r ortalamasÄ±nÄ±n ${vsbenchmark} puan Ã¼stÃ¼nde` : `SektÃ¶r ortalamasÄ±nÄ±n ${Math.abs(vsbenchmark)} puan altÄ±nda`;

  const memberRows = report.memberSummary.map((m: any) => `
    <tr style="border-bottom:1px solid #1e293b">
      <td style="padding:10px;color:#f1f5f9;font-weight:500">${m.name}</td>
      <td style="padding:10px;text-align:center;color:#94a3b8">${m.total}</td>
      <td style="padding:10px;text-align:center;color:#14b8a6">${m.wa}</td>
      <td style="padding:10px;text-align:center;color:#f59e0b">${m.phone}</td>
      <td style="padding:10px;text-align:center">
        ${m.avg_score ? `<span style="background:${m.avg_score >= 80 ? '#065f46' : m.avg_score >= 60 ? '#78350f' : '#7f1d1d'};color:${m.avg_score >= 80 ? '#10b981' : m.avg_score >= 60 ? '#f59e0b' : '#ef4444'};padding:3px 10px;border-radius:20px;font-weight:700">${m.avg_score}</span>` : '<span style="color:#475569">â€”</span>'}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>LeadFlow HaftalÄ±k Rapor</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:16px;padding:32px;margin-bottom:24px;text-align:center">
      <div style="font-size:32px;margin-bottom:8px">ðŸ“Š</div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">HaftalÄ±k Ekip Raporu</h1>
      <p style="color:#c4b5fd;margin:8px 0 0">LeadFlow AI Â· ${new Date().toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'})}</p>
    </div>

    <!-- Ana Metrik -->
    <div style="background:#1e293b;border-radius:16px;padding:24px;margin-bottom:16px;text-align:center">
      <div style="font-size:56px;font-weight:800;color:${report.avgScore >= 80 ? '#10b981' : report.avgScore >= 60 ? '#f59e0b' : '#ef4444'}">${report.avgScore || 'â€”'}</div>
      <div style="color:#94a3b8;font-size:14px;margin-top:4px">HaftalÄ±k Ortalama Skor</div>
      <div style="margin-top:12px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap">
        <span style="color:${trendColor};font-size:14px">${trendIcon} GeÃ§en haftaya gÃ¶re <strong>${trendText} puan</strong></span>
        <span style="color:#64748b">|</span>
        <span style="color:#94a3b8;font-size:14px">${benchmarkText}</span>
      </div>
    </div>

    <!-- Ä°statistikler -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div style="background:#1e293b;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#fff">${report.total}</div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">Toplam Analiz</div>
      </div>
      <div style="background:#1e293b;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#14b8a6">${report.memberSummary.reduce((s:number,m:any)=>s+m.wa,0)}</div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">WhatsApp</div>
      </div>
      <div style="background:#1e293b;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#f59e0b">${report.memberSummary.reduce((s:number,m:any)=>s+m.phone,0)}</div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">Telefon</div>
      </div>
    </div>

    <!-- Ãœye Tablosu -->
    <div style="background:#1e293b;border-radius:16px;overflow:hidden;margin-bottom:16px">
      <div style="padding:16px 20px;border-bottom:1px solid #334155">
        <h3 style="color:#f1f5f9;margin:0;font-size:15px">ðŸ‘¥ Ekip PerformansÄ±</h3>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#0f172a">
            <th style="padding:10px;text-align:left;color:#64748b;font-size:12px;font-weight:500">TEMSÄ°LCÄ°</th>
            <th style="padding:10px;text-align:center;color:#64748b;font-size:12px;font-weight:500">TOPLAM</th>
            <th style="padding:10px;text-align:center;color:#64748b;font-size:12px;font-weight:500">WA</th>
            <th style="padding:10px;text-align:center;color:#64748b;font-size:12px;font-weight:500">TEL</th>
            <th style="padding:10px;text-align:center;color:#64748b;font-size:12px;font-weight:500">SKOR</th>
          </tr>
        </thead>
        <tbody>${memberRows}</tbody>
      </table>
    </div>

    ${report.best ? `
    <!-- En Ä°yi / KÃ¶tÃ¼ -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:#064e3b;border:1px solid #065f46;border-radius:12px;padding:16px">
        <div style="color:#10b981;font-size:12px;font-weight:600;margin-bottom:8px">ðŸ† EN Ä°YÄ° KONUÅžMA</div>
        <div style="color:#f1f5f9;font-size:13px;font-weight:500">${report.best.member_name}</div>
        <div style="color:#34d399;font-size:24px;font-weight:700">${report.best.overall_score}</div>
        <div style="color:#6ee7b7;font-size:11px;margin-top:4px">${report.best.summary?.slice(0,80) || ''}...</div>
      </div>
      ${report.worst ? `
      <div style="background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;padding:16px">
        <div style="color:#ef4444;font-size:12px;font-weight:600;margin-bottom:8px">âš ï¸ GELÄ°ÅžTÄ°RÄ°LECEK</div>
        <div style="color:#f1f5f9;font-size:13px;font-weight:500">${report.worst.member_name}</div>
        <div style="color:#f87171;font-size:24px;font-weight:700">${report.worst.overall_score}</div>
        <div style="color:#fca5a5;font-size:11px;margin-top:4px">${report.worst.summary?.slice(0,80) || ''}...</div>
      </div>` : ''}
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px">
      <a href="https://leadflow-ai-web-kappa.vercel.app/team" 
        style="background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">
        DetaylÄ± Raporu GÃ¶rÃ¼ntÃ¼le â†’
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#334155;font-size:12px">
      <p>LeadFlow AI Â· HaftalÄ±k rapor otomatik gÃ¶nderilmektedir</p>
      <p>RaporlarÄ± durdurmak iÃ§in <a href="#" style="color:#6d28d9">buraya tÄ±klayÄ±n</a></p>
    </div>
  </div>
</body>
</html>`;
}

// â”€â”€ ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// POST /api/ti-reports/send-weekly â€” Manuel tetikle
router.post('/send-weekly', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const report = await generateWeeklyReport(userId);
    if (!report) return res.status(400).json({ error: 'Rapor oluÅŸturulamadÄ±' });

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"LeadFlow AI" <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: report.userEmail,
      subject: `ðŸ“Š HaftalÄ±k Ekip Raporu â€” Ort. Skor: ${report.avgScore}`,
      html: buildEmailHtml(report),
    });

    // Log kaydet
    await supabase.from('report_logs').insert([{
      user_id: userId, type: 'weekly', sent_to: report.userEmail,
      avg_score: report.avgScore, total_analyses: report.total,
    }]).select();

    res.json({ ok: true, message: `Rapor ${report.userEmail} adresine gÃ¶nderildi`, avg_score: report.avgScore });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ti-reports/preview â€” Email Ã¶nizleme
router.get('/preview', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const report = await generateWeeklyReport(userId);
    if (!report) return res.status(400).json({ error: 'Veri bulunamadÄ±' });
    res.setHeader('Content-Type', 'text/html');
    res.send(buildEmailHtml(report));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ti-reports/trend â€” Zaman trendi
router.get('/trend', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { memberId, days = 30 } = req.query;

    const points = [];
    const interval = Number(days) <= 7 ? 1 : Number(days) <= 30 ? 3 : 7;

    for (let i = Number(days); i >= 0; i -= interval) {
      const from = new Date(Date.now() - (i + interval) * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase.from('member_analyses')
        .select('overall_score, professionalism_score, sales_technique_score, empathy_score, closing_score')
        .eq('user_id', userId).gte('created_at', from).lt('created_at', to);
      if (memberId) query = query.eq('member_id', memberId);

      const { data } = await query;
      const scored = (data || []).filter((a: any) => a.overall_score);
      const avg = (field: string) => scored.length
        ? Math.round(scored.reduce((s: number, a: any) => s + (a[field] || 0), 0) / scored.length) : null;

      points.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        overall: avg('overall_score'),
        professionalism: avg('professionalism_score'),
        sales_technique: avg('sales_technique_score'),
        empathy: avg('empathy_score'),
        closing: avg('closing_score'),
        count: scored.length,
      });
    }

    res.json({ trend: points, benchmarks: BENCHMARKS });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ti-reports/benchmark â€” SektÃ¶r karÅŸÄ±laÅŸtÄ±rmasÄ±
router.get('/benchmark', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase.from('member_analyses')
      .select('overall_score,professionalism_score,sales_technique_score,empathy_score,closing_score,communication_score')
      .eq('user_id', userId).not('overall_score', 'is', null);

    const scored = data || [];
    const avg = (field: string) => scored.length
      ? Math.round(scored.reduce((s: number, a: any) => s + (a[field] || 0), 0) / scored.length) : 0;

    const userScores = {
      overall: avg('overall_score'),
      professionalism: avg('professionalism_score'),
      sales_technique: avg('sales_technique_score'),
      empathy: avg('empathy_score'),
      closing: avg('closing_score'),
      communication: avg('communication_score'),
    };

    const comparison = Object.entries(BENCHMARKS).map(([key, bench]) => ({
      metric: key,
      user: (userScores as any)[key] || 0,
      benchmark: bench,
      diff: ((userScores as any)[key] || 0) - bench,
      status: ((userScores as any)[key] || 0) >= bench ? 'above' : 'below',
    }));

    res.json({ user_scores: userScores, benchmarks: BENCHMARKS, comparison, total_analyses: scored.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ti-reports/alert â€” DÃ¼ÅŸÃ¼k skor uyarÄ±sÄ±
router.post('/alert', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { threshold = 50 } = req.body;

    // Son 24 saatteki dÃ¼ÅŸÃ¼k skorlu analizler
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: analyses } = await supabase.from('member_analyses')
      .select('*').eq('user_id', userId)
      .gte('created_at', since)
      .lt('overall_score', threshold)
      .not('overall_score', 'is', null);

    if (!analyses?.length) return res.json({ ok: true, message: 'UyarÄ± gerektiren konuÅŸma yok' });

  const { data: userRow } = await supabase.from('users').select('email').eq('id', userId).single();
  const userEmail = userRow?.email;
    if (!userEmail) return res.status(400).json({ error: 'Email bulunamadÄ±' });

    const alertHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;padding:24px;border-radius:16px">
        <h2 style="color:#ef4444">âš ï¸ DÃ¼ÅŸÃ¼k Performans UyarÄ±sÄ±</h2>
        <p style="color:#94a3b8">Son 24 saatte ${analyses.length} dÃ¼ÅŸÃ¼k skorlu konuÅŸma tespit edildi:</p>
        ${analyses.map((a: any) => `
          <div style="background:#1e293b;border-left:3px solid #ef4444;padding:12px;margin:8px 0;border-radius:8px">
            <strong style="color:#f1f5f9">${a.member_name}</strong>
            <span style="color:#ef4444;font-size:20px;font-weight:700;float:right">${a.overall_score}</span>
            <div style="color:#94a3b8;font-size:13px;margin-top:4px">${a.customer_phone} Â· ${a.channel}</div>
            <div style="color:#64748b;font-size:12px;margin-top:4px">${a.summary || ''}</div>
          </div>
        `).join('')}
        <a href="https://leadflow-ai-web-kappa.vercel.app/team" 
          style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">
          DetaylarÄ± GÃ¶rÃ¼ntÃ¼le
        </a>
      </div>`;

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"LeadFlow AI" <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: userEmail,
      subject: `âš ï¸ ${analyses.length} DÃ¼ÅŸÃ¼k PerformanslÄ± KonuÅŸma Tespit Edildi`,
      html: alertHtml,
    });

    res.json({ ok: true, sent: analyses.length, message: `${analyses.length} uyarÄ± emaili gÃ¶nderildi` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ti-reports/settings â€” Rapor ayarlarÄ±
router.get('/settings', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase.from('report_settings').select('*').eq('user_id', userId).single();
    res.json({ settings: data || { weekly_enabled: true, alert_enabled: true, alert_threshold: 50 } });
  } catch (e: any) {
    res.json({ settings: { weekly_enabled: true, alert_enabled: true, alert_threshold: 50 } });
  }
});

// PATCH /api/ti-reports/settings â€” Rapor ayarlarÄ±nÄ± gÃ¼ncelle
router.patch('/settings', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { weekly_enabled, alert_enabled, alert_threshold } = req.body;
    await supabase.from('report_settings').upsert([{
      user_id: userId, weekly_enabled, alert_enabled, alert_threshold,
    }]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
