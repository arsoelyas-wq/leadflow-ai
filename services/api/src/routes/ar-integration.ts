export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-web-kappa.vercel.app';

// ── MODEL YÜKLE ───────────────────────────────────────────
router.post('/upload-model', upload.single('model'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    if (!req.file) return res.status(400).json({ error: 'Model dosyası zorunlu' });

    const { productName, description, category } = req.body;
    const ext = req.file.originalname.split('.').pop()?.toLowerCase();

    if (!['glb', 'usdz', 'gltf'].includes(ext)) {
      return res.status(400).json({ error: 'Desteklenmeyen format. .glb, .usdz veya .gltf yükleyin.' });
    }
    if (ext === 'gltf') {
      return res.status(400).json({ error: '.gltf dosyaları desteklenmiyor — texture dosyaları ayrı olduğu için AR\'da çalışmaz. Lütfen .glb (binary) formatına dönüştürün.' });
    }

    const filename = `${userId}/${Date.now()}.${ext}`;
    const contentType = ext === 'glb' ? 'model/gltf-binary' : 'model/vnd.usdz+zip';

    const { error: uploadError } = await supabase.storage
      .from('ar-models').upload(filename, req.file.buffer, { contentType, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from('ar-models').getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    // Insert record first with placeholder URL
    const { data: record, error: insertError } = await supabase.from('ar_models').insert([{
      user_id: userId,
      product_name: productName || req.file.originalname,
      description: description || '',
      category: category || 'general',
      model_url: publicUrl,
      ar_viewer_url: '',
      qr_url: '',
      file_size: req.file.size,
      file_type: ext,
      view_count: 0,
      ar_session_count: 0,
      send_count: 0,
      total_view_seconds: 0,
    }]).select().single();

    if (insertError || !record) throw new Error(insertError?.message || 'Kayıt oluşturulamadı');

    // Now build URLs with the real record ID
    const arViewerUrl = `${APP_URL}/ar-viewer?model=${encodeURIComponent(publicUrl)}&name=${encodeURIComponent(productName || '')}&id=${record.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(arViewerUrl)}&color=1e293b&bgcolor=f8fafc`;

    await supabase.from('ar_models').update({ ar_viewer_url: arViewerUrl, qr_url: qrUrl }).eq('id', record.id);

    res.json({
      modelId: record.id,
      modelUrl: publicUrl,
      arViewerUrl,
      qrUrl,
      message: '3D model yüklendi! AR linki ve QR kod hazır.',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── ANALİTİK TRACKING (public — no auth, model existence check only) ─────────
// Rate limit cache for public tracking endpoints
const trackCache = new Map<string, number>();
setInterval(() => trackCache.clear(), 60000);

router.post('/track-view', async (req: any, res: any) => {
  try {
    const { modelId, userAgent } = req.body;
    if (!modelId) return res.json({ ok: true });

    // Rate limit: max 1 view per model per IP per minute
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const cacheKey = `view_${modelId}_${ip}`;
    if (trackCache.has(cacheKey)) return res.json({ ok: true });
    trackCache.set(cacheKey, Date.now());

    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent || '');
    const isIOS = /iphone|ipad/i.test(userAgent || '');

    const { data: model } = await supabase.from('ar_models').select('view_count, user_id').eq('id', modelId).maybeSingle();
    if (model) {
      await supabase.from('ar_models')
        .update({ view_count: (model.view_count || 0) + 1 })
        .eq('id', modelId);
    }

    await supabase.from('ar_analytics').insert([{
      model_id: modelId, event: 'view',
      is_mobile: isMobile, is_ios: isIOS,
      user_agent: userAgent?.slice(0, 200),
    }]);

    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

router.post('/track-engagement', async (req: any, res: any) => {
  try {
    const { modelId, duration, leadId } = req.body;
    if (!modelId || !duration) return res.json({ ok: true });

    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const cacheKey = `eng_${modelId}_${ip}`;
    if (trackCache.has(cacheKey)) return res.json({ ok: true });
    trackCache.set(cacheKey, Date.now());

    await supabase.from('ar_analytics').insert([{
      model_id: modelId, event: 'engagement', duration_seconds: duration,
    }]);

    // AR+CRM: 30sn+ engagement = hot lead, score boost
    if (duration >= 30) {
      const { data: model } = await supabase.from('ar_models').select('user_id').eq('id', modelId).maybeSingle();
      if (model?.user_id) {
        // Find lead who received this AR link
        const { data: msgs } = await supabase.from('messages')
          .select('lead_id').eq('user_id', model.user_id)
          .ilike('content', `%${modelId}%`).limit(1);
        const lid = leadId || msgs?.[0]?.lead_id;
        if (lid) {
          const { data: lead } = await supabase.from('leads').select('score, status').eq('id', lid).maybeSingle();
          if (lead) {
            const newScore = Math.min(100, (lead.score || 0) + 15);
            const updates: any = { score: newScore };
            if (lead.status === 'new') updates.status = 'interested';
            await supabase.from('leads').update(updates).eq('id', lid);
          }
        }
      }
    }

    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

router.post('/track-ar-session', async (req: any, res: any) => {
  try {
    const { modelId } = req.body;
    if (!modelId) return res.json({ ok: true });

    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const cacheKey = `ar_${modelId}_${ip}`;
    if (trackCache.has(cacheKey)) return res.json({ ok: true });
    trackCache.set(cacheKey, Date.now());

    const { data: model } = await supabase.from('ar_models').select('ar_session_count').eq('id', modelId).maybeSingle();
    if (model) {
      await supabase.from('ar_models')
        .update({ ar_session_count: (model.ar_session_count || 0) + 1 })
        .eq('id', modelId);
    }

    await supabase.from('ar_analytics').insert([{
      model_id: modelId, event: 'ar_session',
    }]);

    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// ── MODEL LİSTESİ ─────────────────────────────────────────
router.get('/models', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('ar_models')
      .select('*').eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ models: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODEL ANALİTİK ────────────────────────────────────────
router.get('/analytics/:modelId', async (req: any, res: any) => {
  try {
    const { data: model } = await supabase.from('ar_models')
      .select('id').eq('id', req.params.modelId).eq('user_id', req.userId).maybeSingle();
    if (!model) return res.status(404).json({ error: 'Bulunamadı' });

    const { data } = await supabase.from('ar_analytics')
      .select('event, duration_seconds, is_mobile, is_ios, created_at')
      .eq('model_id', req.params.modelId)
      .order('created_at', { ascending: false }).limit(500);

    const events = data || [];
    const views = events.filter((e: any) => e.event === 'view').length;
    const arSessions = events.filter((e: any) => e.event === 'ar_session').length;
    const engagements = events.filter((e: any) => e.event === 'engagement');
    const avgDuration = engagements.length
      ? Math.round(engagements.reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0) / engagements.length)
      : 0;
    const mobileViews = events.filter((e: any) => e.is_mobile).length;
    const iosViews = events.filter((e: any) => e.is_ios).length;

    res.json({
      views, arSessions, avgDuration, mobileViews, iosViews,
      conversionRate: views > 0 ? Math.round((arSessions / views) * 100) : 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── WHATSAPP GÖNDER ───────────────────────────────────────
router.post('/send/:modelId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, customMessage } = req.body;

    const [{ data: model }, { data: lead }] = await Promise.all([
      supabase.from('ar_models').select('*').eq('id', req.params.modelId).eq('user_id', userId).single(),
      supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single(),
    ]);

    if (!model) return res.status(404).json({ error: 'Model bulunamadı' });
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const firstName = (lead.contact_name || lead.company_name || '').split(' ')[0] || 'Sayın Yetkili';
    const message = customMessage ||
      `Merhaba ${firstName}! 👋\n\n*${model.product_name}* ürünümüzü kendi mekanınızda görmek ister misiniz? 🏠✨\n\nBu linke tıklayarak ürünü gerçek boyutlarıyla odanıza yerleştirebilirsiniz:\n\n🔗 ${model.ar_viewer_url}\n\n_Akıllı telefonunuzla açın — hiçbir uygulama gerekmez!_`;

    const { sendWhatsAppMessage } = require('./settings');
    await sendWhatsAppMessage(userId, lead.phone, message);

    await supabase.from('messages').insert([{
      user_id: userId, lead_id: leadId,
      direction: 'out', content: message,
      channel: 'whatsapp', sent_at: new Date().toISOString(),
      metadata: JSON.stringify({ type: 'ar_experience', modelId: model.id }),
    }]);

    await supabase.from('ar_models').update({ send_count: (model.send_count || 0) + 1 }).eq('id', model.id);

    res.json({ message: 'AR deneyimi WhatsApp\'tan gönderildi! ✅' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── TOPLU GÖNDER ──────────────────────────────────────────
router.post('/send-batch/:modelId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds } = req.body;

    const { data: model } = await supabase.from('ar_models')
      .select('*').eq('id', req.params.modelId).eq('user_id', userId).single();
    if (!model) return res.status(404).json({ error: 'Model bulunamadı' });

    let query = supabase.from('leads').select('*').eq('user_id', userId).not('phone', 'is', null);
    if (leadIds?.length) query = query.in('id', leadIds);
    else query = query.limit(200);

    const { data: leads } = await query;
    if (!leads?.length) return res.json({ message: 'Uygun lead yok', sent: 0 });

    res.json({ message: `${leads.length} lead'e AR deneyimi gönderiliyor...`, total: leads.length });

    (async () => {
      const { sendWhatsAppMessage } = require('./settings');
      let sent = 0;
      for (const lead of leads) {
        try {
          const firstName = (lead.contact_name || lead.company_name || '').split(' ')[0] || 'Sayın Yetkili';
          const message = `Merhaba ${firstName}! 👋\n\n*${model.product_name}* ürünümüzü kendi mekanınızda görmek ister misiniz? 🏠✨\n\n🔗 ${model.ar_viewer_url}\n\n_Telefonunuzla açın — uygulama gerekmez!_`;
          await sendWhatsAppMessage(userId, lead.phone, message);
          await supabase.from('messages').insert([{
            user_id: userId, lead_id: lead.id,
            direction: 'out', content: message,
            channel: 'whatsapp', sent_at: new Date().toISOString(),
            metadata: JSON.stringify({ type: 'ar_experience', modelId: model.id }),
          }]);
          sent++;
          await new Promise(r => setTimeout(r, 12000));
        } catch {}
      }
      await supabase.from('ar_models').update({ send_count: (model.send_count || 0) + sent }).eq('id', model.id);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── SİL ───────────────────────────────────────────────────
router.delete('/models/:id', async (req: any, res: any) => {
  try {
    const { data: model } = await supabase.from('ar_models')
      .select('model_url').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!model) return res.status(404).json({ error: 'Bulunamadı' });

    const path = model.model_url.split('/ar-models/')[1];
    if (path) await supabase.storage.from('ar-models').remove([path]);
    await supabase.from('ar_models').delete().eq('id', req.params.id);
    res.json({ message: 'Model silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── STATS ─────────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: models } = await supabase.from('ar_models')
      .select('id, view_count, send_count, ar_session_count').eq('user_id', userId);
    const totalViews = (models || []).reduce((s: number, m: any) => s + (m.view_count || 0), 0);
    const totalSent = (models || []).reduce((s: number, m: any) => s + (m.send_count || 0), 0);
    const totalAR = (models || []).reduce((s: number, m: any) => s + (m.ar_session_count || 0), 0);
    res.json({ totalModels: models?.length || 0, totalViews, totalSent, totalARSessions: totalAR });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── TRIPO3D HELPERS ───────────────────────────────────────────────────────────
const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi';

async function tripoUploadImage(buffer: Buffer, mimetype: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([buffer as unknown as ArrayBuffer], { type: mimetype }), 'image.jpg');
  const res = await fetch(`${TRIPO_BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TRIPO3D_API_KEY}` },
    body: form as any,
  });
  const data = await res.json() as any;
  if (data.code !== 0) throw new Error(data.message || 'Tripo3D yükleme hatası');
  return data.data.image_token;
}

async function tripoCreateTask(tokens: string[], types: string[]): Promise<string> {
  const body = tokens.length === 1
    ? { type: 'image_to_model', file: { type: types[0], file_token: tokens[0] } }
    : { type: 'multiview_to_model', files: tokens.map((t, i) => ({ type: types[i], file_token: t })) };
  const res = await fetch(`${TRIPO_BASE}/task`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TRIPO3D_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (data.code !== 0) throw new Error(data.message || 'Tripo3D görev oluşturma hatası');
  return data.data.task_id;
}

// ── POST /api/ar/generate-3d ──────────────────────────────────────────────────
router.post('/generate-3d', upload.fields([
  { name: 'image_0', maxCount: 1 }, { name: 'image_1', maxCount: 1 },
  { name: 'image_2', maxCount: 1 }, { name: 'image_3', maxCount: 1 },
  { name: 'image_4', maxCount: 1 }, { name: 'image_5', maxCount: 1 },
]), async (req: any, res: any) => {
  try {
    if (!process.env.TRIPO3D_API_KEY) {
      return res.status(503).json({ error: 'TRIPO3D_API_KEY sunucuda tanımlı değil' });
    }
    const files = req.files as Record<string, Express.Multer.File[]>;
    const imageFiles = ([0, 1, 2, 3, 4, 5] as const)
      .map(i => files?.[`image_${i}`]?.[0])
      .filter((f): f is Express.Multer.File => !!f);

    if (!imageFiles.length) return res.status(400).json({ error: 'En az 1 fotoğraf gerekli' });

    const tokens: string[] = [];
    const types: string[] = [];
    for (const file of imageFiles) {
      const ext = file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const token = await tripoUploadImage(file.buffer, file.mimetype);
      tokens.push(token);
      types.push(ext);
    }

    const taskId = await tripoCreateTask(tokens, types);
    res.json({ taskId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/ar/generate-3d/status/:taskId ────────────────────────────────────
router.get('/generate-3d/status/:taskId', async (req: any, res: any) => {
  try {
    if (!process.env.TRIPO3D_API_KEY) {
      return res.status(503).json({ error: 'TRIPO3D_API_KEY sunucuda tanımlı değil' });
    }
    const tripoRes = await fetch(`${TRIPO_BASE}/task/${req.params.taskId}`, {
      headers: { Authorization: `Bearer ${process.env.TRIPO3D_API_KEY}` },
    });
    const data = await tripoRes.json() as any;
    if (data.code !== 0) throw new Error(data.message || 'Görev sorgulama hatası');
    const task = data.data;
    res.json({
      status: task.status,
      progress: task.progress || 0,
      modelUrl: task.status === 'success' ? (task.result?.model?.url ?? null) : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/ar/save-generated ───────────────────────────────────────────────
router.post('/save-generated', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { tripoModelUrl, productName, category, description } = req.body;
    if (!tripoModelUrl) return res.status(400).json({ error: 'Model URL gerekli' });

    const modelResponse = await fetch(tripoModelUrl);
    if (!modelResponse.ok) throw new Error("Tripo3D'den model indirilemedi");
    const modelBuffer = await modelResponse.arrayBuffer();

    const filename = `${userId}/${Date.now()}_ai.glb`;
    const { error: uploadError } = await supabase.storage
      .from('ar-models')
      .upload(filename, Buffer.from(modelBuffer), { contentType: 'model/gltf-binary', upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from('ar-models').getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    const { data: record, error: insertError } = await supabase.from('ar_models').insert([{
      user_id: userId,
      product_name: productName || 'AI Oluşturuldu',
      description: description || 'Fotoğraftan AI ile oluşturuldu',
      category: category || 'product',
      model_url: publicUrl,
      ar_viewer_url: '',
      qr_url: '',
      file_size: modelBuffer.byteLength,
      file_type: 'glb',
      view_count: 0, ar_session_count: 0, send_count: 0, total_view_seconds: 0,
    }]).select().single();
    if (insertError || !record) throw new Error(insertError?.message || 'Kayıt oluşturulamadı');

    const arViewerUrl = `${APP_URL}/ar-viewer?model=${encodeURIComponent(publicUrl)}&name=${encodeURIComponent(productName || '')}&id=${record.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(arViewerUrl)}&color=1e293b&bgcolor=f8fafc`;
    await supabase.from('ar_models').update({ ar_viewer_url: arViewerUrl, qr_url: qrUrl }).eq('id', record.id);

    res.json({ modelId: record.id, arViewerUrl, qrUrl, message: '3D model kaydedildi! AR linki hazır. ✅' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
