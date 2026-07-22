export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Multer — memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ── AVATAR VIDEO YÜKLE (Kendi Sistemimiz — Supabase Storage) ──────────────────
// Video Supabase'e yüklenir, URL user_settings'e kaydedilir.
// MuseTalk seed video olarak kullanılır.
router.post('/upload-avatar', upload.single('video'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    if (!req.file) return res.status(400).json({ error: 'Video dosyası zorunlu' });

    const filename = `avatars/${userId}/seed_${Date.now()}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('video-assets')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype || 'video/mp4',
        upsert: true,
      });
    if (uploadError) throw new Error(`Depolama hatası: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from('video-assets').getPublicUrl(filename);
    const seedVideoUrl = urlData.publicUrl;

    await supabase.from('user_settings').upsert({
      user_id: userId,
      heygen_avatar_id: seedVideoUrl,     // seed video URL (alan adı korundu)
      heygen_avatar_status: 'ready',
      heygen_avatar_type: 'video',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({
      seedVideoUrl,
      status: 'ready',
      message: 'Avatar videosu yüklendi! MuseTalk ile kullanıma hazır.',
    });
  } catch (e: any) {
    console.error('Avatar upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── SES KLONLAMA (Kendi Sistemimiz — XTTS) ────────────────────────────────────
// Ses dosyası Supabase'e yüklenir, cloned_voices tablosuna kaydedilir.
// XTTS zero-shot sentezi için sample_url kullanılır.
router.post('/upload-voice', upload.single('audio'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { voiceName } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Ses dosyası zorunlu' });

    const filename = `voice-samples/${userId}/sample_${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('video-assets')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype || 'audio/mp3',
        upsert: true,
      });
    if (uploadError) throw new Error(`Depolama hatası: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from('video-assets').getPublicUrl(filename);
    const sampleUrl = urlData.publicUrl;

    // cloned_voices tablosuna kaydet
    const { data: cloneRecord, error: cloneError } = await supabase
      .from('cloned_voices')
      .insert([{ user_id: userId, name: voiceName || 'Kişisel Ses', sample_url: sampleUrl }])
      .select('id')
      .single();
    if (cloneError) throw new Error(`Ses kaydı hatası: ${cloneError.message}`);

    const cloneId = cloneRecord.id;

    // user_settings'e referans kaydet
    await supabase.from('user_settings').upsert({
      user_id: userId,
      heygen_voice_id: cloneId,           // XTTS clone ID (alan adı korundu)
      heygen_voice_name: voiceName || 'Kişisel Ses',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({ voiceId: cloneId, message: 'Ses klonu oluşturuldu! XTTS ile kullanıma hazır.' });
  } catch (e: any) {
    console.error('Voice clone error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── AVATAR DURUMU ─────────────────────────────────────────────────────────────
router.get('/avatar-status', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: settings } = await supabase
      .from('user_settings')
      .select('heygen_avatar_id, heygen_avatar_status, heygen_avatar_type, heygen_voice_id, heygen_voice_name')
      .eq('user_id', userId)
      .single();

    if (!settings?.heygen_avatar_id) {
      return res.json({ hasAvatar: false, hasVoice: false });
    }

    res.json({
      hasAvatar: true,
      seedVideoUrl: settings.heygen_avatar_id,  // seed video URL
      avatarStatus: settings.heygen_avatar_status || 'ready',
      avatarType: settings.heygen_avatar_type || 'video',
      hasVoice: !!settings.heygen_voice_id,
      voiceId: settings.heygen_voice_id,
      voiceName: settings.heygen_voice_name,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── AVATAR SİL ────────────────────────────────────────────────────────────────
router.delete('/avatar', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('user_settings').upsert({
      user_id: userId,
      heygen_avatar_id: null,
      heygen_avatar_status: null,
      heygen_avatar_type: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    res.json({ message: 'Avatar silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
