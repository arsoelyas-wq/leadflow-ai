export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const multer = require('multer');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// ── 3D MODEL YÜKLE ────────────────────────────────────────
router.post('/upload-model', upload.single('model'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    if (!req.file) return res.status(400).json({ error: 'Model dosyası zorunlu (.glb veya .usdz)' });

    const { productName, description, category } = req.body;

    // Supabase Storage'a yükle
    const filename = `ar-models/${userId}/${Date.now()}-${req.file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ar-models')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype || 'model/gltf-binary',
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    // Public URL al
    const { data: urlData } = supabase.storage.from('ar-models').getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    // AR viewer URL oluştur
    const arViewerUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-web-kappa.vercel.app'}/ar-viewer?model=${encodeURIComponent(publicUrl)}&name=${encodeURIComponent(productName || '')}`;

    // QR kod URL (ücretsiz API)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(arViewerUrl)}`;

    // DB kaydet
    const { data: record } = await supabase.from('ar_models').insert([{
      user_id: userId,
      product_name: productName || req.file.originalname,
      description: description || '',
      category: category || 'general',
      model_url: publicUrl,
      ar_viewer_url: arViewerUrl,
      qr_url: qrUrl,
      file_size: req.file.size,
      file_type: req.file.mimetype,
    }]).select().single();

    res.json({
      modelId: record?.id,
      modelUrl: publicUrl,
      arViewerUrl,
      qrUrl,
      message: '3D model yüklendi! AR linki hazır.',
    });
  } catch (e: any) {
    console.error('AR upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── MODEL LİSTESİ ─────────────────────────────────────────
router.get('/models', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase.from('ar_models')
      .select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ models: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── AR LİNKİ WHATSAPP'A GÖNDER ────────────────────────────
router.post('/send/:modelId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, customMessage } = req.body;

    const { data: model } = await supabase.from('ar_models')
      .select('*').eq('id', req.params.modelId).eq('user_id', userId).single();
    if (!model) return res.status(404).json({ error: 'Model bulunamadı' });

    const { data: lead } = await supabase.from('leads')
      .select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const firstName = (lead.contact_name || lead.company_name).split(' ')[0];
    const message = customMessage ||
      `Merhaba ${firstName} Bey/Hanım! 👋\n\n${model.product_name} ürünümüzü kendi mekanınızda görmek ister misiniz? 🏠✨\n\nAşağıdaki linke tıklayarak ürünü gerçek boyutlarıyla odanıza yerleştirebilirsiniz:\n\n📱 ${model.ar_viewer_url}\n\nAkıllı telefonunuzla açın!`;

    const { sendWhatsAppMessage } = require('./settings');
    await sendWhatsAppMessage(userId, lead.phone, message);

    await supabase.from('messages').insert([{
      user_id: userId, lead_id: leadId,
      direction: 'out', content: message,
      channel: 'whatsapp', sent_at: new Date().toISOString(),
      metadata: JSON.stringify({ type: 'ar_experience', modelId: model.id }),
    }]);

    res.json({ message: 'AR linki WhatsApp\'tan gönderildi! ✅' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODEL SİL ─────────────────────────────────────────────
router.delete('/models/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: model } = await supabase.from('ar_models')
      .select('model_url').eq('id', req.params.id).eq('user_id', userId).single();
    if (!model) return res.status(404).json({ error: 'Model bulunamadı' });

    // Storage'dan sil
    const path = model.model_url.split('/ar-models/')[1];
    if (path) await supabase.storage.from('ar-models').remove([`ar-models/${path}`]);

    await supabase.from('ar_models').delete().eq('id', req.params.id);
    res.json({ message: 'Model silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── AR STATS ──────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: models } = await supabase.from('ar_models').select('id').eq('user_id', userId);
    const { data: sent } = await supabase.from('messages')
      .select('id').eq('user_id', userId)
      .contains('metadata', { type: 'ar_experience' });

    res.json({
      totalModels: models?.length || 0,
      totalSent: sent?.length || 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;