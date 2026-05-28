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
router.post('/track-view', async (req: any, res: any) => {
  try {
    const { modelId, userAgent } = req.body;
    if (!modelId) return res.json({ ok: true });

    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent || '');
    const isIOS = /iphone|ipad/i.test(userAgent || '');

    // Verify model exists before updating
    const { data: model } = await supabase.from('ar_models').select('view_count').eq('id', modelId).maybeSingle();
    if (model) {
      await supabase.from('ar_models')
        .update({ view_count: (model.view_count || 0) + 1 })
        .eq('id', modelId)
        .catch(() => {});
    }

    await supabase.from('ar_analytics').insert([{
      model_id: modelId,
      event: 'view',
      is_mobile: isMobile,
      is_ios: isIOS,
      user_agent: userAgent?.slice(0, 200),
    }]).catch(() => {});

    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

router.post('/track-engagement', async (req: any, res: any) => {
  try {
    const { modelId, duration } = req.body;
    if (!modelId || !duration) return res.json({ ok: true });

    await supabase.from('ar_analytics').insert([{
      model_id: modelId,
      event: 'engagement',
      duration_seconds: duration,
    }]).catch(() => {});

    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

router.post('/track-ar-session', async (req: any, res: any) => {
  try {
    const { modelId } = req.body;
    if (!modelId) return res.json({ ok: true });

    // Verify model exists and increment ar_session_count
    const { data: model } = await supabase.from('ar_models').select('ar_session_count').eq('id', modelId).maybeSingle();
    if (model) {
      await supabase.from('ar_models')
        .update({ ar_session_count: (model.ar_session_count || 0) + 1 })
        .eq('id', modelId)
        .catch(() => {});
    }

    await supabase.from('ar_analytics').insert([{
      model_id: modelId,
      event: 'ar_session',
    }]).catch(() => {});

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

module.exports = router;
